import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
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
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "../lib/queryClient";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";

// Tenant interface for the public tenant list
interface Tenant {
  id: number;
  name: string;
  subdomain: string;
  companyName: string;
}

// Step 1: Request Reset Form Schema
const requestResetSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  username: z.string().min(1, "Username is required"),
  tenantId: z.number({
    required_error: "Please select a tenant",
    invalid_type_error: "Tenant must be a number",
  }),
});

// Step 2: Reset Password Form Schema
const resetPasswordSchema = z.object({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
  token: z.string().min(1, "Reset token is required"),
})
.refine(data => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type RequestResetValues = z.infer<typeof requestResetSchema>;
type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export default function ResetPasswordPage() {
  const [step, setStep] = useState<'request' | 'reset' | 'success'>('request');
  const [token, setToken] = useState<string>("");
  const [_, navigate] = useLocation();
  const { toast } = useToast();

  // Get token from URL query if available
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get("token");
    if (tokenParam) {
      setToken(tokenParam);
      setStep('reset');
    }
  }, []);
  
  // Fetch available tenants for selection
  const { data: tenantsData, isLoading: tenantsLoading, error: tenantsError } = useQuery({
    queryKey: ['/api/public/tenants'],
    queryFn: async () => {
      const response = await fetch('/api/public/tenants');
      if (!response.ok) {
        throw new Error('Failed to fetch tenants');
      }
      const data = await response.json();
      return data.tenants as Tenant[];
    }
  });

  // Request Password Reset Form
  const requestResetForm = useForm<RequestResetValues>({
    resolver: zodResolver(requestResetSchema),
    defaultValues: {
      email: "",
      username: "",
    },
  });

  // Reset Password Form
  const resetPasswordForm = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
      token: token,
    },
  });

  // Update token in form when it changes
  useEffect(() => {
    resetPasswordForm.setValue('token', token);
  }, [token, resetPasswordForm]);

  // Request Password Reset Mutation
  const requestResetMutation = useMutation({
    mutationFn: async (data: RequestResetValues) => {
      const res = await apiRequest("POST", "/api/auth/request-password-reset", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password reset email sent",
        description: "Please check your email for a link to reset your password.",
      });
      setStep('success');
    },
    onError: (error) => {
      console.error("Request reset error:", error);
      toast({
        title: "Failed to request password reset",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    },
  });

  // Reset Password Mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: ResetPasswordValues) => {
      const res = await apiRequest("POST", "/api/auth/reset-password", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Password reset successful",
        description: "You can now login with your new password.",
      });
      // Redirect to login page after a short delay
      setTimeout(() => {
        navigate("/");
      }, 2000);
    },
    onError: (error) => {
      console.error("Reset password error:", error);
      toast({
        title: "Failed to reset password",
        description: error instanceof Error ? error.message : "An unexpected error occurred. Your token may be invalid or expired.",
        variant: "destructive",
      });
    },
  });

  // Handle Request Reset Form Submission
  function onRequestResetSubmit(values: RequestResetValues) {
    requestResetMutation.mutate(values);
  }

  // Handle Reset Password Form Submission
  function onResetPasswordSubmit(values: ResetPasswordValues) {
    resetPasswordMutation.mutate(values);
  }

  // Render appropriate form based on step
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            {step === 'request' && "Reset Your Password"}
            {step === 'reset' && "Create New Password"}
            {step === 'success' && "Check Your Email"}
          </CardTitle>
          <CardDescription className="text-center">
            {step === 'request' && "Enter your email to receive a password reset link"}
            {step === 'reset' && "Enter a new password for your account"}
            {step === 'success' && "We've sent you instructions to reset your password"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'request' && (
            <Form {...requestResetForm}>
              <form onSubmit={requestResetForm.handleSubmit(onRequestResetSubmit)} className="space-y-4">
                <FormField
                  control={requestResetForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your email" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={requestResetForm.control}
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
                
                {/* Tenant Selection */}
                <FormField
                  control={requestResetForm.control}
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

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={requestResetMutation.isPending}
                >
                  {requestResetMutation.isPending ? "Sending..." : "Send Reset Link"}
                </Button>
              </form>
            </Form>
          )}

          {step === 'reset' && (
            <Form {...resetPasswordForm}>
              <form onSubmit={resetPasswordForm.handleSubmit(onResetPasswordSubmit)} className="space-y-4">
                <FormField
                  control={resetPasswordForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Enter new password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={resetPasswordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Confirm new password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={resetPasswordForm.control}
                  name="token"
                  render={({ field }) => (
                    <input type="hidden" {...field} />
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={resetPasswordMutation.isPending}
                >
                  {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
                </Button>
              </form>
            </Form>
          )}

          {step === 'success' && (
            <div className="text-center space-y-4">
              <p className="text-gray-600">
                If an account exists with that email and username, we've sent instructions to reset your password.
              </p>
              <p className="text-gray-600">
                Please check your email and follow the link to set a new password.
              </p>
              <div className="p-2 text-sm text-gray-500">
                <p>Didn't receive the email? Check your spam folder or try again.</p>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button 
            variant="link" 
            onClick={() => navigate("/")}
          >
            Back to Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

