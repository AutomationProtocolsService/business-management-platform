import { useSettings } from "@/hooks/use-settings";
import { useTenant } from "@/hooks/use-tenant";

// Define default terminology
const defaultTerminology = {
  survey: "Survey",
  installation: "Installation",
  quote: "Quote",
  invoice: "Invoice",
  project: "Project",
  customer: "Customer",
  employee: "Employee",
  timesheet: "Timesheet",
  supplier: "Supplier",
  expense: "Expense",
  purchaseOrder: "Purchase Order",
  inventory: "Inventory",
  task: "Task",
  payment: "Payment",
  service: "Service",
  product: "Product",
  lead: "Lead",
  opportunity: "Opportunity",
  contract: "Contract",
  milestone: "Milestone",
};

// Define interface for terminology
export interface Terminology {
  survey: string;
  installation: string;
  quote: string;
  invoice: string;
  project: string;
  customer: string;
  employee: string;
  timesheet: string;
  supplier: string;
  expense: string;
  purchaseOrder: string;
  inventory: string;
  task: string;
  payment: string;
  service: string;
  product: string;
  lead: string;
  opportunity: string;
  contract: string;
  milestone: string;
}

/**
 * Hook for accessing tenant-specific terminology
 * 
 * This hook combines terminology from multiple sources in order of priority:
 * 1. Tenant-specific terminology (from tenant.customTerminology)
 * 2. Company settings terminology (from settings.customTerminology)
 * 3. Default terminology
 * 
 * @returns An object containing all terminology terms
 */
export function useTerminology(): Terminology {
  const { settings } = useSettings();
  const { tenant } = useTenant();
  
  // Tenant terminology has highest priority
  const tenantTerminology = tenant?.customTerminology || {};
  
  // Company settings terminology has second priority
  const settingsTerminology = settings?.customTerminology || {};
  
  // Combine all terminology sources with appropriate priority
  return {
    ...defaultTerminology,          // Default terms (lowest priority)
    ...settingsTerminology,         // Company settings terms (medium priority)
    ...tenantTerminology,           // Tenant-specific terms (highest priority)
  };
}

/**
 * Utility function to get plural forms of terminology
 * 
 * @param term The singular term to pluralize
 * @returns The pluralized term
 */
export function getPlural(term: string): string {
  // Handle special cases
  if (term.toLowerCase().endsWith('y')) {
    return term.slice(0, -1) + 'ies';
  }
  
  // Handle terms that end with 'order'
  if (term.toLowerCase().endsWith('order')) {
    return term + 's';
  }
  
  // Handle terms that already include a space
  if (term.includes(' ')) {
    const words = term.split(' ');
    const lastWord = words[words.length - 1];
    // Check if last word ends with 'y'
    if (lastWord.toLowerCase().endsWith('y')) {
      words[words.length - 1] = lastWord.slice(0, -1) + 'ies';
      return words.join(' ');
    }
    words[words.length - 1] = lastWord + 's';
    return words.join(' ');
  }
  
  // Default to adding 's'
  return term + 's';
}