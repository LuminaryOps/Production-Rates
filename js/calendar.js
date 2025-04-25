/**
 * Enhanced Calendar Module
 * Handles modern calendar functionality with time-based scheduling, multiple events per day,
 * and advanced availability management
 */

const Calendar = {
  currentDate: new Date(),
  selectedDates: [],
  selectedEvent: null,
  events: {},
  blockedDates: {},
  bookedDates: {},
  modal: null,
  eventModal: null,
  bookingDetailsModal: null,
  viewMode: 'month', // 'month', 'week', or 'day'
  
  // Initialize calendar module
  init() {
    this.loadAvailability();
    this.createCalendarTab();
    this.setupEventListeners();
    this.renderCalendar();
    this.renderUpcomingBookings();
    
    // Add validation for date selection in the quote form
    this.setupDateValidation();
    
    // Drag and drop functionality removed
  },
  
  // Initialize drag and drop functionality - disabled
  initDragAndDrop() {
    // Functionality disabled
    console.log('Drag and drop functionality disabled');
  },
  
  // Set up drag and drop interactions - disabled
  setupDragAndDrop() {
    // Functionality disabled
  },
  
  // Handle drag start event - disabled
  handleDragStart() {
    // Functionality disabled
  },
  
  // Handle drag move event - disabled
  handleDragMove() {
    // Functionality disabled
  },
  
  // Handle drag end event - disabled
  handleDragEnd() {
    // Functionality disabled
  },
  
  // Handle drag enter event - disabled
  handleDragEnter() {
    // Functionality disabled
  },
  
  // Handle drag leave event - disabled
  handleDragLeave() {
    // Functionality disabled
  },
  
  // Handle drop event - disabled
  handleDrop() {
    // Functionality disabled
  },
  
  // Move an event from one date to another - disabled
  moveEvent() {
    // Functionality disabled
  },
  
  // Update all travel days for a booking - disabled
  updateAllTravelDays() {
    // Functionality disabled
  },
  
  // Update a booking and its travel days - disabled
  updateBookingWithTravel() {
    // Functionality disabled
  },
  
  // Show confirmation after moving an event
  showMoveConfirmation(eventTitle, fromDate, toDate) {
    // Format dates
    const fromDateObj = new Date(fromDate);
    const toDateObj = new Date(toDate);
    const dateOptions = { month: 'short', day: 'numeric' };
    
    const fromFormatted = fromDateObj.toLocaleDateString('en-US', dateOptions);
    const toFormatted = toDateObj.toLocaleDateString('en-US', dateOptions);
    
    // Create alert element
    const alert = document.createElement('div');
    alert.className = 'alert alert-success';
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
        <strong>Event Moved</strong>
        <p>"${eventTitle}" moved from ${fromFormatted} to ${toFormatted}</p>
      </div>
    `;
    
    // Add to document
    document.body.appendChild(alert);
    
    // Remove after delay
    setTimeout(() => {
      alert.style.opacity = '0';
      alert.style.transition = 'opacity 0.5s';
      setTimeout(() => alert.remove(), 500);
    }, 3000);
  },
  
  // Load availability data from Firebase
  async loadAvailability() {
    try {
      // Try to load from Firebase if available
      if (AppState.usingFirebase) {
        const availability = await FirebaseStorage.loadCalendarData();
        if (availability) {
          this.blockedDates = availability.blockedDates || {};
          this.bookedDates = availability.bookedDates || {};
          this.events = availability.events || {};
          
          // Update app state
          AppState.availability = {
            blockedDates: this.blockedDates,
            bookedDates: this.bookedDates,
            events: this.events
          };
          
          console.log('Availability data loaded from Firebase');
          return;
        }
      }
      
      // Fallback to localStorage
      const storedCalendar = localStorage.getItem('calendar');
      if (storedCalendar) {
        const parsed = JSON.parse(storedCalendar);
        this.blockedDates = parsed.blockedDates || {};
        this.bookedDates = parsed.bookedDates || {};
        this.events = parsed.events || {};
        
        // Update app state
        AppState.availability = {
          blockedDates: this.blockedDates,
          bookedDates: this.bookedDates,
          events: this.events
        };
        
        console.log('Availability data loaded from localStorage');
        return;
      }
      
      // Initialize with empty data if nothing found
      this.blockedDates = {};
      this.bookedDates = {};
      this.events = {};
      
      // Update app state
      AppState.availability = {
        blockedDates: this.blockedDates,
        bookedDates: this.bookedDates,
        events: this.events
      };
      
      console.log('No availability data found, initialized with empty data');
    } catch (error) {
      console.error('Error loading availability data:', error);
      
      // Initialize with empty data
      this.blockedDates = {};
      this.bookedDates = {};
      this.events = {};
    }
  },
  
  // Save availability data to Firebase
  async saveAvailability() {
    try {
      // Save to Firebase if available
      if (AppState.usingFirebase) {
        const availability = {
          blockedDates: this.blockedDates,
          bookedDates: this.bookedDates,
          events: this.events
        };
        
        await FirebaseStorage.saveCalendarData(availability);
        console.log('Availability data saved to Firebase');
      } else {
        // Fallback to localStorage
        const availability = {
          blockedDates: this.blockedDates,
          bookedDates: this.bookedDates,
          events: this.events
        };
        
        localStorage.setItem('calendar', JSON.stringify(availability));
        console.log('Availability data saved to localStorage');
      }
      
      // Update app state
      AppState.availability = {
        blockedDates: this.blockedDates,
        bookedDates: this.bookedDates,
        events: this.events
      };
      
      console.log('Availability data updated in app state');
    } catch (error) {
      console.error('Error saving availability data:', error);
      
      // Fallback to localStorage
      try {
        const availability = {
          blockedDates: this.blockedDates,
          bookedDates: this.bookedDates,
          events: this.events
        };
        
        localStorage.setItem('calendar', JSON.stringify(availability));
        console.log('Availability data saved to localStorage (fallback)');
      } catch (localError) {
        console.error('Error saving to localStorage:', localError);
      }
    }
  },
  
  // Update availability from external source
  updateAvailability(availability) {
    if (!availability) return;
    
    this.blockedDates = availability.blockedDates || {};
    this.bookedDates = availability.bookedDates || {};
    this.events = availability.events || {};
    
    // Update app state
    AppState.availability = {
      blockedDates: this.blockedDates,
      bookedDates: this.bookedDates,
      events: this.events
    };
    
    // Refresh display
    this.renderCalendar();
    this.renderUpcomingBookings();
    
    console.log('Calendar availability updated from external source');
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
        
        // Refresh calendar when tab is shown
        this.renderCalendar();
        this.renderUpcomingBookings();
        
        // Update UI to match current view mode
        document.querySelectorAll('.view-mode-btn').forEach(btn => {
          if (btn.dataset.mode === this.viewMode) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        });
      });
    });
  },
  
  // Set up event listeners
  setupEventListeners() {
    // Calendar navigation
    document.getElementById('prevMonth').addEventListener('click', () => {
      if (this.viewMode === 'month') {
        this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      } else if (this.viewMode === 'week') {
        this.currentDate.setDate(this.currentDate.getDate() - 7);
      } else if (this.viewMode === 'day') {
        this.currentDate.setDate(this.currentDate.getDate() - 1);
      }
      this.renderCalendar();
    });
    
    document.getElementById('nextMonth').addEventListener('click', () => {
      if (this.viewMode === 'month') {
        this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      } else if (this.viewMode === 'week') {
        this.currentDate.setDate(this.currentDate.getDate() + 7);
      } else if (this.viewMode === 'day') {
        this.currentDate.setDate(this.currentDate.getDate() + 1);
      }
      this.renderCalendar();
    });
    
    // Create view mode selector buttons
    const viewModeContainer = document.createElement('div');
    viewModeContainer.className = 'view-mode-container';
    viewModeContainer.style.cssText = `
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    `;
    
    const viewModes = [
      { id: 'month', icon: 'calendar-alt', label: 'Month' },
      { id: 'week', icon: 'calendar-week', label: 'Week' },
      { id: 'day', icon: 'calendar-day', label: 'Day' }
    ];
    
    // Determine if we're in dark mode
    const isDarkMode = !document.body.classList.contains('light-mode');
    
    viewModes.forEach(mode => {
      const btn = document.createElement('button');
      btn.className = `view-mode-btn${this.viewMode === mode.id ? ' active' : ''}`;
      btn.dataset.mode = mode.id;
      btn.innerHTML = `<i class="fas fa-${mode.icon}"></i> ${mode.label}`;
      
      // Apply theme-appropriate styling 
      btn.style.cssText = `
        padding: 0.5rem 1rem;
        border: 1px solid var(--gray-300);
        background-color: var(--gray-100);
        color: ${isDarkMode ? 'var(--gray-800)' : 'var(--gray-800)'};
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 0.875rem;
      `;
      
      // Add hover and active states that respect theme
      if (this.viewMode === mode.id) {
        btn.style.backgroundColor = 'var(--primary)';
        btn.style.borderColor = 'var(--primary-dark)';
        btn.style.color = 'white';
      }
      
      btn.addEventListener('mouseenter', () => {
        if (this.viewMode !== mode.id) {
          btn.style.backgroundColor = isDarkMode ? 'var(--gray-200)' : 'var(--gray-200)';
          btn.style.color = isDarkMode ? 'var(--primary)' : 'var(--primary)';
        }
      });
      
      btn.addEventListener('mouseleave', () => {
        if (this.viewMode !== mode.id) {
          btn.style.backgroundColor = 'var(--gray-100)';
          btn.style.color = isDarkMode ? 'var(--gray-800)' : 'var(--gray-800)';
        }
      });
      
      btn.addEventListener('click', () => {
        this.viewMode = mode.id;
        
        // Update all buttons
        document.querySelectorAll('.view-mode-btn').forEach(b => {
          b.classList.remove('active');
          b.style.backgroundColor = 'var(--gray-100)';
          b.style.borderColor = 'var(--gray-300)';
          b.style.color = isDarkMode ? 'var(--gray-800)' : 'var(--gray-800)';
        });
        
        // Style active button
        btn.classList.add('active');
        btn.style.backgroundColor = 'var(--primary)';
        btn.style.borderColor = 'var(--primary-dark)';
        btn.style.color = 'white';
        
        this.renderCalendar();
      });
      
      viewModeContainer.appendChild(btn);
    });
    
    // Add "Today" button
    const todayBtn = document.createElement('button');
    todayBtn.className = 'btn btn-outline btn-sm';
    todayBtn.innerHTML = '<i class="fas fa-calendar-check"></i> Today';
    todayBtn.addEventListener('click', () => {
      this.currentDate = new Date();
      this.renderCalendar();
    });
    
    // Insert view mode container
    const calendarControls = document.querySelector('.calendar-controls');
    calendarControls.querySelector('.row .col:first-child').appendChild(viewModeContainer);
    calendarControls.querySelector('.month-nav').appendChild(todayBtn);
    
    // Action buttons
    document.getElementById('blockDateBtn').addEventListener('click', this.showBlockDateModal.bind(this));
    document.getElementById('exportCalendarBtn').addEventListener('click', this.exportCalendar.bind(this));
    
    // Add new event button - replaces block date button
    const newEventBtn = document.createElement('button');
    newEventBtn.id = 'newEventBtn';
    newEventBtn.className = 'btn btn-primary btn-sm';
    newEventBtn.innerHTML = '<i class="fas fa-plus"></i> New Event';
    newEventBtn.addEventListener('click', () => this.showEventModal());
    
    // Replace blockDateBtn with new event button
    const blockDateBtn = document.getElementById('blockDateBtn');
    blockDateBtn.parentNode.insertBefore(newEventBtn, blockDateBtn);
    
    // Register theme change listener to update button styles
    document.getElementById('darkModeToggle').addEventListener('click', () => {
      // Wait for theme change to complete
      setTimeout(() => this.updateViewModeButtonStyles(), 100);
    });
  },
  
  // Update view mode button styles when theme changes
  updateViewModeButtonStyles() {
    const isDarkMode = !document.body.classList.contains('light-mode');
    const buttons = document.querySelectorAll('.view-mode-btn');
    
    buttons.forEach(btn => {
      const isActive = btn.classList.contains('active');
      
      if (isActive) {
        btn.style.backgroundColor = 'var(--primary)';
        btn.style.borderColor = 'var(--primary-dark)';
        btn.style.color = 'white';
      } else {
        btn.style.backgroundColor = 'var(--gray-100)';
        btn.style.borderColor = 'var(--gray-300)';
        btn.style.color = isDarkMode ? 'var(--gray-800)' : 'var(--gray-800)';
      }
    });
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
  checkDateConflicts(startDate, endDate, excludeEventId = null) {
    // Clone date to avoid modifying the original
    let currentDate = new Date(startDate);
    
    // Check each day in the range
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Check if date is blocked
      if (this.blockedDates[dateStr]) {
        return true;
      }
      
      // Check for event conflicts
      if (this.events[dateStr]) {
        // If full day events exist, check if there are conflicts
        const events = this.events[dateStr].filter(event => 
          !excludeEventId || event.id !== excludeEventId);
          
        if (events.some(event => event.fullDay)) {
          return true;
        }
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return false;
  },
  
  // Check time conflicts for a specific date
  checkTimeConflicts(date, startTime, endTime, excludeEventId = null) {
    const dateStr = date.toISOString().split('T')[0];
    
    // If no events on this date, there's no conflict
    if (!this.events[dateStr]) return false;
    
    // Convert times to minutes for easier comparison
    const start = this.timeToMinutes(startTime);
    const end = this.timeToMinutes(endTime);
    
    // Check each event on this date
    return this.events[dateStr].some(event => {
      // Skip the event we're currently editing
      if (excludeEventId && event.id === excludeEventId) return false;
      
      // Full day events conflict with any time
      if (event.fullDay) return true;
      
      // Convert event times to minutes
      const eventStart = this.timeToMinutes(event.startTime);
      const eventEnd = this.timeToMinutes(event.endTime);
      
      // Check for overlap
      return (start < eventEnd && end > eventStart);
    });
  },
  
  // Convert time string to minutes (e.g., "09:30" -> 570)
  timeToMinutes(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  },
  
  // Format minutes to time string (e.g., 570 -> "09:30")
  minutesToTime(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  },
  
  // Render the calendar view
  renderCalendar() {
    this.clearCalendarContainer();
    
    // Update month/year title based on current view
    this.updateCalendarTitle();
    
    // Render appropriate view
    if (this.viewMode === 'month') {
      this.renderMonthView();
    } else if (this.viewMode === 'week') {
      this.renderWeekView();
    } else if (this.viewMode === 'day') {
      this.renderDayView();
    }
  },
  
  // Clear calendar container
  clearCalendarContainer() {
    const container = document.querySelector('.calendar-container');
    // Preserve the calendar header
    const header = document.querySelector('.calendar-header');
    
    if (container) {
      // Remove everything except the header
      while (container.lastChild) {
        if (container.lastChild !== header) {
          container.removeChild(container.lastChild);
        } else {
          break;
        }
      }
    }
  },
  
  // Update calendar title based on current view
  updateCalendarTitle() {
    const monthTitle = document.getElementById('currentMonth');
    if (!monthTitle) return;
    
    const options = { 
      month: 'long', 
      year: 'numeric'
    };
    
    if (this.viewMode === 'week') {
      // Get first and last day of week
      const firstDay = new Date(this.currentDate);
      const day = this.currentDate.getDay();
      const diff = this.currentDate.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
      firstDay.setDate(diff);
      
      const lastDay = new Date(firstDay);
      lastDay.setDate(firstDay.getDate() + 6);
      
      // Format dates
      const firstFormat = firstDay.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
      const lastFormat = lastDay.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
      
      monthTitle.textContent = `${firstFormat} - ${lastFormat}`;
    } else if (this.viewMode === 'day') {
      options.weekday = 'long';
      options.day = 'numeric';
      monthTitle.textContent = this.currentDate.toLocaleDateString('en-US', options);
    } else {
      // Month view (default)
      monthTitle.textContent = this.currentDate.toLocaleDateString('en-US', options);
    }
  },
  
  // Render month view calendar
  renderMonthView() {
    // Update header days
    const header = document.querySelector('.calendar-header');
    if (header) {
      header.innerHTML = '';
      const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      daysOfWeek.forEach(day => {
        const dayEl = document.createElement('div');
        dayEl.textContent = day;
        header.appendChild(dayEl);
      });
    }
    
    // Create grid
    const calendarGrid = document.createElement('div');
    calendarGrid.id = 'calendarGrid';
    calendarGrid.className = 'calendar-grid';
    
    // Get current year and month
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
      const dayElement = this.createMonthDayElement(dayDate, true);
      calendarGrid.appendChild(dayElement);
    }
    
    // Generate days for current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const dayDate = new Date(year, month, day);
      const dayElement = this.createMonthDayElement(dayDate, false);
      calendarGrid.appendChild(dayElement);
    }
    
    // Generate days from next month
    for (let i = 1; i <= daysFromNextMonth; i++) {
      const dayDate = new Date(year, month + 1, i);
      const dayElement = this.createMonthDayElement(dayDate, true);
      calendarGrid.appendChild(dayElement);
    }
    
    // Add grid to container
    const container = document.querySelector('.calendar-container');
    if (container) {
      container.appendChild(calendarGrid);
    }
  },
  
  // Create a day element for the month view
  createMonthDayElement(date, isInactive) {
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';
    if (isInactive) dayElement.classList.add('inactive');
    
    // Check if date is today
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      dayElement.classList.add('today');
    }
    
    // Format date string for lookup (YYYY-MM-DD)
    const dateStr = date.toISOString().split('T')[0];
    
    // Check if date is blocked
    if (this.blockedDates[dateStr]) {
      dayElement.classList.add('blocked');
    }
    
    // Add day number
    const dayNumber = document.createElement('div');
    dayNumber.className = 'day-number';
    dayNumber.textContent = date.getDate();
    dayElement.appendChild(dayNumber);
    
    // Add day content container for events
    const dayContent = document.createElement('div');
    dayContent.className = 'day-content';
    
    // Add events for this day
    if (this.events[dateStr]) {
      this.events[dateStr].forEach(event => {
        // Create event indicator
        const eventIndicator = document.createElement('div');
        eventIndicator.className = 'event-indicator';
        
        // Set event style based on type
        if (event.type === 'blocked') {
          eventIndicator.classList.add('blocked-event');
        } else if (event.type === 'booked') {
          eventIndicator.classList.add('booked-event');
        } else {
          eventIndicator.classList.add('regular-event');
        }
        
        // Add time information if not full day
        const timeInfo = event.fullDay ? 'All day' : `${event.startTime} - ${event.endTime}`;
        
        eventIndicator.innerHTML = `
          <div class="event-title">${event.title}</div>
          <div class="event-time">${timeInfo}</div>
        `;
        
        // Store event data
        eventIndicator.dataset.eventId = event.id;
        
        // Add event handler
        eventIndicator.addEventListener('click', (e) => {
          e.stopPropagation();
          this.showEventDetails(event);
        });
        
        dayContent.appendChild(eventIndicator);
      });
    }
    
    // If blocked for the whole day, show reason and add unblock option
    if (this.blockedDates[dateStr]) {
      const blockedReason = document.createElement('div');
      blockedReason.className = 'event-indicator blocked-event';
      blockedReason.textContent = this.blockedDates[dateStr] || 'Unavailable';
      
      // Add unblock icon
      const unblockIcon = document.createElement('i');
      unblockIcon.className = 'fas fa-unlock unblock-icon';
      unblockIcon.style.cssText = `
        position: absolute;
        right: 4px;
        top: 4px;
        font-size: 0.7rem;
        color: var(--danger);
        cursor: pointer;
        opacity: 0.7;
      `;
      unblockIcon.title = 'Unblock this date';
      
      // Add event listener for unblocking
      unblockIcon.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Unblock date ${dateStr}?`)) {
          delete this.blockedDates[dateStr];
          this.saveAvailability();
          this.renderCalendar();
        }
      });
      
      blockedReason.appendChild(unblockIcon);
      dayContent.appendChild(blockedReason);
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
  
  // Render week view calendar
  renderWeekView() {
    // Update header for week view
    const header = document.querySelector('.calendar-header');
    if (header) {
      header.innerHTML = '';
      
      // Create time column header
      const timeHeader = document.createElement('div');
      timeHeader.className = 'time-column-header';
      header.appendChild(timeHeader);
      
      // Get first day of week (Monday if using Monday-Sunday, or Sunday if using Sunday-Saturday)
      const firstDay = new Date(this.currentDate);
      const day = this.currentDate.getDay();
      const diff = this.currentDate.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
      firstDay.setDate(diff);
      
      // Create day headers
      for (let i = 0; i < 7; i++) {
        const currentDay = new Date(firstDay);
        currentDay.setDate(firstDay.getDate() + i);
        
        const dayHeader = document.createElement('div');
        dayHeader.className = 'week-day-header';
        
        // Check if this is today
        if (currentDay.toDateString() === new Date().toDateString()) {
          dayHeader.classList.add('today');
        }
        
        // Format day header
        const dayName = currentDay.toLocaleDateString('en-US', { weekday: 'short' });
        const dayNum = currentDay.getDate();
        dayHeader.innerHTML = `<div>${dayName}</div><div class="day-number">${dayNum}</div>`;
        
        header.appendChild(dayHeader);
      }
    }
    
    // Create week grid container
    const weekContainer = document.createElement('div');
    weekContainer.className = 'week-container';
    
    // Create time column
    const timeColumn = document.createElement('div');
    timeColumn.className = 'time-column';
    
    // Add hour cells to time column
    for (let hour = 0; hour < 24; hour++) {
      const hourCell = document.createElement('div');
      hourCell.className = 'hour-cell';
      
      // Format hour display (12-hour format with AM/PM)
      const hourDisplay = hour === 0 ? '12 AM' : 
                         hour < 12 ? `${hour} AM` : 
                         hour === 12 ? '12 PM' : 
                         `${hour - 12} PM`;
      
      hourCell.textContent = hourDisplay;
      timeColumn.appendChild(hourCell);
    }
    
    weekContainer.appendChild(timeColumn);
    
    // Get first day of week
    const firstDay = new Date(this.currentDate);
    const day = this.currentDate.getDay();
    const diff = this.currentDate.getDate() - day + (day === 0 ? -6 : 1);
    firstDay.setDate(diff);
    
    // Create columns for each day of the week
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(firstDay);
      currentDay.setDate(firstDay.getDate() + i);
      const dateStr = currentDay.toISOString().split('T')[0];
      
      // Create day column
      const dayColumn = document.createElement('div');
      dayColumn.className = 'day-column';
      dayColumn.dataset.date = dateStr;
      
      // Check if this is today
      if (currentDay.toDateString() === new Date().toDateString()) {
        dayColumn.classList.add('today');
      }
      
      // Check if date is blocked
      if (this.blockedDates[dateStr]) {
        dayColumn.classList.add('blocked');
        
        // Add blocked indicator
        const blockedIndicator = document.createElement('div');
        blockedIndicator.className = 'blocked-day-indicator';
        blockedIndicator.textContent = this.blockedDates[dateStr] || 'Unavailable';
        dayColumn.appendChild(blockedIndicator);
      }
      
      // Add hour cells
      for (let hour = 0; hour < 24; hour++) {
        const hourCell = document.createElement('div');
        hourCell.className = 'hour-cell';
        dayColumn.appendChild(hourCell);
        
        // Add click handler to create new event
        hourCell.addEventListener('click', () => {
          // Calculate start time based on clicked hour
          const startTime = `${hour.toString().padStart(2, '0')}:00`;
          const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
          
          this.showEventModal(currentDay, {
            startTime,
            endTime,
            type: 'regular'
          });
        });
      }
      
      // Add events for this day
      if (this.events[dateStr]) {
        this.events[dateStr].forEach(event => {
          if (event.fullDay) {
            // Full day event at the top
            const fullDayEvent = document.createElement('div');
            fullDayEvent.className = 'full-day-event';
            
            // Set event style based on type
            if (event.type === 'blocked') {
              fullDayEvent.classList.add('blocked-event');
            } else if (event.type === 'booked') {
              fullDayEvent.classList.add('booked-event');
            } else {
              fullDayEvent.classList.add('regular-event');
            }
            
            fullDayEvent.textContent = event.title;
            fullDayEvent.dataset.eventId = event.id;
            fullDayEvent.addEventListener('click', () => this.showEventDetails(event));
            
            // Insert at the beginning
            dayColumn.insertBefore(fullDayEvent, dayColumn.firstChild);
          } else {
            // Time-specific event
            const [startHour, startMinute] = event.startTime.split(':').map(Number);
            const [endHour, endMinute] = event.endTime.split(':').map(Number);
            
            // Calculate position and height
            const startFromTop = (startHour + startMinute / 60) * 60; // 60px per hour
            const height = ((endHour + endMinute / 60) - (startHour + startMinute / 60)) * 60;
            
            const eventElement = document.createElement('div');
            eventElement.className = 'time-event';
            
            // Set event style based on type
            if (event.type === 'blocked') {
              eventElement.classList.add('blocked-event');
            } else if (event.type === 'booked') {
              eventElement.classList.add('booked-event');
            } else {
              eventElement.classList.add('regular-event');
            }
            
            eventElement.style.top = `${startFromTop}px`;
            eventElement.style.height = `${height}px`;
            
            eventElement.innerHTML = `
              <div class="event-title">${event.title}</div>
              <div class="event-time">${event.startTime} - ${event.endTime}</div>
            `;
            
            eventElement.dataset.eventId = event.id;
            eventElement.addEventListener('click', () => this.showEventDetails(event));
            
            dayColumn.appendChild(eventElement);
          }
        });
      }
      
      // Add column to week container
      weekContainer.appendChild(dayColumn);
      
      // Add click handler for empty spaces
      dayColumn.addEventListener('click', (e) => {
        if (e.target === dayColumn) {
          this.handleDayClick(currentDay);
        }
      });
    }
    
    // Add week container to calendar container
    const container = document.querySelector('.calendar-container');
    if (container) {
      container.appendChild(weekContainer);
      
      // Add custom styles for week view
      const style = document.createElement('style');
      style.textContent = `
        .week-container {
          display: grid;
          grid-template-columns: 60px repeat(7, 1fr);
          height: 1440px;
          overflow-y: auto;
          border: 1px solid var(--gray-300);
          border-radius: 8px;
          position: relative;
        }
        
        .time-column, .day-column {
          display: flex;
          flex-direction: column;
          position: relative;
        }
        
        .hour-cell {
          height: 60px;
          border-bottom: 1px solid var(--gray-300);
          border-right: 1px solid var(--gray-300);
          padding: 0 0.25rem;
          font-size: 0.75rem;
          color: var(--gray-600);
          display: flex;
          align-items: flex-start;
        }
        
        .time-column .hour-cell {
          justify-content: flex-end;
          padding-right: 0.5rem;
        }
        
        .day-column {
          background-color: var(--gray-100);
        }
        
        .day-column.today {
          background-color: rgba(255, 123, 0, 0.05);
        }
        
        .day-column.blocked {
          background-color: rgba(255, 59, 48, 0.05);
        }
        
        .time-event {
          position: absolute;
          left: 2px;
          right: 2px;
          padding: 0.25rem;
          border-radius: 4px;
          font-size: 0.7rem;
          overflow: hidden;
          z-index: 2;
          box-shadow: var(--shadow-sm);
          cursor: pointer;
        }
        
        .full-day-event {
          margin: 2px;
          padding: 0.25rem;
          border-radius: 4px;
          font-size: 0.7rem;
          z-index: 3;
          box-shadow: var(--shadow-sm);
          cursor: pointer;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .blocked-day-indicator {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: rgba(255, 59, 48, 0.1);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1;
          font-size: 1.5rem;
          color: var(--danger);
          font-weight: 500;
          opacity: 0.5;
          pointer-events: none;
        }
        
        .regular-event {
          background-color: rgba(255, 123, 0, 0.2);
          border-left: 3px solid var(--primary);
        }
        
        .booked-event {
          background-color: rgba(0, 122, 255, 0.2);
          border-left: 3px solid #007aff;
        }
        
        .blocked-event {
          background-color: rgba(255, 59, 48, 0.2);
          border-left: 3px solid var(--danger);
        }
        
        .event-title {
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .event-time {
          font-size: 0.65rem;
          opacity: 0.7;
        }
        
        .calendar-header {
          display: grid;
          grid-template-columns: 60px repeat(7, 1fr);
          gap: 0;
          margin-bottom: 0;
        }
        
        .week-day-header {
          padding: 0.5rem;
          text-align: center;
          font-weight: 500;
          border-top: 1px solid var(--gray-300);
          border-right: 1px solid var(--gray-300);
          background-color: var(--gray-200);
        }
        
        .week-day-header.today {
          background-color: rgba(255, 123, 0, 0.1);
        }
        
        .time-column-header {
          border-top: 1px solid var(--gray-300);
          border-left: 1px solid var(--gray-300);
          border-right: 1px solid var(--gray-300);
          background-color: var(--gray-200);
        }
      `;
      
      document.head.appendChild(style);
    }
  },
  
  // Render day view calendar
  renderDayView() {
    // Create day view container
    const dayContainer = document.createElement('div');
    dayContainer.className = 'day-view-container';
    
    // Format current date for lookup and display
    const dateStr = this.currentDate.toISOString().split('T')[0];
    const dayName = this.currentDate.toLocaleDateString('en-US', { weekday: 'long' });
    const formattedDate = this.currentDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    
    // Create header area for full-day events
    const allDaySection = document.createElement('div');
    allDaySection.className = 'all-day-section';
    allDaySection.innerHTML = `
      <div class="all-day-label">All Day</div>
      <div class="all-day-events"></div>
    `;
    
    // Check if date is blocked
    if (this.blockedDates[dateStr]) {
      allDaySection.querySelector('.all-day-events').innerHTML = `
        <div class="all-day-event blocked-event">
          <div class="event-title">${this.blockedDates[dateStr] || 'Unavailable'}</div>
        </div>
      `;
      
      // Add blocked styling to container
      dayContainer.classList.add('blocked-day');
    }
    
    // Add full day events
    if (this.events[dateStr]) {
      const fullDayEvents = this.events[dateStr].filter(event => event.fullDay);
      
      if (fullDayEvents.length > 0) {
        const allDayEventsContainer = allDaySection.querySelector('.all-day-events');
        
        fullDayEvents.forEach(event => {
          const eventElement = document.createElement('div');
          eventElement.className = 'all-day-event';
          
          // Add styling based on event type
          if (event.type === 'blocked') {
            eventElement.classList.add('blocked-event');
          } else if (event.type === 'booked') {
            eventElement.classList.add('booked-event');
          } else {
            eventElement.classList.add('regular-event');
          }
          
          eventElement.innerHTML = `<div class="event-title">${event.title}</div>`;
          eventElement.dataset.eventId = event.id;
          eventElement.addEventListener('click', () => this.showEventDetails(event));
          
          allDayEventsContainer.appendChild(eventElement);
        });
      }
    }
    
    // Create time grid
    const timeGrid = document.createElement('div');
    timeGrid.className = 'day-time-grid';
    
    // Add hour rows
    for (let hour = 0; hour < 24; hour++) {
      const hourRow = document.createElement('div');
      hourRow.className = 'hour-row';
      
      // Format hour display (12-hour format with AM/PM)
      const hourDisplay = hour === 0 ? '12 AM' : 
                         hour < 12 ? `${hour} AM` : 
                         hour === 12 ? '12 PM' : 
                         `${hour - 12} PM`;
      
      hourRow.innerHTML = `
        <div class="hour-label">${hourDisplay}</div>
        <div class="hour-events"></div>
      `;
      
      // Add click handler to create new event
      hourRow.querySelector('.hour-events').addEventListener('click', (e) => {
        if (e.target === hourRow.querySelector('.hour-events')) {
          // Calculate start time based on clicked hour
          const startTime = `${hour.toString().padStart(2, '0')}:00`;
          const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
          
          this.showEventModal(this.currentDate, {
            startTime,
            endTime,
            type: 'regular'
          });
        }
      });
      
      timeGrid.appendChild(hourRow);
    }
    
    // Add timed events
    if (this.events[dateStr]) {
      const timedEvents = this.events[dateStr].filter(event => !event.fullDay);
      
      timedEvents.forEach(event => {
        const [startHour, startMinute] = event.startTime.split(':').map(Number);
        const [endHour, endMinute] = event.endTime.split(':').map(Number);
        
        // Calculate position and height
        const startFromTop = (startHour + startMinute / 60) * 60; // 60px per hour
        const height = ((endHour + endMinute / 60) - (startHour + startMinute / 60)) * 60;
        
        const eventElement = document.createElement('div');
        eventElement.className = 'day-time-event';
        
        // Set event style based on type
        if (event.type === 'blocked') {
          eventElement.classList.add('blocked-event');
        } else if (event.type === 'booked') {
          eventElement.classList.add('booked-event');
        } else {
          eventElement.classList.add('regular-event');
        }
        
        eventElement.style.top = `${startFromTop}px`;
        eventElement.style.height = `${height}px`;
        
        eventElement.innerHTML = `
          <div class="event-title">${event.title}</div>
          <div class="event-time">${event.startTime} - ${event.endTime}</div>
          <div class="event-description">${event.description || ''}</div>
        `;
        
        eventElement.dataset.eventId = event.id;
        eventElement.addEventListener('click', () => this.showEventDetails(event));
        
        timeGrid.appendChild(eventElement);
      });
    }
    
    // Add all day section and time grid to day container
    dayContainer.appendChild(allDaySection);
    dayContainer.appendChild(timeGrid);
    
    // Add day container to calendar container
    const container = document.querySelector('.calendar-container');
    if (container) {
      container.appendChild(dayContainer);
      
      // Add custom styles for day view
      const style = document.createElement('style');
      style.textContent = `
        .day-view-container {
          display: flex;
          flex-direction: column;
          height: 100%;
          border: 1px solid var(--gray-300);
          border-radius: 8px;
          overflow: hidden;
        }
        
        .all-day-section {
          display: flex;
          border-bottom: 1px solid var(--gray-300);
        }
        
        .all-day-label {
          width: 80px;
          padding: 0.5rem;
          font-size: 0.875rem;
          font-weight: 500;
          background-color: var(--gray-200);
          display: flex;
          align-items: center;
          border-right: 1px solid var(--gray-300);
        }
        
        .all-day-events {
          flex: 1;
          padding: 0.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .all-day-event {
          padding: 0.5rem;
          border-radius: 4px;
          font-size: 0.875rem;
          cursor: pointer;
        }
        
        .day-time-grid {
          flex: 1;
          overflow-y: auto;
          position: relative;
          height: 1440px;
        }
        
        .hour-row {
          display: flex;
          height: 60px;
          border-bottom: 1px solid var(--gray-300);
        }
        
        .hour-label {
          width: 80px;
          padding: 0 0.5rem;
          font-size: 0.75rem;
          color: var(--gray-600);
          display: flex;
          align-items: flex-start;
          justify-content: flex-end;
          background-color: var(--gray-200);
          border-right: 1px solid var(--gray-300);
        }
        
        .hour-events {
          flex: 1;
          background-color: var(--gray-100);
          position: relative;
        }
        
        .day-time-event {
          position: absolute;
          left: 4px;
          right: 4px;
          padding: 0.5rem;
          border-radius: 4px;
          font-size: 0.875rem;
          overflow: hidden;
          z-index: 2;
          box-shadow: var(--shadow-sm);
          cursor: pointer;
        }
        
        .blocked-day .hour-events {
          background-color: rgba(255, 59, 48, 0.05);
        }
        
        .regular-event {
          background-color: rgba(255, 123, 0, 0.2);
          border-left: 3px solid var(--primary);
        }
        
        .booked-event {
          background-color: rgba(0, 122, 255, 0.2);
          border-left: 3px solid #007aff;
        }
        
        .blocked-event {
          background-color: rgba(255, 59, 48, 0.2);
          border-left: 3px solid var(--danger);
        }
        
        .event-description {
          font-size: 0.75rem;
          margin-top: 0.25rem;
          opacity: 0.8;
        }
      `;
      
      document.head.appendChild(style);
    }
  },
  
  // Handle day click (for date selection or details)
  handleDayClick(date, element) {
    // Open the event creation modal
    this.showEventModal(date);
  },
  
  // Show event creation/edit modal
  showEventModal(date = null, eventData = null) {
    // Set default date to today if not provided
    if (!date) {
      date = new Date();
    }
    
    // Format date string
    const dateStr = date.toISOString().split('T')[0];
    const formattedDate = date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    
    // Determine if we're editing an existing event
    const isEditing = eventData && eventData.id;
    let event = eventData;
    
    // Create modal if it doesn't exist
    if (!this.eventModal) {
      this.createEventModal();
    }
    
    const modal = this.eventModal;
    
    // Set modal title
    modal.querySelector('.modal-title').textContent = isEditing ? 'Edit Event' : 'New Event';
    
    // Fill form with event data
    const form = modal.querySelector('#eventForm');
    form.reset();
    
    // Set date
    form.querySelector('#eventDate').value = dateStr;
    
    // Make date picker visible for editing
    form.querySelector('#eventDate').style.display = isEditing ? 'block' : 'none';
    
    form.querySelector('#eventDateDisplay').textContent = formattedDate;
    
    // Add label for date picker when editing
    if (isEditing) {
      form.querySelector('#eventDateDisplay').innerHTML += '<br><small style="font-weight: normal; color: var(--primary);">You can change the date below:</small>';
    }
    
    // Set event type
    const eventType = form.querySelector('#eventType');
    eventType.value = event?.type || 'regular';
    
    // Set event details if editing
    if (isEditing) {
      form.querySelector('#eventId').value = event.id;
      form.querySelector('#eventTitle').value = event.title;
      form.querySelector('#eventDescription').value = event.description || '';
      form.querySelector('#eventFullDay').checked = event.fullDay;
      
      if (!event.fullDay) {
        form.querySelector('#eventStartTime').value = event.startTime;
        form.querySelector('#eventEndTime').value = event.endTime;
      }
      
      // Show delete button
      form.querySelector('#deleteEventBtn').style.display = 'block';
    } else {
      // Set default values for new event
      form.querySelector('#eventId').value = '';
      
      // Set default title based on event type
      if (event?.type === 'blocked') {
        form.querySelector('#eventTitle').value = 'Unavailable';
      } else if (event?.type === 'booked') {
        form.querySelector('#eventTitle').value = 'Booked';
      } else {
        form.querySelector('#eventTitle').value = '';
      }
      
      // Set time if provided
      if (event?.startTime) {
        form.querySelector('#eventStartTime').value = event.startTime;
      } else {
        form.querySelector('#eventStartTime').value = '09:00';
      }
      
      if (event?.endTime) {
        form.querySelector('#eventEndTime').value = event.endTime;
      } else {
        form.querySelector('#eventEndTime').value = '10:00';
      }
      
      // Hide delete button
      form.querySelector('#deleteEventBtn').style.display = 'none';
    }
    
    // Toggle time inputs based on full day
    this.toggleEventTimeInputs();
    
    // Show the modal
    modal.style.display = 'flex';
  },
  
  // Create event modal
  createEventModal() {
    // Create modal element
    const modal = document.createElement('div');
    modal.className = 'event-modal';
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
    
    // Create event form
    const form = document.createElement('form');
    form.id = 'eventForm';
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveEvent();
    });
    
    // Form content
    form.innerHTML = `
      <h3 class="modal-title" style="margin-bottom: 1.5rem;">New Event</h3>
      
      <input type="hidden" id="eventId">
      
      <div style="margin-bottom: 1.5rem;">
        <div id="eventDateDisplay" style="font-weight: 500; margin-bottom: 0.5rem;"></div>
        <!-- Make date input visible as a form control -->
        <div class="form-group">
          <label for="eventDate">Change Date (when editing)</label>
          <input type="date" id="eventDate" style="display: none;">
        </div>
      </div>
      
      <div class="form-group">
        <label for="eventType">Event Type</label>
        <select id="eventType" required>
          <option value="regular">Regular Event</option>
          <option value="booked">Booked</option>
          <option value="blocked">Blocked/Unavailable</option>
        </select>
      </div>
      
      <div class="form-group">
        <label for="eventTitle">Title</label>
        <input type="text" id="eventTitle" required placeholder="Enter event title">
      </div>
      
      <div class="form-group">
        <label for="eventDescription">Description (optional)</label>
        <textarea id="eventDescription" rows="3" placeholder="Add event details"></textarea>
      </div>
      
      <div class="form-group">
        <div class="switch-container">
          <label class="switch">
            <input type="checkbox" id="eventFullDay">
            <span class="slider"></span>
          </label>
          <span class="switch-label">Full Day Event</span>
        </div>
      </div>
      
      <div id="eventTimeInputs" style="margin-bottom: 1.5rem;">
        <div class="row">
          <div class="col">
            <div class="form-group">
              <label for="eventStartTime">Start Time</label>
              <input type="time" id="eventStartTime" value="09:00">
            </div>
          </div>
          <div class="col">
            <div class="form-group">
              <label for="eventEndTime">End Time</label>
              <input type="time" id="eventEndTime" value="10:00">
            </div>
          </div>
        </div>
      </div>
      
      <div class="form-group" id="timeConflictWarning" style="display: none;">
        <div class="alert alert-danger">
          <i class="fas fa-exclamation-circle"></i>
          <div>
            <strong>Time Conflict!</strong>
            <p>This time slot conflicts with another event. Please choose a different time.</p>
          </div>
        </div>
      </div>
      
      <div class="btn-group">
        <button type="submit" class="btn btn-primary">
          <i class="fas fa-save"></i> Save Event
        </button>
        <button type="button" id="deleteEventBtn" class="btn btn-danger" style="display: none;">
          <i class="fas fa-trash"></i> Delete
        </button>
        <button type="button" class="btn btn-outline" id="cancelEventBtn">
          <i class="fas fa-times"></i> Cancel
        </button>
      </div>
    `;
    
    // Add everything to DOM
    content.appendChild(closeBtn);
    content.appendChild(form);
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Add event listeners
    form.querySelector('#eventFullDay').addEventListener('change', () => this.toggleEventTimeInputs());
    form.querySelector('#cancelEventBtn').addEventListener('click', () => modal.style.display = 'none');
    form.querySelector('#deleteEventBtn').addEventListener('click', () => this.deleteEvent());
    
    // Add time input validation
    form.querySelector('#eventStartTime').addEventListener('change', () => this.validateEventTimes());
    form.querySelector('#eventEndTime').addEventListener('change', () => this.validateEventTimes());
    
    // Store modal reference
    this.eventModal = modal;
  },
  
  // Toggle time inputs based on full day checkbox
  toggleEventTimeInputs() {
    const form = this.eventModal.querySelector('#eventForm');
    const fullDay = form.querySelector('#eventFullDay').checked;
    const timeInputs = form.querySelector('#eventTimeInputs');
    
    timeInputs.style.display = fullDay ? 'none' : 'block';
  },
  
  // Validate event times
  validateEventTimes() {
    const form = this.eventModal.querySelector('#eventForm');
    const startTime = form.querySelector('#eventStartTime').value;
    const endTime = form.querySelector('#eventEndTime').value;
    const warning = form.querySelector('#timeConflictWarning');
    
    // Check if end time is after start time
    if (startTime >= endTime) {
      warning.style.display = 'block';
      warning.querySelector('p').textContent = 'End time must be after start time.';
      return false;
    }
    
    // Check for conflicts with other events
    const eventId = form.querySelector('#eventId').value;
    const date = new Date(form.querySelector('#eventDate').value);
    
    if (this.checkTimeConflicts(date, startTime, endTime, eventId)) {
      warning.style.display = 'block';
      warning.querySelector('p').textContent = 'This time conflicts with another event. Please choose a different time.';
      return false;
    }
    
    // No conflicts
    warning.style.display = 'none';
    return true;
  },
  
  // Save event
  saveEvent() {
    const form = this.eventModal.querySelector('#eventForm');
    
    // Get form values
    const eventId = form.querySelector('#eventId').value || `event_${Date.now()}`;
    const date = new Date(form.querySelector('#eventDate').value);
    const dateStr = date.toISOString().split('T')[0];
    const title = form.querySelector('#eventTitle').value;
    const description = form.querySelector('#eventDescription').value;
    const eventType = form.querySelector('#eventType').value;
    const fullDay = form.querySelector('#eventFullDay').checked;
    
    // Get time values if not full day
    let startTime = '00:00';
    let endTime = '23:59';
    
    if (!fullDay) {
      startTime = form.querySelector('#eventStartTime').value;
      endTime = form.querySelector('#eventEndTime').value;
      
      // Validate times
      if (!this.validateEventTimes()) {
        return false;
      }
    }

    // Check if we're editing an existing event
    const existingEventId = form.querySelector('#eventId').value;
    let oldDateStr = null;
    
    if (existingEventId) {
      // Find the existing event's date
      for (const date in this.events) {
        const eventIndex = this.events[date].findIndex(e => e.id === existingEventId);
        if (eventIndex !== -1) {
          oldDateStr = date;
          break;
        }
      }
      
      // If found and the date is different, remove from old date
      if (oldDateStr && oldDateStr !== dateStr) {
        this.events[oldDateStr] = this.events[oldDateStr].filter(e => e.id !== existingEventId);
        
        // Remove empty date array
        if (this.events[oldDateStr].length === 0) {
          delete this.events[oldDateStr];
        }
      }
    }
    
    // If blocked, update blocked dates
    if (eventType === 'blocked' && fullDay) {
      this.blockedDates[dateStr] = title || 'Unavailable';
    } else {
      // Create event object
      const event = {
        id: eventId,
        date: dateStr,
        title,
        description,
        type: eventType,
        fullDay,
        startTime,
        endTime
      };
      
      // Add to events
      if (!this.events[dateStr]) {
        this.events[dateStr] = [];
      }
      
      // Check if editing existing event
      const existingIndex = this.events[dateStr]?.findIndex(e => e.id === eventId);
      
      if (existingIndex !== -1) {
        // Update existing event
        this.events[dateStr][existingIndex] = event;
      } else {
        // Add new event
        this.events[dateStr].push(event);
      }
    }
    
    // Save changes
    this.saveAvailability();
    
    // Refresh calendar
    this.renderCalendar();
    this.renderUpcomingBookings();
    
    // Close modal
    this.eventModal.style.display = 'none';
    
    return true;
  },
  
  // Delete event
  deleteEvent() {
    const form = this.eventModal.querySelector('#eventForm');
    const eventId = form.querySelector('#eventId').value;
    const dateStr = form.querySelector('#eventDate').value;
    
    if (!eventId || !this.events[dateStr]) {
      return;
    }
    
    // Confirm deletion
    if (confirm('Are you sure you want to delete this event?')) {
      // Remove event from events
      this.events[dateStr] = this.events[dateStr].filter(e => e.id !== eventId);
      
      // If no events left, remove the date array
      if (this.events[dateStr].length === 0) {
        delete this.events[dateStr];
      }
      
      // Save changes
      this.saveAvailability();
      
      // Refresh calendar
      this.renderCalendar();
      this.renderUpcomingBookings();
      
      // Close modal
      this.eventModal.style.display = 'none';
    }
  },
  
  // Show event details
  showEventDetails(event) {
    // For booked events, add option to cancel booking
    if (event.type === 'booked') {
      // Create a custom modal for booking details with cancel option
      this.showBookingDetailsModal(event);
      return;
    }
    
    // For regular events, show in edit mode
    this.showEventModal(new Date(event.date), event);
  },
  
  // Show booking details modal with cancel option
  showBookingDetailsModal(event) {
    // Create modal if it doesn't exist
    if (!this.bookingDetailsModal) {
      this.createBookingDetailsModal();
    }
    
    const modal = this.bookingDetailsModal;
    const modalContent = modal.querySelector('.modal-content');
    
    // Format dates
    const date = new Date(event.date);
    const formatOptions = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    const formattedDate = date.toLocaleDateString('en-US', formatOptions);
    
    // Get client data if available
    const clientData = event.clientData || {};
    
    // Update modal title and content
    modalContent.querySelector('.modal-title').textContent = `Booking Details: ${event.title}`;
    
    const detailsContent = modalContent.querySelector('.booking-details-content');
    detailsContent.innerHTML = `
      <div class="booking-detail-row">
        <div class="booking-detail-label">Client:</div>
        <div class="booking-detail-value">${clientData.clientName || event.title}</div>
      </div>
      <div class="booking-detail-row">
        <div class="booking-detail-label">Project:</div>
        <div class="booking-detail-value">${clientData.projectName || event.description || 'Unnamed Project'}</div>
      </div>
      ${clientData.projectLocation ? `
      <div class="booking-detail-row">
        <div class="booking-detail-label">Location:</div>
        <div class="booking-detail-value">${clientData.projectLocation}</div>
      </div>
      ` : ''}
      <div class="booking-detail-row">
        <div class="booking-detail-label">Date:</div>
        <div class="booking-detail-value">${formattedDate}</div>
      </div>
      <div class="booking-detail-row">
        <div class="booking-detail-label">Time:</div>
        <div class="booking-detail-value">
          ${event.fullDay ? 'All Day' : `${event.startTime} - ${event.endTime}`}
        </div>
      </div>
      <div class="booking-detail-row">
        <div class="booking-detail-label">Status:</div>
        <div class="booking-detail-value">
          <span class="badge ${clientData.depositPaid ? 'badge-success' : 'badge-primary'}">
            ${clientData.depositPaid ? 'Deposit Paid' : 'Confirmed'}
          </span>
        </div>
      </div>
      ${event.description ? `
      <div class="booking-detail-row">
        <div class="booking-detail-label">Notes:</div>
        <div class="booking-detail-value">${event.description}</div>
      </div>
      ` : ''}
    `;
    
    // Store event data in modal for reference in cancel function
    modal.dataset.eventId = event.id;
    modal.dataset.eventDate = event.date;
    
    // Show the cancel button
    const cancelBtn = modalContent.querySelector('#cancelBookingBtn');
    cancelBtn.style.display = 'inline-block';
    
    // Also show edit button
    const editBtn = modalContent.querySelector('#editBookingBtn');
    if (editBtn) {
      editBtn.style.display = 'inline-block';
      editBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        this.showEventModal(new Date(event.date), event);
      });
    }
    
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
    
    // Modal content
    content.innerHTML = `
      <h3 class="modal-title" style="margin-bottom: 1.5rem;">Booking Details</h3>
      
      <div class="booking-details-content" style="margin-bottom: 1.5rem;">
        <!-- Booking details will be inserted here -->
      </div>
      
      <div class="btn-group">
        <button type="button" id="editBookingBtn" class="btn btn-primary">
          <i class="fas fa-edit"></i> Edit
        </button>
        <button type="button" id="cancelBookingBtn" class="btn btn-danger">
          <i class="fas fa-ban"></i> Cancel Booking
        </button>
        <button type="button" class="btn btn-outline" id="closeBookingDetailsBtn">
          <i class="fas fa-times"></i> Close
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
      this.handleCancelBooking(modal.dataset.eventId, modal.dataset.eventDate);
      modal.style.display = 'none';
    });
    
    // Store modal reference
    this.bookingDetailsModal = modal;
  },
  
  // Handle cancel booking
  handleCancelBooking(eventId, dateStr) {
    if (!eventId || !dateStr || !this.events[dateStr]) {
      return;
    }
    
    // Find the event
    const event = this.events[dateStr].find(e => e.id === eventId);
    if (!event) {
      return;
    }
    
    // Confirm cancellation
    if (confirm(`Are you sure you want to cancel this booking for ${event.title}?`)) {
      // If this is part of a booking range, ask if all should be cancelled
      if (event.clientData && event.clientData.projectStartDate && event.clientData.projectEndDate) {
        const cancelAll = confirm('Cancel all related booking dates for this project?');
        
        if (cancelAll) {
          // Find and remove all related events
          Object.keys(this.events).forEach(date => {
            this.events[date] = this.events[date].filter(e => {
              if (e.type === 'booked' && e.clientData &&
                  e.clientData.projectStartDate === event.clientData.projectStartDate &&
                  e.clientData.projectEndDate === event.clientData.projectEndDate) {
                // This is a related event, remove it
                return false;
              }
              return true;
            });
            
            // Remove empty date arrays
            if (this.events[date].length === 0) {
              delete this.events[date];
            }
          });
        } else {
          // Just remove this specific event
          this.events[dateStr] = this.events[dateStr].filter(e => e.id !== eventId);
          
          // Remove empty date array
          if (this.events[dateStr].length === 0) {
            delete this.events[dateStr];
          }
        }
      } else {
        // Remove just this event
        this.events[dateStr] = this.events[dateStr].filter(e => e.id !== eventId);
        
        // Remove empty date array
        if (this.events[dateStr].length === 0) {
          delete this.events[dateStr];
        }
      }
      
      // Save changes
      this.saveAvailability();
      
      // Refresh calendar
      this.renderCalendar();
      this.renderUpcomingBookings();
      
      // Show cancellation notification
      this.showCancellationNotification(event.title);
    }
  },
  
  // Show cancellation notification
  showCancellationNotification(title) {
    const notification = document.createElement('div');
    notification.className = 'alert alert-danger cancellation-alert';
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      max-width: 400px;
      z-index: 1000;
    `;
    
    notification.innerHTML = `
      <i class="fas fa-ban"></i>
      <div>
        <strong>Booking Cancelled</strong>
        <p>The booking for "${title}" has been cancelled.</p>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.5s';
      setTimeout(() => notification.remove(), 500);
    }, 3000);
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
      
      // Remove any events for this date
      if (this.events[dateStr]) {
        delete this.events[dateStr];
      }
      
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
    
    // Get all events and sort by date
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Collect all upcoming events
    const upcomingEvents = [];
    
    // Process each date's events
    Object.keys(this.events).forEach(dateStr => {
      const eventDate = new Date(dateStr);
      
      // Only include future events
      if (eventDate >= today) {
        this.events[dateStr].forEach(event => {
          upcomingEvents.push({
            ...event,
            dateObj: eventDate
          });
        });
      }
    });
    
    // Sort by date and time
    upcomingEvents.sort((a, b) => {
      // First sort by date
      if (a.dateObj < b.dateObj) return -1;
      if (a.dateObj > b.dateObj) return 1;
      
      // If same date, sort by time for non-full day events
      if (!a.fullDay && !b.fullDay) {
        return a.startTime.localeCompare(b.startTime);
      }
      
      // Full day events come before timed events
      if (a.fullDay && !b.fullDay) return -1;
      if (!a.fullDay && b.fullDay) return 1;
      
      // Sort by title if everything else is equal
      return a.title.localeCompare(b.title);
    });
    
    // If no upcoming events
    if (upcomingEvents.length === 0) {
      upcomingBookingsList.innerHTML = `
        <div style="text-align: center; padding: 1.5rem; color: var(--gray-500); font-style: italic;">
          No upcoming events.
        </div>
      `;
      return;
    }
    
    // Add events to list
    upcomingEvents.forEach(event => {
      const eventItem = document.createElement('div');
      eventItem.className = 'booking-item';
      
      // Add class based on event type
      if (event.type === 'blocked') {
        eventItem.classList.add('blocked-item');
      } else if (event.type === 'booked') {
        eventItem.classList.add('booked-item');
      }
      
      // Format date
      const options = { month: 'short', day: 'numeric' };
      const dateStr = event.dateObj.toLocaleDateString('en-US', options);
      
      // Format time
      let timeStr = 'All Day';
      if (!event.fullDay) {
        // Convert to 12-hour format
        const formatTime = (timeStr) => {
          const [hours, minutes] = timeStr.split(':');
          const hour = parseInt(hours);
          const ampm = hour >= 12 ? 'PM' : 'AM';
          const hour12 = hour % 12 || 12;
          return `${hour12}:${minutes} ${ampm}`;
        };
        
        timeStr = `${formatTime(event.startTime)} - ${formatTime(event.endTime)}`;
      }
      
      eventItem.innerHTML = `
        <div>
          <div class="booking-dates">${dateStr}</div>
          <div class="booking-client">${event.title}</div>
          <div class="booking-time">${timeStr}</div>
        </div>
        <div class="booking-status">
          <span class="badge ${event.type === 'blocked' ? 'badge-danger' : event.type === 'booked' ? 'badge-success' : 'badge-primary'}">
            ${event.type === 'blocked' ? 'Blocked' : event.type === 'booked' ? 'Booked' : 'Event'}
          </span>
        </div>
      `;
      
      // Add click handler to view details
      eventItem.addEventListener('click', () => {
        this.showEventDetails(event);
      });
      
      upcomingBookingsList.appendChild(eventItem);
    });
    
    // Add custom styles for booking items
    const style = document.createElement('style');
    style.textContent = `
      .booking-item {
        display: flex;
        justify-content: space-between;
        padding: 1rem;
        border-radius: 8px;
        background-color: var(--gray-100);
        margin-bottom: 0.75rem;
        transition: all 0.2s;
        border-left: 3px solid var(--primary);
      }
      
      .booking-item:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-sm);
      }
      
      .booking-item.booked-item {
        border-left: 3px solid #007aff;
      }
      
      .booking-item.blocked-item {
        border-left: 3px solid var(--danger);
      }
      
      .booking-dates {
        font-weight: 500;
        margin-bottom: 0.25rem;
      }
      
      .booking-client {
        font-size: 0.875rem;
        color: var(--gray-800);
      }
      
      .booking-time {
        font-size: 0.75rem;
        color: var(--gray-600);
        margin-top: 0.25rem;
      }
      
      .booking-status {
        display: flex;
        align-items: center;
      }
    `;
    
    // Check if style already exists
    if (!document.getElementById('booking-styles')) {
      style.id = 'booking-styles';
      document.head.appendChild(style);
    }
  },
  
  // Export calendar data to iCal
  exportCalendar() {
    // Create iCal content
    let icalContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//LuminaryOps//Calendar//EN',
      `X-WR-CALNAME:LuminaryOps Calendar`,
      'X-WR-TIMEZONE:UTC',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];
    
    // Add blocked dates
    Object.keys(this.blockedDates).forEach(dateStr => {
      const reason = this.blockedDates[dateStr] || 'Unavailable';
      
      // Create date objects for start and end of day
      const startDate = new Date(dateStr);
      const endDate = new Date(dateStr);
      endDate.setDate(endDate.getDate() + 1);
      
      // Format dates for iCal
      const start = startDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      const end = endDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
      
      // Add event
      icalContent = icalContent.concat([
        'BEGIN:VEVENT',
        `UID:blocked-${dateStr}@luminaryops.com`,
        `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
        `DTSTART;VALUE=DATE:${dateStr.replace(/-/g, '')}`,
        `DTEND;VALUE=DATE:${dateStr.replace(/-/g, '')}`,
        `SUMMARY:${reason}`,
        'CATEGORIES:BLOCKED',
        'TRANSP:OPAQUE',
        'END:VEVENT'
      ]);
    });
    
    // Add events
    Object.keys(this.events).forEach(dateStr => {
      this.events[dateStr].forEach(event => {
        // Create date objects for start and end
        const startDate = new Date(dateStr);
        const endDate = new Date(dateStr);
        
        // Handle full day vs. timed events
        let start, end;
        if (event.fullDay) {
          // Full day event
          start = `${dateStr.replace(/-/g, '')}`;
          endDate.setDate(endDate.getDate() + 1);
          end = `${endDate.toISOString().split('T')[0].replace(/-/g, '')}`;
        } else {
          // Timed event
          const [startHour, startMinute] = event.startTime.split(':');
          const [endHour, endMinute] = event.endTime.split(':');
          startDate.setHours(parseInt(startHour), parseInt(startMinute), 0);
          endDate.setHours(parseInt(endHour), parseInt(endMinute), 0);
          
          start = startDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
          end = endDate.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
        }
        
        // Add event to iCal
        icalContent = icalContent.concat([
          'BEGIN:VEVENT',
          `UID:${event.id}@luminaryops.com`,
          `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')}`,
          event.fullDay ? `DTSTART;VALUE=DATE:${start}` : `DTSTART:${start}`,
          event.fullDay ? `DTEND;VALUE=DATE:${end}` : `DTEND:${end}`,
          `SUMMARY:${event.title}`,
          event.description ? `DESCRIPTION:${event.description.replace(/\n/g, '\\n')}` : '',
          `CATEGORIES:${event.type.toUpperCase()}`,
          'TRANSP:OPAQUE',
          'END:VEVENT'
        ].filter(line => line !== '')); // Remove empty lines
      });
    });
    
    // Close calendar
    icalContent.push('END:VCALENDAR');
    
    // Create download link
    const blob = new Blob([icalContent.join('\r\n')], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'luminaryops_calendar.ics';
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },
  
  // Book a date range for a client
  async bookDateRange(startDate, endDate, clientData) {
    // Clone date to avoid modifying the original
    let currentDate = new Date(startDate);
    
    // Create unique ID for this booking
    const bookingId = `booking_${Date.now()}`;
    
    // Book each day in the range
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Create a booking event
      if (!this.events[dateStr]) {
        this.events[dateStr] = [];
      }
      
      // Add booking event
      this.events[dateStr].push({
        id: `${bookingId}_${dateStr}`,
        date: dateStr,
        title: clientData.clientName || 'Unnamed Client',
        description: clientData.projectName || 'Unnamed Project',
        type: 'booked',
        fullDay: true,
        startTime: '00:00',
        endTime: '23:59',
        clientData: {
          ...clientData,
          projectStartDate: startDate.toISOString().split('T')[0],
          projectEndDate: endDate.toISOString().split('T')[0]
        }
      });
      
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
        
        if (!this.events[travelDateStr]) {
          this.events[travelDateStr] = [];
        }
        
        this.events[travelDateStr].push({
          id: `${bookingId}_travel_before_${i}`,
          date: travelDateStr,
          title: `Travel: ${clientData.clientName || 'Unnamed Client'}`,
          description: `Travel day for ${clientData.projectName || 'Unnamed Project'}`,
          type: 'booked',
          fullDay: true,
          startTime: '00:00',
          endTime: '23:59',
          clientData: {
            ...clientData,
            isTravel: true,
            travelLabel: 'Travel Day',
            projectStartDate: startDate.toISOString().split('T')[0],
            projectEndDate: endDate.toISOString().split('T')[0]
          }
        });
        
        beforeTravel.setDate(beforeTravel.getDate() + 1);
      }
      
      // Add travel days after end date
      let afterTravel = new Date(endDate);
      afterTravel.setDate(afterTravel.getDate() + 1);
      
      for (let i = 0; i < clientData.travelDays; i++) {
        const travelDateStr = afterTravel.toISOString().split('T')[0];
        
        if (!this.events[travelDateStr]) {
          this.events[travelDateStr] = [];
        }
        
        this.events[travelDateStr].push({
          id: `${bookingId}_travel_after_${i}`,
          date: travelDateStr,
          title: `Travel: ${clientData.clientName || 'Unnamed Client'}`,
          description: `Travel day for ${clientData.projectName || 'Unnamed Project'}`,
          type: 'booked',
          fullDay: true,
          startTime: '00:00',
          endTime: '23:59',
          clientData: {
            ...clientData,
            isTravel: true,
            travelLabel: 'Travel Day',
            projectStartDate: startDate.toISOString().split('T')[0],
            projectEndDate: endDate.toISOString().split('T')[0]
          }
        });
        
        afterTravel.setDate(afterTravel.getDate() + 1);
      }
      
      await this.saveAvailability();
    }
    
    // Refresh calendar
    this.renderCalendar();
    this.renderUpcomingBookings();
  },
  
  // Update payment status for a booking
  async updateBookingPaymentStatus(startDate, endDate, isPaid) {
    // Clone date to avoid modifying the original
    let currentDate = new Date(startDate);
    
    // Update each day in the range
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Update events
      if (this.events[dateStr]) {
        this.events[dateStr].forEach(event => {
          if (event.type === 'booked' && event.clientData) {
            event.clientData.depositPaid = isPaid;
            
            // Update title to reflect payment status
            if (isPaid && !event.title.includes('(Paid)')) {
              event.title += ' (Paid)';
            }
          }
        });
      }
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    await this.saveAvailability();
    
    // Refresh calendar
    this.renderCalendar();
    this.renderUpcomingBookings();
  }
};
