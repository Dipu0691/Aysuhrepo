const token = localStorage.getItem('hope_admin_token');
if (!token) {
    window.location.href = '/login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    fetchAdmissions();
    fetchHolidays();
    fetchAcademicsContent();
    fetchHomeContent();

    const holidayForm = document.getElementById('holiday-form');
    holidayForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const id = document.getElementById('holiday-id').value;
        const month = document.getElementById('holiday-month').value;
        const date = document.getElementById('holiday-date').value;
        const title = document.getElementById('holiday-title').value;
        const desc = document.getElementById('holiday-desc').value;
        const duration = document.getElementById('holiday-duration').value;

        // If editing, we will delete the old one first for simplicity, then add new
        if (id) {
            await fetch(`/api/holidays/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        }

        await fetch('/api/holidays', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ month, date, title, description: desc, duration })
        });

        document.getElementById('add-holiday-modal').classList.add('hidden');
        holidayForm.reset();
        document.getElementById('holiday-id').value = '';
        fetchHolidays();
    });

    const academicsForm = document.getElementById('academics-content-form');
    if (academicsForm) {
        academicsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button');
            const originalText = btn.innerText;
            btn.innerText = 'Saving...';
            btn.disabled = true;

            const title = document.getElementById('academics-hero-title').value;
            const subtitle = document.getElementById('academics-hero-subtitle').value;
            const imageInput = document.getElementById('academics-hero-image');

            let imageUrl = window.currentAcademicsImage || '';

            // Handle Image Upload First
            if (imageInput.files && imageInput.files[0]) {
                const formData = new FormData();
                formData.append('image', imageInput.files[0]);
                try {
                    const uploadRes = await fetch('/api/upload', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                        body: formData
                    });
                    const uploadData = await uploadRes.json();
                    if (uploadData.success) {
                        imageUrl = uploadData.imageUrl;
                        window.currentAcademicsImage = imageUrl;
                        document.getElementById('academics-hero-preview').src = imageUrl;
                        document.getElementById('academics-hero-preview').classList.remove('hidden');
                    }
                } catch (err) {
                    console.error("Image upload failed", err);
                }
            }

            // Save Content Data
            try {
                await fetch('/api/content/academics', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ heroTitle: title, heroSubtitle: subtitle, heroImage: imageUrl })
                });

                const msg = document.getElementById('content-save-msg');
                msg.classList.remove('hidden');
                setTimeout(() => msg.classList.add('hidden'), 3000);
            } catch (e) {
                console.error("Failed to save content", e);
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        });
    }

    fetchAcademicsContent();
});

document.addEventListener('DOMContentLoaded', () => {
    const heroForm = document.getElementById('hero-content-form');
    if (heroForm) {
        heroForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button');
            const originalText = btn.innerText;
            btn.innerText = 'Saving...';
            btn.disabled = true;

            const title = document.getElementById('hero-title').value;
            const subtitle = document.getElementById('hero-subtitle').value;
            const btn1Text = document.getElementById('hero-btn1-text').value;
            const btn1Link = document.getElementById('hero-btn1-link').value;
            const btn2Text = document.getElementById('hero-btn2-text').value;
            const btn2Link = document.getElementById('hero-btn2-link').value;
            const imageInput = document.getElementById('hero-image');

            let imageUrl = window.currentHeroImage || '';

            if (imageInput.files && imageInput.files[0]) {
                const formData = new FormData();
                formData.append('image', imageInput.files[0]);
                try {
                    const uploadRes = await fetch('/api/upload', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                        body: formData
                    });
                    const uploadData = await uploadRes.json();
                    if (uploadData.success) {
                        imageUrl = uploadData.imageUrl;
                        window.currentHeroImage = imageUrl;
                        document.getElementById('hero-preview').src = imageUrl;
                        document.getElementById('hero-preview').classList.remove('hidden');
                    }
                } catch (err) {
                    console.error("Image upload failed", err);
                }
            }

            try {
                await fetch('/api/content/home', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ heroTitle: title, heroSubtitle: subtitle, heroBtn1Text: btn1Text, heroBtn1Link: btn1Link, heroBtn2Text: btn2Text, heroBtn2Link: btn2Link, heroImage: imageUrl })
                });

                const msg = document.getElementById('hero-save-msg');
                msg.classList.remove('hidden');
                setTimeout(() => msg.classList.add('hidden'), 3000);
            } catch (e) {
                console.error("Failed to save homepage content", e);
            } finally {
                btn.innerText = originalText;
                btn.disabled = false;
            }
        });
    }
});

async function fetchAdmissions() {
    try {
        const res = await fetch('/api/admissions');
        const data = await res.json();
        const tbody = document.getElementById('admissions-list');
        const statEl = document.getElementById('stat-admissions');

        if (statEl) statEl.innerText = data.length;

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="p-4 text-center text-slate-500">No admissions yet.</td></tr>';
            return;
        }

        tbody.innerHTML = data.reverse().map(ad => `
            <tr class="hover:bg-slate-50 transition-colors">
                <td class="p-3 font-medium text-primary">${ad.studentName}</td>
                <td class="p-3"><span class="bg-secondary/10 text-secondary px-2 py-1 rounded text-xs font-bold">${ad.grade}</span></td>
                <td class="p-3">${ad.parentName}</td>
                <td class="p-3 text-xs text-slate-500">${ad.phone}<br>${ad.email}</td>
            </tr>
        `).join('');

    } catch (e) {
        document.getElementById('admissions-list').innerHTML = `<tr><td colspan="4" class="p-4 text-center text-red-500">Error fetching admissions. Is backend running?</td></tr>`;
    }
}

async function fetchHolidays() {
    try {
        const res = await fetch('/api/holidays');
        window.holidaysData = await res.json();
        const list = document.getElementById('holidays-list');
        const statEl = document.getElementById('stat-holidays');

        if (statEl) statEl.innerText = window.holidaysData.length;

        if (window.holidaysData.length === 0) {
            list.innerHTML = '<li class="p-4 text-center text-slate-500">No holidays found.</li>';
            return;
        }

        list.innerHTML = window.holidaysData.map(h => `
            <li class="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-secondary/10 rounded-full flex flex-col items-center justify-center text-secondary">
                        <span class="text-[10px] font-bold leading-none mt-1">${h.month}</span>
                        <span class="text-sm font-black leading-none">${h.date}</span>
                    </div>
                    <div>
                        <h4 class="font-bold text-primary text-sm">${h.title}</h4>
                        <p class="text-[10px] text-slate-500">${h.description} • ${h.duration}</p>
                    </div>
                </div>
                <div class="flex gap-2">
                    <button onclick="editHoliday(${h.id})" class="w-8 h-8 rounded bg-primary/10 text-primary hover:bg-primary hover:text-white transition-colors flex items-center justify-center"><i class="fas fa-edit text-xs"></i></button>
                    <button onclick="deleteHoliday(${h.id})" class="w-8 h-8 rounded bg-red-100 text-red-600 hover:bg-red-600 hover:text-white transition-colors flex items-center justify-center"><i class="fas fa-trash text-xs"></i></button>
                </div>
            </li>
        `).join('');
    } catch (e) {
        document.getElementById('holidays-list').innerHTML = `<li class="p-4 text-center text-red-500">Error fetching holidays</li>`;
    }
}

function editHoliday(id) {
    const h = window.holidaysData.find(x => x.id === id);
    if (h) {
        document.getElementById('holiday-id').value = h.id;
        document.getElementById('holiday-month').value = h.month;
        document.getElementById('holiday-date').value = h.date;
        document.getElementById('holiday-title').value = h.title;
        document.getElementById('holiday-desc').value = h.description;
        document.getElementById('holiday-duration').value = h.duration;
        document.getElementById('modal-title').innerText = 'Edit Holiday';
        document.getElementById('add-holiday-modal').classList.remove('hidden');
    }
}

async function deleteHoliday(id) {
    if (confirm('Are you sure you want to delete this holiday?')) {
        await fetch(`/api/holidays/${id}`, { method: 'DELETE' });
        fetchHolidays();
    }
}

async function fetchAcademicsContent() {
    try {
        const res = await fetch('/api/content/academics');
        const data = await res.json();

        if (data.heroTitle) document.getElementById('academics-hero-title').value = data.heroTitle;
        if (data.heroSubtitle) document.getElementById('academics-hero-subtitle').value = data.heroSubtitle;
        if (data.heroImage) {
            window.currentAcademicsImage = data.heroImage;
            document.getElementById('academics-hero-preview').src = data.heroImage;
            document.getElementById('academics-hero-preview').classList.remove('hidden');
        }
    } catch (e) {
        console.error("Failed to load generics", e);
    }
}

async function fetchHomeContent() {
    try {
        const res = await fetch('/api/content/home');
        const data = await res.json();

        if (data.heroTitle) document.getElementById('hero-title').value = data.heroTitle;
        if (data.heroSubtitle) document.getElementById('hero-subtitle').value = data.heroSubtitle;
        if (data.heroBtn1Text) document.getElementById('hero-btn1-text').value = data.heroBtn1Text;
        if (data.heroBtn1Link) document.getElementById('hero-btn1-link').value = data.heroBtn1Link;
        if (data.heroBtn2Text) document.getElementById('hero-btn2-text').value = data.heroBtn2Text;
        if (data.heroBtn2Link) document.getElementById('hero-btn2-link').value = data.heroBtn2Link;

        if (data.heroImage) {
            window.currentHeroImage = data.heroImage;
            document.getElementById('hero-preview').src = data.heroImage;
            document.getElementById('hero-preview').classList.remove('hidden');
        }
    } catch (e) {
        console.error("Failed to load generic content", e);
    }
}

// Global functions for Sidebar Navigation
window.switchTab = function (tabId) {
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(el => {
        el.classList.add('hidden');
        el.classList.remove('block');
    });

    // Reset all tabs active state
    ['dashboard', 'hero', 'calendar', 'academics'].forEach(id => {
        const btn = document.getElementById('tab-' + id);
        if (btn) {
            btn.classList.remove('bg-white/10', 'text-white');
            btn.classList.add('text-slate-300');
        }
    });

    // Show active section
    const section = document.getElementById('section-' + tabId);
    if (section) {
        section.classList.remove('hidden');
        section.classList.add('block');
    }

    // Set active tab
    const activeBtn = document.getElementById('tab-' + tabId);
    if (activeBtn) {
        activeBtn.classList.add('bg-white/10', 'text-white');
        activeBtn.classList.remove('text-slate-300');
    }
};

window.logout = function () {
    localStorage.removeItem('hope_admin_token');
    window.location.href = '/login.html';
};
