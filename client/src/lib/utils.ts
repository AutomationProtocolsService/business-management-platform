import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
 
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type CurrencyOption = {
  label: string;
  value: string;
  symbol: string;
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { label: "USD ($)", value: "USD", symbol: "$" },
  { label: "EUR (€)", value: "EUR", symbol: "€" },
  { label: "GBP (£)", value: "GBP", symbol: "£" },
  { label: "JPY (¥)", value: "JPY", symbol: "¥" },
  { label: "CAD ($)", value: "CAD", symbol: "$" },
  { label: "AUD ($)", value: "AUD", symbol: "$" },
  { label: "CHF (Fr)", value: "CHF", symbol: "Fr" },
  { label: "CNY (¥)", value: "CNY", symbol: "¥" },
  { label: "INR (₹)", value: "INR", symbol: "₹" },
  { label: "BRL (R$)", value: "BRL", symbol: "R$" },
  { label: "ZAR (R)", value: "ZAR", symbol: "R" },
  { label: "MXN ($)", value: "MXN", symbol: "$" },
  { label: "SGD ($)", value: "SGD", symbol: "$" },
  { label: "NZD ($)", value: "NZD", symbol: "$" },
  { label: "SEK (kr)", value: "SEK", symbol: "kr" },
  { label: "RUB (₽)", value: "RUB", symbol: "₽" },
  { label: "HKD ($)", value: "HKD", symbol: "$" },
  { label: "NOK (kr)", value: "NOK", symbol: "kr" },
  { label: "KRW (₩)", value: "KRW", symbol: "₩" },
  { label: "TRY (₺)", value: "TRY", symbol: "₺" },
];

export const formatCurrency = (
  amount: number | string, 
  currency: string = 'USD', 
  localeCode: string = 'en-US'
): string => {
  // Convert amount to number if it's a string
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Handle NaN or invalid numeric input
  if (isNaN(numericAmount)) {
    return '—';
  }

  try {
    return new Intl.NumberFormat(localeCode, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  } catch (error) {
    // Fallback in case of invalid currency code or locale
    const currencyOption = CURRENCY_OPTIONS.find(opt => opt.value === currency);
    const symbol = currencyOption?.symbol || '$';
    return `${symbol}${numericAmount.toFixed(2)}`;
  }
}