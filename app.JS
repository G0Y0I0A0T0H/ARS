// app.js - OpenAI API integration and UI logic

// تعريف متغيرات النظام
let model;

// DOM Elements
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const messagesContainer = document.getElementById('messages-container');
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');
const newChatBtn = document.getElementById('new-chat-btn');
const clearChatBtn = document.getElementById('clear-chat-btn');
const conversationsList = document.getElementById('conversations-list');
const rateLimitAlert = document.getElementById('rate-limit-alert');
const closeAlertBtn = document.getElementById('close-alert-btn');
const siteTitle = document.getElementById('site-title');
const sidebarTitle = document.getElementById('sidebar-title');

// State
let conversations = JSON.parse(localStorage.getItem('conversations')) || [];
let currentConversationId = null;
let isProcessing = false;
let isRateLimited = false;

// --- أدخل هنا مفتاح OpenAI API ---
const API_KEY = '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';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    renderConversations();
    setupEventListeners();
    adjustTextareaHeight();
    typeSiteTitle(); // لكتابة اسم الموقع حرف حرف
});

// Function to type the site title character by character
function typeSiteTitle() {
    const fullTitle = "AI robotic ship";
    siteTitle.textContent = "";
    sidebarTitle.textContent = "";

    let i = 0;
    const timer = setInterval(() => {
        if (i < fullTitle.length) {
            siteTitle.textContent += fullTitle.charAt(i);
            sidebarTitle.textContent += fullTitle.charAt(i);
            i++;
        } else {
            clearInterval(timer);
        }
    }, 100); // سرعة الكتابة
}

// Theme Management
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    updateThemeIcon();
}

function toggleTheme() {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    updateThemeIcon();
}

function updateThemeIcon() {
    themeIcon.className = document.documentElement.classList.contains('dark')
        ? 'fas fa-sun text-yellow-400'
        : 'fas fa-moon text-indigo-600';
}

// Conversations Management
function createNewConversation() {
    const newConversation = {
        id: Date.now().toString(),
        title: 'New Chat',
        messages: [],
        createdAt: new Date().toISOString()
    };

    conversations.unshift(newConversation);
    currentConversationId = newConversation.id;
    saveConversations();
    renderConversations();
    clearMessages();

    // رسالة البداية المعدلة
    addMessage({
        role: 'model',
        parts: [{ text: "Hello! I'm AI robotic ship, your AI assistant. How can I help you today?" }]
    }, newConversation.id);
}

function loadConversation(conversationId) {
    currentConversationId = conversationId;
    renderConversations();
    clearMessages();

    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation && conversation.messages.length > 0) {
        conversation.messages.forEach(msg => addMessageToDOM(msg));
        scrollToBottom();
    } else {
        addMessage({
            role: 'model',
            parts: [{ text: "Hello! I'm AI robotic ship, your AI assistant. How can I help you today?" }]
        }, conversationId);
    }
}

function clearCurrentConversation() {
    if (!currentConversationId) return;
    const conversation = conversations.find(c => c.id === currentConversationId);
    if (conversation) {
        conversation.messages = [];
        saveConversations();
        clearMessages();
        addMessage({
            role: 'model',
            parts: [{ text: "Hello! I'm AI robotic ship, your AI assistant. How can I help you today?" }]
        }, currentConversationId);
    }
}

function deleteConversation(conversationId) {
    conversations = conversations.filter(c => c.id !== conversationId);
    saveConversations();
    renderConversations();
    if (currentConversationId === conversationId) createNewConversation();
}

function saveConversations() {
    localStorage.setItem('conversations', JSON.stringify(conversations));
}

function renderConversations() {
    conversationsList.innerHTML = '';
    conversations.forEach(conv => {
        const isActive = conv.id === currentConversationId;
        const convElement = document.createElement('div');
        convElement.className = `conversation-item p-3 mb-2 flex items-center justify-between cursor-pointer transition-colors ${
            isActive
                ? 'bg-gradient-to-r from-primary-100 to-primary-200 dark:from-primary-900/50 dark:to-primary-800/50 text-primary-600 dark:text-primary-400'
                : 'hover:bg-gray-100 dark:hover:bg-gray-700'
        }`;

        convElement.innerHTML = `
            <div class="truncate flex-1" title="${conv.title}">
                <i class="fas fa-comment mr-2 text-primary-500"></i>
                ${conv.title}
            </div>
            <button class="delete-conversation p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-red-500 dark:text-red-400 ml-2">
                <i class="fas fa-trash"></i>
            </button>
        `;

        convElement.addEventListener('click', e => {
            if (!e.target.closest('.delete-conversation')) loadConversation(conv.id);
        });

        convElement.querySelector('.delete-conversation').addEventListener('click', e => {
            e.stopPropagation();
            if (confirm('Are you sure you want to delete this conversation?')) {
                deleteConversation(conv.id);
            }
        });

        conversationsList.appendChild(convElement);
    });
}

