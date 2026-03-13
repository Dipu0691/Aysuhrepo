document.addEventListener('DOMContentLoaded', () => {
    // If already logged in, redirect to admin panel
    if (localStorage.getItem('hope_admin_token')) {
        // Check role from stored user
        try {
            const storedUser = JSON.parse(localStorage.getItem('hope_admin_user') || '{}');
            if (storedUser.role === 'Parent') {
                window.location.href = '/portal.html';
            } else {
                window.location.href = '/admin.html';
            }
        } catch(e) {
            window.location.href = '/admin.html';
        }
        return;
    }

    const loginForm = document.getElementById('login-form');
    const togglePassword = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('login-password');

    // Password visibility toggle
    if (togglePassword) {
        togglePassword.addEventListener('click', () => {
            const type = passwordInput.type === 'password' ? 'text' : 'password';
            passwordInput.type = type;
            const icon = togglePassword.querySelector('i');
            icon.classList.toggle('fa-eye');
            icon.classList.toggle('fa-eye-slash');
        });
    }

    // Login form submission
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;
        const btn = document.getElementById('login-btn');
        const btnText = document.getElementById('login-btn-text');
        const btnIcon = document.getElementById('login-btn-icon');
        const errorDiv = document.getElementById('login-error');
        const errorText = document.getElementById('login-error-text');

        // Disable button and show loading
        btn.disabled = true;
        btn.classList.add('opacity-70', 'cursor-not-allowed');
        btnText.textContent = 'Signing In...';
        btnIcon.classList.remove('fa-arrow-right');
        btnIcon.classList.add('fa-circle-notch', 'spinner');
        errorDiv.classList.add('hidden');

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();

            if (data.success) {
                // Save token and user info
                localStorage.setItem('hope_admin_token', data.token);
                if (data.user) {
                    localStorage.setItem('hope_admin_user', JSON.stringify(data.user));
                }

                // Success animation
                btnText.textContent = 'Success!';
                btnIcon.classList.remove('fa-circle-notch', 'spinner');
                btnIcon.classList.add('fa-check');
                btn.classList.remove('opacity-70');
                btn.classList.add('bg-green-500', 'from-green-500', 'to-green-600');

                // Role-based redirect
                const redirectUrl = data.user && data.user.role === 'Parent' ? '/portal.html' : '/admin.html';
                setTimeout(() => {
                    window.location.href = redirectUrl;
                }, 800);
            } else {
                errorText.textContent = data.message || 'Invalid email or password';
                errorDiv.classList.remove('hidden');

                // Shake animation on error
                const card = loginForm.closest('.glass-card');
                card.style.animation = 'none';
                card.offsetHeight; // trigger reflow
                card.style.animation = 'shake 0.5s ease';
            }
        } catch (err) {
            errorText.textContent = 'Unable to connect to server. Please try again.';
            errorDiv.classList.remove('hidden');
        } finally {
            setTimeout(() => {
                btn.disabled = false;
                btn.classList.remove('opacity-70', 'cursor-not-allowed', 'bg-green-500', 'from-green-500', 'to-green-600');
                btnText.textContent = 'Sign In';
                btnIcon.classList.remove('fa-circle-notch', 'spinner', 'fa-check');
                btnIcon.classList.add('fa-arrow-right');
            }, 1500);
        }
    });
});
