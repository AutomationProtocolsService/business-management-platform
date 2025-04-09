import { useCallback, useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ChevronLeft, 
  Edit as Pencil, 
  Trash2, 
  Download, 
  Mail, 
  Receipt,
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  Check,
  Calendar,
  MapPin
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import SurveyForm from "@/components/forms/survey-form";
import InstallationForm from "@/components/forms/installation-form";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDate, getInputDateString } from "@/lib/date-utils";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/components/notifications/notifications-provider";
import { useSettings } from "@/hooks/use-settings";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { formatCurrency } from "@/lib/utils";

interface Quote {
  id: number;
  quoteNumber: string;
  reference: string;
  projectId: number;
  customerId: number;
  issueDate: string;
  expiryDate: string;
  status: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes: string;
  terms: string;
  createdAt: string;
  createdBy: number;
}

interface QuoteItem {
  id: number;
  quoteId: number;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  catalogItemId: number | null;
}

interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  notes: string;
}

interface Project {
  id: number;
  name: string;
  description: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  customerId: number;
}

interface EmailDialogState {
  open: boolean;
  to: string;
  subject: string;
  message: string;
  includePdf: boolean;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-200 text-gray-800",
  sent: "bg-blue-200 text-blue-800",
  accepted: "bg-green-200 text-green-800",
  rejected: "bg-red-200 text-red-800",
  converted: "bg-purple-200 text-purple-800",
};

