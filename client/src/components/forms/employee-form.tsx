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
  FormDescription,
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

// Create a simplified form schema based on the database structure
const employeeFormSchema = z.object({
  userId: z.number().optional().nullable(),
  fullName: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  position: z.string().optional(),
  department: z.string().optional(),
  hireDate: z.string().optional(),
  terminationDate: z.string().optional(),
  hourlyRate: z.number().optional().nullable(),
  salary: z.number().optional().nullable(),
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
      fullName: "",
      email: "",
      phone: "",
      position: "",
      department: "",
      hireDate: getInputDateString(new Date()),
      hourlyRate: undefined,
      salary: undefined,
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
    console.log("Form submitted with values:", values);
    console.log("Form errors:", form.formState.errors);
    
    if (employeeId) {
      console.log("Updating employee with ID:", employeeId);
      updateEmployee.mutate(values);
    } else {
      console.log("Creating new employee");
      createEmployee.mutate(values);
    }
  }

  // Handle loading state
  const isSubmitting = createEmployee.isPending || updateEmployee.isPending;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Employee Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter employee full name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input placeholder="Enter employee email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number</FormLabel>
              <FormControl>
                <Input placeholder="Enter employee phone number" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="userId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>User Account (Optional)</FormLabel>
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
              <FormDescription>
                Only needed if employee needs system access
              </FormDescription>
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
                  <Input 
                    type="number" 
                    step="0.01" 
                    placeholder="Enter hourly rate" 
                    value={field.value?.toString() || ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
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
                  <Input 
                    type="number" 
                    step="0.01" 
                    placeholder="Enter annual salary" 
                    value={field.value?.toString() || ''}
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                    onBlur={field.onBlur}
                    name={field.name}
                    ref={field.ref}
                  />
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

        <Button 
          type="submit" 
          disabled={isSubmitting}
          onClick={(e) => {
            console.log("Button clicked!", e);
            console.log("Form valid:", form.formState.isValid);
            console.log("Form errors:", form.formState.errors);
          }}
        >
          {isSubmitting ? "Saving..." : employeeId ? "Update Employee" : "Create Employee"}
        </Button>
      </form>
    </Form>
  );
}
