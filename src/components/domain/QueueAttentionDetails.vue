<script>
import { getAttentionByDate } from '../../application/services/attention';
import AttentionNumber from '../../components/common/AttentionNumber.vue';
import Message from '../../components/common/Message.vue';
import Spinner from '../../components/common/Spinner.vue';
import { getActiveFeature } from '../../shared/features';
import { filterAttentionsByToday } from '../../shared/utils/attention';
import {
  updatedAvailableAttentions,
  updatedProcessingAttentions,
  updatedTerminatedAttentions,
} from '../../application/firebase';

export default {
  name: 'QueueAttentionDetails',
  components: { AttentionNumber, Message, Spinner },

  props: {
    queue: { type: Object, default: null },

    // ⚠️ null = no me pasaron datos (componente será independiente)
    // []   = me pasaron lista vacía (usar props)
    queuePendingDetails: { type: Array, default: () => null },
    queueProcessingDetails: { type: Array, default: () => null },
    queueTerminatedDetails: { type: Array, default: () => null },

    commerce: { type: Object, default: null },
    onClose: { type: Function, default: null },
  },

  data() {
    return {
      loading: false,
      date: new Date().toISOString().slice(0, 10),

      // 👉 estado interno - se usa cuando NO hay props O cuando se usan listeners de Firebase
      internalPending: [],
      internalProcessing: [],
      internalTerminated: [],

      // Firebase listeners (independientes)
      pendingAttentionsRef: null,
      processingAttentionsRef: null,
      terminatedAttentionsRef: null,
    };
  },

  computed: {
    // Check if external data (props) are provided
    hasExternalData() {
      const hasData =
        Array.isArray(this.queuePendingDetails) &&
        Array.isArray(this.queueProcessingDetails) &&
        Array.isArray(this.queueTerminatedDetails);
      return hasData;
    },

    // Use Firebase listeners if queue is provided and no external data
    useFirebaseListeners() {
      return !this.hasExternalData && this.queue?.id;
    },

    pendingList() {
      if (this.hasExternalData) {
        // Use props if provided
        return Array.isArray(this.queuePendingDetails) ? this.queuePendingDetails : [];
      }
      // Use internal state (from Firebase listeners or fetchQueue)
      return Array.isArray(this.internalPending) ? this.internalPending : [];
    },

    processingList() {
      if (this.hasExternalData) {
        // Use props if provided
        return Array.isArray(this.queueProcessingDetails) ? this.queueProcessingDetails : [];
      }
      // Use internal state (from Firebase listeners or fetchQueue)
      return Array.isArray(this.internalProcessing) ? this.internalProcessing : [];
    },

    terminatedList() {
      if (this.hasExternalData) {
        // Use props if provided
        return Array.isArray(this.queueTerminatedDetails) ? this.queueTerminatedDetails : [];
      }
      // Use internal state (from Firebase listeners or fetchQueue)
      return Array.isArray(this.internalTerminated) ? this.internalTerminated : [];
    },

    isStagesEnabled() {
      return (
        this.commerce && getActiveFeature(this.commerce, 'attention-stages-enabled', 'PRODUCT')
      );
    },

    allAttentions() {
      return [...this.pendingList, ...this.processingList, ...this.terminatedList];
    },

    checkInAttentions() {
      if (!this.isStagesEnabled) {
        return this.pendingList;
      }
      // When stages enabled: show CHECK_IN stage OR PENDING status without currentStage (backward compatibility)
      return this.allAttentions.filter(
        a => a?.currentStage === 'CHECK_IN' || (a?.status === 'PENDING' && !a?.currentStage)
      );
    },

    processingAttentions() {
      if (!this.isStagesEnabled) {
        return this.processingList;
      }
      // When stages enabled: show processing stages OR PROCESSING status without currentStage (backward compatibility)
      return this.processingList.filter(
        a =>
          ['PRE_CONSULTATION', 'CONSULTATION', 'POST_CONSULTATION'].includes(a?.currentStage) ||
          (a?.status === 'PROCESSING' && !a?.currentStage)
      );
    },

    checkOutAttentions() {
      if (!this.isStagesEnabled) {
        // When stages disabled: show only CHECKOUT stage attentions (not fully terminated)
        return [];
      }
      // When stages enabled: show CHECKOUT stage only (not fully terminated)
      return filterAttentionsByToday(
        this.allAttentions.filter(a => a?.currentStage === 'CHECKOUT')
      );
    },

    terminatedAttentions() {
      // Show fully terminated attentions (TERMINATED/RATED/SKIPED that have passed checkout)
      if (!this.isStagesEnabled) {
        // When stages disabled: show TERMINATED/RATED/SKIPED status
        return filterAttentionsByToday(
          this.terminatedList.filter(a => ['TERMINATED', 'RATED', 'SKIPED'].includes(a?.status)),
        );
      }
      // When stages enabled: show TERMINATED stage OR TERMINATED/RATED/SKIPED status without currentStage (backward compatibility)
      return filterAttentionsByToday(
        this.allAttentions.filter(
          a =>
            a?.currentStage === 'TERMINATED' ||
            (['TERMINATED', 'RATED', 'SKIPED'].includes(a?.status) && !a?.currentStage)
        )
      );
    },
  },

  methods: {
    scrollPipelineLeft() {
      const container = this.$refs.pipelineContainer;
      if (container) {
        const scrollAmount = 320; // column width + gap
        container.scrollBy({
          left: -scrollAmount,
          behavior: 'smooth',
        });
      }
    },

    scrollPipelineRight() {
      const container = this.$refs.pipelineContainer;
      if (container) {
        const scrollAmount = 320; // column width + gap
        container.scrollBy({
          left: scrollAmount,
          behavior: 'smooth',
        });
      }
    },

    async fetchQueue(queue) {
      if (!queue?.id) return;

      this.loading = true;

      try {
        const attentions = await getAttentionByDate(queue.id, this.date);

        this.internalPending = attentions.filter(a => a.status === 'PENDING');
        this.internalProcessing = attentions.filter(a =>
          ['PROCESSING', 'REACTIVATED'].includes(a.status)
        );
        this.internalTerminated = attentions.filter(a =>
          ['TERMINATED', 'RATED', 'SKIPED'].includes(a.status)
        );
      } catch (e) {
        console.error('Error fetching queue details', e);
        this.internalPending = [];
        this.internalProcessing = [];
        this.internalTerminated = [];
      } finally {
        this.loading = false;
      }
    },

    // Initialize Firebase listeners for real-time updates (independent mode)
    initializeFirebaseListeners() {
      console.log('🔍 [QueueAttentionDetails] initializeFirebaseListeners called', {
        queueId: this.queue?.id,
        hasExternalData: this.hasExternalData,
        useFirebaseListeners: this.useFirebaseListeners,
      });

      if (!this.queue?.id || this.hasExternalData) {
        console.log('🔍 [QueueAttentionDetails] Skipping Firebase initialization:', {
          noQueueId: !this.queue?.id,
          hasExternalData: this.hasExternalData,
        });
        return;
      }

      // Clean up previous listeners if they exist
      if (this.pendingAttentionsRef && this.pendingAttentionsRef._unsubscribe) {
        this.pendingAttentionsRef._unsubscribe();
      }
      if (this.processingAttentionsRef && this.processingAttentionsRef._unsubscribe) {
        this.processingAttentionsRef._unsubscribe();
      }
      if (this.terminatedAttentionsRef && this.terminatedAttentionsRef._unsubscribe) {
        this.terminatedAttentionsRef._unsubscribe();
      }

      console.log(
        '🔍 [QueueAttentionDetails] Initializing Firebase listeners for queue:',
        this.queue.id,
      );
      // Initialize Firebase listeners
      this.pendingAttentionsRef = updatedAvailableAttentions(this.queue.id);
      this.processingAttentionsRef = updatedProcessingAttentions(this.queue.id);
      this.terminatedAttentionsRef = updatedTerminatedAttentions(this.queue.id);
      console.log('🔍 [QueueAttentionDetails] Firebase listeners initialized:', {
        pending: !!this.pendingAttentionsRef,
        processing: !!this.processingAttentionsRef,
        terminated: !!this.terminatedAttentionsRef,
      });

      // Function to update internal state from Firebase listeners
      const updateFromFirebase = () => {
        if (!this.queue?.id) {
          console.log('🔍 [QueueAttentionDetails] updateFromFirebase: No queue ID');
          return;
        }

        // Get pending attentions from Firebase
        const pendingArray = this.pendingAttentionsRef?.value || [];
        const pendingList = Array.isArray(pendingArray) ? pendingArray : [];
        const filteredPending = [...pendingList].filter(att => att && att.status === 'PENDING');
        const sortedPending = [...filteredPending].sort((a, b) => {
          const numA = a.number || 0;
          const numB = b.number || 0;
          return numA - numB;
        });
        this.internalPending.splice(0, this.internalPending.length, ...sortedPending);

        // Get processing attentions from Firebase
        const processingArray = this.processingAttentionsRef?.value || [];
        const processingList = Array.isArray(processingArray) ? processingArray : [];
        console.log(
          '🔍 [QueueAttentionDetails] updateFromFirebase - Processing Array:',
          processingArray,
        );
        console.log(
          '🔍 [QueueAttentionDetails] updateFromFirebase - Processing List length:',
          processingList.length,
        );
        if (processingList.length > 0) {
          processingList.forEach((att, idx) => {
            console.log(`🔍 [QueueAttentionDetails] Processing Attention ${idx}:`, {
              id: att.id,
              number: att.number,
              status: att.status,
              currentStage: att.currentStage,
              queueId: att.queueId,
            });
          });
        }
        this.internalProcessing.splice(0, this.internalProcessing.length, ...processingList);

        // Get terminated attentions from Firebase
        const terminatedArray = this.terminatedAttentionsRef?.value || [];
        const terminatedList = Array.isArray(terminatedArray) ? terminatedArray : [];
        const sortedTerminated = [...terminatedList].sort((a, b) => {
          const numA = a.number || 0;
          const numB = b.number || 0;
          return numB - numA;
        });
        this.internalTerminated.splice(0, this.internalTerminated.length, ...sortedTerminated);

        console.log('🔍 [QueueAttentionDetails] updateFromFirebase - Final counts:', {
          pending: this.internalPending.length,
          processing: this.internalProcessing.length,
          terminated: this.internalTerminated.length,
        });
      };

      // Watch for changes in Firebase listeners
      this.$watch(
        () => this.pendingAttentionsRef?.value,
        () => {
          updateFromFirebase();
        },
        { immediate: true, deep: true }
      );

      this.$watch(
        () => this.processingAttentionsRef?.value,
        () => {
          updateFromFirebase();
        },
        { immediate: true, deep: true }
      );

      this.$watch(
        () => this.terminatedAttentionsRef?.value,
        () => {
          updateFromFirebase();
        },
        { immediate: true, deep: true }
      );

      // Force initial update after a brief moment
      this.$nextTick(() => {
        setTimeout(() => {
          updateFromFirebase();
        }, 300);
      });
    },

    async goToAttention(attention) {
      if (!attention) return;

      const attentionId = attention.id || attention.attentionId;
      if (!attentionId) return;

      if (this.onClose) {
        this.onClose();
        await new Promise(r => setTimeout(r, 100));
      }

      let path = `/interno/colaborador/atencion/${attentionId}/validar`;

      if (this.isStagesEnabled) {
        if (attention.currentStage) {
          // Has currentStage - use it to determine path
          if (attention.currentStage === 'CHECK_IN')
            path = `/interno/colaborador/atencion/${attentionId}/check-in`;
          else if (
            ['PRE_CONSULTATION', 'CONSULTATION', 'POST_CONSULTATION'].includes(
              attention.currentStage
            )
          )
            path = `/interno/colaborador/atencion/${attentionId}/atender`;
          else if (attention.currentStage === 'CHECKOUT')
            path = `/interno/colaborador/atencion/${attentionId}/checkout`;
          else if (attention.currentStage === 'TERMINATED')
            path = `/interno/colaborador/atencion/${attentionId}/terminated`;
        } else {
          // No currentStage but stages enabled - use status for backward compatibility
          if (attention.status === 'PENDING') {
            path = `/interno/colaborador/atencion/${attentionId}/check-in`;
          } else if (attention.status === 'PROCESSING') {
            path = `/interno/colaborador/atencion/${attentionId}/atender`;
          } else if (['TERMINATED', 'RATED', 'SKIPED'].includes(attention.status)) {
            // Check if this attention is in the terminated list (fully terminated, not just checkout)
            // If it's in terminatedAttentions, go to terminated page, otherwise checkout
            const isFullyTerminated = this.terminatedAttentions.some(
              a => (a.id || a.attentionId) === attentionId
            );
            if (isFullyTerminated) {
              path = `/interno/colaborador/atencion/${attentionId}/terminated`;
            } else {
              path = `/interno/colaborador/atencion/${attentionId}/checkout`;
            }
          }
        }
      } else {
        // Stages disabled - check if attention is fully terminated
        if (['TERMINATED', 'RATED', 'SKIPED'].includes(attention.status)) {
          const isFullyTerminated = this.terminatedAttentions.some(
            a => (a.id || a.attentionId) === attentionId
          );
          if (isFullyTerminated) {
            path = `/interno/colaborador/atencion/${attentionId}/terminated`;
          }
        }
      }

      this.$router.push(path);
    },
  },

  mounted() {
    // Initialize Firebase listeners if queue is provided and no external data
    console.log('🔍 [QueueAttentionDetails] mounted', {
      queueId: this.queue?.id,
      hasExternalData: this.hasExternalData,
      useFirebaseListeners: this.useFirebaseListeners,
    });

    if (this.useFirebaseListeners) {
      this.initializeFirebaseListeners();
    } else if (!this.hasExternalData && this.queue?.id) {
      // Fallback to API fetch if Firebase not available
      this.fetchQueue(this.queue);
    } else {
      // Queue might not be available yet, try again after a delay
      this.$nextTick(() => {
        setTimeout(() => {
          if (this.useFirebaseListeners && !this.pendingAttentionsRef) {
            console.log('🔍 [QueueAttentionDetails] Retrying Firebase initialization after delay');
            this.initializeFirebaseListeners();
          }
        }, 500);
      });
    }
  },

  beforeUnmount() {
    // Clean up Firebase listeners
    if (this.pendingAttentionsRef && this.pendingAttentionsRef._unsubscribe) {
      this.pendingAttentionsRef._unsubscribe();
    }
    if (this.processingAttentionsRef && this.processingAttentionsRef._unsubscribe) {
      this.processingAttentionsRef._unsubscribe();
    }
    if (this.terminatedAttentionsRef && this.terminatedAttentionsRef._unsubscribe) {
      this.terminatedAttentionsRef._unsubscribe();
    }
  },

  watch: {
    async queue(newQ, oldQ) {
      if (this.useFirebaseListeners && newQ?.id && newQ.id !== oldQ?.id) {
        // Re-initialize Firebase listeners if queue changed
        this.initializeFirebaseListeners();
      } else if (
        !this.hasExternalData &&
        !this.useFirebaseListeners &&
        newQ?.id &&
        newQ.id !== oldQ?.id
      ) {
        // Fallback to API fetch
        await this.fetchQueue(newQ);
      }
    },
    queuePendingDetails: {
      handler() {
        // Props changed - component will reactively update
      },
      deep: true,
      immediate: true,
    },
    queueProcessingDetails: {
      handler() {
        // Props changed - component will reactively update
      },
      deep: true,
      immediate: true,
    },
    queueTerminatedDetails: {
      handler() {
        // Props changed - component will reactively update
      },
      deep: true,
      immediate: true,
    },
  },
};
</script>

