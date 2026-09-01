const routeMap = {
  superuser: 'pages/superuser/superuser_dashboard.html',
  partner: 'pages/travelPartner/travelPartner_dashboard.html',
  traveler: 'pages/traveler/traveler_dashboard.html',
  vendor: 'pages/vendor/vendor_dashboard.html',
  guide: 'pages/guide/dashboard.html',
  support: 'pages/support/dashboard.html',
};

const roleMap = {
  'Super Admin': 'superuser',
  'Super User': 'superuser',
  superuser: 'superuser',
  superadmin: 'superuser',
  Traveler: 'traveler',
  traveler: 'traveler',
  'Travel Partner': 'partner',
  partner: 'partner',
  Vendor: 'vendor',
  vendor: 'vendor',
  'Tour Guide': 'guide',
  guide: 'guide',
  'Support Executive': 'support',
  support: 'support',
};

const demoCredentials = {
  superuser: { email: 'superadmin@gmail.com', pass: 'admin123', label: 'Super Admin' },
  traveler: { email: 'traveler@gmail.com', pass: '123456', label: 'Traveler' },
  partner: { email: 'dileep@gmail.com', pass: '123456', label: 'Travel Partner' },
  guide: { email: 'koushik@gmail.com', pass: '123456', label: 'Tour Guide' },
  vendor: { email: 'lokesh@gmail.com', pass: '123456', label: 'Vendor' },
  support: { email: 'mahendra@gmail.com', pass: '123456', label: 'Support Executive' },
};

const emailToRoleMap = {
  'superadmin@gmail.com': 'superuser',
  'traveler@gmail.com': 'traveler',
  'nbharathnrr@gmail.com': 'traveler',
  'dileep@gmail.com': 'partner',
  'partner@gmail.com': 'partner',
  'koushik@gmail.com': 'guide',
  'guide@gmail.com': 'guide',
  'lokesh@gmail.com': 'vendor',
  'vendor@gmail.com': 'vendor',
  'mahendra@gmail.com': 'support',
  'support@gmail.com': 'support',
};

function selectRole(roleKey) {
  const normalized = (roleKey || '').toLowerCase().trim();
  const roleButtons = document.querySelectorAll('.role-btn');
  let matched = false;

  roleButtons.forEach((btn) => {
    const btnRole = (btn.dataset.role || btn.innerText || '').toLowerCase().trim();
    if (
      btnRole === normalized ||
      (normalized === 'superuser' && btnRole.includes('admin')) ||
      (normalized === 'superadmin' && (btnRole.includes('admin') || btnRole.includes('superuser'))) ||
      (normalized === 'partner' && btnRole.includes('partner')) ||
      (normalized === 'guide' && btnRole.includes('guide')) ||
      (normalized === 'vendor' && btnRole.includes('vendor')) ||
      (normalized === 'traveler' && btnRole.includes('traveler')) ||
      (normalized === 'support' && btnRole.includes('support'))
    ) {
      btn.classList.add('active');
      matched = true;
    } else {
      btn.classList.remove('active');
    }
  });

  return matched;
}

function showAuthMessage(type, message) {
  const errBox = document.getElementById('login-error-msg');
  const succBox = document.getElementById('login-success-msg');

  if (errBox) errBox.style.display = 'none';
  if (succBox) succBox.style.display = 'none';

  if (type === 'error' && errBox) {
    errBox.textContent = message;
    errBox.style.display = 'block';
  } else if (type === 'success' && succBox) {
    succBox.textContent = message;
    succBox.style.display = 'block';
  } else if (message) {
    alert(message);
  }
}

function clearAuthMessages() {
  const errBox = document.getElementById('login-error-msg');
  const succBox = document.getElementById('login-success-msg');
  if (errBox) errBox.style.display = 'none';
  if (succBox) succBox.style.display = 'none';
}

function storeSessionAndRedirect(sessionData) {
  const session = Object.assign({}, sessionData, { loginTime: Date.now() });

  // sessionStorage  → tab-specific (allows different users in different tabs)
  // localStorage    → persistent fallback (survives page navigation in same tab)
  try { sessionStorage.setItem('dd_session', JSON.stringify(session)); } catch (_) {}
  try { localStorage.setItem('dd_session', JSON.stringify(session)); } catch (_) {}

  const roleKey = (sessionData.role || '').toLowerCase();
  const targetUrl = routeMap[roleKey] || routeMap.traveler;
  window.location.href = targetUrl;
}

