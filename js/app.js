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
  usingFirebase: false,
  
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
      
      // Initialize Firebase integration
      this.initFirebase();
      
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
  
  // Initialize Firebase integration
  async initFirebase() {
    try {
      // Initialize Firebase storage
      const isInitialized = await FirebaseStorage.init();
      
      if (isInitialized) {
        this.usingFirebase = true;
        console.log('Firebase initialized successfully');
        
        // Add Firebase status indicator
        this.addFirebaseStatusIndicator(true);
        
        // Load data from Firebase
        this.loadDataFromFirebase();
      } else {
        console.error('Firebase initialization failed');
        this.addFirebaseStatusIndicator(false);
      }
    } catch (error) {
      console.error('Firebase initialization failed:', error);
      
      // Add status indicator showing Firebase is not connected
      this.addFirebaseStatusIndicator(false);
    }
  },
  
  // Add Firebase status indicator to the UI
  addFirebaseStatusIndicator(isConnected) {
    // Create status indicator
    const indicator = document.createElement('div');
    indicator.className = 'firebase-status-indicator';
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
    `;
    
    indicator.innerHTML = `
      <i class="fas fa-cloud" style="margin-right: 0.5rem;"></i>
      ${isConnected ? 'Connected to Cloud' : 'Local Storage Only'}
    `;
    
    // Remove existing indicator if any
    const existingIndicator = document.querySelector('.firebase-status-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }
    
    // Add to DOM
    document.body.appendChild(indicator);
  },
  
  // Load all data from Firebase
  async loadDataFromFirebase() {
    if (!this.usingFirebase) return;
    
    try {
      // Load history data
      const historyData = await FirebaseStorage.loadHistory();
      if (historyData && historyData.length > 0) {
        History.updateHistoryData(historyData);
      }
      
      // Load calendar data
      const calendarData = await FirebaseStorage.loadCalendarData();
      if (calendarData) {
        Calendar.updateAvailability(calendarData);
      }
      
      // Load theme preferences
      const preferences = await FirebaseStorage.loadPreferences();
      if (preferences) {
        UI.applyPreferences(preferences);
      }
      
      console.log('Data loaded from Firebase successfully');
    } catch (error) {
      console.error('Error loading data from Firebase:', error);
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
