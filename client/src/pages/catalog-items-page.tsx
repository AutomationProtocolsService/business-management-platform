import { useCallback, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Edit, Filter, Search, X } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/utils";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CatalogItem } from "@shared/schema";

// Categories for catalog items
const CATEGORIES = [
  "Material",
  "Labor",
  "Equipment",
  "Service",
  "Product",
  "Other"
];

export default function CatalogItemsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<CatalogItem | null>(null);
  
  // Form state for a new catalog item
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    unitPrice: 0,
    category: CATEGORIES[0],
  });
  
  // Query to fetch catalog items
  const { data: catalogItems, isLoading, error } = useQuery<CatalogItem[]>({
    queryKey: ["/api/catalog-items"],
    queryFn: async () => {
      const response = await fetch("/api/catalog-items");
      if (!response.ok) {
        throw new Error("Failed to fetch catalog items");
      }
      return response.json();
    },
  });
  
  // Mutation to create a catalog item
  const createItemMutation = useMutation({
    mutationFn: async (data: Omit<CatalogItem, "id" | "createdAt" | "createdBy">) => {
      const response = await apiRequest("POST", "/api/catalog-items", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Catalog item created successfully",
      });
      setIsItemDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/catalog-items"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation to update a catalog item
  const updateItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CatalogItem> }) => {
      const response = await apiRequest("PUT", `/api/catalog-items/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Catalog item updated successfully",
      });
      setIsItemDialogOpen(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["/api/catalog-items"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Mutation to delete a catalog item
  const deleteItemMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/catalog-items/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Catalog item deleted successfully",
      });
      setIsDeleteDialogOpen(false);
      setCurrentItem(null);
      queryClient.invalidateQueries({ queryKey: ["/api/catalog-items"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle creating or updating a catalog item
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      name: formData.name,
      description: formData.description,
      unitPrice: Number(formData.unitPrice),
      category: formData.category,
    };
    
    if (currentItem) {
      updateItemMutation.mutate({ id: currentItem.id, data });
    } else {
      createItemMutation.mutate(data);
    }
  };
  
  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      unitPrice: 0,
      category: CATEGORIES[0],
    });
    setCurrentItem(null);
  };
  
  // Open dialog to edit a catalog item
  const handleEdit = (item: CatalogItem) => {
    setCurrentItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      unitPrice: item.unitPrice,
      category: item.category || CATEGORIES[0],
    });
    setIsItemDialogOpen(true);
  };
  
  // Open dialog to delete a catalog item
  const handleDelete = (item: CatalogItem) => {
    setCurrentItem(item);
    setIsDeleteDialogOpen(true);
  };
  
  // Filter catalog items based on search term and category
  const filteredItems = useCallback(() => {
    if (!catalogItems) return [];
    
    let filtered = catalogItems;
    
    // Filter by category
    if (activeCategory !== "all") {
      filtered = filtered.filter(item => item.category === activeCategory);
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(item => 
        item.name.toLowerCase().includes(term) || 
        item.description.toLowerCase().includes(term)
      );
    }
    
    // Filter by current user (my items)
    if (activeCategory === "my-items") {
      filtered = filtered.filter(item => item.createdBy === user?.id);
    }
    
    return filtered;
  }, [catalogItems, searchTerm, activeCategory, user?.id]);

  // Group items by category for the category view
  const itemsByCategory = useCallback(() => {
    const grouped: Record<string, CatalogItem[]> = {};
    
    filteredItems().forEach(item => {
      const category = item.category || "Other";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });
    
    return grouped;
  }, [filteredItems]);
  
  if (error) {
    return (
      <Alert variant="destructive" className="mt-4">
        <AlertDescription>Failed to load catalog items. Please try again later.</AlertDescription>
      </Alert>
    );
  }
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Catalog Items</h1>
          <p className="text-muted-foreground">
            Manage your reusable items for quotes and invoices
          </p>
        </div>
        <Button onClick={() => {
          resetForm();
          setIsItemDialogOpen(true);
        }}>
          <Plus className="mr-2 h-4 w-4" /> Add Item
        </Button>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-grow">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search catalog items..."
            className="pl-8"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-0 top-0 h-full px-3"
              onClick={() => setSearchTerm("")}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" className="md:w-[140px]">
              <Filter className="mr-2 h-4 w-4" /> 
              Filter
            </Button>
          </SheetTrigger>
          <SheetContent side="right">
            <SheetHeader>
              <SheetTitle>Filter Catalog Items</SheetTitle>
              <SheetDescription>
                Choose a category to filter your catalog items
              </SheetDescription>
            </SheetHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="category-filter">Category</Label>
                <Select value={activeCategory} onValueChange={setActiveCategory}>
                  <SelectTrigger id="category-filter">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="my-items">My Items</SelectItem>
                    <Separator className="my-1" />
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
      
      <Tabs defaultValue="grid" className="mb-8">
        <TabsList className="mb-4">
          <TabsTrigger value="grid">Grid View</TabsTrigger>
          <TabsTrigger value="category">Category View</TabsTrigger>
          {user && <TabsTrigger value="my-items">My Items</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="grid" className="space-y-4">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array(6).fill(0).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-10 w-full mb-2" />
                    <Skeleton className="h-4 w-1/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {filteredItems().length === 0 ? (
                <Card className="text-center p-6">
                  <p className="text-muted-foreground">No catalog items found. Create your first item to get started.</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredItems().map((item) => (
                    <Card key={item.id} className="overflow-hidden">
                      <CardHeader className="pb-2">
                        <CardTitle className="flex justify-between">
                          <span className="truncate mr-2">{item.name}</span>
                          <span>{formatCurrency(item.unitPrice)}</span>
                        </CardTitle>
                        <div className="flex gap-2 mt-1">
                          {item.category && (
                            <Badge variant="outline">{item.category}</Badge>
                          )}
                          {item.createdBy === user?.id && (
                            <Badge variant="secondary">My Item</Badge>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground mb-4">
                          {item.description || "No description provided."}
                        </p>
                      </CardContent>
                      <CardFooter className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit className="h-4 w-4 mr-1" /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(item)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" /> Delete
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>
        
        <TabsContent value="category">
          {isLoading ? (
            <div className="space-y-6">
              {Array(3).fill(0).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-1/4" />
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Array(3).fill(0).map((_, j) => (
                        <Skeleton key={j} className="h-24 w-full" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {Object.keys(itemsByCategory()).length === 0 ? (
                <Card className="text-center p-6">
                  <p className="text-muted-foreground">No catalog items found. Create your first item to get started.</p>
                </Card>
              ) : (
                <div className="space-y-6">
                  {Object.entries(itemsByCategory()).map(([category, items]) => (
                    <Card key={category}>
                      <CardHeader>
                        <CardTitle>{category}</CardTitle>
                        <CardDescription>
                          {items.length} item{items.length !== 1 ? 's' : ''}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ScrollArea className="h-full max-h-[500px]">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {items.map((item) => (
                              <Card key={item.id} className="overflow-hidden">
                                <CardHeader className="pb-2">
                                  <CardTitle className="flex justify-between text-base">
                                    <span className="truncate mr-2">{item.name}</span>
                                    <span>{formatCurrency(item.unitPrice)}</span>
                                  </CardTitle>
                                  {item.createdBy === user?.id && (
                                    <Badge variant="secondary" className="mt-1">My Item</Badge>
                                  )}
                                </CardHeader>
                                <CardContent>
                                  <p className="text-sm text-muted-foreground line-clamp-2">
                                    {item.description || "No description provided."}
                                  </p>
                                </CardContent>
                                <CardFooter className="flex justify-end gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEdit(item)}
                                  >
                                    <Edit className="h-4 w-4 mr-1" /> Edit
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-destructive hover:text-destructive"
                                    onClick={() => handleDelete(item)}
                                  >
                                    <Trash2 className="h-4 w-4 mr-1" /> Delete
                                  </Button>
                                </CardFooter>
                              </Card>
                            ))}
                          </div>
                        </ScrollArea>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </>
          )}
        </TabsContent>
        
        <TabsContent value="my-items">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array(3).fill(0).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-10 w-full mb-2" />
                    <Skeleton className="h-4 w-1/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {filteredItems().filter(item => item.createdBy === user?.id).length === 0 ? (
                <Card className="text-center p-6">
                  <p className="text-muted-foreground">You haven't created any catalog items yet.</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredItems()
                    .filter(item => item.createdBy === user?.id)
                    .map((item) => (
                      <Card key={item.id} className="overflow-hidden">
                        <CardHeader className="pb-2">
                          <CardTitle className="flex justify-between">
                            <span className="truncate mr-2">{item.name}</span>
                            <span>{formatCurrency(item.unitPrice)}</span>
                          </CardTitle>
                          {item.category && (
                            <Badge variant="outline" className="mt-1">{item.category}</Badge>
                          )}
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground mb-4">
                            {item.description || "No description provided."}
                          </p>
                        </CardContent>
                        <CardFooter className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(item)}
                          >
                            <Edit className="h-4 w-4 mr-1" /> Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(item)}
                          >
                            <Trash2 className="h-4 w-4 mr-1" /> Delete
                          </Button>
                        </CardFooter>
                      </Card>
                    ))}
                </div>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
      
      {/* Create/Edit Catalog Item Dialog */}
      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{currentItem ? "Edit Catalog Item" : "Create New Catalog Item"}</DialogTitle>
            <DialogDescription>
              {currentItem 
                ? "Update the details of your catalog item" 
                : "Add a new item to your catalog for use in quotes and invoices"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="description" className="text-right">
                  Description
                </Label>
                <Input
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="unitPrice" className="text-right">
                  Unit Price
                </Label>
                <Input
                  id="unitPrice"
                  name="unitPrice"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.unitPrice}
                  onChange={handleInputChange}
                  className="col-span-3"
                  required
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="category" className="text-right">
                  Category
                </Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsItemDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createItemMutation.isPending || updateItemMutation.isPending}>
                {(createItemMutation.isPending || updateItemMutation.isPending) ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this catalog item? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {currentItem && (
              <Card>
                <CardHeader className="py-2">
                  <CardTitle className="text-base">{currentItem.name}</CardTitle>
                </CardHeader>
                <CardContent className="py-2">
                  <p className="text-sm text-muted-foreground">{currentItem.description}</p>
                  <p className="font-medium mt-1">{formatCurrency(currentItem.unitPrice)}</p>
                </CardContent>
              </Card>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => currentItem && deleteItemMutation.mutate(currentItem.id)}
              disabled={deleteItemMutation.isPending}
            >
              {deleteItemMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}