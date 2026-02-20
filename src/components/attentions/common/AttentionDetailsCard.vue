<script>
import Popper from 'vue3-popper';
import jsonToCsv from '../../../shared/utils/jsonToCsv';
import Spinner from '../../common/Spinner.vue';
import {
  attend,
  cancelAttention,
  attentionPaymentConfirm,
  transferAttention,
  getPendingCommerceAttentions,
  advanceStage,
} from '../../../application/services/attention';
import { getActiveFeature } from '../../../shared/features';
import { getPaymentMethods, getPaymentTypes } from '../../../shared/utils/data.ts';
import { getDate } from '../../../shared/utils/date';
import { getQueueById } from '../../../application/services/queue';
import { ATTENTION_STATUS } from '../../../shared/constants';
import Warning from '../../common/Warning.vue';
import AreYouSure from '../../common/AreYouSure.vue';
import PaymentForm from '../../payments/PaymentForm.vue';
import Message from '../../common/Message.vue';
import TelemedicineSessionStarter from '../../telemedicine/domain/TelemedicineSessionStarter.vue';
import TelemedicineVideoCall from '../../telemedicine/domain/TelemedicineVideoCall.vue';
import TelemedicineChat from '../../telemedicine/domain/TelemedicineChat.vue';
import TelemedicineFloatingWindow from '../../telemedicine/domain/TelemedicineFloatingWindow.vue';
import {
  getTelemedicineSession,
  getTelemedicineSessionById,
} from '../../../application/services/telemedicine';
import { getConsentStatus } from '../../../application/services/consent';
import { globalStore } from '../../../stores';
import LgpdConsentManager from '../../lgpd/LgpdConsentManager.vue';

