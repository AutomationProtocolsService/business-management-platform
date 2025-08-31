import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import QuoteForm from "@/components/forms/quote-form-new";

// Type definitions
interface QuoteFormValues {
  customerId?: number;
  projectId?: number;
  reference?: string;
  issueDate?: string;
  expiryDate?: string;
  status?: string;
  subtotal?: number;
  tax?: number;
  discount?: number;
  total?: number;
  notes?: string;
  terms?: string;
  items?: any[];
}

export default function QuoteEditPage() {
  const [, params] = useRoute("/quotes/:id/edit");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const quoteId = params?.id ? parseInt(params.id) : undefined;
  const [defaultValues, setDefaultValues] = useState<Partial<QuoteFormValues>>();
  const [isLoading, setIsLoading] = useState(true);

  // Fetch quote details
  const { data: quote, isError } = useQuery({
    queryKey: [`/api/quotes/${quoteId}`],
    queryFn: async () => {
      if (!quoteId) return null;
      const res = await fetch(`/api/quotes/${quoteId}`);
      if (!res.ok) {
        throw new Error(`Failed to fetch quote: ${res.statusText}`);
      }
      return res.json();
    },
    enabled: !!quoteId
  });

  // Fetch quote items
  const { data: quoteItems = [] } = useQuery({
    queryKey: [`/api/quotes/${quoteId}/items`],
    queryFn: async () => {
      if (!quoteId) return [];
      const res = await fetch(`/api/quotes/${quoteId}/items`);
      if (!res.ok) {
        // If there's an error, the items might be included in the quote object
        return [];
      }
      return res.json();
    },
    enabled: !!quoteId
  });

  // Prepare form default values when quote data is available
  useEffect(() => {
    if (quote) {
      // Use quote items from dedicated endpoint if available, otherwise use items from quote object
      const items = quoteItems.length > 0 
        ? quoteItems 
        : (Array.isArray(quote.items) ? quote.items : []);

      setDefaultValues({
        customerId: quote.customerId,
        projectId: quote.projectId,
        reference: quote.reference,
        issueDate: quote.issueDate,
        expiryDate: quote.expiryDate,
        status: quote.status,
        subtotal: quote.subtotal,
        tax: quote.tax,
        discount: quote.discount,
        total: quote.total,
        notes: quote.notes,
        terms: quote.terms,
        items: items.map((item: any) => {
          const quantity = item.quantity || 1;
          const unitPrice = item.unitPrice || 0;
          const vatRate = typeof item.vatRate === 'number' ? item.vatRate : 20; // Default 20% VAT for UK
          const netTotal = quantity * unitPrice;
          const vatAmount = netTotal * (vatRate / 100);
          const calculatedTotal = netTotal + vatAmount;
          
          return {
            id: item.id,
            description: item.description || "",
            quantity: quantity,
            unitPrice: unitPrice,
            vatRate: vatRate,
            netTotal: netTotal,
            vatAmount: vatAmount,
            total: calculatedTotal,
            catalogItemId: item.catalogItemId
          };
        })
      });
      setIsLoading(false);
    }
  }, [quote, quoteItems]);

  // Handle successful quote update
  const handleSuccess = () => {
    toast({
      title: "Quote updated",
      description: "Quote has been updated successfully",
    });
    navigate(`/quotes/${quoteId}`);
  };

  if (isError) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Error</h1>
        <p className="text-red-500">Failed to load quote. It may not exist or you don't have permission to access it.</p>
        <Button 
          variant="outline"
          className="mt-4"
          onClick={() => navigate("/quotes")}
        >
          Back to Quotes
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            className="mr-4" 
            onClick={() => navigate(`/quotes/${quoteId}`)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">Edit Quote</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quote Details</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center">Loading quote data...</div>
          ) : (
            <QuoteForm 
              quoteId={quoteId} 
              defaultValues={defaultValues as any}
              onSuccess={handleSuccess}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}