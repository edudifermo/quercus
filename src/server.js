import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';
import { loadDb } from './db.js';

const PORT = Number(process.env.PORT || 3000);
const publicDir = path.resolve('public');
const db = loadDb();

function json(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

function getUser(req) {
  const userId = Number(req.headers['x-user-id'] || 1);
  const user = db.users.find((entry) => entry.id === userId);
  if (!user) return null;

  const companies = db.user_company_access
    .filter((entry) => entry.user_id === user.id)
    .map((access) => {
      const company = db.companies.find((item) => item.id === access.company_id && item.is_active === 1);
      if (!company) return null;
      return { ...company, can_view_consolidated: access.can_view_consolidated };
    })
    .filter(Boolean);

  return { ...user, companies };
}

function getActiveCompany(url, user) {
  const selectedId = Number(url.searchParams.get('companyId') || user.companies[0]?.id);
  return user.companies.find((company) => company.id === selectedId) || null;
}

function countRecords(table, companyIds, activeOnly = false) {
  return db[table].filter((entry) => companyIds.includes(entry.company_id) && (!activeOnly || entry.is_active === 1)).length;
}

function dashboardPayload(user, activeCompany, consolidatedRequested) {
  const consolidatedAllowed = user.companies.some((company) => company.can_view_consolidated === 1);
  const useConsolidated = consolidatedAllowed && consolidatedRequested;
  const companyIds = useConsolidated ? user.companies.map((entry) => entry.id) : [activeCompany.id];

  const metrics = {
    suppliers: countRecords('suppliers', companyIds, true),
    customers: countRecords('customers', companyIds, true),
    items: countRecords('items', companyIds, true),
    purchases: countRecords('purchases', companyIds, false),
    activeCashboxes: countRecords('cashboxes', companyIds, true),
    activeBanks: countRecords('banks', companyIds, true)
  };

  const byCompany = useConsolidated
    ? user.companies.map((company) => ({
        companyId: company.id,
        companyName: company.name,
        suppliers: countRecords('suppliers', [company.id], true),
        customers: countRecords('customers', [company.id], true),
        items: countRecords('items', [company.id], true),
        purchases: countRecords('purchases', [company.id], false)
      }))
    : [];

  return {
    scope: useConsolidated ? 'consolidated' : 'company',
    company: activeCompany,
    metrics,
    byCompany
  };
}

function serveStatic(req, res, pathname) {
  const target = pathname === '/' ? '/index.html' : pathname;
  const safePath = path.normalize(target).replace(/^\.+/, '');
  const filePath = path.join(publicDir, safePath);

  if (!filePath.startsWith(publicDir) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const ext = path.extname(filePath);
  const contentType =
    ext === '.html'
      ? 'text/html; charset=utf-8'
      : ext === '.css'
        ? 'text/css; charset=utf-8'
        : ext === '.js'
          ? 'application/javascript; charset=utf-8'
          : 'text/plain; charset=utf-8';

  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  if (url.pathname.startsWith('/api/')) {
    const user = getUser(req);
    if (!user) return json(res, 401, { error: 'Unauthorized' });

    const activeCompany = getActiveCompany(url, user);
    if (!activeCompany) return json(res, 403, { error: 'User has no access to selected company' });

    if (url.pathname === '/api/context') {
      return json(res, 200, {
        user: { id: user.id, name: user.name },
        companies: user.companies,
        activeCompany,
        canViewConsolidated: user.companies.some((company) => company.can_view_consolidated === 1)
      });
    }

    if (url.pathname === '/api/dashboard') {
      const consolidated = url.searchParams.get('consolidated') === 'true';
      return json(res, 200, dashboardPayload(user, activeCompany, consolidated));
    }

    return json(res, 404, { error: 'Not found' });
  }

  serveStatic(req, res, url.pathname);
});

async function test() {
  const result = await prisma.$queryRaw`SELECT 1`
  console.log('DB OK:', result)
}

test()


server.listen(PORT, () => {
  console.log(`Quercus server running on http://localhost:${PORT}`);
});
