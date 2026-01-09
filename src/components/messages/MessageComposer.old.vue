<template>
  <div class="message-composer-modal" v-if="isOpen">
    <div class="modal-overlay" @click="close"></div>
    
    <div class="modal-container">
      <div class="modal-header">
        <h3>{{ $t('messages.compose.title') }}</h3>
        <button @click="close" class="close-button" :aria-label="$t('common.close')">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>

      <div class="modal-body">
        <!-- Tipo de mensaje -->
        <div class="form-group">
          <label>{{ $t('messages.compose.messageType') }}</label>
          <select v-model="form.type" class="form-control">
            <option value="chat">{{ $t('messages.compose.chat') }}</option>
            <option value="notification" v-if="canSendNotifications">
              {{ $t('messages.compose.notification') }}
            </option>
          </select>
        </div>

        <!-- Destinatario -->
        <div class="form-group">
          <label>{{ $t('messages.compose.recipient') }} *</label>
          <select v-model="form.recipientType" @change="loadRecipients" class="form-control">
            <option value="">{{ $t('messages.compose.selectRecipientType') }}</option>
            <option value="collaborator">{{ $t('messages.compose.collaborator') }}</option>
            <option value="administrator">{{ $t('messages.compose.administrator') }}</option>
            <option value="business">{{ $t('messages.compose.business') }}</option>
          </select>
        </div>

        <div class="form-group" v-if="form.recipientType">
          <label>{{ $t('messages.compose.selectRecipient') }} *</label>
          <select v-model="form.recipientId" class="form-control" :disabled="loadingRecipients">
            <option value="">{{ loadingRecipients ? $t('common.loading') : $t('messages.compose.chooseRecipient') }}</option>
            <option 
              v-for="recipient in recipients" 
              :key="recipient.id" 
              :value="recipient.id"
            >
              {{ recipient.name || recipient.email }}
            </option>
          </select>
        </div>

        <!-- Categoría -->
        <div class="form-group">
          <label>{{ $t('messages.compose.category') }} *</label>
          <select v-model="form.category" class="form-control">
            <option value="direct_message">{{ $t('messages.categories.direct_message') }}</option>
            <option value="announcement">{{ $t('messages.categories.announcement') }}</option>
            <option value="attention_reminder">{{ $t('messages.categories.attention_reminder') }}</option>
            <option value="booking_reminder">{{ $t('messages.categories.booking_reminder') }}</option>
            <option value="booking_confirmed">{{ $t('messages.categories.booking_confirmed') }}</option>
            <option value="task_assigned">{{ $t('messages.categories.task_assigned') }}</option>
            <option value="stock">{{ $t('messages.categories.stock') }}</option>
            <option value="low_stock">{{ $t('messages.categories.low_stock') }}</option>
            <option value="payment_received">{{ $t('messages.categories.payment_received') }}</option>
            <option value="payment_pending">{{ $t('messages.categories.payment_pending') }}</option>
          </select>
        </div>

        <!-- Prioridad -->
        <div class="form-group">
          <label>{{ $t('messages.compose.priority') }}</label>
          <select v-model="form.priority" class="form-control">
            <option value="normal">{{ $t('messages.priorities.normal') }}</option>
            <option value="high">{{ $t('messages.priorities.high') }}</option>
            <option value="urgent">{{ $t('messages.priorities.urgent') }}</option>
            <option value="low">{{ $t('messages.priorities.low') }}</option>
          </select>
        </div>

        <!-- Título -->
        <div class="form-group">
          <label>{{ $t('messages.compose.title') }} *</label>
          <input 
            v-model="form.title" 
            type="text" 
            class="form-control"
            :placeholder="$t('messages.compose.titlePlaceholder')"
            maxlength="100"
          />
        </div>

        <!-- Contenido -->
        <div class="form-group">
          <label>{{ $t('messages.compose.content') }} *</label>
          <textarea 
            v-model="form.content" 
            class="form-control"
            :placeholder="$t('messages.compose.contentPlaceholder')"
            rows="6"
            maxlength="500"
          ></textarea>
          <small class="char-count">{{ form.content.length }}/500</small>
        </div>

        <!-- Acción (opcional) -->
        <div class="form-group">
          <label>{{ $t('messages.compose.actionLink') }}</label>
          <input 
            v-model="form.actionLink" 
            type="text" 
            class="form-control"
            :placeholder="$t('messages.compose.actionLinkPlaceholder')"
          />
        </div>

        <div class="form-group" v-if="form.actionLink">
          <label>{{ $t('messages.compose.actionLabel') }}</label>
          <input 
            v-model="form.actionLabel" 
            type="text" 
            class="form-control"
            :placeholder="$t('messages.compose.actionLabelPlaceholder')"
          />
        </div>
      </div>

      <div class="modal-footer">
        <button @click="close" class="btn btn-secondary">
          {{ $t('common.cancel') }}
        </button>
        <button 
          @click="send" 
          class="btn btn-primary" 
          :disabled="!canSend || sending"
        >
          <i class="bi bi-send" v-if="!sending"></i>
          <span class="spinner-border spinner-border-sm" v-if="sending"></span>
          {{ sending ? $t('common.sending') : $t('messages.compose.send') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import internalMessageService from '@/application/services/internal-message';
import { requestBackend } from '@/application/api';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  userRole: {
    type: String,
    default: 'collaborator', // 'master', 'administrator', 'collaborator'
  },
});

const emit = defineEmits(['close', 'sent']);

const { t } = useI18n();

const form = ref({
  type: 'chat',
  recipientType: '',
  recipientId: '',
  category: 'direct_message',
  priority: 'normal',
  title: '',
  content: '',
  actionLink: '',
  actionLabel: '',
});

