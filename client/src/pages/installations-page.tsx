import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2,
  Wrench,
  Calendar,
  Users,
  CheckCircle 
} from "lucide-react";
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
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/date-utils";
import InstallationForm from "@/components/forms/installation-form";

export default function InstallationsPage() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateRangeFilter, setDateRangeFilter] = useState("upcoming");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedInstallationId, setSelectedInstallationId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);

  // Fetch installations
  const { data: installations = [], isLoading } = useQuery({
    queryKey: ["/api/installations", statusFilter, dateRangeFilter],
    queryFn: async ({ queryKey }) => {
      const [_, status, dateRange] = queryKey;
      
      const params = new URLSearchParams();
      if (status) params.append("status", status);
      
      if (dateRange) {
        const today = new Date();
        let startDate = new Date();
        let endDate = new Date();
        
        if (dateRange === "upcoming") {
          // From today forward
          startDate = today;
          endDate = new Date(today);
          endDate.setMonth(endDate.getMonth() + 3); // 3 months ahead
        } else if (dateRange === "past") {
          // Before today
          endDate = today;
          startDate = new Date(today);
          startDate.setMonth(startDate.getMonth() - 3); // 3 months back
        } else if (dateRange === "this-month") {
          // This month
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        }
        
        params.append("startDate", startDate.toISOString());
        params.append("endDate", endDate.toISOString());
      }
      
      const url = `/api/installations${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error("Failed to fetch installations");
      }
      
      return res.json();
    }
  });

  // Fetch projects for the installation details
  const { data: projects = [] } = useQuery({
    queryKey: ["/api/projects"],
  });

  // Fetch users for the assigned team members
  const { data: users = [] } = useQuery({
    queryKey: ["/api/users"],
  });

  // Delete installation mutation
  const deleteInstallation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/installations/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Installation deleted",
        description: "Installation has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/installations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
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

  // Mark installation as completed mutation
  const completeInstallation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/installations/${id}/complete`, {
        endTime: new Date().toISOString()
      });
    },
    onSuccess: () => {
      toast({
        title: "Installation completed",
        description: "Installation has been marked as completed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/installations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
      setIsCompleteDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle installation creation success
  const handleInstallationCreated = () => {
    setIsCreateDialogOpen(false);
    toast({
      title: "Installation scheduled",
      description: "Installation has been scheduled successfully."
    });
  };

  // Filter installations by search query
  const filteredInstallations = installations.filter((installation: any) => {
    // If there's a search query, check against project name
    if (searchQuery) {
      const project = projects.find((p: any) => p.id === installation.projectId);
      if (!project) return false;
      
      return project.name.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  // Get project name by ID
  const getProjectName = (projectId: number) => {
    const project = projects.find((p: any) => p.id === projectId);
    return project ? project.name : `Project #${projectId}`;
  };

  // Get assigned team members
  const getAssignedTeamMembers = (assignedTo: number[] | null) => {
    if (!assignedTo || assignedTo.length === 0) return "No team assigned";
    
    const teamMembers = assignedTo.map(userId => {
      const user = users.find((u: any) => u.id === userId);
      return user ? user.fullName : `User #${userId}`;
    });
    
    if (teamMembers.length === 1) return teamMembers[0];
    if (teamMembers.length === 2) return `${teamMembers[0]} and ${teamMembers[1]}`;
    if (teamMembers.length > 2) return `${teamMembers[0]}, ${teamMembers[1]} and ${teamMembers.length - 2} more`;
    
    return "No team assigned";
  };

  // Render status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "scheduled":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">Scheduled</Badge>;
      case "in-progress":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">In Progress</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">Completed</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">Cancelled</Badge>;
      case "rescheduled":
        return <Badge variant="outline" className="bg-purple-100 text-purple-800 hover:bg-purple-100">Rescheduled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="h-full">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Installations</h2>
        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <div className="relative">
            <Input 
              type="text" 
              placeholder="Search installations..." 
              className="pl-10 pr-4 py-2"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="h-5 w-5 absolute left-3 top-2.5 text-gray-400" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
              <SelectItem value="rescheduled">Rescheduled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateRangeFilter} onValueChange={setDateRangeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="past">Past</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center">
                <Plus className="h-4 w-4 mr-2" />
                Schedule Installation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Schedule New Installation</DialogTitle>
                <DialogDescription>
                  Fill in the details to schedule a new installation.
                </DialogDescription>
              </DialogHeader>
              <InstallationForm onSuccess={handleInstallationCreated} />
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
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Project</TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Date</TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Time</TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Team</TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Status</TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Notes</TableHead>
                    <TableHead className="text-right font-medium text-xs uppercase tracking-wider">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInstallations.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        No installations found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInstallations.map((installation: any) => (
                      <TableRow key={installation.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="font-medium text-sm text-gray-900">
                            {getProjectName(installation.projectId)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm text-gray-500">
                            <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                            {formatDate(installation.scheduledDate, "MMM dd, yyyy")}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {installation.startTime && installation.endTime ? (
                            <span>{formatDate(installation.startTime, "h:mm a")} - {formatDate(installation.endTime, "h:mm a")}</span>
                          ) : (
                            <span>To be determined</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm text-gray-900">
                            <Users className="h-4 w-4 mr-2 text-gray-400" />
                            {getAssignedTeamMembers(installation.assignedTo)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {renderStatusBadge(installation.status)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500 max-w-xs truncate">
                          {installation.notes || "No notes"}
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
                                <Link href={`/installations/${installation.id}`}>
                                  <div className="w-full flex items-center">
                                    <Wrench className="h-4 w-4 mr-2" /> View Details
                                  </div>
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/installations/${installation.id}/edit`}>
                                  <div className="w-full flex items-center">
                                    <Edit className="h-4 w-4 mr-2" /> Edit
                                  </div>
                                </Link>
                              </DropdownMenuItem>
                              {installation.status === "scheduled" && (
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedInstallationId(installation.id);
                                    setIsCompleteDialogOpen(true);
                                  }}
                                  className="text-green-600"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" /> Mark as Completed
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedInstallationId(installation.id);
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
              Are you sure you want to delete this installation? This action cannot be undone.
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
              onClick={() => selectedInstallationId && deleteInstallation.mutate(selectedInstallationId)}
              disabled={deleteInstallation.isPending}
            >
              {deleteInstallation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Installation Dialog */}
      <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Installation</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this installation as completed? This will update the status to "Completed".
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsCompleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              className="bg-green-600 hover:bg-green-700"
              onClick={() => selectedInstallationId && completeInstallation.mutate(selectedInstallationId)}
              disabled={completeInstallation.isPending}
            >
              {completeInstallation.isPending ? "Updating..." : "Mark as Completed"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
