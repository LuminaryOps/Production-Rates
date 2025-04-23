/**
 * Main Application Controller
 * Emmett's Production Rate Calculator
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
  usingGitHub: false,
  
  // Initialize the application
  async init() {
    try {
      // Load rates from JSON file
      const response = await fetch('data/rates.json');
      if (!response.ok) {
        throw new Error('Failed to load rates data');
      }
      this.rates = await response.json();
      
      // Initialize GitHub integration
      this.initGitHub();
      
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
  
  // Initialize GitHub integration
  async initGitHub() {
    try {
      // Initialize GitHub module
      await GitHub.init();
      
      // Initialize GitHub auth
      GitHubAuth.init();
      
      // Check if already authenticated
      if (GitHub.checkAuth()) {
        this.usingGitHub = true;
        console.log('GitHub integration enabled');
        
        // Add GitHub status indicator
        this.addGitHubStatusIndicator(true);
      } else {
        // Add GitHub login button
        this.addGitHubLoginButton();
      }
    } catch (error) {
      console.error('GitHub initialization failed:', error);
      
      // Add GitHub login button
      this.addGitHubLoginButton();
    }
  },
  
  // Add GitHub status indicator to the UI
  addGitHubStatusIndicator(isConnected) {
    // Create status indicator
    const indicator = document.createElement('div');
    indicator.className = 'github-status-indicator';
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
      <i class="fab fa-github" style="margin-right: 0.5rem;"></i>
      ${isConnected ? 'Connected to GitHub' : 'GitHub Disconnected'}
    `;
    
    // Add click handler to toggle login/logout
    indicator.addEventListener('click', () => {
      if (isConnected) {
        // Show logout confirmation
        if (confirm('Disconnect from GitHub? Your data will no longer be synchronized.')) {
          GitHub.logout();
          this.usingGitHub = false;
          
          // Update indicator
          this.addGitHubStatusIndicator(false);
        }
      } else {
        // Show login modal
        GitHubAuth.showAuthModal(() => {
          this.usingGitHub = true;
          
          // Update indicator
          this.addGitHubStatusIndicator(true);
          
          // Load data from GitHub
          this.loadDataFromGitHub();
        });
      }
    });
    
    // Remove existing indicator if any
    const existingIndicator = document.querySelector('.github-status-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }
    
    // Add to DOM
    document.body.appendChild(indicator);
  },
  
  // Add GitHub login button
  addGitHubLoginButton() {
    // Create button
    const button = document.createElement('div');
    button.className = 'github-login-button';
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
      <i class="fab fa-github" style="margin-right: 0.5rem;"></i>
      Login with GitHub
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
      GitHubAuth.showAuthModal(() => {
        this.usingGitHub = true;
        
        // Update UI with connected status
        this.addGitHubStatusIndicator(true);
        
        // Load data from GitHub
        this.loadDataFromGitHub();
      });
    });
    
    // Remove existing button if any
    const existingButton = document.querySelector('.github-login-button');
    if (existingButton) {
      existingButton.remove();
    }
    
    // Add to DOM
    document.body.appendChild(button);
  },
  
  // Load all data from GitHub
  async loadDataFromGitHub() {
    if (!this.usingGitHub) return;
    
    try {
      // Load history data
      const historyData = await GitHub.loadHistory();
      if (historyData && historyData.length > 0) {
        History.updateHistoryData(historyData);
      }
      
      // Load calendar data
      const calendarData = await GitHub.loadCalendarData();
      if (calendarData) {
        Calendar.updateAvailability(calendarData);
      }
      
      // Load theme preferences
      const preferences = await GitHub.loadPreferences();
      if (preferences) {
        UI.applyPreferences(preferences);
      }
      
      console.log('Data loaded from GitHub successfully');
    } catch (error) {
      console.error('Error loading data from GitHub:', error);
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
