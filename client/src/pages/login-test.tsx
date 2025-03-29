import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function LoginTest() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await apiRequest("POST", "/api/login", { username, password });
      
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        toast({
          title: "Login Successful",
          description: `Welcome back, ${userData.fullName || userData.username}!`,
        });
      } else {
        const error = await res.json();
        throw new Error(error.message || "Failed to login");
      }
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const handleLogout = async () => {
    setLoading(true);
    
    try {
      const res = await apiRequest("POST", "/api/logout");
      
      if (res.ok) {
        setUser(null);
        toast({
          title: "Logout Successful",
          description: "You have been logged out",
        });
      } else {
        throw new Error("Failed to logout");
      }
    } catch (error: any) {
      toast({
        title: "Logout Failed",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckAuth = async () => {
    try {
      const res = await apiRequest("GET", "/api/user");
      
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        toast({
          title: "User Authenticated",
          description: `Logged in as ${userData.fullName || userData.username}`,
        });
      } else {
        setUser(null);
        toast({
          title: "Not Authenticated",
          description: "You are not logged in",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      toast({
        title: "Auth Check Failed",
        description: error.message || "An unknown error occurred",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Login Test</CardTitle>
        </CardHeader>
        <CardContent>
          {user ? (
            <div className="space-y-4">
              <div className="p-4 bg-slate-100 rounded-md">
                <h3 className="font-medium mb-2">Logged in as:</h3>
                <pre className="whitespace-pre-wrap text-sm">
                  {JSON.stringify(user, null, 2)}
                </pre>
              </div>
              <div className="flex space-x-4">
                <Button onClick={handleLogout} disabled={loading}>
                  {loading ? "Logging out..." : "Logout"}
                </Button>
                <Button variant="outline" onClick={handleCheckAuth}>
                  Check Auth Status
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium mb-1">
                  Username
                </label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-1">
                  Password
                </label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex space-x-4">
                <Button type="submit" disabled={loading}>
                  {loading ? "Logging in..." : "Login"}
                </Button>
                <Button type="button" variant="outline" onClick={handleCheckAuth}>
                  Check Auth Status
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}