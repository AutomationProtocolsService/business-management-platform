import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useEffect } from "react";
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
  status: z.string(),
  notes: z.string().optional().default(""),
  assignedTo: z.union([
    z.number(),
    z.string(), 
    z.null(),
    z.undefined()
  ]).optional()
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

export default function SurveyForm({ defaultValues, surveyId, onSuccess, children }: SurveyFormProps & { children?: React.ReactNode }) {
  const { toast } = useToast();

  // Fetch survey data if editing
  const { data: surveyData, isLoading: isLoadingSurvey } = useQuery<Survey>({
    queryKey: [`/api/surveys/${surveyId}`],
    enabled: !!surveyId, // Only run this query if surveyId is provided
  });

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
      assignedTo: undefined,
      ...defaultValues
    },
  });
  
  // Update form values when survey data is loaded
  useEffect(() => {
    if (surveyData && surveyId) {
      // Reset form with the fetched survey data
      const surveyFormValues: SurveyFormValues = {
        projectId: surveyData.projectId,
        scheduledDate: getInputDateString(new Date(surveyData.scheduledDate)),
        status: surveyData.status,
        notes: surveyData.notes || "",
        assignedTo: surveyData.assignedTo
      };
      form.reset(surveyFormValues);
    }
  }, [surveyData, form, surveyId]);

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



  // Create survey mutation with enhanced debugging
  const createSurvey = useMutation({
    mutationFn: async (values: SurveyFormValues) => {
      try {
        // Enhanced debugging for client-side issues
        console.log("[CREATE_SURVEY] Starting mutation with values:", values);
        
        // Format data for API submission
        const formattedValues = {
          ...values,
          // Convert values to strings and then back to dates in ISO format
          scheduledDate: formatDateValue(values.scheduledDate)
        };
        
        console.log("[CREATE_SURVEY] Submitting survey with formatted values:", formattedValues);
        
        // Add more debugging to check what's actually being sent to the API
        console.log("[CREATE_SURVEY] API endpoint:", "/api/surveys");
        console.log("[CREATE_SURVEY] HTTP method:", "POST");
        
        // Ensure we use proper try/catch to detect any issues during the request
        try {
          const res = await apiRequest("POST", "/api/surveys", formattedValues);
          console.log("[CREATE_SURVEY] Response status:", res.status);
          
          if (!res.ok) {
            const errorText = await res.text();
            console.error("[CREATE_SURVEY] Error response text:", errorText);
            
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
          console.log("[CREATE_SURVEY] Success response data:", data);
          return data;
        } catch (requestError) {
          console.error("[CREATE_SURVEY] Request error:", requestError);
          throw requestError;
        }
      } catch (error) {
        console.error("[CREATE_SURVEY] Error during creation:", error);
        if (error instanceof Error) {
          throw error;
        } else {
          throw new Error("Failed to create survey. Please try again.");
        }
      }
    },
    onSuccess: (data) => {
      console.log("[CREATE_SURVEY] onSuccess handler called with data:", data);
      
      toast({
        title: "Survey created",
        description: "Survey has been scheduled successfully.",
      });
      
      // Invalidate queries to refresh data
      console.log("[CREATE_SURVEY] Invalidating relevant queries");
      queryClient.invalidateQueries({ queryKey: ["/api/surveys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      
      // Call the onSuccess callback provided by the parent component
      if (onSuccess) {
        console.log("[CREATE_SURVEY] Calling parent onSuccess callback");
        onSuccess(data);
      } else {
        console.log("[CREATE_SURVEY] No parent onSuccess callback provided");
      }
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
          scheduledDate: formatDateValue(values.scheduledDate)
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

  // Form submission handler with improved error handling
  function onSubmit(values: SurveyFormValues) {
    console.log("Submitting survey form with values:", values);
    
    try {
      // Enhanced logging to debug the submission
      console.log("Survey form - About to submit survey:", values);
      console.log("Survey form - Is existing survey?", !!surveyId);
      
      if (surveyId) {
        console.log("Survey form - Updating existing survey ID:", surveyId);
        updateSurvey.mutate(values);
      } else {
        console.log("Survey form - Creating new survey");
        createSurvey.mutate(values);
      }
    } catch (error) {
      console.error("Error processing survey form data:", error);
      toast({
        title: "Form Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred processing the form data",
        variant: "destructive",
      });
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

        {children || (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : surveyId ? "Update Survey" : "Schedule Survey"}
          </Button>
        )}
      </form>
    </Form>
  );
}
