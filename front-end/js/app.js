/* js/app.js - Core Application Utilities */

/* ======== TOAST NOTIFICATIONS ======== */
const Toast = {
    show(message, type = 'info', duration = 3500) {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            document.body.appendChild(container);
        }
        const icons = {
            success: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22C55E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
            error: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
            info: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
            warning: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
        };
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `${icons[type] || icons.info}<span>${message}</span>`;
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },
    success: (msg) => Toast.show(msg, 'success'),
    error: (msg) => Toast.show(msg, 'error'),
    info: (msg) => Toast.show(msg, 'info'),
    warning: (msg) => Toast.show(msg, 'warning')
};

/* ======== MODAL HELPERS ======== */
const Modal = {
    open(id) {
        const el = document.getElementById(id);
        if (el) { el.style.display = 'flex'; document.body.style.overflow = 'hidden'; }
    },
    close(id) {
        const el = document.getElementById(id);
        if (el) { el.style.display = 'none'; document.body.style.overflow = ''; }
    },
    closeAll() {
        document.querySelectorAll('.modal-overlay').forEach(el => { el.style.display = 'none'; });
        document.body.style.overflow = '';
    }
};

/* Close modal on overlay click */
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        Modal.closeAll();
    }
});

/* ======== GLOBAL RESPONSIVE SIDEBAR LOGIC ======== */
function initSidebar() {
    const sidebar = document.querySelector('.sidebar');
    const header = document.querySelector('.top-header');
    
    if (!sidebar || !header) return;

    // Ensure default state on page load: Sidebar is FULL / EXPANDED
    sidebar.classList.remove('collapsed');

    // Inject Hamburger Button (3 horizontal lines) if not present
    let hamburgerBtn = header.querySelector('.hamburger-btn');
    if (!hamburgerBtn) {
        hamburgerBtn = document.createElement('button');
        hamburgerBtn.className = 'hamburger-btn';
        hamburgerBtn.setAttribute('title', 'Toggle Sidebar');
        hamburgerBtn.setAttribute('aria-label', 'Toggle Navigation Sidebar');
        hamburgerBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>`;
        header.insertBefore(hamburgerBtn, header.firstChild);
    } else if (!hamburgerBtn.querySelector('svg')) {
        hamburgerBtn.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
        </svg>`;
    }

    // Inject Close Button into sidebar logo area if missing
    const sidebarLogo = sidebar.querySelector('.sidebar-logo');
    let closeBtn = sidebar.querySelector('.sidebar-close-btn');
    if (sidebarLogo && !closeBtn) {
        closeBtn = document.createElement('button');
        closeBtn.className = 'sidebar-close-btn';
        closeBtn.setAttribute('title', 'Close Sidebar');
        closeBtn.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>';
        sidebarLogo.appendChild(closeBtn);
    }

    // Create Overlay if not present
    let overlay = document.querySelector('.sidebar-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar-overlay';
        document.body.appendChild(overlay);
    }

    // Toggle Handler for 3 lines button
    const handleToggle = (e) => {
        if (e) e.stopPropagation();
        if (window.innerWidth > 1024) {
            // Desktop toggle
            sidebar.classList.toggle('collapsed');
        } else {
            // Mobile drawer toggle
            sidebar.classList.toggle('open');
            overlay.classList.toggle('open');
            document.body.style.overflow = sidebar.classList.contains('open') ? 'hidden' : '';
        }
    };

    const handleClose = () => {
        if (window.innerWidth > 1024) {
            sidebar.classList.add('collapsed');
        } else {
            sidebar.classList.remove('open');
            overlay.classList.remove('open');
            document.body.style.overflow = '';
        }
    };

    // Inject Mobile Quick Logout Icon in header-right if missing
    let headerRight = header.querySelector('.header-right');
    if (headerRight && !headerRight.querySelector('.mobile-header-logout')) {
        const mobileLogoutBtn = document.createElement('a');
        mobileLogoutBtn.className = 'mobile-header-logout logout';
        const isSub = window.location.pathname.includes('/pages/');
        mobileLogoutBtn.setAttribute('href', isSub ? '../../login.html' : 'login.html');
        mobileLogoutBtn.setAttribute('title', 'Log Out');
        mobileLogoutBtn.setAttribute('aria-label', 'Log Out');
        mobileLogoutBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`;
        headerRight.prepend(mobileLogoutBtn);
    }

    if (hamburgerBtn) {
        hamburgerBtn.onclick = handleToggle;
    }
    if (closeBtn) {
        closeBtn.onclick = handleClose;
    }
    if (overlay) {
        overlay.onclick = handleClose;
    }
}

/* ======== ACTIVE NAV ITEM ======== */
function setActiveNav() {
    const currentPath = window.location.pathname;
    document.querySelectorAll('.nav-item').forEach(item => {
        const href = item.getAttribute('href') || '';
        const page = currentPath.split('/').pop();
        const linkPage = href.split('/').pop();
        if (page && linkPage && (page === linkPage)) {
            item.classList.add('active');
        }
    });
}

/* ======== BADGE HELPERS ======== */
function getBadgeClass(status) {
    const map = {
        active: 'badge-green', inactive: 'badge-gray',
        ongoing: 'badge-blue', upcoming: 'badge-amber',
        completed: 'badge-gray', cancelled: 'badge-red',
        open: 'badge-amber', 'in-progress': 'badge-blue', resolved: 'badge-green',
        pending: 'badge-amber', accepted: 'badge-green', rejected: 'badge-red',
        high: 'badge-red', medium: 'badge-amber', low: 'badge-blue'
    };
    return map[status] || 'badge-gray';
}

function getRoleBadgeClass(role) {
    const map = {
        'Travel Partner': 'badge-blue',
        'Traveler': 'badge-green',
        'Vendor': 'badge-purple',
        'Tour Guide': 'badge-teal',
        'Support Executive': 'badge-orange',
        'Super User': 'badge-indigo'
    };
    return map[role] || 'badge-gray';
}

/* ======== AVATAR INITIALS ======== */
function getInitials(name) {
    return (name || 'U')
        .split(' ')
        .map(p => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
}

/* ======== FORMAT DATE ======== */
function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) { return dateStr; }
}

/* ======== CONFIRM DELETE DIALOG ======== */
function confirmAction(message, onConfirm) {
    const id = 'confirm-modal-' + Date.now();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = id;
    overlay.style.display = 'flex';
    overlay.innerHTML = `
    <div class="modal" style="max-width:24rem;text-align:center;">
      <div class="stat-card-icon icon-bg-red" style="width:3rem;height:3rem;border-radius:50%;margin:0 auto 1rem;display:flex;align-items:center;justify-content:center;">
         <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <h3 style="font-family:'Poppins',sans-serif;margin-bottom:0.5rem;color:var(--text-primary, #0f172a);">Confirm Action</h3>
      <p style="color:var(--text-secondary, #64748B);font-size:0.875rem;margin-bottom:1.5rem;">${message}</p>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="document.getElementById('${id}').remove();document.body.style.overflow='';">Cancel</button>
        <button class="btn btn-danger" id="${id}-confirm">Confirm</button>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    document.getElementById(id + '-confirm').addEventListener('click', () => {
        overlay.remove();
        document.body.style.overflow = '';
        onConfirm();
    });
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) { overlay.remove(); document.body.style.overflow = ''; }
    });
}

