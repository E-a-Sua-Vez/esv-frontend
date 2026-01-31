<template>
  <div class="telemedicine-chat patient-form-modern">
    <div class="chat-header">
      <div class="chat-header-content">
        <div class="chat-header-icon">
          <i class="bi bi-chat-dots"></i>
        </div>
        <div class="chat-header-title">
          <h5>Chat de Consulta</h5>
          <span v-if="connected" class="status-badge badge-modern badge-modern-success">
            <i class="bi bi-circle-fill me-1"></i>
            Conectado
          </span>
          <span v-else class="status-badge badge-modern badge-modern-warning">
            <i class="bi bi-circle-fill me-1"></i>
            Conectando...
          </span>
        </div>
      </div>
      <button type="button" class="btn-close" @click="$emit('close')" v-if="showClose"></button>
    </div>

    <div class="chat-messages" ref="messagesContainer">
      <div v-if="loading" class="text-center py-4">
        <Spinner />
      </div>

      <div v-else-if="messages.length === 0" class="empty-state-modern">
        <div class="empty-state-modern-text">No hay mensajes aún. Comienza la conversación.</div>
      </div>

      <div v-else class="messages-list">
        <div
          v-for="message in messages"
          :key="message.id"
          class="message-item"
          :class="{
            'message-sent': message.senderId === currentUserId,
            'message-received': message.senderId !== currentUserId,
          }"
        >
          <div class="message-content">
            <div class="message-header">
              <span class="message-sender">
                {{ message.senderType === 'doctor' ? 'Médico' : 'Paciente' }}
              </span>
              <span class="message-time">
                {{ formatTime(message.timestamp) }}
              </span>
            </div>
            <div class="message-text">{{ message.message }}</div>
            <div
              v-if="message.attachments && message.attachments.length > 0"
              class="message-attachments"
            >
              <a
                v-for="(attachment, index) in message.attachments"
                :key="index"
                :href="attachment.url"
                target="_blank"
                class="attachment-link"
              >
                <i class="bi bi-paperclip me-1"></i>
                {{ attachment.name }}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="chat-input-container">
      <div class="input-group">
        <input
          type="text"
          class="form-control-modern"
          v-model="newMessage"
          @keyup.enter="sendMessage"
          placeholder="Escribe un mensaje..."
          :disabled="!connected || sending"
        />
        <button
          type="button"
          class="btn-modern"
          @click="sendMessage"
          :disabled="!connected || sending || !newMessage.trim()"
        >
          <i v-if="sending" class="spinner-modern"></i>
          <i v-else class="bi bi-send"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { useTelemedicine } from '../../../composables/useTelemedicine';
import {
  getTelemedicineMessages,
  sendTelemedicineMessage,
} from '../../../application/services/telemedicine';
import { getDate } from '../../../shared/utils/date';
import Spinner from '../../common/Spinner.vue';

