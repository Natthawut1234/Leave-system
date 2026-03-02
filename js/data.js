/**
 * Data Management Layer
 * Handles all localStorage operations for the Leave System
 */
const DataManager = (() => {
  const STORAGE_KEYS = {
    LINES: 'leave_sys_lines',
    LEAVE_RECORDS: 'leave_sys_records',
    SETTINGS: 'leave_sys_settings',
  };

  // ===== LINE MANAGEMENT =====

  function getLines() {
    const data = localStorage.getItem(STORAGE_KEYS.LINES);
    return data ? JSON.parse(data) : {};
  }

  function saveLine(lineId, lineData) {
    const lines = getLines();
    lines[lineId] = { ...lines[lineId], ...lineData };
    localStorage.setItem(STORAGE_KEYS.LINES, JSON.stringify(lines));
    return lines[lineId];
  }

  function deleteLine(lineId) {
    const lines = getLines();
    delete lines[lineId];
    localStorage.setItem(STORAGE_KEYS.LINES, JSON.stringify(lines));
  }

  function getLine(lineId) {
    const lines = getLines();
    return lines[lineId] || null;
  }

  // Initialize default 50 lines if none exist
  function initializeDefaultLines() {
    const lines = getLines();
    if (Object.keys(lines).length === 0) {
      for (let i = 1; i <= 50; i++) {
        lines[i] = {
          id: i,
          name: `Line ${i}`,
          leader: '',
          employees: [],
        };
      }
      localStorage.setItem(STORAGE_KEYS.LINES, JSON.stringify(lines));
    }
    return lines;
  }

  // ===== EMPLOYEE MANAGEMENT =====

  function getEmployees(lineId) {
    const line = getLine(lineId);
    return line ? line.employees || [] : [];
  }

  function setEmployees(lineId, employees) {
    const lines = getLines();
    if (lines[lineId]) {
      lines[lineId].employees = employees;
      localStorage.setItem(STORAGE_KEYS.LINES, JSON.stringify(lines));
    }
  }

  function addEmployee(lineId, employeeName) {
    const employees = getEmployees(lineId);
    if (!employees.includes(employeeName)) {
      employees.push(employeeName);
      setEmployees(lineId, employees);
    }
  }

  function removeEmployee(lineId, employeeName) {
    let employees = getEmployees(lineId);
    employees = employees.filter((e) => e !== employeeName);
    setEmployees(lineId, employees);
  }

  // ===== LEAVE RECORDS =====

  function getLeaveRecords() {
    const data = localStorage.getItem(STORAGE_KEYS.LEAVE_RECORDS);
    return data ? JSON.parse(data) : [];
  }

  function addLeaveRecord(record) {
    const records = getLeaveRecords();
    record.id = Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    record.createdAt = new Date().toISOString();
    records.push(record);
    localStorage.setItem(STORAGE_KEYS.LEAVE_RECORDS, JSON.stringify(records));
    return record;
  }

  function removeLeaveRecord(recordId) {
    let records = getLeaveRecords();
    records = records.filter((r) => r.id !== recordId);
    localStorage.setItem(STORAGE_KEYS.LEAVE_RECORDS, JSON.stringify(records));
  }

  function getLeaveRecordsByDate(date) {
    const records = getLeaveRecords();
    return records.filter((r) => r.date === date);
  }

  function getLeaveRecordsByLine(lineId) {
    const records = getLeaveRecords();
    return records.filter((r) => String(r.lineId) === String(lineId));
  }

  function getLeaveRecordsByDateAndLine(date, lineId) {
    const records = getLeaveRecords();
    return records.filter(
      (r) => r.date === date && String(r.lineId) === String(lineId)
    );
  }

  function getLeaveRecordsByDateRange(startDate, endDate) {
    const records = getLeaveRecords();
    return records.filter((r) => r.date >= startDate && r.date <= endDate);
  }

  // ===== DASHBOARD SUMMARIES =====

  function getDailySummary(date) {
    const records = getLeaveRecordsByDate(date);
    const lines = getLines();
    const summary = {
      date,
      totalLeaves: records.length,
      lineBreakdown: {},
      leaveTypeBreakdown: {},
    };

    // Group by line
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

    // Group by leave type
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
    const data = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return data
      ? JSON.parse(data)
      : {
          language: 'th',
          currentLineId: null,
          leaderName: '',
        };
  }

  function saveSettings(settings) {
    const current = getSettings();
    const merged = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(merged));
    return merged;
  }

  // ===== EXPORT / IMPORT =====

  function exportAllData() {
    return {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      lines: getLines(),
      leaveRecords: getLeaveRecords(),
      settings: getSettings(),
    };
  }

  function importAllData(data) {
    if (data.lines) {
      localStorage.setItem(STORAGE_KEYS.LINES, JSON.stringify(data.lines));
    }
    if (data.leaveRecords) {
      localStorage.setItem(
        STORAGE_KEYS.LEAVE_RECORDS,
        JSON.stringify(data.leaveRecords)
      );
    }
    if (data.settings) {
      localStorage.setItem(
        STORAGE_KEYS.SETTINGS,
        JSON.stringify(data.settings)
      );
    }
  }

  function clearAllData() {
    Object.values(STORAGE_KEYS).forEach((key) =>
      localStorage.removeItem(key)
    );
  }

  // ===== PUBLIC API =====
  return {
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
