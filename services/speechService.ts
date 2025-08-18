export const speak = (text: string) => {
  if (!window.speechSynthesis) {
    console.error("Speech synthesis not supported in this browser.");
    return;
  }

  // Cancel any previous speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);

  // Simple heuristic to detect Hindi
  const isHindi = /[\u0900-\u097F]/.test(text);

  // Find a suitable voice
  const voices = window.speechSynthesis.getVoices();
  let selectedVoice = null;

  if (isHindi) {
    selectedVoice = voices.find(voice => voice.lang === 'hi-IN');
  }

  // Default to an English voice if no Hindi voice is found or text is not Hindi
  if (!selectedVoice) {
    selectedVoice = voices.find(voice => voice.lang === 'en-US') || voices[0];
  }

  utterance.voice = selectedVoice;

  // Note: The list of voices is loaded asynchronously. For a more robust implementation,
  // one might listen for the 'voiceschanged' event on window.speechSynthesis.
  // For this application, we rely on the voices being available on page load.

  window.speechSynthesis.speak(utterance);
};
