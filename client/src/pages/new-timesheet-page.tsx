import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import TimesheetForm from "@/components/forms/timesheet-form";
import { useToast } from "@/hooks/use-toast";

export default function NewTimesheetPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [employeeId, setEmployeeId] = useState<number | undefined>(undefined);
  
  // Parse URL query parameters on component mount
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const employeeIdParam = searchParams.get("employeeId");
    
    if (employeeIdParam) {
      setEmployeeId(Number(employeeIdParam));
    }
  }, []);
  
  // Get employee details if an employeeId is specified
  const { data: employee } = useQuery({
    queryKey: ["/api/employees", employeeId],
    queryFn: async () => {
      if (!employeeId) return null;
      const res = await fetch(`/api/employees/${employeeId}`);
      if (!res.ok) {
        throw new Error("Failed to fetch employee");
      }
      return res.json();
    },
    enabled: !!employeeId,
  });
  
  // Handle form submission success
  const handleSuccess = () => {
    toast({
      title: "Timesheet created",
      description: "The timesheet has been created successfully.",
    });
    setLocation("/timesheets");
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Create Timesheet</h1>
          <div className="flex items-center text-sm text-muted-foreground mt-2">
            <Link href="/" className="transition-colors hover:text-foreground">Dashboard</Link>
            <span className="mx-1">/</span>
            <Link href="/timesheets" className="transition-colors hover:text-foreground">Timesheets</Link>
            <span className="mx-1">/</span>
            <span className="font-normal text-foreground">New Timesheet</span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.history.back()}
          className="flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>
            {employeeId && employee ? 
              `New Timesheet for ${employee.fullName || employee.position || `Employee #${employeeId}`}` : 
              "New Timesheet"
            }
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TimesheetForm employeeId={employeeId} onSuccess={handleSuccess} />
        </CardContent>
      </Card>
    </div>
  );
}