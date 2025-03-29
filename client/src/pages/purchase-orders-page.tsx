import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PurchaseOrder } from "@shared/schema";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  PlusCircle, 
  Search, 
  Filter,
  FileText,
  Loader2,
  Eye,
  Pencil,
  Trash2,
  ClipboardCheck,
  ShoppingCart,
  Truck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/use-settings";
import { format } from "date-fns";
import PurchaseOrderForm from "@/components/forms/purchase-order-form";

export default function PurchaseOrdersPage() {
  const { toast } = useToast();
  const { formatMoney } = useSettings();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  
  // Get all purchase orders
  const { 
    data: purchaseOrders = [], 
    isLoading, 
    isError 
  } = useQuery<PurchaseOrder[]>({
    queryKey: ["/api/purchase-orders"],
  });

  // Filter purchase orders based on search term and status
  const filteredPOs = purchaseOrders.filter(po => {
    const matchesSearch = 
      searchTerm === "" || 
      po.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (po.supplierName && po.supplierName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = 
      statusFilter === "" || 
      po.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Handle edit purchase order
  const handleEditPO = (po: PurchaseOrder) => {
    setSelectedPO(po);
    setIsDialogOpen(true);
  };

  // Handle view purchase order details
  const handleViewPO = (poId: number) => {
    // Navigate to purchase order details page
    window.location.href = `/purchase-orders/${poId}`;
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

  if (isError) {
    return (
      <div className="container py-10">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Error Loading Purchase Orders</CardTitle>
          </CardHeader>
          <CardContent>
            <p>There was a problem loading the purchase order data. Please try again.</p>
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
        <Button 
          className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-white"
          onClick={() => setIsDialogOpen(true)}
        >
          <ShoppingCart className="h-4 w-4" /> New Purchase Order
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
              }}
              defaultValues={!selectedPO ? {
                issueDate: new Date().toISOString().split('T')[0],
                status: 'Draft',
                items: [],
                tax: 0,
                discount: 0
              } : undefined}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter and search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search by PO number or supplier..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    {statusFilter || "All Statuses"}
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Statuses</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Sent">Sent</SelectItem>
                  <SelectItem value="Received">Received</SelectItem>
                  <SelectItem value="Partial">Partial</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => {
                setSearchTerm("");
                setStatusFilter("");
              }}>
                Clear
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Purchase Orders table */}
      <Card>
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
                        {po.orderNumber}
                      </TableCell>
                      <TableCell>{po.supplierName}</TableCell>
                      <TableCell>
                        {format(new Date(po.orderDate), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell>{getStatusBadge(po.status)}</TableCell>
                      <TableCell className="font-medium">
                        {formatMoney(po.totalAmount)}
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
                          {po.status === "Draft" && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-green-500"
                              onClick={() => {
                                toast({
                                  title: "Not implemented",
                                  description: "Mark as sent functionality will be added soon",
                                });
                              }}
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