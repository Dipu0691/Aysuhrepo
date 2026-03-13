// --- Configuration & State ---
const API_BASE = '';
let token = localStorage.getItem('hope_admin_token');
let currentUser = null;

function parseToken(t) {
    try {
        const base64Url = t.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

if (!token) {
    window.location.href = '/login.html';
} else {
    currentUser = parseToken(token);
    if (!currentUser) {
        localStorage.removeItem('hope_admin_token');
        window.location.href = '/login.html';
    }
}

// --- Global Data Store ---
let globalData = {
    admissions: [],
    contacts: [],
    holidays: [],
    notifications: [],
    gallery: []
};

// --- DOM Loaded Setup ---
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    setupUserUI();
    initAdminDashboard();

    // Setup Hero Category selection
    const cat = document.getElementById('hero-category');
    if (cat) {
        loadHeroData(cat.value);
        cat.addEventListener('change', e => loadHeroData(e.target.value));
    }

    // Event Listeners for Filters/Search
    document.getElementById('search-apps')?.addEventListener('input', renderAdmissions);
    document.getElementById('filter-grade')?.addEventListener('change', renderAdmissions);
    document.getElementById('filter-status')?.addEventListener('change', renderAdmissions);
    document.getElementById('search-messages')?.addEventListener('input', renderContacts);

    // Form Submissions
    document.getElementById('holiday-form')?.addEventListener('submit', handleHolidaySubmit);
    document.getElementById('hero-content-form')?.addEventListener('submit', handleHeroSubmit);
    document.getElementById('fee-form')?.addEventListener('submit', handleFeeSubmit);

    // Search Students
    document.getElementById('search-students')?.addEventListener('input', renderStudents);
});

// --- UI & Helper Functions ---

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    const colors = {
        success: 'bg-green-100 border-green-500 text-green-800 dark:bg-green-900/30 dark:border-green-500/50 dark:text-green-300',
        error: 'bg-red-100 border-red-500 text-red-800 dark:bg-red-900/30 dark:border-red-500/50 dark:text-red-300',
        info: 'bg-blue-100 border-blue-500 text-blue-800 dark:bg-blue-900/30 dark:border-blue-500/50 dark:text-blue-300'
    };
    const icons = {
        success: 'fa-check-circle text-green-500',
        error: 'fa-exclamation-circle text-red-500',
        info: 'fa-info-circle text-blue-500'
    };

    toast.className = `flex items-center gap-3 p-4 rounded-xl border shadow-lg transform transition-all translate-y-2 opacity-0 font-bold text-sm ${colors[type]} pointer-events-auto`;
    toast.innerHTML = `<i class="fas ${icons[type]} text-lg"></i> <div>${message}</div>`;

    container.appendChild(toast);

    // Animate in
    setTimeout(() => {
        toast.classList.remove('translate-y-2', 'opacity-0');
    }, 10);

    // Animate out and remove
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-2');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

function initTheme() {
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
}

window.toggleDarkMode = function () {
    if (document.documentElement.classList.contains('dark')) {
        document.documentElement.classList.remove('dark');
        localStorage.theme = 'light';
    } else {
        document.documentElement.classList.add('dark');
        localStorage.theme = 'dark';
    }
};

window.switchTab = function (tabId) {
    document.querySelectorAll('.admin-section').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('block');
    });

    // Clear styles from all tabs in sidebar
    document.querySelectorAll('#sidebar-nav button').forEach(btn => {
        btn.classList.remove('bg-slate-50', 'dark:bg-slate-800/50', 'text-secondary');
        btn.classList.add('text-slate-600', 'dark:text-slate-400');
    });

    const section = document.getElementById('section-' + tabId);
    if (section) {
        section.classList.remove('hidden');
        section.classList.add('block');
    }

    const activeBtn = document.getElementById('tab-' + tabId);
    if (activeBtn) {
        activeBtn.classList.add('bg-slate-50', 'dark:bg-slate-800/50', 'text-secondary');
        activeBtn.classList.remove('text-slate-600', 'dark:text-slate-400');
    }
};

window.logout = function () {
    localStorage.removeItem('hope_admin_token');
    window.location.href = '/login.html';
};

window.openModal = function (id) {
    const modal = document.getElementById(id);
    modal.classList.remove('hidden');
    // small delay for transition
    setTimeout(() => modal.classList.remove('opacity-0'), 10);
};

window.closeModal = function (id) {
    const modal = document.getElementById(id);
    modal.classList.add('opacity-0');
    setTimeout(() => {
        modal.classList.add('hidden');
        // Reset forms if exists
        const forms = modal.querySelectorAll('form');
        forms.forEach(f => {
            f.reset();
            const idInput = f.querySelector('input[type="hidden"]');
            if (idInput) idInput.value = '';
        });
    }, 300);
};

// Generic export function using SheetJS
window.exportTableToExcel = function (tableId, filename = '') {
    const table = document.getElementById(tableId);
    // Remove last column (Actions) to prevent exporting UI garbage
    const clone = table.cloneNode(true);
    const rows = clone.rows;
    for (let i = 0; i < rows.length; i++) {
        rows[i].deleteCell(-1);
    }

    const wb = XLSX.utils.table_to_book(clone, { sheet: "Sheet 1" });
    XLSX.writeFile(wb, filename + '.xlsx');
    showToast('Export successful!', 'success');
};

// --- Role Management ---
function hasRole(allowedRoles) {
    return currentUser && allowedRoles.includes(currentUser.role);
}

