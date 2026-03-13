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
    personalLeaveBookings: [],
    employeeMaster: { headers: [], rows: [] },
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
      cache.personalLeaveBookings = data.personalLeaveBookings || [];
      cache.employeeMaster = data.employeeMaster || { headers: [], rows: [] };
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
          personalLeaveBookings: cache.personalLeaveBookings,
          employeeMaster: cache.employeeMaster,
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
        personalLeaveBookings: cache.personalLeaveBookings,
        employeeMaster: cache.employeeMaster,
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
    const masterEmployees = getEmployeeMasterEmployeeList();
    if (masterEmployees.length > 0) {
      return masterEmployees
        .filter((emp) => {
          if (!shift) return true;
          if (!emp.shift) return true;
          return emp.shift === shift;
        })
        .map((emp) => emp.employeeName);
    }

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

  // ===== PERSONAL LEAVE BOOKINGS =====

  function getPersonalLeaveBookings() {
    return cache.personalLeaveBookings;
  }

  function getPersonalLeaveBookingsByDate(date) {
    return cache.personalLeaveBookings.filter((b) => b.date === date);
  }

  function getPersonalLeaveBookingsByDateLineShift(date, lineId, shift) {
    return cache.personalLeaveBookings.filter(
      (b) => b.date === date && String(b.lineId) === String(lineId) &&
        (!shift || b.shift === shift)
    );
  }

  function getPersonalLeaveBookingCountByDate(date) {
    return getPersonalLeaveBookingsByDate(date).length;
  }

  function addPersonalLeaveBooking(booking) {
    const record = {
      ...booking,
      id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
      createdAt: new Date().toISOString(),
      shift: booking.shift || 'day',
      leaveType: 'ลากิจ',
    };
    cache.personalLeaveBookings.push(record);
    saveToFile();
    return record;
  }

  function removePersonalLeaveBooking(bookingId) {
    cache.personalLeaveBookings = cache.personalLeaveBookings.filter(
      (b) => b.id !== bookingId
    );
    saveToFile();
  }

  // ===== EMPLOYEE MASTER DATA =====

  function getEmployeeMaster() {
    const headers = Array.isArray(cache.employeeMaster?.headers)
      ? [...cache.employeeMaster.headers]
      : [];
    const rows = Array.isArray(cache.employeeMaster?.rows)
      ? cache.employeeMaster.rows.map((r) => [...r])
      : [];
    return { headers, rows };
  }

  function setEmployeeMaster(headers, rows) {
    cache.employeeMaster = {
      headers: Array.isArray(headers) ? headers.map((h) => String(h || '')) : [],
      rows: Array.isArray(rows)
        ? rows.map((row) => (Array.isArray(row) ? row.map((cell) => cell ?? '') : []))
        : [],
    };
    saveToFile();
    return getEmployeeMaster();
  }

  function normalizeHeader(header) {
    return String(header || '')
      .toLowerCase()
      .replace(/[^a-z0-9ก-๙]/g, '');
  }

  function findColumnIndex(headers, candidates) {
    const normalizedHeaders = headers.map((h) => normalizeHeader(h));
    const normalizedCandidates = candidates.map((c) => normalizeHeader(c));
    for (let i = 0; i < normalizedHeaders.length; i++) {
      if (normalizedCandidates.includes(normalizedHeaders[i])) return i;
    }
    for (let i = 0; i < normalizedHeaders.length; i++) {
      if (normalizedCandidates.some((c) => normalizedHeaders[i].includes(c))) return i;
    }
    return -1;
  }

  function normalizeShift(value) {
    const v = String(value || '').trim().toLowerCase();
    if (!v) return '';
    if (['day', 'd', 'dayshift', 'เช้า', 'กะเช้า', 'กลางวัน'].includes(v)) {
      return 'day';
    }
    if (['night', 'n', 'nightshift', 'ดึก', 'กะดึก', 'กลางคืน', 'คืน'].includes(v)) {
      return 'night';
    }

    if (v.includes('day') || v.includes('เช้า') || v.includes('กลางวัน')) {
      return 'day';
    }
    if (v.includes('night') || v.includes('ดึก') || v.includes('คืน') || v.includes('กลางคืน')) {
      return 'night';
    }
    return '';
  }

  function getEmployeeMasterEmployeeList() {
    const master = getEmployeeMaster();
    const headers = master.headers || [];
    const rows = master.rows || [];
    if (!headers.length || !rows.length) return [];

    const idIdx = findColumnIndex(headers, ['I.D.', 'ID', 'EMPID', 'EMPLOYEEID', 'รหัสพนักงาน']);
    const fullNameIdx = findColumnIndex(headers, [
      'Name_Surname',
      'Name Surname',
      'ชื่อ-นามสกุล',
      'ชื่อสกุล',
      'Full Name',
    ]);
    const nameIdx = findColumnIndex(headers, ['Name', 'ชื่อ']);
    const surnameIdx = findColumnIndex(headers, ['Surname', 'นามสกุล', 'LastName', 'Last Name']);
    const shiftIdx = findColumnIndex(headers, [
      'Group for HFM',
      'GroupforHFM',
      'Shift',
      'กะ',
      'กะงาน',
    ]);

    const list = [];
    rows.forEach((row) => {
      const rowArr = Array.isArray(row) ? row : [];
      const rowObj = {};
      headers.forEach((h, idx) => {
        rowObj[h] = rowArr[idx] ?? '';
      });

      const fullName = fullNameIdx >= 0 ? String(rowArr[fullNameIdx] || '').trim() : '';
      const first = nameIdx >= 0 ? String(rowArr[nameIdx] || '').trim() : '';
      const last = surnameIdx >= 0 ? String(rowArr[surnameIdx] || '').trim() : '';
      const employeeName = fullName || `${first} ${last}`.trim() || first || last;
      if (!employeeName) return;

      list.push({
        employeeName,
        employeeId: idIdx >= 0 ? String(rowArr[idIdx] || '').trim() : '',
        shift: shiftIdx >= 0 ? normalizeShift(rowArr[shiftIdx]) : '',
        masterData: rowObj,
      });
    });

    return list;
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
      personalLeaveBookings: cache.personalLeaveBookings,
      employeeMaster: cache.employeeMaster,
      settings: cache.settings,
    };
  }

  function importAllData(data) {
    if (data.lines) cache.lines = data.lines;
    if (data.leaveRecords) cache.leaveRecords = data.leaveRecords;
    if (data.personalLeaveBookings) {
      cache.personalLeaveBookings = data.personalLeaveBookings;
    }
    if (data.employeeMaster) {
      cache.employeeMaster = data.employeeMaster;
    }
    if (data.settings) cache.settings = { ...cache.settings, ...data.settings };
    saveToFile();
  }

  function clearAllData() {
    cache = {
      lines: {},
      leaveRecords: [],
      personalLeaveBookings: [],
      employeeMaster: { headers: [], rows: [] },
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
      if (!Array.isArray(cache.personalLeaveBookings)) {
        cache.personalLeaveBookings = [];
      }
      if (!cache.employeeMaster) {
        cache.employeeMaster = { headers: [], rows: [] };
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
    // Personal Leave Bookings
    getPersonalLeaveBookings,
    getPersonalLeaveBookingsByDate,
    getPersonalLeaveBookingsByDateLineShift,
    getPersonalLeaveBookingCountByDate,
    addPersonalLeaveBooking,
    removePersonalLeaveBooking,
    // Employee Master
    getEmployeeMaster,
    setEmployeeMaster,
    getEmployeeMasterEmployeeList,
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
