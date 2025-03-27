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
import CustomerForm from "@/components/forms/customer-form";

export default function CustomersPage() {
  const { toast } = useToast();
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
        title: "Customer deleted",
        description: "Customer has been deleted successfully.",
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
      title: "Customer created",
      description: "Customer has been created successfully."
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

  return (
    <div className="h-full">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Customers</h2>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <div className="relative">
            <Input 
              type="text" 
              placeholder="Search customers..." 
              className="pl-10 pr-4 py-2"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="h-5 w-5 absolute left-3 top-2.5 text-gray-400" />
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center">
                <Plus className="h-4 w-4 mr-2" />
                New Customer
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Customer</DialogTitle>
                <DialogDescription>
                  Fill in the details to add a new customer.
                </DialogDescription>
              </DialogHeader>
              <CustomerForm onSuccess={handleCustomerCreated} />
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
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Name</TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Contact</TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Location</TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Stats</TableHead>
                    <TableHead className="text-right font-medium text-xs uppercase tracking-wider">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        No customers found.
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
                        <TableCell>
                          <div className="text-sm text-gray-500">
                            {formatAddress(customer)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-3 text-xs">
                            <div className="flex items-center">
                              <Folder className="h-3.5 w-3.5 mr-1 text-gray-400" />
                              <span className="text-gray-600">{getProjectCount(customer.id)} projects</span>
                            </div>
                            <div className="flex items-center">
                              <FileText className="h-3.5 w-3.5 mr-1 text-gray-400" />
                              <span className="text-gray-600">{getQuoteCount(customer.id)} quotes</span>
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
                                    <Folder className="h-4 w-4 mr-2" /> View Projects
                                  </div>
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/quotes?customerId=${customer.id}`}>
                                  <div className="w-full flex items-center">
                                    <FileText className="h-4 w-4 mr-2" /> View Quotes
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
              Are you sure you want to delete this customer? This action cannot be undone.
              Any associated projects, quotes, and invoices will remain but will no longer be linked to this customer.
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
              onClick={() => selectedCustomerId && deleteCustomer.mutate(selectedCustomerId)}
              disabled={deleteCustomer.isPending}
            >
              {deleteCustomer.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
