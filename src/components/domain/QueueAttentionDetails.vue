<script>
import { getAttentionByDate } from '../../application/services/attention';
import AttentionNumber from '../common/AttentionNumber.vue';
import Message from '../../components/common/Message.vue';
import Spinner from '../../components/common/Spinner.vue';
import SimpleCard from '../dashboard/common/SimpleCard.vue';

export default {
  name: 'QueueAttentionDetails',
  components: { AttentionNumber, Message, SimpleCard, Spinner },
  props: {
    queue: { type: Object, default: { name: '', active: false } },
    queuePendingDetails: { type: Object, default: [] },
    queueProcessingDetails: { type: Object, default: [] },
    onClose: { type: Function, default: null },
  },
  data() {
    return {
      date: new Date().toISOString().slice(0, 10),
      status: {
        TOTAL: 0,
        PENDING: 0,
        TERMINATED: 0,
      },
      loading: false,
    };
  },
  methods: {
    async getQueueDetails(queue) {
      try {
        const attentions = await getAttentionByDate(queue.id, this.date);
        if (attentions && attentions.length > 0) {
          const total = attentions.length || 0;
          const pending = attentions.filter(att => att.status === 'PENDING').length || 0;
          const terminated =
            attentions.filter(att => ['TERMINATED', 'RATED', 'SKIPED'].includes(att.status))
              .length || 0;
          this.status = {
            TOTAL: total || 0,
            PENDING: pending || 0,
            TERMINATED: terminated || 0,
          };
        }
      } catch (error) {
        this.status = {
          TOTAL: 0,
          PENDING: 0,
          TERMINATED: 0,
        };
        this.loading = false;
      }
    },
    beforeCurrentQueue() {
      if (!this.queue || this.queue.currentNumber === 0) {
        return 0;
      }
      return this.queue.currentNumber - (this.queue.currentAttentionNumber || 0) + 1;
    },
    async goToProcessingAttention(attention) {
      // Close drawer if onClose function is provided (for drawer mode)
      if (this.onClose && typeof this.onClose === 'function') {
        this.onClose();
        // Small delay to allow drawer animation to start before navigation
        await new Promise(resolve => setTimeout(resolve, 100));
      } else {
        // Fallback to modal close (for backward compatibility)
        const modalCloseButton = document.getElementById('close-modal');
        if (modalCloseButton) {
          modalCloseButton.click();
        }
      }
      // Navigate to attention validation
      this.$router.push({ path: `/interno/colaborador/atencion/${attention.id}/validar` });
    },
  },
  watch: {
    queue: {
      immediate: true,
      deep: true,
      async handler(newQueue, oldQueue) {
        if (newQueue && oldQueue && newQueue.id) {
          await this.getQueueDetails(newQueue);
        }
      },
    },
  },
};
</script>

