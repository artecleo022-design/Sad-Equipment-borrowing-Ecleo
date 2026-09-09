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
    const client = getSupabase();
    if (!client) return;

    const { data: availableItems, error } = await client
      .from('equipment')
      .select('id, equipment_name, asset_code, condition')
      .eq('availability', 'Available')
      .order('equipment_name', { ascending: true });

    if (error) throw error;

    if (!availableItems || availableItems.length === 0) {
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
    selectElem.innerHTML = '<option value="">Error loading equipment</option>';
  }
}

async function loadTransactions() {
  const tbody = document.getElementById('transactionsTableBody');
  if (!tbody) return;

  try {
    const client = getSupabase();
    if (!client) return;

    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="text-center" style="padding: 2.5rem; color: var(--text-muted);">
          <div class="loading-spinner spinner-dark" style="margin-bottom: 0.5rem;"></div>
          <p>Fetching transaction records from Supabase...</p>
        </td>
      </tr>
    `;

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

    if (error) throw error;

    allTransactions = data || [];
    filterAndRenderTransactions();

  } catch (err) {
    console.error('Error loading transactions:', err);
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="text-center" style="padding: 2.5rem; color: var(--danger-color);">
          <p>❌ Failed to load transactions: ${escapeHtml(err.message)}</p>
          <button class="btn btn-secondary btn-sm mt-2" onclick="loadTransactions()">Try Again</button>
        </td>
      </tr>
    `;
    showToast('Failed to load borrowing transactions.', 'error');
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
    const eqName = (item.equipment?.equipment_name || '').toLowerCase();
    const assetCode = (item.equipment?.asset_code || '').toLowerCase();
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

    const actionButton = !isReturned
      ? `<button class="btn btn-success btn-sm" onclick="handleReturnEquipment(${tx.id}, ${tx.equipment_id}, '${escapeHtml(tx.equipment?.equipment_name || 'Equipment')}', '${escapeHtml(tx.borrower_name)}')" title="Mark Equipment as Returned">
           ↩ Return Equipment
         </button>`
      : `<span style="font-size:0.8rem; color: var(--text-muted);">Completed</span>`;

    const assetCode = tx.equipment?.asset_code || 'N/A';
    const eqName = tx.equipment?.equipment_name || 'Item Removed';

    return `
      <tr>
        <td><strong>${escapeHtml(assetCode)}</strong></td>
        <td>${escapeHtml(eqName)}</td>
        <td><strong>${escapeHtml(tx.borrower_name)}</strong></td>
        <td><span class="badge" style="background:#f1f5f9; color:#475569;">${escapeHtml(tx.borrower_type)}</span></td>
        <td>${escapeHtml(tx.department)}</td>
        <td>${formatDate(tx.date_borrowed)}</td>
        <td><span style="${isOverdue ? 'color: var(--danger-color); font-weight: bold;' : ''}">${formatDate(tx.due_date)}</span></td>
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

  const equipment_id = eqSelect.value;
  const borrower_name = nameInput.value.trim();
  const borrower_type = typeSelect.value;
  const department = deptInput.value.trim();
  const date_borrowed = dateBorrowedInput.value;
  const due_date = dueDateInput.value;

  if (!equipment_id) {
    showToast('Please select an available equipment item (BR-03).', 'warning');
    eqSelect.focus();
    return;
  }
  if (!borrower_name) {
    showToast('Borrower name is required (BR-04).', 'warning');
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
    showToast('Due date cannot be earlier than date borrowed (BR-05).', 'warning');
    dueDateInput.focus();
    return;
  }

  btnSubmit.disabled = true;
  btnSubmit.innerHTML = '<span>Processing...</span>';

  try {
    const client = getSupabase();
    if (!client) throw new Error('Supabase client is not available.');

    const { data: { session } } = await client.auth.getSession();
    const user_id = session?.user?.id || null;

    const { data: eqCheck, error: checkErr } = await client
      .from('equipment')
      .select('id, availability, equipment_name')
      .eq('id', equipment_id)
      .single();

    if (checkErr || !eqCheck) {
      throw new Error('Could not verify equipment availability.');
    }

    if (eqCheck.availability !== 'Available') {
      throw new Error(`"${eqCheck.equipment_name}" is no longer available for borrowing.`);
    }

    const { error: txErr } = await client
      .from('borrow_transactions')
      .insert([{
        equipment_id: parseInt(equipment_id, 10),
        borrower_name,
        borrower_type,
        department,
        date_borrowed,
        due_date,
        status: 'Borrowed',
        user_id
      }]);

    if (txErr) throw txErr;

    const { error: eqUpdateErr } = await client
      .from('equipment')
      .update({ availability: 'Borrowed' })
      .eq('id', equipment_id);

    if (eqUpdateErr) {
      console.error('Warning: Failed to update equipment status:', eqUpdateErr);
    }

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
    if (!client) return;

    const todayDate = getTodayDateString();

    const { data: currentTx, error: fetchErr } = await client
      .from('borrow_transactions')
      .select('status')
      .eq('id', transactionId)
      .single();

    if (fetchErr || !currentTx) {
      throw new Error('Transaction record not found.');
    }

    if (currentTx.status === 'Returned') {
      showToast('This transaction has already been returned (BR-12).', 'info');
      return;
    }

    const { error: updateTxErr } = await client
      .from('borrow_transactions')
      .update({
        status: 'Returned',
        date_returned: todayDate
      })
      .eq('id', transactionId);

    if (updateTxErr) throw updateTxErr;

    if (equipmentId) {
      const { error: updateEqErr } = await client
        .from('equipment')
        .update({ availability: 'Available' })
        .eq('id', equipmentId);

      if (updateEqErr) {
        console.error('Warning: Failed to reset equipment availability:', updateEqErr);
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
    const client = getSupabase();
    if (!client) return;

    const { data: equipmentList, error: eqErr } = await client
      .from('equipment')
      .select('id, availability');

    if (eqErr) throw eqErr;

    const totalEq = equipmentList ? equipmentList.length : 0;
    const availEq = equipmentList ? equipmentList.filter(e => e.availability === 'Available').length : 0;
    const borrowEq = equipmentList ? equipmentList.filter(e => e.availability === 'Borrowed').length : 0;

    if (statTotal) statTotal.textContent = totalEq;
    if (statAvail) statAvail.textContent = availEq;
    if (statBorrow) statBorrow.textContent = borrowEq;

    const { data: txList, error: txErr } = await client
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
          equipment_name,
          asset_code
        )
      `)
      .order('created_at', { ascending: false });

    if (txErr) throw txErr;

    const transactions = txList || [];
    const returnedCount = transactions.filter(t => t.status === 'Returned').length;
    
    const overdueTransactions = transactions.filter(t => isTransactionOverdue(t.due_date, t.status));
    const overdueCount = overdueTransactions.length;

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
      const recent = transactions.slice(0, 5);
      if (recent.length === 0) {
        recentTableBody.innerHTML = `
          <tr>
            <td colspan="7" class="text-center" style="padding: 2rem; color: var(--text-muted);">
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

          return `
            <tr>
              <td><strong>${escapeHtml(tx.equipment?.asset_code || 'N/A')}</strong></td>
              <td>${escapeHtml(tx.equipment?.equipment_name || 'Unknown')}</td>
              <td>${escapeHtml(tx.borrower_name)}</td>
              <td>${escapeHtml(tx.department)}</td>
              <td>${formatDate(tx.date_borrowed)}</td>
              <td><span style="${isOverdue ? 'color: var(--danger-color); font-weight: 600;' : ''}">${formatDate(tx.due_date)}</span></td>
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
