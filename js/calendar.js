/**
 * Calendar Module
 * Handles availability calendar and date management
 */

const Calendar = {
  currentDate: new Date(),
  selectedDates: [],
  blockedDates: {},
  bookedDates: {},
  modal: null,
  bookingDetailsModal: null,
  
  // Initialize calendar module
  init() {
    this.loadAvailability();
    this.createCalendarTab();
    this.setupEventListeners();
    this.renderCalendar();
    this.renderUpcomingBookings();
    
    // Add validation for date selection in the quote form
    this.setupDateValidation();
  },
  
  // Load availability data from Netlify
  async loadAvailability() {
    try {
      // Try to load from Netlify if available
      if (AppState.usingNetlify && NetlifyStorage.checkAuth()) {
        const availability = await NetlifyStorage.loadCalendarData();
        if (availability) {
          this.blockedDates = availability.blockedDates || {};
          this.bookedDates = availability.bookedDates || {};
          
          // Update app state
          AppState.availability = {
            blockedDates: this.blockedDates,
            bookedDates: this.bookedDates
          };
          
          console.log('Availability data loaded from Netlify');
          return;
        }
      }
      
      // Initialize with empty data if nothing found or no connection
      this.blockedDates = {};
      this.bookedDates = {};
      
      // Update app state
      AppState.availability = {
        blockedDates: this.blockedDates,
        bookedDates: this.bookedDates
      };
      
      console.log('No availability data found, initialized with empty data');
    } catch (error) {
      console.error('Error loading availability data:', error);
      
      // Initialize with empty data
      this.blockedDates = {};
      this.bookedDates = {};
    }
  },
  
  // Save availability data to Netlify
  async saveAvailability() {
    try {
      // Save to Netlify if available
      if (AppState.usingNetlify && NetlifyStorage.checkAuth()) {
        const availability = {
          blockedDates: this.blockedDates,
          bookedDates: this.bookedDates
        };
        
        await NetlifyStorage.saveCalendarData(availability);
        console.log('Availability data saved to Netlify');
      } else {
        console.log('Netlify not available, calendar data not saved');
      }
      
      // Update app state
      AppState.availability = {
        blockedDates: this.blockedDates,
        bookedDates: this.bookedDates
      };
      
      console.log('Availability data updated in app state');
    } catch (error) {
      console.error('Error saving availability data:', error);
    }
  },
  
  // Update availability from Netlify
  updateAvailability(availability) {
    if (!availability) return;
    
    this.blockedDates = availability.blockedDates || {};
    this.bookedDates = availability.bookedDates || {};
    
    // Update app state
    AppState.availability = {
      blockedDates: this.blockedDates,
      bookedDates: this.bookedDates
    };
    
    // Refresh display
    this.renderCalendar();
    this.renderUpcomingBookings();
    
    console.log('Calendar availability updated from Netlify');
  },
  
  // Create calendar tab
  createCalendarTab() {
    // Create tab
    const tabsContainer = document.querySelector('.tabs');
    const calendarTab = document.createElement('div');
    calendarTab.className = 'tab';
    calendarTab.setAttribute('data-tab', 'calendar');
    calendarTab.innerHTML = '<i class="fas fa-calendar-alt"></i> Calendar';
    
    // Add tab
    // Insert before the history tab if it exists
    const historyTab = document.querySelector('.tab[data-tab="history"]');
    if (historyTab) {
      tabsContainer.insertBefore(calendarTab, historyTab);
    } else {
      tabsContainer.appendChild(calendarTab);
    }
    
    // Set up tab click event with PIN protection
    calendarTab.addEventListener('click', () => {
      PinAuth.verifyPin(() => {
        // This runs after successful PIN verification
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        calendarTab.classList.add('active');
        document.getElementById('calendar').classList.add('active');
        
        // Check Netlify authentication if needed
        if (AppState.usingNetlify && !NetlifyStorage.checkAuth()) {
          const calendarContent = document.getElementById('calendar').querySelector('.card');
          calendarContent.innerHTML = '';
          calendarContent.appendChild(NetlifyAuth.showAuthRequired('Authentication Required for Calendar'));
          return;
        }
        
        // Refresh calendar when tab is shown
        this.renderCalendar();
        this.renderUpcomingBookings();
      });
    });
  },
  
  // Set up event listeners
  setupEventListeners() {
    // Calendar navigation
    document.getElementById('prevMonth').addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      this.renderCalendar();
    });
    
    document.getElementById('nextMonth').addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      this.renderCalendar();
    });
    
    // Block date button
    document.getElementById('blockDateBtn').addEventListener('click', this.showBlockDateModal.bind(this));
    
    // Export calendar button
    document.getElementById('exportCalendarBtn').addEventListener('click', this.exportCalendar.bind(this));
  },
  
  // Set up date validation for the form
  setupDateValidation() {
    const startDateInput = document.getElementById('projectStartDate');
    const endDateInput = document.getElementById('projectEndDate');
    const dateWarning = document.getElementById('dateUnavailableWarning');
    
    if (!startDateInput || !endDateInput) return;
    
    // Set minimum dates to today to prevent past bookings
    const today = new Date().toISOString().split('T')[0];
    startDateInput.min = today;
    endDateInput.min = today;
    
    // Validate dates when selected
    startDateInput.addEventListener('change', () => {
      // Make sure end date is not before start date
      endDateInput.min = startDateInput.value;
      if (endDateInput.value && endDateInput.value < startDateInput.value) {
        endDateInput.value = startDateInput.value;
      }
      this.validateDateRange();
    });
    
    endDateInput.addEventListener('change', this.validateDateRange.bind(this));
    
    // Store selected dates in app state when calculate button is clicked
    document.getElementById('calculateBtn').addEventListener('click', () => {
      if (startDateInput.value && endDateInput.value) {
        AppState.selectedDates = {
          startDate: startDateInput.value,
          endDate: endDateInput.value
        };
      }
    });
  },
  
  // Validate that selected dates are available
  validateDateRange() {
    const startDateInput = document.getElementById('projectStartDate');
    const endDateInput = document.getElementById('projectEndDate');
    const dateWarning = document.getElementById('dateUnavailableWarning');
    
    if (!startDateInput.value || !endDateInput.value) return;
    
    const startDate = new Date(startDateInput.value);
    const endDate = new Date(endDateInput.value);
    const dateConflict = this.checkDateConflicts(startDate, endDate);
    
    if (dateConflict) {
      dateWarning.style.display = 'flex';
      document.getElementById('calculateBtn').disabled = true;
    } else {
      dateWarning.style.display = 'none';
      document.getElementById('calculateBtn').disabled = false;
    }
  },
  
  // Check if date range has any conflicts with booked or blocked dates
  checkDateConflicts(startDate, endDate) {
    // Clone date to avoid modifying the original
    let currentDate = new Date(startDate);
    
    // Check each day in the range
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      if (this.blockedDates[dateStr] || this.bookedDates[dateStr]) {
        return true;
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return false;
  },
  
  // Render the calendar view
  renderCalendar() {
    const calendarGrid = document.getElementById('calendarGrid');
    const monthTitle = document.getElementById('currentMonth');
    
    if (!calendarGrid || !monthTitle) return;
    
    // Clear grid
    calendarGrid.innerHTML = '';
    
    // Set month and year title
    const options = { month: 'long', year: 'numeric' };
    monthTitle.textContent = this.currentDate.toLocaleDateString('en-US', options);
    
    // Get days in month
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    
    // Get first day of month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Calculate days from previous month to display
    const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Calculate days from next month to display
    const lastDayOfWeek = lastDay.getDay();
    const daysFromNextMonth = 6 - lastDayOfWeek;
    
    // Generate days from previous month
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = 0; i < firstDayOfWeek; i++) {
      const dayNumber = prevMonthLastDay - firstDayOfWeek + i + 1;
      const dayDate = new Date(year, month - 1, dayNumber);
      const dayElement = this.createDayElement(dayDate, true);
      calendarGrid.appendChild(dayElement);
    }
    
    // Generate days for current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dayDate = new Date(year, month, day);
      const dayElement = this.createDayElement(dayDate, false);
      calendarGrid.appendChild(dayElement);
    }
    
    // Generate days from next month
    for (let i = 1; i <= daysFromNextMonth; i++) {
      const dayDate = new Date(year, month + 1, i);
      const dayElement = this.createDayElement(dayDate, true);
      calendarGrid.appendChild(dayElement);
    }
  },
  
  // Create a day element for the calendar
  createDayElement(date, isInactive) {
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';
    if (isInactive) dayElement.classList.add('inactive');
    
    // Format date string for lookup (YYYY-MM-DD)
    const dateStr = date.toISOString().split('T')[0];
    
    // Check if date is booked or blocked
    if (this.bookedDates[dateStr]) {
      dayElement.classList.add('booked');
    } else if (this.blockedDates[dateStr]) {
      dayElement.classList.add('blocked');
    } else {
      dayElement.classList.add('available');
    }
    
    // Add day number
    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = date.getDate();
    dayElement.appendChild(dayNumber);
    
    // Add day content (bookings or blocked reason)
    const dayContent = document.createElement('div');
    dayContent.className = 'day-content';
    
    if (this.bookedDates[dateStr]) {
      const bookingInfo = this.bookedDates[dateStr];
      const clientIndicator = document.createElement('div');
      clientIndicator.className = 'event-indicator';
      clientIndicator.textContent = bookingInfo.clientName || 'Booked';
      dayContent.appendChild(clientIndicator);
    } else if (this.blockedDates[dateStr]) {
      const reasonIndicator = document.createElement('div');
      reasonIndicator.className = 'event-indicator';
      reasonIndicator.textContent = this.blockedDates[dateStr] || 'Unavailable';
      dayContent.appendChild(reasonIndicator);
    }
    
    dayElement.appendChild(dayContent);
    
    // Add click handler for day selection
    if (!isInactive) {
      dayElement.addEventListener('click', () => {
        this.handleDayClick(date, dayElement);
      });
    }
    
    return dayElement;
  },
  
  // Handle day click (for date selection or details)
  handleDayClick(date, element) {
    const dateStr = date.toISOString().split('T')[0];
    
    // If day is booked, show booking details
    if (this.bookedDates[dateStr]) {
      this.showBookingDetails(dateStr);
    } 
    // If day is blocked, show block details or allow unblocking
    else if (this.blockedDates[dateStr]) {
      this.showBlockDetails(dateStr);
    } 
    // If day is available, allow blocking
    else {
      this.promptBlockDate(dateStr);
    }
  },
  
  // Show booking details modal
  showBookingDetails(dateStr) {
    const booking = this.bookedDates[dateStr];
    if (!booking) return;
    
    // Find the full date range for this booking
    const bookingRange = this.findBookingDateRange(dateStr, booking);
    
    // Create modal if it doesn't exist yet
    if (!this.bookingDetailsModal) {
      this.createBookingDetailsModal();
    }
    
    const modal = this.bookingDetailsModal;
    const modalContent = modal.querySelector('.modal-content');
    
    // Format dates
    const startDate = new Date(bookingRange.startDate);
    const endDate = new Date(bookingRange.endDate);
    const formatOptions = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    const startDateFormatted = startDate.toLocaleDateString('en-US', formatOptions);
    const endDateFormatted = endDate.toLocaleDateString('en-US', formatOptions);
    const singleDayBooking = startDateFormatted === endDateFormatted;
    
    // Update modal title and content
    modalContent.querySelector('.modal-title').textContent = `Booking Details: ${booking.clientName || 'Unnamed Client'}`;
    
    const detailsContent = modalContent.querySelector('.booking-details-content');
    detailsContent.innerHTML = `
      <div class="booking-detail-row">
        <div class="booking-detail-label">Client:</div>
        <div class="booking-detail-value">${booking.clientName || 'Unnamed Client'}</div>
      </div>
      <div class="booking-detail-row">
        <div class="booking-detail-label">Project:</div>
        <div class="booking-detail-value">${booking.projectName || 'Unnamed Project'}</div>
      </div>
      ${booking.projectLocation ? `
      <div class="booking-detail-row">
        <div class="booking-detail-label">Location:</div>
        <div class="booking-detail-value">${booking.projectLocation}</div>
      </div>
      ` : ''}
      <div class="booking-detail-row">
        <div class="booking-detail-label">Date${singleDayBooking ? '' : 's'}:</div>
        <div class="booking-detail-value">
          ${singleDayBooking ? startDateFormatted : `${startDateFormatted} to ${endDateFormatted}`}
        </div>
      </div>
      <div class="booking-detail-row">
        <div class="booking-detail-label">Status:</div>
        <div class="booking-detail-value">
          <span class="badge ${booking.depositPaid ? 'badge-success' : 'badge-primary'}">
            ${booking.depositPaid ? 'Deposit Paid' : 'Confirmed'}
          </span>
        </div>
      </div>
      ${booking.notes ? `
      <div class="booking-detail-row">
        <div class="booking-detail-label">Notes:</div>
        <div class="booking-detail-value">${booking.notes}</div>
      </div>
      ` : ''}
    `;
    
    // Store booking data in modal for reference in cancel function
    modal.dataset.startDate = bookingRange.startDate;
    modal.dataset.endDate = bookingRange.endDate;
    
    // Show the cancel button (always show for now, but could be conditional)
    const cancelBtn = modalContent.querySelector('#cancelBookingBtn');
    cancelBtn.style.display = 'inline-block';
    
    // Show the modal
    modal.style.display = 'flex';
  },
  
  // Create booking details modal
  createBookingDetailsModal() {
    // Create modal element
    const modal = document.createElement('div');
    modal.className = 'booking-details-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.7);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    `;
    
    // Create modal content
    const content = document.createElement('div');
    content.className = 'modal-content';
    content.style.cssText = `
      background-color: var(--card-bg);
      border-radius: var(--border-radius);
      box-shadow: var(--shadow-lg);
      width: 100%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
      padding: 2rem;
      position: relative;
    `;
    
    // Add close button
    const closeBtn = document.createElement('div');
    closeBtn.className = 'modal-close';
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.style.cssText = `
      position: absolute;
      top: 1rem;
      right: 1rem;
      cursor: pointer;
      font-size: 1.25rem;
      color: var(--gray-500);
    `;
    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });
    
    // Add content structure
    content.innerHTML += `
      <h3 class="modal-title" style="margin-bottom: 1.5rem;">Booking Details</h3>
      
      <div class="booking-details-content" style="margin-bottom: 2rem;">
        <!-- Booking details will be inserted here -->
      </div>
      
      <div class="modal-actions" style="display: flex; justify-content: space-between;">
        <button id="closeBookingDetailsBtn" class="btn btn-outline">
          <i class="fas fa-times"></i> Close
        </button>
        <button id="cancelBookingBtn" class="btn btn-danger">
          <i class="fas fa-ban"></i> Cancel Booking
        </button>
      </div>
    `;
    
    // Add everything to DOM
    content.appendChild(closeBtn);
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Add event listeners
    content.querySelector('#closeBookingDetailsBtn').addEventListener('click', () => {
      modal.style.display = 'none';
    });
    
    content.querySelector('#cancelBookingBtn').addEventListener('click', () => {
      this.confirmCancelBooking(modal.dataset.startDate, modal.dataset.endDate);
      modal.style.display = 'none';
    });
    
    // Store modal reference
    this.bookingDetailsModal = modal;
  },
  
  // Find the full date range for a booking
  findBookingDateRange(dateStr, booking) {
    // If booking has start/end dates stored, use those
    if (booking.projectStartDate && booking.projectEndDate) {
      return {
        startDate: booking.projectStartDate,
        endDate: booking.projectEndDate
      };
    }
    
    // Otherwise, search all booked dates to find the range with the same client+project
    const clientId = booking.clientName + '|' + booking.projectName;
    let startDate = dateStr;
    let endDate = dateStr;
    
    // Search for the earliest date with this booking
    Object.keys(this.bookedDates).forEach(date => {
      const currentBooking = this.bookedDates[date];
      const currentId = currentBooking.clientName + '|' + currentBooking.projectName;
      
      if (currentId === clientId) {
        if (date < startDate) startDate = date;
        if (date > endDate) endDate = date;
      }
    });
    
    return { startDate, endDate };
  },
  
  // Confirm booking cancellation
  confirmCancelBooking(startDate, endDate) {
    // Format dates for user
    const start = new Date(startDate);
    const end = new Date(endDate);
    const formatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
    const startFormatted = start.toLocaleDateString('en-US', formatOptions);
    const endFormatted = end.toLocaleDateString('en-US', formatOptions);
    const dateRange = startFormatted === endFormatted ? 
                      startFormatted : 
                      `${startFormatted} to ${endFormatted}`;
    
    // Confirm with user
    if (confirm(`Are you sure you want to cancel the booking for ${dateRange}?\n\nThis action cannot be undone.`)) {
      this.cancelBooking(startDate, endDate);
    }
  },
  
  // Cancel a booking
  async cancelBooking(startDate, endDate) {
    // Keep track of what we're about to cancel for display purposes
    const firstDateStr = startDate;
    const clientName = this.bookedDates[firstDateStr] ? 
                      (this.bookedDates[firstDateStr].clientName || 'Unnamed Client') : 
                      'Unknown Client';
    const projectName = this.bookedDates[firstDateStr] ? 
                       (this.bookedDates[firstDateStr].projectName || 'Unnamed Project') : 
                       'Unknown Project';
    
    // Remove booking from each day in the range
    let currentDate = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    let datesRemoved = 0;
    
    while (currentDate <= endDateObj) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      if (this.bookedDates[dateStr]) {
        delete this.bookedDates[dateStr];
        datesRemoved++;
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Also check for any travel days attached to this booking
    // This assumes travel days have same client/project info
    
    // Check for travel days before the start date
    currentDate = new Date(startDate);
    currentDate.setDate(currentDate.getDate() - 7); // Check up to a week before
    while (currentDate < new Date(startDate)) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      if (this.bookedDates[dateStr] && 
          this.bookedDates[dateStr].isTravel && 
          this.bookedDates[dateStr].clientName === clientName &&
          this.bookedDates[dateStr].projectName === projectName) {
        delete this.bookedDates[dateStr];
        datesRemoved++;
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Check for travel days after the end date
    currentDate = new Date(endDate);
    currentDate.setDate(currentDate.getDate() + 1);
    const maxTravelDate = new Date(endDate);
    maxTravelDate.setDate(maxTravelDate.getDate() + 7); // Check up to a week after
    
    while (currentDate <= maxTravelDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      if (this.bookedDates[dateStr] && 
          this.bookedDates[dateStr].isTravel && 
          this.bookedDates[dateStr].clientName === clientName && 
          this.bookedDates[dateStr].projectName === projectName) {
        delete this.bookedDates[dateStr];
        datesRemoved++;
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Save updated availability
    await this.saveAvailability();
    
    // Refresh calendar display
    this.renderCalendar();
    this.renderUpcomingBookings();
    
    // Show success message
    this.showCancellationSuccess(clientName, projectName, datesRemoved);
  },
  
  // Show cancellation success message
  showCancellationSuccess(clientName, projectName, datesRemoved) {
    // Create alert element
    const alert = document.createElement('div');
    alert.className = 'alert alert-success cancellation-alert';
    alert.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      max-width: 400px;
      z-index: 1000;
      animation: slideIn 0.3s ease-out;
    `;
    
    alert.innerHTML = `
      <i class="fas fa-check-circle"></i>
      <div>
        <strong>Booking Cancelled</strong>
        <p>Successfully cancelled booking for ${clientName} - ${projectName}.</p>
        <p>${datesRemoved} date${datesRemoved !== 1 ? 's' : ''} removed from calendar.</p>
      </div>
    `;
    
    // Add animation keyframes
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
      .cancellation-alert {
        box-shadow: var(--shadow-lg);
      }
    `;
    document.head.appendChild(style);
    
    // Add to document
    document.body.appendChild(alert);
    
    // Remove after delay
    setTimeout(() => {
      alert.style.animation = 'fadeOut 0.5s ease-out';
      setTimeout(() => alert.remove(), 500);
    }, 5000);
  },
  
  // Show block details modal
  showBlockDetails(dateStr) {
    const reason = this.blockedDates[dateStr];
    
    if (confirm(`
Date Blocked: ${dateStr}
Reason: ${reason || 'Personal unavailability'}

Would you like to unblock this date?
    `)) {
      delete this.blockedDates[dateStr];
      this.saveAvailability();
      this.renderCalendar();
    }
  },
  
  // Prompt to block date
  promptBlockDate(dateStr) {
    const reason = prompt(`Block date ${dateStr}?\n\nEnter reason (optional):`, '');
    
    if (reason !== null) { // Not cancelled
      this.blockedDates[dateStr] = reason;
      this.saveAvailability();
      this.renderCalendar();
    }
  },
  
  // Show block date modal
  showBlockDateModal() {
    // Create modal if it doesn't exist
    if (!this.modal) {
      this.createBlockDateModal();
    }
    
    this.modal.style.display = 'flex';
  },
  
  // Create block date modal
  createBlockDateModal() {
    this.modal = document.createElement('div');
    this.modal.className = 'block-date-modal';
    this.modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.7);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 1rem;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background-color: var(--card-bg);
      border-radius: var(--border-radius);
      box-shadow: var(--shadow-lg);
      width: 100%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
      padding: 2rem;
      position: relative;
    `;
    
    // Add close button
    const closeBtn = document.createElement('div');
    closeBtn.innerHTML = '<i class="fas fa-times"></i>';
    closeBtn.style.cssText = `
      position: absolute;
      top: 1rem;
      right: 1rem;
      cursor: pointer;
      font-size: 1.25rem;
      color: var(--gray-500);
    `;
    closeBtn.addEventListener('click', () => {
      this.modal.style.display = 'none';
    });
    
    // Modal content
    content.innerHTML = `
      <h3 style="margin-bottom: 1.5rem;">Block Dates</h3>
      
      <div class="form-group">
        <label for="blockDateRange">Select Date Range</label>
        <div class="row">
          <div class="col">
            <input type="date" id="blockStartDate" class="form-control">
          </div>
          <div class="col">
            <input type="date" id="blockEndDate" class="form-control">
          </div>
        </div>
      </div>
      
      <div class="form-group">
        <label for="blockReason">Reason (optional)</label>
        <input type="text" id="blockReason" placeholder="e.g. Vacation, Personal, etc.">
      </div>
      
      <div style="display: flex; justify-content: center; margin-top: 1.5rem;">
        <button id="confirmBlockBtn" class="btn btn-primary">
          <i class="fas fa-ban"></i> Block Dates
        </button>
      </div>
    `;
    
    // Add everything to the DOM
    content.appendChild(closeBtn);
    this.modal.appendChild(content);
    document.body.appendChild(this.modal);
    
    // Add event listeners
    const blockStartDate = content.querySelector('#blockStartDate');
    const blockEndDate = content.querySelector('#blockEndDate');
    const confirmBlockBtn = content.querySelector('#confirmBlockBtn');
    
    // Set min date to today
    const today = new Date().toISOString().split('T')[0];
    blockStartDate.min = today;
    blockEndDate.min = today;
    
    // Set initial values to current month
    blockStartDate.valueAsDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), this.currentDate.getDate());
    blockEndDate.valueAsDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), this.currentDate.getDate());
    
    // Handle start date change
    blockStartDate.addEventListener('change', () => {
      blockEndDate.min = blockStartDate.value;
      if (blockEndDate.value && blockEndDate.value < blockStartDate.value) {
        blockEndDate.value = blockStartDate.value;
      }
    });
    
    // Handle confirm button click
    confirmBlockBtn.addEventListener('click', () => {
      if (!blockStartDate.value || !blockEndDate.value) {
        alert('Please select a date range');
        return;
      }
      
      const startDate = new Date(blockStartDate.value);
      const endDate = new Date(blockEndDate.value);
      const reason = content.querySelector('#blockReason').value;
      
      this.blockDateRange(startDate, endDate, reason);
      this.modal.style.display = 'none';
    });
  },
  
  // Block a range of dates
  async blockDateRange(startDate, endDate, reason = '') {
    // Clone date to avoid modifying the original
    let currentDate = new Date(startDate);
    
    // Block each day in the range
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      this.blockedDates[dateStr] = reason;
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    await this.saveAvailability();
    this.renderCalendar();
    
    alert(`Dates blocked successfully from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);
  },
  
  // Render upcoming bookings
  renderUpcomingBookings() {
    const upcomingBookingsList = document.getElementById('upcomingBookings');
    if (!upcomingBookingsList) return;
    
    // Clear list
    upcomingBookingsList.innerHTML = '';
    
    // Get all unique bookings (by client+project combo)
    const bookings = {};
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Group bookings and sort by date
    Object.keys(this.bookedDates).forEach(dateStr => {
      const bookingDate = new Date(dateStr);
      
      // Only include future bookings
      if (bookingDate >= today) {
        const booking = this.bookedDates[dateStr];
        const bookingId = `${booking.clientName}|${booking.projectName}|${booking.projectStartDate}`;
        
        if (!bookings[bookingId]) {
          bookings[bookingId] = {
            clientName: booking.clientName || 'Unnamed Client',
            projectName: booking.projectName || 'Unnamed Project',
            projectLocation: booking.projectLocation || '',
            startDate: booking.projectStartDate ? new Date(booking.projectStartDate) : bookingDate,
            endDate: booking.projectEndDate ? new Date(booking.projectEndDate) : bookingDate,
            depositPaid: booking.depositPaid || false
          };
        }
      }
    });
    
    // Convert to array and sort by start date
    const sortedBookings = Object.values(bookings).sort((a, b) => a.startDate - b.startDate);
    
    // If no upcoming bookings
    if (sortedBookings.length === 0) {
      upcomingBookingsList.innerHTML = `
        <div style="text-align: center; padding: 1.5rem; color: var(--gray-500); font-style: italic;">
          No upcoming bookings.
        </div>
      `;
      return;
    }
    
    // Add bookings to list
    sortedBookings.forEach(booking => {
      const bookingItem = document.createElement('div');
      bookingItem.className = 'booking-item';
      
      // Format dates
      const options = { month: 'short', day: 'numeric' };
      const startDateStr = booking.startDate.toLocaleDateString('en-US', options);
      const endDateStr = booking.endDate.toLocaleDateString('en-US', options);
      const dateRange = startDateStr === endDateStr ? startDateStr : `${startDateStr} - ${endDateStr}`;
      
      bookingItem.innerHTML = `
        <div>
          <div class="booking-dates">${dateRange}</div>
          <div class="booking-client">${booking.clientName} • ${booking.projectName}</div>
          ${booking.projectLocation ? `<div class="booking-client">${booking.projectLocation}</div>` : ''}
        </div>
        <div class="booking-status">
          <span class="badge ${booking.depositPaid ? 'badge-success' : 'badge-primary'}">
            ${booking.depositPaid ? 'Deposit Paid' : 'Confirmed'}
          </span>
        </div>
      `;
      
      // Add click handler to view booking details
      bookingItem.addEventListener('click', () => {
        // Find any date in this booking range to show details
        const dateToShow = booking.startDate.toISOString().split('T')[0];
        this.showBookingDetails(dateToShow);
      });
      
      upcomingBookingsList.appendChild(bookingItem);
    });
  },
  
  // Export calendar data to CSV or iCal
  exportCalendar() {
    // Implement export functionality
    // For now, just show an alert
    alert('Calendar export will be added in a future update.');
  },
  
  // Book a date range for a client
  async bookDateRange(startDate, endDate, clientData) {
    // Clone date to avoid modifying the original
    let currentDate = new Date(startDate);
    
    // Book each day in the range
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      this.bookedDates[dateStr] = {
        ...clientData,
        projectStartDate: startDate.toISOString().split('T')[0],
        projectEndDate: endDate.toISOString().split('T')[0]
      };
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    await this.saveAvailability();
    
    // Add travel days if needed
    if (clientData.travelDays && clientData.travelDays > 0) {
      // Add travel days before start date
      let beforeTravel = new Date(startDate);
      beforeTravel.setDate(beforeTravel.getDate() - clientData.travelDays);
      
      for (let i = 0; i < clientData.travelDays; i++) {
        const travelDateStr = beforeTravel.toISOString().split('T')[0];
        this.bookedDates[travelDateStr] = {
          ...clientData,
          isTravel: true,
          travelLabel: 'Travel Day',
          projectStartDate: startDate.toISOString().split('T')[0],
          projectEndDate: endDate.toISOString().split('T')[0]
        };
        beforeTravel.setDate(beforeTravel.getDate() + 1);
      }
      
      // Add travel days after end date
      let afterTravel = new Date(endDate);
      afterTravel.setDate(afterTravel.getDate() + 1);
      
      for (let i = 0; i < clientData.travelDays; i++) {
        const travelDateStr = afterTravel.toISOString().split('T')[0];
        this.bookedDates[travelDateStr] = {
          ...clientData,
          isTravel: true,
          travelLabel: 'Travel Day',
          projectStartDate: startDate.toISOString().split('T')[0],
          projectEndDate: endDate.toISOString().split('T')[0]
        };
        afterTravel.setDate(afterTravel.getDate() + 1);
      }
      
      await this.saveAvailability();
    }
  }
};
