let allTransactions = [];

document.addEventListener('DOMContentLoaded', () => {
  initTransactionsModule();
  loadDashboardData();
});

function initTransactionsModule() {
  if (document.getElementById('transactionsTableBody')) {
    loadTransactions();
  }

  const btnOpenBorrow = document.getElementById('btnOpenBorrowModal');
  if (btnOpenBorrow) {
    btnOpenBorrow.addEventListener('click', () => {
      openNewBorrowModal();
    });
  }

  const formBorrow = document.getElementById('formBorrow');
  if (formBorrow) {
    formBorrow.addEventListener('submit', handleRecordBorrowing);
  }

  const searchInput = document.getElementById('transactionSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', filterAndRenderTransactions);
  }

  const filterSelect = document.getElementById('transactionFilterSelect');
  if (filterSelect) {
    filterSelect.addEventListener('change', filterAndRenderTransactions);
  }

  const btnRefresh = document.getElementById('btnRefreshTransactions');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      showToast('Refreshing transaction logs...', 'info', 1500);
      loadTransactions();
      loadDashboardData();
    });
  }
}

async function openNewBorrowModal() {
  const form = document.getElementById('formBorrow');
  if (form) form.reset();

  const todayStr = getTodayDateString();
  const borrowDateInput = document.getElementById('borrowDate');
  const borrowDueDateInput = document.getElementById('borrowDueDate');

  if (borrowDateInput) {
    borrowDateInput.value = todayStr;
  }
  if (borrowDueDateInput) {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    borrowDueDateInput.value = `${yr}-${mo}-${day}`;
  }

  await populateAvailableEquipmentDropdown();
  openModal('modalBorrow');
}

async function populateAvailableEquipmentDropdown() {
  const selectElem = document.getElementById('borrowEquipmentSelect');
  if (!selectElem) return;

  selectElem.innerHTML = '<option value="">Loading available equipment...</option>';

  try {
    let availableItems = [];
    const client = getSupabase();

    if (client) {
      const { data, error } = await client
        .from('equipment')
        .select('id, equipment_name, asset_code, condition')
        .eq('availability', 'Available')
        .order('equipment_name', { ascending: true });

      if (!error && data) {
        availableItems = data;
      }
    }

    if (availableItems.length === 0 && typeof allEquipment !== 'undefined') {
      availableItems = allEquipment.filter(e => e.availability === 'Available');
    }

    if (availableItems.length === 0) {
      selectElem.innerHTML = '<option value="">-- No Equipment Currently Available --</option>';
      return;
    }

    selectElem.innerHTML = '<option value="">-- Select Available Equipment --</option>' +
      availableItems.map(item => `
        <option value="${item.id}">
          ${escapeHtml(item.equipment_name)} (${escapeHtml(item.asset_code)}) - [${escapeHtml(item.condition)}]
        </option>
      `).join('');

  } catch (err) {
    console.error('Error fetching available equipment:', err);
    selectElem.innerHTML = '<option value="">-- Select Available Equipment --</option>';
  }
}

async function loadTransactions() {
  const tbody = document.getElementById('transactionsTableBody');
  if (!tbody) return;

  try {
    const client = getSupabase();
    if (client) {
      const { data, error } = await client
        .from('borrow_transactions')
        .select(`
          id,
          equipment_id,
          borrower_name,
          borrower_type,
          department,
          date_borrowed,
          due_date,
          date_returned,
          status,
          created_at,
          equipment:equipment_id (
            id,
            equipment_name,
            asset_code,
            category,
            availability
          )
        `)
        .order('created_at', { ascending: false });

      if (!error && data && data.length > 0) {
        allTransactions = data;
        localStorage.setItem('local_transactions', JSON.stringify(allTransactions));
        filterAndRenderTransactions();
        return;
      }
    }

    const stored = localStorage.getItem('local_transactions');
    allTransactions = stored ? JSON.parse(stored) : [];
    filterAndRenderTransactions();

  } catch (err) {
    console.warn('Fallback to local transactions:', err);
    const stored = localStorage.getItem('local_transactions');
    allTransactions = stored ? JSON.parse(stored) : [];
    filterAndRenderTransactions();
  }
}

function isTransactionOverdue(dueDateStr, status) {
  if (status === 'Returned') return false;
  if (!dueDateStr) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parts = dueDateStr.split('T')[0].split('-');
  const dueDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  dueDate.setHours(0, 0, 0, 0);

  return today.getTime() > dueDate.getTime();
}

