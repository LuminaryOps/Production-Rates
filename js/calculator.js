/**
 * Calculator Module
 * Handles all rate calculations and quote/invoice generation logic
 */

const Calculator = {
  rates: null,
  
  // Initialize with rates data
  init(rates) {
    this.rates = rates;
  },
  
  // Calculate quote based on form inputs
  calculateQuote() {
    // Get form values
    const svc = document.getElementById('serviceType').value;
    const dur = document.getElementById('durationType').value;
    const days = dur === 'custom' ? parseInt(document.getElementById('customDays').value) || 1 : 0;
    const ot = parseInt(document.getElementById('additionalHours').value) || 0;
    const cli = document.getElementById('clientType').value;
    const includeTravel = document.getElementById('includeTravel').checked;
    const travelDays = includeTravel ? parseInt(document.getElementById('travelDays').value) || 0 : 0;
    
    
    // Get client and project info
    const clientName = document.getElementById('clientName').value.trim();
    if (clientName === "") {
      alert("Client Name is required.");
      return;
    }

    
    const projectName = document.getElementById('projectName').value.trim();
    if (projectName === "") {
      alert("Project Name is required.");
      return;
    }
    const projectLocation = document.getElementById('projectLocation').value.trim();
    
    // Format date
    const now = new Date();
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = now.toLocaleDateString('en-US', dateOptions);
    
    // Calculate valid until date (2 weeks from now)
    const validUntil = new Date(now);
    validUntil.setDate(validUntil.getDate() + this.rates.terms.quoteValidity);
    const validUntilFormatted = validUntil.toLocaleDateString('en-US', dateOptions);
    
    // Initialize calculation variables
    let total = 0;
    const rows = [];
    const notes = [];
    
    // Add date info
    rows.unshift(['Quote Valid Until', validUntilFormatted, '', '']);
    rows.unshift(['Quote Date', formattedDate, '', '']);
    
    // Calculate base rate
    if (dur === 'full' || dur === 'half') {
      const r = this.rates.services[svc].rates[dur];
      rows.push([
        this.getServiceName(svc),
        dur === 'full' ? 'Full Day (10h)' : 'Half Day (5h)',
        `$${r}`,
        r
      ]);
      total += r;
    } else if (['2day', '3day', '5day'].includes(dur)) {
      const r = this.rates.packages[svc][dur].rate;
      rows.push([
        this.getServiceName(svc),
        `${dur.replace('day', '')} Day Package`,
        `$${r}`,
        r
      ]);
      total += r;
    } else {
      let base = this.rates.services[svc].rates.full * days;
      let disc = days >= 5 ? 0.15 : days >= 3 ? 0.10 : days >= 2 ? 0.05 : 0;
      if (disc > 0) {
        const amt = Math.round(base * (1 - disc));
        rows.push([
          this.getServiceName(svc),
          `${days} Day Custom (${disc * 100}% off)`,
          `$${Math.round(amt / days)}/day`,
          amt
        ]);
        total += amt;
      } else {
        rows.push([
          this.getServiceName(svc),
          `${days} Day(s)`,
          `$${this.rates.services[svc].rates.full}/day`,
          base
        ]);
        total += base;
      }
    }
    
    // Add travel days
    if (travelDays > 0) {
      const r = this.rates.services[svc].rates.full;
      const amt = r * travelDays;
      rows.push([
        'Travel Days',
        `${travelDays} day(s)`,
        `$${r}/day`,
        amt
      ]);
      total += amt;
    }
    
    // Add overtime
    if (ot > 0) {
      const r = this.rates.services[svc].rates.overtime;
      const amt = r * ot;
      rows.push([
        'Overtime',
        `${ot}h`,
        `$${r}/h`,
        amt
      ]);
      total += amt;
    }
    
    // Add specialty services
    AppState.specialtyServices.forEach(service => {
      const isHourly = (service.type !== 'prep' && service.type !== 'resolume' && service.type !== 'surface');
      const r = this.rates.specialty[service.type].rate;
      const amt = r * service.amount;
      const details = `${service.amount} ${isHourly ? 'Hour' : 'Day'}${service.amount > 1 ? 's' : ''}`;
      
      rows.push([
        this.getSpecialtyName(service.type),
        details,
        `$${r}/${isHourly ? 'h' : 'day'}`,
        amt
      ]);
      total += amt;
    });
    
    // Apply client discount
    if (cli !== 'regular') {
      const pct = this.rates.discounts[cli].rate;
      const amt = Math.round(total * pct);
      rows.push([
        'Client Discount',
        `${this.getClientName(cli)}`,
        `-${pct * 100}%`,
        -amt
      ]);
      total -= amt;
    }
    
    // Calculate deposit
    AppState.depositPercentage = this.rates.depositRates[cli];
    AppState.depositAmount = Math.round(total * AppState.depositPercentage);
    
    // Add total row
    rows.push(['TOTAL', '', '', total]);
    
    // Add notes
    notes.push(`Deposit: ${AppState.depositPercentage * 100}% (${this.formatCurrency(AppState.depositAmount)}) due on booking.`);
    notes.push('Includes up to 10 hours per day.');
    
    if (cli === 'partner5' || cli === 'partner8') {
      notes.push('Partner status requires meeting monthly booking thresholds and resets at the beginning of each month.');
    }
    
    if (travelDays > 0) {
      notes.push('Travel days are billed at the full day rate.');
    } else {
      notes.push('Travel and per diem may apply for events requiring overnight stays.');
    }
    
    notes.push(`Cancellation: ${this.rates.terms.cancellationPolicy.within7Days * 100}% fee if within 7 days, ${this.rates.terms.cancellationPolicy.within14Days * 100}% fee if within 14 days.`);
    notes.push('All rates are for labor only. Equipment available through partner vendors.');
    
    // Store the final total
    AppState.quoteTotal = total;
    
    // Return quote data
    return {
      rows,
      notes,
      client: clientName,
      project: {
        name: projectName,
        location: projectLocation
      },
      formattedDate,
      validUntilFormatted,
      total
    };
  },
  
  // Generate invoice data from quote
  generateInvoice(quoteData, invoiceDetails) {
    return {
      ...quoteData,
      ...invoiceDetails,
      depositAmount: AppState.depositAmount,
      depositPaid: invoiceDetails.depositPaid,
      balanceDue: invoiceDetails.depositPaid ? 
        quoteData.total - AppState.depositAmount : 
        quoteData.total
    };
  },
  
  // Format currency
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  },
  
  // Get service name
  getServiceName(type) {
    return this.rates.services[type]?.name || '';
  },
  
  // Get specialty service name
  getSpecialtyName(type) {
    return this.rates.specialty[type]?.name || '';
  },
  
  // Get client type name
  getClientName(type) {
    return this.rates.discounts[type]?.name || '';
  }
};
