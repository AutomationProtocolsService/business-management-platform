import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2,
  Users,
  Mail,
  Phone,
  Folder,
  FileText, 
  Loader2,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTerminology, getPlural } from "@/hooks/use-terminology";
import { usePageTitle } from "@/hooks/use-page-title";
import { PageLayout } from "@/components/layout/page-layout";
import CustomerForm from "@/components/forms/customer-form";
import { exportArrayToExcel } from "@/lib/exportCsv";

export default function CustomersPage() {
  const { toast } = useToast();
  const terminology = useTerminology();
  const { title, subtitle } = usePageTitle('customer', { isPlural: true });
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fetch customers
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["/api/customers"],
  });

  // Fetch projects for each customer
  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
  });

  // Fetch quotes for each customer
  const { data: quotes = [] } = useQuery({
    queryKey: ["/api/quotes"],
  });

  // Fetch invoices for each customer
  const { data: invoices = [] } = useQuery({
    queryKey: ["/api/invoices"],
  });

  // Delete customer mutation
  const deleteCustomer = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/customers/${id}`);
    },
    onSuccess: () => {
      toast({
        title: `${terminology.customer} deleted`,
        description: `${terminology.customer} has been deleted successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
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

  // Handle customer creation success
  const handleCustomerCreated = () => {
    setIsCreateDialogOpen(false);
    toast({
      title: `${terminology.customer} created`,
      description: `${terminology.customer} has been created successfully.`
    });
  };

  // Filter customers by search query
  const filteredCustomers = customers.filter((customer: any) => {
    const searchTerms = searchQuery.toLowerCase().split(' ');
    return searchTerms.every(term => 
      customer.name.toLowerCase().includes(term) ||
      (customer.email && customer.email.toLowerCase().includes(term)) ||
      (customer.phone && customer.phone.includes(term)) ||
      (customer.city && customer.city.toLowerCase().includes(term)) ||
      (customer.state && customer.state.toLowerCase().includes(term))
    );
  });

  // Get project count for a customer
  const getProjectCount = (customerId: number) => {
    return projects.filter((project: any) => project.customerId === customerId).length;
  };

  // Get quote count for a customer
  const getQuoteCount = (customerId: number) => {
    return quotes.filter((quote: any) => quote.customerId === customerId).length;
  };

  // Get invoice count for a customer
  const getInvoiceCount = (customerId: number) => {
    return invoices.filter((invoice: any) => invoice.customerId === customerId).length;
  };

  // Format address
  const formatAddress = (customer: any) => {
    const parts = [];
    if (customer.address) parts.push(customer.address);
    if (customer.city) parts.push(customer.city);
    if (customer.state) {
      if (customer.zipCode) {
        parts.push(`${customer.state}, ${customer.zipCode}`);
      } else {
        parts.push(customer.state);
      }
    } else if (customer.zipCode) {
      parts.push(customer.zipCode);
    }
    if (customer.country) parts.push(customer.country);
    
    return parts.join(', ');
  };

  // Export customers to Excel
  const onExportCustomers = () => {
    if (!customers?.length) return;

    // Build a "flat" object for every customer
    const rows = customers.map((c: any) => ({
      Name: c.name,
      Email: c.email || "",
      Phone: c.phone || "",
      Address: c.address || "",
      City: c.city || "",
      State: c.state || "",
      ZipCode: c.zipCode || "",
      Country: c.country || "",
      Quotes: getQuoteCount(c.id),
      Invoices: getInvoiceCount(c.id), 
      Projects: getProjectCount(c.id)
    }));

    // Call the helper
    exportArrayToExcel(rows, `Customers-${Date.now()}.xlsx`, "Customers");
  };

  // Search and create actions for the page header
  const pageActions = (
    <>
      <div className="relative">
        <Input 
          type="text" 
          placeholder={`Search ${title.toLowerCase()}...`} 
          className="pl-10 pr-4 py-2 w-full"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Search className="h-5 w-5 absolute left-3 top-2.5 text-gray-400" />
      </div>
      <Button 
        variant="outline" 
        onClick={onExportCustomers}
        disabled={!customers?.length}
        className="flex items-center whitespace-nowrap"
      >
        <Download className="h-4 w-4 mr-2" />
        Export
      </Button>
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogTrigger asChild>
          <Button className="flex items-center whitespace-nowrap">
            <Plus className="h-4 w-4 mr-2" />
            New {terminology.customer}
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New {terminology.customer}</DialogTitle>
            <DialogDescription>
              Fill in the details to add a new {terminology.customer.toLowerCase()}.
            </DialogDescription>
          </DialogHeader>
          <CustomerForm onSuccess={handleCustomerCreated} />
        </DialogContent>
      </Dialog>
    </>
  );

  return (
    <PageLayout 
      title={title}
      subtitle={subtitle}
      actions={pageActions}
    >
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Name</TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Contact</TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wider hidden md:table-cell">Location</TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wider hidden lg:table-cell">Stats</TableHead>
                    <TableHead className="text-right font-medium text-xs uppercase tracking-wider">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        No {getPlural(terminology.customer).toLowerCase()} found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCustomers.map((customer: any) => (
                      <TableRow key={customer.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="font-medium text-sm text-gray-900">{customer.name}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm space-y-1">
                            {customer.email && (
                              <div className="flex items-center">
                                <Mail className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                                <span className="text-gray-600">{customer.email}</span>
                              </div>
                            )}
                            {customer.phone && (
                              <div className="flex items-center">
                                <Phone className="h-3.5 w-3.5 mr-1.5 text-gray-400" />
                                <span className="text-gray-600">{customer.phone}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="text-sm text-gray-500">
                            {formatAddress(customer)}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="flex space-x-3 text-xs">
                            <div className="flex items-center">
                              <Folder className="h-3.5 w-3.5 mr-1 text-gray-400" />
                              <span className="text-gray-600">{getProjectCount(customer.id)} {getProjectCount(customer.id) === 1 ? terminology.project.toLowerCase() : getPlural(terminology.project).toLowerCase()}</span>
                            </div>
                            <div className="flex items-center">
                              <FileText className="h-3.5 w-3.5 mr-1 text-gray-400" />
                              <span className="text-gray-600">{getQuoteCount(customer.id)} {getQuoteCount(customer.id) === 1 ? terminology.quote.toLowerCase() : getPlural(terminology.quote).toLowerCase()}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem asChild>
                                <Link href={`/customers/${customer.id}`}>
                                  <div className="w-full flex items-center">
                                    <Users className="h-4 w-4 mr-2" /> View Details
                                  </div>
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/customers/${customer.id}/edit`}>
                                  <div className="w-full flex items-center">
                                    <Edit className="h-4 w-4 mr-2" /> Edit
                                  </div>
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/projects?customerId=${customer.id}`}>
                                  <div className="w-full flex items-center">
                                    <Folder className="h-4 w-4 mr-2" /> View {getPlural(terminology.project)}
                                  </div>
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/quotes?customerId=${customer.id}`}>
                                  <div className="w-full flex items-center">
                                    <FileText className="h-4 w-4 mr-2" /> View {getPlural(terminology.quote)}
                                  </div>
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedCustomerId(customer.id);
                                  setIsDeleteDialogOpen(true);
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
              Are you sure you want to delete this {terminology.customer.toLowerCase()}? This action cannot be undone.
              Any associated {getPlural(terminology.project).toLowerCase()}, {getPlural(terminology.quote).toLowerCase()}, and {getPlural(terminology.invoice).toLowerCase()} will remain but will no longer be linked to this {terminology.customer.toLowerCase()}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteDialogOpen(false)}
              className="sm:order-1"
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => selectedCustomerId && deleteCustomer.mutate(selectedCustomerId)}
              disabled={deleteCustomer.isPending}
              className="sm:order-2"
            >
              {deleteCustomer.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
