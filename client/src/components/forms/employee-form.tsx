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
import { insertEmployeeSchema, Employee, User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { getInputDateString } from "@/lib/date-utils";

// Extend the insert schema with client-side validation
const employeeFormSchema = insertEmployeeSchema.extend({
  userId: z.number().optional(),
  position: z.string().min(2, "Position must be at least 2 characters.").optional(),
  department: z.string().optional(),
  hireDate: z.string().optional(),
  terminationDate: z.string().optional(),
  hourlyRate: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
  salary: z.string().optional().transform(val => val ? parseFloat(val) : undefined),
  notes: z.string().optional(),
});

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

interface EmployeeFormProps {
  defaultValues?: Partial<EmployeeFormValues>;
  employeeId?: number; // Only for editing existing employee
  onSuccess?: (data: Employee) => void;
}

export default function EmployeeForm({ defaultValues, employeeId, onSuccess }: EmployeeFormProps) {
  const { toast } = useToast();

  // Fetch users for the dropdown
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users"],
  });

  // Initialize form
  const form = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: defaultValues || {
      position: "",
      department: "",
      hireDate: getInputDateString(new Date()),
      hourlyRate: "",
      salary: "",
      notes: "",
    },
  });

  // Create employee mutation
  const createEmployee = useMutation({
    mutationFn: async (values: EmployeeFormValues) => {
      const res = await apiRequest("POST", "/api/employees", values);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Employee created",
        description: "Employee has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
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

  // Update employee mutation
  const updateEmployee = useMutation({
    mutationFn: async (values: EmployeeFormValues) => {
      const res = await apiRequest("PUT", `/api/employees/${employeeId}`, values);
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Employee updated",
        description: "Employee has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: [`/api/employees/${employeeId}`] });
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
  function onSubmit(values: EmployeeFormValues) {
    if (employeeId) {
      updateEmployee.mutate(values);
    } else {
      createEmployee.mutate(values);
    }
  }

  // Handle loading state
  const isSubmitting = createEmployee.isPending || updateEmployee.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="userId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>User Account</FormLabel>
              <Select
                onValueChange={(value) => field.onChange(Number(value))}
                value={field.value?.toString()}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Link to user account (optional)" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="0">None</SelectItem>
                  {users
                    .filter(user => user.active)
                    .map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.fullName} ({user.username})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="position"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Position</FormLabel>
                <FormControl>
                  <Input placeholder="Enter position" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="department"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Department</FormLabel>
                <FormControl>
                  <Input placeholder="Enter department" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="hireDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hire Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="terminationDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Termination Date (if applicable)</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="hourlyRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Hourly Rate ($)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="Enter hourly rate" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="salary"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Annual Salary ($)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="Enter annual salary" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea rows={4} placeholder="Enter notes" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : employeeId ? "Update Employee" : "Create Employee"}
        </Button>
      </form>
    </Form>
  );
}
