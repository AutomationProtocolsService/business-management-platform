import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Loader2, Mail, Check } from "lucide-react";

export default function EmailTestPage() {
  const { toast } = useToast();
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<null | {
    success: boolean;
    message: string;
  }>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await apiRequest("POST", "/api/test/email", {
        to,
        subject,
        body
      });

      const data = await response.json();
      setResult(data);

      if (data.success) {
        toast({
          title: "Email sent",
          description: data.message,
          variant: "default",
        });
      } else {
        toast({
          title: "Failed to send email",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-8">Email Testing Tool</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Send Test Email</CardTitle>
            <CardDescription>
              Fill in the form to send a test email. This helps verify that your email configuration is working correctly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="to">Recipient Email</Label>
                <Input
                  id="to"
                  type="email"
                  placeholder="recipient@example.com"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="Test Email Subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="body">Message Body</Label>
                <Textarea
                  id="body"
                  placeholder="Enter your message here..."
                  rows={6}
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  required
                />
              </div>
              
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Test Email
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
            <CardDescription>
              View the results of your email test here.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className={`p-4 rounded-md ${result.success ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                <div className="flex items-center mb-2">
                  {result.success ? (
                    <Check className="h-5 w-5 mr-2" />
                  ) : (
                    <Mail className="h-5 w-5 mr-2" />
                  )}
                  <span className="font-medium">{result.success ? 'Success' : 'Error'}</span>
                </div>
                <p className="mb-2">{result.message}</p>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-20" />
                <p>No email has been sent yet.</p>
                <p className="text-sm mt-2">
                  Fill out the form and click "Send Test Email" to see results here.
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="text-sm text-gray-500">
            <p>
              Note: This will send a real email using SendGrid. Make sure your SendGrid API key is properly configured 
              and you're using a valid email address for testing.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}