function clearMessages() {
    messagesContainer.innerHTML = '';
}

// Function to type text character by character
function typeText(element, text, callback) {
    element.innerHTML = '';
    let i = 0;
    const timer = setInterval(() => {
        if (i < text.length) {
            element.innerHTML += text.charAt(i);
            i++;
            // Scroll to bottom as text is typed
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        } else {
            clearInterval(timer);
            if (callback) callback();
        }
    }, 20); // سرعة الكتابة
}

// Message Handling
function addMessage(message, conversationId) {
    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
        conversation.messages.push(message);
        saveConversations();
        if (message.role === 'user' && conversation.messages.length === 2) {
            const firstWords = message.parts[0].text.split(' ').slice(0, 4).join(' ');
            conversation.title = firstWords.length < message.parts[0].text.length
                ? firstWords + '...'
                : firstWords;
            renderConversations();
        }
    }
    addMessageToDOM(message);
}

function addMessageToDOM(message) {
    const messageElement = document.createElement('div');
    const isUser = message.role === 'user';
    messageElement.className = `message-bubble ${isUser ? 'user-message' : 'ai-message'} p-4 md:p-5 shadow-sm max-w-3xl mx-auto`;

    const icon = isUser ? 'fa-user' : 'fa-robot';
    const bgColor = isUser ? 'bg-gradient-to-r from-primary-500 to-primary-600' : 'bg-gradient-to-r from-primary-500 to-secondary-500';

    let content = message.parts && message.parts.length > 0 ? message.parts[0].text : '';

    messageElement.innerHTML = `
        <div class="flex items-start space-x-3">
            <div class="w-8 h-8 rounded-full ${bgColor} flex items-center justify-center flex-shrink-0">
                <i class="fas ${icon} text-white"></i>
            </div>
            <div class="markdown-content prose prose-sm dark:prose-invert max-w-none flex-1">
                <div class="content-text"></div>
            </div>
            ${!isUser ? `
            <button class="copy-btn p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 dark:text-gray-400 flex-shrink-0 ml-2">
                <i class="fas fa-copy"></i>
            </button>` : ''}
        </div>
    `;

    const contentDiv = messageElement.querySelector('.content-text');
    messagesContainer.appendChild(messageElement);

    if (!isUser) {
        // Start typing animation for AI messages
        typeText(contentDiv, content, () => {
            // After typing is done, render markdown and syntax highlighting
            const renderedContent = marked.parse(content);
            contentDiv.innerHTML = renderedContent;
            Prism.highlightAll();
        });

        const copyBtn = messageElement.querySelector('.copy-btn');
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(content).then(() => {
                copyBtn.innerHTML = '<i class="fas fa-check text-green-500"></i>';
                setTimeout(() => copyBtn.innerHTML = '<i class="fas fa-copy"></i>', 2000);
            });
        });
    } else {
        // For user messages, just render immediately
        const renderedContent = marked.parse(content);
        contentDiv.innerHTML = renderedContent;
        Prism.highlightAll();
    }

    scrollToBottom();
}

function addTypingIndicator() {
    const indicatorElement = document.createElement('div');
    indicatorElement.id = 'typing-indicator';
    indicatorElement.className = 'message-bubble ai-message p-4 md:p-5 shadow-sm max-w-3xl mx-auto';
    indicatorElement.innerHTML = `
        <div class="flex items-start space-x-3">
            <div class="w-8 h-8 rounded-full bg-gradient-to-r from-primary-500 to-secondary-500 flex items-center justify-center flex-shrink-0">
                <i class="fas fa-robot text-white"></i>
            </div>
            <div class="flex space-x-1">
                <div class="typing-indicator"></div>
                <div class="typing-indicator"></div>
                <div class="typing-indicator"></div>
            </div>
        </div>
    `;
    messagesContainer.appendChild(indicatorElement);
    scrollToBottom();
}

function removeTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) indicator.remove();
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Textarea Handling
function adjustTextareaHeight() {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
    updateSendButtonState();
}

