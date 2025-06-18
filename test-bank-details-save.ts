/**
 * Test script to verify bank details are being saved and retrieved correctly
 */

import { storage } from './server/storage';

async function testBankDetailsSave() {
  console.log('Testing bank details save and retrieval...');
  
  try {
    // Get current company settings
    const currentSettings = await storage.getCompanySettings();
    console.log('Current bank details:', {
      bankAccountName: currentSettings?.bankAccountName,
      bankName: currentSettings?.bankName,
      bankSortCode: currentSettings?.bankSortCode,
      bankAccountNumber: currentSettings?.bankAccountNumber
    });
    
    // Update company settings with bank details
    const testBankDetails = {
      bankAccountName: 'Lancashire shopfronts LTD',
      bankName: 'HSBC bank',
      bankSortCode: '040404',
      bankAccountNumber: '45123455'
    };
    
    let updatedSettings;
    if (currentSettings) {
      console.log('Updating existing settings with bank details...');
      updatedSettings = await storage.updateCompanySettings(currentSettings.id, testBankDetails);
    } else {
      console.log('Creating new settings with bank details...');
      updatedSettings = await storage.createCompanySettings({
        companyName: 'Test Company',
        ...testBankDetails
      });
    }
    
    console.log('Updated settings:', {
      bankAccountName: updatedSettings?.bankAccountName,
      bankName: updatedSettings?.bankName,
      bankSortCode: updatedSettings?.bankSortCode,
      bankAccountNumber: updatedSettings?.bankAccountNumber
    });
    
    // Verify by fetching again
    const verifySettings = await storage.getCompanySettings();
    console.log('Verification - retrieved bank details:', {
      bankAccountName: verifySettings?.bankAccountName,
      bankName: verifySettings?.bankName,
      bankSortCode: verifySettings?.bankSortCode,
      bankAccountNumber: verifySettings?.bankAccountNumber
    });
    
    console.log('Bank details test completed successfully!');
    
  } catch (error) {
    console.error('Error testing bank details:', error);
  }
}

testBankDetailsSave();