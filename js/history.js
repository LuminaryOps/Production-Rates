/**
 * History Module
 * Handles the storage and retrieval of quote/invoice history
 */

const History = {
  historyData: [],
  
  // Initialize history module
  async init() {
    // Create history tab and content
    this.createHistoryTab();
    
    // Load existing history - now properly awaiting the async operation
    await this.loadHistory();
    
    // Add save handlers to quotes and invoices
    this.setupSaveHandlers();
    
    // Explicitly set up signature event listeners to ensure quote acceptance works
    this.setupSignatureEventListeners();
    
    console.log('History module initialized successfully');
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
                  <option value="accepted-quotes">Accepted Quotes Only</option>
                  <option value="unaccepted-quotes">Unaccepted Quotes Only</option>
                </select>
              </div>
            </div>
          </div>
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
        });
      } else {
        console.error('PinAuth module not available');
        alert('PIN Authentication system is not available. Unable to access history.');
      }
    });
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
    
    // Listen for signature events to update quote status
    this.setupSignatureEventListeners();
  },
  
  // Add a dedicated method for setting up signature event listeners
  setupSignatureEventListeners() {
    // First remove any existing listener to avoid duplicates
    document.removeEventListener('quoteAccepted', this.handleQuoteAccepted);
    
    // Add the event listener with proper binding
    document.addEventListener('quoteAccepted', this.handleQuoteAccepted.bind(this));
    
    console.log('Signature event listeners set up successfully');
  },
  
  // Add a handler method for the quote accepted event
  handleQuoteAccepted(event) {
    console.log('Quote accepted event received in History module:', event.detail);
    if (event.detail && event.detail.quoteId) {
      this.updateQuoteAcceptanceStatus(event.detail.quoteId, event.detail.signatureData);
    }
  },
  
  // Update quote acceptance status when signed
  async updateQuoteAcceptanceStatus(quoteId, signatureData) {
    console.log('Updating quote acceptance status for ID:', quoteId);
    
    // Find the quote in history
    const quoteIndex = this.historyData.findIndex(item => 
      item.type === 'quote' && item.id === quoteId);
    
    console.log('Found quote at index:', quoteIndex);
    
    if (quoteIndex !== -1) {
      // Make a deep copy of the signature data to avoid reference issues
      const signatureDataCopy = JSON.parse(JSON.stringify(signatureData));
      
      // Update the quote with signature data
      this.historyData[quoteIndex].accepted = true;
      this.historyData[quoteIndex].signatureData = signatureDataCopy;
      this.historyData[quoteIndex].acceptedDate = new Date().toISOString();
      
      console.log('Quote updated with signature data:', this.historyData[quoteIndex]);
      
      // Save updated history
      await this.saveHistory();
      
      // Force refresh display regardless of active tab
      this.refreshHistoryDisplay();
      
      // Show success notification
      this.showSuccessNotification('Quote marked as accepted');
    } else {
      console.error('Unable to find quote with ID:', quoteId);
    }
  },
  
  // Add this method to show notifications
  showSuccessNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'alert alert-success';
    notification.style.position = 'fixed';
    notification.style.bottom = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '1000';
    notification.style.maxWidth = '400px';
    
    notification.innerHTML = `
      <i class="fas fa-check-circle"></i>
      <div>${message}</div>
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.5s';
      setTimeout(() => notification.remove(), 500);
    }, 3000);
  },
  
  // Load history from Firebase or localStorage
  async loadHistory() {
    try {
      // Check if Firebase integration is enabled
      if (AppState.usingFirebase) {
        // Load from Firebase
        const firebaseHistory = await FirebaseStorage.loadHistory();
        if (firebaseHistory && firebaseHistory.length > 0) {
          this.historyData = firebaseHistory;
          // Update AppState to match Calendar's pattern
          AppState.historyData = this.historyData;
          console.log('History loaded from Firebase:', this.historyData.length, 'items');
          return;
        }
      }
      
      // Fallback to localStorage
      const storedHistory = localStorage.getItem('history');
      if (storedHistory) {
        this.historyData = JSON.parse(storedHistory);
        // Update AppState to match Calendar's pattern
        AppState.historyData = this.historyData;
        console.log('History loaded from localStorage:', this.historyData.length, 'items');
        return;
      }
      
      // Initialize with empty history if nothing found
      this.historyData = [];
      AppState.historyData = [];
      console.log('No history data found, initialized with empty array');
      
    } catch (error) {
      console.error('Error loading history data:', error);
      
      // Fallback to empty history
      this.historyData = [];
      AppState.historyData = [];
    }
  },
  
  // Save history
  async saveHistory() {
    try {
      // Save to Firebase if available
      if (AppState.usingFirebase) {
        await FirebaseStorage.saveHistory(this.historyData);
        // Update AppState
        AppState.historyData = this.historyData;
        console.log('History saved to Firebase');
      } else {
        // Fallback to localStorage
        localStorage.setItem('history', JSON.stringify(this.historyData));
        // Update AppState
        AppState.historyData = this.historyData;
        console.log('History saved to localStorage');
      }
    } catch (error) {
      console.error('Error saving history:', error);
      
      // Fallback to localStorage
      try {
        localStorage.setItem('history', JSON.stringify(this.historyData));
        // Update AppState
        AppState.historyData = this.historyData;
        console.log('History saved to localStorage (fallback)');
      } catch (localError) {
        console.error('Error saving to localStorage:', localError);
      }
    }
  },
  
  // Update history data from external source
  updateHistoryData(newData) {
    if (!newData || newData.length === 0) return;
    
    this.historyData = newData;
    // Update AppState
    AppState.historyData = this.historyData;
    this.refreshHistoryDisplay();
    console.log('History data updated from external source');
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
    const quoteItem = {
      id: this.generateId(),
      type: 'quote',
      client: clientName,
      project: projectName,
      amount: AppState.quoteTotal,
      date: new Date().toISOString(),
      quoteData: { ...AppState.quoteData },
      html: document.getElementById('quoteSection').innerHTML,
      accepted: false // New field to track acceptance status
    };
    
    // Add to history
    this.historyData.unshift(quoteItem);
    
    // Save history
    await this.saveHistory();
    
    console.log('Quote saved to history:', quoteItem);
  },
  
  // Save invoice to history
  async saveInvoice() {
    // Get client and project info
    const clientName = document.getElementById('invoiceClient').textContent.trim() || 'Unnamed Client';
    const projectName = document.getElementById('invoiceProject').textContent.trim() || 'Unnamed Project';
    const invoiceNumber = document.getElementById('invoiceNumber').textContent.trim();
    
    // Create history item
    const invoiceItem = {
      id: this.generateId(),
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
    
    console.log('Invoice saved to history:', invoiceItem);
  },
  
  // Refresh history display
  refreshHistoryDisplay() {
    const historyList = document.getElementById('historyList');
    if (!historyList) return; // Safety check in case element isn't ready
    
    const searchTerm = document.getElementById('historySearch')?.value?.toLowerCase() || '';
    const filter = document.getElementById('historyFilter')?.value || 'all';
    
    // Clear list
    historyList.innerHTML = '';
    
    // Filter history items
    const filteredItems = this.historyData.filter(item => {
      // Apply type filter
      if (filter === 'quotes' && item.type !== 'quote') return false;
      if (filter === 'invoices' && item.type !== 'invoice') return false;
      if (filter === 'accepted-quotes' && (item.type !== 'quote' || !item.accepted)) return false;
      if (filter === 'unaccepted-quotes' && (item.type !== 'quote' || item.accepted)) return false;
      
      // Apply search
      if (searchTerm) {
        const clientMatch = (item.client || '').toLowerCase().includes(searchTerm);
        const projectMatch = (item.project || '').toLowerCase().includes(searchTerm);
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
    
    // Group items by type and acceptance status
    const groupedItems = {
      acceptedQuotes: [],
      unacceptedQuotes: [],
      invoices: []
    };
    
    filteredItems.forEach(item => {
      if (item.type === 'quote') {
        // Explicitly log the state of each quote for debugging
        console.log(`Quote ${item.id} for ${item.client}: accepted=${!!item.accepted}`);
        
        if (item.accepted === true) {
          groupedItems.acceptedQuotes.push(item);
        } else {
          groupedItems.unacceptedQuotes.push(item);
        }
      } else if (item.type === 'invoice') {
        groupedItems.invoices.push(item);
      }
    });
    
    // Create sections based on filter
    if (filter === 'all' || filter === 'accepted-quotes') {
      this.renderHistorySection(historyList, groupedItems.acceptedQuotes, 'Accepted Quotes');
    }
    
    if (filter === 'all' || filter === 'unaccepted-quotes') {
      this.renderHistorySection(historyList, groupedItems.unacceptedQuotes, 'Unaccepted Quotes');
    }
    
    if (filter === 'quotes') {
      this.renderHistorySection(historyList, [...groupedItems.acceptedQuotes, ...groupedItems.unacceptedQuotes], 'Quotes');
    }
    
    if (filter === 'all' || filter === 'invoices') {
      this.renderHistorySection(historyList, groupedItems.invoices, 'Invoices');
    }
  },
  
  // Render a section of history items
  renderHistorySection(container, items, title) {
    if (items.length === 0) return;
    
    // Add section header
    const sectionHeader = document.createElement('div');
    sectionHeader.className = 'history-section-header';
    sectionHeader.innerHTML = `<h3>${title}</h3>`;
    sectionHeader.style.cssText = `
      margin-top: 1.5rem;
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px solid var(--gray-300);
      color: var(--gray-800);
    `;
    
    container.appendChild(sectionHeader);
    
    // Render items
    items.forEach(item => this.renderHistoryItem(container, item));
  },
  
  // Render a single history item
  renderHistoryItem(container, item) {
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    
    // Add specific class for accepted quotes
    if (item.type === 'quote' && item.accepted) {
      historyItem.classList.add('accepted-quote');
    }
    
    historyItem.style.cssText = `
      background-color: var(--gray-200);
      border-radius: var(--border-radius);
      padding: 1.25rem;
      margin-bottom: 1rem;
      transition: transform 0.2s;
    `;
    
    // Add a subtle glow for accepted quotes
    if (item.type === 'quote' && item.accepted) {
      historyItem.style.borderLeft = '3px solid var(--success)';
      historyItem.style.boxShadow = 'var(--shadow), 0 0 5px var(--success)';
    }
    
    // Format date
    const itemDate = new Date(item.date);
    const formattedDate = itemDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    // Create badge based on item type and status
    let badgeClass = 'badge-primary';
    let badgeText = 'Quote';
    
    if (item.type === 'invoice') {
      badgeClass = 'badge-success';
      badgeText = 'Invoice';
    } else if (item.type === 'quote' && item.accepted) {
      badgeClass = 'badge-success';
      badgeText = 'Accepted Quote';
    }
    
    historyItem.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
        <div>
          <span class="badge ${badgeClass}" style="margin-right: 0.5rem;">
            ${badgeText}
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
          ${item.accepted && item.acceptedDate ? `
          <div style="font-size: 0.75rem; color: var(--success); margin-top: 0.25rem;" class="signature-indicator">
            <i class="fas fa-signature"></i> Signed on ${new Date(item.acceptedDate).toLocaleDateString()}
          </div>
          ` : ''}
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
    
    container.appendChild(historyItem);
    
    // Add event listeners
    historyItem.querySelector('.history-view').addEventListener('click', () => this.viewHistoryItem(item.id));
    historyItem.querySelector('.history-duplicate').addEventListener('click', () => this.duplicateHistoryItem(item.id));
    historyItem.querySelector('.history-delete').addEventListener('click', () => this.deleteHistoryItem(item.id));
  },
  
  // View history item
  viewHistoryItem(id) {
    const item = this.historyData.find(i => i.id === id);
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
    
    // Add badge based on item type and status
    let badgeClass = 'badge-primary';
    let badgeText = 'Quote';
    
    if (item.type === 'invoice') {
      badgeClass = 'badge-success';
      badgeText = 'Invoice';
    } else if (item.type === 'quote' && item.accepted) {
      badgeClass = 'badge-success';
      badgeText = 'Accepted Quote';
    }
    
    header.innerHTML = `
      <div>
        <h3 style="margin-bottom: 0.25rem;">${item.type === 'quote' ? 'Quote' : 'Invoice'} - ${item.client}</h3>
        <div style="display: flex; align-items: center;">
          <span class="badge ${badgeClass}" style="margin-right: 0.5rem;">
            ${badgeText}
          </span>
          <span style="font-size: 0.875rem; color: var(--gray-600);">${formattedDate}</span>
        </div>
      </div>
      <div style="text-align: right;">
        <div style="font-weight: 600;">${Calculator.formatCurrency(item.amount)}</div>
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
    
    // Add signature display if available
    if (item.type === 'quote' && item.accepted && item.signatureData) {
      const signatureDisplay = document.createElement('div');
      signatureDisplay.className = 'signature-display';
      signatureDisplay.style.cssText = `
        margin-top: 2rem;
        padding-top: 1.5rem;
        border-top: 1px solid var(--gray-300);
      `;
      
      const signDate = new Date(item.acceptedDate).toLocaleDateString('en-US', {
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      signatureDisplay.innerHTML = `
        <h4 style="margin-bottom: 1rem;">Accepted By:</h4>
        <div style="display: flex; justify-content: space-between; align-items: flex-end;">
          <div>
            <div style="font-weight: 600;">${item.signatureData.name}</div>
            <div style="font-size: 0.875rem; color: var(--gray-600);">${item.signatureData.title || ''}</div>
            <div style="font-size: 0.875rem; color: var(--gray-600);">${item.signatureData.email}</div>
          </div>
          <div>
            <img src="${item.signatureData.signature}" alt="Signature" style="height: 60px; max-width: 200px;">
            <div style="font-size: 0.75rem; color: var(--gray-500); margin-top: 0.25rem; text-align: right;">
              ${signDate}
            </div>
          </div>
        </div>
      `;
      
      documentContent.appendChild(signatureDisplay);
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
      ${item.type === 'quote' && !item.accepted ? `
      <button class="btn btn-primary sign-quote-btn">
        <i class="fas fa-signature"></i> Sign Quote
      </button>
      ` : ''}
      ${item.type === 'quote' ? `
      <button class="btn ${item.type === 'quote' && !item.accepted ? 'btn-outline' : 'btn-primary'} convert-to-invoice-btn">
        <i class="fas fa-file-invoice-dollar"></i> Convert to Invoice
      </button>
      ` : ''}
      <button class="btn ${item.type === 'quote' ? 'btn-outline' : 'btn-primary'} duplicate-btn">
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
    
    if (item.type === 'quote') {
      modal.querySelector('.convert-to-invoice-btn').addEventListener('click', () => {
        this.convertToInvoice(item.id);
        modal.remove();
      });
      
      // Add sign quote button if not accepted
      if (!item.accepted) {
        modal.querySelector('.sign-quote-btn').addEventListener('click', () => {
          modal.remove();
          // Use the existing signature functionality
          if (typeof Signature !== 'undefined') {
            // Store the quote ID for reference
            Signature.quoteIdToSign = item.id;
            Signature.showSignatureModal();
          } else {
            alert('Signature module not available.');
          }
        });
      }
    }
  },
  
  // Convert a quote from history to an invoice
  convertToInvoice(id) {
    // Find the quote in history data
    const quoteItem = this.historyData.find(item => item.id === id && item.type === 'quote');
    if (!quoteItem) {
      alert('Quote not found in history.');
      return;
    }

    // Verify PIN before proceeding
    PinAuth.verifyPin(() => {
      // Restore quote data to AppState
      if (quoteItem.quoteData) {
        AppState.quoteData = { ...quoteItem.quoteData };
        AppState.quoteTotal = quoteItem.amount;
        
        // Calculate deposit amount based on client type
        const clientType = quoteItem.quoteData.clientType || 'regular';
        AppState.depositPercentage = AppState.rates.depositRates[clientType] || 0.25;
        AppState.depositAmount = Math.round(AppState.quoteTotal * AppState.depositPercentage);
      } else {
        alert('Quote data is missing or corrupted.');
        return;
      }

      // Switch to calculator tab
      document.querySelector('.tab[data-tab="calculator"]').click();
      
      // Show loading while transitioning
      const loadingIndicator = document.getElementById('loadingIndicator');
      if (loadingIndicator) loadingIndicator.style.display = 'flex';
      
      // Hide all result sections
      document.getElementById('quoteSection').style.display = 'none';
      document.getElementById('invoiceSection').style.display = 'none';
      
      // Use setTimeout to ensure UI updates before continuing
      setTimeout(() => {
        // Now invoke the UI.handleGenerateInvoice method to generate the invoice
        // This will handle prompting for invoice number and other details
        UI.handleGenerateInvoice();
        
        // Hide loading indicator
        if (loadingIndicator) loadingIndicator.style.display = 'none';
      }, 500);
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
    
    // Build content with signature if available
    let signatureHTML = '';
    if (item.type === 'quote' && item.accepted && item.signatureData) {
      const signDate = new Date(item.acceptedDate).toLocaleDateString('en-US', {
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
      
      signatureHTML = `
        <div style="margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #ddd;">
          <h4 style="margin-bottom: 1rem;">Accepted By:</h4>
          <div style="display: flex; justify-content: space-between; align-items: flex-end;">
            <div>
              <div style="font-weight: 600;">${item.signatureData.name}</div>
              <div style="font-size: 0.875rem; color: #666;">${item.signatureData.title || ''}</div>
              <div style="font-size: 0.875rem; color: #666;">${item.signatureData.email}</div>
            </div>
            <div>
              <img src="${item.signatureData.signature}" alt="Signature" style="height: 60px; max-width: 200px;">
              <div style="font-size: 0.75rem; color: #777; margin-top: 0.25rem; text-align: right;">
                ${signDate}
              </div>
            </div>
          </div>
        </div>
      `;
    }
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>LuminaryOps ${item.type === 'quote' ? 'Quote' : 'Invoice'}</title>
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
            ${signatureHTML}
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
      this.historyData = this.historyData.filter(item => item.id !== id);
      await this.saveHistory();
      this.refreshHistoryDisplay();
    }
  }
};
