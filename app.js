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
  
  // Initialize the application
  async init() {
    try {
      // Load rates from JSON file
      const response = await fetch('data/rates.json');
      if (!response.ok) {
        throw new Error('Failed to load rates data');
      }
      this.rates = await response.json();
      
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
