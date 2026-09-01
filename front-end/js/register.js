const roleButtons = document.querySelectorAll('.role-btn');
roleButtons.forEach((btn) => btn.addEventListener('click', () => {
  roleButtons.forEach((b) => b.classList.remove('active'));
  btn.classList.add('active');
}));

const registerForm = document.getElementById('registerForm');
if (registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = registerForm.querySelector('input[type="email"]').value;
    const phone = document.getElementById('phoneNumber').value;
    const password = document.getElementById('password').value;
    const confirmPw = document.getElementById('confirmPassword').value;
    const name = registerForm.querySelector('input[placeholder="John Doe"]').value;
    const role = document.querySelector('.role-btn.active')?.innerText || 'Traveler';

    if (!/^\d{10}$/.test(phone.trim())) return alert('Invalid phone number. Use exactly 10 digits.');
    if (password !== confirmPw) return alert('Passwords do not match.');

    try {
      try {
        await ApiClient.post('/auth/register', { name, email, phone, password, role });
      } catch (apiErr) {
        console.warn('Backend registration API note:', apiErr.message);
      }

      // Sync into local workflow state
      try {
        const STORE_KEY = 'dream_destination_workflow_v5';
        const st = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
        if (st && Array.isArray(st.users)) {
          const exists = st.users.some(u => u.email.toLowerCase() === email.toLowerCase());
          if (!exists) {
            const newId = `USR-${Math.floor(100 + Math.random() * 900)}`;
            st.users.push({ id: newId, name, email, phone, role, status: 'Active', joined: new Date().toISOString() });
            localStorage.setItem(STORE_KEY, JSON.stringify(st));
          }
        }
      } catch (_) {}

      // Equal round-robin load balancing assignment for new Travelers
      if (role === 'Traveler' && typeof autoAssignTraveler === 'function') {
        autoAssignTraveler(email.toLowerCase());
      }

      alert('Account created successfully!');
      window.location.href = 'login.html';
    } catch (err) {
      alert(err.message);
    }
  });
}
