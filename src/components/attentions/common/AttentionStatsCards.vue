<template>
  <div v-if="stats" class="attention-stats-grid mt-3">
    <!-- Elapsed Time Card (only show if attention does NOT come from a booking) -->
    <div
      v-if="!attention.bookingId && !attention.booking && !attention.block"
      class="stat-card stat-card-time"
      :class="`stat-card-${stats.timeStatus}`"
    >
      <div class="stat-card-icon stat-card-icon-with-popper">
        <i class="bi bi-hourglass-split"></i>
        <Popper :class="'dark'" arrow hover placement="top" :z-index="10001">
          <template #content>
            <div class="popper-content">
              <div class="popper-title">Tempo de Espera - Indicadores de Cor</div>
              <div class="popper-item">
                <span class="popper-color" style="background: #00c2cb"></span>
                <span><strong>Verde:</strong> Menos de 10 minutos - Excelente</span>
              </div>
              <div class="popper-item">
                <span class="popper-color" style="background: #f9c322"></span>
                <span><strong>Amarelo:</strong> Menos de 1 hora - Bom</span>
              </div>
              <div class="popper-item">
                <span class="popper-color" style="background: #ff9800"></span>
                <span><strong>Laranja:</strong> Menos de 3 horas - Atenção</span>
              </div>
              <div class="popper-item">
                <span class="popper-color" style="background: #a52a2a"></span>
                <span><strong>Vermelho:</strong> Mais de 3 horas - Urgente</span>
              </div>
            </div>
          </template>
          <i class="bi bi-info-circle popper-trigger-icon"></i>
        </Popper>
      </div>
      <div class="stat-card-content">
        <div class="stat-card-label">
          {{ $t('attentionStats.waitTime') }}
          <span
            v-if="attention.status !== 'PROCESSING'"
            class="spy-live-indicator"
            :title="$t('attentionStats.realTimeUpdate')"
          >
            <span class="spy-live-dot"></span>
          </span>
        </div>
        <div class="stat-card-value" :style="{ color: stats.timeColor }">
          {{ stats.elapsedTime }}
        </div>
      </div>
    </div>

    <!-- Creation Time Card -->
    <div class="stat-card stat-card-creation">
      <div class="stat-card-icon">
        <i class="bi bi-clock-history"></i>
      </div>
      <div class="stat-card-content">
        <div class="stat-card-label">{{ $t('attentionStats.createdAt') }}</div>
        <div class="stat-card-value">{{ stats.creationTime }}</div>
        <div class="stat-card-subvalue">{{ stats.creationDate }}</div>
      </div>
    </div>

    <!-- Queue Position Card (Na Fila) -->
    <div v-if="queuePosition !== null" class="stat-card stat-card-pending">
      <div class="stat-card-icon">
        <i class="bi bi-people-fill"></i>
      </div>
      <div class="stat-card-content">
        <div class="stat-card-label">
          {{ $t('attentionStats.inQueue') || 'Na Fila' }}
          <span class="spy-live-indicator" title="Actualización en tiempo real">
            <span class="spy-live-dot"></span>
          </span>
        </div>
        <div class="stat-card-value">{{ queuePosition }}</div>
      </div>
    </div>

    <!-- Estimated Time Card (Tempo Estimado) -->
    <div v-if="estimatedTime" class="stat-card stat-card-estimated">
      <div class="stat-card-icon">
        <i class="bi bi-stopwatch"></i>
      </div>
      <div class="stat-card-content">
        <div class="stat-card-label">
          {{ $t('attentionStats.estimatedTime') || 'Tempo Estimado' }}
          <Popper
            v-if="stats?.usingIntelligentEstimation"
            :class="'dark'"
            arrow
            hover
            disable-click-away
            :content="
              $t('collaboratorQueuesView.intelligentEstimationTooltip') ||
              'Este tempo foi calculado usando aprendizado inteligente baseado em dados históricos de serviços completados. O sistema aprende continuamente para fornecer estimativas mais precisas.'
            "
          >
            <span class="ai-badge ms-1">
              <i class="bi bi-stars"></i>
            </span>
          </Popper>
        </div>
        <div class="stat-card-value">{{ estimatedTime }}</div>
      </div>
    </div>

    <!-- Processing Time Card (only for PROCESSING attentions) -->
    <div
      v-if="stats.processingTime && attention.status === 'PROCESSING'"
      class="stat-card stat-card-processing"
      :class="`stat-card-${stats.durationStatus || 'neutral'}`"
    >
      <div class="stat-card-icon">
        <i class="bi bi-stopwatch"></i>
      </div>
      <div class="stat-card-content">
        <div class="stat-card-label">
          {{ $t('attentionStats.processingTime') }}
          <span class="spy-live-indicator" :title="$t('attentionStats.realTimeUpdate')">
            <span class="spy-live-dot"></span>
          </span>
        </div>
        <div class="stat-card-value" :style="{ color: stats.durationColor || '#004aad' }">
          {{ stats.processingTime }}
        </div>
        <div v-if="stats.expectedDuration" class="stat-card-subvalue">
          <div class="duration-comparison">
            <span class="duration-label">{{ $t('attentionStats.expectedDuration') }}</span>
            <span class="duration-value" style="color: #666">
              {{ stats.expectedDuration }} min
            </span>
          </div>
          <div
            v-if="stats.minutesRemaining !== null && stats.minutesRemaining >= 0"
            class="duration-comparison"
          >
            <span class="duration-label">{{ $t('attentionStats.remainingTime') }}</span>
            <span class="duration-value" :style="{ color: stats.durationColor }">
              {{ stats.minutesRemaining }} min
            </span>
          </div>
          <div v-else class="duration-comparison">
            <span class="duration-label">{{ $t('attentionStats.exceededTime') }}</span>
            <span class="duration-value" :style="{ color: stats.durationColor }">
              {{ Math.abs(stats.minutesRemaining) }} min
            </span>
          </div>
          <div class="duration-progress">
            <div class="duration-progress-bar">
              <div
                class="duration-progress-fill"
                :style="{
                  width: `${Math.min(stats.durationComparison || 0, 100)}%`,
                  backgroundColor: stats.durationColor,
                }"
              ></div>
            </div>
            <span class="duration-percentage"
              >{{ Math.round(stats.durationComparison || 0) }}%</span
            >
          </div>
        </div>
        <div v-else class="stat-card-subvalue">
          {{ $t('attentionStats.estimatedNotAvailable') }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Popper from 'vue3-popper';

export default {
  name: 'AttentionStatsCards',
  components: { Popper },
  props: {
    stats: { type: Object, default: null },
    attention: { type: Object, required: true },
    queue: { type: Object, default: null },
    estimatedTime: { type: String, default: null },
  },
  computed: {
    queuePosition() {
      if (!this.queue || !this.attention) return null;
      if (this.queue.currentAttentionNumber === 0 || !this.queue.currentAttentionNumber) {
        return 0;
      }
      if (!this.attention.number) return null;
      const position = this.attention.number - this.queue.currentAttentionNumber + 1;
      return position > 0 ? position : 0;
    },
  },
};
</script>

<style scoped>
.attention-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
  overflow: visible;
  position: relative;
}

