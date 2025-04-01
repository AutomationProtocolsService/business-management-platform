import { useQuery } from "@tanstack/react-query";
import { Survey, Project, User } from "@shared/schema";
import { formatDate } from "@/lib/date-utils";
import { CalendarClock, AlignJustify, User as UserIcon, ClipboardList, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface SurveyDetailsProps {
  surveyId: number;
}

export default function SurveyDetails({ surveyId }: SurveyDetailsProps) {
  // Fetch survey data
  const { data: survey, isLoading: isLoadingSurvey } = useQuery<Survey>({
    queryKey: [`/api/surveys/${surveyId}`],
  });

  // Fetch project data
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Fetch user data
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Get project name by ID
  const getProjectName = (projectId: number | undefined) => {
    if (!projectId) return "Unknown Project";
    const project = projects.find((p) => p.id === projectId);
    return project ? project.name : `Project #${projectId}`;
  };

  // Get assigned user name
  const getAssignedUserName = (userId: number | undefined | null) => {
    if (!userId) return "Unassigned";
    const user = users.find((u) => u.id === userId);
    return user ? user.fullName : `User #${userId}`;
  };

  // Helper to render the status badge
  const renderStatusBadge = (status: string | undefined) => {
    if (!status) return null;
    
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

  if (isLoadingSurvey) {
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

  if (!survey) {
    return <div>No survey found with ID {surveyId}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-1">
        <div className="text-xl font-semibold mb-1">
          {getProjectName(survey.projectId)}
        </div>
        
        <div className="flex items-center text-sm text-gray-600">
          <Badge className="mr-2">{renderStatusBadge(survey.status)}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-start space-x-2">
          <Calendar className="h-5 w-5 text-gray-500 mt-0.5" />
          <div>
            <div className="font-medium text-sm">Scheduled Date</div>
            <div>{formatDate(survey.scheduledDate, "MMMM dd, yyyy")}</div>
          </div>
        </div>

        {/* Time field removed as per requirements */}

        <div className="flex items-start space-x-2">
          <UserIcon className="h-5 w-5 text-gray-500 mt-0.5" />
          <div>
            <div className="font-medium text-sm">Assigned To</div>
            <div>{getAssignedUserName(survey.assignedTo)}</div>
          </div>
        </div>

        <div className="flex items-start space-x-2">
          <ClipboardList className="h-5 w-5 text-gray-500 mt-0.5" />
          <div>
            <div className="font-medium text-sm">Created On</div>
            <div>{formatDate(survey.createdAt, "MMM dd, yyyy")}</div>
          </div>
        </div>
      </div>

      {survey.notes && (
        <div>
          <div className="flex items-center mb-2">
            <AlignJustify className="h-5 w-5 text-gray-500 mr-2" />
            <div className="font-medium">Notes</div>
          </div>
          <div className="bg-gray-50 p-3 rounded-md text-gray-700 whitespace-pre-line">
            {survey.notes}
          </div>
        </div>
      )}
    </div>
  );
}