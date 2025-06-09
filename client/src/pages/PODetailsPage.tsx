import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, Edit, Mail, Printer, CheckCircle } from "lucide-react";
import { format } from "date-fns";
import { useSettings } from "@/hooks/use-settings";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { EmailDialog } from "@/components/EmailDialog";
import PurchaseOrderForm from "@/components/forms/purchase-order-form";
import { PurchaseOrder } from "@shared/schema";

export default function PODetailsPage() {
  const { id } = useParams();
  const { formatMoney } = useSettings();
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const { data: purchaseOrder, isLoading, error } = useQuery<PurchaseOrder>({
    queryKey: ["/api/purchase-orders", id],
    queryFn: () => fetch(`/api/purchase-orders/${id}`).then(res => res.json()),
    enabled: !!id,
  });

  // Mutation for updating Purchase Order status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ poId, status }: { poId: number; status: string }) => {
      const response = await fetch(`/api/purchase-orders/${poId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to update status");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders", id] });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
      toast({
        title: "Status updated",
        description: "Purchase order status has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle status update
  const handleStatusUpdate = (newStatus: string) => {
    if (purchaseOrder) {
      updateStatusMutation.mutate({ poId: purchaseOrder.id, status: newStatus });
    }
  };

  // Handle edit purchase order
  const handleEdit = () => {
    if (purchaseOrder) {
      window.location.href = `/purchase-orders/${purchaseOrder.id}/edit`;
    }
  };

  // Handle print PDF
  const handlePrintPDF = () => {
    if (purchaseOrder) {
      window.open(`/api/purchase-orders/${purchaseOrder.id}/pdf`, "_blank");
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "sent":
        return <Badge className="bg-blue-500">Sent</Badge>;
      case "confirmed":
        return <Badge className="bg-green-500">Confirmed</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get next status for progression
  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case "draft":
        return "sent";
      case "sent":
        return "confirmed";
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-gray-200 rounded mb-4"></div>
          <div className="h-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !purchaseOrder) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Purchase Order Not Found</h1>
          <Link href="/purchase-orders">
            <Button>Back to Purchase Orders</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Link href="/purchase-orders">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <h1 className="text-2xl font-bold">Purchase Order Details</h1>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Status Update Button */}
          {getNextStatus(purchaseOrder.status) && (
            <Button
              onClick={() => handleStatusUpdate(getNextStatus(purchaseOrder.status)!)}
              disabled={updateStatusMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark as {getNextStatus(purchaseOrder.status)}
            </Button>
          )}
          
          <Button 
            variant="outline" 
            onClick={() => setIsEditDialogOpen(true)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
          
          <EmailDialog 
            poId={purchaseOrder.id} 
            poNumber={purchaseOrder.poNumber}
            trigger={
              <Button variant="outline">
                <Mail className="w-4 h-4 mr-2" />
                Email
              </Button>
            }
          />
          
          <Button variant="outline" onClick={handlePrintPDF}>
            <Printer className="w-4 h-4 mr-2" />
            Print PDF
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Purchase Order Details */}
          <Card>
            <CardHeader>
              <CardTitle>Purchase Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">PO Number</label>
                  <p className="text-lg font-semibold">{purchaseOrder.poNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Issue Date</label>
                  <p>{format(new Date(purchaseOrder.issueDate), "MMMM do, yyyy")}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Expected Delivery</label>
                  <p>{purchaseOrder.expectedDeliveryDate ? format(new Date(purchaseOrder.expectedDeliveryDate), "MMMM do, yyyy") : "Not specified"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-600">Status</label>
                  <div className="mt-1">
                    {getStatusBadge(purchaseOrder.status)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center py-8 text-gray-500">
                  <div className="bg-gray-100 rounded-lg p-8">
                    <p>Line items will be loaded here</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal:</span>
                <span>{formatMoney(purchaseOrder.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tax:</span>
                <span>{formatMoney(purchaseOrder.tax)}</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total:</span>
                  <span>{formatMoney(purchaseOrder.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Supplier Information */}
          <Card>
            <CardHeader>
              <CardTitle>Supplier Information</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-2">Supplier ID: {purchaseOrder.supplierId}</p>
              <p className="text-sm text-gray-500">Detailed supplier info will be loaded here</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Purchase Order</DialogTitle>
            <DialogDescription>
              Update purchase order details and line items.
            </DialogDescription>
          </DialogHeader>
          {purchaseOrder && (
            <PurchaseOrderForm 
              initialData={purchaseOrder}
              onSuccess={() => {
                setIsEditDialogOpen(false);
                queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}