const recipients = ref([]);
const loadingRecipients = ref(false);
const sending = ref(false);

const canSendNotifications = computed(() => {
  return props.userRole === 'master' || props.userRole === 'administrator';
});

const canSend = computed(() => {
  return (
    form.value.recipientId &&
    form.value.recipientType &&
    form.value.category &&
    form.value.title.trim() &&
    form.value.content.trim()
  );
});

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    resetForm();
  }
});

async function loadRecipients() {
  if (!form.value.recipientType) {
    recipients.value = [];
    return;
  }

  loadingRecipients.value = true;
  try {
    let endpoint = '';
    switch (form.value.recipientType) {
      case 'collaborator':
        endpoint = '/collaborator';
        break;
      case 'administrator':
        endpoint = '/administrator';
        break;
      case 'business':
        endpoint = '/business';
        break;
    }

    const response = await requestBackend.get(endpoint);
    recipients.value = response.data.map(item => ({
      id: item.id,
      name: item.name || item.businessName || `${item.firstName || ''} ${item.lastName || ''}`.trim(),
      email: item.email,
    }));
  } catch (error) {
    console.error('Error loading recipients:', error);
    recipients.value = [];
  } finally {
    loadingRecipients.value = false;
  }
}

async function send() {
  if (!canSend.value || sending.value) return;

  sending.value = true;
  try {
    if (form.value.type === 'chat') {
      // Enviar como chat (mensaje entre usuarios)
      await internalMessageService.sendMessage({
        category: form.value.category,
        priority: form.value.priority,
        title: form.value.title,
        content: form.value.content,
        icon: getCategoryIcon(form.value.category),
        actionLink: form.value.actionLink || undefined,
        actionLabel: form.value.actionLabel || undefined,
        recipientId: form.value.recipientId,
        recipientType: form.value.recipientType,
      });
    } else {
      // Enviar como notificación del sistema
      await internalMessageService.sendSystemNotification({
        category: form.value.category,
        priority: form.value.priority,
        title: form.value.title,
        content: form.value.content,
        icon: getCategoryIcon(form.value.category),
        actionLink: form.value.actionLink || undefined,
        actionLabel: form.value.actionLabel || undefined,
        recipientId: form.value.recipientId,
        recipientType: form.value.recipientType,
      });
    }

    emit('sent');
    close();
  } catch (error) {
    console.error('Error sending message:', error);
    alert(t('messages.compose.error'));
  } finally {
    sending.value = false;
  }
}

function getCategoryIcon(category) {
  const icons = {
    direct_message: 'bi-chat-dots',
    announcement: 'bi-megaphone',
    attention_reminder: 'bi-person-circle',
    booking_reminder: 'bi-calendar-event',
    booking_confirmed: 'bi-calendar-check',
    booking_cancelled: 'bi-calendar-x',
    stock: 'bi-box',
    low_stock: 'bi-box-seam',
    out_of_stock: 'bi-exclamation-triangle',
    payment_received: 'bi-credit-card-2-front',
    payment_pending: 'bi-credit-card',
    payment_overdue: 'bi-exclamation-circle',
    plan_expiring: 'bi-hourglass-split',
    plan_expired: 'bi-hourglass',
    plan_upgraded: 'bi-arrow-up-circle',
    survey_pending: 'bi-clipboard-check',
    document_available: 'bi-file-earmark-text',
    form_pending: 'bi-file-earmark-check',
    system_update: 'bi-gear',
    feature_announcement: 'bi-stars',
    maintenance: 'bi-tools',
    task_assigned: 'bi-list-task',
    task_completed: 'bi-check-circle',
    task_overdue: 'bi-clock-history',
  };
  return icons[category] || 'bi-envelope';
}

function resetForm() {
  form.value = {
    type: 'chat',
    recipientType: '',
    recipientId: '',
    category: 'direct_message',
    priority: 'normal',
    title: '',
    content: '',
    actionLink: '',
    actionLabel: '',
  };
  recipients.value = [];
}

function close() {
  emit('close');
}
</script>

<style scoped>
.message-composer-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
}

.modal-container {
  position: relative;
  background: white;
  border-radius: 1rem;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-width: 600px;
  width: 90%;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s ease;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 2px solid #e9ecef;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #004aad 0%, #0066cc 100%);
  color: white;
  border-radius: 1rem 1rem 0 0;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.close-button {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  padding: 0.5rem;
  border-radius: 0.5rem;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.3);
}

.modal-body {
  padding: 1.5rem;
  overflow-y: auto;
  flex: 1;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #495057;
  font-size: 0.875rem;
}

.form-control {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e9ecef;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  transition: all 0.2s ease;
}

.form-control:focus {
  outline: none;
  border-color: #004aad;
  box-shadow: 0 0 0 3px rgba(0, 74, 173, 0.1);
}

.form-control:disabled {
  background: #f8f9fa;
  cursor: not-allowed;
}

textarea.form-control {
  resize: vertical;
  font-family: inherit;
}

.char-count {
  display: block;
  text-align: right;
  color: #6c757d;
  font-size: 0.75rem;
  margin-top: 0.25rem;
}

.modal-footer {
  padding: 1.5rem;
  border-top: 2px solid #e9ecef;
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
}

.btn {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: #e9ecef;
  color: #495057;
}

.btn-secondary:hover:not(:disabled) {
  background: #dee2e6;
}

.btn-primary {
  background: linear-gradient(135deg, #004aad 0%, #0066cc 100%);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 74, 173, 0.3);
}

.spinner-border-sm {
  width: 1rem;
  height: 1rem;
  border-width: 0.15em;
}
</style>