<template>
  <div>
    <Spinner :show="loading" />
    <div v-if="queue?.active && !loading" class="attention-pipeline-wrapper mt-3">
      <!-- Pipeline Carousel Container -->
      <div class="attention-pipeline-carousel-wrapper">
        <!-- Left Arrow -->
        <button
          class="attention-pipeline-nav-arrow attention-pipeline-nav-left"
          @click="scrollPipelineLeft"
          aria-label="Scroll left"
        >
          <i class="bi bi-chevron-left"></i>
        </button>

        <!-- Pipeline Columns Container -->
        <div class="attention-pipeline-carousel-container" ref="pipelineContainer">
          <div class="attention-pipeline-row">
            <!-- Check-In Column: Stages enabled (CHECK_IN) or Traditional (PENDING) -->
            <div class="attention-pipeline-column">
              <div class="attention-column-header">
                <span class="attention-column-title">
                  <i class="bi bi-play-circle-fill attention-column-icon icon-info"></i>
                  {{ $t('collaboratorQueuesView.checkIn') }}
                </span>
                <span
                  :class="`attention-count-badge ${
                    checkInAttentions.length === 0 ? 'badge-success' : 'badge-primary'
                  }`"
                >
                  <i class="bi bi-person-fill"></i>
                  {{ checkInAttentions.length }}
                </span>
              </div>
              <div v-if="checkInAttentions.length > 0" class="attentions-card modern-card">
                <div
                  v-for="(attention, index) in checkInAttentions"
                  :key="attention.id || index"
                  class="attention-item"
                >
                  <div v-if="attention.block" class="attention-block-badge">
                    <span class="badge rounded-pill bg-primary">
                      {{ attention.block.hourFrom }}
                    </span>
                  </div>
                  <div @click="goToAttention(attention)" class="attention-clickable">
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
            <!-- Em Atendimento Column: Stages enabled (PRE_CONSULTATION, CONSULTATION, POST_CONSULTATION) or Traditional (PROCESSING) -->
            <div class="attention-pipeline-column">
              <div class="attention-column-header">
                <span class="attention-column-title">
                  <i class="bi bi-clock-history attention-column-icon icon-warning"></i>
                  {{ $t('collaboratorQueuesView.inAttention') }}
                </span>
                <span
                  :class="`attention-count-badge ${
                    processingAttentions.length === 0 ? 'badge-success' : 'badge-primary'
                  }`"
                >
                  <i class="bi bi-person-fill"></i>
                  {{ processingAttentions.length }}
                </span>
              </div>
              <div v-if="processingAttentions.length > 0" class="attentions-card modern-card">
                <div
                  v-for="(attention, index) in processingAttentions"
                  :key="attention.id || index"
                  class="attention-item"
                >
                  <div v-if="attention.block" class="attention-block-badge">
                    <span class="badge rounded-pill bg-primary">
                      {{ attention.block.hourFrom }}
                    </span>
                  </div>
                  <div
                    @click="goToAttention(attention)"
                    class="attention-clickable attention-processing"
                  >
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
                      :attention="attention"
                      :show-data="false"
                      :to-list="true"
                    >
                    </AttentionNumber>
                  </div>
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
            <!-- Check-Out Column: Stages enabled (CHECKOUT) or Traditional (TERMINATED) -->
            <div class="attention-pipeline-column">
              <div class="attention-column-header">
                <span class="attention-column-title">
                  <i class="bi bi-check-circle-fill attention-column-icon icon-success"></i>
                  {{ $t('collaboratorQueuesView.checkOut') }}
                </span>
                <span
                  :class="`attention-count-badge ${
                    checkOutAttentions.length === 0 ? 'badge-success' : 'badge-primary'
                  }`"
                >
                  <i class="bi bi-person-fill"></i>
                  {{ checkOutAttentions.length }}
                </span>
              </div>
              <div v-if="checkOutAttentions.length > 0" class="attentions-card modern-card">
                <div
                  v-for="(attention, index) in checkOutAttentions"
                  :key="attention.id || index"
                  class="attention-item"
                >
                  <div v-if="attention.block" class="attention-block-badge">
                    <span class="badge rounded-pill bg-primary">
                      {{ attention.block.hourFrom }}
                    </span>
                  </div>
                  <div @click="goToAttention(attention)" class="attention-clickable">
                    <AttentionNumber
                      :type="
                        attention.type === 'NODEVICE'
                          ? 'no-device'
                          : attention.status === 'TERMINATED' || attention.status === 'RATED'
                          ? 'secondary'
                          : 'primary'
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
            <!-- Terminadas Column: Fully terminated attentions (TERMINATED/RATED/SKIPED) -->
            <div class="attention-pipeline-column">
              <div class="attention-column-header">
                <span class="attention-column-title">
                  <i class="bi bi-check2-all attention-column-icon icon-success"></i>
                  {{ $t('collaboratorQueuesView.terminated') || 'Terminadas' }}
                </span>
                <span
                  :class="`attention-count-badge ${
                    terminatedAttentions.length === 0 ? 'badge-success' : 'badge-primary'
                  }`"
                >
                  <i class="bi bi-person-fill"></i>
                  {{ terminatedAttentions.length }}
                </span>
              </div>
              <div v-if="terminatedAttentions.length > 0" class="attentions-card modern-card">
                <div
                  v-for="(attention, index) in terminatedAttentions"
                  :key="attention.id || index"
                  class="attention-item"
                >
                  <div v-if="attention.block" class="attention-block-badge">
                    <span class="badge rounded-pill bg-primary">
                      {{ attention.block.hourFrom }}
                    </span>
                  </div>
                  <div @click="goToAttention(attention)" class="attention-clickable">
                    <AttentionNumber
                      :type="'secondary'"
                      :number="attention.number"
                      :data="attention.user"
                      :attention="attention"
                      :show-data="false"
                      :to-list="true"
                    >
                    </AttentionNumber>
                  </div>
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

        <!-- Right Arrow -->
        <button
          class="attention-pipeline-nav-arrow attention-pipeline-nav-right"
          @click="scrollPipelineRight"
          aria-label="Scroll right"
        >
          <i class="bi bi-chevron-right"></i>
        </button>
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
  flex-shrink: 0; /* Don't shrink header */
}

.attention-column-title {
  font-weight: 600;
  font-size: 0.95rem;
  color: #333;
  letter-spacing: -0.01em;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.attention-column-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
}

.attention-column-icon.icon-info {
  color: #004aad;
}

.attention-column-icon.icon-warning {
  color: #f9c322;
}

.attention-column-icon.icon-success {
  color: #00c2cb;
}

.attention-count-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.5rem;
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
  padding: 0.4rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(169, 169, 169, 0.2);
  overflow-y: auto;
  flex: 1; /* Take remaining space in column */
  min-height: 550px; /* Approximately 5 cards height */
  display: flex;
  flex-direction: column;
}

.modern-card {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: box-shadow 0.2s ease;
}

.modern-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.attention-item {
  margin-bottom: 0.5rem;
  transition: all 0.2s ease;
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
  flex: 1; /* Take remaining space in column */
  min-height: 550px; /* Approximately 5 cards height */
  display: flex;
  align-items: center;
  justify-content: center;
}

.attention-processing {
  cursor: pointer;
}

.attention-clickable {
  cursor: pointer;
  width: 100%;
  position: relative;
}

.attention-clickable :deep(.attention-card-modern) {
  cursor: pointer;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .attention-column-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .attention-pipeline-column {
    min-height: 500px; /* Slightly smaller on mobile */
  }

  .attentions-card {
    min-height: 450px; /* Slightly smaller on mobile */
    padding: 0.5rem;
  }

  .empty-state-card {
    min-height: 450px; /* Slightly smaller on mobile */
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

/* Pipeline-style horizontal scroll */
.attention-pipeline-wrapper {
  width: 100%;
  position: relative;
}

.attention-pipeline-carousel-wrapper {
  position: relative;
  width: 100%;
}

.attention-pipeline-carousel-container {
  display: flex;
  overflow-x: auto;
  overflow-y: hidden;
  scroll-behavior: smooth;
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.2) transparent;
  padding: 0.5rem 0;
  gap: 1rem;
  -webkit-overflow-scrolling: touch;
}

.attention-pipeline-carousel-container::-webkit-scrollbar {
  height: 8px;
}

.attention-pipeline-carousel-container::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 4px;
}

.attention-pipeline-carousel-container::-webkit-scrollbar-thumb {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.attention-pipeline-carousel-container::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 0, 0, 0.3);
}

.attention-pipeline-row {
  display: flex;
  gap: 1rem;
  min-width: fit-content;
  align-items: stretch; /* Make all columns the same height */
}

.attention-pipeline-column {
  flex: 0 0 calc(33.333% - 0.67rem);
  min-width: 300px;
  max-width: 400px;
  display: flex;
  flex-direction: column;
  min-height: 600px; /* Approximately 5 cards height (each card ~120px) */
}

.attention-pipeline-nav-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  border: 2px solid var(--azul-turno);
  color: var(--azul-turno);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.attention-pipeline-nav-arrow:hover {
  background: var(--azul-turno);
  color: white;
  transform: translateY(-50%) scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

.attention-pipeline-nav-arrow:active {
  transform: translateY(-50%) scale(0.95);
}

.attention-pipeline-nav-left {
  left: 10px;
}

.attention-pipeline-nav-right {
  right: 10px;
}

.attention-column-icon.icon-success {
  color: #00c2cb;
}

/* Responsive adjustments for pipeline */
@media (max-width: 768px) {
  .attention-pipeline-column {
    flex: 0 0 calc(100% - 1rem);
    min-width: 280px;
    max-width: 100%;
  }

  .attention-pipeline-nav-arrow {
    width: 35px;
    height: 35px;
    font-size: 1rem;
  }

  .attention-pipeline-nav-left {
    left: -15px;
  }

  .attention-pipeline-nav-right {
    right: -15px;
  }
}
</style>
