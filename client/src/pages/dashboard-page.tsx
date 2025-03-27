import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { BarChart, FileText, Clipboard, FolderClosed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import StatCard from "@/components/dashboard/stat-card";
import ChartCard, { ChartData } from "@/components/dashboard/chart-card";
import ActivityList, { Activity } from "@/components/dashboard/activity-list";
import UpcomingEvents, { Event } from "@/components/dashboard/upcoming-events";
import ProjectTable, { ProjectTableRow } from "@/components/dashboard/project-table";
import { formatDate } from "@/lib/date-utils";

// Chart data initialization
const defaultRevenueData: ChartData[] = [
  { name: "Jan", value: 0 },
  { name: "Feb", value: 0 },
  { name: "Mar", value: 0 },
  { name: "Apr", value: 0 },
  { name: "May", value: 0 },
  { name: "Jun", value: 0 },
];

const defaultProjectStatusData: ChartData[] = [
  { name: "Pending", value: 0 },
  { name: "In Progress", value: 0 },
  { name: "Completed", value: 0 },
  { name: "Delayed", value: 0 },
];

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState("Last 30 days");
  const [projectStatusFilter, setProjectStatusFilter] = useState("All Projects");

  // Fetch dashboard data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["/api/dashboard"],
  });

  // Fetch recent projects
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["/api/projects"],
    select: (data) => data.slice(0, 5),
  });

  // Prepare data for components
  const [revenueData, setRevenueData] = useState(defaultRevenueData);
  const [projectStatusData, setProjectStatusData] = useState(defaultProjectStatusData);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [projectRows, setProjectRows] = useState<ProjectTableRow[]>([]);

  // Format dashboard data for UI
  useEffect(() => {
    if (dashboardData) {
      // Update project status data
      const statusData = [
        { name: "Pending", value: dashboardData.stats.projects.byStatus.pending || 0 },
        { name: "In Progress", value: dashboardData.stats.projects.byStatus.inProgress || 0 },
        { name: "Completed", value: dashboardData.stats.projects.byStatus.completed || 0 },
        { name: "Delayed", value: dashboardData.stats.projects.byStatus.delayed || 0 },
      ];
      setProjectStatusData(statusData);

      // Format recent projects
      if (dashboardData.recentProjects) {
        const formattedProjects = dashboardData.recentProjects.map((project: any) => ({
          id: project.id,
          name: project.name,
          reference: `Project #${project.id}`,
          client: "Loading...", // Would be populated from customer data in a real app
          status: project.status,
          deadline: project.deadline,
          budget: project.budget,
        }));
        setProjectRows(formattedProjects);
      }

      // Format upcoming events
      if (dashboardData.upcomingEvents) {
        const formattedEvents = dashboardData.upcomingEvents.map((event: any) => ({
          id: event.id,
          type: event.type,
          title: event.projectName,
          projectName: event.projectName,
          date: event.date,
          timeRange: "09:00 - 11:00 AM", // Would be calculated from start/end time in a real app
          assignees: "Assigned team member", // Would be populated from user data in a real app
        }));
        setEvents(formattedEvents);
      }

      // Create mock activities for display
      const mockActivities = [
        {
          id: 1,
          type: "quote",
          icon: <FileText className="h-4 w-4" />,
          iconBgColor: "bg-primary-100",
          iconColor: "text-primary-600",
          title: "New quote created",
          description: "Quote created for a client",
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        },
        {
          id: 2,
          type: "invoice",
          icon: <FileText className="h-4 w-4" />,
          iconBgColor: "bg-success-100",
          iconColor: "text-success-600",
          title: "Invoice paid",
          description: "Invoice payment received",
          timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
        },
        {
          id: 3,
          type: "survey",
          icon: <Clipboard className="h-4 w-4" />,
          iconBgColor: "bg-warning-100",
          iconColor: "text-warning-600",
          title: "Survey scheduled",
          description: "New survey appointment set",
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
        },
        {
          id: 4,
          type: "employee",
          icon: <FileText className="h-4 w-4" />,
          iconBgColor: "bg-secondary-100",
          iconColor: "text-secondary-600",
          title: "Employee record updated",
          description: "Employee information changed",
          timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
        },
      ];
      setActivities(mockActivities);
    }
  }, [dashboardData]);

  // If loading, show a loading state
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

  return (
    <div className="h-full">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <div className="relative">
            <Input 
              type="text" 
              placeholder="Search..." 
              className="pl-10 pr-4 py-2"
            />
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 absolute left-3 top-2.5 text-gray-400" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
              />
            </svg>
          </div>
          <Link href="/projects/new">
            <Button className="flex items-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-4 w-4 mr-2" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 4v16m8-8H4" 
                />
              </svg>
              New Project
            </Button>
          </Link>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Projects"
          value={dashboardData?.stats.projects.total || 0}
          icon={<FolderClosed />}
          iconBgColor="bg-primary-100"
          iconColor="text-primary-600"
          trend={{ value: "12% increase", isPositive: true }}
        />
        <StatCard
          title="Pending Quotes"
          value={dashboardData?.stats.quotes.pendingCount || 0}
          icon={<FileText />}
          iconBgColor="bg-secondary-100"
          iconColor="text-secondary-600"
          trend={{ value: "3 need review", isNeutral: true }}
        />
        <StatCard
          title="Invoices"
          value={`$${(dashboardData?.stats.invoices.totalAmount || 0).toLocaleString()}`}
          icon={<FileText />}
          iconBgColor="bg-warning-100"
          iconColor="text-warning-600"
          trend={{ value: "18% increase", isPositive: true }}
        />
        <StatCard
          title="Surveys"
          value={dashboardData?.stats.surveys.upcomingCount || 0}
          icon={<Clipboard />}
          iconBgColor="bg-success-100"
          iconColor="text-success-600"
          trend={{ 
            value: `${dashboardData?.stats.surveys.upcomingCount || 0} scheduled this week`, 
            isNeutral: true 
          }}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ChartCard
          title="Revenue Overview"
          timeRanges={["Last 30 days", "This Month", "This Quarter", "This Year"]}
          defaultTimeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          type="area"
          data={revenueData}
        />
        <ChartCard
          title="Project Status"
          timeRanges={["All Projects", "Active Projects", "Completed Projects"]}
          defaultTimeRange={projectStatusFilter}
          onTimeRangeChange={setProjectStatusFilter}
          type="pie"
          data={projectStatusData}
        />
      </div>

      {/* Recent Activities and Upcoming Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <ActivityList
          activities={activities}
          title="Recent Activities"
          viewAllHref="/activities"
        />
        <UpcomingEvents
          events={events}
          title="Upcoming Schedule"
          viewAllHref="/calendar"
        />
      </div>

      {/* Recent Projects Table */}
      <ProjectTable
        projects={projectRows}
        title="Recent Projects"
        viewAllHref="/projects"
      />
    </div>
  );
}
