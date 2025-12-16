<script>
import {
  reactive,
  nextTick,
  onBeforeMount,
  onMounted,
  onUnmounted,
  ref,
  computed,
  watch,
  triggerRef,
} from 'vue';
import { useRoute, useRouter } from 'vue-router';
import {
  finishAttention,
  skip,
  getAttentionDetails,
  attend,
} from '../../application/services/attention';
import { globalStore } from '../../stores';
import { getPermissions } from '../../application/services/permissions';
import { getActiveFeature } from '../../shared/features';
import {
  getProductsConsumptionsDetails,
  getPatientHistoryDetails,
  getPendingAttentionsDetails,
} from '../../application/services/query-stack';
import { getPatientHistoryItemByCommerce } from '../../application/services/patient-history-item';
import { getFormsByClient } from '../../application/services/form';
import { getClientById } from '../../application/services/client';
import { getAverageAttentionDuration } from '../../application/services/queue';
import { getSurveyPersonalizedByCommerceId } from '../../application/services/survey-personalized';
import ToggleCapabilities from '../../components/common/ToggleCapabilities.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import QueueName from '../../components/common/QueueName.vue';
import AttentionNumber from '../../components/common/AttentionNumber.vue';
import Message from '../../components/common/Message.vue';
import QR from '../../components/common/QR.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import ProductAttentionManagement from '../../components/products/domain/ProductAttentionManagement.vue';
import PatientHistoryManagement from '../../components/patient-history/domain/PatientHistoryManagement.vue';
import AttentionDetailsCard from '../../components/clients/common/AttentionDetailsCard.vue';
import AttentionDetailsNumber from '../../components/common/AttentionDetailsNumber.vue';
import Popper from 'vue3-popper';
import TelemedicineSessionStarter from '../../components/telemedicine/domain/TelemedicineSessionStarter.vue';
import TelemedicineVideoCall from '../../components/telemedicine/domain/TelemedicineVideoCall.vue';
import TelemedicineChat from '../../components/telemedicine/domain/TelemedicineChat.vue';
import TelemedicineFloatingWindow from '../../components/telemedicine/domain/TelemedicineFloatingWindow.vue';
import {
  getTelemedicineSession,
  startTelemedicineSession,
} from '../../application/services/telemedicine';

