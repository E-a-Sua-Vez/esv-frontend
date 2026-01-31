<template>
  <div class="conversation-carousel">
    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>{{ $t('chat.loadingConversations') }}</p>
    </div>

    <!-- Conversations Carousel -->
    <div v-else-if="conversations.length > 0" class="conversations">
      <div
        v-for="conversation in conversations"
        :key="conversation.id"
        class="conversation-item"
        :class="{ active: conversation.id === activeId }"
        @click="$emit('select', conversation.id)"
      >
        <!-- Avatar -->
        <div class="conversation-avatar">
          <i class="bi bi-person-circle"></i>
          <span v-if="conversation.unreadCount > 0" class="unread-badge">
            {{ conversation.unreadCount }}
          </span>
        </div>

        <!-- Name -->
        <div class="conversation-name">{{ getParticipantName(conversation) }}</div>

        <!-- Archive Button -->
        <button
          class="archive-button"
          @click.stop="$emit('archive', conversation.id)"
          :title="$t('chat.archive')"
        >
          <i class="bi bi-archive"></i>
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="empty-state">
      <i class="bi bi-chat-dots"></i>
      <p>{{ $t('chat.noConversations') }}</p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  conversations: {
    type: Array,
    default: () => [],
  },
  activeId: {
    type: String,
    default: null,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  currentUserId: {
    type: String,
    default: null,
  },
});

defineEmits(['select', 'archive']);

const { t } = useI18n();

const looksLikeId = s => typeof s === 'string' && /^[A-Za-z0-9_-]{16,}$/.test(s);

const getParticipantName = conversation => {
  if (!conversation.participants || conversation.participants.length < 2) {
    return t('chat.unknownUser');
  }

  // Buscar el otro participante (no el usuario actual)
  const otherParticipant = conversation.participants.find(p => {
    if (!props.currentUserId) return true;
    return (p.userId || p.id) !== props.currentUserId;
  });

  // Candidato inicial a mostrar
  let candidate =
    otherParticipant?.userName ||
    otherParticipant?.name ||
    otherParticipant?.email ||
    otherParticipant?.displayName ||
    null;

  // Si el candidato parece un ID crudo o está vacío, intentar mejorar
  if (!candidate || looksLikeId(candidate)) {
    // 1) Usar lastMessageSenderId si corresponde al otro participante
    const sender = conversation.lastMessageSenderId;
    if (sender) {
      const senderId = typeof sender === 'object' ? sender.id || sender.userId : sender;
      const otherId = otherParticipant?.userId || otherParticipant?.id;
      if (senderId && otherId && senderId === otherId && typeof sender === 'object') {
        candidate = sender.name || sender.email || candidate;
      }
    }

    // 2) Buscar en participantIds si hay objeto con nombre/email
    if (!candidate && Array.isArray(conversation.participantIds)) {
      const match = conversation.participantIds.find(entry => {
        const entryId = typeof entry === 'object' ? entry.id || entry.userId : entry;
        const otherId = otherParticipant?.userId || otherParticipant?.id;
        return entryId && otherId && entryId === otherId && typeof entry === 'object';
      });
      if (match && typeof match === 'object') {
        candidate = match.name || match.email || candidate;
      }
    }
  }

  // Si aún tenemos un ID crudo, crear una representación más amigable
  const finalCandidate = candidate || otherParticipant?.userId || otherParticipant?.id;
  if (finalCandidate && looksLikeId(finalCandidate)) {
    return `Usuario ${finalCandidate.substring(0, 6)}...`;
  }

  return finalCandidate || t('chat.unknownUser');
};

// Eliminado el indicador por actividad reciente para evitar confusión.

const formatTime = timestamp => {
  if (!timestamp) return '';

  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return t('chat.time.justNow');
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days === 1) return t('chat.time.yesterday');
  if (days < 7) return `${days}d`;

  return date.toLocaleDateString();
};
</script>

<style scoped>
.conversation-carousel {
  display: flex;
  flex-direction: column;
  background: white;
  height: 100%;
  max-height: 180px;
}

.loading-state {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: 0.75rem;
  gap: 0.5rem;
  color: #6c757d;
  font-size: 0.875rem;
}

.spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #e9ecef;
  border-top-color: #6f42c1;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.conversations {
  display: flex;
  flex-direction: row;
  overflow-x: auto;
  overflow-y: hidden;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  scrollbar-width: thin;
  scrollbar-color: #cbd5e0 #f7fafc;
  white-space: nowrap;
  min-height: 100px;
  max-height: 120px;
}

.conversations::-webkit-scrollbar {
  height: 8px;
}

.conversations::-webkit-scrollbar-track {
  background: #f7fafc;
  border-radius: 4px;
}

.conversations::-webkit-scrollbar-thumb {
  background: #cbd5e0;
  border-radius: 4px;
}

.conversations::-webkit-scrollbar-thumb:hover {
  background: #a0aec0;
}

.conversation-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  min-width: 60px;
  flex-shrink: 0;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  padding: 0.375rem;
  border-radius: 0.5rem;
}

.conversation-item:hover {
  background: #f8f9fa;
}

.conversation-item.active {
  background: #f0e6ff;
}

.conversation-avatar {
  position: relative;
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  color: white;
  font-size: 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.conversation-item.active .conversation-avatar {
  box-shadow: 0 0 0 3px #6f42c1;
}

.unread-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 6px;
  background: #dc3545;
  color: white;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: 700;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* Indicador eliminado */

.conversation-name {
  font-size: 0.6875rem;
  text-align: center;
  color: #212529;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 60px;
}

.conversation-item.active .conversation-name {
  color: #6f42c1;
  font-weight: 600;
}

.empty-state {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  gap: 0.5rem;
  color: #6c757d;
  font-size: 0.875rem;
}

.empty-state i {
  font-size: 1.25rem;
  opacity: 0.3;
}

.empty-state p {
  font-size: 0.875rem;
  margin: 0;
}

@media (max-width: 640px) {
  .conversations {
    padding: 0.25rem;
    gap: 0.25rem;
  }

  .conversation-item {
    min-width: 50px;
    max-width: 60px;
    padding: 0.25rem;
  }

  .conversation-avatar {
    width: 36px;
    height: 36px;
    font-size: 1.25rem;
  }

  .conversation-name {
    font-size: 0.625rem;
  }
}

/* Archive Button */
.archive-button {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  border: none;
  background: rgba(220, 53, 69, 0.9);
  color: white;
  border-radius: 50%;
  cursor: pointer;
  display: none;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  transition: all 0.2s ease;
}

.conversation-item:hover .archive-button {
  display: flex;
}

.archive-button:hover {
  background: #dc3545;
  transform: scale(1.1);
}

.archive-button i {
  font-size: 0.65rem;
}
</style>
