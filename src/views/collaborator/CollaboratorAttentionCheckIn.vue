<template>
  <div>
    <Spinner :show="loading"></Spinner>
    <Alert :show="false" :stack="alertError" :error-message="errorMessage"></Alert>

    <div class="content text-center">
      <!-- Mobile/Tablet Header -->
      <div class="d-block d-lg-none">
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
          component-name="collaboratorAttentionCheckIn"
          @goBack="goBack"
        />
      </div>

      <!-- Desktop Header -->
      <div class="d-none d-lg-block">
        <DesktopPageHeader
          :commerce-id="state.commerce?.id"
          :business-id="state.business?.id"
          :loading="loading"
          :title="`${$t('collaboratorAttentionValidate.hello-user')}, ${
            state.currentUser?.alias || state.currentUser?.name
          }!`"
          :toggles="state.toggles"
          component-name="collaboratorAttentionCheckIn"
          @go-back="goBack"
        />
      </div>

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

      <AttentionBasePage
        v-if="state.attention && state.attention.id"
        :attention="state.attention"
        :user="state.user"
        :client="state.client"
        :commerce="state.commerce || {}"
        :queue="state.queue"
        :toggles="state.toggles"
        :attention-stats="attentionStats"
        :estimated-time="estimatedTime"
        :queue-pending-details="state.queuePendingDetails"
        :queue-processing-details="state.queueProcessingDetails"
      >
        <template #content>
          <!-- Client Requirements Cards & Check-In Call -->
          <div v-if="state.user?.id" class="client-requirements-section mt-3">
            <!-- Gestión de la Atención -->
            <div
              v-if="state.attention && state.attention.id"
              class="client-management-section my-3"
            >
              <h5 class="client-management-title">
                {{
                  $t('collaboratorQueueAttentions.attentionManagement') || 'Gestión de la Atención:'
                }}
              </h5>

              <!-- WhatsApp Call to Client for Check-In -->
              <div class="call-client-banner" v-if="state.attention && state.attention.id">
                <div class="call-client-text">
                  <i class="bi bi-whatsapp me-2"></i>
                  <span>
                    {{
                      $t('collaboratorAttentionCheckIn.callClient') ||
                      'Enviar mensaje de WhatsApp al cliente para hacer el check-in'
                    }}
                  </span>
                  <Popper :class="'dark p-1'" arrow placement="top">
                    <template #content>
                      <div>
                        {{
                          $t('collaboratorAttentionCheckIn.callClientHelp') ||
                          'Se enviará un mensaje de WhatsApp al número del cliente indicándole que se acerque a tu módulo para realizar su check-in. Solo se enviará una vez por atención.'
                        }}
                      </div>
                    </template>
                    <i class="bi bi-info-circle ms-2 call-client-help-icon"></i>
                  </Popper>
                </div>
                <button
                  class="requirement-action-btn-compact whatsapp-btn"
                  :disabled="
                    loading ||
                    state.loadingCheckInCall ||
                    state.attention?.notificationCheckInSent ||
                    state.checkInCallSent
                  "
                  @click="sendCheckInCall"
                >
                  <i class="bi bi-whatsapp"></i>
                  <span v-if="state.loadingCheckInCall">
                    {{ $t('dashboard.sending') || 'Enviando...' }}
                  </span>
                  <span
                    v-else-if="state.attention?.notificationCheckInSent || state.checkInCallSent"
                  >
                    {{ $t('collaboratorAttentionCheckIn.callAlreadySent') || 'Llamado ya enviado' }}
                  </span>
                  <span v-else>
                    {{
                      $t('collaboratorAttentionCheckIn.callClientAction') ||
                      'Enviar mensaje de WhatsApp'
                    }}
                  </span>
                </button>
              </div>

              <!-- Payment / Transfer Actions (reusable component) -->
              <div class="col-12" v-if="state.attention && state.attention.id">
                <AttentionPaymentActionsCard
                  class="my-2"
                  :loading="loading"
                  :disabled="!state.attention || !state.attention.id"
                  @open="openAttentionModal()"
                />
              </div>

              <!-- Consent Status Widget -->
              <ConsentStatusWidget
                v-if="state.clientConsentsLoaded && state.commerce?.id && state.client?.id"
                :commerce-id="state.commerce.id"
                :client-id="state.client.id"
                :consents="state.clientConsents"
                :requirements="state.consentRequirements"
                @refresh="loadConsentStatus"
                @open-manager="openConsentManager"
              />

              <!-- Preprontuario Status Card -->
              <div v-if="isPreprontuarioActive()">
                <div class="requirement-card requirement-card-compact">
                  <div class="requirement-card-header">
                    <div class="requirement-icon">
                      <i class="bi bi-clipboard2-pulse-fill"></i>
                    </div>
                    <div class="requirement-info">
                      <div class="requirement-title">
                        {{ $t('dashboard.preprontuario') || 'Pré-Prontuário' }}
                        <a
                          href="#"
                          @click.prevent="checkPreprontuarioCompletion(true)"
                          :class="{ loading: state.loadingPreprontuario }"
                          class="refresh-link"
                          :title="$t('dashboard.refreshStatus') || 'Atualizar status'"
                        >
                          <i
                            class="bi bi-arrow-clockwise"
                            :class="{ spinning: state.loadingPreprontuario }"
                          ></i>
                        </a>
                      </div>
                      <div
                        class="requirement-status"
                        :class="
                          state.preprontuarioStatus?.completed
                            ? 'status-completed'
                            : 'status-pending'
                        "
                      >
                        <i
                          class="bi"
                          :class="
                            state.preprontuarioStatus?.completed
                              ? 'bi-check-circle-fill'
                              : 'bi-exclamation-circle-fill'
                          "
                        ></i>
                        <span>
                          {{
                            state.preprontuarioStatus?.completed
                              ? $t('dashboard.preprontuarioDetails.completed') ||
                                $t('dashboard.completed') ||
                                'Concluído'
                              : $t('dashboard.preprontuarioDetails.pending') ||
                                $t('dashboard.pending') ||
                                'Pendente'
                          }}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    v-if="!state.preprontuarioStatus?.completed"
                    @click="sendPreprontuarioReminder()"
                    :disabled="state.loadingPreprontuario || state.preprontuarioMessageSent"
                    class="requirement-action-btn-compact whatsapp-btn"
                    :class="{ disabled: state.preprontuarioMessageSent }"
                  >
                    <i
                      class="bi"
                      :class="
                        state.preprontuarioMessageSent ? 'bi-check-circle-fill' : 'bi-whatsapp'
                      "
                    ></i>
                    <span v-if="state.loadingPreprontuario">{{
                      $t('dashboard.sending') || 'Enviando...'
                    }}</span>
                    <span v-else-if="state.preprontuarioMessageSent">{{
                      $t('dashboard.messageAlreadySent') || 'Mensaje ya enviado'
                    }}</span>
                    <span v-else>{{ $t('dashboard.sendReminder') || 'Enviar Lembrete' }}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Check-In Specific Content -->
          <div class="check-in-actions my-4">
            <div class="row g-2">
              <div class="col-12">
                <div class="actions mb-2">
                  <span
                    ><strong>{{
                      $t('collaboratorQueueAttentions.actions.1.title.1')
                    }}</strong></span
                  >
                </div>
              </div>
              <div class="col-12">
                <button
                  class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2 attend-button"
                  :disabled="loading"
                  @click="goToAttend"
                >
                  {{ $t('collaboratorQueueAttentions.actions.1.action') || 'Atender' }}
                  <i class="bi bi-qr-code-scan ms-2"></i>
                </button>
              </div>
              <div class="col-12">
                <button
                  class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2 back-button"
                  :disabled="loading"
                  @click="goBack"
                >
                  {{ $t('collaboratorAttentionValidate.actions.2.action') }}
                  <i class="bi bi-arrow-left-circle ms-2"></i>
                </button>
              </div>
            </div>
          </div>
        </template>
      </AttentionBasePage>

      <Message
        v-else
        :title="$t('collaboratorAttentionValidate.message.1.title')"
        :content="$t('collaboratorAttentionValidate.message.1.content')"
        :icon="'bi bi-emoji-expressionless'"
      />
    </div>

    <!-- Modal LGPD Consent Manager -->
    <Teleport to="body">
      <div
        v-if="state.client?.id && state.commerce?.id"
        class="modal fade"
        :id="`lgpdConsentModal-${state.client.id}`"
        data-bs-backdrop="static"
        data-bs-keyboard="false"
        tabindex="-1"
        aria-labelledby="lgpdConsentModalLabel"
        aria-hidden="true"
      >
        <div class="modal-dialog modal-xl modal-dialog-scrollable">
          <div class="modal-content">
            <div class="modal-header border-0">
              <h5 class="modal-title fw-bold" id="lgpdConsentModalLabel">
                <i class="bi bi-shield-check me-2"></i>
                {{ $t('lgpd.title') || 'LGPD - Consentimentos e Portabilidade' }}
              </h5>
              <button
                type="button"
                class="btn-close"
                data-bs-dismiss="modal"
                aria-label="Close"
              ></button>
            </div>
            <div class="modal-body">
              <LgpdConsentManager
                v-if="state.client?.id && state.commerce?.id"
                :commerce-id="state.commerce.id"
                :client-id="state.client.id"
                @consent-updated="loadConsentStatus"
              />
            </div>
            <div class="modal-footer border-0">
              <button
                type="button"
                class="btn btn-size fw-bold btn-dark rounded-pill"
                data-bs-dismiss="modal"
              >
                {{ $t('common.close') || 'Fechar' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Attention Details Modal -->
    <AttentionDetailsModal
      :show="state.showAttentionModal"
      :attention="state.selectedAttention || state.attention"
      :commerce="state.commerce"
      :queues="state.commerce?.queues || state.queue ? [state.queue] : []"
      :toggles="state.toggles"
      @close="closeAttentionModal"
      @attention-updated="handleAttentionUpdatedFromModal"
    />
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
  nextTick,
  watch,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  getAttentionDetails,
  trackAttentionAccess,
  advanceStage,
  attend,
  sendCheckInWhatsappCall,
} from '../../application/services/attention';
import { getClientById } from '../../application/services/client';
import {
  getAverageAttentionDuration,
  getEstimatedWaitTime,
  getGroupedQueueByCommerceId,
} from '../../application/services/queue';
import { getPermissions } from '../../application/services/permissions';
import { getActiveFeature } from '../../shared/features';
import { getCommerceById } from '../../application/services/commerce';
import { globalStore } from '../../stores';
import { useAttentionStats } from '../../composables/useAttentionStats';
import {
  updatedAttentions,
  updatedQueues,
  updatedAvailableAttentions,
  updatedProcessingAttentions,
  updatedTerminatedAttentions,
} from '../../application/firebase';
import {
  sendPreprontuarioWhatsapp,
  checkPreprontuarioStatus,
} from '../../application/services/whatsapp-notification';
import { getFormPersonalizedByCommerceId } from '../../application/services/form-personalized';
import { getConsentStatus } from '../../application/services/consent';
import AttentionBasePage from '../../components/attentions/common/AttentionBasePage.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import QueueName from '../../components/common/QueueName.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Message from '../../components/common/Message.vue';
import ConsentStatusWidget from '../../components/lgpd/ConsentStatusWidget.vue';
import LgpdConsentManager from '../../components/lgpd/LgpdConsentManager.vue';
import DesktopPageHeader from '../../components/common/desktop/DesktopPageHeader.vue';
import AttentionDetailsModal from '../../components/attentions/common/AttentionDetailsModal.vue';
import AttentionPaymentActionsCard from '../../components/attentions/common/AttentionPaymentActionsCard.vue';
import Popper from 'vue3-popper';

export default {
  name: 'CollaboratorAttentionCheckIn',
  components: {
    AttentionBasePage,
    CommerceLogo,
    QueueName,
    ComponentMenu,
    Spinner,
    Alert,
    Message,
    ConsentStatusWidget,
    LgpdConsentManager,
    DesktopPageHeader,
    AttentionDetailsModal,
    AttentionPaymentActionsCard,
    Popper,
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const { id } = route.params;
    const store = globalStore();

    const loading = ref(false);
    const alertError = ref('');
    const errorMessage = ref('');
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
      commerce: {},
      queue: {},
      toggles: {},
      queueEstimatedDuration: null,
      usingIntelligentEstimation: false,
      intelligentEstimatedTime: null,
      queuePendingDetails: [],
      queueProcessingDetails: [],
      queueTerminatedDetails: [],
      preprontuarioStatus: null,
      loadingPreprontuario: false,
      preprontuarioMessageSent: false,
      preprontuarioStatusLoaded: false,
      preprontuarioActiveForContext: false,
      formsPersonalized: [],
      listUpdateKey: 0, // Key to force component re-render
      clientConsents: [],
      consentRequirements: [],
      clientConsentsLoaded: false,
      loadingCheckInCall: false,
      checkInCallSent: false,
      showAttentionModal: false,
      selectedAttention: undefined,
    });

    // Live update interval for stats
    let statsInterval = null;

    onMounted(() => {
      // Update stats every 30 seconds for live updates
      statsInterval = setInterval(() => {
        statsUpdateTrigger.value++;
      }, 30000);
    });

    onUnmounted(() => {
      if (statsInterval) {
        clearInterval(statsInterval);
      }
    });

    // Calculate attention stats
    const { attentionStats: baseAttentionStats } = useAttentionStats(
      computed(() => state.attention),
      computed(() => state.queue),
      statsUpdateTrigger
    );

    // Extend attention stats with additional data
    const attentionStats = computed(() => {
      const stats = baseAttentionStats.value;
      if (!stats) return null;
      return {
        ...stats,
        pendingCount: state.queuePendingDetails.length,
        usingIntelligentEstimation: state.usingIntelligentEstimation,
      };
    });

    // Calculate estimated wait time - use intelligent estimation if available
    const updateIntelligentEstimation = async () => {
      if (!state.queue?.id || state.queuePendingDetails.length === 0) {
        state.usingIntelligentEstimation = false;
        state.intelligentEstimatedTime = null;
        return;
      }

      try {
        const pendingCount = state.queuePendingDetails.length;
        const intelligentEstimation = await getEstimatedWaitTime(
          state.queue.id,
          pendingCount,
          'p75'
        );

        if (intelligentEstimation && intelligentEstimation.estimatedTime) {
          state.intelligentEstimatedTime = intelligentEstimation.estimatedTime;
          state.usingIntelligentEstimation =
            intelligentEstimation.usingIntelligentEstimation || false;
        } else {
          state.usingIntelligentEstimation = false;
          state.intelligentEstimatedTime = null;
        }
      } catch (error) {
        console.warn('Failed to get intelligent estimation:', error);
        state.usingIntelligentEstimation = false;
        state.intelligentEstimatedTime = null;
      }
    };

    // Calculate estimated time
    const estimatedTime = computed(() => {
      if (state.usingIntelligentEstimation && state.intelligentEstimatedTime) {
        // Use intelligent estimation (already formatted as HH:MM)
        return state.intelligentEstimatedTime;
      } else if (state.queuePendingDetails.length > 0 && state.queue?.estimatedTime) {
        // Fallback to simple calculation based on pending count
        const estimatedMinutes =
          state.queuePendingDetails.length * (state.queue.estimatedTime || 5);
        const hours = Math.floor(estimatedMinutes / 60);
        const minutes = estimatedMinutes % 60;
        if (hours > 0) {
          return `${hours}:${minutes.toString().padStart(2, '0')}`;
        }
        return `00:${minutes.toString().padStart(2, '0')}`;
      } else if (state.queueEstimatedDuration && state.queueEstimatedDuration > 0) {
        // Fallback to queue estimated duration if available
        const hours = Math.floor(state.queueEstimatedDuration / 60);
        const minutes = state.queueEstimatedDuration % 60;
        if (hours > 0) {
          return `${hours}:${minutes.toString().padStart(2, '0')}`;
        }
        return `00:${minutes.toString().padStart(2, '0')}`;
      }
      return null;
    });

    // Firebase real-time listeners
    const firebaseAttentions = updatedAttentions(id);
    const firebaseQueueRef = ref(null);

    // Firebase listeners for queue attention details (for modal)
    let pendingAttentionsRef = null;
    let processingAttentionsRef = null;
    let terminatedAttentionsRef = null;

    // Helper function to validate attention status/stage and redirect if needed
    const validateAndRedirect = (attention, commerceOverride = null) => {
      if (!attention || !attention.id) {
        return false;
      }

      // Use commerceOverride if provided, otherwise use state.commerce, fallback to attention.commerce
      const commerce = commerceOverride || state.commerce || attention.commerce;

      // Check if attention is terminated (any termination status) - ALWAYS check this first
      const isTerminated =
        attention.status === 'TERMINATED' ||
        attention.status === 'RATED' ||
        attention.status === 'TERMINATED_RESERVE_CANCELLED' ||
        attention.status === 'CANCELLED' ||
        attention.status === 'SKIPED' ||
        attention.status === 'USER_CANCELLED';

      if (isTerminated) {
        router.push({ path: `/interno/colaborador/atencion/${id}/terminated` });
        return true;
      }

      // PRIORITY: Check basic status first, even without commerce
      // This ensures PROCESSING status always redirects, regardless of commerce availability
      if (attention.status === 'PROCESSING') {
        router.push({ path: `/interno/colaborador/atencion/${id}/atender` });
        return true;
      }

      // If no commerce available, we've already checked basic status above
      if (!commerce) {
        return false;
      }

      const isStagesEnabled = getActiveFeature(commerce, 'attention-stages-enabled', 'PRODUCT');
      const isCheckoutEnabled = getActiveFeature(commerce, 'attention-checkout-enabled', 'PRODUCT');

      if (isStagesEnabled && attention.currentStage) {
        // Validate stage for check-in page
        if (attention.currentStage !== 'CHECK_IN') {
          // Stage changed, redirect accordingly
          if (
            ['PRE_CONSULTATION', 'CONSULTATION', 'POST_CONSULTATION'].includes(
              attention.currentStage
            )
          ) {
            router.push({ path: `/interno/colaborador/atencion/${id}/atender` });
            return true;
          } else if (isCheckoutEnabled && attention.currentStage === 'CHECKOUT') {
            router.push({ path: `/interno/colaborador/atencion/${id}/checkout` });
            return true;
          } else if (attention.currentStage === 'TERMINATED') {
            router.push({ path: `/interno/colaborador/atencion/${id}/terminated` });
            return true;
          }
        }
      } else if (!isStagesEnabled) {
        // Traditional mode: check status
        // For check-in page, must be PENDING
        // Note: PROCESSING status is already handled above, so this is just for other statuses
        if (attention.status !== 'PENDING') {
          if (attention.status === 'TERMINATED' || attention.status === 'RATED') {
            router.push({ path: `/interno/colaborador/atencion/${id}/terminated` });
            return true;
          }
        }
      }

      return false;
    };

    // Watch Firebase attention updates - MUST be deep and immediate to catch real-time changes
    watch(
      () => firebaseAttentions.value,
      async (newAttentions, oldAttentions) => {
        if (newAttentions && Array.isArray(newAttentions) && newAttentions.length > 0) {
          const firebaseAttention = newAttentions[0];
          // Update attention with Firebase data
          if (firebaseAttention && firebaseAttention.id) {
            // Check if status or stage actually changed to avoid unnecessary redirects
            const statusChanged = firebaseAttention.status !== state.attention?.status;
            const stageChanged = firebaseAttention.currentStage !== state.attention?.currentStage;

            if (statusChanged || stageChanged) {
              // Get commerce for validation (use state.commerce, fallback to firebaseAttention.commerce)
              const commerceForValidation =
                state.commerce || firebaseAttention.commerce || store.getCurrentCommerce;
              // Validate and redirect if needed BEFORE updating state
              if (validateAndRedirect(firebaseAttention, commerceForValidation)) {
                return; // Stop here if redirecting
              }
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
          } else {
            console.warn('[CheckIn] Firebase attention missing id:', firebaseAttention);
          }
        }
      },
      { immediate: true, deep: true }
    );

    // Watch for queue ID to initialize Firebase listeners
    watch(
      () => state.queue?.id,
      queueId => {
        if (queueId) {
          // Initialize queue listener if not already set
          if (!firebaseQueueRef.value) {
            firebaseQueueRef.value = updatedQueues(queueId);
            // Watch Firebase queue updates
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
                    // Force stats update
                    statsUpdateTrigger.value++;
                  }
                }
              },
              { immediate: false }
            );
          }

          // Initialize attention listeners for modal (real-time updates)
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

            // Function to update attention details from Firebase listeners (same as CollaboratorQueueAttentions)
            const updateAttentionDetails = () => {
              if (!state.queue || !state.queue.id) {
                return;
              }

              // Get pending attentions from Firebase listener (already filtered by date and status)
              const pendingArray = pendingAttentionsRef?.value || [];
              const pendingList = Array.isArray(pendingArray) ? pendingArray : [];

              // Firebase already filters by today and PENDING status, just sort by number
              const filteredPending = [...pendingList].filter(
                att => att && ['PENDING', 'CONFIRMED'].includes(att.status),
              );
              const sortedPending = [...filteredPending].sort((a, b) => {
                const numA = a.number || 0;
                const numB = b.number || 0;
                return numA - numB;
              });

              // CRITICAL: Replace the entire array reference to force Vue reactivity
              state.queuePendingDetails.splice(
                0,
                state.queuePendingDetails.length,
                ...sortedPending,
              );

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

            // Watch for changes in Firebase listeners - watch directly the ref value
            watch(
              () => pendingAttentionsRef?.value,
              () => {
                updateAttentionDetails();
              },
              { immediate: true, deep: true }
            );

            watch(
              () => processingAttentionsRef?.value,
              () => {
                updateAttentionDetails();
              },
              { immediate: true, deep: true }
            );

            watch(
              () => terminatedAttentionsRef?.value,
              () => {
                updateAttentionDetails();
              },
              { immediate: true, deep: true }
            );

            // Force initial update after a brief moment to ensure Firebase has initialized
            nextTick(() => {
              setTimeout(() => {
                updateAttentionDetails();
              }, 300);
            });
          }
        }
      },
      { immediate: true }
    );

    // Watch queuePendingDetails to update intelligent estimation
    watch(
      () => state.queuePendingDetails.length,
      async () => {
        if (state.queue?.id && state.queuePendingDetails.length > 0) {
          await updateIntelligentEstimation();
        }
      }
    );

    onBeforeMount(async () => {
      try {
        loading.value = true;

        // Load critical data in parallel
        const currentUser = await store.getCurrentUser;
        const [toggles, attentionDetails] = await Promise.all([
          getPermissions('collaborator'),
          getAttentionDetails(id, currentUser?.id),
        ]);

        state.currentUser = currentUser;
        state.business = await store.getActualBusiness();
        state.toggles = toggles;

        if (attentionDetails) {
          state.attention = attentionDetails;
          if (attentionDetails.user) {
            state.user = attentionDetails.user;
          }
          if (attentionDetails.queue) {
            state.queue = attentionDetails.queue;
          }

          // Inicializar flag de llamada de check-in según backend
          if (attentionDetails.notificationCheckInSent) {
            state.checkInCallSent = true;
          }

          // Load commerce first to ensure it's available for validation
          if (attentionDetails.commerce) {
            // Update store commerce - load features lazily if needed
            const currentCommerce = store.getCurrentCommerce;
            const attentionCommerce = attentionDetails.commerce;

            if (!currentCommerce || currentCommerce.id !== attentionCommerce.id) {
              // Commerce is different, update store immediately
              await store.setCurrentCommerce(attentionCommerce);
              state.commerce = attentionCommerce;

              // Load full commerce with features in background (non-blocking) if needed
              if (
                attentionCommerce.id &&
                (!attentionCommerce.features || !Array.isArray(attentionCommerce.features))
              ) {
                getCommerceById(attentionCommerce.id)
                  .then(fullCommerce => {
                    if (fullCommerce && fullCommerce.features) {
                      store.setCurrentCommerce(fullCommerce);
                      state.commerce = fullCommerce;
                    }
                  })
                  .catch(() => {
                    // Silently fail, use existing commerce
                  });
              }
            } else if (
              currentCommerce &&
              (!currentCommerce.features || !Array.isArray(currentCommerce.features))
            ) {
              // Load features in background (non-blocking)
              getCommerceById(currentCommerce.id)
                .then(fullCommerce => {
                  if (fullCommerce && fullCommerce.features) {
                    store.setCurrentCommerce(fullCommerce);
                    state.commerce = fullCommerce;
                  }
                })
                .catch(() => {
                  // Silently fail, use existing commerce
                });
            }

            // Now that commerce is loaded, validate and redirect if needed
            // Use store commerce or attentionDetails commerce for validation
            const commerceForValidation = store.getCurrentCommerce || attentionDetails.commerce;
            state.commerce = state.commerce?.id ? state.commerce : commerceForValidation || {};
            if (validateAndRedirect(attentionDetails, commerceForValidation)) {
              loading.value = false;
              return; // Stop here if redirecting
            }

            // Load queues for the commerce to ensure ClientDetailsCard has them
            if (state.commerce?.id) {
              try {
                const groupedQueues = await getGroupedQueueByCommerceId(state.commerce.id);
                state.commerce.queues = Object.values(groupedQueues).flat();
                console.log('✅ Queues loaded for check-in commerce:', state.commerce.queues.length);
              } catch (error) {
                console.warn('❌ Failed to load queues for check-in commerce:', state.commerce.id, error);
              }
            }
          } else {
            // No commerce in attentionDetails, validate with what we have
            if (validateAndRedirect(attentionDetails)) {
              loading.value = false;
              return; // Stop here if redirecting
            }
          }

          // Track access in background (non-blocking, fire-and-forget)
          if (state.currentUser?.id) {
            trackAttentionAccess(state.attention.id, state.currentUser.id).catch(() => {
              // Silently fail, tracking is not critical
            });
          }

          // Load non-critical data in parallel after setting critical state
          const loadPromises = [];

          // Load client if needed
          if (state.attention.clientId) {
            loadPromises.push(
              getClientById(state.attention.clientId)
                .then(client => {
                  if (client && client.id) {
                    state.client = client;
                  }
                })
                .catch(() => {
                  // Silently fail, client is not critical for initial render
                })
            );
          }

          // Load queue estimated duration if queue exists
          if (state.queue?.id) {
            loadPromises.push(
              getAverageAttentionDuration(state.queue.id)
                .then(avgDuration => {
                  if (avgDuration && avgDuration > 0) {
                    state.queueEstimatedDuration = avgDuration;
                  }
                })
                .catch(() => {
                  // Silently fail, estimated duration is not critical
                })
            );
          }

          // Wait for critical parallel loads, then show page
          await Promise.all(loadPromises);

          // Mark loading as false to show page
          loading.value = false;

          // Load non-critical data in background after page is shown
          if (state.queue?.id) {
            // Queue details are now loaded via Firebase listeners (real-time)
            // Update intelligent estimation when queue details are available
            watch(
              () => state.queuePendingDetails.length,
              () => {
                if (state.queuePendingDetails.length > 0) {
                  updateIntelligentEstimation();
                }
              },
              { immediate: true }
            );

            // Preprontuario data will be loaded when component is shown (via watcher)
            // Watch for when preprontuario component should be shown and load data then
            // Use a computed to check if component should be visible
            const shouldShowPreprontuario = computed(
              () => !!(state.user?.id && state.commerce?.id && state.queue?.id)
            );

            watch(
              shouldShowPreprontuario,
              shouldLoad => {
                if (shouldLoad) {
                  // Load data when conditions are met (component will show if isPreprontuarioActive returns true)
                  loadPreprontuarioData();
                }
              },
              { immediate: true }
            );

            // Load consent status when client and commerce are available
            if (state.commerce?.id && state.client?.id) {
              loadConsentStatus();
            } else if (state.commerce?.id) {
              // Watch for client to be loaded
              watch(
                () => state.client?.id,
                clientId => {
                  if (clientId) {
                    loadConsentStatus();
                  }
                },
                { immediate: true }
              );
            }
          }
        } else {
          loading.value = false;
        }
      } catch (error) {
        alertError.value = error.response?.status || 500;
        loading.value = false;
      }
    });

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
    });

    const goToAttend = async () => {
      try {
        loading.value = true;
        alertError.value = '';
        errorMessage.value = '';

        // Check if attention is PENDING (traditional flow) or CHECK_IN (stages flow)
        const isStagesEnabled = getActiveFeature(
          state.commerce,
          'attention-stages-enabled',
          'PRODUCT'
        );

        if (isStagesEnabled && state.attention.currentStage === 'CHECK_IN') {
          // Stages flow: Advance from CHECK_IN to PRE_CONSULTATION
          const body = {
            stage: 'PRE_CONSULTATION',
            collaboratorId: state.currentUser?.id,
          };
          await advanceStage(state.attention.id, body);
          // Redirection will be handled by the Firebase watcher
        } else if (state.attention.status === 'PENDING') {
          // Traditional flow: Use attend to change from PENDING to PROCESSING
          const body = {
            queueId: state.queue.id,
            collaboratorId: state.currentUser?.id,
          };
          state.attention = await attend(state.attention.number, body);
          router.push({ path: `/interno/colaborador/atencion/${state.attention.id}/atender` });
        } else {
          // Fallback: try advanceStage
          const body = {
            stage: 'PRE_CONSULTATION',
            collaboratorId: state.currentUser?.id,
          };
          await advanceStage(state.attention.id, body);
        }

        alertError.value = '';
        loading.value = false;
      } catch (error) {
        const msg = error?.response?.data?.message || error?.message;
        errorMessage.value = Array.isArray(msg) ? msg[0] : msg;
        alertError.value = error?.response?.status || 500;
        loading.value = false;
      }
    };

    const sendCheckInCall = async () => {
      if (!state.attention?.id || !state.queue?.id || !state.currentUser?.id) {
        return;
      }

      try {
        state.loadingCheckInCall = true;
        const commerceLanguage =
          state.commerce?.localeInfo?.language || state.commerce?.language || 'es';

        await sendCheckInWhatsappCall(state.attention.id, {
          collaboratorId: state.currentUser.id,
          commerceLanguage,
        });

        state.checkInCallSent = true;
        if (state.attention) {
          state.attention.notificationCheckInSent = true;
        }
      } catch (error) {
        console.error('Error sending check-in WhatsApp call:', error);
      } finally {
        state.loadingCheckInCall = false;
      }
    };

    const openAttentionModal = () => {
      state.selectedAttention = state.attention;
      state.showAttentionModal = true;
    };

    const closeAttentionModal = () => {
      state.showAttentionModal = false;
      state.selectedAttention = undefined;
    };

    const handleAttentionUpdatedFromModal = async () => {
      if (!state.attention?.id) return;

      try {
        const updatedAttention = await getAttentionDetails(
          state.attention.id,
          state.currentUser?.id,
        );

        if (updatedAttention.queue) {
          state.queue = updatedAttention.queue;
        }
        if (updatedAttention.user) {
          state.user = updatedAttention.user;
        }
        if (updatedAttention.commerce) {
          state.commerce = updatedAttention.commerce;
          if (
            state.commerce &&
            state.commerce.id &&
            (!state.commerce.features || !Array.isArray(state.commerce.features))
          ) {
            try {
              const fullCommerce = await getCommerceById(state.commerce.id);
              if (fullCommerce && fullCommerce.features) {
                state.commerce = fullCommerce;
                await store.setCurrentCommerce(fullCommerce);
              }
            } catch (error) {
              console.warn('Could not fetch full commerce with features (modal update):', error);
            }
          }
        }

        state.attention = updatedAttention;
      } finally {
        closeAttentionModal();
      }
    };

    const goBack = () => {
      if (state.queue?.id) {
        router.push({ path: `/interno/colaborador/fila/${state.queue.id}/atenciones` });
      } else {
        router.push({ path: `/interno/commerce/${state.commerce?.id}/colaborador/filas` });
      }
    };

    // Preprontuario functions
    const getForm = (type, queueId) => {
      if (state.formsPersonalized && state.formsPersonalized.length > 0 && type) {
        const filteredForms = state.formsPersonalized.filter(form => form.type === type);
        if (filteredForms && filteredForms.length > 0) {
          if (queueId) {
            const result = state.formsPersonalized.filter(
              form => form.queueId === queueId && form.type === type
            );
            if (result.length === 0) {
              return state.formsPersonalized.filter(form => form.type === type)[0];
            }
            return result[0];
          } else {
            return state.formsPersonalized.filter(form => form.type === type)[0];
          }
        }
      }
      return undefined;
    };

    const isPreprontuarioActive = () => {
      try {
        if (!state.commerce?.id) return false;
        const featureActive = getActiveFeature(state.commerce, 'attention-pre-form', 'PRODUCT');
        if (!featureActive) return false;
        if (!state.formsPersonalized || state.formsPersonalized.length === 0) {
          return false;
        }
        const queueId = state.queue?.id || state.attention?.queueId;
        const preForm = getForm('PRE_ATTENTION', queueId);
        return !!preForm;
      } catch (error) {
        console.error('Error checking preprontuario active:', error);
        return false;
      }
    };

    // Load preprontuario data when component is shown (lazy loading)
    const loadPreprontuarioData = async () => {
      if (!state.attention?.id || !state.user?.id || !state.commerce?.id || !state.queue?.id) {
        return;
      }

      // Check if already loaded
      if (state.preprontuarioStatusLoaded && state.preprontuarioActiveForContext !== undefined) {
        return;
      }

      try {
        // Load forms if not already loaded
        if (!state.formsPersonalized || state.formsPersonalized.length === 0) {
          state.formsPersonalized = await getFormPersonalizedByCommerceId(state.commerce.id);
        }

        // Check if preprontuario is active
        state.preprontuarioActiveForContext = isPreprontuarioActive();

        // If active, load completion status
        if (state.preprontuarioActiveForContext) {
          await checkPreprontuarioCompletion();
        }
      } catch (error) {
        console.error('Error loading preprontuario data:', error);
        state.preprontuarioActiveForContext = false;
      }
    };

    const checkPreprontuarioActiveForContext = async () => {
      if (state.attention && state.queue && state.commerce?.id) {
        try {
          if (!state.formsPersonalized || state.formsPersonalized.length === 0) {
            state.formsPersonalized = await getFormPersonalizedByCommerceId(state.commerce.id);
          }
          state.preprontuarioActiveForContext = isPreprontuarioActive();
          return state.preprontuarioActiveForContext;
        } catch (error) {
          console.error('Error checking preprontuario for context:', error);
          state.preprontuarioActiveForContext = false;
          return false;
        }
      }
      state.preprontuarioActiveForContext = false;
      return false;
    };

    const checkPreprontuarioCompletion = async (forceRefresh = false) => {
      if (state.preprontuarioStatusLoaded && !forceRefresh) {
        return;
      }
      const clientId =
        state.client?.id ||
        state.attention?.clientId ||
        state.user?.clientId ||
        state.attention?.user?.clientId;
      if (!clientId || !state.commerce?.id) {
        return;
      }
      try {
        state.loadingPreprontuario = true;
        const statusResponse = await checkPreprontuarioStatus(clientId, state.commerce.id);
        state.preprontuarioStatus = {
          completed: statusResponse?.completed || false,
          completedAt: statusResponse?.completedAt || null,
          formId: statusResponse?.formId || null,
        };
        state.preprontuarioStatusLoaded = true;
        state.loadingPreprontuario = false;
      } catch (error) {
        state.loadingPreprontuario = false;
        console.error('Error checking preprontuario status:', error);
      }
    };

    // Load consent status
    const loadConsentStatus = async () => {
      const clientId =
        state.client?.id ||
        state.attention?.clientId ||
        state.user?.clientId ||
        state.attention?.user?.clientId;
      if (!clientId || !state.commerce?.id) {
        return;
      }
      try {
        const status = await getConsentStatus(state.commerce.id, clientId);
        state.clientConsents = status.consents || [];
        state.consentRequirements = status.requirements || [];
        state.clientConsentsLoaded = true;
      } catch (error) {
        console.error('Error loading consent status:', error);
        state.clientConsentsLoaded = true; // Mark as loaded even on error to avoid infinite loading
      }
    };

    const openConsentManager = async () => {
      if (!state.client?.id || !state.commerce?.id) {
        console.warn('Cannot open consent manager: missing client or commerce');
        return;
      }
      // Abrir modal usando Bootstrap
      await nextTick();
      const modalId = `lgpdConsentModal-${state.client.id}`;
      const modalElement = document.getElementById(modalId);
      if (modalElement) {
        // Bootstrap 5
        const { Modal } = await import('bootstrap');
        const modal = new Modal(modalElement);
        modal.show();
      }
    };

    const sendPreprontuarioReminder = async () => {
      const clientId =
        state.client?.id ||
        state.attention?.clientId ||
        state.user?.clientId ||
        state.attention?.user?.clientId;
      if (!clientId || !state.commerce?.id || !state.user?.email || !state.user?.phone) {
        return;
      }
      try {
        state.loadingPreprontuario = true;
        let attentionLink = '';
        let attentionId = undefined;
        let queueId = undefined;

        if (state.attention && state.attention.id) {
          attentionId = state.attention.id;
          queueId = state.attention.queueId || state.queue?.id;

          try {
            const formsPersonalized = await getFormPersonalizedByCommerceId(state.commerce.id);
            const formId = formsPersonalized.find(
              form =>
                (form.type === 'PRE_ATTENTION' || form.type === 'FIRST_ATTENTION') &&
                (form.queueId === state.queue?.id || form.queueId === state.attention.queueId) &&
                form.active === true
            )?.id;

            if (formId && clientId) {
              const baseUrl = window.location.origin;
              attentionLink = `${baseUrl}/interno/form/${formId}/client/${clientId}/attention/${state.attention.id}`;
            }
          } catch (error) {
            console.warn('Could not load forms for attention link:', error);
          }
        } else if (state.queue?.id) {
          queueId = state.queue.id;
        }

        await sendPreprontuarioWhatsapp(
          clientId,
          state.commerce.id,
          state.user.email,
          state.user.phone,
          attentionLink || undefined,
          attentionId,
          queueId
        );
        state.loadingPreprontuario = false;
        state.preprontuarioMessageSent = true;
        await checkPreprontuarioCompletion(true);
      } catch (error) {
        state.loadingPreprontuario = false;
        console.error('Error sending preprontuario reminder:', error);
      }
    };

    return {
      state,
      loading,
      alertError,
      errorMessage,
      attentionStats,
      estimatedTime,
      goToAttend,
      goBack,
      isPreprontuarioActive,
      checkPreprontuarioCompletion,
      sendPreprontuarioReminder,
      loadPreprontuarioData,
      loadConsentStatus,
      openConsentManager,
      sendCheckInCall,
      openAttentionModal,
      closeAttentionModal,
      handleAttentionUpdatedFromModal,
    };
  },
};
</script>

<style scoped>
.check-in-actions {
  width: 100%;
  margin: 0 auto;
}

.check-in-actions .row {
  width: 100%;
  margin: 0;
}

.check-in-actions .col-12 {
  padding: 0;
  width: 100%;
}

.actions {
  text-align: center;
  color: #6c757d;
  font-size: 0.875rem;
  margin-bottom: 0.5rem;
}

/* Client Requirements Section */
.client-requirements-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.call-client-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  border-radius: 8px;
  background: linear-gradient(90deg, rgba(37, 211, 102, 0.08), rgba(37, 211, 102, 0.02));
  border: 1px dashed rgba(37, 211, 102, 0.4);
}

.call-client-text {
  display: flex;
  align-items: center;
  font-size: 0.8125rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.8);
}

.call-client-help-icon {
  color: rgba(0, 0, 0, 0.6);
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

.requirement-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  border: 1px solid rgba(169, 169, 169, 0.15);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.requirement-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.requirement-card-compact {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
}

.requirement-card-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0;
  flex: 1;
  min-width: 0; /* Allow flex item to shrink */
}

.requirement-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(0, 74, 173, 0.1);
  color: #004aad;
  font-size: 1.1rem;
}

.requirement-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0; /* Allow flex item to shrink */
}

.requirement-title {
  font-size: 0.8125rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.refresh-link {
  color: #6c757d;
  text-decoration: none;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  padding: 0.25rem;
}

.refresh-link:hover {
  color: #004aad;
  transform: rotate(180deg);
}

.refresh-link .spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.requirement-status {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.6875rem;
  font-weight: 600;
}

.requirement-status.status-completed {
  color: #28a745;
}

.requirement-status.status-pending {
  color: #ffc107;
}

.requirement-status i {
  font-size: 0.875rem;
}

.requirement-action-btn {
  width: 100%;
  padding: 0.75rem 1rem;
  border: none;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.requirement-action-btn-compact {
  width: auto;
  padding: 0.4rem 0.875rem;
  border: none;
  border-radius: 8px;
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  margin-top: 0;
  flex-shrink: 0;
  white-space: nowrap;
}

.whatsapp-btn {
  background: linear-gradient(135deg, #25d366 0%, #20c65a 100%);
  color: white;
}

.whatsapp-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #20c65a 0%, #1db954 100%);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(37, 211, 102, 0.3);
}

.whatsapp-btn:disabled,
.whatsapp-btn.disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
}

.whatsapp-btn.disabled {
  background: linear-gradient(135deg, #28a745 0%, #20c65a 100%);
  opacity: 0.8;
}

.success-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, rgba(40, 167, 69, 0.1) 0%, rgba(25, 135, 84, 0.1) 100%);
  color: #28a745;
  border: 1px solid rgba(40, 167, 69, 0.2);
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 600;
  animation: slideInSuccess 0.3s ease;
  margin-top: 0.5rem;
}

.success-message i {
  font-size: 0.875rem;
}

@keyframes slideInSuccess {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Attend Button - Slightly larger with moderate padding */
.attend-button {
  width: 100% !important;
  padding: 0.875rem 1.5rem !important;
  font-size: 1.1rem !important;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  box-sizing: border-box;
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

/* Back Button - Only extend to full width, keep original size */
.back-button {
  width: 100% !important;
  box-sizing: border-box;
}
</style>
