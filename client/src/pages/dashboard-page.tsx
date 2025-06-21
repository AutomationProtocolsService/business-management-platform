import { useState, useRef, useEffect, memo, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { 
  FileText, 
  Clipboard, 
  FolderClosed,
  DollarSign, 
  Search, 
  Plus,
  ArrowRight,
  User,
  Users
} from "lucide-react";
import { MetricCard } from "@/components/dashboard/metric-card";
import { useTerminology, getPlural } from "@/hooks/use-terminology";
import BusinessWorkflow from "@/components/dashboard/business-workflow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/date-utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Memoized components for better performance
const ProjectRow = memo(({ project, customer, getStatusColor }: any) => (
  <TableRow key={project.id}>
    <TableCell className="font-medium">{project.name}</TableCell>
    <TableCell>{customer?.name || "Unknown Client"}</TableCell>
    <TableCell>
      <Badge className={getStatusColor(project.status)}>
        {project.status}
      </Badge>
    </TableCell>
    <TableCell>{project.deadline ? formatDate(project.deadline, "PPP") : "No deadline"}</TableCell>
  </TableRow>
));

const InvoiceRow = memo(({ invoice, customer, getStatusColor }: any) => (
  <TableRow key={invoice.id}>
    <TableCell className="font-medium">#{invoice.invoiceNumber}</TableCell>
    <TableCell>{customer?.name || "Unknown Client"}</TableCell>
    <TableCell>
      <Badge className={getStatusColor(invoice.status)}>
        {invoice.status}
      </Badge>
    </TableCell>
    <TableCell>${invoice.total?.toFixed(2) || "0.00"}</TableCell>
  </TableRow>
));

const QuoteRow = memo(({ quote, customer, getStatusColor }: any) => (
  <TableRow key={quote.id}>
    <TableCell className="font-medium">#{quote.quoteNumber || quote.id}</TableCell>
    <TableCell>{customer?.name || "Unknown Client"}</TableCell>
    <TableCell>
      <Badge className={getStatusColor(quote.status)}>
        {quote.status}
      </Badge>
    </TableCell>
    <TableCell>${quote.total?.toFixed(2) || "0.00"}</TableCell>
  </TableRow>
));

export default function DashboardPage() {
  // Get custom terminology
  const terminology = useTerminology();
  const [location, navigate] = useLocation();
  
  // Active tab for main dashboard content
  const [activeTab, setActiveTab] = useState("overview");
  
  // Search state
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch optimized dashboard data (single API call to prevent N+1 queries)
  const { data: dashboardData, isLoading: dashboardLoading } = useQuery<any>({
    queryKey: ["/api/dashboard"],
  });

  // Extract data from the optimized response
  const projects = dashboardData?.recentActivity?.projects || [];
  const invoices = dashboardData?.recentActivity?.invoices || [];
  const quotes = dashboardData?.recentActivity?.quotes || [];
  const customers = dashboardData?.recentActivity?.customers || [];

  // Use optimized metrics from dashboard service instead of recalculating
  const metrics = {
    activeProjects: dashboardData?.stats?.projects?.byStatus?.["In Progress"] || 0,
    totalProjects: dashboardData?.stats?.projects?.total || 0,
    pendingQuotes: dashboardData?.stats?.quotes?.pendingCount || 0,
    totalQuotes: dashboardData?.stats?.quotes?.total || 0,
    unpaidInvoices: (dashboardData?.stats?.invoices?.pendingAmount || 0) + (dashboardData?.stats?.invoices?.overdue || 0),
    totalUnpaidAmount: (dashboardData?.stats?.invoices?.pendingAmount || 0),
    totalCustomers: dashboardData?.stats?.customers?.total || 0,
    newCustomersThisMonth: dashboardData?.stats?.customers?.new || 0
  };

  // Loading state
  const isLoading = dashboardLoading;

  // Helper function to get status badge color
  const getStatusColor = (status: string = '') => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'delayed':
        return 'bg-red-100 text-red-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'paid':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  // Handle client selection from search
  const handleClientSelect = (customerId: number) => {
    // Find the selected client
    const customer = customers.find(c => c.id === customerId);
    if (!customer) return;
    
    // Navigate to customer details page
    navigate(`/customers/${customerId}`);
    setIsSearchOpen(false);
  };
  
  // Handle keyboard shortcuts for search - must be called in all render paths
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open search with Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [setIsSearchOpen]);

  // Component for loading state
  const LoadingState = () => (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-gray-500">Loading dashboard data...</p>
      </div>
    </div>
  );

  // Dashboard content when data is loaded
  const DashboardContent = () => (
    <>
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
          <p className="text-gray-500 mt-1">Welcome back! Here's your business at a glance.</p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <Popover open={isSearchOpen} onOpenChange={setIsSearchOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[250px] justify-between pl-3 pr-1.5">
                <div className="flex items-center">
                  <Search className="h-4 w-4 mr-2 text-gray-500" />
                  <span className="text-muted-foreground">Search clients...</span>
                </div>
                <div className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-xs">Ctrl+K</div>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
              <Command>
                <CommandInput 
                  placeholder="Search for clients..." 
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                  className="h-9"
                />
                <CommandList>
                  <CommandEmpty>No clients found</CommandEmpty>
                  <CommandGroup heading="Clients">
                    {customers
                      .filter(customer => 
                        customer?.name?.toLowerCase().includes(searchQuery.toLowerCase() || '') || 
                        customer?.email?.toLowerCase().includes(searchQuery.toLowerCase() || '')
                      )
                      .slice(0, 10)
                      .map(customer => (
                        <CommandItem
                          key={customer.id}
                          value={customer.name || ''}
                          onSelect={() => handleClientSelect(customer.id)}
                          className="flex items-center cursor-pointer"
                        >
                          <User className="h-4 w-4 mr-2 text-gray-500" />
                          <div className="flex flex-col">
                            <span>{customer.name || 'Unnamed Client'}</span>
                            {customer.email && (
                              <span className="text-xs text-gray-500">{customer.email}</span>
                            )}
                          </div>
                        </CommandItem>
                      ))
                    }
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          
          <Link to="/projects/new">
            <Button className="flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title={`Active ${terminology.project}s`}
          value={metrics.activeProjects}
          subtitle={`${metrics.totalProjects} total ${getPlural(terminology.project).toLowerCase()}`}
          icon={FolderClosed}
          variant="default"
          onClick={() => navigate('/projects')}
        />
        
        <MetricCard
          title={`Pending ${getPlural(terminology.quote)}`}
          value={metrics.pendingQuotes}
          subtitle={metrics.totalQuotes > 0 
            ? `${Math.round((metrics.pendingQuotes / metrics.totalQuotes) * 100)}% awaiting response` 
            : "No quotes"
          }
          icon={FileText}
          variant="info"
          onClick={() => navigate('/quotes')}
        />
        
        <MetricCard
          title={`Unpaid ${getPlural(terminology.invoice)}`}
          value={metrics.unpaidInvoices}
          subtitle={`$${metrics.totalUnpaidAmount?.toLocaleString() || "0"} outstanding`}
          icon={DollarSign}
          variant="warning"
          onClick={() => navigate('/invoices')}
        />
        
        <MetricCard
          title={getPlural(terminology.customer)}
          value={metrics.totalCustomers}
          subtitle={`${metrics.newCustomersThisMonth} new this month`}
          icon={Users}
          variant="success"
          onClick={() => navigate('/customers')}
        />
      </div>

      {/* Main Dashboard Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">{getPlural(terminology.project)}</TabsTrigger>
          <TabsTrigger value="invoices">{getPlural(terminology.invoice)}</TabsTrigger>
          <TabsTrigger value="quotes">{getPlural(terminology.quote)}</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="mb-6">
            <BusinessWorkflow />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent {getPlural(terminology.project)}</CardTitle>
                  <CardDescription>Your latest 5 {getPlural(terminology.project).toLowerCase()}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Client</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Deadline</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projects.slice(0, 5).map((project: any) => {
                        const customer = customers.find((c: any) => c.id === project.customerId);
                        return (
                          <ProjectRow 
                            key={project.id}
                            project={project} 
                            customer={customer} 
                            getStatusColor={getStatusColor} 
                          />
                        );
                      })}
                      {projects.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-4 text-gray-500">
                            No projects found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
                <CardFooter className="border-t px-6 py-3">
                  <Link to="/projects" className="text-sm text-blue-500 flex items-center hover:underline">
                    <span>View all projects</span>
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </CardFooter>
              </Card>
            </div>
            
            <div>
              <Card className="h-full">
                <CardHeader>
                  <CardTitle>Financial Summary</CardTitle>
                  <CardDescription>Quick overview of your finances</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-1">{getPlural(terminology.invoice)} This Month</h4>
                    <div className="flex items-center justify-between">
                      <span>
                        ${(invoices
                          .filter(inv => {
                            if (!inv?.issueDate) return false;
                            const date = new Date(inv.issueDate);
                            const now = new Date();
                            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                          })
                          .reduce((sum, inv) => sum + (inv?.total || 0), 0) || 0)
                          .toLocaleString()}
                      </span>
                      <Badge className="bg-green-100 text-green-800">
                        {invoices.filter(inv => {
                          if (!inv?.issueDate) return false;
                          const date = new Date(inv.issueDate);
                          const now = new Date();
                          return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                        }).length} {getPlural(terminology.invoice).toLowerCase()}
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-1">Outstanding Payments</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-amber-600 font-medium">
                        ${metrics.totalUnpaidAmount?.toLocaleString() || "0"}
                      </span>
                      <Badge className="bg-yellow-100 text-yellow-800">
                        {metrics.unpaidInvoices} {getPlural(terminology.invoice).toLowerCase()}
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-1">{getPlural(terminology.quote)} Pending</h4>
                    <div className="flex items-center justify-between">
                      <span>
                        ${(quotes
                          .filter(q => q?.status?.toLowerCase() === "pending")
                          .reduce((sum, q) => sum + (q?.total || 0), 0) || 0)
                          .toLocaleString()}
                      </span>
                      <Badge className="bg-blue-100 text-blue-800">
                        {metrics.pendingQuotes} {getPlural(terminology.quote).toLowerCase()}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium mb-3">Recent Activity</h4>
                    <div className="space-y-3">
                      {invoices.slice(0, 3).map(invoice => (
                        <div key={invoice.id} className="flex items-start space-x-2">
                          <div className="bg-blue-100 text-blue-800 p-1 rounded-full">
                            <DollarSign className="h-3 w-3" />
                          </div>
                          <div className="flex-1 text-sm">
                            <p>{terminology.invoice} #{invoice.invoiceNumber} {invoice.status}</p>
                            <p className="text-xs text-gray-500">
                              {invoice.issueDate ? formatDate(invoice.issueDate) : "No date"} - ${invoice.total?.toLocaleString() || "0"}
                            </p>
                          </div>
                        </div>
                      ))}
                      {invoices.length === 0 && (
                        <div className="text-center py-2 text-gray-500 text-sm">
                          No recent {getPlural(terminology.invoice).toLowerCase()}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-3">
                  <Link to="/invoices" className="text-sm text-blue-500 flex items-center hover:underline">
                    <span>View financial reports</span>
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Link>
                </CardFooter>
              </Card>
            </div>
          </div>
        </TabsContent>
        
        {/* Projects Tab */}
        <TabsContent value="projects">
          <Card>
            <CardHeader>
              <CardTitle>All {getPlural(terminology.project)}</CardTitle>
              <CardDescription>Complete list of your {getPlural(terminology.project).toLowerCase()}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Deadline</TableHead>
                    <TableHead>Budget</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.map((project) => {
                    const customer = customers.find((c) => c.id === project.customerId);
                    return (
                      <TableRow key={project.id}>
                        <TableCell className="font-medium">
                          <Link to={`/projects/${project.id}`}>
                            <span className="text-blue-500 hover:underline">{project.name}</span>
                          </Link>
                        </TableCell>
                        <TableCell>{customer?.name || "Unknown Client"}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(project.status)}>
                            {project.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{project.startDate ? formatDate(project.startDate) : "Not set"}</TableCell>
                        <TableCell>{project.deadline ? formatDate(project.deadline) : "No deadline"}</TableCell>
                        <TableCell>${project.budget?.toLocaleString() || "0"}</TableCell>
                      </TableRow>
                    );
                  })}
                  {projects.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                        No projects found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Invoices Tab */}
        <TabsContent value="invoices">
          <Card>
            <CardHeader>
              <CardTitle>All {getPlural(terminology.invoice)}</CardTitle>
              <CardDescription>Complete list of your {getPlural(terminology.invoice).toLowerCase()}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => {
                    const customer = customers.find((c) => c.id === invoice.customerId);
                    return (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">
                          <Link to={`/invoices/${invoice.id}`}>
                            <span className="text-blue-500 hover:underline">#{invoice.invoiceNumber}</span>
                          </Link>
                        </TableCell>
                        <TableCell>{customer?.name || "Unknown Client"}</TableCell>
                        <TableCell>{invoice.issueDate ? formatDate(invoice.issueDate) : "No date"}</TableCell>
                        <TableCell>{invoice.dueDate ? formatDate(invoice.dueDate) : "No date"}</TableCell>
                        <TableCell>${invoice.total?.toLocaleString() || "0"}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(invoice.status)}>
                            {invoice.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {invoices.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                        No invoices found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Quotes Tab */}
        <TabsContent value="quotes">
          <Card>
            <CardHeader>
              <CardTitle>All {getPlural(terminology.quote)}</CardTitle>
              <CardDescription>Complete list of your {getPlural(terminology.quote).toLowerCase()}</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quote #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Expiry</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quotes.map((quote) => {
                    const customer = customers.find((c) => c.id === quote.customerId);
                    return (
                      <TableRow key={quote.id}>
                        <TableCell className="font-medium">
                          <Link to={`/quotes/${quote.id}`}>
                            <span className="text-blue-500 hover:underline">#{quote.quoteNumber}</span>
                          </Link>
                        </TableCell>
                        <TableCell>{customer?.name || "Unknown Client"}</TableCell>
                        <TableCell>{quote.date ? formatDate(quote.date) : "No date"}</TableCell>
                        <TableCell>{quote.expiryDate ? formatDate(quote.expiryDate) : "No date"}</TableCell>
                        <TableCell>${quote.total?.toLocaleString() || "0"}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(quote.status)}>
                            {quote.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {quotes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-4 text-gray-500">
                        No {getPlural(terminology.quote).toLowerCase()} found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );

  return (
    <div className="h-full px-1">
      {isLoading ? <LoadingState /> : <DashboardContent />}
    </div>
  );
}