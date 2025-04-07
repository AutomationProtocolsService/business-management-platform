// This script automates the replacement of direct tenantId references
// with the standardized helper functions getTenantFilterFromRequest and getTenantIdFromRequest

const fs = require('fs');

const filePath = 'server/routes.ts';
const content = fs.readFileSync(filePath, 'utf8');

// Replace pattern 1: const tenantFilter = req.tenantId ? { tenantId: req.tenantId } : undefined;
let updatedContent = content.replace(
  /const tenantFilter = req\.tenantId \? \{ tenantId: req\.tenantId \} : undefined;/g, 
  'const tenantFilter = getTenantFilterFromRequest(req);'
);

// Replace pattern 2: const tenantData = req.tenantId ? { tenantId: req.tenantId } : {};
updatedContent = updatedContent.replace(
  /const tenantData = req\.tenantId \? \{ tenantId: req\.tenantId \} : \{\};/g,
  'const tenantFilter = getTenantFilterFromRequest(req);\n      const tenantData = tenantFilter || {};'
);

// Replace pattern 3: const tenantId = req.tenantId;
updatedContent = updatedContent.replace(
  /const tenantId = req\.tenantId;/g,
  'const tenantId = getTenantIdFromRequest(req);'
);

// Replace pattern 4: Direct access to req.tenantId in functions
updatedContent = updatedContent.replace(
  /\(req\.tenantId\)/g,
  '(getTenantIdFromRequest(req))'
);

// Replace direct property access: tenantId: req.tenantId
updatedContent = updatedContent.replace(
  /tenantId: req\.tenantId/g,
  'tenantId: getTenantIdFromRequest(req)'
);

fs.writeFileSync(filePath, updatedContent, 'utf8');
console.log('All replacements completed successfully');