<template>
  <div>
    <Spinner :show="loading"></Spinner>
    <div v-if="queue?.active && !loading" id="indicators">
      <div class="row indicators py-2">
        <div class="col metric-card">
          <div class="metric-card-title">
            {{ $t('queueAttentionDetails.requested') }}
          </div>
          <span class="fw-bold px-2">
            <i :class="`bi bi-qr-code blue-icon`"></i>
            {{ status.TOTAL || 0 }}
          </span>
        </div>
        <div class="col metric-card">
          <div class="metric-card-title">
            {{ $t('queueAttentionDetails.pending') }}
          </div>
          <div>
            <span class="fw-bold px-2">
              <i class="bi bi-play-circle blue-icon"></i>
              {{ status.PENDING || 0 }}
            </span>
          </div>
        </div>
        <div class="col metric-card">
          <div class="metric-card-title">
            {{ $t('queueAttentionDetails.terminated') }}
          </div>
          <div>
            <span class="fw-bold px-2">
              <i class="bi bi-stop-circle green-icon"></i>
              {{ status.TERMINATED || 0 }}
            </span>
          </div>
        </div>
      </div>
    </div>
    <div v-if="queue?.active && !loading" class="row mt-3" id="attentions">
      <div class="col-md-6 col-12 mb-3 mb-md-0">
        <div class="attention-column-header">
          <span class="attention-column-title">{{ $t('collaboratorQueuesView.attending') }}</span>
          <span
            :class="`attention-count-badge ${
              queueProcessingDetails.length === 0 ? 'badge-success' : 'badge-primary'
            }`"
          >
            <i class="bi bi-person-fill"></i>
            {{ queueProcessingDetails.length }}
          </span>
        </div>
        <div v-if="queueProcessingDetails.length > 0" class="attentions-card modern-card">
          <div
            v-for="(attention, index) in queueProcessingDetails"
            :key="index"
            class="attention-item"
          >
            <div v-if="attention.block" class="attention-block-badge">
              <span class="badge rounded-pill bg-primary">
                {{ attention.block.hourFrom }}
              </span>
            </div>
            <AttentionNumber
              :type="
                attention.type === 'NODEVICE'
                  ? 'no-device'
                  : attention.status === 'PENDING' || attention.status === 'REACTIVATED'
                  ? 'primary'
                  : 'secondary'
              "
              :number="attention.number"
              :data="attention.user"
              :show-data="false"
              :to-list="true"
              @click="goToProcessingAttention(attention)"
              class="attention-processing"
            >
            </AttentionNumber>
          </div>
        </div>
        <div v-else class="empty-state-card modern-card">
          <Message
            :title="$t('collaboratorAttentionValidate.message.1.title')"
            :content="$t('collaboratorAttentionValidate.message.1.content')"
            :icon="'bi bi-emoji-sunglasses'"
          >
          </Message>
        </div>
      </div>
      <div class="col-md-6 col-12">
        <div class="attention-column-header">
          <span class="attention-column-title">{{ $t('collaboratorQueuesView.attentions') }}</span>
          <span
            :class="`attention-count-badge ${
              queuePendingDetails.length === 0 ? 'badge-success' : 'badge-primary'
            }`"
          >
            <i class="bi bi-person-fill"></i>
            {{ queuePendingDetails.length }}
          </span>
        </div>
        <div v-if="queuePendingDetails.length > 0" class="attentions-card modern-card">
          <div
            v-for="(attention, index) in queuePendingDetails"
            :key="index"
            class="attention-item"
          >
            <div v-if="attention.block" class="attention-block-badge">
              <span class="badge rounded-pill bg-primary">
                {{ attention.block.hourFrom }}
              </span>
            </div>
            <AttentionNumber
              :type="
                attention.type === 'NODEVICE'
                  ? 'no-device'
                  : attention.status === 'PENDING'
                  ? 'primary'
                  : 'secondary'
              "
              :number="attention.number"
              :data="attention.user"
              :attention="attention"
              :show-data="false"
              :to-list="true"
            >
            </AttentionNumber>
          </div>
        </div>
        <div v-else class="empty-state-card modern-card">
          <Message
            :title="$t('collaboratorAttentionValidate.message.1.title')"
            :content="$t('collaboratorAttentionValidate.message.1.content')"
            :icon="'bi bi-emoji-sunglasses'"
          >
          </Message>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.attention-column-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid rgba(169, 169, 169, 0.15);
}

.attention-column-title {
  font-weight: 600;
  font-size: 0.95rem;
  color: #333;
  letter-spacing: -0.01em;
}

.attention-count-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.75rem;
  border-radius: 1rem;
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
}

.attention-count-badge i {
  font-size: 0.875rem;
}

.attention-count-badge.badge-primary {
  background-color: var(--azul-turno);
  color: var(--color-background);
}

.attention-count-badge.badge-success {
  background-color: #28a745;
  color: var(--color-background);
}

.attentions-card {
  background-color: var(--color-background);
  padding: 0.75rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(169, 169, 169, 0.2);
  overflow-y: auto;
  max-height: 450px;
  min-height: 200px;
}

.modern-card {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: box-shadow 0.2s ease;
}

.modern-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.attention-item {
  margin-bottom: 0.75rem;
  padding: 0.5rem;
  border-radius: 0.5rem;
  transition: background-color 0.2s ease;
}

.attention-item:hover {
  background-color: rgba(169, 169, 169, 0.05);
}

.attention-item:last-child {
  margin-bottom: 0;
}

.attention-block-badge {
  margin-bottom: 0.5rem;
}

.attention-block-badge .badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
}

.empty-state-card {
  background-color: var(--color-background);
  padding: 1.5rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(169, 169, 169, 0.2);
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.indicators {
  border-radius: 0.5rem;
  margin: -0.1rem;
  padding: 0.2rem;
}

.metric-card {
  background-color: var(--color-background);
  padding: 0.2rem;
  margin: 0.1rem;
  border-radius: 0.5rem;
  border: 1px solid var(--gris-default);
}

.metric-card-title {
  margin: 0.1rem;
  font-size: 0.8rem;
  line-height: 0.8rem;
}

.attention-processing {
  cursor: pointer;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .attention-column-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .attentions-card {
    max-height: 350px;
    padding: 0.5rem;
  }

  .empty-state-card {
    min-height: 150px;
    padding: 1rem;
  }
}

/* Scrollbar styling */
.attentions-card::-webkit-scrollbar {
  width: 8px;
}

.attentions-card::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.attentions-card::-webkit-scrollbar-thumb {
  background: rgba(169, 169, 169, 0.3);
  border-radius: 4px;
}

.attentions-card::-webkit-scrollbar-thumb:hover {
  background: rgba(169, 169, 169, 0.5);
}
</style>
