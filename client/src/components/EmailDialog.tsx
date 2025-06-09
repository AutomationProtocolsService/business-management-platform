import React, { useState } from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Mail } from "lucide-react";

interface EmailDialogProps {
  poId: number;
  poNumber: string;
  trigger?: React.ReactNode;
}

export function EmailDialog({ poId, poNumber, trigger }: EmailDialogProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState("");
  const [subject, setSubject] = useState(`Purchase Order ${poNumber}`);
  const [body, setBody] = useState(`Hello,\n\nPlease find attached Purchase Order ${poNumber}.\n\nBest regards`);
  const [isLoading, setIsLoading] = useState(false);

  const sendEmail = async () => {
    if (!to.trim()) {
      toast({ 
        title: "Email required", 
        description: "Please enter a recipient email address.",
        variant: "destructive" 
      });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/purchase-orders/${poId}/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: to.trim(), subject, body }),
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to send email");
      }
      
      toast({ 
        title: "Email sent successfully!", 
        description: `Purchase Order ${poNumber} sent to ${to}` 
      });
      setOpen(false);
      // Reset form
      setTo("");
      setSubject(`Purchase Order ${poNumber}`);
      setBody(`Hello,\n\nPlease find attached Purchase Order ${poNumber}.\n\nBest regards`);
    } catch (err: any) {
      toast({ 
        title: "Failed to send email", 
        description: err.message, 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  const defaultTrigger = (
    <Button variant="ghost" size="icon" title="Email Purchase Order">
      <Mail className="h-4 w-4" />
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Email Purchase Order</DialogTitle>
          <DialogDescription>
            Compose and send Purchase Order {poNumber} via email.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="email-to">To</Label>
            <Input
              id="email-to"
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="recipient@example.com"
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email-subject">Subject</Label>
            <Input
              id="email-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email-body">Message</Label>
            <Textarea
              id="email-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={6}
              className="w-full resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={sendEmail} disabled={!to.trim() || !subject.trim() || isLoading}>
            {isLoading ? "Sending..." : "Send Email"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}