import { useSettings } from "@/hooks/use-settings";

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
}

export function useTerminology(): Terminology {
  const { settings } = useSettings();
  
  // If custom terminology exists in settings, merge it with defaults
  const customTerminology = settings?.customTerminology || {};
  
  return {
    ...defaultTerminology,
    ...customTerminology,
  };
}

// Utility function to get plural forms
export function getPlural(term: string): string {
  // Handle some special cases
  if (term.toLowerCase().endsWith('y')) {
    return term.slice(0, -1) + 'ies';
  }
  
  // Default to adding 's'
  return term + 's';
}