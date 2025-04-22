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
  
  // Initialize signature module
  init() {
    this.createAcceptButton();
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
  processSignature() {
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
    this.saveSignature(signatureData);
    
    // Close the modal
    this.modal.style.display = 'none';
    
    // Create and display acceptance confirmation
    this.showAcceptanceConfirmation(signatureData);
  },
  
  // Save signature data
  saveSignature(signatureData) {
    // In a production environment, this would send the data to a server or store in a database
    
    // For this demo, we'll just store in the AppState
    AppState.signatureData = signatureData;
    
    // This function could be extended to:
    // 1. Push the data to a GitHub issue as requested
    // 2. Save to Firebase/Firestore
    // 3. Generate a PDF with the signature
    
    console.log('Signature data saved:', signatureData);
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
        <p>A confirmation email will be sent to ${signatureData.email}</p>
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
