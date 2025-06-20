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
import { Checkbox } from "@/components/ui/checkbox";
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
  // User account creation fields
  createUserAccount: z.boolean().default(false),
  username: z.string().optional(),
  userRole: z.enum(["admin", "manager", "employee"]).optional(),
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
      createUserAccount: false,
      username: "",
      userRole: "employee",
    },
  });

  // Create employee mutation
  const createEmployee = useMutation({
    mutationFn: async (values: EmployeeFormValues) => {
      // Create employee first
      const employeeRes = await apiRequest("POST", "/api/employees", values);
      const employee = await employeeRes.json();
      
      // If user account creation is requested, create user account
      if (values.createUserAccount && values.username && values.userRole) {
        const userData = {
          employeeId: employee.id,
          username: values.username,
          email: values.email || "",
          fullName: values.fullName || "",
          role: values.userRole,
        };
        
        await apiRequest("POST", "/api/users", userData);
      }
      
      return employee;
    },
    onSuccess: (data) => {
      toast({
        title: "Employee created",
        description: "Employee has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/employees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
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

        {/* User Account Creation Section */}
        <div className="border rounded-lg p-4 bg-slate-50">
          <FormField
            control={form.control}
            name="createUserAccount"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>
                    User Account (Optional)
                  </FormLabel>
                  <FormDescription>
                    Only needed if employee needs system access
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />

          {form.watch("createUserAccount") && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter username" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="userRole"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="employee">Employee</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>

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

          {/* Only show termination date when editing existing employee */}
          {employeeId && (
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
          )}
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
