/**
 * Main Application Controller
 * LuminaryOps Production Rate Calculator
 */

// Global app state
const AppState = {
  rates: null,
  quoteData: null,
  invoiceData: null,
  specialtyServices: [],
  quoteTotal: 0,
  depositAmount: 0,
  depositPercentage: 0,
  isPaid: false,
  selectedDates: null,
  availability: {
    bookedDates: {},
    blockedDates: {}
  },
  usingNetlify: false,
  
  // Initialize the application
  async init() {
    try {
      // Load rates from JSON file
      const response = await fetch('data/rates.json');
      if (!response.ok) {
        throw new Error('Failed to load rates data');
      }
      this.rates = await response.json();
      
      // Update business name in rates (in case it hasn't been updated in the file)
      this.rates.businessInfo.name = "LuminaryOps Technical Production";
      
      // Initialize Netlify integration
      this.initNetlify();
      
      // Initialize modules
      UI.init();
      Calculator.init(this.rates);
      Signature.init();
      Payment.init(this.rates.paymentMethods);
      History.init();
      
      // Initialize PIN Authentication
      PinAuth.init();
      
      // Initialize Calendar
      Calendar.init();
      
      console.log('App initialized successfully');
    } catch (error) {
      console.error('App initialization failed:', error);
      UI.showError('Failed to initialize application. Please refresh the page.');
    }
  },
  
  // Initialize Netlify integration
  async initNetlify() {
    try {
      // Initialize Netlify storage with automatic authentication
      const isInitialized = await NetlifyStorage.init();
      
      if (isInitialized) {
        if (NetlifyStorage.isAuthenticated) {
          this.usingNetlify = true;
          console.log('Already authenticated with Netlify Identity');
          
          // Add Netlify status indicator
          this.addNetlifyStatusIndicator(true);
          
          // Load data from Netlify
          this.loadDataFromNetlify();
        } else {
          // The login modal is showing automatically
          console.log('Authentication in progress, waiting for login...');
          
          // Don't add login button since the modal is already showing
          this.usingNetlify = false;
        }
      } else {
        console.error('Netlify initialization failed, adding fallback login button');
        this.addNetlifyLoginButton();
      }
    } catch (error) {
      console.error('Netlify initialization failed:', error);
      
      // Add Netlify login button as fallback
      this.addNetlifyLoginButton();
    }
  },
  
  // Add Netlify status indicator to the UI
  addNetlifyStatusIndicator(isConnected) {
    // Create status indicator
    const indicator = document.createElement('div');
    indicator.className = 'netlify-status-indicator';
    indicator.style.cssText = `
      position: fixed;
      top: 20px;
      right: 70px;
      display: flex;
      align-items: center;
      background-color: ${isConnected ? 'var(--success)' : 'var(--danger)'};
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
      z-index: 10;
      cursor: pointer;
    `;
    
    indicator.innerHTML = `
      <i class="fas fa-cloud" style="margin-right: 0.5rem;"></i>
      ${isConnected ? 'Connected to Cloud' : 'Not Connected'}
    `;
    
    // Add click handler to toggle login/logout
    indicator.addEventListener('click', () => {
      if (isConnected) {
        // Show logout confirmation
        if (confirm('Disconnect from cloud storage? Your data will no longer be synchronized.')) {
          NetlifyStorage.logout();
          this.usingNetlify = false;
          
          // Update indicator
          this.addNetlifyStatusIndicator(false);
        }
      } else {
        // Show login modal
        NetlifyStorage.showLoginModal(() => {
          this.usingNetlify = true;
          
          // Update indicator
          this.addNetlifyStatusIndicator(true);
          
          // Load data from Netlify
          this.loadDataFromNetlify();
        });
      }
    });
    
    // Remove existing indicator if any
    const existingIndicator = document.querySelector('.netlify-status-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }
    
    // Add to DOM
    document.body.appendChild(indicator);
  },
  
  // Add Netlify login button
  addNetlifyLoginButton() {
    // Create button
    const button = document.createElement('div');
    button.className = 'netlify-login-button';
    button.style.cssText = `
      position: fixed;
      top: 20px;
      right: 70px;
      display: flex;
      align-items: center;
      background-color: var(--gray-200);
      color: var(--gray-700);
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 500;
      z-index: 10;
      cursor: pointer;
      transition: var(--transition);
    `;
    
    button.innerHTML = `
      <i class="fas fa-cloud" style="margin-right: 0.5rem;"></i>
      Enable Cloud Storage
    `;
    
    // Add hover effect
    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = 'var(--gray-300)';
    });
    
    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = 'var(--gray-200)';
    });
    
    // Add click handler
    button.addEventListener('click', () => {
      NetlifyStorage.showLoginModal(() => {
        this.usingNetlify = true;
        
        // Update UI with connected status
        this.addNetlifyStatusIndicator(true);
        
        // Load data from Netlify
        this.loadDataFromNetlify();
      });
    });
    
    // Remove existing button if any
    const existingButton = document.querySelector('.netlify-login-button');
    if (existingButton) {
      existingButton.remove();
    }
    
    // Add to DOM
    document.body.appendChild(button);
  },
  
  // Load all data from Netlify
  async loadDataFromNetlify() {
    if (!this.usingNetlify) return;
    
    try {
      // Load history data
      const historyData = await NetlifyStorage.loadHistory();
      if (historyData && historyData.length > 0) {
        History.updateHistoryData(historyData);
      }
      
      // Load calendar data
      const calendarData = await NetlifyStorage.loadCalendarData();
      if (calendarData) {
        Calendar.updateAvailability(calendarData);
      }
      
      // Load theme preferences
      const preferences = await NetlifyStorage.loadPreferences();
      if (preferences) {
        UI.applyPreferences(preferences);
      }
      
      console.log('Data loaded from Netlify successfully');
    } catch (error) {
      console.error('Error loading data from Netlify:', error);
    }
  },
  
  // Reset the application state
  reset() {
    this.quoteData = null;
    this.invoiceData = null;
    this.specialtyServices = [];
    this.quoteTotal = 0;
    this.depositAmount = 0;
    this.depositPercentage = 0;
    this.isPaid = false;
    this.selectedDates = null;
  }
};

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  AppState.init();
});
