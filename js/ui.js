/**
 * UI Module
 * Handles all user interface interactions and display logic
 */

const UI = {
  // Element references
  elements: {
    // Form elements
    serviceType: document.getElementById('serviceType'),
    durationType: document.getElementById('durationType'),
    customDaysRow: document.getElementById('customDaysRow'),
    customDays: document.getElementById('customDays'),
    additionalHours: document.getElementById('additionalHours'),
    specialtyServiceSelect: document.getElementById('specialtyServiceSelect'),
    specialtyAmount: document.getElementById('specialtyAmount'),
    specialtyList: document.getElementById('specialtyList'),
    emptySpecialtyMessage: document.getElementById('emptySpecialtyMessage'),
    addSpecialtyBtn: document.getElementById('addSpecialtyBtn'),
    clientType: document.getElementById('clientType'),
    clientName: document.getElementById('clientName'),
    projectName: document.getElementById('projectName'),
    projectLocation: document.getElementById('projectLocation'),
    includeTravel: document.getElementById('includeTravel'),
    travelDaysRow: document.getElementById('travelDaysRow'),
    travelDays: document.getElementById('travelDays'),
    calculateBtn: document.getElementById('calculateBtn'),
    resetBtn: document.getElementById('resetBtn'),
    loadingIndicator: document.getElementById('loadingIndicator'),
    
    // Quote elements
    quoteSection: document.getElementById('quoteSection'),
    quoteBody: document.getElementById('quoteBody'),
    quoteNotes: document.getElementById('quoteNotes'),
    quoteDate: document.getElementById('quoteDate'),
    quoteClientDisplay: document.getElementById('quoteClientDisplay'),
    quoteProjectDisplay: document.getElementById('quoteProjectDisplay'),
    printQuoteBtn: document.getElementById('printQuote'),
    saveQuotePdfBtn: document.getElementById('saveQuotePdf'),
    generateInvoiceBtn: document.getElementById('generateInvoice'),
    
    // Invoice elements
    invoiceSection: document.getElementById('invoiceSection'),
    invoiceBody: document.getElementById('invoiceBody'),
    invoiceNumber: document.getElementById('invoiceNumber'),
    invoiceDate: document.getElementById('invoiceDate'),
    invoiceDateTime: document.getElementById('invoiceDateTime'),
    invoiceClient: document.getElementById('invoiceClient'),
    invoiceProject: document.getElementById('invoiceProject'),
    invoiceSubtotal: document.getElementById('invoiceSubtotal'),
    invoiceDeposit: document.getElementById('invoiceDeposit'),
    invoiceTotal: document.getElementById('invoiceTotal'),
    depositRow: document.getElementById('depositRow'),
    printInvoiceBtn: document.getElementById('printInvoice'),
    saveInvoicePdfBtn: document.getElementById('saveInvoicePdf'),
    backToQuoteBtn: document.getElementById('backToQuote'),
    
    // Tabs
    tabs: document.querySelectorAll('.tab'),
    tabContents: document.querySelectorAll('.tab-content'),
    
    // Dark mode
    darkModeToggle: document.getElementById('darkModeToggle')
  },
  
  // Initialize UI
  init() {
    this.setupEventListeners();
    this.initTabs();
    this.initDarkMode();
    this.refreshSpecialtyList();
  },
  
  // Set up all event listeners
  setupEventListeners() {
    // Form events
    this.elements.durationType.addEventListener('change', () => {
      this.elements.customDaysRow.style.display = 
        this.elements.durationType.value === 'custom' ? 'flex' : 'none';
    });
    
    this.elements.specialtyServiceSelect.addEventListener('change', this.updateSpecialtyAmountPlaceholder.bind(this));
    this.elements.addSpecialtyBtn.addEventListener('click', this.handleAddSpecialty.bind(this));
    
    this.elements.includeTravel.addEventListener('change', () => {
      this.elements.travelDaysRow.style.display = 
        this.elements.includeTravel.checked ? 'block' : 'none';
      if (!this.elements.includeTravel.checked) {
        this.elements.travelDays.value = 0;
      } else {
        this.elements.travelDays.value = 1;
      }
    });
    
    this.elements.calculateBtn.addEventListener('click', this.handleCalculate.bind(this));
    this.elements.resetBtn.addEventListener('click', this.handleReset.bind(this));
    
    // Quote events
    this.elements.printQuoteBtn.addEventListener('click', () => this.printSection(this.elements.quoteSection, 'Quote'));
    this.elements.saveQuotePdfBtn.addEventListener('click', () => this.savePdf(this.elements.quoteSection, 'Quote'));
    this.elements.generateInvoiceBtn.addEventListener('click', this.handleGenerateInvoice.bind(this));
    
    // Invoice events
    this.elements.printInvoiceBtn.addEventListener('click', () => this.printSection(this.elements.invoiceSection, 'Invoice'));
    this.elements.saveInvoicePdfBtn.addEventListener('click', () => this.savePdf(this.elements.invoiceSection, 'Invoice'));
    this.elements.backToQuoteBtn.addEventListener('click', this.handleBackToQuote.bind(this));
    
    // Validate number inputs
    document.querySelectorAll('input[type="number"]').forEach(input => {
      input.addEventListener('change', function() {
        if (this.value < 0) this.value = 0;
        if (this.value === '') this.value = 0;
      });
    });
  },
  
  // Initialize tabs functionality
  initTabs() {
    this.elements.tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        // Remove active class from all tabs and contents
        this.elements.tabs.forEach(t => t.classList.remove('active'));
        this.elements.tabContents.forEach(c => c.classList.remove('active'));
        
        // Add active class to clicked tab and content
        tab.classList.add('active');
        const tabId = tab.getAttribute('data-tab');
        document.getElementById(tabId).classList.add('active');
      });
    });
  },
  
  // Initialize dark mode
  initDarkMode() {
    this.elements.darkModeToggle.addEventListener('click', this.toggleTheme.bind(this));
    
    // Set initial theme based on localStorage
    if (localStorage.getItem('theme') === 'light') {
      document.body.classList.add('light-mode');
      this.elements.darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    } else {
      this.elements.darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
      localStorage.setItem('theme', 'dark');
    }
  },
  
  // Toggle light/dark theme
  toggleTheme() {
    if (document.body.classList.contains('light-mode')) {
      document.body.classList.remove('light-mode');
      this.elements.darkModeToggle.innerHTML = '<i class="fas fa-sun"></i>';
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.add('light-mode');
      this.elements.darkModeToggle.innerHTML = '<i class="fas fa-moon"></i>';
      localStorage.setItem('theme', 'light');
    }
  },
  
  // Update placeholder for specialty amount input
  updateSpecialtyAmountPlaceholder() {
    const service = this.elements.specialtyServiceSelect.value;
    
    if (service === 'prep' || service === 'resolume' || service === 'surface') {
      this.elements.specialtyAmount.value = 1;
      this.elements.specialtyAmount.setAttribute('placeholder', 'Days');
    } else if (service !== 'none') {
      this.elements.specialtyAmount.value = 4;
      this.elements.specialtyAmount.setAttribute('placeholder', 'Hours');
    } else {
      this.elements.specialtyAmount.value = '';
      this.elements.specialtyAmount.setAttribute('placeholder', 'Hours/Days');
    }
  },
  
  // Handle adding specialty service
  handleAddSpecialty() {
    const serviceType = this.elements.specialtyServiceSelect.value;
    const amount = parseInt(this.elements.specialtyAmount.value) || 0;
    
    if (serviceType === 'none' || amount <= 0) {
      this.showAlert('Please select a service and enter a valid amount.');
      return;
    }
    
    // Check if service already exists
    const existingService = AppState.specialtyServices.find(s => s.type === serviceType);
    if (existingService) {
      if (confirm(`${Calculator.getSpecialtyName(serviceType)} is already added. Do you want to update the amount instead?`)) {
        existingService.amount = amount;
        this.refreshSpecialtyList();
      }
      return;
    }
    
    // Add service to array
    AppState.specialtyServices.push({
      id: Date.now(),
      type: serviceType,
      amount: amount
    });
    
    // Reset form
    this.elements.specialtyServiceSelect.value = 'none';
    this.elements.specialtyAmount.value = '';
    
    // Refresh the list
    this.refreshSpecialtyList();
  },
  
  // Update specialty services list
  refreshSpecialtyList() {
    // Clear current list
    while (this.elements.specialtyList.firstChild) {
      this.elements.specialtyList.removeChild(this.elements.specialtyList.firstChild);
    }
    
    // Show/hide empty message
    if (AppState.specialtyServices.length === 0) {
      this.elements.emptySpecialtyMessage.style.display = 'block';
      return;
    } else {
      this.elements.emptySpecialtyMessage.style.display = 'none';
    }
    
    // Add each service to the list
    AppState.specialtyServices.forEach(service => {
      const serviceItem = document.createElement('div');
      serviceItem.className = 'specialty-item';
      serviceItem.dataset.id = service.id;
      
      const isHourly = (service.type !== 'prep' && service.type !== 'resolume' && service.type !== 'surface');
      const rate = AppState.rates.specialty[service.type].rate;
      const total = rate * service.amount;
      
      serviceItem.innerHTML = `
        <div class="specialty-item-details">
          <div class="specialty-item-title">${Calculator.getSpecialtyName(service.type)}</div>
          <div class="specialty-item-amount">
            ${service.amount} ${isHourly ? 'Hour' : 'Day'}${service.amount > 1 ? 's' : ''} × $${rate}/${isHourly ? 'hr' : 'day'} = ${Calculator.formatCurrency(total)}
          </div>
        </div>
        <div class="specialty-remove" data-id="${service.id}">
          <i class="fas fa-times"></i>
        </div>
      `;
      
      this.elements.specialtyList.appendChild(serviceItem);
    });
    
    // Add event listeners to remove buttons
    document.querySelectorAll('.specialty-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const serviceId = parseInt(e.currentTarget.dataset.id);
        this.removeSpecialtyService(serviceId);
      });
    });
  },
  
  // Remove specialty service
  removeSpecialtyService(serviceId) {
    AppState.specialtyServices = AppState.specialtyServices.filter(service => service.id !== serviceId);
    this.refreshSpecialtyList();
  },
  
  // Handle calculate button click
  handleCalculate() {
    if (!this.validateForm()) {
      return;
    }
    
    // Show loading and hide results
    this.elements.loadingIndicator.style.display = 'flex';
    this.elements.quoteSection.style.display = 'none';
    this.elements.invoiceSection.style.display = 'none';
    
    // Simulate loading delay for UX
    setTimeout(() => {
      // Calculate quote
      const quoteData = Calculator.calculateQuote();
      AppState.quoteData = quoteData;
      
      // Render quote
      this.renderQuote(quoteData);
      
      // Hide loading and show quote
      this.elements.loadingIndicator.style.display = 'none';
      this.elements.quoteSection.style.display = 'block';
    }, 600);
  },
  
  // Handle form reset
  handleReset() {
    // Reset form fields
    document.querySelector('.form-section').reset();
    
    // Reset display states
    this.elements.customDaysRow.style.display = 'none';
    this.elements.travelDaysRow.style.display = 'none';
    this.elements.quoteSection.style.display = 'none';
    this.elements.invoiceSection.style.display = 'none';
    
    // Reset values
    this.elements.customDays.value = 1;
    this.elements.travelDays.value = 0;
    this.elements.additionalHours.value = 0;
    
    // Clear specialty services
    AppState.specialtyServices = [];
    this.refreshSpecialtyList();
    
    // Reset app state
    AppState.reset();
  },
  
  // Validate form before calculation
  validateForm() {
    // Check custom days
    if (this.elements.durationType.value === 'custom' && 
        (parseInt(this.elements.customDays.value) <= 0 || this.elements.customDays.value === '')) {
      this.showAlert('Please enter a valid number of days.');
      return false;
    }
    
    return true;
  },
  
  // Render the quote
  renderQuote(quoteData) {
    const { rows, notes, client, project, formattedDate, total } = quoteData;
    
    // Set client and project info
    if (client) {
      this.elements.quoteClientDisplay.textContent = client;
      this.elements.quoteClientDisplay.style.display = 'inline-block';
    } else {
      this.elements.quoteClientDisplay.style.display = 'none';
    }
    
    if (project.name) {
      let projectText = project.name;
      if (project.location) {
        projectText += ` (${project.location})`;
      }
      this.elements.quoteProjectDisplay.textContent = projectText;
      this.elements.quoteProjectDisplay.style.display = 'inline-block';
    } else {
      this.elements.quoteProjectDisplay.style.display = 'none';
    }
    
    // Set date
    this.elements.quoteDate.textContent = formattedDate;
    
    // Render table rows
    this.elements.quoteBody.innerHTML = '';
    rows.forEach(r => {
      const tr = document.createElement('tr');
      r.forEach((cell, i) => {
        const td = document.createElement('td');
        td.innerHTML = i === 3 && typeof cell === 'number' ? Calculator.formatCurrency(cell) : cell;
        tr.appendChild(td);
      });
      if (r[0] === 'TOTAL') tr.classList.add('total-row');
      this.elements.quoteBody.appendChild(tr);
    });
    
    // Render notes
    this.elements.quoteNotes.innerHTML = notes.map(n => `• ${n}`).join('<br>');
  },
  
  // Generate invoice from quote
  handleGenerateInvoice() {
    // Build invoice number with current date format YYYYMMDD-XXX
    const now = new Date();
    const dateStr = now.getFullYear() + 
                    (now.getMonth() + 1).toString().padStart(2, '0') + 
                    now.getDate().toString().padStart(2, '0');
    
    const defaultInvoiceNum = `INV-${dateStr}-001`;
    
    // Get invoice details from user
    const invoiceNum = prompt('Enter Invoice Number:', defaultInvoiceNum) || defaultInvoiceNum;
    this.elements.invoiceNumber.textContent = invoiceNum;
    
    // Ask about deposit payment
    const depositPaid = confirm(`Has the ${AppState.depositPercentage * 100}% deposit (${Calculator.formatCurrency(AppState.depositAmount)}) been paid?`);
    
    // Get client name
    const clientName = this.elements.clientName.value.trim() || prompt('Client Name:', '') || 'Client';
    this.elements.invoiceClient.textContent = clientName;
    
    // Set project name
    this.elements.invoiceProject.textContent = this.elements.projectName.value.trim() || 'Technical Production Services';
    
    // Set invoice date
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = now.toLocaleDateString('en-US', dateOptions);
    this.elements.invoiceDate.textContent = formattedDate;
    
    // Set datetime
    const timeOptions = { hour: '2-digit', minute: '2-digit' };
    const formattedDateTime = `Created on ${formattedDate} at ${now.toLocaleTimeString('en-US', timeOptions)}`;
    this.elements.invoiceDateTime.textContent = formattedDateTime;
    
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
    this.elements.invoiceBody.innerHTML = '';
    let subtotal = 0;
    
    Array.from(this.elements.quoteBody.children).forEach(row => {
      const service = row.cells[0].textContent;
      if (service === 'Quote Date' || service === 'Quote Valid Until') return;
      
      const clone = row.cloneNode(true);
      this.elements.invoiceBody.appendChild(clone);
      
      if (service !== 'TOTAL') {
        const amt = parseFloat(clone.cells[3].textContent.replace(/[^0-9.-]/g, '')) || 0;
        subtotal += amt;
      }
    });
    
    // Set summary amounts
    this.elements.invoiceSubtotal.textContent = Calculator.formatCurrency(subtotal);
    
    // Handle deposit
    if (depositPaid) {
      this.elements.depositRow.style.display = 'flex';
      this.elements.invoiceDeposit.textContent = `- ${Calculator.formatCurrency(AppState.depositAmount)}`;
      this.elements.invoiceTotal.textContent = Calculator.formatCurrency(subtotal - AppState.depositAmount);
      AppState.isPaid = true;
    } else {
      this.elements.depositRow.style.display = 'none';
      this.elements.invoiceTotal.textContent = Calculator.formatCurrency(subtotal);
      AppState.isPaid = false;
    }
    
    // Hide quote, show invoice
    this.elements.quoteSection.style.display = 'none';
    this.elements.invoiceSection.style.display = 'block';
    
    // Add payment buttons to invoice
    this.addPaymentButtons(depositPaid);
  },
  
  // Add payment buttons to invoice
  addPaymentButtons(depositPaid) {
    // Remove existing payment buttons if any
    const existingBtnGroup = document.getElementById('paymentBtnGroup');
    if (existingBtnGroup) {
      existingBtnGroup.remove();
    }
    
    // Create payment button group
    const btnGroup = document.createElement('div');
    btnGroup.id = 'paymentBtnGroup';
    btnGroup.className = 'btn-group';
    btnGroup.style.marginTop = '1.5rem';
    
    if (!depositPaid) {
      // Add Pay Deposit button
      const payDepositBtn = document.createElement('button');
      payDepositBtn.className = 'btn btn-primary';
      payDepositBtn.innerHTML = '<i class="fas fa-credit-card"></i> Pay Deposit';
      payDepositBtn.addEventListener('click', () => Payment.handlePayment('deposit'));
      btnGroup.appendChild(payDepositBtn);
    }
    
    // Add Pay Full/Balance button
    const payFullBtn = document.createElement('button');
    payFullBtn.className = 'btn btn-primary';
    payFullBtn.innerHTML = '<i class="fas fa-money-bill-wave"></i> Pay ' + (depositPaid ? 'Balance' : 'Full Amount');
    payFullBtn.addEventListener('click', () => Payment.handlePayment('full'));
    btnGroup.appendChild(payFullBtn);
    
    // Insert before the print/save buttons
    this.elements.invoiceSection.querySelector('.btn-group').before(btnGroup);
  },
  
  // Go back to quote from invoice
  handleBackToQuote() {
    this.elements.invoiceSection.style.display = 'none';
    this.elements.quoteSection.style.display = 'block';
  },
  
  // Print section
  printSection(sectionEl, title) {
    const content = sectionEl.innerHTML;
    const styles = document.querySelector('style').innerHTML;
    
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Emmett's ${title}</title>
        <style>${styles}</style>
        <style>
          body {
            padding: 0;
            margin: 0;
            background: white;
          }
          .container {
            max-width: 100%;
            margin: 0;
            padding: 40px;
            box-shadow: none;
            background-color: white;
          }
          .result-section {
            display: block;
          }
          .btn-group {
            display: none;
          }
          @media print {
            body, html {
              width: 100%;
              height: 100%;
              margin: 0;
              padding: 0;
            }
            .container {
              padding: 20px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="result-section" style="display: block;">
            ${content}
          </div>
        </div>
      </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.onload = function() {
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.addEventListener('afterprint', function() {
          printWindow.close();
        });
        setTimeout(() => {
          if (!printWindow.closed) {
            printWindow.close();
          }
        }, 5000);
      }, 300);
    };
  },
  
  // Save as PDF
  savePdf(sectionEl, title) {
    alert(`In a production environment, this would generate a PDF of the ${title.toLowerCase()}. For now, please use the Print function and save as PDF.`);
    this.printSection(sectionEl, title);
  },
  
  // Show alert
  showAlert(message) {
    alert(message);
  },
  
  // Show error
  showError(message) {
    const errorEl = document.createElement('div');
    errorEl.className = 'alert alert-danger';
    errorEl.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    
    document.querySelector('.container').prepend(errorEl);
    
    // Remove after 5 seconds
    setTimeout(() => {
      errorEl.remove();
    }, 5000);
  }
};
