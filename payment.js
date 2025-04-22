/**
 * Payment Module
 * Handles payment processing with Stripe, PayPal, and other methods
 */

const Payment = {
  paymentMethods: [],
  stripeLoaded: false,
  stripe: null,
  modal: null,
  
  // Initialize payment module
  init(paymentMethods) {
    this.paymentMethods = paymentMethods || [];
    this.loadStripeLibrary();
  },
  
  // Load Stripe library
  loadStripeLibrary() {
    if (this.stripeLoaded) return;
    
    const script = document.createElement('script');
    script.src = 'https://js.stripe.com/v3/';
    script.async = true;
    script.onload = () => {
      this.stripeLoaded = true;
      // Initialize Stripe with your publishable key
      // In production, you'd use a real key from your Stripe account
      this.stripe = Stripe('pk_test_TYooMQauvdEDq54NiTphI7jx'); // This is a placeholder test key
      console.log('Stripe loaded');
    };
    
    document.head.appendChild(script);
  },
  
  // Handle payment button click
  handlePayment(type) {
    const amount = type === 'deposit' ? 
      AppState.depositAmount : 
      (AppState.invoiceData.depositPaid ? 
        AppState.quoteTotal - AppState.depositAmount : 
        AppState.quoteTotal);
        
    const description = type === 'deposit' ? 
      'Deposit Payment' : 
      (AppState.invoiceData.depositPaid ? 'Balance Payment' : 'Full Payment');
      
    // Show payment method selection modal
    this.showPaymentModal(amount, description, type);
  },
  
  // Show payment method selection modal
  showPaymentModal(amount, description, paymentType) {
    // Create modal if it doesn't exist
    if (!this.modal) {
      this.createPaymentModal();
    }
    
    // Update modal content
    const amountEl = this.modal.querySelector('#paymentAmount');
    amountEl.textContent = Calculator.formatCurrency(amount);
    
    const descriptionEl = this.modal.querySelector('#paymentDescription');
    descriptionEl.textContent = description;
    
    // Store payment info in modal dataset
    this.modal.dataset.amount = amount;
    this.modal.dataset.description = description;
    this.modal.dataset.paymentType = paymentType;
    
    // Show the modal
    this.modal.style.display = 'flex';
  },
  
  // Create payment modal
  createPaymentModal() {
    // Create modal element
    this.modal = document.createElement('div');
    this.modal.className = 'payment-modal';
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
    content.className = 'payment-modal-content';
    content.style.cssText = `
      background-color: var(--card-bg);
      border-radius: var(--border-radius);
      box-shadow: var(--shadow-lg);
      width: 100%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
      padding: 2rem;
      position: relative;
    `;
    
    // Add close button
    const closeBtn = document.createElement('div');
    closeBtn.className = 'payment-modal-close';
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
    
    // Payment modal content
    content.innerHTML += `
      <h3 style="margin-bottom: 1.5rem; text-align: center;">Process Payment</h3>
      
      <div style="text-align: center; margin-bottom: 2rem;">
        <div id="paymentDescription" style="font-size: 1.125rem; margin-bottom: 0.5rem;">Payment</div>
        <div id="paymentAmount" style="font-size: 2rem; font-weight: 700; color: var(--primary);">$0</div>
      </div>
      
      <div style="margin-bottom: 1.5rem;">
        <div style="font-weight: 500; margin-bottom: 0.75rem;">Select Payment Method</div>
        <div id="paymentMethodsList" style="display: grid; gap: 0.75rem;">
          ${this.renderPaymentMethodOptions()}
        </div>
      </div>
      
      <div id="paymentFormContainer" style="margin-top: 1.5rem;">
        <!-- Payment form will be inserted here -->
      </div>
    `;
    
    // Add everything to the DOM
    content.appendChild(closeBtn);
    this.modal.appendChild(content);
    document.body.appendChild(this.modal);
    
    // Add event listeners to payment method buttons
    this.setupPaymentMethodListeners();
  },
  
  // Render payment method options
  renderPaymentMethodOptions() {
    return this.paymentMethods
      .filter(method => method.enabled)
      .map(method => `
        <button class="payment-method-btn" data-method="${method.id}" style="
          display: flex;
          align-items: center;
          padding: 1rem;
          border: 1px solid var(--gray-300);
          border-radius: 8px;
          background-color: var(--gray-100);
          cursor: pointer;
          transition: all 0.2s;
        ">
          <i class="fas ${method.icon}" style="margin-right: 1rem; color: var(--primary);"></i>
          <div style="flex: 1; text-align: left;">
            <div style="font-weight: 500;">${method.name}</div>
            ${method.fee > 0 ? 
              `<div style="font-size: 0.75rem; color: var(--gray-500);">
                ${method.fee * 100}% + $${method.flatFee.toFixed(2)} fee
              </div>` : 
              `<div style="font-size: 0.75rem; color: var(--gray-500);">No fees</div>`
            }
          </div>
          ${method.fee > 0 ? 
            `<div style="margin-left: 1rem; font-size: 0.75rem; color: var(--gray-500);">
              +$${this.calculateFee(AppState.quoteTotal, method).toFixed(2)}
            </div>` : ''
          }
        </button>
      `).join('');
  },
  
  // Set up payment method button listeners
  setupPaymentMethodListeners() {
    const buttons = this.modal.querySelectorAll('.payment-method-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const method = btn.dataset.method;
        this.selectPaymentMethod(method);
        
        // Update selected button styling
        buttons.forEach(b => {
          b.style.borderColor = 'var(--gray-300)';
          b.style.backgroundColor = 'var(--gray-100)';
        });
        
        btn.style.borderColor = 'var(--primary)';
        btn.style.backgroundColor = 'var(--gray-200)';
      });
    });
  },
  
  // Calculate payment processing fee
  calculateFee(amount, method) {
    if (!method || method.fee === 0) return 0;
    return (amount * method.fee) + method.flatFee;
  },
  
  // Handle payment method selection
  selectPaymentMethod(method) {
    const container = this.modal.querySelector('#paymentFormContainer');
    const amount = parseFloat(this.modal.dataset.amount);
    const description = this.modal.dataset.description;
    
    // Clear previous content
    container.innerHTML = '';
    
    switch (method) {
      case 'stripe':
        this.setupStripeForm(container, amount, description);
        break;
        
      case 'paypal':
        this.setupPaypalForm(container, amount, description);
        break;
        
      case 'zelle':
        this.setupZelleInstructions(container, amount);
        break;
        
      case 'venmo':
        this.setupVenmoInstructions(container, amount);
        break;
        
      case 'check':
        this.setupCheckInstructions(container, amount);
        break;
        
      default:
        container.innerHTML = '<div style="text-align: center; padding: 1rem;">Payment method not available</div>';
    }
  },
  
  // Set up Stripe payment form
  setupStripeForm(container, amount, description) {
    if (!this.stripeLoaded) {
      container.innerHTML = `
        <div style="text-align: center; padding: 1rem;">
          <div class="loading-spinner" style="margin: 0 auto 1rem;"></div>
          Loading payment form...
        </div>
      `;
      
      // Try again after a delay
      setTimeout(() => {
        if (this.stripeLoaded) {
          this.setupStripeForm(container, amount, description);
        } else {
          container.innerHTML = 'Unable to load payment processor. Please try again later.';
        }
      }, 1000);
      
      return;
    }
    
    // Create form
    const form = document.createElement('form');
    form.id = 'stripe-payment-form';
    
    // Add card element container
    const cardElementContainer = document.createElement('div');
    cardElementContainer.id = 'card-element';
    cardElementContainer.style.cssText = `
      padding: 1rem;
      border: 1px solid var(--gray-300);
      border-radius: 8px;
      background-color: var(--gray-100);
      margin-bottom: 1.5rem;
    `;
    
    // Add error message container
    const errorContainer = document.createElement('div');
    errorContainer.id = 'card-errors';
    errorContainer.style.cssText = `
      color: var(--danger);
      font-size: 0.875rem;
      margin-bottom: 1.5rem;
      min-height: 1.5rem;
    `;
    
    // Add submit button
    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.className = 'btn btn-primary';
    submitButton.style.width = '100%';
    submitButton.innerHTML = `<i class="fas fa-lock"></i> Pay ${Calculator.formatCurrency(amount)}`;
    
    // Assemble the form
    form.appendChild(cardElementContainer);
    form.appendChild(errorContainer);
    form.appendChild(submitButton);
    
    // Add form to container
    container.appendChild(form);
    
    // Initialize Stripe elements
    const elements = this.stripe.elements();
    const style = {
      base: {
        color: '#32325d',
        fontFamily: '"DM Sans", sans-serif',
        fontSmoothing: 'antialiased',
        fontSize: '16px',
        '::placeholder': {
          color: '#aab7c4'
        }
      },
      invalid: {
        color: '#fa755a',
        iconColor: '#fa755a'
      }
    };
    
    const cardElement = elements.create('card', { style });
    cardElement.mount('#card-element');
    
    // Handle form submission
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      
      // Show loading state
      submitButton.disabled = true;
      submitButton.innerHTML = '<div class="loading-spinner" style="margin: 0 auto;"></div>';
      
      // In a production environment, you would create a payment intent on your server
      // and return the client secret. For demo purposes, we'll simulate success
      
      setTimeout(() => {
        // Simulate successful payment
        this.handlePaymentSuccess(this.modal.dataset.paymentType);
      }, 2000);
    });
  },
  
  // Set up PayPal payment form
  setupPaypalForm(container, amount, description) {
    container.innerHTML = `
      <div style="text-align: center; padding: 1rem; margin-bottom: 1rem;">
        <p>You'll be redirected to PayPal to complete your payment.</p>
      </div>
      <button id="paypal-button" class="btn btn-primary" style="width: 100%; background-color: #0070ba;">
        <i class="fab fa-paypal"></i> Pay with PayPal
      </button>
    `;
    
    // Add click handler
    container.querySelector('#paypal-button').addEventListener('click', () => {
      // Simulate PayPal redirect and return
      container.innerHTML = `
        <div style="text-align: center; padding: 1rem;">
          <div class="loading-spinner" style="margin: 0 auto 1rem;"></div>
          Redirecting to PayPal...
        </div>
      `;
      
      // Simulate successful payment after a delay
      setTimeout(() => {
        this.handlePaymentSuccess(this.modal.dataset.paymentType);
      }, 2000);
    });
  },
  
  // Set up Zelle instructions
  setupZelleInstructions(container, amount) {
    container.innerHTML = `
      <div style="padding: 1rem; border: 1px solid var(--gray-300); border-radius: 8px; background-color: var(--gray-100); margin-bottom: 1.5rem;">
        <p style="margin-bottom: 0.5rem;"><strong>Zelle Payment Instructions:</strong></p>
        <p style="margin-bottom: 0.5rem;">1. Open your banking app and select Zelle</p>
        <p style="margin-bottom: 0.5rem;">2. Send payment to: <strong>${AppState.rates.businessInfo.email}</strong></p>
        <p style="margin-bottom: 0.5rem;">3. Enter amount: <strong>${Calculator.formatCurrency(amount)}</strong></p>
        <p style="margin-bottom: 0.5rem;">4. Add memo: <strong>Invoice #${AppState.invoiceData.invoiceNumber}</strong></p>
      </div>
      <button id="confirm-zelle" class="btn btn-primary" style="width: 100%;">
        <i class="fas fa-check"></i> I've Sent the Payment
      </button>
    `;
    
    // Add click handler
    container.querySelector('#confirm-zelle').addEventListener('click', () => {
      this.handlePaymentSuccess(this.modal.dataset.paymentType);
    });
  },
  
  // Set up Venmo instructions
  setupVenmoInstructions(container, amount) {
    container.innerHTML = `
      <div style="padding: 1rem; border: 1px solid var(--gray-300); border-radius: 8px; background-color: var(--gray-100); margin-bottom: 1.5rem;">
        <p style="margin-bottom: 0.5rem;"><strong>Venmo Payment Instructions:</strong></p>
        <p style="margin-bottom: 0.5rem;">1. Open the Venmo app</p>
        <p style="margin-bottom: 0.5rem;">2. Search for: <strong>@emmett-production</strong></p>
        <p style="margin-bottom: 0.5rem;">3. Enter amount: <strong>${Calculator.formatCurrency(amount)}</strong></p>
        <p style="margin-bottom: 0.5rem;">4. Add note: <strong>Invoice #${AppState.invoiceData.invoiceNumber}</strong></p>
        <p style="margin-bottom: 0;">5. Set payment to private</p>
      </div>
      <button id="confirm-venmo" class="btn btn-primary" style="width: 100%;">
        <i class="fas fa-check"></i> I've Sent the Payment
      </button>
    `;
    
    // Add click handler
    container.querySelector('#confirm-venmo').addEventListener('click', () => {
      this.handlePaymentSuccess(this.modal.dataset.paymentType);
    });
  },
  
  // Set up check instructions
  setupCheckInstructions(container, amount) {
    container.innerHTML = `
      <div style="padding: 1rem; border: 1px solid var(--gray-300); border-radius: 8px; background-color: var(--gray-100); margin-bottom: 1.5rem;">
        <p style="margin-bottom: 0.5rem;"><strong>Check Payment Instructions:</strong></p>
        <p style="margin-bottom: 0.5rem;">1. Make check payable to: <strong>${AppState.rates.businessInfo.name}</strong></p>
        <p style="margin-bottom: 0.5rem;">2. Amount: <strong>${Calculator.formatCurrency(amount)}</strong></p>
        <p style="margin-bottom: 0.5rem;">3. Memo: <strong>Invoice #${AppState.invoiceData.invoiceNumber}</strong></p>
        <p style="margin-bottom: 0;">4. Mail to: <strong>Contact for mailing address</strong></p>
      </div>
      <button id="confirm-check" class="btn btn-primary" style="width: 100%;">
        <i class="fas fa-check"></i> I'll Mail the Check
      </button>
    `;
    
    // Add click handler
    container.querySelector('#confirm-check').addEventListener('click', () => {
      this.handlePaymentSuccess(this.modal.dataset.paymentType);
    });
  },
  
  // Handle successful payment
  handlePaymentSuccess(paymentType) {
    // Close payment modal
    this.modal.style.display = 'none';
    
    // Update app state
    if (paymentType === 'deposit') {
      AppState.isPaid = true;
      
      // Update calendar booking to mark deposit as paid
      if (paymentType === 'deposit' && Calendar && AppState.selectedDates) {
        const startDate = new Date(AppState.selectedDates.startDate);
        const endDate = new Date(AppState.selectedDates.endDate);
        
        // If we have valid dates, update status in all relevant bookings
        if (startDate && endDate && startDate <= endDate) {
          // Clone date to avoid modifying the original
          let currentDate = new Date(startDate);
          
          // Update each day in the range
          while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().split('T')[0];
            
            if (Calendar.bookedDates[dateStr]) {
              Calendar.bookedDates[dateStr].depositPaid = true;
            }
            
            // Move to next day
            currentDate.setDate(currentDate.getDate() + 1);
          }
          
          // Also update travel days if any
          const travelDays = parseInt(document.getElementById('travelDays').value) || 0;
          if (travelDays > 0) {
            // Travel days before start date
            let beforeTravel = new Date(startDate);
            beforeTravel.setDate(beforeTravel.getDate() - travelDays);
            
            for (let i = 0; i < travelDays; i++) {
              const travelDateStr = beforeTravel.toISOString().split('T')[0];
              if (Calendar.bookedDates[travelDateStr]) {
                Calendar.bookedDates[travelDateStr].depositPaid = true;
              }
              beforeTravel.setDate(beforeTravel.getDate() + 1);
            }
            
            // Travel days after end date
            let afterTravel = new Date(endDate);
            afterTravel.setDate(afterTravel.getDate() + 1);
            
            for (let i = 0; i < travelDays; i++) {
              const travelDateStr = afterTravel.toISOString().split('T')[0];
              if (Calendar.bookedDates[travelDateStr]) {
                Calendar.bookedDates[travelDateStr].depositPaid = true;
              }
              afterTravel.setDate(afterTravel.getDate() + 1);
            }
          }
          
          // Save updated availability
          Calendar.saveAvailability();
          // Refresh calendar if visible
          if (document.getElementById('calendar').classList.contains('active')) {
            Calendar.renderCalendar();
            Calendar.renderUpcomingBookings();
          }
          
          console.log('Calendar updated with deposit payment status');
        }
      }
    }
    
    // Update invoice display
    this.updateInvoiceAfterPayment(paymentType);
    
    // Add payment confirmation
    this.showPaymentConfirmation(paymentType);
    
    // In a production environment, you would:
    // 1. Update the payment status on the server
    // 2. Create a receipt or confirmation email
    // 3. Update payment history
  },
  
  // Update invoice display after payment
  updateInvoiceAfterPayment(paymentType) {
    if (paymentType === 'deposit') {
      // Show deposit as paid
      document.getElementById('depositRow').style.display = 'flex';
      document.getElementById('invoiceDeposit').textContent = `- ${Calculator.formatCurrency(AppState.depositAmount)}`;
      document.getElementById('invoiceTotal').textContent = 
        Calculator.formatCurrency(AppState.quoteTotal - AppState.depositAmount);
        
      // Update payment buttons
      const paymentBtnGroup = document.getElementById('paymentBtnGroup');
      if (paymentBtnGroup) {
        const depositBtn = paymentBtnGroup.querySelector('button:first-child');
        if (depositBtn) depositBtn.remove();
        
        const balanceBtn = paymentBtnGroup.querySelector('button');
        if (balanceBtn) balanceBtn.innerHTML = '<i class="fas fa-money-bill-wave"></i> Pay Balance';
      }
    } else {
      // Mark invoice as fully paid
      const invoiceCard = document.querySelector('#invoiceSection .card');
      
      // Remove payment button group
      const paymentBtnGroup = document.getElementById('paymentBtnGroup');
      if (paymentBtnGroup) paymentBtnGroup.remove();
      
      // Add paid stamp
      const paidStamp = document.createElement('div');
      paidStamp.className = 'paid-stamp';
      paidStamp.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) rotate(-20deg);
        font-size: 5rem;
        font-weight: 700;
        color: rgba(52, 199, 89, 0.2);
        border: 0.5rem solid rgba(52, 199, 89, 0.2);
        border-radius: 10px;
        padding: 0.5rem 2rem;
        text-transform: uppercase;
        pointer-events: none;
        z-index: 1;
      `;
      paidStamp.textContent = 'PAID';
      invoiceCard.style.position = 'relative';
      invoiceCard.appendChild(paidStamp);
    }
  },
  
  // Show payment confirmation
  showPaymentConfirmation(paymentType) {
    const confirmation = document.createElement('div');
    confirmation.className = 'alert alert-success';
    
    if (paymentType === 'deposit') {
      confirmation.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <div>
          <strong>Deposit Payment Processed!</strong>
          <p>Your deposit of ${Calculator.formatCurrency(AppState.depositAmount)} has been received.</p>
          <p>Remaining balance: ${Calculator.formatCurrency(AppState.quoteTotal - AppState.depositAmount)}</p>
        </div>
      `;
    } else {
      confirmation.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <div>
          <strong>Payment Complete!</strong>
          <p>Your payment of ${Calculator.formatCurrency(AppState.quoteTotal)} has been processed successfully.</p>
          <p>Thank you for your business!</p>
        </div>
      `;
    }
    
    // Add to invoice section
    const invoiceSection = document.getElementById('invoiceSection');
    invoiceSection.querySelector('.card').prepend(confirmation);
    
    // Remove after 5 seconds
    setTimeout(() => {
      confirmation.style.opacity = '0';
      confirmation.style.transition = 'opacity 0.5s';
      setTimeout(() => confirmation.remove(), 500);
    }, 5000);
  }
};
