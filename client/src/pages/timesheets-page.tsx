import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { 
  Plus, 
  Search, 
  Clock, 
  Calendar, 
  MoreHorizontal, 
  Edit, 
  Trash2,
  CheckCircle, 
  XCircle 
} from "lucide-react";
import { isValid } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/date-utils";
import TimesheetForm from "@/components/forms/timesheet-form";
import { useAuth } from "@/hooks/use-auth";

// View Timesheet Dialog Component
function ViewTimesheetDialog({ timesheetId, open, onClose, employees, projects }: {
  timesheetId: number;
  open: boolean;
  onClose: () => void;
  employees: any[];
  projects: any[];
}) {
  const { data: timesheet, isLoading } = useQuery({
    queryKey: ["/api/timesheets", timesheetId],
    queryFn: async () => {
      const response = await fetch(`/api/timesheets/${timesheetId}`);
      if (!response.ok) throw new Error('Failed to fetch timesheet');
      return response.json();
    },
    enabled: open
  });

  const getEmployeeName = (employeeId: number) => {
    const employee = employees.find((emp: any) => emp.id === employeeId);
    return employee ? `${employee.firstName} ${employee.lastName}` : "Unknown Employee";
  };

  const getProjectName = (projectId: number) => {
    const project = projects.find((proj: any) => proj.id === projectId);
    return project ? project.name : "No Project";
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return "—";
    const date = new Date(timeString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const calculateHours = (start: string, end: string, breakMinutes: number = 0) => {
    if (!start || !end) return 0;
    const startTime = new Date(start);
    const endTime = new Date(end);
    const diffMs = endTime.getTime() - startTime.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    const breakHours = breakMinutes / 60;
    return Math.max(0, diffHours - breakHours);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Timesheet Details</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : timesheet ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Employee</label>
                <p className="mt-1 text-sm text-gray-900">{getEmployeeName(timesheet.employeeId)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Date</label>
                <p className="mt-1 text-sm text-gray-900">{formatDate(timesheet.date)}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Start Time</label>
                <p className="mt-1 text-sm text-gray-900">{formatTime(timesheet.startTime)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">End Time</label>
                <p className="mt-1 text-sm text-gray-900">{formatTime(timesheet.endTime)}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Break Duration</label>
                <p className="mt-1 text-sm text-gray-900">{timesheet.breakDuration || 0} minutes</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Total Hours</label>
                <p className="mt-1 text-sm text-gray-900">
                  {calculateHours(timesheet.startTime, timesheet.endTime, timesheet.breakDuration).toFixed(2)} hrs
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Project</label>
                <p className="mt-1 text-sm text-gray-900">{timesheet.projectId ? getProjectName(timesheet.projectId) : "No Project"}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <div className="mt-1">
                  <Badge variant={getStatusBadgeVariant(timesheet.status)}>
                    {timesheet.status?.charAt(0).toUpperCase() + timesheet.status?.slice(1) || 'Pending'}
                  </Badge>
                </div>
              </div>
            </div>

            {timesheet.notes && (
              <div>
                <label className="text-sm font-medium text-gray-500">Notes</label>
                <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-3 rounded-md">{timesheet.notes}</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-gray-500">Timesheet not found</p>
        )}
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Edit Timesheet Dialog Component
function EditTimesheetDialog({ timesheetId, open, onClose, onSuccess }: {
  timesheetId: number;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { data: timesheet, isLoading } = useQuery({
    queryKey: ["/api/timesheets", timesheetId],
    queryFn: async () => {
      const response = await fetch(`/api/timesheets/${timesheetId}`);
      if (!response.ok) throw new Error('Failed to fetch timesheet');
      return response.json();
    },
    enabled: open
  });

  const updateTimesheet = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(`/api/timesheets/${timesheetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update timesheet');
      return response.json();
    },
    onSuccess: () => {
      onSuccess();
    },
    onError: (error: Error) => {
      console.error('Error updating timesheet:', error);
    },
  });

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Timesheet</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!timesheet) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Timesheet</DialogTitle>
          </DialogHeader>
          <p className="text-center text-gray-500">Timesheet not found</p>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Timesheet</DialogTitle>
          <DialogDescription>
            Update the timesheet details below.
          </DialogDescription>
        </DialogHeader>
        <TimesheetForm 
          initialData={timesheet}
          onSuccess={onSuccess}
          onSubmit={(data) => updateTimesheet.mutate(data)}
          submitLabel="Update Timesheet"
          isLoading={updateTimesheet.isPending}
        />
      </DialogContent>
    </Dialog>
  );
}

export default function TimesheetsPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [dateRangeFilter, setDateRangeFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedTimesheetId, setSelectedTimesheetId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  // Parse URL query parameters
  const searchParams = new URLSearchParams(window.location.search);
  const employeeIdParam = searchParams.get("employeeId");
  
  // Set employee filter from URL params if provided
  useEffect(() => {
    if (employeeIdParam) {
      setEmployeeFilter(employeeIdParam);
    }
  }, [employeeIdParam]);

  // Fetch timesheets with filters
  const { data: timesheets = [], isLoading } = useQuery({
    queryKey: ["/api/timesheets", employeeFilter, dateRangeFilter],
    queryFn: async ({ queryKey }) => {
      const [_, employeeId, dateRange] = queryKey;
      let url = "/api/timesheets";
      
      const params = new URLSearchParams();
      if (employeeId) params.append("employeeId", employeeId.toString());
      
      if (dateRange && dateRange !== "all") {
        const today = new Date();
        const startDate = new Date();
        
        if (dateRange === "this-week") {
          startDate.setDate(today.getDate() - today.getDay()); // Sunday of current week
        } else if (dateRange === "last-week") {
          startDate.setDate(today.getDate() - today.getDay() - 7); // Sunday of last week
        } else if (dateRange === "this-month") {
          startDate.setDate(1); // First day of current month
        } else if (dateRange === "last-month") {
          startDate.setMonth(today.getMonth() - 1);
          startDate.setDate(1); // First day of last month
        }
        
        const endDate = new Date();
        if (dateRange === "last-week") {
          endDate.setDate(today.getDate() - today.getDay() - 1); // Saturday of last week
        } else if (dateRange === "last-month") {
          endDate.setMonth(today.getMonth());
          endDate.setDate(0); // Last day of last month
        }
        
        params.append("startDate", startDate.toISOString());
        params.append("endDate", endDate.toISOString());
      }
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }
      
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error("Failed to fetch timesheets");
      }
      
      return res.json();
    }
  });

  // Fetch employees for the filter dropdown
  const { data: employees = [] } = useQuery({
    queryKey: ["/api/employees"],
  });

  // Fetch users for employee names
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
  });

  // Fetch projects for project names
  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
  });

  // Delete timesheet mutation
  const deleteTimesheet = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/timesheets/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Timesheet deleted",
        description: "Timesheet has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
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

  // Approve timesheet mutation
  const approveTimesheet = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/timesheets/${id}/approve`);
    },
    onSuccess: () => {
      toast({
        title: "Timesheet approved",
        description: "Timesheet has been approved successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
      setIsApproveDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle timesheet creation success
  const handleTimesheetCreated = () => {
    setIsCreateDialogOpen(false);
    toast({
      title: "Timesheet created",
      description: "Timesheet has been created successfully."
    });
  };

  // Filter timesheets by search query
  const filteredTimesheets = timesheets.filter((timesheet: any) => {
    // Currently just showing all timesheets, but could filter by notes or other fields
    return true;
  });

  // Get employee name by ID
  const getEmployeeName = (employeeId: number) => {
    const employee = employees.find((e: any) => e.id === employeeId);
    if (!employee) return `Employee #${employeeId}`;
    
    // Always use employee.fullName if available
    if (employee.fullName) {
      return employee.fullName;
    }
    
    // Fallback to user name if linked to a user
    if (employee.userId) {
      const user = users.find((u: any) => u.id === employee.userId);
      if (user && user.fullName) return user.fullName;
    }
    
    // Last resort fallbacks
    return employee.position ? `${employee.position} (No name)` : `Employee #${employeeId}`;
  };

  // Get project name by ID
  const getProjectName = (projectId: number | null) => {
    if (!projectId) return "—";
    const project = projects.find((p: any) => p.id === projectId);
    return project ? project.name : `Project #${projectId}`;
  };

  // Calculate hours worked
  const calculateHoursWorked = (startTime: string | Date | null, endTime: string | Date | null, breakDuration: number | null = 0) => {
    if (!startTime || !endTime) return 0;
    
    const start = new Date(startTime);
    const end = new Date(endTime);
    
    if (!isValid(start) || !isValid(end)) return 0;
    
    const durationMs = end.getTime() - start.getTime();
    const breakMs = (breakDuration || 0) * 60 * 1000; // Convert minutes to milliseconds
    const totalMs = durationMs - breakMs;
    const hours = totalMs / (1000 * 60 * 60);
    
    return hours.toFixed(2);
  };

  // Render status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  // Check if user can approve timesheets (manager or admin role)
  const canApproveTimesheets = user?.role === 'manager' || user?.role === 'admin';

  return (
    <div className="h-full">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Timesheets</h2>
        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <div className="relative">
            <Input 
              type="text" 
              placeholder="Search timesheets..." 
              className="pl-10 pr-4 py-2"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="h-5 w-5 absolute left-3 top-2.5 text-gray-400" />
          </div>
          <Select 
            value={employeeFilter} 
            onValueChange={(value) => {
              setEmployeeFilter(value);
              // Update URL with employee filter
              const newUrl = value 
                ? `?employeeId=${value}` 
                : window.location.pathname;
              window.history.pushState({}, '', newUrl);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {employees.map((employee: any) => (
                <SelectItem key={employee.id} value={employee.id.toString()}>
                  {getEmployeeName(employee.id)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Time" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="this-week">This Week</SelectItem>
              <SelectItem value="last-week">Last Week</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
              <SelectItem value="last-month">Last Month</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center">
                <Plus className="h-4 w-4 mr-2" />
                New Timesheet
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Timesheet</DialogTitle>
                <DialogDescription>
                  Fill in the details to log a new timesheet entry.
                </DialogDescription>
              </DialogHeader>
              <TimesheetForm 
                onSuccess={handleTimesheetCreated} 
                employeeId={employeeFilter ? parseInt(employeeFilter) : undefined}
              />
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
                    {!employeeFilter && (
                      <TableHead className="font-medium text-xs uppercase tracking-wider">Employee</TableHead>
                    )}
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Date</TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Time Range</TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Hours</TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Project</TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Status</TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Notes</TableHead>
                    <TableHead className="text-right font-medium text-xs uppercase tracking-wider">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTimesheets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={employeeFilter ? 7 : 8} className="h-24 text-center">
                        No timesheets found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTimesheets.map((timesheet: any) => (
                      <TableRow key={timesheet.id} className="hover:bg-gray-50">
                        {!employeeFilter && (
                          <TableCell>
                            <div className="flex items-center">
                              <Avatar className="h-8 w-8 mr-2">
                                <AvatarFallback className="bg-primary-600 text-white">
                                  {getInitials(getEmployeeName(timesheet.employeeId))}
                                </AvatarFallback>
                              </Avatar>
                              <div className="text-sm font-medium text-gray-900">
                                {getEmployeeName(timesheet.employeeId)}
                              </div>
                            </div>
                          </TableCell>
                        )}
                        <TableCell className="text-sm text-gray-900">
                          {timesheet.date ? formatDate(timesheet.date, "MMM dd, yyyy") : "No date"}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          <div className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {timesheet.startTime ? formatDate(timesheet.startTime, "h:mm a") : "No time"} - {timesheet.endTime ? formatDate(timesheet.endTime, "h:mm a") : "No time"}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm font-medium text-gray-900">
                          {calculateHoursWorked(timesheet.startTime, timesheet.endTime, timesheet.breakDuration)} hrs
                        </TableCell>
                        <TableCell className="text-sm text-gray-900">
                          {getProjectName(timesheet.projectId)}
                        </TableCell>
                        <TableCell>
                          {renderStatusBadge(timesheet.status)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500 max-w-xs truncate">
                          {timesheet.notes || "—"}
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
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedTimesheetId(timesheet.id);
                                  setIsViewDialogOpen(true);
                                }}
                              >
                                <Clock className="h-4 w-4 mr-2" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedTimesheetId(timesheet.id);
                                  setIsEditDialogOpen(true);
                                }}
                              >
                                <Edit className="h-4 w-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              {canApproveTimesheets && timesheet.status === "pending" && (
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedTimesheetId(timesheet.id);
                                    setIsApproveDialogOpen(true);
                                  }}
                                  className="text-green-600"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" /> Approve
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedTimesheetId(timesheet.id);
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
              Are you sure you want to delete this timesheet entry? This action cannot be undone.
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
              onClick={() => selectedTimesheetId && deleteTimesheet.mutate(selectedTimesheetId)}
              disabled={deleteTimesheet.isPending}
            >
              {deleteTimesheet.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Timesheet Details Dialog */}
      {selectedTimesheetId && isViewDialogOpen && (
        <ViewTimesheetDialog
          timesheetId={selectedTimesheetId}
          open={isViewDialogOpen}
          onClose={() => {
            setIsViewDialogOpen(false);
            setSelectedTimesheetId(null);
          }}
          employees={employees}
          projects={projects}
        />
      )}

      {/* Edit Timesheet Dialog */}
      {selectedTimesheetId && isEditDialogOpen && (
        <EditTimesheetDialog
          timesheetId={selectedTimesheetId}
          open={isEditDialogOpen}
          onClose={() => {
            setIsEditDialogOpen(false);
            setSelectedTimesheetId(null);
          }}
          onSuccess={() => {
            setIsEditDialogOpen(false);
            setSelectedTimesheetId(null);
            queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
            toast({
              title: "Timesheet updated",
              description: "Timesheet has been updated successfully.",
            });
          }}
        />
      )}

      {/* Approve Timesheet Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Timesheet</DialogTitle>
            <DialogDescription>
              Are you sure you want to approve this timesheet entry? This will mark it as approved.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsApproveDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => selectedTimesheetId && approveTimesheet.mutate(selectedTimesheetId)}
              disabled={approveTimesheet.isPending}
            >
              {approveTimesheet.isPending ? "Approving..." : "Approve"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
