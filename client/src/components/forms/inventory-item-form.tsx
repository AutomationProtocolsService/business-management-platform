import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  insertInventoryItemSchema, 
  InventoryItem, 
  InsertInventoryItem,
  Supplier
} from "@shared/schema";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/hooks/use-settings";

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
import { 
  Loader2,
  ImageIcon,
  Barcode,
  DollarSign
} from "lucide-react";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Extend the schema with additional validation
const formSchema = insertInventoryItemSchema.extend({
  // Add any additional validation if needed
});

type FormValues = z.infer<typeof formSchema>;

interface InventoryItemFormProps {
  item?: InventoryItem | null;
  onSuccess?: () => void;
}

const INVENTORY_CATEGORIES = [
  "Raw Materials",
  "Finished Goods",
  "Spare Parts",
  "Supplies",
  "Work in Progress",
  "Tools",
  "Equipment",
  "Office Supplies",
  "Packaging",
  "Other",
];

const UNITS_OF_MEASURE = [
  "Each",
  "Box",
  "Pack",
  "Pair",
  "Dozen",
  "Case",
  "Pallet",
  "Roll",
  "Sheet",
  "Meter",
  "Foot",
  "Inch",
  "Kilogram",
  "Gram",
  "Pound",
  "Liter",
  "Gallon",
  "Milliliter",
];

