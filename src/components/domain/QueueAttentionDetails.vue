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
      if (this.queue.currentNumber === 0) {
        return 0;
      }
      return this.queue.currentNumber - this.queue.currentAttentionNumber + 1;
    },
    goToProcessingAttention(attention) {
      this.$router.push({ path: `/interno/colaborador/atencion/${attention.id}/validar` });
      const modalCloseButton = document.getElementById('close-modal');
      modalCloseButton.click();
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
    <div v-if="queue.active && !loading" id="indicators">
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
    <div v-if="queue.active && !loading" class="row mt-2" id="attentions">
      <div class="col-7">
        <div>
          <span class="fw-bold"
            >{{ $t('collaboratorQueuesView.attending') }}
            <span
              :class="`badge rounded-pill m-0 indicator ${
                queueProcessingDetails.length === 0 ? 'text-bg-success' : 'text-bg-primary'
              }`"
            >
              <i class="bi bi-person-fill"></i>
              {{ queueProcessingDetails.length }}
            </span>
          </span>
        </div>
        <div v-if="queueProcessingDetails.length > 0" class="attentions-card">
          <div v-for="(attention, index) in queueProcessingDetails" :key="index" class="mt-2">
            <div v-if="attention.block">
              <span class="lefted badge rounded-pill bg-primary m-0">
                {{ attention.block.hourFrom }}</span
              >
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
      </div>
      <div class="col-5">
        <div>
          <span class="fw-bold"
            >{{ $t('collaboratorQueuesView.attentions') }}
            <span
              :class="`badge rounded-pill m-0 indicator ${
                queuePendingDetails.length === 0 ? 'text-bg-success' : 'text-bg-primary'
              }`"
            >
              <i class="bi bi-person-fill"></i>
              {{ queuePendingDetails.length }}
            </span>
          </span>
        </div>
        <div v-if="queuePendingDetails.length > 0" class="attentions-card">
          <div v-for="(attention, index) in queuePendingDetails" :key="index" class="mt-2">
            <div v-if="attention.block">
              <span class="lefted badge rounded-pill bg-primary m-0">
                {{ attention.block.hourFrom }}</span
              >
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
              :show-data="false"
              :to-list="true"
            >
            </AttentionNumber>
          </div>
        </div>
        <div v-else>
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
.attentions-card {
  background-color: var(--color-background);
  padding: 0.5rem;
  margin-bottom: 1rem;
  border-radius: 0.5rem;
  border: 0.5px solid var(--gris-default);
  align-items: left;
  overflow-y: scroll;
  height: 400px;
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
</style>
