<script>
import { ref, watch, reactive, onBeforeMount, onBeforeUnmount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getAttentionDetails, cancelAttention } from '../application/services/attention';
import { getFormsByClient } from '../application/services/form';
import { getFormPersonalizedByCommerceId } from '../application/services/form-personalized';
import { getSurveyPersonalizedByCommerceId } from '../application/services/survey-personalized';
import { getCommerceById } from '../application/services/commerce';
import { getQueueById, getEstimatedWaitTime } from '../application/services/queue';
import { getUserById } from '../application/services/user';
import { getCollaboratorById } from '../application/services/collaborator';
import { getModuleById } from '../application/services/module';
import {
  updatedAvailableAttentionsByCommerceAndQueue,
  updatedQueues,
} from '../application/firebase';
import { getPermissions } from '../application/services/permissions';
import { useI18n } from 'vue-i18n';
import { getActiveFeature } from '../shared/features';
import { ATTENTION_STATUS } from '../shared/constants';
import Message from '../components/common/Message.vue';
import AttentionSurvey from '../components/domain/AttentionSurvey.vue';
import QueueName from '../components/common/QueueName.vue';
import AttentionNumber from '../components/common/AttentionNumber.vue';
import QR from '../components/common/QR.vue';
import CommerceLogo from '../components/common/CommerceLogo.vue';
import ClientNotifyData from '../components/domain/ClientNotifyData.vue';
import ClientEmailNotifyData from '../components/domain/ClientEmailNotifyData.vue';
import Spinner from '../components/common/Spinner.vue';
import Alert from '../components/common/Alert.vue';
import AreYouSure from '../components/common/AreYouSure.vue';
import Popper from 'vue3-popper';
import TelemedicineSessionStarter from '../components/telemedicine/domain/TelemedicineSessionStarter.vue';
import TelemedicineVideoCall from '../components/telemedicine/domain/TelemedicineVideoCall.vue';
import TelemedicineChat from '../components/telemedicine/domain/TelemedicineChat.vue';
import TelemedicineFloatingWindow from '../components/telemedicine/domain/TelemedicineFloatingWindow.vue';
import {
  getTelemedicineSession,
  sendTelemedicineAccessKey,
} from '../application/services/telemedicine';