/* ======== PROTOTYPE TAB FILTERS ======== */
function initTabFilters() {
    document.querySelectorAll('.filter-tabs').forEach(tabGroup => {
        const pills = tabGroup.querySelectorAll('.filter-pill');
        if (pills.length === 0) return;

        pills.forEach(pill => {
            pill.addEventListener('click', () => {
                // Update active state
                pills.forEach(p => p.classList.remove('active'));
                pill.classList.add('active');

                const filterText = pill.innerText.trim().toLowerCase();
                
                // Identify what container to filter
                const tripsGrid = document.querySelector('.trips-grid');
                if (tripsGrid) {
                    const cards = tripsGrid.querySelectorAll('.trip-card');
                    cards.forEach(card => {
                        const hasOngoing = card.querySelector('.badge-ongoing');
                        const hasUpcoming = card.querySelector('.badge-upcoming');
                        const hasCompleted = card.querySelector('.badge-completed');

                        if (filterText.includes("all")) {
                            card.style.display = 'flex';
                        } else if (filterText.includes("ongoing") && hasOngoing) {
                            card.style.display = 'flex';
                        } else if (filterText.includes("upcoming") && hasUpcoming) {
                            card.style.display = 'flex';
                        } else if (filterText.includes("completed") && hasCompleted) {
                            card.style.display = 'flex';
                        } else if (filterText.includes("requested") && (card.querySelector('.badge-amber') || card.innerHTML.includes('Requested'))) {
                            card.style.display = 'flex';
                        } else {
                            card.style.display = 'none';
                        }
                    });
                }
                
                const alertsList = document.querySelector('.alerts-list, .alerts-container');
                if (alertsList) {
                    const alerts = alertsList.querySelectorAll('.alert-card, .alert-row');
                    alerts.forEach(alert => {
                        const isUnread = alert.querySelector('.badge.new') || alert.querySelector('.a-badge'); 
                        const isImportant = alert.classList.contains('warning') || alert.classList.contains('red');
                        
                        if (filterText.includes("all")) {
                            alert.style.display = 'flex';
                        } else if (filterText.includes("unread") && isUnread) {
                            alert.style.display = 'flex';
                        } else if (filterText.includes("important") && isImportant) {
                            alert.style.display = 'flex';
                        } else {
                            alert.style.display = 'none';
                        }
                    });
                }
            });
        });
    });
}

/* ======== FORM VALIDATION UTILITY ======== */
const Validation = {
    validatePhone(phone) {
        // Must be exactly 10 digits and contain no alphabets
        const phoneRegex = /^\d{10}$/;
        return phoneRegex.test(phone);
    },

    validateForm(form) {
        const inputs = form.querySelectorAll('[required], input[type="tel"], select, textarea');
        let isValid = true;
        let firstError = null;

        // Clear existing errors
        form.querySelectorAll('.error-feedback').forEach(el => el.remove());
        form.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));

        inputs.forEach(input => {
            let errorMsg = '';
            
            // Check Required
            if (input.hasAttribute('required') && !input.value.trim()) {
                errorMsg = 'This field is required.';
            } 
            // Check Phone (by name or type)
            else if ((input.name === 'phone' || input.type === 'tel' || input.placeholder?.toLowerCase().includes('phone')) && input.value.trim()) {
                if (!this.validatePhone(input.value.trim())) {
                    errorMsg = 'Phone number must be exactly 10 digits.';
                }
            }

            if (errorMsg) {
                isValid = false;
                input.classList.add('input-error');
                const feedback = document.createElement('div');
                feedback.className = 'error-feedback';
                feedback.style.color = '#ef4444';
                feedback.style.fontSize = '12px';
                feedback.style.marginTop = '4px';
                feedback.innerText = errorMsg;
                input.parentNode.appendChild(feedback);
                if (!firstError) firstError = input;
            }
        });

        if (firstError) firstError.focus();
        return isValid;
    }
};