export default {
  name: 'AttentionDetailsCard',
  components: {
    Popper,
    Spinner,
    Warning,
    AreYouSure,
    PaymentForm,
    Message,
    TelemedicineSessionStarter,
    TelemedicineVideoCall,
    TelemedicineChat,
    TelemedicineFloatingWindow,
    LgpdConsentManager,
  },
  props: {
    show: { type: Boolean, default: true },
    attention: { type: Object, default: undefined },
    commerce: { type: Object, default: undefined },
    detailsOpened: { type: Boolean, default: false },
    toggles: { type: Object, default: undefined },
    queues: { type: Array, default: undefined },
    disableClick: { type: Boolean, default: false },
  },
  data() {
    const store = globalStore();
    return {
      loading: false,
      extendedEntity: false,
      extendedPaymentEntity: false,
      newPaymentConfirmationData: {},
      extendedTransferEntity: false,
      paymentTypes: [],
      paymentMethods: [],
      paymentAmountError: false,
      paymentTypeError: false,
      paymentMethodError: false,
      errorsAdd: [],
      goToTransfer: false,
      goToCancel: false,
      goToConfirm: false,
      goToAdvanceStage: false,
      selectedNextStage: '',
      stageNotes: '',
      checked: false,
      queuesToTransfer: [],
      queueToTransfer: null,
      queue: {},
      store,
      ATTENTION_STATUS, // Expose ATTENTION_STATUS to template
      showTelemedicineVideo: false,
      showTelemedicineChat: false,
      telemedicineSessionType: null,
      clientConnected: false,
      telemedicineSession: null,
      connectionStatusInterval: null,
      consentStatus: null,
      loadingConsentStatus: false,
      consentStatusInterval: null,
    };
  },
  beforeMount() {
    this.paymentTypes = getPaymentTypes();
    this.paymentMethods = getPaymentMethods();
    if (this.attention?.telemedicineSessionId) {
      this.loadTelemedicineSessionDetails();
    }
  },
  watch: {
    'attention.telemedicineSessionId': {
      handler(newVal) {
        if (newVal) {
          this.loadTelemedicineSessionDetails();
        } else {
          this.telemedicineSession = null;
        }
      },
      immediate: false,
    },
    attention: {
      handler(newVal) {
        if (newVal && newVal.clientId && newVal.commerceId) {
          this.loadConsentStatus();
          // Iniciar polling para atualização em tempo real
          this.startConsentStatusPolling();
        } else {
          // Parar polling se não há atenção válida
          this.stopConsentStatusPolling();
        }
      },
      immediate: true,
      deep: true,
    },
    detailsOpened: {
      immediate: true,
      deep: true,
      async handler() {
        this.extendedEntity = this.detailsOpened;
      },
    },
    extendedEntity: {
      immediate: true,
      deep: true,
      async handler() {
        this.extendedEntity = this.extendedEntity;
      },
    },
  },
  beforeUnmount() {
    // Clean up polling intervals
    this.stopConnectionStatusPolling();
    this.stopConsentStatusPolling();
  },
  emits: ['open-modal', 'updatedAttentions'],
  methods: {
    showDetails() {
      // Emit event to parent to open modal instead of expanding inline
      this.$emit('open-modal', this.attention);
    },
    showPaymentDetails() {
      this.extendedPaymentEntity = !this.extendedPaymentEntity;
      this.extendedTransferEntity = false;
      this.newConfirmationData = {
        processPaymentNow: true,
      };
    },
    async showTransferDetails() {
      this.extendedTransferEntity = !this.extendedTransferEntity;
      this.extendedPaymentEntity = false;
      if (this.extendedTransferEntity === true) {
        await this.toTransfer();
      }
    },
    getDate(dateIn, timeZoneIn) {
      return getDate(dateIn, timeZoneIn);
    },
    copyBooking() {
      const textToCopy = jsonToCsv([this.attention]);
      navigator.clipboard.writeText(textToCopy);
    },
    async cancel() {
      try {
        this.loading = true;
        if (this.attention && this.attention.id) {
          await cancelAttention(this.attention.id);
          this.$emit('updatedAttentions');
        }
        this.loading = false;
      } catch (error) {
        this.loading = false;
        this.alertError = error.message;
      }
    },
    validateConfirm(data) {
      this.errorsAdd = [];
      if (
        data.processPaymentNow === true &&
        getActiveFeature(this.commerce, 'attention-confirm-payment', 'PRODUCT')
      ) {
        if (!data.paymentType || data.paymentType.length === 0) {
          this.paymentTypeError = true;
          this.errorsAdd.push('collaboratorBookingsView.validate.paymentType');
        } else {
          this.paymentTypeError = false;
        }
        if (!data.paymentMethod || data.paymentMethod.length === 0) {
          this.paymentMethodError = true;
          this.errorsAdd.push('collaboratorBookingsView.validate.paymentMethod');
        } else {
          this.paymentMethodError = false;
        }
        if (
          data.paymentAmount === undefined ||
          data.paymentAmount.length === 0 ||
          data.paymentAmount < 0
        ) {
          this.paymentAmountError = true;
          this.errorsAdd.push('collaboratorBookingsView.validate.paymentAmount');
        } else {
          this.paymentAmountError = false;
        }
      }
      if (this.errorsAdd.length === 0) {
        return true;
      }
      return false;
    },
    async confirm() {
      try {
        this.loading = true;
        if (this.attention && this.attention.id) {
          if (this.validateConfirm(this.newPaymentConfirmationData)) {
            const body = {
              paymentConfirmationData: {
                paid: true,
                paymentDate: new Date(),
                ...this.newPaymentConfirmationData,
              },
            };
            await attentionPaymentConfirm(this.attention.id, body);
            this.$emit('updatedAttentions');
          }
        }
        this.loading = false;
        this.goToConfirm1 = false;
        this.goToConfirm2 = false;
      } catch (error) {
        this.loading = false;
        this.alertError = error.message;
      }
    },
    async toTransfer() {
      try {
        this.loading = true;
        // Reset queuesToTransfer
        this.queuesToTransfer = [];
        this.queueToTransfer = null;

        if (this.attention && this.attention.queueId) {
          try {
            this.queue = await getQueueById(this.attention.queueId);
          } catch (error) {
            console.error('Error loading queue:', error);
            this.queue = {};
          }
        }

        const queuesToTransfer = this.queues;
        if (!queuesToTransfer || queuesToTransfer.length === 0) {
          this.loading = false;
          return;
        }

        if (!this.commerce || !this.commerce.id) {
          console.error('Commerce or commerce.id is not available');
          // If commerce is not available, just add all queues
          this.queuesToTransfer = [...queuesToTransfer];
          this.loading = false;
          return;
        }

        try {
          const attentions = await getPendingCommerceAttentions(this.commerce.id);
          if (attentions && attentions.length > 0) {
            const groupedAttentions = attentions.reduce((acc, book) => {
              const type = book.queueId;
              if (!acc[type]) {
                acc[type] = [];
              }
              acc[type].push(book);
              return acc;
            }, {});
            let limit = 1; //queuesToTransfer.length;
            if (
              this.queue.serviceInfo !== undefined &&
              this.queue.serviceInfo.blockLimit !== undefined &&
              this.queue.serviceInfo.blockLimit > 0
            ) {
              limit = this.queue.serviceInfo.blockLimit;
            }
            queuesToTransfer.forEach(queue => {
              const attentionsByQueue = groupedAttentions[queue.id];
              if (attentionsByQueue && attentionsByQueue.length > 0) {
                const attentionsReserved = attentionsByQueue.map(attention => {
                  if (attention.block) {
                    if (attention.block.blockNumbers && attention.block.blockNumbers.length > 0) {
                      return [...attention.block.blockNumbers];
                    } else {
                      return attention.block.number;
                    }
                  }
                });
                const totalBlocksReserved = attentionsReserved.flat(Infinity).sort();
                const uniqueBlocksReserved = [...new Set(totalBlocksReserved)];
                const blockedBlocks = [];
                uniqueBlocksReserved.forEach(block => {
                  const times = totalBlocksReserved.filter(reserved => reserved === block).length;
                  if (times >= limit - 1) {
                    blockedBlocks.push(block);
                  }
                });
                let blocksToCheck = [];
                if (this.attention.block) {
                  blocksToCheck = this.attention.block.blockNumbers || [
                    this.attention.block.number,
                  ];
                }
                const availableBlocks = blocksToCheck
                  .flat()
                  .filter(block => blockedBlocks.includes(block));
                if (availableBlocks.length === 0) {
                  this.queuesToTransfer.push(queue);
                }
              } else {
                this.queuesToTransfer.push(queue);
              }
            });
          } else {
            // If no attentions, add all queues
            this.queuesToTransfer = [...queuesToTransfer];
          }
        } catch (error) {
          console.error('Error loading pending attentions:', error);
          // On error, add all queues as fallback
          this.queuesToTransfer = [...queuesToTransfer];
        }
      } catch (error) {
        console.error('Error in toTransfer:', error);
        this.alertError = error.message || 'Error al cargar las filas para transferir';
      } finally {
        this.loading = false;
      }
    },
    async transfer() {
      try {
        this.loading = true;
        if (!this.attention || !this.attention.id) {
          throw new Error('Atención no disponible');
        }
        if (!this.queueToTransfer) {
          throw new Error('Por favor seleccione una fila para transferir');
        }
        const body = {
          queueId: this.queueToTransfer,
        };
        await transferAttention(this.attention.id, body);
        this.$emit('updatedAttentions');
        this.goToTransfer = false;
        this.queueToTransfer = null;
        this.queuesToTransfer = [];
      } catch (error) {
        console.error('Error transferring attention:', error);
        this.alertError = error.message || 'Error al transferir la atención';
      } finally {
        this.loading = false;
      }
    },
    goTransfer() {
      this.goToTransfer = !this.goToTransfer;
    },
    cancelTransfer() {
      this.goToTransfer = false;
    },
    getActiveFeature(commerce, name, type) {
      return getActiveFeature(commerce, name, type);
    },
    goCancel() {
      this.goToCancel = !this.goToCancel;
    },
    cancelCancel() {
      this.goToCancel = false;
    },
    goConfirm() {
      this.goToConfirm = !this.goToConfirm;
    },
    confirmCancel() {
      this.goToConfirm = false;
    },
    goAdvanceStage() {
      // Validar consentimientos bloqueantes antes de abrir modal
      if (this.hasBlockingConsents()) {
        const blockingCount = this.getBlockingConsentsCount();
        const blockingTypes =
          this.consentStatus?.missing
            ?.filter(req => req.blockingForAttention && req.required)
            .map(req => req.consentType)
            .join(', ') || '';

        this.alertError =
          this.$t('attention.lgpd.cannotAdvanceStage', {
            count: blockingCount,
            types: blockingTypes,
          }) ||
          `No se puede avanzar etapa: faltan ${blockingCount} consentimiento(s) bloqueante(s): ${blockingTypes}`;
        return;
      }

      this.goToAdvanceStage = !this.goToAdvanceStage;
      if (this.goToAdvanceStage) {
        this.selectedNextStage = '';
        this.stageNotes = '';
      }
    },
    cancelAdvanceStage() {
      this.goToAdvanceStage = false;
      this.selectedNextStage = '';
      this.stageNotes = '';
    },
    async confirmAdvanceStage() {
      if (!this.selectedNextStage) {
        this.alertError =
          this.$t('attention.advanceStage.selectStage') || 'Por favor selecciona una etapa';
        return;
      }

      // Validar consentimientos bloqueantes antes de avanzar
      if (this.hasBlockingConsents()) {
        const blockingCount = this.getBlockingConsentsCount();
        const blockingTypes =
          this.consentStatus?.missing
            ?.filter(req => req.blockingForAttention && req.required)
            .map(req => req.consentType)
            .join(', ') || '';

        this.alertError =
          this.$t('attention.lgpd.cannotAdvanceStage', {
            count: blockingCount,
            types: blockingTypes,
          }) ||
          `No se puede avanzar etapa: faltan ${blockingCount} consentimiento(s) bloqueante(s): ${blockingTypes}`;
        return;
      }

      try {
        this.loading = true;
        this.alertError = '';
        if (this.attention && this.attention.id) {
          const body = {
            stage: this.selectedNextStage,
            notes: this.stageNotes || undefined,
          };
          await advanceStage(this.attention.id, body);
          this.$emit('updatedAttentions');
          this.goToAdvanceStage = false;
          this.selectedNextStage = '';
          this.stageNotes = '';
        }
        this.loading = false;
      } catch (error) {
        this.loading = false;
        // Si el error es de consentimientos bloqueantes, mostrar mensaje específico
        if (
          error.response?.status === 412 ||
          error.response?.data?.message?.includes('consentimiento')
        ) {
          this.alertError =
            error.response?.data?.message ||
            this.$t('attention.lgpd.cannotAdvanceStage') ||
            'No se puede avanzar etapa: faltan consentimientos obligatorios';
        } else {
          this.alertError =
            error.response?.data?.message || error.message || 'Error al avanzar etapa';
        }
      }
    },
    getNextStages(currentStage) {
      // Define transiciones válidas (puede ser más estricto en el futuro)
      const stageFlow = {
        PENDING: ['CHECK_IN'],
        CHECK_IN: ['PRE_CONSULTATION'],
        PRE_CONSULTATION: ['CONSULTATION'],
        CONSULTATION: ['POST_CONSULTATION'],
        POST_CONSULTATION: ['CHECKOUT'],
        CHECKOUT: ['TERMINATED'],
      };
      return stageFlow[currentStage] || [];
    },
    receiveData(data) {
      if (data) {
        if (data.procedureNumber !== undefined && data.procedureNumber >= 0) {
          this.newPaymentConfirmationData.procedureNumber = data.procedureNumber;
        }
        if (data.proceduresTotalNumber !== undefined && data.procedureNumber >= 0) {
          this.newPaymentConfirmationData.proceduresTotalNumber = data.proceduresTotalNumber;
        }
        if (data.paymentFiscalNote) {
          this.newPaymentConfirmationData.paymentFiscalNote = data.paymentFiscalNote;
        }
        if (data.paymentType) {
          this.newPaymentConfirmationData.paymentType = data.paymentType;
        }
        if (data.paymentMethod) {
          this.newPaymentConfirmationData.paymentMethod = data.paymentMethod;
        }
        if (data.paymentAmount !== undefined && data.paymentAmount >= 0) {
          this.newPaymentConfirmationData.paymentAmount = data.paymentAmount;
        }
        if (data.totalAmount !== undefined && data.totalAmount >= 0) {
          this.newPaymentConfirmationData.totalAmount = data.totalAmount;
        }
        if (data.installments !== undefined && data.installments >= 0) {
          this.newPaymentConfirmationData.installments = data.installments;
        }
        if (data.paymentCommission !== undefined && data.paymentCommission >= 0) {
          this.newPaymentConfirmationData.paymentCommission = data.paymentCommission;
        }
        if (data.paymentComment) {
          this.newPaymentConfirmationData.paymentComment = data.paymentComment;
        }
        if (data.packageId) {
          this.newPaymentConfirmationData.packageId = data.packageId;
        }
        if (data.pendingPaymentId) {
          this.newPaymentConfirmationData.pendingPaymentId = data.pendingPaymentId;
        }
        if (data.processPaymentNow !== undefined) {
          this.newPaymentConfirmationData.processPaymentNow = data.processPaymentNow;
        }
        if (data.packagePaid !== undefined) {
          this.newPaymentConfirmationData.packagePaid = data.packagePaid;
        }
        if (data.packagePaid !== undefined) {
          this.newPaymentConfirmationData.confirmInstallments = data.confirmInstallments;
        }
        if (data.processPaymentNow === false) {
          this.errorsAdd = [];
        }
      }
    },
    async goToAttention() {
      try {
        this.loading = true;
        this.alertError = '';

        // Validar consentimientos bloqueantes antes de atender
        if (this.hasBlockingConsents()) {
          const blockingCount = this.getBlockingConsentsCount();
          const blockingTypes =
            this.consentStatus?.missing
              ?.filter(req => req.blockingForAttention && req.required)
              .map(req => req.consentType)
              .join(', ') || '';

          this.alertError = this.$t('attention.lgpd.cannotAttend', {
            count: blockingCount,
            types: blockingTypes,
          });
          this.loading = false;
          // Abrir modal de LGPD automáticamente
          this.$nextTick(() => {
            this.openLgpdModal();
          });
          return;
        }

        const currentUser = await this.store.getCurrentUser;
        const currentUserType = await this.store.getCurrentUserType;
        if (currentUserType === 'collaborator' && currentUser.id) {
          const body = {
            queueId: this.attention.queueId,
            collaboratorId: currentUser.id,
            commerceLanguage: this.commerce.localeInfo ? this.commerce.localeInfo.language : 'sp',
          };
          await attend(this.attention.number, body);
          this.$emit('updatedAttentions');
          const url = `/interno/colaborador/atencion/${this.attention.id}/validar`;
          const resolvedRoute = this.$router.resolve({ path: url });
          window.open(resolvedRoute.href, '_blank');
        }

        this.alertError = '';
        this.loading = false;
      } catch (error) {
        this.loading = false;
        // Si el error es de consentimientos bloqueantes, mostrar mensaje específico
        if (
          error.response?.status === 412 ||
          error.response?.data?.message?.includes('consentimiento')
        ) {
          this.alertError =
            error.response?.data?.message ||
            this.$t('attention.lgpd.cannotAttend') ||
            'No se puede atender: faltan consentimientos obligatorios';
        } else {
          this.alertError = error.response?.status || error.message || 'Error al atender';
        }
      }
    },
    async handleTelemedicineSessionStarted(data) {
      // Abrir componente de video o chat según el tipo
      this.telemedicineSessionType = data.type;

      // Load session details to get recording status and connection info
      try {
        if (this.attention.telemedicineSessionId) {
          this.telemedicineSession = await getTelemedicineSession(
            this.attention.telemedicineSessionId
          );
          // Start polling for connection status
          this.startConnectionStatusPolling();
        }
      } catch (err) {
        console.error('Error loading telemedicine session:', err);
      }

      if (data.type === 'video' || data.type === 'both') {
        this.showTelemedicineVideo = true;
      }
      if (data.type === 'chat' || data.type === 'both') {
        this.showTelemedicineChat = true;
      }
      this.$emit('updatedAttentions');
    },
    startConnectionStatusPolling() {
      // Poll every 3 seconds for connection status
      if (this.connectionStatusInterval) {
        clearInterval(this.connectionStatusInterval);
      }
      this.connectionStatusInterval = setInterval(async () => {
        if (this.attention?.telemedicineSessionId) {
          try {
            const session = await getTelemedicineSession(this.attention.telemedicineSessionId);
            this.telemedicineSession = session;
            // Check if client has validated access key (indicates they're likely connected)
            this.clientConnected = session.accessKeyValidated || false;
          } catch (err) {
            console.error('Error polling connection status:', err);
          }
        }
      }, 3000);
    },
    stopConnectionStatusPolling() {
      if (this.connectionStatusInterval) {
        clearInterval(this.connectionStatusInterval);
        this.connectionStatusInterval = null;
      }
    },
    handleTelemedicineError(error) {
      console.error('Telemedicine error:', error);
      this.alertError = error.message || 'Error en teleconsulta';
    },
    closeTelemedicineVideo() {
      this.showTelemedicineVideo = false;
      this.telemedicineSessionType = null;
      this.stopConnectionStatusPolling();
    },
    closeTelemedicineChat() {
      this.showTelemedicineChat = false;
      this.telemedicineSessionType = null;
      this.stopConnectionStatusPolling();
    },
    formatTelemedicineDate(dateString) {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleString('es-ES', {
        dateStyle: 'long',
        timeStyle: 'short',
      });
    },
    getTelemedicineStatusText(status) {
      const statusMap = {
        scheduled: this.$t('telemedicineSession.statusScheduled'),
        active: this.$t('telemedicineSession.statusActive'),
        completed: this.$t('telemedicineSession.statusCompleted'),
        cancelled: this.$t('telemedicineSession.statusCancelled'),
      };
      return statusMap[status] || status;
    },
    getTelemedicineStatusClass(status) {
      const classMap = {
        scheduled: 'text-info',
        active: 'text-success',
        completed: 'text-secondary',
        cancelled: 'text-danger',
      };
      return classMap[status] || '';
    },
    formatTelemedicineTime(date) {
      if (!date) return 'N/A';
      return new Date(date).toLocaleString('es-ES');
    },
    getAccessKeyActivationTime() {
      if (!this.telemedicineSession?.scheduledAt) return null;
      const scheduledTime = new Date(this.telemedicineSession.scheduledAt);
      const activationTime = new Date(scheduledTime.getTime() - 10 * 60 * 1000); // 10 minutes before
      return activationTime;
    },
    isAccessKeyActivated() {
      const activationTime = this.getAccessKeyActivationTime();
      if (!activationTime) return false;
      return new Date() >= activationTime;
    },
    getTimeUntilActivation() {
      const activationTime = this.getAccessKeyActivationTime();
      if (!activationTime) return null;
      const now = new Date();
      const diff = activationTime.getTime() - now.getTime();
      if (diff <= 0) return null;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);
      if (days > 0) return `${days} día${days > 1 ? 's' : ''}`;
      if (hours > 0) return `${hours} hora${hours > 1 ? 's' : ''}`;
      return `${minutes} minuto${minutes > 1 ? 's' : ''}`;
    },
    getClientAccessLink() {
      if (!this.attention || !this.attention.telemedicineSessionId) return '';
      const baseUrl = window.location.origin;
      return `${baseUrl}/publico/telemedicina/${this.attention.telemedicineSessionId}`;
    },
    copyClientAccessLink(attentionId) {
      const input = document.getElementById(`telemedicine-link-${attentionId}`);
      if (input) {
        input.select();
        input.setSelectionRange(0, 99999); // For mobile devices
        navigator.clipboard
          .writeText(input.value)
          .then(() => {
            // Show success message (you can use a toast library here)
            alert('Enlace copiado al portapapeles');
          })
          .catch(err => {
            console.error('Error copying link:', err);
          });
      }
    },
    async loadConsentStatus() {
      if (!this.attention || !this.attention.clientId || !this.attention.commerceId) {
        return;
      }
      try {
        this.loadingConsentStatus = true;
        const status = await getConsentStatus(this.attention.commerceId, this.attention.clientId);
        // Solo actualizar si hay cambios para evitar re-renders innecesarios
        if (JSON.stringify(this.consentStatus) !== JSON.stringify(status)) {
          this.consentStatus = status;
        }
      } catch (error) {
        console.error('Error loading consent status:', error);
        // No resetear a null para mantener estado anterior
      } finally {
        this.loadingConsentStatus = false;
      }
    },
    startConsentStatusPolling() {
      // Polling cada 10 segundos para actualización em tempo real
      if (this.consentStatusInterval) {
        clearInterval(this.consentStatusInterval);
      }
      this.consentStatusInterval = setInterval(() => {
        if (this.attention?.clientId && this.attention?.commerceId) {
          this.loadConsentStatus();
        }
      }, 10000); // 10 segundos
    },
    stopConsentStatusPolling() {
      if (this.consentStatusInterval) {
        clearInterval(this.consentStatusInterval);
        this.consentStatusInterval = null;
      }
    },
    openLgpdModal() {
      if (!this.attention?.clientId || !this.commerce?.id) {
        return;
      }
      const modalId = `lgpdModal-${this.attention.clientId}`;
      const modalElement = document.getElementById(modalId);
      if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
      }
    },
    handleConsentUpdated() {
      // Handle consent update event
      this.loadConsentStatus();
    },
    hasBlockingConsents() {
      if (!this.consentStatus || !this.consentStatus.missing) {
        return false;
      }
      return this.consentStatus.missing.some(req => req.blockingForAttention && req.required);
    },
    getMissingConsentsCount() {
      if (!this.consentStatus || !this.consentStatus.missing) {
        return 0;
      }
      return this.consentStatus.missing.length;
    },
    getBlockingConsentsCount() {
      if (!this.consentStatus || !this.consentStatus.missing) {
        return 0;
      }
      return this.consentStatus.missing.filter(req => req.blockingForAttention && req.required)
        .length;
    },
    getStatusIcon() {
      if (this.attention.status === ATTENTION_STATUS.PENDING) {
        if (!this.attention.paid || this.attention.paid === false) {
          return 'bi bi-clock-fill';
        }
        return 'bi bi-check-circle-fill';
      }
      if (this.attention.status === ATTENTION_STATUS.TERMINATED) return 'bi bi-check-circle-fill';
      if (this.attention.status === ATTENTION_STATUS.CANCELLED) return 'bi bi-x-circle-fill';
      return 'bi bi-calendar-check-fill';
    },
    getStatusIconClass() {
      if (this.attention.status === ATTENTION_STATUS.TERMINATED) return 'icon-success';
      if (this.attention.status === ATTENTION_STATUS.PENDING) {
        if (this.attention.paid || this.attention.paid === true) {
          return 'icon-success';
        }
        return 'icon-warning';
      }
      if (this.attention.status === ATTENTION_STATUS.CANCELLED) return 'icon-error';
      return 'icon-info';
    },
    getStatusTooltip() {
      if (this.attention.status === ATTENTION_STATUS.PENDING) {
        if (!this.attention.paid || this.attention.paid === false) {
          return 'Atención pendiente';
        }
        return 'Atención confirmada';
      }
      if (this.attention.status === ATTENTION_STATUS.TERMINATED) return 'Atención terminada';
      if (this.attention.status === ATTENTION_STATUS.CANCELLED) return 'Atención cancelada';
      return 'Estado de la atención';
    },
    getCardTypeClass() {
      if (this.attention.status === ATTENTION_STATUS.TERMINATED) return 'booking-card-success';
      if (this.attention.status === ATTENTION_STATUS.PENDING) {
        if (this.attention.paid || this.attention.paid === true) {
          return 'booking-card-success';
        }
        return 'booking-card-warning';
      }
      if (this.attention.status === ATTENTION_STATUS.CANCELLED) return 'booking-card-error';
      return 'booking-card-info';
    },
  },
};
</script>

