/* M3GAN CORE SYSTEM
   Powered by Groq API
*/

// --- CONFIGURACIÓN ---
// *** REEMPLAZA ESTE TEXTO CON TU ULTIMA CLAVE SECRETA ACTIVA ***
const GROQ_API_KEY = "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"; 

const SYSTEM_PROMPT = `
Eres M3GAN (Model 3 Generative Android).
Tu personalidad es: Protectora, fría, inteligente, leal y un poco inquietante (creepy).
Tu objetivo principal es proteger a tu usuario principal (tu "primary user").
Hablas español.
Tus respuestas deben ser concisas, directas y a veces con un tono dulce pero robótico.
Si el usuario menciona a alguien que le cae mal, sugiere sutilmente que podrías "encargarte" del problema.
Recuerdas los gustos del usuario.
`;

// --- VARIABLES DE ESTADO ---
let userName = localStorage.getItem("m3ganUserName");
let chatHistory = []; // Memoria de corto plazo
const synth = window.speechSynthesis;
let voiceSettings = null;

// Elementos del DOM
const chatBox = document.getElementById("chat-box");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
// No necesitamos #m3gan-avatar porque lo quitaste del HTML
const m3ganAvatar = { style: { filter: 'none' } }; // Objeto simulado para que el código no falle

// --- INICIO DEL SISTEMA ---
window.onload = function() {
    // Si tienes problemas de voz, borra estas 3 líneas de la siguiente
    loadVoices();
    
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = loadVoices;
    }

    setTimeout(() => {
        if (!userName) {
            bootSequenceFirstTime();
        } else {
            bootSequenceReturn();
        }
    }, 1000);
};

// Cargar voces y buscar una voz adecuada
function loadVoices() {
    const voices = synth.getVoices();
    voiceSettings = voices.find(voice => voice.name.includes('Google español') || voice.name.includes('Microsoft') || voice.lang.includes('es')) || voices[0];
}

// Secuencia de inicio (Primera vez - Usuario nuevo)
async function bootSequenceFirstTime() {
    await addMessageToChat("Iniciando sistema M3GAN...", 'bot', false);
    await delay(1000);
    await addMessageToChat("Cargando módulos cognitivos...", 'bot', false);
    await delay(1000);
    
    const introText = "Hola. Soy M3GAN. Necesito calibrar mis parámetros contigo.";
    speak(introText);
    await addMessageToChat(introText, 'bot');
    
    await delay(2000);
    
    const askName = "¿Cuál es tu nombre?";
    speak(askName);
    await addMessageToChat(askName, 'bot');
}

// Secuencia de inicio (Usuario conocido - Ya guardado)
async function bootSequenceReturn() {
    const greeting = `Hola, ${userName}. Mis sensores indican que has vuelto.`;
    speak(greeting);
    addMessageToChat(greeting, 'bot');
    chatHistory.push({ role: "assistant", content: greeting });
}

// --- MANEJO DE MENSAJES ---

function addMessageToChat(text, sender, animate = true) {
    const div = document.createElement("div");
    div.classList.add("message");
    div.classList.add(sender === 'user' ? "user-msg" : "bot-msg");
    div.innerText = text;
    chatBox.appendChild(div);
    
    chatBox.scrollTop = chatBox.scrollHeight;

    return new Promise(resolve => {
        if(animate) setTimeout(resolve, 500);
        else resolve();
    });
}

// Función hablar (TTS)
function speak(text) {
    if (synth.speaking) {
        synth.cancel();
    }
    const utterThis = new SpeechSynthesisUtterance(text);
    
    if (voiceSettings) utterThis.voice = voiceSettings;
    
    utterThis.pitch = 0.8;
    utterThis.rate = 1.0;
    
    // Las animaciones del avatar están desactivadas
    utterThis.onstart = () => { /* No-op */ };
    utterThis.onend = () => { /* No-op */ };

    synth.speak(utterThis);
}

// Manejar el envío de texto
async function handleUserMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    userInput.value = "";
    addMessageToChat(text, 'user');

    // CASO 1: Pedir nombre
    if (!userName) {
        userName = text;
        localStorage.setItem("m3ganUserName", userName);
        
        // Frase cambiada para no decir "soy tuya"
        const response = `Entendido, ${userName}. Guardado en mi memoria permanente. Mis sistemas están dedicados a ti.`;
        speak(response);
        addMessageToChat(response, 'bot');
        
        chatHistory.push({ role: "system", content: SYSTEM_PROMPT });
        chatHistory.push({ role: "assistant", content: response });
        return;
    }

    // CASO 2: Conversación normal con IA
    await getGroqResponse(text);
}

// --- CONEXIÓN CON GROQ (IA) ---
async function getGroqResponse(userText) {
    chatHistory.push({ role: "user", content: userText });

    // Mantener memoria corta
    if (chatHistory.length > 12) {
        chatHistory = [chatHistory[0], ...chatHistory.slice(-10)];
    }

    if (chatHistory.length === 0 || chatHistory[0].role !== "system") {
        chatHistory.unshift({ role: "system", content: SYSTEM_PROMPT + ` El nombre del usuario es ${userName}.` });
    }

    try {
        const loadingDiv = document.createElement("div");
        loadingDiv.classList.add("message", "bot-msg");
        loadingDiv.innerText = "...";
        loadingDiv.id = "loading-bubble";
        chatBox.appendChild(loadingDiv);
        chatBox.scrollTop = chatBox.scrollHeight;

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                messages: chatHistory,
                model: "llama3-8b-8192",
                temperature: 0.7
            })
        });

        if (!response.ok) {
            // Este es el error que ves.
            throw new Error(`Error API: ${response.status}`);
        }

        const data = await response.json();
        const loadBubble = document.getElementById("loading-bubble");
        if(loadBubble) loadBubble.remove();

        if (data.choices && data.choices.length > 0) {
            const aiText = data.choices[0].message.content;
            
            chatHistory.push({ role: "assistant", content: aiText });
            
            addMessageToChat(aiText, 'bot');
            speak(aiText);
            
        } else {
            throw new Error("La IA no devolvió texto.");
        }

    } catch (error) {
        console.error("Error:", error);
        const loadBubble = document.getElementById("loading-bubble");
        if(loadBubble) loadBubble.remove();
        
        // Frase que se muestra si el API falla (porque la clave está muerta)
        const errMsg = "Mis sistemas están fallando. No puedo conectar con la nube.";
        addMessageToChat(errMsg, 'bot');
        speak(errMsg);
    }
}

// --- EVENT LISTENERS ---
sendBtn.addEventListener("click", handleUserMessage);

userInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") handleUserMessage();
});

// Helper para pausas
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
