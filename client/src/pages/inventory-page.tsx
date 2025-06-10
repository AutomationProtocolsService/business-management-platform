import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { InventoryItem } from "@shared/schema";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  PlusCircle, 
  Search, 
  Filter,
  Package,
  Loader2,
  AlertCircle,
  Pencil,
  BarChart,
  ArrowUpDown,
  ShoppingCart,
  History,
  BoxesIcon
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/use-settings";
import { format } from "date-fns";
import InventoryItemForm from "@/components/forms/inventory-item-form";
import InventoryTransactionHistory from "@/components/inventory/transaction-history";
import PurchaseOrderFromInventory from "@/components/inventory/purchase-order-from-inventory";
import {
  Progress
} from "@/components/ui/progress";

export default function InventoryPage() {
  const { toast } = useToast();
  const { formatMoney } = useSettings();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [isInventoryDialogOpen, setIsInventoryDialogOpen] = useState(false);
  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [isPurchaseOrderDialogOpen, setIsPurchaseOrderDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [activeTab, setActiveTab] = useState<string>("all");
  
  // Get all inventory items
  const { 
    data: inventoryItems = [], 
    isLoading, 
    isError 
  } = useQuery<InventoryItem[]>({
    queryKey: ["/api/inventory"],
  });

  // Filter inventory items based on search term, category, and active tab
  const filteredItems = inventoryItems.filter(item => {
    const matchesSearch = 
      searchTerm === "" || 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = 
      categoryFilter === "" || 
      item.category === categoryFilter;
    
    const matchesTab = 
      activeTab === "all" || 
      (activeTab === "low-stock" && (item.currentStock || 0) <= (item.reorderPoint || 0)) ||
      (activeTab === "in-stock" && (item.currentStock || 0) > (item.reorderPoint || 0));
    
    return matchesSearch && matchesCategory && matchesTab;
  });

  // Get unique categories for filter dropdown
  const categories = Array.from(new Set(inventoryItems.map(item => item.category)));

  // Handle edit inventory item
  const handleEditItem = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsInventoryDialogOpen(true);
  };

  // Handle view transaction history
  const handleViewTransactions = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsTransactionDialogOpen(true);
  };

  // Handle create purchase order from inventory
  const handleCreatePurchaseOrder = (item: InventoryItem) => {
    setSelectedItem(item);
    setIsPurchaseOrderDialogOpen(true);
  };

  // Calculate stock level percentage
  const calculateStockLevel = (current: number | null, target: number | null) => {
    const currentValue = current || 0;
    const targetValue = target || 0;
    if (targetValue <= 0) return 0;
    const percentage = (currentValue / targetValue) * 100;
    return Math.min(percentage, 100); // Cap at 100%
  };

  // Get stock level color
  const getStockLevelColor = (item: InventoryItem) => {
    const currentStock = item.currentStock || 0;
    const reorderPoint = item.reorderPoint || 0;
    
    if (currentStock <= reorderPoint) {
      return "bg-red-500";
    } else if (currentStock <= reorderPoint * 1.5) {
      return "bg-yellow-500";
    } else {
      return "bg-green-500";
    }
  };

  if (isError) {
    return (
      <div className="container py-10">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-800">Error Loading Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            <p>There was a problem loading the inventory data. Please try again.</p>
          </CardContent>
          <CardFooter>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
            >
              Refresh Page
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Inventory Management</h1>
          <p className="text-muted-foreground">
            Track and manage your inventory items
          </p>
        </div>
        <Dialog open={isInventoryDialogOpen} onOpenChange={setIsInventoryDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-1">
              <PlusCircle className="h-4 w-4" /> Add Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl p-0">
            <DialogHeader className="p-6 border-b">
              <DialogTitle>
                {selectedItem ? "Edit Inventory Item" : "Add New Inventory Item"}
              </DialogTitle>
              <DialogDescription>
                {selectedItem 
                  ? "Update the inventory item details below" 
                  : "Fill in the details for the new inventory item"}
              </DialogDescription>
            </DialogHeader>
            <div className="p-6 overflow-y-auto" style={{ maxHeight: "70vh" }}>
              <InventoryItemForm 
                item={selectedItem} 
                onSuccess={() => setIsInventoryDialogOpen(false)}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Transaction history dialog */}
      <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Transaction History for {selectedItem?.name}
            </DialogTitle>
            <DialogDescription>
              View all stock movements for this inventory item
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <InventoryTransactionHistory itemId={selectedItem.id} />
          )}
        </DialogContent>
      </Dialog>

      {/* Inventory stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <BoxesIcon className="h-8 w-8 text-primary mr-2" />
              <div className="text-2xl font-bold">{inventoryItems.length}</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <AlertCircle className="h-8 w-8 text-red-500 mr-2" />
              <div className="text-2xl font-bold">
                {inventoryItems.filter(item => (item.currentStock || 0) <= (item.reorderPoint || 0)).length}
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Inventory Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center">
              <BarChart className="h-8 w-8 text-green-500 mr-2" />
              <div className="text-2xl font-bold">
                {formatMoney(
                  inventoryItems.reduce(
                    (sum, item) => sum + ((item.currentStock || 0) * (item.cost || 0)), 
                    0
                  )
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs, filters, and search */}
      <div className="space-y-4 mb-6">
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All Items</TabsTrigger>
            <TabsTrigger value="low-stock">Low Stock</TabsTrigger>
            <TabsTrigger value="in-stock">In Stock</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search by name, SKU, or description..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[180px]">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4" />
                      {categoryFilter || "All Categories"}
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category || ""}>
                        {category || "Uncategorized"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => {
                  setSearchTerm("");
                  setCategoryFilter("");
                }}>
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-4">
              <Package className="h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-lg font-medium">No inventory items found</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-md">
                {searchTerm || categoryFilter
                  ? "Try adjusting your search or filters to find what you're looking for."
                  : "Get started by adding your first inventory item using the 'Add Item' button."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>
                      <div className="flex items-center gap-1">
                        Current Stock <ArrowUpDown className="h-3 w-3" />
                      </div>
                    </TableHead>
                    <TableHead>Stock Level</TableHead>
                    <TableHead>Cost Price</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-sm">
                        {item.sku}
                      </TableCell>
                      <TableCell className="font-medium">
                        {item.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.category}</Badge>
                      </TableCell>
                      <TableCell>
                        {(item.currentStock || 0) <= (item.reorderPoint || 0) ? (
                          <Badge variant="destructive" className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" />
                            {item.currentStock || 0} / {item.reorderQuantity || 0}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-50">
                            {item.currentStock || 0} / {item.reorderQuantity || 0}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="w-full flex flex-col gap-1">
                          <Progress 
                            value={calculateStockLevel(item.currentStock, item.reorderQuantity)} 
                            className={getStockLevelColor(item)}
                          />
                          {(item.currentStock || 0) <= (item.reorderPoint || 0) && (
                            <span className="text-xs text-red-600">
                              Reorder now (min: {item.reorderPoint || 0})
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.cost ? formatMoney(item.cost) : "N/A"}
                      </TableCell>
                      <TableCell className="font-medium">
                        {formatMoney((item.currentStock || 0) * (item.cost || 0))}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEditItem(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-blue-500"
                            onClick={() => handleViewTransactions(item)}
                          >
                            <History className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-green-500"
                            onClick={() => handleCreatePurchaseOrder(item)}
                            title="Create Purchase Order"
                          >
                            <ShoppingCart className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Purchase Order Dialog */}
      <PurchaseOrderFromInventory
        open={isPurchaseOrderDialogOpen}
        onOpenChange={setIsPurchaseOrderDialogOpen}
        inventoryItem={selectedItem}
      />

      {/* Transaction History Dialog */}
      <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Transaction History</DialogTitle>
            <DialogDescription>
              {selectedItem ? `View transaction history for ${selectedItem.name}` : 'Loading...'}
            </DialogDescription>
          </DialogHeader>
          {selectedItem && (
            <InventoryTransactionHistory inventoryItemId={selectedItem.id} />
          )}
        </DialogContent>
      </Dialog>

      {/* Inventory Item Dialog */}
      <Dialog open={isInventoryDialogOpen} onOpenChange={setIsInventoryDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedItem ? "Edit Inventory Item" : "Add New Item"}
            </DialogTitle>
            <DialogDescription>
              {selectedItem 
                ? "Update the details of this inventory item" 
                : "Add a new item to your inventory"}
            </DialogDescription>
          </DialogHeader>
          <InventoryItemForm 
            inventoryItem={selectedItem} 
            onSuccess={() => {
              setIsInventoryDialogOpen(false);
              setSelectedItem(null);
              toast({
                title: selectedItem ? "Item updated" : "Item added",
                description: selectedItem 
                  ? "The inventory item has been updated successfully." 
                  : "The inventory item has been added successfully.",
              });
            }} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}