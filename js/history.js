/**
 * History Module
 * Handles the storage and retrieval of quote/invoice history
 * Now with GitHub integration
 */

const History = {
  historyData: [],
  useGitHub: false,
  
  // Initialize history module
  async init() {
    // Create history tab and content
    this.createHistoryTab();
    
    // Check if GitHub service is available and initialized
    if (typeof GitHubService !== 'undefined') {
      // Try to load stored config first
      const storedConfig = GitHubService.loadStoredConfig();
      
      if (storedConfig) {
        // Try to initialize with stored config
        this.useGitHub = GitHubService.init(storedConfig);
        
        // If token is missing, prompt for it
        if (!this.useGitHub) {
          const token = prompt('Enter your GitHub personal access token to access your data:');
          if (token) {
            storedConfig.token = token;
            this.useGitHub = GitHubService.init(storedConfig);
          }
        }
      }
      
      // If still not initialized, prompt for new config
      if (!this.useGitHub) {
        const result = await this.promptForGitHubSetup();
        this.useGitHub = result;
      }
      
      console.log(`History module initialized with ${this.useGitHub ? 'GitHub' : 'localStorage'} storage`);
    } else {
      console.warn('GitHubService not available, using localStorage for history');
    }
    
    // Load existing history
    await this.loadHistory();
    
    // Add save handlers to quotes and invoices
    this.setupSaveHandlers();
  },
  
  // Create history tab and content
  createHistoryTab() {
    // Create tab
    const tabsContainer = document.querySelector('.tabs');
    const historyTab = document.createElement('div');
    historyTab.className = 'tab';
    historyTab.setAttribute('data-tab', 'history');
    historyTab.innerHTML = '<i class="fas fa-history"></i> History <i class="fas fa-lock" style="font-size: 0.75em; margin-left: 0.5rem;"></i>';
    
    // Add tab
    tabsContainer.appendChild(historyTab);
    
    // Create tab content
    const tabContent = document.createElement('div');
    tabContent.id = 'history';
    tabContent.className = 'tab-content';
    
    // Add content structure
    tabContent.innerHTML = `
      <div class="card">
        <h2><i class="fas fa-history"></i> Quote & Invoice History</h2>
        
        <div class="search-filter" style="margin-bottom: 1.5rem;">
          <div class="row">
            <div class="col">
              <div class="form-group">
                <label for="historySearch">Search</label>
                <input type="text" id="historySearch" placeholder="Search by client or project...">
              </div>
            </div>
            <div class="col">
              <div class="form-group">
                <label for="historyFilter">Filter</label>
                <select id="historyFilter">
                  <option value="all">All Documents</option>
                  <option value="quotes">Quotes Only</option>
                  <option value="invoices">Invoices Only</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        
        <div id="historyStorage" style="display: flex; justify-content: flex-end; margin-bottom: 1rem;">
          <div class="switch-container">
            <label class="switch">
              <input type="checkbox" id="useGitHubSwitch">
              <span class="slider"></span>
            </label>
            <span class="switch-label">Use GitHub Storage</span>
          </div>
          <button id="syncGitHubBtn" class="btn btn-sm btn-outline" style="margin-left: 1rem;">
            <i class="fas fa-sync"></i> Sync with GitHub
          </button>
        </div>
        
        <div id="historyList" class="history-list">
          <div class="history-empty" style="text-align: center; padding: 3rem 1rem; color: var(--gray-500); font-style: italic;">
            No history yet. Create a quote to get started.
          </div>
        </div>
      </div>
    `;
    
    // Add tab content to container
    document.querySelector('.container').appendChild(tabContent);
    
    // Add search/filter functionality
    document.getElementById('historySearch').addEventListener('input', this.refreshHistoryDisplay.bind(this));
    document.getElementById('historyFilter').addEventListener('change', this.refreshHistoryDisplay.bind(this));
  
    // Add GitHub storage switch functionality
    const useGitHubSwitch = document.getElementById('useGitHubSwitch');
    if (useGitHubSwitch) {
      useGitHubSwitch.addEventListener('change', async (e) => {
        if (e.target.checked) {
          // Enable GitHub storage
          const result = await this.promptForGitHubSetup();
          if (result) {
            this.useGitHub = true;
            await this.loadHistory();
            this.refreshHistoryDisplay();
          } else {
            e.target.checked = false;
          }
        } else {
          // Disable GitHub storage
          this.useGitHub = false;
          await this.loadHistory();
          this.refreshHistoryDisplay();
        }
      });
    }
    
    // Add sync button functionality
    const syncGitHubBtn = document.getElementById('syncGitHubBtn');
    if (syncGitHubBtn) {
      syncGitHubBtn.addEventListener('click', async () => {
        if (this.useGitHub) {
          await this.loadHistory();
          this.refreshHistoryDisplay();
          alert('History synchronized with GitHub repository');
        } else {
          alert('GitHub storage is not enabled. Please enable it first.');
        }
      });
    }
    
    // IMPORTANT: Manually add the event listener for the history tab
    // This is necessary because the tab is added after UI.initTabs() is called
    historyTab.addEventListener('click', () => {
      // Require PIN authentication
      if (typeof PinAuth !== 'undefined') {
        PinAuth.verifyPin(() => {
          // This runs after successful PIN verification
          
          // Remove active class from all tabs and contents
          document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
          document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
          
          // Add active class to history tab and content
          historyTab.classList.add('active');
          tabContent.classList.add('active');
          
          // Refresh history display
          this.refreshHistoryDisplay();
          
          // Update GitHub switch state
          const useGitHubSwitch = document.getElementById('useGitHubSwitch');
          if (useGitHubSwitch) {
            useGitHubSwitch.checked = this.useGitHub;
          }
        });
      } else {
        console.error('PinAuth module not available');
        alert('PIN Authentication system is not available. Unable to access history.');
      }
    });
  },
  
  // Prompt for GitHub setup
  async promptForGitHubSetup() {
    if (typeof GitHubService === 'undefined') {
      alert('GitHub service is not available');
      return false;
    }
    
    if (confirm('Would you like to use GitHub for data storage? This allows you to save your quotes and invoices securely in a GitHub repository.')) {
      // Get GitHub configuration
      const config = await GitHubService.promptForConfig();
      
      if (config) {
        // Initialize GitHub service
        const initialized = GitHubService.init(config);
        
        if (initialized) {
          // Setup repository structure
          const setupResult = await GitHubService.setupRepository();
          
          if (setupResult) {
            alert('GitHub repository setup successfully. Your data will now be stored in your GitHub repository.');
            return true;
          } else {
            alert('Failed to setup GitHub repository structure. Using localStorage instead.');
          }
        } else {
          alert('Failed to initialize GitHub service. Using localStorage instead.');
        }
      }
    }
    
    return false;
  },
  
  // Set up handlers to save quotes and invoices
  setupSaveHandlers() {
    // Save quote when generated
    document.getElementById('calculateBtn').addEventListener('click', () => {
      setTimeout(() => {
        if (AppState.quoteData) {
          this.saveQuote();
        }
      }, 700); // Wait for quote to be rendered
    });
    
    // Save invoice when generated
    document.getElementById('generateInvoice').addEventListener('click', () => {
      setTimeout(() => {
        if (AppState.invoiceData) {
          this.saveInvoice();
        }
      }, 700); // Wait for invoice to be rendered
    });
  },
  
  // Load history from repository
  async loadHistory() {
    if (this.useGitHub) {
      try {
        // Get quote index
        const quoteIndex = await GitHubService.getFileContent('data/quotes/index.json') || [];
        
        // Get invoice index
        const invoiceIndex = await GitHubService.getFileContent('data/invoices/index.json') || [];
        
        // Combine and sort by date (newest first)
        this.historyData = [...quoteIndex, ...invoiceIndex].sort((a, b) => {
          return new Date(b.date) - new Date(a.date);
        });
        
        console.log('History loaded from GitHub:', this.historyData.length, 'items');
      } catch (error) {
        console.error('Error loading history from GitHub:', error);
        // Fallback to localStorage
        this.loadHistoryFromLocalStorage();
      }
    } else {
      // Load from localStorage
      this.loadHistoryFromLocalStorage();
    }
  },
  
  // Load history from localStorage (fallback)
  loadHistoryFromLocalStorage() {
    try {
      const storedHistory = localStorage.getItem('quoteHistory');
      if (storedHistory) {
        this.historyData = JSON.parse(storedHistory);
        console.log('History loaded from localStorage:', this.historyData.length, 'items');
      } else {
        this.historyData = [];
      }
    } catch (error) {
      console.error('Error loading history from localStorage:', error);
      this.historyData = [];
    }
  },
  
  // Save history
  async saveHistory() {
    if (this.useGitHub) {
      try {
        // Separate quotes and invoices
        const quotes = this.historyData.filter(item => item.type === 'quote');
        const invoices = this.historyData.filter(item => item.type === 'invoice');
        
        // Update quote index
        await GitHubService.saveFile('data/quotes/index.json', quotes, 'Update quote index');
        
        // Update invoice index
        await GitHubService.saveFile('data/invoices/index.json', invoices, 'Update invoice index');
        
        console.log('History saved to GitHub');
      } catch (error) {
        console.error('Error saving history to GitHub:', error);
        // Fallback to localStorage
        this.saveHistoryToLocalStorage();
      }
    } else {
      // Save to localStorage
      this.saveHistoryToLocalStorage();
    }
  },
  
  // Save history to localStorage (fallback)
  saveHistoryToLocalStorage() {
    try {
      localStorage.setItem('quoteHistory', JSON.stringify(this.historyData));
      console.log('History saved to localStorage');
    } catch (error) {
      console.error('Error saving history to localStorage:', error);
    }
  },
  
  // Create a unique ID for history items
  generateId() {
    return 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  },
  
  // Save quote to history
  async saveQuote() {
    // Get client and project info
    const clientName = document.getElementById('clientName').value.trim() || 'Unnamed Client';
    const projectName = document.getElementById('projectName').value.trim() || 'Unnamed Project';
    
    // Create history item
    const quoteId = this.generateId();
    const quoteItem = {
      id: quoteId,
      type: 'quote',
      client: clientName,
      project: projectName,
      amount: AppState.quoteTotal,
      date: new Date().toISOString(),
      quoteData: { ...AppState.quoteData },
      html: document.getElementById('quoteSection').innerHTML
    };
    
    // Add to history
    this.historyData.unshift(quoteItem);
    
    // Save history
    await this.saveHistory();
    
    // If using GitHub, also save individual quote file
    if (this.useGitHub) {
      try {
        await GitHubService.saveFile(`data/quotes/${quoteId}.json`, quoteItem, `Save quote for ${clientName} - ${projectName}`);
      } catch (error) {
        console.error('Error saving individual quote file to GitHub:', error);
      }
    }
    
    console.log('Quote saved to history:', quoteItem);
  },
  
  // Save invoice to history
  async saveInvoice() {
    // Get client and project info
    const clientName = document.getElementById('invoiceClient').textContent.trim() || 'Unnamed Client';
    const projectName = document.getElementById('invoiceProject').textContent.trim() || 'Unnamed Project';
    const invoiceNumber = document.getElementById('invoiceNumber').textContent.trim();
    
    // Create history item
    const invoiceId = this.generateId();
    const invoiceItem = {
      id: invoiceId,
      type: 'invoice',
      client: clientName,
      project: projectName,
      invoiceNumber: invoiceNumber,
      amount: AppState.quoteTotal,
      depositAmount: AppState.depositAmount,
      depositPaid: AppState.isPaid,
      date: new Date().toISOString(),
      invoiceData: { ...AppState.invoiceData },
      html: document.getElementById('invoiceSection').innerHTML
    };
    
    // Add to history
    this.historyData.unshift(invoiceItem);
    
    // Save history
    await this.saveHistory();
    
    // If using GitHub, also save individual invoice file
    if (this.useGitHub) {
      try {
        await GitHubService.saveFile(
          `data/invoices/${invoiceId}.json`, 
          invoiceItem, 
          `Save invoice ${invoiceNumber} for ${clientName} - ${projectName}`
        );
      } catch (error) {
        console.error('Error saving individual invoice file to GitHub:', error);
      }
    }
    
    console.log('Invoice saved to history:', invoiceItem);
  },
  
  // Refresh history display
  refreshHistoryDisplay() {
    const historyList = document.getElementById('historyList');
    const searchTerm = document.getElementById('historySearch').value.toLowerCase();
    const filter = document.getElementById('historyFilter').value;
    
    // Clear list
    historyList.innerHTML = '';
    
    // Filter history items
    const filteredItems = this.historyData.filter(item => {
      // Apply type filter
      if (filter === 'quotes' && item.type !== 'quote') return false;
      if (filter === 'invoices' && item.type !== 'invoice') return false;
      
      // Apply search
      if (searchTerm) {
        const clientMatch = item.client.toLowerCase().includes(searchTerm);
        const projectMatch = item.project.toLowerCase().includes(searchTerm);
        return clientMatch || projectMatch;
      }
      
      return true;
    });
    
    // Show empty message if no items
    if (filteredItems.length === 0) {
      historyList.innerHTML = `
        <div class="history-empty" style="text-align: center; padding: 3rem 1rem; color: var(--gray-500); font-style: italic;">
          ${searchTerm || filter !== 'all' ? 'No matching documents found.' : 'No history yet. Create a quote to get started.'}
        </div>
      `;
      return;
    }
    
    // Render history items
    filteredItems.forEach(item => {
      const historyItem = document.createElement('div');
      historyItem.className = 'history-item';
      historyItem.style.cssText = `
        background-color: var(--gray-200);
        border-radius: var(--border-radius);
        padding: 1.25rem;
        margin-bottom: 1rem;
        transition: transform 0.2s;
      `;
      
      // Format date
      const itemDate = new Date(item.date);
      const formattedDate = itemDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      historyItem.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
          <div>
            <span class="badge ${item.type === 'quote' ? 'badge-primary' : 'badge-success'}" style="margin-right: 0.5rem;">
              ${item.type === 'quote' ? 'Quote' : 'Invoice'}
            </span>
            <span style="font-weight: 500;">${formattedDate}</span>
          </div>
          <div>
            ${item.type === 'invoice' ? `<span style="margin-right: 0.5rem; font-size: 0.875rem;">${item.invoiceNumber}</span>` : ''}
            <span style="font-weight: 600;">${Calculator.formatCurrency(item.amount)}</span>
          </div>
        </div>
        
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-weight: 500; margin-bottom: 0.25rem;">${item.client}</div>
            <div style="font-size: 0.875rem; color: var(--gray-600);">${item.project}</div>
          </div>
          
          <div class="history-actions" style="display: flex; gap: 0.5rem;">
            <button class="btn btn-sm btn-outline history-view" data-id="${item.id}">
              <i class="fas fa-eye"></i> View
            </button>
            <button class="btn btn-sm btn-outline history-duplicate" data-id="${item.id}">
              <i class="fas fa-copy"></i> Duplicate
            </button>
            <button class="btn btn-sm btn-outline history-delete" data-id="${item.id}">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      `;
      
      historyList.appendChild(historyItem);
      
      // Add event listeners
      historyItem.querySelector('.history-view').addEventListener('click', () => this.viewHistoryItem(item.id));
      historyItem.querySelector('.history-duplicate').addEventListener('click', () => this.duplicateHistoryItem(item.id));
      historyItem.querySelector('.history-delete').addEventListener('click', () => this.deleteHistoryItem(item.id));
    });
  },
  
  // View history item
  async viewHistoryItem(id) {
    // Find item in history data
    let item = this.historyData.find(i => i.id === id);
    
    // If using GitHub and item doesn't have full data, fetch individual file
    if (this.useGitHub && item && (!item.html || !item.quoteData)) {
      try {
        const filePath = `data/${item.type}s/${id}.json`;
        const fileData = await GitHubService.getFileContent(filePath);
        
        if (fileData) {
          // Update item with full data
          item = fileData;
          
          // Update in history data
          const index = this.historyData.findIndex(i => i.id === id);
          if (index !== -1) {
            this.historyData[index] = item;
          }
        }
      } catch (error) {
        console.error('Error fetching individual history item from GitHub:', error);
      }
    }
    
    if (!item) return;
    
    // Create modal for viewing
    this.createViewModal(item);
  },
  
  // Create view modal
  createViewModal(item) {
    // Create modal element
    const modal = document.createElement('div');
    modal.className = 'history-view-modal';
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
    content.className = 'history-view-modal-content';
    content.style.cssText = `
      background-color: var(--card-bg);
      border-radius: var(--border-radius);
      box-shadow: var(--shadow-lg);
      width: 100%;
      max-width: 900px;
      max-height: 90vh;
      overflow-y: auto;
      padding: 2rem;
      position: relative;
    `;
    
    // Add close button
    const closeBtn = document.createElement('div');
    closeBtn.className = 'history-view-modal-close';
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
    
    // Add header
    const header = document.createElement('div');
    header.style.cssText = `
      margin-bottom: 1.5rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    
    const itemDate = new Date(item.date);
    const formattedDate = itemDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    header.innerHTML = `
      <h3>${item.type === 'quote' ? 'Quote' : 'Invoice'} - ${item.client}</h3>
      <div style="text-align: right;">
        <div style="font-weight: 600;">${Calculator.formatCurrency(item.amount)}</div>
        <div style="font-size: 0.875rem; color: var(--gray-600);">${formattedDate}</div>
        ${item.type === 'invoice' ? `<div style="font-size: 0.875rem; color: var(--gray-600);">${item.invoiceNumber}</div>` : ''}
      </div>
    `;
    
    // Add document content
    const documentContent = document.createElement('div');
    documentContent.className = 'history-document-content';
    documentContent.innerHTML = item.html;
    
    // Remove buttons from document content
    documentContent.querySelectorAll('.btn-group').forEach(btnGroup => {
      btnGroup.remove();
    });
    
    // Add GitHub metadata if available
    if (this.useGitHub) {
      const metaInfo = document.createElement('div');
      metaInfo.style.cssText = `
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 1px solid var(--gray-300);
        font-size: 0.875rem;
        color: var(--gray-600);
      `;
      
      metaInfo.innerHTML = `
        <div><strong>Stored on GitHub:</strong> ${GitHubService.owner}/${GitHubService.repo}</div>
        <div><strong>File path:</strong> data/${item.type}s/${item.id}.json</div>
      `;
      
      documentContent.appendChild(metaInfo);
    }
    
    // Add actions
    const actions = document.createElement('div');
    actions.className = 'history-view-actions';
    actions.style.cssText = `
      display: flex;
      justify-content: center;
      gap: 1rem;
      margin-top: 2rem;
    `;
    
    actions.innerHTML = `
      <button class="btn btn-outline print-btn">
        <i class="fas fa-print"></i> Print
      </button>
      <button class="btn btn-outline pdf-btn">
        <i class="fas fa-file-pdf"></i> Save as PDF
      </button>
      <button class="btn btn-primary duplicate-btn">
        <i class="fas fa-copy"></i> Duplicate
      </button>
    `;
    
    // Assemble modal
    content.appendChild(closeBtn);
    content.appendChild(header);
    content.appendChild(documentContent);
    content.appendChild(actions);
    modal.appendChild(content);
    
    // Add to document
    document.body.appendChild(modal);
    
    // Add event listeners
    modal.querySelector('.print-btn').addEventListener('click', () => {
      this.printHistoryItem(item);
    });
    
    modal.querySelector('.pdf-btn').addEventListener('click', () => {
      this.printHistoryItem(item);
    });
    
    modal.querySelector('.duplicate-btn').addEventListener('click', () => {
      this.duplicateHistoryItem(item.id);
      modal.remove();
    });
  },
  
  // Print history item
  printHistoryItem(item) {
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    // Get all stylesheets from the document
    const styleLinks = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
      .map(link => `<link rel="stylesheet" href="${link.href}">`).join('');
    
    // Also get any inline styles
    const inlineStyles = Array.from(document.querySelectorAll('style'))
      .map(style => `<style>${style.innerHTML}</style>`).join('');
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Emmett's ${item.type === 'quote' ? 'Quote' : 'Invoice'}</title>
        ${styleLinks}
        ${inlineStyles}
        <style>
          @media print {
            body {
              padding: 0;
              margin: 0;
              background: white !important;
              color: black !important;
            }
            .container {
              max-width: 100% !important;
              margin: 0 !important;
              padding: 20px !important;
              box-shadow: none !important;
              background-color: white !important;
            }
            .result-section {
              display: block !important;
            }
            .btn-group, .btn, .dark-mode-toggle {
              display: none !important;
            }
            .tabs {
              display: none !important;
            }
            .card {
              box-shadow: none !important;
            }
            /* Force color for readability */
            h1, h2, h3, h4, h5, h6, p, td, th, div {
              color: black !important;
            }
            th {
              background-color: #f0f0f0 !important;
            }
            tr:hover td {
              background-color: transparent !important;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="result-section" style="display: block;">
            ${item.html}
          </div>
        </div>
        <script>
          // Execute print once everything has loaded
          window.onload = function() {
            // Small delay to ensure styles are applied
            setTimeout(() => {
              window.focus();
              window.print();
              
              // Close window after printing or if user cancels
              window.addEventListener('afterprint', function() {
                window.close();
              });
              
              // Fallback close timer
              setTimeout(() => {
                if (!window.closed) {
                  window.close();
                }
              }, 5000);
            }, 500);
          };
        </script>
      </body>
      </html>
    `);
    
    printWindow.document.close();
  },
  
  // Duplicate history item
  duplicateHistoryItem(id) {
    const item = this.historyData.find(i => i.id === id);
    if (!item) return;
    
    // Populate the form with the item's data
    if (item.type === 'quote' && item.quoteData) {
      // Set form values
      document.getElementById('serviceType').value = item.quoteData.serviceType || 'single';
      document.getElementById('durationType').value = item.quoteData.durationType || 'full';
      document.getElementById('additionalHours').value = item.quoteData.additionalHours || 0;
      document.getElementById('clientType').value = item.quoteData.clientType || 'regular';
      document.getElementById('clientName').value = item.client;
      document.getElementById('projectName').value = item.project;
      
      // Set specialty services if available
      if (item.quoteData.specialtyServices) {
        AppState.specialtyServices = [...item.quoteData.specialtyServices];
        UI.refreshSpecialtyList();
      }
      
      // Switch to calculator tab
      document.querySelector('.tab[data-tab="calculator"]').click();
      
      // Calculate quote
      document.getElementById('calculateBtn').click();
    }
  },
  
  // Delete history item
  async deleteHistoryItem(id) {
    if (confirm('Are you sure you want to delete this item? This cannot be undone.')) {
      // Find item type
      const item = this.historyData.find(i => i.id === id);
      const itemType = item ? item.type : null;
      
      // Remove from history data
      this.historyData = this.historyData.filter(item => item.id !== id);
      
      // Delete from GitHub if enabled
      if (this.useGitHub && itemType) {
        try {
          // Delete individual file
          await GitHubService.deleteFile(`data/${itemType}s/${id}.json`, `Delete ${itemType} ${id}`);
          
          // Update index
          await this.saveHistory();
        } catch (error) {
          console.error(`Error deleting history item from GitHub:`, error);
        }
      } else {
        // Save to localStorage
        this.saveHistoryToLocalStorage();
      }
      
      // Refresh display
      this.refreshHistoryDisplay();
    }
  }
