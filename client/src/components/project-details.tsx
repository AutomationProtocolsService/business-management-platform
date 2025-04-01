import { useQuery } from "@tanstack/react-query";
import { Project, Customer } from "@shared/schema";
import { formatDate } from "@/lib/date-utils";
import { CalendarClock, AlignJustify, User, Calendar, DollarSign, Clock, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface ProjectDetailsProps {
  projectId: number;
}

export default function ProjectDetails({ projectId }: ProjectDetailsProps) {
  // Fetch project data
  const { data: project, isLoading: isLoadingProject } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
  });

  // Fetch customers data
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  // Get customer name by ID
  const getCustomerName = (customerId: number | null | undefined) => {
    if (!customerId) return "No Customer Assigned";
    const customer = customers.find((c) => c.id === customerId);
    return customer ? customer.name : `Customer #${customerId}`;
  };

  // Helper to render the status badge
  const renderStatusBadge = (status: string | undefined) => {
    if (!status) return null;
    
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

  if (isLoadingProject) {
    return (
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-[250px]" />
            <Skeleton className="h-4 w-[200px]" />
          </div>
        </div>
        <Skeleton className="h-4 w-[300px]" />
        <Skeleton className="h-4 w-[250px]" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!project) {
    return <div>No project found with ID {projectId}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-1">
        <div className="text-xl font-semibold mb-1">
          {project.name}
        </div>
        
        <div className="flex items-center text-sm text-gray-600">
          <Badge className="mr-2">{renderStatusBadge(project.status)}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-start space-x-2">
          <User className="h-5 w-5 text-gray-500 mt-0.5" />
          <div>
            <div className="font-medium text-sm">Customer</div>
            <div>{getCustomerName(project.customerId)}</div>
          </div>
        </div>

        <div className="flex items-start space-x-2">
          <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
          <div>
            <div className="font-medium text-sm">Start Date</div>
            <div>
              {project.startDate ? (
                formatDate(project.startDate, "MMMM dd, yyyy")
              ) : (
                <span className="text-gray-500">Not specified</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-start space-x-2">
          <Clock className="h-5 w-5 text-gray-500 mt-0.5" />
          <div>
            <div className="font-medium text-sm">Deadline</div>
            <div>
              {project.deadline ? (
                formatDate(project.deadline, "MMMM dd, yyyy")
              ) : (
                <span className="text-gray-500">No deadline</span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-start space-x-2">
          <DollarSign className="h-5 w-5 text-gray-500 mt-0.5" />
          <div>
            <div className="font-medium text-sm">Budget</div>
            <div>
              {project.budget ? (
                `$${project.budget.toLocaleString()}`
              ) : (
                <span className="text-gray-500">Not specified</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {project.description && (
        <div>
          <div className="flex items-center mb-2">
            <AlignJustify className="h-5 w-5 text-gray-500 mr-2" />
            <div className="font-medium">Description</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-md text-gray-700 whitespace-pre-line">
            {project.description}
          </div>
        </div>
      )}
    </div>
  );
}