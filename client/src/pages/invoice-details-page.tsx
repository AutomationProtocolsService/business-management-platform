import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { 
  Edit, 
  Trash2, 
  FileText, 
  Mail, 
  ArrowLeft, 
  CheckCircle,
  Calendar,
  Building,
  User,
  Package,
  DollarSign,
  Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/date-utils";
import { useSettings } from "@/hooks/use-settings";
import InvoiceForm from "@/components/forms/invoice-form";
import FileList from "@/components/file-list";

export default function InvoiceDetailsPage() {
  const [, params] = useRoute("/invoices/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { formatMoney, getCurrencySymbol } = useSettings();
  const invoiceId = params?.id ? parseInt(params.id) : null;
  
  // Dialog states
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEmailDialogOpen, setIsEmailDialogOpen] = useState(false);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [emailData, setEmailData] = useState({
    recipientEmail: "",
    subject: "",
    message: "",
    includePdf: true
  });

  // Fetch invoice details
  const { data: invoice, isLoading, isError } = useQuery({
    queryKey: [`/api/invoices/${invoiceId}`],
    queryFn: async () => {
      if (!invoiceId) return null;
      const res = await fetch(`/api/invoices/${invoiceId}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch invoice: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!invoiceId
  });

  // Fetch invoice items
  const { data: invoiceItems = [] } = useQuery({
    queryKey: [`/api/invoices/${invoiceId}/items`],
    queryFn: async () => {
      if (!invoiceId) return [];
      const res = await fetch(`/api/invoices/${invoiceId}/items`);
      if (!res.ok) {
        throw new Error(`Failed to fetch invoice items: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!invoiceId
  });

  // Fetch customer details if available
  const { data: customer } = useQuery({
    queryKey: ['/api/customers', invoice?.customerId],
    queryFn: async () => {
      if (!invoice?.customerId) return null;
      const res = await fetch(`/api/customers/${invoice.customerId}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch customer: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!invoice?.customerId
  });

  // Fetch project details if available
  const { data: project } = useQuery({
    queryKey: ['/api/projects', invoice?.projectId],
    queryFn: async () => {
      if (!invoice?.projectId) return null;
      const res = await fetch(`/api/projects/${invoice.projectId}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch project: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!invoice?.projectId
  });

  // Fetch attachments
  const { data: attachments = [] } = useQuery({
    queryKey: [`/api/files/invoice/${invoiceId}`],
    queryFn: async () => {
      if (!invoiceId) return [];
      const res = await fetch(`/api/files/invoice/${invoiceId}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch attachments: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!invoiceId
  });

  // Delete invoice mutation
  const deleteInvoice = useMutation({
    mutationFn: async () => {
      if (!invoiceId) return;
      await apiRequest("DELETE", `/api/invoices/${invoiceId}`);
    },
    onSuccess: () => {
      toast({
        title: "Invoice deleted",
        description: "Invoice has been deleted successfully."
      });
      setIsDeleteDialogOpen(false);
      navigate("/invoices");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Update invoice status mutation
  const updateInvoiceStatus = useMutation({
    mutationFn: async (status: string) => {
      if (!invoiceId) return;
      await apiRequest("PATCH", `/api/invoices/${invoiceId}`, { status });
    },
    onSuccess: () => {
      toast({
        title: "Status updated",
        description: "Invoice status has been updated successfully."
      });
      setIsStatusDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: [`/api/invoices/${invoiceId}`] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Email invoice mutation
  const emailInvoice = useMutation({
    mutationFn: async (data: typeof emailData) => {
      if (!invoiceId) return;
      await apiRequest("POST", `/api/invoices/${invoiceId}/email`, data);
    },
    onSuccess: () => {
      toast({
        title: "Email sent",
        description: "Invoice has been emailed successfully."
      });
      setIsEmailDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Handle invoice updated
  const handleInvoiceUpdated = () => {
    setIsEditDialogOpen(false);
    queryClient.invalidateQueries({ queryKey: [`/api/invoices/${invoiceId}`] });
    queryClient.invalidateQueries({ queryKey: [`/api/invoices/${invoiceId}/items`] });
    toast({
      title: "Invoice updated",
      description: "Invoice has been updated successfully."
    });
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

  // Handle email form changes
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setEmailData(prev => ({ ...prev, [name]: value }));
  };

  // Handle email checkbox change
  const handleIncludePdfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmailData(prev => ({ ...prev, includePdf: e.target.checked }));
  };

  // Initialize email data when customer data is loaded
  if (customer && emailData.recipientEmail === "" && customer.email) {
    setEmailData(prev => ({
      ...prev,
      recipientEmail: customer.email || "",
      subject: `Invoice #${invoice?.invoiceNumber || invoiceId}`,
    }));
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isError || !invoice) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Error loading invoice</h3>
        <p className="mt-2 text-sm text-gray-500">
          The invoice could not be loaded. Please try again.
        </p>
        <div className="mt-6">
          <Button variant="outline" onClick={() => navigate("/invoices")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Invoices
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <Button variant="ghost" onClick={() => navigate("/invoices")} className="mb-2 p-0 hover:bg-transparent">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Invoices
          </Button>
          <h1 className="text-2xl font-bold">Invoice #{invoice.invoiceNumber}</h1>
          <p className="text-gray-500">
            Created on {formatDate(invoice.issueDate, "MMMM dd, yyyy")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setIsStatusDialogOpen(true)}
            className="flex items-center"
          >
            {renderStatusBadge(invoice.status)}
            <span className="ml-2">Change Status</span>
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsEditDialogOpen(true)}
            className="flex items-center"
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button
            variant="outline"
            onClick={() => window.open(`/api/invoices/${invoiceId}/pdf`, '_blank')}
            className="flex items-center"
          >
            <FileText className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsEmailDialogOpen(true)}
            className="flex items-center"
            disabled={invoice.status === 'draft'}
          >
            <Mail className="mr-2 h-4 w-4" />
            Email
          </Button>
          <Button
            variant="outline"
            onClick={() => setIsDeleteDialogOpen(true)}
            className="flex items-center text-red-500 hover:text-red-700"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="space-y-6 md:col-span-2">
          {/* Invoice summary card */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Invoice Details</CardTitle>
                <div 
                  className="cursor-pointer"
                  onClick={() => setIsStatusDialogOpen(true)}
                >
                  {renderStatusBadge(invoice.status)}
                </div>
              </div>
              <CardDescription>
                {invoice.reference && (
                  <span className="block mt-1">Reference: {invoice.reference}</span>
                )}
                <span className="block mt-1">Issue Date: {formatDate(invoice.issueDate, "MMMM dd, yyyy")}</span>
                <span className="block mt-1">Due Date: {formatDate(invoice.dueDate, "MMMM dd, yyyy")}</span>
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
                      {customer.address && (
                        <p>
                          {customer.address}
                          {(customer.city || customer.state || customer.zipCode) && <br />}
                          {customer.city}{customer.city && customer.state ? ", " : ""}{customer.state} {customer.zipCode}
                        </p>
                      )}
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

                {invoice.notes && (
                  <div>
                    <h3 className="font-medium text-sm text-gray-500 mb-1">Notes</h3>
                    <p className="text-sm whitespace-pre-wrap">{invoice.notes}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Invoice items */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
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
                    {invoiceItems.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4 text-gray-500">
                          No items
                        </TableCell>
                      </TableRow>
                    ) : (
                      invoiceItems.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="align-top">
                            <div>
                              <p className="font-medium">{item.description}</p>
                              {item.catalogItemId && <Badge variant="outline" className="mt-1">Catalog Item</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{formatMoney(item.unitPrice)}</TableCell>
                          <TableCell className="text-right">{formatMoney(item.total)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Totals */}
              <div className="mt-4 space-y-2 text-sm w-full flex justify-end">
                <div className="w-48">
                  <div className="flex justify-between py-1">
                    <span>Subtotal:</span>
                    <span>{formatMoney(invoice.subtotal)}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span>Tax:</span>
                    <span>{formatMoney(invoice.tax)}</span>
                  </div>
                  {invoice.discount > 0 && (
                    <div className="flex justify-between py-1">
                      <span>Discount:</span>
                      <span>{formatMoney(invoice.discount)}</span>
                    </div>
                  )}
                  <Separator className="my-2" />
                  <div className="flex justify-between py-1 font-medium text-base">
                    <span>Total:</span>
                    <span>{formatMoney(invoice.total)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Terms & Conditions */}
          {invoice.terms && (
            <Card>
              <CardHeader>
                <CardTitle>Terms & Conditions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{invoice.terms}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Invoice Status card */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 mr-2 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Status</p>
                    <p className="text-sm text-gray-500">{renderStatusBadge(invoice.status)}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Issue Date</p>
                    <p className="text-sm text-gray-500">{formatDate(invoice.issueDate, "MMMM dd, yyyy")}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Due Date</p>
                    <p className="text-sm text-gray-500">{formatDate(invoice.dueDate, "MMMM dd, yyyy")}</p>
                  </div>
                </div>
                {customer && (
                  <div className="flex items-center">
                    <User className="h-5 w-5 mr-2 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">Customer</p>
                      <p className="text-sm text-gray-500">{customer.name}</p>
                    </div>
                  </div>
                )}
                {project && (
                  <div className="flex items-center">
                    <Package className="h-5 w-5 mr-2 text-gray-500" />
                    <div>
                      <p className="text-sm font-medium">Project</p>
                      <p className="text-sm text-gray-500">{project.name}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium">Total Amount</p>
                    <p className="text-sm text-gray-500">{formatMoney(invoice.total)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attachments */}
          <Card>
            <CardHeader>
              <CardTitle>Attachments</CardTitle>
            </CardHeader>
            <CardContent>
              {attachments.length === 0 ? (
                <p className="text-sm text-gray-500">No attachments</p>
              ) : (
                <ul className="space-y-2">
                  {attachments.map((file: any) => (
                    <li key={file.id} className="flex items-center justify-between gap-2 p-2 border rounded-md">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-500" />
                        <a 
                          href={file.fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-sm font-medium hover:underline"
                        >
                          {file.fileName}
                        </a>
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(file.createdAt, "MMM dd, yyyy")}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Invoice</DialogTitle>
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
              onClick={() => deleteInvoice.mutate()}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Status change dialog */}
      <Dialog open={isStatusDialogOpen} onOpenChange={setIsStatusDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Invoice Status</DialogTitle>
            <DialogDescription>
              Select the new status for this invoice.
            </DialogDescription>
          </DialogHeader>
          <Select
            value={newStatus || invoice.status}
            onValueChange={setNewStatus}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="issued">Issued</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsStatusDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => updateInvoiceStatus.mutate(newStatus || invoice.status)}
            >
              Update Status
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email dialog */}
      <Dialog open={isEmailDialogOpen} onOpenChange={setIsEmailDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Email Invoice</DialogTitle>
            <DialogDescription>
              Send this invoice to the customer via email.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recipientEmail">Recipient Email</Label>
              <Input
                id="recipientEmail"
                name="recipientEmail"
                type="email"
                value={emailData.recipientEmail}
                onChange={handleEmailChange}
                placeholder="customer@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                name="subject"
                value={emailData.subject}
                onChange={handleEmailChange}
                placeholder="Invoice #123"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                name="message"
                value={emailData.message}
                onChange={handleEmailChange}
                placeholder="Please find attached your invoice..."
                rows={4}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                id="includePdf"
                name="includePdf"
                type="checkbox"
                checked={emailData.includePdf}
                onChange={handleIncludePdfChange}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="includePdf">Attach PDF</Label>
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
              onClick={() => emailInvoice.mutate(emailData)}
              disabled={!emailData.recipientEmail || !emailData.subject}
            >
              Send Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Invoice Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center">
              <Edit className="h-5 w-5 mr-2 text-primary" />
              Edit Invoice
            </DialogTitle>
            <DialogDescription>
              Edit the details of this invoice. All fields marked with an asterisk (*) are required.
            </DialogDescription>
          </DialogHeader>
          <InvoiceForm 
            invoiceId={invoiceId} 
            onSuccess={handleInvoiceUpdated} 
            onCancel={() => setIsEditDialogOpen(false)}
            defaultValues={{
              ...invoice,
              items: invoiceItems
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}