import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, Mail, Printer } from "lucide-react";
import { format } from "date-fns";
import { useSettings } from "@/hooks/use-settings";
import { useToast } from "@/hooks/use-toast";
import { PurchaseOrder } from "@shared/schema";

export default function PODetailsPage() {
  const { id } = useParams();
  const { formatMoney } = useSettings();
  const { toast } = useToast();
  
  const { data: purchaseOrder, isLoading, error } = useQuery<PurchaseOrder>({
    queryKey: ["/api/purchase-orders", id],
    queryFn: () => fetch(`/api/purchase-orders/${id}`).then(res => res.json()),
    enabled: !!id,
  });

  // Handle edit purchase order
  const handleEdit = () => {
    if (purchaseOrder) {
      window.location.href = `/purchase-orders/${purchaseOrder.id}/edit`;
    }
  };

  // Handle email purchase order
  const handleEmail = async () => {
    if (!purchaseOrder) return;
    
    try {
      const email = prompt("Enter email address to send the purchase order:");
      if (!email) return;

      const response = await fetch(`/api/purchase-orders/${purchaseOrder.id}/email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ to: email }),
      });

      if (response.ok) {
        toast({
          title: "Email sent successfully",
          description: `Purchase order ${purchaseOrder.poNumber} has been sent to ${email}`,
        });
      } else {
        throw new Error("Failed to send email");
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send email. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handle print PDF
  const handlePrintPDF = () => {
    if (purchaseOrder) {
      window.open(`/api/purchase-orders/${purchaseOrder.id}/pdf`, "_blank");
    }
  };



  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary">Pending</Badge>;
      case "approved":
        return <Badge className="bg-blue-500">Approved</Badge>;
      case "ordered":
        return <Badge className="bg-orange-500">Ordered</Badge>;
      case "received":
        return <Badge className="bg-green-500">Received</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
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
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Purchase Orders
            </Button>
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
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Purchase Order {purchaseOrder.poNumber}</h1>
            <p className="text-gray-600">
              Created on {format(new Date(purchaseOrder.issueDate), "PPP")}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {getStatusBadge(purchaseOrder.status)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Purchase Order Details */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Purchase Order Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">PO Number</label>
                  <p className="font-semibold">{purchaseOrder.poNumber}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Issue Date</label>
                  <p>{format(new Date(purchaseOrder.issueDate), "PPP")}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Expected Delivery</label>
                  <p>{purchaseOrder.expectedDeliveryDate ? format(new Date(purchaseOrder.expectedDeliveryDate), "PPP") : "Not specified"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <div>{getStatusBadge(purchaseOrder.status)}</div>
                </div>
              </div>
              
              {purchaseOrder.notes && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Notes</label>
                  <p className="mt-1 p-3 bg-gray-50 rounded-md">{purchaseOrder.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Line Items */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Line Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <div className="w-12 h-12 mx-auto mb-4 bg-gray-200 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📄</span>
                </div>
                <p>Line items will be displayed here</p>
                <p className="text-sm">Feature coming soon</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Card */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal:</span>
                  <span>{formatMoney(purchaseOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tax:</span>
                  <span>{formatMoney(purchaseOrder.tax || 0)}</span>
                </div>
                {/* Discount field doesn't exist in schema, skip it */}
                <div className="border-t pt-2">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>{formatMoney(purchaseOrder.total)}</span>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-2">Supplier Information</h4>
                <p className="text-sm text-gray-600">Supplier ID: {purchaseOrder.supplierId}</p>
                <p className="text-sm text-gray-500 mt-2">Detailed supplier info will be loaded here</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}