/* ======== PROTOTYPE MODALS ======== */
function showConfirmModal(title, message, confirmBtnText, confirmBtnClass, onConfirm) {
    const existing = document.getElementById('prototype-confirm-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'prototype-confirm-modal';
    overlay.style.cssText = "position:fixed; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.65); z-index: 9999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px);";
    
    const color = confirmBtnClass === 'red' ? '#e11d48' : '#10b981';

    overlay.innerHTML = `
      <div style="background: var(--bg-surface, #ffffff); border: 1px solid var(--border-color, #e2e8f0); border-radius: 16px; width: 440px; padding: 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3); font-family: 'Inter', sans-serif;">
         <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2 style="margin:0; font-size: 20px; font-weight: 700; color: var(--text-primary, #0f172a);">${title}</h2>
            <svg id="close-confirm-modal" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="cursor: pointer; color: var(--text-secondary, #64748b);"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
         </div>
         
         <p style="color: var(--text-secondary, #475569); font-size: 15px; margin-bottom: 24px; line-height: 1.5;">
            ${message}
         </p>
         
         <div style="display: flex; gap: 12px;">
             <button id="cancel-confirm-modal" style="flex:1; padding: 12px; border-radius: 999px; background: var(--bg-card-alt, #f8fafc); color: var(--text-primary, #334155); font-weight: 600; font-size: 14px; border: 1px solid var(--border-color, #e2e8f0); cursor: pointer;">Cancel</button>
             <button id="ok-confirm-modal" style="flex:1; padding: 12px; border-radius: 999px; background: ${color}; color: white; border: none; font-weight: 600; font-size: 14px; cursor: pointer;">${confirmBtnText}</button>
         </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    document.getElementById('close-confirm-modal').onclick = () => overlay.remove();
    document.getElementById('cancel-confirm-modal').onclick = () => overlay.remove();
    document.getElementById('ok-confirm-modal').onclick = () => {
        overlay.remove();
        if (onConfirm) onConfirm();
    };
}

function showSuccessModal(title, message, onOk) {
    const existing = document.getElementById('prototype-success-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'prototype-success-modal';
    overlay.style.cssText = "position:fixed; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.65); z-index: 9999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px);";
    
    overlay.innerHTML = `
      <div style="background: var(--bg-surface, #ffffff); border: 1px solid var(--border-color, #e2e8f0); border-radius: 16px; width: 440px; padding: 32px 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3); font-family: 'Inter', sans-serif; text-align: center;">
         <div style="margin: 0 auto 16px auto; width: 64px; height: 64px; border-radius: 50%; background: #dcfce7; display: flex; align-items: center; justify-content: center; color: #16a34a;">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
         </div>
         <h2 style="margin:0 0 12px 0; font-size: 20px; font-weight: 700; color: var(--text-primary, #0f172a);">${title}</h2>
         <p style="color: var(--text-secondary, #475569); font-size: 15px; margin-bottom: 24px; line-height: 1.5;">
            ${message}
         </p>
         <button id="ok-success-modal" style="width: 100%; padding: 12px; border-radius: 999px; background: #0ea5e9; color: white; border: none; font-weight: 600; font-size: 14px; cursor: pointer;">Close</button>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    document.getElementById('ok-success-modal').onclick = () => {
        overlay.remove();
        if (onOk) onOk();
    };
}

function showDeleteModal(tripName, partnerName, onConfirm) {
    const existing = document.getElementById('delete-trip-modal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'delete-trip-modal';
    overlay.style.cssText = "position:fixed; top:0; left:0; right:0; bottom:0; background: rgba(0,0,0,0.65); z-index: 9999; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px);";
    
    partnerName = partnerName || "your travel partner";
    
    overlay.innerHTML = `
      <div style="background: var(--bg-surface, #ffffff); border: 1px solid var(--border-color, #e2e8f0); border-radius: 16px; width: 440px; padding: 24px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3); font-family: 'Inter', sans-serif;">
         <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
            <h2 style="margin:0; font-size: 20px; font-weight: 700; color: var(--text-primary, #0f172a);">Delete Trip</h2>
            <svg id="close-del-modal" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="cursor: pointer; color: var(--text-secondary, #64748b);"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
         </div>
         
         <p style="color: var(--text-secondary, #475569); font-size: 15px; margin-bottom: 20px; line-height: 1.5;">
            Are you sure you want to delete <b style="color:var(--text-primary, #0f172a);">${tripName}</b>?
         </p>
         
         <div style="margin-bottom: 20px;">
            <label style="display:block; font-size: 13px; font-weight: 500; color:var(--text-secondary, #334155); margin-bottom: 8px;">Reason for Deletion <span style="color:#ef4444;">*</span></label>
            <select style="width: 100%; border: 1.5px solid var(--border-color, #0ea5e9); border-radius: 12px; padding: 12px 14px; font-size: 14px; color: var(--text-primary, #0f172a); background: var(--bg-card-alt, #fff); outline: none; appearance: none; background: url('data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'16\\' height=\\'16\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'%2364748b\\' stroke-width=\\'2\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'><polyline points=\\'6 9 12 15 18 9\\'></polyline></svg>') no-repeat right 14px center var(--bg-card-alt, #fff);">
               <option value="">Select a reason...</option>
               <option value="1">Plans changed</option>
               <option value="2">Found better alternative</option>
               <option value="3">Budget constraints</option>
               <option value="4">Other</option>
            </select>
         </div>
         
         <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
             <p style="margin: 0; color: #f87171; font-size: 13px; line-height: 1.5;">
                <span style="font-size: 14px;">⚠️</span> This action cannot be undone. Your travel partner <b style="color: #fb7185;">${partnerName}</b> will be notified with your deletion reason.
             </p>
         </div>
         
         <div style="background: rgba(14, 165, 233, 0.1); border: 1px solid rgba(14, 165, 233, 0.3); border-radius: 12px; padding: 16px; margin-bottom: 24px;">
             <p style="margin: 0; color: #38bdf8; font-size: 13px; line-height: 1.5;">
                <span style="font-size: 14px;">💡</span> Your reason helps travel partners improve their services and process refunds appropriately.
             </p>
         </div>
         
         <div style="display: flex; gap: 12px;">
             <button id="cancel-del-modal" style="flex:1; padding: 12px; border-radius: 999px; background: var(--bg-card-alt, #f8fafc); color: var(--text-primary, #334155); font-weight: 600; font-size: 14px; border: 1px solid var(--border-color, #e2e8f0); cursor: pointer;">Cancel</button>
             <button id="confirm-del-modal" style="flex:1; padding: 12px; border-radius: 999px; background: #e11d48; color: white; font-weight: 600; font-size: 14px; border: none; cursor: pointer;">Delete Trip</button>
         </div>
      </div>
    `;
    
    document.body.appendChild(overlay);
    
    document.getElementById('close-del-modal').onclick = () => overlay.remove();
    document.getElementById('cancel-del-modal').onclick = () => overlay.remove();
    document.getElementById('confirm-del-modal').onclick = () => {
        overlay.remove();
        if (onConfirm) onConfirm();
    };
}

/* ======== PROTOTYPE BUTTON AUTO-WIRING ======== */
function initPrototypeInteractions() {
    document.querySelectorAll("button, .btn, .t-btn, .action-link, .btn-primary, .btn-secondary, .btn-assign, .badge-action, .quick-action-pill, .quick-action-btn, .stat-card, .stat-card-premium, .sa-stat-card").forEach(btn => {
        // Skip if already bound
        if (btn.dataset.protoBound) return;
        btn.dataset.protoBound = "true";

        // Skip if it already has onclick, or is a link with real href, or inside sidebar
        if (btn.onclick || btn.hasAttribute("onclick")) return;
        if (btn.tagName === "A" && btn.getAttribute("href") && btn.getAttribute("href") !== "#") return;
        if (btn.closest(".sidebar")) return;
        if (btn.classList.contains('logout')) return;
        if (btn.classList.contains('theme-toggle-btn') || btn.closest('.theme-toggle-btn')) return;
        if (btn.classList.contains('role-card') || btn.closest('.role-card')) return;
        if (btn.classList.contains('demo-pill') || btn.closest('.demo-pill')) return;
        if (btn.hasAttribute("data-dd-action") || btn.closest("[data-dd-action]")) return;
        if (btn.type === "submit" || btn.closest("form") || btn.classList.contains("btn-submit") || btn.closest(".form-card") || btn.closest(".form-panel") || btn.closest(".update-form-card")) return;
        
        btn.addEventListener("click", (e) => {
            // Priority: Data Attributes
            const target = btn.getAttribute('data-navigate');
            if (target) {
                e.preventDefault();
                window.location.href = target;
                return;
            }

            const action = btn.getAttribute('data-action');
            if (action === 'coming-soon') {
                e.preventDefault();
                Toast.info("This feature is coming soon!");
                return;
            }

            e.preventDefault();
            const text = btn.innerText.trim().toLowerCase();

            // --- PAYMENT ACTIONS ---
            if (text.includes("pay") || text.includes("payment") || text.includes("checkout")) {
                const tripId = btn.getAttribute('data-trip-id') || btn.closest('[data-trip-id]')?.getAttribute('data-trip-id');
                if (typeof window.openPaymentModal === 'function') {
                    window.openPaymentModal(tripId);
                    return;
                }
            }
            
            // --- ROUTING ACTIONS ---
            const isInSubfolder = window.location.pathname.includes('/pages/');

            if (text === "login" || text === "log in") {
                window.location.href = isInSubfolder ? "../../login.html" : "login.html";
                return;
            }
            if (text.includes("get started")) {
                window.location.href = isInSubfolder ? "../../login.html" : "login.html";
                return;
            }
            if (text.includes("explore")) {
                const featuresSec = document.getElementById('features');
                if (featuresSec) {
                    featuresSec.scrollIntoView({ behavior: 'smooth' });
                    return;
                }
                window.location.href = isInSubfolder ? "../../login.html" : "login.html";
                return;
            }
            if (text.includes("register")) {
                window.location.href = isInSubfolder ? "../../register.html" : "register.html";
                return;
            }

            if (text.includes("view details") || text.includes("trip details")) {
                window.location.href = isInSubfolder ? 'traveler_trip_details.html' : 'pages/traveler/traveler_trip_details.html';
                return;
            }
            if (text.includes("view schedule") || text.includes("view full schedule")) {
                window.location.href = isInSubfolder ? 'traveler_schedule.html' : 'pages/traveler/traveler_schedule.html';
                return;
            }
            if (text.includes("track progress")) {
                window.location.href = isInSubfolder ? 'traveler_progress.html' : 'pages/traveler/traveler_progress.html';
                return;
            }
            if (text.includes("contact guide") || text.includes("contact partner") || text.includes("chat") || text.includes("message")) {
                window.location.href = isInSubfolder ? 'traveler_messages.html' : 'pages/traveler/traveler_messages.html';
                return;
            }
            if (text.includes("emergency") || text.includes("report")) {
                const path = window.location.pathname;
                if (path.includes('issue_reporting') || path.includes('report_issue')) {
                    if (typeof window.submitReportedIssue === 'function' && (text.includes('submit') || text.includes('report'))) {
                        window.submitReportedIssue(btn);
                    }
                    return;
                }
                if (path.includes('/guide/')) {
                    if (!path.includes('issue_reporting.html')) {
                        window.location.href = 'issue_reporting.html';
                    }
                } else if (path.includes('/vendor/')) {
                    if (!path.includes('vendor_report_issue.html')) {
                        window.location.href = 'vendor_report_issue.html';
                    }
                } else if (path.includes('/support/')) {
                    if (!path.includes('support_issue_reporting.html')) {
                        window.location.href = 'support_issue_reporting.html';
                    }
                } else {
                    if (!path.includes('traveler_report_issue.html')) {
                        window.location.href = isInSubfolder ? 'traveler_report_issue.html' : 'pages/traveler/traveler_report_issue.html';
                    }
                }
                return;
            }
            if (text.includes("view all faqs")) {
                window.location.href = isInSubfolder ? 'traveler_support.html' : 'pages/traveler/traveler_support.html';
                return;
            }
            if (text.includes("call now")) {
                Toast.success("Initiating secure call route...");
                return;
            }

            // --- CHAT INTERACTION ---
            if (text.includes("send") && btn.closest(".chat-footer")) {
                const input = btn.closest(".chat-footer").querySelector("input");
                if (input && input.value.trim() !== "") {
                    const chatBody = document.querySelector(".chat-body");
                    if (chatBody) {
                        const msg = document.createElement("div");
                        msg.className = "message-wrapper right";
                        msg.innerHTML = `
                            <div class="message-bubble">${input.value}</div>
                            <div class="message-time">Just now</div>
                        `;
                        chatBody.appendChild(msg);
                        chatBody.scrollTop = chatBody.scrollHeight;
                        input.value = "";
                    }
                }
                return;
            }

            // --- FORM SUBMISSIONS ---
            if (text.includes("update status")) {
                const form = btn.closest("form") || btn.closest(".form-card");
                if (form && !Validation.validateForm(form)) {
                    Toast.error("Please fill in all required fields correctly.");
                    return;
                }
                
                showSuccessModal(
                    "Tour Status Updated", 
                    "Status updated in traveler progress.",
                    () => {
                        const formInputs = form?.querySelectorAll("input:not([type='file']), textarea, select");
                        if (formInputs) formInputs.forEach(i => i.value = "");
                    }
                );
                return;
            }
            
            if (text.includes("send update")) {
                const form = btn.closest("form") || btn.closest(".form-card");
                if (form && !Validation.validateForm(form)) {
                    Toast.error("Please fill in all required fields correctly.");
                    return;
                }

                showSuccessModal(
                    "Guidance Sent", 
                    `Traveler guidance was sent successfully.`,
                    () => {
                        const formInputs = form?.querySelectorAll("input:not([type='file']), textarea, select");
                        if (formInputs) formInputs.forEach(i => i.value = "");
                    }
                );
                return;
            }
            if (text.includes("submit issue") || text.includes("save changes")) {
                const form = btn.closest("form") || btn.closest(".form-panel") || btn.closest(".page-content");
                if (form && !Validation.validateForm(form)) {
                    Toast.error("Please fill in all required fields correctly.");
                    return;
                }

                const title = text.includes("submit issue") ? "Confirm Submission" : "Save Changes";
                const message = text.includes("submit issue") 
                    ? "Are you sure you want to submit this issue report? Our support team will review it shortly."
                    : "Are you sure you want to save these changes to your profile?";
                const btnText = text.includes("submit issue") ? "Submit Issue" : "Save Changes";

                showConfirmModal(
                    title,
                    message,
                    btnText,
                    "green",
                    () => {
                        if (typeof window.saveProfileAvailability === 'function') {
                            window.saveProfileAvailability(btn.closest('.page-content, .profile-layout, .split-layout, .main-content'));
                        }
                        showSuccessModal(
                            text.includes("submit issue") ? "Report Submitted" : "Changes Saved",
                            text.includes("submit issue") 
                                ? "Your issue report has been successfully submitted." 
                                : "Your profile has been updated successfully.",
                            () => {
                                const formInputs = btn.closest(".page-content")?.querySelectorAll("input:not([type='file']), textarea, select");
                                if (formInputs && text.includes("submit issue")) {
                                    formInputs.forEach(i => i.value = "");
                                }
                            }
                        );
                    }
                );
                return;
            }
            
            // Visual toggle for 'Assign' buttons
            if (btn.classList.contains("btn-assign") || text.includes("assign")) {
                const isBigBtn = btn.style.width === "100%" || btn.style.padding === "0.75rem";
                if (isBigBtn) {
                    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:8px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Assigned successfully`;
                    btn.style.background = "#10B981";
                    btn.style.pointerEvents = "none";
                } else {
                    btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right:4px;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Assigned`;
                    btn.style.background = "#10B981";
                    btn.style.color = "white";
                    btn.classList.remove("btn-assign");
                }
                Toast.success("Successfully assigned resource to trip.");
                return;
            }
            
            // Visual toggle for Resolving issues
            if (text.includes("resolve") || btn.classList.contains("green")) {
                Toast.success("Issue marked as resolved.");
                btn.style.opacity = "0.5";
                btn.style.pointerEvents = "none";
                const row = btn.closest("tr") || btn.closest(".dashboard-card") || btn.closest(".guide-item") || btn.closest(".task-item");
                if (row) {
                    row.style.opacity = "0.5";
                }
                return;
            }

            // Visual toggle for red/destructive actions (Reject, Cancel, Delete)
            if (btn.classList.contains("red") || btn.classList.contains("t-btn-outline-red") || btn.classList.contains("t-btn-outline-yellow") || btn.classList.contains("btn-danger") || text.includes("reject") || text.includes("cancel") || text.includes("delete") || text.includes("remove") || text.includes("change")) {
                
                const row = btn.closest("tr") || btn.closest(".dashboard-card") || btn.closest(".guide-item") || btn.closest(".task-item") || btn.closest(".request-card") || btn.closest(".trip-card") || btn.closest(".alert-row") || btn.closest(".alert-card") || btn.closest(".assignment-card");
                
                const isTripDelete = !text.includes("reject") && ((row && (row.classList.contains("trip-card") || row.classList.contains("dashboard-card"))) || text.includes("cancel trip") || text.includes("delete trip"));
                
                if (isTripDelete) {
                      let tripName = "this trip";
                      let partnerName = "Global Travels Co."; // safe fallback
                      if (row) {
                          let tTitle = row.querySelector(".t-title");
                          if (tTitle) tripName = tTitle.innerText;
                      } else if (document.querySelector("h1")) {
                          tripName = document.querySelector("h1").innerText;
                      }
                      
                      showDeleteModal(tripName, partnerName, () => {
                          Toast.warning(`Action executed: Item removed or cancelled.`);
                          if (row) {
                              row.style.transition = "all 0.3s ease";
                              row.style.opacity = "0";
                              setTimeout(() => row.remove(), 300);
                          } else {
                              window.location.href = window.location.pathname.includes('/pages/') ? 'traveler_mytrips.html' : 'pages/traveler/traveler_mytrips.html';
                          }
                      });
                      return;
                }

                if (text.includes("reject")) {
                    showConfirmModal(
                        "Reject Assignment", 
                        "Are you sure you want to reject this assignment? It will be permanently routed to another guide.", 
                        "Reject", 
                        "red", 
                        () => {
                            Toast.warning(`Assignment rejected successfully.`);
                            if (row) {
                                row.style.transition = "all 0.3s ease";
                                row.style.opacity = "0";
                                setTimeout(() => row.remove(), 300);
                            }
                        }
                    );
                    return;
                }

                Toast.warning(`Action executed: Item removed or cancelled.`);
                if (row) {
                    row.style.transition = "all 0.3s ease";
                    row.style.opacity = "0";
                    setTimeout(() => row.remove(), 300);
                }
                return;
            }
            
            if (text.includes("accept") || text.includes("approve")) {
                const row = btn.closest(".action-card") || btn.closest("tr") || btn.closest(".request-card") || btn.closest(".dashboard-card") || btn.closest(".assignment-card");

                if (text.includes("accept")) {
                    showConfirmModal(
                        "Accept Assignment", 
                        "Are you sure you want to accept this assignment? You will be held responsible for delivering the tour schedule.", 
                        "Accept", 
                        "green", 
                        () => {
                            Toast.success("Successfully accepted assignment.");
                            if (row) {
                                row.style.transition = "all 0.3s ease";
                                row.style.opacity = "0";
                                setTimeout(() => row.remove(), 300);
                            }
                        }
                    );
                    return;
                }
                
                Toast.success("Successfully processed request.");
                if(row) {
                    row.style.transition = "all 0.3s ease";
                    row.style.opacity = "0";
                    setTimeout(() => row.remove(), 300);
                }
                return;
            }

            if (text.includes("start tour")) {
                Toast.success("Tour has been officially started. Safe travels!");
                btn.innerHTML = "Mark as Completed";
                btn.style.background = "#10B981";
                if (btn.closest(".tour-card")) {
                     const card = btn.closest(".tour-card");
                     card.classList.add("in-progress");
                     const badge = card.querySelector(".badge");
                     if (badge) {
                         badge.className = "badge badge-blue";
                         badge.innerText = "in progress";
                         badge.style.opacity = "0.8";
                     }
                }
                return;
            }

            if (text.includes("mark as completed")) {
                showConfirmModal(
                    "Complete Tour",
                    "Are you sure you want to mark this tour as completed? This will update the traveler's progress.",
                    "Complete Tour",
                    "green",
                    () => {
                        Toast.success("Tour marked as completed successfully.");
                        btn.style.display = "none";
                        if (btn.closest(".tour-card")) {
                             const card = btn.closest(".tour-card");
                             card.classList.remove("in-progress");
                             card.classList.add("completed");
                             const badge = card.querySelector(".badge");
                             if (badge) {
                                 badge.className = "badge badge-green";
                                 badge.innerText = "completed";
                                 badge.style.opacity = "0.8";
                             }
                        }
                    }
                );
                return;
            }

            if (text.includes("add notes")) {
                Toast.info("Note editor opened. Type your notes below the tour.");
                return;
            }

            // Edit Trip Action
            if (text.includes("edit") && !text.includes("profile")) {
                let isUpcoming = false;
                let container = btn.closest(".trip-card") || btn.closest(".dashboard-card");
                
                if (!container && document.querySelector(".page-content")) {
                    isUpcoming = !!document.querySelector(".badge-upcoming");
                } else if (container) {
                    isUpcoming = !!container.querySelector(".badge-upcoming") || container.innerText.toLowerCase().includes("upcoming");
                }
                
                if (isUpcoming) {
                    window.location.href = isInSubfolder ? 'traveler_edit_trip_upcoming.html' : 'pages/traveler/traveler_edit_trip_upcoming.html';
                } else {
                    window.location.href = isInSubfolder ? 'traveler_edit_trip_ongoing.html' : 'pages/traveler/traveler_edit_trip_ongoing.html';
                }
                return;
            }

            // Default fallback
            if (!text.includes("share")) {
                 Toast.info("Action triggered successfully.");
            } else {
                 Toast.success("Operation successful.");
            }
        });
    });

    // Global Top-Right Header Links
    document.querySelectorAll(".notif-btn").forEach(btn => {
        if (!btn.hasAttribute("onclick")) {
            btn.addEventListener("click", (e) => {
                // If it's a dropdown trigger, let the dropdown logic handle it
                if (btn.id === 'notif-trigger' || btn.closest('#notif-trigger')) return;

                const path = window.location.pathname;
                const isInSubfolder = path.includes('/pages/');

                // Routing context awareness
                if (path.includes('/guide/')) {
                    window.location.href = 'notifications.html';
                } else if (path.includes('/travelPartner/')) {
                    window.location.href = 'travelPartner_notifications.html';
                } else {
                    // Default fallback
                    const notifUrl = isInSubfolder ? 'travelPartner_notifications.html' : 'pages/travelPartner/travelPartner_notifications.html';
                    window.location.href = notifUrl;
                }
            });
        }
    });

    document.querySelectorAll(".user-pill").forEach(pill => {
        pill.style.cursor = "pointer";
        if (!pill.hasAttribute("onclick")) {
            pill.addEventListener("click", () => {
                const currentPath = window.location.pathname.toLowerCase();
                const isInSubfolder = currentPath.includes('/pages/');
                const roleEl = pill.querySelector("[data-session-role]");
                const roleName = roleEl ? roleEl.innerText.toLowerCase() : "";
                
                if (roleName.includes("partner")) {
                    window.location.href = isInSubfolder ? 'travelPartner_profile.html' : 'pages/travelPartner/travelPartner_profile.html';
                } else if (roleName.includes("super") || currentPath.includes('/superuser/')) {
                    window.location.href = isInSubfolder ? 'superuser_settings.html' : 'pages/superuser/superuser_settings.html';
                } else {
                    const userName = pill.querySelector("[data-session-name]") ? pill.querySelector("[data-session-name]").innerText : "User";
                    Toast.info(`Opening Profile Settings for ${userName}`);
                }
            });
        }
    });

    // Global Logout Intercept
    document.querySelectorAll(".logout").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.preventDefault();
            let href = btn.getAttribute('href');
            if (!href || href === '#') {
                href = (typeof Auth !== 'undefined' ? Auth.getLoginPath() : '../../login.html');
            }
            
            showConfirmModal(
                "Confirm Logout", 
                "Are you sure you want to log out?", 
                "Logout", 
                "green", 
                () => {
                    // Clear session but keep workflow state to prevent data loss across logout/login
                    try {
                        sessionStorage.removeItem('dd_session');
                        localStorage.removeItem('dd_session');
                    } catch (_) {}
                    window.location.href = href;
                }
            );
        });
    });
}

