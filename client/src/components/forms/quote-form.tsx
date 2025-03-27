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
  insertQuoteSchema, 
  insertQuoteItemSchema, 
  Quote, 
  Customer, 
  Project 
} from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { getInputDateString } from "@/lib/date-utils";
import { XCircle, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// Create a schema for quote items that allows client-side calculation
const quoteItemSchema = insertQuoteItemSchema.extend({
  description: z.string().min(3, "Description must be at least 3 characters."),
  quantity: z.number().min(0.01, "Quantity must be greater than 0."),
  unitPrice: z.number().min(0, "Unit price must be greater than or equal to 0.")
});

// Extend the insert schema with client-side validation and calculations
const quoteFormSchema = insertQuoteSchema.extend({
  issueDate: z.string(),
  expiryDate: z.string().optional(),
  reference: z.string().optional(),
  customerId: z.number().optional(),
  projectId: z.number().optional(), 
  status: z.string(),
  subtotal: z.number(),
  tax: z.number().optional(),
  discount: z.number().optional(),
  total: z.number(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  items: z.array(quoteItemSchema)
});

export type QuoteFormValues = z.infer<typeof quoteFormSchema>;

interface QuoteFormProps {
  defaultValues?: Partial<QuoteFormValues>;
  quoteId?: number; // Only for editing existing quote
  onSuccess?: (data: Quote) => void;
}

export default function QuoteForm({ defaultValues, quoteId, onSuccess }: QuoteFormProps) {
  const { toast } = useToast();
  const [recalculating, setRecalculating] = useState(false);

  // Fetch customers and projects for dropdowns
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Initialize form with default values
  const form = useForm<QuoteFormValues>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: defaultValues || {
      issueDate: getInputDateString(new Date()),
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
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  // Watch for changes to recalculate totals
  const watchedItems = form.watch("items");
  const watchedTax = form.watch("tax");
  const watchedDiscount = form.watch("discount");

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
      const tax = watchedTax || 0;
      const discount = watchedDiscount || 0;
      const total = subtotal + tax - discount;
      form.setValue("total", total);
    } finally {
      setRecalculating(false);
    }
  }, [watchedItems, watchedTax, watchedDiscount, form, recalculating]);

  // Create quote mutation
  const createQuote = useMutation({
    mutationFn: async (values: QuoteFormValues) => {
      // First create the quote
      const quoteRes = await apiRequest("POST", "/api/quotes", {
        projectId: values.projectId,
        customerId: values.customerId,
        reference: values.reference,
        issueDate: values.issueDate,
        expiryDate: values.expiryDate,
        status: values.status,
        subtotal: values.subtotal,
        tax: values.tax,
        discount: values.discount,
        total: values.total,
        notes: values.notes,
        terms: values.terms
      });
      
      const quote = await quoteRes.json();
      
      // Then add items to the quote
      for (const item of values.items) {
        await apiRequest("POST", `/api/quotes/${quote.id}/items`, {
          ...item,
          quoteId: quote.id
        });
      }
      
      return quote;
    },
    onSuccess: (data) => {
      toast({
        title: "Quote created",
        description: "Quote has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
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

  // Update quote mutation
  const updateQuote = useMutation({
    mutationFn: async (values: QuoteFormValues) => {
      // First update the quote
      const quoteRes = await apiRequest("PUT", `/api/quotes/${quoteId}`, {
        projectId: values.projectId,
        customerId: values.customerId,
        reference: values.reference,
        issueDate: values.issueDate,
        expiryDate: values.expiryDate,
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
      
      return await quoteRes.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Quote updated",
        description: "Quote has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      queryClient.invalidateQueries({ queryKey: [`/api/quotes/${quoteId}`] });
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
  function onSubmit(values: QuoteFormValues) {
    if (quoteId) {
      updateQuote.mutate(values);
    } else {
      createQuote.mutate(values);
    }
  }

  // Handle loading state
  const isSubmitting = createQuote.isPending || updateQuote.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quote Details</CardTitle>
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
                  name="expiryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expiry Date</FormLabel>
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
                      <Input placeholder="Quote reference (e.g. client PO number)" {...field} />
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
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                        <SelectItem value="converted">Converted to Invoice</SelectItem>
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
                    <FormLabel>Customer</FormLabel>
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
                    <FormLabel>Project</FormLabel>
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
                              type="number" 
                              min="0" 
                              step="0.01" 
                              placeholder="Qty"
                              {...field}
                              onChange={(e) => {
                                field.onChange(parseFloat(e.target.value) || 0);
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
                              type="number" 
                              min="0" 
                              step="0.01" 
                              placeholder="Price"
                              {...field}
                              onChange={(e) => {
                                field.onChange(parseFloat(e.target.value) || 0);
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
                onClick={() => append({ description: "", quantity: 1, unitPrice: 0, total: 0 })}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>

              <Separator className="my-4" />

              <div className="w-full md:w-72 ml-auto space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Subtotal:</span>
                  <span>${form.watch("subtotal").toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="font-medium">Tax:</span>
                  <FormField
                    control={form.control}
                    name="tax"
                    render={({ field }) => (
                      <FormItem className="m-0 w-24">
                        <FormControl>
                          <Input 
                            type="number" 
                            min="0" 
                            step="0.01" 
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => {
                              field.onChange(parseFloat(e.target.value) || 0);
                            }} 
                          />
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
                          <Input 
                            type="number" 
                            min="0" 
                            step="0.01" 
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => {
                              field.onChange(parseFloat(e.target.value) || 0);
                            }} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>${form.watch("total").toFixed(2)}</span>
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
            {isSubmitting ? "Saving..." : quoteId ? "Update Quote" : "Create Quote"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
