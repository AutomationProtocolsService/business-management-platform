import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useSettings } from "@/hooks/use-settings";
import { useTerminology, Terminology } from "@/hooks/use-terminology";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

// Company settings form schema
const companyFormSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  email: z.string().email("Must be a valid email").or(z.string().length(0)),
  phone: z.string().optional(),
  address: z.string().optional(),
  website: z.string().url("Must be a valid URL").or(z.string().length(0)),
  taxId: z.string().optional(),
  currencyCode: z.string().min(1, "Currency code is required"),
  defaultTaxRate: z.number().min(0).max(100),
  termsAndConditions: z.string().optional(),
});

type CompanyFormValues = z.infer<typeof companyFormSchema>;

// System settings form schema
const systemFormSchema = z.object({
  darkMode: z.boolean().default(false),
  emailNotifications: z.boolean().default(true),
  autoSave: z.boolean().default(true),
  defaultPageSize: z.number().min(5).max(100).default(10),
});

type SystemFormValues = z.infer<typeof systemFormSchema>;

export default function SettingsPage() {
  const { settings, updateSettingsMutation, updateSystemSettingsMutation, isLoading: settingsLoading } = useSettings();
  const { toast } = useToast();
  const terminology = useTerminology();
  const [activeTab, setActiveTab] = useState("company");
  const [selectedTerm, setSelectedTerm] = useState<{ key: keyof Terminology; value: string } | null>(null);
  
  // Terminology update mutation
  const updateTerminologyMutation = useMutation({
    mutationFn: async (data: { [key: string]: string }) => {
      // Format the data for the API
      const customTerminology = { ...settings?.customTerminology, ...data };
      
      // Update the company settings with the new terminology
      const res = await apiRequest("PATCH", "/api/settings/company", { 
        customTerminology
      });
      return await res.json();
    },
    onSuccess: (updatedSettings) => {
      // Use the settings mutation to update the global state
      queryClient.setQueryData(["/api/settings/company"], updatedSettings);
      toast({
        title: "Terminology updated",
        description: "Your custom terminology has been saved successfully.",
      });
      setSelectedTerm(null); // Close the dialog
    },
    onError: (error: Error) => {
      console.error("Failed to update terminology:", error);
      toast({
        title: "Error updating terminology",
        description: error.message || "Failed to update terminology",
        variant: "destructive",
      });
    },
  });

  // Company settings form
  const companyForm = useForm<CompanyFormValues>({
    resolver: zodResolver(companyFormSchema),
    defaultValues: {
      companyName: settings?.companyName || "",
      email: settings?.email || "",
      phone: settings?.phone || "",
      address: settings?.address || "",
      website: settings?.website || "",
      taxId: settings?.taxId || "",
      currencyCode: settings?.currencyCode || "USD",
      defaultTaxRate: settings?.defaultTaxRate || 0,
      termsAndConditions: settings?.termsAndConditions || "",
    },
  });

  // System settings form
  const systemForm = useForm<SystemFormValues>({
    resolver: zodResolver(systemFormSchema),
    defaultValues: {
      darkMode: settings?.darkMode || false,
      emailNotifications: settings?.emailNotifications || true,
      autoSave: settings?.autoSave || true,
      defaultPageSize: settings?.defaultPageSize || 10,
    },
  });

  // Local company settings mutation
  const localCompanySettingsMutation = useMutation({
    mutationFn: async (data: CompanyFormValues) => {
      // Extract only the values we want to update
      const updatedData = {
        companyName: data.companyName,
        email: data.email,
        phone: data.phone,
        address: data.address,
        website: data.website,
        taxId: data.taxId,
        currencyCode: data.currencyCode,
        defaultTaxRate: data.defaultTaxRate,
        termsAndConditions: data.termsAndConditions,
      };
      
      // Direct update to the correct endpoint
      const res = await apiRequest("PATCH", "/api/settings/company", updatedData);
      return await res.json();
    },
    onSuccess: (updatedSettings) => {
      // Use the settings mutation to update the global state
      updateSettingsMutation.mutate({ ...settings, ...updatedSettings });
      toast({
        title: "Company settings updated",
        description: "Your company settings have been saved successfully.",
      });
    },
    onError: (error: Error) => {
      console.error("Failed to update company settings:", error);
      toast({
        title: "Error updating settings",
        description: error.message || "Failed to update company settings",
        variant: "destructive",
      });
    },
  });

  // Local system settings mutation
  const localSystemSettingsMutation = useMutation({
    mutationFn: async (data: SystemFormValues) => {
      // Extract only the values we want to update
      const updatedData = {
        darkMode: data.darkMode,
        emailNotifications: data.emailNotifications,
        autoSave: data.autoSave,
        defaultPageSize: data.defaultPageSize,
      };
      
      // Direct update to the correct endpoint
      const res = await apiRequest("PATCH", "/api/settings/system", updatedData);
      return await res.json();
    },
    onSuccess: (updatedSettings) => {
      // Use the settings mutation to update the global state
      updateSystemSettingsMutation.mutate({ ...settings, ...updatedSettings });
      toast({
        title: "System settings updated",
        description: "Your system settings have been saved successfully.",
      });
    },
    onError: (error: Error) => {
      console.error("Failed to update system settings:", error);
      toast({
        title: "Error updating settings",
        description: error.message || "Failed to update system settings",
        variant: "destructive",
      });
    },
  });

  // Handle company form submission
  const onCompanySubmit = (data: CompanyFormValues) => {
    localCompanySettingsMutation.mutate(data);
  };

  // Handle system form submission
  const onSystemSubmit = (data: SystemFormValues) => {
    localSystemSettingsMutation.mutate(data);
  };

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-2">Settings</h1>
      <p className="text-muted-foreground mb-6">
        Configure your application and company settings
      </p>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="company">Company Settings</TabsTrigger>
          <TabsTrigger value="system">System Settings</TabsTrigger>
          <TabsTrigger value="terminology">Terminology</TabsTrigger>
        </TabsList>

        {/* Company Settings Tab */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>
                These details will appear on your quotes, invoices, and other documents
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...companyForm}>
                <form
                  id="company-settings-form"
                  onSubmit={companyForm.handleSubmit(onCompanySubmit)}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={companyForm.control}
                      name="companyName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your Company Name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={companyForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="company@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={companyForm.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone</FormLabel>
                          <FormControl>
                            <Input placeholder="(123) 456-7890" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={companyForm.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input placeholder="https://yourcompany.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={companyForm.control}
                      name="taxId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tax ID / VAT Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Tax ID or VAT Number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={companyForm.control}
                      name="currencyCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Currency Code</FormLabel>
                          <FormControl>
                            <Input placeholder="USD" {...field} />
                          </FormControl>
                          <FormDescription>
                            Currency code (e.g., USD, EUR, GBP)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={companyForm.control}
                      name="defaultTaxRate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Default Tax Rate (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={companyForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter your company address"
                            className="resize-none h-20"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={companyForm.control}
                    name="termsAndConditions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Terms and Conditions</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Enter your default terms and conditions"
                            className="resize-none h-32"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          These will be included by default on new quotes and invoices
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </form>
              </Form>
            </CardContent>
            <CardFooter className="border-t px-6 py-4 flex justify-end">
              <Button
                type="submit"
                form="company-settings-form"
                disabled={localCompanySettingsMutation.isPending}
              >
                {localCompanySettingsMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  "Save Company Settings"
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* System Settings Tab */}
        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>System Settings</CardTitle>
              <CardDescription>
                Configure application behavior and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...systemForm}>
                <form
                  id="system-settings-form"
                  onSubmit={systemForm.handleSubmit(onSystemSubmit)}
                  className="space-y-6"
                >
                  <div className="space-y-4">
                    <FormField
                      control={systemForm.control}
                      name="darkMode"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Dark Mode</FormLabel>
                            <FormDescription>
                              Enable dark mode for the application
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={systemForm.control}
                      name="emailNotifications"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Email Notifications</FormLabel>
                            <FormDescription>
                              Receive email notifications for important events
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={systemForm.control}
                      name="autoSave"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Auto-Save</FormLabel>
                            <FormDescription>
                              Automatically save form data while editing
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={systemForm.control}
                      name="defaultPageSize"
                      render={({ field }) => (
                        <FormItem className="grid grid-cols-12 items-center gap-4 rounded-lg border p-4">
                          <div className="col-span-8 space-y-0.5">
                            <FormLabel className="text-base">Default Page Size</FormLabel>
                            <FormDescription>
                              Number of items to show per page in tables
                            </FormDescription>
                          </div>
                          <FormControl className="col-span-4">
                            <Input
                              type="number"
                              min="5"
                              max="100"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="col-span-12" />
                        </FormItem>
                      )}
                    />
                  </div>
                </form>
              </Form>
            </CardContent>
            <CardFooter className="border-t px-6 py-4 flex justify-end">
              <Button
                type="submit"
                form="system-settings-form"
                disabled={localSystemSettingsMutation.isPending}
              >
                {localSystemSettingsMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  "Save System Settings"
                )}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Terminology Tab */}
        <TabsContent value="terminology">
          <Card>
            <CardHeader>
              <CardTitle>Customize Terminology</CardTitle>
              <CardDescription>
                Customize the business terms used throughout the application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <h4 className="text-base font-medium">Project</h4>
                      <p className="text-sm text-muted-foreground">
                        Current term: <span className="font-medium">{terminology.project}</span>
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedTerm({ key: 'project', value: terminology.project })}
                    >
                      Change
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <h4 className="text-base font-medium">Quote</h4>
                      <p className="text-sm text-muted-foreground">
                        Current term: <span className="font-medium">{terminology.quote}</span>
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedTerm({ key: 'quote', value: terminology.quote })}
                    >
                      Change
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <h4 className="text-base font-medium">Survey</h4>
                      <p className="text-sm text-muted-foreground">
                        Current term: <span className="font-medium">{terminology.survey}</span>
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedTerm({ key: 'survey', value: terminology.survey })}
                    >
                      Change
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <h4 className="text-base font-medium">Employee</h4>
                      <p className="text-sm text-muted-foreground">
                        Current term: <span className="font-medium">{terminology.employee}</span>
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedTerm({ key: 'employee', value: terminology.employee })}
                    >
                      Change
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <h4 className="text-base font-medium">Invoice</h4>
                      <p className="text-sm text-muted-foreground">
                        Current term: <span className="font-medium">{terminology.invoice}</span>
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedTerm({ key: 'invoice', value: terminology.invoice })}
                    >
                      Change
                    </Button>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <h4 className="text-base font-medium">Customer</h4>
                      <p className="text-sm text-muted-foreground">
                        Current term: <span className="font-medium">{terminology.customer}</span>
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedTerm({ key: 'customer', value: terminology.customer })}
                    >
                      Change
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <h4 className="text-base font-medium">Installation</h4>
                      <p className="text-sm text-muted-foreground">
                        Current term: <span className="font-medium">{terminology.installation}</span>
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedTerm({ key: 'installation', value: terminology.installation })}
                    >
                      Change
                    </Button>
                  </div>
                  
                  <div className="flex items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <h4 className="text-base font-medium">Timesheet</h4>
                      <p className="text-sm text-muted-foreground">
                        Current term: <span className="font-medium">{terminology.timesheet}</span>
                      </p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedTerm({ key: 'timesheet', value: terminology.timesheet })}
                    >
                      Change
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Term editing dialog */}
          <Dialog open={!!selectedTerm} onOpenChange={(open) => !open && setSelectedTerm(null)}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Edit Term: {selectedTerm?.key}</DialogTitle>
              </DialogHeader>
              <div className="py-4">
                <div className="space-y-4">
                  <div className="grid w-full gap-1.5">
                    <label htmlFor="term" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                      New term
                    </label>
                    <Input
                      id="term"
                      placeholder="Enter new term"
                      value={selectedTerm?.value || ""}
                      onChange={(e) => setSelectedTerm(prev => prev ? { ...prev, value: e.target.value } : null)}
                      className="col-span-3"
                    />
                    <p className="text-sm text-muted-foreground">
                      This will replace all instances of "{selectedTerm?.key}" with your custom term.
                    </p>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setSelectedTerm(null)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    if (selectedTerm) {
                      // Create an object with just the one terminology change
                      const data = { [selectedTerm.key]: selectedTerm.value };
                      updateTerminologyMutation.mutate(data);
                    }
                  }}
                  disabled={updateTerminologyMutation.isPending}
                >
                  {updateTerminologyMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Save Change"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}