/**
 * Calendar Module
 * Handles availability calendar and date management
 * Now with GitHub integration
 */

const Calendar = {
  currentDate: new Date(),
  selectedDates: [],
  blockedDates: {},
  bookedDates: {},
  modal: null,
  useGitHub: false,
  
  // Initialize calendar module
  async init() {
    // Check if GitHub service is available and initialized
    if (typeof GitHubService !== 'undefined' && GitHubService.isInitialized()) {
      this.useGitHub = true;
      console.log('Calendar module initialized with GitHub storage');
    } else {
      console.warn('GitHub service not initialized, using localStorage for calendar data');
    }
    
    await this.loadAvailability();
    this.createCalendarTab();
    this.setupEventListeners();
    this.renderCalendar();
    this.renderUpcomingBookings();
    
    // Add validation for date selection in the quote form
    this.setupDateValidation();
  },
  
  // Load availability data from repository
  async loadAvailability() {
    if (this.useGitHub) {
      try {
        // Get availability data from GitHub
        const availabilityData = await GitHubService.getFileContent('data/calendar/availability.json');
        
        if (availabilityData) {
          this.blockedDates = availabilityData.blockedDates || {};
          this.bookedDates = availabilityData.bookedDates || {};
          
          // Update app state
          AppState.availability = {
            blockedDates: this.blockedDates,
            bookedDates: this.bookedDates
          };
          
          console.log('Availability data loaded from GitHub');
        } else {
          console.log('No availability data found in GitHub repository, initializing empty');
          this.blockedDates = {};
          this.bookedDates = {};
        }
      } catch (error) {
        console.error('Error loading availability data from GitHub:', error);
        // Fallback to localStorage
        this.loadAvailabilityFromLocalStorage();
      }
    } else {
      // Load from localStorage
      this.loadAvailabilityFromLocalStorage();
    }
  },
  
  // Load availability data from localStorage (fallback)
  loadAvailabilityFromLocalStorage() {
    try {
      const savedBlockedDates = localStorage.getItem('blockedDates');
      const savedBookedDates = localStorage.getItem('bookedDates');
      
      if (savedBlockedDates) {
        this.blockedDates = JSON.parse(savedBlockedDates);
      }
      
      if (savedBookedDates) {
        this.bookedDates = JSON.parse(savedBookedDates);
      }
      
      // Update app state
      AppState.availability = {
        blockedDates: this.blockedDates,
        bookedDates: this.bookedDates
      };
      
      console.log('Availability data loaded from localStorage');
    } catch (error) {
      console.error('Error loading availability data from localStorage:', error);
      this.blockedDates = {};
      this.bookedDates = {};
    }
  },
  
  // Save availability data to repository
  async saveAvailability() {
    if (this.useGitHub) {
      try {
        // Prepare data object
        const availabilityData = {
          blockedDates: this.blockedDates,
          bookedDates: this.bookedDates,
          lastUpdated: new Date().toISOString()
        };
        
        // Save to GitHub
        const result = await GitHubService.saveFile(
          'data/calendar/availability.json',
          availabilityData,
          'Update calendar availability data'
        );
        
        if (result) {
          console.log('Availability data saved to GitHub');
        } else {
          console.error('Failed to save availability data to GitHub');
          // Fallback to localStorage
          this.saveAvailabilityToLocalStorage();
        }
      } catch (error) {
        console.error('Error saving availability data to GitHub:', error);
        // Fallback to localStorage
        this.saveAvailabilityToLocalStorage();
      }
    } else {
      // Save to localStorage
      this.saveAvailabilityToLocalStorage();
    }
    
    // Update app state regardless of storage method
    AppState.availability = {
      blockedDates: this.blockedDates,
      bookedDates: this.bookedDates
    };
  },
  
  // Save availability data to localStorage (fallback)
  saveAvailabilityToLocalStorage() {
    try {
      localStorage.setItem('blockedDates', JSON.stringify(this.blockedDates));
      localStorage.setItem('bookedDates', JSON.stringify(this.bookedDates));
      console.log('Availability data saved to localStorage');
    } catch (error) {
      console.error('Error saving availability data to localStorage:', error);
    }
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
        
        // Add GitHub sync button if using GitHub
        this.updateCalendarHeader();
        
        // Refresh calendar when tab is shown
        this.renderCalendar();
        this.renderUpcomingBookings();
      });
    });
  },
  
  // Update calendar header with GitHub sync button
  updateCalendarHeader() {
    const calendar = document.getElementById('calendar');
    if (!calendar) return;
    
    // Check if sync elements already exist
    let syncContainer = calendar.querySelector('#calendarGitHubSyncContainer');
    
    if (!syncContainer) {
      syncContainer = document.createElement('div');
      syncContainer.id = 'calendarGitHubSyncContainer';
      syncContainer.style.cssText = `
        margin-bottom: 1rem;
        display: flex;
        justify-content: flex-end;
        align-items: center;
      `;
      
      const calendarControls = calendar.querySelector('.calendar-controls');
      if (calendarControls) {
        calendarControls.after(syncContainer);
      }
    }
    
    // Update sync container content
    if (this.useGitHub) {
      syncContainer.innerHTML = `
        <div style="font-size: 0.875rem; color: var(--gray-600); margin-right: 0.5rem;">
          <i class="fab fa-github"></i> Synced with GitHub
        </div>
        <button id="syncCalendarBtn" class="btn btn-sm btn-outline">
          <i class="fas fa-sync"></i> Sync Now
        </button>
      `;
      
      // Add sync button listener
      document.getElementById('syncCalendarBtn').addEventListener('click', async () => {
        await this.loadAvailability();
        this.renderCalendar();
        this.renderUpcomingBookings();
        alert('Calendar synchronized with GitHub repository');
      });
    } else {
      syncContainer.innerHTML = `
        <div style="font-size: 0.875rem; color: var(--gray-600);">
          <i class="fas fa-database"></i> Using Local Storage
        </div>
      `;
    }
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
    
    alert(`
Booking Details for ${dateStr}

Client: ${booking.clientName || 'Unnamed Client'}
Project: ${booking.projectName || 'Unnamed Project'}
${booking.projectLocation ? 'Location: ' + booking.projectLocation : ''}
${booking.notes ? 'Notes: ' + booking.notes : ''}
${this.useGitHub ? 'Stored on GitHub: ' + GitHubService.owner + '/' + GitHubService.repo : ''}
    `);
  },
  
  // Show block details modal
  async showBlockDetails(dateStr) {
    const reason = this.blockedDates[dateStr];
    
    if (confirm(`
Date Blocked: ${dateStr}
Reason: ${reason || 'Personal unavailability'}
${this.useGitHub ? 'Stored on GitHub: ' + GitHubService.owner + '/' + GitHubService.repo : ''}

Would you like to unblock this date?
    `)) {
      delete this.blockedDates[dateStr];
      await this.saveAvailability();
      this.renderCalendar();
    }
  },
  
  // Prompt to block date
  async promptBlockDate(dateStr) {
    const reason = prompt(`Block date ${dateStr}?\n\nEnter reason (optional):`, '');
    
    if (reason !== null) { // Not cancelled
      this.blockedDates[dateStr] = reason;
      await this.saveAvailability();
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
    confirmBlockBtn.addEventListener('click', async () => {
      if (!blockStartDate.value || !blockEndDate.value) {
        alert('Please select a date range');
        return;
      }
      
      const startDate = new Date(blockStartDate.value);
      const endDate = new Date(blockEndDate.value);
      const reason = content.querySelector('#blockReason').value;
      
      await this.blockDateRange(startDate, endDate, reason);
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
      
      upcomingBookingsList.appendChild(bookingItem);
    });
  },
  
  // Export calendar data
  async exportCalendar() {
    // Ask which format to export
    const format = confirm('Export calendar data?\n\nClick OK to export as JSON, or Cancel to export as iCal format.');
    
    if (format) {
      // Export as JSON
      this.exportCalendarAsJSON();
    } else {
      // Export as iCal
      this.exportCalendarAsICal();
    }
  },
  
  // Export calendar data as JSON
  exportCalendarAsJSON() {
    const data = {
      blockedDates: this.blockedDates,
      bookedDates: this.bookedDates,
      exportedAt: new Date().toISOString()
    };
    
    // Convert to JSON string
    const jsonString = JSON.stringify(data, null, 2);
    
    // Create download link
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `calendar-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 0);
  },
  
  // Export calendar as iCal format
  exportCalendarAsICal() {
    // Create iCal content
    let icalContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//EmmettCalendar//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
X-WR-CALNAME:Emmett's Production Calendar
X-WR-TIMEZONE:UTC
BEGIN:VTIMEZONE
TZID:UTC
END:VTIMEZONE
`;
    
    // Add blocked dates
    Object.keys(this.blockedDates).forEach(dateStr => {
      const date = new Date(dateStr);
      const reason = this.blockedDates[dateStr] || 'Unavailable';
      const uid = 'blocked-' + dateStr;
      
      // Format date for iCal (YYYYMMDD)
      const icalDate = dateStr.replace(/-/g, '');
      
      icalContent += `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${new Date().toISOString().replace(/[-:.]/g, '').split('T')[0]}T000000Z
DTSTART;VALUE=DATE:${icalDate}
DTEND;VALUE=DATE:${icalDate}
SUMMARY:BLOCKED - ${reason}
DESCRIPTION:${reason}
STATUS:CONFIRMED
TRANSP:OPAQUE
END:VEVENT
`;
    });
    
    // Add booked dates
    Object.keys(this.bookedDates).forEach(dateStr => {
      const booking = this.bookedDates[dateStr];
      const uid = 'booked-' + dateStr;
      
      // Format date for iCal (YYYYMMDD)
      const icalDate = dateStr.replace(/-/g, '');
      
      // Create summary and description
      const summary = `${booking.clientName || 'Unnamed Client'} - ${booking.projectName || 'Unnamed Project'}`;
      let description = `Client: ${booking.clientName || 'Unnamed Client'}\nProject: ${booking.projectName || 'Unnamed Project'}`;
      if (booking.projectLocation) description += `\nLocation: ${booking.projectLocation}`;
      if (booking.notes) description += `\nNotes: ${booking.notes}`;
      
      icalContent += `BEGIN:VEVENT
UID:${uid}
DTSTAMP:${new Date().toISOString().replace(/[-:.]/g, '').split('T')[0]}T000000Z
DTSTART;VALUE=DATE:${icalDate}
DTEND;VALUE=DATE:${icalDate}
SUMMARY:${summary}
DESCRIPTION:${description.replace(/\n/g, '\\n')}
STATUS:${booking.depositPaid ? 'CONFIRMED' : 'TENTATIVE'}
TRANSP:OPAQUE
END:VEVENT
`;
    });
    
    // Close calendar
    icalContent += 'END:VCALENDAR';
    
    // Create download link
    const blob = new Blob([icalContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `emmett-production-calendar-${new Date().toISOString().split('T')[0]}.ics`;
    document.body.appendChild(a);
    a.click();
    
    // Clean up
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 0);
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
