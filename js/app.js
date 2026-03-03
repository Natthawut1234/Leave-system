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

    document.body.innerHTML = `
      <div class="toast-container" id="toast-container"></div>
      <div class="connection-screen">
        <div class="connection-card">
          <div class="icon-circle">
            <i class="bi bi-file-earmark-excel"></i>
          </div>
          <h2>ระบบบันทึกการลา</h2>
          <p class="subtitle">Production Line Leave System</p>

          ${supported ? `
            <div class="alert alert-info text-start mb-4">
              <i class="bi bi-info-circle me-2"></i>
              <strong>วิธีใช้:</strong> เลือกไฟล์ Excel (.xlsx) ที่จะใช้เก็บข้อมูล<br>
              <small class="text-muted">
                - วางไฟล์ไว้บน <strong>shared drive / network drive</strong> เพื่อให้ทุกคนเข้าถึงได้<br>
                - ทุก Leader + หัวหน้า เลือกไฟล์เดียวกัน<br>
                - ข้อมูลจะอ่าน/เขียนลงไฟล์นั้นอัตโนมัติ
              </small>
            </div>

            <div class="d-grid gap-3 mb-4">
              <button class="btn btn-success btn-lg" id="btn-open-file">
                <i class="bi bi-folder2-open me-2"></i> เปิดไฟล์ Excel ที่มีอยู่
              </button>
              <button class="btn btn-outline-success btn-lg" id="btn-new-file">
                <i class="bi bi-file-earmark-plus me-2"></i> สร้างไฟล์ใหม่
              </button>
            </div>

            <div id="reconnect-section" style="display:none;">
              <hr>
              <button class="btn btn-outline-primary" id="btn-reconnect">
                <i class="bi bi-arrow-repeat me-2"></i> เชื่อมต่อไฟล์เดิม (ให้สิทธิ์)
              </button>
            </div>
          ` : `
            <div class="alert alert-warning text-start mb-4">
              <i class="bi bi-exclamation-triangle me-2"></i>
              <strong>Browser ไม่รองรับ File System API</strong><br>
              <small>กรุณาใช้ <strong>Google Chrome</strong> หรือ <strong>Microsoft Edge</strong> เวอร์ชันล่าสุด</small>
            </div>
          `}

          <div class="mt-3">
            <small class="text-muted">
              ต้องใช้ Chrome หรือ Edge | v2.0 - Excel Storage
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
            showToast('ไม่สามารถเชื่อมต่อได้: ' + err.message, 'danger');
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
        showToast('ย้ายข้อมูลจาก browser เดิมมาแล้ว!', 'success');
      }

      startApp();
    } catch (err) {
      if (err.name !== 'AbortError') {
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'danger');
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
        showToast('ย้ายข้อมูลจาก browser เดิมมาแล้ว!', 'success');
      } else {
        await DataManager.forceSave();
      }

      startApp();
    } catch (err) {
      if (err.name !== 'AbortError') {
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'danger');
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
            <i class="bi bi-arrow-clockwise me-1"></i> รีเฟรชข้อมูล
          </button>
          <button class="btn btn-outline-warning btn-sm w-100" onclick="App.disconnectFile()">
            <i class="bi bi-box-arrow-left me-1"></i> เปลี่ยนไฟล์
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
            <button class="btn btn-outline-secondary btn-sm" onclick="App.refreshData()" title="รีเฟรชข้อมูลจากไฟล์">
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
      <div class="container py-5 animate-fade-in">
        <div class="text-center mb-5">
          <h2 class="fw-bold">${t('appTitle')}</h2>
          <p class="text-muted">${t('selectRole')}</p>
        </div>
        <div class="row justify-content-center g-4 animate-stagger">
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
    const fileName = ExcelStorage.getFileName() || 'ไม่มีไฟล์';
    document.getElementById('main-content').innerHTML = `
      <div class="container py-4 animate-fade-in-up" style="max-width: 700px;">
        <!-- File Connection Info -->
        <div class="card shadow-sm border-0 mb-3" style="border-left: 4px solid var(--success) !important;">
          <div class="card-header bg-white">
            <h5 class="mb-0"><i class="bi bi-file-earmark-excel text-success"></i> ไฟล์ Excel ที่เชื่อมต่อ</h5>
          </div>
          <div class="card-body">
            <div class="d-flex align-items-center gap-3 mb-3">
              <div style="width:50px;height:50px;border-radius:var(--radius-md);background:linear-gradient(135deg,#d1fae5,#a7f3d0);display:flex;align-items:center;justify-content:center;">
                <i class="bi bi-file-earmark-excel text-success" style="font-size:1.5rem;"></i>
              </div>
              <div>
                <h6 class="mb-0 fw-bold">${fileName}</h6>
                <small class="text-muted">ข้อมูลทั้งหมดเก็บในไฟล์นี้</small>
              </div>
              <span class="badge bg-success ms-auto"><span class="pulse-dot me-1" style="background:#fff;"></span> เชื่อมต่อแล้ว</span>
            </div>
            <div class="d-flex gap-2">
              <button class="btn btn-outline-primary btn-sm" onclick="App.refreshData()">
                <i class="bi bi-arrow-clockwise me-1"></i> รีเฟรชข้อมูล
              </button>
              <button class="btn btn-outline-warning btn-sm" onclick="App.disconnectFile()">
                <i class="bi bi-box-arrow-left me-1"></i> เปลี่ยนไฟล์
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
            <!-- Export JSON backup -->
            <div class="mb-4">
              <label class="form-label fw-bold">${t('exportData')}</label>
              <p class="text-muted small">สำรองข้อมูลทั้งหมดเป็นไฟล์ JSON (เผื่อกรณีฉุกเฉิน)</p>
              <button class="btn btn-outline-success" id="btn-export-data">
                <i class="bi bi-download"></i> ${t('exportData')}
              </button>
            </div>
            <hr>
            <!-- Import JSON -->
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
    let totalEmployees = 0;
    let linesWithEmployees = 0;
    Object.values(lines).forEach((l) => {
      const shifts = l.shifts || {};
      const dayCount = shifts.day?.employees?.length || 0;
      const nightCount = shifts.night?.employees?.length || 0;
      totalEmployees += dayCount + nightCount;
      if (dayCount > 0 || nightCount > 0) linesWithEmployees++;
    });

    return `
      <div class="row text-center g-3 animate-stagger">
        <div class="col-4">
          <div class="card stat-card bg-primary text-white">
            <div class="card-body py-3">
              <i class="bi bi-diagram-3" style="font-size:1.5rem;"></i>
              <h2 class="mb-0 mt-1">${Object.keys(lines).length}</h2>
              <small class="opacity-75">ไลน์ผลิต</small>
            </div>
          </div>
        </div>
        <div class="col-4">
          <div class="card stat-card bg-success text-white">
            <div class="card-body py-3">
              <i class="bi bi-people" style="font-size:1.5rem;"></i>
              <h2 class="mb-0 mt-1">${totalEmployees}</h2>
              <small class="opacity-75">พนักงาน (${linesWithEmployees} ไลน์)</small>
            </div>
          </div>
        </div>
        <div class="col-4">
          <div class="card stat-card bg-danger text-white">
            <div class="card-body py-3">
              <i class="bi bi-calendar-x" style="font-size:1.5rem;"></i>
              <h2 class="mb-0 mt-1">${records.length}</h2>
              <small class="opacity-75">บันทึกการลา</small>
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

  async function refreshData() {
    try {
      await DataManager.refresh();
      showToast('รีเฟรชข้อมูลสำเร็จ!', 'success');
      // Re-render current page
      navigateTo(currentPage, false);
    } catch (err) {
      showToast('เกิดข้อผิดพลาด: ' + err.message, 'danger');
    }
  }

  async function disconnectFile() {
    if (confirm('ต้องการเปลี่ยนไฟล์ Excel? ระบบจะกลับไปหน้าเลือกไฟล์')) {
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
