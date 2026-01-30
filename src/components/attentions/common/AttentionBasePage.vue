<template>
  <div class="attention-base-page">
    <!-- Step Bar -->
    <AttentionStepBar
      :current-stage="attention?.currentStage"
      :status="attention?.status"
      :commerce="commerce"
    />

    <!-- Attention Number -->
    <div class="text-center mb-3">
      <AttentionNumber
        :type="attention?.type === 'NODEVICE' ? 'no-device' : 'primary'"
        :number="attention?.number"
        :data="user"
        :attention="attention"
      />
    </div>

    <!-- Stats Cards -->
    <AttentionStatsCards
      :stats="attentionStats"
      :attention="attention"
      :queue="queue"
      :estimated-time="estimatedTime"
      :queue-pending-details="queuePendingDetails"
      :queue-processing-details="queueProcessingDetails"
    />

    <!-- Gestión del Cliente -->
    <div
      v-if="client && client.id && commerce && commerce.id"
      class="client-management-section my-3"
    >
      <h5 class="client-management-title">
        {{ $t('collaboratorQueueAttentions.clientManagement') || 'Gestión del Cliente:' }}
      </h5>
      <ClientDetailsCard
        :show="true"
        :client="client"
        :commerce="commerce"
        :toggles="toggles"
        :queues="commerce?.queues || []"
        :management="true"
        :attention="attention"
        :queue="queue"
      />
    </div>

    <!-- Contenido específico (slot) -->
    <slot name="content"></slot>
  </div>
</template>

<script>
import AttentionStepBar from './AttentionStepBar.vue';
import AttentionStatsCards from './AttentionStatsCards.vue';
import AttentionNumber from '../../common/AttentionNumber.vue';
import ClientDetailsCard from '../../clients/common/ClientDetailsCard.vue';

export default {
  name: 'AttentionBasePage',
  components: {
    AttentionStepBar,
    AttentionStatsCards,
    AttentionNumber,
    ClientDetailsCard,
  },
  props: {
    attention: { type: Object, required: true },
    user: { type: Object, default: null },
    client: { type: Object, default: null },
    commerce: { type: Object, required: true },
    queue: { type: Object, default: null },
    toggles: { type: Object, default: () => ({}) },
    attentionStats: { type: Object, default: null },
    estimatedTime: { type: String, default: null },
    queuePendingDetails: { type: Array, default: () => [] },
    queueProcessingDetails: { type: Array, default: () => [] },
  },
};
</script>

<style scoped>
.attention-base-page {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.client-management-section {
  background: #f8f9fa;
  border-radius: 0.5rem;
  padding: 1rem;
}

.client-management-title {
  font-size: 1rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.8);
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid rgba(0, 74, 173, 0.2);
}

@media (max-width: 768px) {
  .attention-base-page {
    padding: 0.5rem;
  }

  .client-management-section {
    padding: 0.75rem;
  }
}
</style>
