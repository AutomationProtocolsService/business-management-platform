import { useState } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  CheckCircle, 
  XCircle, 
  Download,
  Calendar,
  Mail,
  Phone,
  Globe,
  Building,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Card, 
  CardContent, 
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
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/date-utils";

interface Quote {
  id: number;
  quoteNumber: string;
  reference?: string;
  projectId?: number;
  customerId?: number;
  issueDate: string;
  expiryDate?: string;
  status: string;
  subtotal: number;
  tax: number;
  discount: number;
  shippingCost: number;
  installationCost: number;
  total: number;
  notes?: string;
  terms?: string;
  createdAt: string;
}

interface QuoteItem {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  netTotal: number;
  vatAmount: number;
  total: number;
}

interface Customer {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
}

interface Project {
  id: number;
  name: string;
  description?: string;
}

interface CompanySettings {
  id: number;
  companyName: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  companyLogo?: string;
}

export default function ClientQuoteView() {
  const [match, params] = useRoute("/quote/:quoteNumber/view");
  const { toast } = useToast();
  const [isAcceptDialogOpen, setIsAcceptDialogOpen] = useState(false);
  const [isDeclineDialogOpen, setIsDeclineDialogOpen] = useState(false);
  const [acceptorName, setAcceptorName] = useState("");
  const [declineReason, setDeclineReason] = useState("");

  if (!match || !params?.quoteNumber) {
    return <div>Quote not found</div>;
  }

  // Fetch quote data
  const { data: quote, isLoading: isLoadingQuote } = useQuery<Quote>({
    queryKey: [`/api/quotes/public/${params.quoteNumber}`],
    queryFn: async () => {
      const response = await fetch(`/api/quotes/public/${params.quoteNumber}`);
      if (!response.ok) {
        throw new Error('Quote not found');
      }
      return response.json();
    }
  });

  // Fetch quote items
  const { data: quoteItems = [], isLoading: isLoadingItems } = useQuery<QuoteItem[]>({
    queryKey: [`/api/quotes/public/${params.quoteNumber}/items`],
    queryFn: async () => {
      if (!quote) return [];
      const response = await fetch(`/api/quotes/public/${params.quoteNumber}/items`);
      if (!response.ok) {
        throw new Error('Failed to fetch quote items');
      }
      return response.json();
    },
    enabled: !!quote
  });

  // Fetch customer data
  const { data: customer } = useQuery<Customer>({
    queryKey: [`/api/quotes/public/${params.quoteNumber}/customer`],
    queryFn: async () => {
      if (!quote || !quote.customerId) return null;
      const response = await fetch(`/api/quotes/public/${params.quoteNumber}/customer`);
      if (!response.ok) {
        throw new Error('Failed to fetch customer');
      }
      return response.json();
    },
    enabled: !!quote?.customerId
  });

  // Fetch project data
  const { data: project } = useQuery<Project>({
    queryKey: [`/api/quotes/public/${params.quoteNumber}/project`],
    queryFn: async () => {
      if (!quote || !quote.projectId) return null;
      const response = await fetch(`/api/quotes/public/${params.quoteNumber}/project`);
      if (!response.ok) {
        throw new Error('Failed to fetch project');
      }
      return response.json();
    },
    enabled: !!quote?.projectId
  });

  // Fetch company settings
  const { data: companySettings } = useQuery<CompanySettings>({
    queryKey: [`/api/quotes/public/${params.quoteNumber}/company`],
    queryFn: async () => {
      const response = await fetch(`/api/quotes/public/${params.quoteNumber}/company`);
      if (!response.ok) {
        throw new Error('Failed to fetch company settings');
      }
      return response.json();
    }
  });

  // Accept quote mutation
  const acceptQuote = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/quotes/public/${params.quoteNumber}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ acceptorName })
      });
      if (!response.ok) {
        throw new Error('Failed to accept quote');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Quote Accepted",
        description: "Thank you! We have received your acceptance and will contact you shortly.",
      });
      setIsAcceptDialogOpen(false);
      setAcceptorName("");
      // Refresh quote data to show updated status
      window.location.reload();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Decline quote mutation
  const declineQuote = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/quotes/public/${params.quoteNumber}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: declineReason })
      });
      if (!response.ok) {
        throw new Error('Failed to decline quote');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Quote Declined",
        description: "Thank you for your response. We appreciate your consideration.",
      });
      setIsDeclineDialogOpen(false);
      setDeclineReason("");
      // Refresh quote data to show updated status
      window.location.reload();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  if (isLoadingQuote) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading quote...</p>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Quote Not Found</h1>
          <p className="mt-2 text-gray-600">The quote you're looking for could not be found.</p>
        </div>
      </div>
    );
  }

  const formatMoney = (amount: number) => `£${amount.toFixed(2)}`;

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: "bg-gray-100 text-gray-800", label: "Draft" },
      sent: { color: "bg-blue-100 text-blue-800", label: "Sent" },
      accepted: { color: "bg-green-100 text-green-800", label: "Accepted" },
      rejected: { color: "bg-red-100 text-red-800", label: "Declined" },
      converted: { color: "bg-purple-100 text-purple-800", label: "Converted" }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
    return <Badge className={config.color}>{config.label}</Badge>;
  };

  const isExpired = quote.expiryDate && new Date(quote.expiryDate) < new Date();
  const canRespond = quote.status === 'sent' && !isExpired;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Company Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between">
              <div className="flex items-start space-x-4">
                {companySettings?.companyLogo && (
                  <img 
                    src={companySettings.companyLogo} 
                    alt="Company Logo" 
                    className="h-16 w-auto"
                  />
                )}
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">
                    {companySettings?.companyName || "Company Name"}
                  </h1>
                  {companySettings && (
                    <div className="mt-2 text-sm text-gray-600 space-y-1">
                      {companySettings.address && (
                        <div className="flex items-center space-x-1">
                          <Building className="h-4 w-4" />
                          <span>
                            {companySettings.address}
                            {companySettings.city && `, ${companySettings.city}`}
                            {companySettings.state && `, ${companySettings.state}`}
                            {companySettings.zipCode && ` ${companySettings.zipCode}`}
                            {companySettings.country && `, ${companySettings.country}`}
                          </span>
                        </div>
                      )}
                      {companySettings.phone && (
                        <div className="flex items-center space-x-1">
                          <Phone className="h-4 w-4" />
                          <span>{companySettings.phone}</span>
                        </div>
                      )}
                      {companySettings.email && (
                        <div className="flex items-center space-x-1">
                          <Mail className="h-4 w-4" />
                          <span>{companySettings.email}</span>
                        </div>
                      )}
                      {companySettings.website && (
                        <div className="flex items-center space-x-1">
                          <Globe className="h-4 w-4" />
                          <span>{companySettings.website}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-4 md:mt-0 text-right">
                <h2 className="text-xl font-semibold">QUOTATION</h2>
                <p className="text-lg font-mono">{quote.quoteNumber}</p>
                <div className="mt-2">{getStatusBadge(quote.status)}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quote Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Customer Information */}
          {customer && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="h-5 w-5" />
                  <span>Bill To</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <p className="font-semibold">{customer.name}</p>
                  {customer.address && <p>{customer.address}</p>}
                  {(customer.city || customer.state || customer.zipCode) && (
                    <p>
                      {customer.city}{customer.city && customer.state ? ', ' : ''}{customer.state} {customer.zipCode}
                    </p>
                  )}
                  {customer.country && <p>{customer.country}</p>}
                  {customer.email && <p>{customer.email}</p>}
                  {customer.phone && <p>{customer.phone}</p>}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quote Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Quote Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">Issue Date:</span>
                  <span>{formatDate(quote.issueDate)}</span>
                </div>
                {quote.expiryDate && (
                  <div className="flex justify-between">
                    <span className="font-medium">Expires:</span>
                    <span className={isExpired ? "text-red-600 font-semibold" : ""}>
                      {formatDate(quote.expiryDate)}
                      {isExpired && " (EXPIRED)"}
                    </span>
                  </div>
                )}
                {quote.reference && (
                  <div className="flex justify-between">
                    <span className="font-medium">Reference:</span>
                    <span>{quote.reference}</span>
                  </div>
                )}
                {project && (
                  <div>
                    <span className="font-medium">Project:</span>
                    <p className="mt-1">{project.name}</p>
                    {project.description && (
                      <p className="text-gray-600 text-xs mt-1">{project.description}</p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Line Items */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">VAT %</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingItems ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Loading items...
                    </TableCell>
                  </TableRow>
                ) : quoteItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      No items found
                    </TableCell>
                  </TableRow>
                ) : (
                  quoteItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{formatMoney(item.unitPrice)}</TableCell>
                      <TableCell className="text-right">{item.vatRate}%</TableCell>
                      <TableCell className="text-right font-semibold">{formatMoney(item.total)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            {/* Totals Summary */}
            <div className="mt-8 flex justify-end">
              <div className="w-80 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Net Total (excl. VAT):</span>
                  <span>{formatMoney(quote.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>VAT:</span>
                  <span>{formatMoney(quote.tax)}</span>
                </div>
                {quote.shippingCost > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Shipping/Delivery:</span>
                    <span>{formatMoney(quote.shippingCost)}</span>
                  </div>
                )}
                {quote.installationCost > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Installation:</span>
                    <span>{formatMoney(quote.installationCost)}</span>
                  </div>
                )}
                {quote.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Discount:</span>
                    <span>-{formatMoney(quote.discount)}</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between text-lg font-bold">
                  <span>Grand Total:</span>
                  <span>{formatMoney(quote.total)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Terms and Notes */}
        {(quote.terms || quote.notes) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {quote.terms && (
              <Card>
                <CardHeader>
                  <CardTitle>Terms & Conditions</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{quote.terms}</p>
                </CardContent>
              </Card>
            )}
            {quote.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm whitespace-pre-wrap">{quote.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Call to Action */}
        {canRespond && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <h3 className="text-xl font-semibold text-blue-900">
                  Ready to proceed?
                </h3>
                <p className="text-blue-700">
                  Please review the quote above and let us know your decision.
                </p>
                <div className="flex flex-col sm:flex-row justify-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <Button 
                    onClick={() => setIsAcceptDialogOpen(true)}
                    className="bg-green-600 hover:bg-green-700"
                    data-testid="button-accept-quote"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Accept Quote
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setIsDeclineDialogOpen(true)}
                    className="border-red-300 text-red-700 hover:bg-red-50"
                    data-testid="button-decline-quote"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Decline Quote
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => window.open(`/api/quotes/public/${params.quoteNumber}/pdf`, '_blank')}
                    data-testid="button-download-pdf"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download PDF
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Status Messages for Non-Interactive Quotes */}
        {quote.status === 'accepted' && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="pt-6 text-center">
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-green-900">Quote Accepted</h3>
              <p className="text-green-700 mt-2">
                Thank you! This quote has been accepted. We will contact you shortly to proceed.
              </p>
            </CardContent>
          </Card>
        )}

        {quote.status === 'rejected' && (
          <Card className="bg-red-50 border-red-200">
            <CardContent className="pt-6 text-center">
              <XCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-red-900">Quote Declined</h3>
              <p className="text-red-700 mt-2">
                This quote has been declined. Thank you for your consideration.
              </p>
            </CardContent>
          </Card>
        )}

        {isExpired && quote.status === 'sent' && (
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="pt-6 text-center">
              <Clock className="h-12 w-12 text-amber-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-amber-900">Quote Expired</h3>
              <p className="text-amber-700 mt-2">
                This quote has expired on {formatDate(quote.expiryDate!)}. Please contact us for an updated quote.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Accept Dialog */}
      <Dialog open={isAcceptDialogOpen} onOpenChange={setIsAcceptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Accept Quote</DialogTitle>
            <DialogDescription>
              By accepting this quote, you agree to proceed with the work as outlined.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="acceptor-name">Your Name *</Label>
              <Input
                id="acceptor-name"
                value={acceptorName}
                onChange={(e) => setAcceptorName(e.target.value)}
                placeholder="Enter your full name"
                data-testid="input-acceptor-name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsAcceptDialogOpen(false)}
              data-testid="button-cancel-accept"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => acceptQuote.mutate()}
              disabled={!acceptorName.trim() || acceptQuote.isPending}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-confirm-accept"
            >
              {acceptQuote.isPending ? "Accepting..." : "Accept Quote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decline Dialog */}
      <Dialog open={isDeclineDialogOpen} onOpenChange={setIsDeclineDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline Quote</DialogTitle>
            <DialogDescription>
              Please let us know why you're declining this quote (optional).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="decline-reason">Reason (Optional)</Label>
              <Textarea
                id="decline-reason"
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="Please share why you're declining this quote..."
                rows={3}
                data-testid="input-decline-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsDeclineDialogOpen(false)}
              data-testid="button-cancel-decline"
            >
              Cancel
            </Button>
            <Button 
              onClick={() => declineQuote.mutate()}
              disabled={declineQuote.isPending}
              variant="destructive"
              data-testid="button-confirm-decline"
            >
              {declineQuote.isPending ? "Declining..." : "Decline Quote"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}