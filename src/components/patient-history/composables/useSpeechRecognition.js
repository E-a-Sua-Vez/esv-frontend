import { ref, onUnmounted } from 'vue';
import { escapeVoiceTranscription } from '../../../shared/utils/security';

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

  // FIX Voice Sessions: Track active sessions globally
  const activeSessions = new Set();

  // FIX Voice Timeout: Default timeout (30 seconds)
  const DEFAULT_TIMEOUT = 30000;
  let timeoutId = null;

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

      // FIX Voice Timeout: Set timeout
      recognitionInstance.maxAlternatives = 1;

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
  const startListening = (onResult, onFinalResult, language = 'pt-BR', sessionId = 'default') => {
    // FIX Voice Sessions: Only allow one active session
    if (activeSessions.size > 0 && !activeSessions.has(sessionId)) {
      error.value = 'Já existe uma sessão de voz ativa. Pare a sessão anterior primeiro.';
      return false;
    }

    // FIX Voice Sessions: Stop any existing session for this ID
    if (activeSessions.has(sessionId) && recognition.value) {
      stopListening();
    }

    if (!recognition.value) {
      initRecognition(language);
    }

    if (!recognition.value) {
      error.value = 'Reconhecimento de voz não disponível';
      return false;
    }

    // Track processed final results to prevent duplicates
    // Use a Set to store hashes of processed final results
    const processedFinalResults = new Set();
    let lastProcessedResultIndex = -1;

    recognition.value.onresult = event => {
      let interimTranscript = '';
      let hasFinalResults = false;
      let currentFinalText = '';

      // Detect if recognition has restarted (resultIndex is 0 but we've processed results before)
      // This can happen with continuous recognition
      if (event.resultIndex === 0 && lastProcessedResultIndex >= 0) {
        // Recognition restarted, reset tracking
        processedFinalResults.clear();
        lastProcessedResultIndex = -1;
      }

      // Only process new results (those after the last processed index)
      for (
        let i = Math.max(event.resultIndex, lastProcessedResultIndex + 1);
        i < event.results.length;
        i++
      ) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          // Create a hash of the result to detect duplicates
          const resultHash = `${i}-${transcript.trim()}`;

          // Only process if we haven't seen this exact result before
          if (!processedFinalResults.has(resultHash)) {
            currentFinalText += transcript + ' ';
            hasFinalResults = true;
            processedFinalResults.add(resultHash);
            lastProcessedResultIndex = i; // Update last processed index
          }
        } else {
          interimTranscript += transcript;
        }
      }

      // Call callback with interim results (for real-time display)
      if (onResult && interimTranscript) {
        onResult(interimTranscript);
      }

      // Process final results immediately when available (only new results)
      if (onFinalResult && hasFinalResults && currentFinalText.trim()) {
        // FIX Voice Special Chars: Escape special characters
        const escaped = escapeVoiceTranscription(currentFinalText.trim());
        console.log('🎤 Speech recognition final result (immediate):', escaped);
        onFinalResult(escaped);
      }
    };

    // Also handle onend - but don't process again if already processed in onresult
    const originalOnEnd = recognition.value.onend;
    recognition.value.onend = () => {
      // Reset for next session
      processedFinalResults.clear();
      lastProcessedResultIndex = -1;
      isListening.value = false;
      if (originalOnEnd) {
        originalOnEnd();
      }
    };

    try {
      recognition.value.start();
      activeSessions.add(sessionId);

      // FIX Voice Timeout: Set timeout to auto-stop after 30 seconds
      timeoutId = setTimeout(() => {
        if (isListening.value) {
          stopListening();
          error.value = 'Timeout: Reconhecimento de voz parado automaticamente após 30 segundos';
        }
      }, DEFAULT_TIMEOUT);

      return true;
    } catch (err) {
      console.error('Error starting recognition:', err);
      error.value = 'Erro ao iniciar reconhecimento de voz';
      isListening.value = false;
      activeSessions.delete(sessionId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      return false;
    }
  };

  // Stop listening
  const stopListening = (sessionId = 'default') => {
    if (recognition.value && isListening.value) {
      try {
        recognition.value.stop();
        isListening.value = false;
        activeSessions.delete(sessionId);

        // FIX Voice Timeout: Clear timeout
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
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
