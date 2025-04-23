/**
 * GitHub Integration Module
 * Handles all GitHub API interactions for storage and retrieval
 */

const GitHub = {
  accessToken: null,
  username: null,
  repository: null,
  isAuthenticated: false,
  
  // Initialize GitHub integration with settings
  async init(settings = {}) {
    try {
      // Check if we have stored credentials
      const storedToken = localStorage.getItem('github_token');
      const storedUsername = localStorage.getItem('github_username');
      const storedRepo = localStorage.getItem('github_repository');
      
      // Use settings if provided, otherwise use stored values
      this.accessToken = settings.accessToken || storedToken;
      this.username = settings.username || storedUsername;
      this.repository = settings.repository || storedRepo || 'Production-Rates';
      
      // Check if we have valid credentials
      if (this.accessToken && this.username) {
        // Verify token validity
        const isValid = await this.verifyToken();
        if (isValid) {
          this.isAuthenticated = true;
          console.log('GitHub authentication successful');
          
          // Create repository if it doesn't exist
          await this.ensureRepositoryExists();
          return true;
        }
      }
      
      // If we get here, we need to authenticate
      return false;
    } catch (error) {
      console.error('GitHub initialization error:', error);
      return false;
    }
  },
  
  // Authenticate with GitHub using Personal Access Token
  async authenticate(token, username, repository) {
    try {
      this.accessToken = token;
      this.username = username;
      this.repository = repository || 'Production-Rates';
      
      // Verify token validity
      const isValid = await this.verifyToken();
      if (isValid) {
        // Store credentials for future use
        localStorage.setItem('github_token', token);
        localStorage.setItem('github_username', username);
        localStorage.setItem('github_repository', this.repository);
        
        this.isAuthenticated = true;
        console.log('GitHub authentication successful');
        
        // Create repository if it doesn't exist
        await this.ensureRepositoryExists();
        
        return true;
      } else {
        throw new Error('Invalid GitHub credentials');
      }
    } catch (error) {
      console.error('GitHub authentication error:', error);
      this.isAuthenticated = false;
      return false;
    }
  },
  
  // Verify token validity by making a simple API request
  async verifyToken() {
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `token ${this.accessToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Verify that the username matches
        return data.login.toLowerCase() === this.username.toLowerCase();
      }
      
      return false;
    } catch (error) {
      console.error('Token verification error:', error);
      return false;
    }
  },
  
  // Make sure the repository exists, create it if it doesn't
  async ensureRepositoryExists() {
    try {
      // Check if repository exists
      const repoExists = await this.checkRepositoryExists();
      
      if (!repoExists) {
        // Create repository
        await this.createRepository();
        
        // Create initial structure
        await this.createInitialStructure();
      }
      
      return true;
    } catch (error) {
      console.error('Error ensuring repository exists:', error);
      throw error;
    }
  },
  
  // Check if repository exists
  async checkRepositoryExists() {
    try {
      const response = await fetch(`https://api.github.com/repos/${this.username}/${this.repository}`, {
        headers: {
          'Authorization': `token ${this.accessToken}`
        }
      });
      
      return response.ok;
    } catch (error) {
      console.error('Error checking repository:', error);
      return false;
    }
  },
  
  // Create a new repository
  async createRepository() {
    try {
      const response = await fetch('https://api.github.com/user/repos', {
        method: 'POST',
        headers: {
          'Authorization': `token ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: this.repository,
          description: 'Production Calculator Data Repository',
          private: true, // Make it private for security
          auto_init: true // Initialize with README
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to create repository: ${errorData.message}`);
      }
      
      console.log('Repository created successfully');
      return true;
    } catch (error) {
      console.error('Error creating repository:', error);
      throw error;
    }
  },
  
  // Create initial folder and file structure
  async createInitialStructure() {
    try {
      // Create data folders
      const folders = ['history', 'calendar', 'signatures', 'settings'];
      
      for (const folder of folders) {
        // Create a placeholder README in each folder
        await this.createOrUpdateFile(
          `${folder}/README.md`,
          `# ${folder.charAt(0).toUpperCase() + folder.slice(1)} Data\n\nThis folder contains ${folder} data for the Production Calculator.`
        );
      }
      
      // Create initial data files
      await this.createOrUpdateFile(
        'history/quotes.json',
        JSON.stringify([], null, 2)
      );
      
      await this.createOrUpdateFile(
        'history/invoices.json',
        JSON.stringify([], null, 2)
      );
      
      await this.createOrUpdateFile(
        'calendar/availability.json',
        JSON.stringify({
          bookedDates: {},
          blockedDates: {}
        }, null, 2)
      );
      
      await this.createOrUpdateFile(
        'signatures/signatures.json',
        JSON.stringify([], null, 2)
      );
      
      await this.createOrUpdateFile(
        'settings/preferences.json',
        JSON.stringify({
          theme: 'dark'
        }, null, 2)
      );
      
      console.log('Initial repository structure created');
      return true;
    } catch (error) {
      console.error('Error creating initial structure:', error);
      return false;
    }
  },
  
  // Read a file from the repository
  async readFile(path) {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated with GitHub');
    }
    
    try {
      // Get file content
      const response = await fetch(`https://api.github.com/repos/${this.username}/${this.repository}/contents/${path}`, {
        headers: {
          'Authorization': `token ${this.accessToken}`
        }
      });
      
      if (!response.ok) {
        // If file doesn't exist, return null
        if (response.status === 404) {
          return null;
        }
        
        throw new Error(`Failed to read file: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Decode content from Base64
      const content = atob(data.content);
      
      return {
        content,
        sha: data.sha // We need the SHA for updates
      };
    } catch (error) {
      console.error(`Error reading file ${path}:`, error);
      throw error;
    }
  },
  
  // Create or update a file in the repository
  async createOrUpdateFile(path, content, message = 'Update file') {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated with GitHub');
    }
    
    try {
      // Check if file exists to get SHA
      let sha = null;
      
      try {
        const fileData = await this.readFile(path);
        if (fileData) {
          sha = fileData.sha;
        }
      } catch (error) {
        // File doesn't exist, which is fine for creation
      }
      
      // Create payload
      const payload = {
        message: message,
        content: btoa(content), // Convert to Base64
        branch: 'main'
      };
      
      // If SHA exists, add it for updating
      if (sha) {
        payload.sha = sha;
      }
      
      // Create or update file
      const response = await fetch(`https://api.github.com/repos/${this.username}/${this.repository}/contents/${path}`, {
        method: 'PUT',
        headers: {
          'Authorization': `token ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to update file: ${errorData.message}`);
      }
      
      return true;
    } catch (error) {
      console.error(`Error updating file ${path}:`, error);
      throw error;
    }
  },
  
  // Delete a file from the repository
  async deleteFile(path, message = 'Delete file') {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated with GitHub');
    }
    
    try {
      // Get the SHA of the file
      const fileData = await this.readFile(path);
      if (!fileData) {
        throw new Error('File not found');
      }
      
      // Delete the file
      const response = await fetch(`https://api.github.com/repos/${this.username}/${this.repository}/contents/${path}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `token ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: message,
          sha: fileData.sha,
          branch: 'main'
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Failed to delete file: ${errorData.message}`);
      }
      
      return true;
    } catch (error) {
      console.error(`Error deleting file ${path}:`, error);
      throw error;
    }
  },
  
  // Save history data (quotes and invoices)
  async saveHistory(historyData) {
    try {
      // Split history into quotes and invoices
      const quotes = historyData.filter(item => item.type === 'quote');
      const invoices = historyData.filter(item => item.type === 'invoice');
      
      // Save quotes
      await this.createOrUpdateFile(
        'history/quotes.json',
        JSON.stringify(quotes, null, 2),
        'Update quotes history'
      );
      
      // Save invoices
      await this.createOrUpdateFile(
        'history/invoices.json',
        JSON.stringify(invoices, null, 2),
        'Update invoices history'
      );
      
      return true;
    } catch (error) {
      console.error('Error saving history:', error);
      throw error;
    }
  },
  
  // Load history data (quotes and invoices)
  async loadHistory() {
    try {
      // Load quotes
      const quotesFile = await this.readFile('history/quotes.json');
      const quotes = quotesFile ? JSON.parse(quotesFile.content) : [];
      
      // Load invoices
      const invoicesFile = await this.readFile('history/invoices.json');
      const invoices = invoicesFile ? JSON.parse(invoicesFile.content) : [];
      
      // Combine and sort by date (newest first)
      const combined = [...quotes, ...invoices].sort((a, b) => {
        return new Date(b.date) - new Date(a.date);
      });
      
      return combined;
    } catch (error) {
      console.error('Error loading history:', error);
      return [];
    }
  },
  
  // Save calendar availability data
  async saveCalendarData(availability) {
    try {
      await this.createOrUpdateFile(
        'calendar/availability.json',
        JSON.stringify(availability, null, 2),
        'Update calendar availability'
      );
      
      return true;
    } catch (error) {
      console.error('Error saving calendar data:', error);
      throw error;
    }
  },
  
  // Load calendar availability data
  async loadCalendarData() {
    try {
      const fileData = await this.readFile('calendar/availability.json');
      
      if (fileData) {
        return JSON.parse(fileData.content);
      }
      
      return {
        bookedDates: {},
        blockedDates: {}
      };
    } catch (error) {
      console.error('Error loading calendar data:', error);
      return {
        bookedDates: {},
        blockedDates: {}
      };
    }
  },
  
  // Save signature data
  async saveSignatureData(signatureData) {
    try {
      // Load existing signatures
      const fileData = await this.readFile('signatures/signatures.json');
      const signatures = fileData ? JSON.parse(fileData.content) : [];
      
      // Add new signature to the beginning
      signatures.unshift({
        id: Date.now(),
        date: new Date().toISOString(),
        clientName: signatureData.name,
        projectName: signatureData.quoteData.project.name || 'Unnamed Project',
        amount: signatureData.quoteData.total,
        signatureData
      });
      
      // Keep only the last 50 signatures
      if (signatures.length > 50) {
        signatures.length = 50;
      }
      
      // Save back to GitHub
      await this.createOrUpdateFile(
        'signatures/signatures.json',
        JSON.stringify(signatures, null, 2),
        'Add new signature'
      );
      
      return true;
    } catch (error) {
      console.error('Error saving signature data:', error);
      throw error;
    }
  },
  
  // Load signature history
  async loadSignatureHistory() {
    try {
      const fileData = await this.readFile('signatures/signatures.json');
      return fileData ? JSON.parse(fileData.content) : [];
    } catch (error) {
      console.error('Error loading signature history:', error);
      return [];
    }
  },
  
  // Save user preferences
  async savePreferences(preferences) {
    try {
      await this.createOrUpdateFile(
        'settings/preferences.json',
        JSON.stringify(preferences, null, 2),
        'Update user preferences'
      );
      
      return true;
    } catch (error) {
      console.error('Error saving preferences:', error);
      throw error;
    }
  },
  
  // Load user preferences
  async loadPreferences() {
    try {
      const fileData = await this.readFile('settings/preferences.json');
      return fileData ? JSON.parse(fileData.content) : { theme: 'dark' };
    } catch (error) {
      console.error('Error loading preferences:', error);
      return { theme: 'dark' };
    }
  },
  
  // Check if we're currently authenticated
  checkAuth() {
    return this.isAuthenticated;
  },
  
  // Log out - clear authentication tokens
  logout() {
    this.accessToken = null;
    this.username = null;
    this.isAuthenticated = false;
    
    // Clear stored credentials
    localStorage.removeItem('github_token');
    localStorage.removeItem('github_username');
    localStorage.removeItem('github_repository');
    
    console.log('Logged out of GitHub');
    return true;
  },
  
  // Automatic authentication with hardcoded credentials
  async autoAuthenticate() {
    try {
      console.log('Attempting automatic GitHub authentication...');
      
      // NOTE: Using hardcoded credentials as requested
      // GitHub credentials - application-specific account
      const username = 'drewemmett123'; // GitHub username
      const token = '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'; // Personal Access Token
      const repository = 'Production-Rates';
      
      // Authenticate with GitHub
      const success = await this.authenticate(token, username, repository);
      
      if (success) {
        console.log('Auto-authentication successful!');
        return true;
      } else {
        console.error('Auto-authentication failed with provided credentials');
        return false;
      }
    } catch (error) {
      console.error('Error during auto-authentication:', error);
      return false;
    }
  }
};
