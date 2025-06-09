import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  insertPurchaseOrderSchema, 
  insertPurchaseOrderItemSchema,
  PurchaseOrder, 
  InsertPurchaseOrder, 
  PurchaseOrderItem,
  InsertPurchaseOrderItem,
  Supplier,
  InventoryItem,
  FileAttachment
} from "@shared/schema";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/use-settings";

// UI Components
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
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
import { DatePicker } from "@/components/ui/date-picker";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileUpload } from "@/components/ui/file-upload";
import { FileList } from "@/components/ui/file-list";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, PlusCircle, Trash2, Pencil, Package } from "lucide-react";

// Extend the schema with additional validation
const formSchema = insertPurchaseOrderSchema.extend({
  orderDate: z.date({
    required_error: "Order date is required",
  }),
  expectedDeliveryDate: z.date().optional(),
  orderNumber: z.string().optional(), // for UI, will be mapped to poNumber
});

type FormValues = z.infer<typeof formSchema>;

// Schema for the line item form
const lineItemSchema = insertPurchaseOrderItemSchema.extend({
  tempId: z.string().optional(),
});

type LineItemFormValues = z.infer<typeof lineItemSchema>;

interface PurchaseOrderFormProps {
  purchaseOrder?: PurchaseOrder | null;
  onSuccess?: () => void;
}

// Generate a PO number
const generatePONumber = () => {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0");
  return `PO-${year}${month}-${random}`;
};

