import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, CheckCircle, XCircle, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface InvitationDetails {
  id: number;
  email: string;
  role: string;
  invitedBy: number;
  expiresAt: string;
  status: string;
  tenantName?: string;
}

export default function AcceptInvitationPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [token, setToken] = useState<string>("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [invitation, setInvitation] = useState<InvitationDetails | null>(null);
  const [verificationError, setVerificationError] = useState<string>("");
  const [isVerifying, setIsVerifying] = useState(false);

  // Extract token from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    if (tokenParam) {
      setToken(tokenParam);
    } else {
      setVerificationError("No invitation token found in URL");
    }
  }, []);

  // Verify token when token is available
  useEffect(() => {
    if (token) {
      verifyToken();
    }
  }, [token]);

  const verifyToken = async () => {
    if (!token) return;
    
    setIsVerifying(true);
    setVerificationError("");
    
    try {
      const response = await fetch(`/api/invitations/${token}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to verify invitation');
      }

      const data = await response.json();
      setInvitation(data);
    } catch (error) {
      setVerificationError(error instanceof Error ? error.message : 'Failed to verify invitation token');
    } finally {
      setIsVerifying(false);
    }
  };

  // Accept invitation mutation
  const acceptInvitationMutation = useMutation({
    mutationFn: async ({ token, password }: { token: string; password: string }) => {
      return await apiRequest("POST", `/api/invitations/${token}/accept`, { password });
    },
    onSuccess: () => {
      toast({
        title: "Account activated successfully!",
        description: "You can now log in with your new account.",
      });
      // Redirect to login page after successful activation
      setLocation("/auth");
    },
    onError: (error: Error) => {
      toast({
        title: "Error activating account",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!password) {
      toast({
        title: "Password required",
        description: "Please enter a password",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure both passwords are identical",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Password too short",
        description: "Password must be at least 6 characters long",
        variant: "destructive",
      });
      return;
    }

    acceptInvitationMutation.mutate({ token, password });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <Lock className="mx-auto h-12 w-12 text-primary-600" />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Accept Invitation
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Set up your account to get started
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">Account Setup</CardTitle>
          </CardHeader>
          <CardContent>
            {isVerifying && (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Verifying invitation...</p>
              </div>
            )}

            {verificationError && (
              <Alert variant="destructive" className="mb-6">
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  {verificationError}
                </AlertDescription>
              </Alert>
            )}

            {invitation && !verificationError && (
              <>
                <Alert className="mb-6 border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Welcome! You've been invited to join as a <strong>{invitation.role}</strong>.
                    <br />
                    Email: <strong>{invitation.email}</strong>
                  </AlertDescription>
                </Alert>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <Label htmlFor="password">Password</Label>
                    <div className="mt-1 relative">
                      <Input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="pr-10"
                        required
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="mt-1 relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirm your password"
                        className="pr-10"
                        required
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4 text-gray-400" />
                        ) : (
                          <Eye className="h-4 w-4 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={acceptInvitationMutation.isPending}
                    >
                      {acceptInvitationMutation.isPending ? "Activating..." : "Activate Account"}
                    </Button>
                  </div>
                </form>
              </>
            )}

            {!isVerifying && !invitation && !verificationError && (
              <div className="text-center py-4">
                <p className="text-sm text-gray-600">Loading invitation details...</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Already have an account?{" "}
            <button
              onClick={() => setLocation("/auth")}
              className="font-medium text-primary-600 hover:text-primary-500"
            >
              Sign in here
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}