import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Mail, 
  Clock, 
  RefreshCw, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Loader2,
  Calendar,
  Users
} from "lucide-react";

interface FollowupStats {
  totalQuotesSent: number;
  quotesAwaitingResponse: number;
  quotesWithOneFollowup: number;
  quotesWithTwoFollowups: number;
  quotesWithThreeFollowups: number;
  expiredQuotes: number;
  totalInvoicesSent: number;
  overdueInvoices: number;
  invoicesWithOneFollowup: number;
  invoicesWithTwoFollowups: number;
  invoicesWithThreeFollowups: number;
}

export default function FollowupAutomationPage() {
  const { toast } = useToast();
  const [isProcessingQuotes, setIsProcessingQuotes] = useState(false);
  const [isProcessingInvoices, setIsProcessingInvoices] = useState(false);

  // Fetch follow-up statistics
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useQuery<FollowupStats>({
    queryKey: ["/api/followup/stats"],
    queryFn: async () => {
      const res = await fetch("/api/followup/stats");
      if (!res.ok) {
        throw new Error("Failed to fetch follow-up statistics");
      }
      return res.json();
    },
  });

  // Process quote follow-up reminders mutation
  const processQuoteFollowups = useMutation({
    mutationFn: async () => {
      setIsProcessingQuotes(true);
      const response = await apiRequest("POST", "/api/followup/process");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Quote Follow-up Processing Complete",
        description: data.message,
      });
      refetchStats(); // Refresh stats after processing
      setIsProcessingQuotes(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessingQuotes(false);
    },
  });

  // Process invoice follow-up reminders mutation
  const processInvoiceFollowups = useMutation({
    mutationFn: async () => {
      setIsProcessingInvoices(true);
      const response = await apiRequest("POST", "/api/followup/process-invoices");
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Invoice Follow-up Processing Complete",
        description: data.message,
      });
      refetchStats(); // Refresh stats after processing
      setIsProcessingInvoices(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessingInvoices(false);
    },
  });

  const handleProcessQuoteFollowups = () => {
    processQuoteFollowups.mutate();
  };

  const handleProcessInvoiceFollowups = () => {
    processInvoiceFollowups.mutate();
  };

  if (statsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const responseRate = stats ? 
    Math.round(((stats.totalQuotesSent - stats.quotesAwaitingResponse) / Math.max(stats.totalQuotesSent, 1)) * 100) 
    : 0;

  return (
    <div className="space-y-6" data-testid="followup-automation-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight" data-testid="page-title">Follow-up Automation</h1>
          <p className="text-muted-foreground" data-testid="page-description">
            Automated follow-up reminders for quotes and overdue invoices
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleProcessQuoteFollowups} 
            disabled={isProcessingQuotes}
            data-testid="button-process-quote-followups"
            variant="outline"
          >
            {isProcessingQuotes ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing Quotes...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Process Quote Follow-ups
              </>
            )}
          </Button>
          <Button 
            onClick={handleProcessInvoiceFollowups} 
            disabled={isProcessingInvoices}
            data-testid="button-process-invoice-followups"
          >
            {isProcessingInvoices ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing Invoices...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Process Invoice Follow-ups
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Quote Statistics Overview */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold" data-testid="quotes-section-title">Quote Follow-ups</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card data-testid="card-quotes-sent">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Quotes Sent</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-quotes-sent">
                {stats?.totalQuotesSent || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Quotes in 'sent' status
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-awaiting-response">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Awaiting Response</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600" data-testid="stat-awaiting-response">
                {stats?.quotesAwaitingResponse || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Active quotes without response
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-response-rate">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Response Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600" data-testid="stat-response-rate">
                {responseRate}%
              </div>
              <p className="text-xs text-muted-foreground">
                Quotes with client response
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-expired-quotes">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expired Quotes</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600" data-testid="stat-expired-quotes">
                {stats?.expiredQuotes || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Quotes past expiry date
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Invoice Statistics Overview */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold" data-testid="invoices-section-title">Invoice Payment Reminders</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card data-testid="card-invoices-sent">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invoices Sent</CardTitle>
              <Mail className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="stat-invoices-sent">
                {stats?.totalInvoicesSent || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Invoices awaiting payment
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-overdue-invoices">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Invoices</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600" data-testid="stat-overdue-invoices">
                {stats?.overdueInvoices || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Past due date, unpaid
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-invoice-1st-reminder">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">1st Payment Reminder</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600" data-testid="stat-invoices-1st-reminder">
                {stats?.invoicesWithOneFollowup || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                Initial payment reminder sent
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-invoice-final-reminder">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Final Reminders</CardTitle>
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600" data-testid="stat-invoices-final-reminder">
                {(stats?.invoicesWithTwoFollowups || 0) + (stats?.invoicesWithThreeFollowups || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                2nd and 3rd reminders sent
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Follow-up Progress */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card data-testid="card-followup-progress">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Follow-up Progress
            </CardTitle>
            <CardDescription>
              Current status of follow-up reminders for active quotes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" data-testid="badge-first-followup">1st Follow-up</Badge>
                <span className="text-sm text-muted-foreground">3 days after quote sent</span>
              </div>
              <span className="font-semibold" data-testid="count-first-followup">
                {stats?.quotesWithOneFollowup || 0}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" data-testid="badge-second-followup">2nd Follow-up</Badge>
                <span className="text-sm text-muted-foreground">7 days after 1st follow-up</span>
              </div>
              <span className="font-semibold" data-testid="count-second-followup">
                {stats?.quotesWithTwoFollowups || 0}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" data-testid="badge-final-followup">Final Follow-up</Badge>
                <span className="text-sm text-muted-foreground">14 days after 2nd follow-up</span>
              </div>
              <span className="font-semibold" data-testid="count-final-followup">
                {stats?.quotesWithThreeFollowups || 0}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-automation-info">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              How It Works
            </CardTitle>
            <CardDescription>
              Automated follow-up schedule for quote reminders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <div className="text-sm">
                  <strong>1st Reminder:</strong> Sent 3 days after quote is sent
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <div className="text-sm">
                  <strong>2nd Reminder:</strong> Sent 7 days after 1st reminder
                </div>
              </div>
              <div className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <div className="text-sm">
                  <strong>Final Reminder:</strong> Sent 14 days after 2nd reminder
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div className="text-xs text-muted-foreground">
              <p>• Only applies to quotes in 'sent' status</p>
              <p>• Stops automatically when client responds</p>
              <p>• Maximum 3 follow-ups per quote</p>
              <p>• No reminders for expired quotes</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage Instructions */}
      <Card data-testid="card-usage-instructions">
        <CardHeader>
          <CardTitle>Usage Instructions</CardTitle>
          <CardDescription>
            How to use the follow-up automation system
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Manual Processing</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Click "Process Follow-ups Now" to check all quotes</li>
                <li>• System will send reminders based on timing rules</li>
                <li>• View statistics to track follow-up effectiveness</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Automatic Processing</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Set up a daily cron job to call the API</li>
                <li>• Use endpoint: POST /api/followup/process</li>
                <li>• Recommended: Run once per day in the morning</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}