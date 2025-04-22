/**
 * PIN Authentication Module
 * Handles PIN verification for protected features
 */

const PinAuth = {
  correctPin: '160781',
  modal: null,
  onSuccess: null,
  
  // Initialize PIN authentication module
  init() {
    this.createPinModal();
  },
  
  // Show PIN modal and verify PIN
  verifyPin(successCallback) {
    // Store the callback for success
    this.onSuccess = successCallback;
    
    // Reset form if it exists
    if (this.modal) {
      const form = this.modal.querySelector('form');
      if (form) form.reset();
      
      // Clear error message if any
      const errorMsg = this.modal.querySelector('#pinErrorMsg');
      if (errorMsg) errorMsg.style.display = 'none';
    }
    
    // Show modal
    this.modal.style.display = 'flex';
    
    // Focus on PIN input
    setTimeout(() => {
      const pinInput = document.getElementById('pinInput');
      if (pinInput) pinInput.focus();
    }, 100);
  },
  
  // Create PIN verification modal
  createPinModal() {
    // Create modal element
    this.modal = document.createElement('div');
    this.modal.className = 'pin-auth-modal';
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
    content.className = 'pin-auth-modal-content';
    content.style.cssText = `
      background-color: var(--card-bg);
      border-radius: var(--border-radius);
      box-shadow: var(--shadow-lg);
      width: 100%;
      max-width: 400px;
      padding: 2rem;
      position: relative;
    `;
    
    // Add close button
    const closeBtn = document.createElement('div');
    closeBtn.className = 'pin-auth-modal-close';
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
    form.id = 'pinAuthForm';
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handlePinSubmit();
    });
    
    // Form content
    form.innerHTML = `
      <h3 style="margin-bottom: 1.5rem; text-align: center;">Authorization Required</h3>
      
      <div style="margin-bottom: 1.5rem;">
        <label for="pinInput" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Enter PIN</label>
        <input type="password" id="pinInput" required style="width: 100%; padding: 0.75rem 1rem; border: 1px solid var(--gray-300); border-radius: 8px; font-size: 1rem; background-color: var(--gray-100); color: var(--gray-800); letter-spacing: 0.25em;" maxlength="6" inputmode="numeric" pattern="[0-9]*">
        <div id="pinErrorMsg" style="color: var(--danger); margin-top: 0.5rem; font-size: 0.875rem; display: none;">
          Incorrect PIN. Please try again.
        </div>
      </div>
      
      <div style="display: flex; justify-content: center;">
        <button type="submit" class="btn btn-primary" style="min-width: 180px;">
          <i class="fas fa-lock"></i> Verify
        </button>
      </div>
    `;
    
    // Add everything to the DOM
    content.appendChild(closeBtn);
    content.appendChild(form);
    this.modal.appendChild(content);
    document.body.appendChild(this.modal);
  },
  
  // Handle PIN submission
  handlePinSubmit() {
    const pinInput = document.getElementById('pinInput');
    const enteredPin = pinInput.value;
    const errorMsg = document.getElementById('pinErrorMsg');
    
    // Validate PIN
    if (enteredPin === this.correctPin) {
      // Hide error message
      errorMsg.style.display = 'none';
      
      // Close modal
      this.modal.style.display = 'none';
      
      // Call success callback if provided
      if (typeof this.onSuccess === 'function') {
        this.onSuccess();
      }
    } else {
      // Show error message
      errorMsg.style.display = 'block';
      
      // Clear input
      pinInput.value = '';
      pinInput.focus();
    }
  }
};
