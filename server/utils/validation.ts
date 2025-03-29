import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';

/**
 * Email validation pattern
 */
const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Phone number validation pattern - supports various formats
 */
const PHONE_PATTERN = /^(\+\d{1,3})?[-.\s]?\(?\d{1,3}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}$/;

/**
 * Standard validation messages
 */
export const ValidationMessages = {
  required: 'This field is required',
  minLength: (min: number) => `Must be at least ${min} characters`,
  maxLength: (max: number) => `Cannot exceed ${max} characters`,
  email: 'Please enter a valid email address',
  phone: 'Please enter a valid phone number',
  numeric: 'Please enter a valid number',
  date: 'Please enter a valid date',
  url: 'Please enter a valid URL',
  passwordMatch: 'Passwords do not match',
  weakPassword: 'Password must be at least 8 characters and include a number, uppercase letter, and special character',
  invalidUsername: 'Username can only contain letters, numbers, and underscores',
  uniqueConstraint: (field: string) => `This ${field} is already in use`,
  minValue: (min: number) => `Value must be at least ${min}`,
  maxValue: (max: number) => `Value cannot exceed ${max}`,
  invalidFormat: 'Invalid format',
  invalidOption: 'Please select a valid option',
  invalidPostalCode: 'Please enter a valid postal/zip code',
};

/**
 * Custom Zod schema extensions for common business validations
 */
export const extendZodSchemas = () => {
  // Email validation
  z.string().email = () => 
    z.string()
      .trim()
      .min(5, { message: ValidationMessages.required })
      .regex(EMAIL_PATTERN, { message: ValidationMessages.email });
  
  // Phone number validation
  z.string().phone = () => 
    z.string()
      .trim()
      .regex(PHONE_PATTERN, { message: ValidationMessages.phone })
      .nullable()
      .optional();
  
  // Postal/ZIP code validation - generic pattern
  z.string().postalCode = () => 
    z.string()
      .trim()
      .min(3, { message: ValidationMessages.invalidPostalCode })
      .max(12, { message: ValidationMessages.invalidPostalCode })
      .nullable()
      .optional();
  
  // Strong password validation
  z.string().password = () => 
    z.string()
      .trim()
      .min(8, { message: ValidationMessages.minLength(8) })
      .regex(/^(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/, { 
        message: ValidationMessages.weakPassword 
      });
  
  // Currency amount validation
  z.number().currency = () => 
    z.number()
      .min(0, { message: ValidationMessages.minValue(0) })
      .multipleOf(0.01, { message: 'Amount must have at most 2 decimal places' });
  
  // Percentage validation
  z.number().percentage = () => 
    z.number()
      .min(0, { message: ValidationMessages.minValue(0) })
      .max(100, { message: ValidationMessages.maxValue(100) });
};

// Extend Zod types with our custom validators
declare module 'zod' {
  interface ZodString {
    email: () => z.ZodString;
    phone: () => z.ZodString;
    postalCode: () => z.ZodString;
    password: () => z.ZodString;
  }
  
  interface ZodNumber {
    currency: () => z.ZodNumber;
    percentage: () => z.ZodNumber;
  }
}

// Call the extension function to register our custom validators
extendZodSchemas();

/**
 * Enhanced error handling for Zod validations
 * @param result The Zod validation result
 * @returns Formatted error message or null if validation passed
 */
export function handleValidationResult<T>(result: z.SafeParseReturnType<T, T>): { success: boolean; data?: T; error?: string } {
  if (!result.success) {
    const errorMessage = fromZodError(result.error).message;
    return {
      success: false,
      error: errorMessage
    };
  }
  
  return {
    success: true,
    data: result.data
  };
}

/**
 * Validate an object against a schema and return formatted errors
 * @param schema The Zod schema to validate against
 * @param data The data to validate
 * @returns Validation result with formatted errors if any
 */
export function validateSchema<T>(schema: z.ZodType<T>, data: unknown): { success: boolean; data?: T; error?: string } {
  const result = schema.safeParse(data);
  return handleValidationResult(result);
}

/**
 * Type-safe data sanitizer that ensures all required fields are present
 * and removes any unexpected fields.
 * @param data The input data to sanitize
 * @param schema The Zod schema to validate against
 * @returns Sanitized data object or null if validation fails
 */
export function sanitizeData<T>(data: unknown, schema: z.ZodType<T>): T | null {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error('Data validation failed:', fromZodError(result.error).message);
    return null;
  }
  return result.data;
}

/**
 * Type guard to check if a value is not null or undefined
 */
export function isNotNullOrUndefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Function to safely transform an object by applying a transformation function
 * to the fields that match specified type conditions
 */
export function safeTransform<T extends Record<string, any>>(
  obj: Partial<T>,
  transformer: (key: string, value: any) => any,
  condition?: (value: any) => boolean
): Partial<T> {
  const result: Partial<T> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (!condition || condition(value)) {
      result[key as keyof T] = transformer(key, value);
    } else {
      result[key as keyof T] = value;
    }
  }
  
  return result;
}

/**
 * Process date strings into Date objects for database storage
 */
export function processDates<T extends Record<string, any>>(obj: Partial<T>): Partial<T> {
  return safeTransform(
    obj,
    (key, value) => {
      if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
        return new Date(value);
      }
      return value;
    },
    (value) => typeof value === 'string'
  );
}

/**
 * Process all string fields to ensure proper trimming and null handling
 */
export function processStrings<T extends Record<string, any>>(obj: Partial<T>): Partial<T> {
  return safeTransform(
    obj,
    (key, value) => {
      if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed === '' ? null : trimmed;
      }
      return value;
    },
    (value) => typeof value === 'string'
  );
}

/**
 * Process numeric strings into actual numbers
 */
export function processNumbers<T extends Record<string, any>>(obj: Partial<T>): Partial<T> {
  return safeTransform(
    obj,
    (key, value) => {
      if (typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value)) {
        return parseFloat(value);
      }
      return value;
    },
    (value) => typeof value === 'string'
  );
}

/**
 * Comprehensive data processor that applies all sanitization steps
 */
export function processInput<T extends Record<string, any>>(data: Partial<T>): Partial<T> {
  return processNumbers(processDates(processStrings(data)));
}