function filterAndRenderTransactions() {
  const searchInput = document.getElementById('transactionSearchInput');
  const filterSelect = document.getElementById('transactionFilterSelect');
  const tbody = document.getElementById('transactionsTableBody');
  if (!tbody) return;

  const searchTerm = (searchInput ? searchInput.value : '').trim().toLowerCase();
  const filterValue = filterSelect ? filterSelect.value : 'All';

  let filtered = allTransactions.filter(item => {
    const eqName = (item.equipment?.equipment_name || item.equipment_name || '').toLowerCase();
    const assetCode = (item.equipment?.asset_code || item.asset_code || '').toLowerCase();
    const borrower = (item.borrower_name || '').toLowerCase();
    const dept = (item.department || '').toLowerCase();

    const matchesSearch = eqName.includes(searchTerm) || 
                          assetCode.includes(searchTerm) || 
                          borrower.includes(searchTerm) ||
                          dept.includes(searchTerm);

    const isOverdue = isTransactionOverdue(item.due_date, item.status);

    let matchesFilter = true;
    if (filterValue === 'Borrowed') {
      matchesFilter = item.status === 'Borrowed';
    } else if (filterValue === 'Returned') {
      matchesFilter = item.status === 'Returned';
    } else if (filterValue === 'Overdue') {
      matchesFilter = isOverdue;
    }

    return matchesSearch && matchesFilter;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10">
          <div class="empty-state">
            <div class="empty-state-icon">📋</div>
            <h4>No Transactions Found</h4>
            <p>${searchTerm || filterValue !== 'All' ? 'Try adjusting your search criteria or filter selection.' : 'No equipment has been borrowed yet.'}</p>
          </div>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filtered.map(tx => {
    const isOverdue = isTransactionOverdue(tx.due_date, tx.status);
    const isReturned = tx.status === 'Returned';

    let statusBadge = '';
    if (isReturned) {
      statusBadge = '<span class="badge badge-returned">Returned</span>';
    } else if (isOverdue) {
      statusBadge = '<span class="badge badge-overdue">⚠️ OVERDUE</span>';
    } else {
      statusBadge = '<span class="badge badge-borrowed">Borrowed</span>';
    }

    const eqName = tx.equipment?.equipment_name || tx.equipment_name || 'Laboratory Equipment';
    const assetCode = tx.equipment?.asset_code || tx.asset_code || 'N/A';

    const actionButton = !isReturned
      ? `<button class="btn btn-success btn-sm" onclick="handleReturnEquipment(${tx.id}, ${tx.equipment_id}, '${escapeHtml(eqName)}', '${escapeHtml(tx.borrower_name)}')" title="Mark Equipment as Returned">
           ↩ Return
         </button>`
      : `<span style="font-size:0.8rem; color: var(--text-muted); font-weight:600;">Completed</span>`;

    return `
      <tr>
        <td><strong>${escapeHtml(assetCode)}</strong></td>
        <td>${escapeHtml(eqName)}</td>
        <td><strong>${escapeHtml(tx.borrower_name)}</strong></td>
        <td><span class="badge" style="background:#fce7f3; color:#831843;">${escapeHtml(tx.borrower_type)}</span></td>
        <td>${escapeHtml(tx.department)}</td>
        <td>${formatDate(tx.date_borrowed)}</td>
        <td><span style="${isOverdue ? 'color: var(--danger-color); font-weight: 800;' : ''}">${formatDate(tx.due_date)}</span></td>
        <td>${formatDate(tx.date_returned)}</td>
        <td>${statusBadge}</td>
        <td style="text-align: right;">${actionButton}</td>
      </tr>
    `;
  }).join('');
}

async function handleRecordBorrowing(e) {
  e.preventDefault();

  const eqSelect = document.getElementById('borrowEquipmentSelect');
  const nameInput = document.getElementById('borrowerName');
  const typeSelect = document.getElementById('borrowerType');
  const deptInput = document.getElementById('borrowerDepartment');
  const dateBorrowedInput = document.getElementById('borrowDate');
  const dueDateInput = document.getElementById('borrowDueDate');
  const btnSubmit = document.getElementById('btnSubmitBorrow');

  const equipment_id = parseInt(eqSelect.value, 10);
  const borrower_name = nameInput.value.trim();
  const borrower_type = typeSelect.value;
  const department = deptInput.value.trim();
  const date_borrowed = dateBorrowedInput.value;
  const due_date = dueDateInput.value;

  if (!equipment_id) {
    showToast('Please select an available equipment item.', 'warning');
    eqSelect.focus();
    return;
  }
  if (!borrower_name) {
    showToast('Borrower name is required.', 'warning');
    nameInput.focus();
    return;
  }
  if (!borrower_type) {
    showToast('Borrower type is required.', 'warning');
    typeSelect.focus();
    return;
  }
  if (!department) {
    showToast('Department is required.', 'warning');
    deptInput.focus();
    return;
  }
  if (!date_borrowed) {
    showToast('Date borrowed is required.', 'warning');
    dateBorrowedInput.focus();
    return;
  }
  if (!due_date) {
    showToast('Due date is required.', 'warning');
    dueDateInput.focus();
    return;
  }

  if (due_date < date_borrowed) {
    showToast('Due date cannot be earlier than date borrowed.', 'warning');
    dueDateInput.focus();
    return;
  }

  btnSubmit.disabled = true;
  btnSubmit.innerHTML = '<span>Processing...</span>';

  try {
    const client = getSupabase();
    const targetEq = typeof allEquipment !== 'undefined' ? allEquipment.find(e => e.id === equipment_id) : null;
    const eqName = targetEq ? targetEq.equipment_name : 'Equipment';
    const assetCode = targetEq ? targetEq.asset_code : 'N/A';

    if (client) {
      await client
        .from('borrow_transactions')
        .insert([{
          equipment_id: equipment_id,
          borrower_name,
          borrower_type,
          department,
          date_borrowed,
          due_date,
          status: 'Borrowed'
        }]);

      await client
        .from('equipment')
        .update({ availability: 'Borrowed' })
        .eq('id', equipment_id);
    }

    if (targetEq) {
      targetEq.availability = 'Borrowed';
      localStorage.setItem('local_equipment', JSON.stringify(allEquipment));
    }

    const newTxId = allTransactions.length > 0 ? Math.max(...allTransactions.map(t => t.id || 0)) + 1 : 1;
    const newTransaction = {
      id: newTxId,
      equipment_id,
      borrower_name,
      borrower_type,
      department,
      date_borrowed,
      due_date,
      date_returned: null,
      status: 'Borrowed',
      created_at: new Date().toISOString(),
      equipment: {
        id: equipment_id,
        equipment_name: eqName,
        asset_code: assetCode,
        availability: 'Borrowed'
      }
    };

    allTransactions.unshift(newTransaction);
    localStorage.setItem('local_transactions', JSON.stringify(allTransactions));

    showToast(`Borrowing recorded successfully for ${borrower_name}!`, 'success');
    closeModal('modalBorrow');
    document.getElementById('formBorrow').reset();

    await loadTransactions();
    if (typeof loadEquipment === 'function') await loadEquipment();
    await loadDashboardData();

  } catch (err) {
    console.error('Error recording borrowing:', err);
    showToast(err.message || 'Failed to record borrowing transaction.', 'error');
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = '<span>Confirm Borrowing</span>';
  }
}

async function handleReturnEquipment(transactionId, equipmentId, equipmentName, borrowerName) {
  const confirmReturn = confirm(
    `Confirm Return of Equipment:\n\n` +
    `Equipment: ${equipmentName}\n` +
    `Borrower: ${borrowerName}\n\n` +
    `Are you sure you want to mark this item as RETURNED today?`
  );

  if (!confirmReturn) return;

  try {
    const client = getSupabase();
    const todayDate = getTodayDateString();

    if (client) {
      await client
        .from('borrow_transactions')
        .update({
          status: 'Returned',
          date_returned: todayDate
        })
        .eq('id', transactionId);

      if (equipmentId) {
        await client
          .from('equipment')
          .update({ availability: 'Available' })
          .eq('id', equipmentId);
      }
    }

    const txIdx = allTransactions.findIndex(t => t.id === transactionId);
    if (txIdx !== -1) {
      allTransactions[txIdx].status = 'Returned';
      allTransactions[txIdx].date_returned = todayDate;
      localStorage.setItem('local_transactions', JSON.stringify(allTransactions));
    }

    if (typeof allEquipment !== 'undefined' && equipmentId) {
      const eqIdx = allEquipment.findIndex(e => e.id === equipmentId);
      if (eqIdx !== -1) {
        allEquipment[eqIdx].availability = 'Available';
        localStorage.setItem('local_equipment', JSON.stringify(allEquipment));
      }
    }

    showToast(`"${equipmentName}" successfully returned by ${borrowerName}!`, 'success');

    await loadTransactions();
    if (typeof loadEquipment === 'function') await loadEquipment();
    await loadDashboardData();

  } catch (err) {
    console.error('Error returning equipment:', err);
    showToast(err.message || 'Failed to process equipment return.', 'error');
  }
}

async function loadDashboardData() {
  const statTotal = document.getElementById('statTotalEquipment');
  const statAvail = document.getElementById('statAvailableEquipment');
  const statBorrow = document.getElementById('statBorrowedEquipment');
  const statReturn = document.getElementById('statReturnedTransactions');
  const statOverdue = document.getElementById('statOverdueEquipment');
  const overdueBanner = document.getElementById('overdueAlertBanner');
  const overdueCountText = document.getElementById('overdueCountText');
  const recentTableBody = document.getElementById('dashboardRecentTableBody');

  try {
    let eqList = [];
    let txList = [];

    const client = getSupabase();
    if (client) {
      const { data: eData } = await client.from('equipment').select('id, availability');
      if (eData) eqList = eData;

      const { data: tData } = await client.from('borrow_transactions').select(`
        id, equipment_id, borrower_name, borrower_type, department, date_borrowed, due_date, date_returned, status, created_at,
        equipment:equipment_id ( equipment_name, asset_code )
      `).order('created_at', { ascending: false });
      if (tData) txList = tData;
    }

    if (eqList.length === 0 && typeof allEquipment !== 'undefined') {
      eqList = allEquipment;
    }
    if (txList.length === 0) {
      const storedTx = localStorage.getItem('local_transactions');
      txList = storedTx ? JSON.parse(storedTx) : allTransactions;
    }

    const totalEq = eqList.length;
    const availEq = eqList.filter(e => e.availability === 'Available').length;
    const borrowEq = eqList.filter(e => e.availability === 'Borrowed').length;

    if (statTotal) statTotal.textContent = totalEq;
    if (statAvail) statAvail.textContent = availEq;
    if (statBorrow) statBorrow.textContent = borrowEq;

    const returnedCount = txList.filter(t => t.status === 'Returned').length;
    const overdueList = txList.filter(t => isTransactionOverdue(t.due_date, t.status));
    const overdueCount = overdueList.length;

    if (statReturn) statReturn.textContent = returnedCount;
    if (statOverdue) statOverdue.textContent = overdueCount;

    if (overdueBanner && overdueCountText) {
      if (overdueCount > 0) {
        overdueCountText.textContent = `There ${overdueCount === 1 ? 'is 1 overdue borrowing transaction' : `are ${overdueCount} overdue borrowing transactions`} requiring follow-up!`;
        overdueBanner.classList.remove('d-none');
      } else {
        overdueBanner.classList.add('d-none');
      }
    }

    if (recentTableBody) {
      const recent = txList.slice(0, 5);
      if (recent.length === 0) {
        recentTableBody.innerHTML = `
          <tr>
            <td colspan="7" class="text-center" style="padding: 2.5rem; color: var(--text-muted); font-weight:600;">
              No borrowing activity recorded yet.
            </td>
          </tr>
        `;
      } else {
        recentTableBody.innerHTML = recent.map(tx => {
          const isOverdue = isTransactionOverdue(tx.due_date, tx.status);
          const isReturned = tx.status === 'Returned';

          let statusBadge = '';
          if (isReturned) {
            statusBadge = '<span class="badge badge-returned">Returned</span>';
          } else if (isOverdue) {
            statusBadge = '<span class="badge badge-overdue">⚠️ OVERDUE</span>';
          } else {
            statusBadge = '<span class="badge badge-borrowed">Borrowed</span>';
          }

          const assetCode = tx.equipment?.asset_code || tx.asset_code || 'N/A';
          const eqName = tx.equipment?.equipment_name || tx.equipment_name || 'Laboratory Equipment';

          return `
            <tr>
              <td><strong>${escapeHtml(assetCode)}</strong></td>
              <td>${escapeHtml(eqName)}</td>
              <td><strong>${escapeHtml(tx.borrower_name)}</strong></td>
              <td>${escapeHtml(tx.department)}</td>
              <td>${formatDate(tx.date_borrowed)}</td>
              <td><span style="${isOverdue ? 'color: var(--danger-color); font-weight: 800;' : ''}">${formatDate(tx.due_date)}</span></td>
              <td>${statusBadge}</td>
            </tr>
          `;
        }).join('');
      }
    }

  } catch (err) {
    console.error('Error loading dashboard statistics:', err);
  }
}

window.loadTransactions = loadTransactions;
window.handleReturnEquipment = handleReturnEquipment;
window.loadDashboardData = loadDashboardData;
window.populateAvailableEquipmentDropdown = populateAvailableEquipmentDropdown;
