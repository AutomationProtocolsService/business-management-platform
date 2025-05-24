import { test, expect } from '@playwright/test';

test.describe('Installation Scheduling', () => {
  test('should be able to schedule an installation for an accepted quote', async ({ page }) => {
    // Login
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait for login to complete and redirect
    await page.waitForURL('/dashboard');
    
    // Navigate to quotes page
    await page.click('a[href="/quotes"]');
    await page.waitForURL('/quotes');
    
    // Find an accepted quote and click on it
    // (We're looking for quotes with the status "accepted")
    await page.waitForSelector('table');
    
    // Find quotes with "accepted" status
    const acceptedQuoteRow = await page.locator('tr', {
      has: page.locator('span.badge', { hasText: 'accepted' })
    }).first();
    
    // Click to view the quote details
    await acceptedQuoteRow.locator('a').first().click();
    
    // Wait for quote details page to load
    await page.waitForSelector('h1:has-text("Quote Details")');
    
    // Click the Schedule Installation button
    await page.click('button:has-text("Schedule Installation")');
    
    // Wait for modal to appear
    await page.waitForSelector('div[role="dialog"]');
    
    // Fill the installation form
    await page.fill('input[type="date"]', new Date().toISOString().split('T')[0]);
    
    // Select a status
    await page.click('button:has-text("Select status")');
    await page.click('div[role="option"]:has-text("Scheduled")');
    
    // Add notes
    await page.fill('textarea', 'Test installation notes from Playwright test');
    
    // Submit the form
    await page.click('[data-testid="schedule-installation-submit"]');
    
    // Wait for success toast
    await expect(page.locator('.toast')).toContainText('Installation scheduled');
    
    // Verify the modal is closed
    await expect(page.locator('div[role="dialog"]')).toBeHidden();
  });
});