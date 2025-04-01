import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation, useRoute } from "wouter";
import ProjectDetails from "@/components/project-details";
import { 
  Plus, 
  Search, 
  Filter, 
  FileText, 
  Download, 
  MoreHorizontal, 
  Edit, 
  Trash2
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
  CardDescription,
  CardHeader,
  CardTitle,
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
import ProjectForm from "@/components/forms/project-form";

export default function ProjectsPage() {
  const [location, navigate] = useLocation();
  const [isDetailsRoute, detailsParams] = useRoute("/projects/:id");
  const [isEditRoute, editParams] = useRoute("/projects/:id/edit");
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  
  // Extract project ID from the URL for edit or details view
  const getProjectIdFromUrl = () => {
    if (detailsParams && detailsParams.id) {
      return parseInt(detailsParams.id);
    }
    if (editParams && editParams.id) {
      return parseInt(editParams.id);
    }
    return null;
  };
  
  const projectIdFromUrl = getProjectIdFromUrl();
  
  // Effect to open edit dialog when navigating to the edit route
  useEffect(() => {
    if (isEditRoute && projectIdFromUrl) {
      setSelectedProjectId(projectIdFromUrl);
      setIsEditDialogOpen(true);
    } else {
      // Close the dialog if we're not on the edit route anymore
      setIsEditDialogOpen(false);
    }
  }, [isEditRoute, projectIdFromUrl]);
  
  // Effect to open details dialog when navigating to the details route
  useEffect(() => {
    if (isDetailsRoute && !isEditRoute && projectIdFromUrl) {
      setSelectedProjectId(projectIdFromUrl);
      setIsDetailsDialogOpen(true);
    } else {
      // Close the dialog if we're not on the details route anymore
      setIsDetailsDialogOpen(false);
    }
  }, [isDetailsRoute, isEditRoute, projectIdFromUrl]);
  
  // Handle dialog close events
  const handleEditDialogClose = () => {
    setIsEditDialogOpen(false);
    navigate("/projects"); // Navigate back to the main projects page
  };
  
  const handleDetailsDialogClose = () => {
    setIsDetailsDialogOpen(false);
    navigate("/projects"); // Navigate back to the main projects page
  };

  // Fetch projects
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ["/api/projects", statusFilter],
    queryFn: async ({ queryKey }) => {
      const [_, status] = queryKey;
      const url = status ? `/api/projects?status=${status}` : "/api/projects";
      const res = await fetch(url);
      
      if (!res.ok) {
        throw new Error("Failed to fetch projects");
      }
      
      return res.json();
    }
  });

  // Fetch customers for the project details
  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["/api/customers"],
  });

  // Delete project mutation
  const deleteProject = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/projects/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Project deleted",
        description: "Project has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
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

  // Handle project creation success
  const handleProjectCreated = () => {
    setIsCreateDialogOpen(false);
    toast({
      title: "Project created",
      description: "Project has been created successfully."
    });
  };

  // Filter projects by search query
  const filteredProjects = projects.filter((project: any) => {
    return project.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Get customer name by ID
  const getCustomerName = (customerId: number) => {
    const customer = customers.find((c: any) => c.id === customerId);
    return customer ? customer.name : "Unknown";
  };

  // Render status badge
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
      case "in-progress":
        return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">In Progress</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">Completed</Badge>;
      case "delayed":
        return <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">Delayed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="h-full">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Projects</h2>
        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
          <div className="relative">
            <Input 
              type="text" 
              placeholder="Search projects..." 
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
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="delayed">Delayed</SelectItem>
            </SelectContent>
          </Select>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center">
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
                <DialogDescription>
                  Fill in the details to create a new project.
                </DialogDescription>
              </DialogHeader>
              <ProjectForm onSuccess={handleProjectCreated} />
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
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Client</TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Status</TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Start Date</TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Deadline</TableHead>
                    <TableHead className="font-medium text-xs uppercase tracking-wider">Budget</TableHead>
                    <TableHead className="text-right font-medium text-xs uppercase tracking-wider">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        No projects found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredProjects.map((project: any) => (
                      <TableRow key={project.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="font-medium text-sm text-gray-900">{project.name}</div>
                          <div className="text-xs text-gray-500">Project #{project.id}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-gray-900">
                            {project.customerId ? getCustomerName(project.customerId) : "—"}
                          </div>
                        </TableCell>
                        <TableCell>
                          {renderStatusBadge(project.status)}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {project.startDate ? formatDate(project.startDate, "MMM dd, yyyy") : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {project.deadline ? formatDate(project.deadline, "MMM dd, yyyy") : "—"}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {project.budget ? `$${project.budget.toLocaleString()}` : "—"}
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
                                <Link href={`/projects/${project.id}`}>
                                  <div className="w-full flex items-center">
                                    <FileText className="h-4 w-4 mr-2" /> View Details
                                  </div>
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuItem asChild>
                                <Link href={`/projects/${project.id}/edit`}>
                                  <div className="w-full flex items-center">
                                    <Edit className="h-4 w-4 mr-2" /> Edit
                                  </div>
                                </Link>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedProjectId(project.id);
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
              Are you sure you want to delete this project? This action cannot be undone.
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
              onClick={() => selectedProjectId && deleteProject.mutate(selectedProjectId)}
              disabled={deleteProject.isPending}
            >
              {deleteProject.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Project Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={handleEditDialogClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Make changes to the project details below.
            </DialogDescription>
          </DialogHeader>
          {selectedProjectId && (
            <ProjectForm
              projectId={selectedProjectId}
              onSuccess={() => {
                handleEditDialogClose();
                toast({
                  title: "Project updated",
                  description: "Project has been updated successfully."
                });
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Project Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={handleDetailsDialogClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Project Details</DialogTitle>
          </DialogHeader>
          {selectedProjectId && (
            <>
              <ProjectDetails projectId={selectedProjectId} />
              <div className="flex justify-end space-x-2 mt-4">
                <Button 
                  onClick={() => {
                    handleDetailsDialogClose();
                    navigate(`/projects/${selectedProjectId}/edit`);
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
