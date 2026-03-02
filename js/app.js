/**
 * Main Application Controller
 * Handles routing and page navigation
 */
const App = (() => {
  let currentPage = 'home';

  function init() {
    // Initialize data
    DataManager.initializeDefaultLines();

    // Initialize i18n
    I18n.init();

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
        <div class="px-3 mt-auto pb-3">
          <hr class="border-light">
          <small class="text-white-50">v1.0 - Leave System</small>
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
      <div class="container py-5">
        <div class="text-center mb-5">
          <h2 class="fw-bold">${t('appTitle')}</h2>
          <p class="text-muted">${t('selectRole')}</p>
        </div>
        <div class="row justify-content-center g-4">
          <div class="col-md-5">
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
          <div class="col-md-5">
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
    document.getElementById('main-content').innerHTML = `
      <div class="container py-4" style="max-width: 700px;">
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
                  🇹🇭 ภาษาไทย
                </button>
                <button class="btn ${settings.language === 'en' ? 'btn-primary' : 'btn-outline-secondary'}" 
                        onclick="App.switchLang('en')">
                  🇺🇸 English
                </button>
              </div>
            </div>
            <hr>
            <!-- Export -->
            <div class="mb-4">
              <label class="form-label fw-bold">${t('exportData')}</label>
              <p class="text-muted small">สำรองข้อมูลทั้งหมด (รายชื่อพนักงาน + ข้อมูลการลา) เป็นไฟล์ JSON</p>
              <button class="btn btn-outline-success" id="btn-export-data">
                <i class="bi bi-download"></i> ${t('exportData')}
              </button>
            </div>
            <hr>
            <!-- Import -->
            <div class="mb-4">
              <label class="form-label fw-bold">${t('importData')}</label>
              <p class="text-muted small">นำเข้าข้อมูลจากไฟล์สำรอง JSON (ข้อมูลเดิมจะถูกแทนที่)</p>
              <input type="file" id="import-file" class="form-control" accept=".json">
            </div>
            <hr>
            <!-- Clear -->
            <div>
              <label class="form-label fw-bold text-danger">${t('clearData')}</label>
              <p class="text-muted small">ลบข้อมูลทั้งหมดในระบบ (ไม่สามารถกู้คืนได้)</p>
              <button class="btn btn-outline-danger" id="btn-clear-data">
                <i class="bi bi-trash"></i> ${t('clearData')}
              </button>
            </div>
          </div>
        </div>

        <!-- Data Stats -->
        <div class="card shadow-sm border-0">
          <div class="card-header bg-white">
            <h5 class="mb-0"><i class="bi bi-database"></i> ข้อมูลในระบบ</h5>
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
  }

  function renderDataStats() {
    const lines = DataManager.getLines();
    const records = DataManager.getLeaveRecords();
    const totalEmployees = Object.values(lines).reduce(
      (sum, l) => sum + (l.employees?.length || 0),
      0
    );
    const linesWithEmployees = Object.values(lines).filter(
      (l) => l.employees?.length > 0
    ).length;

    return `
      <div class="row text-center">
        <div class="col-4">
          <h3 class="text-primary">${Object.keys(lines).length}</h3>
          <small class="text-muted">ไลน์ผลิต</small>
        </div>
        <div class="col-4">
          <h3 class="text-success">${totalEmployees}</h3>
          <small class="text-muted">พนักงานทั้งหมด (${linesWithEmployees} ไลน์)</small>
        </div>
        <div class="col-4">
          <h3 class="text-danger">${records.length}</h3>
          <small class="text-muted">บันทึกการลา</small>
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
        if (data.lines || data.leaveRecords) {
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

  function clearData() {
    if (confirm(I18n.t('clearDataConfirm'))) {
      DataManager.clearAllData();
      showToast(I18n.t('success'), 'success');
      setTimeout(() => location.reload(), 1000);
    }
  }

  function switchLang(lang) {
    I18n.setLanguage(lang);
    renderShell();
    navigateTo(currentPage, false);
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
