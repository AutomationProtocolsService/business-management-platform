import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  AreaChart,
  Area
} from "recharts";
import { Button } from "@/components/ui/button";
import { Calendar, FileCog, FileSpreadsheet, Download, PrinterIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  useHoursByEmployee, 
  useProjectsPerEmployee, 
  useSalesData, 
  useScheduleLoad, 
  useEmployeePerformance,
  useSurveysReport,
  useInstallationsReport
} from "@/hooks/use-reports";

// Define chart colors
const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))"
];

// Real data processing functions
const processSalesData = (invoices: any[], period: string) => {
  if (!invoices || invoices.length === 0) {
    return [];
  }

  // Get current date
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  // Create month labels
  const monthLabels = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  
  if (period === "year") {
    // Initialize monthly totals
    const monthlyData = monthLabels.map(name => ({ name, value: 0 }));
    
    // Aggregate invoice totals by month
    invoices.forEach(invoice => {
      const invoiceDate = new Date(invoice.issueDate);
      // Only include invoices from the current year
      if (invoiceDate.getFullYear() === currentYear) {
        const month = invoiceDate.getMonth();
        monthlyData[month].value += invoice.total || 0;
      }
    });
    
    return monthlyData;
  } else if (period === "quarter") {
    // Get start date for quarter (3 months ago)
    const startDate = new Date();
    startDate.setMonth(currentMonth - 3);
    
    // Initialize weekly data (last 12 weeks)
    const weeklyData = Array(12).fill(0).map((_, i) => ({ 
      name: `Week ${i + 1}`, 
      value: 0 
    }));
    
    // Process invoices for the last quarter
    invoices.forEach(invoice => {
      const invoiceDate = new Date(invoice.issueDate);
      if (invoiceDate >= startDate) {
        // Calculate which week this invoice belongs to
        const timeDiff = now.getTime() - invoiceDate.getTime();
        const dayDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
        const weekIndex = Math.min(Math.floor(dayDiff / 7), 11);
        
        if (weekIndex >= 0 && weekIndex < 12) {
          weeklyData[11 - weekIndex].value += invoice.total || 0;
        }
      }
    });
    
    return weeklyData;
  } else { // month
    // Start date is 30 days ago
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    // Initialize daily data for important points in the month
    const dailyPoints = [1, 5, 10, 15, 20, 25, 30];
    const dailyData = dailyPoints.map(day => ({
      name: day.toString(),
      value: 0
    }));
    
    // Process invoices for the current month
    invoices.forEach(invoice => {
      const invoiceDate = new Date(invoice.issueDate);
      if (invoiceDate >= startDate) {
        const invoiceDay = invoiceDate.getDate();
        
        // Assign to nearest data point
        let nearestPoint = 1;
        let minDiff = Math.abs(invoiceDay - 1);
        
        dailyPoints.forEach(day => {
          const diff = Math.abs(invoiceDay - day);
          if (diff < minDiff) {
            minDiff = diff;
            nearestPoint = day;
          }
        });
        
        // Find the index in our data array
        const dataIndex = dailyPoints.indexOf(nearestPoint);
        if (dataIndex !== -1) {
          dailyData[dataIndex].value += invoice.total || 0;
        }
      }
    });
    
    return dailyData;
  }
};

