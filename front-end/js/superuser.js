/* ============================================================
   SUPER USER PORTAL — superuser.js
   Handles: Toggles, Filter Pills, Search, Settings, Routing
   No inline scripts. Zero HTML modifications.
   ============================================================ */

document.addEventListener('DOMContentLoaded', function () {

  /* ── TOGGLE SWITCHES ─────────────────────────────────────── */
  document.querySelectorAll('.toggle-switch').forEach(function (toggle) {
    toggle.addEventListener('click', function () {
      this.classList.toggle('active');
      // If there's a hidden status input (Add/Edit User forms), sync it
      const statusInput = document.getElementById('status-input');
      if (statusInput) {
        statusInput.value = this.classList.contains('active') ? 'Active' : 'Inactive';
      }
    });
  });

  /* ── FILTER PILLS (Alerts page) ──────────────────────────── */
  document.querySelectorAll('.filter-pill').forEach(function (pill) {
    pill.addEventListener('click', function () {
      document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
      this.classList.add('active');
    });
  });

  /* ── ADD USER BUTTON ─────────────────────────────────────── */
  const addUserBtn = document.querySelector('.add-user-btn');
  if (addUserBtn) {
    addUserBtn.addEventListener('click', function () {
      window.location.href = 'superuser_add_user.html';
    });
  }

  /* ── ADD TRIP BUTTON ─────────────────────────────────────── */
  const addTripBtn = document.querySelector('.btn-primary');
  if (addTripBtn && document.getElementById('trips-render-container')) {
    addTripBtn.addEventListener('click', function () {
      window.location.href = 'superuser_add_trip.html';
    });
  }

  /* ── CANCEL BUTTONS (Back to previous page) ──────────────── */
  document.querySelectorAll('.btn-secondary').forEach(function (btn) {
    if (btn.textContent.trim() === 'Cancel') {
      btn.addEventListener('click', function () {
        window.history.back();
      });
    }
  });

  /* ── CLOSE BUTTON (View Trip page) ──────────────────────── */
  const closeBtn = document.querySelector('.btn-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', function () {
      window.location.href = 'superuser_trips.html';
    });
  }

  /* ── USERS SEARCH FILTER ─────────────────────────────────── */
  const userSearchInput = document.querySelector('.filter-bar .search-inner input');
  if (userSearchInput && document.getElementById('users-render-body')) {
    userSearchInput.addEventListener('input', function () {
      const query = this.value.toLowerCase();
      const rows = document.querySelectorAll('#users-render-body tr');
      rows.forEach(function (row) {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(query) ? '' : 'none';
      });
    });
  }

  /* ── TRIPS SEARCH FILTER ──────────────────────────────────── */
  const tripSearchInput = document.querySelector('.filter-bar .search-inner input');
  if (tripSearchInput && document.getElementById('trips-render-container')) {
    tripSearchInput.addEventListener('input', function () {
      const query = this.value.toLowerCase();
      const cards = document.querySelectorAll('#trips-render-container .trip-card');
      cards.forEach(function (card) {
        const text = card.textContent.toLowerCase();
        card.style.display = text.includes(query) ? '' : 'none';
      });
    });
  }

  /* ── ROLE / STATUS SELECT FILTERS (Users page) ───────────── */
  document.querySelectorAll('.select-input').forEach(function (select) {
    select.addEventListener('change', function () {
      applyUserFilters();
    });
  });

  function applyUserFilters() {
    const selects = document.querySelectorAll('.filter-bar .select-input');
    const roleFilter   = selects[0] ? selects[0].value : 'All Roles';
    const statusFilter = selects[1] ? selects[1].value : 'All Status';
    const rows = document.querySelectorAll('#users-render-body tr');
    rows.forEach(function (row) {
      const roleCell   = row.querySelector('td:nth-child(2)');
      const statusCell = row.querySelector('td:nth-child(3)');
      const roleMatch   = roleFilter   === 'All Roles'   || (roleCell   && roleCell.textContent.trim()   === roleFilter);
      const statusMatch = statusFilter === 'All Status'  || (statusCell && statusCell.textContent.trim() === statusFilter);
      row.style.display = (roleMatch && statusMatch) ? '' : 'none';
    });
  }

  /* ── STATUS SELECT FILTER (Trips page) ───────────────────── */
  const tripsStatusSelect = document.querySelector('#trips-render-container ~ div .select-input, .filter-bar .select-input');
  if (tripsStatusSelect && document.getElementById('trips-render-container')) {
    tripsStatusSelect.addEventListener('change', function () {
      const val = this.value;
      const cards = document.querySelectorAll('#trips-render-container .trip-card');
      cards.forEach(function (card) {
        if (val === 'All Status') {
          card.style.display = '';
        } else {
          const badge = card.querySelector('.trip-badge');
          card.style.display = (badge && badge.textContent.trim() === val) ? '' : 'none';
        }
      });
    });
  }

  /* ── SETTINGS: Save Changes toast ───────────────────────── */
  const saveChangesBtn = document.querySelector('.btn.btn-primary');
  if (saveChangesBtn && document.querySelector('.settings-grid')) {
    saveChangesBtn.addEventListener('click', function () {
      showToast('Profile updated successfully!', 'success');
    });
  }

  /* ── SETTINGS: Update Password ───────────────────────────── */
  const updatePassBtn = document.querySelector('.btn.btn-green');
  if (updatePassBtn) {
    updatePassBtn.addEventListener('click', function () {
      showToast('Password updated successfully!', 'success');
    });
  }

  /* ── SETTINGS: Delete Account ────────────────────────────── */
  const deleteAccBtn = document.querySelector('.btn.btn-outline-red');
  if (deleteAccBtn) {
    deleteAccBtn.addEventListener('click', function () {
      if (confirm('Are you sure you want to permanently delete this account? This action cannot be undone.')) {
        showToast('Account deleted.', 'error');
      }
    });
  }

  /* ── LOGOUT handling (sidebar) ───────────────────────────── */
  document.querySelectorAll('.nav-item.logout').forEach(function (link) {
    link.addEventListener('click', function (e) {
      // app.js already handles global logout, this ensures no double-fire
    });
  });

  /* ── ALERTS: Mark All as Read ────────────────────────────── */
  const markReadBtn = document.querySelector('.t-btn:not(.btn-danger):not(.btn-secondary)');
  if (markReadBtn && document.querySelector('.alerts-container')) {
    markReadBtn.addEventListener('click', function () {
      document.querySelectorAll('.alert-card').forEach(card => card.style.opacity = '0.5');
      showToast('All alerts marked as read.', 'success');
    });
  }

  /* ── THEME SWITCHER (Settings page) ─────────────────────── */
  document.querySelectorAll('.theme-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      const isDark = this.classList.contains('theme-dark');
      if (window.ThemeManager) {
        window.ThemeManager.setTheme(isDark ? 'dark' : 'light', true);
      } else {
        document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        document.body.classList.toggle('dark-theme', isDark);
        showToast(isDark ? 'Dark theme applied.' : 'Light theme applied.', 'success');
      }
    });
  });

  /* ── ADVANCED MODAL SYSTEM ─────────────────────────────────── */
  function showDetailsModal(title, sections) {
    let overlay = document.getElementById('sa-modal-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'sa-modal-overlay';
      overlay.className = 'sa-modal-overlay';
      overlay.innerHTML = `
        <div class="sa-modal-container">
          <div class="sa-modal-header">
            <h2 id="sa-modal-title">Details</h2>
            <button class="sa-modal-close" id="sa-modal-close-btn">&times;</button>
          </div>
          <div class="sa-modal-body" id="sa-modal-body"></div>
          <div class="sa-modal-footer">
            <button class="sa-btn-primary" id="sa-modal-ok-btn">Done</button>
          </div>
        </div>
      `;
      document.body.appendChild(overlay);

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeDetailsModal();
      });
      document.getElementById('sa-modal-close-btn').addEventListener('click', closeDetailsModal);
      document.getElementById('sa-modal-ok-btn').addEventListener('click', closeDetailsModal);
    }

    const titleEl = document.getElementById('sa-modal-title');
    const bodyEl = document.getElementById('sa-modal-body');
    
    titleEl.textContent = title;
    
    let bodyHtml = '';
    sections.forEach(section => {
      bodyHtml += `
        <div class="sa-modal-section">
          <div class="sa-modal-section-title">
            <i data-icon="${section.icon || 'circle'}"></i>
            ${section.name}
          </div>
          <div class="sa-modal-data-grid">
      `;
      
      for (const [label, value] of Object.entries(section.data)) {
        if (label.toLowerCase().includes('progress') || label.toLowerCase().includes('rate')) {
          // Render as progress bar
          const percent = parseInt(value) || 0;
          bodyHtml += `
            <div class="sa-modal-data-item sa-modal-full">
              <div class="sa-modal-progress-wrap">
                <div class="sa-modal-progress-label">
                  <span>${label}</span>
                  <span>${percent}%</span>
                </div>
                <div class="sa-modal-progress-bar">
                  <div class="sa-modal-progress-fill" style="width: ${percent}%"></div>
                </div>
              </div>
            </div>
          `;
        } else if (label === 'Specialties' || label === 'Languages' || label === 'Services') {
          // Render as pills
          const pills = value.split(',').map(s => s.trim());
          bodyHtml += `
            <div class="sa-modal-data-item sa-modal-full">
              <div class="sa-modal-label">${label}</div>
              <div class="sa-modal-pill-grid">
                ${pills.map(p => `<span class="sa-modal-pill-item sa-modal-pill-purple">${p}</span>`).join('')}
              </div>
            </div>
          `;
        } else {
          // Standard data item
          bodyHtml += `
            <div class="sa-modal-data-item ${label === 'Address' || label === 'Bio' ? 'sa-modal-full' : ''}">
              <div class="sa-modal-label">${label}</div>
              <div class="sa-modal-value">${value}</div>
            </div>
          `;
        }
      }
      bodyHtml += '</div></div>';
    });

    bodyEl.innerHTML = bodyHtml;
    
    // Re-trigger icon rendering
    if (window.lucide) {
      window.lucide.createIcons();
    } else if (typeof renderIcons === 'function') {
      renderIcons(bodyEl);
    }

    setTimeout(() => overlay.classList.add('active'), 10);
  }
  window.showDetailsModal = showDetailsModal;

  function closeDetailsModal() {
    const overlay = document.getElementById('sa-modal-overlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
  }

  // Event delegation for View buttons across Vendors, Guides, and Support
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('.sa-vf-view, .btn-view, .sa-tc-view');
    if (!btn) return;

    if (btn.classList.contains('sa-tc-view') || btn.hasAttribute('data-navigate')) return;

    e.preventDefault();
    
    const card = btn.closest('.sa-vcard, .support-card');
    if (!card) return;

    let title = "";
    let sections = [];

    if (card.classList.contains('sa-vcard') && card.classList.contains('sa-guide-card')) {
      // Guide Card (Special handling for specialties/languages)
      title = card.querySelector('h3').textContent;
      const details = card.querySelectorAll('.sa-vcard-detail');
      const stats = card.querySelectorAll('.sa-vcard-stat');
      
      sections.push({
        name: "Profile Information",
        icon: "user",
        data: {
          "Email": details[0] ? details[0].textContent.trim() : "N/A",
          "Phone": details[1] ? details[1].textContent.trim() : "N/A",
          "Location": details[2] ? details[2].textContent.trim() : "N/A",
          "Languages": details[3] ? details[3].textContent.trim() : "English, French",
          "Status": card.querySelector('.sa-vb-active, .sa-vb-ontour')?.textContent.trim() || "Active"
        }
      });
      
      sections.push({
        name: "Performance",
        icon: "activity",
        data: {
          "Rating": details[4] ? details[4].textContent.trim() : "4.8/5 (50+ reviews)",
          "Completed Trips": stats[1] ? stats[1].querySelector('.sa-vs-value').textContent.trim() : "10",
          "Success Rate": "95%"
        }
      });
    } else if (card.classList.contains('sa-vcard')) {
      // Vendor Card
      title = card.querySelector('h3').textContent;
      const details = card.querySelectorAll('.sa-vcard-detail');
      const stats = card.querySelectorAll('.sa-vcard-stat');
      
      sections.push({
        name: "Company Details",
        icon: "briefcase",
        data: {
          "Email": details[0] ? details[0].textContent.trim() : "N/A",
          "Phone": details[1] ? details[1].textContent.trim() : "N/A",
          "Address": details[2] ? details[2].textContent.trim() : "N/A",
          "Service": card.querySelector('.sa-vb-service')?.textContent.trim() || "Provider"
        }
      });
      
      sections.push({
        name: "Business Health",
        icon: "trending-up",
        data: {
          "Annual Revenue": stats[2] ? stats[2].querySelector('.sa-vs-value').textContent.trim() : "$0",
          "Customer Satisfaction": details[3] ? details[3].textContent.trim().split(' (')[0] : "4.5/5",
          "Capacity Usage": "78% Rate"
        }
      });
    } else if (card.classList.contains('support-card')) {
      // Support Card
      title = card.querySelector('.support-name').textContent;
      const dept = card.querySelector('.support-dept').textContent;
      const contacts = card.querySelectorAll('.support-contact div');
      const stats = card.querySelectorAll('.support-stats-row div');

      sections.push({
        name: "Executive Profile",
        icon: "headphones",
        data: {
          "Department": dept,
          "Direct Email": contacts[0] ? contacts[0].textContent.trim() : "N/A",
          "Work Extension": contacts[1] ? contacts[1].textContent.trim() : "N/A"
        }
      });
      
      sections.push({
        name: "Workload & SLA",
        icon: "clock",
        data: {
          "Active Assignments": stats[0].querySelector('.val').textContent.trim(),
          "Historical Resolution": stats[1].querySelector('.val').textContent.trim(),
          "SLA Compliance Rate": "92%"
        }
      });
    }

    showDetailsModal(title, sections);
  });

  /* ── HEADER ENHANCEMENTS ─────────────────────────────────── */
  function initHeaderEnhancements() {
    // 1. Profile Navigation
    document.querySelectorAll('.user-profile, .user-pill').forEach(profile => {
      profile.addEventListener('click', (e) => {
        if (!e.target.closest('#notif-trigger') && !e.target.closest('#notif-dropdown')) {
          window.location.href = 'superuser_settings.html';
        }
      });
    });

    // 2. Notification Dropdown Toggle
    const notifBtn = document.querySelector('.sa-notif-btn');
    if (notifBtn) {
      // Remove data-navigate if it exists to allow dropdown
      notifBtn.removeAttribute('data-navigate');
      
      // Ensure it's wrapped for positioning
      if (!notifBtn.parentElement.classList.contains('sa-notif-wrapper')) {
        const wrapper = document.createElement('div');
        wrapper.className = 'sa-notif-wrapper';
        notifBtn.parentNode.insertBefore(wrapper, notifBtn);
        wrapper.appendChild(notifBtn);
      }

      // Inject Dropdown HTML
      let dropdown = document.querySelector('.sa-notif-dropdown');
      if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.className = 'sa-notif-dropdown';
        dropdown.innerHTML = `
          <div class="notif-header" style="display:flex; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid #f1f5f9;">
            <h3 style="margin:0; font-size:15px; font-weight:700; color:var(--text-primary, #0f172a);">Notifications</h3>
            <div style="display:flex; gap:10px; align-items:center;">
              <button class="sa-nd-mark-all" data-dd-action="mark-all-read" style="background:none; border:none; color:#0ea5e9; font-size:12px; font-weight:600; cursor:pointer;">Mark all read</button>
              <button class="sa-nd-delete-all" data-dd-action="delete-all-notifs" style="background:none; border:none; color:#ef4444; font-size:12px; font-weight:600; cursor:pointer;">Delete all</button>
            </div>
          </div>
          <div class="notif-list" style="max-height:320px; overflow-y:auto;">
            <!-- Dynamic items rendered by workflow.js -->
          </div>
          <div class="sa-nd-footer" style="padding:12px; text-align:center; border-top:1px solid #f1f5f9;">
            <a href="superuser_alerts.html" style="font-size:13px; font-weight:600; color:#0ea5e9; text-decoration:none;">View All Alerts →</a>
          </div>
        `;
        notifBtn.parentElement.appendChild(dropdown);
        
        // Re-render icons in dropdown
        if (window.lucide) window.lucide.createIcons();
      }

      // Toggle Logic
      notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.toggle('active');
      });

      // Mark all as read & Delete all actions
      const markRead = dropdown.querySelector('.sa-nd-mark-all');
      if (markRead) {
        markRead.addEventListener('click', (e) => {
          e.stopPropagation();
          if (typeof window.markAllNotifsAsRead === 'function') window.markAllNotifsAsRead('superuser');
        });
      }
      const deleteAll = dropdown.querySelector('.sa-nd-delete-all');
      if (deleteAll) {
        deleteAll.addEventListener('click', (e) => {
          e.stopPropagation();
          if (typeof window.deleteAllNotifs === 'function') window.deleteAllNotifs('superuser');
        });
      }
    }

    // Close dropdown on outside click
    document.addEventListener('click', () => {
      const dropdown = document.querySelector('.sa-notif-dropdown');
      if (dropdown) dropdown.classList.remove('active');
    });
  }

  initHeaderEnhancements();

  /* ── SIMPLE TOAST NOTIFICATION ────────────────────────────── */
  function showToast(message, type) {
    const existing = document.getElementById('su-toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.id = 'su-toast';
    toast.textContent = message;
    toast.style.cssText = [
      'position:fixed',
      'bottom:28px',
      'right:28px',
      'padding:12px 22px',
      'border-radius:10px',
      'font-size:14px',
      'font-weight:600',
      'color:#fff',
      'z-index:9999',
      'box-shadow:0 4px 16px rgba(0,0,0,0.15)',
      'transition:opacity 0.4s ease',
      type === 'error'
        ? 'background:linear-gradient(135deg,#ef4444,#dc2626)'
        : 'background:linear-gradient(135deg,#22c55e,#16a34a)'
    ].join(';');
    document.body.appendChild(toast);
    setTimeout(function () {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 400);
    }, 2800);
  }

  // Toast Helper for CRUD compatibility
  window.Toast = {
    success: (msg) => showToast(msg, 'success'),
    error: (msg) => showToast(msg, 'error'),
    info: (msg) => showToast(msg, 'info')
  };

  // Wire up coming-soon buttons
  document.querySelectorAll('[data-action="coming-soon"]').forEach(btn => {
    btn.addEventListener('click', () => {
      window.Toast.info('Feature coming soon in phase 2!');
    });
  });

});
