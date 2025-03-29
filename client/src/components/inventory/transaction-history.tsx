import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { InventoryTransaction, InventoryItem } from "@shared/schema";
import { format } from "date-fns";
import { useSettings } from "@/hooks/use-settings";

// UI Components
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  RefreshCw, 
  AlertTriangle, 
  Loader2 
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";

interface TransactionHistoryProps {
  itemId: number;
}

export default function InventoryTransactionHistory({ itemId }: TransactionHistoryProps) {
  const { formatMoney } = useSettings();
  const [filterType, setFilterType] = useState<string>("");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  
  // Get the item details
  const { 
    data: item,
    isLoading: itemLoading,
    isError: itemError
  } = useQuery<InventoryItem>({
    queryKey: [`/api/inventory/${itemId}`],
  });
  
  // Get all inventory transactions for this item
  const { 
    data: transactions = [], 
    isLoading,
    isError,
    refetch
  } = useQuery<InventoryTransaction[]>({
    queryKey: [`/api/inventory-transactions`, { inventoryItemId: itemId, type: filterType, startDate, endDate }],
  });

  // Filter transactions based on filters
  const filteredTransactions = transactions.filter(tx => {
    if (filterType && tx.transactionType !== filterType) {
      return false;
    }
    
    if (startDate && new Date(tx.transactionDate) < startDate) {
      return false;
    }
    
    if (endDate) {
      // Set time to end of day for end date comparison
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      if (new Date(tx.transactionDate) > endOfDay) {
        return false;
      }
    }
    
    return true;
  });

  // Get icon based on transaction type
  const getTransactionIcon = (type: string, quantity: number) => {
    switch (type) {
      case "purchase":
        return <ArrowUpCircle className="h-4 w-4 text-green-500" />;
      case "sale":
        return <ArrowDownCircle className="h-4 w-4 text-blue-500" />;
      case "adjustment":
        return quantity >= 0 
          ? <ArrowUpCircle className="h-4 w-4 text-amber-500" />
          : <ArrowDownCircle className="h-4 w-4 text-amber-500" />;
      case "transfer":
        return <RefreshCw className="h-4 w-4 text-purple-500" />;
      case "return":
        return <ArrowUpCircle className="h-4 w-4 text-indigo-500" />;
      case "write-off":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <RefreshCw className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get badge based on transaction type
  const getTransactionBadge = (type: string) => {
    switch (type) {
      case "purchase":
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Purchase</Badge>;
      case "sale":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Sale</Badge>;
      case "adjustment":
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Adjustment</Badge>;
      case "transfer":
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Transfer</Badge>;
      case "return":
        return <Badge className="bg-indigo-100 text-indigo-800 hover:bg-indigo-100">Return</Badge>;
      case "write-off":
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Write-Off</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setFilterType("");
    setStartDate(undefined);
    setEndDate(undefined);
  };

  if (itemLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-1/3" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-3/4" />
        </div>
      </div>
    );
  }

  if (itemError || !item) {
    return (
      <div className="bg-red-50 p-4 rounded-md text-red-800">
        <h3 className="font-medium">Error loading item details</h3>
        <p className="text-sm mt-1">Could not load the inventory item information.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Item details */}
      <div className="bg-gray-50 p-4 rounded-md">
        <h3 className="font-medium text-lg">{item.name}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
          <div>
            <p className="text-sm text-gray-500">SKU</p>
            <p className="font-medium">{item.sku}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Current Stock</p>
            <p className="font-medium">{item.currentStock} {item.unitOfMeasure}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Cost Price</p>
            <p className="font-medium">{item.costPrice ? formatMoney(item.costPrice) : "N/A"}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Value</p>
            <p className="font-medium">{formatMoney(item.currentStock * (item.costPrice || 0))}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label>Transaction Type</Label>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger>
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Types</SelectItem>
              <SelectItem value="purchase">Purchase</SelectItem>
              <SelectItem value="sale">Sale</SelectItem>
              <SelectItem value="adjustment">Adjustment</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
              <SelectItem value="return">Return</SelectItem>
              <SelectItem value="write-off">Write-Off</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label>Start Date</Label>
          <DatePicker date={startDate} setDate={setStartDate} />
        </div>
        
        <div className="space-y-2">
          <Label>End Date</Label>
          <DatePicker date={endDate} setDate={setEndDate} />
        </div>
        
        <div className="flex items-end gap-2">
          <Button 
            variant="outline" 
            onClick={clearFilters}
            className="flex-1"
          >
            Clear Filters
          </Button>
          <Button 
            variant="outline" 
            onClick={() => refetch()}
            className="px-3"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Transactions table */}
      {isLoading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : isError ? (
        <div className="bg-red-50 p-4 rounded-md text-red-800">
          <h3 className="font-medium">Error loading transactions</h3>
          <p className="text-sm mt-1">Could not load the transaction history.</p>
          <Button 
            variant="outline" 
            onClick={() => refetch()}
            className="mt-2"
          >
            Try Again
          </Button>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-md">
          <RefreshCw className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium">No transactions found</h3>
          <p className="text-sm text-gray-500 mt-1 max-w-md mx-auto">
            {filterType || startDate || endDate
              ? "Try adjusting your filters to see more transactions."
              : "There are no recorded transactions for this inventory item yet."}
          </p>
        </div>
      ) : (
        <div className="border rounded-md overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Quantity</TableHead>
                <TableHead>Unit Cost</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    {format(new Date(transaction.transactionDate), "MMM d, yyyy HH:mm")}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getTransactionIcon(transaction.transactionType, transaction.quantity)}
                      {getTransactionBadge(transaction.transactionType)}
                    </div>
                  </TableCell>
                  <TableCell className={
                    transaction.quantity > 0 
                      ? "text-green-600 font-medium" 
                      : "text-red-600 font-medium"
                  }>
                    {transaction.quantity > 0 ? "+" : ""}{transaction.quantity} {item.unitOfMeasure}
                  </TableCell>
                  <TableCell>
                    {transaction.unitCost ? formatMoney(transaction.unitCost) : "N/A"}
                  </TableCell>
                  <TableCell className="font-medium">
                    {transaction.unitCost 
                      ? formatMoney(transaction.quantity * transaction.unitCost) 
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    {transaction.reference || "-"}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {transaction.notes || "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}