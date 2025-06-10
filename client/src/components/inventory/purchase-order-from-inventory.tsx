import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { InventoryItem, Supplier } from "@shared/schema";

// UI Components
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon, ShoppingCart, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const purchaseOrderSchema = z.object({
  supplierName: z.string().min(1, "Supplier is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Unit price must be non-negative"),
  orderDate: z.date({
    required_error: "Order date is required",
  }),
  deliveryDate: z.date().optional(),
  notes: z.string().optional(),
});

type PurchaseOrderFormData = z.infer<typeof purchaseOrderSchema>;

interface PurchaseOrderFromInventoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inventoryItem: InventoryItem | null;
}

export default function PurchaseOrderFromInventory({
  open,
  onOpenChange,
  inventoryItem,
}: PurchaseOrderFromInventoryProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Tax calculation state
  const [taxRate, setTaxRate] = useState(inventoryItem?.taxRate ? inventoryItem.taxRate * 100 : 10); // Convert to percentage
  const [subtotal, setSubtotal] = useState(0);
  const [tax, setTax] = useState(0);
  const [total, setTotal] = useState(0);

  const form = useForm<PurchaseOrderFormData>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: {
      supplierName: "",
      quantity: Math.max(1, (inventoryItem?.reorderPoint || 10) - (inventoryItem?.currentStock || 0)),
      unitPrice: inventoryItem?.cost || 0,
      orderDate: new Date(),
      deliveryDate: undefined,
      notes: `Reorder for inventory item: ${inventoryItem?.name || ""}`,
    },
  });

  // Calculate totals whenever quantity, unit price, or tax rate changes
  const quantity = form.watch("quantity");
  const unitPrice = form.watch("unitPrice");

  useEffect(() => {
    const sub = (quantity || 0) * (unitPrice || 0);
    const computedTax = sub * (taxRate / 100);
    setSubtotal(sub);
    setTax(computedTax);
    setTotal(sub + computedTax);
  }, [quantity, unitPrice, taxRate]);

  // Get suppliers for autocomplete
  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const createPOMutation = useMutation({
    mutationFn: async (data: PurchaseOrderFormData) => {
      if (!inventoryItem) throw new Error("No inventory item selected");

      const payload = {
        supplierName: data.supplierName,
        orderDate: data.orderDate.toISOString(),
        deliveryDate: data.deliveryDate?.toISOString(),
        notes: data.notes,
        status: "draft",
        taxRate: taxRate / 100, // Convert percentage to decimal
        items: [
          {
            description: `${inventoryItem.name} (SKU: ${inventoryItem.sku})`,
            quantity: data.quantity,
            unitPrice: data.unitPrice,
          },
        ],
      };

      const response = await fetch("/api/purchase-orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to create purchase order");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      toast({
        title: "Purchase order created",
        description: "The purchase order has been created successfully.",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error) => {
      console.error("Error creating purchase order:", error);
      toast({
        title: "Error",
        description: "Failed to create purchase order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: PurchaseOrderFormData) => {
    createPOMutation.mutate(data);
  };

  if (!inventoryItem) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0">
        <DialogHeader className="p-6 border-b">
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-green-500" />
            Create Purchase Order
          </DialogTitle>
          <DialogDescription>
            Create a purchase order to restock {inventoryItem.name}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 overflow-y-auto" style={{ maxHeight: "70vh" }}>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Item Information Display */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-semibold mb-2">Item Details</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Name:</span> {inventoryItem.name}
                  </div>
                  <div>
                    <span className="font-medium">SKU:</span> {inventoryItem.sku}
                  </div>
                  <div>
                    <span className="font-medium">Current Stock:</span> {inventoryItem.currentStock || 0}
                  </div>
                  <div>
                    <span className="font-medium">Reorder Point:</span> {inventoryItem.reorderPoint || 0}
                  </div>
                </div>
              </div>

              {/* Supplier Selection */}
              <FormField
                control={form.control}
                name="supplierName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Supplier *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a supplier" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.name}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Quantity and Unit Price */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quantity *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unitPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Price *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Order Date */}
              <FormField
                control={form.control}
                name="orderDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Order Date *</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Delivery Date */}
              <FormField
                control={form.control}
                name="deliveryDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Expected Delivery Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date (optional)</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
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
                        placeholder="Additional notes for this purchase order..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Tax Rate Input */}
              <div>
                <label htmlFor="taxRate" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Tax (%)
                </label>
                <Input
                  id="taxRate"
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={taxRate}
                  onChange={(e) => setTaxRate(Number(e.target.value))}
                  className="mt-1"
                  placeholder="10.00"
                />
              </div>

              {/* Total Calculation Display */}
              <div className="rounded bg-muted p-4 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax ({taxRate}%):</span>
                  <span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Total Amount:</span>
                  <span className="text-primary">${total.toFixed(2)}</span>
                </div>
              </div>
            </form>
          </Form>
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={createPOMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={form.handleSubmit(onSubmit)}
            disabled={createPOMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            {createPOMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Create Purchase Order
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}