import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency: string = 'USD', symbol?: string): string {
  if (symbol) {
    // If a symbol is provided, use it directly with the number
    return `${symbol}${amount.toFixed(2)}`;
  }
  
  // Otherwise use the Intl.NumberFormat with the provided currency code
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

// Common currency codes for reference
export const CURRENCY_OPTIONS = [
  { value: 'USD', label: 'US Dollar ($)', symbol: '$' },
  { value: 'EUR', label: 'Euro (€)', symbol: '€' },
  { value: 'GBP', label: 'British Pound (£)', symbol: '£' },
  { value: 'JPY', label: 'Japanese Yen (¥)', symbol: '¥' },
  { value: 'CAD', label: 'Canadian Dollar (C$)', symbol: 'C$' },
  { value: 'AUD', label: 'Australian Dollar (A$)', symbol: 'A$' },
  { value: 'INR', label: 'Indian Rupee (₹)', symbol: '₹' },
  { value: 'CNY', label: 'Chinese Yuan (¥)', symbol: '¥' },
  { value: 'BRL', label: 'Brazilian Real (R$)', symbol: 'R$' },
  { value: 'ZAR', label: 'South African Rand (R)', symbol: 'R' },
  { value: 'MXN', label: 'Mexican Peso (Mex$)', symbol: 'Mex$' },
  { value: 'SGD', label: 'Singapore Dollar (S$)', symbol: 'S$' },
  { value: 'CHF', label: 'Swiss Franc (Fr)', symbol: 'Fr' },
  { value: 'SEK', label: 'Swedish Krona (kr)', symbol: 'kr' },
  { value: 'NZD', label: 'New Zealand Dollar (NZ$)', symbol: 'NZ$' },
];
