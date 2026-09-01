/* ============================================================
   SUPER ADMIN PORTAL — superadmin.js
   Handles: Navigation, Search, Filters, Quick Actions, Progress bars
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  /* ── PROGRESS BARS (Dashboard trip progress) ───────────── */
  document.querySelectorAll('.sa-trip-progress-fill').forEach(function (bar) {
    var width = bar.getAttribute('data-width');
    if (width) {
      bar.style.width = width + '%';
    }
  });

  /* ── QUICK ACTION BUTTONS ──────────────────────────────── */
  var qaUsers = document.getElementById('sa-qa-users');
  if (qaUsers) qaUsers.addEventListener('click', function () { window.location.href = 'superuser_users.html'; });

  var qaTrips = document.getElementById('sa-qa-trips');
  if (qaTrips) qaTrips.addEventListener('click', function () { window.location.href = 'superuser_trips.html'; });

  var qaVendors = document.getElementById('sa-qa-vendors');
  if (qaVendors) qaVendors.addEventListener('click', function () { window.location.href = 'superuser_vendors.html'; });

  var qaGuides = document.getElementById('sa-qa-guides');
  if (qaGuides) qaGuides.addEventListener('click', function () { window.location.href = 'superuser_guides.html'; });

  /* ── DASHBOARD BANNER BUTTONS ──────────────────────────── */
  var reportsBtn = document.getElementById('sa-reports-btn');
  if (reportsBtn) reportsBtn.addEventListener('click', function () { window.location.href = 'superuser_reports.html'; });

  var settingsBtn = document.getElementById('sa-settings-btn');
  if (settingsBtn) settingsBtn.addEventListener('click', function () { window.location.href = 'superuser_settings.html'; });

  /* ── ADD BUTTONS ───────────────────────────────────────── */
  var addUserBtn = document.getElementById('sa-add-user-btn');
  if (addUserBtn) addUserBtn.addEventListener('click', function () { window.location.href = 'superuser_add_user.html'; });

  var createTripBtn = document.getElementById('sa-create-trip-btn');
  if (createTripBtn) createTripBtn.addEventListener('click', function () { window.location.href = 'superuser_add_trip.html'; });

  var addVendorBtn = document.getElementById('sa-add-vendor-btn');
  if (addVendorBtn) addVendorBtn.addEventListener('click', function () {
    if (window.DDWorkflow && window.DDWorkflow.addVendor) window.DDWorkflow.addVendor();
  });

  var addGuideBtn = document.getElementById('sa-add-guide-btn');
  if (addGuideBtn) addGuideBtn.addEventListener('click', function () {
    if (window.DDWorkflow && window.DDWorkflow.addGuide) window.DDWorkflow.addGuide();
  });

  /* ── USER SEARCH ───────────────────────────────────────── */
  var userSearch = document.getElementById('sa-user-search');
  if (userSearch) {
    userSearch.addEventListener('input', function () {
      var q = this.value.toLowerCase();
      document.querySelectorAll('#sa-users-body tr').forEach(function (row) {
        row.style.display = row.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  }

  /* ── TRIP SEARCH ───────────────────────────────────────── */
  var tripSearch = document.getElementById('sa-trip-search');
  if (tripSearch) {
    tripSearch.addEventListener('input', function () {
      var q = this.value.toLowerCase();
      document.querySelectorAll('#sa-trips-container .sa-trip-card').forEach(function (card) {
        card.style.display = card.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  }

  /* ── VENDOR SEARCH ─────────────────────────────────────── */
  var vendorSearch = document.getElementById('sa-vendor-search');
  if (vendorSearch) {
    vendorSearch.addEventListener('input', function () {
      var q = this.value.toLowerCase();
      document.querySelectorAll('#sa-vendors-container .sa-vcard').forEach(function (card) {
        card.style.display = card.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  }

  /* ── GUIDE SEARCH ──────────────────────────────────────── */
  var guideSearch = document.getElementById('sa-guide-search');
  if (guideSearch) {
    guideSearch.addEventListener('input', function () {
      var q = this.value.toLowerCase();
      document.querySelectorAll('#sa-guides-container .sa-vcard').forEach(function (card) {
        card.style.display = card.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });
  }

  /* ── TRIP STATUS FILTER ────────────────────────────────── */
  var tripStatusFilter = document.getElementById('sa-trip-status-filter');
  if (tripStatusFilter) {
    tripStatusFilter.addEventListener('change', function () {
      var val = this.value;
      document.querySelectorAll('#sa-trips-container .sa-trip-card').forEach(function (card) {
        if (val === 'All Status') {
          card.style.display = '';
        } else {
          var badge = card.querySelector('.sa-tc-badge');
          card.style.display = (badge && badge.textContent.trim() === val) ? '' : 'none';
        }
      });
    });
  }

  /* ── TOAST NOTIFICATION ────────────────────────────────── */
  function saShowToast(message, type) {
    var existing = document.getElementById('sa-toast');
    if (existing) existing.remove();
    var toast = document.createElement('div');
    toast.id = 'sa-toast';
    toast.textContent = message;
    toast.style.cssText = [
      'position:fixed', 'bottom:28px', 'right:28px', 'padding:12px 22px',
      'border-radius:10px', 'font-size:14px', 'font-weight:600', 'color:#fff',
      'z-index:9999', 'box-shadow:0 4px 16px rgba(0,0,0,0.15)', 'transition:opacity 0.4s ease',
      type === 'error'
        ? 'background:linear-gradient(135deg,#ef4444,#dc2626)'
        : 'background:linear-gradient(135deg,#22c55e,#16a34a)'
    ].join(';');
    document.body.appendChild(toast);
    setTimeout(function () {
      toast.style.opacity = '0';
      setTimeout(function () { toast.remove(); }, 400);
    }, 2800);
  }

  /* ── DELETE CONFIRMATION ───────────────────────────────── */
  document.addEventListener('click', function (e) {
    var deleteBtn = e.target.closest('.sa-btn-icon-danger, .sa-tc-delete, .sa-vf-delete');
    if (deleteBtn) {
      if (confirm('Are you sure you want to delete this item?')) {
        saShowToast('Item deleted successfully.', 'success');
        var row = deleteBtn.closest('tr');
        var card = deleteBtn.closest('.sa-trip-card, .sa-vcard');
        if (row) row.style.opacity = '0.3', setTimeout(function () { row.remove(); }, 600);
        if (card) card.style.opacity = '0.3', setTimeout(function () { card.remove(); }, 600);
      }
    }
  });

  /* ── EDIT ACTIONS ────────────────────────────── */
  document.addEventListener('click', function (e) {
    var editBtn = e.target.closest('[title="Edit"], .sa-tc-edit, .sa-vf-edit');
    if (editBtn) {
      if (window.location.href.includes('users')) {
        window.location.href = 'superuser_edit_user.html';
      }
    }
  });

  /* ── FORM SUBMISSIONS (Add/Edit) ───────────────────────── */
  var saForm = document.querySelector('.sa-form-card');
  if (saForm) {
    saForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var isUpdate = this.querySelector('button[type="submit"]').textContent.includes('Update');
      saShowToast(isUpdate ? 'Updated successfully!' : 'Created successfully!', 'success');
      setTimeout(function () {
        if (window.location.href.includes('user')) window.location.href = 'superuser_users.html';
        else if (window.location.href.includes('trip')) window.location.href = 'superuser_trips.html';
        else window.history.back();
      }, 1000);
    });
  }

  /* ── CANCEL / BACK ACTIONS ─────────────────────────────── */
  document.addEventListener('click', function (e) {
    var cancelBtn = e.target.closest('.sa-btn-secondary');
    if (cancelBtn && cancelBtn.textContent.trim() === 'Cancel') {
      window.history.back();
    }
  });

  /* ── TOGGLE SWITCHES (SA) ───────────────────────────────── */
  document.addEventListener('click', function (e) {
    var toggle = e.target.closest('.toggle-switch');
    if (toggle) {
      toggle.classList.toggle('active');
      var input = document.getElementById('status-input');
      if (input) input.value = toggle.classList.contains('active') ? 'Active' : 'Inactive';
    }
  });

});
