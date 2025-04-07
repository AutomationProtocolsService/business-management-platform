import { createContext, ReactNode, useContext } from "react";
import { useQuery, UseQueryOptions } from "@tanstack/react-query";
import { Tenant as SelectTenant } from "@shared/schema";
import { getQueryFn } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TenantContextType {
  tenant: SelectTenant | null;
  isLoading: boolean;
  error: Error | null;
}

export const TenantContext = createContext<TenantContextType | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  
  // Define query options separately to fix type issues
  const queryOptions: UseQueryOptions<SelectTenant | null, Error> = {
    queryKey: ["/api/tenant"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  };
  
  const {
    data: tenant,
    error,
    isLoading,
  } = useQuery<SelectTenant | null, Error>(queryOptions);

  // Handle errors from tenant query
  if (error) {
    console.error("Tenant query error:", error);
    // Only show toast on network/server errors, not 401 unauthorized
    if (!(error instanceof Response && error.status === 401)) {
      toast({
        title: "Error loading tenant information",
        description: error.message || "Failed to load tenant data",
        variant: "destructive",
      });
    }
  }

  return (
    <TenantContext.Provider
      value={{
        tenant: tenant ?? null,
        isLoading,
        error,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}