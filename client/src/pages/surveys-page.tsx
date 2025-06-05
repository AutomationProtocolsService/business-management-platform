import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation, useRoute } from "wouter";
import SurveyDetails from "@/components/survey-details";
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2,
  ClipboardCheck,
  Calendar,
  MapPin,
  UserCheck
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
import SurveyForm from "@/components/forms/survey-form";

export default function SurveysPage() {
  const [location, navigate] = useLocation();
  const [isDetailsRoute, detailsParams] = useRoute("/surveys/:id");
  const [isEditRoute, editParams] = useRoute("/surveys/:id/edit");
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [dateRangeFilter, setDateRangeFilter] = useState("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedSurveyId, setSelectedSurveyId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  
  // Extract survey ID from the URL for edit or details view
  const getSurveyIdFromUrl = () => {
    if (detailsParams && detailsParams.id) {
      return parseInt(detailsParams.id);
    }
    if (editParams && editParams.id) {
      return parseInt(editParams.id);
    }
    return null;
  };
  
  const surveyIdFromUrl = getSurveyIdFromUrl();
  
  // Effect to open edit dialog when navigating to the edit route
  useEffect(() => {
    if (isEditRoute && surveyIdFromUrl) {
      setSelectedSurveyId(surveyIdFromUrl);
      setIsEditDialogOpen(true);
    } else {
      // Close the dialog if we're not on the edit route anymore
      setIsEditDialogOpen(false);
    }
  }, [isEditRoute, surveyIdFromUrl]);
  
  // Effect to open details dialog when navigating to the details route
  useEffect(() => {
    if (isDetailsRoute && !isEditRoute && surveyIdFromUrl) {
      setSelectedSurveyId(surveyIdFromUrl);
      setIsDetailsDialogOpen(true);
    } else {
      // Close the dialog if we're not on the details route anymore
      setIsDetailsDialogOpen(false);
    }
  }, [isDetailsRoute, isEditRoute, surveyIdFromUrl]);
  
  // Handle dialog close events
  const handleEditDialogClose = () => {
    setIsEditDialogOpen(false);
    navigate("/surveys"); // Navigate back to the main surveys page
  };
  
  const handleDetailsDialogClose = () => {
    setIsDetailsDialogOpen(false);
    navigate("/surveys"); // Navigate back to the main surveys page
  };

  // Fetch surveys
  const { data: surveys = [], isLoading } = useQuery({
    queryKey: ["/api/surveys", statusFilter, dateRangeFilter],
    queryFn: async ({ queryKey }) => {
      const [_, status, dateRange] = queryKey;
      
      const params = new URLSearchParams();
      if (status) params.append("status", status);
      
      if (dateRange && dateRange !== "all") {
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
      
      const url = `/api/surveys${params.toString() ? `?${params.toString()}` : ''}`;
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error("Failed to fetch surveys");
      }
      
      return res.json();
    }
  });

  // Fetch projects for the survey details
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ["/api/projects"],
  });

  // Fetch users for the assigned team members
  const { data: users = [] } = useQuery<any[]>({
    queryKey: ["/api/users"],
  });

  // Delete survey mutation
  const deleteSurvey = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/surveys/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Survey deleted",
        description: "Survey has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/surveys"] });
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

  // Mark survey as completed mutation
  const completeSurvey = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("POST", `/api/surveys/${id}/complete`, {
        endTime: new Date().toISOString()
      });
    },
    onSuccess: () => {
      toast({
        title: "Survey completed",
        description: "Survey has been marked as completed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/surveys"] });
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

  // Handle survey creation success
  const handleSurveyCreated = () => {
    setIsCreateDialogOpen(false);
    toast({
      title: "Survey scheduled",
      description: "Survey has been scheduled successfully."
    });
  };

  // Filter surveys by search query
  const filteredSurveys = surveys.filter((survey: any) => {
    // If there's a search query, check against project name
    if (searchQuery) {
      const project = projects.find((p: any) => p.id === survey.projectId);
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

  // Get assigned user name
  const getAssignedUserName = (userId: number | undefined | null) => {
    if (!userId) return "Unassigned";
    const user = users.find((u: any) => u.id === userId);
    return user ? user.fullName : `User #${userId}`;
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
        <h2 className="text-2xl font-bold text-gray-800">Surveys</h2>
        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <div className="relative">
            <Input 
              type="text" 
              placeholder="Search surveys..." 
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
              <SelectItem value="all">All Dates</SelectItem>
              <SelectItem value="upcoming">Upcoming</SelectItem>
              <SelectItem value="past">Past</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center">
                <Plus className="h-4 w-4 mr-2" />
                Schedule Survey
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Schedule New Survey</DialogTitle>
                <DialogDescription>
                  Fill in the details to schedule a new survey.
                </DialogDescription>
              </DialogHeader>
              <SurveyForm onSuccess={handleSurveyCreated} />
              <Button 
                form="survey-form"
                type="submit" 
                className="w-full mt-6" 
                data-testid="schedule-survey-submit"
              >
                Schedule Survey
              </Button>
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
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Assigned To</TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Status</TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Notes</TableHead>
                    <TableHead className="text-right font-medium text-xs uppercase tracking-wider">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSurveys.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        No surveys found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredSurveys.map((survey: any) => (
                      <TableRow key={survey.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="font-medium text-sm text-gray-900">
                            {getProjectName(survey.projectId)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm text-gray-500">
                            <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                            {formatDate(survey.scheduledDate, "MMM dd, yyyy")}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          <span>Full Day</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center text-sm text-gray-900">
                            <UserCheck className="h-4 w-4 mr-2 text-gray-400" />
                            {getAssignedUserName(survey.assignedTo)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {renderStatusBadge(survey.status)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500 max-w-xs truncate">
                          {survey.notes || "No notes"}
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
                                <Link href={`/surveys/${survey.id}`}>
                                  <div className="w-full flex items-center">
                                    <ClipboardCheck className="h-4 w-4 mr-2" /> View Details
                                  </div>
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/surveys/${survey.id}/edit`}>
                                  <div className="w-full flex items-center">
                                    <Edit className="h-4 w-4 mr-2" /> Edit
                                  </div>
                                </Link>
                              </DropdownMenuItem>
                              {survey.status === "scheduled" && (
                                <DropdownMenuItem 
                                  onClick={() => {
                                    setSelectedSurveyId(survey.id);
                                    setIsCompleteDialogOpen(true);
                                  }}
                                  className="text-green-600"
                                >
                                  <ClipboardCheck className="h-4 w-4 mr-2" /> Mark as Completed
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedSurveyId(survey.id);
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
              Are you sure you want to delete this survey? This action cannot be undone.
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
              onClick={() => selectedSurveyId && deleteSurvey.mutate(selectedSurveyId)}
              disabled={deleteSurvey.isPending}
            >
              {deleteSurvey.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Survey Dialog */}
      <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Complete Survey</DialogTitle>
            <DialogDescription>
              Are you sure you want to mark this survey as completed? This will update the status to "Completed".
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
              onClick={() => selectedSurveyId && completeSurvey.mutate(selectedSurveyId)}
              disabled={completeSurvey.isPending}
            >
              {completeSurvey.isPending ? "Updating..." : "Mark as Completed"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Survey Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Survey</DialogTitle>
            <DialogDescription>
              Make changes to the survey details below.
            </DialogDescription>
          </DialogHeader>
          {selectedSurveyId && (
            <SurveyForm
              surveyId={selectedSurveyId}
              onSuccess={() => {
                handleEditDialogClose();
                toast({
                  title: "Survey updated",
                  description: "Survey has been updated successfully."
                });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Survey Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={handleDetailsDialogClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Survey Details</DialogTitle>
          </DialogHeader>
          {selectedSurveyId && (
            <>
              {/* Fetch the specific survey details */}
              <SurveyDetails surveyId={selectedSurveyId} />
              <div className="flex justify-end space-x-2 mt-4">
                <Button 
                  onClick={() => {
                    handleDetailsDialogClose();
                    navigate(`/surveys/${selectedSurveyId}/edit`);
                  }}
                  variant="outline"
                >
                  <Edit className="h-4 w-4 mr-2" /> Edit
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleDetailsDialogClose}
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
