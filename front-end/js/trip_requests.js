let isSubmittingTripRequest = false;

function validateTripDates(startDateStr, endDateStr) {
  if (!startDateStr || !endDateStr) {
    return { valid: false, message: 'Please select both start and end dates.' };
  }

  const start = new Date(String(startDateStr).includes('T') ? startDateStr : `${startDateStr}T00:00:00`);
  const end = new Date(String(endDateStr).includes('T') ? endDateStr : `${endDateStr}T00:00:00`);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { valid: false, message: 'Please enter valid travel dates.' };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startDateOnly = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDateOnly = new Date(end.getFullYear(), end.getMonth(), end.getDate());

  if (startDateOnly < today) {
    return { valid: false, message: 'Start date cannot be in the past. Please select today or a future date.' };
  }

  if (endDateOnly <= startDateOnly) {
    return { valid: false, message: 'End date must be after start date.' };
  }

  const maxAllowedDate = new Date(today);
  maxAllowedDate.setMonth(maxAllowedDate.getMonth() + 8);
  maxAllowedDate.setHours(23, 59, 59, 999);

  if (startDateOnly > maxAllowedDate || endDateOnly > maxAllowedDate) {
    return { valid: false, message: 'Advance booking is available up to 8 months in advance.' };
  }

  return { valid: true };
}

function applyTripDateLimits(container = document) {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const minDateStr = `${year}-${month}-${day}`;

  const maxDate = new Date(today);
  maxDate.setMonth(maxDate.getMonth() + 8);
  const maxYear = maxDate.getFullYear();
  const maxMonth = String(maxDate.getMonth() + 1).padStart(2, '0');
  const maxDay = String(maxDate.getDate()).padStart(2, '0');
  const maxDateStr = `${maxYear}-${maxMonth}-${maxDay}`;

  const target = container || document;
  const dateInputs = target.querySelectorAll('input[type="date"]');
  dateInputs.forEach((input) => {
    input.setAttribute('min', minDateStr);
    input.setAttribute('max', maxDateStr);
  });
}

