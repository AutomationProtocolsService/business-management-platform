import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FolderClosed, FileText, Receipt, Clipboard, Wrench } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

// Tenant interface for the public tenant list
interface Tenant {
  id: number;
  name: string;
  subdomain: string;
  companyName: string;
}

// Add tenantId to login schema
const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  tenantId: z.number({
    required_error: "Please select a tenant",
    invalid_type_error: "Tenant must be a number",
  }),
});

// Updated register schema for organization creation
const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  email: z.string().email("Please enter a valid email address"),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  organizationName: z.string().min(2, "Organization name must be at least 2 characters"),
  role: z.string().default("admin"),
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState("login");
  const [_, navigate] = useLocation();
  const { user, loginMutation, registerMutation } = useAuth();
  
  // Fetch available tenants for selection
  const { data: tenantsData, isLoading: tenantsLoading, error: tenantsError } = useQuery({
    queryKey: ['/api/public/tenants'],
    queryFn: async () => {
      const response = await fetch('/api/public/tenants');
      if (!response.ok) {
        throw new Error('Failed to fetch tenants');
      }
      const data = await response.json();
      return data as Tenant[]; // The API returns the array directly, not wrapped in a 'tenants' property
    }
  });

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  // Login form
  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      password: "",
      email: "",
      fullName: "",
      organizationName: "",
      role: "admin",
    },
  });

  // Handle login form submission
  function onLoginSubmit(values: LoginValues) {
    try {
      loginMutation.mutate(values, {
        onError: (error) => {
          console.error("Login error in form handler:", error);
          loginForm.setError("root", {
            type: "manual",
            message: error.message || "Login failed. Please check your credentials and try again."
          });
        }
      });
    } catch (error) {
      console.error("Exception in login handler:", error);
      loginForm.setError("root", {
        type: "manual",
        message: error instanceof Error ? error.message : "An unexpected error occurred"
      });
    }
  }

  // Handle register form submission
  function onRegisterSubmit(values: RegisterValues) {
    try {
      registerMutation.mutate(values, {
        onError: (error) => {
          console.error("Registration error in form handler:", error);
          registerForm.setError("root", {
            type: "manual",
            message: error.message || "Registration failed. Please try again with different credentials."
          });
        }
      });
    } catch (error) {
      console.error("Exception in registration handler:", error);
      registerForm.setError("root", {
        type: "manual",
        message: error instanceof Error ? error.message : "An unexpected error occurred"
      });
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Business Management System</CardTitle>
          <CardDescription className="text-center">
            {activeTab === "login" ? "Sign in to your account" : "Create a new account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Enter your password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Tenant Selection */}
                  <FormField
                    control={loginForm.control}
                    name="tenantId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization</FormLabel>
                        <Select
                          onValueChange={(value) => field.onChange(parseInt(value))}
                          defaultValue={field.value?.toString()}
                          disabled={tenantsLoading}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your organization" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {tenantsLoading ? (
                              <div className="p-2 text-center">Loading organizations...</div>
                            ) : tenantsError ? (
                              <div className="p-2 text-center text-destructive">Failed to load organizations</div>
                            ) : tenantsData && tenantsData.length > 0 ? (
                              tenantsData.map((tenant) => (
                                <SelectItem key={tenant.id} value={tenant.id.toString()}>
                                  {tenant.companyName || tenant.name}
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-2 text-center">No organizations available</div>
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Show root form errors */}
                  {loginForm.formState.errors.root && (
                    <div className="p-3 text-sm text-white bg-destructive rounded">
                      {loginForm.formState.errors.root.message}
                    </div>
                  )}
                  
                  {/* Show API errors */}
                  {loginMutation.isError && (
                    <div className="p-3 text-sm text-white bg-destructive rounded">
                      {loginMutation.error instanceof Error 
                        ? loginMutation.error.message 
                        : "An unexpected error occurred"}
                    </div>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? "Signing in..." : "Sign In"}
                  </Button>
                  
                  <div className="text-sm text-center mt-2">
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => navigate("/reset-password")}
                    >
                      Forgot password?
                    </button>
                  </div>
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="register">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                  <FormField
                    control={registerForm.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your full name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Enter your email" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="Choose a username" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="Choose a password" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Organization Name Input for Registration */}
                  <FormField
                    control={registerForm.control}
                    name="organizationName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Organization Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your organization name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Show root form errors */}
                  {registerForm.formState.errors.root && (
                    <div className="p-3 text-sm text-white bg-destructive rounded">
                      {registerForm.formState.errors.root.message}
                    </div>
                  )}
                  
                  {/* Show API errors */}
                  {registerMutation.isError && (
                    <div className="p-3 text-sm text-white bg-destructive rounded">
                      {registerMutation.error instanceof Error 
                        ? registerMutation.error.message 
                        : "An unexpected error occurred"}
                    </div>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex flex-col space-y-2">
          <div className="text-sm text-gray-600 text-center">
            {activeTab === "login" 
              ? "Don't have an account? " 
              : "Already have an account? "}
            <button 
              className="text-primary hover:underline" 
              onClick={() => setActiveTab(activeTab === "login" ? "register" : "login")}
            >
              {activeTab === "login" ? "Register" : "Login"}
            </button>
          </div>
        </CardFooter>
      </Card>

      <div className="hidden md:block w-full max-w-md p-8">
        <h2 className="text-2xl font-bold mb-4">Manage Your Business in One Place</h2>
        <p className="text-gray-600 mb-6">
          A complete solution for project management, quotes, invoices, 
          surveys, installations, employees, and timesheets.
        </p>
        <div className="space-y-4">
          <div className="flex items-center">
            <div className="bg-primary-100 rounded-full h-10 w-10 flex items-center justify-center text-primary-600 mr-3">
              <FolderClosed className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-medium">Project Management</h3>
              <p className="text-sm text-gray-600">Track projects from start to finish</p>
            </div>
          </div>
          <div className="flex items-center">
            <div className="bg-blue-100 rounded-full h-10 w-10 flex items-center justify-center text-blue-600 mr-3">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-medium">Quotes & Invoices</h3>
              <p className="text-sm text-gray-600">Create and manage professional documents</p>
            </div>
          </div>
          <div className="flex items-center">
            <div className="bg-green-100 rounded-full h-10 w-10 flex items-center justify-center text-green-600 mr-3">
              <Clipboard className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-medium">Surveys & Installations</h3>
              <p className="text-sm text-gray-600">Schedule and track field work</p>
            </div>
          </div>
          <div className="flex items-center">
            <div className="bg-yellow-100 rounded-full h-10 w-10 flex items-center justify-center text-yellow-600 mr-3">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-medium">Employee Management</h3>
              <p className="text-sm text-gray-600">Manage staff and timesheets</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
