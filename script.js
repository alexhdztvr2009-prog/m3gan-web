/* M3GAN CORE SYSTEM
   Powered by Groq API
*/

// --- CONFIGURACIÓN ---
// Tu clave ya está pegada aquí abajo:
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
const m3ganAvatar = document.getElementById("m3gan-avatar");

// --- INICIO DEL SISTEMA ---
window.onload = function() {
    // Intentamos cargar voces
    loadVoices();
    
    // Chrome a veces tarda en cargar las voces, esto asegura que se carguen
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
    // Intenta buscar Google Español, Microsoft Helena, o una voz femenina en español
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
    
    await delay(2000); // Espera a que termine de hablar
    
    const askName = "¿Cuál es tu nombre?";
    speak(askName);
    await addMessageToChat(askName, 'bot');
}

// Secuencia de inicio (Usuario conocido - Ya guardado)
async function bootSequenceReturn() {
    const greeting = `Hola, ${userName}. Mis sensores indican que has vuelto.`;
    speak(greeting);
    addMessageToChat(greeting, 'bot');
    // Agregamos esto al historial para que la IA sepa que ya saludó
    chatHistory.push({ role: "assistant", content: greeting });
}

// --- MANEJO DE MENSAJES ---

function addMessageToChat(text, sender, animate = true) {
    const div = document.createElement("div");
    div.classList.add("message");
    div.classList.add(sender === 'user' ? "user-msg" : "bot-msg");
    div.innerText = text;
    chatBox.appendChild(div);
    
    // Scroll automático al fondo
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
    
    utterThis.pitch = 0.8; // Tono un poco bajo (creepy/serio)
    utterThis.rate = 1.0;  // Velocidad normal
    
    // Efecto visual en el avatar cuando habla
    utterThis.onstart = () => { m3ganAvatar.style.filter = "brightness(1.2) sepia(1)"; };
    utterThis.onend = () => { m3ganAvatar.style.filter = "brightness(0.8) contrast(1.2)"; };

    synth.speak(utterThis);
}

// Manejar el envío de texto
async function handleUserMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    // Limpiar input
    userInput.value = "";
    
    // Mostrar mensaje usuario en pantalla
    addMessageToChat(text, 'user');

    // CASO 1: No tenemos nombre todavía (Primer uso)
    if (!userName) {
        userName = text;
        localStorage.setItem("m3ganUserName", userName);
        
        const response = `Entendido, ${userName}. Guardado en mi memoria permanente. Ahora soy tuya.`;
        speak(response);
        addMessageToChat(response, 'bot');
        
        // Inicializar historial
        chatHistory.push({ role: "system", content: SYSTEM_PROMPT });
        chatHistory.push({ role: "assistant", content: response });
        return;
    }

    // CASO 2: Conversación normal con IA
    await getGroqResponse(text);
}

// --- CONEXIÓN CON GROQ (IA) ---
async function getGroqResponse(userText) {
    // Añadir mensaje del usuario al historial
    chatHistory.push({ role: "user", content: userText });

    // Mantener memoria corta (últimos 10 mensajes para no saturar)
    if (chatHistory.length > 12) {
        // Mantenemos siempre el system prompt (índice 0) y los últimos mensajes
        chatHistory = [chatHistory[0], ...chatHistory.slice(-10)];
    }

    // Asegurar que el sistema sabe quién es M3GAN
    if (chatHistory.length === 0 || chatHistory[0].role !== "system") {
        chatHistory.unshift({ role: "system", content: SYSTEM_PROMPT + ` El nombre del usuario es ${userName}.` });
    }

    try {
        // Indicador visual de "pensando..."
        const loadingDiv = document.createElement("div");
        loadingDiv.classList.add("message", "bot-msg");
        loadingDiv.innerText = "...";
        loadingDiv.id = "loading-bubble";
        chatBox.appendChild(loadingDiv);
        chatBox.scrollTop = chatBox.scrollHeight;

        // Llamada a la API de Groq
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                messages: chatHistory,
                model: "llama3-8b-8192", // Modelo muy rápido
                temperature: 0.7 // Creatividad balanceada
            })
        });

        // Procesar respuesta
        if (!response.ok) {
            throw new Error(`Error API: ${response.status}`);
        }

        const data = await response.json();
        
        // Quitar burbuja de carga
        const loadBubble = document.getElementById("loading-bubble");
        if(loadBubble) loadBubble.remove();

        if (data.choices && data.choices.length > 0) {
            const aiText = data.choices[0].message.content;
            
            // Añadir respuesta al historial de memoria
            chatHistory.push({ role: "assistant", content: aiText });
            
            // Mostrar y hablar
            addMessageToChat(aiText, 'bot');
            speak(aiText);
            
        } else {
            throw new Error("La IA no devolvió texto.");
        }

    } catch (error) {
        console.error("Error:", error);
        // Quitar burbuja de carga si falló
        const loadBubble = document.getElementById("loading-bubble");
        if(loadBubble) loadBubble.remove();
        
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