export default function PurchaseOrderForm({ purchaseOrder, onSuccess }: PurchaseOrderFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { formatMoney } = useSettings();
  const [lineItems, setLineItems] = useState<(PurchaseOrderItem & { tempId?: string })[]>([]);
  const [editingItem, setEditingItem] = useState<(PurchaseOrderItem & { tempId?: string }) | null>(null);
  const [activeTab, setActiveTab] = useState<string>("details");
  const [attachments, setAttachments] = useState<FileAttachment[]>([]);

  // Get suppliers for dropdown
  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  // Get inventory items for dropdown
  const { data: inventoryItems = [] } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  // Create form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      supplierId: purchaseOrder?.supplierId || undefined,
      orderNumber: purchaseOrder?.poNumber || generatePONumber(),
      orderDate: purchaseOrder ? new Date(purchaseOrder.issueDate) : new Date(),
      expectedDeliveryDate: purchaseOrder?.expectedDeliveryDate 
        ? new Date(purchaseOrder.expectedDeliveryDate) 
        : undefined,
      deliveryAddress: purchaseOrder?.deliveryAddress || "",
      notes: purchaseOrder?.notes || "",
      terms: purchaseOrder?.terms || "",
      status: purchaseOrder?.status || "Draft",
    },
  });

  // Create line item form
  const lineItemForm = useForm<LineItemFormValues>({
    resolver: zodResolver(lineItemSchema),
    defaultValues: {
      description: "",
      quantity: 1,
      unitPrice: 0,
      inventoryItemId: undefined,
    },
  });

  // Load line items for existing PO
  useEffect(() => {
    if (purchaseOrder?.id) {
      // In a real app, we would fetch line items from the API based on PO ID
      // For now, we'll simulate with empty array or existing line items
      setLineItems([]);
    }
  }, [purchaseOrder]);
  
  // Fetch file attachments for existing purchase order
  useEffect(() => {
    const fetchAttachments = async () => {
      if (purchaseOrder?.id) {
        try {
          const res = await apiRequest("GET", `/api/files/purchaseOrders/${purchaseOrder.id}`);
          const files = await res.json();
          setAttachments(files);
        } catch (error) {
          console.error("Error loading file attachments:", error);
        }
      }
    };
    
    fetchAttachments();
  }, [purchaseOrder?.id]);

  // Tax rate constant
  const TAX_RATE = 0.20;

  // Compute reactive totals from line items using useMemo
  const subtotal = useMemo(() => {
    const calc = lineItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    console.log("Calculating subtotal from items:", lineItems, "Result:", calc);
    return calc;
  }, [lineItems]);
  
  const taxAmount = useMemo(() => {
    const calc = subtotal * TAX_RATE;
    console.log("Calculating tax from subtotal:", subtotal, "Result:", calc);
    return calc;
  }, [subtotal]);
  
  const total = useMemo(() => {
    const calc = subtotal + taxAmount;
    console.log("Calculating total from subtotal + tax:", subtotal, taxAmount, "Result:", calc);
    return calc;
  }, [subtotal, taxAmount]);

  // Helper functions for backward compatibility
  const calculateSubtotal = () => subtotal;
  const calculateTax = () => taxAmount;
  const calculateTotal = () => total;

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: InsertPurchaseOrder & { items: InsertPurchaseOrderItem[] }) => {
      const res = await apiRequest("POST", "/api/purchase-orders", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Purchase order created",
        description: "The purchase order has been created successfully.",
      });
      // Invalidate query to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating purchase order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: { 
      id: number; 
      orderData: Partial<PurchaseOrder>; 
      items: InsertPurchaseOrderItem[];
      deletedItemIds?: number[];
    }) => {
      const res = await apiRequest("PATCH", `/api/purchase-orders/${data.id}`, {
        orderData: data.orderData,
        items: data.items,
        deletedItemIds: data.deletedItemIds
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Purchase order updated",
        description: "The purchase order has been updated successfully.",
      });
      // Invalidate query to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating purchase order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = async (data: FormValues) => {
    console.log("Form submission triggered", data);
    
    // Show submission toast to indicate that the form submission is working
    toast({
      title: "Processing form submission",
      description: "Submitting purchase order data...",
    });
    
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to create purchase orders.",
        variant: "destructive",
      });
      return;
    }

    // Check if there are line items
    if (lineItems.length === 0) {
      toast({
        title: "No items added",
        description: "Please add at least one item to the purchase order.",
        variant: "destructive",
      });
      setActiveTab("items");
      return;
    }
    
    // Ensure we have required data properly formatted for form submission
    const preparedData = {
      ...data,
      poNumber: data.orderNumber || `PO-${new Date().getTime()}`,
      supplierId: data.supplierId || 0,
      issueDate: data.orderDate ? data.orderDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      expectedDeliveryDate: data.expectedDeliveryDate ? data.expectedDeliveryDate.toISOString().split('T')[0] : null,
      subtotal: typeof data.subtotal === 'number' ? data.subtotal : 0,
      tax: typeof data.tax === 'number' ? data.tax : 0, 
      total: typeof data.total === 'number' ? data.total : 0,
      status: data.status || 'draft',
      projectId: data.projectId || null
    };
    
    console.log("Prepared purchase order values:", preparedData);

    // Get the selected supplier name
    const selectedSupplier = suppliers.find(s => s.id === data.supplierId);
    
    if (purchaseOrder?.id) {
      // Update existing purchase order
      const updatedPO = {
        ...preparedData,
        issueDate: data.orderDate.toISOString().split('T')[0],
        expectedDeliveryDate: data.expectedDeliveryDate ? 
          data.expectedDeliveryDate.toISOString().split('T')[0] : null,
        poNumber: data.orderNumber || `PO-${new Date().getTime()}`,
        status: data.status || 'draft',
        notes: data.notes,
        terms: data.terms, // Make sure we're using the correct field name
        subtotal: subtotal,
        tax: taxAmount,
        total: total,
        // No supplierName as it's linked through supplierId
        updatedBy: user.id,
      };
      
      // Determine which items need to be deleted (in a real app)
      const existingItemIds = purchaseOrder.items?.map(item => item.id) || [];
      const currentItemIds = lineItems
        .filter(item => typeof item.id === 'number')
        .map(item => item.id as number);
      
      const deletedItemIds = existingItemIds.filter(id => !currentItemIds.includes(id));
      
      updateMutation.mutate({
        id: purchaseOrder.id,
        orderData: updatedPO,
        items: lineItems.map(item => ({
          ...item,
          purchaseOrderId: purchaseOrder.id,
        })),
        deletedItemIds
      });
    } else {
      // Create new purchase order with proper validation for all fields
      const newPO = {
        ...preparedData,
        issueDate: data.orderDate ? data.orderDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        expectedDeliveryDate: data.expectedDeliveryDate ? 
          data.expectedDeliveryDate.toISOString().split('T')[0] : null,
        poNumber: data.orderNumber || `PO-${new Date().getTime()}`,
        status: data.status || 'draft',
        notes: data.notes || "",
        terms: data.terms || "", // Make sure we're using the correct field name
        subtotal: subtotal,
        tax: taxAmount,
        total: total,
        // No longer need supplierName as it's linked through supplierId
        createdBy: user?.id || 0,
        // Make sure we have at least one item
        items: lineItems.length > 0 ? lineItems.map(item => ({
          description: item.description || "",
          quantity: typeof item.quantity === 'number' ? item.quantity : 0,
          unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : 0,
          total: typeof item.total === 'number' ? item.total : 0,
          purchaseOrderId: item.purchaseOrderId || 0,
          inventoryItemId: item.inventoryItemId || null,
          // Remove tempId from items
          tempId: undefined 
        })) : [{
          description: "Default item",
          quantity: 1,
          unitPrice: 0,
          total: 0,
          purchaseOrderId: 0
        }]
      };
      
      createMutation.mutate(newPO);
    }
  };

  // Add a line item
  const addLineItem = (itemData: LineItemFormValues) => {
    console.log("AddLineItem function called with data:", itemData);
    const inventoryItem = inventoryItems.find(item => item.id === itemData.inventoryItemId);
    
    // Calculate the total price from quantity and unit price
    const calculatedTotal = itemData.quantity * itemData.unitPrice;
    
    const newItem: PurchaseOrderItem & { tempId?: string } = {
      ...itemData,
      id: itemData.id || undefined,
      tempId: itemData.tempId || `temp-${Date.now()}`,
      purchaseOrderId: purchaseOrder?.id || 0,
      total: calculatedTotal, // Use 'total' to match schema
      sku: itemData.sku || null,
      unit: itemData.unit || "each",
      receivedQuantity: 0,
      notes: itemData.notes || null,
    };
    
    if (editingItem) {
      // Update existing item
      setLineItems(prevItems => 
        prevItems.map(item => 
          item.tempId === editingItem.tempId || item.id === editingItem.id ? newItem : item
        )
      );
      setEditingItem(null);
    } else {
      // Add new item
      setLineItems(prevItems => [...prevItems, newItem]);
    }
    
    // Reset the form
    lineItemForm.reset({
      description: "",
      quantity: 1,
      unitPrice: 0,
      inventoryItemId: undefined,
    });
  };

  // Remove a line item
  const removeLineItem = (tempId: string | undefined, id: number | undefined) => {
    if (tempId) {
      setLineItems(prevItems => prevItems.filter(item => item.tempId !== tempId));
    } else if (id) {
      setLineItems(prevItems => prevItems.filter(item => item.id !== id));
    }
  };

  // Edit a line item
  const editLineItem = (item: PurchaseOrderItem & { tempId?: string }) => {
    setEditingItem(item);
    lineItemForm.reset({
      description: item.description,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      inventoryItemId: item.inventoryItemId,
      tempId: item.tempId,
      id: item.id,
    });
  };

  // Handle inventory item selection
  const handleInventoryItemChange = (inventoryItemId: number) => {
    const inventoryItem = inventoryItems.find(item => item.id === inventoryItemId);
    if (inventoryItem) {
      lineItemForm.setValue("description", inventoryItem.name);
      lineItemForm.setValue("unitPrice", inventoryItem.cost || 0);
    }
    lineItemForm.setValue("inventoryItemId", inventoryItemId);
  };
  
  // File attachment handlers
  const handleFileUploadSuccess = (newFiles: FileAttachment[]) => {
    setAttachments(prev => [...prev, ...newFiles]);
    toast({
      title: "Files uploaded successfully",
      description: `${newFiles.length} file(s) have been attached to this purchase order.`,
    });
  };
  
  const handleFileDelete = async (fileId: number) => {
    try {
      await apiRequest("DELETE", `/api/files/${fileId}`);
      setAttachments(prev => prev.filter(file => file.id !== fileId));
      toast({
        title: "File deleted",
        description: "The file has been removed from this purchase order.",
      });
    } catch (error) {
      console.error("Error deleting file:", error);
      toast({
        title: "Error deleting file",
        description: "There was a problem removing the file. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="details" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">Order Details</TabsTrigger>
          <TabsTrigger value="items">Line Items</TabsTrigger>
          <TabsTrigger value="attachments">Attachments</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-6">
                  {/* Supplier */}
                  <FormField
                    control={form.control}
                    name="supplierId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier *</FormLabel>
                        <Select 
                          onValueChange={(value) => field.onChange(parseInt(value))} 
                          value={field.value?.toString() || (suppliers.length > 0 ? suppliers[0].id.toString() : "0")}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a supplier" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {suppliers.map((supplier) => (
                              <SelectItem key={supplier.id} value={supplier.id.toString()}>
                                {supplier.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Order Number */}
                  <FormField
                    control={form.control}
                    name="orderNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Order Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="PO-2023-0001" {...field} />
                        </FormControl>
                        <FormDescription>
                          A unique identifier for this purchase order.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Order Date */}
                  <FormField
                    control={form.control}
                    name="orderDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Order Date *</FormLabel>
                        <DatePicker
                          date={field.value}
                          setDate={field.onChange}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Expected Delivery Date */}
                  <FormField
                    control={form.control}
                    name="expectedDeliveryDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Expected Delivery Date</FormLabel>
                        <DatePicker
                          date={field.value}
                          setDate={field.onChange}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-6">
                  {/* Status */}
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status *</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value || "Draft"}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Draft">Draft</SelectItem>
                            <SelectItem value="Sent">Sent</SelectItem>
                            <SelectItem value="Received">Received</SelectItem>
                            <SelectItem value="Partial">Partial</SelectItem>
                            <SelectItem value="Cancelled">Cancelled</SelectItem>
                            <SelectItem value="Pending">Pending</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Delivery Address */}
                  <FormField
                    control={form.control}
                    name="deliveryAddress"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Delivery Address</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter delivery address" 
                            className="min-h-[100px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Notes */}
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Add any additional notes" 
                            className="min-h-[80px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div>
                <FormField
                  control={form.control}
                  name="terms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Terms and Conditions</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter terms and conditions" 
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="py-2">
                    <CardTitle className="text-sm font-medium">Subtotal</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="flex items-center">
                      <span className="text-xl mr-2">$</span>
                      <Input 
                        readOnly
                        className="text-2xl font-bold bg-gray-50" 
                        value={calculateSubtotal().toFixed(2)}
                        name="subtotal"
                      />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="py-2">
                    <CardTitle className="text-sm font-medium">Tax (20%)</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="flex items-center">
                      <span className="text-xl mr-2">$</span>
                      <Input 
                        readOnly
                        className="text-2xl font-bold bg-gray-50" 
                        value={calculateTax().toFixed(2)}
                        name="tax"
                      />
                    </div>
                  </CardContent>
                </Card>
                <Card className="md:col-span-2 bg-primary/5">
                  <CardHeader className="py-2">
                    <CardTitle className="text-sm font-medium">Total</CardTitle>
                  </CardHeader>
                  <CardContent className="py-2">
                    <div className="flex items-center">
                      <span className="text-xl mr-2">$</span>
                      <Input 
                        readOnly
                        className="text-2xl font-bold text-primary bg-primary/10" 
                        value={calculateTotal().toFixed(2)}
                        name="total"
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </DialogClose>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => setActiveTab("items")}
                >
                  Next: Line Items
                </Button>
              </div>
            </form>
          </Form>
        </TabsContent>
        
        <TabsContent value="items">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Line Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Line Items Form */}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      console.log("Add item form submitted", lineItemForm.getValues());
                      lineItemForm.handleSubmit(addLineItem)(e);
                    }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6"
                  >
                    <div className="space-y-4">
                      {/* Inventory Item */}
                      <div className="space-y-2">
                        <Label htmlFor="inventoryItemId">Select Inventory Item</Label>
                        <Select 
                          onValueChange={(value) => handleInventoryItemChange(parseInt(value))}
                          value={lineItemForm.watch("inventoryItemId")?.toString() || ""}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select an item" />
                          </SelectTrigger>
                          <SelectContent>
                            {inventoryItems.length > 0 ? (
                              inventoryItems.map((item) => (
                                <SelectItem key={item.id} value={item.id.toString()}>
                                  {item.name} ({item.sku})
                                </SelectItem>
                              ))
                            ) : (
                              <SelectItem value="no-items">No inventory items available</SelectItem>
                            )}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Description */}
                      <div className="space-y-2">
                        <Label htmlFor="description">Description *</Label>
                        <Input
                          id="description"
                          placeholder="Item description"
                          {...lineItemForm.register("description")}
                        />
                        {lineItemForm.formState.errors.description && (
                          <p className="text-red-500 text-xs">
                            {lineItemForm.formState.errors.description.message}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-4">
                      {/* Quantity */}
                      <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity *</Label>
                        <Input
                          id="quantity"
                          type="number"
                          min="1"
                          step="1"
                          {...lineItemForm.register("quantity", {
                            valueAsNumber: true,
                          })}
                        />
                        {lineItemForm.formState.errors.quantity && (
                          <p className="text-red-500 text-xs">
                            {lineItemForm.formState.errors.quantity.message}
                          </p>
                        )}
                      </div>

                      {/* Unit Price */}
                      <div className="space-y-2">
                        <Label htmlFor="unitPrice">Unit Price *</Label>
                        <Input
                          id="unitPrice"
                          type="number"
                          min="0"
                          step="0.01"
                          {...lineItemForm.register("unitPrice", {
                            valueAsNumber: true,
                          })}
                        />
                        {lineItemForm.formState.errors.unitPrice && (
                          <p className="text-red-500 text-xs">
                            {lineItemForm.formState.errors.unitPrice.message}
                          </p>
                        )}
                      </div>

                      <div className="pt-4">
                        <Button 
                          type="button" 
                          className="w-full bg-primary hover:bg-primary/90 text-white"
                          onClick={async (e) => {
                            e.preventDefault();
                            console.log("Add/Update Item button clicked");
                            console.log("Form values:", lineItemForm.getValues());
                            console.log("Form errors:", lineItemForm.formState.errors);
                            
                            // Validate the form before submission
                            const isValid = await lineItemForm.trigger();
                            console.log("Form validation result:", isValid);
                            
                            if (isValid) {
                              const formData = lineItemForm.getValues();
                              addLineItem(formData);
                            } else {
                              console.error("Form validation failed:", lineItemForm.formState.errors);
                              toast({
                                title: "Validation Error",
                                description: "Please check all required fields",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          {editingItem ? "Update Item" : "Add Item"}
                        </Button>
                      </div>
                    </div>
                  </form>

                  {/* Line Items Table */}
                  <Card>
                    <CardContent className="p-0">
                      {lineItems.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-48 text-center p-4">
                          <Package className="h-12 w-12 text-gray-300 mb-3" />
                          <h3 className="text-lg font-medium">No items added yet</h3>
                          <p className="text-sm text-gray-500 mt-1 max-w-md">
                            Add items to this purchase order using the form above.
                          </p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Description</TableHead>
                                <TableHead>Quantity</TableHead>
                                <TableHead>Unit Price</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead>Actions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {lineItems.map((item) => (
                                <TableRow key={item.tempId || item.id || `temp-${Math.random()}`}>
                                  <TableCell className="font-medium">
                                    {item.description}
                                  </TableCell>
                                  <TableCell>{item.quantity}</TableCell>
                                  <TableCell>
                                    {formatMoney(item.unitPrice)}
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    {formatMoney(item.quantity * item.unitPrice)}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => editLineItem(item)}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-red-500"
                                        onClick={() => removeLineItem(item.tempId, item.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setActiveTab("details")}>
                Back to Details
              </Button>
              <Button 
                type="submit"
                onClick={(e) => {
                  e.preventDefault();
                  console.log("Create/Update Purchase Order button clicked (details tab)");
                  onSubmit(form.getValues());
                }}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex items-center gap-1 bg-primary hover:bg-primary/90 text-white font-medium"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {purchaseOrder ? "Update Purchase Order" : "Create Purchase Order"}
              </Button>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="attachments">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">File Attachments</CardTitle>
                <CardDescription>
                  Upload and manage files related to this purchase order
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <FileUpload
                    relatedType="purchaseOrders"
                    relatedId={purchaseOrder?.id}
                    onUploadSuccess={handleFileUploadSuccess}
                    maxSize={5}
                    maxFiles={10}
                    accept={{
                      'application/pdf': ['.pdf'],
                      'image/jpeg': ['.jpg', '.jpeg'],
                      'image/png': ['.png'],
                      'application/msword': ['.doc'],
                      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                      'application/vnd.ms-excel': ['.xls'],
                      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
                    }}
                  />
                  
                  <FileList 
                    files={attachments} 
                    onDelete={handleFileDelete} 
                  />
                </div>
              </CardContent>
            </Card>
            
            <div className="flex justify-end gap-2">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setActiveTab("items")}
              >
                Back to Line Items
              </Button>
              <Button 
                type="submit"
                onClick={(e) => {
                  e.preventDefault();
                  console.log("Create/Update Purchase Order button clicked");
                  onSubmit(form.getValues());
                }}
                className="bg-primary hover:bg-primary/90 text-white font-medium"
              >
                {purchaseOrder ? "Update Purchase Order" : "Create Purchase Order"}
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}