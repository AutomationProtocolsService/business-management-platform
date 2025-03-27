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

// Define chart colors
const CHART_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))"
];

// Demo data for charts
const generateSalesData = (period: string) => {
  if (period === "year") {
    return [
      { name: "Jan", value: 12500 },
      { name: "Feb", value: 15000 },
      { name: "Mar", value: 18500 },
      { name: "Apr", value: 22000 },
      { name: "May", value: 19500 },
      { name: "Jun", value: 24500 },
      { name: "Jul", value: 26000 },
      { name: "Aug", value: 23000 },
      { name: "Sep", value: 25000 },
      { name: "Oct", value: 27500 },
      { name: "Nov", value: 30000 },
      { name: "Dec", value: 34000 }
    ];
  } else if (period === "quarter") {
    return [
      { name: "Week 1", value: 5500 },
      { name: "Week 2", value: 6300 },
      { name: "Week 3", value: 7200 },
      { name: "Week 4", value: 6800 },
      { name: "Week 5", value: 7500 },
      { name: "Week 6", value: 8100 },
      { name: "Week 7", value: 7900 },
      { name: "Week 8", value: 8400 },
      { name: "Week 9", value: 9200 },
      { name: "Week 10", value: 9800 },
      { name: "Week 11", value: 10500 },
      { name: "Week 12", value: 11200 },
    ];
  } else { // month
    return [
      { name: "1", value: 1100 },
      { name: "5", value: 1400 },
      { name: "10", value: 1800 },
      { name: "15", value: 2100 },
      { name: "20", value: 2500 },
      { name: "25", value: 2800 },
      { name: "30", value: 3200 }
    ];
  }
};

const generateProjectStatusData = () => [
  { name: "Pending", value: 8 },
  { name: "In Progress", value: 12 },
  { name: "Completed", value: 20 },
  { name: "Delayed", value: 4 }
];

const generateSurveyData = (period: string) => {
  if (period === "year") {
    return [
      { name: "Jan", scheduled: 12, completed: 10 },
      { name: "Feb", scheduled: 15, completed: 13 },
      { name: "Mar", scheduled: 18, completed: 16 },
      { name: "Apr", scheduled: 22, completed: 19 },
      { name: "May", scheduled: 20, completed: 18 },
      { name: "Jun", scheduled: 25, completed: 22 },
      { name: "Jul", scheduled: 28, completed: 25 },
      { name: "Aug", scheduled: 24, completed: 21 },
      { name: "Sep", scheduled: 26, completed: 24 },
      { name: "Oct", scheduled: 30, completed: 28 },
      { name: "Nov", scheduled: 32, completed: 30 },
      { name: "Dec", scheduled: 35, completed: 33 }
    ];
  } else if (period === "quarter") {
    return [
      { name: "Week 1", scheduled: 5, completed: 4 },
      { name: "Week 2", scheduled: 7, completed: 6 },
      { name: "Week 3", scheduled: 8, completed: 7 },
      { name: "Week 4", scheduled: 6, completed: 5 },
      { name: "Week 5", scheduled: 9, completed: 8 },
      { name: "Week 6", scheduled: 8, completed: 7 },
      { name: "Week 7", scheduled: 9, completed: 8 },
      { name: "Week 8", scheduled: 10, completed: 9 },
      { name: "Week 9", scheduled: 12, completed: 10 },
      { name: "Week 10", scheduled: 11, completed: 10 },
      { name: "Week 11", scheduled: 10, completed: 9 },
      { name: "Week 12", scheduled: 9, completed: 8 }
    ];
  } else { // month
    return [
      { name: "1", scheduled: 3, completed: 2 },
      { name: "5", scheduled: 4, completed: 3 },
      { name: "10", scheduled: 5, completed: 4 },
      { name: "15", scheduled: 6, completed: 5 },
      { name: "20", scheduled: 4, completed: 4 },
      { name: "25", scheduled: 5, completed: 4 },
      { name: "30", scheduled: 3, completed: 3 }
    ];
  }
};

