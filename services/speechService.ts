let voices: SpeechSynthesisVoice[] = [];

const loadVoices = () => {
  voices = window.speechSynthesis.getVoices();
};

// Load voices initially. It might be an empty array.
loadVoices();

// The 'voiceschanged' event is fired when the list of voices is ready.
if (window.speechSynthesis.onvoiceschanged !== undefined) {
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

export const speak = (text: string) => {
  if (!window.speechSynthesis) {
    console.error("Speech synthesis not supported in this browser.");
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  // Simple heuristic to detect Hindi
  const isHindi = /[\u0900-\u097F]/.test(text);
  let selectedVoice: SpeechSynthesisVoice | null = null;

  // Use the pre-loaded voices array.
  if (isHindi) {
    selectedVoice = voices.find(voice => voice.lang === 'hi-IN') || null;
  }

  if (!selectedVoice) {
    selectedVoice = voices.find(voice => voice.lang === 'en-US') || null;
  }

  // If a specific voice is found, use it. Otherwise, the browser will use its default.
  if (selectedVoice) {
    utterance.voice = selectedVoice;
  }

  window.speechSynthesis.speak(utterance);
};
