const btn = document.getElementById("speakBtn");
const input = document.getElementById("textInput");

btn.addEventListener("click", () => {
    const text = input.value.trim();
    if (!text) return alert("Write something for M3GAN to say.");

    const speech = new SpeechSynthesisUtterance(text);

    // Make voice sound more like a robot / M3GAN
    speech.pitch = 0.7;
    speech.rate = 1.0;
    speech.volume = 1;

    speechSynthesis.speak(speech);
});
