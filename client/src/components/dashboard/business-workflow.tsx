import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Circle, ArrowRight, FileText, ClipboardCheck, Calendar, Wrench, FileSpreadsheet, CreditCard } from "lucide-react";

type WorkflowStep = {
  id: string;
  title: string;
  description: string;
  status: "pending" | "active" | "completed";
  icon: React.ReactNode;
};

const BusinessWorkflow = () => {
  const workflowSteps: WorkflowStep[] = [
    {
      id: "quote",
      title: "Quote Submission",
      description: "Send detailed quote to client",
      status: "pending",
      icon: <FileText className="w-6 h-6" />,
    },
    {
      id: "acceptance",
      title: "Quote Acceptance",
      description: "Client accepts the quote",
      status: "pending",
      icon: <CheckCircle className="w-6 h-6" />,
    },
    {
      id: "survey",
      title: "Survey Scheduling",
      description: "Schedule and complete survey",
      status: "pending",
      icon: <ClipboardCheck className="w-6 h-6" />,
    },
    {
      id: "deposit",
      title: "Deposit Invoice",
      description: "Send fabrication drawings and deposit invoice",
      status: "pending",
      icon: <FileSpreadsheet className="w-6 h-6" />,
    },
    {
      id: "payment1",
      title: "Deposit Payment",
      description: "Client pays deposit invoice",
      status: "pending",
      icon: <CreditCard className="w-6 h-6" />,
    },
    {
      id: "installation",
      title: "Installation",
      description: "Schedule and complete installation",
      status: "pending",
      icon: <Wrench className="w-6 h-6" />,
    },
    {
      id: "invoice",
      title: "Final Invoice",
      description: "Generate final invoice",
      status: "pending",
      icon: <FileSpreadsheet className="w-6 h-6" />,
    },
    {
      id: "payment2",
      title: "Final Payment",
      description: "Client pays final invoice",
      status: "pending",
      icon: <CreditCard className="w-6 h-6" />,
    },
    {
      id: "completion",
      title: "Project Completion",
      description: "Project marked as completed",
      status: "pending",
      icon: <CheckCircle className="w-6 h-6" />,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Workflow</CardTitle>
        <CardDescription>Project lifecycle from quote to completion</CardDescription>
      </CardHeader>
      <CardContent>
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
                  <div className="w-0.5 h-12 bg-gray-200 mt-2"></div>
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
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default BusinessWorkflow;