.stat-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 251, 252, 0.98) 100%);
  border-radius: 12px;
  padding: 0.875rem 1rem;
  border: 1px solid rgba(169, 169, 169, 0.15);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: center;
  gap: 0.75rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: visible;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: var(--stat-color, #a9a9a9);
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  border-color: rgba(169, 169, 169, 0.25);
}

.stat-card-icon {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(0, 0, 0, 0.04);
  color: rgba(0, 0, 0, 0.6);
  font-size: 1.25rem;
}

.stat-card-icon-with-popper {
  position: relative;
}

.popper-trigger-icon {
  position: absolute;
  top: -4px;
  right: -4px;
  font-size: 0.7rem;
  color: rgba(0, 0, 0, 0.4);
  background: rgba(255, 255, 255, 0.9);
  border-radius: 50%;
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: help;
  transition: all 0.2s ease;
}

.popper-trigger-icon:hover {
  color: rgba(0, 0, 0, 0.7);
  background: rgba(255, 255, 255, 1);
  transform: scale(1.1);
}

.stat-card-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.stat-card-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.02em;
  line-height: 1.2;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.stat-card-value {
  font-size: 1.25rem;
  font-weight: 900;
  color: rgba(0, 0, 0, 0.85);
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.stat-card-subvalue {
  font-size: 0.7rem;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.5);
  line-height: 1.2;
}

