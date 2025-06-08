import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { PurchaseOrder } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
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
  DialogFooter,
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
  Truck,
  Mail
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
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [includePdf, setIncludePdf] = useState(true);
  
  // Get all purchase orders
  const { 
    data: purchaseOrders = [], 
    isLoading, 
    isError 
  } = useQuery<PurchaseOrder[]>({
    queryKey: ["/api/purchase-orders"],
  });
  
  // Get suppliers for email functionality
  const { data: suppliers = [] } = useQuery<any[]>({
    queryKey: ["/api/suppliers"],
  });

  // Email purchase order mutation - MUST be declared before any early returns
  const emailPurchaseOrder = useMutation({
    mutationFn: async (data: { id: number; email: string; subject: string; body: string; includePdf: boolean }) => {
      // Send email with provided parameters
      await apiRequest("POST", `/api/purchase-orders/${data.id}/email`, {
        recipientEmail: data.email,
        subject: data.subject,
        body: data.body,
        includePdf: data.includePdf
      });
    },
    onSuccess: () => {
      toast({
        title: "Purchase order emailed",
        description: "Purchase order has been emailed successfully.",
      });
      setIsEmailDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
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
          </CardContent>
        </Card>
      </div>
    );
  }

  // Initialize email dialog fields when opening the dialog
  const handleEmailDialogOpen = (po: PurchaseOrder) => {
    setSelectedPO(po);
    
    // Try to find supplier email from suppliers data
    const supplier = (suppliers as any[]).find((s: any) => s.id === po.supplierId);
    const supplierEmail = supplier?.email || "";
    
    setRecipientEmail(supplierEmail);
    setEmailSubject(`Purchase Order #${po.poNumber || po.id}`);
    setEmailBody("Please find attached the purchase order. Let us know if you have any questions.");
    setIncludePdf(true);
    setIsEmailDialogOpen(true);
  };

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
                  <SelectItem value="all">All Statuses</SelectItem>
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
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-blue-500"
                            title="View PDF"
                            onClick={() => {
                              toast({
                                title: "Generating PDF",
                                description: "The PDF is being generated and will open in a new tab",
                              });
                              // This would call the PDF generation function
                              window.open(`/api/purchase-orders/${po.id}/pdf`, '_blank');
                            }}
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-purple-500"
                            title="Email to supplier"
                            onClick={() => handleEmailDialogOpen(po)}
                            disabled={po.status === 'Draft'}
                          >
                            <Mail className="h-4 w-4" />
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

      {/* Email Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Email Purchase Order
            </DialogTitle>
            <DialogDescription>
              Send this purchase order to the supplier via email.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="recipient">Recipient Email *</Label>
              <Input
                id="recipient"
                type="email"
                placeholder="supplier@example.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="subject">Subject *</Label>
              <Input
                id="subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Purchase Order #123"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="message">Message *</Label>
              <Textarea
                id="message"
                className="min-h-24"
                value={emailBody}
                onChange={(e) => setEmailBody(e.target.value)}
                placeholder="Please find attached the purchase order."
                required
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="includePdf" 
                checked={includePdf}
                onCheckedChange={(checked) => setIncludePdf(checked as boolean)}
              />
              <label
                htmlFor="includePdf"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Include PDF attachment
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEmailDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedPO) return;
                if (!recipientEmail.trim()) {
                  toast({
                    title: "Error",
                    description: "Recipient email is required",
                    variant: "destructive",
                  });
                  return;
                }
                if (!emailSubject.trim()) {
                  toast({
                    title: "Error",
                    description: "Email subject is required",
                    variant: "destructive",
                  });
                  return;
                }
                if (!emailBody.trim()) {
                  toast({
                    title: "Error",
                    description: "Email message is required",
                    variant: "destructive",
                  });
                  return;
                }
                emailPurchaseOrder.mutate({
                  id: selectedPO.id,
                  email: recipientEmail,
                  subject: emailSubject,
                  body: emailBody,
                  includePdf: includePdf
                });
              }}
              disabled={emailPurchaseOrder.isPending}
              className="bg-primary hover:bg-primary/90 text-white gap-1"
            >
              {emailPurchaseOrder.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  Send Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}