export default {
  name: 'TelemedicineChat',
  components: {
    Spinner,
  },
  props: {
    sessionId: {
      type: String,
      required: true,
    },
    currentUserId: {
      type: String,
      required: true,
    },
    userType: {
      type: String,
      required: true,
      validator: value => ['doctor', 'patient'].includes(value),
    },
    accessKey: {
      type: String,
      required: false,
      default: null,
    },
    showClose: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['close', 'message-sent', 'session-ended'],
  setup(props, { emit }) {
    const loading = ref(false);
    const sending = ref(false);
    const messages = reactive([]);
    const newMessage = ref('');
    const messagesContainer = ref(null);

    const {
      connected,
      error,
      connect,
      disconnect,
      sendMessage: sendWsMessage,
      onMessage,
      onSessionCompleted,
    } = useTelemedicine(props.sessionId, props.currentUserId, props.userType, props.accessKey);

    const loadMessages = async () => {
      try {
        loading.value = true;
        const loadedMessages = await getTelemedicineMessages(props.sessionId);
        messages.splice(0, messages.length, ...loadedMessages);
        scrollToBottom();
      } catch (err) {
        console.error('Error loading messages:', err);
      } finally {
        loading.value = false;
      }
    };

    const sendMessage = async () => {
      if (!newMessage.value.trim() || !connected.value) return;

      try {
        sending.value = true;
        const messageText = newMessage.value.trim();
        newMessage.value = '';

        // Enviar mensaje
        await sendTelemedicineMessage({
          sessionId: props.sessionId,
          message: messageText,
          senderType: props.userType,
        });

        // El mensaje se agregará automáticamente cuando llegue por WebSocket
        emit('message-sent', messageText);
      } catch (err) {
        console.error('Error sending message:', err);
        alert('Error al enviar el mensaje');
        newMessage.value = messageText; // Restaurar mensaje
      } finally {
        sending.value = false;
      }
    };

    const scrollToBottom = () => {
      nextTick(() => {
        if (messagesContainer.value) {
          messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
        }
      });
    };

    const formatTime = timestamp => {
      if (!timestamp) return '';
      const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    };

    // Escuchar nuevos mensajes por WebSocket
    onMessage(message => {
      const existingIndex = messages.findIndex(m => m.id === message.id);
      if (existingIndex === -1) {
        messages.push({
          id: message.id,
          sessionId: message.sessionId,
          senderId: message.senderId,
          senderType: message.senderType,
          message: message.message,
          timestamp: new Date(message.timestamp),
          attachments: message.attachments,
        });
        scrollToBottom();
      }
    });

    onMounted(async () => {
      await loadMessages();
      await connect();

      // Escuchar notificación de sesión completada
      onSessionCompleted(data => {
        // Emit event to parent to handle session end
        emit('session-ended');
        emit('close');
      });
    });

    onUnmounted(() => {
      disconnect();
    });

    watch(
      () => messages.length,
      () => {
        scrollToBottom();
      }
    );

    return {
      loading,
      sending,
      messages,
      newMessage,
      messagesContainer,
      connected,
      error,
      sendMessage,
      formatTime,
    };
  },
};
</script>

<style scoped>
@import '../../../shared/styles/prontuario-common.css';

.telemedicine-chat {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 600px;
  padding: 0;
  overflow: hidden;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border-color);
  background: var(--gradient-primary);
  color: white;
}

.chat-header-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.chat-header-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--border-radius-md);
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.chat-header-title h5 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.status-badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  background: #f8f9fa;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.message-item {
  display: flex;
  max-width: 80%;
}

.message-sent {
  align-self: flex-end;
  margin-left: auto;
}

.message-received {
  align-self: flex-start;
}

.message-content {
  padding: 0.75rem 1rem;
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-sm);
}

.message-sent .message-content {
  background: var(--gradient-primary);
  color: white;
}

.message-received .message-content {
  background: white;
  color: var(--color-text);
  border: 1px solid var(--border-color);
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.75rem;
  opacity: 0.8;
}

.message-sender {
  font-weight: 600;
}

.message-time {
  margin-left: 0.5rem;
}

.message-text {
  line-height: 1.5;
  word-wrap: break-word;
}

.message-attachments {
  margin-top: 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.attachment-link {
  display: inline-flex;
  align-items: center;
  font-size: 0.875rem;
  text-decoration: none;
  opacity: 0.9;
}

.message-sent .attachment-link {
  color: white;
}

.message-received .attachment-link {
  color: var(--azul-turno);
}

.chat-input-container {
  padding: 1rem;
  border-top: 1px solid var(--border-color);
  background: white;
}

.input-group {
  display: flex;
  gap: 0.5rem;
}

.input-group .form-control-modern {
  flex: 1;
}

.input-group .btn-modern {
  min-width: 48px;
  padding: 0.5rem;
}

@media (max-width: 768px) {
  .telemedicine-chat {
    max-height: 500px;
  }

  .message-item {
    max-width: 90%;
  }
}
</style>