/* ======== INIT ======== */
document.addEventListener('DOMContentLoaded', () => {
    try {
        if (typeof initSidebar === 'function') initSidebar();
        if (typeof setActiveNav === 'function') setActiveNav();
    } catch(e) { console.error("Initialization error:", e); }
    
    setTimeout(initPrototypeInteractions, 200);
    setTimeout(initTabFilters, 250);
});

document.addEventListener('DOMContentLoaded', () => {
    if (typeof Icons !== 'undefined') {
        document.querySelectorAll('[data-icon]').forEach(el => {
            const iconName = el.getAttribute('data-icon');
            if (Icons[iconName]) el.innerHTML = Icons[iconName];
        });
    }

    // Init header notification bell dropdown handler
    setTimeout(() => {
        if (typeof NotificationPopup !== 'undefined' && typeof NotificationPopup.initHeaderBellDropdown === 'function') {
            NotificationPopup.initHeaderBellDropdown();
        }
    }, 300);
});

/* ======== REAL-TIME POPUP NOTIFICATION SYSTEM & BELL DROPDOWN ======== */
const NotificationPopup = {
    seenIds: new Set(JSON.parse(sessionStorage.getItem('dd_seen_notif_ids') || '[]')),
    
    markSeen(id) {
        if (!id) return;
        this.seenIds.add(id);
        try {
            sessionStorage.setItem('dd_seen_notif_ids', JSON.stringify(Array.from(this.seenIds).slice(-200)));
        } catch (_) {}
    },

    isSeen(id) {
        return id && this.seenIds.has(id);
    },

    deferredQueue: [],

    isTabActive() {
        return !document.hidden && document.visibilityState === 'visible';
    },

    initVisibilityListeners() {
        if (window.ddVisibilityListenerAttached) return;
        window.ddVisibilityListenerAttached = true;

        const processDeferred = () => {
            if (!this.isPortalPage() || !this.isTabActive()) return;

            if (this.deferredQueue.length > 0) {
                const pending = [...this.deferredQueue];
                this.deferredQueue = [];
                pending.forEach(notif => this.show(notif));
            }

            if (window.DDWorkflow && typeof window.DDWorkflow.loadState === 'function') {
                const state = window.DDWorkflow.loadState();
                if (typeof checkAndTriggerPopupsForCurrentPortal === 'function') {
                    checkAndTriggerPopupsForCurrentPortal(state);
                }
            }
        };

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                setTimeout(processDeferred, 100);
            }
        });

        window.addEventListener('focus', () => {
            setTimeout(processDeferred, 100);
        });
    },

    isPortalPage() {
        const path = decodeURIComponent(window.location.pathname).toLowerCase();
        // Check if page is landing, login, register or index page
        if (
            path.endsWith('landing_page.html') ||
            path.endsWith('login.html') ||
            path.endsWith('register.html') ||
            path.endsWith('index.html') ||
            path.endsWith('/') ||
            path.includes('landing_page') ||
            path.includes('login') ||
            path.includes('register')
        ) {
            return false;
        }
        // Must be in one of the active portal pages/folders
        return (
            path.includes('/travelpartner') ||
            path.includes('travelpartner_') ||
            path.includes('/traveler/') ||
            path.includes('/guide/') ||
            path.includes('/vendor/') ||
            path.includes('/support/') ||
            path.includes('/superuser/')
        );
    },

    initStyles() {
        if (document.getElementById('dd-notification-popup-styles')) return;
        const style = document.createElement('style');
        style.id = 'dd-notification-popup-styles';
        style.innerHTML = `
            /* Compact Floating Popup Container - top-right, small */
            #dd-notification-popup-container {
                position: fixed;
                top: 16px;
                right: 20px;
                left: auto;
                transform: none;
                z-index: 100000;
                display: flex;
                flex-direction: column;
                align-items: flex-end;
                width: 280px;
                pointer-events: none;
                gap: 6px;
            }

            @media (max-width: 600px) {
                #dd-notification-popup-container {
                    right: 10px;
                    width: calc(100vw - 20px);
                }
            }

            .dd-popup-card {
                pointer-events: auto;
                width: 100%;
                background: var(--bg-surface, #ffffff);
                border: 1px solid var(--border-color, #cbd5e1);
                border-left: 3px solid #0ea5e9;
                border-radius: 10px;
                padding: 8px 12px 6px 12px;
                box-shadow: 0 4px 16px -4px rgba(0, 0, 0, 0.18);
                font-family: 'Inter', sans-serif;
                animation: ddSlideRight 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                position: relative;
                overflow: hidden;
                cursor: pointer;
                transition: transform 0.2s ease, opacity 0.2s ease;
            }

            .dd-popup-card:hover {
                box-shadow: 0 6px 20px -4px rgba(0, 0, 0, 0.22);
            }

            /* Stack: only show top card, rest hidden */
            #dd-notification-popup-container:not(.expanded) .dd-popup-card:nth-child(2) {
                margin-top: -44px;
                transform: translateY(6px) scale(0.97);
                opacity: 0.6;
                z-index: 9;
            }

            #dd-notification-popup-container:not(.expanded) .dd-popup-card:nth-child(3),
            #dd-notification-popup-container:not(.expanded) .dd-popup-card:nth-child(n+3) {
                display: none;
            }

            /* EXPANDED STACK STATE */
            #dd-notification-popup-container.expanded .dd-popup-card,
            #dd-notification-popup-container:hover .dd-popup-card {
                margin-top: 0 !important;
                transform: translateY(0) scale(1) !important;
                opacity: 1 !important;
                filter: none !important;
                display: block !important;
            }

            .dd-popup-card.dd-popup-success { border-left-color: #10b981; }
            .dd-popup-card.dd-popup-warning { border-left-color: #f59e0b; }
            .dd-popup-card.dd-popup-error   { border-left-color: #ef4444; }
            .dd-popup-card.dd-popup-info    { border-left-color: #0ea5e9; }

            /* Hide bulky sections — keep only title + message */
            .dd-popup-header { display: none !important; }
            .dd-popup-icon   { display: none !important; }
            .dd-popup-footer { display: none !important; }

            .dd-popup-body {
                display: flex;
                gap: 0;
                align-items: flex-start;
            }

            .dd-popup-content {
                flex: 1;
                min-width: 0;
            }

            .dd-popup-title {
                font-size: 12px;
                font-weight: 700;
                color: var(--text-primary, #0f172a);
                margin-bottom: 2px;
                line-height: 1.3;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .dd-popup-message {
                font-size: 11px;
                color: var(--text-secondary, #475569);
                line-height: 1.35;
                margin-bottom: 4px;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }

            .dd-popup-stack-badge {
                font-size: 10px;
                font-weight: 700;
                color: #fff;
                background: #0ea5e9;
                padding: 1px 6px;
                border-radius: 999px;
                position: absolute;
                top: 6px;
                right: 6px;
            }

            .dd-popup-progress {
                position: absolute;
                bottom: 0;
                left: 0;
                height: 2px;
                background: linear-gradient(90deg, #0ea5e9, #14b8a6);
                width: 100%;
                animation: ddProgress 2s linear forwards;
            }
            .dd-popup-card.dd-popup-success .dd-popup-progress { background: #10b981; }
            .dd-popup-card.dd-popup-warning .dd-popup-progress { background: #f59e0b; }
            .dd-popup-card.dd-popup-error   .dd-popup-progress { background: #ef4444; }

            /* Bell Dropdown Popup */
            #dd-bell-dropdown-popup {
                position: fixed;
                width: 340px;
                max-width: 92vw;
                background: var(--bg-surface, #ffffff);
                border: 1px solid var(--border-color, #e2e8f0);
                border-radius: 16px;
                box-shadow: 0 20px 40px -12px rgba(0, 0, 0, 0.22);
                z-index: 999999;
                display: none;
                flex-direction: column;
                overflow: hidden;
                font-family: 'Inter', sans-serif;
                animation: ddFadeInDown 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
            #dd-bell-dropdown-popup.open { display: flex !important; }

            .dd-bell-header { padding: 14px 18px; border-bottom: 1px solid var(--border-color, #e2e8f0); display: flex; align-items: center; justify-content: space-between; background: var(--bg-card-alt, #f8fafc); }
            .dd-bell-header h3 { margin: 0; font-size: 14px; font-weight: 700; color: var(--text-primary, #0f172a); display: flex; align-items: center; gap: 8px; }
            .dd-bell-actions { display: flex; align-items: center; gap: 10px; }
            .dd-bell-count { background: #0ea5e9; color: #fff; font-size: 10px; font-weight: 700; padding: 1px 7px; border-radius: 999px; }
            .dd-bell-mark-all { font-size: 11px; color: #0ea5e9; font-weight: 600; background: none; border: none; cursor: pointer; padding: 0; }
            .dd-bell-mark-all:hover { text-decoration: underline; }
            .dd-bell-list { max-height: 300px; overflow-y: auto; }
            .dd-bell-item { padding: 12px 16px; border-bottom: 1px solid var(--border-color, #f1f5f9); display: flex; gap: 10px; cursor: pointer; transition: background 0.15s ease; text-decoration: none; color: inherit; }
            .dd-bell-item:hover { background: var(--bg-card-alt, #f8fafc); }
            .dd-bell-item.unread { background: rgba(14, 165, 233, 0.05); }
            .dd-bell-item-icon { width: 30px; height: 30px; border-radius: 8px; background: rgba(14, 165, 233, 0.12); color: #0ea5e9; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
            .dd-bell-item-content { flex: 1; min-width: 0; }
            .dd-bell-item-title { font-size: 12px; font-weight: 700; color: var(--text-primary, #0f172a); margin-bottom: 2px; }
            .dd-bell-item-desc { font-size: 11px; color: var(--text-secondary, #64748b); line-height: 1.35; margin-bottom: 3px; word-break: break-word; }
            .dd-bell-item-time { font-size: 10px; color: var(--text-secondary, #94a3b8); }
            .dd-bell-empty { padding: 20px; text-align: center; color: var(--text-secondary, #64748b); font-size: 12px; }
            .dd-bell-footer { padding: 12px; text-align: center; border-top: 1px solid var(--border-color, #e2e8f0); background: var(--bg-card-alt, #f8fafc); }
            .dd-bell-footer a { font-size: 12px; font-weight: 700; color: #0ea5e9; text-decoration: none; }
            .dd-bell-footer a:hover { text-decoration: underline; }

            @keyframes ddSlideRight {
                from { transform: translateX(110%); opacity: 0; }
                to   { transform: translateX(0);    opacity: 1; }
            }

            @keyframes ddProgress {
                from { width: 100%; }
                to   { width: 0%; }
            }

            @keyframes ddPulse {
                0%, 100% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.4; transform: scale(1.3); }
            }

            @keyframes ddFadeInDown {
                from { opacity: 0; transform: translateY(-6px); }
                to   { opacity: 1; transform: translateY(0); }
            }
        `;
        document.head.appendChild(style);
    },

    show(notif) {
        if (!this.isPortalPage() || !notif) return;
        this.initVisibilityListeners();
        
        const notifId = notif.id || `NTF-${Date.now()}`;
        if (this.isSeen(notifId)) return;

        // If user is currently in another tab, queue notification until they return to portal tab
        if (!this.isTabActive()) {
            if (!this.deferredQueue.some(n => n.id === notifId)) {
                this.deferredQueue.push(notif);
            }
            return;
        }

        this.initStyles();
        this.markSeen(notifId);

        let container = document.getElementById('dd-notification-popup-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'dd-notification-popup-container';
            document.body.appendChild(container);
        }

        const title = notif.title || 'New Portal Notification';
        const message = notif.message || notif.body || 'You have a new update in your portal.';
        const type = notif.type || 'info';

        const portalName = this.getCurrentPortalName();
        const actionUrl = this.getNotificationUrlForCurrentPortal();

        const card = document.createElement('div');
        card.className = `dd-popup-card dd-popup-${type}`;
        card.id = `dd-popup-${notifId}`;

        const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`;

        card.innerHTML = `
            <div class="dd-popup-header">
                <div class="dd-popup-portal-tag">
                    <span class="dd-popup-dot"></span>
                    <span>${portalName} Portal</span>
                </div>
                <button class="dd-popup-close" onclick="NotificationPopup.close('${notifId}')">&times;</button>
            </div>
            <div class="dd-popup-body">
                <div class="dd-popup-icon">${iconSvg}</div>
                <div class="dd-popup-content">
                    <div class="dd-popup-title">${this.escapeHTML(title)}</div>
                    <div class="dd-popup-message">${this.escapeHTML(message)}</div>
                    <div class="dd-popup-footer">
                        <span class="dd-popup-time">Just now &bull; Click card to view all</span>
                        <span class="dd-popup-action">View Notifications &rarr;</span>
                    </div>
                </div>
            </div>
            <div class="dd-popup-progress"></div>
        `;

        // Card Click Handler: Clicking expands stack or navigates to View All Notifications
        card.addEventListener('click', (e) => {
            if (e.target.closest('.dd-popup-close')) return;
            e.preventDefault();
            const stackContainer = document.getElementById('dd-notification-popup-container');
            if (stackContainer && stackContainer.children.length > 1 && !stackContainer.classList.contains('expanded')) {
                stackContainer.classList.add('expanded');
                return;
            }
            window.location.href = actionUrl;
        });

        // Prepend so newest is always top card
        if (container.firstChild) {
            container.insertBefore(card, container.firstChild);
        } else {
            container.appendChild(card);
        }

        // Update stack badges if multiple cards
        this.updateStackBadges();

        // Audio notification chime
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.12);
            gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.25);
        } catch (_) {}

        // Auto-dismiss after 2 seconds
        setTimeout(() => {
            this.close(notifId);
        }, 2000);
    },

    updateStackBadges() {
        const container = document.getElementById('dd-notification-popup-container');
        if (!container) return;
        const total = container.children.length;
        Array.from(container.children).forEach((card, index) => {
            let badge = card.querySelector('.dd-popup-stack-badge');
            if (total > 1 && index === 0) {
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'dd-popup-stack-badge';
                    const tag = card.querySelector('.dd-popup-portal-tag');
                    if (tag) tag.appendChild(badge);
                }
                badge.textContent = `+${total - 1} more`;
            } else if (badge) {
                badge.remove();
            }
        });
    },

    close(id) {
        const card = document.getElementById(`dd-popup-${id}`);
        if (card) {
            card.style.transform = 'translateY(-120%)';
            card.style.opacity = '0';
            setTimeout(() => {
                card.remove();
                this.updateStackBadges();
                const container = document.getElementById('dd-notification-popup-container');
                if (container && container.children.length <= 1) {
                    container.classList.remove('expanded');
                }
            }, 300);
        }
    },

    getCurrentRole() {
        const path = decodeURIComponent(window.location.pathname).toLowerCase();
        if (path.includes('travelpartner') || path.includes('/travelpartner(')) return 'partner';
        if (path.includes('/traveler/')) return 'traveler';
        if (path.includes('/guide/')) return 'guide';
        if (path.includes('/vendor/')) return 'vendor';
        if (path.includes('/support/')) return 'support';
        if (path.includes('/superuser/')) return 'superuser';
        return 'partner';
    },

    getCurrentPortalName() {
        const role = this.getCurrentRole();
        const map = {
            partner: 'Travel Partner',
            traveler: 'Traveler',
            guide: 'Tour Guide',
            vendor: 'Vendor',
            support: 'Support Executive',
            superuser: 'Super Admin'
        };
        return map[role] || 'Travel';
    },

    getNotificationUrlForCurrentPortal() {
        const path = decodeURIComponent(window.location.pathname).toLowerCase();
        if (path.includes('/travelpartner') || path.includes('travelpartner_')) return 'travelPartner_notifications.html';
        if (path.includes('/traveler/')) return 'traveler_alerts.html';
        if (path.includes('/guide/')) return 'notifications.html';
        if (path.includes('/vendor/')) return 'vendor_notifications.html';
        if (path.includes('/support/')) return 'notifications.html';
        if (path.includes('/superuser/')) return 'superuser_alerts.html';
        return 'pages/travelPartner/travelPartner_notifications.html';
    },

    escapeHTML(str) {
        return (str || '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m]));
    },

    initHeaderBellDropdown() {
        if (!this.isPortalPage()) return;
        this.initStyles();
        document.querySelectorAll('.notif-btn, .sa-notif-btn, #notif-trigger').forEach((btn) => {
            if (btn.dataset.ddBellBound) return;
            btn.dataset.ddBellBound = 'true';

            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();

                let dropdown = document.getElementById('dd-bell-dropdown-popup');
                if (!dropdown) {
                    dropdown = document.createElement('div');
                    dropdown.id = 'dd-bell-dropdown-popup';
                    document.body.appendChild(dropdown);
                }

                const isOpen = dropdown.classList.contains('open');
                if (isOpen) {
                    dropdown.classList.remove('open');
                    return;
                }

                const rect = btn.getBoundingClientRect();
                dropdown.style.top = `${rect.bottom + 10}px`;
                dropdown.style.right = `${Math.max(16, window.innerWidth - rect.right)}px`;

                const state = window.DDWorkflow ? window.DDWorkflow.loadState() : null;
                const session = window.DDWorkflow && typeof window.DDWorkflow.readSession === 'function' ? window.DDWorkflow.readSession() : {};
                const role = NotificationPopup.getCurrentRole();
                const deletedSet = new Set((state && state.deletedNotifIds) || []);
                const notifications = state && Array.isArray(state.notifications)
                    ? state.notifications.filter(item => {
                        if (deletedSet.has(item.id)) return false;
                        if (window.DDWorkflow && typeof window.DDWorkflow.isNotificationForCurrentUser === 'function') {
                            return window.DDWorkflow.isNotificationForCurrentUser(item, session, state);
                        }
                        return (item.roles || []).includes(role) || (item.roles || []).includes('all');
                    })
                    : [];
                
                const unreadCount = notifications.filter(item => !(item.readBy || []).includes(role)).length;
                const actionUrl = NotificationPopup.getNotificationUrlForCurrentPortal();

                dropdown.innerHTML = `
                    <div class="dd-bell-header" style="padding: 14px 18px; border-bottom: 1px solid var(--border-color, #e2e8f0); display: flex; align-items: center; justify-content: space-between; background: var(--bg-card-alt, #f8fafc);">
                        <h3 style="margin:0; font-size:15px; font-weight:700; color:var(--text-primary, #0f172a); display:flex; align-items:center; gap:8px;">🔔 Notifications ${unreadCount > 0 ? `<span class="dd-bell-count" style="background:#0ea5e9; color:#fff; font-size:11px; font-weight:700; padding:2px 8px; border-radius:999px;">${unreadCount} New</span>` : ''}</h3>
                        <div class="dd-bell-actions" style="display:flex; align-items:center; gap:10px;">
                            <button class="dd-bell-mark-all" onclick="if(window.markAllNotifsAsRead) window.markAllNotifsAsRead('${role}'); else if(window.markAllAlertsAsRead) window.markAllAlertsAsRead(); setTimeout(() => NotificationPopup.initHeaderBellDropdown(), 100);" style="font-size:12px; color:#0ea5e9; font-weight:600; background:none; border:none; cursor:pointer; padding:0;">Mark read</button>
                            <button class="dd-bell-delete-all" onclick="if(window.deleteAllNotifs) window.deleteAllNotifs('${role}'); else if(window.deleteAllAlerts) window.deleteAllAlerts(); setTimeout(() => NotificationPopup.initHeaderBellDropdown(), 100);" style="font-size:12px; color:#ef4444; font-weight:600; background:none; border:none; cursor:pointer; padding:0;">Delete all</button>
                        </div>
                    </div>
                    <div class="dd-bell-list">
                        ${notifications.length > 0 ? notifications.slice(0, 8).map(n => `
                            <a href="${actionUrl}" class="dd-bell-item ${!(n.readBy || []).includes(role) ? 'unread' : ''}">
                                <div class="dd-bell-item-icon">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                                </div>
                                <div class="dd-bell-item-content">
                                    <div class="dd-bell-item-title">${NotificationPopup.escapeHTML(n.title)}</div>
                                    <div class="dd-bell-item-desc">${NotificationPopup.escapeHTML(n.message || n.body)}</div>
                                    <div class="dd-bell-item-time">${n.createdAt ? new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Recent'}</div>
                                </div>
                            </a>
                        `).join('') : `
                            <div class="dd-bell-empty">No notifications yet for ${NotificationPopup.getCurrentPortalName()} Portal.</div>
                        `}
                    </div>
                    <div class="dd-bell-footer">
                        <a href="${actionUrl}">View All Notifications Page &rarr;</a>
                    </div>
                `;

                dropdown.classList.add('open');
            });
        });

        if (!window.ddBellClickListenerAttached) {
            window.ddBellClickListenerAttached = true;
            document.addEventListener('click', (e) => {
                const dropdown = document.getElementById('dd-bell-dropdown-popup');
                if (dropdown && dropdown.classList.contains('open')) {
                    const isClickInside = dropdown.contains(e.target) || e.target.closest('.notif-btn') || e.target.closest('.sa-notif-btn') || e.target.closest('#notif-trigger');
                    if (!isClickInside) {
                        dropdown.classList.remove('open');
                    }
                }
            });
        }
        this.initSwipeToDismiss();
    },

    initSwipeToDismiss() {
        if (window.ddSwipeInitialized) return;
        window.ddSwipeInitialized = true;

        let startX = 0;
        let startY = 0;
        let currentElement = null;
        let isSwiping = false;

        const getSwipeTarget = (el) => {
            if (!el) return null;
            return el.closest('.dd-popup-card, .dd-bell-item, .notif-item-full, .sa-nd-item, .notif-card, .notif-item');
        };

        document.addEventListener('touchstart', (e) => {
            const target = getSwipeTarget(e.target);
            if (!target) return;
            currentElement = target;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isSwiping = false;
        }, { passive: true });

        document.addEventListener('touchmove', (e) => {
            if (!currentElement) return;
            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            const deltaX = currentX - startX;
            const deltaY = currentY - startY;

            if (!isSwiping && Math.abs(deltaX) > 10 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
                isSwiping = true;
            }

            if (isSwiping) {
                currentElement.style.transition = 'none';
                currentElement.style.transform = `translateX(${deltaX}px)`;
                const opacity = Math.max(0.15, 1 - Math.abs(deltaX) / 280);
                currentElement.style.opacity = opacity;
            }
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            if (!currentElement || !isSwiping) {
                currentElement = null;
                isSwiping = false;
                return;
            }
            const touch = e.changedTouches[0];
            const deltaX = touch.clientX - startX;

            if (Math.abs(deltaX) > 75) {
                const target = currentElement;
                const direction = deltaX > 0 ? 1 : -1;
                target.style.transition = 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease';
                target.style.transform = `translateX(${direction * 120}%)`;
                target.style.opacity = '0';

                setTimeout(() => {
                    target.style.transition = 'all 0.2s ease';
                    target.style.maxHeight = '0px';
                    target.style.paddingTop = '0px';
                    target.style.paddingBottom = '0px';
                    target.style.marginTop = '0px';
                    target.style.marginBottom = '0px';
                    target.style.border = 'none';
                    setTimeout(() => {
                        if (target.classList.contains('dd-popup-card')) {
                            const id = target.id.replace('dd-popup-', '');
                            NotificationPopup.close(id);
                        } else {
                            target.remove();
                        }
                    }, 200);
                }, 250);
            } else {
                currentElement.style.transition = 'transform 0.2s ease, opacity 0.2s ease';
                currentElement.style.transform = 'translateX(0)';
                currentElement.style.opacity = '1';
            }

            currentElement = null;
            isSwiping = false;
        }, { passive: true });
    }
};

window.NotificationPopup = NotificationPopup;
window.showNotificationPopup = (notif) => NotificationPopup.show(notif);
document.addEventListener('DOMContentLoaded', () => {
    if (window.NotificationPopup) window.NotificationPopup.initSwipeToDismiss();
});


