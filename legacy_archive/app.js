const companySelect = document.getElementById('companySelect');
const consolidatedToggle = document.getElementById('consolidatedToggle');
const contextBadge = document.getElementById('contextBadge');
const userBadge = document.getElementById('userBadge');
const metricsCards = document.getElementById('metricsCards');
const consolidatedBlock = document.getElementById('consolidatedBlock');
const companyRows = document.getElementById('companyRows');
const sidebar = document.getElementById('sidebar');
const menuToggle = document.getElementById('menuToggle');

let context = null;

const metricLabels = [
  ['suppliers', 'Proveedores'],
  ['customers', 'Clientes'],
  ['items', 'Items'],
  ['purchases', 'Compras'],
  ['activeCashboxes', 'Cajas activas'],
  ['activeBanks', 'Bancos activos']
];

async function fetchContext(companyId) {
  const query = companyId ? `?companyId=${companyId}` : '';
  const response = await fetch(`/api/context${query}`);
  if (!response.ok) throw new Error('No se pudo obtener el contexto');
  context = await response.json();

  userBadge.textContent = `Usuario: ${context.user.name}`;
  renderCompanyOptions();
  consolidatedToggle.disabled = !context.canViewConsolidated;
}

function renderCompanyOptions() {
  companySelect.innerHTML = '';
  context.companies.forEach((company) => {
    const option = document.createElement('option');
    option.value = String(company.id);
    option.textContent = company.name;
    option.selected = company.id === context.activeCompany.id;
    companySelect.appendChild(option);
  });
}

function renderMetrics(data) {
  contextBadge.textContent =
    data.scope === 'consolidated'
      ? 'Contexto consolidado multempresa'
      : `Empresa activa: ${data.company.name}`;

  metricsCards.innerHTML = '';
  metricLabels.forEach(([key, label]) => {
    const card = document.createElement('article');
    card.className = 'card';
    card.innerHTML = `<h3>${label}</h3><p>${data.metrics[key]}</p>`;
    metricsCards.appendChild(card);
  });

  if (data.scope === 'consolidated' && data.byCompany.length) {
    consolidatedBlock.hidden = false;
    companyRows.innerHTML = data.byCompany
      .map(
        (row) => `<tr>
      <td>${row.companyName}</td>
      <td>${row.suppliers}</td>
      <td>${row.customers}</td>
      <td>${row.items}</td>
      <td>${row.purchases}</td>
    </tr>`
      )
      .join('');
  } else {
    consolidatedBlock.hidden = true;
    companyRows.innerHTML = '';
  }
}

async function fetchDashboard() {
  const companyId = companySelect.value;
  const consolidated = consolidatedToggle.checked;
  const response = await fetch(`/api/dashboard?companyId=${companyId}&consolidated=${consolidated}`);
  if (!response.ok) throw new Error('No se pudo obtener dashboard');
  const data = await response.json();
  renderMetrics(data);
}

companySelect.addEventListener('change', async () => {
  await fetchContext(companySelect.value);
  await fetchDashboard();
});

consolidatedToggle.addEventListener('change', fetchDashboard);
menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));

window.addEventListener('hashchange', () => {
  const activeHash = window.location.hash || '#dashboard';
  document.querySelectorAll('.nav-link').forEach((link) => {
    link.classList.toggle('active', link.getAttribute('href') === activeHash);
  });
});

(async function init() {
  await fetchContext();
  await fetchDashboard();
})();
