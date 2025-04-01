import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Loader2, Calendar, Users, Tag, FileText, PlusCircle, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/date-utils";
import { useSettings } from "@/hooks/use-settings";

interface InstallationDetailsProps {
  installationId: number;
  onEdit: () => void;
  onComplete?: () => void;
}

export default function InstallationDetails({ 
  installationId, 
  onEdit,
  onComplete
}: InstallationDetailsProps) {
  const { formatMoney } = useSettings();
  const [loading, setLoading] = useState(false);

  interface Installation {
    id: number;
    projectId: number;
    scheduledDate: string;
    startTime?: string | null;
    endTime?: string | null;
    status: string;
    notes?: string | null;
    assignedTo?: number[] | null;
  }

  // Fetch installation details
  const {
    data: installation,
    isLoading: isInstallationLoading,
    isError: isInstallationError,
  } = useQuery<Installation>({
    queryKey: [`/api/installations/${installationId}`],
    enabled: !!installationId,
  });

  interface Project {
    id: number;
    name: string;
    description?: string;
    status?: string;
    customerId?: number;
  }

  // Fetch project details
  const {
    data: project,
    isLoading: isProjectLoading,
  } = useQuery<Project>({
    queryKey: ["/api/projects", installation?.projectId],
    enabled: !!installation?.projectId,
  });

  // Fetch team members (users)
  const {
    data: users = [],
    isLoading: isUsersLoading,
  } = useQuery<any[]>({
    queryKey: ["/api/users"],
    enabled: !!installation?.assignedTo,
  });

  // Loading state
  const isLoading = isInstallationLoading || isProjectLoading || isUsersLoading || loading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isInstallationError || !installation) {
    return (
      <div className="py-4 text-center">
        <p className="text-red-500">Error loading installation details</p>
      </div>
    );
  }

  interface User {
    id: number;
    fullName: string;
    email?: string;
  }
  
  // Get assigned team members
  const getAssignedTeamMembers = () => {
    const assignedUserIds = installation.assignedTo || [];
    if (!assignedUserIds.length) return "No team assigned";
    
    const teamMembers = assignedUserIds.map((userId: number) => {
      const user = users.find((u: User) => u.id === userId);
      return user ? user.fullName : `User #${userId}`;
    });
    
    return teamMembers.join(", ");
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
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-xl font-semibold">
            Installation for {project?.name || `Project #${installation.projectId}`}
          </h3>
          <div className="flex items-center mt-2 space-x-2">
            <Calendar className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600">
              {formatDate(installation.scheduledDate, "MMMM d, yyyy")}
            </span>
            {renderStatusBadge(installation.status)}
          </div>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={onEdit}>
            <Pencil className="h-4 w-4 mr-2" /> Edit
          </Button>
          {installation.status === "scheduled" && onComplete && (
            <Button className="bg-green-600 hover:bg-green-700" onClick={onComplete}>
              <Check className="h-4 w-4 mr-2" /> Mark as Completed
            </Button>
          )}
        </div>
      </div>

      <Separator />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Installation Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm font-medium text-gray-500">Status</div>
              <div>{renderStatusBadge(installation.status)}</div>
            </div>

            <div>
              <div className="text-sm font-medium text-gray-500">Schedule</div>
              <div className="flex items-center space-x-1">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span>{formatDate(installation.scheduledDate, "MMMM d, yyyy")}</span>
              </div>
            </div>

            {installation.startTime && installation.endTime && (
              <div>
                <div className="text-sm font-medium text-gray-500">Time</div>
                <div>
                  {formatDate(installation.startTime, "h:mm a")} - {formatDate(installation.endTime, "h:mm a")}
                </div>
              </div>
            )}

            <div>
              <div className="text-sm font-medium text-gray-500">Team</div>
              <div className="flex items-start space-x-1">
                <Users className="h-4 w-4 text-gray-400 mt-0.5" />
                <span>{getAssignedTeamMembers()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Notes & Instructions</CardTitle>
          </CardHeader>
          <CardContent>
            {installation.notes ? (
              <div className="prose prose-sm max-w-none">
                {installation.notes}
              </div>
            ) : (
              <div className="text-gray-500 italic">No notes provided</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}