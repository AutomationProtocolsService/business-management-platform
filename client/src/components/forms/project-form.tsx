import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
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
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { insertProjectSchema, Project, Customer } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { getInputDateString } from "@/lib/date-utils";
import { ClientCombobox } from "@/components/clients/ClientCombobox";
import { CreateClientModal } from "@/components/clients/CreateClientModal";
import { useClients } from "@/hooks/useClients";

// Extend the insert schema with client-side validation
const projectFormSchema = insertProjectSchema.extend({
  name: z.string().min(3, "Project name must be at least 3 characters."),
  description: z.string().optional(),
  customerId: z.number({
    required_error: "Client is required",
    invalid_type_error: "Client must be a number"
  }).nullable(),
  startDate: z.string().optional(),
  deadline: z.string().optional(),
  budget: z.string().optional().transform((val) => val ? parseFloat(val) : undefined),
});

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

interface ProjectFormProps {
  defaultValues?: Partial<ProjectFormValues>;
  projectId?: number; // Only for editing existing project
  onSuccess?: (data: Project) => void;
  onCancel?: () => void;
}

export default function ProjectForm({ defaultValues, projectId, onSuccess, onCancel }: ProjectFormProps) {
  const { toast } = useToast();
  const { clients, isLoading: isLoadingCustomers } = useClients();
  const [selectedClient, setSelectedClient] = useState<Customer | null>(null);
  const [createClientOpen, setCreateClientOpen] = useState(false);
  const [createClientTerm, setCreateClientTerm] = useState("");

  // Initialize form
  const form = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: defaultValues || {
      name: "",
      description: "",
      status: "pending",
    },
  });
  
  // Handle adding a new client
  const handleAddClient = (term: string) => {
    setCreateClientTerm(term);
    setCreateClientOpen(true);
  };
  
  // Handle successful client creation
  const handleClientCreated = (client: Customer) => {
    setSelectedClient(client);
    form.setValue("customerId", client.id);
  };
  
  // Update selected client when customerId changes in the form
  useEffect(() => {
    const customerId = form.getValues("customerId");
    if (customerId && clients.length > 0) {
      const client = clients.find((c: Customer) => c.id === customerId);
      if (client) {
        setSelectedClient(client);
      }
    }
  }, [clients, form]);

  // Create project mutation
  const createProject = useMutation({
    mutationFn: async (values: ProjectFormValues) => {
      const res = await apiRequest("POST", "/api/projects", values);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Project created",
        description: "Project has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
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

  // Update project mutation
  const updateProject = useMutation({
    mutationFn: async (values: ProjectFormValues) => {
      const res = await apiRequest("PUT", `/api/projects/${projectId}`, values);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Project updated",
        description: "Project has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      queryClient.invalidateQueries({ queryKey: [`/api/projects/${projectId}`] });
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
  function onSubmit(values: ProjectFormValues) {
    if (projectId) {
      updateProject.mutate(values);
    } else {
      createProject.mutate(values);
    }
  }

  // Handle loading state
  const isSubmitting = createProject.isPending || updateProject.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Name *</FormLabel>
              <FormControl>
                <Input placeholder="Enter project name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="customerId"
          render={({ field }) => (
            <FormItem>
              <div className="flex justify-between items-center">
                <FormLabel>Client</FormLabel>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm"
                  onClick={() => setCreateClientOpen(true)}
                >
                  <Plus className="h-3 w-3 mr-1" /> Create New
                </Button>
              </div>
              <FormControl>
                <Select
                  disabled={isLoadingCustomers}
                  onValueChange={(value) => {
                    const clientId = Number(value);
                    field.onChange(clientId);
                    
                    // Update selected client
                    const client = clients.find((c: Customer) => c.id === clientId);
                    setSelectedClient(client || null);
                  }}
                  value={field.value?.toString() || ""}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clients.map((client: Customer) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {/* Client creation modal */}
        <CreateClientModal
          open={createClientOpen}
          onOpenChange={setCreateClientOpen}
          initialName={createClientTerm}
          onSuccess={handleClientCreated}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="startDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="deadline"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Deadline</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="budget"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Budget ($)</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" placeholder="Enter budget amount" {...field} />
              </FormControl>
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
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="delayed">Delayed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  rows={4} 
                  placeholder="Enter project description" 
                  {...field} 
                  value={field.value || ""} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : projectId ? "Update Project" : "Create Project"}
        </Button>
      </form>
    </Form>
  );
}
