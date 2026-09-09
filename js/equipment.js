let allEquipment = [];

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
      document.getElementById('formAddEquipment').reset();
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
      showToast('Refreshing equipment catalog...', 'info', 1500);
      loadEquipment();
    });
  }
}

async function loadEquipment() {
  const tbody = document.getElementById('equipmentTableBody');
  if (!tbody) return;

  try {
    const client = getSupabase();
    if (!client) return;

    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center" style="padding: 2.5rem; color: var(--text-muted);">
          <div class="loading-spinner spinner-dark" style="margin-bottom: 0.5rem;"></div>
          <p>Fetching equipment from Supabase...</p>
        </td>
      </tr>
    `;

    const { data, error } = await client
      .from('equipment')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    allEquipment = data || [];
    filterAndRenderEquipment();

    if (typeof populateAvailableEquipmentDropdown === 'function') {
      populateAvailableEquipmentDropdown();
    }

  } catch (err) {
    console.error('Error loading equipment:', err);
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center" style="padding: 2.5rem; color: var(--danger-color);">
          <p>❌ Failed to load equipment: ${escapeHtml(err.message)}</p>
          <button class="btn btn-secondary btn-sm mt-2" onclick="loadEquipment()">Try Again</button>
        </td>
      </tr>
    `;
    showToast('Failed to load equipment catalog.', 'error');
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
    showToast('Equipment name cannot be empty (BR-01).', 'warning');
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

  btnSubmit.disabled = true;
  btnSubmit.innerHTML = '<span>Saving...</span>';

  try {
    const client = getSupabase();

    const { data: existing, error: checkErr } = await client
      .from('equipment')
      .select('id')
      .eq('asset_code', asset_code)
      .maybeSingle();

    if (existing) {
      throw new Error(`Asset code "${asset_code}" is already in use. Please use a unique asset code.`);
    }

    const { error: insertErr } = await client
      .from('equipment')
      .insert([{
        equipment_name,
        category,
        asset_code,
        condition,
        availability: 'Available'
      }]);

    if (insertErr) {
      throw insertErr;
    }

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

  const id = document.getElementById('editEquipmentId').value;
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
    showToast('Equipment name cannot be empty (BR-01).', 'warning');
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

  btnSubmit.disabled = true;
  btnSubmit.innerHTML = '<span>Updating...</span>';

  try {
    const client = getSupabase();

    const { data: existing, error: checkErr } = await client
      .from('equipment')
      .select('id')
      .eq('asset_code', asset_code)
      .neq('id', id)
      .maybeSingle();

    if (existing) {
      throw new Error(`Asset code "${asset_code}" is already assigned to another equipment item.`);
    }

    const { error: updateErr } = await client
      .from('equipment')
      .update({
        equipment_name,
        category,
        asset_code,
        condition
      })
      .eq('id', id);

    if (updateErr) {
      throw updateErr;
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

  const client = getSupabase();
  if (!client) return;

  try {
    const { data: activeTx, error: txErr } = await client
      .from('borrow_transactions')
      .select('id, status')
      .eq('equipment_id', id)
      .eq('status', 'Borrowed');

    if (activeTx && activeTx.length > 0) {
      alert(`⚠️ Unsafe Deletion Prevented:\n\n"${name}" (${assetCode}) has an active borrowing transaction. Active borrowing records must be returned or resolved first.`);
      return;
    }

    const confirmed = confirm(`Are you sure you want to delete this equipment item?\n\nAsset Code: ${assetCode}\nEquipment: ${name}\n\nThis action cannot be undone.`);
    if (!confirmed) return;

    const { error: deleteErr } = await client
      .from('equipment')
      .delete()
      .eq('id', id);

    if (deleteErr) {
      if (deleteErr.message.includes('violates foreign key constraint') || deleteErr.code === '23503') {
        throw new Error('This equipment has historical transaction records linked to it. It cannot be permanently deleted to maintain audit trail integrity.');
      }
      throw deleteErr;
    }

    showToast(`Equipment "${name}" (${assetCode}) deleted successfully.`, 'success');
    await loadEquipment();
    if (typeof loadDashboardData === 'function') loadDashboardData();

  } catch (err) {
    console.error('Error deleting equipment:', err);
    showToast(err.message || 'Failed to delete equipment.', 'error', 4500);
  }
}
