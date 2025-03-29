import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertCompanySettingsSchema } from "@shared/schema";
import { z } from "zod";
import { useSettings } from "@/hooks/use-settings";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { CURRENCY_OPTIONS } from "@/lib/utils";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, SaveIcon } from "lucide-react";

// Extend the schema with additional validation
const formSchema = insertCompanySettingsSchema.extend({
  // Add any additional validation if needed
});

type FormValues = z.infer<typeof formSchema>;

export default function SettingsPage() {
  const { user } = useAuth();
  const { settings, isLoading, updateSettingsMutation } = useSettings();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("general");
  
  // Initialize form with existing settings if available
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: "",
      companyLogo: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
      phone: "",
      email: "",
      website: "",
      vatNumber: "",
      registrationNumber: "",
      certifications: [],
      defaultInvoiceTerms: "",
      defaultQuoteTerms: "",
      bankDetails: "",
      footerText: "",
      primaryColor: "#2563eb",
      currency: "USD",
      currencySymbol: "$",
      customTerminology: {
        survey: "",
        installation: "",
        quote: "",
        invoice: "",
        project: "",
        customer: "",
        employee: "",
        timesheet: "",
      },
    },
  });

  // Update form when settings load
  useEffect(() => {
    if (settings) {
      form.reset({
        ...settings,
        companyName: settings.companyName || "",
        companyLogo: settings.companyLogo || "",
        address: settings.address || "",
        city: settings.city || "",
        state: settings.state || "",
        zipCode: settings.zipCode || "",
        country: settings.country || "",
        phone: settings.phone || "",
        email: settings.email || "",
        website: settings.website || "",
        vatNumber: settings.vatNumber || "",
        registrationNumber: settings.registrationNumber || "",
        certifications: settings.certifications || [],
        defaultInvoiceTerms: settings.defaultInvoiceTerms || "",
        defaultQuoteTerms: settings.defaultQuoteTerms || "",
        bankDetails: settings.bankDetails || "",
        footerText: settings.footerText || "",
        primaryColor: settings.primaryColor || "#2563eb",
        currency: settings.currency || "USD",
        currencySymbol: settings.currencySymbol || "$",
        customTerminology: settings.customTerminology || {
          survey: "",
          installation: "",
          quote: "",
          invoice: "",
          project: "",
          customer: "",
          employee: "",
          timesheet: "",
        },
      });
    }
  }, [settings, form]);

  // Handle form submission
  const onSubmit = async (data: FormValues) => {
    if (user) {
      // Add the user ID as the updatedBy field
      const formData = { ...data, updatedBy: user.id };
      updateSettingsMutation.mutate(formData);
    } else {
      toast({
        title: "Authentication required",
        description: "You must be logged in to update settings.",
        variant: "destructive",
      });
    }
  };

  // Handle currency selection (auto-set symbol)
  const handleCurrencyChange = (value: string) => {
    // Find the corresponding currency symbol
    const currency = CURRENCY_OPTIONS.find(option => option.value === value);
    if (currency) {
      form.setValue("currencySymbol", currency.symbol);
    }
    form.setValue("currency", value);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Company Settings</h1>
      <p className="text-muted-foreground mb-6">
        Manage your company information, branding, and default settings.
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="financial">Financial</TabsTrigger>
              <TabsTrigger value="branding">Branding</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="terminology">Terminology</TabsTrigger>
            </TabsList>
            
            {/* General Information */}
            <TabsContent value="general" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Company Information</CardTitle>
                  <CardDescription>
                    Basic information about your company
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
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
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="+1 (555) 123-4567" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input placeholder="contact@example.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Separator className="my-4" />
                  
                  <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input placeholder="123 Main St" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input placeholder="New York" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="state"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>State/Province</FormLabel>
                          <FormControl>
                            <Input placeholder="NY" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="zipCode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Postal/Zip Code</FormLabel>
                          <FormControl>
                            <Input placeholder="10001" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="country"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Country</FormLabel>
                          <FormControl>
                            <Input placeholder="United States" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Registration Details</CardTitle>
                  <CardDescription>
                    Legal and registration information
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="vatNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>VAT/Tax Number</FormLabel>
                          <FormControl>
                            <Input placeholder="VAT12345678" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="registrationNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Company Registration Number</FormLabel>
                          <FormControl>
                            <Input placeholder="REG12345678" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Financial Settings */}
            <TabsContent value="financial" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Currency & Financial Settings</CardTitle>
                  <CardDescription>
                    Configure currency and payment details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="currency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Currency</FormLabel>
                          <Select 
                            onValueChange={handleCurrencyChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a currency" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {CURRENCY_OPTIONS.map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="currencySymbol"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Currency Symbol</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="$" 
                              {...field} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="bankDetails"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bank Account Details</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Bank: Example Bank&#10;Account Name: Your Company Name&#10;Account Number: 123456789&#10;Sort Code/Routing: 01-02-03" 
                            className="min-h-[100px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Branding */}
            <TabsContent value="branding" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Branding & Appearance</CardTitle>
                  <CardDescription>
                    Customize your company's visual identity
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="companyLogo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Logo URL</FormLabel>
                        <FormControl>
                          <Input placeholder="https://example.com/logo.png" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="primaryColor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Brand Color</FormLabel>
                        <div className="flex gap-4">
                          <FormControl>
                            <Input type="color" {...field} className="w-12 h-10 p-1" />
                          </FormControl>
                          <Input
                            value={field.value}
                            onChange={field.onChange}
                            className="flex-1"
                            placeholder="#2563eb"
                          />
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="certifications"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Certifications (comma-separated)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="ISO9001, ISO14001"
                            value={field.value?.join(", ") || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              field.onChange(
                                value ? value.split(",").map((item) => item.trim()) : []
                              );
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Document Settings */}
            <TabsContent value="documents" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Document Templates</CardTitle>
                  <CardDescription>
                    Default text for quotes, invoices and other documents
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="defaultQuoteTerms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Quote Terms & Conditions</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter your default terms and conditions for quotes..." 
                            className="min-h-[150px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="defaultInvoiceTerms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Invoice Terms & Conditions</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Enter your default terms and conditions for invoices..." 
                            className="min-h-[150px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="footerText"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Document Footer Text</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Thank you for your business!" 
                            className="min-h-[80px]"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Terminology Customization */}
            <TabsContent value="terminology" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Terminology Customization</CardTitle>
                  <CardDescription>
                    Personalize business terms to match your industry or preferences
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground mb-4">
                    Customize the terminology used throughout the application to better match your business needs.
                    Leave a field blank to use the default term.
                  </p>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="customTerminology.survey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>"Survey" Alternative</FormLabel>
                          <FormControl>
                            <Input placeholder="Survey" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="customTerminology.installation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>"Installation" Alternative</FormLabel>
                          <FormControl>
                            <Input placeholder="Installation" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="customTerminology.quote"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>"Quote" Alternative</FormLabel>
                          <FormControl>
                            <Input placeholder="Quote" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="customTerminology.invoice"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>"Invoice" Alternative</FormLabel>
                          <FormControl>
                            <Input placeholder="Invoice" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="customTerminology.project"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>"Project" Alternative</FormLabel>
                          <FormControl>
                            <Input placeholder="Project" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="customTerminology.customer"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>"Customer" Alternative</FormLabel>
                          <FormControl>
                            <Input placeholder="Customer" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="customTerminology.employee"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>"Employee" Alternative</FormLabel>
                          <FormControl>
                            <Input placeholder="Employee" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="customTerminology.timesheet"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>"Timesheet" Alternative</FormLabel>
                          <FormControl>
                            <Input placeholder="Timesheet" {...field} value={field.value || ""} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end">
            <Button 
              type="submit" 
              disabled={updateSettingsMutation.isPending}
              className="flex items-center gap-2"
            >
              {updateSettingsMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <SaveIcon className="h-4 w-4" />
              )}
              Save Settings
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}