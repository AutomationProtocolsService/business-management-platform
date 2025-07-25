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
  Receipt,
  Eye,
  Pencil
} from "lucide-react";
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
import { useSettings } from "@/hooks/use-settings";
import { formatDate } from "@/lib/date-utils";
import QuoteForm from "@/components/forms/quote-form-new";
import { exportArrayToExcel } from "@/lib/exportCsv";

export default function QuotesPage() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { getCurrencySymbol, formatMoney } = useSettings();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedQuoteId, setSelectedQuoteId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);

  // Fetch quotes
  const { data: quotes = [], isLoading } = useQuery({
    queryKey: ["/api/quotes", statusFilter],
    queryFn: async ({ queryKey }) => {
      const [_, status] = queryKey;
      const url = status ? `/api/quotes?status=${status}` : "/api/quotes";
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error("Failed to fetch quotes");
      }
      
      return res.json();
    }
  });

  // Fetch customers for the quote details
  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["/api/customers"],
  });

  // Fetch projects for the quote details
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["/api/projects"],
  });

  // Delete quote mutation
  const deleteQuote = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/quotes/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Quote deleted",
        description: "Quote has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
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

  // Convert quote to invoice mutation
  const convertToInvoice = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/quotes/${id}/convert-to-invoice`);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Quote converted",
        description: "Quote has been converted to an invoice successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      setIsConvertDialogOpen(false);
      navigate(`/invoices/${data.id}`);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Email quote mutation
  const emailQuote = useMutation({
    mutationFn: async (id: number) => {
      try {
        // Find the quote to get customer info
        const quoteToEmail = quotes.find((q: any) => q.id === id);
        if (!quoteToEmail) {
          throw new Error("Quote not found");
        }
        
        // Find the customer for this quote
        const customerList = Array.isArray(customers) ? customers : [];
        const customer = customerList.find((c: any) => c.id === quoteToEmail.customerId);
        
        if (!customer || !customer.email) {
          throw new Error("Customer email not found. Please make sure the customer has an email address.");
        }
        
        // Send email with required parameters
        await apiRequest("POST", `/api/quotes/${id}/email`, {
          recipientEmail: customer.email,
          subject: `Quote #${quoteToEmail.quoteNumber}`,
          message: `Please find attached your quote #${quoteToEmail.quoteNumber}.`
        });
      } catch (error) {
        console.error("Error in emailQuote:", error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: "Quote emailed",
        description: "Quote has been emailed successfully.",
      });
      setIsEmailDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send email",
        variant: "destructive",
      });
    },
  });

  // Handle quote creation success
  const handleQuoteCreated = () => {
    setIsCreateDialogOpen(false);
    toast({
      title: "Quote created",
      description: "Quote has been created successfully."
    });
  };

  // Filter quotes by search query
  const filteredQuotes = quotes.filter((quote: any) => {
    return quote.quoteNumber.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Get customer name by ID
  const getCustomerName = (customerId: number) => {
    const customer = Array.isArray(customers) 
      ? customers.find((c: any) => c.id === customerId)
      : null;
    return customer ? customer.name : "Unknown";
  };

  // Get project name by ID
  const getProjectName = (projectId: number) => {
    const project = Array.isArray(projects) 
      ? projects.find((p: any) => p.id === projectId)
      : null;
    return project ? project.name : "Unknown";
  };

  // Render status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-100">Draft</Badge>;
      case "sent":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">Sent</Badge>;
      case "accepted":
        return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">Accepted</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>;
      case "converted":
        return <Badge variant="outline" className="bg-purple-100 text-purple-800 hover:bg-purple-100">Converted</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get customer email by ID
  const getCustomerEmail = (customerId: number) => {
    const customer = Array.isArray(customers) 
      ? customers.find((c: any) => c.id === customerId)
      : null;
    return customer ? customer.email || "—" : "—";
  };

  // Export quotes to Excel
  const onExportQuotes = () => {
    if (!quotes?.length) return;

    const rows = quotes.map((q: any) => ({
      QuoteNumber: q.quoteNumber,
      Customer: q.customerId ? getCustomerName(q.customerId) : "—",
      CustomerEmail: q.customerId ? getCustomerEmail(q.customerId) : "—",
      Project: q.projectId ? getProjectName(q.projectId) : "—",
      IssueDate: q.issueDate ? formatDate(q.issueDate, "MMM dd, yyyy") : "—",
      Status: q.status,
      Amount: `${getCurrencySymbol()}${q.total.toLocaleString()}`
    }));

    exportArrayToExcel(rows, `Quotes-${Date.now()}.xlsx`, "Quotes");
  };

  return (
    <div className="h-full">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Quotes</h2>
        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <div className="relative">
            <Input 
              type="text" 
              placeholder="Search quotes..." 
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
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
            </SelectContent>
          </Select>
          <Button 
            variant="outline" 
            onClick={onExportQuotes}
            disabled={!quotes?.length}
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
            New Quote
          </Button>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-primary" />
                  Create New Quote
                </DialogTitle>
                <DialogDescription>
                  Fill in the details to create a new quote. All fields marked with an asterisk (*) are required.
                </DialogDescription>
              </DialogHeader>
              <QuoteForm 
                onSuccess={handleQuoteCreated}
                onCancel={() => setIsCreateDialogOpen(false)}
                defaultValues={
                  // Provide default values that match the expected Zod schema types
                  {
                    issueDate: new Date().toISOString().split('T')[0] as any,
                    expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] as any,
                    status: 'draft' as any,
                    items: [{
                      description: '',
                      quantity: 1,
                      unitPrice: 0,
                      total: 0
                    }] as any,
                    tax: 0 as any,
                    discount: 0 as any,
                    subtotal: 0 as any,
                    total: 0 as any
                  }
                }
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
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Quote #</TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Customer</TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Project</TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Date</TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Status</TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Amount</TableHead>
                    <TableHead className="text-right font-medium text-xs uppercase tracking-wider">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredQuotes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        No quotes found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredQuotes.map((quote: any) => (
                      <TableRow key={quote.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="font-medium text-sm text-gray-900">{quote.quoteNumber}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-900">
                            {quote.customerId ? getCustomerName(quote.customerId) : "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-900">
                            {quote.projectId ? getProjectName(quote.projectId) : "—"}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {quote.issueDate ? formatDate(quote.issueDate, "MMM dd, yyyy") : "No date"}
                        </TableCell>
                        <TableCell>
                          {renderStatusBadge(quote.status)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {getCurrencySymbol()}{quote.total.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="View Details"
                              asChild
                            >
                              <Link to={`/quotes/${quote.id}`}>
                                <Eye className="h-4 w-4" />
                              </Link>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Edit"
                              asChild
                            >
                              <Link to={`/quotes/${quote.id}/edit`}>
                                <Pencil className="h-4 w-4" />
                              </Link>
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-green-600"
                              title="Download PDF"
                              onClick={() => window.open(`/api/quotes/${quote.id}/pdf`, '_blank')}
                              disabled={quote.status === 'draft'}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-purple-500"
                              title="Email Quote"
                              onClick={() => {
                                setSelectedQuoteId(quote.id);
                                setIsEmailDialogOpen(true);
                              }}
                              disabled={quote.status === 'draft'}
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
                                    setSelectedQuoteId(quote.id);
                                    setIsConvertDialogOpen(true);
                                  }}
                                  disabled={quote.status !== 'accepted' && quote.status !== 'sent'}
                                >
                                  <Receipt className="h-4 w-4 mr-2" /> Convert to Invoice
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedQuoteId(quote.id);
                                    setIsDeleteDialogOpen(true);
                                  }}
                                  className="text-red-600"
                                  disabled={quote.status === 'converted'}
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
              Are you sure you want to delete this quote? This action cannot be undone.
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
              onClick={() => selectedQuoteId && deleteQuote.mutate(selectedQuoteId)}
              disabled={deleteQuote.isPending}
            >
              {deleteQuote.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to Invoice Dialog */}
      <Dialog open={isConvertDialogOpen} onOpenChange={setIsConvertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Convert to Invoice</DialogTitle>
            <DialogDescription>
              Are you sure you want to convert this quote to an invoice? This will change the quote status to "Converted".
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsConvertDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => selectedQuoteId && convertToInvoice.mutate(selectedQuoteId)}
              disabled={convertToInvoice.isPending}
            >
              {convertToInvoice.isPending ? "Converting..." : "Convert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Quote Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Email Quote</DialogTitle>
            <DialogDescription>
              Are you sure you want to email this quote to the customer? This will send the quote as a PDF attachment.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsEmailDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => selectedQuoteId && emailQuote.mutate(selectedQuoteId)}
              disabled={emailQuote.isPending}
            >
              {emailQuote.isPending ? "Sending..." : "Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
