import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { CatalogItem } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";

interface CatalogItemSelectorProps {
  onItemSelect: (item: CatalogItem) => void;
  buttonLabel?: string;
  showViewAllButton?: boolean;
}

export default function CatalogItemSelector({
  onItemSelect,
  buttonLabel = "Add from Catalog",
  showViewAllButton = true,
}: CatalogItemSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Query to fetch catalog items
  const { data: catalogItems = [], isLoading } = useQuery<CatalogItem[]>({
    queryKey: ["/api/catalog-items"],
    queryFn: async () => {
      const response = await fetch("/api/catalog-items");
      if (!response.ok) {
        throw new Error("Failed to fetch catalog items");
      }
      return response.json();
    },
  });
  
  // Filter catalog items based on search term
  const filteredItems = searchTerm 
    ? catalogItems.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.category && item.category.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    : catalogItems;
  
  // Group items by category
  const itemsByCategory = () => {
    const grouped: Record<string, CatalogItem[]> = {};
    
    filteredItems.forEach(item => {
      const category = item.category || "Other";
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });
    
    return grouped;
  };
  
  const handleItemSelect = (item: CatalogItem) => {
    onItemSelect(item);
    setOpen(false);
    setIsDialogOpen(false);
  };
  
  return (
    <>
      {/* Quick popover search */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline">{buttonLabel}</Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0" align="start">
          <Command>
            <CommandInput 
              placeholder="Search catalog items..." 
              onValueChange={setSearchTerm}
              value={searchTerm}
            />
            {isLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Loading items...</div>
            ) : (
              <>
                <CommandEmpty>No items found.</CommandEmpty>
                <CommandGroup heading="Recently used items">
                  {filteredItems.slice(0, 5).map((item) => (
                    <CommandItem
                      key={item.id}
                      value={item.name}
                      onSelect={() => handleItemSelect(item)}
                      className="cursor-pointer"
                    >
                      <div className="flex flex-col w-full">
                        <div className="flex justify-between items-center">
                          <span>{item.name}</span>
                          <span className="text-muted-foreground text-sm">{formatCurrency(item.unitPrice)}</span>
                        </div>
                        {item.category && (
                          <Badge variant="outline" className="mt-1 w-fit">
                            {item.category}
                          </Badge>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
                {showViewAllButton && filteredItems.length > 5 && (
                  <div className="p-2 border-t">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-center text-sm"
                      onClick={() => {
                        setIsDialogOpen(true);
                        setOpen(false);
                      }}
                    >
                      View all catalog items ({filteredItems.length})
                    </Button>
                  </div>
                )}
              </>
            )}
          </Command>
        </PopoverContent>
      </Popover>
      
      {/* Full catalog browse dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Select Catalog Item</DialogTitle>
            <DialogDescription>
              Browse or search through your catalog items to add to your document.
            </DialogDescription>
          </DialogHeader>
          
          <div className="relative my-2">
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
                className="absolute right-2 top-2 h-5 w-5 p-0"
                onClick={() => setSearchTerm("")}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          
          <ScrollArea className="h-[400px] pr-4">
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading catalog items...</div>
            ) : (
              <>
                {Object.keys(itemsByCategory()).length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">
                    No catalog items found matching your search.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(itemsByCategory()).map(([category, items]) => (
                      <Card key={category}>
                        <CardHeader className="py-3">
                          <CardTitle className="text-lg">{category}</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3">
                          {items.map((item) => (
                            <Card 
                              key={item.id} 
                              className="cursor-pointer hover:bg-accent/50 transition-colors"
                              onClick={() => handleItemSelect(item)}
                            >
                              <CardContent className="p-3">
                                <div className="flex justify-between items-start">
                                  <div className="space-y-1">
                                    <h4 className="font-medium">{item.name}</h4>
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                      {item.description}
                                    </p>
                                  </div>
                                  <p className="font-medium text-right">
                                    {formatCurrency(item.unitPrice)}
                                  </p>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            )}
          </ScrollArea>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}