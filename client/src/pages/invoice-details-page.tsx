import { useCallback, useEffect, useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNotifications } from "@/components/notifications/notifications-provider";
import { formatCurrency } from "@/lib/utils";
import { formatDate } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import InvoiceForm from "@/components/forms/invoice-form";
import { Loader2, FileText, Mail, Pencil, Download, Trash2, Copy, Check, X } from "lucide-react";

import FileList from "@/components/file-list";

interface Invoice {
  id: number;
  invoiceNumber: string;
  reference: string;
  projectId: number | null;
  customerId: number;
  quoteId: number | null;
  type: string;
  issueDate: string;
  dueDate: string;
  status: string;
  paymentDate: string | null;
  paymentAmount: number | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes: string;
  terms: string;
  createdAt: string;
  createdBy: number;
}

interface InvoiceItem {
  id: number;
  invoiceId: number;
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

interface File {
  id: number;
  description: string | null;
  createdAt: Date;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  relatedId: number | null;
  relatedType: string | null;
  uploadedBy: number | null;
}

interface EmailDialogState {
  open: boolean;
  to: string;
  subject: string;
  message: string;
  includePdf: boolean;
}

interface MarkAsPaidDialogState {
  open: boolean;
  amount: string;
  method: string;
  reference: string;
  date: string;
}

const statusColors: Record<string, string> = {
  draft: "bg-gray-200 text-gray-800",
  sent: "bg-blue-100 text-blue-800",
  paid: "bg-green-100 text-green-800",
  overdue: "bg-red-100 text-red-800",
  cancelled: "bg-yellow-100 text-yellow-800",
};

export default function InvoiceDetailsPage() {
  const params = useParams<{ id: string }>();
  const invoiceId = params.id ? parseInt(params.id) : undefined;
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { showNotification } = useNotifications();
  const queryClient = useQueryClient();
  
  const [editMode, setEditMode] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [emailDialog, setEmailDialog] = useState<EmailDialogState>({
    open: false,
    to: "",
    subject: "",
    message: "",
    includePdf: true,
  });
  const [markAsPaidDialog, setMarkAsPaidDialog] = useState<MarkAsPaidDialogState>({
    open: false,
    amount: "",
    method: "bank",
    reference: "",
    date: new Date().toISOString().split("T")[0],
  });

  const { 
    data: invoice, 
    isLoading: isLoadingInvoice,
    error: invoiceError
  } = useQuery<Invoice>({
    queryKey: [`/api/invoices/${invoiceId}`],
    enabled: !!invoiceId,
  });

  const { 
    data: invoiceItems,
    isLoading: isLoadingItems,
    error: itemsError
  } = useQuery<InvoiceItem[]>({
    queryKey: [`/api/invoices/${invoiceId}/items`],
    enabled: !!invoiceId,
  });

  const { 
    data: customer,
    isLoading: isLoadingCustomer 
  } = useQuery<Customer>({
    queryKey: [`/api/customers/${invoice?.customerId}`],
    enabled: !!invoice?.customerId,
  });

  const { 
    data: project,
    isLoading: isLoadingProject 
  } = useQuery<Project>({
    queryKey: [`/api/projects/${invoice?.projectId}`],
    enabled: !!invoice?.projectId,
  });

  const { 
    data: files,
    isLoading: isLoadingFiles,
    refetch: refetchFiles
  } = useQuery<File[]>({
    queryKey: [`/api/files/invoice/${invoiceId}`],
    enabled: !!invoiceId,
  });

  // Update email dialog when customer is loaded
  useEffect(() => {
    if (customer) {
      setEmailDialog(prev => ({
        ...prev,
        to: customer.email,
        subject: `Invoice ${invoice?.invoiceNumber} from Your Company`,
        message: `Dear ${customer.name},\n\nPlease find attached invoice ${invoice?.invoiceNumber} for ${formatCurrency(invoice?.total || 0)}.\n\nIf you have any questions, please don't hesitate to contact us.\n\nBest regards,\nYour Company`,
      }));
    }
  }, [customer, invoice]);

  // Update mark as paid dialog
  useEffect(() => {
    if (invoice) {
      setMarkAsPaidDialog(prev => ({
        ...prev,
        amount: invoice.total.toString(),
      }));
    }
  }, [invoice]);

  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: number) => {
      const response = await apiRequest("DELETE", `/api/files/${fileId}`);
      return response;
    },
    onSuccess: () => {
      refetchFiles();
      toast({
        title: "File deleted",
        description: "The file has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!invoiceId) throw new Error("Invoice ID is required");
      const response = await apiRequest("DELETE", `/api/invoices/${invoiceId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      
      toast({
        title: "Invoice deleted",
        description: "The invoice has been deleted successfully.",
      });
      
      navigate("/invoices");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async (data: {
      paymentAmount: number;
      paymentMethod: string;
      paymentReference: string;
      paymentDate: string;
      status: string;
    }) => {
      if (!invoiceId) throw new Error("Invoice ID is required");
      const response = await apiRequest("PATCH", `/api/invoices/${invoiceId}`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/invoices/${invoiceId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      
      toast({
        title: "Invoice updated",
        description: "The invoice has been marked as paid.",
      });
      
      setMarkAsPaidDialog(prev => ({ ...prev, open: false }));
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async (data: {
      to: string;
      subject: string;
      message: string;
      includePdf: boolean;
    }) => {
      if (!invoiceId) throw new Error("Invoice ID is required");
      const response = await apiRequest("POST", `/api/invoices/${invoiceId}/email`, data);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/invoices/${invoiceId}`] });
      
      toast({
        title: "Email sent",
        description: "The invoice has been emailed successfully.",
      });
      
      // Update invoice status to 'sent' if it's still in draft
      if (invoice && invoice.status === 'draft') {
        apiRequest("PATCH", `/api/invoices/${invoiceId}`, { status: 'sent' })
          .then(() => {
            queryClient.invalidateQueries({ queryKey: [`/api/invoices/${invoiceId}`] });
            queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
          });
      }
      
      setEmailDialog(prev => ({ ...prev, open: false }));
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const downloadPdf = useCallback(async () => {
    if (!invoiceId) return;
    
    try {
      const response = await fetch(`/api/invoices/${invoiceId}/pdf`);
      if (!response.ok) {
        throw new Error("Failed to download PDF");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Invoice_${invoice?.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      showNotification({
        message: "PDF downloaded successfully",
        type: "success",
      });
    } catch (error) {
      showNotification({
        message: error instanceof Error ? error.message : "Failed to download PDF",
        type: "error"
      });
    }
  }, [invoiceId, invoice, showNotification]);

  const handleDeleteFile = (fileId: number) => {
    deleteFileMutation.mutate(fileId);
  };

  const handleSubmitEmail = (e: React.FormEvent) => {
    e.preventDefault();
    sendEmailMutation.mutate({
      to: emailDialog.to,
      subject: emailDialog.subject,
      message: emailDialog.message,
      includePdf: emailDialog.includePdf,
    });
  };

  const handleSubmitMarkAsPaid = (e: React.FormEvent) => {
    e.preventDefault();
    markAsPaidMutation.mutate({
      paymentAmount: parseFloat(markAsPaidDialog.amount),
      paymentMethod: markAsPaidDialog.method,
      paymentReference: markAsPaidDialog.reference,
      paymentDate: markAsPaidDialog.date,
      status: 'paid',
    });
  };

  const getStatusDisplay = () => {
    if (!invoice) return null;
    
    return (
      <Badge className={statusColors[invoice.status]}>
        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
      </Badge>
    );
  };

  if (isLoadingInvoice || isLoadingItems) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (invoiceError || !invoice) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Invoice</h3>
        <p className="text-red-600">
          {invoiceError instanceof Error ? invoiceError.message : "Failed to load invoice"}
        </p>
        <Button 
          variant="outline" 
          className="mt-4"
          onClick={() => navigate("/invoices")}
        >
          Return to Invoices
        </Button>
      </div>
    );
  }

  if (editMode) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-tight">Edit Invoice</h1>
          <Button
            variant="outline"
            onClick={() => setEditMode(false)}
          >
            Cancel
          </Button>
        </div>
        
        <InvoiceForm
          invoice={invoice}
          onSuccess={() => {
            setEditMode(false);
            queryClient.invalidateQueries({ queryKey: [`/api/invoices/${invoiceId}`] });
            queryClient.invalidateQueries({ queryKey: [`/api/invoices/${invoiceId}/items`] });
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight">Invoice {invoice.invoiceNumber}</h1>
            {getStatusDisplay()}
          </div>
          <p className="text-muted-foreground">
            Created on {formatDate(invoice.createdAt, "MMM dd, yyyy")}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/invoices")}
          >
            Back to Invoices
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEmailDialog(prev => ({ ...prev, open: true }))}
          >
            <Mail className="mr-2 h-4 w-4" />
            Email
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={downloadPdf}
          >
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
          
          {invoice.status !== 'paid' && invoice.status !== 'cancelled' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMarkAsPaidDialog(prev => ({ ...prev, open: true }))}
            >
              <Check className="mr-2 h-4 w-4" />
              Mark as Paid
            </Button>
          )}
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditMode(true)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Button>
          
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setDeleteDialogOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Customer</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingCustomer ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            ) : customer ? (
              <div className="space-y-1">
                <p className="font-medium">{customer.name}</p>
                <p className="text-sm text-muted-foreground">{customer.email}</p>
                <p className="text-sm text-muted-foreground">{customer.phone}</p>
                <div className="text-sm text-muted-foreground">
                  <p>{customer.address}</p>
                  <p>{customer.city}, {customer.state} {customer.postalCode}</p>
                  <p>{customer.country}</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground italic">No customer information</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Project</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingProject ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ) : project ? (
              <div className="space-y-1">
                <p className="font-medium">{project.name}</p>
                <p className="text-sm text-muted-foreground">{project.description}</p>
                <Badge variant="outline" className="mt-2">
                  {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                </Badge>
              </div>
            ) : (
              <p className="text-muted-foreground italic">No project associated</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Number:</span>
                <span className="font-medium">{invoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Reference:</span>
                <span>{invoice.reference || "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Issue Date:</span>
                <span>{formatDate(invoice.issueDate, "MMM dd, yyyy")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due Date:</span>
                <span>{formatDate(invoice.dueDate, "MMM dd, yyyy")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type:</span>
                <span className="capitalize">{invoice.type}</span>
              </div>
              {invoice.status === 'paid' && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Date:</span>
                    <span>{formatDate(invoice.paymentDate, "MMM dd, yyyy")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Method:</span>
                    <span className="capitalize">{invoice.paymentMethod}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment Reference:</span>
                    <span>{invoice.paymentReference || "—"}</span>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Items</CardTitle>
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
              {invoiceItems && invoiceItems.length > 0 ? (
                invoiceItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.description}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(item.total)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                    No items in this invoice
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3} className="text-right">Subtotal:</TableCell>
                <TableCell className="text-right">{formatCurrency(invoice.subtotal)}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell colSpan={3} className="text-right">Tax:</TableCell>
                <TableCell className="text-right">{formatCurrency(invoice.tax)}</TableCell>
              </TableRow>
              {invoice.discount > 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-right">Discount:</TableCell>
                  <TableCell className="text-right">-{formatCurrency(invoice.discount)}</TableCell>
                </TableRow>
              )}
              <TableRow>
                <TableCell colSpan={3} className="text-right font-medium">Total:</TableCell>
                <TableCell className="text-right font-bold">{formatCurrency(invoice.total)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </CardContent>
      </Card>

      <Tabs defaultValue="details">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {invoice.notes ? (
                <p className="whitespace-pre-line">{invoice.notes}</p>
              ) : (
                <p className="text-muted-foreground italic">No notes</p>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Terms</CardTitle>
            </CardHeader>
            <CardContent>
              {invoice.terms ? (
                <p className="whitespace-pre-line">{invoice.terms}</p>
              ) : (
                <p className="text-muted-foreground italic">No terms specified</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="files">
          <Card>
            <CardHeader>
              <CardTitle>Attached Files</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingFiles ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-10 bg-gray-200 rounded w-full"></div>
                  <div className="h-10 bg-gray-200 rounded w-full"></div>
                </div>
              ) : (
                <FileList 
                  files={files || []} 
                  onDelete={handleDeleteFile} 
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Email Dialog */}
      <Dialog open={emailDialog.open} onOpenChange={(open) => setEmailDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Email Invoice</DialogTitle>
            <DialogDescription>
              Send this invoice to the customer via email.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitEmail}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="emailTo" className="text-right">
                  To
                </Label>
                <Input
                  id="emailTo"
                  value={emailDialog.to}
                  onChange={(e) => setEmailDialog(prev => ({ ...prev, to: e.target.value }))}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="emailSubject" className="text-right">
                  Subject
                </Label>
                <Input
                  id="emailSubject"
                  value={emailDialog.subject}
                  onChange={(e) => setEmailDialog(prev => ({ ...prev, subject: e.target.value }))}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="emailMessage" className="text-right pt-2">
                  Message
                </Label>
                <Textarea
                  id="emailMessage"
                  value={emailDialog.message}
                  onChange={(e) => setEmailDialog(prev => ({ ...prev, message: e.target.value }))}
                  className="col-span-3"
                  rows={6}
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="includePdf" className="text-right">
                  Attach PDF
                </Label>
                <div className="flex items-center col-span-3">
                  <input
                    type="checkbox"
                    id="includePdf"
                    checked={emailDialog.includePdf}
                    onChange={(e) => setEmailDialog(prev => ({ ...prev, includePdf: e.target.checked }))}
                    className="mr-2 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary-400"
                  />
                  <Label htmlFor="includePdf" className="text-sm cursor-pointer select-none">
                    Include invoice PDF as attachment
                  </Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => setEmailDialog(prev => ({ ...prev, open: false }))}
                disabled={sendEmailMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={sendEmailMutation.isPending}
              >
                {sendEmailMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Email
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Mark as Paid Dialog */}
      <Dialog open={markAsPaidDialog.open} onOpenChange={(open) => setMarkAsPaidDialog(prev => ({ ...prev, open }))}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Mark Invoice as Paid</DialogTitle>
            <DialogDescription>
              Record payment details for this invoice.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitMarkAsPaid}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="paymentAmount" className="text-right">
                  Amount
                </Label>
                <Input
                  id="paymentAmount"
                  type="number"
                  step="0.01"
                  value={markAsPaidDialog.amount}
                  onChange={(e) => setMarkAsPaidDialog(prev => ({ ...prev, amount: e.target.value }))}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="paymentMethod" className="text-right">
                  Method
                </Label>
                <select
                  id="paymentMethod"
                  value={markAsPaidDialog.method}
                  onChange={(e) => setMarkAsPaidDialog(prev => ({ ...prev, method: e.target.value }))}
                  className="col-span-3 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  required
                >
                  <option value="bank">Bank Transfer</option>
                  <option value="card">Credit Card</option>
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="paymentReference" className="text-right">
                  Reference
                </Label>
                <Input
                  id="paymentReference"
                  value={markAsPaidDialog.reference}
                  onChange={(e) => setMarkAsPaidDialog(prev => ({ ...prev, reference: e.target.value }))}
                  placeholder="Transaction ID, check number, etc."
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="paymentDate" className="text-right">
                  Date
                </Label>
                <Input
                  id="paymentDate"
                  type="date"
                  value={markAsPaidDialog.date}
                  onChange={(e) => setMarkAsPaidDialog(prev => ({ ...prev, date: e.target.value }))}
                  className="col-span-3"
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button 
                type="button" 
                variant="secondary" 
                onClick={() => setMarkAsPaidDialog(prev => ({ ...prev, open: false }))}
                disabled={markAsPaidMutation.isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit"
                disabled={markAsPaidMutation.isPending}
              >
                {markAsPaidMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Mark as Paid
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete invoice {invoice.invoiceNumber}. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                deleteMutation.mutate();
              }}
              disabled={deleteMutation.isPending}
              className="bg-red-600 focus:ring-red-600"
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>Delete</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}