import { ref, onUnmounted } from 'vue';

/**
 * Composable for speech recognition (voice-to-text)
 * Uses the Web Speech API to transcribe speech to text
 */
export function useSpeechRecognition() {
  const isListening = ref(false);
  const error = ref(null);
  const recognition = ref(null);

  // Check if browser supports speech recognition
  const checkSupport = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    return !!SpeechRecognition;
  };

  // Initialize isSupported with checkSupport result
  const isSupported = ref(checkSupport());

  // Initialize speech recognition
  const initRecognition = (language = 'pt-BR') => {
    if (!checkSupport()) {
      error.value = 'Seu navegador não suporta reconhecimento de voz';
      return null;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognitionInstance = new SpeechRecognition();

      recognitionInstance.continuous = true; // Keep listening until stopped
      recognitionInstance.interimResults = true; // Show interim results
      recognitionInstance.lang = language; // Set language (pt-BR for Portuguese)

      recognitionInstance.onstart = () => {
        isListening.value = true;
        error.value = null;
      };

      recognitionInstance.onerror = event => {
        console.error('Speech recognition error:', event.error);
        error.value = event.error;
        isListening.value = false;

        // Handle specific errors
        if (event.error === 'no-speech') {
          error.value = 'Nenhuma fala detectada. Tente novamente.';
        } else if (event.error === 'audio-capture') {
          error.value = 'Não foi possível acessar o microfone. Verifique as permissões.';
        } else if (event.error === 'not-allowed') {
          error.value = 'Permissão de microfone negada. Por favor, permita o acesso ao microfone.';
        }
      };

      recognitionInstance.onend = () => {
        isListening.value = false;
      };

      recognition.value = recognitionInstance;
      return recognitionInstance;
    } catch (err) {
      console.error('Error initializing speech recognition:', err);
      error.value = 'Erro ao inicializar reconhecimento de voz';
      return null;
    }
  };

  // Start listening and transcribe to callback
  const startListening = (onResult, onFinalResult, language = 'pt-BR') => {
    if (!recognition.value) {
      initRecognition(language);
    }

    if (!recognition.value) {
      error.value = 'Reconhecimento de voz não disponível';
      return false;
    }

    let finalTranscript = '';

    recognition.value.onresult = event => {
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      // Call callback with interim results (for real-time display)
      if (onResult && interimTranscript) {
        onResult(interimTranscript);
      }

      // Call final callback when speech ends
      if (onFinalResult && finalTranscript) {
        onFinalResult(finalTranscript.trim());
      }
    };

    try {
      recognition.value.start();
      return true;
    } catch (err) {
      console.error('Error starting recognition:', err);
      error.value = 'Erro ao iniciar reconhecimento de voz';
      isListening.value = false;
      return false;
    }
  };

  // Stop listening
  const stopListening = () => {
    if (recognition.value && isListening.value) {
      try {
        recognition.value.stop();
        isListening.value = false;
      } catch (err) {
        console.error('Error stopping recognition:', err);
      }
    }
  };

  // Helper function to format timestamp
  const formatTimestamp = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `[${year}-${month}-${day} ${hours}:${minutes}:${seconds}]`;
  };

  // Helper function to append transcribed text with timestamp
  const appendTranscriptionWithTimestamp = (currentText, transcribedText) => {
    const timestamp = formatTimestamp();
    const timestampedText = `${timestamp} ${transcribedText}`;

    if (!currentText || currentText.trim() === '') {
      return timestampedText;
    }

    // Add as new paragraph (double line break) with timestamp
    return `${currentText}\n\n${timestampedText}`;
  };

  // Cleanup on unmount
  onUnmounted(() => {
    stopListening();
  });

  return {
    isListening,
    isSupported,
    error,
    initRecognition,
    startListening,
    stopListening,
    checkSupport,
    formatTimestamp,
    appendTranscriptionWithTimestamp,
  };
}
