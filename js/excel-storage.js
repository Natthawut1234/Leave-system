/**
 * Excel Storage Engine
 * Uses File System Access API to read/write a shared Excel file
 * Falls back to manual download/upload if API not available
 */
const ExcelStorage = (() => {
  let fileHandle = null;
  let isConnected = false;
  const DB_NAME = 'LeaveSystemDB';
  const STORE_NAME = 'fileHandles';

  // ===== File System Access API Support =====
  function isSupported() {
    return 'showOpenFilePicker' in window;
  }

  // ===== IndexedDB for persisting file handle =====
  function openIDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        req.result.createObjectStore(STORE_NAME);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function saveHandleToIDB(handle) {
    const db = await openIDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(handle, 'mainFile');
    return new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  }

  async function getHandleFromIDB() {
    const db = await openIDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get('mainFile');
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async function clearHandleFromIDB() {
    const db = await openIDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete('mainFile');
  }

  // ===== Connect / Reconnect =====

  /**
   * Try to reconnect to a previously used file (requires user gesture to verify permission)
   */
  async function tryReconnect() {
    if (!isSupported()) return false;
    try {
      const savedHandle = await getHandleFromIDB();
      if (!savedHandle) return false;

      // Check if we still have permission
      const perm = await savedHandle.queryPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        fileHandle = savedHandle;
        isConnected = true;
        return true;
      }
      return false; // Need user gesture to request permission
    } catch {
      return false;
    }
  }

  /**
   * Request permission on a saved handle (requires user click)
   */
  async function requestPermission() {
    if (!isSupported()) return false;
    try {
      const savedHandle = await getHandleFromIDB();
      if (!savedHandle) return false;

      const perm = await savedHandle.requestPermission({ mode: 'readwrite' });
      if (perm === 'granted') {
        fileHandle = savedHandle;
        isConnected = true;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Open file picker to select an existing Excel file
   */
  async function pickExistingFile() {
    if (!isSupported()) throw new Error('File System Access API not supported');

    const [handle] = await window.showOpenFilePicker({
      types: [
        {
          description: 'Excel Files',
          accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
              ['.xlsx'],
          },
        },
      ],
    });

    fileHandle = handle;
    isConnected = true;
    await saveHandleToIDB(handle);
    return handle;
  }

  /**
   * Create a new Excel file via save picker
   */
  async function createNewFile() {
    if (!isSupported()) throw new Error('File System Access API not supported');

    const handle = await window.showSaveFilePicker({
      suggestedName: 'leave_system_data.xlsx',
      types: [
        {
          description: 'Excel Files',
          accept: {
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
              ['.xlsx'],
          },
        },
      ],
    });

    fileHandle = handle;
    isConnected = true;
    await saveHandleToIDB(handle);

    // Write initial empty structure
    await writeData(createEmptyData());
    return handle;
  }

  /**
   * Disconnect from current file
   */
  async function disconnect() {
    fileHandle = null;
    isConnected = false;
    await clearHandleFromIDB();
  }

  // ===== Read / Write Excel =====

  /**
   * Read all data from the connected Excel file
   */
  async function readData() {
    if (!fileHandle) throw new Error('No file connected');

    const file = await fileHandle.getFile();
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });

    const data = {
      lines: {},
      leaveRecords: [],
      settings: { language: 'th' },
    };

    // Read Lines sheet
    if (wb.SheetNames.includes('Lines')) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets['Lines']);
      for (const row of rows) {
        const id = String(row['LineID'] || row['id']);
        const shift = row['Shift'] || row['shift'] || null;

        if (!data.lines[id]) {
          data.lines[id] = {
            id: Number(id),
            name: row['LineName'] || row['name'] || `Line ${id}`,
            shifts: {
              day: { leader: '', employees: [] },
              night: { leader: '', employees: [] },
            },
          };
        }

        const employees = row['Employees']
          ? String(row['Employees'])
              .split('|')
              .map((s) => s.trim())
              .filter(Boolean)
          : [];
        const leader = row['Leader'] || row['leader'] || '';

        if (shift === 'day' || shift === 'night') {
          data.lines[id].shifts[shift].leader = leader;
          data.lines[id].shifts[shift].employees = employees;
        } else {
          // Legacy format (no shift column) - put into day shift
          data.lines[id].shifts.day.leader = leader;
          data.lines[id].shifts.day.employees = employees;
        }
      }
    }

    // Read LeaveRecords sheet
    if (wb.SheetNames.includes('LeaveRecords')) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets['LeaveRecords']);
      data.leaveRecords = rows.map((row) => ({
        id: row['RecordID'] || row['id'] || '',
        date: row['Date'] || row['date'] || '',
        lineId: String(row['LineID'] || row['lineId'] || ''),
        shift: row['Shift'] || row['shift'] || 'day',
        employeeName: row['EmployeeName'] || row['employeeName'] || '',
        leaveType: row['LeaveType'] || row['leaveType'] || '',
        note: row['Note'] || row['note'] || '',
        createdAt: row['CreatedAt'] || row['createdAt'] || '',
      }));
    }

    // Read Settings sheet
    if (wb.SheetNames.includes('Settings')) {
      const rows = XLSX.utils.sheet_to_json(wb.Sheets['Settings']);
      for (const row of rows) {
        if (row['Key'] && row['Value'] !== undefined) {
          data.settings[row['Key']] = row['Value'];
        }
      }
    }

    return data;
  }

  /**
   * Write all data to the connected Excel file
   */
  async function writeData(data) {
    if (!fileHandle) throw new Error('No file connected');

    const wb = XLSX.utils.book_new();

    // Lines sheet (one row per line+shift)
    const linesRows = [];
    Object.values(data.lines || {}).forEach((line) => {
      const shifts = line.shifts || { day: { leader: '', employees: [] }, night: { leader: '', employees: [] } };
      ['day', 'night'].forEach((shift) => {
        linesRows.push({
          LineID: line.id,
          LineName: line.name,
          Shift: shift,
          Leader: shifts[shift]?.leader || '',
          Employees: (shifts[shift]?.employees || []).join('|'),
        });
      });
    });
    const linesWS = XLSX.utils.json_to_sheet(linesRows);
    linesWS['!cols'] = [
      { wch: 8 },
      { wch: 15 },
      { wch: 8 },
      { wch: 20 },
      { wch: 80 },
    ];
    XLSX.utils.book_append_sheet(wb, linesWS, 'Lines');

    // LeaveRecords sheet
    const recordsRows = (data.leaveRecords || []).map((r) => ({
      RecordID: r.id,
      Date: r.date,
      LineID: r.lineId,
      Shift: r.shift || 'day',
      EmployeeName: r.employeeName,
      LeaveType: r.leaveType,
      Note: r.note || '',
      CreatedAt: r.createdAt || '',
    }));
    const recordsWS = XLSX.utils.json_to_sheet(recordsRows);
    recordsWS['!cols'] = [
      { wch: 25 },
      { wch: 12 },
      { wch: 8 },
      { wch: 8 },
      { wch: 25 },
      { wch: 15 },
      { wch: 30 },
      { wch: 25 },
    ];
    XLSX.utils.book_append_sheet(wb, recordsWS, 'LeaveRecords');

    // Settings sheet
    const settingsRows = Object.entries(data.settings || {}).map(
      ([key, value]) => ({
        Key: key,
        Value: String(value),
      })
    );
    const settingsWS = XLSX.utils.json_to_sheet(settingsRows);
    XLSX.utils.book_append_sheet(wb, settingsWS, 'Settings');

    // Write to file
    const wbOut = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
    const writable = await fileHandle.createWritable();
    await writable.write(new Uint8Array(wbOut));
    await writable.close();
  }

  function createEmptyData() {
    const lines = {};
    for (let i = 1; i <= 50; i++) {
      lines[i] = {
        id: i,
        name: `Line ${i}`,
        shifts: {
          day: { leader: '', employees: [] },
          night: { leader: '', employees: [] },
        },
      };
    }
    return {
      lines,
      leaveRecords: [],
      settings: { language: 'th', currentShift: 'day' },
    };
  }

  // ===== Status =====
  function getIsConnected() {
    return isConnected;
  }

  function getFileName() {
    return fileHandle ? fileHandle.name : null;
  }

  return {
    isSupported,
    tryReconnect,
    requestPermission,
    pickExistingFile,
    createNewFile,
    disconnect,
    readData,
    writeData,
    createEmptyData,
    getIsConnected,
    getFileName,
  };
})();
