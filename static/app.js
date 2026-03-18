const modules = {
  proveedores: {
    endpoint: "proveedores",
    fields: ["name", "tax_id", "email", "phone"],
    required: ["name", "tax_id"],
    labels: {name:"Nombre",tax_id:"CUIT",email:"Email",phone:"Teléfono"}
  },
  proveedor_medios_pago: {
    endpoint: "proveedor_medios_pago",
    fields: ["supplier_id", "method_type", "alias", "details", "is_favorite", "valid_from", "valid_to"],
    required: ["supplier_id", "method_type", "alias", "valid_from"],
    labels: {supplier_id:"Proveedor ID",method_type:"Tipo",alias:"Alias",details:"Detalles",is_favorite:"Favorito",valid_from:"Vigencia desde",valid_to:"Vigencia hasta"}
  },
  clientes: { endpoint: "clientes", fields: ["name", "tax_id", "email", "phone"], required: ["name", "tax_id"], labels: {name:"Nombre",tax_id:"CUIT",email:"Email",phone:"Teléfono"}},
  depositos: { endpoint: "depositos", fields: ["name", "location"], required: ["name"], labels: {name:"Nombre",location:"Ubicación"}},
  items: { endpoint: "items", fields: ["item_type", "name", "sku", "category_id", "unit_id"], required: ["item_type", "name", "sku"], labels:{item_type:"Tipo(item)",name:"Nombre",sku:"SKU",category_id:"Categoría ID",unit_id:"Unidad ID"}},
  categorias: { endpoint: "categories", fields: ["name"], required: ["name"], labels:{name:"Nombre"}},
  unidades: { endpoint: "units", fields: ["name", "symbol"], required: ["name", "symbol"], labels:{name:"Nombre",symbol:"Símbolo"}},
};

let state = { module: "proveedores", page: 1, q: "", sort: "id", direction: "asc", editing: null };

const moduleSelector = document.getElementById("moduleSelector");
const controls = document.getElementById("controls");
const formSection = document.getElementById("formSection");
const tableSection = document.getElementById("tableSection");
const audit = document.getElementById("audit");

function headers() {
  return { "Content-Type": "application/json", "X-Role": document.getElementById("role").value };
}

function companyId() {
  return Number(document.getElementById("companyId").value || 1);
}