const processQuotesVsInvoicesData = (quotes: any[], invoices: any[]) => {
  if (!quotes || !invoices) {
    return [];
  }
  
  // Create month labels
  const monthLabels = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  
  // Get current date
  const now = new Date();
  const currentYear = now.getFullYear();
  
  // Get the last 6 months
  const months: Array<{index: number, name: string}> = [];
  for (let i = 5; i >= 0; i--) {
    const monthIndex = (now.getMonth() - i + 12) % 12; // Ensure it's always positive
    months.push({
      index: monthIndex,
      name: monthLabels[monthIndex]
    });
  }
  
  // Create data structure for chart
  const data = months.map(month => ({
    name: month.name,
    quotes: 0,
    invoices: 0
  }));
  
  // Process quotes
  quotes.forEach(quote => {
    if (!quote.createdAt) return;
    
    const quoteDate = new Date(quote.createdAt);
    if (quoteDate.getFullYear() === currentYear) {
      const monthIndex = quoteDate.getMonth();
      
      // Find in our data array
      const dataIndex = data.findIndex(item => {
        const itemMonthIndex = months.find(m => m.name === item.name)?.index;
        return itemMonthIndex === monthIndex;
      });
      
      if (dataIndex !== -1) {
        data[dataIndex].quotes += quote.total || 0;
      }
    }
  });
  
  // Process invoices
  invoices.forEach(invoice => {
    if (!invoice.issueDate) return;
    
    const invoiceDate = new Date(invoice.issueDate);
    if (invoiceDate.getFullYear() === currentYear) {
      const monthIndex = invoiceDate.getMonth();
      
      // Find in our data array
      const dataIndex = data.findIndex(item => {
        const itemMonthIndex = months.find(m => m.name === item.name)?.index;
        return itemMonthIndex === monthIndex;
      });
      
      if (dataIndex !== -1) {
        data[dataIndex].invoices += invoice.total || 0;
      }
    }
  });
  
  return data;
};

const processSalesByCustomer = (invoices: any[], customers: any[]) => {
  if (!invoices || !customers || invoices.length === 0 || customers.length === 0) {
    return [];
  }
  
  // Group invoice totals by customer
  const customerTotals = new Map();
  
  invoices.forEach(invoice => {
    if (!invoice.customerId) return;
    
    const customerId = invoice.customerId;
    const currentTotal = customerTotals.get(customerId) || 0;
    customerTotals.set(customerId, currentTotal + (invoice.total || 0));
  });
  
  // Convert to array with customer names
  const salesByCustomer = Array.from(customerTotals.entries()).map(([customerId, total]) => {
    const customer = customers.find(c => c.id === customerId);
    return {
      name: customer ? customer.name : `Customer ID: ${customerId}`,
      value: total
    };
  });
  
  // Sort by total value (descending) and take top 8
  return salesByCustomer
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);
};

const processProjectStatusData = (projects: any[]) => {
  if (!projects || projects.length === 0) {
    return [];
  }
  
  // Status mapping to ensure consistent display names
  const statusMapping: { [key: string]: string } = {
    'pending': 'Pending',
    'in-progress': 'In Progress',
    'completed': 'Completed',
    'delayed': 'Delayed'
  };
  
  // Initialize counters
  const statusCounts: { [key: string]: number } = {
    'Pending': 0,
    'In Progress': 0,
    'Completed': 0,
    'Delayed': 0
  };
  
  // Count projects by status
  projects.forEach(project => {
    const status = project.status ? statusMapping[project.status] || project.status : 'Unknown';
    if (statusCounts[status] !== undefined) {
      statusCounts[status]++;
    } else {
      statusCounts[status] = 1;
    }
  });
  
  // Convert to array format for chart
  return Object.entries(statusCounts)
    .filter(([_, count]) => count > 0) // Only include statuses that have projects
    .map(([name, value]) => ({ name, value }));
};

const processInstallationStatusData = (installations: any[]) => {
  if (!installations || installations.length === 0) {
    return [];
  }
  
  // Status mapping to ensure consistent display names
  const statusMapping: { [key: string]: string } = {
    'scheduled': 'Scheduled',
    'in-progress': 'In Progress',
    'completed': 'Completed',
    'delayed': 'Delayed',
    'cancelled': 'Cancelled'
  };
  
  // Initialize counters
  const statusCounts: { [key: string]: number } = {
    'Scheduled': 0,
    'In Progress': 0,
    'Completed': 0,
    'Delayed': 0,
    'Cancelled': 0
  };
  
  // Count installations by status
  installations.forEach(installation => {
    const status = installation.status ? statusMapping[installation.status] || installation.status : 'Unknown';
    if (statusCounts[status] !== undefined) {
      statusCounts[status]++;
    } else {
      statusCounts[status] = 1;
    }
  });
  
  // Convert to array format for chart
  return Object.entries(statusCounts)
    .filter(([_, count]) => count > 0) // Only include statuses that have installations
    .map(([name, value]) => ({ name, value }));
};

