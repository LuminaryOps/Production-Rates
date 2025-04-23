/**
 * GitHub Authentication Module
 * Handles GitHub login UI and authentication flow
 */

const GitHubAuth = {
  modal: null,
  onSuccess: null,
  
  // Initialize auth module
  init() {
    this.createAuthModal();
  },
  
  // Show auth modal
  showAuthModal(successCallback) {
    // Store callback for success
    this.onSuccess = successCallback;
    
    // Show modal
    this.modal.style.display = 'flex';
  },
  
  // Create GitHub authentication modal
  createAuthModal() {
    // Create modal element
    this.modal = document.createElement('div');
    this.modal.className = 'github-auth-modal';
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
      z-index: 1100;
      padding: 1rem;
    `;
    
    // Create modal content
    const content = document.createElement('div');
    content.className = 'github-auth-modal-content';
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
    closeBtn.className = 'github-auth-modal-close';
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
    form.id = 'githubAuthForm';
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleAuthSubmit();
    });
    
    // GitHub icon
    const githubHeader = document.createElement('div');
    githubHeader.style.cssText = `
      text-align: center;
      margin-bottom: 1.5rem;
    `;
    githubHeader.innerHTML = `
      <i class="fab fa-github" style="font-size: 3rem; color: var(--gray-700);"></i>
      <h3 style="margin-top: 0.5rem;">GitHub Authentication</h3>
    `;
    
    // Form content
    form.innerHTML = `
      <div style="margin-bottom: 1.5rem;">
        <p style="color: var(--gray-600); margin-bottom: 1rem; text-align: center;">
          To save data to GitHub, please provide your GitHub credentials.
        </p>
        <p style="font-size: 0.875rem; color: var(--gray-500); margin-bottom: 1.5rem; text-align: center;">
          You'll need to create a <a href="https://github.com/settings/tokens" target="_blank" style="color: var(--primary);">Personal Access Token</a> with the <code>repo</code> scope.
        </p>
      </div>
      
      <div style="margin-bottom: 1.5rem;">
        <label for="githubUsername" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">GitHub Username</label>
        <input type="text" id="githubUsername" required style="width: 100%; padding: 0.75rem 1rem; border: 1px solid var(--gray-300); border-radius: 8px; font-size: 1rem; background-color: var(--gray-100); color: var(--gray-800);">
      </div>
      
      <div style="margin-bottom: 1.5rem;">
        <label for="githubToken" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Personal Access Token</label>
        <input type="password" id="githubToken" required style="width: 100%; padding: 0.75rem 1rem; border: 1px solid var(--gray-300); border-radius: 8px; font-size: 1rem; background-color: var(--gray-100); color: var(--gray-800);">
      </div>
      
      <div style="margin-bottom: 1.5rem;">
        <label for="githubRepo" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Repository Name (optional)</label>
        <input type="text" id="githubRepo" placeholder="production-calculator-data" style="width: 100%; padding: 0.75rem 1rem; border: 1px solid var(--gray-300); border-radius: 8px; font-size: 1rem; background-color: var(--gray-100); color: var(--gray-800);">
        <div style="font-size: 0.75rem; margin-top: 0.5rem; color: var(--gray-500);">
          Repository will be created if it doesn't exist. Leave blank to use default name.
        </div>
      </div>
      
      <div id="githubAuthError" style="color: var(--danger); margin-bottom: 1.5rem; font-size: 0.875rem; display: none;">
        Authentication failed. Please check your credentials and try again.
      </div>
      
      <div style="display: flex; justify-content: center;">
        <button type="submit" class="btn btn-primary" style="min-width: 180px;" id="githubLoginButton">
          <i class="fab fa-github"></i> Login with GitHub
        </button>
      </div>
    `;
    
    // Add everything to the DOM
    content.appendChild(closeBtn);
    content.appendChild(githubHeader);
    content.appendChild(form);
    this.modal.appendChild(content);
    document.body.appendChild(this.modal);
  },
  
  // Handle authentication form submission
  async handleAuthSubmit() {
    // Get form values
    const username = document.getElementById('githubUsername').value.trim();
    const token = document.getElementById('githubToken').value.trim();
    const repo = document.getElementById('githubRepo').value.trim();
    const errorMsg = document.getElementById('githubAuthError');
    const loginButton = document.getElementById('githubLoginButton');
    
    // Validate inputs
    if (!username || !token) {
      errorMsg.textContent = 'Please provide both username and token.';
      errorMsg.style.display = 'block';
      return;
    }
    
    // Show loading state
    loginButton.disabled = true;
    loginButton.innerHTML = '<div class="loading-spinner" style="margin: 0 auto;"></div>';
    errorMsg.style.display = 'none';
    
    try {
      // Attempt authentication
      const success = await GitHub.authenticate(token, username, repo);
      
      if (success) {
        // Authentication successful
        this.modal.style.display = 'none';
        
        // Call success callback if provided
        if (typeof this.onSuccess === 'function') {
          this.onSuccess();
        }
      } else {
        // Authentication failed
        errorMsg.textContent = 'Authentication failed. Please check your credentials and try again.';
        errorMsg.style.display = 'block';
      }
    } catch (error) {
      // Handle error
      errorMsg.textContent = `Error: ${error.message || 'Failed to authenticate'}`;
      errorMsg.style.display = 'block';
    } finally {
      // Reset button state
      loginButton.disabled = false;
      loginButton.innerHTML = '<i class="fab fa-github"></i> Login with GitHub';
    }
  },
  
  // Show an authentication required message
  showAuthRequired(message = 'This feature requires GitHub authentication') {
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
      <i class="fab fa-github" style="font-size: 3rem; color: var(--gray-600); margin-bottom: 1rem;"></i>
      <h3 style="margin-bottom: 1rem;">${message}</h3>
      <p style="color: var(--gray-600); margin-bottom: 1.5rem;">
        Please login with GitHub to enable storage and synchronization features.
      </p>
      <button class="btn btn-primary auth-login-btn">
        <i class="fab fa-github"></i> Login with GitHub
      </button>
    `;
    
    // Add login button handler
    container.querySelector('.auth-login-btn').addEventListener('click', () => {
      this.showAuthModal();
    });
    
    return container;
  }
};
