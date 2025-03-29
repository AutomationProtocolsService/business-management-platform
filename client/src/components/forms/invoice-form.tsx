import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  insertInvoiceSchema, 
  insertInvoiceItemSchema, 
  Invoice, 
  Customer, 
  Project,
  Quote 
} from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { getInputDateString } from "@/lib/date-utils";
import { XCircle, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CustomerForm from "./customer-form";
import ProjectForm from "./project-form";
import { useSettings } from "@/hooks/use-settings";

// Create a schema for invoice items that allows client-side calculation
const invoiceItemSchema = insertInvoiceItemSchema.extend({
  description: z.string().min(3, "Description must be at least 3 characters."),
  quantity: z.number().min(0.01, "Quantity must be greater than 0."),
  unitPrice: z.number().min(0, "Unit price must be greater than or equal to 0.")
});

// Extend the insert schema with client-side validation and calculations
const invoiceFormSchema = insertInvoiceSchema.extend({
  issueDate: z.string(),
  dueDate: z.string(),
  reference: z.string().optional(),
  customerId: z.number().optional(),
  projectId: z.number().optional(),
  quoteId: z.number().optional(),
  status: z.string(),
  subtotal: z.number(),
  tax: z.number().optional(),
  discount: z.number().optional(),
  total: z.number(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  items: z.array(invoiceItemSchema)
});

export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

interface InvoiceFormProps {
  defaultValues?: Partial<InvoiceFormValues>;
  invoiceId?: number; // Only for editing existing invoice
  onSuccess?: (data: Invoice) => void;
}

export default function InvoiceForm({ defaultValues, invoiceId, onSuccess }: InvoiceFormProps) {
  const { toast } = useToast();
  const [recalculating, setRecalculating] = useState(false);
  const [isCreateCustomerDialogOpen, setIsCreateCustomerDialogOpen] = useState(false);
  const [isCreateProjectDialogOpen, setIsCreateProjectDialogOpen] = useState(false);
  const { getCurrencySymbol } = useSettings();

  // Fetch customers, projects, and quotes for dropdowns
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: quotes = [] } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
  });

  // Initialize form with default values
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: defaultValues || {
      issueDate: getInputDateString(new Date()),
      dueDate: getInputDateString(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days from now
      status: "draft",
      subtotal: 0,
      tax: 0,
      discount: 0,
      total: 0,
      items: [
        {
          description: "",
          quantity: 1,
          unitPrice: 0,
          total: 0
        }
      ]
    },
  });

  // Set up field array for line items
  const { fields, append, remove, replace } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Watch for changes to recalculate totals
  const watchedItems = form.watch("items");
  const watchedTax = form.watch("tax");
  const watchedDiscount = form.watch("discount");
  const watchedQuoteId = form.watch("quoteId");

  // Load quote data when a quote is selected
  useEffect(() => {
    if (!watchedQuoteId) return;
    
    const fetchQuoteDetails = async () => {
      try {
        const res = await fetch(`/api/quotes/${watchedQuoteId}`);
        if (!res.ok) throw new Error("Failed to fetch quote details");
        
        const quoteData = await res.json();
        
        // Update form with quote data
        form.setValue("customerId", quoteData.customerId);
        form.setValue("projectId", quoteData.projectId);
        form.setValue("reference", quoteData.reference);
        form.setValue("subtotal", quoteData.subtotal);
        form.setValue("tax", quoteData.tax);
        form.setValue("discount", quoteData.discount);
        form.setValue("total", quoteData.total);
        form.setValue("notes", quoteData.notes);
        form.setValue("terms", quoteData.terms);
        
        if (quoteData.items && quoteData.items.length > 0) {
          replace(quoteData.items.map((item: any) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total
          })));
        }
      } catch (error) {
        console.error("Error fetching quote details:", error);
        toast({
          title: "Error",
          description: "Failed to load quote details",
          variant: "destructive",
        });
      }
    };
    
    fetchQuoteDetails();
  }, [watchedQuoteId, form, replace, toast]);

  // Recalculate totals when relevant fields change
  useEffect(() => {
    if (recalculating) return;
    
    try {
      setRecalculating(true);
      
      // Calculate item totals
      const items = watchedItems.map(item => ({
        ...item,
        total: (item.quantity || 0) * (item.unitPrice || 0)
      }));
      
      // Update item totals in form
      items.forEach((item, index) => {
        form.setValue(`items.${index}.total`, item.total);
      });
      
      // Calculate subtotal
      const subtotal = items.reduce((sum, item) => sum + (item.total || 0), 0);
      form.setValue("subtotal", subtotal);
      
      // Calculate total with tax and discount
      const taxRate = watchedTax || 0;
      const taxAmount = subtotal * (taxRate / 100);
      const discount = watchedDiscount || 0;
      const total = subtotal + taxAmount - discount;
      form.setValue("total", total);
    } finally {
      setRecalculating(false);
    }
  }, [watchedItems, watchedTax, watchedDiscount, form, recalculating]);

  // Create invoice mutation
  const createInvoice = useMutation({
    mutationFn: async (values: InvoiceFormValues) => {
      // First create the invoice
      const invoiceRes = await apiRequest("POST", "/api/invoices", {
        projectId: values.projectId,
        customerId: values.customerId,
        quoteId: values.quoteId,
        reference: values.reference,
        issueDate: values.issueDate,
        dueDate: values.dueDate,
        status: values.status,
        subtotal: values.subtotal,
        tax: values.tax,
        discount: values.discount,
        total: values.total,
        notes: values.notes,
        terms: values.terms
      });
      
      const invoice = await invoiceRes.json();
      
      // Then add items to the invoice
      for (const item of values.items) {
        await apiRequest("POST", `/api/invoices/${invoice.id}/items`, {
          ...item,
          invoiceId: invoice.id
        });
      }
      
      return invoice;
    },
    onSuccess: (data) => {
      toast({
        title: "Invoice created",
        description: "Invoice has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      if (onSuccess) onSuccess(data);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update invoice mutation
  const updateInvoice = useMutation({
    mutationFn: async (values: InvoiceFormValues) => {
      // First update the invoice
      const invoiceRes = await apiRequest("PUT", `/api/invoices/${invoiceId}`, {
        projectId: values.projectId,
        customerId: values.customerId,
        quoteId: values.quoteId,
        reference: values.reference,
        issueDate: values.issueDate,
        dueDate: values.dueDate,
        status: values.status,
        subtotal: values.subtotal,
        tax: values.tax,
        discount: values.discount,
        total: values.total,
        notes: values.notes,
        terms: values.terms
      });
      
      // Note: For a real application, you would need endpoints to delete and update items
      // For this demo, we'll assume items are handled separately
      
      return await invoiceRes.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Invoice updated",
        description: "Invoice has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: [`/api/invoices/${invoiceId}`] });
      if (onSuccess) onSuccess(data);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  function onSubmit(values: InvoiceFormValues) {
    if (invoiceId) {
      updateInvoice.mutate(values);
    } else {
      createInvoice.mutate(values);
    }
  }

  // Handle loading state
  // Handle customer creation success
  const handleCustomerCreated = (customer: Customer) => {
    setIsCreateCustomerDialogOpen(false);
    form.setValue("customerId", customer.id);
    toast({
      title: "Customer created",
      description: "Customer has been created and selected.",
    });
  };

  // Handle project creation success
  const handleProjectCreated = (project: Project) => {
    setIsCreateProjectDialogOpen(false);
    form.setValue("projectId", project.id);
    toast({
      title: "Project created",
      description: "Project has been created and selected.",
    });
  };
  
  // Handle loading state
  const isSubmitting = createInvoice.isPending || updateInvoice.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="issueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Issue Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reference</FormLabel>
                    <FormControl>
                      <Input placeholder="Invoice reference (e.g. client PO number)" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="issued">Issued</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="quoteId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Based on Quote</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a quote (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="0">None</SelectItem>
                        {quotes
                          .filter(q => q.status === 'accepted' || q.status === 'pending')
                          .map((quote) => (
                            <SelectItem key={quote.id} value={quote.id.toString()}>
                              {quote.quoteNumber}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="customerId"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center">
                      <FormLabel>Customer</FormLabel>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsCreateCustomerDialogOpen(true)}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Create New
                      </Button>
                    </div>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a customer" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {customers.map((customer) => (
                          <SelectItem key={customer.id} value={customer.id.toString()}>
                            {customer.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex justify-between items-center">
                      <FormLabel>Project</FormLabel>
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsCreateProjectDialogOpen(true)}
                      >
                        <Plus className="h-3 w-3 mr-1" /> Create New
                      </Button>
                    </div>
                    <Select
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id.toString()}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Additional Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea rows={4} placeholder="Enter notes" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="terms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Terms & Conditions</FormLabel>
                    <FormControl>
                      <Textarea rows={4} placeholder="Enter terms and conditions" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Line Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-12 gap-2 font-medium text-sm text-gray-500">
                <div className="col-span-5">Description</div>
                <div className="col-span-2">Quantity</div>
                <div className="col-span-2">Unit Price</div>
                <div className="col-span-2">Total</div>
                <div className="col-span-1"></div>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-5">
                    <FormField
                      control={form.control}
                      name={`items.${index}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Item description" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name={`items.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input 
                              type="text" 
                              inputMode="decimal"
                              placeholder="Qty"
                              {...field}
                              onChange={(e) => {
                                // Remove any non-numeric characters except decimal point
                                const value = e.target.value.replace(/[^\d.]/g, '');
                                // Parse the value and update the field
                                field.onChange(parseFloat(value) || 0);
                              }} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name={`items.${index}.unitPrice`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input 
                              type="text" 
                              inputMode="decimal"
                              placeholder="Price"
                              {...field}
                              onChange={(e) => {
                                // Remove any non-numeric characters except decimal point
                                const value = e.target.value.replace(/[^\d.]/g, '');
                                // Parse the value and update the field
                                field.onChange(parseFloat(value) || 0);
                              }} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="col-span-2">
                    <FormField
                      control={form.control}
                      name={`items.${index}.total`}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input 
                              readOnly 
                              value={field.value.toFixed(2)} 
                              className="bg-gray-50" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="col-span-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      onClick={() => remove(index)}
                      disabled={fields.length === 1}
                    >
                      <XCircle className="h-5 w-5 text-gray-500" />
                    </Button>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2 flex items-center"
                onClick={() => append({ 
                  description: "", 
                  quantity: 1, 
                  unitPrice: 0, 
                  total: 0, 
                  invoiceId: form.getValues('id') || 0
                })}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>

              <Separator className="my-4" />

              <div className="w-full md:w-72 ml-auto space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Subtotal:</span>
                  <span>{getCurrencySymbol()}{form.watch("subtotal").toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="font-medium">Tax:</span>
                  <FormField
                    control={form.control}
                    name="tax"
                    render={({ field }) => (
                      <FormItem className="m-0 w-24">
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type="text" 
                              inputMode="decimal"
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => {
                                // Remove any non-numeric characters except decimal point
                                const value = e.target.value.replace(/[^\d.]/g, '');
                                // Parse the value and ensure it's not more than 100
                                const parsedValue = parseFloat(value) || 0;
                                field.onChange(Math.min(parsedValue, 100));
                              }}
                            />
                            <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                              <span className="text-gray-500">%</span>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex justify-between items-center">
                  <span className="font-medium">Discount:</span>
                  <FormField
                    control={form.control}
                    name="discount"
                    render={({ field }) => (
                      <FormItem className="m-0 w-24">
                        <FormControl>
                          <div className="relative">
                            <Input 
                              type="text" 
                              inputMode="decimal"
                              placeholder="0.00"
                              {...field}
                              onChange={(e) => {
                                // Remove any non-numeric characters except decimal point
                                const value = e.target.value.replace(/[^\d.]/g, '');
                                // Parse the value
                                field.onChange(parseFloat(value) || 0);
                              }}
                            />
                            <div className="absolute inset-y-0 right-2 flex items-center pointer-events-none">
                              <span className="text-gray-500">{getCurrencySymbol()}</span>
                            </div>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>{getCurrencySymbol()}{form.watch("total").toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline">
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : invoiceId ? "Update Invoice" : "Create Invoice"}
          </Button>
        </div>
      </form>

      {/* Create Customer Dialog */}
      <Dialog open={isCreateCustomerDialogOpen} onOpenChange={setIsCreateCustomerDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Customer</DialogTitle>
            <DialogDescription>
              Add a new customer to your database. This customer will be automatically selected after creation.
            </DialogDescription>
          </DialogHeader>
          <CustomerForm onSuccess={handleCustomerCreated} />
        </DialogContent>
      </Dialog>

      {/* Create Project Dialog */}
      <Dialog open={isCreateProjectDialogOpen} onOpenChange={setIsCreateProjectDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
            <DialogDescription>
              Add a new project to your database. This project will be automatically selected after creation.
            </DialogDescription>
          </DialogHeader>
          <ProjectForm onSuccess={handleProjectCreated} />
        </DialogContent>
      </Dialog>
    </Form>
  );
}
