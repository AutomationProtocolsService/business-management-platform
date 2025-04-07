import { createContext, ReactNode, useContext, useState, useEffect } from "react";
import { Tenant as SelectTenant } from "@shared/schema";
import { queryClient } from "../lib/queryClient";

// Define the expected tenant type explicitly
interface Tenant {
  id: number;
  name: string;
  subdomain: string;
  status: string | null;
  active: boolean;
  companyName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  logoUrl: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  taxId: string | null;
  settings: Record<string, any> | null;
}

interface TenantContextType {
  tenant: Tenant | null;
  isLoading: boolean;
  error: Error | null;
}

export const TenantContext = createContext<TenantContextType | null>(null);

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchTenant() {
      try {
        setIsLoading(true);
        const response = await fetch("/api/tenant", { 
          credentials: "include" 
        });
        
        if (response.status === 401) {
          setTenant(null);
          setError(null);
          return;
        }
        
        if (!response.ok) {
          throw new Error(`Failed to fetch tenant: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success && data.tenant) {
          setTenant(data.tenant as Tenant);
        } else {
          console.warn("Tenant data not found or invalid format", data);
          setTenant(null);
        }
      } catch (err) {
        console.error("Error fetching tenant:", err);
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchTenant();
  }, []);

  return (
    <TenantContext.Provider
      value={{
        tenant,
        isLoading,
        error
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