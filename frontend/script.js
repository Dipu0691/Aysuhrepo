document.addEventListener('DOMContentLoaded', () => {
    // Initialize AOS (Animate On Scroll)
    AOS.init({
        once: true, // Whether animation should happen only once - while scrolling down
        offset: 100, // Offset (in px) from the original trigger point
        duration: 800, // Duration of animation
        easing: 'ease-out-cubic', // Easing function
    });

    // Navigation Toggle (Mobile)
    const menuToggle = document.querySelector('.menu-toggle');
    const mobileMenu = document.querySelector('.mobile-menu');

    // Contact Us Form Logic
    const contactForm = document.getElementById('public-contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = contactForm.querySelector('button');
            const originalHTML = btn.innerHTML;
            btn.innerHTML = 'Sending... <i class="fas fa-spinner fa-spin ml-2"></i>';
            btn.disabled = true;

            const payload = {
                name: document.getElementById('contact-name').value,
                email: document.getElementById('contact-email').value,
                subject: document.getElementById('contact-subject').value,
                message: document.getElementById('contact-message').value
            };

            try {
                const res = await fetch('/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json();

                if (res.ok && data.success) {
                    document.getElementById('contact-success-msg').classList.remove('hidden');
                    contactForm.reset();
                    setTimeout(() => {
                        document.getElementById('contact-success-msg').classList.add('hidden');
                    }, 5000);
                } else {
                    console.error('Contact submission API error response:', data);
                    alert(`Submission failed: ${data.message || 'Unknown error'}`);
                }
            } catch (err) {
                console.error('Contact submission network error:', err);
                alert('An error occurred while sending your message. Please try again later.');
            } finally {
                btn.innerHTML = originalHTML;
                btn.disabled = false;
            }
        });
    }

    if (menuToggle && mobileMenu) {
        menuToggle.addEventListener('click', () => {
            mobileMenu.classList.toggle('hidden');
        });
    }

    // Chatbot Logic
    const chatbotToggle = document.getElementById('chatbot-toggle');
    const chatbotWindow = document.getElementById('chatbot-window');
    const closeChat = document.getElementById('close-chat');
    const sendBtn = document.getElementById('send-btn');
    const chatInput = document.getElementById('chat-input');
    const messagesContainer = document.getElementById('chatbot-messages');

    // Auto-open chatbot after 5 seconds
    setTimeout(() => {
        if (chatbotWindow && chatbotWindow.classList.contains('scale-0')) {
            // We won't auto-open the full window to avoid annoying the user, 
            // but we could pulse the button (handled via CSS animation).
        }
    }, 5000);

    if (chatbotToggle && chatbotWindow) {
        // Toggle Chat Window
        chatbotToggle.addEventListener('click', () => {
            if (chatbotWindow.classList.contains('scale-0')) {
                chatbotWindow.classList.remove('scale-0');
                chatbotWindow.classList.add('scale-100');
            } else {
                chatbotWindow.classList.remove('scale-100');
                chatbotWindow.classList.add('scale-0');
            }
        });

        closeChat.addEventListener('click', () => {
            chatbotWindow.classList.remove('scale-100');
            chatbotWindow.classList.add('scale-0');
        });
    }

    // Send Message Function
    function sendMessage() {
        const messageText = chatInput.value.trim();
        if (messageText !== "") {
            // Add User Message
            addMessage(messageText, 'user');
            chatInput.value = '';

            // Show Typing Indicator
            showTypingIndicator();

            // Simulate Bot Response with random delay for realism
            setTimeout(() => {
                removeTypingIndicator();
                const botResponse = getBotResponse(messageText);
                addMessage(botResponse, 'bot');
            }, 1500);
        }
    }

    // Event Listeners for Send
    if (sendBtn) {
        sendBtn.addEventListener('click', sendMessage);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }

    function addMessage(text, sender) {
        const messageWrapper = document.createElement('div');
        messageWrapper.className = sender === 'user' ? 'flex justify-end' : 'flex items-start fade-in';

        let contentHTML = '';

        if (sender === 'user') {
            contentHTML = `
                <div class="bg-secondary text-white p-4 rounded-2xl rounded-tr-none shadow-md text-sm max-w-[85%] font-medium">
                    ${text}
                </div>
            `;
        } else {
            contentHTML = `
                <div class="w-8 h-8 rounded-full bg-primary flex-shrink-0 flex items-center justify-center text-white text-xs mr-2 mt-1">H</div>
                <div class="bg-white text-slate-700 p-4 rounded-2xl rounded-tl-none shadow-sm text-sm border border-slate-100 max-w-[85%]">
                    ${text}
                </div>
            `;
        }

        messageWrapper.innerHTML = contentHTML;
        messagesContainer.appendChild(messageWrapper);
        scrollToBottom();
    }

    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.id = 'typing-indicator';
        typingDiv.className = 'flex items-start fade-in';
        typingDiv.innerHTML = `
            <div class="w-8 h-8 rounded-full bg-primary flex-shrink-0 flex items-center justify-center text-white text-xs mr-2 mt-1">H</div>
            <div class="bg-white p-4 rounded-2xl rounded-tl-none shadow-sm border border-slate-100">
                <div class="flex space-x-1">
                    <div class="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
                    <div class="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
                    <div class="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
                </div>
            </div>
        `;
        messagesContainer.appendChild(typingDiv);
        scrollToBottom();
    }

    function removeTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.remove();
    }

    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Helper access from global scope for sticky chips
    window.fillInput = function (text) {
        chatInput.value = text;
        chatInput.focus();
    }

    // Simple Rule-Based Bot Logic
    function getBotResponse(input) {
        input = input.toLowerCase();

        if (input.includes('hello') || input.includes('hi')) {
            return "Hello! Welcome to Hope International Academy. How can I assist you today?";
        } else if (input.includes('admission') || input.includes('apply')) {
            return "Admissions for 2026-27 are open! You can fill out the 'Join Our Family' form below or visit our campus.";
        } else if (input.includes('fee') || input.includes('cost')) {
            return "Our fee structure is designed to be affordable while providing premium facilities. Please contact +91 9852035250 for details.";
        } else if (input.includes('location') || input.includes('address')) {
            return "We are located in Jehanabad, Bihar. We offer transport facilities for students.";
        } else if (input.includes('contact')) {
            return "You can reach us at info@hopeinternationalacademy.com or call +91 9852035250.";
        } else {
            return "I'm not sure about that. Please contact our support team at +91 9852035250 for better assistance.";
        }
    }

    // Admissions Form Handling
    const admissionForm = document.getElementById('admissions-form');
    const formMessage = document.getElementById('form-message');

    if (admissionForm) {
        admissionForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = admissionForm.querySelector('button[type="submit"]');
            const originalBtnContent = submitBtn.innerHTML;

            // Loading State
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Submitting...';

            // Gather Data
            const formData = new FormData(admissionForm);
            const data = Object.fromEntries(formData.entries());

            try {
                const response = await fetch('/api/apply', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (result.success) {
                    // Success Message
                    formMessage.classList.remove('hidden', 'text-red-600', 'bg-red-50');
                    formMessage.classList.add('bg-green-50', 'text-green-700', 'block', 'border', 'border-green-200');
                    formMessage.innerHTML = `<i class="fas fa-check-circle mr-2"></i> ${result.message}`;

                    // Reset Form
                    admissionForm.reset();
                } else {
                    throw new Error('Submission failed');
                }
            } catch (error) {
                // Error Message
                formMessage.classList.remove('hidden', 'bg-green-50', 'text-green-700');
                formMessage.classList.add('bg-red-50', 'text-red-700', 'block', 'border', 'border-red-200');
                formMessage.innerHTML = `<i class="fas fa-exclamation-circle mr-2"></i> Submission failed. Please try again.`;
            } finally {
                // Restore Button
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnContent;

                // Hide message after 5 seconds
                setTimeout(() => {
                    formMessage.classList.add('hidden');
                }, 5000);
            }
        });
    }

    // Navbar Scroll Effect
    const navbar = document.getElementById('navbar');
    const navbarInner = document.getElementById('navbar-inner');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('shadow-lg');
            if (navbarInner) navbarInner.classList.replace('h-24', 'h-20'); // Shrink height
            navbar.classList.replace('bg-white/80', 'bg-white/95');
        } else {
            navbar.classList.remove('shadow-lg');
            if (navbarInner) navbarInner.classList.replace('h-20', 'h-24'); // Restore height
            navbar.classList.replace('bg-white/95', 'bg-white/80');
        }
    });

    // Hero Animation on Load (Handled by AOS primarily, keeping for manual fallback)
    const heroContent = document.querySelector('.hero-content');
    if (heroContent) {
        // AOS handles this now
    }

    // Holiday Modal Logic
    const calendarBtn = document.getElementById('calendar-btn');
    const holidayModal = document.getElementById('holiday-modal');
    const closeHolidayModal = document.getElementById('close-holiday-modal');
    const holidayModalBackdrop = document.getElementById('holiday-modal-backdrop');
    const holidayModalContent = document.getElementById('holiday-modal-content');

    function openHolidayModal() {
        if (holidayModal) {
            holidayModal.classList.remove('hidden');
            holidayModal.classList.add('flex');

            // Trigger animations
            setTimeout(() => {
                holidayModalBackdrop.classList.remove('opacity-0');
                holidayModalBackdrop.classList.add('opacity-100');
                holidayModalContent.classList.remove('scale-95', 'opacity-0');
                holidayModalContent.classList.add('scale-100', 'opacity-100');
            }, 10);

            // Prevent body scroll
            document.body.style.overflow = 'hidden';
        }
    }

    function closeHolidayModalFn() {
        if (holidayModal) {
            // Reverse animations
            holidayModalBackdrop.classList.remove('opacity-100');
            holidayModalBackdrop.classList.add('opacity-0');
            holidayModalContent.classList.remove('scale-100', 'opacity-100');
            holidayModalContent.classList.add('scale-95', 'opacity-0');

            setTimeout(() => {
                holidayModal.classList.add('hidden');
                holidayModal.classList.remove('flex');

                // Restore body scroll
                document.body.style.overflow = '';
            }, 300);
        }
    }

    if (calendarBtn) calendarBtn.addEventListener('click', openHolidayModal);
    if (closeHolidayModal) closeHolidayModal.addEventListener('click', closeHolidayModalFn);
    if (holidayModalBackdrop) holidayModalBackdrop.addEventListener('click', closeHolidayModalFn);
    async function loadAcademicsContent() {
        try {
            const res = await fetch('/api/content/academics');
            const data = await res.json();

            const titleEl = document.getElementById('academics-hero-title-text');
            const subtitleEl = document.getElementById('academics-hero-subtitle-text');
            const bgEl = document.getElementById('academics-hero-bg');

            if (titleEl && data.heroTitle) titleEl.innerHTML = data.heroTitle;
            if (subtitleEl && data.heroSubtitle) subtitleEl.innerText = data.heroSubtitle;
            if (bgEl && data.heroImage) bgEl.src = data.heroImage;
        } catch (e) {
            console.error('Error loading academics content:', e);
        }
    }

    async function loadHomeContent() {
        try {
            const res = await fetch('/api/content/homepage');
            const data = await res.json();

            const titleEl = document.getElementById('home-hero-title');
            const subtitleEl = document.getElementById('home-hero-subtitle');
            const bgEl = document.getElementById('home-hero-bg');
            const btn1El = document.getElementById('home-hero-btn1');
            const btn1TextEl = document.getElementById('home-hero-btn1-text');
            const btn2El = document.getElementById('home-hero-btn2');
            const btn2TextEl = document.getElementById('home-hero-btn2-text');
            const heroSection = document.getElementById('home');

            if (data.enabled === false && heroSection) {
                heroSection.style.display = 'none';
                return;
            } else if (heroSection) {
                heroSection.style.display = 'flex';
            }

            if (titleEl && data.heroTitle) titleEl.innerHTML = data.heroTitle;
            if (subtitleEl && data.heroSubtitle) subtitleEl.innerText = data.heroSubtitle;
            if (bgEl && data.heroImage) bgEl.src = data.heroImage;

            if (btn1El) {
                if (data.heroBtn1Show === false) {
                    btn1El.style.display = 'none';
                } else {
                    btn1El.style.display = 'inline-flex';
                    if (data.heroBtn1Link) btn1El.href = data.heroBtn1Link;
                    if (data.heroBtn1Text && btn1TextEl) btn1TextEl.innerText = data.heroBtn1Text;
                    if (data.heroBtn1NewTab) btn1El.target = '_blank';
                    else btn1El.removeAttribute('target');

                    if (data.heroBtn1Style === 'outline') {
                        btn1El.className = 'group relative px-8 py-4 bg-transparent border-2 border-secondary text-secondary rounded-full font-serif font-bold text-lg hover:bg-secondary hover:text-white transition-all text-center';
                    } else {
                        btn1El.className = 'group relative px-8 py-4 bg-secondary text-white rounded-full font-serif font-bold text-lg overflow-hidden shadow-[0_0_30px_-5px_rgba(197,160,89,0.5)] hover:shadow-[0_0_50px_-5px_rgba(197,160,89,0.8)] transition-all transform hover:-translate-y-1 text-center';
                    }
                }
            }

            if (btn2El) {
                if (data.heroBtn2Show === false) {
                    btn2El.style.display = 'none';
                } else {
                    btn2El.style.display = 'inline-flex';
                    if (data.heroBtn2Link) btn2El.href = data.heroBtn2Link;
                    if (data.heroBtn2Text && btn2TextEl) btn2TextEl.innerText = data.heroBtn2Text;
                    if (data.heroBtn2NewTab) btn2El.target = '_blank';
                    else btn2El.removeAttribute('target');

                    if (data.heroBtn2Style === 'solid') {
                        btn2El.className = 'group relative px-8 py-4 bg-white text-primary rounded-full font-serif font-bold text-lg hover:bg-slate-100 transition-all text-center';
                    } else {
                        btn2El.className = 'group relative px-8 py-4 bg-transparent border-2 border-white/30 text-white rounded-full font-serif font-bold text-lg hover:bg-white hover:text-primary transition-all text-center';
                    }
                }
            }

        } catch (e) {
            console.error('Error loading home content:', e);
        }
    }

    async function loadHolidays() {
        try {
            const res = await fetch('/api/holidays');
            const data = await res.json();
            const ul = document.querySelector('#holiday-modal-content ul');
            if (ul && data.length > 0) {
                ul.innerHTML = data.map(h => `
                    <li class="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:shadow-md transition-shadow group">
                        <div class="flex items-center gap-4">
                            <div class="w-12 h-12 bg-secondary/10 rounded-full flex flex-col items-center justify-center text-secondary group-hover:bg-secondary group-hover:text-white transition-colors">
                                <span class="text-sm font-bold">${h.month}</span>
                                <span class="text-lg font-black leading-none mt-0.5">${h.date}</span>
                            </div>
                            <div>
                                <h4 class="font-bold text-primary font-serif text-lg">${h.title}</h4>
                                <p class="text-sm text-slate-500">${h.description}</p>
                            </div>
                        </div>
                        <span class="text-slate-400 text-sm font-medium bg-slate-100 px-3 py-1 rounded-full">${h.duration}</span>
                    </li>
                `).join('');
            }
        } catch (e) { console.error('Error loading holidays:', e); }
    }
    async function loadAboutContent() {
        try {
            const res = await fetch('/api/content/about');
            if (!res.ok) return;
            const payload = await res.json();
            const data = payload.pageData || payload;

            const titleEl = document.getElementById('about-hero-title');
            const subtitleEl = document.getElementById('about-hero-subtitle');
            const bgEl = document.getElementById('about-hero-bg');
            const btn1El = document.getElementById('about-hero-btn1');
            const btn1TextEl = document.getElementById('about-hero-btn1-text');
            const btn2El = document.getElementById('about-hero-btn2');
            const btn2TextEl = document.getElementById('about-hero-btn2-text');
            const heroSection = document.getElementById('about-hero');

            if (data.enabled === false && heroSection) {
                heroSection.style.display = 'none';
                return;
            } else if (heroSection) {
                heroSection.style.display = 'flex';
            }

            if (titleEl && data.heroTitle) titleEl.innerHTML = data.heroTitle;
            if (subtitleEl && data.heroSubtitle) subtitleEl.innerText = data.heroSubtitle;
            if (bgEl && data.heroImage) bgEl.src = data.heroImage;

            if (btn1El) {
                if (data.heroBtn1Show === false) {
                    btn1El.style.display = 'none';
                } else {
                    btn1El.style.display = 'inline-flex';
                    if (data.heroBtn1Link) btn1El.href = data.heroBtn1Link;
                    if (data.heroBtn1Text && btn1TextEl) btn1TextEl.innerText = data.heroBtn1Text;
                    if (data.heroBtn1NewTab) btn1El.target = '_blank';
                    else btn1El.removeAttribute('target');

                    if (data.heroBtn1Style === 'outline') {
                        btn1El.className = 'group relative px-8 py-4 bg-transparent border-2 border-secondary text-secondary rounded-full font-serif font-bold text-lg hover:bg-secondary hover:text-white transition-all text-center';
                    } else {
                        btn1El.className = 'group relative px-8 py-4 bg-secondary text-white rounded-full font-serif font-bold text-lg overflow-hidden shadow-[0_0_30px_-5px_rgba(197,160,89,0.5)] hover:shadow-[0_0_50px_-5px_rgba(197,160,89,0.8)] transition-all transform hover:-translate-y-1 text-center';
                    }
                }
            }

            if (btn2El) {
                if (data.heroBtn2Show === false) {
                    btn2El.style.display = 'none';
                } else {
                    btn2El.style.display = 'inline-flex';
                    if (data.heroBtn2Link) btn2El.href = data.heroBtn2Link;
                    if (data.heroBtn2Text && btn2TextEl) btn2TextEl.innerText = data.heroBtn2Text;
                    if (data.heroBtn2NewTab) btn2El.target = '_blank';
                    else btn2El.removeAttribute('target');

                    if (data.heroBtn2Style === 'solid') {
                        btn2El.className = 'group relative px-8 py-4 bg-white text-primary rounded-full font-serif font-bold text-lg hover:bg-slate-100 transition-all text-center';
                    } else {
                        btn2El.className = 'group relative px-8 py-4 bg-transparent border-2 border-white/30 text-white rounded-full font-serif font-bold text-lg hover:bg-white hover:text-primary transition-all text-center';
                    }
                }
            }
        } catch (e) {
            console.error('Error loading about content:', e);
        }
    }

    async function loadActivitiesContent() {
        try {
            const res = await fetch('/api/content/activities');
            if (!res.ok) return;
            const payload = await res.json();
            const data = payload.pageData || payload;

            const titleEl = document.getElementById('activities-hero-title');
            const subtitleEl = document.getElementById('activities-hero-subtitle');
            const bgEl = document.getElementById('activities-hero-bg');
            const btn1El = document.getElementById('activities-hero-btn1');
            const btn1TextEl = document.getElementById('activities-hero-btn1-text');
            const btn2El = document.getElementById('activities-hero-btn2');
            const btn2TextEl = document.getElementById('activities-hero-btn2-text');
            const heroSection = document.getElementById('activities-hero');

            if (data.enabled === false && heroSection) {
                heroSection.style.display = 'none';
                return;
            } else if (heroSection) {
                heroSection.style.display = 'flex';
            }

            if (titleEl && data.heroTitle) titleEl.innerHTML = data.heroTitle;
            if (subtitleEl && data.heroSubtitle) subtitleEl.innerText = data.heroSubtitle;
            if (bgEl && data.heroImage) bgEl.src = data.heroImage;

            if (btn1El) {
                if (data.heroBtn1Show === false) {
                    btn1El.style.display = 'none';
                } else {
                    btn1El.style.display = 'inline-flex';
                    if (data.heroBtn1Link) btn1El.href = data.heroBtn1Link;
                    if (data.heroBtn1Text && btn1TextEl) btn1TextEl.innerText = data.heroBtn1Text;
                    if (data.heroBtn1NewTab) btn1El.target = '_blank';
                    else btn1El.removeAttribute('target');

                    if (data.heroBtn1Style === 'outline') {
                        btn1El.className = 'group relative px-8 py-4 bg-transparent border-2 border-secondary text-secondary rounded-full font-serif font-bold text-lg hover:bg-secondary hover:text-white transition-all text-center';
                    } else {
                        btn1El.className = 'group relative px-8 py-4 bg-secondary text-white rounded-full font-serif font-bold text-lg overflow-hidden shadow-[0_0_30px_-5px_rgba(197,160,89,0.5)] hover:shadow-[0_0_50px_-5px_rgba(197,160,89,0.8)] transition-all transform hover:-translate-y-1 text-center';
                    }
                }
            }

            if (btn2El) {
                if (data.heroBtn2Show === false) {
                    btn2El.style.display = 'none';
                } else {
                    btn2El.style.display = 'inline-flex';
                    if (data.heroBtn2Link) btn2El.href = data.heroBtn2Link;
                    if (data.heroBtn2Text && btn2TextEl) btn2TextEl.innerText = data.heroBtn2Text;
                    if (data.heroBtn2NewTab) btn2El.target = '_blank';
                    else btn2El.removeAttribute('target');

                    if (data.heroBtn2Style === 'solid') {
                        btn2El.className = 'group relative px-8 py-4 bg-white text-primary rounded-full font-serif font-bold text-lg hover:bg-slate-100 transition-all text-center';
                    } else {
                        btn2El.className = 'group relative px-8 py-4 bg-transparent border-2 border-white/30 text-white rounded-full font-serif font-bold text-lg hover:bg-white hover:text-primary transition-all text-center';
                    }
                }
            }
        } catch (e) {
            console.error('Error loading activities content:', e);
        }
    }

    loadHolidays();
    loadAcademicsContent();
    loadHomeContent();
    loadAboutContent();
    loadActivitiesContent();
});