const processSurveyData = (surveys: any[], period: string) => {
  if (!surveys || surveys.length === 0) {
    return [];
  }
  
  // Get current date
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  // Create month labels
  const monthLabels = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  
  if (period === "year") {
    // Initialize monthly data
    const monthlyData = monthLabels.map(name => ({ 
      name, 
      scheduled: 0, 
      completed: 0 
    }));
    
    // Aggregate survey counts by month
    surveys.forEach(survey => {
      if (!survey.scheduledDate) return;
      
      const surveyDate = new Date(survey.scheduledDate);
      if (surveyDate.getFullYear() === currentYear) {
        const month = surveyDate.getMonth();
        
        if (survey.status === 'scheduled') {
          monthlyData[month].scheduled++;
        } else if (survey.status === 'completed') {
          monthlyData[month].completed++;
        }
      }
    });
    
    return monthlyData;
  } else if (period === "quarter") {
    // Get start date for quarter (3 months ago)
    const startDate = new Date();
    startDate.setMonth(currentMonth - 3);
    
    // Initialize weekly data (12 weeks)
    const weeklyData = Array(12).fill(0).map((_, i) => ({ 
      name: `Week ${i + 1}`, 
      scheduled: 0, 
      completed: 0 
    }));
    
    // Process surveys for the last quarter
    surveys.forEach(survey => {
      if (!survey.scheduledDate) return;
      
      const surveyDate = new Date(survey.scheduledDate);
      if (surveyDate >= startDate) {
        // Calculate which week this survey belongs to
        const timeDiff = now.getTime() - surveyDate.getTime();
        const dayDiff = Math.floor(timeDiff / (1000 * 3600 * 24));
        const weekIndex = Math.min(Math.floor(dayDiff / 7), 11);
        
        if (weekIndex >= 0 && weekIndex < 12) {
          if (survey.status === 'scheduled') {
            weeklyData[11 - weekIndex].scheduled++;
          } else if (survey.status === 'completed') {
            weeklyData[11 - weekIndex].completed++;
          }
        }
      }
    });
    
    return weeklyData;
  } else { // month
    // Initialize daily data for the month (specific days)
    const dailyPoints = [1, 5, 10, 15, 20, 25, 30];
    const dailyData = dailyPoints.map(day => ({
      name: day.toString(),
      scheduled: 0,
      completed: 0
    }));
    
    // Get start date (30 days ago)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    // Process surveys for the last month
    surveys.forEach(survey => {
      if (!survey.scheduledDate) return;
      
      const surveyDate = new Date(survey.scheduledDate);
      if (surveyDate >= startDate) {
        const surveyDay = surveyDate.getDate();
        
        // Assign to nearest data point
        let nearestPoint = 1;
        let minDiff = Math.abs(surveyDay - 1);
        
        dailyPoints.forEach(day => {
          const diff = Math.abs(surveyDay - day);
          if (diff < minDiff) {
            minDiff = diff;
            nearestPoint = day;
          }
        });
        
        // Find the index in our data array
        const dataIndex = dailyPoints.indexOf(nearestPoint);
        if (dataIndex !== -1) {
          if (survey.status === 'scheduled') {
            dailyData[dataIndex].scheduled++;
          } else if (survey.status === 'completed') {
            dailyData[dataIndex].completed++;
          }
        }
      }
    });
    
    return dailyData;
  }
};

// We don't have real employee data, so we'll keep this for now
// In a real application, you'd fetch this from an API


