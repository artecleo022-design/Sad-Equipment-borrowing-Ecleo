let allEquipment = [];

const DEFAULT_SAMPLE_EQUIPMENT = [
  { id: 1, equipment_name: 'Epson Projector', category: 'Projector', asset_code: 'PROJ-001', condition: 'Good', availability: 'Available', created_at: new Date().toISOString() },
  { id: 2, equipment_name: 'Acer Laptop', category: 'Laptop', asset_code: 'LAP-002', condition: 'Good', availability: 'Available', created_at: new Date().toISOString() },
  { id: 3, equipment_name: 'Canon Camera', category: 'Camera', asset_code: 'CAM-001', condition: 'Fair', availability: 'Available', created_at: new Date().toISOString() },
  { id: 4, equipment_name: 'Wireless Microphone', category: 'Microphone', asset_code: 'MIC-001', condition: 'Good', availability: 'Available', created_at: new Date().toISOString() },
  { id: 5, equipment_name: 'TP-Link Router', category: 'Router', asset_code: 'ROUT-001', condition: 'Good', availability: 'Available', created_at: new Date().toISOString() }
];

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('equipmentTableBody')) {
    initEquipmentModule();
  }
});

function initEquipmentModule() {
  loadEquipment();

  const btnOpenAdd = document.getElementById('btnOpenAddEquipmentModal');
  if (btnOpenAdd) {
    btnOpenAdd.addEventListener('click', () => {
      const form = document.getElementById('formAddEquipment');
      if (form) form.reset();
      openModal('modalAddEquipment');
    });
  }

  const formAdd = document.getElementById('formAddEquipment');
  if (formAdd) {
    formAdd.addEventListener('submit', handleAddEquipment);
  }

  const formEdit = document.getElementById('formEditEquipment');
  if (formEdit) {
    formEdit.addEventListener('submit', handleUpdateEquipment);
  }

  const searchInput = document.getElementById('equipmentSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', filterAndRenderEquipment);
  }

  const filterSelect = document.getElementById('equipmentFilterSelect');
  if (filterSelect) {
    filterSelect.addEventListener('change', filterAndRenderEquipment);
  }

  const btnRefresh = document.getElementById('btnRefreshEquipment');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      showToast('Refreshing equipment inventory...', 'info', 1500);
      loadEquipment();
    });
  }
}

async function loadEquipment() {
  const tbody = document.getElementById('equipmentTableBody');
  if (!tbody) return;

  try {
    const client = getSupabase();
    if (client) {
      const { data, error } = await client
        .from('equipment')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        allEquipment = data;
        localStorage.setItem('local_equipment', JSON.stringify(allEquipment));
        filterAndRenderEquipment();
        if (typeof populateAvailableEquipmentDropdown === 'function') {
          populateAvailableEquipmentDropdown();
        }
        return;
      }
    }

    const stored = localStorage.getItem('local_equipment');
    if (stored) {
      allEquipment = JSON.parse(stored);
    } else {
      allEquipment = [...DEFAULT_SAMPLE_EQUIPMENT];
      localStorage.setItem('local_equipment', JSON.stringify(allEquipment));
    }
    filterAndRenderEquipment();

    if (typeof populateAvailableEquipmentDropdown === 'function') {
      populateAvailableEquipmentDropdown();
    }

  } catch (err) {
    console.warn('Fallback to local equipment storage:', err);
    const stored = localStorage.getItem('local_equipment');
    allEquipment = stored ? JSON.parse(stored) : [...DEFAULT_SAMPLE_EQUIPMENT];
    filterAndRenderEquipment();
  }
}

