// Common types used across the application

export interface User {
  id: number;
  tenantId: number;
  username: string;
  password: string;
  email: string;
  fullName: string;
  role: string; // 'admin', 'manager', 'employee'
  active: boolean;
  createdAt: Date;
  lastLogin: Date | null;
}

export interface Customer {
  id: number;
  tenantId: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  notes?: string;
  status?: string;
  createdAt: Date;
  createdBy?: number;
  updatedAt?: Date;
}

export interface TenantFilter {
  tenantId: number;
  source?: string;
}

// Generic object type for tenant-specific settings and configuration
export interface TenantSettings {
  [key: string]: any;
}

// Custom terminology mapping for tenant-specific UI labels
export interface CustomTerminology {
  survey?: string;
  installation?: string;
  quote?: string;
  invoice?: string;
  project?: string;
  customer?: string;
  employee?: string;
  timesheet?: string;
  supplier?: string;
  expense?: string;
  purchaseOrder?: string;
  inventory?: string;
}