export default function InventoryItemForm({ item, onSuccess }: InventoryItemFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { formatMoney } = useSettings();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<string>("basic");

  // Get suppliers for dropdown
  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  // Generate a SKU
  const generateSKU = () => {
    const prefix = form.getValues("category")?.substring(0, 3).toUpperCase() || "INV";
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    return `${prefix}-${random}`;
  };

  // Create form with default values
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: item?.name || "",
      sku: item?.sku || "",
      description: item?.description || "",
      category: item?.category || "Raw Materials",
      unitOfMeasure: item?.unitOfMeasure || "Each",
      currentStock: item?.currentStock || 0,
      reorderPoint: item?.reorderPoint || 5,
      maxStock: item?.maxStock || 100,
      location: item?.location || "",
      costPrice: item?.costPrice || 0,
      sellingPrice: item?.sellingPrice || 0,
      imageUrl: item?.imageUrl || "",
      supplierId: item?.supplierId,
      notes: item?.notes || "",
      active: item?.active ?? true,
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: InsertInventoryItem) => {
      const res = await apiRequest("POST", "/api/inventory", data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Inventory item created",
        description: "The inventory item has been added successfully.",
      });
      // Invalidate query to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating inventory item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<InventoryItem>) => {
      const res = await apiRequest("PATCH", `/api/inventory/${item?.id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Inventory item updated",
        description: "The inventory item has been updated successfully.",
      });
      // Invalidate query to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });
      if (onSuccess) onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating inventory item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = async (data: FormValues) => {
    if (!user) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to manage inventory.",
        variant: "destructive",
      });
      return;
    }

    // Upload image if available
    let imageUrl = item?.imageUrl;
    if (imageFile) {
      // In a real app, we would upload the file to cloud storage here
      // and get the URL back. For now, we'll just simulate that.
      imageUrl = URL.createObjectURL(imageFile);
      
      toast({
        title: "Image upload",
        description: "In a production app, the image would be uploaded to cloud storage.",
      });
    }

    const itemData = {
      ...data,
      imageUrl,
      createdBy: user.id,
    };

    if (item) {
      updateMutation.mutate(itemData);
    } else {
      createMutation.mutate(itemData);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setImageFile(e.target.files[0]);
    }
  };

  // Generate a new SKU
  const handleGenerateSKU = () => {
    form.setValue("sku", generateSKU());
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Tabs defaultValue="basic" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="basic">Basic Information</TabsTrigger>
            <TabsTrigger value="inventory">Inventory Details</TabsTrigger>
          </TabsList>
          
          <TabsContent value="basic" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                {/* Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Item Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Glass Panel 10mm Clear" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* SKU */}
                <FormField
                  control={form.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU *</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Barcode className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                          <Input placeholder="RAW-0001" className="pl-8" {...field} />
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="absolute right-1 top-1"
                            onClick={handleGenerateSKU}
                          >
                            Generate
                          </Button>
                        </div>
                      </FormControl>
                      <FormDescription>
                        Stock keeping unit - a unique identifier for this item
                      </FormDescription>
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
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {INVENTORY_CATEGORIES.map((category) => (
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

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Detailed description of the item" 
                          className="min-h-[100px]"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-6">
                {/* Image Upload */}
                <div className="space-y-2">
                  <Label htmlFor="image">Item Image (Optional)</Label>
                  <div className="border-2 border-dashed border-gray-300 rounded-md p-6 bg-gray-50 flex flex-col items-center justify-center">
                    {imageFile ? (
                      <div className="text-center">
                        <div className="w-24 h-24 mx-auto bg-gray-200 rounded-md flex items-center justify-center mb-2 overflow-hidden">
                          <img 
                            src={URL.createObjectURL(imageFile)} 
                            alt="Preview" 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p className="text-sm font-medium">{imageFile.name}</p>
                        <p className="text-xs text-gray-500">{Math.round(imageFile.size / 1024)} KB</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="mt-2"
                          onClick={() => setImageFile(null)}
                        >
                          Remove
                        </Button>
                      </div>
                    ) : item?.imageUrl ? (
                      <div className="text-center">
                        <div className="w-24 h-24 mx-auto bg-gray-200 rounded-md flex items-center justify-center mb-2 overflow-hidden">
                          <img 
                            src={item.imageUrl} 
                            alt={item.name} 
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <p className="text-sm font-medium">Current Image</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => document.getElementById("image")?.click()}
                        >
                          Replace
                        </Button>
                      </div>
                    ) : (
                      <>
                        <ImageIcon className="h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500 mb-1">Drag and drop or click to upload</p>
                        <p className="text-xs text-gray-400">JPG, PNG up to 5MB</p>
                        <Input
                          id="image"
                          type="file"
                          accept=".jpg,.jpeg,.png"
                          className="hidden"
                          onChange={handleFileChange}
                        />
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="mt-2"
                          onClick={() => document.getElementById("image")?.click()}
                        >
                          Select File
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {/* Unit of Measure */}
                <FormField
                  control={form.control}
                  name="unitOfMeasure"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit of Measure *</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {UNITS_OF_MEASURE.map((unit) => (
                            <SelectItem key={unit} value={unit}>
                              {unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        How this item is measured or counted
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Supplier */}
                <FormField
                  control={form.control}
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Supplier (Optional)</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)} 
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a supplier" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {suppliers.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id.toString()}>
                              {supplier.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Main supplier for this inventory item
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cost Price */}
              <FormField
                control={form.control}
                name="costPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost Price</FormLabel>
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
                    <FormDescription>
                      What you pay for each unit
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Selling Price */}
              <FormField
                control={form.control}
                name="sellingPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Selling Price</FormLabel>
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
                    <FormDescription>
                      What you charge for each unit
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="mt-4">
              <Button 
                type="button" 
                variant="outline"
                className="w-full"
                onClick={() => setActiveTab("inventory")}
              >
                Next: Inventory Details
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="inventory" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Current Stock */}
              <FormField
                control={form.control}
                name="currentStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Stock *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        min="0"
                        step="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Current quantity in stock
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Reorder Point */}
              <FormField
                control={form.control}
                name="reorderPoint"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reorder Point *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        min="0"
                        step="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Minimum stock level before reordering
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Max Stock */}
              <FormField
                control={form.control}
                name="maxStock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Maximum Stock *</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        min="0"
                        step="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                      />
                    </FormControl>
                    <FormDescription>
                      Maximum amount to keep in stock
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Location */}
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Storage Location</FormLabel>
                    <FormControl>
                      <Input placeholder="Warehouse A, Shelf B3" {...field} />
                    </FormControl>
                    <FormDescription>
                      Where this item is stored
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Additional information about this inventory item" 
                      className="min-h-[100px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Active */}
            <FormField
              control={form.control}
              name="active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <input
                      type="checkbox"
                      checked={field.value}
                      onChange={field.onChange}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Active Item
                    </FormLabel>
                    <FormDescription>
                      Inactive items won't appear in dropdown lists for new transactions
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />

            <div className="mt-4 flex justify-between">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setActiveTab("basic")}
              >
                Back to Basic Info
              </Button>
              <Button 
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="flex items-center gap-1"
              >
                {(createMutation.isPending || updateMutation.isPending) && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                {item ? "Update Item" : "Create Item"}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </form>
    </Form>
  );
}