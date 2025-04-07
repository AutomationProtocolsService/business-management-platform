import { useTerminology, getPlural } from "@/hooks/use-terminology";

/**
 * Hook for generating page titles with proper terminology
 * 
 * This hook returns a properly formatted title using the tenant's custom
 * terminology for common pages in the application. It also returns a 
 * descriptive subtitle if provided.
 * 
 * @param key The terminology key for the page (e.g., 'customer', 'quote', etc.)
 * @param options Configuration options for the title
 * @returns An object with formatted title and subtitle
 */
export function usePageTitle(
  key: keyof ReturnType<typeof useTerminology>,
  options: {
    isPlural?: boolean;
    isLowercase?: boolean;
    action?: 'new' | 'edit' | 'view' | 'manage';
    subtitle?: string;
  } = {}
) {
  const terminology = useTerminology();
  const { isPlural = true, isLowercase = false, action, subtitle } = options;
  
  // Get the base term from terminology using the provided key
  let term = terminology[key] || key;
  
  // Convert to plural if needed
  if (isPlural) {
    term = getPlural(term);
  }
  
  // Format based on action
  let title = term;
  if (action) {
    switch (action) {
      case 'new':
        title = `New ${isPlural ? term.slice(0, -1) : term}`;
        break;
      case 'edit':
        title = `Edit ${isPlural ? term.slice(0, -1) : term}`;
        break;
      case 'view':
        title = `${isPlural ? term.slice(0, -1) : term} Details`;
        break;
      case 'manage':
        title = `Manage ${term}`;
        break;
    }
  }
  
  // Convert to lowercase if requested
  if (isLowercase) {
    title = title.toLowerCase();
  }
  
  return { 
    title,
    subtitle: subtitle || `Manage your ${isLowercase ? term.toLowerCase() : term}`
  };
}