.spy-live-indicator {
  display: inline-flex;
  align-items: center;
  position: relative;
  margin-left: 0.4rem;
  vertical-align: middle;
}

.spy-live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: #28a745;
  animation: pulse 2s ease-in-out infinite;
  box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7);
  display: inline-block;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(40, 167, 69, 0.7);
    opacity: 1;
  }
  50% {
    box-shadow: 0 0 0 6px rgba(40, 167, 69, 0);
    opacity: 0.8;
  }
  100% {
    box-shadow: 0 0 0 0 rgba(40, 167, 69, 0);
    opacity: 1;
  }
}

/* Status-specific colors */
.stat-card-excellent {
  --stat-color: #00c2cb;
}

.stat-card-excellent .stat-card-icon {
  background: rgba(0, 194, 203, 0.15);
  color: #00c2cb;
}

.stat-card-good {
  --stat-color: #f9c322;
}

.stat-card-good .stat-card-icon {
  background: rgba(249, 195, 34, 0.15);
  color: #f9c322;
}

.stat-card-warning {
  --stat-color: #ff9800;
}

.stat-card-warning .stat-card-icon {
  background: rgba(255, 152, 0, 0.15);
  color: #ff9800;
}

.stat-card-poor {
  --stat-color: #a52a2a;
}

.stat-card-poor .stat-card-icon {
  background: rgba(165, 42, 42, 0.15);
  color: #a52a2a;
}

.stat-card-creation .stat-card-icon {
  background: rgba(0, 74, 173, 0.1);
  color: #004aad;
}

.stat-card-pending .stat-card-icon {
  background: rgba(0, 194, 203, 0.1);
  color: #00c2cb;
}

.stat-card-estimated .stat-card-icon {
  background: rgba(249, 195, 34, 0.1);
  color: #f9c322;
}

.duration-comparison {
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
  font-size: 0.75rem;
}

.duration-label {
  color: #6c757d;
}

.duration-value {
  font-weight: 600;
}

.duration-progress {
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.duration-progress-bar {
  flex: 1;
  height: 0.5rem;
  background: #e9ecef;
  border-radius: 0.25rem;
  overflow: hidden;
}

.duration-progress-fill {
  height: 100%;
  transition: width 0.3s ease;
  border-radius: 0.25rem;
}

.duration-percentage {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6c757d;
  min-width: 3rem;
  text-align: right;
}

/* Popper Styles */
.stat-card-icon-with-popper {
  overflow: visible !important;
  position: relative;
  z-index: 1;
}

/* Popper Styles with proper z-index - Higher than drawer */
/* Ensure popper renders outside parent container */
:deep(.vue3-popper) {
  z-index: 10001 !important;
  position: fixed !important;
}

:deep(.vue3-popper__inner) {
  z-index: 10001 !important;
  position: relative;
}

:deep(.vue3-popper__arrow) {
  z-index: 10002 !important;
}

:deep(.vue3-popper__wrapper) {
  z-index: 10001 !important;
  position: fixed !important;
}

.popper-content {
  padding: 0.5rem 0.6rem;
  min-width: 200px;
  position: relative;
  z-index: 10000;
}

.popper-title {
  font-weight: 700;
  font-size: 0.8rem;
  margin-bottom: 0.4rem;
  color: rgba(255, 255, 255, 0.95);
  text-transform: uppercase;
  letter-spacing: 0.02em;
  line-height: 1.2;
}

.popper-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.35rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.9);
  line-height: 1.3;
}

/* AI Badge Styles */
.ai-badge {
  display: inline-block;
  color: #ffc107;
  font-size: 0.7rem;
  cursor: help;
  vertical-align: middle;
  animation: sparkle 2s ease-in-out infinite;
}

.ai-badge i {
  filter: drop-shadow(0 0 2px rgba(255, 193, 7, 0.5));
}

@keyframes sparkle {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.8;
    transform: scale(1.1);
  }
}

.popper-item:last-child {
  margin-bottom: 0;
}

.popper-color {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 2px solid rgba(255, 255, 255, 0.4);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

/* Responsive */
@media (max-width: 576px) {
  .attention-stats-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
  }

  .stat-card {
    padding: 0.75rem 0.875rem;
  }

  .stat-card-icon {
    width: 36px;
    height: 36px;
    font-size: 1.1rem;
  }

  .stat-card-value {
    font-size: 1.1rem;
  }
}
</style>
