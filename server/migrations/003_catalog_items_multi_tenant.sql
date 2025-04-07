-- Add tenant_id column to catalog_items table if it doesn't exist
DO $$
DECLARE
    default_tenant_id INTEGER;
BEGIN
    -- First check if we need to add the column
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns 
                  WHERE table_name='catalog_items' AND column_name='tenant_id') THEN
        -- Get the first tenant ID to use as default for existing records
        SELECT id INTO default_tenant_id FROM tenants LIMIT 1;
        
        -- Add column as nullable first
        ALTER TABLE catalog_items ADD COLUMN tenant_id INTEGER;
        
        -- Update existing records with the default tenant ID
        IF default_tenant_id IS NOT NULL THEN
            UPDATE catalog_items SET tenant_id = default_tenant_id;
        END IF;
        
        -- Now add the NOT NULL constraint and foreign key
        ALTER TABLE catalog_items 
            ALTER COLUMN tenant_id SET NOT NULL,
            ADD CONSTRAINT fk_catalog_items_tenant 
            FOREIGN KEY (tenant_id) REFERENCES tenants(id);
    END IF;
END
$$;

-- Add new columns to catalog_items if they don't exist
DO $$
BEGIN
    IF NOT EXISTS(SELECT 1 FROM information_schema.columns 
                  WHERE table_name='catalog_items' AND column_name='sku') THEN
        ALTER TABLE catalog_items ADD COLUMN sku TEXT;
    END IF;

    IF NOT EXISTS(SELECT 1 FROM information_schema.columns 
                  WHERE table_name='catalog_items' AND column_name='type') THEN
        ALTER TABLE catalog_items ADD COLUMN type TEXT DEFAULT 'product';
    END IF;

    IF NOT EXISTS(SELECT 1 FROM information_schema.columns 
                  WHERE table_name='catalog_items' AND column_name='active') THEN
        ALTER TABLE catalog_items ADD COLUMN active BOOLEAN DEFAULT TRUE;
    END IF;
END
$$;