/**
 * Personal Leave Booking Module
 * Reserve personal leave with a maximum of 5 bookings per date
 */
const PersonalBookingModule = (() => {
  let currentLineId = null;
  let currentShift = 'day';
  let bookingDate = new Date().toISOString().split('T')[0];

  function render() {
    const settings = DataManager.getSettings();
    currentLineId = settings.currentLineId || Object.keys(DataManager.getLines())[0] || null;
    currentShift = settings.currentShift || 'day';
    bookingDate = new Date().toISOString().split('T')[0];
    const t = I18n.t;

    document.getElementById('main-content').innerHTML = `
      <div class="container-fluid py-3 animate-fade-in">
        <div class="row g-3">
          <div class="col-lg-5">
            <div class="card shadow-sm border-0">
              <div class="card-header bg-primary text-white">
                <h5 class="mb-0"><i class="bi bi-calendar2-check"></i> ${t('bookPersonalLeave')}</h5>
              </div>
              <div class="card-body">
                <p class="text-muted small mb-3">${t('personalLeaveBookingHint')}</p>

                <div class="mb-3">
                  <label class="form-label">${t('selectLine')}</label>
                  <select id="booking-line" class="form-select">
                    ${generateLineOptions()}
                  </select>
                </div>

                <div class="mb-3">
                  <label class="form-label">${t('selectShift')}</label>
                  <div class="btn-group w-100" role="group" id="booking-shift-selector">
                    <button type="button" class="btn ${currentShift === 'day' ? 'btn-warning' : 'btn-outline-warning'}" data-shift="day">
                      <i class="bi bi-sun"></i> ${t('shiftDay')}
                    </button>
                    <button type="button" class="btn ${currentShift === 'night' ? 'btn-dark' : 'btn-outline-dark'}" data-shift="night">
                      <i class="bi bi-moon-stars"></i> ${t('shiftNight')}
                    </button>
                  </div>
                </div>

                <div class="mb-3">
                  <label class="form-label">${t('leaveDate')}</label>
                  <input type="date" id="booking-date" class="form-control" value="${bookingDate}">
                </div>

                <div class="mb-3">
                  <label class="form-label">${t('employeeName')}</label>
                  <select id="booking-employee" class="form-select">
                  </select>
                </div>

                <div class="mb-3">
                  <label class="form-label">${t('note')}</label>
                  <input type="text" id="booking-note" class="form-control" placeholder="${t('note')}">
                </div>

                <button id="btn-book-personal-leave" class="btn btn-primary w-100">
                  <i class="bi bi-plus-circle"></i> ${t('bookPersonalLeave')}
                </button>
              </div>
            </div>
          </div>

          <div class="col-lg-7">
            <div class="card shadow-sm border-0">
              <div class="card-header bg-info text-white d-flex justify-content-between align-items-center">
                <h5 class="mb-0"><i class="bi bi-list-check"></i> ${t('bookedPersonalLeaveList')}</h5>
                <span class="badge bg-dark" id="booking-count-badge">0/5</span>
              </div>
              <div class="card-body p-0">
                <div class="table-responsive">
                  <table class="table table-hover table-striped mb-0">
                    <thead class="table-dark">
                      <tr>
                        <th>#</th>
                        <th>${t('line')}</th>
                        <th>${t('shift')}</th>
                        <th>${t('employeeName')}</th>
                        <th>${t('note')}</th>
                        <th>${t('actions')}</th>
                      </tr>
                    </thead>
                    <tbody id="booking-table-body"></tbody>
                  </table>
                </div>
                <div id="no-booking-msg" class="text-center text-muted py-4" style="display:none;">
                  <i class="bi bi-calendar2-x" style="font-size: 3rem;"></i>
                  <p class="mt-2 mb-0">${t('noPersonalLeaveBooking')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    bindEvents();
    const lineSelect = document.getElementById('booking-line');
    if (lineSelect && currentLineId) lineSelect.value = String(currentLineId);
    refreshEmployeeOptions();
    refreshBookingTable();
  }

  function generateLineOptions() {
    const lines = DataManager.getLines();
    return Object.keys(lines)
      .sort((a, b) => Number(a) - Number(b))
      .map((id) => `<option value="${id}">${escapeHtml(lines[id].name)}</option>`)
      .join('');
  }

  function bindEvents() {
    document.getElementById('booking-line').addEventListener('change', (e) => {
      currentLineId = e.target.value;
      DataManager.saveSettings({ currentLineId });
      refreshEmployeeOptions();
    });

    document.querySelectorAll('#booking-shift-selector button').forEach((btn) => {
      btn.addEventListener('click', () => {
        currentShift = btn.getAttribute('data-shift');
        DataManager.saveSettings({ currentShift });
        updateShiftButtons();
        refreshEmployeeOptions();
      });
    });

    document.getElementById('booking-date').addEventListener('change', (e) => {
      bookingDate = e.target.value;
      refreshEmployeeOptions();
      refreshBookingTable();
    });

    document
      .getElementById('btn-book-personal-leave')
      .addEventListener('click', bookPersonalLeave);
  }

  function updateShiftButtons() {
    document.querySelectorAll('#booking-shift-selector button').forEach((btn) => {
      const shift = btn.getAttribute('data-shift');
      if (shift === 'day') {
        btn.className = `btn ${currentShift === 'day' ? 'btn-warning' : 'btn-outline-warning'}`;
      } else {
        btn.className = `btn ${currentShift === 'night' ? 'btn-dark' : 'btn-outline-dark'}`;
      }
    });
  }

  function refreshEmployeeOptions() {
    const select = document.getElementById('booking-employee');
    if (!select) return;
    const t = I18n.t;

    if (!currentLineId) {
      select.innerHTML = `<option value="">-- ${t('selectLine')} --</option>`;
      return;
    }

    const allEmployees = DataManager.getEmployees(currentLineId, currentShift);
    const bookingsForDate = DataManager.getPersonalLeaveBookingsByDateLineShift(
      bookingDate,
      currentLineId,
      currentShift
    );
    const bookedNames = bookingsForDate.map((b) => b.employeeName);
    const available = allEmployees.filter((name) => !bookedNames.includes(name));

    if (available.length === 0) {
      select.innerHTML = `<option value="">${t('noEmployees')}</option>`;
      return;
    }

    select.innerHTML = `
      <option value="">-- ${t('employeeName')} --</option>
      ${available.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('')}
    `;
  }

  function refreshBookingTable() {
    const tbody = document.getElementById('booking-table-body');
    const noMsg = document.getElementById('no-booking-msg');
    const countBadge = document.getElementById('booking-count-badge');
    const lines = DataManager.getLines();

    const bookings = DataManager.getPersonalLeaveBookingsByDate(bookingDate)
      .slice()
      .sort((a, b) => {
        if (a.lineId !== b.lineId) return Number(a.lineId) - Number(b.lineId);
        return a.employeeName.localeCompare(b.employeeName);
      });

    countBadge.textContent = `${bookings.length}/5`;
    countBadge.className = `badge ${bookings.length >= 5 ? 'bg-danger' : 'bg-dark'}`;

    if (bookings.length === 0) {
      tbody.innerHTML = '';
      noMsg.style.display = 'block';
      return;
    }

    noMsg.style.display = 'none';
    tbody.innerHTML = bookings
      .map((b, idx) => `
        <tr>
          <td>${idx + 1}</td>
          <td>${escapeHtml(lines[b.lineId]?.name || `Line ${b.lineId}`)}</td>
          <td>${b.shift === 'night' ? I18n.t('shiftNight') : I18n.t('shiftDay')}</td>
          <td><strong>${escapeHtml(b.employeeName)}</strong></td>
          <td>${escapeHtml(b.note || '-')}</td>
          <td>
            <button class="btn btn-outline-danger btn-sm" onclick="PersonalBookingModule.removeBooking('${b.id}')">
              <i class="bi bi-trash"></i>
            </button>
          </td>
        </tr>
      `)
      .join('');
  }

  function bookPersonalLeave() {
    const t = I18n.t;
    const employeeName = document.getElementById('booking-employee').value;
    const note = document.getElementById('booking-note').value.trim();

    if (!currentLineId || !employeeName || !bookingDate) {
      showToast(t('warning'), 'warning');
      return;
    }

    const dailyCount = DataManager.getPersonalLeaveBookingCountByDate(bookingDate);
    if (dailyCount >= 5) {
      showToast(t('bookingLimitReached'), 'warning');
      return;
    }

    const hasDuplicate = DataManager.getPersonalLeaveBookingsByDate(bookingDate).some(
      (b) => String(b.lineId) === String(currentLineId) &&
        b.shift === currentShift &&
        b.employeeName === employeeName
    );
    if (hasDuplicate) {
      showToast(t('bookingAlreadyExists'), 'warning');
      return;
    }

    DataManager.addPersonalLeaveBooking({
      date: bookingDate,
      lineId: currentLineId,
      shift: currentShift,
      employeeName,
      note,
    });

    document.getElementById('booking-note').value = '';
    refreshEmployeeOptions();
    refreshBookingTable();
    showToast(t('success'), 'success');
  }

  function removeBooking(bookingId) {
    if (!confirm(I18n.t('confirmDelete'))) return;
    DataManager.removePersonalLeaveBooking(bookingId);
    refreshEmployeeOptions();
    refreshBookingTable();
    showToast(I18n.t('success'), 'success');
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return {
    render,
    removeBooking,
  };
})();
