document.addEventListener('DOMContentLoaded', () => {
    // If already logged in, redirect to admin panel
    if (localStorage.getItem('hope_admin_token')) {
        window.location.href = '/admin.html';
        return;
    }

    const loginForm = document.getElementById('login-form');
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const password = document.getElementById('admin-password').value;
        const btn = loginForm.querySelector('button');
        const errorDiv = document.getElementById('login-error');

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
        errorDiv.classList.add('hidden');

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });
            const data = await res.json();

            if (data.success) {
                // Save token and redirect
                localStorage.setItem('hope_admin_token', data.token);
                window.location.href = '/admin.html';
            } else {
                errorDiv.innerText = data.message || 'Invalid credentials';
                errorDiv.classList.remove('hidden');
            }
        } catch (err) {
            errorDiv.innerText = 'Server error. Please try again.';
            errorDiv.classList.remove('hidden');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<span>Access Dashboard</span><i class="fas fa-arrow-right"></i>';
        }
    });
});
