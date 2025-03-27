import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  FileText, 
  Clipboard, 
  FolderClosed,
  DollarSign, 
  Search, 
  Plus,
  ArrowRight
} from "lucide-react";
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

export default function DashboardPage() {
  // Active tab for main dashboard content
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch project data
  const { data: projects = [], isLoading: projectsLoading } = useQuery<any[]>({
    queryKey: ["/api/projects"],
    select: (data) => data?.slice(0, 5) || [],
  });

  // Fetch invoices data
  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<any[]>({
    queryKey: ["/api/invoices"],
    select: (data) => data?.slice(0, 5) || [],
  });

  // Fetch quotes data
  const { data: quotes = [], isLoading: quotesLoading } = useQuery<any[]>({
    queryKey: ["/api/quotes"],
    select: (data) => data?.slice(0, 5) || [],
  });

  // Fetch customers data
  const { data: customers = [], isLoading: customersLoading } = useQuery<any[]>({
    queryKey: ["/api/customers"],
  });

  // Calculate dashboard metrics
  const metrics = {
    activeProjects: projects.filter(p => p?.status?.toLowerCase() === "in progress").length,
    totalProjects: projects.length,
    pendingQuotes: quotes.filter(q => q?.status?.toLowerCase() === "pending").length,
    totalQuotes: quotes.length,
    unpaidInvoices: invoices.filter(i => 
      i?.status?.toLowerCase() === "pending" || i?.status?.toLowerCase() === "overdue"
    ).length,
    totalUnpaidAmount: invoices
      .filter(i => i?.status?.toLowerCase() === "pending" || i?.status?.toLowerCase() === "overdue")
      .reduce((sum, inv) => sum + (inv?.total || 0), 0),
    totalCustomers: customers.length,
    newCustomersThisMonth: customers.filter(c => {
      if (!c?.createdAt) return false;
      const createdAt = new Date(c.createdAt);
      const now = new Date();
      return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
    }).length
  };

  // Loading state
  const isLoading = projectsLoading || invoicesLoading || quotesLoading || customersLoading;
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

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

  return (
    <div className="h-full px-1">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
          <p className="text-gray-500 mt-1">Welcome back! Here's your business at a glance.</p>
        </div>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <div className="relative">
            <Input 
              type="text" 
              placeholder="Search..." 
              className="pl-10 pr-4 py-2"
            />
            <Search className="h-5 w-5 absolute left-3 top-2.5 text-gray-400" />
          </div>
          <Link href="/projects/new">
            <Button className="flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
              <FolderClosed className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.activeProjects}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.totalProjects} total projects
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Pending Quotes</CardTitle>
              <FileText className="h-4 w-4 text-indigo-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.pendingQuotes}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.totalQuotes > 0 
                ? `${Math.round((metrics.pendingQuotes / metrics.totalQuotes) * 100)}% awaiting response` 
                : "No quotes"
              }
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Unpaid Invoices</CardTitle>
              <DollarSign className="h-4 w-4 text-yellow-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.unpaidInvoices}</div>
            <p className="text-xs text-muted-foreground mt-1">
              ${metrics.totalUnpaidAmount.toLocaleString()} outstanding
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Customers</CardTitle>
              <Clipboard className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalCustomers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.newCustomersThisMonth} new this month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="quotes">Quotes</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Projects</CardTitle>
                  <CardDescription>Your latest 5 projects</CardDescription>
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
                      {projects.slice(0, 5).map((project) => {
                        const customer = customers.find((c) => c.id === project.customerId);
                        return (
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
                  <Link href="/projects" className="text-sm text-blue-500 flex items-center hover:underline">
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
                    <h4 className="text-sm font-medium mb-1">Invoices This Month</h4>
                    <div className="flex items-center justify-between">
                      <span>
                        ${invoices
                          .filter(inv => {
                            if (!inv?.issueDate) return false;
                            const date = new Date(inv.issueDate);
                            const now = new Date();
                            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                          })
                          .reduce((sum, inv) => sum + (inv?.total || 0), 0)
                          .toLocaleString()}
                      </span>
                      <Badge className="bg-green-100 text-green-800">
                        {invoices.filter(inv => {
                          if (!inv?.issueDate) return false;
                          const date = new Date(inv.issueDate);
                          const now = new Date();
                          return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
                        }).length} invoices
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-1">Outstanding Payments</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-amber-600 font-medium">
                        ${metrics.totalUnpaidAmount.toLocaleString()}
                      </span>
                      <Badge className="bg-yellow-100 text-yellow-800">
                        {metrics.unpaidInvoices} invoices
                      </Badge>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-1">Quotes Pending</h4>
                    <div className="flex items-center justify-between">
                      <span>
                        ${quotes
                          .filter(q => q?.status?.toLowerCase() === "pending")
                          .reduce((sum, q) => sum + (q?.total || 0), 0)
                          .toLocaleString()}
                      </span>
                      <Badge className="bg-blue-100 text-blue-800">
                        {metrics.pendingQuotes} quotes
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
                            <p>Invoice #{invoice.invoiceNumber} {invoice.status}</p>
                            <p className="text-xs text-gray-500">
                              {formatDate(invoice.issueDate)} - ${invoice.total?.toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                      {invoices.length === 0 && (
                        <div className="text-center py-2 text-gray-500 text-sm">
                          No recent invoices
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t px-6 py-3">
                  <Link href="/invoices" className="text-sm text-blue-500 flex items-center hover:underline">
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
              <CardTitle>All Projects</CardTitle>
              <CardDescription>Complete list of your projects</CardDescription>
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
                          <Link href={`/projects/${project.id}`}>
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
                        <TableCell>${project.budget?.toLocaleString() || "—"}</TableCell>
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
              <CardTitle>Recent Invoices</CardTitle>
              <CardDescription>Track your recent invoices</CardDescription>
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
                          <Link href={`/invoices/${invoice.id}`}>
                            <span className="text-blue-500 hover:underline">#{invoice.invoiceNumber}</span>
                          </Link>
                        </TableCell>
                        <TableCell>{customer?.name || "Unknown Client"}</TableCell>
                        <TableCell>{formatDate(invoice.issueDate)}</TableCell>
                        <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                        <TableCell>${invoice.total?.toLocaleString()}</TableCell>
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
              <CardTitle>Recent Quotes</CardTitle>
              <CardDescription>Track your recent quotes</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quote #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Issue Date</TableHead>
                    <TableHead>Expiry Date</TableHead>
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
                          <Link href={`/quotes/${quote.id}`}>
                            <span className="text-blue-500 hover:underline">#{quote.quoteNumber}</span>
                          </Link>
                        </TableCell>
                        <TableCell>{customer?.name || "Unknown Client"}</TableCell>
                        <TableCell>{formatDate(quote.issueDate)}</TableCell>
                        <TableCell>{quote.expiryDate ? formatDate(quote.expiryDate) : "N/A"}</TableCell>
                        <TableCell>${quote.total?.toLocaleString()}</TableCell>
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
                        No quotes found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}