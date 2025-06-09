import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PurchaseOrder } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

export default function POEditPage() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: purchaseOrder, isLoading, error } = useQuery<PurchaseOrder>({
    queryKey: ["/api/purchase-orders", id],
    queryFn: () => fetch(`/api/purchase-orders/${id}`).then(res => res.json()),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded mb-4"></div>
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
          <Button variant="outline" onClick={() => setLocation("/purchase-orders")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Purchase Orders
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setLocation("/purchase-orders")}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit Purchase Order {purchaseOrder.poNumber}</h1>
            <p className="text-gray-600">Modify purchase order details</p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Purchase Order</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-gray-600 mb-4">
              Purchase Order editing functionality will be implemented here.
            </p>
            <p className="text-sm text-gray-500">
              This would include forms to edit PO details, line items, supplier information, etc.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}