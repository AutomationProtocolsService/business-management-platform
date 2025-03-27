import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertTimesheetSchema, Timesheet, Employee, Project } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { getInputDateString, getInputDateTimeString } from "@/lib/date-utils";
import { useEffect } from "react";

// Extend the insert schema with client-side validation
const timesheetFormSchema = insertTimesheetSchema.extend({
  employeeId: z.number(),
  projectId: z.number().optional(),
  date: z.string(),
  startTime: z.string(),
  endTime: z.string(),
  breakDuration: z.string().optional().transform(val => val ? parseInt(val) : undefined),
  notes: z.string().optional(),
  status: z.string().default("pending"),
});

export type TimesheetFormValues = z.infer<typeof timesheetFormSchema>;

interface TimesheetFormProps {
  defaultValues?: Partial<TimesheetFormValues>;
  timesheetId?: number; // Only for editing existing timesheet
  employeeId?: number; // Pre-select employee (for employee-specific views)
  onSuccess?: (data: Timesheet) => void;
}

export default function TimesheetForm({ 
  defaultValues, 
  timesheetId, 
  employeeId: preselectedEmployeeId,
  onSuccess 
}: TimesheetFormProps) {
  const { toast } = useToast();

  // Fetch employees and projects for dropdowns
  const { data: employees = [] } = useQuery<Employee[]>({
    queryKey: ["/api/employees"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Initialize form
  const form = useForm<TimesheetFormValues>({
    resolver: zodResolver(timesheetFormSchema),
    defaultValues: defaultValues || {
      employeeId: preselectedEmployeeId || 0,
      date: getInputDateString(new Date()),
      startTime: getInputDateTimeString(new Date()),
      endTime: getInputDateTimeString(new Date(Date.now() + 8 * 60 * 60 * 1000)), // 8 hours later
      breakDuration: "30",
      notes: "",
      status: "pending",
    },
  });

  // Set employee ID if provided via props
  useEffect(() => {
    if (preselectedEmployeeId && !form.getValues().employeeId) {
      form.setValue("employeeId", preselectedEmployeeId);
    }
  }, [preselectedEmployeeId, form]);

  // Create timesheet mutation
  const createTimesheet = useMutation({
    mutationFn: async (values: TimesheetFormValues) => {
      const res = await apiRequest("POST", "/api/timesheets", values);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Timesheet created",
        description: "Timesheet has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
      if (onSuccess) onSuccess(data);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update timesheet mutation
  const updateTimesheet = useMutation({
    mutationFn: async (values: TimesheetFormValues) => {
      const res = await apiRequest("PUT", `/api/timesheets/${timesheetId}`, values);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Timesheet updated",
        description: "Timesheet has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/timesheets"] });
      queryClient.invalidateQueries({ queryKey: [`/api/timesheets/${timesheetId}`] });
      if (onSuccess) onSuccess(data);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  function onSubmit(values: TimesheetFormValues) {
    if (timesheetId) {
      updateTimesheet.mutate(values);
    } else {
      createTimesheet.mutate(values);
    }
  }

  // Handle loading state
  const isSubmitting = createTimesheet.isPending || updateTimesheet.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="employeeId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Employee *</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(Number(value))}
                value={field.value?.toString()}
                disabled={!!preselectedEmployeeId}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an employee" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id.toString()}>
                      {employee.position ? `${employee.position}` : `Employee #${employee.id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="projectId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(Number(value))}
                value={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project (optional)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {projects
                    .filter(project => project.status !== 'completed' && project.status !== 'cancelled')
                    .map((project) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date *</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time *</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="endTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Time *</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="breakDuration"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Break Duration (minutes)</FormLabel>
              <FormControl>
                <Input type="number" min="0" step="1" placeholder="Enter break duration" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea rows={3} placeholder="Enter notes" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {!preselectedEmployeeId && (
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : timesheetId ? "Update Timesheet" : "Create Timesheet"}
        </Button>
      </form>
    </Form>
  );
}