function filterAndRenderEquipment() {
  const searchInput = document.getElementById('equipmentSearchInput');
  const filterSelect = document.getElementById('equipmentFilterSelect');
  const tbody = document.getElementById('equipmentTableBody');
  if (!tbody) return;

  const searchTerm = (searchInput ? searchInput.value : '').trim().toLowerCase();
  const filterValue = filterSelect ? filterSelect.value : 'All';

  let filtered = allEquipment.filter(item => {
    const nameMatch = (item.equipment_name || '').toLowerCase().includes(searchTerm);
    const codeMatch = (item.asset_code || '').toLowerCase().includes(searchTerm);
    const matchesSearch = nameMatch || codeMatch;

    let matchesFilter = true;
    if (filterValue !== 'All') {
      matchesFilter = item.availability === filterValue;
    }

    return matchesSearch && matchesFilter;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6">
          <div class="empty-state">
            <div class="empty-state-icon">📦</div>
            <h4>No Equipment Found</h4>
            <p>${searchTerm || filterValue !== 'All' ? 'Try adjusting your search query or filter options.' : 'Get started by adding new laboratory equipment.'}</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(item => {
    const isAvailable = item.availability === 'Available';
    const availBadge = isAvailable
      ? '<span class="badge badge-available">Available</span>'
      : '<span class="badge badge-borrowed">Borrowed</span>';

    const condClass = `badge-condition-${(item.condition || 'good').toLowerCase().replace(/\s+/g, '-')}`;
    const condBadge = `<span class="badge ${condClass}">${escapeHtml(item.condition || 'Good')}</span>`;

    return `
      <tr>
        <td><strong>${escapeHtml(item.asset_code)}</strong></td>
        <td>${escapeHtml(item.equipment_name)}</td>
        <td>${escapeHtml(item.category)}</td>
        <td>${condBadge}</td>
        <td>${availBadge}</td>
        <td style="text-align: right;">
          <div class="action-buttons" style="justify-content: flex-end;">
            <button class="btn btn-outline-primary btn-sm" onclick="openEditEquipmentModal(${item.id})" title="Edit Equipment">
              ✏️ Edit
            </button>
            <button class="btn btn-outline-danger btn-sm" onclick="confirmDeleteEquipment(${item.id}, '${escapeHtml(item.asset_code)}', '${escapeHtml(item.equipment_name)}', '${item.availability}')" title="Delete Equipment">
              🗑️ Delete
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

async function handleAddEquipment(e) {
  e.preventDefault();

  const nameInput = document.getElementById('addEquipmentName');
  const categoryInput = document.getElementById('addCategory');
  const codeInput = document.getElementById('addAssetCode');
  const conditionSelect = document.getElementById('addCondition');
  const btnSubmit = document.getElementById('btnSubmitAddEquipment');

  const equipment_name = nameInput.value.trim();
  const category = categoryInput.value.trim();
  const asset_code = codeInput.value.trim().toUpperCase();
  const condition = conditionSelect.value;

  if (!equipment_name) {
    showToast('Equipment name cannot be empty.', 'warning');
    nameInput.focus();
    return;
  }
  if (!category) {
    showToast('Category cannot be empty.', 'warning');
    categoryInput.focus();
    return;
  }
  if (!asset_code) {
    showToast('Asset code cannot be empty.', 'warning');
    codeInput.focus();
    return;
  }

  const duplicate = allEquipment.some(eq => eq.asset_code.toUpperCase() === asset_code);
  if (duplicate) {
    showToast(`Asset code "${asset_code}" is already in use. Please use a unique asset code.`, 'error');
    codeInput.focus();
    return;
  }

  btnSubmit.disabled = true;
  btnSubmit.innerHTML = '<span>Saving...</span>';

  try {
    const client = getSupabase();
    let inserted = false;

    if (client) {
      const { error: insertErr } = await client
        .from('equipment')
        .insert([{
          equipment_name,
          category,
          asset_code,
          condition,
          availability: 'Available'
        }]);

      if (!insertErr) {
        inserted = true;
      }
    }

    const newId = allEquipment.length > 0 ? Math.max(...allEquipment.map(e => e.id || 0)) + 1 : 1;
    const newRecord = {
      id: newId,
      equipment_name,
      category,
      asset_code,
      condition,
      availability: 'Available',
      created_at: new Date().toISOString()
    };

    allEquipment.unshift(newRecord);
    localStorage.setItem('local_equipment', JSON.stringify(allEquipment));

    showToast(`Equipment "${equipment_name}" (${asset_code}) added successfully!`, 'success');
    closeModal('modalAddEquipment');
    document.getElementById('formAddEquipment').reset();

    await loadEquipment();
    if (typeof loadDashboardData === 'function') loadDashboardData();

  } catch (err) {
    console.error('Error adding equipment:', err);
    showToast(err.message || 'Failed to add equipment.', 'error');
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = '<span>Save Equipment</span>';
  }
}

function openEditEquipmentModal(id) {
  const item = allEquipment.find(eq => eq.id === id);
  if (!item) {
    showToast('Equipment record not found.', 'error');
    return;
  }

  document.getElementById('editEquipmentId').value = item.id;
  document.getElementById('editEquipmentName').value = item.equipment_name || '';
  document.getElementById('editCategory').value = item.category || '';
  document.getElementById('editAssetCode').value = item.asset_code || '';
  document.getElementById('editCondition').value = item.condition || 'Good';
  document.getElementById('editAvailability').value = item.availability || 'Available';

  openModal('modalEditEquipment');
}

async function handleUpdateEquipment(e) {
  e.preventDefault();

  const id = parseInt(document.getElementById('editEquipmentId').value, 10);
  const nameInput = document.getElementById('editEquipmentName');
  const categoryInput = document.getElementById('editCategory');
  const codeInput = document.getElementById('editAssetCode');
  const conditionSelect = document.getElementById('editCondition');
  const btnSubmit = document.getElementById('btnSubmitEditEquipment');

  const equipment_name = nameInput.value.trim();
  const category = categoryInput.value.trim();
  const asset_code = codeInput.value.trim().toUpperCase();
  const condition = conditionSelect.value;

  if (!equipment_name) {
    showToast('Equipment name cannot be empty.', 'warning');
    nameInput.focus();
    return;
  }
  if (!category) {
    showToast('Category cannot be empty.', 'warning');
    categoryInput.focus();
    return;
  }
  if (!asset_code) {
    showToast('Asset code cannot be empty.', 'warning');
    codeInput.focus();
    return;
  }

  const conflict = allEquipment.some(eq => eq.id !== id && eq.asset_code.toUpperCase() === asset_code);
  if (conflict) {
    showToast(`Asset code "${asset_code}" is already assigned to another equipment item.`, 'error');
    codeInput.focus();
    return;
  }

  btnSubmit.disabled = true;
  btnSubmit.innerHTML = '<span>Updating...</span>';

  try {
    const client = getSupabase();
    if (client) {
      await client
        .from('equipment')
        .update({
          equipment_name,
          category,
          asset_code,
          condition
        })
        .eq('id', id);
    }

    const idx = allEquipment.findIndex(eq => eq.id === id);
    if (idx !== -1) {
      allEquipment[idx].equipment_name = equipment_name;
      allEquipment[idx].category = category;
      allEquipment[idx].asset_code = asset_code;
      allEquipment[idx].condition = condition;
      localStorage.setItem('local_equipment', JSON.stringify(allEquipment));
    }

    showToast(`Equipment "${equipment_name}" updated successfully!`, 'success');
    closeModal('modalEditEquipment');

    await loadEquipment();
    if (typeof loadDashboardData === 'function') loadDashboardData();

  } catch (err) {
    console.error('Error updating equipment:', err);
    showToast(err.message || 'Failed to update equipment.', 'error');
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = '<span>Update Equipment</span>';
  }
}

async function confirmDeleteEquipment(id, assetCode, name, availability) {
  if (availability === 'Borrowed') {
    alert(`⚠️ Cannot Delete Equipment:\n\n"${name}" (${assetCode}) is currently marked as BORROWED. Please ensure the item is returned before attempting to delete it.`);
    return;
  }

  const confirmed = confirm(`Are you sure you want to delete this equipment item?\n\nAsset Code: ${assetCode}\nEquipment: ${name}\n\nThis action cannot be undone.`);
  if (!confirmed) return;

  try {
    const client = getSupabase();
    if (client) {
      await client.from('equipment').delete().eq('id', id);
    }

    allEquipment = allEquipment.filter(eq => eq.id !== id);
    localStorage.setItem('local_equipment', JSON.stringify(allEquipment));

    showToast(`Equipment "${name}" (${assetCode}) deleted successfully.`, 'success');
    await loadEquipment();
    if (typeof loadDashboardData === 'function') loadDashboardData();

  } catch (err) {
    console.error('Error deleting equipment:', err);
    showToast(err.message || 'Failed to delete equipment.', 'error', 4500);
  }
}

window.loadEquipment = loadEquipment;
window.openEditEquipmentModal = openEditEquipmentModal;
window.confirmDeleteEquipment = confirmDeleteEquipment;
