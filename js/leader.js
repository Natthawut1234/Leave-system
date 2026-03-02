/**
 * Leader Module
 * Handles leave recording for production line leaders
 */
const LeaderModule = (() => {
  let currentLineId = null;
  let currentDate = new Date().toISOString().split('T')[0];

  function render() {
    const settings = DataManager.getSettings();
    currentLineId = settings.currentLineId;
    const t = I18n.t;

    const container = document.getElementById('main-content');
    container.innerHTML = `
      <div class="container-fluid py-3">
        <!-- Line Selection & Setup -->
        <div class="row mb-3">
          <div class="col-12">
            <div class="card shadow-sm border-0">
              <div class="card-body">
                <div class="row align-items-end g-3">
                  <div class="col-md-3">
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
                      <i class="bi bi-person-badge"></i> ${t('leaderName')}
                    </label>
                    <input type="text" id="leader-name" class="form-control" 
                           value="${settings.leaderName || ''}" placeholder="${t('leaderName')}">
                  </div>
                  <div class="col-md-3">
                    <label class="form-label fw-bold">
                      <i class="bi bi-calendar-date"></i> ${t('selectDate')}
                    </label>
                    <input type="date" id="leave-date" class="form-control form-control-lg" 
                           value="${currentDate}">
                  </div>
                  <div class="col-md-3">
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
                    <select id="employee-select" class="form-select">
                      <option value="">-- ${t('employeeName')} --</option>
                    </select>
                  </div>
                  <div class="mb-3">
                    <label class="form-label">${t('leaveType')}</label>
                    <select id="leave-type" class="form-select">
                      <option value="ลาป่วย">${t('leaveTypeSick')}</option>
                      <option value="ลากิจ">${t('leaveTypePersonal')}</option>
                      <option value="ลาพักร้อน">${t('leaveTypeVacation')}</option>
                      <option value="ลาคลอด">${t('leaveTypeMaternity')}</option>
                      <option value="อื่นๆ">${t('leaveTypeOther')}</option>
                    </select>
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
                  <!-- Employee list -->
                  <div id="employee-list" class="list-group" style="max-height: 300px; overflow-y: auto;">
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
      refreshData();
    }
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
        refreshData();
      } else {
        document.getElementById('leader-content').style.display = 'none';
        document.getElementById('no-line-msg').style.display = 'block';
      }
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
        DataManager.saveLine(lineId, { leader: leaderName });
        DataManager.saveSettings({ leaderName, currentLineId: lineId });
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
  }

  function refreshData() {
    refreshEmployeeList();
    refreshEmployeeSelect();
    refreshLeaveTable();
    refreshStats();
  }

  function refreshStats() {
    if (!currentLineId) return;
    const employees = DataManager.getEmployees(currentLineId);
    const leaves = DataManager.getLeaveRecordsByDateAndLine(
      currentDate,
      currentLineId
    );
    const total = employees.length;
    const onLeave = leaves.length;
    const attendance = total > 0 ? (((total - onLeave) / total) * 100).toFixed(1) : 100;
    const t = I18n.t;

    document.getElementById('stats-cards').innerHTML = `
      <div class="col-md-4">
        <div class="card border-0 shadow-sm bg-primary text-white">
          <div class="card-body text-center">
            <i class="bi bi-people" style="font-size: 2rem;"></i>
            <h2 class="mb-0">${total}</h2>
            <small>${t('totalEmployees')}</small>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card border-0 shadow-sm bg-danger text-white">
          <div class="card-body text-center">
            <i class="bi bi-person-dash" style="font-size: 2rem;"></i>
            <h2 class="mb-0">${onLeave}</h2>
            <small>${t('onLeaveToday')}</small>
          </div>
        </div>
      </div>
      <div class="col-md-4">
        <div class="card border-0 shadow-sm ${attendance >= 90 ? 'bg-success' : attendance >= 75 ? 'bg-warning' : 'bg-danger'} text-white">
          <div class="card-body text-center">
            <i class="bi bi-graph-up" style="font-size: 2rem;"></i>
            <h2 class="mb-0">${attendance}%</h2>
            <small>${t('attendanceRate')}</small>
          </div>
        </div>
      </div>
    `;
  }

  function refreshEmployeeList() {
    if (!currentLineId) return;
    const employees = DataManager.getEmployees(currentLineId);
    const container = document.getElementById('employee-list');
    const t = I18n.t;

    document.getElementById('emp-count').textContent = employees.length;

    if (employees.length === 0) {
      container.innerHTML = `<div class="text-center text-muted py-3"><small>${t('noEmployees')}</small></div>`;
      return;
    }

    container.innerHTML = employees
      .map(
        (emp, idx) => `
      <div class="list-group-item list-group-item-action d-flex justify-content-between align-items-center py-2">
        <span><small class="text-muted">${idx + 1}.</small> ${emp}</span>
        <button class="btn btn-outline-danger btn-sm" onclick="LeaderModule.removeEmp('${escapeHtml(emp)}')">
          <i class="bi bi-x"></i>
        </button>
      </div>
    `
      )
      .join('');
  }

  function refreshEmployeeSelect() {
    if (!currentLineId) return;
    const employees = DataManager.getEmployees(currentLineId);
    const leaves = DataManager.getLeaveRecordsByDateAndLine(
      currentDate,
      currentLineId
    );
    const onLeaveNames = leaves.map((l) => l.employeeName);

    const select = document.getElementById('employee-select');
    select.innerHTML = `<option value="">-- ${I18n.t('employeeName')} --</option>`;
    employees
      .filter((emp) => !onLeaveNames.includes(emp))
      .forEach((emp) => {
        select.innerHTML += `<option value="${escapeHtml(emp)}">${emp}</option>`;
      });
  }

  function refreshLeaveTable() {
    if (!currentLineId) return;
    const leaves = DataManager.getLeaveRecordsByDateAndLine(
      currentDate,
      currentLineId
    );
    const tbody = document.getElementById('leave-table-body');
    const noMsg = document.getElementById('no-leave-msg');
    const t = I18n.t;

    document.getElementById('leave-count').textContent = leaves.length;

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
        <td><span class="badge ${getLeaveTypeBadge(leave.leaveType)}">${leave.leaveType}</span></td>
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
      ลาป่วย: 'bg-danger',
      ลากิจ: 'bg-warning text-dark',
      ลาพักร้อน: 'bg-info',
      ลาคลอด: 'bg-primary',
      อื่นๆ: 'bg-secondary',
    };
    return map[type] || 'bg-secondary';
  }

  function recordLeave() {
    const employeeName = document.getElementById('employee-select').value;
    const leaveType = document.getElementById('leave-type').value;
    const note = document.getElementById('leave-note').value.trim();

    if (!employeeName) {
      showToast(I18n.t('employeeName'), 'warning');
      return;
    }

    DataManager.addLeaveRecord({
      date: currentDate,
      lineId: currentLineId,
      employeeName,
      leaveType,
      note,
    });

    document.getElementById('leave-note').value = '';
    refreshEmployeeSelect();
    refreshLeaveTable();
    refreshStats();
    showToast(I18n.t('success'), 'success');
  }

  function addEmployeeManually() {
    const input = document.getElementById('new-employee-name');
    const name = input.value.trim();
    if (!name || !currentLineId) return;

    DataManager.addEmployee(currentLineId, name);
    input.value = '';
    refreshEmployeeList();
    refreshEmployeeSelect();
    refreshStats();
  }

  function removeEmp(name) {
    if (confirm(I18n.t('confirmDelete'))) {
      DataManager.removeEmployee(currentLineId, name);
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
          const existing = DataManager.getEmployees(currentLineId);
          const merged = [...new Set([...existing, ...names])];
          DataManager.setEmployees(currentLineId, merged);
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
      (r) => String(r.lineId) === String(currentLineId)
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
          <td><span class="badge ${getLeaveTypeBadge(r.leaveType)}">${r.leaveType}</span></td>
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
