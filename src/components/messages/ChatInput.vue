<template>
  <div class="chat-input">
    <div class="input-container">
      <textarea
        v-model="message"
        ref="textarea"
        :placeholder="$t('chat.input.placeholder')"
        @keydown.enter.exact.prevent="handleSend"
        @keydown.shift.enter="handleNewLine"
        @input="adjustHeight"
        rows="1"
      ></textarea>
      <button
        @click="handleSend"
        class="btn-send"
        :disabled="!canSend"
        :title="$t('chat.input.send')"
      >
        <i class="bi bi-send-fill"></i>
      </button>
    </div>
    <div class="input-hint">
      <span>{{ $t('chat.input.hint') }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue';

const emit = defineEmits(['send']);

const message = ref('');
const textarea = ref(null);

const canSend = computed(() => message.value.trim().length > 0);

const handleSend = () => {
  if (!canSend.value) return;

  const content = message.value.trim();
  emit('send', content);

  message.value = '';
  nextTick(() => {
    adjustHeight();
  });
};

const handleNewLine = event => {
  // Permitir nueva línea con Shift+Enter
  message.value += '\n';
};

const adjustHeight = () => {
  if (!textarea.value) return;

  textarea.value.style.height = 'auto';
  const newHeight = Math.min(textarea.value.scrollHeight, 100); // Max 100px
  textarea.value.style.height = `${newHeight}px`;
};
</script>

<style scoped>
.chat-input {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.input-container {
  display: flex;
  gap: 0.5rem;
  align-items: flex-end;
}

textarea {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid #dee2e6;
  border-radius: 1rem;
  font-size: 0.875rem;
  font-family: inherit;
  line-height: 1.3;
  resize: none;
  transition: all 0.2s ease;
  min-height: 36px;
  max-height: 100px;
  overflow-y: auto;
}

textarea:focus {
  outline: none;
  border-color: #6f42c1;
  box-shadow: 0 0 0 2px rgba(111, 66, 193, 0.1);
}

textarea::placeholder {
  color: #adb5bd;
}

.btn-send {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #6f42c1 0%, #5a32a3 100%);
  color: white;
  border: none;
  border-radius: 50%;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-send:hover:not(:disabled) {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(111, 66, 193, 0.3);
}

.btn-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.input-hint {
  padding: 0 0.25rem;
  font-size: 0.6875rem;
  color: #6c757d;
}

/* Scroll styling for textarea */
textarea::-webkit-scrollbar {
  width: 4px;
}

textarea::-webkit-scrollbar-track {
  background: transparent;
}

textarea::-webkit-scrollbar-thumb {
  background: #dee2e6;
  border-radius: 2px;
}

textarea::-webkit-scrollbar-thumb:hover {
  background: #adb5bd;
}
</style>
