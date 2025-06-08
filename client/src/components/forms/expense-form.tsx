import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertExpenseSchema, Expense, InsertExpense } from "@shared/schema";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

// UI Components
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Loader2, Upload, Receipt, DollarSign } from "lucide-react";
import { Supplier } from "@shared/schema";

// Extend the schema with additional validation
const formSchema = insertExpenseSchema.extend({
  date: z.date({
    required_error: "Date is required",
  }),
});

type FormValues = z.infer<typeof formSchema>;

interface ExpenseFormProps {
  expense?: Expense | null;
  onSuccess?: () => void;
}

const EXPENSE_CATEGORIES = [
  "Materials",
  "Labor",
  "Transport",
  "Office",
  "Utilities",
  "Rent",
  "Software",
  "Hardware",
  "Marketing",
  "Legal",
  "Insurance",
  "Travel",
  "Meals",
  "Entertainment",
  "Other",
];

const PAYMENT_METHODS = [
  "Cash",
  "Credit Card",
  "Debit Card",
  "Bank Transfer",
  "Check",
  "PayPal",
  "Company Account",
  "Other",
];

export default function ExpenseForm({ expense, onSuccess }: ExpenseFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [receiptFile, setReceiptFile] = useState<File | null>(null);

  // Get suppliers for dropdown
  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  // Create form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: expense?.description || "",
      amount: expense?.amount || 0,
      date: expense ? new Date(expense.date) : new Date(),
      category: expense?.category || "Materials",
      paymentMethod: expense?.paymentMethod || "Credit Card",
      notes: expense?.notes || "",
      reimbursable: expense?.reimbursable || false,
      supplierId: expense?.supplierId,
      projectId: expense?.projectId,
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: InsertExpense) => {
      const res = await apiRequest("POST", "/api/expenses", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Expense created",
        description: "The expense has been added successfully.",
      });
      // Invalidate query to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating expense",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Expense>) => {
      const res = await apiRequest("PATCH", `/api/expenses/${expense?.id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Expense updated",
        description: "The expense has been updated successfully.",
      });
      // Invalidate query to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating expense",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = async (data: FormValues) => {
    console.log("🔥 form submit handler fired", data);
    
    if (!user) {
      console.log("❌ No user found, authentication required");
      toast({
        title: "Authentication required",
        description: "You must be logged in to create expenses.",
        variant: "destructive",
      });
      return;
    }

    // Upload receipt if available
    let receiptUrl = expense?.receiptUrl;
    if (receiptFile) {
      // In a real app, we would upload the file to cloud storage here
      // and get the URL back. For now, we'll just simulate that.
      receiptUrl = URL.createObjectURL(receiptFile);
      
      toast({
        title: "Receipt upload",
        description: "In a production app, the receipt would be uploaded to cloud storage.",
      });
    }

    const expenseData = {
      ...data,
      date: data.date.toISOString().split('T')[0], // Convert Date to YYYY-MM-DD string
      receiptUrl,
      createdBy: user.id,
    };

    if (expense) {
      updateMutation.mutate(expenseData);
    } else {
      createMutation.mutate(expenseData);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setReceiptFile(e.target.files[0]);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={(e) => {
        console.log("🔥 form onSubmit event triggered");
        console.log("Form errors:", form.formState.errors);
        form.handleSubmit(onSubmit)(e);
      }} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Input placeholder="Office supplies" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Amount */}
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                      <Input 
                        type="number" 
                        step="0.01"
                        min="0"
                        className="pl-8"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date */}
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date *</FormLabel>
                  <DatePicker
                    date={field.value}
                    setDate={field.onChange}
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Category */}
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value || ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment Method */}
            <FormField
              control={form.control}
              name="paymentMethod"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Payment Method</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value || ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a payment method" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method} value={method}>
                          {method}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="space-y-6">
            {/* Supplier */}
            <FormField
              control={form.control}
              name="supplierId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier (Optional)</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)} 
                    value={field.value?.toString() || ""}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a supplier" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="0">None</SelectItem>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id.toString()}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Link this expense to a supplier if applicable
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Receipt Upload */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <Label htmlFor="receipt">Receipt (Optional)</Label>
                  <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-md p-6 bg-gray-50">
                    {receiptFile ? (
                      <div className="text-center">
                        <Receipt className="mx-auto h-8 w-8 text-green-500 mb-2" />
                        <p className="text-sm font-medium">{receiptFile.name}</p>
                        <p className="text-xs text-gray-500">{Math.round(receiptFile.size / 1024)} KB</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2"
                          onClick={() => setReceiptFile(null)}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : expense?.receiptUrl ? (
                      <div className="text-center">
                        <Receipt className="mx-auto h-8 w-8 text-blue-500 mb-2" />
                        <p className="text-sm font-medium">Receipt already uploaded</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => window.open(expense.receiptUrl, "_blank")}
                        >
                          View Receipt
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500 mb-1">Drag and drop or click to upload</p>
                        <p className="text-xs text-gray-400">PDF, JPG, PNG up to 5MB</p>
                        <Input
                          id="receipt"
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="mt-2"
                          onClick={() => document.getElementById("receipt")?.click()}
                        >
                          Select File
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reimbursable */}
            <FormField
              control={form.control}
              name="reimbursable"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={!!field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Reimbursable Expense
                    </FormLabel>
                    <FormDescription>
                      Check if this expense should be reimbursed to an employee
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Add any additional details about this expense" 
                      className="min-h-[100px]"
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onSuccess}
          >
            Cancel
          </Button>
          <Button 
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="flex items-center gap-1"
          >
            {(createMutation.isPending || updateMutation.isPending) && (
              <Loader2 className="h-4 w-4 animate-spin" />
            )}
            {expense ? "Update Expense" : "Create Expense"}
          </Button>
        </div>
      </form>
    </Form>
  );
}