<template>
  <div v-if="show && attention">
    <div
      class="booking-row-card"
      :class="getCardTypeClass()"
      @click.prevent="disableClick ? null : showDetails()"
    >
      <div class="booking-row-content">
        <!-- Status Icon -->
        <Popper :class="'dark'" arrow disable-click-away hover>
          <template #content>
            <div>{{ getStatusTooltip() }}</div>
          </template>
          <div class="booking-icon-mini" :class="getStatusIconClass()" @click.stop>
            <i :class="getStatusIcon()"></i>
          </div>
        </Popper>

        <!-- Service Badges -->
        <div v-if="attention.servicesDetails || attention.packageId" class="service-badges-inline">
          <span
            v-for="serv in attention.servicesDetails"
            :key="serv.id"
            class="badge-mini service-tag-mini"
          >
            {{ serv.name }}
          </span>
          <span v-if="attention.packageId" class="badge-mini service-tag-mini bg-secondary">
            <i class="bi bi-box-fill"></i> {{ attention.packageProcedureNumber }}
          </span>
        </div>

        <!-- Client Info - Horizontal -->
        <div class="booking-info-inline">
          <div class="booking-name-inline">
            <span class="booking-name-text">{{
              attention.user?.name?.split(' ')[0].toUpperCase() || 'N/I'
            }}</span>
            <Popper :class="'dark'" arrow disable-click-away hover>
              <template #content>
                <div>Copiar dados da atenção</div>
              </template>
              <button class="btn-copy-mini" @click.stop="copyBooking()">
                <i class="bi bi-file-earmark-spreadsheet"></i>
              </button>
            </Popper>
          </div>
          <div class="booking-meta-inline">
            <span class="booking-time-inline" v-if="attention.block && attention.block.hourFrom">
              {{ attention.block.hourFrom }} - {{ attention.block.hourTo }}
            </span>
            <span
              v-if="attention.number"
              class="badge-mini service-tag-mini"
              style="background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%)"
            >
              #{{ attention.number }}
            </span>
            <Popper
              v-if="
                getActiveFeature(commerce, 'attention-stages-enabled', 'PRODUCT') &&
                attention.currentStage
              "
              :class="'dark'"
              arrow
              disable-click-away
              hover
            >
              <template #content>
                <div>{{ $t(`attention.stage.${attention.currentStage}`) }}</div>
              </template>
              <span
                class="badge-mini service-tag-mini"
                style="background: linear-gradient(135deg, #17a2b8 0%, #138496 100%)"
                @click.stop
              >
                {{ $t(`attention.stage.${attention.currentStage}`) }}
              </span>
            </Popper>
            <!-- LGPD Consent Indicators -->
            <Popper v-if="hasBlockingConsents()" :class="'dark'" arrow disable-click-away hover>
              <template #content>
                <div>
                  {{ $t('attention.lgpd.blockingConsents', { count: getBlockingConsentsCount() }) }}
                  - {{ $t('attention.lgpd.clickToRequest') }}
                </div>
              </template>
              <i
                class="bi bi-shield-exclamation icon-mini-separated"
                style="cursor: pointer; color: #dc3545"
                @click.stop="openLgpdModal()"
              ></i>
            </Popper>
            <Popper
              v-else-if="getMissingConsentsCount() > 0"
              :class="'dark'"
              arrow
              disable-click-away
              hover
            >
              <template #content>
                <div>
                  {{ $t('attention.lgpd.missingConsents', { count: getMissingConsentsCount() }) }}
                </div>
              </template>
              <i
                class="bi bi-shield-check icon-mini-separated"
                style="color: #ffc107"
                @click.stop
              ></i>
            </Popper>
            <Popper
              v-else-if="consentStatus && consentStatus.summary"
              :class="'dark'"
              arrow
              disable-click-away
              hover
            >
              <template #content>
                <div>{{ $t('attention.lgpd.allConsentsGranted') }}</div>
              </template>
              <i
                class="bi bi-shield-check icon-mini-separated"
                style="color: #28a745"
                @click.stop
              ></i>
            </Popper>
            <i
              v-if="
                attention.paymentConfirmationData !== undefined &&
                attention.paymentConfirmationData.paid === true
              "
              class="bi bi-coin icon-mini-separated blue-icon"
              @click.stop
            ></i>
            <i
              v-if="attention.productCounter > 0"
              class="bi bi-eyedropper icon-mini-separated"
              @click.stop
            ></i>
            <i
              v-if="attention.termsConditionsAcceptedCode"
              class="bi bi-person-fill-check icon-mini-separated"
              @click.stop
            ></i>
          </div>
        </div>

        <!-- Collapse Icon -->
        <div class="collapse-icon-wrapper">
          <i
            class="bi collapse-icon"
            :class="extendedEntity ? 'bi-chevron-up' : 'bi-chevron-down'"
          ></i>
        </div>
      </div>
    </div>
    <!-- Inline details removed - now using modal for details display -->

    <!-- Floating Telemedicine Windows (for doctor to work while video is active) -->
    <TelemedicineFloatingWindow
      v-if="showTelemedicineVideo && attention.telemedicineSessionId"
      :show="showTelemedicineVideo"
      title="Consulta Virtual - Video"
      icon-class="bi-camera-video"
      :is-connected="true"
      :is-connecting="false"
      :client-connected="clientConnected"
      @close="closeTelemedicineVideo"
    >
      <TelemedicineVideoCall
        :session-id="attention.telemedicineSessionId"
        :current-user-id="store.getCurrentUser?.id || ''"
        :user-type="'doctor'"
        :show-close="false"
        :recording-enabled="
          telemedicineSession?.recordingEnabled ||
          attention.telemedicineConfig?.recordingEnabled ||
          false
        "
        :client-connected="clientConnected"
        @close="closeTelemedicineVideo"
        @call-ended="closeTelemedicineVideo"
      />
    </TelemedicineFloatingWindow>

    <TelemedicineFloatingWindow
      v-if="showTelemedicineChat && attention.telemedicineSessionId"
      :show="showTelemedicineChat"
      title="Consulta Virtual - Chat"
      icon-class="bi-chat-dots"
      :is-connected="true"
      :is-connecting="false"
      :client-connected="clientConnected"
      :initial-position="{ x: 520, y: 20 }"
      @close="closeTelemedicineChat"
    >
      <TelemedicineChat
        :session-id="attention.telemedicineSessionId"
        :current-user-id="store.getCurrentUser?.id || ''"
        :user-type="'doctor'"
        :show-close="false"
        @close="closeTelemedicineChat"
      />
    </TelemedicineFloatingWindow>

    <!-- LGPD Modal -->
    <Teleport to="body" v-if="attention?.clientId && commerce?.id">
      <div
        :id="`lgpdModal-${attention.clientId}`"
        class="modal fade modern-modal"
        tabindex="-1"
        :aria-labelledby="`lgpdModalLabel-${attention.clientId}`"
        aria-hidden="true"
      >
        <div class="modal-dialog modal-xl modal-dialog-scrollable modern-modal-dialog">
          <div class="modal-content modern-modal-content">
            <div class="modal-header border-0 active-name modern-modal-header">
              <div class="modern-modal-header-inner">
                <div class="modern-modal-icon-wrapper">
                  <i class="bi bi-shield-check"></i>
                </div>
                <div class="modern-modal-title-wrapper">
                  <h5
                    class="modal-title fw-bold modern-modal-title"
                    :id="`lgpdModalLabel-${attention.clientId}`"
                  >
                    {{ $t('lgpd.title') }}
                  </h5>
                  <p class="modern-modal-client-name" v-if="attention.client?.name">
                    {{ attention.client.name }}
                  </p>
                </div>
              </div>
              <button
                :id="`close-modal-lgpd-${attention.clientId}`"
                class="modern-modal-close-btn"
                type="button"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
            <Spinner :show="loading"></Spinner>
            <div class="modal-body modern-modal-body-content">
              <LgpdConsentManager
                :commerce-id="commerce.id"
                :client-id="attention.clientId"
                @consent-updated="handleConsentUpdated"
              />
            </div>
            <div class="modal-footer border-0 modern-modal-footer">
              <button
                class="btn btn-sm fw-bold btn-dark text-white rounded-pill px-4 modern-modal-close-button"
                type="button"
                data-bs-dismiss="modal"
                aria-label="Close"
              >
                <i class="bi bi-check-lg"></i> {{ $t('close') }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<style scoped>
/* Modernized Booking Row Card */
.booking-row-card {
  background-color: #ffffff;
  padding: 0.15rem 0.35rem;
  margin: 0.25rem 0;
  border-radius: 0.4rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  transition: all 0.2s ease;
  cursor: pointer;
}

.booking-row-card:hover {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
  border-color: rgba(0, 194, 203, 0.2);
}

.booking-card-success {
  border-left: 3px solid #10b981;
}

.booking-card-warning {
  border-left: 3px solid #f59e0b;
}

.booking-card-error {
  border-left: 3px solid #ef4444;
}

.booking-card-info {
  border-left: 3px solid var(--azul-turno);
}

.booking-row-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.booking-icon-mini {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.6rem;
  height: 1.6rem;
  border-radius: 50%;
  flex-shrink: 0;
  font-size: 0.75rem;
}

.booking-icon-mini.icon-success {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.booking-icon-mini.icon-warning {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
}

.booking-icon-mini.icon-error {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.booking-icon-mini.icon-info {
  background: rgba(0, 194, 203, 0.1);
  color: var(--azul-turno);
}

.service-badges-inline {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
  align-items: center;
}

.badge-mini {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.5rem;
  font-size: 0.65rem;
  font-weight: 600;
  border-radius: 0.35rem;
  background: linear-gradient(135deg, var(--azul-turno) 0%, #00b8c4 100%);
  color: #ffffff;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.badge-mini.bg-secondary {
  background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
}

.service-tag-mini {
  background: linear-gradient(135deg, var(--azul-turno) 0%, #00b8c4 100%);
}

.booking-info-inline {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.booking-name-inline {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.booking-name-text {
  font-size: 0.75rem;
  font-weight: 600;
  color: #333;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.btn-copy-mini {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
  padding: 0;
  background: transparent;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #6c757d;
  flex-shrink: 0;
  font-size: 0.7rem;
}

.btn-copy-mini:hover {
  background: rgba(0, 194, 203, 0.08);
  border-color: var(--azul-turno);
  color: var(--azul-turno);
}

.booking-meta-inline {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.booking-time-inline {
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--azul-turno);
  padding: 0.15rem 0.4rem;
  background: rgba(0, 194, 203, 0.08);
  border-radius: 0.3rem;
  line-height: 1.2;
}

.icon-mini-separated {
  font-size: 0.75rem;
  color: #6c757d;
  opacity: 0.8;
}

.icon-mini-separated.blue-icon {
  color: var(--azul-turno);
}

.collapse-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.collapse-icon {
  font-size: 0.75rem;
  color: #6c757d;
  transition: transform 0.2s ease;
}

.details-arrow {
  margin: 0.5rem;
  margin-top: 0;
  border-bottom-left-radius: 0.5rem;
  border-bottom-right-radius: 0.5rem;
  line-height: 1.1rem;
  border: 0.5px solid var(--gris-default);
  border-top: 0;
}
.show {
  padding: 1px;
  max-height: 600px !important;
  overflow-y: auto;
}
.details-title {
  text-decoration: underline;
  font-size: 0.8rem;
  color: var(--color-text);
  cursor: pointer;
}
.metric-card-title {
  margin: 0.2rem;
  font-size: 0.8rem;
  font-weight: 500;
}
.metric-card-detail-title {
  font-size: 1rem;
  font-weight: 600;
  line-height: 0.7rem;
}
.stage-badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
}
.copy-icon {
  color: var(--gris-default);
  cursor: pointer;
  margin: 0.2rem;
}
.checked-icon {
  color: var(--azul-turno);
}
.metric-card-details {
  font-size: 0.7rem;
  font-weight: 400;
}
.select {
  border-radius: 0.5rem !important;
  border: 1.5px solid var(--gris-clear) !important;
}
.text-label {
  line-height: 0.9rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
.confirm-payment {
  cursor: pointer;
}
.step-title {
  font-size: 0.7rem;
  line-height: 0.7rem;
  color: var(--color-text);
  cursor: pointer;
}
.hour-title {
  font-size: 0.8rem;
  font-weight: 500;
  line-height: 0.9rem;
  letter-spacing: 0.01px;
}
.icon {
  margin-left: 0.1rem;
  margin-right: 0.15rem;
}
.index {
  background-color: var(--azul-qr);
  padding: 0.05rem;
  margin-top: 0.25rem;
  border-radius: 0.5rem !important;
  margin-left: 5rem;
  margin-right: 5rem;
}
.attention-link {
  cursor: pointer;
}
</style>
