import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { 
  Plus, 
  Search, 
  FileText, 
  Mail, 
  Download, 
  MoreHorizontal, 
  Edit, 
  Trash2,
  CheckCircle,
  Eye,
  Pencil
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/date-utils";
import InvoiceForm from "@/components/forms/invoice-form";
import { useSettings } from "@/hooks/use-settings";
import { exportArrayToExcel } from "@/lib/exportCsv";

export default function InvoicesPage() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { formatMoney } = useSettings();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMarkPaidDialogOpen, setIsMarkPaidDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);

  // Fetch invoices
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["/api/invoices", statusFilter],
    queryFn: async ({ queryKey }) => {
      const [_, status] = queryKey;
      const url = status ? `/api/invoices?status=${status}` : "/api/invoices";
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error("Failed to fetch invoices");
      }
      
      return res.json();
    }
  });

  // Fetch customers for the invoice details
  const { data: customers = [] } = useQuery({
    queryKey: ["/api/customers"],
  });

  // Fetch projects for the invoice details
  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
  });

  // Delete invoice mutation
  const deleteInvoice = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/invoices/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Invoice deleted",
        description: "Invoice has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setIsDeleteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mark invoice as paid mutation
  const markInvoicePaid = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("PUT", `/api/invoices/${id}`, { status: "paid" });
    },
    onSuccess: () => {
      toast({
        title: "Invoice updated",
        description: "Invoice has been marked as paid.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setIsMarkPaidDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Email invoice mutation
  const emailInvoice = useMutation({
    mutationFn: async (id: number) => {
      // Get the customer email for this invoice
      const invoice = filteredInvoices.find(inv => inv.id === id);
      if (!invoice || !invoice.customerId) {
        throw new Error("Invoice or customer information not found");
      }
      
      const customer = customers.find(c => c.id === invoice.customerId);
      if (!customer || !customer.email) {
        throw new Error("Customer email not found");
      }
      
      // Send email with customer's email as recipient
      await apiRequest("POST", `/api/invoices/${id}/email`, {
        recipientEmail: customer.email,
        subject: `Invoice #${invoice.invoiceNumber}`,
        includePdf: true
      });
    },
    onSuccess: () => {
      toast({
        title: "Invoice emailed",
        description: "Invoice has been emailed successfully.",
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

  // Handle invoice creation success
  const handleInvoiceCreated = () => {
    setIsCreateDialogOpen(false);
    toast({
      title: "Invoice created",
      description: "Invoice has been created successfully."
    });
  };

  // Filter invoices by search query
  const filteredInvoices = invoices.filter((invoice: any) => {
    return invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Get customer name by ID
  const getCustomerName = (customerId: number) => {
    const customer = customers.find((c: any) => c.id === customerId);
    return customer ? customer.name : "Unknown";
  };

  // Get project name by ID
  const getProjectName = (projectId: number) => {
    const project = projects.find((p: any) => p.id === projectId);
    return project ? project.name : "Unknown";
  };

  // Render status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-100">Draft</Badge>;
      case "issued":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">Issued</Badge>;
      case "sent":
        return <Badge variant="outline" className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100">Sent</Badge>;
      case "paid":
        return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">Paid</Badge>;
      case "overdue":
        return <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">Overdue</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-gray-300 text-gray-800 hover:bg-gray-300">Cancelled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Check if today is after due date for an invoice
  const isOverdue = (dueDate: string) => {
    const today = new Date();
    const due = new Date(dueDate);
    return today > due;
  };

  // Get customer email by ID
  const getCustomerEmail = (customerId: number) => {
    const customer = Array.isArray(customers) 
      ? customers.find((c: any) => c.id === customerId)
      : null;
    return customer ? customer.email || "—" : "—";
  };

  // Export invoices to Excel
  const onExportInvoices = () => {
    if (!invoices?.length) return;

    const rows = invoices.map((i: any) => ({
      InvoiceNumber: i.invoiceNumber,
      Customer: i.customerId ? getCustomerName(i.customerId) : "—",
      CustomerEmail: i.customerId ? getCustomerEmail(i.customerId) : "—",
      Project: i.projectId ? getProjectName(i.projectId) : "—",
      IssueDate: i.issueDate ? formatDate(i.issueDate, "MMM dd, yyyy") : "—",
      DueDate: i.dueDate ? formatDate(i.dueDate, "MMM dd, yyyy") : "—",
      Status: i.status,
      Amount: formatMoney(i.total)
    }));

    exportArrayToExcel(rows, `Invoices-${Date.now()}.xlsx`, "Invoices");
  };

  return (
    <div className="h-full">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Invoices</h2>
        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <div className="relative">
            <Input 
              type="text" 
              placeholder="Search invoices..." 
              className="pl-10 pr-4 py-2"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="h-5 w-5 absolute left-3 top-2.5 text-gray-400" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="issued">Issued</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            onClick={onExportInvoices}
            disabled={!invoices?.length}
            className="flex items-center whitespace-nowrap"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button 
            className="flex items-center bg-primary hover:bg-primary/90"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            New Invoice
          </Button>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-primary" />
                  Create New Invoice
                </DialogTitle>
                <DialogDescription>
                  Fill in the details to create a new invoice. All fields marked with an asterisk (*) are required.
                </DialogDescription>
              </DialogHeader>
              <InvoiceForm 
                onSuccess={handleInvoiceCreated} 
                onCancel={() => setIsCreateDialogOpen(false)}
                defaultValues={{
                  issueDate: new Date().toISOString().split('T')[0],
                  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                  status: 'draft',
                  items: []
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Invoice #</TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Customer</TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Project</TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Date</TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Due Date</TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Status</TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Amount</TableHead>
                    <TableHead className="text-right font-medium text-xs uppercase tracking-wider">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        No invoices found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInvoices.map((invoice: any) => (
                      <TableRow key={invoice.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="font-medium text-sm text-gray-900">{invoice.invoiceNumber}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-900">
                            {invoice.customerId ? getCustomerName(invoice.customerId) : "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-900">
                            {invoice.projectId ? getProjectName(invoice.projectId) : "—"}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {invoice.issueDate ? formatDate(invoice.issueDate, "MMM dd, yyyy") : "No date"}
                        </TableCell>
                        <TableCell className={`text-sm ${isOverdue(invoice.dueDate) && invoice.status !== 'paid' ? 'text-red-500 font-medium' : 'text-gray-500'}`}>
                          {invoice.dueDate ? formatDate(invoice.dueDate, "MMM dd, yyyy") : "No date"}
                        </TableCell>
                        <TableCell>
                          {renderStatusBadge(invoice.status)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-900 font-medium">
                          {formatMoney(invoice.total)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="View Details"
                              asChild
                            >
                              <Link href={`/invoices/${invoice.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Edit"
                              asChild
                            >
                              <Link href={`/invoices/${invoice.id}/edit`}>
                                <Pencil className="h-4 w-4" />
                              </Link>
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-green-600"
                              title="Download PDF"
                              onClick={() => window.open(`/api/invoices/${invoice.id}/pdf`, '_blank')}
                              disabled={invoice.status === 'draft'}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-purple-500"
                              title="Email Invoice"
                              onClick={() => {
                                setSelectedInvoiceId(invoice.id);
                                setIsEmailDialogOpen(true);
                              }}
                              disabled={invoice.status === 'draft'}
                            >
                              <Mail className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>More Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedInvoiceId(invoice.id);
                                    setIsMarkPaidDialogOpen(true);
                                  }}
                                  disabled={invoice.status === 'paid' || invoice.status === 'cancelled'}
                                  className="text-green-600"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" /> Mark as Paid
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedInvoiceId(invoice.id);
                                    setIsDeleteDialogOpen(true);
                                  }}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this invoice? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedInvoiceId && deleteInvoice.mutate(selectedInvoiceId)}
              disabled={deleteInvoice.isPending}
            >
              {deleteInvoice.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mark as Paid Dialog */}
      <Dialog open={isMarkPaidDialogOpen} onOpenChange={setIsMarkPaidDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark Invoice as Paid</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this invoice as paid? This will update the invoice status.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsMarkPaidDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => selectedInvoiceId && markInvoicePaid.mutate(selectedInvoiceId)}
              disabled={markInvoicePaid.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {markInvoicePaid.isPending ? "Updating..." : "Mark as Paid"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Invoice Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email Invoice</DialogTitle>
            <DialogDescription>
              This will send the invoice as a PDF attachment to the customer.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            {selectedInvoiceId && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">
                  Recipient
                </Label>
                <div className="col-span-3">
                  {(() => {
                    const invoice = filteredInvoices.find(inv => inv.id === selectedInvoiceId);
                    if (!invoice || !invoice.customerId) return "No customer found";
                    
                    const customer = customers.find(c => c.id === invoice.customerId);
                    if (!customer) return "Customer not found";
                    
                    return customer.email || "No email available";
                  })()}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsEmailDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => selectedInvoiceId && emailInvoice.mutate(selectedInvoiceId)}
              disabled={emailInvoice.isPending || 
                !selectedInvoiceId || 
                !filteredInvoices.find(inv => inv.id === selectedInvoiceId)?.customerId ||
                !customers.find(c => c.id === filteredInvoices.find(inv => inv.id === selectedInvoiceId)?.customerId)?.email
              }
            >
              {emailInvoice.isPending ? "Sending..." : "Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