export default {
  name: 'UserQueueAttention',
  components: {
    AreYouSure,
    QR,
    CommerceLogo,
    ClientNotifyData,
    ClientEmailNotifyData,
    QueueName,
    AttentionNumber,
    AttentionSurvey,
    Message,
    Spinner,
    Alert,
    Popper,
    TelemedicineSessionStarter,
    TelemedicineVideoCall,
    TelemedicineChat,
    TelemedicineFloatingWindow,
  },
  async setup() {
    const { t, locale } = useI18n();
    const route = useRoute();
    const router = useRouter();
    const { queueId, id } = route.params;

    const loading = ref(false);
    const alertError = ref('');

    const state = reactive({
      attention: {},
      queue: {},
      commerce: {},
      collaborator: {},
      module: {},
      user: {},
      survey: ref({}),
      beforeYou: ref(0),
      estimatedTime: ref('00:01'),
      usingIntelligentEstimation: ref(false),
      soundEnabled: false,
      soundPlayed: false,
      goToCancel: false,
      voiceConfig: {},
      formsPersonalized: [],
      showFormButton: false,
      formFirstAttentionCompleted: false,
      formPreAttentionCompleted: false,
      form: undefined,
      toggles: {},
      telemedicineSession: null,
      showTelemedicineVideo: false,
      showTelemedicineChat: false,
      telemedicineSessionType: null,
      clientConnected: false,
      connectionStatusInterval: null,
      showTelemedicineInstructions: false,
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        await getAttentionDetailsFromService(id);
        state.formsPersonalized = await getFormPersonalizedByCommerceId(state.commerce.id);
        await getFormCompleted();
        state.queue = state.attention.queue;
        state.commerce = state.attention.commerce;
        state.toggles = await getPermissions('user');

        // Load surveys for the commerce
        await loadSurveys();

        // Load telemedicine session if available
        if (state.attention?.telemedicineSessionId) {
          await loadTelemedicineSessionDetails();
        }

        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    });

    const attentions = ref([]);
    attentions.value = updatedAvailableAttentionsByCommerceAndQueue(queueId);

    // Watch queue reactively to get currentAttentionId and currentAttentionNumber updates
    const queues = updatedQueues(queueId);

    const getEstimatedTime = totalMinutes => {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const estimatedTime = `${hours.toString().padStart(2, '0')}:${minutes
        .toString()
        .padStart(2, '0')}`;
      return estimatedTime;
    };

    const getAttentionDetailsFromService = async id => {
      try {
        state.attention = await getAttentionDetails(id);
        state.commerce = state.attention.commerce;
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    };

    const getQueueAttentionValues = async (attention, oldAttention) => {
      if (attention && attention.id) {
        try {
          await getAttentionDetailsFromService(id);
          const attentionDetails = state.attention;
          if (attention.queueId) {
            state.queue = attentionDetails.queue;
            if (!attentionDetails.queue) {
              state.queue = await getQueueById(attention.queueId);
            }
            // Try to get intelligent estimation
            try {
              const intelligentEstimation = await getEstimatedWaitTime(
                attention.queueId,
                state.beforeYou,
                'p75'
              );

              if (intelligentEstimation && intelligentEstimation.estimatedTime) {
                state.estimatedTime = intelligentEstimation.estimatedTime;
                state.usingIntelligentEstimation =
                  intelligentEstimation.usingIntelligentEstimation || false;
              } else {
                // Fallback to hardcoded calculation
                const totalMinutes = state.beforeYou * state.queue.estimatedTime;
                state.estimatedTime =
                  totalMinutes > 0
                    ? getEstimatedTime(totalMinutes)
                    : getEstimatedTime(state.queue.estimatedTime);
                state.usingIntelligentEstimation = false;
              }
            } catch (error) {
              // Fallback to hardcoded calculation on error
              const totalMinutes = state.beforeYou * state.queue.estimatedTime;
              state.estimatedTime =
                totalMinutes > 0
                  ? getEstimatedTime(totalMinutes)
                  : getEstimatedTime(state.queue.estimatedTime);
              state.usingIntelligentEstimation = false;
            }
            state.commerce = attentionDetails.commerce;
            if (!attentionDetails.commerce) {
              state.commerce = await getCommerceById(state.queue.commerceId);
            }
            if (state.commerce.surveys && state.commerce.surveys.length > 0) {
              const surveyQueue = state.commerce.surveys.filter(
                sv => sv.queueId === state.queue.id
              );
              if (surveyQueue.length > 0) {
                state.survey = surveyQueue[0];
              } else {
                const surveys = state.commerce.surveys.filter(sv => sv.attentionDefault === true);
                if (surveys.length > 0) {
                  state.survey = surveys[0];
                }
              }
            }
          }
          if (attention.userId !== undefined) {
            state.user = attentionDetails.user;
            if (!attentionDetails.user) {
              state.user = await getUserById(attention.userId);
            }
          }
          if (
            attention.collaboratorId !== undefined &&
            attention.collaboratorId !== oldAttention.collaboratorId
          ) {
            state.collaborator = attentionDetails.collaborator;
            if (!attentionDetails.collaborator) {
              state.collaborator = await getCollaboratorById(attention.collaboratorId);
            }
          }
          if (attention.moduleId !== undefined && attention.moduleId !== oldAttention.moduleId) {
            state.module = attentionDetails.module;
            if (!attentionDetails.module) {
              state.module = await getModuleById(attention.moduleId);
            }
          }
        } catch (error) {
          loading.value = false;
        }
      } else {
        router.push({ path: '/not-found' });
      }
    };

    const attentionActive = () =>
      state.attention.status === ATTENTION_STATUS.PENDING ||
      state.attention.status === ATTENTION_STATUS.REACTIVATED;

    const itsYourTurn = () => {
      // Check if this attention is the current one being processed
      const isCurrentAttention =
        state.queue?.currentAttentionId === state.attention?.id ||
        state.queue?.currentAttentionNumber === state.attention?.number;

      return (
        (state.beforeYou === 0 && state.attention.status === ATTENTION_STATUS.PROCESSING) ||
        state.attention.status === ATTENTION_STATUS.REACTIVATED ||
        (isCurrentAttention && state.attention.status === ATTENTION_STATUS.PROCESSING)
      );
    };

    const youWereAttended = () =>
      state.attention.status === ATTENTION_STATUS.TERMINATED &&
      state.attention.surveyId === undefined;

    const youFullfilledSurvey = () =>
      (state.attention.status === ATTENTION_STATUS.TERMINATED ||
        state.attention.status === ATTENTION_STATUS.RATED) &&
      state.attention.surveyId !== undefined;

    const youWereReserveCancelled = () =>
      state.attention.status === ATTENTION_STATUS.TERMINATED_RESERVE_CANCELLED;

    const youWereSkipped = () =>
      state.attention.status === ATTENTION_STATUS.SKIPED ||
      state.attention.status === ATTENTION_STATUS.CANCELLED;

    const youWereAttentionCancelled = () =>
      state.attention.status === ATTENTION_STATUS.USER_CANCELLED;

    const getCreatedAt = (createdAt, timeZoneIn) => {
      const dateCorrected = new Date(
        new Date(createdAt).toLocaleString('en-US', {
          timeZone: timeZoneIn,
        })
      );
      return dateCorrected.toLocaleString('en-GB');
    };

    const notify = () => {};

    const getQRValue = () =>
      `${import.meta.env.VITE_URL}/interno/colaborador/atencion/${state.attention.id}/validar`;

    const createdUser = user => {
      state.user = user;
    };

    const backToCommerceQueues = () => {
      router.push({ path: `/interno/comercio/${state.commerce.keyName}` });
    };

    const itsYourTurnPlay = async () => {
      if (itsYourTurn() && state.soundEnabled && !state.soundPlayed) {
        const audio = document.getElementById('its-your-turn-audio');
        await audio.play();
        setTimeout(async () => {
          await speak(false, false);
        }, 1500);
        state.soundPlayed = true;
      }
    };

    const play = async () => {
      state.soundEnabled = !state.soundEnabled;
      const audio = document.getElementById('its-your-turn-audio');
      audio.muted = !state.soundEnabled;
    };

    const testSound = async () => {
      const audio = document.getElementById('its-your-turn-audio-test');
      await audio.play();
    };

    const speak = async (test, mute) => {
      if (getActiveFeature(state.commerce, 'attention-voice-command', 'PRODUCT')) {
        let userLocaleByDefault = 'es';
        userLocaleByDefault = locale.value;
        const voices = await window.speechSynthesis.getVoices();
        if (userLocaleByDefault === 'pt') {
          state.voiceConfig = {
            text: `E a sua Vez! Senha ${state.attention.number} ${
              test === true ? '.' : `, Módulo' ${state.module.name}.`
            }`,
            volume: 1.0,
            pitch: 1.0,
            rate: 1.0,
            lang: 'pt-BR',
            voice: await voices.find(voice => voice.name === 'Google português do Brasil'),
          };
        } else if (userLocaleByDefault === 'en') {
          state.voiceConfig = {
            text: `It's your Turn! Number ${state.attention.number} ${
              test === true ? '.' : `, Module' ${state.module.name}.`
            }`,
            volume: 1.0,
            pitch: 1.0,
            rate: 1.0,
            lang: 'en-US',
            voice: await voices.find(voice => voice.name === 'Google US English'),
          };
        } else {
          state.voiceConfig = {
            text: `¡Es tu Turno! Número ${state.attention.number} ${
              test === true ? '.' : `, Módulo' ${state.module.name}.`
            }`,
            volume: 1.0,
            pitch: 1.0,
            rate: 1.0,
            lang: 'es-MX',
            voice: await voices.find(voice => voice.name === 'Paulina'),
          };
        }
        const msg = new SpeechSynthesisUtterance();
        msg.text = state.voiceConfig.text;
        msg.volume = mute === true ? 0 : state.voiceConfig.volume;
        msg.pitch = state.voiceConfig.pitch;
        msg.rate = state.voiceConfig.rate;
        msg.lang = state.voiceConfig.lang;
        msg.voice = state.voiceConfig.voice;
        await window.speechSynthesis.speak(msg);
      }
    };

    const collaboratorName = () => {
      const name = state.collaborator.alias || state.collaborator.name;
      return name ? name.split(' ')[0] : t('userQueueAttention.collaborator');
    };

    const attentionCancelled = () => state.attention.status === 'RESERVE_CANCELLED';

    const goToCancel = () => {
      state.goToCancel = !state.goToCancel;
    };

    const cancelCancel = () => {
      state.goToCancel = false;
    };

    const cancellingAttention = async () => {
      try {
        loading.value = true;
        if (state.attention.status === ATTENTION_STATUS.PENDING) {
          await cancelAttention(state.attention.id);
          state.goToCancel = false;
          // Refresh attention details to show canceled status
          await getAttentionDetailsFromService(id);
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const getBeforeYou = attentions => {
      if (attentions && attentions.value && attentions.value.length > 0) {
        const attentionToProcess = attentions.value.filter(attention => attention.id === id)[0];
        const pendingAttentions = attentions.value.filter(
          attention => attention.status === ATTENTION_STATUS.PENDING
        );
        const beforeYou = pendingAttentions.filter(
          attention => attention.number < attentionToProcess.number
        );
        state.beforeYou = beforeYou.length;
      }
    };

    const getForm = (type, queueId, servicesId) => {
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
            return result;
          } else if (servicesId && servicesId.length > 0) {
            const result = state.formsPersonalized.filter(
              form => servicesId.includes(form.servicesId) && form.type === type
            );
            if (result.length === 0) {
              return state.formsPersonalized.filter(form => form.type === type)[0];
            }
            return result;
          } else {
            return state.formsPersonalized.filter(form => form.type === type)[0];
          }
        }
      }
      return undefined;
    };

    const getFormCompleted = async () => {
      if (state.attention && state.attention.id && state.attention.clientId) {
        const forms = await getFormsByClient(state.commerce.id, state.attention.clientId);
        const attentionFilteredForms = forms.filter(
          form => form.attentionId === state.attention.id,
        );
        if (forms && forms.length > 0) {
          if (getActiveFeature(state.commerce, 'attention-first-form', 'PRODUCT')) {
            const filteredForms = forms.filter(form => form.type === 'FIRST_ATTENTION');
            if (filteredForms && filteredForms.length > 0) {
              state.formFirstAttentionCompleted = true;
            }
          }
          if (getActiveFeature(state.commerce, 'attention-pre-form', 'PRODUCT')) {
            const filteredForms = attentionFilteredForms.filter(
              form => form.type === 'PRE_ATTENTION'
            );
            if (filteredForms && filteredForms.length > 0) {
              if (attentionFilteredForms && attentionFilteredForms.length > 0) {
                state.formPreAttentionCompleted = true;
              }
            }
          }
        }
        // Solo llena formulario la primera vez para FIRST_ATTENTION
        // Para PRE_ATTENTION se puede llenar cada vez si no está completado
        if (
          getActiveFeature(state.commerce, 'attention-first-form', 'PRODUCT') &&
          !getActiveFeature(state.commerce, 'attention-pre-form', 'PRODUCT')
        ) {
          if (!state.formFirstAttentionCompleted) {
            state.showFormButton = true;
            state.form = getForm(
              'FIRST_ATTENTION',
              state.attention.queueId,
              state.attention.servicesId
            );
          } else {
            state.showFormButton = false;
          }
        } else if (
          !getActiveFeature(state.commerce, 'attention-first-form', 'PRODUCT') &&
          getActiveFeature(state.commerce, 'attention-pre-form', 'PRODUCT')
        ) {
          // Solo PRE_ATTENTION: mostrar si no está completado
          if (!state.formPreAttentionCompleted) {
            state.showFormButton = true;
            state.form = getForm(
              'PRE_ATTENTION',
              state.attention.queueId,
              state.attention.servicesId,
            );
          } else {
            state.showFormButton = false;
          }
        } else if (
          getActiveFeature(state.commerce, 'attention-first-form', 'PRODUCT') &&
          getActiveFeature(state.commerce, 'attention-pre-form', 'PRODUCT')
        ) {
          // Ambos activos: priorizar FIRST_ATTENTION si no está completado, sino PRE_ATTENTION
          if (!state.formFirstAttentionCompleted) {
            state.showFormButton = true;
            state.form = getForm(
              'FIRST_ATTENTION',
              state.attention.queueId,
              state.attention.servicesId
            );
          } else if (!state.formPreAttentionCompleted) {
            state.showFormButton = true;
            state.form = getForm(
              'PRE_ATTENTION',
              state.attention.queueId,
              state.attention.servicesId,
            );
          } else {
            state.showFormButton = false;
          }
        } else {
          state.showFormButton = false;
        }
      }
    };

    const goToForm = async () => {
      if (state.form && state.form.id && state.attention && state.attention.clientId) {
        const url = `/interno/form/${state.form.id}/client/${state.attention.clientId}/attention/${state.attention.id}`;
        router.push({ path: url });
      }
    };

    const loadSurveys = async () => {
      if (!state.commerce || !state.commerce.id) return;

      try {
        // Try to get surveys from commerce first (if already loaded)
        if (state.commerce.surveys && state.commerce.surveys.length > 0) {
          const surveyQueue = state.commerce.surveys.filter(sv => sv.queueId === state.queue.id);
          if (surveyQueue.length > 0) {
            state.survey = surveyQueue[0];
            return;
          } else {
            const surveys = state.commerce.surveys.filter(sv => sv.attentionDefault === true);
            if (surveys.length > 0) {
              state.survey = surveys[0];
              return;
            }
          }
        }

        // If surveys not in commerce, load them separately
        const surveys = await getSurveyPersonalizedByCommerceId(state.commerce.id);
        if (surveys && surveys.length > 0) {
          // Filter by queueId first
          const surveyQueue = surveys.filter(sv => sv.queueId === state.queue.id);
          if (surveyQueue.length > 0) {
            state.survey = surveyQueue[0];
          } else {
            // Fallback to attentionDefault surveys
            const defaultSurveys = surveys.filter(sv => sv.attentionDefault === true);
            if (defaultSurveys.length > 0) {
              state.survey = defaultSurveys[0];
            }
          }
        }
      } catch (error) {
        console.error('Error loading surveys:', error);
      }
    };

    const loadTelemedicineSessionDetails = async () => {
      if (!state.attention?.telemedicineSessionId) return;
      try {
        state.telemedicineSession = await getTelemedicineSession(
          state.attention.telemedicineSessionId
        );
        // Start polling for connection status if session is active
        if (
          state.telemedicineSession?.status === 'active' ||
          state.telemedicineSession?.status === 'ACTIVE'
        ) {
          startConnectionStatusPolling();
        }
      } catch (err) {
        console.error('Error loading telemedicine session:', err);
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

    const toggleTelemedicineInstructions = () => {
      state.showTelemedicineInstructions = !state.showTelemedicineInstructions;
    };

    const handleTelemedicineSessionStarted = data => {
      // Abrir componente de video o chat según el tipo
      state.telemedicineSessionType = data.type;

      // Load session details to get recording status and connection info
      loadTelemedicineSessionDetails();

      if (
        data.type === 'video' ||
        data.type === 'both' ||
        data.type === 'VIDEO' ||
        data.type === 'BOTH'
      ) {
        state.showTelemedicineVideo = true;
      }
      if (
        data.type === 'chat' ||
        data.type === 'both' ||
        data.type === 'CHAT' ||
        data.type === 'BOTH'
      ) {
        state.showTelemedicineChat = true;
      }
    };

    const closeTelemedicineVideo = () => {
      state.showTelemedicineVideo = false;
      state.telemedicineSessionType = null;
      stopConnectionStatusPolling();
    };

    const closeTelemedicineChat = () => {
      state.showTelemedicineChat = false;
      state.telemedicineSessionType = null;
      stopConnectionStatusPolling();
    };

    // Check if telemedicine connection should be available
    const isTelemedicineConnectionAvailable = () => {
      if (!state.attention?.telemedicineConfig || !state.attention?.telemedicineSessionId) {
        return false;
      }

      // For booking-based attentions: 10 minutes before scheduledAt
      if (state.attention.telemedicineConfig?.scheduledAt) {
        const scheduledTime = new Date(state.attention.telemedicineConfig.scheduledAt);
        const activationTime = new Date(scheduledTime.getTime() - 10 * 60 * 1000); // 10 minutes before
        return new Date() >= activationTime;
      }

      // For walk-in attentions: less than 2 people in queue
      if (state.beforeYou !== undefined && state.beforeYou < 2) {
        return true;
      }

      return false;
    };

    const getTimeUntilTelemedicineActivation = () => {
      if (!state.attention?.telemedicineConfig?.scheduledAt) return null;
      const scheduledTime = new Date(state.attention.telemedicineConfig.scheduledAt);
      const activationTime = new Date(scheduledTime.getTime() - 10 * 60 * 1000); // 10 minutes before
      const now = new Date();
      const diff = activationTime.getTime() - now.getTime();
      if (diff <= 0) return null;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      if (days > 0) return `${days} día${days > 1 ? 's' : ''}`;
      if (hours > 0) return `${hours} hora${hours > 1 ? 's' : ''}`;
      return `${minutes} minuto${minutes > 1 ? 's' : ''}`;
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

    const getClientAccessLink = () => {
      if (!state.attention || !state.attention.telemedicineSessionId) return '';
      const baseUrl = window.location.origin;
      return `${baseUrl}/publico/telemedicina/${state.attention.telemedicineSessionId}`;
    };

    const copyClientAccessLink = () => {
      const link = getClientAccessLink();
      if (link) {
        navigator.clipboard
          .writeText(link)
          .then(() => {
            alert('Enlace copiado al portapapeles');
          })
          .catch(err => {
            console.error('Error copying link:', err);
          });
      }
    };

    const handleJoinTelemedicineSession = async () => {
      if (!state.attention?.telemedicineSessionId) return;

      try {
        // Send access key via WhatsApp/Email when user clicks join
        await sendTelemedicineAccessKey(state.attention.telemedicineSessionId);
        // Optionally show a success message
      } catch (error) {
        console.error('Error sending access key:', error);
        // Don't block navigation, just log the error
      }
    };

    const isTelemedicineSessionActive = () => {
      // Check if telemedicine session is active
      if (!state.telemedicineSession) return false;
      const status = state.telemedicineSession.status;
      return status === 'ACTIVE' || status === 'active' || status === 'ACTIVE';
    };

    watch(attentions, async () => {
      try {
        if (attentions.value && attentions.value && attentions.value.length >= 0) {
          const newAttention = attentions.value.filter(attention => attention.id === id)[0];
          getBeforeYou(attentions);
          await getQueueAttentionValues(newAttention, state.attention);
          await itsYourTurnPlay();

          // Reload telemedicine session if attention has telemedicine
          if (state.attention?.telemedicineSessionId) {
            await loadTelemedicineSessionDetails();
          }
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    });

    // Watch for telemedicine connection availability
    watch(
      () => [state.beforeYou, state.attention?.telemedicineConfig?.scheduledAt],
      async () => {
        // Check if connection should be available and reload session
        if (isTelemedicineConnectionAvailable() && state.attention?.telemedicineSessionId) {
          await loadTelemedicineSessionDetails();
        }
      },
      { deep: true }
    );

    // Watch queue changes to reactively update when currentAttentionId/currentAttentionNumber changes
    watch(queues, async () => {
      try {
        if (queues.value && queues.value.length > 0) {
          const updatedQueue = queues.value[0];
          if (updatedQueue && updatedQueue.id === queueId) {
            // Update queue state with latest data
            state.queue = { ...state.queue, ...updatedQueue };
            // Trigger itsYourTurn check when queue updates
            await itsYourTurnPlay();
          }
        }
      } catch (error) {
        console.error('Error watching queue updates:', error);
      }
    });

    return {
      id,
      state,
      loading,
      alertError,
      goToCancel,
      cancelCancel,
      cancellingAttention,
      attentionCancelled,
      notify,
      getQRValue,
      createdUser,
      itsYourTurn,
      youWereAttended,
      youFullfilledSurvey,
      youWereSkipped,
      youWereAttentionCancelled,
      backToCommerceQueues,
      getCreatedAt,
      play,
      attentionActive,
      testSound,
      collaboratorName,
      youWereReserveCancelled,
      speak,
      goToForm,
      getActiveFeature,
      ATTENTION_STATUS,
      loadTelemedicineSessionDetails,
      toggleTelemedicineInstructions,
      handleTelemedicineSessionStarted,
      closeTelemedicineVideo,
      closeTelemedicineChat,
      isTelemedicineConnectionAvailable,
      getTimeUntilTelemedicineActivation,
      formatTelemedicineDate,
      getTelemedicineStatusText,
      getTelemedicineStatusClass,
      getClientAccessLink,
      copyClientAccessLink,
      stopConnectionStatusPolling,
      handleJoinTelemedicineSession,
      isTelemedicineSessionActive,
    };

    // Clean up on unmount
    onBeforeUnmount(() => {
      stopConnectionStatusPolling();
    });
  },
};
</script>
<template>
  <div>
    <audio id="its-your-turn-audio" muted hidden>
      <source type="audio/mp3" src="../assets/sounds/es_tu_turno.mp3" />
    </audio>
    <audio id="its-your-turn-audio-test" hidden>
      <source type="audio/mp3" src="../assets/sounds/es_tu_turno.mp3" />
    </audio>
    <div class="content text-center">
      <div class="row justify-content-center">
        <div class="col-12 col-lg-8">
          <CommerceLogo
            :src="state.commerce?.logo"
            :business-id="state.commerce?.businessId"
            :loading="loading"
            :large-size="true"
          ></CommerceLogo>
          <QueueName :queue="state.queue"></QueueName>
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
          <div v-if="!loading">
            <div id="page-header" class="text-center mt-4">
              <div v-if="itsYourTurn()">
                <div class="its-your-turn parpadea">
                  <span>{{ $t('userQueueAttention.itsYourTurn') }}</span>
                </div>
              </div>
              <div v-else-if="youWereAttended() || youFullfilledSurvey()">
                <div class="welcome">
                  <span>{{ $t('userQueueAttention.youWereAttended') }}</span>
                </div>
                <div class="your-attention">
                  <span>{{ $t('userQueueAttention.thanks') }}</span>
                </div>
              </div>
              <div v-else>
                <div class="welcome">
                  <span>{{ $t('userQueueAttention.hello') }}</span>
                </div>
              </div>
            </div>
            <div id="survey" v-if="youWereAttended()">
              <AttentionSurvey
                :survey-personalized="state.survey"
                :attention-id="state.attention.id"
                :attention-type="state.attention.type"
                :attention="state.attention"
                :commerce="state.commerce"
              >
              </AttentionSurvey>
            </div>
            <div id="survey-fullfilled" v-else-if="youFullfilledSurvey()">
              <div class="mt-3">
                <Message
                  :title="$t('attentionSurvey.message.1.title')"
                  :content="$t('attentionSurvey.message.1.content')"
                  :icon="'bi bi-emoji-sunglasses'"
                >
                </Message>
                <a
                  class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
                  v-if="state.commerce.url !== undefined"
                  @click="backToCommerceQueues()"
                >
                  {{ $t('userQueueAttention.actions.5.action') }} <i class="bi bi-arrow-left"></i>
                </a>
                <a
                  class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
                  :href="state.commerce.url"
                  target="_blank"
                >
                  {{ $t('userQueueAttention.actions.4.action') }}
                  <i class="bi bi-hand-index-thumb-fill"></i>
                </a>
              </div>
            </div>
            <div v-else-if="youWereSkipped()">
              <div class="your-attention">
                <span>{{ $t('userQueueAttention.yourNumber') }}</span>
              </div>
              <AttentionNumber
                :number="state.attention.number"
                :type="'secondary'"
                :data="state.user"
              >
              </AttentionNumber>
              <Message
                :title="$t('userQueueAttention.message.1.title')"
                :content="$t('userQueueAttention.message.1.content')"
                :icon="'bi bi-emoji-dizzy'"
              >
              </Message>
              <div class="mt-3">
                <a
                  class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
                  @click="backToCommerceQueues()"
                >
                  {{ $t('userQueueAttention.actions.5.action') }} <i class="bi bi-arrow-left"></i>
                </a>
              </div>
            </div>
            <div v-else-if="youWereAttentionCancelled() || youWereReserveCancelled()">
              <div class="your-attention">
                <span>{{ $t('userQueueAttention.yourNumber') }}</span>
              </div>
              <AttentionNumber
                :number="state.attention.number"
                :type="'secondary'"
                :data="state.user"
              >
              </AttentionNumber>
              <Message
                :title="$t('userQueueAttention.message.3.title')"
                :content="$t('userQueueAttention.message.3.content')"
                :icon="'bi bi-emoji-dizzy'"
              >
              </Message>
              <div class="mt-3">
                <a
                  class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
                  @click="backToCommerceQueues()"
                >
                  {{ $t('userQueueAttention.actions.5.action') }} <i class="bi bi-arrow-left"></i>
                </a>
              </div>
            </div>
            <div id="attention" v-else>
              <div class="your-attention mt-4 mb-3">
                <span>{{ $t('userQueueAttention.yourNumber') }}</span>
              </div>
              <AttentionNumber
                :number="state.attention.number"
                :data="state.user"
                :attention="state.attention"
              ></AttentionNumber>
              <div v-if="itsYourTurn()" id="attention-data" class="to-goal">
                <div class="row g-2 attention-details-container">
                  <div class="col-6 attention-details-card">
                    <div class="attention-card-content">
                      <span class="attention-details-title">
                        {{ $t('userQueueAttention.getClose') }}
                      </span>
                      <span class="attention-details-content">
                        <i class="bi bi-arrow-down-right-circle"></i>
                        {{ state.module.name || $t('userQueueAttention.module') }}
                      </span>
                    </div>
                  </div>
                  <div class="col-6 attention-details-card">
                    <div class="attention-card-content">
                      <span class="attention-details-title">
                        {{ $t('userQueueAttention.attendedBy') }}
                      </span>
                      <span class="attention-details-content">
                        <i class="bi bi-person-circle"></i> {{ collaboratorName() }}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div v-if="itsYourTurn()">
                <Message
                  :title="$t('userQueueAttention.message.2.title')"
                  :content="$t('userQueueAttention.message.2.content')"
                  :icon="'bi bi-star'"
                >
                  ></Message
                >
              </div>
              <div v-else id="attention-data" class="to-goal">
                <div class="row g-2 attention-details-container">
                  <div
                    v-if="
                      (state.attention.number === 1 &&
                        state.attention.status === ATTENTION_STATUS.PENDING) ||
                      state.beforeYou === 0
                    "
                    class="col-12 attention-details-card"
                  >
                    <div class="attention-card-content">
                      <div
                        v-if="state.attention.block && state.attention.block.hourFrom"
                        class="attention-block-info"
                      >
                        <span class="attention-details-title">
                          🚨 {{ $t('userQueueAttention.blockInfo') }}
                        </span>
                        <span class="attention-details-content parpadea">
                          {{ state.attention.block.hourFrom }} - {{ state.attention.block.hourTo }}
                        </span>
                      </div>
                      <div v-else class="attention-block-info">
                        <span class="attention-details-content"> 🚨 </span>
                        <span class="attention-details-title">
                          {{ $t('userQueueAttention.willBeAttendedShortly') }}
                        </span>
                      </div>
                    </div>
                  </div>
                  <template v-else>
                    <div class="col-6 attention-details-card">
                      <div class="attention-card-content">
                        <span class="attention-details-title">
                          {{ $t('userQueueAttention.toGoal.1') }}
                        </span>
                        <span class="attention-details-content">
                          <i class="bi bi-person"></i> {{ state.beforeYou }}
                        </span>
                      </div>
                    </div>
                    <div
                      v-if="state.attention.block && state.attention.block.hourFrom"
                      class="col-6 attention-details-card"
                    >
                      <div class="attention-card-content">
                        <span class="attention-details-title">
                          {{ $t('userQueueAttention.blockInfo') }}
                        </span>
                        <span class="attention-details-content parpadea">
                          {{ state.attention.block.hourFrom }} - {{ state.attention.block.hourTo }}
                        </span>
                      </div>
                    </div>
                    <div v-else-if="state.beforeYou" class="col-6 attention-details-card">
                      <div class="attention-card-content">
                        <span class="attention-details-title">
                          {{ $t('userQueueAttention.estimatedTime') }}*
                          <Popper
                            v-if="state.usingIntelligentEstimation"
                            :class="'dark'"
                            arrow
                            disable-click-away
                            :content="$t('userQueueAttention.intelligentEstimationTooltip')"
                          >
                            <span class="ai-badge ms-1">
                              <i class="bi bi-stars"></i>
                            </span>
                          </Popper>
                        </span>
                        <span class="attention-details-content">
                          <i class="bi bi-stopwatch"></i> {{ state.estimatedTime }}
                        </span>
                      </div>
                    </div>
                  </template>
                </div>
              </div>
              <div id="sound-control" class="to-goal" v-if="attentionActive()">
                <div class="attention-details-sound mt-2">
                  <div class="row centered attention-sound">
                    <div class="col-8">
                      <i class="bi bi-bell"> </i>
                      <span class="fw-bold" v-if="!state.soundEnabled">
                        {{ $t('userQueueAttention.actions.6.title.1') }}
                      </span>
                      <span class="fw-bold" v-else>
                        {{ $t('userQueueAttention.actions.6.title.2') }}
                      </span>
                      <span>{{ $t('userQueueAttention.actions.6.title.3') }}</span>
                    </div>
                    <div class="col-4">
                      <div class="d-flex justify-content-center mb-1">
                        <button
                          class="btn btn-md fw-bold btn-dark rounded-pill"
                          @click="
                            play();
                            speak(false, true);
                          "
                        >
                          <i
                            :class="`bi ${
                              state.soundEnabled ? 'bi-bell-fill' : 'bi-bell-slash-fill'
                            } `"
                          ></i>
                        </button>
                      </div>
                      <span
                        class="test-sound justify-content-end"
                        @click="
                          testSound();
                          speak(true, false);
                        "
                        >{{ $t('userQueueAttention.actions.6.title.4') }}</span
                      >
                    </div>
                  </div>
                </div>
              </div>
              <div
                id="form-process"
                class="to-goal"
                v-if="
                  state.showFormButton &&
                  state.form &&
                  (getActiveFeature(state.commerce, 'attention-first-form', 'PRODUCT') ||
                    getActiveFeature(state.commerce, 'attention-pre-form', 'PRODUCT'))
                "
              >
                <div class="booking-notification-title">
                  <span>{{ $t('userQueueBooking.fillPreAttention') }}</span>
                </div>
                <button
                  type="button"
                  class="btn-size btn btn-lg btn-block col-9 fw-bold btn-primary rounded-pill mt-2 mb-1"
                  v-if="state.showFormButton"
                  @click="goToForm()"
                >
                  {{ $t('userQueueBooking.preAttention') }} <i class="bi bi-pencil-fill"></i>
                </button>
              </div>
              <div id="whatsapp-notification-control" class="to-goal" v-if="attentionActive()">
                <div class="attention-details-sound mt-2">
                  <div class="attention-notification-title">
                    <i class="bi bi-whatsapp"></i>
                    <span class="fw-bold"> {{ $t('clientNotifyData.phoneTitle1') }} </span>
                    <span> {{ $t('clientNotifyData.phoneTitle2') }} </span>
                  </div>
                  <a
                    v-if="state.queue.active"
                    class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
                    data-bs-toggle="collapse"
                    href="#client-whatsapp-data"
                    :disabled="!state.toggles['user.notification.add']"
                    @click="notify()"
                  >
                    <i class="bi bi-phone-vibrate-fill"></i>
                    {{ $t('userQueueAttention.actions.1.action') }}
                    <i class="bi bi-chevron-down"></i>
                  </a>
                  <div
                    :class="`collapse ${state.user.notificationOn ? 'show' : ''}`"
                    id="client-whatsapp-data"
                  >
                    <ClientNotifyData
                      :attention-id="state.attention.id"
                      :user-id="state.user.id"
                      :commerce-id="state.commerce.id"
                      :queue-id="state.queue.id"
                      :user-in="state.user"
                      :notification-on="state.user.notificationOn || false"
                      :commerce="state.commerce"
                      @createdUser="createdUser($event)"
                    />
                  </div>
                </div>
              </div>
              <div id="email-notification-control" class="to-goal" v-if="attentionActive()">
                <div class="attention-details-sound mt-2">
                  <div class="attention-notification-title">
                    <i class="bi bi-envelope"></i>
                    <span class="fw-bold"> {{ $t('clientNotifyData.emailTitle1') }} </span>
                    <span> {{ $t('clientNotifyData.emailTitle2') }} </span>
                  </div>
                  <a
                    v-if="state.queue.active"
                    class="btn btn-lg btn-block btn-size fw-bold btn-dark rounded-pill mb-2"
                    data-bs-toggle="collapse"
                    href="#client-email-data"
                    :disabled="!state.toggles['user.notification.add']"
                    @click="notify()"
                  >
                    <i class="bi bi-envelope-fill"></i>
                    {{ $t('userQueueAttention.actions.7.action') }}
                    <i class="bi bi-chevron-down"></i>
                  </a>
                  <div
                    :class="`collapse ${state.user.notificationEmailOn ? 'show' : ''}`"
                    id="client-email-data"
                  >
                    <ClientEmailNotifyData
                      :attention-id="state.attention.id"
                      :user-id="state.user.id"
                      :commerce-id="state.commerce.id"
                      :queue-id="state.queue.id"
                      :user-in="state.user"
                      :notification-on="state.user.notificationEmailOn || false"
                      :commerce="state.commerce"
                      @createdUser="createdUser($event)"
                    />
                  </div>
                </div>
              </div>

              <!-- Telemedicine Information -->
              <div
                v-if="state.attention.type === 'TELEMEDICINE' || state.attention.telemedicineConfig"
                class="to-goal mt-3"
              >
                <div class="attention-details-card">
                  <div class="attention-card-content">
                    <div class="mb-2">
                      <div class="attention-notification-title">
                        <i class="bi bi-camera-video"></i>
                        <span class="fw-bold">{{ $t('userQueueBooking.telemedicine.title') }}</span>
                      </div>
                    </div>
                    <div class="mb-2 d-flex flex-wrap gap-1 justify-content-center">
                      <span
                        v-if="state.attention.telemedicineConfig"
                        class="badge bg-primary"
                        style="font-size: 0.65rem; padding: 0.25rem 0.5rem"
                      >
                        <span
                          v-if="
                            state.attention.telemedicineConfig.type === 'VIDEO' ||
                            state.attention.telemedicineConfig.type === 'video'
                          "
                        >
                          {{ $t('userQueueBooking.telemedicine.typeVideo') }}
                        </span>
                        <span
                          v-else-if="
                            state.attention.telemedicineConfig.type === 'CHAT' ||
                            state.attention.telemedicineConfig.type === 'chat'
                          "
                        >
                          {{ $t('userQueueBooking.telemedicine.typeChat') }}
                        </span>
                        <span
                          v-else-if="
                            state.attention.telemedicineConfig.type === 'BOTH' ||
                            state.attention.telemedicineConfig.type === 'both'
                          "
                        >
                          {{ $t('userQueueBooking.telemedicine.typeBoth') }}
                        </span>
                      </span>
                      <span
                        v-if="
                          state.attention.telemedicineConfig &&
                          state.attention.telemedicineConfig.recordingEnabled
                        "
                        class="badge bg-danger"
                        style="font-size: 0.65rem; padding: 0.25rem 0.5rem"
                      >
                        <i class="bi bi-record-circle me-1"></i>
                        {{ $t('userQueueBooking.telemedicine.recording') }}
                      </span>
                      <span
                        v-if="state.telemedicineSession"
                        :class="`badge ${getTelemedicineStatusClass(
                          state.telemedicineSession.status
                        )}`"
                        style="font-size: 0.65rem; padding: 0.25rem 0.5rem"
                      >
                        {{ getTelemedicineStatusText(state.telemedicineSession.status) }}
                      </span>
                      <span
                        v-else-if="state.attention.telemedicineConfig"
                        class="badge bg-info"
                        style="font-size: 0.65rem; padding: 0.25rem 0.5rem"
                      >
                        {{ $t('userQueueBooking.telemedicine.statusScheduled') }}
                      </span>
                    </div>
                    <div v-if="state.attention.telemedicineConfig?.notes" class="mb-2">
                      <span class="attention-details-title" style="font-size: 0.75rem">
                        <i class="bi bi-sticky me-1"></i>
                        {{ state.attention.telemedicineConfig.notes }}
                      </span>
                    </div>

                    <!-- Connection Available -->
                    <div
                      v-if="
                        isTelemedicineConnectionAvailable() && state.attention.telemedicineSessionId
                      "
                      class="mt-2"
                    >
                      <div
                        class="attention-details-content"
                        style="font-size: 0.9rem; color: var(--verde-tu)"
                      >
                        <i class="bi bi-check-circle me-1"></i>
                        {{ $t('userQueueBooking.telemedicine.connectionAvailable') }}
                      </div>
                      <a
                        :href="getClientAccessLink()"
                        target="_blank"
                        class="btn btn-md btn-block btn-size fw-bold btn-success rounded-pill mt-2"
                        style="font-size: 0.9rem"
                        @click="handleJoinTelemedicineSession"
                      >
                        <i class="bi bi-camera-video me-2"></i>
                        {{ $t('userQueueBooking.telemedicine.joinSession') }}
                      </a>
                    </div>

                    <!-- Waiting for Activation -->
                    <div
                      v-else-if="
                        state.attention.telemedicineConfig?.scheduledAt &&
                        !isTelemedicineConnectionAvailable()
                      "
                      class="mt-2"
                    >
                      <span
                        class="attention-details-content"
                        style="font-size: 0.9rem; color: var(--azul-turno)"
                      >
                        <i class="bi bi-clock me-1"></i>
                        {{ $t('userQueueBooking.telemedicine.connectionWillBeAvailable') }}
                        <span v-if="getTimeUntilTelemedicineActivation()">
                          {{ $t('userQueueBooking.telemedicine.in') }}
                          {{ getTimeUntilTelemedicineActivation() }}
                        </span>
                      </span>
                    </div>

                    <!-- Walk-in: Waiting for queue position -->
                    <div
                      v-else-if="
                        !state.attention.telemedicineConfig?.scheduledAt && state.beforeYou >= 2
                      "
                      class="mt-2"
                    >
                      <span
                        class="attention-details-content"
                        style="font-size: 0.9rem; color: var(--azul-turno)"
                      >
                        <i class="bi bi-people me-1"></i>
                        {{ $t('userQueueBooking.telemedicine.waitingForQueue') }}
                        {{ $t('userQueueBooking.telemedicine.connectionWhenLessThan2') }}
                      </span>
                    </div>

                    <!-- Instructions Toggle -->
                    <div class="mt-2">
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-primary w-100"
                        @click="toggleTelemedicineInstructions"
                      >
                        <i
                          :class="
                            state.showTelemedicineInstructions
                              ? 'bi bi-chevron-up'
                              : 'bi bi-chevron-down'
                          "
                        ></i>
                        {{ $t('userQueueBooking.telemedicine.instructions.title') }}
                      </button>
                    </div>
                    <div
                      v-show="state.showTelemedicineInstructions"
                      class="telemedicine-instructions mt-3 pt-3 border-top"
                    >
                      <div class="mb-3">
                        <div class="mb-2" style="font-size: 0.85rem; font-weight: 600">
                          <i class="bi bi-1-circle me-2"></i>
                          {{ $t('userQueueBooking.telemedicine.instructions.preparation.title') }}
                        </div>
                        <ul
                          class="mb-0 ps-0"
                          style="font-size: 0.75rem; line-height: 1.5; list-style: none"
                        >
                          <li>
                            {{
                              $t('userQueueBooking.telemedicine.instructions.preparation.internet')
                            }}
                          </li>
                          <li>
                            {{
                              $t('userQueueBooking.telemedicine.instructions.preparation.camera')
                            }}
                          </li>
                          <li>
                            {{
                              $t('userQueueBooking.telemedicine.instructions.preparation.location')
                            }}
                          </li>
                          <li
                            v-if="
                              state.attention.telemedicineConfig &&
                              (state.attention.telemedicineConfig.type === 'VIDEO' ||
                                state.attention.telemedicineConfig.type === 'video' ||
                                state.attention.telemedicineConfig.type === 'BOTH' ||
                                state.attention.telemedicineConfig.type === 'both')
                            "
                          >
                            {{
                              $t('userQueueBooking.telemedicine.instructions.preparation.device')
                            }}
                          </li>
                        </ul>
                      </div>
                      <div class="mb-3">
                        <div class="mb-2" style="font-size: 0.85rem; font-weight: 600">
                          <i class="bi bi-2-circle me-2"></i>
                          {{ $t('userQueueBooking.telemedicine.instructions.access.title') }}
                        </div>
                        <ul
                          class="mb-0 ps-0"
                          style="font-size: 0.75rem; line-height: 1.5; list-style: none"
                        >
                          <li>
                            {{ $t('userQueueBooking.telemedicine.instructions.access.link') }}
                          </li>
                          <li>
                            {{ $t('userQueueBooking.telemedicine.instructions.access.activation') }}
                          </li>
                          <li>
                            {{ $t('userQueueBooking.telemedicine.instructions.access.code') }}
                          </li>
                          <li>
                            {{ $t('userQueueBooking.telemedicine.instructions.access.doctor') }}
                          </li>
                        </ul>
                      </div>
                      <div class="mb-3">
                        <div class="mb-2" style="font-size: 0.85rem; font-weight: 600">
                          <i class="bi bi-3-circle me-2"></i>
                          {{ $t('userQueueBooking.telemedicine.instructions.during.title') }}
                        </div>
                        <ul
                          class="mb-0 ps-0"
                          style="font-size: 0.75rem; line-height: 1.5; list-style: none"
                        >
                          <li
                            v-if="
                              state.attention.telemedicineConfig &&
                              (state.attention.telemedicineConfig.type === 'VIDEO' ||
                                state.attention.telemedicineConfig.type === 'video' ||
                                state.attention.telemedicineConfig.type === 'BOTH' ||
                                state.attention.telemedicineConfig.type === 'both')
                            "
                          >
                            {{ $t('userQueueBooking.telemedicine.instructions.during.camera') }}
                          </li>
                          <li
                            v-if="
                              state.attention.telemedicineConfig &&
                              (state.attention.telemedicineConfig.type === 'CHAT' ||
                                state.attention.telemedicineConfig.type === 'chat' ||
                                state.attention.telemedicineConfig.type === 'BOTH' ||
                                state.attention.telemedicineConfig.type === 'both')
                            "
                          >
                            {{ $t('userQueueBooking.telemedicine.instructions.during.chat') }}
                          </li>
                          <li>
                            {{ $t('userQueueBooking.telemedicine.instructions.during.documents') }}
                          </li>
                          <li
                            v-if="
                              state.attention.telemedicineConfig &&
                              state.attention.telemedicineConfig.recordingEnabled
                            "
                          >
                            <i class="bi bi-record-circle text-danger me-1"></i>
                            {{ $t('userQueueBooking.telemedicine.instructions.during.recording') }}
                          </li>
                        </ul>
                      </div>
                      <div
                        class="alert alert-warning mb-0 mt-2"
                        style="font-size: 0.75rem; padding: 0.4rem; line-height: 1.4"
                      >
                        <i class="bi bi-exclamation-triangle me-2"></i>
                        {{ $t('userQueueBooking.telemedicine.instructions.important') }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Telemedicine Video/Chat Components -->
              <div
                v-if="state.showTelemedicineVideo || state.showTelemedicineChat"
                class="telemedicine-components-container"
              >
                <TelemedicineFloatingWindow
                  v-if="state.showTelemedicineVideo"
                  :show="state.showTelemedicineVideo"
                  title="Consulta por Video"
                  icon-class="bi-camera-video"
                  :is-connected="state.clientConnected"
                  @close="closeTelemedicineVideo"
                >
                  <TelemedicineVideoCall
                    :session-id="state.attention.telemedicineSessionId"
                    :current-user-id="state.user?.id || state.attention.userId"
                    user-type="patient"
                    :show-close="false"
                    @call-ended="closeTelemedicineVideo"
                  />
                </TelemedicineFloatingWindow>
                <TelemedicineFloatingWindow
                  v-if="state.showTelemedicineChat"
                  :show="state.showTelemedicineChat"
                  title="Consulta por Chat"
                  icon-class="bi-chat-dots"
                  :is-connected="state.clientConnected"
                  @close="closeTelemedicineChat"
                >
                  <TelemedicineChat
                    :session-id="state.attention.telemedicineSessionId"
                    :current-user-id="state.user?.id || state.attention.userId"
                    user-type="patient"
                    :show-close="false"
                    @message-sent="() => {}"
                  />
                </TelemedicineFloatingWindow>
              </div>

              <div
                id="cancel-process"
                class="m-3"
                v-if="!itsYourTurn() && !isTelemedicineSessionActive()"
              >
                <button
                  type="button"
                  class="btn-size btn btn-lg btn-block col-9 fw-bold btn-danger rounded-pill mb-1"
                  @click="goToCancel()"
                  :disabled="attentionCancelled() || !state.toggles['user.attentions.cancel']"
                >
                  {{ $t('userQueueAttention.cancel') }} <i class="bi bi-x-circle-fill"></i>
                </button>
                <AreYouSure
                  :show="state.goToCancel"
                  :yes-disabled="!attentionCancelled()"
                  :no-disabled="!attentionCancelled()"
                  @actionYes="cancellingAttention()"
                  @actionNo="cancelCancel()"
                >
                </AreYouSure>
              </div>
              <div id="QR-control">
                <div class="your-attention">
                  <span v-if="state.beforeYou === 0">
                    {{ $t('userQueueAttention.itsYourAttention') }}</span
                  >
                  <span v-else>{{ $t('userQueueAttention.yourAttention') }}</span>
                </div>
                <QR :value="getQRValue()" @click="getQRValue()"></QR>
              </div>
              <Message
                :title="$t('userQueueAttention.actions.2.action')"
                :content="$t('userQueueAttention.actions.2.title.1')"
                :icon="'bi bi-camera-fill'"
              >
              </Message>
              <div class="row attention-details-container">
                <div class="attention-details-date attention-details-data">
                  <span
                    ><strong>{{
                      getCreatedAt(
                        state.attention.createdAt,
                        state.commerce.localeInfo
                          ? state.commerce.localeInfo.timezone
                          : 'America/Santiago'
                      )
                    }}</strong></span
                  ><br />
                  <span><strong>Id:</strong> {{ state.attention.id }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div></div>
    </div>
  </div>
</template>

<style scoped>
.attention-details-card {
  background-color: var(--color-background);
  padding: 0.75rem 0.5rem;
  margin-bottom: 0.2rem;
  border-radius: 1rem;
  border: 0.5px solid var(--gris-default);
  min-height: 5rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.attention-card-content {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 0.25rem;
  width: 100%;
}

.attention-block-info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 0.25rem;
  width: 100%;
}

.attention-shortly-details-card {
  background-color: var(--color-background);
  padding: 0.5rem;
  margin-left: 0.4rem;
  margin-right: 0.4rem;
  margin-bottom: 0.2rem;
  border-radius: 1rem;
  border: 0.5px solid var(--gris-default);
  height: 4.6rem;
}

.attention-details-date {
  background-color: var(--color-background);
  padding: 0.2rem;
  margin: 0.2rem;
  border-radius: 1rem;
  border: 0.5px solid var(--gris-default);
}

.attention-details-sound {
  background-color: var(--color-background);
  padding: 0.5rem;
  margin: 0.3rem;
  border-radius: 1rem;
  border: 0.5px solid var(--gris-default);
  margin-bottom: 0.5rem;
}

.attention-details-container {
  margin-top: 0.5rem;
  margin-bottom: 0rem;
  margin-left: 0;
  margin-right: 0;
}

.attention-details-title {
  font-size: 0.75rem;
  line-height: 1rem !important;
  margin-bottom: 0;
  display: block;
  text-align: center;
  width: 100%;
}

.ai-badge {
  display: inline-block;
  color: #ffc107;
  font-size: 0.9rem;
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

.attention-details-content {
  font-size: 1.5rem;
  line-height: 1.4rem;
  font-weight: 700;
  display: block;
  text-align: center;
  width: 100%;
}

.attention-details-card strong {
  font-size: 1.5rem;
  line-height: 1.4rem;
  font-weight: 700;
}

.attention-details-message {
  line-height: 1rem;
  padding-top: 1rem;
  font-weight: 700;
  margin-block-start: 0.2rem;
}

.attention-details-data {
  font-size: 0.9rem;
}

.attention-sound {
  font-size: 0.8rem;
  line-height: 1.1rem;
}

.attention-notification-title {
  font-size: 0.9rem;
  line-height: 1.2rem;
  padding: 0.2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.25rem;
}

.attention-notification-title i {
  font-size: 1.2rem;
  margin-bottom: 0.1rem;
}

.attention-notification-title span {
  display: block;
  width: 100%;
}

.attention-notification-title.mb-2 {
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1.4rem;
}
.parpadea {
  animation-name: parpadeo;
  animation-duration: 1s;
  animation-timing-function: linear;
  animation-iteration-count: infinite;

  -webkit-animation-name: parpadeo;
  -webkit-animation-duration: 1s;
  -webkit-animation-timing-function: linear;
  -webkit-animation-iteration-count: infinite;
}
.to-goal {
  padding-bottom: 0rem !important;
  font-size: 1rem;
  font-weight: 400;
}
.test-sound {
  font-size: 0.6rem;
  line-height: 0.8rem;
  font-weight: 800;
  text-decoration: underline;
  cursor: pointer;
}
.booking-notification-title {
  font-size: 0.9rem;
  line-height: 1.2rem;
  padding: 0.2rem;
}

.booking-notification-title.mb-2 {
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1.4rem;
}
@-moz-keyframes parpadeo {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

@-webkit-keyframes parpadeo {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}

@keyframes parpadeo {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}
</style>
