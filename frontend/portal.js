// --- Configuration ---
const token = localStorage.getItem('hope_admin_token');
let currentUser = null;

function parseToken(t) {
    try {
        const base64Url = t.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(c =>
            '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

if (!token) {
    window.location.href = '/login.html';
} else {
    currentUser = parseToken(token);
    if (!currentUser || (currentUser.role !== 'Parent')) {
        // If not a parent, redirect to admin or login
        if (currentUser && ['Super Admin', 'Admin', 'Staff'].includes(currentUser.role)) {
            window.location.href = '/admin.html';
        } else {
            localStorage.removeItem('hope_admin_token');
            window.location.href = '/login.html';
        }
    }
}

// --- State ---
let profileData = {};
let feesData = [];

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupUI();
    fetchProfile();
    fetchFees();
    switchTab('dashboard');
    document.getElementById('profile-form')?.addEventListener('submit', handleProfileSave);
});

// --- API Helper ---
async function apiCall(url, method = 'GET', body = null) {
    const headers = { 'Authorization': `Bearer ${token}` };
    if (body) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(body);
    }
    try {
        const res = await fetch(url, { method, headers, body });
        const data = await res.json();
        if (!res.ok) {
            if (res.status === 401) { logout(); return null; }
            throw new Error(data.message || 'API Error');
        }
        return data;
    } catch (e) {
        console.error(e);
        showToast(e.message, 'error');
        return null;
    }
}

// --- Theme ---
function initTheme() {
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    }
}

window.toggleDarkMode = function () {
    document.documentElement.classList.toggle('dark');
    localStorage.theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
};

// --- UI ---
function setupUI() {
    if (!currentUser) return;
    document.getElementById('user-name-display').innerText = currentUser.name || 'Parent';
    document.getElementById('user-avatar').innerText = (currentUser.name || 'P').charAt(0).toUpperCase();
    document.getElementById('dash-parent-name').innerText = currentUser.name || 'Parent';
}

window.switchTab = function (tabId) {
    document.querySelectorAll('.portal-section').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('block');
    });
    document.querySelectorAll('nav button').forEach(btn => {
        btn.classList.remove('bg-slate-50', 'dark:bg-slate-800/50', 'text-secondary');
        btn.classList.add('text-slate-600', 'dark:text-slate-400');
    });
    const section = document.getElementById('section-' + tabId);
    if (section) { section.classList.remove('hidden'); section.classList.add('block'); }
    const activeBtn = document.getElementById('tab-' + tabId);
    if (activeBtn) {
        activeBtn.classList.add('bg-slate-50', 'dark:bg-slate-800/50', 'text-secondary');
        activeBtn.classList.remove('text-slate-600', 'dark:text-slate-400');
    }
};

window.logout = function () {
    localStorage.removeItem('hope_admin_token');
    localStorage.removeItem('hope_admin_user');
    window.location.href = '/login.html';
};

// --- Profile ---
async function fetchProfile() {
    const data = await apiCall('/api/my/profile');
    if (data) {
        profileData = data;
        document.getElementById('dash-student-name').innerText = data.studentName || 'your student';
        document.getElementById('dash-student-name-card').innerText = data.studentName || '—';
        document.getElementById('dash-student-grade').innerText = data.studentGrade || '—';
        // Profile form
        document.getElementById('profile-name').value = data.name || '';
        document.getElementById('profile-phone').value = data.phone || '';
        document.getElementById('profile-email').value = data.email || '';
        document.getElementById('profile-student').value = data.studentName || '';
        document.getElementById('profile-grade').value = data.studentGrade || '';
    }
}

async function handleProfileSave(e) {
    e.preventDefault();
    const body = {
        name: document.getElementById('profile-name').value.trim(),
        phone: document.getElementById('profile-phone').value.trim(),
        studentName: document.getElementById('profile-student').value.trim(),
        studentGrade: document.getElementById('profile-grade').value
    };
    const data = await apiCall('/api/my/profile', 'PUT', body);
    if (data && data.success) {
        showToast('Profile updated successfully!', 'success');
        fetchProfile();
    }
}

// --- Fees ---
async function fetchFees() {
    const data = await apiCall('/api/my/fees');
    if (data) {
        feesData = data;
        renderFees();
        updateFeeSummary();
    }
}

function updateFeeSummary() {
    const total = feesData.reduce((sum, f) => sum + f.amount, 0);
    const paid = feesData.filter(f => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0);
    const pending = total - paid;

    document.getElementById('fee-total').innerText = '₹' + total.toLocaleString('en-IN');
    document.getElementById('fee-paid').innerText = '₹' + paid.toLocaleString('en-IN');
    document.getElementById('fee-pending').innerText = '₹' + pending.toLocaleString('en-IN');

    // Dashboard cards
    document.getElementById('dash-total-fees').innerText = '₹' + total.toLocaleString('en-IN');
    document.getElementById('dash-paid-fees').innerText = '₹' + paid.toLocaleString('en-IN');
    document.getElementById('dash-pending-fees').innerText = '₹' + pending.toLocaleString('en-IN');
}

function renderFees() {
    const tbody = document.getElementById('fee-list');
    if (!tbody) return;

    if (feesData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-slate-400">No fee records found.</td></tr>';
        return;
    }

    const statusColors = {
        pending: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
        paid: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',
        overdue: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
    };

    tbody.innerHTML = feesData.map(f => `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <td class="p-4 font-bold text-primary dark:text-white">${f.description}</td>
            <td class="p-4 font-black text-lg">₹${f.amount.toLocaleString('en-IN')}</td>
            <td class="p-4 text-slate-500 text-xs">${new Date(f.dueDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
            <td class="p-4">
                <span class="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${statusColors[f.status]}">${f.status}</span>
            </td>
            <td class="p-4 text-xs text-slate-500">
                ${f.receiptNo ? '<i class="fas fa-receipt text-green-500 mr-1"></i>' + f.receiptNo : '<span class="text-slate-400">—</span>'}
            </td>
        </tr>
    `).join('');
}

// --- Toast ---
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const colors = {
        success: 'bg-green-100 border-green-500 text-green-800 dark:bg-green-900/30 dark:text-green-300',
        error: 'bg-red-100 border-red-500 text-red-800 dark:bg-red-900/30 dark:text-red-300',
        info: 'bg-blue-100 border-blue-500 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
    };
    toast.className = `flex items-center gap-3 p-4 rounded-xl border shadow-lg font-bold text-sm ${colors[type]} pointer-events-auto`;
    toast.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i> <div>${message}</div>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 4000);
}
