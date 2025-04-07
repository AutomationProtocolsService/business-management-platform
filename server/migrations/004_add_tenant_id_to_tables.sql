-- Migration: Add tenant_id to all core tables
-- Created at: 2025-04-07T19:30:00.000Z

DO $$
DECLARE
    default_tenant_id INTEGER;
    tables_to_update TEXT[] := ARRAY['projects', 'quotes', 'invoices', 'customers', 
                                     'employees', 'timesheets', 'surveys', 'installations', 
                                     'task_lists', 'tasks', 'suppliers', 'quote_items', 
                                     'invoice_items'];
    current_table TEXT;
BEGIN
    -- Get the first tenant ID to use as default for existing records
    SELECT id INTO default_tenant_id FROM tenants LIMIT 1;
    
    -- If we don't have any tenants, create a default one
    IF default_tenant_id IS NULL THEN
        INSERT INTO tenants (name, subdomain, contact_email, primary_color, plan, created_at)
        VALUES ('Business Management SaaS', 'default', 'admin@example.com', '#1E40AF', 'basic', NOW())
        RETURNING id INTO default_tenant_id;
    END IF;
    
    -- Process each table
    FOREACH current_table IN ARRAY tables_to_update
    LOOP
        -- Check if the table exists and doesn't already have tenant_id
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_name = current_table 
              AND table_schema = 'public'
        ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = current_table 
              AND column_name = 'tenant_id'
        ) THEN
            -- Add tenant_id column as nullable first
            EXECUTE format('ALTER TABLE %I ADD COLUMN tenant_id INTEGER', current_table);
            
            -- Update existing records with the default tenant ID
            IF default_tenant_id IS NOT NULL THEN
                EXECUTE format('UPDATE %I SET tenant_id = %L', current_table, default_tenant_id);
            END IF;
            
            -- Add NOT NULL constraint and foreign key
            EXECUTE format('
                ALTER TABLE %I 
                ALTER COLUMN tenant_id SET NOT NULL,
                ADD CONSTRAINT %I 
                FOREIGN KEY (tenant_id) REFERENCES tenants(id)', 
                current_table, 'fk_' || current_table || '_tenant');
        END IF;
    END LOOP;
    
    -- Special case for child tables quote_items and invoice_items
    -- These should inherit tenant_id from their parent tables rather than having their own foreign key
    FOR current_table IN (
        SELECT 'quote_items' AS name UNION SELECT 'invoice_items' AS name
    ) LOOP
        -- Check if table has direct tenant_id (which we just added)
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = current_table
            AND column_name = 'tenant_id'
        ) THEN
            -- Remove the tenant_id column since we'll rely on the parent table relationship
            EXECUTE format('
                ALTER TABLE %I 
                DROP CONSTRAINT IF EXISTS %I,
                DROP COLUMN IF EXISTS tenant_id', 
                current_table, 'fk_' || current_table || '_tenant');
        END IF;
    END LOOP;
END
$$;
