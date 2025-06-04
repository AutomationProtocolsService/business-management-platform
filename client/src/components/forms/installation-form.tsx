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
import { Checkbox } from "@/components/ui/checkbox";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertInstallationSchema, Installation, Project, User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { getInputDateString, getInputDateTimeString } from "@/lib/date-utils";

// Extend the insert schema with client-side validation
const installationFormSchema = insertInstallationSchema.extend({
  projectId: z.number(),
  scheduledDate: z.string(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  status: z.string(),
  notes: z.string().optional(),
  assignedTo: z.array(z.number()).optional(),
  teamId: z.number().optional(), // For compatibility with forms that send teamId
});

export type InstallationFormValues = z.infer<typeof installationFormSchema>;

interface InstallationFormProps {
  defaultValues?: Partial<InstallationFormValues>;
  installationId?: number; // Only for editing existing installation
  onSuccess?: (data: Installation) => void;
}

export default function InstallationForm({ defaultValues, installationId, onSuccess, children }: InstallationFormProps & { children?: React.ReactNode }) {
  const { toast } = useToast();

  // Fetch projects for the dropdown
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  // Fetch users for team assignment
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Initialize form
  const form = useForm<InstallationFormValues>({
    resolver: zodResolver(installationFormSchema),
    defaultValues: {
      scheduledDate: getInputDateString(new Date()),
      startTime: "09:00",
      endTime: "17:00",
      status: "scheduled",
      notes: "",
      projectId: 0, // Default value that will be overridden if defaultValues has a value
      assignedTo: [],
      ...defaultValues
    },
  });

  // Helper to safely convert to ISO string
  const toSafeISOString = (value: unknown): string | null => {
    if (!value) return null;
    
    try {
      // If it's already a Date object, use it directly
      if (value instanceof Date) {
        console.log('Converting Date object to ISO:', value);
        return value.toISOString();
      }
      
      // If it's a string, try to parse it first
      if (typeof value === 'string') {
        console.log('Converting string to Date then ISO:', value);
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          console.error('Invalid date string:', value);
          return null;
        }
        return date.toISOString();
      }
      
      console.error('Unexpected value type for date conversion:', typeof value, value);
      return null;
    } catch (e) {
      console.error("Error converting to ISO string:", e);
      return null;
    }
  };

  // Create installation mutation with enhanced error handling
  const createInstallation = useMutation({
    mutationFn: async (values: InstallationFormValues) => {
      try {
        console.log('📝 Raw form values:', values);
        console.log('🔍 startTime type:', typeof values.startTime, 'value:', values.startTime);
        
        // Format data for API submission using safe conversion
        const formattedValues = {
          projectId: values.projectId,
          scheduledDate: values.scheduledDate, // Keep as string for date field
          startTime: toSafeISOString(values.startTime),
          status: values.status,
          notes: values.notes || null,
          // Handle teamId conversion to assignedTo array
          assignedTo: values.teamId ? [values.teamId] : (values.assignedTo || [])
        };

        console.log("📤 Submitting installation with formatted values:", formattedValues);
        
        const res = await apiRequest("POST", "/api/installations", formattedValues);
        
        // Check if response is OK before parsing JSON
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ message: "Unknown error occurred" }));
          console.error("Server error response:", errorData);
          
          // Handle validation errors specifically
          if (res.status === 400 && errorData.errors) {
            const fieldErrors = errorData.errors.map((err: any) => 
              `${err.path.join('.')}: ${err.message}`
            ).join(', ');
            throw new Error(`Validation error: ${fieldErrors}`);
          }
          
          throw new Error(errorData.message || `Error ${res.status}: ${res.statusText}`);
        }
        
        return await res.json();
      } catch (error) {
        console.error("Error creating installation:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Installation scheduled",
        description: "Installation has been scheduled successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/installations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
      if (onSuccess) onSuccess(data);
    },
    onError: (error: Error) => {
      toast({
        title: "Error scheduling installation",
        description: error.message,
        variant: "destructive",
      });
      
      // Log the error for debugging
      console.error("Installation creation error:", error);
    },
  });

  // Update installation mutation with enhanced error handling
  const updateInstallation = useMutation({
    mutationFn: async (values: InstallationFormValues) => {
      try {
        console.log('📝 Raw update form values:', values);
        console.log('🔍 Update startTime type:', typeof values.startTime, 'value:', values.startTime);
        console.log('🔍 Update endTime type:', typeof values.endTime, 'value:', values.endTime);
        
        // Format data for API submission using safe conversion
        const formattedValues = {
          projectId: values.projectId,
          scheduledDate: values.scheduledDate, // Keep as string for date field
          startTime: toSafeISOString(values.startTime),
          endTime: toSafeISOString(values.endTime),
          status: values.status,
          notes: values.notes || null,
          // Handle teamId conversion to assignedTo array
          assignedTo: values.teamId ? [values.teamId] : (values.assignedTo || [])
        };

        console.log("📤 Updating installation with formatted values:", formattedValues);
        
        const res = await apiRequest("PUT", `/api/installations/${installationId}`, formattedValues);
        
        // Check if response is OK before parsing JSON
        if (!res.ok) {
          const errorData = await res.json().catch(() => ({ message: "Unknown error occurred" }));
          console.error("Server error response:", errorData);
          
          // Handle validation errors specifically
          if (res.status === 400 && errorData.errors) {
            const fieldErrors = errorData.errors.map((err: any) => 
              `${err.path.join('.')}: ${err.message}`
            ).join(', ');
            throw new Error(`Validation error: ${fieldErrors}`);
          }
          
          throw new Error(errorData.message || `Error ${res.status}: ${res.statusText}`);
        }
        
        return await res.json();
      } catch (error) {
        console.error("Error updating installation:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      toast({
        title: "Installation updated",
        description: "Installation has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/installations"] });
      queryClient.invalidateQueries({ queryKey: [`/api/installations/${installationId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
      if (onSuccess) onSuccess(data);
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating installation",
        description: error.message,
        variant: "destructive",
      });
      
      // Log the error for debugging
      console.error("Installation update error:", error);
    },
  });

  // Form submission handler with improved error handling
  function onSubmit(values: InstallationFormValues) {
    console.log("Submitting installation form with values:", values);
    
    try {
      // Enhanced logging to debug the submission
      console.log("Installation form - About to submit installation:", values);
      console.log("Installation form - Is existing installation?", !!installationId);
      
      // No need for additional processing here - the mutations handle date formatting
      if (installationId) {
        console.log("Installation form - Updating existing installation ID:", installationId);
        updateInstallation.mutate(values);
      } else {
        console.log("Installation form - Creating new installation");
        createInstallation.mutate(values);
      }
    } catch (error) {
      console.error("Error processing installation form data:", error);
      toast({
        title: "Form Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred processing the form data",
        variant: "destructive",
      });
    }
  }

  // Handle loading state
  const isSubmitting = createInstallation.isPending || updateInstallation.isPending;

  // Filter active users for team assignment
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
          render={() => (
            <FormItem>
              <FormLabel>Installation Team</FormLabel>
              <div className="max-h-[200px] overflow-y-auto border rounded-md p-3">
                {activeUsers.length === 0 ? (
                  <p className="text-sm text-gray-500">No team members available</p>
                ) : (
                  activeUsers.map(user => (
                    <div key={user.id} className="flex items-center space-x-2 mb-2">
                      <FormField
                        control={form.control}
                        name="assignedTo"
                        render={({ field }) => {
                          return (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={Array.isArray(field.value) && field.value.includes(user.id)}
                                  onCheckedChange={(checked) => {
                                    const currentValue = Array.isArray(field.value) ? field.value : [];
                                    return checked
                                      ? field.onChange([...currentValue, user.id])
                                      : field.onChange(
                                          currentValue.filter(
                                            (value) => value !== user.id
                                          )
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal cursor-pointer">
                                {user.fullName}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    </div>
                  ))
                )}
              </div>
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
                <Textarea rows={4} placeholder="Enter installation notes, equipment required, etc." {...field} value={field.value as string || ""} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {children || (
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : installationId ? "Update Installation" : "Schedule Installation"}
          </Button>
        )}
      </form>
    </Form>
  );
}