document.addEventListener('DOMContentLoaded', () => {
  const roleButtons = document.querySelectorAll('.role-btn');
  const emailInput = document.getElementById('emailInput') || document.querySelector('input[type="email"]');
  const passwordInput = document.getElementById('passwordInput') || document.querySelector('input[type="password"]');
  const loginForm = document.getElementById('loginForm');
  const submitBtn = document.getElementById('loginSubmitBtn') || loginForm?.querySelector('button[type="submit"]');

  // Role button interactions
  roleButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      roleButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      clearAuthMessages();

      // Auto-suggest demo email if inputs are empty
      const role = (btn.dataset.role || btn.innerText || '').toLowerCase().trim();
      const mappedRole = roleMap[role] || role;
      if (demoCredentials[mappedRole] && emailInput && !emailInput.value) {
        emailInput.placeholder = demoCredentials[mappedRole].email;
      }
    });
  });

  // Demo pills quick fill
  document.querySelectorAll('.demo-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      const role = pill.dataset.role;
      const email = pill.dataset.email;
      const pass = pill.dataset.pass;

      if (role) selectRole(role);
      if (emailInput && email) emailInput.value = email;
      if (passwordInput && pass) passwordInput.value = pass;
      clearAuthMessages();

      if (submitBtn) {
        submitBtn.style.transform = 'scale(1.02)';
        setTimeout(() => { submitBtn.style.transform = ''; }, 200);
      }
    });
  });

  // Auto-detect role when typing email
  if (emailInput) {
    emailInput.addEventListener('input', () => {
      clearAuthMessages();
      const val = emailInput.value.trim().toLowerCase();
      if (emailToRoleMap[val]) {
        selectRole(emailToRoleMap[val]);
      }
    });
  }

  if (passwordInput) {
    passwordInput.addEventListener('input', clearAuthMessages);
  }

  // Handle ?role= query parameter in URL (e.g. login.html?role=traveler)
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const requestedRole = urlParams.get('role');
    if (requestedRole) {
      const matched = selectRole(requestedRole);
      if (matched && demoCredentials[requestedRole]) {
        if (emailInput && !emailInput.value) {
          emailInput.placeholder = demoCredentials[requestedRole].email;
        }
      }
    }
  } catch (_) {}

  // Login form submit handler
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAuthMessages();

      const activeRoleBtn = document.querySelector('.role-btn.active');
      const selectedRole = activeRoleBtn?.dataset?.role || activeRoleBtn?.innerText || 'Traveler';
      const email = (emailInput?.value || '').trim();
      const password = passwordInput?.value || '';

      if (!email) {
        showAuthMessage('error', 'Please enter your email address.');
        emailInput?.focus();
        return;
      }

      if (!password) {
        showAuthMessage('error', 'Please enter your password.');
        passwordInput?.focus();
        return;
      }

      const originalBtnText = submitBtn ? submitBtn.innerHTML : 'Sign In';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = 'Signing In...';
      }

      try {
        const res = await ApiClient.post('/auth/login', { email, password, role: selectedRole });
        const sessionData = (res && res.data) ? res.data : res;

        if (!sessionData || !sessionData.role) {
          throw new Error('Invalid response from server. Please try again.');
        }

        // Suspended: backend returns 401, caught below.
        // Inactive: user can log in but show a notice.
        if (sessionData.status === 'Inactive') {
          const proceed = confirm(
            '⚠️ Your account is currently Inactive.\n\nYou can access the portal but cannot perform any actions until the Super Admin reactivates your account.\n\nClick OK to continue.'
          );
          if (!proceed) {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.innerHTML = originalBtnText;
            }
            return;
          }
        }

        showAuthMessage('success', `Welcome back, ${sessionData.name || 'User'}! Redirecting...`);
        setTimeout(() => {
          storeSessionAndRedirect(sessionData);
        }, 300);
      } catch (err) {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        }

        const errMsg = err.message || 'Login failed. Please check your credentials.';
        showAuthMessage('error', errMsg);

        // If backend tells which role was expected, auto-switch the role button for convenience
        const roleMatch = errMsg.match(/Select "(.*?)" to sign in/i);
        if (roleMatch && roleMatch[1]) {
          selectRole(roleMatch[1]);
        }
      }
    });
  }
});