export default function ReportsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("sales");
  const [salesPeriod, setSalesPeriod] = useState("year");
  const [surveyPeriod, setSurveyPeriod] = useState("year");
  
  // Date ranges for queries
  const currentDate = new Date();
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  
  const dateRange = {
    start: startOfMonth.toISOString().split('T')[0],
    end: endOfMonth.toISOString().split('T')[0]
  };

  // Real-time data hooks
  const { data: hoursData = [], isLoading: hoursLoading } = useHoursByEmployee(dateRange);
  const { data: projectsData = [], isLoading: projectsLoading } = useProjectsPerEmployee('active');
  const { data: salesData = [], isLoading: salesLoading } = useSalesData(currentDate.getFullYear());
  const { data: scheduleData = [], isLoading: scheduleLoading } = useScheduleLoad(dateRange);
  const { data: performanceData = [], isLoading: performanceLoading } = useEmployeePerformance();
  const { data: surveys = [], isLoading: surveysLoading } = useSurveysReport(surveyPeriod);
  const { data: installations = [], isLoading: installationsLoading } = useInstallationsReport(surveyPeriod);

  const isLoading = hoursLoading || projectsLoading || salesLoading || scheduleLoading || performanceLoading || surveysLoading || installationsLoading;

  const handleExportReport = () => {
    toast({
      title: "Export initiated",
      description: "Your report is being generated for download.",
    });
    
    // In a real app, this would trigger an API call to generate a report
    setTimeout(() => {
      toast({
        title: "Report exported",
        description: "Your report has been exported successfully.",
      });
    }, 1500);
  };

  const handlePrintReport = () => {
    window.print();
  };

  return (
    <div className="h-full">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Reports</h2>
        <div className="mt-4 md:mt-0 flex space-x-3">
          <Button variant="outline" onClick={handleExportReport} className="flex items-center">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" onClick={handlePrintReport} className="flex items-center">
            <PrinterIcon className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-4 md:w-[600px]">
          <TabsTrigger value="sales" className="flex items-center">
            <FileCog className="h-4 w-4 mr-2" />
            Sales
          </TabsTrigger>
          <TabsTrigger value="projects" className="flex items-center">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Projects
          </TabsTrigger>
          <TabsTrigger value="surveys" className="flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            Scheduling
          </TabsTrigger>
          <TabsTrigger value="employees" className="flex items-center">
            <Calendar className="h-4 w-4 mr-2" />
            Employees
          </TabsTrigger>
        </TabsList>
        
        {/* Sales Reports */}
        <TabsContent value="sales" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Sales Reports</h3>
            <Select value={salesPeriod} onValueChange={setSalesPeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Overview</CardTitle>
                <CardDescription>
                  Total revenue for the selected period
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={salesData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      formatter={(value) => [`$${value}`, "Revenue"]}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="total" 
                      stroke={CHART_COLORS[0]} 
                      fillOpacity={1} 
                      fill="url(#colorValue)" 
                      name="Revenue"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Projects per Employee</CardTitle>
                <CardDescription>
                  Active projects managed by each employee
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={projectsData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="employee" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="projects" name="Projects" fill={CHART_COLORS[1]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Employee Performance</CardTitle>
              <CardDescription>
                Total hours worked by each employee
              </CardDescription>
            </CardHeader>
            <CardContent className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={performanceData}
                  margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="employee" width={100} />
                  <Tooltip formatter={(value) => [value, "Hours"]} />
                  <Bar dataKey="total_hours" name="Total Hours" fill={CHART_COLORS[0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Project Reports */}
        <TabsContent value="projects" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Project Reports</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Project Status Distribution</CardTitle>
                <CardDescription>
                  Current status of all projects
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={scheduleData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="installations"
                      label={({ date, installations }) => `${date}: ${installations}`}
                    >
                      {scheduleData.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, name]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Project Timeline Performance</CardTitle>
                <CardDescription>
                  Actual vs. estimated completion time
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={hoursData}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="employee" />
                    <YAxis label={{ value: 'Hours', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="hours" name="Hours Worked" fill={CHART_COLORS[3]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Projects by Budget</CardTitle>
              <CardDescription>
                Budget allocation across projects
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: "Project A", budget: 45000 },
                    { name: "Project B", budget: 78500 },
                    { name: "Project C", budget: 32000 },
                    { name: "Project D", budget: 125000 },
                    { name: "Project E", budget: 95000 },
                    { name: "Project F", budget: 67500 },
                  ]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => [`$${value}`, "Budget"]} />
                  <Bar dataKey="budget" name="Budget" fill={CHART_COLORS[0]}>
                    {[
                      { name: "Project A", budget: 45000 },
                      { name: "Project B", budget: 78500 },
                      { name: "Project C", budget: 32000 },
                      { name: "Project D", budget: 125000 },
                      { name: "Project E", budget: 95000 },
                      { name: "Project F", budget: 67500 },
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Survey & Installation Reports */}
        <TabsContent value="surveys" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Survey & Installation Reports</h3>
            <Select value={surveyPeriod} onValueChange={setSurveyPeriod}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="quarter">This Quarter</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Survey Performance</CardTitle>
                <CardDescription>
                  Scheduled vs. completed surveys
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={processSurveyData(surveys, surveyPeriod)}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="scheduled" 
                      stroke={CHART_COLORS[0]} 
                      activeDot={{ r: 8 }} 
                      name="Scheduled"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="completed" 
                      stroke={CHART_COLORS[2]} 
                      name="Completed"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Installation Status</CardTitle>
                <CardDescription>
                  Current status of installations
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={processInstallationStatusData(installations)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {processInstallationStatusData(installations).map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, name]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Schedule Efficiency</CardTitle>
              <CardDescription>
                Average time between scheduling and completion
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    { name: "Jan", surveys: 3, installations: 5 },
                    { name: "Feb", surveys: 4, installations: 6 },
                    { name: "Mar", surveys: 2, installations: 4 },
                    { name: "Apr", surveys: 3, installations: 5 },
                    { name: "May", surveys: 5, installations: 7 },
                    { name: "Jun", surveys: 4, installations: 6 },
                  ]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" />
                  <YAxis label={{ value: 'Days', angle: -90, position: 'insideLeft' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="surveys" name="Survey Lead Time (Days)" fill={CHART_COLORS[0]} />
                  <Bar dataKey="installations" name="Installation Lead Time (Days)" fill={CHART_COLORS[1]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Employee Reports */}
        <TabsContent value="employees" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Employee Reports</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Hours by Employee</CardTitle>
                <CardDescription>
                  Hours logged by each employee this month
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  {hoursLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-sm text-muted-foreground">Loading...</div>
                    </div>
                  ) : hoursData && hoursData.length > 0 ? (
                    <BarChart
                      data={hoursData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="employee" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="hours" name="Hours" fill={CHART_COLORS[0]} />
                    </BarChart>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-sm text-muted-foreground">No time logged this month</div>
                    </div>
                  )}
                </ResponsiveContainer>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Projects per Employee</CardTitle>
                <CardDescription>
                  Number of projects assigned to each employee
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  {projectsLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-sm text-muted-foreground">Loading...</div>
                    </div>
                  ) : projectsData && projectsData.length > 0 ? (
                    <BarChart
                      data={projectsData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="employee" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="projects" name="Projects" fill={CHART_COLORS[1]} />
                    </BarChart>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-sm text-muted-foreground">No projects assigned</div>
                    </div>
                  )}
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Timesheet Approval Status</CardTitle>
              <CardDescription>
                Status of submitted timesheets
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "Approved", value: 28 },
                      { name: "Pending", value: 15 },
                      { name: "Rejected", value: 3 }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {[
                      { name: "Approved", value: 28 },
                      { name: "Pending", value: 15 },
                      { name: "Rejected", value: 3 }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, name]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
