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
        if (chatbotWindow.classList.contains('scale-0')) {
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
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('shadow-lg');
            navbar.classList.replace('h-24', 'h-20'); // Shrink height
            navbar.classList.replace('bg-white/80', 'bg-white/95');
        } else {
            navbar.classList.remove('shadow-lg');
            navbar.classList.replace('h-20', 'h-24'); // Restore height
            navbar.classList.replace('bg-white/95', 'bg-white/80');
        }
    });

    // Hero Animation on Load (Handled by AOS primarily, keeping for manual fallback)
    const heroContent = document.querySelector('.hero-content');
    if (heroContent) {
        // AOS handles this now
    }
});
