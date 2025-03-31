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
import { insertSurveySchema, Survey, Project, User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { getInputDateString, getInputDateTimeString } from "@/lib/date-utils";

// Extend the insert schema with client-side validation
const surveyFormSchema = insertSurveySchema.extend({
  projectId: z.coerce.number({
    required_error: "Project is required",
    invalid_type_error: "Project must be a number"
  }),
  scheduledDate: z.string({
    required_error: "Scheduled date is required"
  }).refine(val => {
    try {
      // Check if the date is valid
      return !isNaN(new Date(val).getTime());
    } catch (e) {
      return false;
    }
  }, {
    message: "Invalid date format"
  }),
  startTime: z.string().optional().refine(val => {
    if (!val) return true; // Optional field
    try {
      return !isNaN(new Date(val).getTime());
    } catch (e) {
      return false;
    }
  }, {
    message: "Invalid start time format"
  }),
  endTime: z.string().optional().refine(val => {
    if (!val) return true; // Optional field
    try {
      return !isNaN(new Date(val).getTime());
    } catch (e) {
      return false;
    }
  }, {
    message: "Invalid end time format"
  }),
  status: z.string(),
  notes: z.string().optional().default(""),
  assignedTo: z.union([z.number(), z.string(), z.null(), z.undefined()]).optional()
    .transform(val => {
      if (val === "unassigned" || val === null || val === undefined) {
        return undefined;
      }
      return typeof val === "string" ? parseInt(val, 10) : val;
    }),
});

export type SurveyFormValues = z.infer<typeof surveyFormSchema>;

interface SurveyFormProps {
  defaultValues?: Partial<SurveyFormValues>;
  surveyId?: number; // Only for editing existing survey
  onSuccess?: (data: Survey) => void;
}

export default function SurveyForm({ defaultValues, surveyId, onSuccess }: SurveyFormProps) {
  const { toast } = useToast();

  // Fetch projects and users for dropdowns
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Initialize form with properly typed default values
  const form = useForm<SurveyFormValues>({
    resolver: zodResolver(surveyFormSchema),
    defaultValues: {
      scheduledDate: getInputDateString(new Date()),
      status: "scheduled",
      notes: "",
      projectId: 0, // Default value that will be overridden if defaultValues has a value
      startTime: "",
      endTime: "",
      assignedTo: undefined,
      ...(defaultValues || {})
    },
  });

  // Helper to format date values safely
  const formatDateValue = (dateValue: unknown): string | undefined => {
    if (!dateValue) return undefined;
    
    try {
      const date = typeof dateValue === 'string' ? new Date(dateValue) : dateValue instanceof Date ? dateValue : null;
      if (!date || isNaN(date.getTime())) return undefined;
      return date.toISOString().split('T')[0];
    } catch (e) {
      console.error("Error formatting date:", e);
      return undefined;
    }
  };

  // Helper to format datetime values safely
  const formatDateTimeValue = (dateTimeValue: unknown): string | undefined => {
    if (!dateTimeValue) return undefined;
    
    try {
      const date = typeof dateTimeValue === 'string' ? new Date(dateTimeValue) : dateTimeValue instanceof Date ? dateTimeValue : null;
      if (!date || isNaN(date.getTime())) return undefined;
      return date.toISOString();
    } catch (e) {
      console.error("Error formatting datetime:", e);
      return undefined;
    }
  };

  // Create survey mutation
  const createSurvey = useMutation({
    mutationFn: async (values: SurveyFormValues) => {
      try {
        // Format data for API submission
        const formattedValues = {
          ...values,
          // Convert values to strings and then back to dates in ISO format
          scheduledDate: formatDateValue(values.scheduledDate),
          startTime: formatDateTimeValue(values.startTime),
          endTime: formatDateTimeValue(values.endTime)
        };
        
        console.log("Submitting survey with formatted values:", formattedValues);
        
        const res = await apiRequest("POST", "/api/surveys", formattedValues);
        
        if (!res.ok) {
          const errorText = await res.text();
          try {
            // Try to parse as JSON
            const errorData = JSON.parse(errorText);
            throw new Error(
              JSON.stringify({
                message: errorData.message || "Failed to create survey",
                errors: errorData.errors || []
              })
            );
          } catch (e) {
            // If parsing fails, use the raw error text
            throw new Error(`Server Error: ${errorText}`);
          }
        }
        
        const data = await res.json();
        return data;
      } catch (error) {
        console.error("Survey creation error:", error);
        if (error instanceof Error) {
          throw error;
        } else {
          throw new Error("Failed to create survey. Please try again.");
        }
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Survey created",
        description: "Survey has been scheduled successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/surveys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
      if (onSuccess) onSuccess(data);
    },
    onError: (error: Error) => {
      console.error("Survey mutation error:", error);
      
      // Check if this is a validation error with details
      const errorMessage = error.message || "Failed to create survey";
      let detailedMessage = errorMessage;
      
      // Try to parse detailed validation errors
      try {
        if (errorMessage.startsWith("{")) {
          const errorData = JSON.parse(errorMessage);
          if (errorData.errors && errorData.errors.length > 0) {
            detailedMessage = errorData.errors.map((e: any) => e.message).join(", ");
          } else {
            detailedMessage = errorData.message;
          }
        }
      } catch (e) {
        // If parsing fails, just use the original message
      }
      
      toast({
        title: "Error",
        description: detailedMessage,
        variant: "destructive",
      });
    },
  });

  // Update survey mutation
  const updateSurvey = useMutation({
    mutationFn: async (values: SurveyFormValues) => {
      try {
        // Format data for API submission
        const formattedValues = {
          ...values,
          // Convert values to strings and then back to dates in ISO format
          scheduledDate: formatDateValue(values.scheduledDate),
          startTime: formatDateTimeValue(values.startTime),
          endTime: formatDateTimeValue(values.endTime)
        };
        
        console.log("Updating survey with formatted values:", formattedValues);
        
        const res = await apiRequest("PUT", `/api/surveys/${surveyId}`, formattedValues);
        
        if (!res.ok) {
          const errorText = await res.text();
          try {
            // Try to parse as JSON
            const errorData = JSON.parse(errorText);
            throw new Error(
              JSON.stringify({
                message: errorData.message || "Failed to update survey",
                errors: errorData.errors || []
              })
            );
          } catch (e) {
            // If parsing fails, use the raw error text
            throw new Error(`Server Error: ${errorText}`);
          }
        }
        
        const data = await res.json();
        return data;
      } catch (error) {
        console.error("Survey update error:", error);
        if (error instanceof Error) {
          throw error;
        } else {
          throw new Error("Failed to update survey. Please try again.");
        }
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Survey updated",
        description: "Survey has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/surveys"] });
      queryClient.invalidateQueries({ queryKey: [`/api/surveys/${surveyId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
      if (onSuccess) onSuccess(data);
    },
    onError: (error: Error) => {
      console.error("Survey update error:", error);
      
      // Check if this is a validation error with details
      const errorMessage = error.message || "Failed to update survey";
      let detailedMessage = errorMessage;
      
      // Try to parse detailed validation errors
      try {
        if (errorMessage.startsWith("{")) {
          const errorData = JSON.parse(errorMessage);
          if (errorData.errors && errorData.errors.length > 0) {
            detailedMessage = errorData.errors.map((e: any) => e.message).join(", ");
          } else {
            detailedMessage = errorData.message;
          }
        }
      } catch (e) {
        // If parsing fails, just use the original message
      }
      
      toast({
        title: "Error",
        description: detailedMessage,
        variant: "destructive",
      });
    },
  });

  // Form submission handler
  function onSubmit(values: SurveyFormValues) {
    if (surveyId) {
      updateSurvey.mutate(values);
    } else {
      createSurvey.mutate(values);
    }
  }

  // Handle loading state
  const isSubmitting = createSurvey.isPending || updateSurvey.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="projectId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project *</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(Number(value))}
                value={field.value?.toString() || ""}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
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
          name="scheduledDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Scheduled Date *</FormLabel>
              <FormControl>
                <Input type="date" {...field} value={field.value as string || ""} />
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
                <FormLabel>Start Time</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} value={field.value as string || ""} />
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
                <FormLabel>End Time</FormLabel>
                <FormControl>
                  <Input type="datetime-local" {...field} value={field.value as string || ""} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="assignedTo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Assigned To</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(value)}
                value={field.value?.toString() || "unassigned"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Assign to a team member" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {users
                    .filter(user => user.active)
                    .map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.fullName}
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
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value as string}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                  <SelectItem value="rescheduled">Rescheduled</SelectItem>
                </SelectContent>
              </Select>
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
                <Textarea rows={4} placeholder="Enter survey notes" {...field} value={field.value as string || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : surveyId ? "Update Survey" : "Schedule Survey"}
        </Button>
      </form>
    </Form>
  );
}
