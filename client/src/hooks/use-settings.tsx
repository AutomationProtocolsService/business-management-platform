import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { 
  insertCompanySettingsSchema, 
  CompanySettings, 
  SystemSettings, 
  insertSystemSettingsSchema 
} from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

// Combined settings type that includes both company and system settings
type CombinedSettings = CompanySettings & Partial<SystemSettings>;

type SettingsContextType = {
  settings: CombinedSettings | null;
  isLoading: boolean;
  error: Error | null;
  updateSettingsMutation: UseMutationResult<CompanySettings, Error, Partial<CompanySettings>>;
  updateSystemSettingsMutation: UseMutationResult<SystemSettings, Error, Partial<SystemSettings>>;
  formatMoney: (amount: number) => string;
  getCurrencySymbol: () => string;
};

export const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  // Query for company settings
  const {
    data: companySettings,
    error: companyError,
    isLoading: companyLoading,
  } = useQuery<CompanySettings | undefined, Error>({
    queryKey: ["/api/settings/company"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  
  // Query for system settings
  const {
    data: systemSettings,
    error: systemError,
    isLoading: systemLoading,
  } = useQuery<SystemSettings | undefined, Error>({
    queryKey: ["/api/settings/system"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  
  // Combined loading and error states
  const isLoading = companyLoading || systemLoading;
  const error = companyError || systemError;
  
  // Combine settings for use in the app
  const combinedSettings: CombinedSettings | null = companySettings 
    ? { ...companySettings, ...(systemSettings || {}) } 
    : null;
  
  // Company settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<CompanySettings>) => {
      if (!companySettings) {
        // If no settings exist, create new ones
        const res = await apiRequest("POST", "/api/settings/company", data);
        return await res.json();
      } else {
        // Otherwise update existing settings using the endpoint without ID parameter
        const res = await apiRequest("PATCH", "/api/settings/company", data);
        return await res.json();
      }
    },
    onSuccess: (updatedSettings: CompanySettings) => {
      queryClient.setQueryData(["/api/settings/company"], updatedSettings);
      toast({
        title: "Settings updated",
        description: "Company settings have been saved successfully.",
      });
    },
    onError: (error: Error) => {
      console.error("Failed to update company settings:", error);
      toast({
        title: "Failed to update settings",
        description: error.message || "Failed to update company settings",
        variant: "destructive",
      });
    },
  });
  
  // System settings mutation
  const updateSystemSettingsMutation = useMutation({
    mutationFn: async (data: Partial<SystemSettings>) => {
      if (!systemSettings) {
        // If no settings exist, create new ones
        const res = await apiRequest("POST", "/api/settings/system", data);
        return await res.json();
      } else {
        // Otherwise update existing settings using the endpoint without ID parameter
        const res = await apiRequest("PATCH", "/api/settings/system", data);
        return await res.json();
      }
    },
    onSuccess: (updatedSettings: SystemSettings) => {
      queryClient.setQueryData(["/api/settings/system"], updatedSettings);
      toast({
        title: "Settings updated",
        description: "System settings have been saved successfully.",
      });
    },
    onError: (error: Error) => {
      console.error("Failed to update system settings:", error);
      toast({
        title: "Failed to update settings",
        description: error.message || "Failed to update system settings",
        variant: "destructive",
      });
    },
  });

  // Helper function to format money according to the current currency settings
  const formatMoney = (amount: number): string => {
    return formatCurrency(
      amount,
      companySettings?.currency || "USD",
      companySettings?.currencySymbol || undefined
    );
  };

  // Helper function to get the currency symbol
  const getCurrencySymbol = (): string => {
    return companySettings?.currencySymbol || "$";
  };

  return (
    <SettingsContext.Provider
      value={{
        settings: combinedSettings,
        isLoading,
        error,
        updateSettingsMutation,
        updateSystemSettingsMutation,
        formatMoney,
        getCurrencySymbol,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
}