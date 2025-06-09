import React, { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Package, Plus } from "lucide-react";

const TAX_RATE = 0.2; // 20%

interface POLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

interface NewPurchaseOrder {
  supplierName: string;
  orderDate: string;              // yyyy-mm-dd
  expectedDeliveryDate?: string;
  notes?: string;
  items: POLineItem[];
  subtotal: number;
  tax: number;                    // 20%
  total: number;
}

export default function POCreatePage() {
  const [, setLocation] = useLocation();

  // ----- header fields -------------------------------------------------
  const [supplierName, setSupplierName] = useState("");
  const [orderDate, setOrderDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");

  // ----- single line-item edit form ------------------------------------
  const [liDesc, setLiDesc] = useState("");
  const [liQty, setLiQty] = useState(1);
  const [liPrice, setLiPrice] = useState(0);

  // ----- accumulated items --------------------------------------------
  const [items, setItems] = useState<POLineItem[]>([]);

  const addItem = () => {
    if (!liDesc.trim() || liQty <= 0 || liPrice <= 0) {
      toast({ 
        title: "Validation Error",
        description: "Fill every line-item field with valid values",
        variant: "destructive"
      });
      return;
    }
    setItems((prev) => [
      ...prev,
      { description: liDesc.trim(), quantity: liQty, unitPrice: liPrice },
    ]);
    setLiDesc("");
    setLiQty(1);
    setLiPrice(0);
    
    toast({
      title: "Item Added",
      description: `Added "${liDesc.trim()}" to purchase order`
    });
  };

  const removeItem = (idx: number) => {
    const removedItem = items[idx];
    setItems((prev) => prev.filter((_, i) => i !== idx));
    toast({
      title: "Item Removed",
      description: `Removed "${removedItem.description}" from purchase order`
    });
  };

  // ----- summary -------------------------------------------------------
  const subtotal = useMemo(
    () => items.reduce((s, i) => s + i.quantity * i.unitPrice, 0),
    [items]
  );
  const tax = subtotal * TAX_RATE;
  const total = subtotal + tax;

  // ----- submit --------------------------------------------------------
  const handleSubmit = async () => {
    if (!supplierName.trim()) {
      toast({ 
        title: "Validation Error",
        description: "Supplier name is required",
        variant: "destructive"
      });
      return;
    }
    if (items.length === 0) {
      toast({ 
        title: "Validation Error",
        description: "Add at least one line-item",
        variant: "destructive"
      });
      return;
    }

    const payload: NewPurchaseOrder = {
      supplierName: supplierName.trim(),
      orderDate,
      expectedDeliveryDate: expectedDeliveryDate || undefined,
      notes: notes.trim() || undefined,
      items,
      subtotal,
      tax,
      total,
    };

    try {
      const response = await fetch("/api/purchase-orders", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Status ${response.status}: ${errorData}`);
      }
      
      toast({ 
        title: "Success!",
        description: "Purchase Order created successfully 🎉"
      });
      setLocation("/purchase-orders");
    } catch (err: any) {
      console.error("Purchase Order creation error:", err);
      toast({ 
        title: "Server Error",
        description: err.message,
        variant: "destructive"
      });
    }
  };

  // ---------------------------------------------------------------------
  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Create Purchase Order</h1>
        <Button variant="outline" onClick={() => setLocation("/purchase-orders")}>
          Back to Purchase Orders
        </Button>
      </div>

      {/* --- Header Details ---------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Order Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="supplier">Supplier Name *</Label>
              <Input
                id="supplier"
                placeholder="Enter supplier name"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orderDate">Order Date *</Label>
              <Input
                id="orderDate"
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="deliveryDate">Expected Delivery Date</Label>
              <Input
                id="deliveryDate"
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                rows={3}
                placeholder="Additional notes or instructions"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* --- Line-item entry ------------------------------------------ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Line Items
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="description">Description *</Label>
              <Input
                id="description"
                placeholder="Item description"
                value={liDesc}
                onChange={(e) => setLiDesc(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="number"
                min={1}
                placeholder="Qty"
                value={liQty}
                onChange={(e) => setLiQty(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="unitPrice">Unit Price *</Label>
              <Input
                id="unitPrice"
                type="number"
                min={0}
                step={0.01}
                placeholder="0.00"
                value={liPrice}
                onChange={(e) => setLiPrice(Number(e.target.value))}
              />
            </div>
          </div>
          <Button onClick={addItem} className="w-full md:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>

          {/* Items table */}
          {items.length > 0 ? (
            <div className="mt-6 border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Description</th>
                    <th className="px-4 py-3 text-center font-medium">Qty</th>
                    <th className="px-4 py-3 text-center font-medium">Unit Price</th>
                    <th className="px-4 py-3 text-right font-medium">Line Total</th>
                    <th className="px-4 py-3 text-center font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, index) => (
                    <tr key={index} className="border-t">
                      <td className="px-4 py-3">{item.description}</td>
                      <td className="px-4 py-3 text-center">{item.quantity}</td>
                      <td className="px-4 py-3 text-center">${item.unitPrice.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        ${(item.quantity * item.unitPrice).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No items added yet. Add your first line item above.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* --- Summary -------------------------------------------------- */}
      <Card>
        <CardHeader>
          <CardTitle>Order Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end">
            <div className="w-full max-w-sm space-y-3">
              <div className="flex justify-between">
                <span>Subtotal ({items.length} items):</span>
                <span className="font-medium">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax (20%):</span>
                <span className="font-medium">${tax.toFixed(2)}</span>
              </div>
              <hr />
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* --- Actions -------------------------------------------------- */}
      <div className="flex justify-end gap-4">
        <Button 
          variant="outline" 
          onClick={() => setLocation("/purchase-orders")}
        >
          Cancel
        </Button>
        <Button 
          onClick={handleSubmit}
          disabled={items.length === 0 || !supplierName.trim()}
        >
          Create Purchase Order
        </Button>
      </div>
    </div>
  );
}