import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { PurchaseOrder } from "@shared/schema";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Search, 
  Filter,
  Loader2,
  Eye,
  Pencil,
  Mail,
  Printer,
  ClipboardCheck,
  ShoppingCart,
  Truck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/use-settings";
import { format } from "date-fns";
import PurchaseOrderForm from "@/components/forms/purchase-order-form";
import { EmailDialog } from "@/components/EmailDialog";

export default function PurchaseOrdersPage() {
  const { toast } = useToast();
  const { formatMoney } = useSettings();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

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
  
  // Get all purchase orders
  const { 
    data: purchaseOrders = [], 
    isLoading, 
    isError,
    error 
  } = useQuery<PurchaseOrder[]>({
    queryKey: ["/api/purchase-orders"],
  });

  // Filter purchase orders based on search term and status
  const filteredPOs = purchaseOrders.filter(po => {
    const matchesSearch = 
      searchTerm === "" || 
      (po.poNumber && po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = 
      statusFilter === "" || 
      po.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });



  // Handle view purchase order details
  const handleViewPO = (poId: number) => {
    // Navigate to purchase order details page
    setLocation(`/purchase-orders/${poId}`);
  };

  // Handle edit purchase order
  const handleEditPO = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setIsDialogOpen(true);
  };



  // Handle print PDF
  const handlePrintPDF = (po: PurchaseOrder) => {
    window.open(`/api/purchase-orders/${po.id}/pdf`, "_blank");
  };

  // Get badge color based on status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Draft":
        return <Badge variant="outline">Draft</Badge>;
      case "Sent":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Sent</Badge>;
      case "Received":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          <Truck className="w-3 h-3 mr-1" /> Received
        </Badge>;
      case "Cancelled":
        return <Badge variant="destructive">Cancelled</Badge>;
      case "Pending":
        return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      case "Partial":
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Partial</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Early return for error state - now safely after all hooks
  if (isError) {
    return (
      <div className="container py-10">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Error Loading Purchase Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p>There was a problem loading the purchase order data. Please try again.</p>
            <div className="mt-4 p-4 bg-gray-100 rounded">
              <h4 className="font-semibold">Debug Information:</h4>
              <pre className="text-sm mt-2 text-red-600">
                {error ? String(error) : 'Unknown error'}
              </pre>
            </div>
            <Button 
              className="mt-4" 
              onClick={() => {
                console.log("Retrying purchase orders query...");
                queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
              }}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Purchase Orders</h1>
          <p className="text-muted-foreground">
            Create and manage purchase orders for suppliers
          </p>
        </div>
        <Button asChild className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white">
          <Link to="/purchase-orders/new">
            <ShoppingCart className="h-4 w-4" /> New Purchase Order
          </Link>
        </Button>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center">
                <ShoppingCart className="h-5 w-5 mr-2 text-primary" />
                {selectedPO ? "Edit Purchase Order" : "Create New Purchase Order"}
              </DialogTitle>
              <DialogDescription>
                {selectedPO 
                  ? "Make changes to the existing purchase order. All fields marked with an asterisk (*) are required." 
                  : "Fill in the details for the new purchase order. All fields marked with an asterisk (*) are required."}
              </DialogDescription>
            </DialogHeader>
            <PurchaseOrderForm 
              purchaseOrder={selectedPO} 
              onSuccess={() => {
                setIsDialogOpen(false);
                toast({
                  title: selectedPO ? "Purchase order updated" : "Purchase order created",
                  description: selectedPO 
                    ? "Your purchase order has been updated successfully." 
                    : "Your purchase order has been created successfully.",
                });
                setSelectedPO(null);
              }} 
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter Controls */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Search & Filter
          </CardTitle>
          <CardDescription>
            Find purchase orders by PO number or filter by status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by PO number or supplier..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-48">
              <Select value={statusFilter || undefined} onValueChange={(value) => setStatusFilter(value || "")}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="confirmed">Confirmed</SelectItem>
                  <SelectItem value="received">Received</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="partially_received">Partially Received</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(searchTerm || statusFilter) && (
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("");
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Purchase Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Orders</CardTitle>
          <CardDescription>
            {filteredPOs.length} purchase order{filteredPOs.length !== 1 ? 's' : ''} found
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredPOs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-4">
              <ShoppingCart className="h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-lg font-medium">No purchase orders found</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-md">
                {searchTerm || statusFilter
                  ? "Try adjusting your search or filters to find what you're looking for."
                  : "Get started by creating your first purchase order using the 'New Purchase Order' button."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>PO Number</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Expected Delivery</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPOs.map((po) => (
                    <TableRow key={po.id}>
                      <TableCell className="font-medium">
                        {po.poNumber}
                      </TableCell>
                      <TableCell>Supplier {po.supplierId}</TableCell>
                      <TableCell>
                        {format(new Date(po.issueDate), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>{getStatusBadge(po.status)}</TableCell>
                      <TableCell className="font-medium">
                        {formatMoney(po.total)}
                      </TableCell>
                      <TableCell>
                        {po.expectedDeliveryDate ? 
                          format(new Date(po.expectedDeliveryDate), "MMM d, yyyy") : 
                          "Not specified"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewPO(po.id)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditPO(po)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <EmailDialog 
                            poId={po.id} 
                            poNumber={po.poNumber}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePrintPDF(po)}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          {po.status === "draft" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-green-500"
                              onClick={() => updateStatusMutation.mutate({ poId: po.id, status: "sent" })}
                              disabled={updateStatusMutation.isPending}
                            >
                              <ClipboardCheck className="h-4 w-4" />
                            </Button>
                          )}
                          {po.status === "sent" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-blue-500"
                              onClick={() => updateStatusMutation.mutate({ poId: po.id, status: "confirmed" })}
                              disabled={updateStatusMutation.isPending}
                            >
                              <ClipboardCheck className="h-4 w-4" />
                            </Button>
                          )}
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
  );
}