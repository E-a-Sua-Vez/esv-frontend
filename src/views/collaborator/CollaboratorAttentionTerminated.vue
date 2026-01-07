<template>
  <div>
    <Spinner :show="loading"></Spinner>
    <Alert :show="!!alertError" :stack="alertError"></Alert>

    <div class="content text-center">
      <CommerceLogo
        :commerce-id="state.commerce?.id"
        :business-id="state.business?.id"
        :loading="loading"
      />
      <ComponentMenu
        :title="`${$t('collaboratorAttentionValidate.hello-user')}, ${
          state.currentUser?.alias || state.currentUser?.name
        }!`"
        :toggles="state.toggles"
        component-name="collaboratorAttentionTerminated"
        @goBack="goToQueue"
      />
      <QueueName
        v-if="state.queue"
        :queue="state.queue"
        :commerce="state.commerce"
        :details="true"
        :queue-pending-details="state.queuePendingDetails"
        :queue-processing-details="state.queueProcessingDetails"
        :queue-terminated-details="state.queueTerminatedDetails"
        :list-update-key="state.listUpdateKey"
      />

      <!-- Terminated Content -->
      <div v-if="state.attention && state.attention.id" class="terminated-content my-4">
        <!-- Step Bar -->
        <AttentionStepBar
          :current-stage="state.attention?.currentStage"
          :status="state.attention?.status"
          :commerce="state.commerce"
        />

        <!-- Attention Number -->
        <div class="mb-4">
          <AttentionNumber
            :type="'secondary'"
            :number="state.attention.number"
            :data="state.user"
            :attention="state.attention"
            :show-data="true"
            :enable-collapse="true"
          ></AttentionNumber>
        </div>

        <!-- Attention Info Cards Row -->
        <div v-if="totalDurationMetrics || attentionInfo" class="mb-4 attention-info-cards-row">
          <!-- Attention Details Card -->
          <div v-if="attentionInfo" class="attention-info-card">
            <div class="stat-card stat-card-info">
              <div class="stat-card-icon">
                <i class="bi bi-info-circle"></i>
              </div>
              <div class="stat-card-content">
                <div class="stat-card-label">
                  {{ $t('attentionStats.attentionDetails') || 'Informações da Atenção' }}
                </div>
                <div class="attention-info-list">
                  <div v-if="attentionInfo.createdAt" class="attention-info-item">
                    <i class="bi bi-calendar-plus"></i>
                    <span class="info-label">{{ $t('attentionStats.createdAt') }}:</span>
                    <span class="info-value">{{ attentionInfo.createdAt }}</span>
                  </div>
                  <div v-if="attentionInfo.processedAt" class="attention-info-item">
                    <i class="bi bi-clock-history"></i>
                    <span class="info-label"
                      >{{ $t('attentionStats.processedAt') || 'Atendida em' }}:</span
                    >
                    <span class="info-value">{{ attentionInfo.processedAt }}</span>
                  </div>
                  <div v-if="attentionInfo.services" class="attention-info-item">
                    <i class="bi bi-briefcase-fill"></i>
                    <span class="info-label"
                      >{{ $t('attentionStats.services') || 'Serviço(s)' }}:</span
                    >
                    <span class="info-value">{{ attentionInfo.services }}</span>
                  </div>
                  <div v-if="attentionInfo.collaborator" class="attention-info-item">
                    <i class="bi bi-person-badge"></i>
                    <span class="info-label"
                      >{{ $t('attentionStats.collaborator') || 'Colaborador' }}:</span
                    >
                    <span class="info-value">{{ attentionInfo.collaborator }}</span>
                  </div>
                  <div v-if="attentionInfo.bookingDate" class="attention-info-item">
                    <i class="bi bi-calendar-check"></i>
                    <span class="info-label"
                      >{{ $t('attentionStats.bookingDate') || 'Reserva em' }}:</span
                    >
                    <span class="info-value">{{ attentionInfo.bookingDate }}</span>
                  </div>
                  <div v-if="attentionInfo.packageSession" class="attention-info-item">
                    <i class="bi bi-box-seam"></i>
                    <span class="info-label"
                      >{{ $t('attentionStats.packageSession') || 'Sessão do Pacote' }}:</span
                    >
                    <span class="info-value">{{ attentionInfo.packageSession }}</span>
                  </div>
                  <div v-if="attentionInfo.attentionType" class="attention-info-item">
                    <i
                      class="bi"
                      :class="
                        attentionInfo.attentionType === 'telemedicine'
                          ? 'bi-camera-video-fill'
                          : 'bi-person-check-fill'
                      "
                    ></i>
                    <span class="info-label"
                      >{{ $t('attentionStats.attentionType.label') || 'Tipo de Atenção' }}:</span
                    >
                    <span
                      class="info-value attention-type-badge"
                      :class="`attention-type-${attentionInfo.attentionType}`"
                    >
                      {{ attentionInfo.attentionTypeLabel }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Total Duration Card with Metrics -->
          <div v-if="totalDurationMetrics" class="attention-duration-card">
            <div
              class="stat-card stat-card-processing"
              :class="`stat-card-${totalDurationMetrics.durationStatus || 'neutral'}`"
            >
              <div class="stat-card-icon">
                <i class="bi bi-stopwatch"></i>
              </div>
              <div class="stat-card-content">
                <div class="stat-card-label">
                  {{ $t('attentionStats.totalDuration') || 'Tempo Total de Atendimento' }}
                </div>
                <div
                  class="stat-card-value"
                  :style="{ color: totalDurationMetrics.durationColor || '#004aad' }"
                >
                  {{ totalDurationMetrics.totalDuration }}
                </div>
                <div v-if="totalDurationMetrics.expectedDuration" class="stat-card-subvalue">
                  <div class="duration-comparison">
                    <span class="duration-label">{{ $t('attentionStats.expectedDuration') }}</span>
                    <span class="duration-value" style="color: #666">
                      {{ totalDurationMetrics.expectedDuration }} min
                    </span>
                  </div>
                  <div
                    v-if="
                      totalDurationMetrics.minutesDifference !== null &&
                      totalDurationMetrics.minutesDifference >= 0
                    "
                    class="duration-comparison"
                  >
                    <span class="duration-label">{{
                      $t('attentionStats.underTime') || 'Tempo abaixo do esperado'
                    }}</span>
                    <span
                      class="duration-value"
                      :style="{ color: totalDurationMetrics.durationColor }"
                    >
                      {{ totalDurationMetrics.minutesDifference }} min
                    </span>
                  </div>
                  <div v-else class="duration-comparison">
                    <span class="duration-label">{{ $t('attentionStats.exceededTime') }}</span>
                    <span
                      class="duration-value"
                      :style="{ color: totalDurationMetrics.durationColor }"
                    >
                      {{ Math.abs(totalDurationMetrics.minutesDifference) }} min
                    </span>
                  </div>
                  <div class="duration-progress">
                    <div class="duration-progress-bar">
                      <div
                        class="duration-progress-fill"
                        :style="{
                          width: `${Math.min(totalDurationMetrics.durationComparison || 0, 100)}%`,
                          backgroundColor: totalDurationMetrics.durationColor,
                        }"
                      ></div>
                    </div>
                    <span class="duration-percentage"
                      >{{ Math.round(totalDurationMetrics.durationComparison || 0) }}%</span
                    >
                  </div>
                </div>
                <div v-else class="stat-card-subvalue">
                  {{ $t('attentionStats.estimatedNotAvailable') }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Survey Results Card -->
        <div v-if="surveyInfo" class="mb-4 survey-results-card">
          <div class="stat-card stat-card-survey">
            <div class="stat-card-icon">
              <i class="bi bi-star-fill"></i>
            </div>
            <div class="stat-card-content">
              <div class="stat-card-label">
                {{ $t('attentionStats.surveyResults') || 'Resultados da Pesquisa de Satisfação' }}
              </div>
              <div class="survey-metrics">
                <div v-if="surveyInfo.csat" class="survey-metric-item">
                  <div class="survey-metric-header">
                    <i class="bi bi-star-fill survey-metric-icon csat-icon"></i>
                    <span class="survey-metric-label">CSAT</span>
                  </div>
                  <div class="survey-metric-value" :class="surveyInfo.csatClass">
                    {{ surveyInfo.csat }}
                  </div>
                  <div class="survey-metric-description">{{ surveyInfo.csatDescription }}</div>
                </div>
                <div
                  v-if="surveyInfo.nps !== null && surveyInfo.nps !== undefined"
                  class="survey-metric-item"
                >
                  <div class="survey-metric-header">
                    <i class="bi bi-emoji-smile-fill survey-metric-icon nps-icon"></i>
                    <span class="survey-metric-label">NPS</span>
                  </div>
                  <div class="survey-metric-value" :class="surveyInfo.npsClass">
                    {{ surveyInfo.nps >= 0 ? '+' : '' }}{{ surveyInfo.nps }}
                  </div>
                  <div class="survey-metric-description">{{ surveyInfo.npsDescription }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Success Message -->

        <!-- Timeline Card (Collapsable) -->
        <div class="mb-4 timeline-wrapper">
          <AttentionTimeline
            :attention="state.attention"
            :booking="state.booking"
            :commerce="state.commerce"
            :collaborators-map="collaboratorsMap"
          />
        </div>

        <!-- Action Button -->
        <div class="terminated-actions">
          <div class="row g-2">
            <div class="col-12">
              <button
                class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2 attend-button"
                :disabled="loading"
                @click="goToQueue"
              >
                {{ $t('collaboratorAttentionValidate.actions.2.action') }}
                <i class="bi bi-arrow-left-circle"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <Message
        v-else
        :title="$t('collaboratorAttentionValidate.message.1.title')"
        :content="$t('collaboratorAttentionValidate.message.1.content')"
        :icon="'bi bi-emoji-expressionless'"
      />
    </div>
  </div>
</template>

<script>
import {
  reactive,
  ref,
  computed,
  onBeforeMount,
  onMounted,
  onUnmounted,
  watch,
  nextTick,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { getAttentionDetails } from '../../application/services/attention';
import { getClientById } from '../../application/services/client';
import { getCollaboratorById } from '../../application/services/collaborator';
import { getBookingDetails } from '../../application/services/booking';
import { getAverageAttentionDuration } from '../../application/services/queue';
import { getPermissions } from '../../application/services/permissions';
import { getActiveFeature } from '../../shared/features';
import { getCommerceById } from '../../application/services/commerce';
import { globalStore } from '../../stores';
import { useAttentionStats } from '../../composables/useAttentionStats';
import {
  updatedQueues,
  updatedAttentions,
  updatedAvailableAttentions,
  updatedProcessingAttentions,
  updatedTerminatedAttentions,
} from '../../application/firebase';
import AttentionStepBar from '../../components/attentions/common/AttentionStepBar.vue';
import AttentionTimeline from '../../components/attentions/common/AttentionTimeline.vue';
import QueueName from '../../components/common/QueueName.vue';
import AttentionNumber from '../../components/common/AttentionNumber.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Message from '../../components/common/Message.vue';

export default {
  name: 'CollaboratorAttentionTerminated',
  components: {
    AttentionStepBar,
    AttentionTimeline,
    QueueName,
    AttentionNumber,
    ComponentMenu,
    Spinner,
    Alert,
    Message,
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const { t } = useI18n();
    const { id } = route.params;
    const store = globalStore();

    const loading = ref(false);
    const alertError = ref('');
    const statsUpdateTrigger = ref(0);

    // Use global commerce and business from store
    const commerce = computed(() => store.getCurrentCommerce);
    const business = computed(() => store.getCurrentBusiness);

    const state = reactive({
      currentUser: {},
      attention: {},
      user: {},
      client: {},
      business: {},
      queue: {},
      toggles: {},
      queueEstimatedDuration: null,
      collaborator: null, // Store collaborator info if loaded
      booking: null, // Store booking info if loaded
      queuePendingDetails: [],
      queueProcessingDetails: [],
      queueTerminatedDetails: [],
      listUpdateKey: 0, // Key to force component re-render
    });

    const collaboratorsMap = ref({});

    // Helper function to validate attention status/stage and redirect if needed (for /terminated page)
    const validateAndRedirectForTerminated = (attention, commerceOverride = null) => {
      if (!attention || !attention.id) return false;

      // Use commerceOverride if provided, otherwise use state.commerce, fallback to attention.commerce
      const commerce = commerceOverride || state.commerce || attention.commerce;
      if (!commerce) {
        // If no commerce available, can't validate features, but can still check basic status
        const isTerminated =
          attention.status === 'TERMINATED' ||
          attention.status === 'RATED' ||
          attention.status === 'TERMINATED_RESERVE_CANCELLED';
        if (!isTerminated) {
          // Not terminated but no commerce to determine where to redirect
          // Default: redirect to check-in as safest option
          router.push({ path: `/interno/colaborador/atencion/${id}/check-in` });
          return true;
        }
        return false;
      }

      const isStagesEnabled = getActiveFeature(commerce, 'attention-stages-enabled', 'PRODUCT');
      const isCheckoutEnabled = getActiveFeature(commerce, 'attention-checkout-enabled', 'PRODUCT');

      // Check if attention is still terminated
      const isTerminated =
        attention.status === 'TERMINATED' ||
        attention.status === 'RATED' ||
        attention.status === 'TERMINATED_RESERVE_CANCELLED';

      // If not terminated anymore, redirect based on current state/stage
      if (!isTerminated) {
        if (isStagesEnabled && attention.currentStage) {
          // Redirect based on current stage
          if (attention.currentStage === 'CHECK_IN') {
            router.push({ path: `/interno/colaborador/atencion/${id}/check-in` });
            return true;
          } else if (
            ['PRE_CONSULTATION', 'CONSULTATION', 'POST_CONSULTATION'].includes(
              attention.currentStage
            )
          ) {
            router.push({ path: `/interno/colaborador/atencion/${id}/atender` });
            return true;
          } else if (isCheckoutEnabled && attention.currentStage === 'CHECKOUT') {
            router.push({ path: `/interno/colaborador/atencion/${id}/checkout` });
            return true;
          }
        } else if (!isStagesEnabled) {
          // Traditional mode: redirect based on status
          if (attention.status === 'PENDING') {
            router.push({ path: `/interno/colaborador/atencion/${id}/check-in` });
            return true;
          } else if (attention.status === 'PROCESSING') {
            router.push({ path: `/interno/colaborador/atencion/${id}/atender` });
            return true;
          }
        }
      } else if (
        isStagesEnabled &&
        attention.currentStage &&
        attention.currentStage !== 'TERMINATED'
      ) {
        // If stages enabled but stage is not TERMINATED, redirect
        if (attention.currentStage === 'CHECK_IN') {
          router.push({ path: `/interno/colaborador/atencion/${id}/check-in` });
          return true;
        } else if (
          ['PRE_CONSULTATION', 'CONSULTATION', 'POST_CONSULTATION'].includes(attention.currentStage)
        ) {
          router.push({ path: `/interno/colaborador/atencion/${id}/atender` });
          return true;
        } else if (isCheckoutEnabled && attention.currentStage === 'CHECKOUT') {
          router.push({ path: `/interno/colaborador/atencion/${id}/checkout` });
          return true;
        }
      }

      return false;
    };

    // Firebase real-time listener for attention
    const firebaseAttentions = updatedAttentions(id);

    // Watch Firebase attention updates - MUST be deep and immediate to catch real-time changes
    watch(
      () => firebaseAttentions.value,
      async newAttentions => {
        if (newAttentions && Array.isArray(newAttentions) && newAttentions.length > 0) {
          const firebaseAttention = newAttentions[0];
          if (firebaseAttention && firebaseAttention.id) {
            // Get commerce for validation (use state.commerce, fallback to firebaseAttention.commerce)
            const commerceForValidation =
              state.commerce || firebaseAttention.commerce || store.getCurrentCommerce;
            // Validate and redirect if attention is no longer terminated
            if (validateAndRedirectForTerminated(firebaseAttention, commerceForValidation)) {
              return; // Stop here if redirecting
            }

            // Merge Firebase data with existing attention
            state.attention = {
              ...state.attention,
              ...firebaseAttention,
              // Preserve nested objects that might not come from Firebase
              user: state.attention.user || firebaseAttention.user,
              queue: state.attention.queue || firebaseAttention.queue,
              commerce: state.attention.commerce || firebaseAttention.commerce,
            };

            // Force stats update
            statsUpdateTrigger.value++;
          }
        }
      },
      { immediate: true, deep: true }
    );

    // Note: No interval needed for terminated attentions (final state)

    onBeforeMount(async () => {
      try {
        loading.value = true;

        // Load current user first (required for attention details)
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();

        // Load attention details and permissions in parallel
        const [attentionDetailsResult, togglesResult] = await Promise.allSettled([
          getAttentionDetails(id, state.currentUser?.id),
          getPermissions('collaborator'),
        ]);

        // Set toggles (non-critical, continue even if fails)
        if (togglesResult.status === 'fulfilled') {
          state.toggles = togglesResult.value;
        }

        // Process attention details (critical)
        if (attentionDetailsResult.status === 'fulfilled' && attentionDetailsResult.value) {
          const attentionDetails = attentionDetailsResult.value;
          state.attention = attentionDetails;
          if (attentionDetails.user) {
            state.user = attentionDetails.user;
          }
          if (attentionDetails.queue) {
            state.queue = attentionDetails.queue;
          }

          // Load commerce from attentionDetails for validation
          if (attentionDetails.commerce) {
            state.commerce = attentionDetails.commerce;
            // Update store commerce if needed
            const currentCommerce = store.getCurrentCommerce;
            if (!currentCommerce || currentCommerce.id !== attentionDetails.commerce.id) {
              await store.setCurrentCommerce(attentionDetails.commerce);
            }

            // Ensure commerce has features - load if missing
            if (
              !attentionDetails.commerce.features ||
              !Array.isArray(attentionDetails.commerce.features)
            ) {
              try {
                const fullCommerce = await getCommerceById(attentionDetails.commerce.id);
                if (fullCommerce && fullCommerce.features) {
                  state.commerce = fullCommerce;
                  await store.setCurrentCommerce(fullCommerce);
                }
              } catch (error) {
                console.warn('Could not fetch full commerce with features:', error);
              }
            }
          }

          // Validate that attention is TERMINATED AFTER loading commerce
          // This ensures we redirect immediately if attention is not terminated
          const commerceForValidation = state.commerce || attentionDetails.commerce;
          if (validateAndRedirectForTerminated(attentionDetails, commerceForValidation)) {
            loading.value = false;
            return; // Stop here if redirecting
          }

          // Set collaborator from attention if available
          if (attentionDetails.collaborator) {
            state.collaborator = attentionDetails.collaborator;
          }

          // Load non-critical data in parallel (non-blocking)
          const nonCriticalPromises = [];

          // Load client (non-critical)
          if (state.attention.clientId) {
            nonCriticalPromises.push(
              getClientById(state.attention.clientId)
                .then(client => {
                  if (client && client.id) {
                    state.client = client;
                  }
                })
                .catch(error => {
                  console.error('Error loading client:', error);
                })
            );
          }

          // Load collaborator if not in attention object (non-critical)
          if (state.attention.collaboratorId && !state.attention.collaborator) {
            nonCriticalPromises.push(
              getCollaboratorById(state.attention.collaboratorId)
                .then(collaborator => {
                  if (collaborator && collaborator.id) {
                    state.collaborator = collaborator;
                  }
                })
                .catch(error => {
                  console.error('Error loading collaborator:', error);
                })
            );
          }

          // Load booking if exists (non-critical)
          if (state.attention.bookingId) {
            nonCriticalPromises.push(
              getBookingDetails(state.attention.bookingId)
                .then(booking => {
                  if (booking && booking.id) {
                    state.booking = booking;
                  }
                })
                .catch(error => {
                  console.error('Error loading booking:', error);
                })
            );
          }

          // Load collaborators from stageHistory (non-critical)
          if (state.attention.stageHistory && Array.isArray(state.attention.stageHistory)) {
            const uniqueCollaboratorIds = new Set();

            // Collect all unique collaborator IDs from stageHistory
            state.attention.stageHistory.forEach(stage => {
              if (stage.enteredBy) uniqueCollaboratorIds.add(stage.enteredBy);
              if (stage.exitedBy) uniqueCollaboratorIds.add(stage.exitedBy);
            });

            // Also add main collaborator if exists
            if (state.attention.collaboratorId) {
              uniqueCollaboratorIds.add(state.attention.collaboratorId);
            }

            // Load all unique collaborators in parallel
            const collaboratorPromises = Array.from(uniqueCollaboratorIds).map(collaboratorId =>
              getCollaboratorById(collaboratorId)
                .then(collaborator => {
                  if (collaborator && collaborator.id) {
                    collaboratorsMap.value[collaborator.id] =
                      collaborator.name || collaborator.alias || collaborator.id;
                  }
                })
                .catch(error => {
                  console.error(`Error loading collaborator ${collaboratorId}:`, error);
                })
            );

            if (collaboratorPromises.length > 0) {
              nonCriticalPromises.push(...collaboratorPromises);
            }
          } else if (state.attention.collaboratorId) {
            // If no stageHistory, just load the main collaborator
            nonCriticalPromises.push(
              getCollaboratorById(state.attention.collaboratorId)
                .then(collaborator => {
                  if (collaborator && collaborator.id) {
                    collaboratorsMap.value[collaborator.id] =
                      collaborator.name || collaborator.alias || collaborator.id;
                  }
                })
                .catch(error => {
                  console.error('Error loading main collaborator:', error);
                })
            );
          }

          // Load queue estimated duration (non-critical)
          if (state.queue?.id) {
            nonCriticalPromises.push(
              getAverageAttentionDuration(state.queue.id)
                .then(avgDuration => {
                  if (avgDuration && avgDuration > 0) {
                    state.queueEstimatedDuration = avgDuration;
                    statsUpdateTrigger.value++;
                  }
                })
                .catch(error => {
                  console.error('Error loading queue estimated duration:', error);
                })
            );
          }

          // Execute all non-critical calls in parallel (don't wait for them)
          if (nonCriticalPromises.length > 0) {
            Promise.allSettled(nonCriticalPromises).catch(() => {
              // All errors already handled individually
            });
          }
        } else {
          // If attention details failed, show error
          throw attentionDetailsResult.reason || new Error('Failed to load attention details');
        }

        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || 500;
        loading.value = false;
      }
    });

    // Calculate attention stats
    const { attentionStats } = useAttentionStats(
      computed(() => state.attention),
      computed(() => state.queue),
      statsUpdateTrigger
    );

    // Calculate estimated time
    const estimatedTime = computed(() => {
      if (state.queueEstimatedDuration && state.queueEstimatedDuration > 0) {
        const hours = Math.floor(state.queueEstimatedDuration / 60);
        const minutes = state.queueEstimatedDuration % 60;
        if (hours > 0) {
          return `${hours}:${minutes.toString().padStart(2, '0')}`;
        }
        return `00:${minutes.toString().padStart(2, '0')}`;
      }
      return null;
    });

    // Helper to convert date to Date object
    const toDate = dateValue => {
      if (!dateValue) return null;
      if (dateValue instanceof Date) return dateValue;
      if (dateValue.toDate && typeof dateValue.toDate === 'function') return dateValue.toDate();
      if (dateValue.seconds) return new Date(dateValue.seconds * 1000);
      return new Date(dateValue);
    };

    // Helper to calculate duration in minutes from enteredAt and exitedAt
    const calculateDuration = (enteredAt, exitedAt) => {
      if (!enteredAt) return null;

      const entered = toDate(enteredAt);
      const exited = exitedAt ? toDate(exitedAt) : null;

      if (!entered || isNaN(entered.getTime())) return null;

      // If no exit time, use endAt/ratedAt as fallback
      const endTime =
        exited ||
        (state.attention.endAt ? toDate(state.attention.endAt) : null) ||
        (state.attention.ratedAt ? toDate(state.attention.ratedAt) : null);

      if (!endTime || isNaN(endTime.getTime())) return null;

      // Calculate difference in minutes
      const diffMs = endTime.getTime() - entered.getTime();
      const diffMinutes = diffMs / (1000 * 60);

      return diffMinutes > 0 ? diffMinutes : null;
    };

    // Calculate total duration metrics of attention (similar to processing time card)
    const totalDurationMetrics = computed(() => {
      if (!state.attention || !state.attention.id) return null;

      let totalMinutes = 0;
      let totalDurationDisplay = '';

      // PRIORITY 1: Try to sum durations from stageHistory (most accurate)
      // Use the most recent entry for each stage (same logic as timeline)
      if (
        state.attention.stageHistory &&
        Array.isArray(state.attention.stageHistory) &&
        state.attention.stageHistory.length > 0
      ) {
        // Group by stage and get the most recent entry for each stage
        const stageMap = new Map();
        state.attention.stageHistory.forEach(stage => {
          if (!stage.stage) return;

          const existing = stageMap.get(stage.stage);
          if (
            !existing ||
            !existing.enteredAt ||
            (stage.enteredAt && new Date(stage.enteredAt) > new Date(existing.enteredAt))
          ) {
            stageMap.set(stage.stage, stage);
          }
        });

        // Sum durations from the most recent entry of each stage
        let hasValidDuration = false;
        totalMinutes = Array.from(stageMap.values()).reduce((sum, stage) => {
          let stageDuration = stage.duration;

          // If duration is not available, calculate it
          if (!stageDuration && stage.enteredAt) {
            stageDuration = calculateDuration(stage.enteredAt, stage.exitedAt);
          }

          // Add duration if valid (in minutes)
          if (stageDuration && stageDuration > 0) {
            hasValidDuration = true;
            return sum + Math.round(stageDuration);
          }

          return sum;
        }, 0);

        // Only use this calculation if we found at least one valid duration
        if (!hasValidDuration) {
          totalMinutes = 0;
        }
      }

      // PRIORITY 2: Try to use duration field (in minutes)
      if (totalMinutes === 0 && state.attention.duration && state.attention.duration > 0) {
        totalMinutes = Math.floor(state.attention.duration);
      }

      // PRIORITY 3: Calculate from processedAt (or createdAt) to endAt (fallback)
      if (totalMinutes === 0) {
        const startDate =
          state.attention.processedAt || state.attention.createdDate || state.attention.createdAt;
        const endDate = state.attention.endAt || state.attention.ratedAt;

        if (!startDate) return null;

        const start = toDate(startDate);
        const end = endDate ? toDate(endDate) : new Date();

        if (!start || isNaN(start.getTime()) || !end || isNaN(end.getTime())) {
          return null;
        }

        const diffMs = end.getTime() - start.getTime();
        totalMinutes = Math.floor(diffMs / (1000 * 60));
      }

      // Format display
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      if (hours > 0) {
        totalDurationDisplay = `${hours}h ${minutes}min`;
      } else {
        totalDurationDisplay = `${minutes}min`;
      }

      // Calculate expected duration from services or queue
      let expectedDuration = null;
      if (
        state.attention.servicesDetails &&
        Array.isArray(state.attention.servicesDetails) &&
        state.attention.servicesDetails.length > 0
      ) {
        expectedDuration = state.attention.servicesDetails.reduce((total, service) => {
          if (service && service.serviceInfo) {
            return (
              total + (service.serviceInfo.blockTime || service.serviceInfo.estimatedTime || 0)
            );
          }
          return total;
        }, 0);
      }
      // If no duration from services, use queue estimated duration as fallback
      if (!expectedDuration || expectedDuration === 0) {
        if (state.queueEstimatedDuration && state.queueEstimatedDuration > 0) {
          expectedDuration = state.queueEstimatedDuration;
        } else if (state.queue?.estimatedTime && state.queue.estimatedTime > 0) {
          expectedDuration = state.queue.estimatedTime;
        }
      }

      // Calculate comparison metrics
      let durationComparison = null;
      let durationStatus = 'neutral';
      let durationColor = '#a9a9a9';
      let minutesDifference = null;

      if (expectedDuration && expectedDuration > 0) {
        durationComparison = (totalMinutes / expectedDuration) * 100;
        minutesDifference = expectedDuration - totalMinutes;

        // Color coding based on percentage (similar to processing time)
        if (durationComparison < 70) {
          durationStatus = 'excellent';
          durationColor = '#28a745'; // Green
        } else if (durationComparison < 90) {
          durationStatus = 'good';
          durationColor = '#f9c322'; // Yellow
        } else if (durationComparison < 100) {
          durationStatus = 'warning';
          durationColor = '#ff9800'; // Orange
        } else {
          durationStatus = 'poor';
          durationColor = '#a52a2a'; // Red
        }
      }

      return {
        totalDuration: totalDurationDisplay,
        totalMinutes,
        expectedDuration,
        durationComparison,
        durationStatus,
        durationColor,
        minutesDifference,
      };
    });

    // Calculate attention info for details card
    const attentionInfo = computed(() => {
      if (!state.attention || !state.attention.id) return null;

      const info = {};

      // Format creation date
      const createdDate = state.attention.createdDate || state.attention.createdAt;
      if (createdDate) {
        let created;
        if (createdDate instanceof Date) {
          created = createdDate;
        } else if (createdDate.toDate && typeof createdDate.toDate === 'function') {
          created = createdDate.toDate();
        } else if (createdDate.seconds) {
          created = new Date(createdDate.seconds * 1000);
        } else {
          created = new Date(createdDate);
        }
        if (!isNaN(created.getTime())) {
          info.createdAt =
            created.toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            }) +
            ' ' +
            created.toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            });
        }
      }

      // Format processed date
      const processedDate = state.attention.processedAt;
      if (processedDate) {
        let processed;
        if (processedDate instanceof Date) {
          processed = processedDate;
        } else if (processedDate.toDate && typeof processedDate.toDate === 'function') {
          processed = processedDate.toDate();
        } else if (processedDate.seconds) {
          processed = new Date(processedDate.seconds * 1000);
        } else {
          processed = new Date(processedDate);
        }
        if (!isNaN(processed.getTime())) {
          info.processedAt =
            processed.toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            }) +
            ' ' +
            processed.toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            });
        }
      }

      // Format services
      if (
        state.attention.servicesDetails &&
        Array.isArray(state.attention.servicesDetails) &&
        state.attention.servicesDetails.length > 0
      ) {
        const serviceNames = state.attention.servicesDetails
          .map(s => s?.serviceInfo?.name || s?.name)
          .filter(Boolean);
        if (serviceNames.length > 0) {
          info.services = serviceNames.join(', ');
        }
      } else if (state.attention.serviceId && state.queue?.services) {
        const service = state.queue.services.find(s => s.id === state.attention.serviceId);
        if (service) {
          info.services = service.name;
        }
      }

      // Format collaborator
      const collaborator = state.attention.collaborator || state.collaborator;
      if (collaborator) {
        info.collaborator =
          collaborator.name || collaborator.alias || state.attention.collaboratorId;
      } else if (state.attention.collaboratorId) {
        // If we only have the ID, show it (or could show "Carregando..." but for now just show ID)
        info.collaborator = state.attention.collaboratorId;
      }

      // Format booking date if comes from booking
      if (state.attention.bookingId && state.booking) {
        const bookingDate = state.booking.date || state.booking.createdAt;
        if (bookingDate) {
          let booking;
          if (bookingDate instanceof Date) {
            booking = bookingDate;
          } else if (bookingDate.toDate && typeof bookingDate.toDate === 'function') {
            booking = bookingDate.toDate();
          } else if (bookingDate.seconds) {
            booking = new Date(bookingDate.seconds * 1000);
          } else {
            booking = new Date(bookingDate);
          }
          if (!isNaN(booking.getTime())) {
            info.bookingDate =
              booking.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
              }) +
              ' ' +
              booking.toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              });
          }
        }
      }

      // Format package session info
      if (state.attention.packageId) {
        const currentSession = state.attention.packageProcedureNumber || 0;
        const totalSessions = state.attention.packageProceduresTotalNumber || 0;
        if (totalSessions > 0) {
          info.packageSession = `${currentSession}/${totalSessions}`;
        } else if (currentSession > 0) {
          info.packageSession = `${currentSession}`;
        }
      }

      // Format attention type (Telemedicine or Presential)
      const isTelemedicine =
        state.attention.type === 'TELEMEDICINE' ||
        state.attention.telemedicineSessionId ||
        state.attention.channel === 'TELEMEDICINE';

      if (isTelemedicine) {
        info.attentionType = 'telemedicine';
        info.attentionTypeLabel = t('attentionStats.attentionType.telemedicine') || 'Telemedicina';
      } else {
        info.attentionType = 'presential';
        info.attentionTypeLabel = t('attentionStats.attentionType.presential') || 'Presencial';
      }

      return Object.keys(info).length > 0 ? info : null;
    });

    // Calculate survey info for survey results card
    const surveyInfo = computed(() => {
      if (!state.attention || !state.attention.id) return null;

      // Check if survey exists (surveyId or rating/nps)
      const hasSurvey =
        state.attention.surveyId ||
        (state.attention.rating !== null && state.attention.rating !== undefined) ||
        (state.attention.nps !== null && state.attention.nps !== undefined);

      if (!hasSurvey) return null;

      const info = {};

      // Format CSAT (rating)
      if (state.attention.rating !== null && state.attention.rating !== undefined) {
        const rating = parseFloat(state.attention.rating);
        if (!isNaN(rating)) {
          info.csat = rating.toFixed(1);

          // Determine CSAT status and class
          if (rating >= 4) {
            info.csatClass = 'csat-excellent';
            info.csatDescription = t('attentionStats.csat.excellent') || 'Excelente';
          } else if (rating >= 2.5) {
            info.csatClass = 'csat-good';
            info.csatDescription = t('attentionStats.csat.good') || 'Bom';
          } else {
            info.csatClass = 'csat-poor';
            info.csatDescription = t('attentionStats.csat.poor') || 'Pode melhorar';
          }
        }
      }

      // Format NPS
      if (state.attention.nps !== null && state.attention.nps !== undefined) {
        const nps = parseFloat(state.attention.nps);
        if (!isNaN(nps)) {
          info.nps = Math.round(nps);

          // Determine NPS status and class
          if (nps >= 50) {
            info.npsClass = 'nps-excellent';
            info.npsDescription = t('attentionStats.nps.excellent') || 'Excelente';
          } else if (nps >= 0) {
            info.npsClass = 'nps-good';
            info.npsDescription = t('attentionStats.nps.good') || 'Bom';
          } else {
            info.npsClass = 'nps-poor';
            info.npsDescription = t('attentionStats.nps.poor') || 'Pode melhorar';
          }
        }
      }

      return Object.keys(info).length > 0 ? info : null;
    });

    // Firebase real-time listeners (lightweight, only for queue updates if needed)
    // For terminated attentions, we don't need constant attention updates
    const firebaseQueueRef = ref(null);

    // Firebase listeners for queue attention details (for modal)
    let pendingAttentionsRef = null;
    let processingAttentionsRef = null;
    let terminatedAttentionsRef = null;

    // Store watcher stop functions for cleanup
    let pendingWatcherStop = null;
    let processingWatcherStop = null;
    let terminatedWatcherStop = null;

    // Function to update attention details from Firebase listeners
    const updateAttentionDetails = () => {
      if (!state.queue || !state.queue.id) {
        return;
      }

      // Get pending attentions from Firebase listener (already filtered by date and status)
      const pendingArray = pendingAttentionsRef?.value || [];
      const pendingList = Array.isArray(pendingArray) ? pendingArray : [];

      // Firebase already filters by today and PENDING status, just sort by number
      const filteredPending = [...pendingList].filter(att => att && att.status === 'PENDING');
      const sortedPending = [...filteredPending].sort((a, b) => {
        const numA = a.number || 0;
        const numB = b.number || 0;
        return numA - numB;
      });

      // CRITICAL: Replace the entire array reference to force Vue reactivity
      state.queuePendingDetails.splice(0, state.queuePendingDetails.length, ...sortedPending);

      // Get processing attentions from Firebase listener (already filtered by date)
      const processingArray = processingAttentionsRef?.value || [];
      const processingList = Array.isArray(processingArray) ? processingArray : [];
      state.queueProcessingDetails.splice(
        0,
        state.queueProcessingDetails.length,
        ...processingList,
      );

      // Get terminated attentions from Firebase listener (already filtered by date)
      const terminatedArray = terminatedAttentionsRef?.value || [];
      const terminatedList = Array.isArray(terminatedArray) ? terminatedArray : [];
      const sortedTerminated = [...terminatedList].sort((a, b) => {
        const numA = a.number || 0;
        const numB = b.number || 0;
        return numB - numA;
      });
      state.queueTerminatedDetails.splice(
        0,
        state.queueTerminatedDetails.length,
        ...sortedTerminated,
      );

      // Force component re-render by updating key
      state.listUpdateKey++;
    };

    // Watch for queue ID to initialize Firebase listeners
    watch(
      () => state.queue?.id,
      queueId => {
        if (queueId) {
          // Initialize queue listener if not already set
          if (!firebaseQueueRef.value) {
            firebaseQueueRef.value = updatedQueues(queueId);
            watch(
              firebaseQueueRef,
              newQueues => {
                if (newQueues && newQueues.length > 0) {
                  const firebaseQueueData = newQueues[0];
                  if (firebaseQueueData && firebaseQueueData.id) {
                    state.queue = {
                      ...state.queue,
                      ...firebaseQueueData,
                    };
                    // Only trigger stats update if we got estimated duration
                    if (firebaseQueueData.estimatedTime && !state.queueEstimatedDuration) {
                      state.queueEstimatedDuration = firebaseQueueData.estimatedTime;
                      statsUpdateTrigger.value++;
                    }
                  }
                }
              },
              { immediate: false }
            );
          }

          // Initialize attention listeners for modal (real-time updates) - AUTOMATIC
          if (!pendingAttentionsRef) {
            // Clean up previous listeners if exist (shouldn't happen, but safety check)
            if (pendingAttentionsRef && pendingAttentionsRef._unsubscribe) {
              pendingAttentionsRef._unsubscribe();
            }
            if (processingAttentionsRef && processingAttentionsRef._unsubscribe) {
              processingAttentionsRef._unsubscribe();
            }
            if (terminatedAttentionsRef && terminatedAttentionsRef._unsubscribe) {
              terminatedAttentionsRef._unsubscribe();
            }

            // Initialize Firebase listeners for this queue
            pendingAttentionsRef = updatedAvailableAttentions(queueId);
            processingAttentionsRef = updatedProcessingAttentions(queueId);
            terminatedAttentionsRef = updatedTerminatedAttentions(queueId);

            // Watch for changes in Firebase listeners - watch directly the ref value
            pendingWatcherStop = watch(
              () => pendingAttentionsRef?.value,
              () => {
                updateAttentionDetails();
              },
              { immediate: true, deep: true }
            );

            processingWatcherStop = watch(
              () => processingAttentionsRef?.value,
              () => {
                updateAttentionDetails();
              },
              { immediate: true, deep: true }
            );

            terminatedWatcherStop = watch(
              () => terminatedAttentionsRef?.value,
              () => {
                updateAttentionDetails();
              },
              { immediate: true, deep: true }
            );

            // Force initial update after a brief moment to ensure Firebase has initialized
            nextTick().then(() => {
              setTimeout(() => {
                updateAttentionDetails();
              }, 300);
            });
          }
        }
      },
      { immediate: true }
    );

    // Cleanup Firebase listeners on unmount
    onUnmounted(() => {
      if (pendingAttentionsRef && pendingAttentionsRef._unsubscribe) {
        pendingAttentionsRef._unsubscribe();
      }
      if (processingAttentionsRef && processingAttentionsRef._unsubscribe) {
        processingAttentionsRef._unsubscribe();
      }
      if (terminatedAttentionsRef && terminatedAttentionsRef._unsubscribe) {
        terminatedAttentionsRef._unsubscribe();
      }
      // Clean up watchers
      if (pendingWatcherStop) {
        pendingWatcherStop();
        pendingWatcherStop = null;
      }
      if (processingWatcherStop) {
        processingWatcherStop();
        processingWatcherStop = null;
      }
      if (terminatedWatcherStop) {
        terminatedWatcherStop();
        terminatedWatcherStop = null;
      }
    });

    const goToQueue = () => {
      if (state.queue?.id) {
        router.push({ path: `/interno/colaborador/fila/${state.queue.id}/atenciones` });
      } else {
        router.push({ path: `/interno/commerce/${state.commerce?.id}/colaborador/filas` });
      }
    };

    return {
      state,
      loading,
      alertError,
      attentionStats,
      estimatedTime,
      totalDurationMetrics,
      attentionInfo,
      surveyInfo,
      collaboratorsMap,
      goToQueue,
      getActiveFeature,
    };
  },
};
</script>

<style scoped>
.terminated-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
  width: 100%;
}

.timeline-wrapper {
  width: 100%;
  margin: 0 auto;
}

.terminated-actions {
  margin-top: 2rem;
  width: 100%;
}

.terminated-actions .row {
  width: 100%;
  margin: 0;
}

.terminated-actions .col-12 {
  padding: 0;
  width: 100%;
}

/* Attend button styles (matching other pages) */
.attend-button {
  width: 100% !important;
  padding: 0.875rem 1.5rem !important;
  font-size: 1.1rem !important;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
}

.attend-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15);
}

.attend-button:active:not(:disabled) {
  transform: translateY(0);
}

.attend-button i {
  font-size: 1.25rem;
}

/* Total Duration Card Styles */
.attention-info-cards-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  align-items: stretch; /* Ensure all cards have the same height */
}

.attention-info-card,
.attention-duration-card {
  width: 100%;
  height: 100%; /* Take full height of grid cell */
  display: flex; /* Enable flexbox for inner card */
}

.stat-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 251, 252, 0.98) 100%);
  border-radius: 12px;
  padding: 0.875rem 1rem;
  border: 1px solid rgba(169, 169, 169, 0.15);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  display: flex;
  align-items: flex-start; /* Align to top instead of center */
  gap: 0.75rem;
  transition: all 0.3s ease;
  position: relative;
  width: 100%;
  height: 100%; /* Take full height of parent */
  max-width: 600px;
  margin: 0 auto;
}

.stat-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 4px;
  height: 100%;
  background: #00c2cb;
  border-radius: 12px 0 0 12px;
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
  background: rgba(0, 194, 203, 0.15);
  color: #00c2cb;
  font-size: 1.25rem;
}

.stat-card-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  height: 100%; /* Take full height */
  justify-content: space-between; /* Distribute content evenly */
}

.stat-card-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.02em;
  line-height: 1.2;
}

.stat-card-value {
  font-size: 1.25rem;
  font-weight: 900;
  color: rgba(0, 0, 0, 0.85);
  line-height: 1.2;
  letter-spacing: -0.01em;
}

/* Processing/Duration Card Styles */
.stat-card-processing {
  --stat-color: #004aad;
}

.stat-card-processing .stat-card-icon {
  background: rgba(0, 74, 173, 0.15);
  color: #004aad;
}

.stat-card-excellent {
  --stat-color: #28a745;
}

.stat-card-excellent .stat-card-icon {
  background: rgba(40, 167, 69, 0.15);
  color: #28a745;
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

.stat-card-subvalue {
  font-size: 0.7rem;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.5);
  line-height: 1.2;
  margin-top: 0.5rem;
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

/* Attention Info Card Styles */
.stat-card-info {
  --stat-color: #004aad;
}

.stat-card-info .stat-card-icon {
  background: rgba(0, 74, 173, 0.15);
  color: #004aad;
}

.attention-info-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.attention-info-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8rem;
  line-height: 1.4;
}

.attention-info-item i {
  font-size: 0.9rem;
  color: rgba(0, 0, 0, 0.5);
  flex-shrink: 0;
  width: 16px;
}

.info-label {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  min-width: 100px;
}

.info-value {
  color: rgba(0, 0, 0, 0.85);
  font-weight: 500;
  flex: 1;
  word-break: break-word;
}

.attention-type-badge {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.02em;
}

.attention-type-telemedicine {
  background-color: rgba(0, 194, 203, 0.15);
  color: #00c2cb;
  border: 1px solid rgba(0, 194, 203, 0.3);
}

.attention-type-presential {
  background-color: rgba(40, 167, 69, 0.15);
  color: #28a745;
  border: 1px solid rgba(40, 167, 69, 0.3);
}

/* Responsive */
@media (max-width: 768px) {
  .attention-info-cards-row {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .stat-card {
    max-width: 100%;
  }

  .info-label {
    min-width: 90px;
    font-size: 0.75rem;
  }

  .info-value {
    font-size: 0.75rem;
  }
}

/* Survey Results Card Styles */
.stat-card-survey {
  --stat-color: #f9c322;
}

.stat-card-survey .stat-card-icon {
  background: rgba(249, 195, 34, 0.15);
  color: #f9c322;
}

.survey-results-card {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.survey-metrics {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 0.75rem;
}

.survey-metric-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
  border-left: 3px solid transparent;
}

.survey-metric-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.survey-metric-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.survey-metric-icon.csat-icon {
  color: #f9c322;
}

.survey-metric-icon.nps-icon {
  color: #004aad;
}

.survey-metric-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.survey-metric-value {
  font-size: 1.5rem;
  font-weight: 900;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.survey-metric-description {
  font-size: 0.7rem;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.5);
  margin-top: 0.25rem;
}

/* CSAT Status Colors */
.csat-excellent {
  color: #28a745;
}

.csat-good {
  color: #f9c322;
}

.csat-poor {
  color: #dc3545;
}

/* NPS Status Colors */
.nps-excellent {
  color: #28a745;
}

.nps-good {
  color: #004aad;
}

.nps-poor {
  color: #dc3545;
}

/* Responsive for survey card */
@media (max-width: 768px) {
  .survey-metrics {
    gap: 0.75rem;
  }

  .survey-metric-item {
    padding: 0.5rem;
  }

  .survey-metric-value {
    font-size: 1.25rem;
  }
}
</style>