export default function QuoteDetailsPage() {
  const [, params] = useRoute("/quotes/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { formatMoney, getCurrencySymbol } = useSettings();
  const quoteId = params?.id ? parseInt(params.id) : null;
  
  // Dialog states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isConvertDialogOpen, setIsConvertDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isSurveyDialogOpen, setIsSurveyDialogOpen] = useState(false);
  const [isInstallationDialogOpen, setIsInstallationDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  // Fetch quote details
  const { data: quote, isLoading, isError } = useQuery({
    queryKey: [`/api/quotes/${quoteId}`],
    queryFn: async () => {
      if (!quoteId) return null;
      const res = await fetch(`/api/quotes/${quoteId}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch quote: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!quoteId
  });

  // Get quote items from the items property in the quote response
  // or use the items API endpoint if needed
  const { data: quoteItems = [] } = useQuery({
    queryKey: [`/api/quotes/${quoteId}/items`],
    queryFn: async () => {
      if (!quoteId) return [];
      // First try to use the items property from the quote (which is added by the server)
      if (quote && quote.items) {
        console.log(`Using ${quote.items.length} quote items from quote object`);
        return quote.items;
      }
      
      // Fallback to the dedicated endpoint for items
      console.log(`Fetching quote items from dedicated endpoint`);
      const res = await fetch(`/api/quotes/${quoteId}/items`);
      if (!res.ok) {
        throw new Error(`Failed to fetch quote items: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!quoteId && quote !== undefined
  });

  // Fetch customer
  const { data: customer } = useQuery({
    queryKey: ['/api/customers', quote?.customerId],
    queryFn: async () => {
      if (!quote?.customerId) return null;
      const res = await fetch(`/api/customers/${quote.customerId}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch customer: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!quote?.customerId
  });

  // Fetch project
  const { data: project } = useQuery({
    queryKey: ['/api/projects', quote?.projectId],
    queryFn: async () => {
      if (!quote?.projectId) return null;
      const res = await fetch(`/api/projects/${quote.projectId}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch project: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!quote?.projectId
  });

  // Delete quote mutation
  const deleteQuote = useMutation({
    mutationFn: async () => {
      if (!quoteId) return;
      await apiRequest("DELETE", `/api/quotes/${quoteId}`);
    },
    onSuccess: () => {
      toast({
        title: "Quote deleted",
        description: "Quote has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      navigate("/quotes");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Download PDF function
  const downloadPdf = useCallback(async () => {
    if (!quoteId) return;
    
    try {
      // Make API request to get the PDF with proper headers
      const response = await fetch(`/api/quotes/${quoteId}/pdf`, {
        headers: {
          'Accept': 'application/pdf',
        },
      });

      if (!response.ok) {
        // Handle HTTP errors more informatively
        let errorMessage = `Failed to fetch PDF: ${response.status} ${response.statusText}`;
        try {
          // Attempt to get JSON error message if available
          const errorJson = await response.json();
          if (errorJson?.message) {
            errorMessage += ` - ${errorJson.message}`;
          }
        } catch (parseError) {
          // If JSON parsing fails, just use the original message
          console.warn("Failed to parse error JSON", parseError);
        }
        console.error(errorMessage);
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive",
          duration: 5000, // Show for a longer time
        });
        throw new Error(errorMessage); // Throw to stop further processing
      }

      // Get the PDF as a blob
      const blob = await response.blob();
      
      // Verify that we got a PDF file
      if (blob.type !== 'application/pdf' && blob.size < 100) {
        throw new Error('Invalid PDF data received. Please try again.');
      }
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Quote_${quote?.quoteNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      // Show success notification
      toast({
        title: "Success",
        description: "PDF downloaded successfully",
        variant: "default",
      });
    } catch (error) {
      console.error("Error downloading PDF:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to download PDF. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    }
  }, [quoteId, quote, toast]);

  // Convert quote to invoice mutation
  const convertToInvoice = useMutation({
    mutationFn: async () => {
      if (!quoteId) return null;
      const res = await apiRequest("POST", `/api/quotes/${quoteId}/convert-to-invoice`);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Quote converted",
        description: "Quote has been converted to an invoice successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: [`/api/quotes/${quoteId}`] });
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

  // Email states
  const [emailRecipient, setEmailRecipient] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [includePdf, setIncludePdf] = useState(true);
  
  // Set up email defaults when customer data is available
  useEffect(() => {
    if (customer && quote) {
      if (customer.email) {
        setEmailRecipient(customer.email);
      } else {
        // Reset recipient if customer has no email
        setEmailRecipient('');
      }
      setEmailSubject(`Quote #${quote.quoteNumber} from ${getCompanyName()}`);
      setEmailMessage(`Dear ${customer.name},\n\nPlease find attached our quote #${quote.quoteNumber}.\n\nIf you have any questions, please don't hesitate to contact us.\n\nBest regards,\n${getCompanyName()}`);
    }
  }, [customer, quote]);
  
  // Helper function to get company name
  const getCompanyName = () => {
    return quote?.companyName || "Your Company";
  };
  
  // Email quote mutation
  const emailQuote = useMutation({
    mutationFn: async () => {
      if (!quoteId) {
        throw new Error("Quote ID is missing");
      }
      
      if (!emailRecipient) {
        throw new Error("Recipient email is required");
      }
      
      // Basic email validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailRecipient)) {
        throw new Error("Please enter a valid email address");
      }
      
      await apiRequest("POST", `/api/quotes/${quoteId}/email`, {
        recipientEmail: emailRecipient,
        subject: emailSubject,
        message: emailMessage,
        includePdf: includePdf
      });
    },
    onSuccess: () => {
      toast({
        title: "Quote emailed",
        description: "Quote has been emailed successfully to " + emailRecipient,
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

  // Update quote status mutation using dedicated status endpoint
  const updateQuoteStatus = useMutation({
    mutationFn: async () => {
      if (!quoteId || !newStatus) return;
      await apiRequest("PATCH", `/api/quotes/${quoteId}/status`, { status: newStatus });
    },
    onSuccess: () => {
      toast({
        title: "Status updated",
        description: `Quote status has been updated to ${newStatus}.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quotes"] });
      queryClient.invalidateQueries({ queryKey: [`/api/quotes/${quoteId}`] });
      setIsStatusDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isError || !quote) {
    return (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Error Loading Quote</h2>
        <p className="mb-4">Unable to load the quote details. The quote might have been deleted or you may not have permission to view it.</p>
        <Button onClick={() => navigate("/quotes")}>
          <ChevronLeft className="mr-2 h-4 w-4" /> Back to Quotes
        </Button>
      </div>
    );
  }

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

  // Calculate if quote can be converted to invoice
  const canConvertToInvoice = quote.status === 'accepted' || quote.status === 'sent';
  
  // Calculate if quote can be deleted
  const canDelete = quote.status !== 'converted';

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            className="mr-4" 
            onClick={() => navigate("/quotes")}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{quote.quoteNumber}</h1>
            <p className="text-sm text-muted-foreground">
              Created on {formatDate(quote.createdAt, "MMMM dd, yyyy")}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2 flex-wrap">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate(`/quotes/${quoteId}/edit`)}
          >
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsEmailDialogOpen(true)}
            disabled={quote.status === 'draft'}
          >
            <Mail className="h-4 w-4 mr-2" />
            Email
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={downloadPdf}
          >
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsSurveyDialogOpen(true)}
            disabled={quote.status !== 'accepted'}
          >
            <Calendar className="h-4 w-4 mr-2" />
            Schedule Survey
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setIsInstallationDialogOpen(true)}
            disabled={quote.status !== 'accepted'}
          >
            <MapPin className="h-4 w-4 mr-2" />
            Schedule Installation
          </Button>
          
          <Button 
            variant="default" 
            size="sm"
            onClick={() => setIsConvertDialogOpen(true)}
            disabled={!canConvertToInvoice}
          >
            <Receipt className="h-4 w-4 mr-2" />
            Convert to Invoice
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="space-y-6 md:col-span-2">
          {/* Quote summary card */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Quote Details</CardTitle>
                <div 
                  className="cursor-pointer"
                  onClick={() => {
                    if (quote.status !== 'converted') {
                      setIsStatusDialogOpen(true);
                    }
                  }}
                >
                  {renderStatusBadge(quote.status)}
                </div>
              </div>
              <CardDescription>
                {quote.reference && (
                  <span className="block mt-1">Reference: {quote.reference}</span>
                )}
                <span className="block mt-1">Issue Date: {formatDate(quote.issueDate, "MMMM dd, yyyy")}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {customer && (
                  <div>
                    <h3 className="font-medium text-sm text-gray-500 mb-1">Customer</h3>
                    <div className="text-sm">
                      <p className="font-medium">{customer.name}</p>
                      {customer.email && <p>{customer.email}</p>}
                      {customer.phone && <p>{customer.phone}</p>}
                      {customer.address && <p>{customer.address}</p>}
                    </div>
                  </div>
                )}
                
                {project && (
                  <div>
                    <h3 className="font-medium text-sm text-gray-500 mb-1">Project</h3>
                    <div className="text-sm">
                      <p className="font-medium">{project.name}</p>
                      {project.description && <p>{project.description}</p>}
                    </div>
                  </div>
                )}
                
                {quote.notes && (
                  <div>
                    <h3 className="font-medium text-sm text-gray-500 mb-1">Notes</h3>
                    <p className="text-sm">{quote.notes}</p>
                  </div>
                )}
                
                {quote.terms && (
                  <div>
                    <h3 className="font-medium text-sm text-gray-500 mb-1">Terms & Conditions</h3>
                    <p className="text-sm">{quote.terms}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quote items */}
          <Card>
            <CardHeader>
              <CardTitle>Quote Items</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50%]">Description</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quoteItems.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4">
                        No items in this quote
                      </TableCell>
                    </TableRow>
                  ) : (
                    quoteItems.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.description}</TableCell>
                        <TableCell className="text-right">{item.quantity}</TableCell>
                        <TableCell className="text-right">{formatMoney(item.unitPrice)}</TableCell>
                        <TableCell className="text-right">{formatMoney(item.total)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <CardFooter className="flex justify-end border-t px-6 py-4">
              <div className="space-y-1 text-right">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Subtotal:</span>
                  <span>{formatMoney(quote.subtotal)}</span>
                </div>
                {quote.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Discount:</span>
                    <span>-{formatMoney(quote.discount)}</span>
                  </div>
                )}
                {quote.tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">Tax:</span>
                    <span>{formatMoney(quote.tax)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t text-base font-medium">
                  <span>Total:</span>
                  <span>{formatMoney(quote.total)}</span>
                </div>
              </div>
            </CardFooter>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Actions card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setIsStatusDialogOpen(true)}
                disabled={quote.status === 'converted'}
              >
                <Clock className="h-4 w-4 mr-2" />
                Change Status
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => navigate(`/quotes/${quoteId}/edit`)}
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit Quote
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => setIsEmailDialogOpen(true)}
                disabled={quote.status === 'draft'}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email Quote
              </Button>
              
              <Button 
                variant="outline"
                className="w-full justify-start"
                onClick={downloadPdf}
              >
                <FileText className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              
              <Separator />
              
              <Button
                variant="default"
                className="w-full justify-start"
                onClick={() => setIsConvertDialogOpen(true)}
                disabled={!canConvertToInvoice}
              >
                <Receipt className="h-4 w-4 mr-2" />
                Convert to Invoice
              </Button>
              
              {quote.status === 'accepted' && (
                <>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setIsSurveyDialogOpen(true)}
                  >
                    <Calendar className="h-4 w-4 mr-2" /> 
                    Schedule Survey
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setIsInstallationDialogOpen(true)}
                  >
                    <MapPin className="h-4 w-4 mr-2" /> 
                    Schedule Installation
                  </Button>
                </>
              )}
              
              <Separator />
              
              <Button 
                variant="destructive" 
                className="w-full justify-start"
                onClick={() => setIsDeleteDialogOpen(true)}
                disabled={!canDelete}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Quote
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

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
              onClick={() => deleteQuote.mutate()}
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
              onClick={() => convertToInvoice.mutate()}
              disabled={convertToInvoice.isPending}
            >
              {convertToInvoice.isPending ? "Converting..." : "Convert"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Quote Dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Email Quote</DialogTitle>
            <DialogDescription>
              Customize your email and send the quote to the customer.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="recipient" className="text-right">
                To
              </Label>
              <div className="col-span-3 space-y-1">
                <Input
                  id="recipient"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  className={!emailRecipient ? "border-red-500" : ""}
                  placeholder="Enter recipient email address"
                />
                {!emailRecipient && (
                  <p className="text-xs text-red-500">Customer email is required</p>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="subject" className="text-right">
                Subject
              </Label>
              <Input
                id="subject"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="message" className="text-right">
                Message
              </Label>
              <Textarea
                id="message"
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                className="col-span-3"
                rows={6}
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="attachment" className="text-right">
                Attachment
              </Label>
              <div className="flex items-center space-x-2 col-span-3">
                <Checkbox 
                  id="attachment" 
                  checked={includePdf} 
                  onCheckedChange={(checked) => setIncludePdf(checked as boolean)}
                />
                <Label htmlFor="attachment" className="cursor-pointer">
                  Include quote as PDF attachment
                </Label>
              </div>
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
              onClick={() => emailQuote.mutate()}
              disabled={emailQuote.isPending || !emailRecipient}
              title={!emailRecipient ? "Recipient email is required" : ""}
            >
              {emailQuote.isPending ? "Sending..." : "Send Email"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Status Dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Quote Status</DialogTitle>
            <DialogDescription>
              Select a new status for this quote.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-4">
            <Button
              variant={newStatus === "draft" ? "default" : "outline"}
              className="justify-start"
              onClick={() => setNewStatus("draft")}
            >
              <Clock className="h-4 w-4 mr-2" />
              Draft
            </Button>
            <Button
              variant={newStatus === "sent" ? "default" : "outline"}
              className="justify-start"
              onClick={() => setNewStatus("sent")}
            >
              <Mail className="h-4 w-4 mr-2" />
              Sent
            </Button>
            <Button
              variant={newStatus === "accepted" ? "default" : "outline"}
              className="justify-start"
              onClick={() => setNewStatus("accepted")}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Accepted
            </Button>
            <Button
              variant={newStatus === "rejected" ? "default" : "outline"}
              className="justify-start"
              onClick={() => setNewStatus("rejected")}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Rejected
            </Button>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsStatusDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={() => updateQuoteStatus.mutate()}
              disabled={updateQuoteStatus.isPending || !newStatus}
            >
              {updateQuoteStatus.isPending ? "Updating..." : "Update Status"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Survey Dialog */}
      <Dialog open={isSurveyDialogOpen} onOpenChange={setIsSurveyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Survey</DialogTitle>
            <DialogDescription>
              Set up a survey for this project.
            </DialogDescription>
          </DialogHeader>
          <SurveyForm 
            defaultValues={{ 
              projectId: quote?.projectId || 0,
              scheduledDate: getInputDateString(new Date()),
              status: "scheduled",
              notes: "",
              assignedTo: undefined
            }}
            onSuccess={(data) => {
              console.log("Survey created successfully:", data);
              setIsSurveyDialogOpen(false);
              toast({
                title: "Survey scheduled",
                description: "The survey has been scheduled successfully."
              });
              queryClient.invalidateQueries({ queryKey: ["/api/surveys"] });
              queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
            }}
          />
        </DialogContent>
      </Dialog>

      {/* Schedule Installation Dialog */}
      <Dialog open={isInstallationDialogOpen} onOpenChange={setIsInstallationDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule Installation</DialogTitle>
            <DialogDescription>
              Set up an installation for this project.
            </DialogDescription>
          </DialogHeader>
          <InstallationForm 
            defaultValues={{
              projectId: quote?.projectId || 0,
              scheduledDate: getInputDateString(new Date()),
              status: "scheduled",
              notes: "",
              assignedTo: []
            }}
            onSuccess={(data) => {
              console.log("Installation created successfully:", data);
              setIsInstallationDialogOpen(false);
              toast({
                title: "Installation scheduled",
                description: "The installation has been scheduled successfully."
              });
              queryClient.invalidateQueries({ queryKey: ["/api/installations"] });
              queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}