const generateEmployeeData = () => [
  { name: "John", hours: 160, projects: 5 },
  { name: "Sarah", hours: 152, projects: 4 },
  { name: "Mike", hours: 168, projects: 6 },
  { name: "Lisa", hours: 144, projects: 3 },
  { name: "David", hours: 136, projects: 4 }
];

export default function ReportsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("sales");
  const [salesPeriod, setSalesPeriod] = useState("year");
  const [surveyPeriod, setSurveyPeriod] = useState("year");
  
  // Fetch report data
  const { data: reportData, isLoading } = useQuery({
    queryKey: ["/api/dashboard"],
  });

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
                    data={generateSalesData(salesPeriod)}
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
                      dataKey="value" 
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
                <CardTitle>Quotes vs. Invoices</CardTitle>
                <CardDescription>
                  Comparison of quotes issued and invoices billed
                </CardDescription>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: "Jan", quotes: 15000, invoices: 12500 },
                      { name: "Feb", quotes: 18000, invoices: 15000 },
                      { name: "Mar", quotes: 22000, invoices: 18500 },
                      { name: "Apr", quotes: 25000, invoices: 22000 },
                      { name: "May", quotes: 23000, invoices: 19500 },
                      { name: "Jun", quotes: 28000, invoices: 24500 },
                    ]}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={(value) => [`$${value}`, ""]} />
                    <Legend />
                    <Bar dataKey="quotes" name="Quotes" fill={CHART_COLORS[1]} />
                    <Bar dataKey="invoices" name="Invoices" fill={CHART_COLORS[2]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Sales by Customer</CardTitle>
              <CardDescription>
                Top customers by revenue
              </CardDescription>
            </CardHeader>
            <CardContent className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={[
                    { name: "Acme Corporation", value: 58000 },
                    { name: "Global Industries", value: 45000 },
                    { name: "XYZ Solutions", value: 32000 },
                    { name: "ABC Technologies", value: 28000 },
                    { name: "Tech Innovators", value: 25000 },
                    { name: "Summit Enterprises", value: 22000 },
                    { name: "Premier Services", value: 18000 },
                    { name: "Elite Systems", value: 15000 },
                  ]}
                  margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={100} />
                  <Tooltip formatter={(value) => [`$${value}`, "Revenue"]} />
                  <Bar dataKey="value" name="Revenue" fill={CHART_COLORS[0]} />
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
                      data={generateProjectStatusData()}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {generateProjectStatusData().map((entry, index) => (
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
                    data={[
                      { name: "Project A", estimated: 30, actual: 35 },
                      { name: "Project B", estimated: 45, actual: 40 },
                      { name: "Project C", estimated: 60, actual: 65 },
                      { name: "Project D", estimated: 30, actual: 30 },
                      { name: "Project E", estimated: 45, actual: 55 },
                      { name: "Project F", estimated: 60, actual: 50 },
                    ]}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis label={{ value: 'Days', angle: -90, position: 'insideLeft' }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="estimated" name="Estimated Days" fill={CHART_COLORS[3]} />
                    <Bar dataKey="actual" name="Actual Days" fill={CHART_COLORS[4]} />
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
                    data={generateSurveyData(surveyPeriod)}
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
                      data={[
                        { name: "Scheduled", value: 12 },
                        { name: "In Progress", value: 8 },
                        { name: "Completed", value: 15 },
                        { name: "Delayed", value: 3 }
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
                        { name: "Scheduled", value: 12 },
                        { name: "In Progress", value: 8 },
                        { name: "Completed", value: 15 },
                        { name: "Delayed", value: 3 }
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
                  <BarChart
                    data={generateEmployeeData()}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="hours" name="Hours" fill={CHART_COLORS[0]} />
                  </BarChart>
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
                  <BarChart
                    data={generateEmployeeData()}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="projects" name="Projects" fill={CHART_COLORS[3]} />
                  </BarChart>
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
