import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { 
  FolderClosed, 
  FileText, 
  Receipt, 
  Users,
  Plus
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WelcomeEmptyState } from "@/components/dashboard/welcome-empty-state";

export default function SimpleDashboard() {
  // Fetch simple dashboard data
  const { data: dashboardData, isLoading } = useQuery<any>({
    queryKey: ["/api/dashboard"],
  });

  // Extract data with safe defaults
  const stats = dashboardData?.stats || {};
  const recentActivity = dashboardData?.recentActivity || {};
  
  const projects = recentActivity.projects || [];
  const quotes = recentActivity.quotes || [];
  const invoices = recentActivity.invoices || [];
  const customers = recentActivity.customers || [];

  // Check if we have any data
  const hasData = projects.length > 0 || quotes.length > 0 || invoices.length > 0 || customers.length > 0;

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Show empty state if no data
  if (!hasData) {
    return <WelcomeEmptyState />;
  }

  // Main dashboard content
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back! Here's your business overview.</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Link to="/projects/new">
            <Button className="flex items-center">
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <FolderClosed className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.projects?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats.projects?.active || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Quotes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.quotes?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats.quotes?.pending || 0} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invoices</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.invoices?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              ${(stats.invoices?.totalAmount || 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.customers?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total customers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Projects */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Projects</CardTitle>
          </CardHeader>
          <CardContent>
            {projects.length > 0 ? (
              <div className="space-y-3">
                {projects.slice(0, 5).map((project: any) => (
                  <div key={project.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{project.name}</p>
                      <p className="text-sm text-gray-500">{project.description}</p>
                    </div>
                    <Badge variant="outline">{project.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No projects yet</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Quotes */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Quotes</CardTitle>
          </CardHeader>
          <CardContent>
            {quotes.length > 0 ? (
              <div className="space-y-3">
                {quotes.slice(0, 5).map((quote: any) => (
                  <div key={quote.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">#{quote.quoteNumber}</p>
                      <p className="text-sm text-gray-500">${(quote.total || 0).toFixed(2)}</p>
                    </div>
                    <Badge variant="outline">{quote.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No quotes yet</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}