async function api(path, opts = {}) {
  const res = await fetch(path, { ...opts, headers: { ...headers(), ...(opts.headers || {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw body;
  return body;
}

function renderTabs() {
  moduleSelector.innerHTML = `<div class="module-tabs">${Object.keys(modules).map(m => `<button class="${m===state.module?"active":""}" data-m="${m}">${m}</button>`).join("")}</div>`;
  moduleSelector.querySelectorAll("button").forEach(btn => btn.onclick = () => { state.module = btn.dataset.m; state.page=1; state.editing=null; render(); });
}

function renderControls() {
  controls.innerHTML = `
    <input id="q" placeholder="buscar..." value="${state.q}">
    <select id="sort"><option>id</option><option>name</option><option>created_at</option><option>updated_at</option><option>valid_from</option><option>item_type</option></select>
    <select id="direction"><option value="asc">asc</option><option value="desc">desc</option></select>
    <button id="searchBtn">Buscar</button>
  `;
  document.getElementById("sort").value = state.sort;
  document.getElementById("direction").value = state.direction;
  document.getElementById("searchBtn").onclick = () => {
    state.q = document.getElementById("q").value;
    state.sort = document.getElementById("sort").value;
    state.direction = document.getElementById("direction").value;
    state.page = 1;
    loadTable();
  };
}

function validateFront(module, data) {
  const errs = {};
  modules[module].required.forEach(f => {
    if (data[f] === "" || data[f] === null || data[f] === undefined) errs[f] = "Requerido";
  });
  if (module === "proveedor_medios_pago" && data.valid_to && data.valid_from > data.valid_to) {
    errs.valid_to = "Debe ser >= valid_from";
  }
  return errs;
}

function renderForm() {
  const m = modules[state.module];
  const source = state.editing || {};
  const fields = m.fields.map(f => {
    if (f === "is_favorite") return `<label>${m.labels[f]}<select name="${f}"><option value="0">No</option><option value="1" ${source[f]?"selected":""}>Sí</option></select></label>`;
    const type = ["category_id", "unit_id", "supplier_id"].includes(f) ? "number" : ((f.includes("valid_")||f==="created_at") ? "date" : "text");
    return `<label>${m.labels[f] || f}<input type="${type}" name="${f}" value="${source[f] ?? ""}"></label>`;
  }).join("");
  formSection.innerHTML = `<form id="entityForm">${fields}<button>${state.editing?"Actualizar":"Crear"}</button></form><div id="formErrors"></div>`;

  document.getElementById("entityForm").onsubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const payload = Object.fromEntries(formData.entries());
    payload.company_id = companyId();
    ["supplier_id","category_id","unit_id","company_id"].forEach(k=>{ if(payload[k]!==undefined && payload[k]!=="") payload[k]=Number(payload[k]); });
    payload.is_favorite = payload.is_favorite === "1";

    const errs = validateFront(state.module, payload);
    if (Object.keys(errs).length) {
      document.getElementById("formErrors").textContent = JSON.stringify(errs, null, 2);
      return;
    }

    try {
      if (state.editing) {
        await api(`/api/${m.endpoint}/${state.editing.id}?company_id=${companyId()}`, { method:"PUT", body: JSON.stringify(payload) });
      } else {
        await api(`/api/${m.endpoint}`, { method:"POST", body: JSON.stringify(payload) });
      }
      state.editing = null;
      render();
    } catch (e2) {
      document.getElementById("formErrors").textContent = JSON.stringify(e2, null, 2);
    }
  };
}

async function loadTable() {
  const m = modules[state.module];
  const url = new URL(`/api/${m.endpoint}`, location.origin);
  url.searchParams.set("company_id", companyId());
  url.searchParams.set("q", state.q);
  url.searchParams.set("sort", state.sort);
  url.searchParams.set("direction", state.direction);
  url.searchParams.set("page", state.page);
  url.searchParams.set("per_page", 10);
  const out = await api(url.toString());

  const rows = out.data || out;
  const cols = [...new Set(rows.flatMap(r => Object.keys(r)))].filter(c=>!c.includes("deleted"));
  tableSection.innerHTML = `
    <table>
      <thead><tr>${cols.map(c=>`<th>${c}</th>`).join("")}<th>acciones</th></tr></thead>
      <tbody>
      ${rows.map(r => `<tr>${cols.map(c=>`<td>${r[c] ?? ""}</td>`).join("")}<td class="row-actions"><button data-e="${r.id}">Editar</button><button data-d="${r.id}">Baja lógica</button></td></tr>`).join("")}
      </tbody>
    </table>
    <button id="prev">Prev</button> <span>página ${state.page}</span> <button id="next">Next</button>
  `;

  tableSection.querySelectorAll("button[data-e]").forEach(btn => btn.onclick = () => {
    state.editing = rows.find(r => r.id == btn.dataset.e);
    renderForm();
  });
  tableSection.querySelectorAll("button[data-d]").forEach(btn => btn.onclick = async () => {
    await api(`/api/${m.endpoint}/${btn.dataset.d}?company_id=${companyId()}`, { method:"DELETE" });
    loadTable();
    loadAudit();
  });

  document.getElementById("prev").onclick = () => { state.page = Math.max(1, state.page - 1); loadTable(); };
  document.getElementById("next").onclick = () => { state.page++; loadTable(); };
}

async function loadAudit() {
  try {
    const out = await api(`/api/audit_logs?company_id=${companyId()}`);
    audit.textContent = JSON.stringify(out, null, 2);
  } catch (e) {
    audit.textContent = JSON.stringify(e, null, 2);
  }
}

async function render() {
  renderTabs();
  renderControls();
  renderForm();
  await loadTable();
  await loadAudit();
}

document.getElementById("companyId").addEventListener("change", render);
document.getElementById("role").addEventListener("change", render);
render();
