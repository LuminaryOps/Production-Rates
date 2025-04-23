/**
 * Netlify Integration Module
 * Handles all storage operations through Netlify Functions
 */

const NetlifyStorage = {
  isAuthenticated: false,
  user: null,
  
  // Initialize Netlify integration
  async init() {
    try {
      // Initialize Netlify Identity
      if (window.netlifyIdentity) {
        console.log('Netlify Identity already loaded');
        
        // Check if user is already logged in
        const user = window.netlifyIdentity.currentUser();
        if (user) {
          this.user = user;
          this.isAuthenticated = true;
          console.log('User already authenticated with Netlify Identity');
          return true;
        } else {
          // =====================================================
          // DEVELOPMENT AUTO-LOGIN - REMOVE IN PRODUCTION
          // =====================================================
          const devEmail = 'drewemmett123@gmail.com'; // REPLACE WITH YOUR EMAIL
          const devPassword = 'McMik420kushblaze';       // REPLACE WITH YOUR PASSWORD
          
          console.log('Attempting automatic login for development...');
          
          try {
            // Attempt to login automatically
            const user = await window.netlifyIdentity.login({
              email: devEmail,
              password: devPassword,
              remember: true
            });
            
            this.user = user;
            this.isAuthenticated = true;
            console.log('Auto-login successful');
            
            // Update AppState directly instead of reloading
            if (typeof AppState !== 'undefined') {
              AppState.usingNetlify = true;
              AppState.addNetlifyStatusIndicator(true);
              AppState.loadDataFromNetlify();
            }
            
            return true;
          } catch (loginError) {
            console.error('Auto-login failed:', loginError);
            
            // Fall back to showing the login modal
            console.log('No authenticated user found, showing login modal...');
            
            // Set up a one-time login event handler for the modal
            window.netlifyIdentity.on('login', user => {
              this.user = user;
              this.isAuthenticated = true;
              console.log('Netlify Identity login successful');
              
              // Close the modal automatically
              window.netlifyIdentity.close();
              
              // Update AppState directly instead of reloading
              if (typeof AppState !== 'undefined') {
                AppState.usingNetlify = true;
                AppState.addNetlifyStatusIndicator(true);
                AppState.loadDataFromNetlify();
              } else {
                // Fallback to page reload if AppState is not available
                window.location.reload();
              }
            });
            
            // Open login modal
            setTimeout(() => {
              window.netlifyIdentity.open('login');
            }, 500); // Slight delay to ensure UI is ready
          }
        }
      } else {
        // Load Netlify Identity script if not already loaded
        await this.loadNetlifyIdentityWidget();
        
        // Add event listeners for login/logout
        window.netlifyIdentity.on('login', user => {
          this.user = user;
          this.isAuthenticated = true;
          console.log('Netlify Identity login successful');
          
          // Close the modal automatically
          window.netlifyIdentity.close();
          
          // Update AppState directly instead of reloading
          if (typeof AppState !== 'undefined') {
            AppState.usingNetlify = true;
            AppState.addNetlifyStatusIndicator(true);
            AppState.loadDataFromNetlify();
          } else {
            // Fallback to page reload if AppState is not available
            window.location.reload();
          }
        });
        
        window.netlifyIdentity.on('logout', () => {
          this.user = null;
          this.isAuthenticated = false;
          console.log('Netlify Identity logout successful');
        });
        
        // After loading the widget, try auto-login
        console.log('Attempting automatic login after widget load...');
        setTimeout(async () => {
          try {
            // =====================================================
            // DEVELOPMENT AUTO-LOGIN - REMOVE IN PRODUCTION
            // =====================================================
            const devEmail = 'your-email@example.com'; // REPLACE WITH YOUR EMAIL
            const devPassword = 'your-password';       // REPLACE WITH YOUR PASSWORD
            
            // Attempt to login automatically 
            const user = await window.netlifyIdentity.login({
              email: devEmail,
              password: devPassword,
              remember: true
            });
            
            this.user = user;
            this.isAuthenticated = true;
            console.log('Auto-login successful after widget load');
            
            // Update AppState
            if (typeof AppState !== 'undefined') {
              AppState.usingNetlify = true;
              AppState.addNetlifyStatusIndicator(true);
              AppState.loadDataFromNetlify();
            }
          } catch (loginError) {
            console.error('Auto-login failed after widget load:', loginError);
            // Fall back to showing the login modal
            window.netlifyIdentity.open('login');
          }
        }, 1000); // Longer delay after widget loads
      }
      
      return true;
    } catch (error) {
      console.error('Error initializing Netlify integration:', error);
      return false;
    }
  },
  
  // Load Netlify Identity Widget if not already loaded
  loadNetlifyIdentityWidget() {
    return new Promise((resolve, reject) => {
      if (window.netlifyIdentity) {
        resolve();
        return;
      }
      
      const script = document.createElement('script');
      script.src = 'https://identity.netlify.com/v1/netlify-identity-widget.js';
      script.async = true;
      script.onload = () => {
        console.log('Netlify Identity Widget loaded');
        resolve();
      };
      script.onerror = (err) => {
        console.error('Error loading Netlify Identity Widget:', err);
        reject(err);
      };
      
      document.head.appendChild(script);
    });
  },
  
  // Show login modal
  showLoginModal(successCallback) {
    if (!window.netlifyIdentity) {
      console.error('Netlify Identity Widget not loaded');
      return;
    }
    
    // Open the Netlify Identity Widget modal
    window.netlifyIdentity.open('login');
    
    // Set up a one-time login event handler for the callback
    const loginHandler = (user) => {
      // Remove the handler after it's called once
      window.netlifyIdentity.off('login', loginHandler);
      
      // Call the success callback if provided
      if (typeof successCallback === 'function') {
        successCallback(user);
      }
    };
    
    window.netlifyIdentity.on('login', loginHandler);
  },
  
  // Log out the current user
  logout() {
    if (!window.netlifyIdentity) {
      console.error('Netlify Identity Widget not loaded');
      return;
    }
    
    window.netlifyIdentity.logout();
    this.user = null;
    this.isAuthenticated = false;
  },
  
  // Check if user is authenticated
  checkAuth() {
    if (!window.netlifyIdentity) {
      return false;
    }
    
    const user = window.netlifyIdentity.currentUser();
    return !!user;
  },
  
  // Get JWT token for authenticated requests
  getAuthToken() {
    if (!this.checkAuth()) {
      return null;
    }
    
    return window.netlifyIdentity.currentUser().token.access_token;
  },
  
  // Get or create user-specific data folder ID
  getUserFolderId() {
    if (!this.checkAuth()) {
      return 'anonymous';
    }
    
    // Use user sub (subject) or ID as the folder name
    const user = window.netlifyIdentity.currentUser();
    return user.id || user.sub || 'anonymous';
  },
  
  // Helper function to make authenticated API calls to Netlify Functions
  async callFunction(functionName, data = {}) {
    try {
      // Add authentication token if available
      const headers = {
        'Content-Type': 'application/json'
      };
      
      const token = this.getAuthToken();
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Make the API call
      const response = await fetch(`/.netlify/functions/${functionName}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...data,
          userId: this.getUserFolderId() // Always include user ID for data separation
        })
      });
      
      if (!response.ok) {
        throw new Error(`Function call failed: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Error calling Netlify function ${functionName}:`, error);
      throw error;
    }
  },
  
  // Save history data (quotes and invoices)
  async saveHistory(historyData) {
    try {
      const result = await this.callFunction('saveHistory', { historyData });
      return result.success;
    } catch (error) {
      console.error('Error saving history data:', error);
      return false;
    }
  },
  
  // Load history data
  async loadHistory() {
    try {
      const result = await this.callFunction('getHistory');
      return result.data || [];
    } catch (error) {
      console.error('Error loading history data:', error);
      return [];
    }
  },
  
  // Save calendar availability data
  async saveCalendarData(availability) {
    try {
      const result = await this.callFunction('saveCalendar', { availability });
      return result.success;
    } catch (error) {
      console.error('Error saving calendar data:', error);
      return false;
    }
  },
  
  // Load calendar availability data
  async loadCalendarData() {
    try {
      const result = await this.callFunction('getCalendar');
      return result.data || { bookedDates: {}, blockedDates: {} };
    } catch (error) {
      console.error('Error loading calendar data:', error);
      return { bookedDates: {}, blockedDates: {} };
    }
  },
  
  // Save signature data
  async saveSignatureData(signatureData) {
    try {
      const result = await this.callFunction('saveSignature', { signatureData });
      return result.success;
    } catch (error) {
      console.error('Error saving signature data:', error);
      return false;
    }
  },
  
  // Load signature history
  async loadSignatureHistory() {
    try {
      const result = await this.callFunction('getSignatures');
      return result.data || [];
    } catch (error) {
      console.error('Error loading signature history:', error);
      return [];
    }
  },
  
  // Save user preferences
  async savePreferences(preferences) {
    try {
      const result = await this.callFunction('savePreferences', { preferences });
      return result.success;
    } catch (error) {
      console.error('Error saving preferences:', error);
      return false;
    }
  },
  
  // Load user preferences
  async loadPreferences() {
    try {
      const result = await this.callFunction('getPreferences');
      return result.data || { theme: 'dark' };
    } catch (error) {
      console.error('Error loading preferences:', error);
      return { theme: 'dark' };
    }
  }
};

// Helper component for showing authentication required UI
const NetlifyAuth = {
  // Show authentication required message
  showAuthRequired(message = 'This feature requires authentication') {
    const container = document.createElement('div');
    container.className = 'auth-required-container';
    container.style.cssText = `
      text-align: center;
      padding: 2rem;
      background-color: var(--gray-100);
      border-radius: var(--border-radius);
      margin: 1rem 0;
    `;
    
    container.innerHTML = `
      <i class="fas fa-user-lock" style="font-size: 3rem; color: var(--gray-600); margin-bottom: 1rem;"></i>
      <h3 style="margin-bottom: 1rem;">${message}</h3>
      <p style="color: var(--gray-600); margin-bottom: 1.5rem;">
        Please log in to enable storage and synchronization features.
      </p>
      <button class="btn btn-primary auth-login-btn">
        <i class="fas fa-sign-in-alt"></i> Log In
      </button>
    `;
    
    // Add login button handler
    container.querySelector('.auth-login-btn').addEventListener('click', () => {
      NetlifyStorage.showLoginModal();
    });
    
    return container;
  }
};
