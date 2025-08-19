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

export const speak = (text: string, rate: number, voiceURI: string | null) => {
  if (!window.speechSynthesis) {
    console.error("Speech synthesis not supported in this browser.");
    return;
  }

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  utterance.rate = rate;

  let selectedVoice: SpeechSynthesisVoice | null = null;

  if (voiceURI) {
    selectedVoice = voices.find(voice => voice.voiceURI === voiceURI) || null;
  }

  // If a specific voice is found, use it. Otherwise, fallback to auto-detection.
  if (selectedVoice) {
    utterance.voice = selectedVoice;
  } else {
    const isHindi = /[\u0900-\u097F]/.test(text);
    if (isHindi) {
      selectedVoice = voices.find(voice => voice.lang === 'hi-IN') || null;
    }
    if (!selectedVoice) {
      selectedVoice = voices.find(voice => voice.lang === 'en-US') || null;
    }
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
  }

  window.speechSynthesis.speak(utterance);
};
