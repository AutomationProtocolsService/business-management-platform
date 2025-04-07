import { db } from "../db";
import { eq } from "drizzle-orm";
import { quotes, invoices } from "../../shared/schema";

/**
 * Generates a numbered document ID with a specified prefix
 * @param prefix The document prefix (e.g., "QUO", "INV")
 * @param tenantId The ID of the tenant
 * @returns A formatted document number string
 */
export async function getNumberedDocument(
  prefix: string,
  tenantId?: number
): Promise<string> {
  let count: number;
  
  if (prefix === "QUO") {
    count = await countQuotesForTenant(tenantId);
  } else if (prefix === "INV") {
    count = await countInvoicesForTenant(tenantId);
  } else {
    // Generic counter fallback
    count = Math.floor(Math.random() * 10000);
  }
  
  // Increment for the new document
  count += 1;
  
  // Format with padding and leading zeros
  const paddedCount = String(count).padStart(5, "0");
  
  // Combine prefix and count with tenant context
  const docNumber = tenantId 
    ? `${prefix}-${tenantId}-${paddedCount}` 
    : `${prefix}-${paddedCount}`;
  
  return docNumber;
}

/**
 * Counts the number of quotes for a specific tenant
 * @param tenantId The ID of the tenant
 * @returns The count of quotes for the tenant
 */
export async function countQuotesForTenant(tenantId?: number): Promise<number> {
  try {
    let query = db.select({ count: db.fn.count() }).from(quotes);
    
    if (tenantId) {
      query = query.where(eq(quotes.tenantId, tenantId));
    }
    
    const result = await query;
    return Number(result[0]?.count || 0);
  } catch (error) {
    console.error('Error counting quotes:', error);
    return 0;
  }
}

/**
 * Counts the number of invoices for a specific tenant
 * @param tenantId The ID of the tenant
 * @returns The count of invoices for the tenant
 */
export async function countInvoicesForTenant(tenantId?: number): Promise<number> {
  try {
    let query = db.select({ count: db.fn.count() }).from(invoices);
    
    if (tenantId) {
      query = query.where(eq(invoices.tenantId, tenantId));
    }
    
    const result = await query;
    return Number(result[0]?.count || 0);
  } catch (error) {
    console.error('Error counting invoices:', error);
    return 0;
  }
}