// --- Animações e Navbar UI ---
document.addEventListener('DOMContentLoaded', () => {
    // Reveal elementos no Scroll
    const revealElements = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

    revealElements.forEach(el => revealObserver.observe(el));

    // Efeito de sombra na Navbar ao rolar
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 20) {
            navbar.classList.add('shadow-md', 'border-asis-accent/10');
            navbar.classList.remove('border-transparent');
        } else {
            navbar.classList.remove('shadow-md', 'border-asis-accent/10');
            navbar.classList.add('border-transparent');
        }
    });

    // Event Listeners dos Botões do Chat
    document.getElementById('chat-toggle-btn').addEventListener('click', toggleChat);
    document.getElementById('chat-close-btn').addEventListener('click', toggleChat);
    document.getElementById('chat-send-btn').addEventListener('click', handleSend);
    
    document.getElementById('chat-input').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });
});

// --- Lógica do Chatbot com Gemini API ---
const apiKey = ""; // Adicione sua chave da API Gemini aqui se necessário
const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`;

let chatHistory = [];
const systemPrompt = "Você é uma assistente virtual empática, gentil e acolhedora do movimento feminino 'AS SIS'. Seu tom deve ser humano, suave, compreensivo e encorajador. O movimento AS SIS ajuda mulheres a romper ciclos de dor, focar na cura emocional, e restaurar identidades perdidas. A fundadora do movimento (não diga que é você) oferece uma Mentoria especializada, Podcasts profundos, Encontros de conexão, e uma comunidade segura. Se perguntarem o número do WhatsApp, direcione para (27) 99890-98929. Responda de forma concisa, amigável e calorosa, sempre em português do Brasil.";

const chatWindow = document.getElementById('chat-window');
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
let isChatOpen = false;

function toggleChat() {
    isChatOpen = !isChatOpen;
    if (isChatOpen) {
        chatWindow.classList.remove('scale-95', 'opacity-0', 'pointer-events-none');
        chatWindow.classList.add('scale-100', 'opacity-100', 'pointer-events-auto', 'flex');
        setTimeout(() => chatInput.focus(), 300);
    } else {
        chatWindow.classList.add('scale-95', 'opacity-0', 'pointer-events-none');
        chatWindow.classList.remove('scale-100', 'opacity-100', 'pointer-events-auto');
    }
}

function appendMessage(role, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `flex gap-3 ${role === 'user' ? 'justify-end' : ''}`;
    
    const iconHTML = role === 'model' 
        ? `<div class="w-6 h-6 rounded-full bg-asis-accent shrink-0 flex items-center justify-center mt-1"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"></path><rect width="16" height="12" x="4" y="8" rx="2"></rect><path d="M2 14h2"></path><path d="M20 14h2"></path><path d="M15 13v2"></path><path d="M9 13v2"></path></svg></div>`
        : '';

    const bubbleHTML = `<div class="${role === 'user' ? 'bg-asis-accent text-white rounded-tr-none' : 'bg-white border border-asis-accent/10 text-asis-text rounded-tl-none'} rounded-2xl p-3 text-sm shadow-sm leading-relaxed max-w-[85%] break-words whitespace-pre-wrap">${text}</div>`;

    if (role === 'model') {
        msgDiv.innerHTML = iconHTML + bubbleHTML;
    } else {
        msgDiv.innerHTML = bubbleHTML;
    }

    chatMessages.appendChild(msgDiv);
    scrollToBottom();
}

function appendTypingIndicator() {
    const id = 'typing-' + Date.now();
    const msgDiv = document.createElement('div');
    msgDiv.id = id;
    msgDiv.className = `flex gap-3`;
    msgDiv.innerHTML = `
        <div class="w-6 h-6 rounded-full bg-asis-accent shrink-0 flex items-center justify-center mt-1">
             <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H8"></path><rect width="16" height="12" x="4" y="8" rx="2"></rect><path d="M2 14h2"></path><path d="M20 14h2"></path><path d="M15 13v2"></path><path d="M9 13v2"></path></svg>
        </div>
        <div class="bg-white border border-asis-accent/10 rounded-2xl rounded-tl-none px-4 py-3 flex items-center gap-1 shadow-sm">
            <div class="w-1.5 h-1.5 rounded-full bg-asis-accent typing-dot"></div>
            <div class="w-1.5 h-1.5 rounded-full bg-asis-accent typing-dot"></div>
            <div class="w-1.5 h-1.5 rounded-full bg-asis-accent typing-dot"></div>
        </div>
    `;
    chatMessages.appendChild(msgDiv);
    scrollToBottom();
    return id;
}

function removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Fetch com suporte a retry e backoff exponencial
const fetchWithRetry = async (url, options, maxRetries = 3) => {
    let delay = 1000;
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.status === 429) {
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2;
                continue;
            }
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            return response;
        } catch (error) {
            if (i === maxRetries - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
        }
    }
};

async function handleSend() {
    const text = chatInput.value.trim();
    if (!text) return;

    appendMessage('user', text);
    chatInput.value = '';
    chatInput.style.height = 'auto';

    chatHistory.push({ role: "user", parts: [{ text: text }] });

    const typingId = appendTypingIndicator();

    try {
        const payload = {
            contents: chatHistory,
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            }
        };

        const response = await fetchWithRetry(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        removeTypingIndicator(typingId);

        if (data.candidates && data.candidates[0].content.parts[0].text) {
            const reply = data.candidates[0].content.parts[0].text;
            appendMessage('model', reply);
            chatHistory.push({ role: "model", parts: [{ text: reply }] });
        } else {
            appendMessage('model', "Desculpe, tive um pequeno problema ao processar sua mensagem. Poderia repetir?");
        }
    } catch (err) {
        removeTypingIndicator(typingId);
        appendMessage('model', "Estou com dificuldades de conexão no momento. Se precisar de apoio imediato, entre em contato pelo nosso WhatsApp! 🤎");
    }
}