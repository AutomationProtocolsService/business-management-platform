import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, FileText, ClipboardCheck, Wrench, FileSpreadsheet, CreditCard, FolderSearch, RefreshCw, Ruler } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { Project, Quote, Invoice, Survey, Installation } from "@shared/schema";

type WorkflowStep = {
  id: string;
  title: string;
  description: string;
  status: "pending" | "active" | "completed";
  icon: React.ReactNode;
};

const BusinessWorkflow = () => {
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
  
  // Fetch all projects
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });
  
  // Fetch all quotes
  const { data: quotes = [] } = useQuery<Quote[]>({
    queryKey: ["/api/quotes"],
  });
  
  // Fetch all invoices
  const { data: invoices = [] } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });
  
  // Fetch all surveys
  const { data: surveys = [] } = useQuery<Survey[]>({
    queryKey: ["/api/surveys"],
  });
  
  // Fetch all installations
  const { data: installations = [] } = useQuery<Installation[]>({
    queryKey: ["/api/installations"],
  });
  
  // Select the first project by default if none is selected
  useEffect(() => {
    if (projects && projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);
  
  // Filter data based on selected project
  const selectedProject = projects.find(p => p.id === selectedProjectId);
  const projectQuotes = quotes.filter(q => q.projectId === selectedProjectId);
  const projectInvoices = invoices.filter(i => i.projectId === selectedProjectId);
  const projectSurveys = surveys.filter(s => s.projectId === selectedProjectId);
  const projectInstallations = installations.filter(i => i.projectId === selectedProjectId);
  
  // Helper function to determine workflow step status
  const getStepStatus = (stepId: string): 'completed' | 'active' | 'pending' => {
    if (!selectedProject) return 'pending';
    
    switch (stepId) {
      case 'quote':
        return projectQuotes.length > 0 ? 'completed' : 'pending';
      case 'acceptance':
        return projectQuotes.some(q => q.status === 'accepted') ? 'completed' : 
               projectQuotes.length > 0 ? 'active' : 'pending';
      case 'survey':
        return projectSurveys.some(s => s.status === 'completed') ? 'completed' :
               projectSurveys.length > 0 ? 'active' :
               projectQuotes.some(q => q.status === 'accepted') ? 'active' : 'pending';
      case 'deposit':
        return projectInvoices.some(i => i.type === 'deposit' && i.status === 'paid') ? 'completed' :
               projectInvoices.some(i => i.type === 'deposit') ? 'active' :
               projectSurveys.some(s => s.status === 'completed') ? 'active' : 'pending';
      case 'payment1':
        return projectInvoices.some(i => i.type === 'deposit' && i.status === 'paid') ? 'completed' :
               projectInvoices.some(i => i.type === 'deposit' && (i.status === 'sent' || i.status === 'draft')) ? 'active' : 'pending';
      case 'installation':
        return projectInstallations.some(i => i.status === 'completed') ? 'completed' :
               projectInstallations.length > 0 ? 'active' :
               projectInvoices.some(i => i.type === 'deposit' && i.status === 'paid') ? 'active' : 'pending';
      case 'invoice':
        return projectInvoices.some(i => i.type === 'final' && (i.status === 'sent' || i.status === 'paid')) ? 'completed' :
               selectedProject.snaggingRequired ? 'pending' :
               projectInstallations.some(i => i.status === 'completed') ? 'active' : 'pending';
      case 'payment2':
        return projectInvoices.some(i => i.type === 'final' && i.status === 'paid') ? 'completed' :
               projectInvoices.some(i => i.type === 'final' && i.status === 'sent') ? 'active' : 'pending';
      case 'completion':
        return selectedProject.status === 'completed' ? 'completed' :
               projectInvoices.some(i => i.type === 'final' && i.status === 'paid') ? 'active' : 'pending';
      default:
        return 'pending';
    }
  };
  
  const workflowSteps: WorkflowStep[] = [
    {
      id: "quote",
      title: "Quote Submission",
      description: "Send detailed quote to client",
      status: getStepStatus("quote"),
      icon: <FileText className="w-6 h-6" />,
    },
    {
      id: "acceptance",
      title: "Quote Acceptance",
      description: "Client accepts the quote",
      status: getStepStatus("acceptance"),
      icon: <CheckCircle className="w-6 h-6" />,
    },
    {
      id: "survey",
      title: "Survey Scheduling",
      description: "Schedule and complete survey",
      status: getStepStatus("survey"),
      icon: <Ruler className="w-6 h-6" />,
    },
    {
      id: "deposit",
      title: "Deposit Invoice",
      description: "Send fabrication drawings and deposit invoice",
      status: getStepStatus("deposit"),
      icon: <FileSpreadsheet className="w-6 h-6" />,
    },
    {
      id: "payment1",
      title: "Deposit Payment",
      description: "Client pays deposit invoice",
      status: getStepStatus("payment1"),
      icon: <CreditCard className="w-6 h-6" />,
    },
    {
      id: "installation",
      title: "Installation",
      description: "Schedule and complete installation",
      status: getStepStatus("installation"),
      icon: <Wrench className="w-6 h-6" />,
    },
    {
      id: "invoice",
      title: "Final Invoice",
      description: "Generate final invoice",
      status: getStepStatus("invoice"),
      icon: <FileSpreadsheet className="w-6 h-6" />,
    },
    {
      id: "payment2",
      title: "Final Payment",
      description: "Client pays final invoice",
      status: getStepStatus("payment2"),
      icon: <CreditCard className="w-6 h-6" />,
    },
    {
      id: "completion",
      title: "Project Completion",
      description: "Project marked as completed",
      status: getStepStatus("completion"),
      icon: <CheckCircle className="w-6 h-6" />,
    },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Business Workflow</CardTitle>
            <CardDescription>Project lifecycle from quote to completion</CardDescription>
          </div>
          <Select
            value={selectedProjectId?.toString() || ""}
            onValueChange={(value) => setSelectedProjectId(parseInt(value))}
          >
            <SelectTrigger className="w-60">
              <SelectValue placeholder="Select a project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id.toString()}>
                  {project.name}
                </SelectItem>
              ))}
              {projects.length === 0 && (
                <SelectItem value="no-projects" disabled>
                  No projects available
                </SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {!selectedProject ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <RefreshCw className="h-8 w-8 mb-2 animate-spin" />
            <p>Loading workflow status...</p>
          </div>
        ) : (
          <div className="flex flex-col space-y-4">
            {workflowSteps.map((step, index) => (
              <div key={step.id} className="flex items-start">
                <div className="flex flex-col items-center mr-4">
                  <div
                    className={`rounded-full p-2 ${
                      step.status === "completed"
                        ? "bg-green-100 text-green-600"
                        : step.status === "active"
                        ? "bg-blue-100 text-blue-600"
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {step.icon}
                  </div>
                  {index < workflowSteps.length - 1 && (
                    <div className={`w-0.5 h-12 mt-2 ${
                      step.status === "completed" ? "bg-green-200" : "bg-gray-200"
                    }`}></div>
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium">{step.title}</h4>
                  <p className="text-sm text-gray-500">{step.description}</p>
                  {step.id === "survey" && (
                    <div className="mt-1 text-xs text-blue-500">Survey information helps provide accurate fabrication drawings</div>
                  )}
                  {step.id === "installation" && (
                    <div className="mt-1 text-xs text-blue-500">If snagging work required, final invoice is delayed</div>
                  )}
                  {step.id === "invoice" && selectedProject.snaggingRequired && (
                    <div className="mt-1 text-xs text-amber-500">Snagging work required before final invoice</div>
                  )}
                </div>
                
                {/* Status indicators */}
                <div className="ml-2 flex items-center">
                  {step.status === "completed" && (
                    <span className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">Completed</span>
                  )}
                  {step.status === "active" && (
                    <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">In Progress</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BusinessWorkflow;