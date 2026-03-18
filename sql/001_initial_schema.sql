<<<<<<< ours
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE currency_code AS ENUM ('ARS', 'USD', 'EUR', 'BRL', 'CLP', 'UYU');
CREATE TYPE user_role AS ENUM ('SUPERADMIN', 'ADMIN', 'ACCOUNTANT', 'AUDITOR', 'VIEWER');
CREATE TYPE account_type AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE', 'MEMORANDUM');
CREATE TYPE third_party_type AS ENUM ('CUSTOMER', 'SUPPLIER', 'EMPLOYEE', 'GOVERNMENT', 'OTHER');
CREATE TYPE period_status AS ENUM ('OPEN', 'CLOSED', 'LOCKED');
CREATE TYPE entry_source_type AS ENUM ('MANUAL', 'IMPORT', 'API', 'ADJUSTMENT', 'CONSOLIDATION');
CREATE TYPE entry_status AS ENUM ('DRAFT', 'POSTED', 'REVERSED', 'VOIDED');
CREATE TYPE batch_status AS ENUM ('DRAFT', 'VALIDATED', 'READY_TO_POST', 'POSTED', 'REJECTED');
CREATE TYPE consolidation_method AS ENUM ('FULL', 'PROPORTIONAL', 'EQUITY');
CREATE TYPE consolidation_run_status AS ENUM ('DRAFT', 'RUNNING', 'COMPLETED', 'APPROVED', 'REJECTED');
CREATE TYPE consolidation_entry_type AS ENUM ('AGGREGATION', 'ELIMINATION', 'ADJUSTMENT', 'RECLASSIFICATION');
CREATE TYPE audit_action AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'POST', 'APPROVE', 'LOGIN', 'LOGOUT');

CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(20) NOT NULL UNIQUE,
  legal_name varchar(200) NOT NULL,
  tax_id varchar(50),
  country_code char(2) NOT NULL,
  base_currency currency_code NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_companies_country_code_length CHECK (char_length(country_code) = 2)
);

CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email varchar(320) NOT NULL UNIQUE,
  full_name varchar(150) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE user_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  company_id uuid NOT NULL,
  role user_role NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_companies_user_company UNIQUE (user_id, company_id),
  CONSTRAINT fk_user_companies_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_companies_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE CASCADE
);

CREATE TABLE fiscal_periods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  period_name varchar(30) NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status period_status NOT NULL DEFAULT 'OPEN',
  locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_fiscal_periods_company_name UNIQUE (company_id, period_name),
  CONSTRAINT fk_fiscal_periods_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE RESTRICT,
  CONSTRAINT chk_fiscal_periods_range CHECK (start_date <= end_date)
);

CREATE TABLE chart_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  parent_account_id uuid,
  code varchar(30) NOT NULL,
  name varchar(150) NOT NULL,
  account_type account_type NOT NULL,
  allows_posting boolean NOT NULL DEFAULT true,
  level integer NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_chart_accounts_company_code UNIQUE (company_id, code),
  CONSTRAINT fk_chart_accounts_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE RESTRICT,
  CONSTRAINT fk_chart_accounts_parent FOREIGN KEY (parent_account_id) REFERENCES chart_accounts (id) ON DELETE RESTRICT,
  CONSTRAINT chk_chart_accounts_level CHECK (level > 0)
);

CREATE TABLE third_parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  code varchar(40) NOT NULL,
  name varchar(150) NOT NULL,
  third_party_type third_party_type NOT NULL,
  document_number varchar(50),
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_third_parties_company_code UNIQUE (company_id, code),
  CONSTRAINT fk_third_parties_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE RESTRICT
);

CREATE TABLE cost_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  code varchar(30) NOT NULL,
  name varchar(120) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_cost_centers_company_code UNIQUE (company_id, code),
  CONSTRAINT fk_cost_centers_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE RESTRICT
);

CREATE TABLE journals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  code varchar(20) NOT NULL,
  name varchar(80) NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_journals_company_code UNIQUE (company_id, code),
  CONSTRAINT fk_journals_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE RESTRICT
);

