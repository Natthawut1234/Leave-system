/**
 * Main Application Controller
 * Handles routing, page navigation, and file connection flow
 */
const App = (() => {
  let currentPage = 'home';

  async function init() {
    // Initialize i18n
    I18n.init();

    // Show file connection screen first
    if (ExcelStorage.isSupported()) {
      // Try auto-reconnect (no user gesture needed if permission already granted)
      const reconnected = await ExcelStorage.tryReconnect();
      if (reconnected) {
        await DataManager.loadFromFile();
        DataManager.initializeDefaultLines();
        startApp();
        return;
      }
    }

    // Show connection screen
    renderConnectionScreen();
  }

  function renderConnectionScreen() {
    const supported = ExcelStorage.isSupported();
    const t = I18n.t;

    document.body.innerHTML = `
      <div class="toast-container" id="toast-container"></div>
      <div class="connection-screen">
        <div class="connection-card">
          <div class="icon-circle">
            <i class="bi bi-file-earmark-excel"></i>
          </div>
          <h2>${t('appTitle')}</h2>
          <p class="subtitle">Production Line Leave System</p>

          ${supported ? `
            <div class="alert alert-info text-start mb-4">
              <i class="bi bi-info-circle me-2"></i>
              <strong>${t('connHowToUse')}</strong> ${t('connSelectExcel')}<br>
              <small class="text-muted">
                - ${t('connSharedDrive')}<br>
                - ${t('connSameFile')}<br>
                - ${t('connAutoSave')}
              </small>
            </div>

            <div class="d-grid gap-3 mb-4">
              <button class="btn btn-success btn-lg" id="btn-open-file">
                <i class="bi bi-folder2-open me-2"></i> ${t('openExistingFile')}
              </button>
              <button class="btn btn-outline-success btn-lg" id="btn-new-file">
                <i class="bi bi-file-earmark-plus me-2"></i> ${t('createNewFile')}
              </button>
            </div>

            <div id="reconnect-section" style="display:none;">
              <hr>
              <button class="btn btn-outline-primary" id="btn-reconnect">
                <i class="bi bi-arrow-repeat me-2"></i> ${t('reconnectFile')}
              </button>
            </div>
          ` : `
            <div class="alert alert-warning text-start mb-4">
              <i class="bi bi-exclamation-triangle me-2"></i>
              <strong>${t('browserNotSupported')}</strong><br>
              <small>${t('browserHint')}</small>
            </div>
          `}

          <div class="mt-3">
            <small class="text-muted">
              ${t('browserRequirement')}
            </small>
          </div>
        </div>
      </div>
    `;

    if (supported) {
      document.getElementById('btn-open-file').addEventListener('click', openExistingFile);
      document.getElementById('btn-new-file').addEventListener('click', createNewFile);

      // Check if there's a saved handle that needs permission
      checkSavedHandle();
    }
  }

  async function checkSavedHandle() {
    try {
      // Just check if there's a handle in IDB at all
      const reconnectSection = document.getElementById('reconnect-section');
      // We can try silent reconnect first
      const ok = await ExcelStorage.tryReconnect();
      if (ok) {
        await DataManager.loadFromFile();
        DataManager.initializeDefaultLines();
        startApp();
        return;
      }
      // If there's a saved handle, show reconnect button
      if (reconnectSection) {
        reconnectSection.style.display = 'block';
        document.getElementById('btn-reconnect').addEventListener('click', async () => {
          try {
            const ok = await ExcelStorage.requestPermission();
            if (ok) {
              await DataManager.loadFromFile();
              DataManager.initializeDefaultLines();
              startApp();
            }
          } catch (err) {
            showToast(I18n.t('connectionError') + ': ' + err.message, 'danger');
          }
        });
      }
    } catch {}
  }

  async function openExistingFile() {
    try {
      await ExcelStorage.pickExistingFile();
      await DataManager.loadFromFile();
      DataManager.initializeDefaultLines();

      // Migrate old localStorage data if any
      const migrated = DataManager.migrateFromLocalStorage();
      if (migrated) {
        await DataManager.forceSave();
        showToast(I18n.t('dataMigrated'), 'success');
      }

      startApp();
    } catch (err) {
      if (err.name !== 'AbortError') {
        showToast(I18n.t('error') + ': ' + err.message, 'danger');
      }
    }
  }

  async function createNewFile() {
    try {
      await ExcelStorage.createNewFile();
      await DataManager.loadFromFile();
      DataManager.initializeDefaultLines();

      // Migrate old localStorage data if any
      const migrated = DataManager.migrateFromLocalStorage();
      if (migrated) {
        await DataManager.forceSave();
        showToast(I18n.t('dataMigrated'), 'success');
      } else {
        await DataManager.forceSave();
      }

      startApp();
    } catch (err) {
      if (err.name !== 'AbortError') {
        showToast(I18n.t('error') + ': ' + err.message, 'danger');
      }
    }
  }

  function startApp() {
    // Render shell
    renderShell();

    // Navigate to home
    navigateTo('home');

    // Handle browser back/forward
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.page) {
        navigateTo(e.state.page, false);
      }
    });
  }

  function renderShell() {
    const t = I18n.t;
    const lang = I18n.getLanguage();
    const fileName = ExcelStorage.getFileName() || '';

    document.body.innerHTML = `
      <!-- Sidebar Overlay (mobile) -->
      <div class="sidebar-overlay" id="sidebar-overlay"></div>

      <!-- Sidebar -->
      <nav class="sidebar" id="sidebar">
        <div class="sidebar-brand">
          <h5><i class="bi bi-building"></i> ${t('appTitle')}</h5>
          <small>${t('appSubtitle')}</small>
        </div>
        <ul class="sidebar-nav nav flex-column">
          <li class="nav-item">
            <a class="nav-link" href="#" data-page="home" id="nav-home">
              <i class="bi bi-house-door"></i> <span data-i18n="navHome">${t('navHome')}</span>
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="#" data-page="leader" id="nav-leader">
              <i class="bi bi-pencil-square"></i> <span data-i18n="navLeader">${t('navLeader')}</span>
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="#" data-page="booking" id="nav-booking">
              <i class="bi bi-calendar2-check"></i> <span data-i18n="navBooking">${t('navBooking')}</span>
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="#" data-page="dashboard" id="nav-dashboard">
              <i class="bi bi-speedometer2"></i> <span data-i18n="navDashboard">${t('navDashboard')}</span>
            </a>
          </li>
          <li class="nav-item">
            <a class="nav-link" href="#" data-page="settings" id="nav-settings">
              <i class="bi bi-gear"></i> <span data-i18n="navSettings">${t('navSettings')}</span>
            </a>
          </li>
        </ul>
        <!-- File info in sidebar footer -->
        <div class="sidebar-footer">
          <div class="sidebar-file-info">
            <span class="pulse-dot"></span>
            <small class="text-white-50 text-truncate" title="${fileName}" style="max-width:180px;display:inline-block;">${fileName}</small>
          </div>
          <button class="btn btn-outline-light btn-sm w-100 mb-2" onclick="App.refreshData()">
            <i class="bi bi-arrow-clockwise me-1"></i> ${t('refreshData')}
          </button>
          <button class="btn btn-outline-warning btn-sm w-100" onclick="App.disconnectFile()">
            <i class="bi bi-box-arrow-left me-1"></i> ${t('changeFile')}
          </button>
        </div>
      </nav>

      <!-- Main Content -->
      <div class="main-content">
        <!-- Top Bar -->
        <div class="top-bar">
          <div class="d-flex align-items-center gap-2">
            <button class="btn btn-outline-secondary d-lg-none" id="btn-toggle-sidebar">
              <i class="bi bi-list"></i>
            </button>
            <h5 class="mb-0" id="page-title"></h5>
          </div>
          <div class="d-flex align-items-center gap-3">
            <!-- File status indicator -->
            <div class="file-status d-none d-md-flex">
              <span class="pulse-dot"></span>
              <small class="text-muted">${fileName}</small>
            </div>
            <button class="btn btn-outline-secondary btn-sm" onclick="App.refreshData()" title="${t('refreshDataFromFile')}">
              <i class="bi bi-arrow-clockwise"></i>
            </button>
            <div class="lang-switch">
              <button class="btn ${lang === 'th' ? 'btn-primary' : 'btn-outline-secondary'}" onclick="App.switchLang('th')">TH</button>
              <button class="btn ${lang === 'en' ? 'btn-primary' : 'btn-outline-secondary'}" onclick="App.switchLang('en')">EN</button>
            </div>
          </div>
        </div>
        <!-- Page Content -->
        <div id="main-content"></div>
      </div>

      <!-- Toast Container -->
      <div class="toast-container" id="toast-container"></div>
    `;

    // Bind sidebar nav
    document.querySelectorAll('.sidebar-nav .nav-link').forEach((link) => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const page = link.getAttribute('data-page');
        navigateTo(page);
        closeSidebar();
      });
    });

    // Sidebar toggle (mobile)
    document
      .getElementById('btn-toggle-sidebar')
      ?.addEventListener('click', toggleSidebar);
    document
      .getElementById('sidebar-overlay')
      ?.addEventListener('click', closeSidebar);
  }

  function navigateTo(page, pushState = true) {
    currentPage = page;

    // Update active nav
    document.querySelectorAll('.sidebar-nav .nav-link').forEach((link) => {
      link.classList.toggle('active', link.getAttribute('data-page') === page);
    });

    // Update page title
    const t = I18n.t;
    const titles = {
      home: t('selectRole'),
      leader: t('navLeader'),
      booking: t('navBooking'),
      dashboard: t('navDashboard'),
      settings: t('navSettings'),
    };
    document.getElementById('page-title').textContent = titles[page] || '';

    // Render page
    switch (page) {
      case 'home':
        renderHome();
        break;
      case 'leader':
        LeaderModule.render();
        break;
      case 'booking':
        PersonalBookingModule.render();
        break;
      case 'dashboard':
        DashboardModule.render();
        break;
      case 'settings':
        renderSettings();
        break;
    }

    // Push state
    if (pushState) {
      history.pushState({ page }, '', `#${page}`);
    }
  }

  function renderHome() {
    const t = I18n.t;
    document.getElementById('main-content').innerHTML = `
      <div class="container py-5 animate-fade-in">
        <div class="text-center mb-5">
          <h2 class="fw-bold">${t('appTitle')}</h2>
          <p class="text-muted">${t('selectRole')}</p>
        </div>
        <div class="row justify-content-center g-4 animate-stagger">
          <div class="col-md-4">
            <div class="card role-card leader-card" onclick="App.navigateTo('leader')">
              <div class="card-body">
                <div class="icon-wrap">
                  <i class="bi bi-pencil-square"></i>
                </div>
                <h3>${t('roleLeader')}</h3>
                <p class="mb-0 opacity-75">${t('roleLeaderDesc')}</p>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card role-card" onclick="App.navigateTo('booking')">
              <div class="card-body">
                <div class="icon-wrap">
                  <i class="bi bi-calendar2-check"></i>
                </div>
                <h3>${t('roleBooking')}</h3>
                <p class="mb-0 opacity-75">${t('roleBookingDesc')}</p>
              </div>
            </div>
          </div>
          <div class="col-md-4">
            <div class="card role-card manager-card" onclick="App.navigateTo('dashboard')">
              <div class="card-body">
                <div class="icon-wrap">
                  <i class="bi bi-speedometer2"></i>
                </div>
                <h3>${t('roleManager')}</h3>
                <p class="mb-0 opacity-75">${t('roleManagerDesc')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function renderSettings() {
    const t = I18n.t;
    const settings = DataManager.getSettings();
    const fileName = ExcelStorage.getFileName() || t('noFile');
    const employeeMaster = DataManager.getEmployeeMaster();
    document.getElementById('main-content').innerHTML = `
      <div class="container py-4 animate-fade-in-up" style="max-width: 700px;">
        <!-- File Connection Info -->
        <div class="card shadow-sm border-0 mb-3" style="border-left: 4px solid var(--success) !important;">
          <div class="card-header bg-white">
            <h5 class="mb-0"><i class="bi bi-file-earmark-excel text-success"></i> ${t('connectedExcelFile')}</h5>
          </div>
          <div class="card-body">
            <div class="d-flex align-items-center gap-3 mb-3">
              <div style="width:50px;height:50px;border-radius:var(--radius-md);background:linear-gradient(135deg,#d1fae5,#a7f3d0);display:flex;align-items:center;justify-content:center;">
                <i class="bi bi-file-earmark-excel text-success" style="font-size:1.5rem;"></i>
              </div>
              <div>
                <h6 class="mb-0 fw-bold">${fileName}</h6>
                <small class="text-muted">${t('dataStoredInFile')}</small>
              </div>
              <span class="badge bg-success ms-auto"><span class="pulse-dot me-1" style="background:#fff;"></span> ${t('connected')}</span>
            </div>
            <div class="d-flex gap-2">
              <button class="btn btn-outline-primary btn-sm" onclick="App.refreshData()">
                <i class="bi bi-arrow-clockwise me-1"></i> ${t('refreshData')}
              </button>
              <button class="btn btn-outline-warning btn-sm" onclick="App.disconnectFile()">
                <i class="bi bi-box-arrow-left me-1"></i> ${t('changeFile')}
              </button>
            </div>
          </div>
        </div>

        <!-- Line Management -->
        <div class="card shadow-sm border-0 mb-3" style="border-left: 4px solid var(--primary) !important;">
          <div class="card-header bg-white">
            <h5 class="mb-0"><i class="bi bi-diagram-3 text-primary"></i> ${t('lineManagement')}</h5>
          </div>
          <div class="card-body">
            <p class="text-muted small mb-3">${t('lineManagementHint')}</p>
            <div class="d-flex align-items-center gap-3 mb-3">
              <div>
                <span class="fw-bold">${t('currentLineCount')}:</span>
                <span class="badge bg-primary fs-6 ms-2">${Object.keys(DataManager.getLines()).length} ${t('linesLabel')}</span>
              </div>
            </div>
            <div class="input-group" style="max-width: 350px;">
              <span class="input-group-text">${t('setLineCount')}</span>
              <input type="number" id="line-count-input" class="form-control" 
                     min="1" max="200" value="${Object.keys(DataManager.getLines()).length}" 
                     placeholder="1-200">
              <button class="btn btn-primary" id="btn-apply-line-count">
                <i class="bi bi-check-lg me-1"></i>${t('applyLineCount')}
              </button>
            </div>
          </div>
        </div>

        <div class="card shadow-sm border-0 mb-3">
          <div class="card-header bg-white">
            <h5 class="mb-0"><i class="bi bi-gear"></i> ${t('settingsTitle')}</h5>
          </div>
          <div class="card-body">
            <!-- Language -->
            <div class="mb-4">
              <label class="form-label fw-bold">${t('language')}</label>
              <div class="d-flex gap-2">
                <button class="btn ${settings.language === 'th' ? 'btn-primary' : 'btn-outline-secondary'}" 
                        onclick="App.switchLang('th')">
                  ภาษาไทย
                </button>
                <button class="btn ${settings.language === 'en' ? 'btn-primary' : 'btn-outline-secondary'}" 
                        onclick="App.switchLang('en')">
                  English
                </button>
              </div>
            </div>
            <hr>
            <!-- Employee Master Upload -->
            <div class="mb-4">
              <label class="form-label fw-bold">${t('employeeMasterData')}</label>
              <p class="text-muted small mb-2">${t('uploadEmployeeMasterHint')}</p>
              <div class="d-flex align-items-center gap-2 mb-2">
                <input type="file" id="employee-master-file" class="form-control" accept=".xlsx,.xls">
                <button class="btn btn-outline-primary text-nowrap" id="btn-upload-employee-master">
                  <i class="bi bi-upload me-1"></i>${t('uploadEmployeeMaster')}
                </button>
              </div>
              <small class="text-muted">
                ${t('employeeMasterRows')}: <strong>${employeeMaster.rows.length}</strong>
              </small>
            </div>
            <hr>
            <!-- Export JSON backup -->
            <div class="mb-4">
              <label class="form-label fw-bold">${t('exportData')}</label>
              <p class="text-muted small">${t('exportDataHint')}</p>
              <button class="btn btn-outline-success" id="btn-export-data">
                <i class="bi bi-download"></i> ${t('exportData')}
              </button>
            </div>
            <hr>
            <!-- Import JSON -->
            <div class="mb-4">
              <label class="form-label fw-bold">${t('importData')}</label>
              <p class="text-muted small">${t('importDataHint')}</p>
              <input type="file" id="import-file" class="form-control" accept=".json">
            </div>
            <hr>
            <!-- Clear -->
            <div>
              <label class="form-label fw-bold text-danger">${t('clearData')}</label>
              <p class="text-muted small">${t('clearDataHint')}</p>
              <button class="btn btn-outline-danger" id="btn-clear-data">
                <i class="bi bi-trash"></i> ${t('clearData')}
              </button>
            </div>
          </div>
        </div>

        <!-- Data Stats -->
        <div class="card shadow-sm border-0">
          <div class="card-header bg-white">
            <h5 class="mb-0"><i class="bi bi-database"></i> ${t('dataInSystem')}</h5>
          </div>
          <div class="card-body">
            ${renderDataStats()}
          </div>
        </div>
      </div>
    `;

    // Bind events
    document
      .getElementById('btn-export-data')
      .addEventListener('click', exportData);
    document
      .getElementById('import-file')
      .addEventListener('change', importData);
    document
      .getElementById('btn-clear-data')
      .addEventListener('click', clearData);
    document
      .getElementById('btn-apply-line-count')
      .addEventListener('click', updateLineCount);
    document
      .getElementById('btn-upload-employee-master')
      .addEventListener('click', importEmployeeMasterFromExcel);
  }

  function renderDataStats() {
    const lines = DataManager.getLines();
    const records = DataManager.getLeaveRecords();
    const masterEmployees = DataManager.getEmployeeMasterEmployeeList();
    const t = I18n.t;
    const totalEmployees = masterEmployees.length;
    const linesWithEmployees = totalEmployees > 0 ? Object.keys(lines).length : 0;

    return `
      <div class="row text-center g-3 animate-stagger">
        <div class="col-4">
          <div class="card stat-card bg-primary text-white">
            <div class="card-body py-3">
              <i class="bi bi-diagram-3" style="font-size:1.5rem;"></i>
              <h2 class="mb-0 mt-1">${Object.keys(lines).length}</h2>
              <small class="opacity-75">${t('productionLines')}</small>
            </div>
          </div>
        </div>
        <div class="col-4">
          <div class="card stat-card bg-success text-white">
            <div class="card-body py-3">
              <i class="bi bi-people" style="font-size:1.5rem;"></i>
              <h2 class="mb-0 mt-1">${totalEmployees}</h2>
              <small class="opacity-75">${t('employees')} (${linesWithEmployees} ${t('lines_unit')})</small>
            </div>
          </div>
        </div>
        <div class="col-4">
          <div class="card stat-card bg-danger text-white">
            <div class="card-body py-3">
              <i class="bi bi-calendar-x" style="font-size:1.5rem;"></i>
              <h2 class="mb-0 mt-1">${records.length}</h2>
              <small class="opacity-75">${t('leaveRecords')}</small>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function exportData() {
    const data = DataManager.exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `leave_system_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(I18n.t('exportSuccess'), 'success');
  }

  function importData(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (evt) {
      try {
        const data = JSON.parse(evt.target.result);
        if (data.lines || data.leaveRecords || data.employeeMaster) {
          DataManager.importAllData(data);
          showToast(I18n.t('importSuccess'), 'success');
          setTimeout(() => location.reload(), 1000);
        } else {
          showToast(I18n.t('importError'), 'danger');
        }
      } catch {
        showToast(I18n.t('importError'), 'danger');
      }
    };
    reader.readAsText(file);
  }

  function importEmployeeMasterFromExcel() {
    const input = document.getElementById('employee-master-file');
    const file = input?.files?.[0];
    if (!file) {
      showToast(I18n.t('importError'), 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = function (evt) {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const matrix = XLSX.utils.sheet_to_json(sheet, {
          header: 1,
          defval: '',
        });

        if (!matrix.length || !matrix[0] || matrix[0].length === 0) {
          showToast(I18n.t('employeeMasterInvalid'), 'danger');
          return;
        }

        const headers = matrix[0].map((h) => String(h || '').trim());
        if (headers.every((h) => !h)) {
          showToast(I18n.t('employeeMasterInvalid'), 'danger');
          return;
        }

        const rows = matrix.slice(1).filter((row) =>
          row.some((cell) => String(cell || '').trim() !== '')
        );

        DataManager.setEmployeeMaster(headers, rows);
        showToast(I18n.t('employeeMasterUploaded'), 'success');
        renderSettings();
      } catch (err) {
        console.error(err);
        showToast(I18n.t('employeeMasterInvalid'), 'danger');
      }
    };

    reader.readAsArrayBuffer(file);
  }

  function clearData() {
    if (confirm(I18n.t('clearDataConfirm'))) {
      DataManager.clearAllData();
      showToast(I18n.t('success'), 'success');
      setTimeout(() => location.reload(), 1000);
    }
  }

  function updateLineCount() {
    const t = I18n.t;
    const input = document.getElementById('line-count-input');
    const newCount = parseInt(input.value, 10);

    if (!newCount || newCount < 1 || newCount > 200) {
      showToast(t('invalidLineCount'), 'warning');
      return;
    }

    const lines = DataManager.getLines();
    const currentIds = Object.keys(lines).map(Number).sort((a, b) => a - b);
    const currentCount = currentIds.length;

    if (newCount === currentCount) return;

    if (newCount > currentCount) {
      // Add new lines starting from max+1
      const maxId = currentIds.length > 0 ? Math.max(...currentIds) : 0;
      for (let i = maxId + 1; i <= maxId + (newCount - currentCount); i++) {
        DataManager.saveLine(i, {
          id: i,
          name: `Line ${i}`,
          shifts: {
            day: { leader: '', employees: [] },
            night: { leader: '', employees: [] },
          },
        });
      }
      showToast(t('lineCountUpdated'), 'success');
      renderSettings();
    } else {
      // Remove lines from the end
      const linesToRemove = currentIds.slice(newCount);
      // Check if any lines being removed have data
      const msg = t('confirmRemoveLines')
        .replace('{from}', currentCount)
        .replace('{to}', newCount);
      if (!confirm(msg)) return;

      linesToRemove.forEach((id) => DataManager.deleteLine(id));
      showToast(t('lineCountUpdated'), 'success');
      renderSettings();
    }
  }

  function switchLang(lang) {
    I18n.setLanguage(lang);
    renderShell();
    navigateTo(currentPage, false);
  }

  async function refreshData() {
    try {
      await DataManager.refresh();
      showToast(I18n.t('refreshSuccess'), 'success');
      // Re-render current page
      navigateTo(currentPage, false);
    } catch (err) {
      showToast(I18n.t('error') + ': ' + err.message, 'danger');
    }
  }

  async function disconnectFile() {
    if (confirm(I18n.t('changeFileConfirm'))) {
      await ExcelStorage.disconnect();
      location.reload();
    }
  }

  function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('show');
    document.getElementById('sidebar-overlay').classList.toggle('show');
  }

  function closeSidebar() {
    document.getElementById('sidebar').classList.remove('show');
    document.getElementById('sidebar-overlay').classList.remove('show');
  }

  return {
    init,
    navigateTo,
    switchLang,
    refreshData,
    disconnectFile,
  };
})();

// ===== Global Toast Helper =====
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const icons = {
    success: 'bi-check-circle',
    danger: 'bi-exclamation-triangle',
    warning: 'bi-exclamation-circle',
    info: 'bi-info-circle',
  };

  const toast = document.createElement('div');
  toast.className = `toast show align-items-center text-bg-${type} border-0`;
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        <i class="bi ${icons[type] || icons.info} me-2"></i> ${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;
  container.appendChild(toast);

  toast.querySelector('.btn-close').addEventListener('click', () => toast.remove());
  setTimeout(() => toast.remove(), 3000);
}

// ===== Start App =====
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
