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
import { getInputDateString } from "@/lib/date-utils";

// Extend the insert schema with client-side validation
const surveyFormSchema = insertSurveySchema.extend({
  projectId: z.coerce.number({
    required_error: "Project is required",
    invalid_type_error: "Project must be a number"
  }),
  scheduledDate: z.string({
    required_error: "Scheduled date is required"
  }),
  status: z.string(),
  notes: z.string().optional().default(""),
  assignedTo: z.union([
    z.number(),
    z.null(),
    z.undefined()
  ]).optional()
});

type SurveyFormValues = z.infer<typeof surveyFormSchema>;

interface SurveyFormProps {
  defaultValues?: Partial<SurveyFormValues>;
  surveyId?: number;
  onSuccess?: () => void;
}

export default function SurveyForm({ defaultValues, surveyId, onSuccess, children }: SurveyFormProps & { children?: React.ReactNode }) {
  const { toast } = useToast();

  // Fetch survey data if editing
  const { data: surveyData, isLoading: isLoadingSurvey } = useQuery<Survey>({
    queryKey: [`/api/surveys/${surveyId}`],
    enabled: !!surveyId,
  });

  // Fetch projects and users for dropdowns
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Initialize form
  const form = useForm<SurveyFormValues>({
    resolver: zodResolver(surveyFormSchema),
    defaultValues: {
      scheduledDate: getInputDateString(new Date()),
      status: "scheduled",
      notes: "",
      projectId: 0,
      assignedTo: undefined,
      ...defaultValues
    },
  });
  
  // Update form values when survey data is loaded
  useEffect(() => {
    if (surveyData && surveyId) {
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

  // Create survey mutation
  const createSurvey = useMutation({
    mutationFn: async (values: SurveyFormValues) => {
      console.log('📝 Raw survey form values:', values);
      
      const formattedValues = {
        ...values,
        scheduledDate: values.scheduledDate
      };

      console.log("📤 Submitting survey with formatted values:", formattedValues);
      
      const res = await apiRequest("POST", "/api/surveys", formattedValues);
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Server Error: ${errorText}`);
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surveys"] });
      toast({
        title: "Survey Created",
        description: "Survey has been scheduled successfully.",
      });
      onSuccess?.();
    },
    onError: (error) => {
      console.error("Survey creation error:", error);
      toast({
        title: "Error Creating Survey",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  // Update survey mutation
  const updateSurvey = useMutation({
    mutationFn: async (values: SurveyFormValues) => {
      console.log('📝 Raw survey update form values:', values);
      
      const formattedValues = {
        ...values,
        scheduledDate: values.scheduledDate
      };

      console.log("📤 Updating survey with formatted values:", formattedValues);
      
      const res = await apiRequest("PUT", `/api/surveys/${surveyId}`, formattedValues);
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Server Error: ${errorText}`);
      }
      
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surveys"] });
      queryClient.invalidateQueries({ queryKey: [`/api/surveys/${surveyId}`] });
      toast({
        title: "Survey Updated",
        description: "Survey has been updated successfully.",
      });
      onSuccess?.();
    },
    onError: (error) => {
      console.error("Survey update error:", error);
      toast({
        title: "Error Updating Survey",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  async function onSubmit(values: SurveyFormValues) {
    console.log("🎯 Survey onSubmit called with values:", values);
    console.log("🔍 Form validation state:", form.formState.errors);
    
    try {
      // Validate form data
      const isValid = await form.trigger();
      console.log("✅ Form validation result:", isValid);
      
      if (!isValid) {
        console.error("❌ Form validation failed:", form.formState.errors);
        return;
      }

      if (surveyId) {
        console.log("📝 Survey form - Updating existing survey ID:", surveyId);
        updateSurvey.mutate(values);
      } else {
        console.log("🆕 Survey form - Creating new survey");
        console.log("📊 Mutation about to be called with:", values);
        createSurvey.mutate(values);
      }
    } catch (error) {
      console.error("💥 Error processing survey form data:", error);
      toast({
        title: "Form Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred processing the form data",
        variant: "destructive",
      });
    }
  }

  const isSubmitting = createSurvey.isPending || updateSurvey.isPending;
  const activeUsers = users.filter(user => user.active);

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
                value={field.value?.toString()}
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
                onValueChange={(value) => field.onChange(value === "unassigned" ? null : Number(value))}
                value={field.value?.toString() || "unassigned"}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select team member" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {activeUsers.map((user) => (
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
              <Select onValueChange={field.onChange} value={field.value as string || "scheduled"}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
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

        {form.formState.isSubmitSuccessful === false && Object.keys(form.formState.errors).length > 0 && (
          <pre className="text-red-500 text-xs mb-4">{JSON.stringify(form.formState.errors, null, 2)}</pre>
        )}

        {children || (
          <Button type="submit" disabled={isSubmitting} data-testid="schedule-survey-submit">
            {isSubmitting ? "Saving..." : surveyId ? "Update Survey" : "Schedule Survey"}
          </Button>
        )}
      </form>
    </Form>
  );
}