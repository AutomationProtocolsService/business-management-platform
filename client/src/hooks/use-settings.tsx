import { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertCompanySettingsSchema, CompanySettings } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";

type SettingsContextType = {
  settings: CompanySettings | null;
  isLoading: boolean;
  error: Error | null;
  updateSettingsMutation: UseMutationResult<CompanySettings, Error, Partial<CompanySettings>>;
  formatMoney: (amount: number) => string;
  getCurrencySymbol: () => string;
};

export const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const {
    data: settings,
    error,
    isLoading,
  } = useQuery<CompanySettings | undefined, Error>({
    queryKey: ["/api/settings"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Partial<CompanySettings>) => {
      if (!settings) {
        // If no settings exist, create new ones
        const res = await apiRequest("POST", "/api/settings", data);
        return await res.json();
      } else {
        // Otherwise update existing settings
        const res = await apiRequest("PATCH", `/api/settings/${settings.id}`, data);
        return await res.json();
      }
    },
    onSuccess: (updatedSettings: CompanySettings) => {
      queryClient.setQueryData(["/api/settings"], updatedSettings);
      toast({
        title: "Settings updated",
        description: "Company settings have been saved successfully.",
      });
      
      // Emit a server-side event via websocket that settings have been updated
      // This will be picked up by the notifications system
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update settings",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Helper function to format money according to the current currency settings
  const formatMoney = (amount: number): string => {
    return formatCurrency(
      amount,
      settings?.currency || "USD",
      settings?.currencySymbol
    );
  };

  // Helper function to get the currency symbol
  const getCurrencySymbol = (): string => {
    return settings?.currencySymbol || "$";
  };

  return (
    <SettingsContext.Provider
      value={{
        settings: settings ?? null,
        isLoading,
        error,
        updateSettingsMutation,
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