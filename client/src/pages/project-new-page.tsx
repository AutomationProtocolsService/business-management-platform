import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import ProjectForm from "@/components/forms/project-form";

export default function ProjectNewPage() {
  const [_, navigate] = useLocation();

  const handleProjectCreated = (data: any) => {
    // Redirect to projects list page after successful creation
    navigate("/projects");
  };

  return (
    <div className="h-full">
      <div className="mb-6 flex items-center">
        <Button 
          variant="ghost" 
          size="sm" 
          className="mr-2"
          onClick={() => navigate("/projects")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h2 className="text-2xl font-bold text-gray-800">Create New Project</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Project Details</CardTitle>
          <CardDescription>
            Fill in the project details below to create a new project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectForm onSuccess={handleProjectCreated} />
        </CardContent>
      </Card>
    </div>
  );
}