function setupUserUI() {
    if (!currentUser) return;

    document.getElementById('sidebar-role').innerText = currentUser.role;
    document.getElementById('user-name-display').innerText = currentUser.name || currentUser.username;
    document.getElementById('dash-greeting-name').innerText = currentUser.name || currentUser.username;
    if (currentUser.name) document.getElementById('user-avatar').innerText = currentUser.name.charAt(0).toUpperCase();

    // Hide/show Role specific UI
    if (hasRole(['Super Admin'])) {
        document.querySelectorAll('.super-admin-only').forEach(el => el.classList.remove('hidden'));
        document.querySelectorAll('.super-admin-only').forEach(el => { if (el.tagName === 'BUTTON') el.style.display = 'flex'; });
    }

    if (hasRole(['Super Admin', 'Admin'])) {
        document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
        document.querySelectorAll('.admin-only').forEach(el => { if (el.tagName === 'BUTTON') el.style.display = 'flex'; });
    } else {
        // Staff disables admin interactions
        document.querySelectorAll('.admin-only-interactions').forEach(el => el.disabled = true);
        document.querySelectorAll('.admin-only-interactions').forEach(el => el.classList.add('opacity-50', 'cursor-not-allowed'));
    }
}

// --- API Helper ---
async function apiCall(url, method = 'GET', body = null) {
    const headers = { 'Authorization': `Bearer ${token}` };
    if (body instanceof FormData) {
        // Content-Type let browser set it
    } else if (body) {
        headers['Content-Type'] = 'application/json';
        body = JSON.stringify(body);
    }

    try {
        const res = await fetch(url, { method, headers, body });
        const data = await res.json();

        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                showToast(data.message || 'Authentication error', 'error');
                if (res.status === 401) logout();
                return null;
            }
            throw new Error(data.message || 'API Error');
        }
        return data;
    } catch (e) {
        console.error(e);
        showToast(e.message, 'error');
        return null;
    }
}

// --- Admissions Module ---
async function fetchAdmissions() {
    const data = await apiCall('/api/admissions');
    if (data) {
        globalData.admissions = data.reverse();
        renderAdmissions();
        updateDashboardChart();
    }
}

