/**
 * Signature Module
 * Handles e-signature functionality for quote acceptance
 */

const Signature = {
  canvas: null,
  ctx: null,
  isDrawing: false,
  modal: null,
  hasSigned: false,
  emailJSInitialized: false,
  quoteIdToSign: null, // New property to track which quote is being signed
  
  // Initialize signature module
  init() {
    this.createAcceptButton();
    this.initEmailJS();
    
    // Ensure History module is ready for signature events
    if (typeof History !== 'undefined') {
      console.log('Notifying History module that Signature module is ready');
      
      // Give a small delay to ensure History module is initialized
      setTimeout(() => {
        const readyEvent = new CustomEvent('signatureModuleReady');
        document.dispatchEvent(readyEvent);
      }, 500);
    }
  },
  
  // Initialize EmailJS
  initEmailJS() {
    // Add EmailJS library if not already present
    if (typeof emailjs === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@emailjs/browser@3/dist/email.min.js';
      script.async = true;
      script.onload = () => {
        // Initialize EmailJS with your account ID
        emailjs.init("4xjHyQ-ldAUyJqEN7"); // Replace with your public key
        this.emailJSInitialized = true;
        console.log('EmailJS initialized');
      };
      document.head.appendChild(script);
    } else {
      this.emailJSInitialized = true;
    }
  },
  
  // Create Accept Quote button and add to quote section
  createAcceptButton() {
    const quoteSection = document.getElementById('quoteSection');
    const btnGroup = quoteSection.querySelector('.btn-group');
    
    if (!btnGroup) {
      console.error('Button group not found in quote section');
      return;
    }
    
    const acceptBtn = document.createElement('button');
    acceptBtn.id = 'acceptQuoteBtn';
    acceptBtn.className = 'btn btn-primary';
    acceptBtn.innerHTML = '<i class="fas fa-check-circle"></i> Accept Quote';
    acceptBtn.addEventListener('click', this.showSignatureModal.bind(this));
    
    // Add at the beginning of the button group
    btnGroup.prepend(acceptBtn);
  },
  
  // Show the signature modal
  showSignatureModal() {
    // Create modal if it doesn't exist
    if (!this.modal) {
      this.createSignatureModal();
    }
    
    // Reset form and canvas
    const form = this.modal.querySelector('form');
    if (form) {
      form.reset();
    }
    this.clearCanvas();
    this.hasSigned = false;
    
    // If signing from history, ensure we have the quote data loaded
    if (this.quoteIdToSign) {
      // Find the quote in history
      const historyItem = History.historyData.find(item => 
        item.type === 'quote' && item.id === this.quoteIdToSign);
      
      if (historyItem && historyItem.quoteData) {
        // Load this quote data into AppState
        AppState.quoteData = { ...historyItem.quoteData };
        AppState.quoteTotal = historyItem.amount;
        
        // Calculate deposit amount based on client type
        const clientType = historyItem.quoteData.clientType || 'regular';
        AppState.depositPercentage = AppState.rates.depositRates[clientType] || 0.25;
        AppState.depositAmount = Math.round(AppState.quoteTotal * AppState.depositPercentage);
        
        // Also load project dates if available
        if (historyItem.quoteData.projectStartDate && historyItem.quoteData.projectEndDate) {
          AppState.selectedDates = {
            startDate: historyItem.quoteData.projectStartDate,
            endDate: historyItem.quoteData.projectEndDate
          };
        } else if (historyItem.quoteData.project && historyItem.quoteData.project.startDate && historyItem.quoteData.project.endDate) {
          AppState.selectedDates = {
            startDate: historyItem.quoteData.project.startDate,
            endDate: historyItem.quoteData.project.endDate
          };
        }
        
        console.log('Loaded quote data into AppState for signing from history');
      }
    }
    
    // Show modal
    this.modal.style.display = 'flex';
    
    // Initialize canvas after modal is displayed to ensure correct dimensions
    setTimeout(() => {
      this.setupCanvas();
    }, 100);
  },
  
  // Create the signature modal
  createSignatureModal() {
    // Create modal element
    this.modal = document.createElement('div');
    this.modal.className = 'signature-modal';
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
    
    // Create modal content
    const content = document.createElement('div');
    content.className = 'signature-modal-content';
    content.style.cssText = `
      background-color: var(--card-bg);
      border-radius: var(--border-radius);
      box-shadow: var(--shadow-lg);
      width: 100%;
      max-width: 550px;
      max-height: 90vh;
      overflow-y: auto;
      padding: 2rem;
      position: relative;
    `;
    
    // Add close button
    const closeBtn = document.createElement('div');
    closeBtn.className = 'signature-modal-close';
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
    
    // Create form
    const form = document.createElement('form');
    form.id = 'signatureForm';
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.processSignature();
    });
    
    // Form content
    form.innerHTML = `
      <h3 style="margin-bottom: 1.5rem; text-align: center;">Accept Quote</h3>
      
      <div style="margin-bottom: 1.5rem;">
        <label for="signerName" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Full Name</label>
        <input type="text" id="signerName" required style="width: 100%; padding: 0.75rem 1rem; border: 1px solid var(--gray-300); border-radius: 8px; font-size: 1rem; background-color: var(--gray-100); color: var(--gray-800);">
      </div>
      
      <div style="margin-bottom: 1.5rem;">
        <label for="signerEmail" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Email</label>
        <input type="email" id="signerEmail" required style="width: 100%; padding: 0.75rem 1rem; border: 1px solid var(--gray-300); border-radius: 8px; font-size: 1rem; background-color: var(--gray-100); color: var(--gray-800);">
      </div>
      
      <div style="margin-bottom: 1.5rem;">
        <label for="signerTitle" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Title/Position</label>
        <input type="text" id="signerTitle" placeholder="Optional" style="width: 100%; padding: 0.75rem 1rem; border: 1px solid var(--gray-300); border-radius: 8px; font-size: 1rem; background-color: var(--gray-100); color: var(--gray-800);">
      </div>
      
      <div style="margin-bottom: 1.5rem;">
        <label style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Signature</label>
        <div id="canvasContainer" style="border: 1px solid var(--gray-300); border-radius: 8px; background-color: var(--gray-100); height: 150px; position: relative; overflow: hidden;">
          <canvas id="signatureCanvas" style="width: 100%; height: 100%;"></canvas>
          <div id="signatureInstructions" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: var(--gray-500); text-align: center; font-style: italic; pointer-events: none;">
            Sign here
          </div>
        </div>
        <div style="display: flex; justify-content: flex-end; margin-top: 0.5rem;">
          <button type="button" id="clearSignature" style="background: none; border: none; color: var(--primary); cursor: pointer; font-size: 0.875rem;">
            <i class="fas fa-undo"></i> Clear
          </button>
        </div>
      </div>
      
      <div style="margin-bottom: 1.5rem;">
        <div style="display: flex; align-items: flex-start; margin-bottom: 1rem;">
          <input type="checkbox" id="termsAccepted" required style="margin-right: 0.5rem; margin-top: 0.25rem;">
          <label for="termsAccepted" style="font-size: 0.875rem; color: var(--gray-700);">
            I acknowledge and accept the terms, pricing, and cancellation policy outlined in this quote.
          </label>
        </div>
        <div id="termsError" style="color: var(--danger); font-size: 0.875rem; display: none;">
          You must accept the terms to continue.
        </div>
      </div>
      
      <div style="display: flex; justify-content: center;">
        <button type="submit" class="btn btn-primary" style="min-width: 180px;">
          <i class="fas fa-check"></i> Accept Quote
        </button>
      </div>
    `;
    
    // Add everything to the DOM
    content.appendChild(closeBtn);
    content.appendChild(form);
    this.modal.appendChild(content);
    document.body.appendChild(this.modal);
    
    // Handle clear button
    document.getElementById('clearSignature').addEventListener('click', this.clearCanvas.bind(this));
  },
  
  // Set up the signature canvas
  setupCanvas() {
    const canvasElement = document.getElementById('signatureCanvas');
    if (!canvasElement) {
      console.error('Signature canvas element not found');
      return;
    }
    
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    
    // Set canvas size to match container size
    const container = this.canvas.parentElement;
    if (!container) {
      console.error('Canvas container not found');
      return;
    }
    
    this.canvas.width = container.offsetWidth;
    this.canvas.height = container.offsetHeight;
    
    // Remove any existing event listeners to prevent duplicates
    this.canvas.removeEventListener('mousedown', this.startDrawing);
    this.canvas.removeEventListener('mousemove', this.draw);
    this.canvas.removeEventListener('mouseup', this.stopDrawing);
    this.canvas.removeEventListener('mouseout', this.stopDrawing);
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
    this.canvas.removeEventListener('touchend', this.stopDrawing);
    
    // Set up drawing events
    this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
    this.canvas.addEventListener('mousemove', this.draw.bind(this));
    this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
    this.canvas.addEventListener('mouseout', this.stopDrawing.bind(this));
    
    // Touch events
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.stopDrawing.bind(this));
    
    // Set initial canvas state
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';
    this.ctx.strokeStyle = 'var(--gray-800)';
    
    console.log('Canvas initialized successfully');
  },
  
  // Start drawing on the canvas
  startDrawing(e) {
    const instructions = document.getElementById('signatureInstructions');
    if (instructions) {
      instructions.style.display = 'none';
    }
    
    this.isDrawing = true;
    this.hasSigned = true;
    
    this.ctx.beginPath();
    
    const { offsetX, offsetY } = this.getCoordinates(e);
    this.ctx.moveTo(offsetX, offsetY);
  },
  
  // Draw on the canvas
  draw(e) {
    if (!this.isDrawing) return;
    
    const { offsetX, offsetY } = this.getCoordinates(e);
    this.ctx.lineTo(offsetX, offsetY);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.moveTo(offsetX, offsetY);
  },
  
  // Stop drawing
  stopDrawing() {
    this.isDrawing = false;
    this.ctx.beginPath();
  },
  
  // Handle touch start event
  handleTouchStart(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      this.startDrawing(mouseEvent);
    }
  },
  
  // Handle touch move event
  handleTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
      });
      this.draw(mouseEvent);
    }
  },
  
  // Get coordinates from event
  getCoordinates(e) {
    if (!this.canvas) {
      return { offsetX: 0, offsetY: 0 };
    }
    
    const rect = this.canvas.getBoundingClientRect();
    
    // Handle mouse or touch event
    let clientX, clientY;
    if (e.clientX !== undefined) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      clientX = e.pageX;
      clientY = e.pageY;
    }
    
    return {
      offsetX: clientX - rect.left,
      offsetY: clientY - rect.top
    };
  },
  
  // Clear the canvas
  clearCanvas() {
    if (!this.ctx || !this.canvas) return;
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.hasSigned = false;
    
    const instructions = document.getElementById('signatureInstructions');
    if (instructions) {
      instructions.style.display = 'block';
    }
  },
  
  // Check if the canvas is empty
  isCanvasEmpty() {
    if (!this.ctx || !this.canvas) return true;
    
    const pixelData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height).data;
    
    // Check if all pixel values are 0 (transparent)
    for (let i = 0; i < pixelData.length; i += 4) {
      if (pixelData[i + 3] !== 0) {
        return false;
      }
    }
    
    return true;
  },
  
  // Process the signature form
  async processSignature() {
    // Check if signature exists
    if (!this.hasSigned || this.isCanvasEmpty()) {
      alert('Please sign the document before proceeding.');
      return;
    }
    
    // Check if terms accepted
    const termsAccepted = document.getElementById('termsAccepted');
    const termsError = document.getElementById('termsError');
    
    if (!termsAccepted || !termsAccepted.checked) {
      if (termsError) {
        termsError.style.display = 'block';
      }
      return;
    } else if (termsError) {
      termsError.style.display = 'none';
    }
    
    // Get form data
    const name = document.getElementById('signerName').value;
    const email = document.getElementById('signerEmail').value;
    const title = document.getElementById('signerTitle').value;
    
    // Get signature as base64 image
    const signatureImg = this.canvas.toDataURL('image/png');
    
    // Get IP address (in production, would use a service)
    const ipAddress = '127.0.0.1'; // Placeholder
    
    // Create signature data
    const signatureData = {
      name,
      email,
      title,
      signature: signatureImg,
      ipAddress,
      timestamp: new Date().toISOString(),
      quoteData: AppState.quoteData
    };
    
    // Save the signature data
    await this.saveSignature(signatureData);
    
    // Book the project dates in the calendar
    if (AppState.selectedDates && Calendar) {
      const startDate = new Date(AppState.selectedDates.startDate);
      const endDate = new Date(AppState.selectedDates.endDate);
      
      // Handle edge case
      if (startDate && endDate && startDate <= endDate) {
        const clientData = {
          clientName: document.getElementById('clientName').value.trim() || 'Unnamed Client',
          projectName: document.getElementById('projectName').value.trim() || 'Unnamed Project',
          projectLocation: document.getElementById('projectLocation').value.trim() || '',
          depositPaid: false, // Will be updated when deposit is paid
          notes: 'Quote accepted on ' + new Date().toLocaleDateString(),
          quoteId: AppState.quoteData.id || Date.now(),
          travelDays: parseInt(document.getElementById('travelDays').value) || 0
        };
        
        await Calendar.bookDateRange(startDate, endDate, clientData);
        
        console.log('Project dates booked in calendar:', startDate, 'to', endDate);
      } else {
        console.warn('Invalid date range, calendar not updated');
      }
    }
    
    // Determine the quote ID to use in the event
    let quoteId = this.quoteIdToSign;
    
    if (!quoteId && AppState.quoteData) {
      // If we're signing from calculator, find the quote in history
      // First check if the quote has an ID in AppState
      if (AppState.quoteData.id) {
        quoteId = AppState.quoteData.id;
      } else {
        // Try to find the most recent unaccepted quote
        const latestQuote = History.historyData.find(item => 
          item.type === 'quote' && !item.accepted);
        
        if (latestQuote) {
          quoteId = latestQuote.id;
        }
      }
    }
    
    if (quoteId) {
      console.log('Preparing to dispatch quoteAccepted event for ID:', quoteId);
      
      // Create a clean copy of signature data for the event
      const eventSignatureData = {
        name: signatureData.name,
        email: signatureData.email,
        title: signatureData.title || '',
        signature: signatureData.signature,
        timestamp: new Date().toISOString()
      };
      
      try {
        // Dispatch a custom event
        const acceptedEvent = new CustomEvent('quoteAccepted', {
          detail: {
            quoteId: quoteId,
            signatureData: eventSignatureData
          }
        });
        
        document.dispatchEvent(acceptedEvent);
        console.log('Quote accepted event dispatched for quote ID:', quoteId);
      } catch (error) {
        console.error('Error dispatching quote accepted event:', error);
      }
    } else {
      console.warn('No quote ID available for event dispatch');
    }
    
    // Send emails
    this.sendAcceptanceEmails(signatureData);
    
    // Close the modal
    this.modal.style.display = 'none';
    
    // Create and display acceptance confirmation
    this.showAcceptanceConfirmation(signatureData);
    
    // Reset the quoteIdToSign
    this.quoteIdToSign = null;
  },
  
  // Save signature data
  async saveSignature(signatureData) {
    try {
      // Save to Firebase if available
      if (AppState.usingFirebase) {
        await FirebaseStorage.saveSignatureData(signatureData);
        console.log('Signature data saved to Firebase');
        return true;
      }
      
      // Fallback to localStorage
      const signatureHistory = JSON.parse(localStorage.getItem('signatureHistory') || '[]');
      signatureHistory.unshift({
        id: Date.now(),
        date: new Date().toISOString(),
        clientName: signatureData.name,
        projectName: signatureData.quoteData.project.name || 'Unnamed Project',
        amount: signatureData.quoteData.total,
        signatureData
      });
      
      // Keep only the last 50 signatures
      if (signatureHistory.length > 50) {
        signatureHistory.length = 50;
      }
      
      localStorage.setItem('signatureHistory', JSON.stringify(signatureHistory));
      console.log('Signature data saved to localStorage');
      
      return true;
    } catch (error) {
      console.error('Error saving signature data:', error);
      
      // Try localStorage as fallback
      try {
        const signatureHistory = JSON.parse(localStorage.getItem('signatureHistory') || '[]');
        signatureHistory.unshift({
          id: Date.now(),
          date: new Date().toISOString(),
          clientName: signatureData.name,
          projectName: signatureData.quoteData.project.name || 'Unnamed Project',
          amount: signatureData.quoteData.total,
          signatureData
        });
        
        // Keep only the last 50 signatures
        if (signatureHistory.length > 50) {
          signatureHistory.length = 50;
        }
        
        localStorage.setItem('signatureHistory', JSON.stringify(signatureHistory));
        console.log('Signature data saved to localStorage (fallback)');
        
        return true;
      } catch (localError) {
        console.error('Error saving signature to localStorage:', localError);
        return false;
      }
    }
  },
  
  // Send acceptance emails to client and business owner
  sendAcceptanceEmails(signatureData) {
    // Show loading state
    this.showEmailLoading();
    
    // Prepare data for emails
    const clientName = signatureData.name;
    const clientEmail = signatureData.email;
    const clientTitle = signatureData.title || '';
    const ownerEmail = AppState.rates.businessInfo.email; // "drewemmett123@gmail.com"
    const projectName = signatureData.quoteData.project.name || 'Unnamed Project';
    const projectLocation = signatureData.quoteData.project.location || '';
    const businessName = AppState.rates.businessInfo.name || 'Emmett Technical Production';
    const quoteTotal = Calculator.formatCurrency(signatureData.quoteData.total);
    const depositAmount = Calculator.formatCurrency(AppState.depositAmount);
    const depositPercentage = `${AppState.depositPercentage * 100}%`;
    
    // Create HTML versions of the quote for emails
    const clientEmailHTML = this.generateClientEmailHTML(signatureData);
    const ownerEmailHTML = this.generateOwnerEmailHTML(signatureData);
    
    // Create email PDF attachment (will be just HTML for now)
    const pdfData = this.prepareQuotePDF(signatureData);
    
    // Promise array to track email sending
    const emailPromises = [];
    
    // 1. Send client confirmation email
    if (this.emailJSInitialized) {
      const clientEmailPromise = emailjs.send(
        'default_service', // Replace with your EmailJS service ID
        'template_bfk7r4q', // Replace with your EmailJS template ID
        {
          to_name: clientName,
          to_email: clientEmail,
          from_name: businessName,
          project_name: projectName,
          quote_total: quoteTotal,
          deposit_amount: depositAmount,
          deposit_percentage: depositPercentage,
          accept_date: new Date().toLocaleDateString(),
          signed_quote_html: clientEmailHTML,
          reply_to: ownerEmail
        }
      ).then(
        response => {
          console.log('Client confirmation email sent successfully:', response);
          return true;
        },
        error => {
          console.error('Error sending client confirmation email:', error);
          return false;
        }
      );
      
      emailPromises.push(clientEmailPromise);
      
      // 2. Send owner notification email
      const ownerEmailPromise = emailjs.send(
        'default_service', // Replace with your EmailJS service ID
        'template_f7mvasu', // Replace with your EmailJS template ID
        {
          owner_email: ownerEmail,
          client_name: clientName,
          client_email: clientEmail,
          client_title: clientTitle,
          project_name: projectName,
          project_location: projectLocation,
          quote_total: quoteTotal,
          deposit_amount: depositAmount,
          deposit_percentage: depositPercentage,
          accept_date: new Date().toLocaleDateString(),
          accept_time: new Date().toLocaleTimeString(),
          signature_image: signatureData.signature,
          signed_quote_html: ownerEmailHTML
        }
      ).then(
        response => {
          console.log('Owner notification email sent successfully:', response);
          return true;
        },
        error => {
          console.error('Error sending owner notification email:', error);
          return false;
        }
      );
      
      emailPromises.push(ownerEmailPromise);
      
      // Wait for all emails to be sent
      Promise.all(emailPromises)
        .then(results => {
          this.hideEmailLoading();
          
          // Check if all emails were sent successfully
          const allSuccess = results.every(result => result === true);
          
          if (!allSuccess) {
            console.warn('Some emails failed to send.');
            alert('Some confirmation emails could not be sent. Please contact us directly to confirm your quote acceptance.');
          }
        })
        .catch(error => {
          this.hideEmailLoading();
          console.error('Error in email sending process:', error);
          alert('There was an error sending confirmation emails. Please contact us directly to confirm your quote acceptance.');
        });
    } else {
      // EmailJS not initialized, show error
      this.hideEmailLoading();
      console.error('EmailJS not initialized. Unable to send emails.');
      alert('Unable to send confirmation emails due to a technical issue. Please contact us directly to confirm your quote acceptance.');
    }
  },
  
  // Show email sending loading state
  showEmailLoading() {
    // Create loading overlay if it doesn't exist
    let loadingOverlay = document.getElementById('emailLoadingOverlay');
    
    if (!loadingOverlay) {
      loadingOverlay = document.createElement('div');
      loadingOverlay.id = 'emailLoadingOverlay';
      loadingOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.7);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 1100;
        color: white;
      `;
      
      loadingOverlay.innerHTML = `
        <div class="loading-spinner" style="width: 50px; height: 50px; margin-bottom: 1rem;"></div>
        <div style="font-size: 1.25rem; margin-bottom: 0.5rem;">Sending Confirmation Emails</div>
        <div style="font-size: 0.875rem; color: rgba(255, 255, 255, 0.8);">Please wait...</div>
      `;
      
      document.body.appendChild(loadingOverlay);
    } else {
      loadingOverlay.style.display = 'flex';
    }
  },
  
  // Hide email sending loading state
  hideEmailLoading() {
    const loadingOverlay = document.getElementById('emailLoadingOverlay');
    if (loadingOverlay) {
      loadingOverlay.style.display = 'none';
    }
  },
  
  // Generate HTML content for client email
  generateClientEmailHTML(signatureData) {
    const clientName = signatureData.name;
    const quoteData = signatureData.quoteData;
    const businessName = AppState.rates.businessInfo.name || 'Emmett Technical Production';
    const businessEmail = AppState.rates.businessInfo.email || 'drewemmett123@gmail.com';
    const formattedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const formattedTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    // Generate quote rows HTML
    let quoteRowsHtml = '';
    quoteData.rows.forEach(row => {
      const service = row[0];
      const details = row[1];
      const rate = row[2];
      const amount = row[3];
      
      // Skip date rows
      if (service === 'Quote Date' || service === 'Quote Valid Until') return;
      
      // Format amount based on whether it's a string or number
      const formattedAmount = typeof amount === 'number' ? 
        Calculator.formatCurrency(amount) : amount;
      
      // Add row with appropriate styling for total
      if (service === 'TOTAL') {
        quoteRowsHtml += `
          <tr style="font-weight: bold; background-color: #f8f9fa;">
            <td style="padding: 12px; border-bottom: 1px solid #dee2e6;">${service}</td>
            <td style="padding: 12px; border-bottom: 1px solid #dee2e6;">${details}</td>
            <td style="padding: 12px; border-bottom: 1px solid #dee2e6;">${rate}</td>
            <td style="padding: 12px; border-bottom: 1px solid #dee2e6;">${formattedAmount}</td>
          </tr>
        `;
      } else {
        quoteRowsHtml += `
          <tr>
            <td style="padding: 12px; border-bottom: 1px solid #dee2e6;">${service}</td>
            <td style="padding: 12px; border-bottom: 1px solid #dee2e6;">${details}</td>
            <td style="padding: 12px; border-bottom: 1px solid #dee2e6;">${rate}</td>
            <td style="padding: 12px; border-bottom: 1px solid #dee2e6;">${formattedAmount}</td>
          </tr>
        `;
      }
    });
    
    // Generate notes HTML
    let notesHtml = '';
    quoteData.notes.forEach(note => {
      notesHtml += `<li style="margin-bottom: 8px;">${note}</li>`;
    });
    
    // Compile the complete email HTML
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Quote Acceptance Confirmation</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px;">
        <div style="max-width: 800px; margin: 0 auto; background-color: #fff; border-radius: 5px; padding: 20px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #ff7b00; margin-bottom: 10px;">${businessName}</h1>
            <h2 style="color: #4a4a4a; font-weight: normal; margin-top: 0;">Quote Acceptance Confirmation</h2>
            <p style="color: #6c757d;">Quote accepted on ${formattedDate} at ${formattedTime}</p>
          </div>
          
          <div style="margin-bottom: 30px;">
            <p>Dear ${clientName},</p>
            <p>Thank you for accepting the quote for ${quoteData.project.name || 'our services'}. This email confirms your acceptance of the terms and pricing detailed below.</p>
            <p>A copy of the signed quote is attached, and a representative will be in touch shortly to discuss next steps and schedule your project.</p>
          </div>
          
          <h3 style="color: #4a4a4a; border-bottom: 1px solid #dee2e6; padding-bottom: 10px;">Quote Summary</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <thead>
              <tr style="background-color: #f8f9fa;">
                <th style="text-align: left; padding: 12px; border-bottom: 2px solid #dee2e6;">Service</th>
                <th style="text-align: left; padding: 12px; border-bottom: 2px solid #dee2e6;">Details</th>
                <th style="text-align: left; padding: 12px; border-bottom: 2px solid #dee2e6;">Rate</th>
                <th style="text-align: left; padding: 12px; border-bottom: 2px solid #dee2e6;">Amount</th>
              </tr>
            </thead>
            <tbody>
              ${quoteRowsHtml}
            </tbody>
          </table>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 30px;">
            <h4 style="margin-top: 0; color: #4a4a4a;">Important Notes:</h4>
            <ul style="padding-left: 20px;">
              ${notesHtml}
            </ul>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6;">
            <h4 style="font-size: 18px; margin-bottom: 15px;">Accepted By:</h4>
            <table style="width: 100%;">
              <tr>
                <td style="width: 50%;">
                  <div style="font-weight: bold;">${signatureData.name}</div>
                  ${signatureData.title ? `<div style="color: #6c757d; font-size: 14px;">${signatureData.title}</div>` : ''}
                  <div style="color: #6c757d; font-size: 14px;">${signatureData.email}</div>
                </td>
                <td style="width: 50%; text-align: right;">
                  <img src="${signatureData.signature}" alt="Signature" style="height: 60px; max-width: 200px;">
                  <div style="color: #6c757d; font-size: 12px; margin-top: 5px;">
                    ${formattedDate} ${formattedTime}
                  </div>
                </td>
              </tr>
            </table>
          </div>
          
          <div style="margin-top: 30px; text-align: center; color: #6c757d; font-size: 14px; border-top: 1px solid #dee2e6; padding-top: 20px;">
            <p>If you have any questions, please contact us at <a href="mailto:${businessEmail}" style="color: #ff7b00;">${businessEmail}</a>.</p>
            <p>&copy; ${new Date().getFullYear()} ${businessName}. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  },
  
  // Generate HTML content for owner notification email
  generateOwnerEmailHTML(signatureData) {
    const clientName = signatureData.name;
    const clientEmail = signatureData.email;
    const clientTitle = signatureData.title;
    const quoteData = signatureData.quoteData;
    const quoteTotal = Calculator.formatCurrency(quoteData.total);
    const projectName = quoteData.project.name || 'Unnamed Project';
    const projectLocation = quoteData.project.location;
    const formattedDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const formattedTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Quote Accepted Notification</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #fff; border-radius: 5px; padding: 20px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
          <div style="text-align: center; margin-bottom: 30px; padding: 20px; background-color: #ff7b00; color: #fff; border-radius: 5px;">
            <h1 style="margin-bottom: 10px;">Quote Accepted!</h1>
            <p style="margin: 0; font-size: 18px;">${quoteTotal}</p>
          </div>
          
          <div style="margin-bottom: 30px;">
            <p><strong>${clientName}</strong> has accepted your quote for <strong>${projectName}</strong>${projectLocation ? ` (${projectLocation})` : ''}.</p>
            <p>The quote was accepted on ${formattedDate} at ${formattedTime}.</p>
          </div>
          
          <h3 style="color: #4a4a4a; border-bottom: 1px solid #dee2e6; padding-bottom: 10px;">Client Information</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; font-weight: bold; width: 120px;">Name:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;">${clientName}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; font-weight: bold;">Email:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;">
                <a href="mailto:${clientEmail}" style="color: #ff7b00;">${clientEmail}</a>
              </td>
            </tr>
            ${clientTitle ? `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; font-weight: bold;">Title:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;">${clientTitle}</td>
            </tr>
            ` : ''}
          </table>
          
          <h3 style="color: #4a4a4a; border-bottom: 1px solid #dee2e6; padding-bottom: 10px;">Quote Summary</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px;">
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; font-weight: bold; width: 120px;">Project:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;">${projectName}</td>
            </tr>
            ${projectLocation ? `
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; font-weight: bold;">Location:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;">${projectLocation}</td>
            </tr>
            ` : ''}
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; font-weight: bold;">Amount:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; font-weight: bold; color: #ff7b00;">
                ${quoteTotal}
              </td>
            </tr>
            <tr>
              <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6; font-weight: bold;">Deposit:</td>
              <td style="padding: 8px 0; border-bottom: 1px solid #dee2e6;">
                ${Calculator.formatCurrency(AppState.depositAmount)} (${AppState.depositPercentage * 100}%)
              </td>
            </tr>
          </table>
          
          <div style="text-align: center;">
            <div style="display: inline-block; text-align: left;">
              <h3 style="color: #4a4a4a; margin-bottom: 15px;">Signature</h3>
              <img src="${signatureData.signature}" alt="Signature" style="height: 80px; max-width: 300px;">
              <p style="color: #6c757d; font-size: 14px; margin-top: 5px;">
                Signed on ${formattedDate} at ${formattedTime}
              </p>
            </div>
          </div>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; text-align: center;">
            <p style="margin-bottom: 0;">A confirmation email has been automatically sent to the client.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  },
  
  // Prepare PDF version of signed quote (currently returns HTML)
  prepareQuotePDF(signatureData) {
    // In a production environment, you would use a PDF library
    // For the current implementation, we'll just return the HTML content
    return this.generateClientEmailHTML(signatureData);
  },
  
  // Show acceptance confirmation
  showAcceptanceConfirmation(signatureData) {
    // Create confirmation message
    const confirmation = document.createElement('div');
    confirmation.className = 'alert alert-success';
    confirmation.innerHTML = `
      <i class="fas fa-check-circle"></i>
      <div>
        <strong>Quote Accepted!</strong>
        <p>Quote has been accepted by ${signatureData.name} on ${new Date().toLocaleString()}</p>
        <p>A confirmation email has been sent to ${signatureData.email}</p>
      </div>
    `;
    
    // Add to document
    const quoteSection = document.getElementById('quoteSection');
    if (quoteSection) {
      const card = quoteSection.querySelector('.card');
      if (card) {
        card.prepend(confirmation);
      }
    }
    
    // Display signature
    this.displaySignature(signatureData);
    
    // Disable the accept button
    const acceptBtn = document.getElementById('acceptQuoteBtn');
    if (acceptBtn) {
      acceptBtn.disabled = true;
    }
  },
  
  // Display the signature in the quote
  displaySignature(signatureData) {
    // Create signature display
    const signatureDisplay = document.createElement('div');
    signatureDisplay.className = 'signature-display';
    signatureDisplay.style.cssText = `
      margin-top: 2rem;
      padding-top: 1.5rem;
      border-top: 1px solid var(--gray-300);
    `;
    
    signatureDisplay.innerHTML = `
      <h4 style="margin-bottom: 1rem;">Accepted By:</h4>
      <div style="display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <div style="font-weight: 600;">${signatureData.name}</div>
          <div style="font-size: 0.875rem; color: var(--gray-600);">${signatureData.title}</div>
          <div style="font-size: 0.875rem; color: var(--gray-600);">${signatureData.email}</div>
        </div>
        <div>
          <img src="${signatureData.signature}" alt="Signature" style="height: 60px; max-width: 200px;">
          <div style="font-size: 0.75rem; color: var(--gray-500); margin-top: 0.25rem; text-align: right;">
            ${new Date(signatureData.timestamp).toLocaleString()}
          </div>
        </div>
      </div>
    `;
    
    // Add to document
    const quoteSection = document.getElementById('quoteSection');
    if (quoteSection) {
      const btnGroup = quoteSection.querySelector('.btn-group');
      if (btnGroup) {
        btnGroup.parentNode.insertBefore(signatureDisplay, btnGroup);
      }
    }
  }
};
