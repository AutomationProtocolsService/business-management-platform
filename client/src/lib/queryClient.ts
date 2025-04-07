import { QueryClient, QueryFunction } from "@tanstack/react-query";
import axios, { AxiosError, AxiosResponse } from 'axios';

/**
 * Custom API error class with structured error data
 */
export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;
  code?: string;
  
  constructor(message: string, status: number, errors?: Record<string, string[]>, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errors = errors;
    this.code = code;
  }
  
  static fromResponse(res: Response, data: any): ApiError {
    return new ApiError(
      data?.message || `${res.status}: ${res.statusText}`,
      res.status,
      data?.errors,
      data?.code
    );
  }
  
  static fromAxiosError(error: AxiosError): ApiError {
    const response = error.response;
    const data = response?.data as any;
    
    return new ApiError(
      data?.message || error.message || 'An unexpected error occurred',
      response?.status || 500,
      data?.errors,
      data?.code
    );
  }
}

/**
 * Process a response and throw an ApiError if it's not OK
 */
async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    try {
      // First try to parse as JSON for structured error messages
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errorData = await res.json();
        throw ApiError.fromResponse(res, errorData);
      } else {
        // If it's not JSON, read as text
        const text = await res.text();
        
        // Check if the text contains HTML (likely an error page)
        if (text.includes('<!DOCTYPE') || text.includes('<html')) {
          throw new ApiError(`${res.status}: ${res.statusText}`, res.status);
        } else {
          throw new ApiError(text || `${res.status}: ${res.statusText}`, res.status);
        }
      }
    } catch (e) {
      // If any parsing fails, provide a fallback error
      if (e instanceof ApiError) {
        throw e;
      }
      
      throw new ApiError(
        e instanceof Error ? e.message : `${res.status}: ${res.statusText}`,
        res.status
      );
    }
  }
}

/**
 * Make an API request using fetch
 */
export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
  options?: { responseType?: 'json' | 'text' | 'blob'; headers?: Record<string, string> }
): Promise<Response> {
  try {
    const headers: Record<string, string> = {
      ...(data && { "Content-Type": "application/json" }),
      ...(options?.headers || {})
    };

    const res = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
      credentials: "include",
    });

    // Skip error checking for blob responses, will handle in the component
    if (options?.responseType === 'blob') {
      return res;
    }

    await throwIfResNotOk(res);
    return res;
  } catch (error) {
    // Enhance error reporting for network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError(
        'Network error. Please check your internet connection.',
        0,
        undefined,
        'NETWORK_ERROR'
      );
    }
    throw error;
  }
}

/**
 * Get JSON data from an API request
 */
export async function apiRequestJson<T>(
  method: string,
  url: string,
  data?: unknown
): Promise<T> {
  const res = await apiRequest(method, url, data);
  return await res.json() as T;
}

/**
 * Response behavior for unauthorized requests
 */
type UnauthorizedBehavior = "returnNull" | "throw";

/**
 * Create a query function for react-query
 */
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    try {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      await throwIfResNotOk(res);
      return await res.json();
    } catch (error) {
      // Better reporting for network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new ApiError(
          'Network error. Please check your internet connection.',
          0,
          undefined,
          'NETWORK_ERROR'
        );
      }
      throw error;
    }
  };

/**
 * Global React Query client configuration
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: (failureCount, error) => {
        // Don't retry on client errors (4xx)
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false;
        }
        
        // Retry server errors and network issues a few times
        return failureCount < 2;
      },
    },
    mutations: {
      retry: false,
    },
  },
});