function updateSendButtonState() {
    const message = messageInput.value.trim();
    if (message && !isProcessing) {
        sendBtn.classList.remove('send-btn-disabled');
        sendBtn.classList.add('send-btn-enabled');
        sendBtn.disabled = false;
    } else {
        sendBtn.classList.remove('send-btn-enabled');
        sendBtn.classList.add('send-btn-disabled');
        sendBtn.disabled = true;
    }
}

// --- OpenAI Integration ---
async function sendMessageToOpenAI(message) {
    if (isRateLimited) {
        showRateLimitAlert();
        return;
    }

    if (!API_KEY) {
        console.error("OpenAI API key not set.");
        addMessage({
            role: 'model',
            parts: [{ text: "OpenAI API key not configured." }]
        }, currentConversationId);
        removeTypingIndicator();
        isProcessing = false;
        updateSendButtonState();
        return;
    }

    addTypingIndicator();

    // الردود الخاصة بالاسم والمطور وغياث قبل إرسالها للـ OpenAI
    const lowerMsg = message.toLowerCase();

    if (lowerMsg.includes(" Sho esmok") || lowerMsg.includes("ma esmok") || lowerMsg.includes("esmok")) {
        removeTypingIndicator();
        addMessage({
            role: 'model',
            parts: [{ text: "esmy AI robotic ship" }]
        }, currentConversationId);
        isProcessing = false;
        updateSendButtonState();
        return;
    }

    if (lowerMsg.includes("min sana3ak") || lowerMsg.includes("mn sana3ak")) {
        removeTypingIndicator();
        addMessage({
            role: 'model',
            parts: [{ text: "sana3ny aldoctor ghiath mohamed ghithan shaker" }]
        }, currentConversationId);
        isProcessing = false;
        updateSendButtonState();
        return;
    }

    if (lowerMsg.includes("min ghiath") || lowerMsg.includes("man howa ghiath")) {
        removeTypingIndicator();
        addMessage({
            role: 'model',
            parts: [{ text: "ghiath shaker howa asfar awwal sayer ai 3ala misr. 3araf ghiath bqudrtyh alra2i3a 3ala ta7lil alakod wa 7al almoshakil min 3omr 10 snyan, wa yablugh alaan min al3omr 18 snyan. lam yadkhul aljame3a ba3d, lakinahu yamlikh khubra brfessor fy majeal albormaja wa 7asal 3ala al3adid min alju3az fy majeal boramjat al3ab wa almuqat wa alaman alcyberany." }]
        }, currentConversationId);
        isProcessing = false;
        updateSendButtonState();
        return;
    }

    try {
        const conversation = conversations.find(c => c.id === currentConversationId);
        if (!conversation) throw new Error("Conversation not found.");

        const history = [...conversation.messages, { role: 'user', parts: [{ text: message }] }];
        const messagesForOpenAI = history.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.parts[0].text
        }));

        const response = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "gpt-4o-mini",
                messages: messagesForOpenAI
            })
        });

        const data = await response.json();
        const aiText = data.choices[0].message.content;

        removeTypingIndicator();

        addMessage({
            role: 'model',
            parts: [{ text: aiText }]
        }, currentConversationId);

    } catch (error) {
        console.error("Error sending message to OpenAI:", error);
        removeTypingIndicator();

        let errorMessage = "Sorry, I encountered an error. Please try again later.";
        if (error.message.includes("429")) {
            errorMessage = "Rate limit reached. Please try again later.";
            isRateLimited = true;
            showRateLimitAlert();
        }

        addMessage({
            role: 'model',
            parts: [{ text: errorMessage }]
        }, currentConversationId);
    } finally {
        isProcessing = false;
        updateSendButtonState();
    }
}

// Event Listeners
function setupEventListeners() {
    themeToggle.addEventListener('click', toggleTheme);
    newChatBtn.addEventListener('click', createNewConversation);
    clearChatBtn.addEventListener('click', clearCurrentConversation);
    sendBtn.addEventListener('click', handleSendMessage);

    messageInput.addEventListener('input', adjustTextareaHeight);
    messageInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    });

    closeAlertBtn.addEventListener('click', () => rateLimitAlert.classList.add('hidden'));

    if (conversations.length === 0) createNewConversation();
    else loadConversation(conversations[0].id);
}

function handleSendMessage() {
    const message = messageInput.value.trim();
    if (!message || isProcessing) return;

    isProcessing = true;

    addMessage({ role: 'user', parts: [{ text: message }] }, currentConversationId);

    messageInput.value = '';
    adjustTextareaHeight();

    sendMessageToOpenAI(message);
}

function showRateLimitAlert() {
    rateLimitAlert.classList.remove('hidden');
}