function renderAdmissions() {
    const search = document.getElementById('search-apps')?.value.toLowerCase() || '';
    const gradeFilter = document.getElementById('filter-grade')?.value || 'all';
    const statusFilter = document.getElementById('filter-status')?.value || 'all';

    const filtered = globalData.admissions.filter(a => {
        const matchSearch = a.studentName.toLowerCase().includes(search) || a.parentName.toLowerCase().includes(search);
        const matchGrade = gradeFilter === 'all' || a.grade.includes(gradeFilter);
        const matchStatus = statusFilter === 'all' || a.status === statusFilter;
        return matchSearch && matchGrade && matchStatus;
    });

    const tbody = document.getElementById('admissions-list');
    if (!tbody) return;

    // Update Dashboard Stats too
    document.getElementById('stat-total-apps').innerText = globalData.admissions.length;
    document.getElementById('stat-approved-apps').innerText = globalData.admissions.filter(a => a.status === 'approved').length;
    document.getElementById('stat-pending-apps').innerText = globalData.admissions.filter(a => a.status === 'pending').length;
    document.getElementById('stat-rejected-apps').innerText = globalData.admissions.filter(a => a.status === 'rejected').length;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-slate-400">No applications found.</td></tr>';
        return;
    }

    const statusColors = {
        pending: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
        approved: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',
        rejected: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
    };

    tbody.innerHTML = filtered.map(ad => `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
            <td class="p-4 border-b border-slate-100 dark:border-slate-800 text-slate-500 text-xs">${new Date(ad.dateSubmitted).toLocaleDateString()}</td>
            <td class="p-4 border-b border-slate-100 dark:border-slate-800 font-bold text-primary dark:text-white">
                ${ad.studentName}
                <div class="text-xs text-slate-500 font-normal mt-0.5">Parent: ${ad.parentName}</div>
            </td>
            <td class="p-4 border-b border-slate-100 dark:border-slate-800"><span class="bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded text-xs font-bold">${ad.grade}</span></td>
            <td class="p-4 border-b border-slate-100 dark:border-slate-800">
                <span class="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${statusColors[ad.status || 'pending']}">${ad.status || 'pending'}</span>
            </td>
            <td class="p-4 border-b border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                <a href="tel:${ad.phone}" class="hover:text-secondary block">${ad.phone}</a>
                <a href="mailto:${ad.email}" class="hover:text-secondary block truncate max-w-[150px]">${ad.email}</a>
            </td>
            <td class="p-4 border-b border-slate-100 dark:border-slate-800 text-right sticky right-0 bg-surface dark:bg-surface-dark group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50 transition-colors">
                <div class="flex gap-2 justify-end">
                    <button onclick="viewAppModal(${ad.id})" class="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-secondary hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors" title="View/Edit"><i class="fas fa-eye text-xs"></i></button>
                    ${hasRole(['Super Admin', 'Admin']) ? `<button onclick="deleteApp(${ad.id})" class="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors" title="Delete"><i class="fas fa-trash text-xs"></i></button>` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

window.viewAppModal = function (id) {
    const app = globalData.admissions.find(a => a.id === id);
    if (!app) return;

    document.getElementById('app-edit-id').value = app.id;
    document.getElementById('app-student-name').value = app.studentName;
    document.getElementById('app-grade').value = app.grade;
    document.getElementById('app-parent-name').value = app.parentName;
    document.getElementById('app-phone').value = app.phone;
    document.getElementById('app-email').value = app.email;
    document.getElementById('app-modal-date').innerText = "Submitted: " + new Date(app.dateSubmitted).toLocaleString();

    document.getElementById('btn-save-app').classList.add('hidden'); // Only show if they actually change status

    // Reset Status buttons UI
    setModalAppStatus(app.status || 'pending');

    openModal('app-modal');
};

window.setModalAppStatus = function (status) {
    document.getElementById('app-status-val').value = status;

    // Reset borders
    const btns = ['pending', 'approved', 'rejected'];
    btns.forEach(b => {
        document.getElementById(`btn-status-${b}`).classList.remove('border-amber-500', 'bg-amber-50', 'dark:bg-amber-500/10', 'border-green-500', 'bg-green-50', 'dark:bg-green-500/10', 'border-red-500', 'bg-red-50', 'dark:bg-red-500/10');
        document.getElementById(`btn-status-${b}`).classList.add('border-slate-200', 'dark:border-slate-700');
    });

    if (status === 'pending') {
        document.getElementById('btn-status-pending').classList.remove('border-slate-200', 'dark:border-slate-700');
        document.getElementById('btn-status-pending').classList.add('border-amber-500', 'bg-amber-50', 'dark:bg-amber-500/10');
    } else if (status === 'approved') {
        document.getElementById('btn-status-approved').classList.remove('border-slate-200', 'dark:border-slate-700');
        document.getElementById('btn-status-approved').classList.add('border-green-500', 'bg-green-50', 'dark:bg-green-500/10');
    } else if (status === 'rejected') {
        document.getElementById('btn-status-rejected').classList.remove('border-slate-200', 'dark:border-slate-700');
        document.getElementById('btn-status-rejected').classList.add('border-red-500', 'bg-red-50', 'dark:bg-red-500/10');
    }

    // if changed from original, show save button
    const id = document.getElementById('app-edit-id').value;
    const app = globalData.admissions.find(a => a.id == id);
    if (app && app.status !== status && hasRole(['Super Admin', 'Admin'])) {
        document.getElementById('btn-save-app').classList.remove('hidden');
    }
};

window.saveAppEdit = async function () {
    const id = document.getElementById('app-edit-id').value;
    const status = document.getElementById('app-status-val').value;

    if (!id) return;

    const data = await apiCall(`/api/admissions/${id}`, 'PUT', { status });
    if (data && data.success) {
        showToast('Application status updated', 'success');
        closeModal('app-modal');
        fetchAdmissions();
    }
};

window.deleteApp = async function (id) {
    if (confirm('Are you sure you want to delete this application permanently?')) {
        const res = await apiCall(`/api/admissions/${id}`, 'DELETE');
        if (res && res.success) {
            showToast('Application deleted');
            fetchAdmissions();
        }
    }
};

let chartInstance = null;
function updateDashboardChart() {
    const ctx = document.getElementById('admissionsChart');
    if (!ctx) return;

    // Aggregate by month for the last 6 months
    const appCount = {};
    globalData.admissions.forEach(a => {
        const d = new Date(a.dateSubmitted);
        const monthYear = d.toLocaleString('default', { month: 'short' }) + " '" + d.getFullYear().toString().substr(-2);
        appCount[monthYear] = (appCount[monthYear] || 0) + 1;
    });

    const labels = Object.keys(appCount).reverse();
    const data = Object.values(appCount).reverse();

    if (chartInstance) chartInstance.destroy();

    const isDark = document.documentElement.classList.contains('dark');

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.length ? labels : ['No Data'],
            datasets: [{
                label: 'Monthly Applications',
                data: data.length ? data : [0],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#ffffff',
                pointBorderColor: '#3b82f6',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1, color: isDark ? '#94a3b8' : '#64748b' },
                    grid: { color: isDark ? '#1e293b' : '#f1f5f9' }
                },
                x: {
                    ticks: { color: isDark ? '#94a3b8' : '#64748b' },
                    grid: { display: false }
                }
            }
        }
    });
}

// --- Messages/Contacts Module ---
async function fetchContacts() {
    const data = await apiCall('/api/contacts');
    if (data) {
        globalData.contacts = data.reverse();
        renderContacts();
        updateUnreadBadge();
    }
}

function updateUnreadBadge() {
    const unread = globalData.contacts.filter(c => !c.isRead).length;
    const badge = document.getElementById('unread-badge');
    if (badge) {
        if (unread > 0) {
            badge.innerText = unread;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
}

function renderContacts() {
    const search = document.getElementById('search-messages')?.value.toLowerCase() || '';
    const filtered = globalData.contacts.filter(c =>
        c.name.toLowerCase().includes(search) ||
        (c.subject && c.subject.toLowerCase().includes(search)) ||
        c.message.toLowerCase().includes(search)
    );

    const tbody = document.getElementById('contacts-list');
    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-6 text-center text-slate-400">No messages found.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(c => `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer" onclick="viewMessageModal(${c.id})">
            <td class="p-4 border-b border-slate-100 dark:border-slate-800 text-xs text-slate-500">
                ${!c.isRead ? '<span class="w-2 h-2 rounded-full bg-secondary inline-block mr-1"></span>' : ''}
                ${new Date(c.dateSubmitted).toLocaleString()}
            </td>
            <td class="p-4 border-b border-slate-100 dark:border-slate-800 font-bold text-primary dark:text-white ${!c.isRead ? 'text-secondary' : ''}">
                ${c.name}
            </td>
            <td class="p-4 border-b border-slate-100 dark:border-slate-800 font-medium truncate max-w-[200px]">
                ${c.subject || 'No Subject'}
            </td>
            <td class="p-4 border-b border-slate-100 dark:border-slate-800">
                 ${c.isRead ? '<span class="px-2 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 text-[10px] font-bold">READ</span>' : '<span class="px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-600 text-[10px] font-bold uppercase tracking-wider">NEW</span>'}
            </td>
            <td class="p-4 border-b border-slate-100 dark:border-slate-800 text-right sticky right-0 bg-surface dark:bg-surface-dark group-hover:bg-slate-50 dark:group-hover:bg-slate-800/50 transition-colors">
                 <button onclick="event.stopPropagation(); deleteMessage(${c.id})" class="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors ${!hasRole(['Super Admin', 'Admin']) ? 'hidden' : ''}" title="Delete"><i class="fas fa-trash text-xs"></i></button>
            </td>
        </tr>
    `).join('');
}

window.viewMessageModal = async function (id) {
    const msg = globalData.contacts.find(c => c.id === id);
    if (!msg) return;

    document.getElementById('msg-modal-name').innerText = msg.name;
    document.getElementById('msg-modal-email').innerText = msg.email;
    document.getElementById('msg-modal-email').href = "mailto:" + msg.email;
    document.getElementById('msg-modal-subject').innerText = msg.subject || 'No Subject';
    document.getElementById('msg-modal-body').innerText = msg.message;
    document.getElementById('msg-modal-date').innerText = new Date(msg.dateSubmitted).toLocaleString();

    document.getElementById('msg-reply-btn').href = `mailto:${msg.email}?subject=Re: ${encodeURIComponent(msg.subject || 'Your Inquiry')}`;

    openModal('msg-modal');

    // Mark as read
    if (!msg.isRead) {
        msg.isRead = true;
        await apiCall(`/api/contacts/${id}`, 'PUT', { isRead: true });
        updateUnreadBadge();
        renderContacts();
    }
};

window.deleteMessage = async function (id) {
    if (confirm('Delete this message permanently?')) {
        const res = await apiCall(`/api/contacts/${id}`, 'DELETE');
        if (res && res.success) {
            showToast('Message deleted');
            fetchContacts();
        }
    }
};

// --- Notifications ---
async function fetchNotifications() {
    const data = await apiCall('/api/notifications');
    if (data) {
        globalData.notifications = data;
        renderNotifications();
    }
}

window.markNotificationsRead = async function () {
    await apiCall('/api/notifications/mark-read', 'POST');
    fetchNotifications();
};

function renderNotifications() {
    const list = document.getElementById('notifications-list');
    if (!list) return;

    if (globalData.notifications.length === 0) {
        list.innerHTML = '<div class="text-center text-slate-400 p-4 text-xs">No active notifications</div>';
        return;
    }

    const typeClasses = {
        success: 'bg-green-100 text-green-600 dark:bg-green-500/10 dark:text-green-400',
        warning: 'bg-amber-100 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
        info: 'bg-blue-100 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400'
    };

    const icons = {
        success: 'fa-check-circle',
        warning: 'fa-exclamation-circle',
        info: 'fa-info-circle'
    };

    list.innerHTML = globalData.notifications.map(n => `
        <div class="flex gap-3 items-start p-3 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
            <div class="w-8 h-8 rounded-full flex shrink-0 items-center justify-center ${typeClasses[n.type]}"><i class="fas ${icons[n.type]} text-xs"></i></div>
            <div class="flex-1">
                <p class="text-xs font-bold text-slate-700 dark:text-slate-300 ${!n.read ? 'text-primary dark:text-white' : ''}">${n.message}</p>
                <p class="text-[10px] text-slate-500 mt-0.5">${new Date(n.date).toLocaleString()}</p>
            </div>
            ${!n.read ? '<span class="w-2 h-2 rounded-full bg-secondary self-center shrink-0"></span>' : ''}
        </div>
    `).join('');
}


// --- Holidays Module ---
async function fetchHolidays() {
    const data = await apiCall('/api/holidays');
    if (data) {
        globalData.holidays = data;
        renderHolidays();
    }
}

function renderHolidays() {
    const list = document.getElementById('holidays-list');
    if (!list) return;

    if (globalData.holidays.length === 0) {
        list.innerHTML = '<li class="col-span-full p-6 text-center text-slate-400">No events found.</li>';
        return;
    }

    list.innerHTML = globalData.holidays.map(h => {
        let typeColor = 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400';
        if (h.type === 'Holiday') typeColor = 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400';
        if (h.type === 'Exam') typeColor = 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400';
        if (h.type === 'Function') typeColor = 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400';

        return `
        <li class="p-4 bg-surface dark:bg-surface-dark border ${h.type === 'Holiday' ? 'border-green-100 dark:border-green-900/50' : ''} border-slate-200 dark:border-slate-800 rounded-xl shadow-sm hover:shadow-md transition flex flex-col justify-between">
            <div class="flex justify-between items-start mb-3">
                <div class="flex items-center gap-3">
                    <div class="w-12 h-12 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center text-primary dark:text-white">
                        <span class="text-[10px] font-bold leading-none uppercase tracking-wider text-secondary">${h.month}</span>
                        <span class="text-xl font-black leading-none">${h.date}</span>
                    </div>
                    <div>
                        <h4 class="font-bold text-primary dark:text-white text-sm leading-tight">${h.title}</h4>
                        <span class="${typeColor} px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider mt-1 inline-block">${h.type || 'Event'}</span>
                    </div>
                </div>
                ${hasRole(['Super Admin', 'Admin']) ? `
                <div class="flex gap-1">
                    <button onclick="editHoliday(${h.id})" class="w-7 h-7 rounded bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-secondary hover:bg-blue-50 transition-colors flex items-center justify-center"><i class="fas fa-edit text-xs"></i></button>
                    <button onclick="deleteHoliday(${h.id})" class="w-7 h-7 rounded bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-red-500 hover:bg-red-50 transition-colors flex items-center justify-center"><i class="fas fa-trash text-xs"></i></button>
                </div>` : ''}
            </div>
            <p class="text-xs text-slate-500 dark:text-slate-400">${h.description}</p>
            <div class="text-[10px] text-slate-400 font-bold border-t border-slate-100 dark:border-slate-800 pt-2 mt-2"><i class="fas fa-clock mr-1"></i> Duration: ${h.duration}</div>
        </li>
    `}).join('');
}

async function handleHolidaySubmit(e) {
    e.preventDefault();
    const id = document.getElementById('holiday-id').value;
    const body = {
        month: document.getElementById('holiday-month').value,
        date: document.getElementById('holiday-date').value,
        title: document.getElementById('holiday-title').value,
        description: document.getElementById('holiday-desc').value,
        duration: document.getElementById('holiday-duration').value,
        type: document.getElementById('holiday-type').value
    };

    let res;
    if (id) {
        res = await apiCall(`/api/holidays/${id}`, 'PUT', body);
    } else {
        res = await apiCall('/api/holidays', 'POST', body);
    }

    if (res && res.success) {
        showToast('Event saved successfully', 'success');
        closeModal('holiday-modal');
        fetchHolidays();
    }
}

window.editHoliday = function (id) {
    const h = globalData.holidays.find(x => x.id === id);
    if (h) {
        document.getElementById('holiday-id').value = h.id;
        document.getElementById('holiday-month').value = h.month;
        document.getElementById('holiday-date').value = h.date;
        document.getElementById('holiday-title').value = h.title;
        document.getElementById('holiday-desc').value = h.description;
        document.getElementById('holiday-duration').value = h.duration;
        if (document.getElementById('holiday-type')) document.getElementById('holiday-type').value = h.type || 'Holiday';
        document.getElementById('holiday-modal-title').innerText = 'Edit Event';
        openModal('holiday-modal');
    }
};

window.deleteHoliday = async function (id) {
    if (confirm('Are you sure you want to delete this event?')) {
        const res = await apiCall(`/api/holidays/${id}`, 'DELETE');
        if (res && res.success) {
            showToast('Event deleted');
            fetchHolidays();
        }
    }
};

// --- Gallery Module ---
async function fetchGallery() {
    const data = await apiCall('/api/gallery');
    if (data) {
        globalData.gallery = data;
        renderGallery();
    }
}

function renderGallery() {
    const list = document.getElementById('admin-gallery-grid');
    if (!list) return;

    if (!globalData.gallery || globalData.gallery.length === 0) {
        list.innerHTML = '<div class="col-span-full p-6 text-center text-slate-400">No images in gallery.</div>';
        return;
    }

    list.innerHTML = globalData.gallery.map(img => `
        <div class="relative group rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 aspect-square">
            <img src="${img.url}" alt="${img.alt}" class="w-full h-full object-cover">
            <div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4">
                <p class="text-xs text-white text-center font-medium line-clamp-2 mb-3">${img.alt}</p>
                <button onclick="deleteGalleryImage(${img.id})" class="admin-only-interactions px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded shadow-sm transition-colors">
                    <i class="fas fa-trash mr-1"></i> Delete
                </button>
            </div>
        </div>
    `).join('');

    applyRoleBasedUI();
}

window.openGalleryModal = function () {
    document.getElementById('gallery-form').reset();
    openModal('gallery-modal');
};

document.getElementById('gallery-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const url = document.getElementById('gallery-url').value;
    const alt = document.getElementById('gallery-alt').value;

    const res = await apiCall('/api/gallery', 'POST', { url, alt });
    if (res && res.success) {
        showToast('Image added to gallery!', 'success');
        closeModal('gallery-modal');
        fetchGallery();
    }
});

window.deleteGalleryImage = async function (id) {
    if (confirm('Are you sure you want to delete this image?')) {
        const res = await apiCall(`/api/gallery/${id}`, 'DELETE');
        if (res && res.success) {
            showToast('Image deleted from gallery');
            fetchGallery();
        }
    }
};

// --- Hero Settings ---
const heroPages = [
    { id: 'home', label: 'Homepage Hero' },
    { id: 'academics', label: 'Academics Hero' },
    { id: 'about', label: 'About Page Hero' },
    { id: 'activities', label: 'Activities Page Hero' }
];

async function fetchHeroList() {
    const container = document.getElementById('hero-accordion-container');
    if (!container) return;

    let html = '';

    // Fetch individual states for each predefined page
    for (const page of heroPages) {
        let data = {};
        try {
            const response = await apiCall(`/api/content/${page.id}`);
            data = response.pageData || response || {};
        } catch (e) { }

        const enabled = data.enabled !== false; // Default true
        const statusBadge = enabled
            ? '<span class="px-2 py-1 rounded bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400 text-[10px] font-bold uppercase tracking-wider">Enabled</span>'
            : '<span class="px-2 py-1 rounded bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider">Disabled</span>';

        html += `
            <div class="bg-surface dark:bg-surface-dark border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden mb-4">
                <!-- Accordion Header -->
                <button type="button" onclick="toggleHeroAccordion('${page.id}')" class="w-full text-left p-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 text-secondary flex items-center justify-center">
                            <i class="fas fa-image"></i>
                        </div>
                        <div>
                            <h3 class="font-bold text-primary dark:text-white">${page.label}</h3>
                            <div class="mt-1">${statusBadge}</div>
                        </div>
                    </div>
                    <i class="fas fa-chevron-down text-slate-400 transition-transform duration-300" id="hero-icon-${page.id}"></i>
                </button>

                <!-- Accordion Body (Collapsible) -->
                <div id="hero-body-${page.id}" class="hidden border-t border-slate-100 dark:border-slate-800">
                    <div class="p-6">
                        <form id="hero-form-${page.id}" class="space-y-6 text-sm" onsubmit="saveHeroSettings(event, '${page.id}')">
                            <!-- Section Enable -->
                            <div class="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-3 rounded-lg inline-flex">
                                <span class="text-sm font-bold text-slate-700 dark:text-slate-300">Enable Hero</span>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" id="hero-enabled-${page.id}" class="sr-only peer" ${enabled ? 'checked' : ''}>
                                    <div class="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-slate-600 peer-checked:bg-secondary"></div>
                                </label>
                            </div>

                            <!-- Image & Title -->
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Background Image</label>
                                    <div class="flex items-center gap-4">
                                        <img id="hero-preview-${page.id}" src="${data.heroImage || ''}" class="h-20 w-32 object-cover rounded-lg bg-slate-100 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 ${data.heroImage ? '' : 'hidden'}">
                                        <div class="relative">
                                            <button type="button" class="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 text-xs font-bold py-2 px-4 rounded-lg pointer-events-none relative z-0">
                                                <i class="fas fa-upload mr-1"></i> Upload
                                            </button>
                                            <input type="file" id="hero-image-${page.id}" accept="image/*" onchange="previewHeroImage(this, 'hero-preview-${page.id}')" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10">
                                        </div>
                                    </div>
                                    <input type="hidden" id="hero-current-image-${page.id}" value="${data.heroImage || ''}">
                                </div>
                                <div class="space-y-4">
                                    <div>
                                        <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Main Title</label>
                                        <input type="text" id="hero-title-${page.id}" value="${data.heroTitle || ''}" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 outline-none focus:border-secondary dark:text-white transition">
                                    </div>
                                    <div>
                                        <label class="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Subtitle</label>
                                        <textarea id="hero-subtitle-${page.id}" rows="2" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg p-2.5 outline-none focus:border-secondary dark:text-white transition resize-none">${data.heroSubtitle || ''}</textarea>
                                    </div>
                                </div>
                            </div>

                            <!-- Buttons Configuration -->
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6 border-t border-slate-100 dark:border-slate-800 pt-6">
                                <!-- Primary Button -->
                                <div class="space-y-3 bg-slate-50 p-4 rounded-xl dark:bg-slate-800/30">
                                    <div class="flex items-center justify-between pointer-events-none pb-2 border-b border-slate-200 dark:border-slate-700/50">
                                        <h4 class="text-xs font-bold text-primary dark:text-slate-300">Primary Button</h4>
                                        <label class="relative inline-flex items-center cursor-pointer pointer-events-auto">
                                            <input type="checkbox" id="hero-btn1-show-${page.id}" class="sr-only peer" ${data.heroBtn1Show !== false ? 'checked' : ''}>
                                            <div class="w-7 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-secondary"></div>
                                        </label>
                                    </div>
                                    <div class="grid grid-cols-2 gap-3">
                                        <div>
                                            <label class="block text-[10px] text-slate-400 mb-1">Text</label>
                                            <input type="text" id="hero-btn1-text-${page.id}" value="${data.heroBtn1Text || ''}" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md p-1.5 text-xs outline-none dark:text-white">
                                        </div>
                                        <div>
                                            <label class="block text-[10px] text-slate-400 mb-1">Style</label>
                                            <select id="hero-btn1-style-${page.id}" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md p-1.5 text-xs outline-none dark:text-white">
                                                <option value="solid" ${data.heroBtn1Style === 'solid' ? 'selected' : ''}>Solid</option>
                                                <option value="outline" ${data.heroBtn1Style === 'outline' ? 'selected' : ''}>Outline</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label class="block text-[10px] text-slate-400 mb-1">Link URL</label>
                                        <input type="text" id="hero-btn1-link-${page.id}" value="${data.heroBtn1Link || ''}" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md p-1.5 text-xs outline-none dark:text-white">
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <input type="checkbox" id="hero-btn1-newtab-${page.id}" class="w-3 h-3 text-secondary rounded focus:ring-secondary dark:focus:ring-secondary" ${data.heroBtn1NewTab ? 'checked' : ''}>
                                        <label class="text-[10px] text-slate-500">Open in a new tab</label>
                                    </div>
                                </div>

                                <!-- Secondary Button -->
                                <div class="space-y-3 bg-slate-50 p-4 rounded-xl dark:bg-slate-800/30">
                                    <div class="flex items-center justify-between pointer-events-none pb-2 border-b border-slate-200 dark:border-slate-700/50">
                                        <h4 class="text-xs font-bold text-primary dark:text-slate-300">Secondary Button</h4>
                                        <label class="relative inline-flex items-center cursor-pointer pointer-events-auto">
                                            <input type="checkbox" id="hero-btn2-show-${page.id}" class="sr-only peer" ${data.heroBtn2Show !== false ? 'checked' : ''}>
                                            <div class="w-7 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-secondary"></div>
                                        </label>
                                    </div>
                                    <div class="grid grid-cols-2 gap-3">
                                        <div>
                                            <label class="block text-[10px] text-slate-400 mb-1">Text</label>
                                            <input type="text" id="hero-btn2-text-${page.id}" value="${data.heroBtn2Text || ''}" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md p-1.5 text-xs outline-none dark:text-white">
                                        </div>
                                        <div>
                                            <label class="block text-[10px] text-slate-400 mb-1">Style</label>
                                            <select id="hero-btn2-style-${page.id}" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md p-1.5 text-xs outline-none dark:text-white">
                                                <option value="solid" ${data.heroBtn2Style === 'solid' ? 'selected' : ''}>Solid</option>
                                                <option value="outline" ${data.heroBtn2Style === 'outline' ? 'selected' : ''}>Outline</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label class="block text-[10px] text-slate-400 mb-1">Link URL</label>
                                        <input type="text" id="hero-btn2-link-${page.id}" value="${data.heroBtn2Link || ''}" class="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md p-1.5 text-xs outline-none dark:text-white">
                                    </div>
                                    <div class="flex items-center gap-2">
                                        <input type="checkbox" id="hero-btn2-newtab-${page.id}" class="w-3 h-3 text-secondary rounded focus:ring-secondary dark:focus:ring-secondary" ${data.heroBtn2NewTab ? 'checked' : ''}>
                                        <label class="text-[10px] text-slate-500">Open in a new tab</label>
                                    </div>
                                </div>
                            </div>
                            <!-- Save Actions -->
                            <div class="mt-4 flex justify-end">
                                <button type="submit" class="bg-secondary text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-secondary/90 transition shadow-sm flex items-center gap-2" id="hero-save-btn-${page.id}">
                                    <i class="fas fa-save"></i> Save Settings
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

window.toggleHeroAccordion = function (id) {
    const body = document.getElementById(`hero-body-${id}`);
    const icon = document.getElementById(`hero-icon-${id}`);

    if (body.classList.contains('hidden')) {
        body.classList.remove('hidden');
        icon.classList.add('rotate-180');
    } else {
        body.classList.add('hidden');
        icon.classList.remove('rotate-180');
    }
};

window.previewHeroImage = function (input, previewId) {
    if (input.files && input.files[0]) {
        const reader = new FileReader();
        reader.onload = function (e) {
            const preview = document.getElementById(previewId);
            preview.src = e.target.result;
            preview.classList.remove('hidden');
        }
        reader.readAsDataURL(input.files[0]);
    }
};

window.saveHeroSettings = async function (e, categoryId) {
    e.preventDefault();
    const btn = document.getElementById(`hero-save-btn-${categoryId}`);
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    btn.disabled = true;

    try {
        const imageInput = document.getElementById(`hero-image-${categoryId}`);
        let imageUrl = document.getElementById(`hero-current-image-${categoryId}`).value;

        // Handle Image Upload First
        if (imageInput.files && imageInput.files[0]) {
            const file = imageInput.files[0];
            const formData = new FormData();
            formData.append('image', file);

            const uploadRes = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            const uploadData = await uploadRes.json();

            if (uploadData.success) {
                imageUrl = uploadData.imageUrl;
                document.getElementById(`hero-current-image-${categoryId}`).value = imageUrl;
            } else {
                throw new Error(uploadData.message || 'Image upload failed');
            }
        }

        // Build Payload
        const body = {
            heroTitle: document.getElementById(`hero-title-${categoryId}`).value,
            heroSubtitle: document.getElementById(`hero-subtitle-${categoryId}`).value,

            heroBtn1Text: document.getElementById(`hero-btn1-text-${categoryId}`).value,
            heroBtn1Link: document.getElementById(`hero-btn1-link-${categoryId}`).value,
            heroBtn1NewTab: document.getElementById(`hero-btn1-newtab-${categoryId}`).checked,
            heroBtn1Show: document.getElementById(`hero-btn1-show-${categoryId}`).checked,
            heroBtn1Style: document.getElementById(`hero-btn1-style-${categoryId}`).value,

            heroBtn2Text: document.getElementById(`hero-btn2-text-${categoryId}`).value,
            heroBtn2Link: document.getElementById(`hero-btn2-link-${categoryId}`).value,
            heroBtn2NewTab: document.getElementById(`hero-btn2-newtab-${categoryId}`).checked,
            heroBtn2Show: document.getElementById(`hero-btn2-show-${categoryId}`).checked,
            heroBtn2Style: document.getElementById(`hero-btn2-style-${categoryId}`).value,

            enabled: document.getElementById(`hero-enabled-${categoryId}`).checked,
            heroImage: imageUrl
        };

        const res = await apiCall(`/api/content/${categoryId}`, 'POST', body);
        if (res && res.success) {
            showToast('Hero settings saved!', 'success');
            // Optimistically update badge without full re-render
            setTimeout(() => { fetchHeroList(); }, 500);
        }
    } catch (err) {
        showToast('Error: ' + err.message, 'error');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// =============================================
// STUDENTS MODULE
// =============================================
globalData.students = [];

async function fetchStudents() {
    const data = await apiCall('/api/students');
    if (data) {
        globalData.students = data;
        renderStudents();
        populateStudentDropdown();
    }
}

function renderStudents() {
    const search = document.getElementById('search-students')?.value.toLowerCase() || '';
    const filtered = globalData.students.filter(s =>
        (s.name || '').toLowerCase().includes(search) ||
        (s.studentName || '').toLowerCase().includes(search) ||
        (s.email || '').toLowerCase().includes(search)
    );
    const tbody = document.getElementById('students-list');
    if (!tbody) return;

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-slate-400">No registered students found.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(s => `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <td class="p-4 font-bold text-primary dark:text-white">
                ${s.name}
                <div class="text-xs text-slate-500 font-normal mt-0.5">${s.email}</div>
            </td>
            <td class="p-4 font-medium">${s.studentName || '—'}</td>
            <td class="p-4"><span class="bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded text-xs font-bold">${s.studentGrade || '—'}</span></td>
            <td class="p-4 text-xs text-slate-500">${s.phone || '—'}</td>
            <td class="p-4 text-xs text-slate-500">${new Date(s.createdAt).toLocaleDateString()}</td>
            <td class="p-4 text-right">
                ${hasRole(['Super Admin', 'Admin']) ? `<button onclick="deleteStudent('${s.id}')" class="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors" title="Delete"><i class="fas fa-trash text-xs"></i></button>` : ''}
            </td>
        </tr>
    `).join('');
}

function populateStudentDropdown() {
    const select = document.getElementById('fee-student-id');
    if (!select) return;
    select.innerHTML = '<option value="">Select a student...</option>' +
        globalData.students.map(s => `<option value="${s.id}">${s.studentName || s.name} (${s.studentGrade || 'N/A'}) - ${s.email}</option>`).join('');
}

window.deleteStudent = async function (id) {
    if (confirm('Delete this student and all their fee records permanently?')) {
        const res = await apiCall(`/api/students/${id}`, 'DELETE');
        if (res && res.success) {
            showToast('Student deleted');
            fetchStudents();
            fetchAdminFees();
        }
    }
};

// =============================================
// FEE MANAGEMENT MODULE
// =============================================
globalData.fees = [];

async function fetchAdminFees() {
    const data = await apiCall('/api/fees');
    if (data) {
        globalData.fees = data;
        renderAdminFees();
        updateAdminFeeStats();
    }
}

function updateAdminFeeStats() {
    const total = globalData.fees.reduce((sum, f) => sum + f.amount, 0);
    const paid = globalData.fees.filter(f => f.status === 'paid').reduce((sum, f) => sum + f.amount, 0);
    const pending = total - paid;

    const el = id => document.getElementById(id);
    if (el('admin-fee-total')) el('admin-fee-total').innerText = '₹' + total.toLocaleString('en-IN');
    if (el('admin-fee-collected')) el('admin-fee-collected').innerText = '₹' + paid.toLocaleString('en-IN');
    if (el('admin-fee-pending')) el('admin-fee-pending').innerText = '₹' + pending.toLocaleString('en-IN');
}

function renderAdminFees() {
    const tbody = document.getElementById('fees-list');
    if (!tbody) return;

    if (globalData.fees.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="p-6 text-center text-slate-400">No fee records found. Click "Add Fee" to create one.</td></tr>';
        return;
    }

    const statusColors = {
        pending: 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
        paid: 'bg-green-100 text-green-700 dark:bg-green-500/10 dark:text-green-400',
        overdue: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400'
    };

    tbody.innerHTML = globalData.fees.map(f => {
        const student = f.studentId || {};
        return `
        <tr class="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <td class="p-4 font-bold text-primary dark:text-white">
                ${student.studentName || student.name || '—'}
                <div class="text-xs text-slate-500 font-normal mt-0.5">${student.studentGrade || ''} • ${student.email || ''}</div>
            </td>
            <td class="p-4 font-medium">${f.description}</td>
            <td class="p-4 font-black">₹${f.amount.toLocaleString('en-IN')}</td>
            <td class="p-4 text-xs text-slate-500">${new Date(f.dueDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</td>
            <td class="p-4">
                <span class="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${statusColors[f.status]}">${f.status}</span>
            </td>
            <td class="p-4 text-right">
                <div class="flex gap-1 justify-end">
                    ${f.status !== 'paid' && hasRole(['Super Admin', 'Admin']) ? `<button onclick="markFeePaid('${f.id}')" class="w-8 h-8 rounded-lg bg-green-50 dark:bg-green-900/30 text-green-600 hover:bg-green-100 transition-colors" title="Mark Paid"><i class="fas fa-check text-xs"></i></button>` : ''}
                    ${hasRole(['Super Admin', 'Admin']) ? `<button onclick="deleteAdminFee('${f.id}')" class="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete"><i class="fas fa-trash text-xs"></i></button>` : ''}
                </div>
            </td>
        </tr>`;
    }).join('');
}

async function handleFeeSubmit(e) {
    e.preventDefault();
    const body = {
        studentId: document.getElementById('fee-student-id').value,
        description: document.getElementById('fee-description').value,
        amount: parseFloat(document.getElementById('fee-amount').value),
        dueDate: document.getElementById('fee-due-date').value
    };

    const res = await apiCall('/api/fees', 'POST', body);
    if (res && res.success) {
        showToast('Fee record created!', 'success');
        closeModal('fee-modal');
        fetchAdminFees();
    }
}

window.markFeePaid = async function (id) {
    if (confirm('Mark this fee as paid?')) {
        const res = await apiCall(`/api/fees/${id}`, 'PUT', { status: 'paid' });
        if (res && res.success) {
            showToast('Fee marked as paid', 'success');
            fetchAdminFees();
        }
    }
};

window.deleteAdminFee = async function (id) {
    if (confirm('Delete this fee record permanently?')) {
        const res = await apiCall(`/api/fees/${id}`, 'DELETE');
        if (res && res.success) {
            showToast('Fee deleted');
            fetchAdminFees();
        }
    }
};

// --- Auto-load Students & Fees on page load ---
if (hasRole(['Super Admin', 'Admin', 'Staff'])) {
    fetchStudents();
    fetchAdminFees();
}