CREATE TABLE accounting_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  batch_number varchar(40) NOT NULL,
  source_system varchar(50) NOT NULL,
  status batch_status NOT NULL DEFAULT 'DRAFT',
  imported_at timestamptz,
  validated_at timestamptz,
  prepared_by_user_id uuid,
  posted_entry_id uuid UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_accounting_batches_company_number UNIQUE (company_id, batch_number),
  CONSTRAINT fk_accounting_batches_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE RESTRICT,
  CONSTRAINT fk_accounting_batches_user FOREIGN KEY (prepared_by_user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  journal_id uuid NOT NULL,
  period_id uuid NOT NULL,
  batch_id uuid,
  entry_number integer NOT NULL,
  entry_date date NOT NULL,
  posting_date date NOT NULL,
  description varchar(250) NOT NULL,
  source_type entry_source_type NOT NULL,
  status entry_status NOT NULL DEFAULT 'DRAFT',
  external_ref varchar(100),
  created_by_user_id uuid,
  posted_by_user_id uuid,
  reversed_entry_id uuid UNIQUE,
  posted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_journal_entries_company_period_number UNIQUE (company_id, period_id, entry_number),
  CONSTRAINT fk_journal_entries_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE RESTRICT,
  CONSTRAINT fk_journal_entries_journal FOREIGN KEY (journal_id) REFERENCES journals (id) ON DELETE RESTRICT,
  CONSTRAINT fk_journal_entries_period FOREIGN KEY (period_id) REFERENCES fiscal_periods (id) ON DELETE RESTRICT,
  CONSTRAINT fk_journal_entries_batch FOREIGN KEY (batch_id) REFERENCES accounting_batches (id) ON DELETE SET NULL,
  CONSTRAINT fk_journal_entries_created_by FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_journal_entries_posted_by FOREIGN KEY (posted_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_journal_entries_reversed_entry FOREIGN KEY (reversed_entry_id) REFERENCES journal_entries (id) ON DELETE SET NULL,
  CONSTRAINT chk_journal_entries_dates CHECK (entry_date <= posting_date)
);

ALTER TABLE accounting_batches
  ADD CONSTRAINT fk_accounting_batches_posted_entry FOREIGN KEY (posted_entry_id) REFERENCES journal_entries (id) ON DELETE SET NULL;

CREATE TABLE staging_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  batch_id uuid NOT NULL,
  line_no integer NOT NULL,
  account_code varchar(30) NOT NULL,
  third_party_code varchar(40),
  cost_center_code varchar(30),
  transaction_date date NOT NULL,
  description varchar(250),
  debit numeric(18,2) NOT NULL DEFAULT 0,
  credit numeric(18,2) NOT NULL DEFAULT 0,
  currency currency_code NOT NULL,
  is_valid boolean NOT NULL DEFAULT false,
  validation_errors jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_staging_entries_batch_line UNIQUE (batch_id, line_no),
  CONSTRAINT fk_staging_entries_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE RESTRICT,
  CONSTRAINT fk_staging_entries_batch FOREIGN KEY (batch_id) REFERENCES accounting_batches (id) ON DELETE CASCADE,
  CONSTRAINT chk_staging_entries_debit_credit CHECK (
    debit >= 0
    AND credit >= 0
    AND ((debit = 0 AND credit > 0) OR (credit = 0 AND debit > 0))
  )
);

CREATE TABLE journal_entry_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  journal_entry_id uuid NOT NULL,
  line_number integer NOT NULL,
  account_id uuid NOT NULL,
  third_party_id uuid,
  cost_center_id uuid,
  description varchar(250),
  debit numeric(18,2) NOT NULL DEFAULT 0,
  credit numeric(18,2) NOT NULL DEFAULT 0,
  currency currency_code NOT NULL,
  amount_currency numeric(18,2),
  exchange_rate numeric(18,8),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_journal_entry_lines_entry_line UNIQUE (journal_entry_id, line_number),
  CONSTRAINT fk_journal_entry_lines_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE RESTRICT,
  CONSTRAINT fk_journal_entry_lines_entry FOREIGN KEY (journal_entry_id) REFERENCES journal_entries (id) ON DELETE CASCADE,
  CONSTRAINT fk_journal_entry_lines_account FOREIGN KEY (account_id) REFERENCES chart_accounts (id) ON DELETE RESTRICT,
  CONSTRAINT fk_journal_entry_lines_third_party FOREIGN KEY (third_party_id) REFERENCES third_parties (id) ON DELETE RESTRICT,
  CONSTRAINT fk_journal_entry_lines_cost_center FOREIGN KEY (cost_center_id) REFERENCES cost_centers (id) ON DELETE RESTRICT,
  CONSTRAINT chk_journal_entry_lines_debit_credit CHECK (
    debit >= 0
    AND credit >= 0
    AND ((debit = 0 AND credit > 0) OR (credit = 0 AND debit > 0))
  ),
  CONSTRAINT chk_journal_entry_lines_exchange_rate CHECK (
    exchange_rate IS NULL OR exchange_rate > 0
  )
);

