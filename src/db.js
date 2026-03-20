import fs from 'node:fs';
import path from 'node:path';

import { PrismaClient } from '@prisma/client'
export const prisma = new PrismaClient()

const dataDir = path.resolve('data');
const dbPath = path.join(dataDir, 'db.json');

const initialData = {
  users: [{ id: 1, name: 'Admin Quercus' }],
  companies: [
    { id: 1, name: 'Empresa Norte', is_active: 1 },
    { id: 2, name: 'Empresa Centro', is_active: 1 }
  ],
  user_company_access: [
    { user_id: 1, company_id: 1, can_view_consolidated: 1 },
    { user_id: 1, company_id: 2, can_view_consolidated: 1 }
  ],
  suppliers: [
    { id: 1, company_id: 1, name: 'Proveedor Uno', is_active: 1 },
    { id: 2, company_id: 1, name: 'Proveedor Dos', is_active: 1 },
    { id: 3, company_id: 2, name: 'Proveedor Tres', is_active: 1 }
  ],
  customers: [
    { id: 1, company_id: 1, name: 'Cliente A', is_active: 1 },
    { id: 2, company_id: 1, name: 'Cliente B', is_active: 1 },
    { id: 3, company_id: 2, name: 'Cliente C', is_active: 1 }
  ],
  items: [
    { id: 1, company_id: 1, sku: 'ITEM-001', is_active: 1 },
    { id: 2, company_id: 1, sku: 'ITEM-002', is_active: 1 },
    { id: 3, company_id: 1, sku: 'ITEM-003', is_active: 1 },
    { id: 4, company_id: 2, sku: 'ITEM-101', is_active: 1 }
  ],
  purchases: [
    { id: 1, company_id: 1, total: 1500, status: 'approved' },
    { id: 2, company_id: 1, total: 750, status: 'approved' },
    { id: 3, company_id: 2, total: 2000, status: 'approved' }
  ],
  cashboxes: [
    { id: 1, company_id: 1, name: 'Caja Principal', is_active: 1 },
    { id: 2, company_id: 1, name: 'Caja Sucursal', is_active: 1 },
    { id: 3, company_id: 2, name: 'Caja Central', is_active: 1 }
  ],
  banks: [
    { id: 1, company_id: 1, name: 'Banco Río', is_active: 1 },
    { id: 2, company_id: 2, name: 'Banco Norte', is_active: 1 },
    { id: 3, company_id: 2, name: 'Banco Sur', is_active: 1 }
  ]
};

export function loadDb() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2));
  }
  return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
}
