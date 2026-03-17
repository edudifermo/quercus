let masters;

function itemRowTemplate() {
  return `<div class="line">Item <select class="item"></select> Cant <input class="qty" type="number" step="0.01" value="1"> Unidad <input class="unit" value="unidad"> Factor a base <input class="factor" type="number" step="0.01" value="1"> Costo base <input class="cost" type="number" step="0.01" value="0"></div>`;
}

function loadMasters() {
  fetch('/api/masters').then(r => r.json()).then(data => {
    masters = data;
    const supplier = document.getElementById('supplier');
    data.suppliers.forEach(s => supplier.innerHTML += `<option value="${s.id}">${s.name}</option>`);
    const deposit = document.getElementById('deposit');
    data.deposits.forEach(d => deposit.innerHTML += `<option value="${d.id}">${d.name}</option>`);

    document.getElementById('masters').innerText = `Items disponibles: ${data.items.map(i => `${i.sku}(${i.item_type})`).join(', ')}`;
    addRow();
    document.getElementById('date').value = new Date().toISOString().slice(0,10);
  });
}

function syncItemSelect(row) {
  const sel = row.querySelector('.item');
  sel.innerHTML = masters.items.map(i => `<option value="${i.id}" data-u="${i.base_unit}" data-c="${i.last_cost}">${i.sku} - ${i.name}</option>`).join('');
  sel.addEventListener('change', () => {
    const option = sel.options[sel.selectedIndex];
    row.querySelector('.unit').value = option.dataset.u;
    row.querySelector('.cost').value = option.dataset.c;
  });
  sel.dispatchEvent(new Event('change'));
}

function addRow() {
  const host = document.getElementById('itemRows');
  host.insertAdjacentHTML('beforeend', itemRowTemplate());
  syncItemSelect(host.lastElementChild);
}

document.getElementById('addRow').addEventListener('click', addRow);

document.getElementById('purchaseForm').addEventListener('submit', (e) => {
  e.preventDefault();
  const items = [...document.querySelectorAll('#itemRows .line')].map(line => ({
    item_id: Number(line.querySelector('.item').value),
    quantity: Number(line.querySelector('.qty').value),
    unit: line.querySelector('.unit').value,
    unit_factor: Number(line.querySelector('.factor').value),
    unit_cost: Number(line.querySelector('.cost').value)
  }));

  fetch('/api/purchases', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      company_id: 1,
      supplier_id: Number(document.getElementById('supplier').value),
      deposit_id: Number(document.getElementById('deposit').value),
      purchase_date: document.getElementById('date').value,
      document_number: document.getElementById('doc').value,
      items
    })
  }).then(r => r.json()).then(data => {
    document.getElementById('result').innerText = JSON.stringify(data, null, 2);
  });
});

loadMasters();
