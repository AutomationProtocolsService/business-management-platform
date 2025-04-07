/**
 * Date Utility Functions
 * 
 * Helper functions for date formatting and manipulation
 */

/**
 * Format a date string based on the group type
 * 
 * @param dateStr The date string to format
 * @param groupType The type of grouping (day, week, month, year)
 * @returns Formatted date string
 */
export function formatDate(dateStr: string, groupType: string = 'month'): string {
  const date = new Date(dateStr);
  
  switch (groupType.toLowerCase()) {
    case 'day':
      return date.toISOString().slice(0, 10); // YYYY-MM-DD
    case 'week':
      const weekNum = getISOWeek(date);
      return `${date.getFullYear()}-W${weekNum.toString().padStart(2, '0')}`;
    case 'month':
      return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    case 'quarter':
      return formatQuarter(date);
    case 'year':
      return date.getFullYear().toString();
    default:
      return date.toISOString().slice(0, 10); // YYYY-MM-DD
  }
}

/**
 * Calculate the ISO week number for a date
 * 
 * @param date The date to get the week number for
 * @returns Week number (1-53)
 */
export function getISOWeek(date: Date): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday's day number 7
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  // Get first day of year
  const yearStart = new Date(d.getFullYear(), 0, 1);
  // Calculate full weeks to nearest Thursday
  const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  
  return weekNum;
}

/**
 * Get the date range for common time periods
 * 
 * @param period The time period (today, yesterday, this_week, last_week, this_month, etc.)
 * @returns Object with startDate and endDate
 */
export function getDateRange(period: string): { startDate: string, endDate: string } {
  let startDate: Date;
  let endDate: Date;
  
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (period) {
    case 'today':
      startDate = today;
      endDate = today;
      break;
      
    case 'yesterday':
      startDate = new Date(today);
      startDate.setDate(startDate.getDate() - 1);
      endDate = startDate;
      break;
      
    case 'this_week':
      startDate = new Date(today);
      startDate.setDate(today.getDate() - today.getDay()); // Sunday is 0
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6); // Saturday
      break;
      
    case 'last_week':
      startDate = new Date(today);
      startDate.setDate(today.getDate() - today.getDay() - 7);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      break;
      
    case 'this_month':
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
      endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      break;
      
    case 'last_month':
      startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      endDate = new Date(today.getFullYear(), today.getMonth(), 0);
      break;
      
    case 'this_quarter':
      const currentQuarter = Math.floor(today.getMonth() / 3);
      startDate = new Date(today.getFullYear(), currentQuarter * 3, 1);
      endDate = new Date(today.getFullYear(), (currentQuarter + 1) * 3, 0);
      break;
      
    case 'last_quarter':
      const lastQuarter = Math.floor(today.getMonth() / 3) - 1;
      const lastQuarterYear = lastQuarter < 0 ? today.getFullYear() - 1 : today.getFullYear();
      const adjustedQuarter = lastQuarter < 0 ? 3 : lastQuarter;
      startDate = new Date(lastQuarterYear, adjustedQuarter * 3, 1);
      endDate = new Date(lastQuarterYear, (adjustedQuarter + 1) * 3, 0);
      break;
      
    case 'this_year':
      startDate = new Date(today.getFullYear(), 0, 1);
      endDate = new Date(today.getFullYear(), 11, 31);
      break;
      
    case 'last_year':
      startDate = new Date(today.getFullYear() - 1, 0, 1);
      endDate = new Date(today.getFullYear() - 1, 11, 31);
      break;
      
    case 'last_7_days':
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 6);
      endDate = today;
      break;
      
    case 'last_30_days':
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 29);
      endDate = today;
      break;
      
    case 'last_90_days':
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 89);
      endDate = today;
      break;
      
    case 'last_365_days':
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 364);
      endDate = today;
      break;
      
    default:
      // Default to last 30 days
      startDate = new Date(today);
      startDate.setDate(today.getDate() - 29);
      endDate = today;
  }
  
  return {
    startDate: formatDateForAPI(startDate),
    endDate: formatDateForAPI(endDate)
  };
}

/**
 * Format a date for API use (YYYY-MM-DD)
 * 
 * @param date The date to format
 * @returns Date string in YYYY-MM-DD format
 */
export function formatDateForAPI(date: Date): string {
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
}

/**
 * Get the current date in YYYY-MM-DD format
 * 
 * @returns Current date in YYYY-MM-DD format
 */
export function getCurrentDate(): string {
  return formatDateForAPI(new Date());
}

/**
 * Calculate difference between two dates in days
 * 
 * @param date1 First date
 * @param date2 Second date
 * @returns Number of days difference
 */
export function daysBetween(date1: Date, date2: Date): number {
  const oneDay = 24 * 60 * 60 * 1000; // hours*minutes*seconds*milliseconds
  const diffDays = Math.round(Math.abs((date1.getTime() - date2.getTime()) / oneDay));
  return diffDays;
}

/**
 * Format a date as a human-readable string
 * 
 * @param date The date to format
 * @param includeTime Whether to include the time
 * @returns Formatted date string
 */
export function formatDateHuman(date: Date, includeTime: boolean = false): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  
  if (includeTime) {
    options.hour = '2-digit';
    options.minute = '2-digit';
  }
  
  return date.toLocaleDateString('en-US', options);
}

/**
 * Get a past date by subtracting days from today
 * 
 * @param days Number of days to subtract
 * @returns Date in the past
 */
export function getPastDate(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

/**
 * Get a future date by adding days to today
 * 
 * @param days Number of days to add
 * @returns Date in the future
 */
export function getFutureDate(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

/**
 * Check if a date is in the past
 * 
 * @param date The date to check
 * @returns True if the date is in the past
 */
export function isDateInPast(date: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  date.setHours(0, 0, 0, 0);
  return date < today;
}

/**
 * Get the quarter (1-4) for a given date
 * 
 * @param date The date to get the quarter for
 * @returns Quarter number (1-4)
 */
export function getQuarter(date: Date): number {
  return Math.floor(date.getMonth() / 3) + 1;
}

/**
 * Format a date as Year-Quarter (e.g., 2023-Q1)
 * 
 * @param date The date to format
 * @returns Formatted quarter string
 */
export function formatQuarter(date: Date): string {
  const quarter = getQuarter(date);
  return `${date.getFullYear()}-Q${quarter}`;
}