CREATE TABLE consolidation_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code varchar(20) NOT NULL UNIQUE,
  name varchar(150) NOT NULL,
  reporting_currency currency_code NOT NULL,
  owner_company_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_consolidation_groups_owner_company FOREIGN KEY (owner_company_id) REFERENCES companies (id) ON DELETE SET NULL
);

CREATE TABLE consolidation_group_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  company_id uuid NOT NULL,
  consolidation_method consolidation_method NOT NULL,
  ownership_percentage numeric(5,2) NOT NULL,
  effective_from date NOT NULL,
  effective_to date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_consolidation_group_companies_period UNIQUE (group_id, company_id, effective_from),
  CONSTRAINT fk_consolidation_group_companies_group FOREIGN KEY (group_id) REFERENCES consolidation_groups (id) ON DELETE CASCADE,
  CONSTRAINT fk_consolidation_group_companies_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE RESTRICT,
  CONSTRAINT chk_consolidation_group_companies_ownership CHECK (ownership_percentage > 0 AND ownership_percentage <= 100),
  CONSTRAINT chk_consolidation_group_companies_dates CHECK (effective_to IS NULL OR effective_from <= effective_to)
);

CREATE TABLE consolidation_account_maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  company_id uuid NOT NULL,
  source_account_id uuid NOT NULL,
  target_account_code varchar(30) NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_consolidation_account_maps_source UNIQUE (group_id, company_id, source_account_id),
  CONSTRAINT fk_consolidation_account_maps_group FOREIGN KEY (group_id) REFERENCES consolidation_groups (id) ON DELETE CASCADE,
  CONSTRAINT fk_consolidation_account_maps_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE RESTRICT,
  CONSTRAINT fk_consolidation_account_maps_source_account FOREIGN KEY (source_account_id) REFERENCES chart_accounts (id) ON DELETE RESTRICT
);

