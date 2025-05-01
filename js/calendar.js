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

  // Helper function to parse YYYY-MM-DD string as local date
  parseLocalDate(dateStr) {
    if (!dateStr) return new Date(); // Return today if no date string
    // Check if dateStr is already a Date object
    if (dateStr instanceof Date) {
        // Ensure it's a valid date
        if (!isNaN(dateStr.getTime())) {
            return dateStr;
        } else {
            console.warn("Invalid Date object passed to parseLocalDate:", dateStr);
            return new Date(); // Fallback to today
        }
    }
    // Check if it's a valid date string format
    if (typeof dateStr !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        console.warn("Invalid date string format passed to parseLocalDate:", dateStr);
        // Try creating a date anyway, might be a different format
        const attemptedDate = new Date(dateStr);
        if (!isNaN(attemptedDate.getTime())) {
            return attemptedDate; // It worked, return it
        }
        return new Date(); // Fallback to today
    }
    
    const [year, month, day] = dateStr.split('-').map(Number);
    // Note: month is 0-indexed in JavaScript Date constructor
    // Create date in local timezone
    const localDate = new Date(year, month - 1, day);
    // Verify the date wasn't impacted by timezone shifts during creation (rare edge case)
    if (localDate.getFullYear() !== year || localDate.getMonth() !== month - 1 || localDate.getDate() !== day) {
        console.warn("Potential timezone issue during date creation for:", dateStr, "Result:", localDate);
        // If shifted, try creating with UTC components to force local interpretation
        return new Date(Date.UTC(year, month - 1, day));
    }
    return localDate;
  },
  
  // Initialize calendar module
  async init() {
    try {
      await this.loadAvailability();
      this.createCalendarTab();
      this.setupEventListeners();
      this.renderCalendar();
      this.renderUpcomingBookings();
      
      // Add validation for date selection in the quote form
      this.setupDateValidation();
      
      // Run data integrity checks
      await this.ensureDataIntegrity();
      
      console.log('Calendar initialized successfully with data integrity checks.');
      return true;
    } catch (error) {
      console.error('Error initializing calendar:', error);
      // Still try to render with any available data
      this.renderCalendar();
      this.renderUpcomingBookings();
      return false;
    }
  },
  
  // Load availability data from Firebase with improved error handling
  async loadAvailability() {
    try {
      // Try to load from Firebase if available
      if (AppState.usingFirebase) {
        const availability = await FirebaseStorage.loadCalendarData();
        if (availability) {
          // Log what we're loading to debug
          console.log('Loading availability from Firebase:', 
            'events:', Object.keys(availability.events || {}).length, 
            'blockedDates:', Object.keys(availability.blockedDates || {}).length, 
            'bookedDates:', Object.keys(availability.bookedDates || {}).length);
          
          // Validate each property before assigning
          this.blockedDates = availability.blockedDates || {};
          this.bookedDates = availability.bookedDates || {};
          this.events = availability.events || {};
          
          // Add debugging for a few events if any
          if (Object.keys(this.events).length > 0) {
            const sampleDate = Object.keys(this.events)[0];
            console.log(`Sample events for ${sampleDate}:`, this.events[sampleDate]);
          }
          
          // Update app state
          AppState.availability = {
            blockedDates: this.blockedDates,
            bookedDates: this.bookedDates,
            events: this.events
          };
          
          console.log('Availability data loaded from Firebase successfully');
          return true;
        }
      }
      
      // Fallback to localStorage
      const storedCalendar = localStorage.getItem('calendar');
      if (storedCalendar) {
        try {
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
          return true;
        } catch (parseError) {
          console.error('Error parsing stored calendar data:', parseError);
        }
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
      return true;
    } catch (error) {
      console.error('Error loading availability data:', error);
      
      // Initialize with empty data
      this.blockedDates = {};
      this.bookedDates = {};
      this.events = {};
      
      // Update app state
      AppState.availability = {
        blockedDates: this.blockedDates,
        bookedDates: this.bookedDates,
        events: this.events
      };
      
      return false;
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
      return true;
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
        return true;
      } catch (localError) {
        console.error('Error saving to localStorage:', localError);
        return false;
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
      PinAuth.verifyPin(async () => {
        // This runs after successful PIN verification
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        calendarTab.classList.add('active');
        document.getElementById('calendar').classList.add('active');
        
        // First load fresh data from Firebase, then render
        if (AppState.usingFirebase) {
          try {
            console.log('Fetching fresh calendar data from Firebase...');
            
            // Show loading indicator if available
            const calendarContainer = document.querySelector('.calendar-container');
            if (calendarContainer) {
              const loadingIndicator = document.createElement('div');
              loadingIndicator.className = 'loading';
              loadingIndicator.style.display = 'flex';
              loadingIndicator.innerHTML = '<div class="loading-spinner"></div><span>Loading calendar data...</span>';
              calendarContainer.appendChild(loadingIndicator);
            }
            
            // Load fresh data from Firebase
            const calendarData = await FirebaseStorage.loadCalendarData();
            
            // Update the calendar with the fresh data
            if (calendarData) {
              this.updateAvailability(calendarData);
              console.log('Calendar data refreshed from Firebase successfully');
            }
            
            // Remove loading indicator
            if (calendarContainer) {
              const loadingIndicator = calendarContainer.querySelector('.loading');
              if (loadingIndicator) {
                loadingIndicator.remove();
              }
            }
          } catch (error) {
            console.error('Error refreshing calendar data:', error);
            // Still render with existing data in case of error
          }
        }
        
        // Refresh calendar when tab is shown (now with updated data)
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
  
  // Set up event listeners and UI controls
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
    
    // Create main controls container
    const calendarControls = document.querySelector('.calendar-controls');
    
    // Create the controls wrapper to organize buttons
    const controlsWrapper = document.createElement('div');
    controlsWrapper.className = 'calendar-controls-wrapper';
    controlsWrapper.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 1rem;
      width: 100%;
    `;
    
    // Add controls wrapper after the first .row in calendar-controls
    const firstRow = calendarControls.querySelector('.row');
    calendarControls.insertBefore(controlsWrapper, firstRow.nextSibling);
    
    // Create view mode container
    const viewModeContainer = document.createElement('div');
    viewModeContainer.className = 'view-mode-container';
    viewModeContainer.style.cssText = `
      display: flex;
      gap: 0.5rem;
      margin-bottom: 0.5rem;
    `;
    
    // Create action buttons container 
    const actionButtonsContainer = document.createElement('div');
    actionButtonsContainer.className = 'action-buttons-container';
    actionButtonsContainer.style.cssText = `
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    `;
    
    // Add these containers to the wrapper
    controlsWrapper.appendChild(viewModeContainer);
    controlsWrapper.appendChild(actionButtonsContainer);
    
    // Create view mode buttons
    const viewModes = [
      { id: 'month', icon: 'calendar-alt', label: 'Month' },
      { id: 'week', icon: 'calendar-week', label: 'Week' },
      { id: 'day', icon: 'calendar-day', label: 'Day' }
    ];
    
    // Determine if we're in dark mode
    const isDarkMode = !document.body.classList.contains('light-mode');
    
    // Add view mode buttons
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
    
    // Add "Today" button to view mode container
    const todayBtn = document.createElement('button');
    todayBtn.className = 'btn btn-outline btn-sm';
    todayBtn.innerHTML = '<i class="fas fa-calendar-check"></i> Today';
    todayBtn.addEventListener('click', () => {
      this.currentDate = new Date();
      this.renderCalendar();
    });
    viewModeContainer.appendChild(todayBtn);
    
    // Create action buttons
    // 1. New Event button
    const newEventBtn = document.createElement('button');
    newEventBtn.id = 'newEventBtn';
    newEventBtn.className = 'btn btn-primary btn-sm';
    newEventBtn.innerHTML = '<i class="fas fa-plus"></i> New Event';
    newEventBtn.addEventListener('click', () => this.showEventModal());
    actionButtonsContainer.appendChild(newEventBtn);
    
    // 2. Block Date button
    const blockDateBtn = document.createElement('button');
    blockDateBtn.id = 'blockDateBtn';
    blockDateBtn.className = 'btn btn-outline btn-sm';
    blockDateBtn.innerHTML = '<i class="fas fa-ban"></i> Block Dates';
    blockDateBtn.addEventListener('click', this.showBlockDateModal.bind(this));
    actionButtonsContainer.appendChild(blockDateBtn);
    
    // 3. Export Calendar button
    const exportCalendarBtn = document.createElement('button');
    exportCalendarBtn.id = 'exportCalendarBtn';
    exportCalendarBtn.className = 'btn btn-outline btn-sm';
    exportCalendarBtn.innerHTML = '<i class="fas fa-file-export"></i> Export Calendar';
    exportCalendarBtn.addEventListener('click', this.exportCalendar.bind(this));
    actionButtonsContainer.appendChild(exportCalendarBtn);
    
    // Remove the original buttons to avoid duplicates
    const origBlockDateBtn = document.getElementById('blockDateBtn');
    const origExportCalendarBtn = document.getElementById('exportCalendarBtn');
    
    if (origBlockDateBtn && origBlockDateBtn.parentNode) {
      origBlockDateBtn.parentNode.removeChild(origBlockDateBtn);
    }
    
    if (origExportCalendarBtn && origExportCalendarBtn.parentNode) {
      origExportCalendarBtn.parentNode.removeChild(origExportCalendarBtn);
    }
    
    // Add responsive styling for mobile
    const style = document.createElement('style');
    style.textContent = `
      @media (max-width: 768px) {
        .view-mode-container, .action-buttons-container {
          flex-wrap: wrap;
          justify-content: center;
        }
        
        .view-mode-btn, .btn-sm {
          padding: 0.4rem 0.6rem;
          font-size: 0.75rem;
          flex-grow: 1;
          min-width: 80px;
          max-width: 120px;
        }
        
        .calendar-controls-wrapper {
          gap: 0.5rem;
        }
        
        .view-mode-container {
          margin-bottom: 0.25rem;
        }
      }
      
      @media (max-width: 480px) {
        .view-mode-btn, .btn-sm {
          padding: 0.35rem 0.5rem;
          font-size: 0.7rem;
          min-width: auto;
        }
        
        .action-buttons-container .btn-sm {
          flex-basis: calc(50% - 0.25rem);
          text-align: center;
          justify-content: center;
        }
      }
    `;
    document.head.appendChild(style);
    
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
    
    const startDate = this.parseLocalDate(startDateInput.value); // Use helper
    const endDate = this.parseLocalDate(endDateInput.value);     // Use helper
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
    let currentDate = new Date(startDate.getTime()); // Clone correctly
    endDate = new Date(endDate.getTime()); // Ensure endDate is also a new object

    // Check each day in the range (inclusive)
    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // Check if date is blocked
      if (this.blockedDates[dateStr]) {
        return true;
      }
      
      // Check for event conflicts
      if (this.events[dateStr] && Array.isArray(this.events[dateStr])) {
        // Filter out the excluded event if provided
        const events = this.events[dateStr].filter(event => 
          !excludeEventId || event.id !== excludeEventId);
          
        // Check if any remaining events are full day
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
    if (!this.events[dateStr] || !Array.isArray(this.events[dateStr])) return false;
    
    // Convert times to minutes for easier comparison
    const start = this.timeToMinutes(startTime);
    const end = this.timeToMinutes(endTime);
    
    // Check each event on this date
    return this.events[dateStr].some(event => {
      // Skip the event we're currently editing
      if (excludeEventId && event.id === excludeEventId) return false;
      
      // Full day events conflict with any time
      if (event.fullDay) return true;

      // Skip if event doesn't have valid start/end times
      if (!event.startTime || !event.endTime) return false;
      
      // Convert event times to minutes
      const eventStart = this.timeToMinutes(event.startTime);
      const eventEnd = this.timeToMinutes(event.endTime);
      
      // Check for overlap: (start < eventEnd) and (end > eventStart)
      // Ensure comparison handles edge cases like back-to-back bookings
      return (start < eventEnd && end > eventStart);
    });
  },
  
  // Convert time string to minutes (e.g., "09:30" -> 570)
  timeToMinutes(timeStr) {
    if (!timeStr || !timeStr.includes(':')) return 0;
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
      // Get first and last day of week (assuming week starts on Sunday for calculation)
      const firstDayOfWeek = new Date(this.currentDate);
      firstDayOfWeek.setDate(this.currentDate.getDate() - this.currentDate.getDay());
      
      const lastDayOfWeek = new Date(firstDayOfWeek);
      lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
      
      // Format dates
      const firstFormat = firstDayOfWeek.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
      const lastFormat = lastDayOfWeek.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
      
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
    // Update header days (assuming Sunday first)
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
    const month = this.currentDate.getMonth(); // 0-indexed
    
    // Get first day of month and last day of month
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);
    
    // Calculate days from previous month to display
    const firstDayOfWeek = firstDayOfMonth.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    // Generate days from previous month
    for (let i = 0; i < firstDayOfWeek; i++) {
      const dayNumber = daysInPrevMonth - firstDayOfWeek + i + 1;
      const dayDate = new Date(year, month - 1, dayNumber);
      const dayElement = this.createMonthDayElement(dayDate, true); // Pass Date object
      calendarGrid.appendChild(dayElement);
    }
    
    // Generate days for current month
    for (let day = 1; day <= lastDayOfMonth.getDate(); day++) {
      const dayDate = new Date(year, month, day);
      const dayElement = this.createMonthDayElement(dayDate, false); // Pass Date object
      calendarGrid.appendChild(dayElement);
    }
    
    // Generate days from next month
    const lastDayOfWeek = lastDayOfMonth.getDay();
    const daysFromNextMonth = 6 - lastDayOfWeek;
    
    for (let i = 1; i <= daysFromNextMonth; i++) {
      const dayDate = new Date(year, month + 1, i);
      const dayElement = this.createMonthDayElement(dayDate, true); // Pass Date object
      calendarGrid.appendChild(dayElement);
    }
    
    // Add grid to container
    const container = document.querySelector('.calendar-container');
    if (container) {
      container.appendChild(calendarGrid);
    }
  },
  
  // Create a day element for the month view with improved event handling
  createMonthDayElement(date, isInactive) { // Accepts Date object
    const dayElement = document.createElement('div');
    dayElement.className = 'calendar-day';
    if (isInactive) dayElement.classList.add('inactive');
    
    // Check if date is today
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today's date
    const normalizedDate = new Date(date.getTime());
    normalizedDate.setHours(0, 0, 0, 0); // Normalize the cell's date
    if (normalizedDate.getTime() === today.getTime()) {
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
    
    // Add events for this day - with improved handling
    if (this.events[dateStr] && Array.isArray(this.events[dateStr])) {
      // Sort events by all-day first, then by start time
      const sortedEvents = [...this.events[dateStr]].sort((a, b) => {
        // Handle potential missing properties
        const aFullDay = typeof a?.fullDay === 'boolean' ? a.fullDay : false;
        const bFullDay = typeof b?.fullDay === 'boolean' ? b.fullDay : false;
        const aStartTime = a?.startTime || '00:00';
        const bStartTime = b?.startTime || '00:00';

        // All-day events first
        if (aFullDay && !bFullDay) return -1;
        if (!aFullDay && bFullDay) return 1;
        
        // Then by start time
        if (!aFullDay && !bFullDay) {
          return aStartTime.localeCompare(bStartTime);
        }
        
        return 0; // Keep original order if both are full day or mix cannot be sorted
      });
      
      // Count events for mobile display
      const eventCount = sortedEvents.length;
      
      // Limit events shown for better mobile display (show max 3)
      const displayLimit = 3;
      const displayEvents = sortedEvents.slice(0, displayLimit);
      
      displayEvents.forEach((event, index) => {
        try {
          // Ensure we have a valid event object with title
          if (!event || typeof event !== 'object') {
            console.error('Invalid event object:', event);
            return;
          }
          
          // Create event indicator
          const eventIndicator = document.createElement('div');
          eventIndicator.className = 'event-indicator';
          
          // Set event style based on type (with fallback)
          const eventType = event.type || 'regular';
          if (eventType === 'blocked') {
            eventIndicator.classList.add('blocked-event');
          } else if (eventType === 'booked') {
            eventIndicator.classList.add('booked-event');
          } else {
            eventIndicator.classList.add('regular-event');
          }
          
          // Ensure we have a title with fallback
          const eventTitle = event.title || 'Untitled Event';
          
          // Add time information if not full day (with fallback)
          let timeInfo = 'All day';
          if (event.fullDay !== true && event.startTime && event.endTime) {
            timeInfo = `${event.startTime} - ${event.endTime}`;
          }
          
          eventIndicator.innerHTML = `
            <div class="event-title">${eventTitle}</div>
            <div class="event-time">${timeInfo}</div>
          `;
          
          // For mobile, add count indicator to the first event if we're limiting display
          if (index === 0 && eventCount > displayLimit) {
            eventIndicator.dataset.count = `+${eventCount - displayLimit}`;
          }
          
          // Store event data with fallback ID if needed
          eventIndicator.dataset.eventId = event.id || `event_${Date.now()}`;
          
          // Add event handler
          eventIndicator.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent day click when clicking event
            // Pass the original date string associated with this event
            this.showEventDetails({...event, date: dateStr }); 
          });
          
          dayContent.appendChild(eventIndicator);
        } catch (error) {
          console.error('Error rendering event:', error, event);
        }
      });
      
      // If there are more events than displayed, add a "more" indicator
      if (eventCount > displayLimit) {
        const moreIndicator = document.createElement('div');
        moreIndicator.className = 'event-more-indicator';
        moreIndicator.textContent = `+ ${eventCount - displayLimit} more`;
        moreIndicator.style.cssText = `
          font-size: 0.7rem;
          color: var(--gray-600);
          text-align: center;
          margin-top: 2px;
          cursor: pointer;
        `;
        
        // Click to view all events for this day
        moreIndicator.addEventListener('click', (e) => {
          e.stopPropagation();
          // Switch to day view for this date
          this.currentDate = new Date(date.getTime()); // Use the actual date object
          this.viewMode = 'day';
          this.renderCalendar();
          
          // Update view mode buttons UI
          document.querySelectorAll('.view-mode-btn').forEach(btn => {
            if (btn.dataset.mode === 'day') {
              btn.classList.add('active');
              btn.style.backgroundColor = 'var(--primary)';
              btn.style.borderColor = 'var(--primary-dark)';
              btn.style.color = 'white';
            } else {
              btn.classList.remove('active');
              btn.style.backgroundColor = 'var(--gray-100)';
              btn.style.borderColor = 'var(--gray-300)';
              btn.style.color = document.body.classList.contains('light-mode') ? 'var(--gray-800)' : 'var(--gray-800)';
            }
          });
        });
        
        dayContent.appendChild(moreIndicator);
      }
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
        this.handleDayClick(date, dayElement); // Pass the actual Date object
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
      
      // Get first day of week (assuming Sunday start)
      const firstDayOfWeek = new Date(this.currentDate);
      firstDayOfWeek.setDate(this.currentDate.getDate() - this.currentDate.getDay());
      firstDayOfWeek.setHours(0, 0, 0, 0); // Normalize
      
      // Create day headers
      for (let i = 0; i < 7; i++) {
        const currentDayHeader = new Date(firstDayOfWeek);
        currentDayHeader.setDate(firstDayOfWeek.getDate() + i);
        
        const dayHeader = document.createElement('div');
        dayHeader.className = 'week-day-header';
        
        // Check if this is today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (currentDayHeader.getTime() === today.getTime()) {
          dayHeader.classList.add('today');
        }
        
        // Format day header
        const dayName = currentDayHeader.toLocaleDateString('en-US', { weekday: 'short' });
        const dayNum = currentDayHeader.getDate();
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
    
    // Get first day of week again for columns
    const firstDayOfWeek = new Date(this.currentDate);
    firstDayOfWeek.setDate(this.currentDate.getDate() - this.currentDate.getDay());
    firstDayOfWeek.setHours(0, 0, 0, 0); // Normalize
    
    // Create columns for each day of the week
    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(firstDayOfWeek);
      currentDay.setDate(firstDayOfWeek.getDate() + i);
      const dateStr = currentDay.toISOString().split('T')[0];
      
      // Create day column
      const dayColumn = document.createElement('div');
      dayColumn.className = 'day-column';
      dayColumn.dataset.date = dateStr;
      
      // Check if this is today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (currentDay.getTime() === today.getTime()) {
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
          
          this.showEventModal(currentDay, { // Pass Date object
            startTime,
            endTime,
            type: 'regular'
          });
        });
      }
      
      // Add events for this day
      if (this.events[dateStr] && Array.isArray(this.events[dateStr])) {
        this.events[dateStr].forEach(event => {
          try {
            // Validate event
            if (!event || typeof event !== 'object') {
              console.error('Invalid event object in week view:', event);
              return;
            }
            
            const eventTitle = event.title || 'Untitled Event';
            const eventType = event.type || 'regular';
            const eventId = event.id || `event_${Date.now()}`;
            
            if (event.fullDay) {
              // Full day event at the top
              const fullDayEvent = document.createElement('div');
              fullDayEvent.className = 'full-day-event';
              
              // Set event style based on type
              if (eventType === 'blocked') {
                fullDayEvent.classList.add('blocked-event');
              } else if (eventType === 'booked') {
                fullDayEvent.classList.add('booked-event');
              } else {
                fullDayEvent.classList.add('regular-event');
              }
              
              fullDayEvent.textContent = eventTitle;
              fullDayEvent.dataset.eventId = eventId;
              fullDayEvent.addEventListener('click', () => this.showEventDetails({...event, date: dateStr})); // Pass date string
              
              // Insert at the beginning
              dayColumn.insertBefore(fullDayEvent, dayColumn.firstChild);
            } else {
              // Time-specific event
              const startTime = event.startTime || '00:00';
              const endTime = event.endTime || '23:59';
              
              // Validate time format before splitting
              if (!startTime.includes(':') || !endTime.includes(':')) {
                 console.warn('Invalid time format for event:', event);
                 return; // Skip rendering this event
              }
              
              const [startHour, startMinute] = startTime.split(':').map(Number);
              const [endHour, endMinute] = endTime.split(':').map(Number);
              
              // Calculate position and height (assuming 60px per hour in CSS)
              const pixelsPerHour = 60; 
              const startFromTop = (startHour + startMinute / 60) * pixelsPerHour;
              const durationMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
              let height = (durationMinutes / 60) * pixelsPerHour;
              
              // Ensure minimum height for visibility
              height = Math.max(height, 15); // Minimum height of 15px

              const eventElement = document.createElement('div');
              eventElement.className = 'time-event';
              
              // Set event style based on type
              if (eventType === 'blocked') {
                eventElement.classList.add('blocked-event');
              } else if (eventType === 'booked') {
                eventElement.classList.add('booked-event');
              } else {
                eventElement.classList.add('regular-event');
              }
              
              eventElement.style.top = `${startFromTop}px`;
              eventElement.style.height = `${height}px`;
              
              eventElement.innerHTML = `
                <div class="event-title">${eventTitle}</div>
                <div class="event-time">${startTime} - ${endTime}</div>
              `;
              
              eventElement.dataset.eventId = eventId;
              eventElement.addEventListener('click', () => this.showEventDetails({...event, date: dateStr})); // Pass date string
              
              dayColumn.appendChild(eventElement);
            }
          } catch (error) {
            console.error('Error rendering week view event:', error, event);
          }
        });
      }
      
      // Add column to week container
      weekContainer.appendChild(dayColumn);
      
      // Add click handler for empty spaces
      dayColumn.addEventListener('click', (e) => {
        if (e.target === dayColumn) {
          this.handleDayClick(currentDay); // Pass Date object
        }
      });
    }
    
    // Add week container to calendar container
    const container = document.querySelector('.calendar-container');
    if (container) {
      container.appendChild(weekContainer);
      
      // Add custom styles for week view (if not already present)
       if (!document.getElementById('week-view-styles')) {
        const style = document.createElement('style');
        style.id = 'week-view-styles'; // Add ID to prevent duplication
        style.textContent = `
            /* Styles copied from original code... */
            .week-container {
              display: grid;
              /* Ensure time column width matches header */
              grid-template-columns: 60px repeat(7, 1fr); 
              height: 1440px; /* 24 hours * 60px/hour */
              overflow-y: auto;
              border: 1px solid var(--gray-300);
              border-radius: 8px;
              position: relative; /* Needed for absolute positioning of events */
            }
            
            .time-column, .day-column {
              display: flex;
              flex-direction: column;
              position: relative; /* Needed for events */
            }
            
            .hour-cell {
              height: 60px; /* Matches pixelsPerHour */
              border-bottom: 1px solid var(--gray-300);
              border-right: 1px solid var(--gray-300);
              padding: 0 0.25rem;
              font-size: 0.75rem;
              color: var(--gray-600);
              display: flex;
              align-items: flex-start;
              box-sizing: border-box; /* Include padding/border in height */
            }
            
            .time-column .hour-cell {
              justify-content: flex-end;
              padding-right: 0.5rem;
            }
            
            .day-column {
              background-color: var(--gray-100);
              position: relative; /* For event positioning */
            }

            .day-column:last-child .hour-cell {
                border-right: none; /* Remove right border on last day column */
            }
            
            .day-column.today {
              background-color: rgba(var(--primary-rgb, 255, 123, 0), 0.05);
            }
            
            .day-column.blocked {
              background-color: rgba(var(--danger-rgb, 255, 59, 48), 0.05);
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
              box-sizing: border-box; /* Include padding/border */
            }
            
            .full-day-event {
              margin: 2px;
              padding: 0.25rem;
              border-radius: 4px;
              font-size: 0.7rem;
              z-index: 3; /* Above timed events */
              box-shadow: var(--shadow-sm);
              cursor: pointer;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
              position: relative; /* Ensure it's part of the layout */
            }
            
            .blocked-day-indicator {
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              bottom: 0;
              background-color: rgba(var(--danger-rgb, 255, 59, 48), 0.1);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 1; /* Below events */
              font-size: 1.5rem;
              color: var(--danger);
              font-weight: 500;
              opacity: 0.5;
              pointer-events: none; /* Allow clicks through */
            }
            
            .regular-event {
              background-color: rgba(var(--primary-rgb, 255, 123, 0), 0.2);
              border-left: 3px solid var(--primary);
              color: var(--primary-dark); /* Ensure text is visible */
            }
            
            .booked-event {
              background-color: rgba(0, 122, 255, 0.2);
              border-left: 3px solid #007aff;
              color: #005bb5; /* Ensure text is visible */
            }
            
            .blocked-event {
              background-color: rgba(var(--danger-rgb, 255, 59, 48), 0.2);
              border-left: 3px solid var(--danger);
              color: var(--danger); /* Ensure text is visible */
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
              /* Match week container columns */
              grid-template-columns: 60px repeat(7, 1fr); 
              gap: 0;
              margin-bottom: 0; /* Override default margin if any */
            }
            
            .week-day-header {
              padding: 0.5rem;
              text-align: center;
              font-weight: 500;
              border-top: 1px solid var(--gray-300);
              border-right: 1px solid var(--gray-300);
              border-bottom: 1px solid var(--gray-300); /* Add bottom border */
              background-color: var(--gray-200);
            }
            
            .week-day-header:last-child {
              border-right: none; /* No right border on last header */
            }

            .week-day-header.today {
              background-color: rgba(var(--primary-rgb, 255, 123, 0), 0.1);
              font-weight: bold;
            }
            
            .time-column-header {
              border: 1px solid var(--gray-300);
              border-bottom: 1px solid var(--gray-300); /* Match day header */
              border-left: none; /* Align with grid */
              background-color: var(--gray-200);
            }
            
            @media (max-width: 768px) {
              .week-container {
                height: 1000px; /* Adjust height */
              }
              
              .time-event, .full-day-event {
                font-size: 0.6rem;
                padding: 0.15rem;
              }
              
              .event-time {
                font-size: 0.55rem;
              }
            }
            
            @media (max-width: 480px) {
              .time-column, .time-column-header {
                width: 40px; /* Adjust time column width */
              }
              
              .week-container {
                grid-template-columns: 40px repeat(7, 1fr);
              }
              
              .calendar-header {
                grid-template-columns: 40px repeat(7, 1fr);
              }
              
              .time-column .hour-cell {
                padding-right: 0.25rem;
                font-size: 0.6rem;
              }
              
              .week-day-header {
                padding: 0.25rem;
                font-size: 0.75rem;
              }
              
              .week-day-header .day-number {
                font-size: 0.9rem;
              }
            }
        `;
        document.head.appendChild(style);
       }
    }
  },
  
  // Render day view calendar
  renderDayView() {
    // Create day view container
    const dayContainer = document.createElement('div');
    dayContainer.className = 'day-view-container';
    
    // Format current date for lookup and display
    const dateStr = this.currentDate.toISOString().split('T')[0];
    
    // Create header area for full-day events
    const allDaySection = document.createElement('div');
    allDaySection.className = 'all-day-section';
    allDaySection.innerHTML = `
      <div class="all-day-label">All Day</div>
      <div class="all-day-events"></div>
    `;
    
    const allDayEventsContainer = allDaySection.querySelector('.all-day-events');

    // Check if date is blocked
    if (this.blockedDates[dateStr]) {
      allDayEventsContainer.innerHTML = `
        <div class="all-day-event blocked-event">
          <div class="event-title">${this.blockedDates[dateStr] || 'Unavailable'}</div>
        </div>
      `;
      // Add blocked styling to container (affects time grid)
      dayContainer.classList.add('blocked-day');
    }
    
    // Add full day events
    if (this.events[dateStr] && Array.isArray(this.events[dateStr])) {
      const fullDayEvents = this.events[dateStr].filter(event => event && event.fullDay);
      
      if (fullDayEvents.length > 0) {
        fullDayEvents.forEach(event => {
          try {
            // Validate event
            if (!event || typeof event !== 'object') {
              console.error('Invalid full day event:', event);
              return;
            }
            
            const eventElement = document.createElement('div');
            eventElement.className = 'all-day-event';
            
            const eventTitle = event.title || 'Untitled Event';
            const eventType = event.type || 'regular';
            const eventId = event.id || `event_${Date.now()}`;
            
            // Add styling based on event type
            if (eventType === 'blocked') {
              eventElement.classList.add('blocked-event');
            } else if (eventType === 'booked') {
              eventElement.classList.add('booked-event');
            } else {
              eventElement.classList.add('regular-event');
            }
            
            eventElement.innerHTML = `<div class="event-title">${eventTitle}</div>`;
            eventElement.dataset.eventId = eventId;
            eventElement.addEventListener('click', () => this.showEventDetails({...event, date: dateStr})); // Pass date string
            
            allDayEventsContainer.appendChild(eventElement);
          } catch (error) {
            console.error('Error rendering full day event:', error, event);
          }
        });
      }
    }
    
    // Create time grid container which will hold events absolutely positioned
    const timeGridContainer = document.createElement('div');
    timeGridContainer.className = 'day-time-grid-container'; // Wrapper
    timeGridContainer.style.position = 'relative'; // Needed for absolute event positioning
    
    // Create the visual time grid (background lines and labels)
    const timeGridBackground = document.createElement('div');
    timeGridBackground.className = 'day-time-grid-background';

    // Add hour rows to the background grid
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
        <div class="hour-content"></div>
      `;
      
      // Add click handler to create new event on the content area
      hourRow.querySelector('.hour-content').addEventListener('click', (e) => {
        if (e.target === hourRow.querySelector('.hour-content')) {
          // Calculate start time based on clicked hour
          const startTime = `${hour.toString().padStart(2, '0')}:00`;
          const endTime = `${(hour + 1).toString().padStart(2, '0')}:00`;
          
          this.showEventModal(this.currentDate, { // Pass Date object
            startTime,
            endTime,
            type: 'regular'
          });
        }
      });
      
      timeGridBackground.appendChild(hourRow);
    }

    // Append background grid first
    timeGridContainer.appendChild(timeGridBackground);

    // Create container for timed events (positioned over the background)
    const timedEventsContainer = document.createElement('div');
    timedEventsContainer.className = 'day-timed-events';
    timedEventsContainer.style.position = 'absolute';
    timedEventsContainer.style.top = '0';
    timedEventsContainer.style.left = '80px'; // Match hour-label width + border
    timedEventsContainer.style.right = '0';
    timedEventsContainer.style.bottom = '0';
    timedEventsContainer.style.pointerEvents = 'none'; // Allow clicks to pass through to background grid

    // Add timed events to their container
    if (this.events[dateStr] && Array.isArray(this.events[dateStr])) {
      const timedEvents = this.events[dateStr].filter(event => event && !event.fullDay);
      
      timedEvents.forEach(event => {
        try {
          // Validate event
          if (!event || typeof event !== 'object') {
            console.error('Invalid timed event:', event);
            return;
          }
          
          const eventTitle = event.title || 'Untitled Event';
          const eventType = event.type || 'regular';
          const eventId = event.id || `event_${Date.now()}`;
          const eventDescription = event.description || '';
          
          const startTime = event.startTime || '00:00';
          const endTime = event.endTime || '23:59';

          // Validate time format before splitting
          if (!startTime.includes(':') || !endTime.includes(':')) {
             console.warn('Invalid time format for event:', event);
             return; // Skip rendering this event
          }
          
          const [startHour, startMinute] = startTime.split(':').map(Number);
          const [endHour, endMinute] = endTime.split(':').map(Number);
          
          // Calculate position and height (assuming 60px per hour)
          const pixelsPerHour = 60;
          const startFromTop = (startHour + startMinute / 60) * pixelsPerHour;
          const durationMinutes = (endHour * 60 + endMinute) - (startHour * 60 + startMinute);
          let height = (durationMinutes / 60) * pixelsPerHour;

          // Ensure minimum height
          height = Math.max(height, 15); // Min 15px height
          
          const eventElement = document.createElement('div');
          eventElement.className = 'day-time-event';
          eventElement.style.pointerEvents = 'auto'; // Make events clickable
          
          // Set event style based on type
          if (eventType === 'blocked') {
            eventElement.classList.add('blocked-event');
          } else if (eventType === 'booked') {
            eventElement.classList.add('booked-event');
          } else {
            eventElement.classList.add('regular-event');
          }
          
          eventElement.style.top = `${startFromTop}px`;
          eventElement.style.height = `${height}px`;
          
          eventElement.innerHTML = `
            <div class="event-title">${eventTitle}</div>
            <div class="event-time">${startTime} - ${endTime}</div>
            ${eventDescription ? `<div class="event-description">${eventDescription}</div>` : ''}
          `;
          
          eventElement.dataset.eventId = eventId;
          eventElement.addEventListener('click', () => this.showEventDetails({...event, date: dateStr})); // Pass date string
          
          timedEventsContainer.appendChild(eventElement);
        } catch (error) {
          console.error('Error rendering timed event:', error, event);
        }
      });
    }

    // Append timed events container on top
    timeGridContainer.appendChild(timedEventsContainer);
    
    // Add all day section and time grid container to the main day container
    dayContainer.appendChild(allDaySection);
    
    // Wrap the time grid container in a scrollable div
    const scrollableGrid = document.createElement('div');
    scrollableGrid.className = 'day-view-scrollable';
    scrollableGrid.style.overflowY = 'auto';
    scrollableGrid.style.flex = '1'; // Take remaining height
    scrollableGrid.appendChild(timeGridContainer);
    
    dayContainer.appendChild(scrollableGrid);
    
    // Add day container to calendar container
    const container = document.querySelector('.calendar-container');
    if (container) {
      container.appendChild(dayContainer);
      
      // Add custom styles for day view (if not already present)
      if (!document.getElementById('day-view-styles')) {
        const style = document.createElement('style');
        style.id = 'day-view-styles'; // Add ID
        style.textContent = `
            .day-view-container {
              display: flex;
              flex-direction: column;
              height: calc(100vh - 200px); /* Adjust height calculation as needed */
              min-height: 500px; /* Minimum height */
              border: 1px solid var(--gray-300);
              border-radius: 8px;
              overflow: hidden;
            }
            
            .all-day-section {
              display: flex;
              border-bottom: 1px solid var(--gray-300);
              flex-shrink: 0; /* Prevent shrinking */
            }
            
            .all-day-label {
              width: 80px; /* Match hour label width */
              padding: 0.5rem;
              font-size: 0.875rem;
              font-weight: 500;
              background-color: var(--gray-200);
              display: flex;
              align-items: center;
              border-right: 1px solid var(--gray-300);
              box-sizing: border-box;
            }
            
            .all-day-events {
              flex: 1;
              padding: 0.5rem;
              display: flex;
              flex-direction: column;
              gap: 0.25rem; /* Tighter spacing for all-day */
              background-color: var(--gray-100); /* Background for events */
            }
            
            .all-day-event {
              padding: 0.25rem 0.5rem; /* Smaller padding */
              border-radius: 4px;
              font-size: 0.75rem; /* Smaller font */
              cursor: pointer;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .day-view-scrollable {
              overflow-y: auto;
              flex-grow: 1; /* Allows scrolling */
            }
            
            .day-time-grid-container {
                position: relative; /* For absolute event positioning */
                height: 1440px; /* 24 * 60px */
            }

            .day-time-grid-background {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                z-index: 0; /* Background layer */
            }
            
            .hour-row {
              display: flex;
              height: 60px; /* Matches pixelsPerHour */
              border-bottom: 1px solid var(--gray-300);
              box-sizing: border-box;
            }

             .hour-row:last-child {
                border-bottom: none; /* No bottom border on last row */
            }
            
            .hour-label {
              width: 80px; /* Fixed width */
              padding: 0 0.5rem;
              font-size: 0.75rem;
              color: var(--gray-600);
              display: flex;
              align-items: flex-start;
              justify-content: flex-end;
              background-color: var(--gray-200);
              border-right: 1px solid var(--gray-300);
              box-sizing: border-box;
              flex-shrink: 0;
            }
            
            .hour-content {
              flex: 1; /* Takes remaining width */
              background-color: var(--gray-100);
              position: relative; /* Can be used for half-hour lines if needed */
            }

             .day-view-container.blocked-day .hour-content {
                background-color: rgba(var(--danger-rgb, 255, 59, 48), 0.05); /* Apply blocked bg */
            }

            .day-timed-events {
                position: absolute;
                top: 0;
                left: 80px; /* Align with content area */
                right: 0;
                bottom: 0;
                z-index: 1; /* Events above background */
                pointer-events: none; /* Allow clicks to background unless hitting an event */
            }
            
            .day-time-event {
              position: absolute;
              left: 4px; /* Padding from edge */
              right: 4px; /* Padding from edge */
              padding: 0.25rem 0.5rem;
              border-radius: 4px;
              font-size: 0.75rem;
              overflow: hidden;
              box-shadow: var(--shadow-sm);
              cursor: pointer;
              box-sizing: border-box;
              pointer-events: auto; /* Make events clickable */
              z-index: 2; /* Events above other elements */
            }

            /* --- Event Colors (copied) --- */
            .regular-event {
              background-color: rgba(var(--primary-rgb, 255, 123, 0), 0.2);
              border-left: 3px solid var(--primary);
              color: var(--primary-dark);
            }
            
            .booked-event {
              background-color: rgba(0, 122, 255, 0.2);
              border-left: 3px solid #007aff;
              color: #005bb5;
            }
            
            .blocked-event {
              background-color: rgba(var(--danger-rgb, 255, 59, 48), 0.2);
              border-left: 3px solid var(--danger);
              color: var(--danger);
            }
            /* --- End Event Colors --- */
            
            .event-description {
              font-size: 0.7rem; /* Smaller description */
              margin-top: 0.15rem;
              opacity: 0.8;
              white-space: normal; /* Allow wrapping */
              overflow: hidden; /* Hide overflow */
            }
            
            @media (max-width: 768px) {
              .day-view-container { height: calc(100vh - 180px); } /* Adjust height */
              .all-day-label, .hour-label { width: 60px; font-size: 0.7rem; }
              .day-timed-events { left: 60px; }
              .day-time-event, .all-day-event { font-size: 0.7rem; padding: 0.2rem 0.4rem;}
              .event-description { font-size: 0.65rem; }
            }
            
            @media (max-width: 480px) {
              .all-day-label, .hour-label { width: 50px; font-size: 0.65rem; padding: 0 0.25rem;}
              .day-timed-events { left: 50px; }
              .all-day-event { font-size: 0.7rem; }
              .day-time-event { font-size: 0.65rem; padding: 0.15rem 0.3rem;}
            }
        `;
        document.head.appendChild(style);
      }
    }
  },
  
  // Handle day click (for date selection or details)
  handleDayClick(date, element) { // Accepts Date object
    // Open the event creation modal for the specific date
    this.showEventModal(date); // Pass Date object
  },
  
  // Show event creation/edit modal
  showEventModal(date = null, eventData = null) { // date should be a Date object
    // Store current event data as an object property
    this.currentEventData = eventData;
    
    // Ensure 'date' is a valid Date object, default to today if not
    let currentEventDate;
    if (date instanceof Date && !isNaN(date)) {
        currentEventDate = date;
    } else {
        console.warn("Invalid or missing date passed to showEventModal, defaulting to today.");
        currentEventDate = new Date();
        currentEventDate.setHours(0, 0, 0, 0); // Normalize to start of day
    }
  
    // Format date string for input field (YYYY-MM-DD)
    const dateStr = currentEventDate.toISOString().split('T')[0];
    // Format date for display
    const formattedDate = currentEventDate.toLocaleDateString('en-US', { 
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
    
    // Set date input value (always YYYY-MM-DD format)
    form.querySelector('#eventDate').value = dateStr;
    
    // Make date picker visible only for editing
    form.querySelector('#eventDate').style.display = isEditing ? 'block' : 'none';
    form.querySelector('#eventDateLabel').style.display = isEditing ? 'block' : 'none';
    
    // Set the human-readable date display
    form.querySelector('#eventDateDisplay').textContent = formattedDate;
    
    // Add label hint for date picker when editing
    if (isEditing) {
      form.querySelector('#eventDateLabel').innerHTML = 'Change Date:';
    }
    
    // Set event type
    const eventType = form.querySelector('#eventType');
    eventType.value = event?.type || 'regular';
    
    // Set event details if editing
    if (isEditing) {
      form.querySelector('#eventId').value = event.id;
      form.querySelector('#eventTitle').value = event.title || '';
      form.querySelector('#eventDescription').value = event.description || '';
      form.querySelector('#eventFullDay').checked = event.fullDay === true;
      
      if (!event.fullDay) {
        form.querySelector('#eventStartTime').value = event.startTime || '00:00';
        form.querySelector('#eventEndTime').value = event.endTime || '23:59';
      }
      
      // Show delete button
      form.querySelector('#deleteEventBtn').style.display = 'inline-block'; // Use inline-block for btn-group
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
      
      // Set time if provided (e.g., clicking on a specific hour)
      form.querySelector('#eventFullDay').checked = false; // Default to not full day
      form.querySelector('#eventStartTime').value = event?.startTime || '09:00';
      form.querySelector('#eventEndTime').value = event?.endTime || '10:00';
      
      // Hide delete button
      form.querySelector('#deleteEventBtn').style.display = 'none';
    }
    
    // Toggle time inputs based on full day
    this.toggleEventTimeInputs();
    
    // Clear any previous warnings
     if (modal.querySelector('#timeConflictWarning')) {
        modal.querySelector('#timeConflictWarning').style.display = 'none';
     }
    
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
      
      <div style="margin-bottom: 0.5rem;">
        <label>Date:</label>
        <div id="eventDateDisplay" style="font-weight: 500;"></div>
      </div>

      <div class="form-group" style="margin-bottom: 1.5rem;">
        <label for="eventDate" id="eventDateLabel" style="display: none;">Change Date:</label>
        <input type="date" id="eventDate" style="display: none;">
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
            <p>This time slot conflicts with another event or is invalid.</p>
          </div>
        </div>
      </div>
      
      <div class="btn-group" style="justify-content: flex-end;">
        <button type="button" class="btn btn-outline" id="cancelEventBtn">
          <i class="fas fa-times"></i> Cancel
        </button>
         <button type="button" id="deleteEventBtn" class="btn btn-danger" style="display: none;">
          <i class="fas fa-trash"></i> Delete
        </button>
        <button type="submit" class="btn btn-primary">
          <i class="fas fa-save"></i> Save Event
        </button>
      </div>
    `;
    
    // Add everything to DOM
    content.appendChild(closeBtn);
    content.appendChild(form);
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Add event listeners
    form.querySelector('#eventFullDay').addEventListener('change', () => {
        this.toggleEventTimeInputs();
        this.validateEventTimes(); // Re-validate when toggling full day
    });
    form.querySelector('#cancelEventBtn').addEventListener('click', () => modal.style.display = 'none');
    form.querySelector('#deleteEventBtn').addEventListener('click', () => this.deleteEvent());
    
    // Add time input validation on change
    form.querySelector('#eventStartTime').addEventListener('change', () => this.validateEventTimes());
    form.querySelector('#eventEndTime').addEventListener('change', () => this.validateEventTimes());
     // Also validate when event type changes (e.g., from blocked to regular)
    form.querySelector('#eventType').addEventListener('change', () => this.validateEventTimes());
    // And when date changes (if editing)
    form.querySelector('#eventDate').addEventListener('change', () => this.validateEventTimes());

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
  
  // Validate event times (both order and conflicts)
  validateEventTimes() {
    const form = this.eventModal.querySelector('#eventForm');
    const startTimeInput = form.querySelector('#eventStartTime');
    const endTimeInput = form.querySelector('#eventEndTime');
    const startTime = startTimeInput.value;
    const endTime = endTimeInput.value;
    const warning = form.querySelector('#timeConflictWarning');
    const fullDay = form.querySelector('#eventFullDay').checked;
    const saveButton = form.querySelector('button[type="submit"]');

    // Don't validate times if it's a full-day event
    if (fullDay) {
      warning.style.display = 'none';
      startTimeInput.setCustomValidity("");
      endTimeInput.setCustomValidity("");
      saveButton.disabled = false; // Ensure save is enabled
      return true;
    }

    // Check if start and end times are present
    if (!startTime || !endTime) {
        warning.style.display = 'none'; // No warning if times aren't set yet
        startTimeInput.setCustomValidity("");
        endTimeInput.setCustomValidity("");
        saveButton.disabled = false; // Or maybe true if required? Depends on logic.
        return true; // Allow saving if times are optional/being entered
    }

    // 1. Check if end time is after start time
    if (startTime >= endTime) {
      warning.style.display = 'flex'; // Use flex for alert layout
      warning.querySelector('p').textContent = 'End time must be after start time.';
      // Use HTML5 validation API for better feedback
      startTimeInput.setCustomValidity("Start time must be before end time.");
      endTimeInput.setCustomValidity("End time must be after start time.");
      saveButton.disabled = true; // Disable save on validation error
      return false;
    } else {
      startTimeInput.setCustomValidity(""); // Clear previous validation error
      endTimeInput.setCustomValidity("");
    }
    
    // 2. Check for conflicts with other events
    const eventId = form.querySelector('#eventId').value;
    const dateInput = form.querySelector('#eventDate').value;
    const date = this.parseLocalDate(dateInput); // Use helper to parse date
    
    if (this.checkTimeConflicts(date, startTime, endTime, eventId)) {
      warning.style.display = 'flex';
      warning.querySelector('p').textContent = 'This time conflicts with another event.';
      startTimeInput.setCustomValidity("Time conflict with another event.");
      endTimeInput.setCustomValidity("Time conflict with another event.");
      saveButton.disabled = true; // Disable save on validation error
      return false;
    }
    
    // No conflicts, times are valid
    warning.style.display = 'none';
    startTimeInput.setCustomValidity(""); // Ensure validation state is clear
    endTimeInput.setCustomValidity("");
    saveButton.disabled = false; // Enable save button
    return true;
  },
  
  // Save event
  async saveEvent() {
    const form = this.eventModal.querySelector('#eventForm');
    const fullDay = form.querySelector('#eventFullDay').checked;
    const saveButton = form.querySelector('button[type="submit"]');
  
    // Explicitly re-validate before saving
    if (!fullDay && !this.validateEventTimes()) {
        console.error("Attempted to save with invalid times.");
        // Optionally shake the modal or highlight the warning
        const warning = form.querySelector('#timeConflictWarning');
        if (warning) {
             warning.classList.add('shake-animation'); // Add a CSS animation class
             setTimeout(() => warning.classList.remove('shake-animation'), 500);
        }
        saveButton.disabled = true; // Ensure save is disabled
        return false; // Stop saving
    }
    
    // Get form values
    const eventId = form.querySelector('#eventId').value || `event_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`; // Ensure unique ID
    const newDateStr = form.querySelector('#eventDate').value; // YYYY-MM-DD format
    const title = form.querySelector('#eventTitle').value.trim(); // Trim whitespace
    const description = form.querySelector('#eventDescription').value.trim();
    const eventType = form.querySelector('#eventType').value;
    
    // Get time values if not full day
    let startTime = null;
    let endTime = null;
    
    if (!fullDay) {
      startTime = form.querySelector('#eventStartTime').value;
      endTime = form.querySelector('#eventEndTime').value;
      // Validation already happened, but double check times exist
       if (!startTime || !endTime) {
           console.error("Start or end time missing for non-full-day event.");
           // Display an error message
           return false;
       }
    }
  
    // Find the original date if editing
    const existingEventId = form.querySelector('#eventId').value;
    let originalDateStr = null;
    let originalEventIndex = -1;
    
    if (existingEventId) {
      // Find the original event to get its date string
      for (const dateKey in this.events) {
        if (Array.isArray(this.events[dateKey])) {
            const index = this.events[dateKey].findIndex(e => e && e.id === existingEventId);
            if (index !== -1) {
              originalDateStr = dateKey; // The key is the original date string
              originalEventIndex = index;
              break;
            }
        }
      }
    }
    
    // Handle date change: Remove event from original date if it changed
    if (originalDateStr && originalDateStr !== newDateStr && originalEventIndex !== -1) {
        console.log(`Date changed for event ${existingEventId} from ${originalDateStr} to ${newDateStr}. Removing from old date.`);
        this.events[originalDateStr].splice(originalEventIndex, 1);
        // Clean up empty date array
        if (this.events[originalDateStr].length === 0) {
            delete this.events[originalDateStr];
        }
        originalEventIndex = -1; // Reset index as it's now in a new array (potentially)
    }
  
    // Create the event object
    const event = {
        id: eventId,
        date: newDateStr, // Store the YYYY-MM-DD string
        title: title || (eventType === 'blocked' ? 'Unavailable' : 'Untitled Event'), // Default title
        description,
        type: eventType,
        fullDay,
        // Only include time if not full day
        ...( !fullDay && { startTime, endTime } ),
        // Preserve client data if it exists
        ...( this.currentEventData?.clientData && { clientData: this.currentEventData.clientData } ) 
    };
  
    // Handle specific logic for 'blocked' type
    if (eventType === 'blocked' && fullDay) {
        // Add to blockedDates dictionary
        this.blockedDates[newDateStr] = event.title;
        console.log(`Blocking date ${newDateStr} with reason: ${event.title}`);
  
        // If this was previously a different type of event on this date, remove it from events list
        if (this.events[newDateStr]) {
             this.events[newDateStr] = this.events[newDateStr].filter(e => e.id !== eventId);
             if (this.events[newDateStr].length === 0) {
                delete this.events[newDateStr];
            }
        }
    } else {
        // Add or update in the events object
        // Ensure the array exists for the new date
        if (!this.events[newDateStr]) {
            this.events[newDateStr] = [];
        } else if (!Array.isArray(this.events[newDateStr])) {
            console.warn(`Correcting non-array events for ${newDateStr}`);
            this.events[newDateStr] = []; // Initialize if corrupt
        }
  
        // Find if event already exists on the *new* date
        let existingIndexOnNewDate = this.events[newDateStr].findIndex(e => e && e.id === eventId);
  
        if (existingIndexOnNewDate !== -1) {
            // Update existing event on the potentially new date
            console.log(`Updating event ${eventId} on date ${newDateStr}`);
            this.events[newDateStr][existingIndexOnNewDate] = event;
        } else {
            // Add as a new event to the new date
            console.log(`Adding new event ${eventId} to date ${newDateStr}`);
            this.events[newDateStr].push(event);
        }
  
        // If it was previously blocked, unblock the date
        if (this.blockedDates[newDateStr] && eventType !== 'blocked') {
             console.log(`Unblocking date ${newDateStr} as event type changed.`);
             delete this.blockedDates[newDateStr];
        }
         // Also unblock the *original* date if the event moved *and* was blocking
         if (originalDateStr && originalDateStr !== newDateStr && this.blockedDates[originalDateStr] && 
             this.currentEventData?.type === 'blocked' && this.currentEventData?.fullDay) {
             console.log(`Unblocking original date ${originalDateStr} as blocking event moved.`);
             delete this.blockedDates[originalDateStr];
         }
    }
    
    // --- Save changes ---
    try {
        await this.saveAvailability();
        
        // Refresh calendar and upcoming bookings
        this.renderCalendar();
        this.renderUpcomingBookings();
        
        // Close modal
        this.eventModal.style.display = 'none';
        
        // Optionally show a success notification
        // Utils.showNotification('Event saved successfully!', 'success');
  
        return true;
  
    } catch (error) {
        console.error("Error saving availability after saving event:", error);
        // Show error notification to user
        // Utils.showNotification('Failed to save event changes. Please try again.', 'error');
        saveButton.disabled = false; // Re-enable button on save failure
        return false;
    }
  },
  
  // Delete event
  async deleteEvent() { // Make async to handle save
    const form = this.eventModal.querySelector('#eventForm');
    const eventId = form.querySelector('#eventId').value;
    // Get the date string *currently* selected in the modal's date input
    const currentModalDateStr = form.querySelector('#eventDate').value; 
    
    if (!eventId) {
        console.error("Cannot delete event: No event ID found.");
        return;
    }

    // Find the event across all dates to be sure
    let eventDateStr = null;
    let eventIndex = -1;
    let eventToDelete = null;

    for (const dateKey in this.events) {
        if (Array.isArray(this.events[dateKey])) {
            const index = this.events[dateKey].findIndex(e => e && e.id === eventId);
            if (index !== -1) {
                eventDateStr = dateKey;
                eventIndex = index;
                eventToDelete = this.events[dateKey][index];
                break;
            }
        }
    }

    // Confirm deletion
    const eventTitle = eventToDelete?.title || "this event";
    if (confirm(`Are you sure you want to delete "${eventTitle}"?`)) {
        
        let deleted = false;

        // Check if it's an event in the `events` object
        if (eventDateStr !== null && eventIndex !== -1) {
            console.log(`Deleting event ${eventId} from date ${eventDateStr}`);
            this.events[eventDateStr].splice(eventIndex, 1);
            
            // If no events left, remove the date array
            if (this.events[eventDateStr].length === 0) {
                delete this.events[eventDateStr];
            }
            deleted = true;
        }

        // Check if it corresponds to a blocked date (using the date from modal)
        // This handles deleting a 'blocked' type event correctly
        if (this.blockedDates[currentModalDateStr] && eventToDelete?.type === 'blocked' && eventToDelete?.fullDay) {
            console.log(`Deleting blocked date ${currentModalDateStr}`);
            delete this.blockedDates[currentModalDateStr];
            deleted = true;
        } else if (this.blockedDates[eventDateStr] && eventToDelete?.type === 'blocked' && eventToDelete?.fullDay) {
             // Fallback check using found event date string
             console.log(`Deleting blocked date ${eventDateStr} (fallback check)`);
             delete this.blockedDates[eventDateStr];
             deleted = true;
        }

        if (!deleted) {
            console.warn(`Could not find event with ID ${eventId} to delete in events or blocked dates.`);
            // Optionally inform the user
            return; // Nothing to save
        }
      
        // Save changes
        try {
            await this.saveAvailability();
            
            // Refresh calendar and upcoming bookings
            this.renderCalendar();
            this.renderUpcomingBookings();
            
            // Close modal
            this.eventModal.style.display = 'none';

             // Show success notification
             // Utils.showNotification('Event deleted successfully.', 'success');

        } catch (error) {
            console.error("Error saving availability after deleting event:", error);
            // Show error notification
            // Utils.showNotification('Failed to save deletion. Please try again.', 'error');
        }
    }
  },
  
  // Show event details with improved validation
  showEventDetails(event) { // event object should include its original 'date' string
    // Add data validation for event object
    if (!event || typeof event !== 'object' || !event.date) {
      console.error('Invalid event object passed to showEventDetails (must include date string):', event);
      return;
    }
    
    // Ensure we have required properties with fallbacks
    const validatedEvent = {
      id: event.id || `event_${Date.now()}`,
      date: event.date, // Keep original date string
      title: event.title || 'Untitled Event',
      description: event.description || '',
      type: event.type || 'regular',
      fullDay: typeof event.fullDay === 'boolean' ? event.fullDay : false,
      startTime: event.startTime || '00:00',
      endTime: event.endTime || '23:59',
      clientData: event.clientData || null
    };
    
    // Parse the date string into a Date object for the modal
    const eventDateObject = this.parseLocalDate(validatedEvent.date);
    
    // For booked events, add option to cancel booking
    if (validatedEvent.type === 'booked') {
      // Create a custom modal for booking details with cancel option
      this.showBookingDetailsModal(validatedEvent, eventDateObject); // Pass Date object too
      return;
    }
    
    // For regular or blocked events, show in edit mode
    this.showEventModal(eventDateObject, validatedEvent); // Pass Date object and validated data
  },
  
  // Updated showBookingDetailsModal function that prevents duplicate buttons
  showBookingDetailsModal(event, eventDateObject) { // Accepts validated event and Date object
    // Create modal if it doesn't exist
    if (!this.bookingDetailsModal) {
      this.createBookingDetailsModal();
    }
    
    const modal = this.bookingDetailsModal;
    const modalContent = modal.querySelector('.modal-content');
    
    // Use the provided Date object for formatting
    const formatOptions = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    const formattedDate = eventDateObject.toLocaleDateString('en-US', formatOptions);
    
    // Get client data if available
    const clientData = event.clientData || {};
    
    // Update modal title and content
    modalContent.querySelector('.modal-title').textContent = `Booking: ${event.title}`;
    
    const detailsContent = modalContent.querySelector('.booking-details-content');
    detailsContent.innerHTML = `
      <div class="booking-detail-row">
        <div class="booking-detail-label">Client:</div>
        <div class="booking-detail-value">${clientData.clientName || event.title}</div>
      </div>
      <div class="booking-detail-row">
        <div class="booking-detail-label">Project:</div>
        <div class="booking-detail-value">${clientData.projectName || event.description || 'N/A'}</div>
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
          ${event.fullDay ? 'All Day' : `${event.startTime || 'N/A'} - ${event.endTime || 'N/A'}`}
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
      ${event.description && event.description !== clientData.projectName ? `
      <div class="booking-detail-row">
        <div class="booking-detail-label">Notes:</div>
        <div class="booking-detail-value">${event.description}</div>
      </div>
      ` : ''}
    `;
    
    // Store event data in modal for reference in cancel/edit function
    modal.dataset.eventId = event.id;
    modal.dataset.eventDateStr = event.date; // Store the original date string
    
    // IMPORTANT: Reset the button group to avoid duplicate buttons
    const btnGroup = modalContent.querySelector('.btn-group');
    btnGroup.innerHTML = '';
    
    // Add all buttons in the correct order
    
    // 1. Close button
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.id = 'closeBookingDetailsBtn';
    closeBtn.className = 'btn btn-outline';
    closeBtn.innerHTML = '<i class="fas fa-times"></i> Close';
    closeBtn.addEventListener('click', () => {
      modal.style.display = 'none';
    });
    btnGroup.appendChild(closeBtn);
    
    // 2. Cancel booking button
    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.id = 'cancelBookingBtn';
    cancelBtn.className = 'btn btn-danger';
    cancelBtn.innerHTML = '<i class="fas fa-ban"></i> Cancel Booking';
    cancelBtn.addEventListener('click', () => {
      // Retrieve stored data
      const eventId = modal.dataset.eventId;
      const eventDateStr = modal.dataset.eventDateStr; 
      if (eventId && eventDateStr) {
          this.handleCancelBooking(eventId, eventDateStr);
          modal.style.display = 'none';
      } else {
          console.error("Could not cancel booking: event ID or date string missing from modal data.");
      }
    });
    btnGroup.appendChild(cancelBtn);
    
    // 3. Edit button
    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.id = 'editBookingBtn';
    editBtn.className = 'btn btn-primary';
    editBtn.innerHTML = '<i class="fas fa-edit"></i> Edit';
    editBtn.addEventListener('click', () => {
      modal.style.display = 'none';
      // Pass the Date object and event data to the edit modal
      this.showEventModal(eventDateObject, event);
    });
    btnGroup.appendChild(editBtn);
    
    // 4. Create Invoice button
    const createInvoiceBtn = document.createElement('button');
    createInvoiceBtn.id = 'createInvoiceFromEventBtn';
    createInvoiceBtn.className = 'btn btn-primary';
    createInvoiceBtn.innerHTML = '<i class="fas fa-file-invoice-dollar"></i> Create Invoice';
    createInvoiceBtn.addEventListener('click', () => {
      modal.style.display = 'none'; // Hide booking details modal
      this.showInvoiceFromEventModal(event); // Show invoice creation modal with the event data
    });
    btnGroup.appendChild(createInvoiceBtn);
    
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
      
      <div class="booking-details-content" style="margin-bottom: 1.5rem; line-height: 1.6;">
        </div>
      
       <style>
          .booking-detail-row { display: flex; margin-bottom: 0.5rem; }
          .booking-detail-label { font-weight: 500; width: 90px; color: var(--gray-600); flex-shrink: 0; }
          .booking-detail-value { flex-grow: 1; }
       </style>

      <div class="btn-group" style="justify-content: flex-end;">
        <button type="button" class="btn btn-outline" id="closeBookingDetailsBtn">
          <i class="fas fa-times"></i> Close
        </button>
        <button type="button" id="cancelBookingBtn" class="btn btn-danger" style="display: none;">
          <i class="fas fa-ban"></i> Cancel Booking
        </button>
         <button type="button" id="editBookingBtn" class="btn btn-primary" style="display: none;">
          <i class="fas fa-edit"></i> Edit
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
    
    // Add listener for CANCEL button (using event delegation might be better if recreating modal often)
    content.querySelector('#cancelBookingBtn').addEventListener('click', () => {
      // Retrieve stored data
      const eventId = modal.dataset.eventId;
      const eventDateStr = modal.dataset.eventDateStr; 
      if (eventId && eventDateStr) {
          this.handleCancelBooking(eventId, eventDateStr); // Pass original date string
          modal.style.display = 'none';
      } else {
          console.error("Could not cancel booking: event ID or date string missing from modal data.");
      }
    });
    
    // Store modal reference
    this.bookingDetailsModal = modal;
  },
  
  // Handle cancel booking
  async handleCancelBooking(eventId, dateStr) { // Expects original date string
    if (!eventId || !dateStr || !this.events[dateStr] || !Array.isArray(this.events[dateStr])) {
      console.error(`Cannot cancel booking: Invalid data provided. Event ID: ${eventId}, Date String: ${dateStr}`);
      return;
    }
    
    // Find the event
    const eventIndex = this.events[dateStr].findIndex(e => e && e.id === eventId);
    if (eventIndex === -1) {
      console.error(`Cannot cancel booking: Event with ID ${eventId} not found on date ${dateStr}.`);
      return;
    }
    const event = this.events[dateStr][eventIndex];
    
    // Confirm cancellation
    if (confirm(`Are you sure you want to cancel the booking for "${event.title}" on ${dateStr}?`)) {
      let relatedEventsCancelled = false;
      
      // If this is part of a booking range (check clientData), ask if all should be cancelled
      if (event.clientData && event.clientData.projectStartDate && event.clientData.projectEndDate) {
        const cancelAll = confirm(`This booking seems part of a project (${event.clientData.projectStartDate} to ${event.clientData.projectEndDate}). Cancel all related booking dates for this project?`);
        
        if (cancelAll) {
          relatedEventsCancelled = true;
          const projectStart = event.clientData.projectStartDate;
          const projectEnd = event.clientData.projectEndDate;
          
          // Find and remove all related events by checking clientData linkage
          Object.keys(this.events).forEach(currentDate => {
            if (Array.isArray(this.events[currentDate])) {
                this.events[currentDate] = this.events[currentDate].filter(e => {
                    // Check if the event is booked and has matching project dates
                    const isRelated = e && e.type === 'booked' && e.clientData &&
                                    e.clientData.projectStartDate === projectStart &&
                                    e.clientData.projectEndDate === projectEnd;
                    if (isRelated) {
                        console.log(`Removing related booking event ${e.id} on ${currentDate}`);
                    }
                    return !isRelated; // Keep if not related
                });
                
                // Remove empty date arrays
                if (this.events[currentDate].length === 0) {
                    delete this.events[currentDate];
                }
            }
          });
        }
      } 
      
      // If only cancelling one or if it wasn't part of a detected range
      if (!relatedEventsCancelled) {
        // Remove just this specific event
        this.events[dateStr].splice(eventIndex, 1);
        console.log(`Removed single booking event ${eventId} on ${dateStr}`);
        
        // Remove empty date array
        if (this.events[dateStr].length === 0) {
          delete this.events[dateStr];
        }
      }
      
      // Save changes
      try {
          await this.saveAvailability();
          
          // Refresh calendar and bookings list
          this.renderCalendar();
          this.renderUpcomingBookings();
          
          // Show cancellation notification
          this.showCancellationNotification(event.title);
          
      } catch (error) {
           console.error("Error saving availability after cancelling booking:", error);
           // Show error notification
           // Utils.showNotification('Failed to save cancellation. Please try again.', 'error');
           // Potentially revert the changes locally if save fails? (More complex)
      }
    }
  },

// Create invoice modal for calendar events
showInvoiceFromEventModal(event) {
  // Create modal if it doesn't exist
  if (!this.invoiceFromEventModal) {
    this.createInvoiceFromEventModal();
  }
  
  const modal = this.invoiceFromEventModal;
  const form = modal.querySelector('#invoiceFromEventForm');
  
  // Reset form
  form.reset();
  
  // Store event data for reference
  modal.dataset.eventId = event.id;
  modal.dataset.eventDate = event.date;
  
  // Pre-fill client and project info if available
  if (event.clientData) {
    form.querySelector('#eventClientName').value = event.clientData.clientName || event.title;
    form.querySelector('#eventProjectName').value = event.clientData.projectName || '';
    form.querySelector('#eventProjectLocation').value = event.clientData.projectLocation || '';
  } else {
    form.querySelector('#eventClientName').value = event.title;
    form.querySelector('#eventProjectName').value = event.description || '';
    form.querySelector('#eventProjectLocation').value = '';
  }
  
  // Set start and end dates
  let startDate, endDate;
  
  if (event.clientData && event.clientData.projectStartDate && event.clientData.projectEndDate) {
    // Use project date range if available
    startDate = this.parseLocalDate(event.clientData.projectStartDate);
    endDate = this.parseLocalDate(event.clientData.projectEndDate);
  } else {
    // Use single event date
    startDate = this.parseLocalDate(event.date);
    endDate = this.parseLocalDate(event.date);
  }
  
  // Calculate number of days
  const daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
  
  // Update number of days field
  form.querySelector('#eventDays').value = daysDiff;
  
  // Show the modal
  modal.style.display = 'flex';
},

// Create the invoice from event modal
createInvoiceFromEventModal() {
  // Create modal element
  const modal = document.createElement('div');
  modal.className = 'invoice-from-event-modal';
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
    max-width: 600px;
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
  
  // Create form
  const form = document.createElement('form');
  form.id = 'invoiceFromEventForm';
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    this.generateInvoiceFromEvent();
  });
  
  // Form content
  form.innerHTML = `
    <h3 style="margin-bottom: 1.5rem; text-align: center;">Create Invoice from Booking</h3>
    
    <div class="row">
      <div class="col">
        <div class="form-group">
          <label for="eventServiceType">Service Type</label>
          <select id="eventServiceType" required>
            <option value="single">Single Role Technician</option>
            <option value="multi">Multi-Role Technician</option>
            <option value="director">Technical Director</option>
          </select>
        </div>
      </div>
      <div class="col">
        <div class="form-group">
          <label for="eventDurationType">Duration</label>
          <select id="eventDurationType" required>
            <option value="full">Full Day (10 hrs)</option>
            <option value="half">Half Day (5 hrs)</option>
            <option value="custom">Custom Days</option>
            <option value="2day">2-Day Package</option>
            <option value="3day">3-Day Package</option>
            <option value="5day">5-Day Package</option>
          </select>
        </div>
      </div>
    </div>
    
    <div class="row" id="eventCustomDaysRow">
      <div class="col">
        <div class="form-group">
          <label for="eventDays">Number of Days</label>
          <input type="number" id="eventDays" min="1" value="1">
        </div>
      </div>
      <div class="col">
        <div class="form-group">
          <label for="eventAdditionalHours">Overtime Hours</label>
          <input type="number" id="eventAdditionalHours" min="0" value="0">
        </div>
      </div>
    </div>
    
    <div class="row">
      <div class="col">
        <div class="form-group">
          <label for="eventClientType">Client Type</label>
          <select id="eventClientType" required>
            <option value="regular">Regular</option>
            <option value="new">First-Time (10% off)</option>
            <option value="partner5">Partner 5-7 days/mo (10%)</option>
            <option value="partner8">Partner 8+ days/mo (15%)</option>
          </select>
        </div>
      </div>
    </div>
    
    <div class="row">
      <div class="col">
        <div class="form-group">
          <label for="eventClientName">Client Name</label>
          <input type="text" id="eventClientName" required>
        </div>
      </div>
    </div>
    
    <div class="row">
      <div class="col">
        <div class="form-group">
          <label for="eventProjectName">Project Name</label>
          <input type="text" id="eventProjectName" required>
        </div>
      </div>
      <div class="col">
        <div class="form-group">
          <label for="eventProjectLocation">Location (optional)</label>
          <input type="text" id="eventProjectLocation">
        </div>
      </div>
    </div>
    
    <div class="row">
      <div class="col">
        <div class="form-group">
          <div class="switch-container">
            <label class="switch">
              <input type="checkbox" id="eventDepositPaid">
              <span class="slider"></span>
            </label>
            <span class="switch-label">Deposit Already Paid</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="btn-group" style="justify-content: flex-end; margin-top: 1.5rem;">
      <button type="button" id="cancelInvoiceBtn" class="btn btn-outline">Cancel</button>
      <button type="submit" class="btn btn-primary">
        <i class="fas fa-file-invoice-dollar"></i> Generate Invoice
      </button>
    </div>
  `;
  
  // Add everything to DOM
  content.appendChild(closeBtn);
  content.appendChild(form);
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  // Add event listeners
  const durationType = form.querySelector('#eventDurationType');
  const customDaysRow = form.querySelector('#eventCustomDaysRow');
  const daysInput = form.querySelector('#eventDays');
  const cancelBtn = form.querySelector('#cancelInvoiceBtn');
  
  // Toggle custom days visibility based on duration type
  durationType.addEventListener('change', () => {
    const selectedValue = durationType.value;
    if (selectedValue === 'custom') {
      customDaysRow.style.display = 'flex';
    } else if (selectedValue === 'full' || selectedValue === 'half') {
      customDaysRow.style.display = 'flex';
      daysInput.value = 1; // Reset to 1 day for full/half day
    } else {
      // For package options (2day, 3day, 5day)
      customDaysRow.style.display = 'flex';
      daysInput.value = parseInt(selectedValue); // Set days based on package
    }
  });
  
  // Handle cancel button
  cancelBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });
  
  // Store modal reference
  this.invoiceFromEventModal = modal;
},

// Generate invoice from event data
generateInvoiceFromEvent() {
  const modal = this.invoiceFromEventModal;
  const form = modal.querySelector('#invoiceFromEventForm');
  
  // Get event data
  const eventId = modal.dataset.eventId;
  const eventDate = modal.dataset.eventDate;
  
  // Get form values
  const serviceType = form.querySelector('#eventServiceType').value;
  const durationType = form.querySelector('#eventDurationType').value;
  const days = parseInt(form.querySelector('#eventDays').value) || 1;
  const additionalHours = parseInt(form.querySelector('#eventAdditionalHours').value) || 0;
  const clientType = form.querySelector('#eventClientType').value;
  const clientName = form.querySelector('#eventClientName').value.trim();
  const projectName = form.querySelector('#eventProjectName').value.trim();
  const projectLocation = form.querySelector('#eventProjectLocation').value.trim();
  const depositPaid = form.querySelector('#eventDepositPaid').checked;
  
  // Validate required fields
  if (!clientName || !projectName) {
    alert('Please fill in all required fields');
    return;
  }
  
  // Create quote data structure for the calculator
  AppState.quoteData = {
    serviceType,
    durationType,
    days,
    additionalHours,
    clientType,
    client: clientName,
    project: {
      name: projectName,
      location: projectLocation
    }
  };
  
  // Set client and project in form elements for calculator
  document.getElementById('serviceType').value = serviceType;
  document.getElementById('durationType').value = durationType;
  document.getElementById('additionalHours').value = additionalHours;
  document.getElementById('clientType').value = clientType;
  document.getElementById('clientName').value = clientName;
  document.getElementById('projectName').value = projectName;
  document.getElementById('projectLocation').value = projectLocation;
  
  // For custom days
  if (durationType === 'custom') {
    document.getElementById('customDays').value = days;
  }
  
  // Calculate the quote using existing calculator code
  AppState.quoteData = Calculator.calculateQuote();
  
  // Store the result in the app state
  AppState.quoteTotal = AppState.quoteData.total;
  
  // Calculate deposit
  AppState.depositPercentage = AppState.rates.depositRates[clientType];
  AppState.depositAmount = Math.round(AppState.quoteTotal * AppState.depositPercentage);
  
  // Close the modal
  modal.style.display = 'none';
  
  // Switch to calculator tab
  document.querySelector('.tab[data-tab="calculator"]').click();
  
  // Hide loading indicator
  document.getElementById('loadingIndicator').style.display = 'none';
  
  // Hide quote section
  document.getElementById('quoteSection').style.display = 'none';
  
  // Generate invoice with appropriate details
  this.createInvoice(depositPaid);
},

// Helper to create the invoice using the UI module
createInvoice(depositPaid) {
  // Build invoice number with current date format YYYYMMDD-XXX
  const now = new Date();
  const dateStr = now.getFullYear() + 
                (now.getMonth() + 1).toString().padStart(2, '0') + 
                now.getDate().toString().padStart(2, '0');
  
  const defaultInvoiceNum = `INV-${dateStr}-001`;
  const invoiceNum = prompt('Enter Invoice Number:', defaultInvoiceNum) || defaultInvoiceNum;
  
  // Get client name
  const clientName = document.getElementById('clientName').value.trim();
  
  // Set invoice display fields
  const invoiceClientElement = document.getElementById('invoiceClient');
  invoiceClientElement.textContent = clientName;
  
  document.getElementById('invoiceProject').textContent = document.getElementById('projectName').value.trim();
  document.getElementById('invoiceNumber').textContent = invoiceNum;
  
  // Set invoice date
  const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = now.toLocaleDateString('en-US', dateOptions);
  document.getElementById('invoiceDate').textContent = formattedDate;
  
  // Set datetime
  const timeOptions = { hour: '2-digit', minute: '2-digit' };
  const formattedDateTime = `Created on ${formattedDate} at ${now.toLocaleTimeString('en-US', timeOptions)}`;
  document.getElementById('invoiceDateTime').textContent = formattedDateTime;
  
  // Generate invoice data
  const invoiceData = Calculator.generateInvoice(AppState.quoteData, {
    invoiceNumber: invoiceNum,
    date: formattedDate,
    dateTime: formattedDateTime,
    client: clientName,
    depositPaid: depositPaid
  });
  
  AppState.invoiceData = invoiceData;
  
  // Clone quote rows
  const invoiceBody = document.getElementById('invoiceBody');
  invoiceBody.innerHTML = '';
  
  const quoteBody = document.getElementById('quoteBody');
  let subtotal = 0;
  
  Array.from(quoteBody.children).forEach(row => {
    const service = row.cells[0].textContent;
    if (service === 'Quote Date' || service === 'Quote Valid Until') return;
    
    const clone = row.cloneNode(true);
    invoiceBody.appendChild(clone);
    
    if (service !== 'TOTAL') {
      const amt = parseFloat(clone.cells[3].textContent.replace(/[^0-9.-]/g, '')) || 0;
      subtotal += amt;
    }
  });
  
  // Set summary amounts
  document.getElementById('invoiceSubtotal').textContent = Calculator.formatCurrency(subtotal);
  
  // Handle deposit
  const depositRow = document.getElementById('depositRow');
  const invoiceDeposit = document.getElementById('invoiceDeposit');
  const invoiceTotal = document.getElementById('invoiceTotal');
  
  if (depositPaid) {
    depositRow.style.display = 'flex';
    invoiceDeposit.textContent = `- ${Calculator.formatCurrency(AppState.depositAmount)}`;
    invoiceTotal.textContent = Calculator.formatCurrency(subtotal - AppState.depositAmount);
    AppState.isPaid = true;
  } else {
    depositRow.style.display = 'none';
    invoiceTotal.textContent = Calculator.formatCurrency(subtotal);
    AppState.isPaid = false;
  }
  
  // Show invoice section
  document.getElementById('invoiceSection').style.display = 'block';
  
  // Add payment buttons using the existing Payment module
  UI.addPaymentButtons(depositPaid);
  
  // Save invoice to history
  setTimeout(() => {
    History.saveInvoice();
  }, 500);
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
      animation: slideIn 0.3s ease-out;
      display: flex; /* For icon alignment */
      align-items: center; /* For icon alignment */
      gap: 0.75rem; /* Space between icon and text */
    `;
    
    notification.innerHTML = `
      <i class="fas fa-ban" style="font-size: 1.2rem;"></i>
      <div>
        <strong>Booking Cancelled</strong>
        <p style="margin: 0;">The booking for "${title}" has been cancelled.</p>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // CSS Animation for slide in (add if needed)
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        .cancellation-alert { animation: slideIn 0.3s ease-out; }
    `;
    document.head.appendChild(style);

    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.5s';
      // Remove the style element too if you want to be tidy
      setTimeout(() => {
          notification.remove();
          style.remove(); 
      }, 500);
    }, 3000);
  },
  
  // Show block date modal
  showBlockDateModal() {
    // Create modal if it doesn't exist
    if (!this.modal) {
      this.createBlockDateModal();
    }
    
    // Reset fields when showing
    const blockStartDate = this.modal.querySelector('#blockStartDate');
    const blockEndDate = this.modal.querySelector('#blockEndDate');
    const blockReason = this.modal.querySelector('#blockReason');

    const today = new Date().toISOString().split('T')[0];
    blockStartDate.min = today;
    blockEndDate.min = today;
    blockStartDate.value = today; // Default to today
    blockEndDate.value = today;   // Default to today
    blockReason.value = '';       // Clear reason

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
    content.className = 'modal-content'; // Use class for styling consistency
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
    closeBtn.className = 'modal-close'; // Use class
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
        <label for="blockStartDate">Start Date</label>
        <input type="date" id="blockStartDate" class="form-control">
      </div>

       <div class="form-group">
        <label for="blockEndDate">End Date</label>
        <input type="date" id="blockEndDate" class="form-control">
      </div>
      
      <div class="form-group">
        <label for="blockReason">Reason (optional)</label>
        <input type="text" id="blockReason" placeholder="e.g. Vacation, Personal, etc.">
      </div>
      
      <div class="btn-group" style="justify-content: flex-end; margin-top: 1.5rem;">
        <button type="button" id="cancelBlockBtn" class="btn btn-outline">Cancel</button>
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
    const cancelBlockBtn = content.querySelector('#cancelBlockBtn');
    
    // Set min date to today initially
    const today = new Date().toISOString().split('T')[0];
    blockStartDate.min = today;
    blockEndDate.min = today;
    
    // Handle start date change to update end date min
    blockStartDate.addEventListener('change', () => {
      if (blockStartDate.value) {
        blockEndDate.min = blockStartDate.value;
        // If end date is before new start date, reset end date
        if (blockEndDate.value && blockEndDate.value < blockStartDate.value) {
            blockEndDate.value = blockStartDate.value;
        }
      } else {
         blockEndDate.min = today; // Reset min if start date cleared
      }
    });
    
    // Handle confirm button click
    confirmBlockBtn.addEventListener('click', () => {
      if (!blockStartDate.value || !blockEndDate.value) {
        alert('Please select a valid date range.');
        return;
      }
      
      const startDate = this.parseLocalDate(blockStartDate.value); // Use helper
      const endDate = this.parseLocalDate(blockEndDate.value);     // Use helper
      const reason = content.querySelector('#blockReason').value.trim();
      
      this.blockDateRange(startDate, endDate, reason); // Pass Date objects
      this.modal.style.display = 'none';
    });

     // Handle cancel button click
    cancelBlockBtn.addEventListener('click', () => {
        this.modal.style.display = 'none';
    });
  },
  
  // Block a range of dates
  async blockDateRange(startDate, endDate, reason = '') { // Accepts Date objects
    // Clone date to avoid modifying the original
    let currentDate = new Date(startDate.getTime()); // Clone start date
    const finalDate = new Date(endDate.getTime());   // Clone end date

    let datesToBlock = {};
    let eventsToRemove = {}; // Store events to remove { dateStr: [eventId1, eventId2] }

    // Identify dates to block and events to remove
    while (currentDate <= finalDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        datesToBlock[dateStr] = reason || 'Unavailable'; // Use reason or default

        // Mark any existing events on this date for removal
        if (this.events[dateStr] && Array.isArray(this.events[dateStr])) {
             eventsToRemove[dateStr] = this.events[dateStr].map(e => e.id); // Get IDs
        }
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
    }

     // Apply the changes
     Object.assign(this.blockedDates, datesToBlock); // Add new blocked dates

     // Remove the marked events
     for (const dateStr in eventsToRemove) {
         if (this.events[dateStr]) {
             console.log(`Removing ${eventsToRemove[dateStr].length} event(s) from ${dateStr} due to blocking.`);
             // Filter out events whose IDs were marked for removal
             this.events[dateStr] = this.events[dateStr].filter(event => 
                 !eventsToRemove[dateStr].includes(event.id)
             );
             // Clean up empty arrays
             if (this.events[dateStr].length === 0) {
                 delete this.events[dateStr];
             }
         }
     }
    
    try {
        await this.saveAvailability();
        this.renderCalendar(); // Re-render to show changes
        this.renderUpcomingBookings(); // Update upcoming list too

        alert(`Dates blocked successfully from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);

    } catch (error) {
        console.error("Error saving availability after blocking dates:", error);
        alert('Failed to save blocked dates. Please try again.');
        // Consider reverting local changes if save fails (more complex)
    }
  },
  
  // Render upcoming bookings with improved event handling
  renderUpcomingBookings() {
    const upcomingBookingsList = document.getElementById('upcomingBookings');
    if (!upcomingBookingsList) return;
    
    // Clear list
    upcomingBookingsList.innerHTML = '';
    
    // Get today's date (normalized)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Collect all upcoming events
    const upcomingEvents = [];
    
    // Process each date's events
    Object.keys(this.events).forEach(dateStr => {
      const eventDate = this.parseLocalDate(dateStr); // Use helper for consistency
      
      // Only include events from today onwards
      if (eventDate >= today) {
        // Check if we have a valid event array
        if (Array.isArray(this.events[dateStr])) {
          this.events[dateStr].forEach(event => {
            try {
              // Validate event object
              if (!event || typeof event !== 'object') {
                console.error('Invalid event object:', event);
                return;
              }
              
              // Create a validated event with fallbacks AND the Date object
              const validatedEvent = {
                id: event.id || `event_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
                date: dateStr, // Keep the original date string
                title: event.title || 'Untitled Event',
                description: event.description || '',
                type: event.type || 'regular',
                fullDay: typeof event.fullDay === 'boolean' ? event.fullDay : false,
                startTime: event.startTime, // Keep original format or null
                endTime: event.endTime,     // Keep original format or null
                clientData: event.clientData || null,
                dateObj: eventDate // Store the parsed Date object
              };
              
              upcomingEvents.push(validatedEvent);
            } catch (error) {
              console.error('Error processing event for upcoming bookings:', error, event);
            }
          });
        } else {
          console.warn(`Events for date ${dateStr} is not an array:`, this.events[dateStr]);
        }
      }
    });

    // Also include upcoming blocked dates as items
    Object.keys(this.blockedDates).forEach(dateStr => {
        const blockedDate = this.parseLocalDate(dateStr); // Use helper
        if (blockedDate >= today) {
             upcomingEvents.push({
                id: `blocked_${dateStr}`,
                date: dateStr,
                title: this.blockedDates[dateStr] || 'Unavailable',
                description: '',
                type: 'blocked',
                fullDay: true,
                dateObj: blockedDate
             });
        }
    });
    
    // Sort by date and time
    upcomingEvents.sort((a, b) => {
      // First sort by date
      if (a.dateObj < b.dateObj) return -1;
      if (a.dateObj > b.dateObj) return 1;
      
      // If same date, sort non-full day events by start time
      if (!a.fullDay && !b.fullDay && a.startTime && b.startTime) {
        return a.startTime.localeCompare(b.startTime);
      }
      
      // Full day events (including blocked) come before timed events
      if (a.fullDay && !b.fullDay) return -1;
      if (!a.fullDay && b.fullDay) return 1;
      
      // Sort by title if everything else is equal
      return a.title.localeCompare(b.title);
    });
    
    // If no upcoming events
    if (upcomingEvents.length === 0) {
      upcomingBookingsList.innerHTML = `
        <div style="text-align: center; padding: 1.5rem; color: var(--gray-500); font-style: italic;">
          No upcoming events or blocked dates.
        </div>
      `;
      return;
    }
    
    // Add events to list (limit display, e.g., to 10)
    const displayLimit = 10;
    upcomingEvents.slice(0, displayLimit).forEach(event => {
      try {
        const eventItem = document.createElement('div');
        eventItem.className = 'booking-item';
        
        // Add class based on event type
        if (event.type === 'blocked') {
          eventItem.classList.add('blocked-item');
        } else if (event.type === 'booked') {
          eventItem.classList.add('booked-item');
        } // Regular events have default styling
        
        // Format date using the stored Date object
        const options = { month: 'short', day: 'numeric' };
        const dateDisplayStr = event.dateObj.toLocaleDateString('en-US', options);
        
        // Format time
        let timeStr = 'All Day';
        if (!event.fullDay && event.startTime && event.endTime) {
          // Convert to 12-hour format if times are valid
          const formatTime = (timeInput) => {
            if (!timeInput || !timeInput.includes(':')) return '';
            const [hours, minutes] = timeInput.split(':');
            const hour = parseInt(hours);
            if (isNaN(hour) || isNaN(parseInt(minutes))) return ''; // Invalid time part
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const hour12 = hour % 12 || 12; // Convert 0 to 12 for 12 AM
            return `${hour12}:${minutes.padStart(2,'0')} ${ampm}`; // Pad minutes
          };
          
          const formattedStart = formatTime(event.startTime);
          const formattedEnd = formatTime(event.endTime);
          if (formattedStart && formattedEnd) {
              timeStr = `${formattedStart} - ${formattedEnd}`;
          } else {
              timeStr = "Invalid Time"; // Indicate issue
          }
        }
        
        eventItem.innerHTML = `
          <div>
            <div class="booking-dates">${dateDisplayStr}</div>
            <div class="booking-client">${event.title}</div>
            <div class="booking-time">${timeStr}</div>
          </div>
          <div class="booking-status">
            <span class="badge ${event.type === 'blocked' ? 'badge-danger' : event.type === 'booked' ? 'badge-success' : 'badge-primary'}">
              ${event.type.charAt(0).toUpperCase() + event.type.slice(1)}
            </span>
          </div>
        `;
        
        // Add click handler to view details
        // We pass the event object which includes the original 'date' string
        eventItem.addEventListener('click', () => {
          if (event.type === 'blocked') {
              // Maybe just highlight on calendar or show simple info?
              // Or open the edit modal directly for the blocked date?
              this.showEventModal(event.dateObj, event); // Allow editing/unblocking
          } else {
              this.showEventDetails(event); // Handles booked/regular types
          }
        });
        
        upcomingBookingsList.appendChild(eventItem);
      } catch (error) {
        console.error('Error rendering upcoming event:', error, event);
      }
    });
    
    // Add "View all" link if more than the display limit
    if (upcomingEvents.length > displayLimit) {
      const viewAllItem = document.createElement('div');
      viewAllItem.className = 'view-all-item';
      viewAllItem.innerHTML = `
        <button class="btn btn-outline btn-sm" style="width: 100%; margin-top: 0.5rem;">
          <i class="fas fa-list"></i> View all ${upcomingEvents.length} upcoming items
        </button>
      `;
      
      // Add click handler to show all events modal
      viewAllItem.querySelector('button').addEventListener('click', () => {
        this.showAllEventsModal(upcomingEvents);
      });
      
      upcomingBookingsList.appendChild(viewAllItem);
    }
    
    // Add custom styles for booking items if not already added
    if (!document.getElementById('upcoming-bookings-styles')) {
      const style = document.createElement('style');
      style.id = 'upcoming-bookings-styles';
      style.textContent = `
        .booking-item {
          display: flex;
          justify-content: space-between;
          align-items: center; /* Vertically align items */
          padding: 0.8rem 1rem; /* Adjust padding */
          border-radius: 8px;
          background-color: var(--gray-100);
          margin-bottom: 0.75rem;
          transition: all 0.2s;
          border-left: 4px solid var(--primary); /* Default border */
          cursor: pointer;
        }
        
        .booking-item:hover {
          transform: translateY(-2px);
          box-shadow: var(--shadow-sm);
          background-color: var(--gray-200); /* Hover background */
        }
        
        .booking-item.booked-item {
          border-left-color: #007aff; /* Blue for booked */
        }
        
        .booking-item.blocked-item {
          border-left-color: var(--danger); /* Red for blocked */
           background-color: rgba(var(--danger-rgb), 0.05); /* Slightly red background */
        }
         .booking-item.blocked-item:hover {
             background-color: rgba(var(--danger-rgb), 0.1);
         }
        
        .booking-dates {
          font-weight: 500;
          margin-bottom: 0.25rem;
          color: var(--text-color);
        }
        
        .booking-client {
          font-size: 0.875rem;
          color: var(--gray-800);
          margin-bottom: 0.25rem; /* Space before time */
          max-width: 250px; /* Prevent overly long titles */
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        
        .booking-time {
          font-size: 0.75rem;
          color: var(--gray-600);
        }
        
        .booking-status {
          display: flex;
          align-items: center;
          flex-shrink: 0; /* Prevent status badge from shrinking */
          margin-left: 0.5rem; /* Space between details and status */
        }
        
        .view-all-item {
          text-align: center;
          margin-top: 0.5rem;
        }
        
        @media (max-width: 480px) {
          .booking-item {
            padding: 0.6rem 0.8rem;
            flex-direction: column; /* Stack vertically on small screens */
            align-items: flex-start;
          }
          .booking-client { font-size: 0.8rem; max-width: none; }
          .booking-time { font-size: 0.7rem; }
          .booking-status { margin-top: 0.5rem; align-self: flex-end; } /* Move status down */
          .booking-status .badge { font-size: 0.7rem; padding: 0.2rem 0.5rem; }
        }
      `;
      
      document.head.appendChild(style);
    }
  },
  
  // Show all events modal
  showAllEventsModal(events) { // events is the sorted list including blocked dates
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'all-events-modal';
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.7);
      display: flex;
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
      max-width: 700px;
      max-height: 90vh;
      overflow: hidden; /* Prevent body scroll */
      padding: 1.5rem 2rem 2rem 2rem; /* Adjust padding */
      position: relative;
      display: flex; /* Use flexbox for layout */
      flex-direction: column;
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
      modal.remove();
    });
    
    // Add title
    const title = document.createElement('h3');
    title.textContent = 'All Upcoming Events & Blocked Dates';
    title.style.marginBottom = '1rem'; // Reduced margin
    title.style.flexShrink = '0'; // Prevent shrinking
    
    // Add search input
    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';
    searchContainer.style.cssText = `
      margin-bottom: 1rem; /* Reduced margin */
      flex-shrink: 0; /* Prevent shrinking */
    `;
    
    searchContainer.innerHTML = `
      <div class="form-group no-margin"> <label for="eventSearch" style="display: none;">Search Events</label> <input type="text" id="eventSearch" placeholder="Filter by title, type, or date..." style="width: 100%;">
      </div>
    `;
    
    // Add events list container (make this scrollable)
    const eventsListContainer = document.createElement('div');
    eventsListContainer.className = 'all-events-list-container';
    eventsListContainer.style.cssText = `
      flex-grow: 1; /* Take remaining space */
      overflow-y: auto; /* Enable vertical scrolling */
      padding-right: 0.5rem; /* Space for scrollbar */
      margin-right: -0.5rem; /* Offset padding */
      border-top: 1px solid var(--gray-300); /* Separator line */
      border-bottom: 1px solid var(--gray-300); /* Separator line */
      padding-top: 1rem; /* Space above list */
      padding-bottom: 1rem; /* Space below list */
    `;

    const eventsList = document.createElement('div');
    eventsList.className = 'all-events-list';
    // Removed height/overflow styles here, handled by container now

    // Add all events to the list
    events.forEach(event => {
      try {
        const eventItem = document.createElement('div');
        eventItem.className = 'booking-item modal-list-item'; // Add new class for specific styling
        
        // Add class based on event type
        if (event.type === 'blocked') {
          eventItem.classList.add('blocked-item');
        } else if (event.type === 'booked') {
          eventItem.classList.add('booked-item');
        }
        
        // Format date using the stored Date object
        const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
        const dateDisplayStr = event.dateObj.toLocaleDateString('en-US', options);
        
        // Format time
        let timeStr = 'All Day';
         if (!event.fullDay && event.startTime && event.endTime) {
             const formatTime = (timeInput) => {
                 if (!timeInput || !timeInput.includes(':')) return '';
                 const [hours, minutes] = timeInput.split(':');
                 const hour = parseInt(hours);
                 if (isNaN(hour) || isNaN(parseInt(minutes))) return '';
                 const ampm = hour >= 12 ? 'PM' : 'AM';
                 const hour12 = hour % 12 || 12;
                 return `${hour12}:${minutes.padStart(2,'0')} ${ampm}`;
             };
             const formattedStart = formatTime(event.startTime);
             const formattedEnd = formatTime(event.endTime);
             if (formattedStart && formattedEnd) {
                 timeStr = `${formattedStart} - ${formattedEnd}`;
             } else {
                 timeStr = "Invalid Time";
             }
         }
        
        // Add more details for the all events view
        eventItem.innerHTML = `
          <div class="booking-details-main">
            <div class="booking-dates">${dateDisplayStr}</div>
            <div class="booking-client">${event.title}</div>
            <div class="booking-time">${timeStr}</div>
            ${event.description ? `<div class="booking-description">${event.description}</div>` : ''}
          </div>
          <div class="booking-status">
            <span class="badge ${event.type === 'blocked' ? 'badge-danger' : event.type === 'booked' ? 'badge-success' : 'badge-primary'}">
              ${event.type.charAt(0).toUpperCase() + event.type.slice(1)}
            </span>
          </div>
        `;
        
        // Add data attributes for filtering (use original date string for searching)
        eventItem.dataset.title = event.title.toLowerCase();
        eventItem.dataset.type = event.type.toLowerCase();
        eventItem.dataset.date = event.date.toLowerCase(); // Use YYYY-MM-DD for search consistency
        eventItem.dataset.displayDate = dateDisplayStr.toLowerCase(); // Allow searching formatted date too
        eventItem.dataset.description = event.description ? event.description.toLowerCase() : '';
        
        // Add click handler to view details
        eventItem.addEventListener('click', () => {
           if (event.type === 'blocked') {
               this.showEventModal(event.dateObj, event); // Allow editing/unblocking
           } else {
               this.showEventDetails(event); // Handles booked/regular
           }
          // Close this modal after selecting an event
          setTimeout(() => {
            modal.remove();
          }, 100); // Small delay to allow action
        });
        
        eventsList.appendChild(eventItem);
      } catch (error) {
        console.error('Error rendering event in all events list:', error, event);
      }
    });

    // Append list to its scrollable container
    eventsListContainer.appendChild(eventsList);
    
    // Add elements to modal content
    content.appendChild(title);
    content.appendChild(searchContainer);
    content.appendChild(eventsListContainer); // Add the scrollable container
    content.appendChild(closeBtn);
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Add search functionality
    const searchInput = content.querySelector('#eventSearch'); // Search within modal content
    searchInput.addEventListener('input', () => {
      const searchTerm = searchInput.value.toLowerCase().trim();
      const items = eventsList.querySelectorAll('.booking-item');
      
      items.forEach(item => {
        const title = item.dataset.title || '';
        const type = item.dataset.type || '';
        const date = item.dataset.date || '';
        const displayDate = item.dataset.displayDate || '';
        const description = item.dataset.description || '';
        
        // Show/hide based on search term matching any data attribute
        if (
          title.includes(searchTerm) || 
          type.includes(searchTerm) || 
          date.includes(searchTerm) ||
          displayDate.includes(searchTerm) ||
          description.includes(searchTerm)
        ) {
          item.style.display = 'flex'; // Use flex to match booking-item style
        } else {
          item.style.display = 'none';
        }
      });
    });
    
    // Add custom styles for the modal list items if not already added
    if (!document.getElementById('all-events-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'all-events-modal-styles';
        style.textContent = `
          .all-events-list-container {
            scrollbar-width: thin;
            scrollbar-color: var(--gray-400) transparent;
          }
          
          .all-events-list-container::-webkit-scrollbar {
            width: 8px; /* Slightly wider scrollbar */
          }
          
          .all-events-list-container::-webkit-scrollbar-track {
            background: transparent;
            margin: 1rem 0; /* Match padding */
          }
          
          .all-events-list-container::-webkit-scrollbar-thumb {
            background-color: var(--gray-400);
            border-radius: 6px;
            border: 2px solid var(--card-bg); /* Match background */
          }

          .modal-list-item {
             margin-bottom: 0.5rem; /* Tighter spacing in list */
             border-left-width: 3px; /* Slightly thinner border */
             padding: 0.6rem 0.8rem;
          }
          
          .modal-list-item .booking-description {
            font-size: 0.7rem;
            color: var(--gray-600);
            margin-top: 0.15rem;
            white-space: nowrap; /* Keep description short */
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 350px; /* Limit width */
          }

          .modal-list-item .booking-details-main {
              flex-grow: 1; /* Allow main details to take space */
              overflow: hidden; /* Prevent long content breaking layout */
          }

          /* Responsive adjustments for modal list */
          @media (max-width: 480px) {
             .modal-list-item {
                 padding: 0.5rem 0.6rem;
                 /* Keep flex-row for better scanning in modal */
             }
             .modal-list-item .booking-client { font-size: 0.75rem; }
             .modal-list-item .booking-description { max-width: 180px; font-size: 0.65rem;}
          }
        `;
        document.head.appendChild(style);
    }
    
    // Focus the search input
    setTimeout(() => {
      searchInput.focus();
    }, 100);
  },
  
  // Export calendar data to iCal
  exportCalendar() {
    // Create iCal content
    let icalContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//LuminaryOps//Calendar//EN',
      `X-WR-CALNAME:LuminaryOps Calendar`, // Calendar Name
      'X-WR-TIMEZONE:UTC', // Standard practice to use UTC
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ];
    
    const nowISO = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    // Add blocked dates as VEVENTs
    Object.keys(this.blockedDates).forEach(dateStr => {
      const reason = this.blockedDates[dateStr] || 'Unavailable';
      const date = this.parseLocalDate(dateStr); // Use helper

      // Create UTC date strings for iCal DATE format (YYYYMMDD)
      const startDateUTCStr = dateStr.replace(/-/g, '');
      
      // For a full day DATE type, DTEND is the day *after* the last day
      const endDate = new Date(date.getTime());
      endDate.setDate(date.getDate() + 1);
      const endDateUTCStr = endDate.toISOString().split('T')[0].replace(/-/g, '');

      icalContent = icalContent.concat([
        'BEGIN:VEVENT',
        `UID:blocked-${dateStr}@luminaryops.com`, // Unique ID
        `DTSTAMP:${nowISO}`, // Timestamp of export
        `DTSTART;VALUE=DATE:${startDateUTCStr}`, // Start date (full day)
        `DTEND;VALUE=DATE:${endDateUTCStr}`,     // End date (exclusive, full day)
        `SUMMARY:${reason}`, // Title
        'CATEGORIES:BLOCKED', // Category
        'TRANSP:OPAQUE', // Shows as busy
        'STATUS:CONFIRMED',
        'END:VEVENT'
      ]);
    });
    
    // Add events from the events object
    Object.keys(this.events).forEach(dateStr => {
      // Ensure this.events[dateStr] is an array
      if (!Array.isArray(this.events[dateStr])) {
        console.warn(`Events for date ${dateStr} is not an array during export:`, this.events[dateStr]);
        return; // Skip this date if data is corrupt
      }
      
      this.events[dateStr].forEach(event => {
        try {
          // Validate event
          if (!event || typeof event !== 'object' || !event.id) {
            console.error('Invalid event object in export:', event);
            return;
          }
          
          // Get required properties with fallbacks
          const eventId = event.id;
          const eventTitle = event.title || 'Untitled Event';
          const eventDescription = event.description || '';
          const eventType = event.type || 'regular';
          const fullDay = event.fullDay === true;
          const startTime = event.startTime; // May be null/undefined
          const endTime = event.endTime;     // May be null/undefined
          
          // Create date objects using the helper function
          const eventDate = this.parseLocalDate(dateStr); 
          
          // Format DTSTART and DTEND
          let dtStartStr, dtEndStr;
          if (fullDay) {
            // Full day event (VALUE=DATE)
            dtStartStr = `DTSTART;VALUE=DATE:${dateStr.replace(/-/g, '')}`;
            
            // DTEND for full day is the start of the next day
            const nextDay = new Date(eventDate.getTime());
            nextDay.setDate(eventDate.getDate() + 1);
            const nextDayStr = nextDay.toISOString().split('T')[0].replace(/-/g, '');
            dtEndStr = `DTEND;VALUE=DATE:${nextDayStr}`;
          } else if (startTime && endTime) {
            // Timed event (DateTime in UTC)
            const startDateTime = new Date(eventDate.getTime());
            const [startHour, startMinute] = startTime.split(':').map(Number);
            startDateTime.setHours(startHour, startMinute, 0, 0); // Set local time

            const endDateTime = new Date(eventDate.getTime());
            const [endHour, endMinute] = endTime.split(':').map(Number);
            endDateTime.setHours(endHour, endMinute, 0, 0); // Set local time

            // Convert to UTC string format YYYYMMDDTHHMMSSZ
            dtStartStr = `DTSTART:${startDateTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'}`;
            dtEndStr = `DTEND:${endDateTime.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'}`;
          } else {
             console.warn(`Skipping event ${eventId} due to missing times for non-full-day event.`);
             return; // Skip if timed event has no times
          }
          
          // Add event to iCal content
          icalContent = icalContent.concat([
            'BEGIN:VEVENT',
            `UID:${eventId}@luminaryops.com`, // Ensure unique ID
            `DTSTAMP:${nowISO}`, // Timestamp
            dtStartStr, // Start date/time
            dtEndStr,   // End date/time
            `SUMMARY:${eventTitle.replace(/[,;]/g, '\\,')}`, // Escape commas/semicolons in summary
            eventDescription ? `DESCRIPTION:${eventDescription.replace(/\n/g, '\\n').replace(/[,;]/g, '\\,')}` : '', // Escape newlines and commas/semicolons
            `CATEGORIES:${eventType.toUpperCase()}`, // Category based on type
            'TRANSP:OPAQUE', // Show as busy
            'STATUS:CONFIRMED',
            'END:VEVENT'
          ].filter(line => line !== '')); // Remove empty lines (like empty description)
        } catch (error) {
          console.error(`Error exporting event ${event?.id || 'unknown'}:`, error, event);
        }
      });
    });
    
    // Close calendar
    icalContent.push('END:VCALENDAR');
    
    // Create download link
    const blob = new Blob([icalContent.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'luminaryops_calendar.ics';
    
    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Clean up blob URL
    
    // Show success message (using a simple alert or your notification system)
    alert('Calendar exported successfully as luminaryops_calendar.ics');

    // Optional: Use a more sophisticated notification if available
    // Utils.showNotification('Calendar exported successfully!', 'success');
  },
  
  // Book a date range for a client with improved error handling
  async bookDateRange(startDate, endDate, clientData) { // Expects Date objects
    try {
      // Validate inputs
      if (!startDate || !endDate || !(startDate instanceof Date) || !(endDate instanceof Date) || !clientData) {
        console.error('Invalid inputs for bookDateRange:', { startDate, endDate, clientData });
        alert('Booking failed: Invalid date or client data provided.');
        return false;
      }

      // Ensure start is before or same as end
      if (startDate > endDate) {
           console.error('Booking failed: Start date is after end date.');
           alert('Booking failed: Start date cannot be after end date.');
           return false;
      }
      
      // Clone dates to avoid modifying originals
      let currentDate = new Date(startDate.getTime());
      const finalDate = new Date(endDate.getTime());
      const startDateStr = startDate.toISOString().split('T')[0]; // For clientData
      const endDateStr = endDate.toISOString().split('T')[0];     // For clientData

      // Create unique ID for this booking set
      const bookingSetId = `booking_${Date.now()}`;
      
      let newEvents = {}; // Store new events temporarily { dateStr: [event1, event2] }
      let conflicts = false; // Flag for conflicts

      // Check for conflicts first before creating events
      let checkDate = new Date(startDate.getTime());
      while (checkDate <= finalDate) {
           const checkDateStr = checkDate.toISOString().split('T')[0];
           if (this.blockedDates[checkDateStr]) {
               conflicts = true;
               alert(`Booking conflict: Date ${checkDateStr} is blocked (${this.blockedDates[checkDateStr]}).`);
               break;
           }
           if (this.events[checkDateStr] && this.events[checkDateStr].some(e => e.fullDay)) {
                conflicts = true;
                alert(`Booking conflict: Date ${checkDateStr} already has a full-day event.`);
                break;
           }
           checkDate.setDate(checkDate.getDate() + 1);
      }

      if (conflicts) {
           console.error("Booking failed due to conflicts.");
           return false; // Stop if conflicts found
      }

      // If no conflicts, proceed to create events
      currentDate = new Date(startDate.getTime()); // Reset current date
      while (currentDate <= finalDate) {
        const dateStr = currentDate.toISOString().split('T')[0];
        
        // Initialize array if it doesn't exist
        if (!newEvents[dateStr]) {
          newEvents[dateStr] = [];
        }
        
        // Create the booking event object
        const bookingEvent = {
          id: `${bookingSetId}_${dateStr}`, // Unique ID per day
          date: dateStr,
          title: clientData.clientName || 'Booking', // Use client name or default
          description: clientData.projectName || '', // Project name as description
          type: 'booked',
          fullDay: true, // Assume full day bookings for ranges
          clientData: { // Store related client info
            ...clientData, // Include all provided client data
            bookingSetId: bookingSetId, // Link events in this booking
            projectStartDate: startDateStr,
            projectEndDate: endDateStr,
            depositPaid: clientData.depositPaid || false // Default payment status
          }
          // No startTime/endTime needed for fullDay
        };
        
        newEvents[dateStr].push(bookingEvent);
        
        // Move to next day
        currentDate.setDate(currentDate.getDate() + 1);
      }
      
      // Add travel days if specified
      if (clientData.travelDays && clientData.travelDays > 0) {
          const travelDays = parseInt(clientData.travelDays, 10);
          
          // Add travel days *before* start date
          for (let i = 1; i <= travelDays; i++) {
              let travelDate = new Date(startDate.getTime());
              travelDate.setDate(startDate.getDate() - i);
              const travelDateStr = travelDate.toISOString().split('T')[0];

              // Check for conflicts on travel days too
              if (this.blockedDates[travelDateStr] || (this.events[travelDateStr] && this.events[travelDateStr].some(e => e.fullDay))) {
                   console.warn(`Skipping travel day ${travelDateStr} due to conflict.`);
                   continue; // Skip this travel day
              }

              if (!newEvents[travelDateStr]) newEvents[travelDateStr] = [];
              
              newEvents[travelDateStr].push({
                  id: `${bookingSetId}_travel_before_${i}`,
                  date: travelDateStr,
                  title: `Travel: ${clientData.clientName || 'Booking'}`,
                  description: `Travel day for ${clientData.projectName || ''}`,
                  type: 'booked', // Treat travel as booked time
                  fullDay: true,
                  clientData: { 
                      ...clientData, 
                      bookingSetId: bookingSetId, 
                      isTravel: true, 
                      travelLabel: 'Travel Day (Before)',
                      projectStartDate: startDateStr, 
                      projectEndDate: endDateStr 
                  }
              });
          }

          // Add travel days *after* end date
           for (let i = 1; i <= travelDays; i++) {
              let travelDate = new Date(finalDate.getTime()); // Use finalDate (end date)
              travelDate.setDate(finalDate.getDate() + i);
              const travelDateStr = travelDate.toISOString().split('T')[0];

              // Check for conflicts on travel days too
              if (this.blockedDates[travelDateStr] || (this.events[travelDateStr] && this.events[travelDateStr].some(e => e.fullDay))) {
                   console.warn(`Skipping travel day ${travelDateStr} due to conflict.`);
                   continue; // Skip this travel day
              }

              if (!newEvents[travelDateStr]) newEvents[travelDateStr] = [];
              
              newEvents[travelDateStr].push({
                  id: `${bookingSetId}_travel_after_${i}`,
                  date: travelDateStr,
                  title: `Travel: ${clientData.clientName || 'Booking'}`,
                  description: `Travel day for ${clientData.projectName || ''}`,
                  type: 'booked',
                  fullDay: true,
                  clientData: { 
                      ...clientData, 
                      bookingSetId: bookingSetId, 
                      isTravel: true, 
                      travelLabel: 'Travel Day (After)',
                      projectStartDate: startDateStr, 
                      projectEndDate: endDateStr 
                  }
              });
          }
      }

      // Merge new events into the main events object
      for (const dateStr in newEvents) {
          if (!this.events[dateStr]) {
              this.events[dateStr] = [];
          }
           // Ensure it's an array before pushing
           if (Array.isArray(this.events[dateStr])) {
               this.events[dateStr].push(...newEvents[dateStr]);
           } else {
                console.warn(`Correcting non-array events for ${dateStr} before adding booking.`);
                this.events[dateStr] = [...newEvents[dateStr]]; // Replace if corrupt
           }
      }
      
      // Save the updated availability
      await this.saveAvailability();
      
      // Refresh calendar display
      this.renderCalendar();
      this.renderUpcomingBookings();

      console.log(`Booking successful for ${clientData.clientName} from ${startDateStr} to ${endDateStr}`);
      return true; // Indicate success

    } catch (error) {
      console.error('Error booking date range:', error);
      alert(`An error occurred while booking: ${error.message}`);
      return false; // Indicate failure
    }
  },
  
  // Update payment status for a booking set (using bookingSetId)
  async updateBookingPaymentStatus(bookingSetId, isPaid) {
    try {
        let updated = false;
        console.log(`Updating payment status for booking set ${bookingSetId} to: ${isPaid}`);

        // Iterate through all dates and events to find matching bookingSetId
        for (const dateStr in this.events) {
            if (Array.isArray(this.events[dateStr])) {
                this.events[dateStr].forEach(event => {
                    // Check if the event is booked and belongs to the target booking set
                    if (event && event.type === 'booked' && event.clientData && event.clientData.bookingSetId === bookingSetId) {
                        
                        // Update the depositPaid status
                        if (event.clientData.depositPaid !== isPaid) {
                             event.clientData.depositPaid = isPaid;
                             updated = true;
                             console.log(`Updated payment status for event ${event.id} on ${dateStr}`);

                             // Optional: Update title to reflect payment (consider if this is desired)
                             // if (isPaid && !event.title.includes('(Paid)')) {
                             //     event.title += ' (Paid)';
                             // } else if (!isPaid && event.title.includes('(Paid)')) {
                             //      event.title = event.title.replace(/\s*\(Paid\)/, '');
                             // }
                        }
                    }
                });
            }
        }
      
      if (updated) {
          await this.saveAvailability();
          
          // Refresh calendar and list
          this.renderCalendar();
          this.renderUpcomingBookings();
          console.log(`Payment status update saved for booking set ${bookingSetId}.`);
          return true;
      } else {
          console.log(`No events found or status already matched for booking set ${bookingSetId}. No update needed.`);
          return false; // Indicate no changes were made
      }
      
    } catch (error) {
      console.error('Error updating booking payment status:', error);
      alert(`Failed to update payment status: ${error.message}`);
      return false;
    }
  },
  
  // Ensure data integrity and fix any issues
  async ensureDataIntegrity() {
    console.log("Starting data integrity check...");
    try {
      // Ensure data is loaded first (might be redundant if called after init, but safe)
      // await this.loadAvailability(); 
      // ^ Removed redundant load, assuming init calls this first.
      
      let needsSave = false; // Track if changes were made

      // Check top-level structure
      if (!this.events || typeof this.events !== 'object') {
        console.warn('Events structure is invalid, re-initializing as {}.');
        this.events = {};
        needsSave = true;
      }
      if (!this.blockedDates || typeof this.blockedDates !== 'object') {
        console.warn('BlockedDates structure is invalid, re-initializing as {}.');
        this.blockedDates = {};
        needsSave = true;
      }
       if (!this.bookedDates || typeof this.bookedDates !== 'object') {
        // Assuming bookedDates might still be used, check it too
        console.warn('BookedDates structure is invalid, re-initializing as {}.');
        this.bookedDates = {};
        needsSave = true;
      }
      
      // Check events object: Keys should be YYYY-MM-DD, values should be arrays
      let fixedEventDates = 0;
      for (const dateStr in this.events) {
          // Check key format (basic check)
          if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
               console.warn(`Invalid date key found in events: "${dateStr}". Removing entry.`);
               delete this.events[dateStr];
               needsSave = true;
               continue; // Skip further checks for this invalid key
          }

          // Check value type
          if (!Array.isArray(this.events[dateStr])) {
            console.warn(`Events for date ${dateStr} is not an array:`, this.events[dateStr]);
            // Attempt recovery if possible (e.g., from stringified JSON)
            if (typeof this.events[dateStr] === 'string') {
                 try {
                      const parsed = JSON.parse(this.events[dateStr]);
                      if (Array.isArray(parsed)) {
                           this.events[dateStr] = parsed;
                           console.log(`Recovered array from string for ${dateStr}.`);
                           needsSave = true;
                      } else {
                           console.warn(`Parsed string for ${dateStr} was not an array. Resetting to empty array.`);
                           this.events[dateStr] = [];
                           needsSave = true;
                      }
                 } catch (e) {
                      console.warn(`Failed to parse string for ${dateStr}. Resetting to empty array.`);
                      this.events[dateStr] = [];
                      needsSave = true;
                 }
            } else {
                 console.warn(`Resetting non-array value for ${dateStr} to empty array.`);
                 this.events[dateStr] = [];
                 needsSave = true;
            }
            fixedEventDates++;
          }
      }
      
      // Check individual events within arrays
      let fixedEvents = 0;
      for (const dateStr in this.events) {
          // We know this.events[dateStr] is an array now (or was skipped)
          let eventIndex = 0;
          while (eventIndex < this.events[dateStr].length) {
              let event = this.events[dateStr][eventIndex];
              let eventNeedsUpdate = false;

              // Check if event is a valid object
              if (!event || typeof event !== 'object') {
                  console.warn(`Invalid event found at index ${eventIndex} for date ${dateStr}:`, event);
                  // Create a placeholder recovered event
                  event = {
                    id: `recovered_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    date: dateStr, // Assign the correct date
                    title: 'Recovered Event Data',
                    description: 'Original data was invalid.',
                    type: 'regular',
                    fullDay: true,
                    recovered: true // Flag as recovered
                  };
                  this.events[dateStr][eventIndex] = event; // Replace invalid entry
                  fixedEvents++;
                  needsSave = true;
                  eventNeedsUpdate = true; // Mark for further checks below if needed
              }

              // Ensure essential properties exist
              if (!event.id) {
                  event.id = `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                  console.warn(`Event on ${dateStr} missing ID. Assigned: ${event.id}`);
                  fixedEvents++;
                  needsSave = true;
                  eventNeedsUpdate = true;
              }
               if (typeof event.title !== 'string') { // Check type and existence
                  event.title = 'Untitled Event';
                  console.warn(`Event ${event.id} on ${dateStr} missing or invalid title. Reset.`);
                  fixedEvents++;
                  needsSave = true;
                  eventNeedsUpdate = true;
              }
               if (typeof event.type !== 'string' || !['regular', 'booked', 'blocked'].includes(event.type)) {
                   console.warn(`Event ${event.id} on ${dateStr} has invalid type "${event.type}". Resetting to "regular".`);
                   event.type = 'regular';
                   fixedEvents++;
                   needsSave = true;
                   eventNeedsUpdate = true;
               }
                if (typeof event.fullDay !== 'boolean') {
                   console.warn(`Event ${event.id} on ${dateStr} missing or invalid fullDay status. Defaulting to false.`);
                   event.fullDay = false; // Default to non-full day if unsure
                   fixedEvents++;
                   needsSave = true;
                   eventNeedsUpdate = true;
               }
               // If not full day, ensure times exist (or default them)
               if (!event.fullDay) {
                    if (typeof event.startTime !== 'string' || !event.startTime.includes(':')) {
                         console.warn(`Event ${event.id} on ${dateStr} missing or invalid startTime. Defaulting to 09:00.`);
                         event.startTime = '09:00';
                         fixedEvents++;
                         needsSave = true;
                         eventNeedsUpdate = true;
                    }
                     if (typeof event.endTime !== 'string' || !event.endTime.includes(':')) {
                         console.warn(`Event ${event.id} on ${dateStr} missing or invalid endTime. Defaulting to 10:00.`);
                         event.endTime = '10:00';
                         fixedEvents++;
                         needsSave = true;
                         eventNeedsUpdate = true;
                    }
                     // Basic time validation (ensure end is after start)
                     if (event.startTime >= event.endTime) {
                          console.warn(`Event ${event.id} on ${dateStr} has endTime <= startTime (${event.startTime} - ${event.endTime}). Adjusting endTime.`);
                          // Simple fix: set end time 1 hour after start
                          const [startH, startM] = event.startTime.split(':').map(Number);
                          const endH = (startH + 1) % 24;
                          event.endTime = `${endH.toString().padStart(2,'0')}:${startM.toString().padStart(2,'0')}`;
                          fixedEvents++;
                          needsSave = true;
                          eventNeedsUpdate = true;
                     }
               }
               // Ensure date property matches the key
               if (event.date !== dateStr) {
                    console.warn(`Event ${event.id} date property ("${event.date}") does not match its key ("${dateStr}"). Correcting.`);
                    event.date = dateStr;
                    fixedEvents++;
                    needsSave = true;
                    eventNeedsUpdate = true;
               }

              // If event was updated, replace it in the array
              if (eventNeedsUpdate) {
                  this.events[dateStr][eventIndex] = event;
              }
              
              eventIndex++; // Move to the next event
          } // End while loop for events on a date
      } // End for loop through dates
      
      // Check blockedDates object: Keys should be YYYY-MM-DD, values should be strings
      let fixedBlockedDates = 0;
      for (const dateStr in this.blockedDates) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
               console.warn(`Invalid date key found in blockedDates: "${dateStr}". Removing entry.`);
               delete this.blockedDates[dateStr];
               needsSave = true;
               fixedBlockedDates++;
               continue;
            }
            if (typeof this.blockedDates[dateStr] !== 'string') {
                 console.warn(`Invalid value for blocked date ${dateStr}:`, this.blockedDates[dateStr], ". Resetting to 'Unavailable'.");
                 this.blockedDates[dateStr] = 'Unavailable';
                 needsSave = true;
                 fixedBlockedDates++;
            }
      }

      // If we fixed anything, save the changes
      if (needsSave) {
        console.log(`Data integrity check found issues: Fixed ${fixedEventDates} date entries, ${fixedEvents} events, ${fixedBlockedDates} blocked dates. Saving updates...`);
        await this.saveAvailability();
        console.log("Updates saved successfully.");
      } else {
           console.log("Data integrity check completed. No issues found.");
      }
      
      return true; // Indicate check completed
    } catch (error) {
      console.error('Error during data integrity check:', error);
      return false; // Indicate failure
    }
  }
};
