/**
 * Leader Module
 * Handles leave recording for production line leaders
 * Supports Day / Night shift with separate employees per shift
 */
const LeaderModule = (() => {
  let currentLineId = null;
  let currentShift = 'day';
  let currentDate = new Date().toISOString().split('T')[0];
  let availableEmployees = [];

  function render() {
    const settings = DataManager.getSettings();
    currentLineId = settings.currentLineId;
    currentShift = settings.currentShift || 'day';
    const t = I18n.t;

    const container = document.getElementById('main-content');
    container.innerHTML = `
      <div class="container-fluid py-3 animate-fade-in">
        <!-- Line & Shift Selection -->
        <div class="row mb-3">
          <div class="col-12">
            <div class="card shadow-sm border-0">
              <div class="card-body">
                <div class="row align-items-end g-3">
                  <div class="col-md-2">
                    <label class="form-label fw-bold">
                      <i class="bi bi-diagram-3"></i> ${t('selectLine')}
                    </label>
                    <select id="line-select" class="form-select form-select-lg">
                      <option value="">-- ${t('selectLine')} --</option>
                      ${generateLineOptions()}
                    </select>
                  </div>
                  <div class="col-md-3">
                    <label class="form-label fw-bold">
                      <i class="bi bi-clock"></i> ${t('selectShift')}
                    </label>
                    <div class="btn-group w-100" role="group" id="shift-selector">
                      <button type="button" class="btn btn-lg ${currentShift === 'day' ? 'btn-warning' : 'btn-outline-warning'}" data-shift="day">
                        <i class="bi bi-sun"></i> ${t('shiftDay')}
                      </button>
                      <button type="button" class="btn btn-lg ${currentShift === 'night' ? 'btn-dark' : 'btn-outline-dark'}" data-shift="night">
                        <i class="bi bi-moon-stars"></i> ${t('shiftNight')}
                      </button>
                    </div>
                  </div>
                  <div class="col-md-2">
                    <label class="form-label fw-bold">
                      <i class="bi bi-person-badge"></i> ${t('leaderName')}
                    </label>
                    <input type="text" id="leader-name" class="form-control" 
                           value="" placeholder="${t('leaderName')}">
                  </div>
                  <div class="col-md-3">
                    <label class="form-label fw-bold">
                      <i class="bi bi-calendar-date"></i> ${t('selectDate')}
                    </label>
                    <input type="date" id="leave-date" class="form-control form-control-lg" 
                           value="${currentDate}">
                  </div>
                  <div class="col-md-2">
                    <button id="btn-save-setup" class="btn btn-primary btn-lg w-100">
                      <i class="bi bi-check-lg"></i> ${t('saveSetup')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div id="leader-content" style="display: ${currentLineId ? 'block' : 'none'};">
          <!-- Shift Badge indicator -->
          <div class="mb-3" id="shift-badge-bar">
            ${renderShiftBadge()}
          </div>

          <!-- Stats Cards -->
          <div class="row mb-3" id="stats-cards"></div>

          <div class="row g-3">
            <!-- Left: Employee Management & Leave Entry -->
            <div class="col-lg-5">
              <!-- Record Leave -->
              <div class="card shadow-sm border-0 mb-3">
                <div class="card-header bg-danger text-white">
                  <h5 class="mb-0"><i class="bi bi-calendar-x"></i> ${t('recordLeave')}</h5>
                </div>
                <div class="card-body">
                  <div class="mb-3">
                    <label class="form-label">${t('employeeName')}</label>
                    <div class="position-relative" id="employee-search-wrapper">
                      <div class="input-group">
                        <span class="input-group-text"><i class="bi bi-search"></i></span>
                        <input type="text" id="employee-search-input" class="form-control" 
                               placeholder="${t('searchEmployee')}" autocomplete="off">
                      </div>
                      <input type="hidden" id="employee-select-value">
                      <div id="employee-dropdown" class="employee-search-dropdown" style="display:none;">
                      </div>
                    </div>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">${t('leaveType')}</label>
                    <select id="leave-type" class="form-select">
                      <option value="ลาป่วย">${t('leaveTypeSick')}</option>
                      <option value="ลากิจ">${t('leaveTypePersonal')}</option>
                      <option value="ลาพักร้อน">${t('leaveTypeVacation')}</option>
                      <option value="ลาคลอด">${t('leaveTypeMaternity')}</option>
                      <option value="มาสาย">${t('leaveTypeLate')}</option>
                      <option value="ขาด">${t('leaveTypeAbsent')}</option>
                      <option value="อื่นๆ">${t('leaveTypeOther')}</option>
                    </select>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">${t('leaveDate')}</label>
                    <input type="date" id="record-leave-date" class="form-control" value="${currentDate}">
                  </div>
                  <div class="mb-3">
                    <label class="form-label">${t('note')}</label>
                    <input type="text" id="leave-note" class="form-control" placeholder="${t('note')}">
                  </div>
                  <button id="btn-record-leave" class="btn btn-danger w-100">
                    <i class="bi bi-plus-circle"></i> ${t('recordLeave')}
                  </button>
                </div>
              </div>

              <!-- Employee List Management -->
              <div class="card shadow-sm border-0">
                <div class="card-header bg-info text-white d-flex justify-content-between align-items-center">
                  <h5 class="mb-0"><i class="bi bi-people"></i> ${t('employeeList')}</h5>
                  <span class="badge bg-white text-info" id="emp-count">0</span>
                </div>
                <div class="card-body">
                  <!-- Upload Excel -->
                  <div class="mb-3">
                    <label class="form-label text-muted small">${t('uploadExcelHint')}</label>
                    <div class="d-flex gap-2">
                      <input type="file" id="excel-upload" class="form-control" accept=".xlsx,.xls">
                      <button id="btn-download-template" class="btn btn-outline-secondary btn-sm text-nowrap" title="${t('downloadTemplate')}">
                        <i class="bi bi-download"></i>
                      </button>
                    </div>
                  </div>
                  <!-- Add manually -->
                  <div class="input-group mb-3">
                    <input type="text" id="new-employee-name" class="form-control" 
                           placeholder="${t('employeeName')}">
                    <button id="btn-add-employee" class="btn btn-outline-info">
                      <i class="bi bi-person-plus"></i> ${t('addManually')}
                    </button>
                  </div>
                  <!-- Search/filter employee list -->
                  <div class="input-group mb-2">
                    <span class="input-group-text"><i class="bi bi-funnel"></i></span>
                    <input type="text" id="employee-list-filter" class="form-control form-control-sm" 
                           placeholder="${t('filterEmployee')}">
                  </div>
                  <!-- Select all & Delete selected -->
                  <div class="d-flex justify-content-between align-items-center mb-2">
                    <div class="form-check">
                      <input class="form-check-input" type="checkbox" id="select-all-emp">
                      <label class="form-check-label small" for="select-all-emp">${t('selectAll')}</label>
                    </div>
                    <button id="btn-delete-selected" class="btn btn-danger btn-sm" style="display:none;">
                      <i class="bi bi-trash"></i> ${t('deleteSelected')} (<span id="selected-count">0</span>)
                    </button>
                  </div>
                  <!-- Employee list -->
                  <div id="employee-list" class="list-group" style="max-height: 400px; overflow-y: auto;">
                  </div>
                </div>
              </div>
            </div>

            <!-- Right: Today's Leave Records -->
            <div class="col-lg-7">
              <div class="card shadow-sm border-0">
                <div class="card-header bg-warning text-dark d-flex justify-content-between align-items-center">
                  <h5 class="mb-0"><i class="bi bi-list-check"></i> ${t('todayLeaves')}</h5>
                  <span class="badge bg-dark" id="leave-count">0</span>
                </div>
                <div class="card-body p-0">
                  <!-- Search today's leaves -->
                  <div class="p-3 pb-0 mb-3">
                    <div class="input-group input-group-sm">
                      <span class="input-group-text"><i class="bi bi-search"></i></span>
                      <input type="text" id="leave-table-search" class="form-control" 
                             placeholder="${t('searchEmployee')}">
                    </div>
                  </div>
                  <div class="table-responsive">
                    <table class="table table-hover table-striped mb-0">
                      <thead class="table-dark">
                        <tr>
                          <th>#</th>
                          <th>${t('employeeName')}</th>
                          <th>${t('leaveType')}</th>
                          <th>${t('note')}</th>
                          <th>${t('actions')}</th>
                        </tr>
                      </thead>
                      <tbody id="leave-table-body">
                      </tbody>
                    </table>
                  </div>
                  <div id="no-leave-msg" class="text-center text-muted py-4" style="display: none;">
                    <i class="bi bi-check-circle" style="font-size: 3rem;"></i>
                    <p class="mt-2">${t('noLeaves')}</p>
                  </div>
                </div>
              </div>

              <!-- History for this line -->
              <div class="card shadow-sm border-0 mt-3">
                <div class="card-header bg-secondary text-white">
                  <h5 class="mb-0"><i class="bi bi-clock-history"></i> ${t('viewHistory')}</h5>
                </div>
                <div class="card-body">
                  <div class="row g-2 mb-3">
                    <div class="col">
                      <input type="date" id="history-from" class="form-control" value="${getWeekAgo()}">
                    </div>
                    <div class="col">
                      <input type="date" id="history-to" class="form-control" value="${currentDate}">
                    </div>
                    <div class="col-auto">
                      <button id="btn-search-history" class="btn btn-secondary">
                        <i class="bi bi-search"></i> ${t('search')}
                      </button>
                    </div>
                  </div>
                  <!-- Search history -->
                  <div class="input-group input-group-sm mb-3">
                    <span class="input-group-text"><i class="bi bi-search"></i></span>
                    <input type="text" id="history-search" class="form-control" 
                           placeholder="${t('searchEmployee')}">
                  </div>
                  <div id="history-table-container"></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- No line selected message -->
        <div id="no-line-msg" style="display: ${currentLineId ? 'none' : 'block'};">
          <div class="text-center py-5">
            <i class="bi bi-arrow-up-circle" style="font-size: 4rem; color: var(--bs-primary);"></i>
            <h3 class="mt-3 text-muted">${t('selectLine')}</h3>
          </div>
        </div>
      </div>
    `;

    bindEvents();
    if (currentLineId) {
      document.getElementById('line-select').value = currentLineId;
      loadLeaderName();
      refreshData();
    }
  }

  function renderShiftBadge() {
    const t = I18n.t;
    if (currentShift === 'day') {
      return `<span class="badge bg-warning text-dark fs-6 px-3 py-2"><i class="bi bi-sun me-1"></i> ${t('shiftDay')}</span>`;
    } else {
      return `<span class="badge bg-dark fs-6 px-3 py-2"><i class="bi bi-moon-stars me-1"></i> ${t('shiftNight')}</span>`;
    }
  }

  function loadLeaderName() {
    if (!currentLineId) return;
    const line = DataManager.getLine(currentLineId);
    const leader = line?.shifts?.[currentShift]?.leader || '';
    document.getElementById('leader-name').value = leader;
  }

  function generateLineOptions() {
    const lines = DataManager.getLines();
    return Object.keys(lines)
      .sort((a, b) => Number(a) - Number(b))
      .map(
        (id) =>
          `<option value="${id}" ${id == currentLineId ? 'selected' : ''}>${lines[id].name}</option>`
      )
      .join('');
  }

  function getWeekAgo() {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  }

  function bindEvents() {
    // Line selection change
    document.getElementById('line-select').addEventListener('change', (e) => {
      currentLineId = e.target.value;
      if (currentLineId) {
        document.getElementById('leader-content').style.display = 'block';
        document.getElementById('no-line-msg').style.display = 'none';
        DataManager.saveSettings({ currentLineId });
        loadLeaderName();
        refreshData();
      } else {
        document.getElementById('leader-content').style.display = 'none';
        document.getElementById('no-line-msg').style.display = 'block';
      }
    });

    // Shift selector
    document.querySelectorAll('#shift-selector button').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentShift = btn.getAttribute('data-shift');
        DataManager.saveSettings({ currentShift });
        // Update button styles
        document.querySelectorAll('#shift-selector button').forEach((b) => {
          const s = b.getAttribute('data-shift');
          if (s === 'day') {
            b.className = `btn btn-lg ${currentShift === 'day' ? 'btn-warning' : 'btn-outline-warning'}`;
          } else {
            b.className = `btn btn-lg ${currentShift === 'night' ? 'btn-dark' : 'btn-outline-dark'}`;
          }
        });
        // Update shift badge
        document.getElementById('shift-badge-bar').innerHTML = renderShiftBadge();
        loadLeaderName();
        refreshData();
      });
    });

    // Date change
    document.getElementById('leave-date').addEventListener('change', (e) => {
      currentDate = e.target.value;
      refreshLeaveTable();
      refreshStats();
    });

    // Save setup
    document.getElementById('btn-save-setup').addEventListener('click', () => {
      const leaderName = document.getElementById('leader-name').value.trim();
      const lineId = document.getElementById('line-select').value;
      if (lineId) {
        // Save leader name for current shift
        const line = DataManager.getLine(lineId);
        if (line && line.shifts && line.shifts[currentShift]) {
          line.shifts[currentShift].leader = leaderName;
          DataManager.saveLine(lineId, line);
        }
        DataManager.saveSettings({ currentLineId: lineId, currentShift });
        showToast(I18n.t('success'), 'success');
      }
    });

    // Record leave
    document
      .getElementById('btn-record-leave')
      .addEventListener('click', recordLeave);

    // Add employee manually
    document
      .getElementById('btn-add-employee')
      .addEventListener('click', addEmployeeManually);
    document
      .getElementById('new-employee-name')
      .addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addEmployeeManually();
      });

    // Excel upload
    document
      .getElementById('excel-upload')
      .addEventListener('change', handleExcelUpload);

    // Download template
    document
      .getElementById('btn-download-template')
      .addEventListener('click', downloadTemplate);

    // Search history
    document
      .getElementById('btn-search-history')
      .addEventListener('click', searchHistory);

    // Today's leave table search
    document.getElementById('leave-table-search').addEventListener('input', (e) => {
      const keyword = e.target.value.trim().toLowerCase();
      const rows = document.querySelectorAll('#leave-table-body tr');
      let visibleCount = 0;
      rows.forEach((row) => {
        const text = row.textContent.toLowerCase();
        const match = text.includes(keyword);
        row.style.display = match ? '' : 'none';
        if (match) visibleCount++;
      });
      document.getElementById('leave-count').textContent = keyword ? visibleCount : rows.length;
      const noMsg = document.getElementById('no-leave-msg');
      if (noMsg) {
        noMsg.style.display = (rows.length > 0 && visibleCount === 0) ? 'block' : (rows.length === 0 ? 'block' : 'none');
      }
    });

    // History table search
    document.getElementById('history-search').addEventListener('input', (e) => {
      const keyword = e.target.value.trim().toLowerCase();
      const rows = document.querySelectorAll('#history-table-container tbody tr');
      rows.forEach((row) => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(keyword) ? '' : 'none';
      });
    });

    // Employee search dropdown
    const empSearchInput = document.getElementById('employee-search-input');
    const empDropdown = document.getElementById('employee-dropdown');
    const empHiddenInput = document.getElementById('employee-select-value');

    empSearchInput.addEventListener('focus', () => {
      renderEmployeeDropdown(empSearchInput.value);
      empDropdown.style.display = 'block';
    });

    empSearchInput.addEventListener('input', () => {
      empHiddenInput.value = '';
      renderEmployeeDropdown(empSearchInput.value);
      empDropdown.style.display = 'block';
    });

    empDropdown.addEventListener('click', (e) => {
      const item = e.target.closest('.dropdown-item[data-value]');
      if (item) {
        const name = item.getAttribute('data-value').replace(/\\'/g, "'");
        empSearchInput.value = name;
        empHiddenInput.value = name;
        empDropdown.style.display = 'none';
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#employee-search-wrapper')) {
        empDropdown.style.display = 'none';
      }
    });

    // Employee list filter
    document.getElementById('employee-list-filter').addEventListener('input', (e) => {
      const keyword = e.target.value.trim().toLowerCase();
      const items = document.querySelectorAll('#employee-list .list-group-item');
      items.forEach((item) => {
        const text = item.textContent.toLowerCase();
        if (text.includes(keyword)) {
          item.classList.remove('d-none');
        } else {
          item.classList.add('d-none');
        }
      });
    });

    // Select all checkbox
    document.getElementById('select-all-emp').addEventListener('change', (e) => {
      const checked = e.target.checked;
      document.querySelectorAll('#employee-list .emp-checkbox').forEach((cb) => {
        // Only check visible items
        if (!cb.closest('.list-group-item').classList.contains('d-none')) {
          cb.checked = checked;
        }
      });
      updateDeleteSelectedBtn();
    });

    // Individual checkbox change (event delegation)
    document.getElementById('employee-list').addEventListener('change', (e) => {
      if (e.target.classList.contains('emp-checkbox')) {
        updateDeleteSelectedBtn();
      }
    });

    // Delete selected button
    document.getElementById('btn-delete-selected').addEventListener('click', removeSelectedEmployees);
  }

  function refreshData() {
    refreshEmployeeList();
    refreshEmployeeSelect();
    refreshLeaveTable();
    refreshStats();
  }

  function refreshStats() {
    if (!currentLineId) return;
    const employees = DataManager.getEmployees(currentLineId, currentShift);
    const leaves = DataManager.getLeaveRecordsByDateAndLine(
      currentDate,
      currentLineId,
      currentShift
    );
    const total = employees.length;
    const onLeave = leaves.length;
    const attendance = total > 0 ? (((total - onLeave) / total) * 100).toFixed(1) : 100;
    const t = I18n.t;

    document.getElementById('stats-cards').innerHTML = `
      <div class="col-md-4">
        <div class="card stat-card border-0 shadow-sm bg-primary text-white">
          <div class="card-body text-center">
            <i class="bi bi-people" style="font-size: 2rem;"></i>
            <h2 class="mb-0">${total}</h2>
            <small class="opacity-75">${t('totalEmployees')}</small>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card stat-card border-0 shadow-sm bg-danger text-white">
          <div class="card-body text-center">
            <i class="bi bi-person-dash" style="font-size: 2rem;"></i>
            <h2 class="mb-0">${onLeave}</h2>
            <small class="opacity-75">${t('onLeaveToday')}</small>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card stat-card border-0 shadow-sm ${attendance >= 90 ? 'bg-success' : attendance >= 75 ? 'bg-warning' : 'bg-danger'} text-white">
          <div class="card-body text-center">
            <i class="bi bi-graph-up" style="font-size: 2rem;"></i>
            <h2 class="mb-0">${attendance}%</h2>
            <small class="opacity-75">${t('attendanceRate')}</small>
          </div>
        </div>
      </div>
    `;
  }

  function refreshEmployeeList() {
    if (!currentLineId) return;
    const employees = DataManager.getEmployees(currentLineId, currentShift);
    const container = document.getElementById('employee-list');
    const t = I18n.t;

    document.getElementById('emp-count').textContent = employees.length;
    // Reset filter input
    const filterInput = document.getElementById('employee-list-filter');
    if (filterInput) filterInput.value = '';

    if (employees.length === 0) {
      container.innerHTML = `<div class="text-center text-muted py-3"><small>${t('noEmployees')}</small></div>`;
      return;
    }

    container.innerHTML = employees
      .map(
        (emp, idx) => `
      <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center py-2">
        <div class="d-flex align-items-center gap-2">
          <input class="form-check-input emp-checkbox" type="checkbox" value="${escapeHtml(emp)}">
          <span><small class="text-muted">${idx + 1}.</small> ${emp}</span>
        </div>
        <button class="btn btn-outline-danger btn-sm" onclick="LeaderModule.removeEmp('${escapeHtml(emp)}')">
          <i class="bi bi-x"></i>
        </button>
      </div>
    `
      )
      .join('');

    // Reset select-all and delete-selected button
    const selectAllCb = document.getElementById('select-all-emp');
    if (selectAllCb) selectAllCb.checked = false;
    const btnDeleteSel = document.getElementById('btn-delete-selected');
    if (btnDeleteSel) { btnDeleteSel.style.display = 'none'; }
    const selCount = document.getElementById('selected-count');
    if (selCount) selCount.textContent = '0';
  }

  function refreshEmployeeSelect() {
    if (!currentLineId) return;
    const employees = DataManager.getEmployees(currentLineId, currentShift);
    const leaves = DataManager.getLeaveRecordsByDateAndLine(
      currentDate,
      currentLineId,
      currentShift
    );
    const onLeaveNames = leaves.map((l) => l.employeeName);
    availableEmployees = employees.filter((emp) => !onLeaveNames.includes(emp));
    // Clear the search input
    const searchInput = document.getElementById('employee-search-input');
    const hiddenInput = document.getElementById('employee-select-value');
    if (searchInput) searchInput.value = '';
    if (hiddenInput) hiddenInput.value = '';
    renderEmployeeDropdown('');
  }

  function renderEmployeeDropdown(filter) {
    const dropdown = document.getElementById('employee-dropdown');
    if (!dropdown) return;
    const t = I18n.t;
    const keyword = filter.trim().toLowerCase();
    const filtered = keyword
      ? availableEmployees.filter((emp) => emp.toLowerCase().includes(keyword))
      : availableEmployees;

    if (filtered.length === 0) {
      dropdown.innerHTML = `<div class="dropdown-item text-muted disabled"><i class="bi bi-emoji-frown"></i> ${t('noMatchFound')}</div>`;
    } else {
      dropdown.innerHTML = filtered
        .map(
          (emp) =>
            `<div class="dropdown-item" data-value="${escapeHtml(emp)}">${highlightMatch(emp, keyword)}</div>`
        )
        .join('');
    }
  }

  function highlightMatch(text, keyword) {
    if (!keyword) return text;
    const idx = text.toLowerCase().indexOf(keyword);
    if (idx === -1) return text;
    return (
      text.substring(0, idx) +
      '<strong class="text-primary">' +
      text.substring(idx, idx + keyword.length) +
      '</strong>' +
      text.substring(idx + keyword.length)
    );
  }

  function refreshLeaveTable() {
    if (!currentLineId) return;
    const leaves = DataManager.getLeaveRecordsByDateAndLine(
      currentDate,
      currentLineId,
      currentShift
    );
    const tbody = document.getElementById('leave-table-body');
    const noMsg = document.getElementById('no-leave-msg');
    const t = I18n.t;

    document.getElementById('leave-count').textContent = leaves.length;
    // Reset search input
    const leaveSearch = document.getElementById('leave-table-search');
    if (leaveSearch) leaveSearch.value = '';

    if (leaves.length === 0) {
      tbody.innerHTML = '';
      noMsg.style.display = 'block';
      return;
    }

    noMsg.style.display = 'none';
    tbody.innerHTML = leaves
      .map(
        (leave, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td><strong>${leave.employeeName}</strong></td>
        <td><span class="badge ${getLeaveTypeBadge(leave.leaveType)}">${I18n.translateLeaveType(leave.leaveType)}</span></td>
        <td>${leave.note || '-'}</td>
        <td>
          <button class="btn btn-outline-danger btn-sm" onclick="LeaderModule.removeLeave('${leave.id}')">
            <i class="bi bi-trash"></i>
          </button>
        </td>
      </tr>
    `
      )
      .join('');
  }

  function getLeaveTypeBadge(type) {
    const map = {
      'ลาป่วย': 'bg-danger',
      'ลากิจ': 'bg-warning text-dark',
      'ลาพักร้อน': 'bg-info',
      'ลาคลอด': 'bg-primary',
      'อื่นๆ': 'bg-secondary',
      'มาสาย': 'bg-orange text-dark',
      'ขาด': 'bg-dark',
    };
    return map[type] || 'bg-secondary';
  }

  function recordLeave() {
    const employeeName = document.getElementById('employee-select-value').value;
    const leaveType = document.getElementById('leave-type').value;
    const recordDate = document.getElementById('record-leave-date').value || currentDate;
    const note = document.getElementById('leave-note').value.trim();

    if (!employeeName) {
      showToast(I18n.t('employeeName'), 'warning');
      return;
    }

    DataManager.addLeaveRecord({
      date: recordDate,
      lineId: currentLineId,
      shift: currentShift,
      employeeName,
      leaveType,
      note,
    });

    document.getElementById('leave-note').value = '';

    // Switch table view to recorded date if different
    if (recordDate !== currentDate) {
      currentDate = recordDate;
      document.getElementById('leave-date').value = currentDate;
    }

    refreshEmployeeSelect();
    refreshLeaveTable();
    refreshStats();
    showToast(I18n.t('success'), 'success');
  }

  function addEmployeeManually() {
    const input = document.getElementById('new-employee-name');
    const name = input.value.trim();
    if (!name || !currentLineId) return;

    DataManager.addEmployee(currentLineId, currentShift, name);
    input.value = '';
    refreshEmployeeList();
    refreshEmployeeSelect();
    refreshStats();
  }

  function updateDeleteSelectedBtn() {
    const checked = document.querySelectorAll('#employee-list .emp-checkbox:checked');
    const btn = document.getElementById('btn-delete-selected');
    const countEl = document.getElementById('selected-count');
    if (btn) btn.style.display = checked.length > 0 ? 'inline-block' : 'none';
    if (countEl) countEl.textContent = checked.length;
    // Sync select-all checkbox
    const allCbs = document.querySelectorAll('#employee-list .emp-checkbox');
    const selectAll = document.getElementById('select-all-emp');
    if (selectAll) selectAll.checked = allCbs.length > 0 && checked.length === allCbs.length;
  }

  function removeSelectedEmployees() {
    const checked = document.querySelectorAll('#employee-list .emp-checkbox:checked');
    if (checked.length === 0) return;
    const names = Array.from(checked).map((cb) => cb.value.replace(/\\'/g, "'"));
    if (!confirm(I18n.t('confirmDeleteSelected').replace('{count}', names.length))) return;
    names.forEach((name) => DataManager.removeEmployee(currentLineId, currentShift, name));
    refreshEmployeeList();
    refreshEmployeeSelect();
    refreshStats();
  }

  function removeEmp(name) {
    if (confirm(I18n.t('confirmDelete'))) {
      DataManager.removeEmployee(currentLineId, currentShift, name);
      refreshEmployeeList();
      refreshEmployeeSelect();
      refreshStats();
    }
  }

  function removeLeave(recordId) {
    if (confirm(I18n.t('confirmDelete'))) {
      DataManager.removeLeaveRecord(recordId);
      refreshEmployeeSelect();
      refreshLeaveTable();
      refreshStats();
    }
  }

  function handleExcelUpload(e) {
    const file = e.target.files[0];
    if (!file || !currentLineId) return;

    const reader = new FileReader();
    reader.onload = function (evt) {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet);

        const names = [];
        for (const row of json) {
          const name =
            row['ชื่อ'] ||
            row['Name'] ||
            row['name'] ||
            row['ชื่อ-สกุล'] ||
            row['ชื่อ-นามสกุล'] ||
            row['พนักงาน'] ||
            row['Employee'] ||
            Object.values(row)[0];
          if (name && String(name).trim()) {
            names.push(String(name).trim());
          }
        }

        if (names.length > 0) {
          const existing = DataManager.getEmployees(currentLineId, currentShift);
          const merged = [...new Set([...existing, ...names])];
          DataManager.setEmployees(currentLineId, currentShift, merged);
          refreshEmployeeList();
          refreshEmployeeSelect();
          refreshStats();
          showToast(
            `${I18n.t('success')} +${names.length} ${I18n.t('person')}`,
            'success'
          );
        }
      } catch (err) {
        showToast(I18n.t('importError'), 'danger');
        console.error(err);
      }
    };
    reader.readAsArrayBuffer(file);
    e.target.value = '';
  }

  function downloadTemplate() {
    const wb = XLSX.utils.book_new();
    const data = [
      ['ชื่อ (Name)'],
      ['สมชาย ใจดี'],
      ['สมหญิง รักสวย'],
      ['John Doe'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [{ wch: 30 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Employees');
    XLSX.writeFile(wb, 'employee_template.xlsx');
  }

  function searchHistory() {
    const from = document.getElementById('history-from').value;
    const to = document.getElementById('history-to').value;
    if (!from || !to || !currentLineId) return;

    const records = DataManager.getLeaveRecordsByDateRange(from, to).filter(
      (r) => String(r.lineId) === String(currentLineId) && r.shift === currentShift
    );

    const container = document.getElementById('history-table-container');
    const t = I18n.t;

    if (records.length === 0) {
      container.innerHTML = `<p class="text-center text-muted">${t('noData')}</p>`;
      return;
    }

    // Group by date
    const grouped = {};
    records.forEach((r) => {
      if (!grouped[r.date]) grouped[r.date] = [];
      grouped[r.date].push(r);
    });

    let html = `<div class="table-responsive"><table class="table table-sm table-bordered">
      <thead class="table-dark">
        <tr><th>${t('date')}</th><th>${t('employeeName')}</th><th>${t('leaveType')}</th><th>${t('note')}</th></tr>
      </thead><tbody>`;

    Object.keys(grouped)
      .sort()
      .reverse()
      .forEach((date) => {
        grouped[date].forEach((r, i) => {
          html += `<tr>
          ${i === 0 ? `<td rowspan="${grouped[date].length}" class="fw-bold">${date}</td>` : ''}
          <td>${r.employeeName}</td>
          <td><span class="badge ${getLeaveTypeBadge(r.leaveType)}">${I18n.translateLeaveType(r.leaveType)}</span></td>
          <td>${r.note || '-'}</td>
        </tr>`;
        });
      });

    html += '</tbody></table></div>';
    container.innerHTML = html;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML.replace(/'/g, "\\'");
  }

  return {
    render,
    removeEmp,
    removeLeave,
  };
})();