export default {
  name: 'CollaboratorAttentionValidate',
  components: {
    Message,
    QR,
    CommerceLogo,
    QueueName,
    AttentionNumber,
    Spinner,
    Alert,
    ToggleCapabilities,
    ComponentMenu,
    ProductAttentionManagement,
    PatientHistoryManagement,
    AttentionDetailsCard,
    AttentionDetailsNumber,
    Popper,
    TelemedicineSessionStarter,
    TelemedicineVideoCall,
    TelemedicineChat,
    TelemedicineFloatingWindow,
  },
  async setup() {
    const route = useRoute();
    const router = useRouter();
    const { id } = route.params;

    const store = globalStore();

    const comment = ref('');
    const loading = ref(false);
    const alertError = ref('');
    const telemedicineVideoCallRef = ref(null);

    // Use global commerce and module from store
    const globalCommerce = computed(() => store.getCurrentCommerce);
    const module = computed(() => store.getCurrentModule);

    const state = reactive({
      currentUser: {},
      attention: {},
      attentionDetails: {},
      queue: {},
      commerce: {},
      commerceIds: {},
      user: {},
      toggles: {},
      client: {},
      togglesStock: {},
      productConsumptions: [],
      patientForms: [],
      patientHistory: {},
      patientHistoryItems: [],
      queueEstimatedDuration: null, // Estimated duration from queue (in minutes)
      telemedicineSession: null,
      showTelemedicineVideo: false,
      showTelemedicineChat: false,
      telemedicineSessionType: null,
      clientConnected: false,
      connectionStatusInterval: null,
      surveyPersonalized: {},
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.attention = await getAttentionDetails(id);
        if (state.attention.id) {
          state.queue = state.attention.queue;
          // Use global commerce if it matches attention's commerce, otherwise use attention's commerce
          if (globalCommerce.value && globalCommerce.value.id === state.attention.commerce?.id) {
            state.commerce = globalCommerce.value;
          } else {
            state.commerce = state.attention.commerce;
            // Update global commerce to match attention's commerce
            if (state.commerce && state.commerce.id) {
              await store.setCurrentCommerce(state.commerce);
            }
          }
          state.commerceIds = [state.commerce.id];

          // Fetch estimated duration from queue as fallback
          if (state.queue && state.queue.id) {
            try {
              const avgDuration = await getAverageAttentionDuration(state.queue.id, 'median');
              if (
                avgDuration &&
                avgDuration.success &&
                avgDuration.duration &&
                avgDuration.duration > 0
              ) {
                // Use intelligent learning duration (in minutes)
                state.queueEstimatedDuration = Math.round(avgDuration.duration);
                // Force recomputation of attentionStats
                statsUpdateTrigger.value++;
              } else {
                // Fallback to queue.estimatedTime if intelligent learning is not available
                if (state.queue.estimatedTime && state.queue.estimatedTime > 0) {
                  state.queueEstimatedDuration = state.queue.estimatedTime;
                  // Force recomputation of attentionStats
                  statsUpdateTrigger.value++;
                } else {
                  state.queueEstimatedDuration = null;
                }
              }
            } catch (error) {
              console.error(
                'Failed to get queue estimated duration, trying queue.estimatedTime fallback:',
                error
              );
              // Fallback to queue.estimatedTime if API call fails
              if (state.queue.estimatedTime && state.queue.estimatedTime > 0) {
                state.queueEstimatedDuration = state.queue.estimatedTime;
                console.log(
                  '✅ Set queueEstimatedDuration from queue.estimatedTime (fallback):',
                  state.queueEstimatedDuration,
                  'minutes'
                );
                // Force recomputation of attentionStats
                statsUpdateTrigger.value++;
              } else {
                state.queueEstimatedDuration = null;
              }
            }
          }

          const attentionDetails = await getPendingAttentionsDetails(
            undefined,
            undefined,
            undefined,
            state.commerceIds,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            id
          );
          if (attentionDetails && attentionDetails.length > 0) {
            state.attentionDetails = attentionDetails[0];
          }
          if (state.attention.userId) {
            state.user = state.attention.user;
          }
          state.toggles = await getPermissions('collaborator');
          state.togglesStock = await getPermissions('products-stock');

          // Load telemedicine session if available
          if (state.attention?.telemedicineSessionId) {
            await loadTelemedicineSessionDetails();
          }

          // Load survey if attention is already terminated
          if (state.attention.status === 'TERMINATED' || state.attention.status === 'RATED') {
            await loadSurveyPersonalized();
          }
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    });

    const loadSurveyPersonalized = async () => {
      if (!state.commerce || !state.commerce.id) return;

      try {
        const surveys = await getSurveyPersonalizedByCommerceId(state.commerce.id);
        if (surveys && surveys.length > 0) {
          // Filter by queueId first
          const surveyQueue = surveys.filter(sv => sv.queueId === state.queue.id);
          if (surveyQueue.length > 0) {
            state.surveyPersonalized = surveyQueue[0];
          } else {
            // Fallback to attentionDefault surveys
            const defaultSurveys = surveys.filter(sv => sv.attentionDefault === true);
            if (defaultSurveys.length > 0) {
              state.surveyPersonalized = defaultSurveys[0];
            }
          }
        }
      } catch (error) {
        console.error('Error loading survey personalized:', error);
      }
    };

    const finishCurrentAttention = async () => {
      try {
        loading.value = true;
        alertError.value = '';
        const body = { comment: comment.value };
        await finishAttention(state.attention.id, body);

        // Reload complete attention details to get updated status and all data
        const updatedAttention = await getAttentionDetails(state.attention.id);

        // Update all related state to ensure reactivity
        if (updatedAttention.queue) {
          state.queue = updatedAttention.queue;
        }
        if (updatedAttention.user) {
          state.user = updatedAttention.user;
        }
        if (updatedAttention.commerce) {
          state.commerce = updatedAttention.commerce;
        }

        // Force reactivity by completely replacing the object
        state.attention = updatedAttention;

        // Load survey if attention is terminated
        if (updatedAttention.status === 'TERMINATED' || updatedAttention.status === 'RATED') {
          await loadSurveyPersonalized();
        }

        await nextTick();
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || error.response?.statusCode || 500;
        loading.value = false;
      }
    };

    const queueAttentions = () => {
      router.push({ path: `/interno/colaborador/fila/${state.queue.id}/atenciones` });
    };

    const isReactivated = () => state.attention.status === 'REACTIVATED';

    const skipAttention = async () => {
      try {
        loading.value = true;
        alertError.value = '';
        const body = { collaboratorId: state.currentUser.id, queueId: state.queue.id };
        state.attention = await skip(state.attention.number, body);
        router.push({ path: `/interno/colaborador/fila/${state.queue.id}/atenciones` });
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const attendCurrentAttention = async () => {
      try {
        loading.value = true;
        alertError.value = '';
        const body = {
          queueId: state.queue.id,
          collaboratorId: state.currentUser.id,
          commerceLanguage: state.commerce.localeInfo ? state.commerce.localeInfo.language : 'sp',
        };
        state.attention = await attend(state.attention.number, body);
        // Reload the page to show the updated status
        await router.push({ path: `/interno/colaborador/atencion/${state.attention.id}/validar` });
        window.location.reload();
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response?.status || 500;
        loading.value = false;
      }
    };

    const getAttentionProducts = async () => {
      try {
        loading.value = true;
        state.productConsumptions = await getProductsConsumptionsDetails(
          undefined,
          undefined,
          this.page,
          this.limit,
          this.asc,
          undefined,
          undefined,
          this.attention.attentionId
        );
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    };

    const getPatientHistory = async () => {
      try {
        loading.value = true;

        // Fetch all data in parallel
        const [result, items, forms, client] = await Promise.all([
          getPatientHistoryDetails(state.attention.clientId),
          getPatientHistoryItemByCommerce(state.commerce.id),
          getFormsByClient(state.commerce.id, state.attention.clientId),
          getClientById(state.attention.clientId),
        ]);

        // Update state in a single batch to avoid multiple re-renders
        if (result && result.length > 0) {
          state.patientHistory = result[0];
        }
        if (items && items.length > 0) {
          state.patientHistoryItems = items;
        }
        if (forms && forms.length > 0) {
          state.patientForms = forms;
        }
        if (client && client.id) {
          state.client = client;
        }

        // Use nextTick to ensure Vue processes all state changes before continuing
        await nextTick();

        loading.value = false;
      } catch (error) {
        console.error('Error loading patient history:', error);
        loading.value = false;
      }
    };

    // Force update trigger for live stats
    const statsUpdateTrigger = ref(0);

    // Live update interval for stats
    let statsInterval = null;

    onMounted(() => {
      // Update stats every 30 seconds for live updates
      statsInterval = setInterval(() => {
        // Force reactivity update by incrementing trigger
        statsUpdateTrigger.value++;
      }, 30000); // Update every 30 seconds
    });

    onUnmounted(() => {
      if (statsInterval) {
        clearInterval(statsInterval);
      }
      if (state.connectionStatusInterval) {
        clearInterval(state.connectionStatusInterval);
      }
    });

    // Telemedicine functions
    const loadTelemedicineSessionDetails = async () => {
      if (!state.attention?.telemedicineSessionId) return;
      try {
        state.telemedicineSession = await getTelemedicineSession(
          state.attention.telemedicineSessionId
        );
        console.log('[CollaboratorAttentionValidate] Loaded telemedicine session:', {
          id: state.telemedicineSession?.id,
          status: state.telemedicineSession?.status,
          type: state.telemedicineSession?.type,
        });

        // If session is already active, start polling but don't auto-open the window
        // The doctor will click the button to open the session when ready
        if (
          state.telemedicineSession?.status === 'active' ||
          state.telemedicineSession?.status === 'ACTIVE'
        ) {
          console.log(
            '[CollaboratorAttentionValidate] Session is already active, but not auto-opening window'
          );
          startConnectionStatusPolling();
        }
      } catch (err) {
        console.error('[CollaboratorAttentionValidate] Error loading telemedicine session:', err);
      }
    };

    const startConnectionStatusPolling = () => {
      // Poll every 3 seconds for connection status
      if (state.connectionStatusInterval) {
        clearInterval(state.connectionStatusInterval);
      }
      state.connectionStatusInterval = setInterval(async () => {
        if (state.attention?.telemedicineSessionId) {
          try {
            const session = await getTelemedicineSession(state.attention.telemedicineSessionId);
            state.telemedicineSession = session;
            // Check if client has validated access key (indicates they're likely connected)
            state.clientConnected = session.accessKeyValidated || false;
          } catch (err) {
            console.error('Error polling connection status:', err);
          }
        }
      }, 3000);
    };

    const stopConnectionStatusPolling = () => {
      if (state.connectionStatusInterval) {
        clearInterval(state.connectionStatusInterval);
        state.connectionStatusInterval = null;
      }
    };

    const handleStartTelemedicineSession = async () => {
      if (!state.attention?.telemedicineSessionId) {
        console.warn('[CollaboratorAttentionValidate] No telemedicineSessionId in attention');
        return;
      }
      try {
        loading.value = true;
        console.log(
          '[CollaboratorAttentionValidate] Starting telemedicine session:',
          state.attention.telemedicineSessionId
        );

        // Verificar el estado actual de la sesión antes de intentar iniciarla
        let currentSession;
        try {
          currentSession = await getTelemedicineSession(state.attention.telemedicineSessionId);
          console.log(
            '[CollaboratorAttentionValidate] Current session status:',
            currentSession.status
          );
        } catch (error) {
          console.error('[CollaboratorAttentionValidate] Error fetching session:', error);
          // Si no podemos obtener la sesión, intentar recargar los detalles
          await loadTelemedicineSessionDetails();
          currentSession = state.telemedicineSession;
          if (!currentSession) {
            throw new Error('No se pudo obtener la información de la sesión');
          }
        }

        const sessionStatus = currentSession.status?.toLowerCase();
        console.log('[CollaboratorAttentionValidate] Normalized session status:', sessionStatus);

        // Solo iniciar la sesión si está en estado SCHEDULED
        if (sessionStatus === 'scheduled') {
          try {
            console.log('[CollaboratorAttentionValidate] Attempting to start scheduled session...');
            await startTelemedicineSession(state.attention.telemedicineSessionId);
            console.log('[CollaboratorAttentionValidate] Session started successfully');
          } catch (error) {
            console.error('[CollaboratorAttentionValidate] Error starting session:', error);
            // Si el error es 400, puede ser que la sesión ya cambió de estado
            if (error.response?.status === 400) {
              console.warn(
                '[CollaboratorAttentionValidate] Session start failed with 400 (might already be active), verifying...'
              );
              // Recargar la sesión para verificar el estado actual
              try {
                await loadTelemedicineSessionDetails();
                const updatedSession = await getTelemedicineSession(
                  state.attention.telemedicineSessionId
                );
                const updatedStatus = updatedSession.status?.toLowerCase();
                console.log(
                  '[CollaboratorAttentionValidate] Updated session status:',
                  updatedStatus
                );
                if (updatedStatus === 'active') {
                  console.log(
                    '[CollaboratorAttentionValidate] Session is already active, continuing...'
                  );
                  // Continuar con el flujo normal
                } else {
                  console.warn(
                    '[CollaboratorAttentionValidate] Session status is still not active:',
                    updatedStatus
                  );
                  // No lanzar error, simplemente continuar
                }
              } catch (verifyError) {
                console.error(
                  '[CollaboratorAttentionValidate] Error verifying session status:',
                  verifyError
                );
                // No lanzar error, simplemente continuar
              }
            } else {
              // Para otros errores, mostrar mensaje pero no bloquear
              console.error('[CollaboratorAttentionValidate] Non-400 error:', error);
              // No lanzar error, intentar continuar
            }
          }
        } else if (sessionStatus === 'active') {
          console.log('[CollaboratorAttentionValidate] Session is already active, skipping start');
        } else {
          console.warn(
            '[CollaboratorAttentionValidate] Session status is',
            sessionStatus,
            '- cannot start, but continuing anyway'
          );
          // No bloquear el flujo, simplemente continuar sin iniciar
        }

        // Recargar detalles de la sesión para obtener el estado actualizado
        await loadTelemedicineSessionDetails();

        // Esperar un momento para asegurar que el estado se actualice
        await new Promise(resolve => setTimeout(resolve, 500));

        // Debug: Log full session and attention data
        console.log(
          '[CollaboratorAttentionValidate] Full telemedicineSession object:',
          JSON.stringify(state.telemedicineSession, null, 2)
        );
        console.log(
          '[CollaboratorAttentionValidate] Full attention.telemedicineConfig:',
          JSON.stringify(state.attention?.telemedicineConfig, null, 2)
        );
        console.log(
          '[CollaboratorAttentionValidate] Session type from session:',
          state.telemedicineSession?.type
        );
        console.log(
          '[CollaboratorAttentionValidate] Session type from config:',
          state.attention?.telemedicineConfig?.type
        );

        // Open video/chat based on session type
        // Try multiple sources for the type
        const sessionType =
          state.telemedicineSession?.type ||
          state.telemedicineSession?.sessionType ||
          state.attention?.telemedicineConfig?.type ||
          'VIDEO'; // Default to VIDEO if not specified

        console.log('[CollaboratorAttentionValidate] Resolved session type:', sessionType);
        console.log(
          '[CollaboratorAttentionValidate] Session status:',
          state.telemedicineSession?.status
        );
        console.log('[CollaboratorAttentionValidate] Session ID:', state.telemedicineSession?.id);
        console.log('[CollaboratorAttentionValidate] Current user ID:', state.currentUser?.id);

        if (
          sessionType === 'VIDEO' ||
          sessionType === 'video' ||
          sessionType === 'BOTH' ||
          sessionType === 'both'
        ) {
          state.showTelemedicineVideo = true;
          state.telemedicineSessionType = 'video';
          console.log(
            '[CollaboratorAttentionValidate] ✅ Showing video component - showTelemedicineVideo:',
            state.showTelemedicineVideo
          );
        }
        if (
          sessionType === 'CHAT' ||
          sessionType === 'chat' ||
          sessionType === 'BOTH' ||
          sessionType === 'both'
        ) {
          state.showTelemedicineChat = true;
          state.telemedicineSessionType = 'chat';
          console.log(
            '[CollaboratorAttentionValidate] ✅ Showing chat component - showTelemedicineChat:',
            state.showTelemedicineChat
          );
        }

        // Force reactivity update
        await nextTick();

        console.log('[CollaboratorAttentionValidate] Final state:', {
          showTelemedicineVideo: state.showTelemedicineVideo,
          showTelemedicineChat: state.showTelemedicineChat,
          telemedicineSessionType: state.telemedicineSessionType,
          sessionId: state.telemedicineSession?.id,
          sessionStatus: state.telemedicineSession?.status,
          willShowFloatingWindow: state.showTelemedicineVideo || state.showTelemedicineChat,
        });

        // Double check after a brief delay
        setTimeout(() => {
          console.log('[CollaboratorAttentionValidate] State check after delay:', {
            showTelemedicineVideo: state.showTelemedicineVideo,
            showTelemedicineChat: state.showTelemedicineChat,
            sessionId: state.telemedicineSession?.id,
          });
        }, 1000);

        // Iniciar polling de estado de conexión
        if (isTelemedicineSessionActive()) {
          startConnectionStatusPolling();
        }

        loading.value = false;
      } catch (error) {
        console.error(
          '[CollaboratorAttentionValidate] Error starting telemedicine session:',
          error
        );
        alertError.value = error.response?.status || 500;
        loading.value = false;
      }
    };

    const closeTelemedicineVideo = () => {
      // Solo ocultar la ventana, no detener la sesión
      state.showTelemedicineVideo = false;
      // No detener el polling, la sesión sigue activa
      console.log('[CollaboratorAttentionValidate] Video window closed, session still active');
    };

    const closeTelemedicineChat = () => {
      // Solo ocultar la ventana, no detener la sesión
      state.showTelemedicineChat = false;
      // No detener el polling, la sesión sigue activa
      console.log('[CollaboratorAttentionValidate] Chat window closed, session still active');
    };

    const reopenTelemedicineSession = () => {
      // Reabrir la ventana de video/chat si la sesión está activa
      if (!isTelemedicineSessionActive()) {
        console.warn('[CollaboratorAttentionValidate] Cannot reopen: session is not active');
        return;
      }

      const sessionType =
        state.telemedicineSession?.type || state.attention?.telemedicineConfig?.type || 'VIDEO';

      if (
        sessionType === 'VIDEO' ||
        sessionType === 'video' ||
        sessionType === 'BOTH' ||
        sessionType === 'both'
      ) {
        state.showTelemedicineVideo = true;
        state.telemedicineSessionType = 'video';
      }
      if (
        sessionType === 'CHAT' ||
        sessionType === 'chat' ||
        sessionType === 'BOTH' ||
        sessionType === 'both'
      ) {
        state.showTelemedicineChat = true;
        state.telemedicineSessionType = 'chat';
      }

      // Reiniciar polling si no está activo
      if (!state.connectionStatusInterval) {
        startConnectionStatusPolling();
      }

      console.log('[CollaboratorAttentionValidate] Telemedicine session reopened');
    };

    const endTelemedicineSession = async () => {
      if (!state.attention?.telemedicineSessionId) {
        console.warn('[CollaboratorAttentionValidate] No telemedicineSessionId to end');
        return;
      }

      if (
        !confirm(
          '¿Está seguro de que desea finalizar definitivamente la sesión de telemedicina? Esta acción no se puede deshacer.'
        )
      ) {
        return;
      }

      try {
        loading.value = true;
        const { endTelemedicineSession } = await import('../../application/services/telemedicine');
        await endTelemedicineSession(state.attention.telemedicineSessionId, {
          notes: 'Sesión finalizada por el doctor',
        });

        // Recargar detalles de la sesión
        await loadTelemedicineSessionDetails();

        // Cerrar las ventanas
        state.showTelemedicineVideo = false;
        state.showTelemedicineChat = false;
        stopConnectionStatusPolling();

        console.log('[CollaboratorAttentionValidate] Telemedicine session ended successfully');
        alertError.value = ''; // Clear any errors
      } catch (error) {
        console.error('[CollaboratorAttentionValidate] Error ending telemedicine session:', error);
        alertError.value = error.response?.status || 500;
      } finally {
        loading.value = false;
      }
    };

    const formatTelemedicineDate = dateString => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleString('es-ES', {
        dateStyle: 'long',
        timeStyle: 'short',
      });
    };

    const getTelemedicineStatusText = status => {
      const statusMap = {
        scheduled: 'Programada',
        SCHEDULED: 'Programada',
        active: 'En curso',
        ACTIVE: 'En curso',
        completed: 'Completada',
        COMPLETED: 'Completada',
        cancelled: 'Cancelada',
        CANCELLED: 'Cancelada',
      };
      return statusMap[status] || status;
    };

    const getTelemedicineStatusClass = status => {
      const classMap = {
        scheduled: 'text-info',
        SCHEDULED: 'text-info',
        active: 'text-success',
        ACTIVE: 'text-success',
        completed: 'text-secondary',
        COMPLETED: 'text-secondary',
        cancelled: 'text-danger',
        CANCELLED: 'text-danger',
      };
      return classMap[status] || '';
    };

    const isTelemedicineSessionActive = () => {
      if (!state.telemedicineSession) return false;
      const status = state.telemedicineSession.status;
      return status === 'ACTIVE' || status === 'active';
    };

    const isTelemedicineSessionEnded = () => {
      if (!state.telemedicineSession) return false;
      const status = state.telemedicineSession.status?.toLowerCase();
      return status === 'completed' || status === 'cancelled';
    };

    const isTelemedicineAttention = computed(
      () => state.attention?.type === 'TELEMEDICINE' || !!state.attention?.telemedicineConfig
    );

    // Computed to get remoteVideo reactively from TelemedicineVideoCall component
    const remoteVideoRef = computed(() => telemedicineVideoCallRef.value?.remoteVideo || null);

    // Attention Statistics Computed
    const attentionStats = computed(() => {
      // Use trigger to force recomputation
      const _ = statsUpdateTrigger.value;

      // Define now at the top to ensure it's always available
      const now = new Date();

      if (!state.attention || !state.attention.id) {
        return null;
      }

      const createdDate = state.attention.createdDate || state.attention.createdAt;
      if (!createdDate) {
        return null;
      }

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

      // For PROCESSING attentions, calculate waiting time from creation to processedAt
      // For other statuses, calculate from creation to now
      let endTime = now;
      const isProcessing =
        state.attention.status === 'PROCESSING' ||
        (typeof state.attention.status === 'string' &&
          state.attention.status.toUpperCase() === 'PROCESSING');

      if (isProcessing && state.attention.processedAt) {
        const processedDate = state.attention.processedAt;
        try {
          let parsedProcessed;
          if (processedDate instanceof Date) {
            parsedProcessed = processedDate;
          } else if (processedDate.toDate && typeof processedDate.toDate === 'function') {
            parsedProcessed = processedDate.toDate();
          } else if (processedDate.seconds !== undefined) {
            parsedProcessed = new Date(processedDate.seconds * 1000);
          } else if (processedDate._seconds !== undefined) {
            parsedProcessed = new Date(processedDate._seconds * 1000);
          } else if (typeof processedDate === 'string') {
            parsedProcessed = new Date(processedDate);
          } else {
            parsedProcessed = new Date(processedDate);
          }

          if (!isNaN(parsedProcessed.getTime())) {
            endTime = parsedProcessed;
          } else {
            endTime = now;
          }
        } catch (error) {
          console.error('Error parsing processedAt date:', error);
          endTime = now; // Fallback to now if parsing fails
        }
      }

      const diffMs = endTime - created;
      const minutes = Math.floor(diffMs / (1000 * 60));
      const hours = Math.floor(minutes / 60);

      let elapsedDisplay = '';
      if (minutes < 60) {
        elapsedDisplay = `${minutes} min`;
      } else if (hours < 24) {
        elapsedDisplay = `${hours}h ${minutes % 60}min`;
      } else {
        const days = Math.floor(hours / 24);
        elapsedDisplay = `${days}d ${hours % 24}h`;
      }

      const creationTime = created.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
      const creationDate = created.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
      });

      let timeStatus = 'neutral';
      let timeColor = '#a9a9a9';
      if (minutes < 10) {
        timeStatus = 'excellent';
        timeColor = '#00c2cb';
      } else if (minutes < 60) {
        timeStatus = 'good';
        timeColor = '#f9c322';
      } else if (minutes < 180) {
        timeStatus = 'warning';
        timeColor = '#ff9800';
      } else {
        timeStatus = 'poor';
        timeColor = '#a52a2a';
      }

      // Calculate processing time if attention is PROCESSING
      let processingTime = null;
      let processingDisplay = '';
      let processingMinutes = 0;
      let expectedDuration = null; // in minutes
      let durationComparison = null; // percentage elapsed
      let durationStatus = 'neutral';
      let durationColor = '#a9a9a9';
      let minutesRemaining = null;

      if (state.attention.status === 'PROCESSING' && state.attention.processedAt) {
        let processed;
        const processedDate = state.attention.processedAt;
        try {
          if (processedDate instanceof Date) {
            processed = processedDate;
          } else if (processedDate.toDate && typeof processedDate.toDate === 'function') {
            processed = processedDate.toDate();
          } else if (processedDate.seconds !== undefined) {
            processed = new Date(processedDate.seconds * 1000);
          } else if (processedDate._seconds !== undefined) {
            processed = new Date(processedDate._seconds * 1000);
          } else if (typeof processedDate === 'string') {
            processed = new Date(processedDate);
          } else {
            processed = new Date(processedDate);
          }

          if (!isNaN(processed.getTime())) {
            const processingDiffMs = now - processed;
            processingMinutes = Math.floor(processingDiffMs / (1000 * 60));
            const processingHours = Math.floor(processingMinutes / 60);

            if (processingMinutes < 60) {
              processingDisplay = `${processingMinutes} min`;
            } else if (processingHours < 24) {
              processingDisplay = `${processingHours}h ${processingMinutes % 60}min`;
            } else {
              const days = Math.floor(processingHours / 24);
              processingDisplay = `${days}d ${processingHours % 24}h`;
            }
            processingTime = processingDisplay;

            // Calculate expected duration from services, booking, or queue estimated duration (in that order)
            // Check servicesDetails first
            if (
              state.attention.servicesDetails &&
              Array.isArray(state.attention.servicesDetails) &&
              state.attention.servicesDetails.length > 0
            ) {
              expectedDuration = state.attention.servicesDetails.reduce((total, service) => {
                if (service && service.serviceInfo) {
                  return (
                    total +
                    (service.serviceInfo.blockTime || service.serviceInfo.estimatedTime || 0)
                  );
                }
                return total;
              }, 0);
            }
            // If no duration from services, check booking block duration
            if (!expectedDuration && state.attention.booking && state.attention.booking.block) {
              // Booking blocks might have duration info, but typically we use service duration
              // For now, we'll rely on servicesDetails
            }
            // If still no duration, use queue estimated duration as fallback
            if (!expectedDuration || expectedDuration === 0) {
              if (state.queueEstimatedDuration && state.queueEstimatedDuration > 0) {
                expectedDuration = state.queueEstimatedDuration;
              }
            }

            // If we have expected duration, calculate comparison
            if (expectedDuration && expectedDuration > 0) {
              durationComparison = (processingMinutes / expectedDuration) * 100;
              minutesRemaining = expectedDuration - processingMinutes;

              // Color coding based on percentage
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
          }
        } catch (error) {
          console.error('Error calculating processing time:', error);
        }
      }

      // Calculate processedAt time for PROCESSING attentions
      let processedAtTime = null;
      let processedAtDate = null;
      if (isProcessing && state.attention.processedAt) {
        const processedDate = state.attention.processedAt;
        try {
          let parsedProcessed;
          if (processedDate instanceof Date) {
            parsedProcessed = processedDate;
          } else if (processedDate.toDate && typeof processedDate.toDate === 'function') {
            parsedProcessed = processedDate.toDate();
          } else if (processedDate.seconds !== undefined) {
            parsedProcessed = new Date(processedDate.seconds * 1000);
          } else if (processedDate._seconds !== undefined) {
            parsedProcessed = new Date(processedDate._seconds * 1000);
          } else if (typeof processedDate === 'string') {
            parsedProcessed = new Date(processedDate);
          } else {
            parsedProcessed = new Date(processedDate);
          }

          if (!isNaN(parsedProcessed.getTime())) {
            processedAtTime = parsedProcessed.toLocaleTimeString('pt-BR', {
              hour: '2-digit',
              minute: '2-digit',
            });
            processedAtDate = parsedProcessed.toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
            });
          }
        } catch (error) {
          // Ignore error
        }
      }

      return {
        creationTime,
        creationDate,
        elapsedTime: elapsedDisplay,
        elapsedMinutes: minutes,
        timeStatus,
        timeColor,
        processedAtTime,
        processedAtDate,
        processingTime,
        processingMinutes,
        expectedDuration,
        durationComparison,
        durationStatus,
        durationColor,
        minutesRemaining,
      };
    });

    return {
      id,
      state,
      comment,
      loading,
      alertError,
      getPatientHistory,
      finishCurrentAttention,
      queueAttentions,
      skipAttention,
      attendCurrentAttention,
      isReactivated,
      getActiveFeature,
      getAttentionProducts,
      attentionStats,
      statsUpdateTrigger,
      loadTelemedicineSessionDetails,
      handleStartTelemedicineSession,
      closeTelemedicineVideo,
      closeTelemedicineChat,
      reopenTelemedicineSession,
      endTelemedicineSession,
      formatTelemedicineDate,
      getTelemedicineStatusText,
      getTelemedicineStatusClass,
      isTelemedicineSessionActive,
      isTelemedicineSessionEnded,
      isTelemedicineAttention,
      remoteVideoRef,
      telemedicineVideoCallRef,
    };
  },
};
</script>
<template>
  <div>
    <!-- Mobile/Tablet Layout -->
    <div class="d-block d-lg-none">
      <div class="content text-center">
        <CommerceLogo :src="state.commerce.logo" :loading="loading"></CommerceLogo>
        <ComponentMenu
          :title="`${$t(`collaboratorAttentionValidate.hello-user`)}, ${
            state.currentUser.alias || state.currentUser.name
          }!`"
          :toggles="state.toggles"
          component-name="collaboratorAttentionValidate"
          @goBack="queueAttentions"
        >
        </ComponentMenu>
        <QueueName :queue="state.queue"> </QueueName>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <div
          id="attention-processing"
          v-if="
            state.attention.status === 'PENDING' ||
            state.attention.status === 'PROCESSING' ||
            state.attention.status === 'REACTIVATED'
          "
        >
          <div id="page-header" class="text-center">
            <div class="your-attention mt-4 mb-3">
              <span>{{ $t('collaboratorAttentionValidate.yourNumber') }}</span>
            </div>
          </div>
          <AttentionNumber
            :type="state.attention.type === 'NODEVICE' ? 'no-device' : 'primary'"
            :number="state.attention.number"
            :data="state.user"
            :attention="state.attention"
          ></AttentionNumber>
          <!-- Attention Statistics Cards -->
          <div v-if="attentionStats" class="attention-stats-grid mt-3">
            <!-- Elapsed Time Card (only show if attention does NOT come from a booking) -->
            <div
              v-if="
                !state.attention.bookingId && !state.attention.booking && !state.attention.block
              "
              class="stat-card stat-card-time"
              :class="`stat-card-${attentionStats.timeStatus}`"
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
                  Tempo de Espera
                  <span
                    v-if="state.attention.status !== 'PROCESSING'"
                    class="spy-live-indicator"
                    title="Actualización en tiempo real"
                  >
                    <span class="spy-live-dot"></span>
                  </span>
                </div>
                <div class="stat-card-value" :style="{ color: attentionStats.timeColor }">
                  {{ attentionStats.elapsedTime }}
                </div>
              </div>
            </div>

            <!-- Creation Time Card -->
            <div class="stat-card stat-card-creation">
              <div class="stat-card-icon">
                <i class="bi bi-clock-history"></i>
              </div>
              <div class="stat-card-content">
                <div class="stat-card-label">Criado em</div>
                <div class="stat-card-value">{{ attentionStats.creationTime }}</div>
                <div class="stat-card-subvalue">{{ attentionStats.creationDate }}</div>
              </div>
            </div>

            <!-- Processing Time Card (only for PROCESSING attentions) -->
            <div
              v-if="attentionStats.processingTime && state.attention.status === 'PROCESSING'"
              class="stat-card stat-card-processing"
              :class="`stat-card-${attentionStats.durationStatus || 'neutral'}`"
            >
              <div class="stat-card-icon">
                <i class="bi bi-stopwatch"></i>
              </div>
              <div class="stat-card-content">
                <div class="stat-card-label">
                  Tempo de Atendimento
                  <span class="spy-live-indicator" title="Actualización en tiempo real">
                    <span class="spy-live-dot"></span>
                  </span>
                </div>
                <div
                  class="stat-card-value"
                  :style="{ color: attentionStats.durationColor || '#004aad' }"
                >
                  {{ attentionStats.processingTime }}
                </div>
                <div v-if="attentionStats.expectedDuration" class="stat-card-subvalue">
                  <div class="duration-comparison">
                    <span class="duration-label">Duração esperada:</span>
                    <span class="duration-value" style="color: #666">
                      {{ attentionStats.expectedDuration }} min
                    </span>
                  </div>
                  <div
                    v-if="
                      attentionStats.minutesRemaining !== null &&
                      attentionStats.minutesRemaining >= 0
                    "
                    class="duration-comparison"
                  >
                    <span class="duration-label">Tempo restante:</span>
                    <span class="duration-value" :style="{ color: attentionStats.durationColor }">
                      {{ attentionStats.minutesRemaining }} min
                    </span>
                  </div>
                  <div v-else class="duration-comparison">
                    <span class="duration-label">Tempo excedido:</span>
                    <span class="duration-value" :style="{ color: attentionStats.durationColor }">
                      {{ Math.abs(attentionStats.minutesRemaining) }} min
                    </span>
                  </div>
                  <div class="duration-progress">
                    <div class="duration-progress-bar">
                      <div
                        class="duration-progress-fill"
                        :style="{
                          width: `${Math.min(attentionStats.durationComparison || 0, 100)}%`,
                          backgroundColor: attentionStats.durationColor,
                        }"
                      ></div>
                    </div>
                    <span class="duration-percentage"
                      >{{ Math.round(attentionStats.durationComparison || 0) }}%</span
                    >
                  </div>
                </div>
                <div v-else class="stat-card-subvalue">Duração estimada não disponível</div>
              </div>
            </div>
          </div>
          <!-- Button section for PENDING attentions that are current -->
          <div
            v-if="
              state.attention.status === 'PENDING' &&
              state.queue &&
              (state.attention.number === state.queue.currentAttentionNumber ||
                state.attention.id === state.queue.currentAttentionId)
            "
            class="d-grid gap-2 my-2 mx-2"
          >
            <div class="actions">
              <span
                ><strong>{{ $t('collaboratorQueueAttentions.actions.1.title.1') }}</strong></span
              >
            </div>
            <div class="row mx-1">
              <button
                class="btn btn-lg btn-block btn-size fw-bold btn-primary rounded-pill mb-1"
                :disabled="loading"
                @click="attendCurrentAttention()"
              >
                {{ $t('collaboratorAttentionValidate.actions.1.action') }}
                <i class="bi bi-play-circle-fill"></i>
              </button>
            </div>
            <div class="d-grid gap-2 my-1">
              <button
                class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
                @click="queueAttentions()"
                :disabled="loading"
              >
                {{ $t('collaboratorAttentionValidate.actions.2.action') }}
                <i class="bi bi-arrow-left-circle"></i>
              </button>
            </div>
          </div>
          <div
            v-if="
              state.attention.status === 'PROCESSING' || state.attention.status === 'REACTIVATED'
            "
            class="d-grid gap-2 my-2 mx-2"
          >
            <div class="mb-2">
              <label for="comment" class="form-label mt-2 comment-title">{{
                $t('collaboratorAttentionValidate.comment.label')
              }}</label>
              <textarea
                class="form-control"
                id="comment"
                rows="3"
                v-model="comment"
                :placeholder="$t('collaboratorAttentionValidate.comment.placeholder')"
              >
              </textarea>
            </div>
            <div class="actions">
              <span
                ><strong>{{ $t('collaboratorQueueAttentions.actions.1.title.1') }}</strong></span
              >
            </div>
            <div
              v-if="getActiveFeature(state.commerce, 'attention-stock-register', 'PRODUCT')"
              class="row mx-1"
            >
              <button
                class="col btn btn-md btn-block btn-size fw-bold btn-secondary rounded-pill mb-1"
                :disabled="!state.toggles['collaborator.attention.products'] || loading"
                @click="getAttentionProducts()"
                data-bs-toggle="modal"
                :data-bs-target="`#attentionsProductsModal-${state.attention.id}`"
              >
                {{ $t('collaboratorAttentionValidate.actions.3.action') }}
                <i class="bi bi-eyedropper"></i>
              </button>
              <button
                class="col btn btn-lg btn-block btn-size fw-bold btn-secondary rounded-pill mb-1"
                :disabled="!state.toggles['collaborator.attention.patient-history'] || loading"
                @click="getPatientHistory()"
                data-bs-toggle="modal"
                :data-bs-target="`#patientHistoryModal-${state.attention.clientId}`"
              >
                {{ $t('dashboard.patientHistory') }} <i class="bi bi-file-medical-fill"></i>
              </button>
            </div>
            <div class="row mx-1">
              <button
                class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-1"
                :disabled="!state.toggles['collaborator.attention.finish'] || loading"
                @click="finishCurrentAttention()"
              >
                {{ $t('collaboratorAttentionValidate.actions.1.action') }}
                <i class="bi bi-check-all"></i>
              </button>
            </div>
            <div class="actions">
              <span
                ><strong>{{ $t('collaboratorQueueAttentions.actions.2.title.1') }}</strong></span
              >
            </div>
            <button
              class="btn btn-lg btn-block btn-size fw-bold btn-danger rounded-pill mb-1"
              :disabled="
                !state.toggles['collaborator.attention.skip'] || isReactivated() || loading
              "
              @click="skipAttention()"
            >
              {{ $t('collaboratorQueueAttentions.actions.2.action') }}
              <i class="bi bi-skip-forward"></i>
            </button>
            <div class="d-grid gap-2 my-1">
              <button
                class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
                @click="queueAttentions()"
                :disabled="loading"
              >
                {{ $t('collaboratorAttentionValidate.actions.2.action') }}
                <i class="bi bi-arrow-left-circle"></i>
              </button>
            </div>
          </div>
        </div>
        <div v-else id="attention-terminated">
          <div v-if="state.attention.status === 'TERMINATED' || state.attention.status === 'RATED'">
            <Message
              :title="$t('collaboratorAttentionValidate.message.2.title')"
              :content="$t('collaboratorAttentionValidate.message.2.content')"
              :icon="'bi bi-emoji-sunglasses'"
            >
            </Message>
          </div>
          <div v-if="state.attention.status === 'SKIPED'">
            <Message
              :title="$t('collaboratorAttentionValidate.message.3.title')"
              :content="$t('collaboratorAttentionValidate.message.3.content')"
              :icon="'bi bi-emoji-sunglasses'"
            >
            </Message>
          </div>
          <div
            v-if="
              state.attention.status === 'USER_CANCELLED' ||
              state.attention.status === 'TERMINATED_RESERVE_CANCELLED'
            "
          >
            <div class="your-attention mt-4 mb-3">
              <span>{{ $t('collaboratorAttentionValidate.yourNumber') }}</span>
            </div>
            <AttentionNumber
              :type="'secondary'"
              :number="state.attention.number"
              :data="state.user"
            ></AttentionNumber>
            <Message
              :title="$t('collaboratorAttentionValidate.message.5.title')"
              :content="$t('collaboratorAttentionValidate.message.5.content')"
              :icon="'bi bi-emoji-expressionless'"
            >
            </Message>
          </div>
          <div
            class="d-grid gap-2 my-2"
            v-if="state.attention.status !== 'TERMINATED' && state.attention.status !== 'RATED'"
          >
            <button
              class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
              @click="queueAttentions()"
              :disabled="loading"
            >
              {{ $t('collaboratorAttentionValidate.actions.2.action') }}
              <i class="bi bi-arrow-left-circle"></i>
            </button>
          </div>
        </div>
        <div
          v-if="
            state.attention.status === 'PENDING' &&
            state.queue &&
            state.attention.number !== state.queue.currentAttentionNumber &&
            state.attention.id !== state.queue.currentAttentionId
          "
        >
          <Message
            :title="$t('collaboratorAttentionValidate.message.4.title')"
            :content="$t('collaboratorAttentionValidate.message.4.content')"
            :icon="'bi bi-emoji-expressionless'"
          >
          </Message>
          <div class="d-grid gap-2 my-2">
            <button
              class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
              @click="queueAttentions()"
              :disabled="loading"
            >
              {{ $t('collaboratorAttentionValidate.actions.2.action') }}
              <i class="bi bi-arrow-left-circle"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Desktop Layout -->
    <div class="d-none d-lg-block">
      <div class="content text-center">
        <div id="page-header" class="text-center mb-3">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <div class="row align-items-center mb-1 desktop-header-row justify-content-start">
          <div class="col-auto desktop-logo-wrapper">
            <div class="desktop-commerce-logo">
              <div id="commerce-logo-desktop">
                <img
                  v-if="!loading || state.commerce.logo"
                  class="rounded img-fluid logo-desktop"
                  :alt="$t('logoAlt')"
                  :src="state.commerce.logo || $t('hubLogoBlanco')"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
          <div class="col desktop-menu-wrapper" style="flex: 1 1 auto; min-width: 0">
            <ComponentMenu
              :title="`${$t(`collaboratorAttentionValidate.hello-user`)}, ${
                state.currentUser.alias || state.currentUser.name
              }!`"
              :toggles="state.toggles"
              component-name="collaboratorAttentionValidate"
              @goBack="queueAttentions"
            >
            </ComponentMenu>
          </div>
        </div>
        <QueueName :queue="state.queue"> </QueueName>
        <div
          id="attention-processing"
          v-if="
            state.attention.status === 'PENDING' ||
            state.attention.status === 'PROCESSING' ||
            state.attention.status === 'REACTIVATED'
          "
        >
          <div id="page-header" class="text-center">
            <div class="your-attention mt-4 mb-3">
              <span>{{ $t('collaboratorAttentionValidate.yourNumber') }}</span>
            </div>
          </div>
          <AttentionNumber
            :type="state.attention.type === 'NODEVICE' ? 'no-device' : 'primary'"
            :number="state.attention.number"
            :data="state.user"
            :attention="state.attention"
          ></AttentionNumber>
          <!-- Attention Statistics Cards -->
          <div v-if="attentionStats" class="attention-stats-grid mt-3">
            <!-- Elapsed Time Card (only show if attention does NOT come from a booking) -->
            <div
              v-if="
                !state.attention.bookingId && !state.attention.booking && !state.attention.block
              "
              class="stat-card stat-card-time"
              :class="`stat-card-${attentionStats.timeStatus}`"
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
                  Tempo de Espera
                  <span
                    v-if="state.attention.status !== 'PROCESSING'"
                    class="spy-live-indicator"
                    title="Actualización en tiempo real"
                  >
                    <span class="spy-live-dot"></span>
                  </span>
                </div>
                <div class="stat-card-value" :style="{ color: attentionStats.timeColor }">
                  {{ attentionStats.elapsedTime }}
                </div>
              </div>
            </div>

            <!-- Creation Time Card -->
            <div class="stat-card stat-card-creation">
              <div class="stat-card-icon">
                <i class="bi bi-clock-history"></i>
              </div>
              <div class="stat-card-content">
                <div class="stat-card-label">Criado em</div>
                <div class="stat-card-value">{{ attentionStats.creationTime }}</div>
                <div class="stat-card-subvalue">{{ attentionStats.creationDate }}</div>
              </div>
            </div>

            <!-- Processing Time Card (only for PROCESSING attentions) -->
            <div
              v-if="attentionStats.processingTime && state.attention.status === 'PROCESSING'"
              class="stat-card stat-card-processing"
              :class="`stat-card-${attentionStats.durationStatus || 'neutral'}`"
            >
              <div class="stat-card-icon">
                <i class="bi bi-stopwatch"></i>
              </div>
              <div class="stat-card-content">
                <div class="stat-card-label">
                  Tempo de Atendimento
                  <span class="spy-live-indicator" title="Actualización en tiempo real">
                    <span class="spy-live-dot"></span>
                  </span>
                </div>
                <div
                  class="stat-card-value"
                  :style="{ color: attentionStats.durationColor || '#004aad' }"
                >
                  {{ attentionStats.processingTime }}
                </div>
                <div v-if="attentionStats.expectedDuration" class="stat-card-subvalue">
                  <div class="duration-comparison">
                    <span class="duration-label">Duração esperada:</span>
                    <span class="duration-value" style="color: #666">
                      {{ attentionStats.expectedDuration }} min
                    </span>
                  </div>
                  <div
                    v-if="
                      attentionStats.minutesRemaining !== null &&
                      attentionStats.minutesRemaining >= 0
                    "
                    class="duration-comparison"
                  >
                    <span class="duration-label">Tempo restante:</span>
                    <span class="duration-value" :style="{ color: attentionStats.durationColor }">
                      {{ attentionStats.minutesRemaining }} min
                    </span>
                  </div>
                  <div v-else class="duration-comparison">
                    <span class="duration-label">Tempo excedido:</span>
                    <span class="duration-value" :style="{ color: attentionStats.durationColor }">
                      {{ Math.abs(attentionStats.minutesRemaining) }} min
                    </span>
                  </div>
                  <div class="duration-progress">
                    <div class="duration-progress-bar">
                      <div
                        class="duration-progress-fill"
                        :style="{
                          width: `${Math.min(attentionStats.durationComparison || 0, 100)}%`,
                          backgroundColor: attentionStats.durationColor,
                        }"
                      ></div>
                    </div>
                    <span class="duration-percentage"
                      >{{ Math.round(attentionStats.durationComparison || 0) }}%</span
                    >
                  </div>
                </div>
                <div v-else class="stat-card-subvalue">Duração estimada não disponível</div>
              </div>
            </div>
          </div>
          <!-- Button section for PENDING attentions that are current -->
          <div
            v-if="
              state.attention.status === 'PENDING' &&
              state.queue &&
              (state.attention.number === state.queue.currentAttentionNumber ||
                state.attention.id === state.queue.currentAttentionId)
            "
            class="d-grid gap-2 my-2 mx-2"
          >
            <div class="actions">
              <span
                ><strong>{{ $t('collaboratorQueueAttentions.actions.1.title.1') }}</strong></span
              >
            </div>
            <div class="row mx-1">
              <button
                class="btn btn-lg btn-block btn-size fw-bold btn-primary rounded-pill mb-1"
                :disabled="loading"
                @click="attendCurrentAttention()"
              >
                {{ $t('collaboratorAttentionValidate.actions.1.action') }}
                <i class="bi bi-play-circle-fill"></i>
              </button>
            </div>
            <div class="d-grid gap-2 my-1">
              <button
                class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
                @click="queueAttentions()"
                :disabled="loading"
              >
                {{ $t('collaboratorAttentionValidate.actions.2.action') }}
                <i class="bi bi-arrow-left-circle"></i>
              </button>
            </div>
          </div>
          <div
            v-if="
              state.attention.status === 'PROCESSING' || state.attention.status === 'REACTIVATED'
            "
            class="d-grid gap-2 my-2 mx-2"
          >
            <div class="mb-2">
              <label for="comment" class="form-label mt-2 comment-title">{{
                $t('collaboratorAttentionValidate.comment.label')
              }}</label>
              <textarea
                class="form-control"
                id="comment"
                rows="3"
                v-model="comment"
                :placeholder="$t('collaboratorAttentionValidate.comment.placeholder')"
              >
              </textarea>
            </div>
            <div class="actions">
              <span
                ><strong>{{ $t('collaboratorQueueAttentions.actions.1.title.1') }}</strong></span
              >
            </div>
            <div
              v-if="getActiveFeature(state.commerce, 'attention-stock-register', 'PRODUCT')"
              class="row mx-1"
            >
              <button
                class="col btn btn-md btn-block btn-size fw-bold btn-secondary rounded-pill mb-1"
                :disabled="!state.toggles['collaborator.attention.products'] || loading"
                @click="getAttentionProducts()"
                data-bs-toggle="modal"
                :data-bs-target="`#attentionsProductsModal-${state.attention.id}`"
              >
                {{ $t('collaboratorAttentionValidate.actions.3.action') }}
                <i class="bi bi-eyedropper"></i>
              </button>
              <button
                class="col btn btn-lg btn-block btn-size fw-bold btn-secondary rounded-pill mb-1"
                :disabled="!state.toggles['collaborator.attention.patient-history'] || loading"
                @click="getPatientHistory()"
                data-bs-toggle="modal"
                :data-bs-target="`#patientHistoryModal-${state.attention.clientId}`"
              >
                {{ $t('dashboard.patientHistory') }} <i class="bi bi-file-medical-fill"></i>
              </button>
            </div>
            <!-- Telemedicine Section (Desktop) -->
            <div v-if="isTelemedicineAttention" class="row mx-1 mb-3">
              <div class="col-12">
                <div class="attention-details-card">
                  <div class="attention-card-content">
                    <div class="mb-2">
                      <strong class="attention-details-title">
                        <i class="bi bi-camera-video me-2"></i> Consulta por Telemedicina
                      </strong>
                    </div>
                    <div class="mb-2">
                      <span v-if="state.attention.telemedicineConfig" class="badge bg-primary me-1">
                        <span
                          v-if="
                            state.attention.telemedicineConfig.type === 'VIDEO' ||
                            state.attention.telemedicineConfig.type === 'video'
                          "
                        >
                          Video
                        </span>
                        <span
                          v-else-if="
                            state.attention.telemedicineConfig.type === 'CHAT' ||
                            state.attention.telemedicineConfig.type === 'chat'
                          "
                        >
                          Chat
                        </span>
                        <span
                          v-else-if="
                            state.attention.telemedicineConfig.type === 'BOTH' ||
                            state.attention.telemedicineConfig.type === 'both'
                          "
                        >
                          Video y Chat
                        </span>
                      </span>
                      <span
                        v-if="state.telemedicineSession"
                        :class="`badge ${getTelemedicineStatusClass(
                          state.telemedicineSession.status
                        )}`"
                      >
                        {{ getTelemedicineStatusText(state.telemedicineSession.status) }}
                      </span>
                    </div>
                    <!-- Session Ended Message -->
                    <div v-if="isTelemedicineSessionEnded()" class="mt-3">
                      <div class="alert alert-secondary mb-0">
                        <i class="bi bi-check-circle-fill me-2"></i>
                        <strong>La sesión de telemedicina ha sido finalizada</strong>
                        <div
                          v-if="state.telemedicineSession?.endedAt"
                          class="mt-2 small text-muted"
                        >
                          Finalizada el
                          {{ formatTelemedicineDate(state.telemedicineSession.endedAt) }}
                        </div>
                      </div>
                    </div>
                    <!-- Start/Open Session Button -->
                    <div
                      v-else-if="!state.showTelemedicineVideo && !state.showTelemedicineChat"
                      class="mt-3"
                    >
                      <button
                        type="button"
                        class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-1"
                        @click="handleStartTelemedicineSession()"
                        :disabled="loading || isTelemedicineSessionEnded()"
                      >
                        <i class="bi bi-camera-video me-1"></i>
                        <span v-if="isTelemedicineSessionActive()"
                          >Abrir Sesión de Telemedicina</span
                        >
                        <span v-else>Iniciar Sesión de Telemedicina</span>
                      </button>
                    </div>
                    <!-- Patient Connection Status -->
                    <div v-if="isTelemedicineSessionActive()" class="mt-2">
                      <div v-if="state.clientConnected" class="alert alert-success mb-2">
                        <i class="bi bi-check-circle me-2"></i>
                        <strong>Paciente conectado</strong>
                      </div>
                      <div v-else class="alert alert-warning mb-2">
                        <i class="bi bi-clock me-2"></i>
                        <strong>Esperando conexión del paciente...</strong>
                      </div>

                      <!-- Actions when window is open -->
                      <div
                        v-if="state.showTelemedicineVideo || state.showTelemedicineChat"
                        class="alert alert-info mb-2"
                      >
                        <i class="bi bi-info-circle me-2"></i>
                        <strong>Ventana de telemedicina abierta</strong>
                        <div class="row mx-1 mt-2">
                          <button
                            type="button"
                            class="btn btn-lg btn-block btn-size fw-bold btn-secondary rounded-pill mb-1"
                            @click="closeTelemedicineVideo"
                          >
                            <i class="bi bi-x-circle me-1"></i> Cerrar Ventana
                          </button>
                          <button
                            type="button"
                            class="btn btn-lg btn-block btn-size fw-bold btn-danger rounded-pill mb-1"
                            @click="endTelemedicineSession"
                            :disabled="loading"
                          >
                            <i class="bi bi-stop-circle me-1"></i> Finalizar Sesión
                          </button>
                        </div>
                      </div>

                      <!-- Actions when window is closed but session is active -->
                      <div v-else class="alert alert-warning mb-2">
                        <i class="bi bi-camera-video me-2"></i>
                        <strong>Sesión activa - Ventana cerrada</strong>
                        <div class="row mx-1 mt-2">
                          <button
                            type="button"
                            class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-1"
                            @click="reopenTelemedicineSession"
                          >
                            <i class="bi bi-arrow-clockwise me-1"></i> Reabrir Sesión
                          </button>
                          <button
                            type="button"
                            class="btn btn-lg btn-block btn-size fw-bold btn-danger rounded-pill mb-1"
                            @click="endTelemedicineSession"
                            :disabled="loading"
                          >
                            <i class="bi bi-stop-circle me-1"></i> Finalizar Sesión
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div class="row mx-1">
              <button
                class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-1"
                :disabled="!state.toggles['collaborator.attention.finish'] || loading"
                @click="finishCurrentAttention()"
              >
                {{ $t('collaboratorAttentionValidate.actions.1.action') }}
                <i class="bi bi-check-all"></i>
              </button>
            </div>
            <div class="actions">
              <span
                ><strong>{{ $t('collaboratorQueueAttentions.actions.2.title.1') }}</strong></span
              >
            </div>
            <button
              class="btn btn-lg btn-block btn-size fw-bold btn-danger rounded-pill mb-1"
              :disabled="
                !state.toggles['collaborator.attention.skip'] || isReactivated() || loading
              "
              @click="skipAttention()"
            >
              {{ $t('collaboratorQueueAttentions.actions.2.action') }}
              <i class="bi bi-skip-forward"></i>
            </button>
            <div class="d-grid gap-2 my-1">
              <button
                class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
                @click="queueAttentions()"
                :disabled="loading"
              >
                {{ $t('collaboratorAttentionValidate.actions.2.action') }}
                <i class="bi bi-arrow-left-circle"></i>
              </button>
            </div>
          </div>
        </div>
        <div v-else id="attention-terminated">
          <div v-if="state.attention.status === 'TERMINATED' || state.attention.status === 'RATED'">
            <Message
              :title="$t('collaboratorAttentionValidate.message.2.title')"
              :content="$t('collaboratorAttentionValidate.message.2.content')"
              :icon="'bi bi-emoji-sunglasses'"
            >
            </Message>
          </div>
          <div v-if="state.attention.status === 'SKIPED'">
            <Message
              :title="$t('collaboratorAttentionValidate.message.3.title')"
              :content="$t('collaboratorAttentionValidate.message.3.content')"
              :icon="'bi bi-emoji-sunglasses'"
            >
            </Message>
          </div>
          <div
            v-if="
              state.attention.status === 'USER_CANCELLED' ||
              state.attention.status === 'TERMINATED_RESERVE_CANCELLED'
            "
          >
            <div class="your-attention mt-4 mb-3">
              <span>{{ $t('collaboratorAttentionValidate.yourNumber') }}</span>
            </div>
            <AttentionNumber
              :type="'secondary'"
              :number="state.attention.number"
              :data="state.user"
            ></AttentionNumber>
            <Message
              :title="$t('collaboratorAttentionValidate.message.5.title')"
              :content="$t('collaboratorAttentionValidate.message.5.content')"
              :icon="'bi bi-emoji-expressionless'"
            >
            </Message>
          </div>
          <div
            class="d-grid gap-2 my-2"
            v-if="state.attention.status !== 'TERMINATED' && state.attention.status !== 'RATED'"
          >
            <button
              class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
              @click="queueAttentions()"
              :disabled="loading"
            >
              {{ $t('collaboratorAttentionValidate.actions.2.action') }}
              <i class="bi bi-arrow-left-circle"></i>
            </button>
          </div>
        </div>
        <div
          v-if="
            state.attention.status === 'PENDING' &&
            state.queue &&
            state.attention.number !== state.queue.currentAttentionNumber &&
            state.attention.id !== state.queue.currentAttentionId
          "
        >
          <Message
            :title="$t('collaboratorAttentionValidate.message.4.title')"
            :content="$t('collaboratorAttentionValidate.message.4.content')"
            :icon="'bi bi-emoji-expressionless'"
          >
          </Message>
          <div class="d-grid gap-2 my-2">
            <button
              class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
              @click="queueAttentions()"
              :disabled="loading"
            >
              {{ $t('collaboratorAttentionValidate.actions.2.action') }}
              <i class="bi bi-arrow-left-circle"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
    <!-- Telemedicine Floating Window -->
    <!-- Show if session is active OR if video/chat components are explicitly shown -->
    <div
      v-if="
        isTelemedicineSessionActive() || state.showTelemedicineVideo || state.showTelemedicineChat
      "
    >
      <TelemedicineFloatingWindow
        :show="state.showTelemedicineVideo || state.showTelemedicineChat"
        :title="'Consulta Virtual'"
        :icon-class="state.telemedicineSessionType === 'chat' ? 'bi-chat-dots' : 'bi-camera-video'"
        :is-connected="state.clientConnected"
        :is-connecting="!state.clientConnected"
        :client-connected="state.clientConnected"
        :remote-video-ref="remoteVideoRef"
        :show-video-miniature="state.showTelemedicineVideo"
        @close="closeTelemedicineVideo"
      >
        <TelemedicineVideoCall
          v-if="
            state.showTelemedicineVideo &&
            (state.telemedicineSession?.id || state.attention?.telemedicineSessionId)
          "
          ref="telemedicineVideoCallRef"
          :session-id="state.telemedicineSession?.id || state.attention?.telemedicineSessionId"
          :current-user-id="state.currentUser?.id"
          user-type="doctor"
          :show-close="false"
          :recording-enabled="
            state.telemedicineSession?.recordingEnabled ||
            state.attention?.telemedicineConfig?.recordingEnabled ||
            false
          "
          :client-connected="state.clientConnected"
          @call-ended="closeTelemedicineVideo"
        />
        <TelemedicineChat
          v-if="
            state.showTelemedicineChat &&
            (state.telemedicineSession?.id || state.attention?.telemedicineSessionId)
          "
          :session-id="state.telemedicineSession?.id || state.attention?.telemedicineSessionId"
          :current-user-id="state.currentUser?.id"
          user-type="doctor"
          :show-close="false"
          @message-sent="() => {}"
        />
        <!-- Fallback message if components are not rendering -->
        <div
          v-if="
            (state.showTelemedicineVideo || state.showTelemedicineChat) &&
            !state.telemedicineSession?.id &&
            !state.attention?.telemedicineSessionId
          "
          style="padding: 2rem; text-align: center; color: #666"
        >
          <i class="bi bi-exclamation-triangle me-2"></i>
          <p>Error: No se pudo obtener el ID de la sesión. Por favor, recarga la página.</p>
          <p style="font-size: 0.75rem; margin-top: 0.5rem">
            Session ID: {{ state.telemedicineSession?.id || 'N/A' }}<br />
            Attention Session ID: {{ state.attention?.telemedicineSessionId || 'N/A' }}
          </p>
        </div>
      </TelemedicineFloatingWindow>
    </div>
    <!-- Modal Products -->
    <div
      class="modal fade"
      :id="`attentionsProductsModal-${state.attention.id}`"
      data-bs-backdrop="static"
      data-bs-keyboard="false"
      tabindex="-10"
      aria-labelledby="staticBackdropLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header border-0 centered active-name">
            <h5 class="modal-title fw-bold">
              <i class="bi bi-eyedropper"></i>
              {{ $t('businessProductStockAdmin.attentionProducts') }}
            </h5>
            <button
              class="btn-close"
              type="button"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>
          <Spinner :show="loading"></Spinner>
          <div class="modal-body text-center mb-0">
            <ProductAttentionManagement
              :show-product-attention-management="true"
              :toggles="state.togglesStock"
              :attention="{ attentionId: state.attention.id, ...state.attention }"
              :commerce="state.commerce"
              :product-attentions-in="state.productConsumptions"
              :show-search-filters="false"
              @getProductConsuptions="getAttentionProducts"
            >
            </ProductAttentionManagement>
          </div>
          <div class="mx-2 mb-4 text-center">
            <a
              class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4 mt-4"
              data-bs-dismiss="modal"
              aria-label="Close"
              >{{ $t('notificationConditions.action') }} <i class="bi bi-check-lg"></i
            ></a>
          </div>
        </div>
      </div>
    </div>
    <!-- Modal Patient History -->
    <div
      class="modal fade"
      :id="`patientHistoryModal-${state.attention.clientId}`"
      data-bs-backdrop="static"
      data-bs-keyboard="false"
      tabindex="-1"
      aria-labelledby="staticBackdropLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-xl modal-fullscreen modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header border-0 centered active-name">
            <h5 class="modal-title fw-bold">
              <i class="bi bi-chat-left-dots-fill"></i> {{ $t('dashboard.patientHistoryOf') }}
              {{ state.user.name || state.user.idNumber || state.user.email }}
            </h5>
            <button
              class="btn-close"
              type="button"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>
          <Spinner :show="loading"></Spinner>
          <div class="modal-body text-center mb-0" id="patient-history-component">
            <PatientHistoryManagement
              v-if="state.client && state.client.id && state.commerce && state.commerce.id"
              :show-patient-history-management="true"
              :client="state.client"
              :commerce="state.commerce"
              :patient-history-in="state.patientHistory"
              :patient-forms="state.patientForms"
              :attention="state.attention.id"
              :patient-history-items="state.patientHistoryItems"
              @getPatientHistory="getPatientHistory"
            >
            </PatientHistoryManagement>
            <div v-else class="text-center py-5">
              <Spinner :show="true"></Spinner>
              <p class="mt-3">Cargando historial del paciente...</p>
            </div>
          </div>
          <div class="mx-2 mb-4 text-center">
            <a
              class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4 mt-4"
              data-bs-dismiss="modal"
              aria-label="Close"
              >{{ $t('notificationConditions.action') }} <i class="bi bi-check-lg"></i
            ></a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.comment-title {
  font-size: 0.9rem;
  line-height: 1rem;
}

/* Your Attention Section */
.your-attention {
  margin-top: 1rem;
  margin-bottom: 1rem;
  font-size: 0.95rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
  letter-spacing: 0.01em;
}

/* Attention Statistics Cards - Dashboard Style */
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

.stat-card-processing .stat-card-icon {
  background: rgba(0, 74, 173, 0.1);
  color: #004aad;
}

/* Duration Comparison Styles */
.duration-comparison {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-top: 0.25rem;
  font-size: 0.65rem;
}

.duration-label {
  font-weight: 500;
  color: rgba(0, 0, 0, 0.5);
}

.duration-value {
  font-weight: 700;
  font-size: 0.75rem;
}

.duration-progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.4rem;
}

.duration-progress-bar {
  flex: 1;
  height: 6px;
  background: rgba(0, 0, 0, 0.08);
  border-radius: 3px;
  overflow: hidden;
  position: relative;
}

.duration-progress-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease, background-color 0.3s ease;
  min-width: 2px;
}

.duration-percentage {
  font-size: 0.65rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.6);
  min-width: 35px;
  text-align: right;
}

/* Popper Styles */
.stat-card-icon-with-popper {
  position: relative;
  overflow: visible !important;
  z-index: 1;
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
  z-index: 10;
}

.popper-trigger-icon:hover {
  color: rgba(0, 0, 0, 0.7);
  background: rgba(255, 255, 255, 1);
  transform: scale(1.1);
}

/* Popper Styles with proper z-index - Higher than drawer */
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

/* Live Indicator Styles */
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

/* Desktop Layout Styles - Only affects the header row */
@media (min-width: 992px) {
  .desktop-header-row {
    align-items: center;
    margin-bottom: 1.5rem;
    padding: 0.5rem 0;
    justify-content: flex-start;
    text-align: left;
  }

  .desktop-header-row .desktop-logo-wrapper {
    padding-right: 1rem;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    text-align: left;
  }

  .desktop-header-row .desktop-commerce-logo {
    display: flex;
    align-items: center;
    max-width: 150px;
    text-align: left;
  }

  .desktop-header-row .desktop-commerce-logo .logo-desktop {
    max-width: 120px;
    max-height: 100px;
    width: auto;
    height: auto;
    margin-bottom: 0;
  }

  .desktop-header-row #commerce-logo-desktop {
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }

  .desktop-header-row .desktop-menu-wrapper {
    flex: 1 1 0%;
    min-width: 0;
    width: auto;
    text-align: left;
  }
}

/* Telemedicine Styles */
.attention-details-card {
  background: #fff;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.attention-card-content {
  display: flex;
  flex-direction: column;
}

.attention-details-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
}

.attention-details-data {
  font-size: 0.85rem;
  color: rgba(0, 0, 0, 0.7);
}

.attention-details-content {
  font-size: 0.85rem;
  color: rgba(0, 0, 0, 0.7);
}
</style>
