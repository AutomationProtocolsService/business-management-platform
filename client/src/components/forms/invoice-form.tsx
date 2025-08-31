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
  Quote,
  FileAttachment,
  CatalogItem
} from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { getInputDateString } from "@/lib/date-utils";
import { XCircle, Plus, Clock, Edit, Mail, FileText, Receipt, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import CustomerForm from "./customer-form";
import ProjectForm from "./project-form";
import { useSettings } from "@/hooks/use-settings";
import { FileUpload } from "@/components/ui/file-upload";
import { FileList } from "@/components/ui/file-list";

// Create a schema for invoice items that allows client-side calculation
const invoiceItemSchema = insertInvoiceItemSchema.extend({
  description: z.string().min(3, "Description must be at least 3 characters."),
  quantity: z.number().min(0.01, "Quantity must be greater than 0."),
  unitPrice: z.number().min(0, "Unit price must be greater than or equal to 0."),
  catalogItemId: z.number().optional()
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
  onCancel?: () => void;
}

export default function InvoiceForm({ defaultValues, invoiceId, onSuccess, onCancel }: InvoiceFormProps) {
  const { toast } = useToast();
  const [recalculating, setRecalculating] = useState(false);
  const [isCreateCustomerDialogOpen, setIsCreateCustomerDialogOpen] = useState(false);
  const [isCreateProjectDialogOpen, setIsCreateProjectDialogOpen] = useState(false);
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);
  const { getCurrencySymbol, settings } = useSettings();

  // Fetch files if editing an existing invoice
  const { data: existingFiles = [] } = useQuery<FileAttachment[]>({
    queryKey: [`/api/files/invoice/${invoiceId}`, invoiceId],
    queryFn: async () => {
      try {
        // Using the server's expected format with relatedType/relatedId
        const response = await fetch(`/api/files/invoice/${invoiceId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch with initial path');
        }
        return response.json();
      } catch (error) {
        console.error('Error fetching files for invoice:', error);
        return [];
      }
    },
    enabled: !!invoiceId
  });

  // Fetch customers, projects, quotes, and catalog items for dropdowns
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: quotes = [] } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
  });

  const { data: catalogItems = [] } = useQuery<CatalogItem[]>({
    queryKey: ["/api/catalog-items"],
  });

  // Initialize form with default values
  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: defaultValues || {
      issueDate: getInputDateString(new Date()),
      dueDate: getInputDateString(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)), // 30 days from now
      status: "draft",
      subtotal: 0,
      tax: 0, // VAT will be calculated from individual items
      discount: 0,
      total: 0,
      terms: settings?.defaultInvoiceTerms || "",
      items: [
        {
          description: "",
          quantity: 1,
          unitPrice: 0,
          vatRate: 20, // Default 20% VAT for UK
          netTotal: 0,
          vatAmount: 0,
          total: 0,
          catalogItemId: undefined
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
            total: item.total,
            catalogItemId: item.catalogItemId
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
      // Prepare data ensuring all required fields have proper values
      const invoiceData = {
        projectId: typeof values.projectId === 'number' ? values.projectId : null,
        customerId: typeof values.customerId === 'number' ? values.customerId : null,
        quoteId: typeof values.quoteId === 'number' ? values.quoteId : null,
        reference: values.reference || "",
        issueDate: values.issueDate || new Date().toISOString().split('T')[0],
        dueDate: values.dueDate || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0], // 30 days from now
        status: values.status || "draft",
        subtotal: typeof values.subtotal === 'number' ? values.subtotal : 0,
        tax: typeof values.tax === 'number' ? values.tax : 0,
        discount: typeof values.discount === 'number' ? values.discount : 0,
        total: typeof values.total === 'number' ? values.total : 0,
        notes: values.notes || "",
        terms: values.terms || ""
      };
      
      console.log("Sending invoice data to API:", invoiceData);
      
      // First create the invoice
      const invoiceRes = await apiRequest("POST", "/api/invoices", invoiceData);
      
      const invoice = await invoiceRes.json();
      
      // Then add items to the invoice
      for (const item of values.items) {
        await apiRequest("POST", `/api/invoices/${invoice.id}/items`, {
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total,
          catalogItemId: item.catalogItemId,
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
      // Prepare data ensuring all required fields have proper values
      const invoiceData = {
        projectId: typeof values.projectId === 'number' ? values.projectId : null,
        customerId: typeof values.customerId === 'number' ? values.customerId : null,
        quoteId: typeof values.quoteId === 'number' ? values.quoteId : null,
        reference: values.reference || "",
        issueDate: values.issueDate || new Date().toISOString().split('T')[0],
        dueDate: values.dueDate || new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0], // 30 days from now
        status: values.status || "draft",
        subtotal: typeof values.subtotal === 'number' ? values.subtotal : 0,
        tax: typeof values.tax === 'number' ? values.tax : 0,
        discount: typeof values.discount === 'number' ? values.discount : 0,
        total: typeof values.total === 'number' ? values.total : 0,
        notes: values.notes || "",
        terms: values.terms || ""
      };
      
      console.log("Sending invoice update data to API:", invoiceData);
      
      // First update the invoice
      const invoiceRes = await apiRequest("PUT", `/api/invoices/${invoiceId}`, invoiceData);
      
      if (!invoiceRes.ok) {
        const errorText = await invoiceRes.text();
        console.error("Error updating invoice:", errorText);
        throw new Error("Failed to update invoice. Please try again.");
      }
      
      const updatedInvoice = await invoiceRes.json();
      
      try {
        // Delete all existing items and create new ones
        const existingItemsRes = await apiRequest("GET", `/api/invoices/${invoiceId}/items`);
        
        if (!existingItemsRes.ok) {
          throw new Error("Failed to fetch existing invoice items");
        }
        
        const existingItems = await existingItemsRes.json();
        
        // Delete all existing items
        for (const item of existingItems) {
          await apiRequest("DELETE", `/api/invoices/${invoiceId}/items/${item.id}`);
        }
        
        // Add the new items
        for (const item of values.items) {
          await apiRequest("POST", `/api/invoices/${invoiceId}/items`, {
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.total,
            catalogItemId: item.catalogItemId,
            invoiceId: invoiceId
          });
        }
      } catch (error) {
        console.error("Error updating invoice items:", error);
        throw new Error("Invoice was updated but there was an error updating the items. Please refresh and try again.");
      }
      
      return updatedInvoice;
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
    console.log("Submitting invoice form with values:", values);
    try {
      // Ensure required fields are present
      const preparedValues = {
        ...values,
        customerId: values.customerId || null,
        projectId: values.projectId || null,
        quoteId: values.quoteId || null,
        subtotal: typeof values.subtotal === 'number' ? values.subtotal : 0,
        tax: typeof values.tax === 'number' ? values.tax : 0,
        discount: typeof values.discount === 'number' ? values.discount : 0,
        total: typeof values.total === 'number' ? values.total : 0,
        status: values.status || 'draft',
        items: Array.isArray(values.items) ? values.items : []
      };
      
      console.log("Prepared invoice values:", preparedValues);
      
      if (invoiceId) {
        updateInvoice.mutate(preparedValues);
      } else {
        createInvoice.mutate(preparedValues);
      }
    } catch (error) {
      console.error("Error submitting form:", error);
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

  // Handle file deletion
  const handleDeleteFile = (fileId: number) => {
    setAttachments(prev => prev.filter(file => file.id !== fileId));
    queryClient.invalidateQueries({ queryKey: [`/api/files/invoice/${invoiceId}`] });
  };

  // Handle files upload success
  const handleFilesUploaded = (newFiles: FileAttachment[]) => {
    setAttachments(prev => [...prev, ...newFiles]);
  };
  
  // Handle catalog item selection
  const handleCatalogItemSelect = (catalogItemId: number, index: number) => {
    // Find the selected catalog item
    const selectedItem = catalogItems.find(item => item.id === catalogItemId);
    
    if (selectedItem) {
      // Update the line item fields with catalog item data
      form.setValue(`items.${index}.description`, selectedItem.description);
      form.setValue(`items.${index}.unitPrice`, selectedItem.unitPrice);
      form.setValue(`items.${index}.catalogItemId`, selectedItem.id);
    }
  };
  
  // Handle loading state
  const isSubmitting = createInvoice.isPending || updateInvoice.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Company Header */}
        <Card className="mb-4">
          <CardContent className="py-4">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex flex-col">
                {settings?.companyLogo ? (
                  <img 
                    src={settings.companyLogo} 
                    alt={settings?.companyName || 'Company Logo'} 
                    className="h-16 object-contain mb-2" 
                  />
                ) : (
                  <h1 className="text-2xl font-bold">{settings?.companyName || 'Your Company'}</h1>
                )}
                <div className="text-sm text-muted-foreground">
                  {settings?.address && <p>{settings.address}</p>}
                  {(settings?.city || settings?.state || settings?.zipCode) && (
                    <p>
                      {settings?.city}{settings?.city && settings?.state ? ', ' : ''}{settings?.state} {settings?.zipCode}
                    </p>
                  )}
                  {settings?.phone && <p>Phone: {settings.phone}</p>}
                  {settings?.email && <p>Email: {settings.email}</p>}
                  {settings?.website && <p>Web: {settings.website}</p>}
                  {/* Business Identifiers */}
                  {settings?.vatNumber && <p>VAT Number: {settings.vatNumber}</p>}
                  {settings?.registrationNumber && <p>Reg Number: {settings.registrationNumber}</p>}
                </div>
              </div>
              
              <div className="text-right">
                <h2 className="text-2xl font-bold text-primary">INVOICE</h2>
                {invoiceId && (
                  <p className="text-sm text-muted-foreground">Invoice #{invoiceId}</p>
                )}
              </div>
            </div>
            
            {/* Company certifications */}
            {settings?.certifications && settings.certifications.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2 justify-end">
                {settings.certifications.map((cert, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {cert}
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
        
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
              
              {/* Attachments */}
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Attachments</h3>
                <FileUpload 
                  onUploadSuccess={handleFilesUploaded}
                  relatedType="invoice"
                  relatedId={invoiceId}
                  maxFiles={5}
                  maxSize={5 * 1024 * 1024} // 5MB
                  accept={{
                    'application/pdf': ['.pdf'],
                    'image/jpeg': ['.jpg', '.jpeg'],
                    'image/png': ['.png']
                  }}
                />
                
                {/* Show existing files */}
                {(existingFiles.length > 0 || attachments.length > 0) && (
                  <div className="mt-2">
                    <FileList 
                      files={invoiceId ? existingFiles : attachments} 
                      onDelete={handleDeleteFile}
                    />
                  </div>
                )}
              </div>

              {/* Payment Details */}
              {settings?.bankDetails && (
                <div className="mt-4 p-3 border rounded-md bg-gray-50">
                  <h3 className="font-medium mb-2">Payment Information</h3>
                  <div className="text-sm whitespace-pre-line">
                    {settings.bankDetails}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {invoiceId && (
                  <>
                    <Button 
                      variant="outline" 
                      className="flex flex-col items-center justify-center h-24 w-full"
                      onClick={() => {
                        window.open(`/api/invoices/${invoiceId}/pdf`, '_blank');
                      }}
                    >
                      <FileText className="h-8 w-8 mb-2" />
                      <span>Download PDF</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex flex-col items-center justify-center h-24 w-full"
                      onClick={() => {
                        window.location.href = `/invoices/${invoiceId}/email`;
                      }}
                    >
                      <Mail className="h-8 w-8 mb-2" />
                      <span>Send Email</span>
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex flex-col items-center justify-center h-24 w-full"
                      onClick={() => {
                        const mark = form.getValues('status') === 'paid' ? 'unpaid' : 'paid';
                        form.setValue('status', mark);
                      }}
                    >
                      <Receipt className="h-8 w-8 mb-2" />
                      <span>Mark as {form.watch('status') === 'paid' ? 'Unpaid' : 'Paid'}</span>
                    </Button>
                  </>
                )}
                {!invoiceId && (
                  <Button 
                    variant="outline" 
                    className="flex flex-col items-center justify-center h-24 w-full"
                    disabled
                  >
                    <Clock className="h-8 w-8 mb-2" />
                    <span>Actions Available After Saving</span>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="mt-4">
                <p className="text-sm text-muted-foreground mb-2">Current Status:</p>
                <Badge className={`${
                  form.watch('status') === 'paid' ? 'bg-green-500' : 
                  form.watch('status') === 'pending' ? 'bg-yellow-500' : 
                  form.watch('status') === 'draft' ? 'bg-blue-500' :
                  form.watch('status') === 'overdue' ? 'bg-red-500' : 'bg-gray-500'
                }`}>
                  {form.watch('status') ? form.watch('status').charAt(0).toUpperCase() + form.watch('status').slice(1) : 'Draft'}
                </Badge>
              </div>
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
                      name={`items.${index}.catalogItemId`}
                      render={({ field }) => (
                        <FormItem className="mb-2">
                          <Select
                            onValueChange={(value) => {
                              field.onChange(value === "0" ? undefined : Number(value));
                              if (value !== "0") {
                                handleCatalogItemSelect(Number(value), index);
                              }
                            }}
                            value={field.value?.toString() || "0"}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select from catalog (optional)" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="0">Custom item</SelectItem>
                              {catalogItems.map((item) => (
                                <SelectItem key={item.id} value={item.id.toString()}>
                                  {item.name}
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
                  catalogItemId: undefined,
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
                  <span>{getCurrencySymbol()}{(form.watch("subtotal") || 0).toFixed(2)}</span>
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
                  <span>{getCurrencySymbol()}{(form.watch("total") || 0).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            disabled={isSubmitting}
            onClick={(e) => {
              e.preventDefault();
              console.log("Create/Update Invoice button clicked");
              onSubmit(form.getValues());
            }}
          >
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
