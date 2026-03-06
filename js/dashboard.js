/**
 * Dashboard Module
 * Shows summary overview for production managers
 * Supports Day / Night / All shift filtering
 */
const DashboardModule = (() => {
  let barChart = null;
  let pieChart = null;
  let currentDate = new Date().toISOString().split('T')[0];
  let currentShift = null; // null = all shifts

  function render() {
    const t = I18n.t;
    const container = document.getElementById('main-content');
    container.innerHTML = `
      <div class="container-fluid py-3 animate-fade-in">
        <!-- Date & Shift Selector -->
        <div class="row mb-3">
          <div class="col-md-3">
            <div class="input-group">
              <span class="input-group-text"><i class="bi bi-calendar-date"></i></span>
              <input type="date" id="dashboard-date" class="form-control form-control-lg" value="${currentDate}">
            </div>
          </div>
          <div class="col-md-2 d-flex align-items-center">
            <button class="btn btn-outline-secondary me-2" id="btn-prev-day">
              <i class="bi bi-chevron-left"></i>
            </button>
            <button class="btn btn-primary" id="btn-today">
              ${t('todaySummary')}
            </button>
            <button class="btn btn-outline-secondary ms-2" id="btn-next-day">
              <i class="bi bi-chevron-right"></i>
            </button>
          </div>
          <div class="col-md-4">
            <div class="btn-group w-100" role="group" id="dashboard-shift-selector">
              <button type="button" class="btn ${currentShift === null ? 'btn-primary' : 'btn-outline-primary'}" data-shift="all">
                <i class="bi bi-layers"></i> ${t('shiftAll')}
              </button>
              <button type="button" class="btn ${currentShift === 'day' ? 'btn-warning' : 'btn-outline-warning'}" data-shift="day">
                <i class="bi bi-sun"></i> ${t('shiftDay')}
              </button>
              <button type="button" class="btn ${currentShift === 'night' ? 'btn-dark' : 'btn-outline-dark'}" data-shift="night">
                <i class="bi bi-moon-stars"></i> ${t('shiftNight')}
              </button>
            </div>
          </div>
          <div class="col-md-3 text-end">
            <button class="btn btn-success" id="btn-export-excel">
              <i class="bi bi-file-earmark-excel"></i> ${t('exportExcel')}
            </button>
          </div>
        </div>

        <!-- Summary Cards -->
        <div class="row mb-3" id="summary-cards"></div>

        <!-- Charts -->
        <div class="row mb-3">
          <div class="col-lg-8">
            <div class="card shadow-sm border-0">
              <div class="card-header bg-white">
                <h5 class="mb-0"><i class="bi bi-bar-chart"></i> ${t('leaveByLine')}</h5>
              </div>
              <div class="card-body">
                <canvas id="barChart" height="300"></canvas>
              </div>
            </div>
          </div>
          <div class="col-lg-4">
            <div class="card shadow-sm border-0">
              <div class="card-header bg-white">
                <h5 class="mb-0"><i class="bi bi-pie-chart"></i> ${t('leaveByType')}</h5>
              </div>
              <div class="card-body">
                <canvas id="pieChart" height="300"></canvas>
              </div>
            </div>
          </div>
        </div>

        <!-- Detail Table -->
        <div class="card shadow-sm border-0 mb-3">
          <div class="card-header bg-white d-flex justify-content-between align-items-center">
            <h5 class="mb-0"><i class="bi bi-table"></i> ${t('detailTable')}</h5>
            <span class="badge bg-dark" id="detail-count">0</span>
          </div>
          <div class="card-body p-0">
            <!-- Search/filter bar -->
            <div class="p-3 pb-0 mb-3">
              <div class="input-group">
                <span class="input-group-text"><i class="bi bi-search"></i></span>
                <input type="text" id="detail-search-input" class="form-control" 
                       placeholder="${t('searchEmployee')}">
              </div>
            </div>
            <div class="table-responsive">
              <table class="table table-hover table-striped mb-0">
                <thead class="table-dark">
                  <tr>
                    <th>#</th>
                    <th>${t('line')}</th>
                    <th>${t('shift')}</th>
                    <th>${t('employeeName')}</th>
                    <th>${t('leaveType')}</th>
                    <th>${t('note')}</th>
                  </tr>
                </thead>
                <tbody id="detail-table-body"></tbody>
              </table>
            </div>
            <div id="no-data-msg" class="text-center text-muted py-4" style="display: none;">
              <i class="bi bi-emoji-smile" style="font-size: 3rem;"></i>
              <p class="mt-2">${t('noData')}</p>
            </div>
          </div>
        </div>

        <!-- History Range -->
        <div class="card shadow-sm border-0">
          <div class="card-header bg-secondary text-white">
            <h5 class="mb-0"><i class="bi bi-clock-history"></i> ${t('viewHistory')}</h5>
          </div>
          <div class="card-body">
            <div class="row g-2 mb-3">
              <div class="col-md-3">
                <label class="form-label">${t('fromDate')}</label>
                <input type="date" id="hist-from" class="form-control" value="${getWeekAgo()}">
              </div>
              <div class="col-md-3">
                <label class="form-label">${t('toDate')}</label>
                <input type="date" id="hist-to" class="form-control" value="${currentDate}">
              </div>
              <div class="col-md-3 d-flex align-items-end gap-2">
                <button class="btn btn-secondary" id="btn-hist-search">
                  <i class="bi bi-search"></i> ${t('search')}
                </button>
                <button class="btn btn-success" id="btn-hist-export">
                  <i class="bi bi-file-earmark-excel"></i> ${t('exportExcel')}
                </button>
              </div>
            </div>
            <div id="history-result"></div>
          </div>
        </div>
      </div>
    `;

    bindEvents();
    refreshDashboard();
  }

  function getWeekAgo() {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  }

  function getShiftLabel(shift) {
    const t = I18n.t;
    if (shift === 'day') return t('shiftDay');
    if (shift === 'night') return t('shiftNight');
    return shift || '-';
  }

  function getShiftBadge(shift) {
    if (shift === 'day') {
      return `<span class="badge bg-warning text-dark"><i class="bi bi-sun"></i> ${getShiftLabel(shift)}</span>`;
    } else if (shift === 'night') {
      return `<span class="badge bg-dark"><i class="bi bi-moon-stars"></i> ${getShiftLabel(shift)}</span>`;
    }
    return `<span class="badge bg-secondary">${shift || '-'}</span>`;
  }

  function bindEvents() {
    document
      .getElementById('dashboard-date')
      .addEventListener('change', (e) => {
        currentDate = e.target.value;
        refreshDashboard();
      });

    document.getElementById('btn-prev-day').addEventListener('click', () => {
      const d = new Date(currentDate);
      d.setDate(d.getDate() - 1);
      currentDate = d.toISOString().split('T')[0];
      document.getElementById('dashboard-date').value = currentDate;
      refreshDashboard();
    });

    document.getElementById('btn-next-day').addEventListener('click', () => {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + 1);
      currentDate = d.toISOString().split('T')[0];
      document.getElementById('dashboard-date').value = currentDate;
      refreshDashboard();
    });

    document.getElementById('btn-today').addEventListener('click', () => {
      currentDate = new Date().toISOString().split('T')[0];
      document.getElementById('dashboard-date').value = currentDate;
      refreshDashboard();
    });

    // Shift filter buttons
    document.querySelectorAll('#dashboard-shift-selector button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const shift = btn.getAttribute('data-shift');
        currentShift = shift === 'all' ? null : shift;
        // Update button styles
        document.querySelectorAll('#dashboard-shift-selector button').forEach((b) => {
          const s = b.getAttribute('data-shift');
          if (s === 'all') {
            b.className = `btn ${currentShift === null ? 'btn-primary' : 'btn-outline-primary'}`;
          } else if (s === 'day') {
            b.className = `btn ${currentShift === 'day' ? 'btn-warning' : 'btn-outline-warning'}`;
          } else {
            b.className = `btn ${currentShift === 'night' ? 'btn-dark' : 'btn-outline-dark'}`;
          }
        });
        refreshDashboard();
      });
    });

    document
      .getElementById('btn-export-excel')
      .addEventListener('click', () => exportDailyExcel(currentDate));

    document
      .getElementById('btn-hist-search')
      .addEventListener('click', searchHistory);

    document
      .getElementById('btn-hist-export')
      .addEventListener('click', exportHistoryExcel);

    // Detail table real-time search
    document.getElementById('detail-search-input').addEventListener('input', (e) => {
      const keyword = e.target.value.trim().toLowerCase();
      const rows = document.querySelectorAll('#detail-table-body tr');
      let visibleCount = 0;
      rows.forEach((row) => {
        const text = row.textContent.toLowerCase();
        const match = text.includes(keyword);
        row.style.display = match ? '' : 'none';
        if (match) visibleCount++;
      });
      document.getElementById('detail-count').textContent = keyword ? visibleCount : rows.length;
      const noMsg = document.getElementById('no-data-msg');
      if (noMsg) noMsg.style.display = (rows.length > 0 && visibleCount === 0) ? 'block' : (rows.length === 0 ? 'block' : 'none');
    });
  }

  function refreshDashboard() {
    const summary = DataManager.getDailySummary(currentDate, currentShift);
    const lines = DataManager.getLines();
    const totalLines = Object.keys(lines).length;
    const linesWithLeave = Object.keys(summary.lineBreakdown).length;
    const t = I18n.t;

    // Summary Cards
    document.getElementById('summary-cards').innerHTML = `
      <div class="col-md-3">
        <div class="card stat-card border-0 shadow-sm bg-danger text-white">
          <div class="card-body text-center py-3">
            <i class="bi bi-person-dash" style="font-size: 2.5rem;"></i>
            <h1 class="mb-0 mt-1">${summary.totalLeaves}</h1>
            <small class="opacity-75">${t('totalLeavesToday')}</small>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stat-card border-0 shadow-sm bg-warning text-dark">
          <div class="card-body text-center py-3">
            <i class="bi bi-exclamation-triangle" style="font-size: 2.5rem;"></i>
            <h1 class="mb-0 mt-1">${linesWithLeave}</h1>
            <small class="opacity-75">${t('linesWithLeave')}</small>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stat-card border-0 shadow-sm bg-success text-white">
          <div class="card-body text-center py-3">
            <i class="bi bi-check-circle" style="font-size: 2.5rem;"></i>
            <h1 class="mb-0 mt-1">${totalLines - linesWithLeave}</h1>
            <small class="opacity-75">${t('linesNoLeave')}</small>
          </div>
        </div>
      </div>
      <div class="col-md-3">
        <div class="card stat-card border-0 shadow-sm bg-info text-white">
          <div class="card-body text-center py-3">
            <i class="bi bi-calculator" style="font-size: 2.5rem;"></i>
            <h1 class="mb-0 mt-1">${linesWithLeave > 0 ? (summary.totalLeaves / linesWithLeave).toFixed(1) : 0}</h1>
            <small class="opacity-75">${t('averagePerLine')}</small>
          </div>
        </div>
      </div>
    `;

    // Bar Chart
    renderBarChart(summary, lines);

    // Pie Chart
    renderPieChart(summary);

    // Detail Table
    renderDetailTable(summary);
  }

  function renderBarChart(summary, lines) {
    const ctx = document.getElementById('barChart').getContext('2d');

    if (barChart) barChart.destroy();

    // Show all lines that have leaves, sorted by line number
    const lineIds = Object.keys(summary.lineBreakdown).sort(
      (a, b) => Number(a) - Number(b)
    );
    const labels = lineIds.map(
      (id) => lines[id]?.name || `Line ${id}`
    );
    const data = lineIds.map((id) => summary.lineBreakdown[id].count);

    const colors = data.map((v) =>
      v >= 5
        ? 'rgba(220, 53, 69, 0.8)'
        : v >= 3
          ? 'rgba(255, 193, 7, 0.8)'
          : 'rgba(25, 135, 84, 0.8)'
    );

    barChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: I18n.t('totalLeavesToday'),
            data,
            backgroundColor: colors,
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1 },
            title: {
              display: true,
              text: I18n.t('persons'),
            },
          },
        },
      },
    });
  }

  function renderPieChart(summary) {
    const ctx = document.getElementById('pieChart').getContext('2d');

    if (pieChart) pieChart.destroy();

    const labels = Object.keys(summary.leaveTypeBreakdown);
    const data = Object.values(summary.leaveTypeBreakdown);

    if (labels.length === 0) {
      ctx.font = '16px sans-serif';
      ctx.fillStyle = '#999';
      ctx.textAlign = 'center';
      ctx.fillText(I18n.t('noData'), ctx.canvas.width / 2, ctx.canvas.height / 2);
      return;
    }

    const colorMap = {
      'ลาป่วย': '#dc3545',
      'ลากิจ': '#ffc107',
      'ลาพักร้อน': '#0dcaf0',
      'ลาคลอด': '#0d6efd',
      'อื่นๆ': '#6c757d',
      'มาสาย': '#fd7e14',
      'ขาด': '#212529',
    };

    const translatedLabels = labels.map((l) => I18n.translateLeaveType(l));

    pieChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: translatedLabels,
        datasets: [
          {
            data,
            backgroundColor: labels.map(
              (l) => colorMap[l] || '#6c757d'
            ),
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { padding: 12, font: { size: 13 } },
          },
        },
      },
    });
  }

  function renderDetailTable(summary) {
    const tbody = document.getElementById('detail-table-body');
    const noMsg = document.getElementById('no-data-msg');
    const records = DataManager.getLeaveRecordsByDate(currentDate, currentShift);
    const lines = DataManager.getLines();

    document.getElementById('detail-count').textContent = records.length;
    // Reset search input
    const searchInput = document.getElementById('detail-search-input');
    if (searchInput) searchInput.value = '';

    if (records.length === 0) {
      tbody.innerHTML = '';
      noMsg.style.display = 'block';
      return;
    }

    noMsg.style.display = 'none';

    // Sort by line number then shift
    records.sort((a, b) => Number(a.lineId) - Number(b.lineId) || (a.shift || '').localeCompare(b.shift || ''));

    tbody.innerHTML = records
      .map(
        (r, i) => `
      <tr>
        <td>${i + 1}</td>
        <td><span class="badge bg-primary">${lines[r.lineId]?.name || 'Line ' + r.lineId}</span></td>
        <td>${getShiftBadge(r.shift)}</td>
        <td>${r.employeeName}</td>
        <td><span class="badge ${getLeaveTypeBadge(r.leaveType)}">${I18n.translateLeaveType(r.leaveType)}</span></td>
        <td>${r.note || '-'}</td>
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

  function searchHistory() {
    const from = document.getElementById('hist-from').value;
    const to = document.getElementById('hist-to').value;
    if (!from || !to) return;

    let records = DataManager.getLeaveRecordsByDateRange(from, to);
    // Apply shift filter
    if (currentShift) {
      records = records.filter((r) => r.shift === currentShift);
    }
    const lines = DataManager.getLines();
    const t = I18n.t;
    const container = document.getElementById('history-result');

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

    // Summary per date
    let html = `
      <div class="table-responsive">
        <table class="table table-bordered table-sm">
          <thead class="table-dark">
            <tr>
              <th>${t('date')}</th>
              <th>${t('totalLeavesToday')}</th>
              <th>${t('linesWithLeave')}</th>
              <th style="min-width: 400px;">${t('detailTable')}</th>
            </tr>
          </thead>
          <tbody>`;

    Object.keys(grouped)
      .sort()
      .reverse()
      .forEach((date) => {
        const dayRecords = grouped[date];
        const lineSet = new Set(dayRecords.map((r) => r.lineId));
        const details = dayRecords
          .map(
            (r) =>
              `<span class="badge bg-primary me-1">${lines[r.lineId]?.name || 'L' + r.lineId}</span>${getShiftBadge(r.shift)} ${r.employeeName} <span class="badge ${getLeaveTypeBadge(r.leaveType)} badge-sm">${I18n.translateLeaveType(r.leaveType)}</span>`
          )
          .join(', ');

        html += `
          <tr>
            <td class="fw-bold">${date}</td>
            <td class="text-center"><span class="badge bg-danger">${dayRecords.length} ${t('persons')}</span></td>
            <td class="text-center">${lineSet.size} ${t('lines_unit')}</td>
            <td><small>${details}</small></td>
          </tr>`;
      });

    html += '</tbody></table></div>';
    container.innerHTML = html;
  }

  function exportDailyExcel(date) {
    let records = DataManager.getLeaveRecordsByDate(date, currentShift);
    const lines = DataManager.getLines();
    const t = I18n.t;

    if (records.length === 0) {
      showToast(t('noData'), 'warning');
      return;
    }

    const data = [
      [t('line'), t('shift'), t('employeeName'), t('leaveType'), t('note'), t('date')],
    ];

    records
      .sort((a, b) => Number(a.lineId) - Number(b.lineId))
      .forEach((r) => {
        data.push([
          lines[r.lineId]?.name || `Line ${r.lineId}`,
          getShiftLabel(r.shift),
          r.employeeName,
          r.leaveType,
          r.note || '',
          r.date,
        ]);
      });

    // Add summary
    data.push([]);
    data.push([t('totalLeavesToday'), records.length, t('persons')]);

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 15 },
      { wch: 12 },
      { wch: 25 },
      { wch: 15 },
      { wch: 25 },
      { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, `Leave_${date}`);
    XLSX.writeFile(wb, `leave_report_${date}.xlsx`);
    showToast(t('exportSuccess'), 'success');
  }

  function exportHistoryExcel() {
    const from = document.getElementById('hist-from').value;
    const to = document.getElementById('hist-to').value;
    if (!from || !to) return;

    let records = DataManager.getLeaveRecordsByDateRange(from, to);
    if (currentShift) {
      records = records.filter((r) => r.shift === currentShift);
    }
    const lines = DataManager.getLines();
    const t = I18n.t;

    if (records.length === 0) {
      showToast(t('noData'), 'warning');
      return;
    }

    const data = [
      [t('date'), t('line'), t('shift'), t('employeeName'), t('leaveType'), t('note')],
    ];

    records
      .sort((a, b) => a.date.localeCompare(b.date) || Number(a.lineId) - Number(b.lineId))
      .forEach((r) => {
        data.push([
          r.date,
          lines[r.lineId]?.name || `Line ${r.lineId}`,
          getShiftLabel(r.shift),
          r.employeeName,
          r.leaveType,
          r.note || '',
        ]);
      });

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 12 },
      { wch: 15 },
      { wch: 12 },
      { wch: 25 },
      { wch: 15 },
      { wch: 25 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'History');
    XLSX.writeFile(wb, `leave_history_${from}_to_${to}.xlsx`);
    showToast(t('exportSuccess'), 'success');
  }

  return {
    render,
  };
})();