CREATE TABLE consolidation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL,
  run_name varchar(60) NOT NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  status consolidation_run_status NOT NULL DEFAULT 'DRAFT',
  initiated_by_user_id uuid,
  approved_by_user_id uuid,
  initiated_at timestamptz NOT NULL DEFAULT now(),
  approved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_consolidation_runs_group_name UNIQUE (group_id, run_name),
  CONSTRAINT fk_consolidation_runs_group FOREIGN KEY (group_id) REFERENCES consolidation_groups (id) ON DELETE CASCADE,
  CONSTRAINT fk_consolidation_runs_initiated_by FOREIGN KEY (initiated_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_consolidation_runs_approved_by FOREIGN KEY (approved_by_user_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT chk_consolidation_runs_period CHECK (period_start <= period_end)
);

CREATE TABLE consolidation_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL,
  source_company_id uuid,
  entry_type consolidation_entry_type NOT NULL,
  account_code varchar(30) NOT NULL,
  description varchar(250),
  debit numeric(18,2) NOT NULL DEFAULT 0,
  credit numeric(18,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_consolidation_entries_run FOREIGN KEY (run_id) REFERENCES consolidation_runs (id) ON DELETE CASCADE,
  CONSTRAINT fk_consolidation_entries_source_company FOREIGN KEY (source_company_id) REFERENCES companies (id) ON DELETE SET NULL,
  CONSTRAINT chk_consolidation_entries_debit_credit CHECK (
    debit >= 0
    AND credit >= 0
    AND ((debit = 0 AND credit > 0) OR (credit = 0 AND debit > 0))
  )
);

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  user_id uuid,
  action audit_action NOT NULL,
  entity_name varchar(100) NOT NULL,
  entity_id uuid,
  changed_fields jsonb,
  metadata jsonb,
  ip_address varchar(64),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fk_audit_logs_company FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE SET NULL,
  CONSTRAINT fk_audit_logs_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX idx_companies_is_active ON companies (is_active);
CREATE INDEX idx_user_companies_company_role ON user_companies (company_id, role);
CREATE INDEX idx_fiscal_periods_company_dates ON fiscal_periods (company_id, start_date, end_date);
CREATE INDEX idx_chart_accounts_company_type ON chart_accounts (company_id, account_type);
CREATE INDEX idx_chart_accounts_parent ON chart_accounts (parent_account_id);
CREATE INDEX idx_third_parties_company_type ON third_parties (company_id, third_party_type);
CREATE INDEX idx_cost_centers_company_active ON cost_centers (company_id, is_active);
CREATE INDEX idx_accounting_batches_company_status ON accounting_batches (company_id, status);
CREATE INDEX idx_staging_entries_company_valid ON staging_entries (company_id, is_valid);
CREATE INDEX idx_journal_entries_company_status_posting ON journal_entries (company_id, status, posting_date);
CREATE INDEX idx_journal_entries_journal_date ON journal_entries (journal_id, entry_date);
CREATE INDEX idx_journal_entry_lines_company_account ON journal_entry_lines (company_id, account_id);
CREATE INDEX idx_journal_entry_lines_third_party ON journal_entry_lines (third_party_id);
CREATE INDEX idx_consolidation_group_companies_company ON consolidation_group_companies (company_id);
CREATE INDEX idx_consolidation_account_maps_target ON consolidation_account_maps (group_id, target_account_code);
CREATE INDEX idx_consolidation_runs_status_period ON consolidation_runs (status, period_start, period_end);
CREATE INDEX idx_consolidation_entries_run_account ON consolidation_entries (run_id, account_code);
CREATE INDEX idx_consolidation_entries_source_company ON consolidation_entries (source_company_id);
CREATE INDEX idx_audit_logs_company_created ON audit_logs (company_id, created_at);
CREATE INDEX idx_audit_logs_entity ON audit_logs (entity_name, entity_id);
=======
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  legal_name TEXT,
  tax_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, code)
);

CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, code)
);

CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  name TEXT NOT NULL,
  product_type TEXT NOT NULL DEFAULT 'stockable',
  unit_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, sku)
);

CREATE TABLE chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, code)
);

CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  reference TEXT,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE journal_entry_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
  debit NUMERIC(14,2) NOT NULL DEFAULT 0,
  credit NUMERIC(14,2) NOT NULL DEFAULT 0,
  line_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (debit >= 0 AND credit >= 0),
  CHECK (NOT (debit = 0 AND credit = 0))
);

CREATE TABLE sales_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id),
  order_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  order_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, order_number)
);

CREATE TABLE sales_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_order_id UUID NOT NULL REFERENCES sales_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity NUMERIC(14,2) NOT NULL,
  unit_price NUMERIC(14,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (quantity > 0),
  CHECK (unit_price >= 0)
);

CREATE TABLE purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  order_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  order_date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, order_number)
);

CREATE TABLE purchase_order_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  quantity NUMERIC(14,2) NOT NULL,
  unit_cost NUMERIC(14,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (quantity > 0),
  CHECK (unit_cost >= 0)
);

CREATE TABLE stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  movement_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  movement_type TEXT NOT NULL,
  quantity NUMERIC(14,2) NOT NULL,
  reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (quantity <> 0)
);

CREATE INDEX idx_users_organization_id ON users(organization_id);
CREATE INDEX idx_customers_organization_id ON customers(organization_id);
CREATE INDEX idx_suppliers_organization_id ON suppliers(organization_id);
CREATE INDEX idx_products_organization_id ON products(organization_id);
CREATE INDEX idx_sales_orders_organization_id ON sales_orders(organization_id);
CREATE INDEX idx_purchase_orders_organization_id ON purchase_orders(organization_id);
CREATE INDEX idx_stock_movements_product_id ON stock_movements(product_id);
>>>>>>> theirs
