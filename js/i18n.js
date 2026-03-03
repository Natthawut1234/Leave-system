/**
 * Internationalization (i18n) - Thai / English
 */
const I18n = (() => {
  const translations = {
    th: {
      // App
      appTitle: 'ระบบบันทึกการลา - โรงงานผลิต',
      appSubtitle: 'Production Line Leave Management System',
      selectRole: 'เลือกบทบาท',

      // Navigation
      navHome: 'หน้าหลัก',
      navLeader: 'Leader - บันทึกการลา',
      navDashboard: 'Dashboard - สรุปภาพรวม',
      navSettings: 'ตั้งค่า',

      // Roles
      roleLeader: 'Leader ไลน์ผลิต',
      roleLeaderDesc: 'บันทึกการลาของลูกน้องประจำวัน',
      roleManager: 'หัวหน้า Production',
      roleManagerDesc: 'ดู Dashboard ภาพรวมทุกไลน์',

      // Shifts
      selectShift: 'เลือกกะ',
      shiftDay: 'กะเช้า',
      shiftNight: 'กะดึก',
      shiftAll: 'ทุกกะ',
      shift: 'กะ',

      // Leader Page
      leaderTitle: 'บันทึกการลาประจำวัน',
      selectLine: 'เลือกไลน์ผลิต',
      selectDate: 'วันที่',
      employeeList: 'รายชื่อพนักงาน',
      addEmployee: 'เพิ่มพนักงาน',
      employeeName: 'ชื่อพนักงาน',
      leaveType: 'ประเภทการลา',
      note: 'หมายเหตุ',
      recordLeave: 'บันทึกการลา',
      todayLeaves: 'คนลาวันนี้',
      noEmployees: 'ยังไม่มีรายชื่อพนักงาน กรุณาเพิ่มหรืออัพโหลดจาก Excel',
      noLeaves: 'ไม่มีคนลา',
      uploadExcel: 'อัพโหลดรายชื่อจาก Excel',
      uploadExcelHint: 'ไฟล์ Excel (.xlsx) ต้องมีคอลัมน์ "ชื่อ" หรือ "Name"',
      downloadTemplate: 'ดาวน์โหลด Template',
      addManually: 'เพิ่มเอง',
      confirmDelete: 'ยืนยันการลบ?',
      leaderName: 'ชื่อ Leader',
      lineSetup: 'ตั้งค่าไลน์ผลิต',
      saveSetup: 'บันทึกการตั้งค่า',
      totalEmployees: 'พนักงานทั้งหมด',
      onLeaveToday: 'ลาวันนี้',
      attendanceRate: 'อัตราเข้างาน',

      // Leave Types
      leaveTypeSick: 'ลาป่วย',
      leaveTypePersonal: 'ลากิจ',
      leaveTypeVacation: 'ลาพักร้อน',
      leaveTypeMaternity: 'ลาคลอด',
      leaveTypeOther: 'อื่นๆ',

      // Dashboard
      dashboardTitle: 'Dashboard - สรุปภาพรวม',
      todaySummary: 'สรุปวันนี้',
      totalLeavesToday: 'จำนวนคนลาทั้งหมด',
      linesWithLeave: 'ไลน์ที่มีคนลา',
      linesNoLeave: 'ไลน์ไม่มีคนลา',
      leaveByLine: 'จำนวนคนลาแยกตามไลน์',
      leaveByType: 'จำนวนคนลาแยกตามประเภท',
      detailTable: 'ตารางรายละเอียด',
      line: 'ไลน์',
      employee: 'พนักงาน',
      type: 'ประเภท',
      date: 'วันที่',
      viewHistory: 'ดูย้อนหลัง',
      selectDateRange: 'เลือกช่วงวันที่',
      fromDate: 'จากวันที่',
      toDate: 'ถึงวันที่',
      search: 'ค้นหา',
      exportExcel: 'ส่งออก Excel',
      noData: 'ไม่มีข้อมูล',
      persons: 'คน',
      lines_unit: 'ไลน์',
      averagePerLine: 'เฉลี่ยต่อไลน์',

      // Settings
      settingsTitle: 'ตั้งค่าระบบ',
      language: 'ภาษา',
      exportData: 'สำรองข้อมูล (Export)',
      importData: 'นำเข้าข้อมูล (Import)',
      clearData: 'ล้างข้อมูลทั้งหมด',
      clearDataConfirm:
        'คุณแน่ใจหรือไม่ว่าต้องการล้างข้อมูลทั้งหมด? การกระทำนี้ไม่สามารถยกเลิกได้!',
      exportSuccess: 'สำรองข้อมูลสำเร็จ!',
      importSuccess: 'นำเข้าข้อมูลสำเร็จ!',
      importError: 'ไฟล์ไม่ถูกต้อง',

      // Search & Filter
      searchEmployee: 'ค้นหาพนักงาน...',
      searchPlaceholder: 'พิมพ์ชื่อเพื่อค้นหา...',
      filterEmployee: 'กรองพนักงาน...',
      noMatchFound: 'ไม่พบรายชื่อที่ค้นหา',
      showAll: 'แสดงทั้งหมด',

      // Common
      save: 'บันทึก',
      cancel: 'ยกเลิก',
      delete: 'ลบ',
      edit: 'แก้ไข',
      close: 'ปิด',
      back: 'กลับ',
      confirm: 'ยืนยัน',
      success: 'สำเร็จ!',
      error: 'เกิดข้อผิดพลาด',
      warning: 'คำเตือน',
      actions: 'จัดการ',
      person: 'คน',
    },
    en: {
      // App
      appTitle: 'Leave Recording System - Production Factory',
      appSubtitle: 'Production Line Leave Management System',
      selectRole: 'Select Role',

      // Navigation
      navHome: 'Home',
      navLeader: 'Leader - Record Leave',
      navDashboard: 'Dashboard - Overview',
      navSettings: 'Settings',

      // Roles
      roleLeader: 'Line Leader',
      roleLeaderDesc: 'Record daily leave for team members',
      roleManager: 'Production Manager',
      roleManagerDesc: 'View Dashboard overview of all lines',

      // Shifts
      selectShift: 'Select Shift',
      shiftDay: 'Day Shift',
      shiftNight: 'Night Shift',
      shiftAll: 'All Shifts',
      shift: 'Shift',

      // Leader Page
      leaderTitle: 'Daily Leave Recording',
      selectLine: 'Select Production Line',
      selectDate: 'Date',
      employeeList: 'Employee List',
      addEmployee: 'Add Employee',
      employeeName: 'Employee Name',
      leaveType: 'Leave Type',
      note: 'Note',
      recordLeave: 'Record Leave',
      todayLeaves: "Today's Leaves",
      noEmployees: 'No employees yet. Please add or upload from Excel.',
      noLeaves: 'No leaves',
      uploadExcel: 'Upload Names from Excel',
      uploadExcelHint:
        'Excel file (.xlsx) must have a column "ชื่อ" or "Name"',
      downloadTemplate: 'Download Template',
      addManually: 'Add Manually',
      confirmDelete: 'Confirm delete?',
      leaderName: 'Leader Name',
      lineSetup: 'Line Setup',
      saveSetup: 'Save Setup',
      totalEmployees: 'Total Employees',
      onLeaveToday: 'On Leave Today',
      attendanceRate: 'Attendance Rate',

      // Leave Types
      leaveTypeSick: 'Sick Leave',
      leaveTypePersonal: 'Personal Leave',
      leaveTypeVacation: 'Vacation',
      leaveTypeMaternity: 'Maternity Leave',
      leaveTypeOther: 'Other',

      // Dashboard
      dashboardTitle: 'Dashboard - Overview',
      todaySummary: "Today's Summary",
      totalLeavesToday: 'Total Leaves',
      linesWithLeave: 'Lines with Leave',
      linesNoLeave: 'Lines with No Leave',
      leaveByLine: 'Leaves by Line',
      leaveByType: 'Leaves by Type',
      detailTable: 'Detail Table',
      line: 'Line',
      employee: 'Employee',
      type: 'Type',
      date: 'Date',
      viewHistory: 'View History',
      selectDateRange: 'Select Date Range',
      fromDate: 'From',
      toDate: 'To',
      search: 'Search',
      exportExcel: 'Export Excel',
      noData: 'No Data',
      persons: 'persons',
      lines_unit: 'lines',
      averagePerLine: 'Avg per line',

      // Settings
      settingsTitle: 'System Settings',
      language: 'Language',
      exportData: 'Backup Data (Export)',
      importData: 'Import Data',
      clearData: 'Clear All Data',
      clearDataConfirm:
        'Are you sure you want to clear all data? This action cannot be undone!',
      exportSuccess: 'Data exported successfully!',
      importSuccess: 'Data imported successfully!',
      importError: 'Invalid file',

      // Search & Filter
      searchEmployee: 'Search employee...',
      searchPlaceholder: 'Type name to search...',
      filterEmployee: 'Filter employee...',
      noMatchFound: 'No match found',
      showAll: 'Show all',

      // Common
      save: 'Save',
      cancel: 'Cancel',
      delete: 'Delete',
      edit: 'Edit',
      close: 'Close',
      back: 'Back',
      confirm: 'Confirm',
      success: 'Success!',
      error: 'Error',
      warning: 'Warning',
      actions: 'Actions',
      person: 'persons',
    },
  };

  let currentLang = 'th';

  function setLanguage(lang) {
    currentLang = lang;
    document.documentElement.lang = lang;
    DataManager.saveSettings({ language: lang });
    translatePage();
  }

  function getLanguage() {
    return currentLang;
  }

  function t(key) {
    return translations[currentLang][key] || translations['th'][key] || key;
  }

  function translatePage() {
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      el.textContent = t(key);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      el.placeholder = t(key);
    });
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      el.title = t(key);
    });
  }

  function init() {
    const settings = DataManager.getSettings();
    currentLang = settings.language || 'th';
  }

  return {
    setLanguage,
    getLanguage,
    t,
    translatePage,
    init,
  };
})();
