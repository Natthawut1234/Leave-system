/**
 * Data Management Layer
 * Uses ExcelStorage (shared Excel file) as the primary data store.
 * Keeps an in-memory cache and syncs to the Excel file on every write.
 */
const DataManager = (() => {
  // In-memory cache of all data
  let cache = {
    lines: {},
    leaveRecords: [],
    settings: { language: 'th', currentLineId: null, currentShift: 'day', leaderName: '' },
  };

  let saveTimer = null;
  const SAVE_DEBOUNCE_MS = 300;

  // ===== Sync with Excel file =====

  /**
   * Load data from the Excel file into cache
   */
  async function loadFromFile() {
    if (!ExcelStorage.getIsConnected()) return false;
    try {
      const data = await ExcelStorage.readData();
      cache.lines = data.lines || {};
      cache.leaveRecords = data.leaveRecords || [];
      cache.settings = { ...cache.settings, ...(data.settings || {}) };
      return true;
    } catch (err) {
      console.error('Error loading from file:', err);
      return false;
    }
  }

  /**
   * Save cache data to the Excel file (debounced)
   */
  function saveToFile() {
    if (!ExcelStorage.getIsConnected()) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        await ExcelStorage.writeData({
          lines: cache.lines,
          leaveRecords: cache.leaveRecords,
          settings: cache.settings,
        });
        updateStatusIndicator(true);
      } catch (err) {
        console.error('Error saving to file:', err);
        updateStatusIndicator(false, err.message);
      }
    }, SAVE_DEBOUNCE_MS);
  }

  /**
   * Force immediate save (for critical operations)
   */
  async function forceSave() {
    if (!ExcelStorage.getIsConnected()) return;
    clearTimeout(saveTimer);
    try {
      await ExcelStorage.writeData({
        lines: cache.lines,
        leaveRecords: cache.leaveRecords,
        settings: cache.settings,
      });
      updateStatusIndicator(true);
    } catch (err) {
      console.error('Error saving to file:', err);
      updateStatusIndicator(false, err.message);
    }
  }

  /**
   * Refresh data from file (pull latest)
   */
  async function refresh() {
    return loadFromFile();
  }

  function updateStatusIndicator(success, errorMsg) {
    const el = document.getElementById('file-status');
    if (!el) return;
    if (success) {
      el.innerHTML = `<i class="bi bi-check-circle text-success"></i> <small class="text-success">Saved</small>`;
      setTimeout(() => {
        if (el)
          el.innerHTML = `<i class="bi bi-file-earmark-excel text-success"></i> <small class="text-muted">${ExcelStorage.getFileName() || ''}</small>`;
      }, 2000);
    } else {
      el.innerHTML = `<i class="bi bi-exclamation-triangle text-danger"></i> <small class="text-danger">${errorMsg || 'Save error'}</small>`;
    }
  }

  // ===== LINE MANAGEMENT =====

  function getLines() {
    return cache.lines;
  }

  function saveLine(lineId, lineData) {
    cache.lines[lineId] = { ...cache.lines[lineId], ...lineData };
    saveToFile();
    return cache.lines[lineId];
  }

  function deleteLine(lineId) {
    delete cache.lines[lineId];
    saveToFile();
  }

  function getLine(lineId) {
    return cache.lines[lineId] || null;
  }

  function initializeDefaultLines() {
    if (Object.keys(cache.lines).length === 0) {
      for (let i = 1; i <= 50; i++) {
        cache.lines[i] = {
          id: i,
          name: `Line ${i}`,
          shifts: {
            day: { leader: '', employees: [] },
            night: { leader: '', employees: [] },
          },
        };
      }
      saveToFile();
    }
    // Migrate old format (leader/employees at root) to shift-based
    Object.values(cache.lines).forEach((line) => {
      if (!line.shifts) {
        line.shifts = {
          day: { leader: line.leader || '', employees: line.employees || [] },
          night: { leader: '', employees: [] },
        };
        delete line.leader;
        delete line.employees;
      }
    });
    return cache.lines;
  }

  // ===== EMPLOYEE MANAGEMENT =====

  function getEmployees(lineId, shift) {
    const line = getLine(lineId);
    if (!line || !line.shifts) return [];
    return line.shifts[shift]?.employees || [];
  }

  function setEmployees(lineId, shift, employees) {
    if (cache.lines[lineId] && cache.lines[lineId].shifts[shift]) {
      cache.lines[lineId].shifts[shift].employees = employees;
      saveToFile();
    }
  }

  function addEmployee(lineId, shift, employeeName) {
    const employees = getEmployees(lineId, shift);
    if (!employees.includes(employeeName)) {
      employees.push(employeeName);
      setEmployees(lineId, shift, employees);
    }
  }

  function removeEmployee(lineId, shift, employeeName) {
    let employees = getEmployees(lineId, shift);
    employees = employees.filter((e) => e !== employeeName);
    setEmployees(lineId, shift, employees);
  }

  // ===== LEAVE RECORDS =====

  function getLeaveRecords() {
    return cache.leaveRecords;
  }

  function addLeaveRecord(record) {
    record.id = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    record.createdAt = new Date().toISOString();
    record.shift = record.shift || 'day';
    cache.leaveRecords.push(record);
    saveToFile();
    return record;
  }

  function removeLeaveRecord(recordId) {
    cache.leaveRecords = cache.leaveRecords.filter((r) => r.id !== recordId);
    saveToFile();
  }

  function getLeaveRecordsByDate(date, shift) {
    return cache.leaveRecords.filter((r) => r.date === date &&
      (!shift || r.shift === shift)
    );
  }

  function getLeaveRecordsByLine(lineId) {
    return cache.leaveRecords.filter(
      (r) => String(r.lineId) === String(lineId)
    );
  }

  function getLeaveRecordsByDateAndLine(date, lineId, shift) {
    return cache.leaveRecords.filter(
      (r) => r.date === date && String(r.lineId) === String(lineId) &&
        (!shift || r.shift === shift)
    );
  }

  function getLeaveRecordsByDateRange(startDate, endDate) {
    return cache.leaveRecords.filter(
      (r) => r.date >= startDate && r.date <= endDate
    );
  }

  // ===== DASHBOARD SUMMARIES =====

  function getDailySummary(date, shift) {
    const records = getLeaveRecordsByDate(date, shift);
    const lines = getLines();
    const summary = {
      date,
      shift: shift || 'all',
      totalLeaves: records.length,
      lineBreakdown: {},
      leaveTypeBreakdown: {},
    };

    for (const record of records) {
      const lineId = String(record.lineId);
      if (!summary.lineBreakdown[lineId]) {
        summary.lineBreakdown[lineId] = {
          lineName: lines[lineId]?.name || `Line ${lineId}`,
          count: 0,
          employees: [],
        };
      }
      summary.lineBreakdown[lineId].count++;
      summary.lineBreakdown[lineId].employees.push(record);
    }

    for (const record of records) {
      const type = record.leaveType || 'ไม่ระบุ';
      if (!summary.leaveTypeBreakdown[type]) {
        summary.leaveTypeBreakdown[type] = 0;
      }
      summary.leaveTypeBreakdown[type]++;
    }

    return summary;
  }

  function getWeeklySummary(startDate) {
    const start = new Date(startDate);
    const dailySummaries = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split('T')[0];
      dailySummaries.push(getDailySummary(dateStr));
    }
    return dailySummaries;
  }

  // ===== SETTINGS =====

  function getSettings() {
    return { ...cache.settings };
  }

  function saveSettings(settings) {
    cache.settings = { ...cache.settings, ...settings };
    saveToFile();
    return cache.settings;
  }

  // ===== EXPORT / IMPORT =====

  function exportAllData() {
    return {
      version: '2.0',
      storageType: 'excel',
      exportedAt: new Date().toISOString(),
      lines: cache.lines,
      leaveRecords: cache.leaveRecords,
      settings: cache.settings,
    };
  }

  function importAllData(data) {
    if (data.lines) cache.lines = data.lines;
    if (data.leaveRecords) cache.leaveRecords = data.leaveRecords;
    if (data.settings) cache.settings = { ...cache.settings, ...data.settings };
    saveToFile();
  }

  function clearAllData() {
    cache = {
      lines: {},
      leaveRecords: [],
      settings: { language: cache.settings.language || 'th', currentShift: 'day' },
    };
    saveToFile();
  }

  // ===== Migrate from old localStorage if exists =====
  function migrateFromLocalStorage() {
    const KEYS = {
      LINES: 'leave_sys_lines',
      LEAVE_RECORDS: 'leave_sys_records',
      SETTINGS: 'leave_sys_settings',
    };

    const hasOldData =
      localStorage.getItem(KEYS.LINES) ||
      localStorage.getItem(KEYS.LEAVE_RECORDS);

    if (!hasOldData) return false;

    try {
      const oldLines = JSON.parse(localStorage.getItem(KEYS.LINES) || '{}');
      const oldRecords = JSON.parse(
        localStorage.getItem(KEYS.LEAVE_RECORDS) || '[]'
      );
      const oldSettings = JSON.parse(
        localStorage.getItem(KEYS.SETTINGS) || '{}'
      );

      if (Object.keys(cache.lines).length === 0) {
        cache.lines = oldLines;
      }
      if (cache.leaveRecords.length === 0) {
        cache.leaveRecords = oldRecords;
      }
      cache.settings = { ...cache.settings, ...oldSettings };

      // Clear old localStorage
      Object.values(KEYS).forEach((key) => localStorage.removeItem(key));

      return true;
    } catch {
      return false;
    }
  }

  // ===== PUBLIC API =====
  return {
    // File operations
    loadFromFile,
    saveToFile,
    forceSave,
    refresh,
    migrateFromLocalStorage,
    // Lines
    getLines,
    saveLine,
    deleteLine,
    getLine,
    initializeDefaultLines,
    // Employees
    getEmployees,
    setEmployees,
    addEmployee,
    removeEmployee,
    // Leave Records
    getLeaveRecords,
    addLeaveRecord,
    removeLeaveRecord,
    getLeaveRecordsByDate,
    getLeaveRecordsByLine,
    getLeaveRecordsByDateAndLine,
    getLeaveRecordsByDateRange,
    // Summaries
    getDailySummary,
    getWeeklySummary,
    // Settings
    getSettings,
    saveSettings,
    // Export/Import
    exportAllData,
    importAllData,
    clearAllData,
  };
})();
