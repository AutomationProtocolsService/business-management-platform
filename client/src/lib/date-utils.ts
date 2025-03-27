import { format, parseISO, isValid } from "date-fns";

// Format a date as a string, with a fallback for invalid dates
export function formatDate(date: Date | string | undefined | null, formatString: string = "PPP"): string {
  if (!date) return "N/A";
  
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    if (!isValid(dateObj)) return "Invalid date";
    return format(dateObj, formatString);
  } catch (error) {
    console.error("Error formatting date:", error);
    return "Invalid date";
  }
}

// Format a date as a relative time (e.g., "2 hours ago")
export function formatRelativeTime(date: Date | string | undefined | null): string {
  if (!date) return "N/A";
  
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    if (!isValid(dateObj)) return "Invalid date";
    
    const now = new Date();
    const diffMs = now.getTime() - dateObj.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);
    
    if (diffSec < 60) return `${diffSec} seconds ago`;
    if (diffMin < 60) return `${diffMin} minutes ago`;
    if (diffHour < 24) return `${diffHour} hours ago`;
    if (diffDay < 30) return `${diffDay} days ago`;
    
    // If more than a month, just return the date
    return format(dateObj, "PPP");
  } catch (error) {
    console.error("Error formatting relative time:", error);
    return "Invalid date";
  }
}

// Get a datetime string suitable for datetime-local inputs
export function getInputDateTimeString(date: Date | string | undefined | null): string {
  if (!date) return "";
  
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    if (!isValid(dateObj)) return "";
    return format(dateObj, "yyyy-MM-dd'T'HH:mm");
  } catch (error) {
    console.error("Error formatting input datetime:", error);
    return "";
  }
}

// Get a date string suitable for date inputs
export function getInputDateString(date: Date | string | undefined | null): string {
  if (!date) return "";
  
  try {
    const dateObj = typeof date === "string" ? parseISO(date) : date;
    if (!isValid(dateObj)) return "";
    return format(dateObj, "yyyy-MM-dd");
  } catch (error) {
    console.error("Error formatting input date:", error);
    return "";
  }
}

// Get the name of a month from its index (0-11)
export function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month % 12]; // Use modulo to handle out-of-range values
}
