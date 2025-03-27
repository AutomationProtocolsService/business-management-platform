import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/date-utils";
import { Link } from "wouter";

export interface ProjectTableRow {
  id: number;
  name: string;
  reference: string;
  client: string;
  status: "pending" | "in-progress" | "completed" | "delayed" | "survey-scheduled";
  deadline?: string | Date;
  budget?: number;
}

interface ProjectTableProps {
  projects: ProjectTableRow[];
  title?: string;
  showViewAll?: boolean;
  viewAllHref?: string;
}

const getStatusBadge = (status: string) => {
  switch(status) {
    case "pending":
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>;
    case "in-progress":
      return <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-100">In Progress</Badge>;
    case "completed":
      return <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">Completed</Badge>;
    case "delayed":
      return <Badge variant="outline" className="bg-red-100 text-red-800 hover:bg-red-100">Delayed</Badge>;
    case "survey-scheduled":
      return <Badge variant="outline" className="bg-blue-100 text-blue-800 hover:bg-blue-100">Survey Scheduled</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
};

export default function ProjectTable({
  projects,
  title = "Recent Projects",
  showViewAll = true,
  viewAllHref = "/projects"
}: ProjectTableProps) {
  return (
    <Card className="border border-gray-200">
      <CardHeader className="border-b border-gray-200 p-4 flex justify-between items-center">
        <CardTitle className="text-base font-semibold text-gray-800">{title}</CardTitle>
        {showViewAll && (
          <Link href={viewAllHref}>
            <a className="text-sm text-primary-600 hover:text-primary-700 font-medium">View all projects</a>
          </Link>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="font-medium text-xs uppercase tracking-wider">Project</TableHead>
                <TableHead className="font-medium text-xs uppercase tracking-wider">Client</TableHead>
                <TableHead className="font-medium text-xs uppercase tracking-wider">Status</TableHead>
                <TableHead className="font-medium text-xs uppercase tracking-wider">Deadline</TableHead>
                <TableHead className="font-medium text-xs uppercase tracking-wider">Budget</TableHead>
                <TableHead className="text-right font-medium text-xs uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projects.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No projects found.
                  </TableCell>
                </TableRow>
              ) : (
                projects.map((project) => (
                  <TableRow key={project.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className="font-medium text-sm text-gray-900">{project.name}</div>
                      <div className="text-xs text-gray-500">{project.reference}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-900">{project.client}</div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(project.status)}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {project.deadline ? formatDate(project.deadline, "MMM dd, yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {project.budget ? `$${project.budget.toLocaleString()}` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/projects/${project.id}`}>
                        <a className="text-primary-600 hover:text-primary-900 text-sm font-medium mr-3">View</a>
                      </Link>
                      <Link href={`/projects/${project.id}/edit`}>
                        <a className="text-gray-600 hover:text-gray-900 text-sm font-medium">Edit</a>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