async function handleTripRequest(event) {
  if (event) {
    if (typeof event.preventDefault === 'function') event.preventDefault();
    if (typeof event.stopPropagation === 'function') event.stopPropagation();
  }

  if (isSubmittingTripRequest) return false;

  const pkgNameInput = document.getElementById('pkgName');
  const pkgDestInput = document.getElementById('pkgDest');
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');

  let pkgName = pkgNameInput ? pkgNameInput.value.trim() : '';
  let destination = pkgDestInput ? pkgDestInput.value.trim() : '';
  let startDate = startDateInput ? startDateInput.value.trim() : '';
  let endDate = endDateInput ? endDateInput.value.trim() : '';
  const notes = document.getElementById('notes')?.value || '';

  if (!destination) {
    destination = pkgName || 'Custom Destination';
    if (pkgDestInput) pkgDestInput.value = destination;
  }
  if (!pkgName) {
    pkgName = destination || 'Custom Trip Plan';
    if (pkgNameInput) pkgNameInput.value = pkgName;
  }

  if (!startDate || !endDate) {
    const today = new Date();
    const dStart = new Date(today);
    dStart.setDate(dStart.getDate() + 7);
    const dEnd = new Date(today);
    dEnd.setDate(dEnd.getDate() + 12);
    if (!startDate) {
      startDate = dStart.toISOString().split('T')[0];
      if (startDateInput) startDateInput.value = startDate;
    }
    if (!endDate) {
      endDate = dEnd.toISOString().split('T')[0];
      if (endDateInput) endDateInput.value = endDate;
    }
  }

  const dateCheck = validateTripDates(startDate, endDate);
  if (!dateCheck.valid) {
    if (typeof Toast !== 'undefined' && Toast.error) {
      Toast.error(dateCheck.message);
    } else {
      alert(dateCheck.message);
    }
    return false;
  }

  const inputBudget = Number(document.getElementById('budget')?.value || 0);
  const PACKAGE_MIN_BUDGETS = {
    'paris': 1200,
    'tokyo': 1500,
    'bali': 800,
    'rome': 1000,
    'new york': 1100,
    'london': 1300,
    'swiss': 1600,
    'alps': 1600
  };
  const pkgLower = (pkgName || '').toLowerCase();
  const destLower = (destination || '').toLowerCase();
  const isCustom = !pkgName || pkgLower.includes('custom');
  let minBudget = 0;
  if (!isCustom) {
    const key = Object.keys(PACKAGE_MIN_BUDGETS).find(k => pkgLower.includes(k) || destLower.includes(k));
    minBudget = key ? PACKAGE_MIN_BUDGETS[key] : 500;
  }
  if (minBudget > 0 && inputBudget > 0 && inputBudget < minBudget) {
    const formattedMin = window.formatMoney ? window.formatMoney(minBudget) : `₹${minBudget}`;
    const errText = `Minimum budget for ${pkgName || destination} package is ${formattedMin}. Please enter a budget of at least ${formattedMin}.`;
    if (typeof Toast !== 'undefined' && Toast.error) {
      Toast.error(errText);
    } else {
      alert(errText);
    }
    return false;
  }

  isSubmittingTripRequest = true;

  const submitBtn = document.getElementById('btnSubmitTripRequest') || document.querySelector('#tripRequestForm button[type="submit"]') || document.querySelector('#tripRequestForm button');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.dataset.origText = submitBtn.innerHTML;
    submitBtn.innerHTML = 'Submitting Request...';
  }

  const rawSession = (window.DDWorkflow && typeof window.DDWorkflow.readSession === 'function')
    ? window.DDWorkflow.readSession()
    : JSON.parse(sessionStorage.getItem('dd_session') || localStorage.getItem('dd_session') || '{}');
  const domName = document.querySelector('[data-session-name]')?.textContent?.trim();
  const travelerName = rawSession.name || (domName && domName !== 'Sarah Johnson' && domName !== 'John Traveler' ? domName : '') || 'N Bharath';
  const travelerEmail = rawSession.email || 'traveler@gmail.com';
  const interests = Array.from(document.querySelectorAll('input[name="interests"]:checked')).map((input) => input.value);

  const requestPayload = {
    travelerName,
    travelerEmail,
    packageId: typeof selectedPackageId !== 'undefined' ? selectedPackageId : null,
    packageName: pkgName,
    destination,
    startDate,
    endDate,
    adults: document.getElementById('numAdults')?.value || 1,
    children: document.getElementById('numChildren')?.value || 0,
    budget: document.getElementById('budget')?.value || 0,
    accommodationType: document.getElementById('accommodationType')?.value || 'standard',
    tripPace: document.getElementById('tripPace')?.value || 'moderate',
    interests,
    notes,
  };

  try {
    if (window.DDWorkflow && typeof window.DDWorkflow.createTripRequest === 'function') {
      window.DDWorkflow.createTripRequest(requestPayload);
    } else if (typeof ApiClient !== 'undefined' && typeof ApiClient.post === 'function') {
      await ApiClient.post('/trip-requests', {
        travelerName,
        travelerEmail,
        destination,
        notes: `${pkgName} - ${notes}`,
        status: 'Requested',
        ...requestPayload,
      });
    }

    const navigateToMyTrips = () => {
      isSubmittingTripRequest = false;
      window.location.href = 'traveler_mytrips.html';
    };

    if (typeof showSuccessModal === 'function') {
      showSuccessModal('Request Sent', 'Trip plan request has been sent to your travel partner.', navigateToMyTrips);
      setTimeout(navigateToMyTrips, 2000);
    } else if (typeof showConfirmModal === 'function') {
      showConfirmModal('Request Sent', 'Trip plan request has been sent to your travel partner.', 'OK', 'green', navigateToMyTrips);
      setTimeout(navigateToMyTrips, 2000);
    } else {
      navigateToMyTrips();
    }
  } catch (err) {
    console.error('Trip request submission failed:', err);
    isSubmittingTripRequest = false;
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = submitBtn.dataset.origText || 'Submit Trip Request';
    }
    if (typeof Toast !== 'undefined' && Toast.error) {
      Toast.error(err.message || 'Failed to submit trip request.');
    } else {
      alert(err.message || 'Failed to submit trip request.');
    }
  } finally {
    setTimeout(() => { isSubmittingTripRequest = false; }, 3000);
  }
  return false;
}

async function renderTripRequests() {
  if (window.DDWorkflow) {
    window.DDWorkflow.render();
    return;
  }

  const grid = document.querySelector('.trips-grid');
  if (!grid) return;

  try {
    const res = await ApiClient.get('/trip-requests');
    res.data.forEach((request) => {
      const cardHTML = `
        <div class="trip-card requested" style="animation: fadeIn 0.5s ease-out;">
          <div class="trip-card-header"><div class="t-icon blue"><i data-icon="plane"></i></div><div><div class="t-title">${request.destination}</div><div class="t-id">${request.id}</div></div></div>
          <div class="t-info"><div class="t-info-row"><i data-icon="users"></i> ${request.travelerName}</div><div class="t-info-row"><i data-icon="clock"></i> ${request.status}</div></div>
          <div class="t-status-row"><span class="badge-pill badge-amber">${request.status}</span></div>
          <div class="t-actions"><button class="t-btn t-btn-outline-yellow" onclick="cancelRequest('${request.id}')"><i data-icon="x"></i> Cancel Request</button></div>
        </div>`;
      grid.insertAdjacentHTML('afterbegin', cardHTML);
    });
  } catch (err) {
    console.error(err.message);
  }
}

async function cancelRequest(id) {
  if (!confirm('Are you sure you want to cancel this trip request?')) return;
  try {
    if (window.DDWorkflow && typeof window.DDWorkflow.cancelTrip === 'function') {
      window.DDWorkflow.cancelTrip(id);
      renderTripRequests();
    } else if (typeof ApiClient !== 'undefined') {
      await ApiClient.delete(`/trip-requests/${id}`);
      if (window.DDWorkflow) window.DDWorkflow.render();
      else renderTripRequests();
    }
  } catch (err) {
    alert(err.message);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  applyTripDateLimits();
  if (window.location.pathname.includes('traveler_mytrips.html')) renderTripRequests();
});
