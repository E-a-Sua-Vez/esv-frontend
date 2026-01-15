<script>
import Popper from 'vue3-popper';
import jsonToCsv from '../../../shared/utils/jsonToCsv';
import Spinner from '../../common/Spinner.vue';
import { getDate } from '../../../shared/utils/date';
import { formatIdNumber } from '../../../shared/utils/idNumber';
import {
  cancelAttention,
  attentionPaymentConfirm,
  transferAttention,
  getPendingCommerceAttentions,
  advanceStage,
} from '../../../application/services/attention';
import { getActiveFeature } from '../../../shared/features';
import { getPaymentMethods, getPaymentTypes } from '../../../shared/utils/data';
import { getQueueById } from '../../../application/services/queue';
import { getBookingDetails } from '../../../application/services/booking';
import { getCollaboratorById } from '../../../application/services/collaborator';
import { getAttentionDetails } from '../../../application/services/attention';
import { getConsentStatus } from '../../../application/services/consent';
import { ATTENTION_STATUS } from '../../../shared/constants';
import Warning from '../../common/Warning.vue';
import AreYouSure from '../../common/AreYouSure.vue';
import PaymentForm from '../../payments/PaymentForm.vue';
import Message from '../../common/Message.vue';
import AttentionTimeline from './AttentionTimeline.vue';

export default {
  name: 'AttentionDetailsModal',
  components: { Popper, Spinner, Warning, AreYouSure, PaymentForm, Message, AttentionTimeline },
  props: {
    show: { type: Boolean, default: false },
    attention: { type: Object, default: undefined },
    commerce: { type: Object, default: undefined },
    queues: { type: Array, default: undefined },
    toggles: { type: Object, default: undefined },
  },
  emits: ['close', 'attention-updated'],
  data() {
    return {
      loading: false,
      extendedPaymentEntity: false,
      extendedTransferEntity: false,
      newPaymentConfirmationData: {},
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
      queuesToTransfer: [],
      queueToTransfer: null,
      queue: {},
      booking: null,
      collaboratorsMap: {},
      attentionDetails: null,
      consentStatus: null,
      loadingConsentStatus: false,
      consentStatusInterval: null,
      alertError: '',
    };
  },
  beforeMount() {
    this.paymentTypes = getPaymentTypes();
    this.paymentMethods = getPaymentMethods();
    if (this.attention && this.attention.clientId && this.attention.commerceId) {
      this.loadConsentStatus();
      this.startConsentStatusPolling();
    }
  },
  watch: {
    attention: {
      handler(newVal) {
        if (newVal && newVal.clientId && newVal.commerceId) {
          this.loadConsentStatus();
          this.startConsentStatusPolling();
        } else {
          this.stopConsentStatusPolling();
        }
      },
      immediate: true,
      deep: true,
    },
  },
  computed: {
    attentionFullName() {
      if (!this.attention) return '';
      // Check for nested user object first (like bookings), then fall back to flat fields
      const name = this.attention.user?.name?.trim() || this.attention.userName?.trim() || '';
      const lastName =
        this.attention.user?.lastName?.trim() || this.attention.userLastName?.trim() || '';
      return `${name} ${lastName}`.trim() || 'N/I';
    },
    clientPhone() {
      if (!this.attention) return '';
      return this.attention.user?.phone || this.attention.userPhone || '';
    },
    clientEmail() {
      if (!this.attention) return '';
      return this.attention.user?.email || this.attention.userEmail || '';
    },
    clientIdNumber() {
      if (!this.attention) return '';
      return this.attention.user?.idNumber || this.attention.userIdNumber || '';
    },
  },
  methods: {
    closeModal() {
      this.$emit('close');
    },
    getDate(dateIn, timeZoneIn) {
      return getDate(dateIn, timeZoneIn);
    },
    copyAttention() {
      const textToCopy = jsonToCsv([this.attention]);
      navigator.clipboard.writeText(textToCopy);
    },
    formatIdNumber(idNumber) {
      return formatIdNumber(this.commerce, idNumber);
    },
    clasifyDaysSinceComment(score) {
      if (score === undefined) {
        return 'bi-qr-code blue-icon';
      } else if (score <= 90) {
        return 'bi-qr-code green-icon';
      } else if (score <= 180) {
        return 'bi-qr-code yellow-icon';
      } else {
        return 'bi-qr-code red-icon';
      }
    },
    showPaymentDetails() {
      this.extendedPaymentEntity = !this.extendedPaymentEntity;
      this.extendedTransferEntity = false;
      this.newPaymentConfirmationData = {
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
    async cancel() {
      try {
        this.loading = true;
        if (this.attention && this.attention.id) {
          await cancelAttention(this.attention.id);
          this.$emit('attention-updated');
          this.closeModal();
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
            this.$emit('attention-updated');
            this.extendedPaymentEntity = false;
            this.goToConfirm = false;
          }
        }
        this.loading = false;
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

        // Filter out current queue from available queues
        const currentQueueId = this.attention?.queueId;
        const queuesToTransfer = (this.queues || []).filter(queue => queue.id !== currentQueueId);

        if (!queuesToTransfer || queuesToTransfer.length === 0) {
          console.warn(
            '[AttentionDetailsModal] No queues available for transfer (after filtering current queue)',
          );
          this.queuesToTransfer = [];
          this.loading = false;
          return;
        }

        if (!this.commerce || !this.commerce.id) {
          console.warn(
            '[AttentionDetailsModal] Commerce not available, adding all queues (except current)',
          );
          // If commerce is not available, just add all queues except current
          this.queuesToTransfer = [...queuesToTransfer];
          this.loading = false;
          return;
        }

        try {
          const attentions = await getPendingCommerceAttentions(this.commerce.id);
          if (attentions && attentions.length > 0) {
            const groupedAttentions = attentions.reduce((acc, att) => {
              const type = att.queueId;
              if (!acc[type]) {
                acc[type] = [];
              }
              acc[type].push(att);
              return acc;
            }, {});
            let limit = 1;
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
                const attentionsReserved = attentionsByQueue
                  .filter(att => att.block) // Only process attentions with blocks
                  .map(attention => {
                    if (attention.block.blockNumbers && attention.block.blockNumbers.length > 0) {
                      return [...attention.block.blockNumbers];
                    } else if (
                      attention.block.number !== undefined &&
                      attention.block.number !== null
                    ) {
                      return [attention.block.number];
                    }
                    return [];
                  })
                  .filter(blocks => blocks.length > 0); // Remove empty arrays

                const totalBlocksReserved = attentionsReserved
                  .flat(Infinity)
                  .filter(b => b !== null && b !== undefined);

                if (totalBlocksReserved.length === 0) {
                  // No blocks reserved in this queue, allow transfer
                  this.queuesToTransfer.push(queue);
                  return;
                }

                const uniqueBlocksReserved = [...new Set(totalBlocksReserved)];
                const blockedBlocks = [];
                uniqueBlocksReserved.forEach(block => {
                  const times = totalBlocksReserved.filter(reserved => reserved === block).length;
                  if (times >= limit) {
                    blockedBlocks.push(block);
                  }
                });

                let blocksToCheck = [];
                if (this.attention.block) {
                  if (
                    this.attention.block.blockNumbers &&
                    this.attention.block.blockNumbers.length > 0
                  ) {
                    blocksToCheck = [...this.attention.block.blockNumbers];
                  } else if (
                    this.attention.block.number !== undefined &&
                    this.attention.block.number !== null
                  ) {
                    blocksToCheck = [this.attention.block.number];
                  }
                }

                // If attention has no blocks, allow transfer to this queue
                if (blocksToCheck.length === 0) {
                  this.queuesToTransfer.push(queue);
                } else {
                  // Check if any of the attention's blocks are available in this queue
                  // A block is available if it's not in the blockedBlocks list
                  const availableBlocks = blocksToCheck.filter(
                    block => !blockedBlocks.includes(block),
                  );
                  // If at least one block is available, allow transfer
                  if (availableBlocks.length > 0) {
                    this.queuesToTransfer.push(queue);
                  }
                }
              } else {
                // No pending attentions in this queue, allow transfer
                this.queuesToTransfer.push(queue);
              }
            });
          } else {
            // If no attentions, add all queues (except current)
            this.queuesToTransfer = [...queuesToTransfer];
          }
        } catch (error) {
          console.error('Error loading pending attentions:', error);
          // On error, add all queues (except current) as fallback
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
        this.$emit('attention-updated');
        this.extendedTransferEntity = false;
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

        this.alertError = this.$t('attention.lgpd.cannotAdvanceStage', {
          count: blockingCount,
          types: blockingTypes,
        });
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
        this.alertError = this.$t('attention.advanceStage.selectStage');
        return;
      }

      // Validate that the transition is still valid
      const validNextStages = this.getNextStages(this.attention.currentStage);
      if (!validNextStages.includes(this.selectedNextStage)) {
        this.alertError = this.$t('attention.advanceStage.invalidTransition');
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

        this.alertError = this.$t('attention.lgpd.cannotAdvanceStage', {
          count: blockingCount,
          types: blockingTypes,
        });
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
          this.$emit('attention-updated');
          this.goToAdvanceStage = false;
          this.selectedNextStage = '';
          this.stageNotes = '';
        }
        this.loading = false;
      } catch (error) {
        this.loading = false;
        // Better error handling with specific messages
        if (error.response?.status === 400) {
          // Validation error (invalid transition, etc.)
          this.alertError =
            error.response?.data?.message ||
            this.$t('attention.advanceStage.error.validation') ||
            'Transición de etapa inválida. Por favor, verifica y vuelve a intentar.';
        } else if (error.response?.status === 404) {
          this.alertError =
            this.$t('attention.advanceStage.error.notFound') ||
            'Atención no encontrada. Por favor, recarga la página.';
        } else if (error.response?.status === 403) {
          this.alertError =
            this.$t('attention.advanceStage.error.forbidden') ||
            'No tienes permisos para avanzar etapas.';
        } else if (error.response?.status === 409) {
          this.alertError =
            this.$t('attention.advanceStage.error.conflict') ||
            'La atención fue modificada por otro usuario. Por favor, recarga la página.';
        } else if (
          error.response?.status === 412 ||
          error.response?.data?.message?.includes('consentimiento')
        ) {
          // Error de consentimientos bloqueantes
          this.alertError =
            error.response?.data?.message || this.$t('attention.lgpd.cannotAdvanceStage');
        } else {
          this.alertError =
            error.response?.data?.message ||
            error.message ||
            this.$t('attention.advanceStage.error.generic') ||
            'Error al avanzar etapa. Por favor, intenta nuevamente.';
        }
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
      // Polling cada 10 segundos para atualização em tempo real
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
        if (data.proceduresTotalNumber !== undefined && data.proceduresTotalNumber >= 0) {
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
        if (data.confirmInstallments !== undefined) {
          this.newPaymentConfirmationData.confirmInstallments = data.confirmInstallments;
        }
        if (data.processPaymentNow === false) {
          this.errorsAdd = [];
        }
      }
    },
    canConfirmPayment() {
      // Can confirm if not already paid
      if (this.attention && this.attention.paid) {
        return false;
      }
      // Check permissions
      if (!this.toggles || !this.toggles['collaborator.attentions.confirm']) {
        return false;
      }
      // Check if payment feature is active
      const paymentFeatureActive = getActiveFeature(
        this.commerce,
        'attention-confirm-payment',
        'PRODUCT',
      );

      // If payment feature is not active, allow confirmation without payment
      if (!paymentFeatureActive) {
        return true;
      }

      // If processPaymentNow is true, validate payment fields
      if (this.newPaymentConfirmationData.processPaymentNow === true) {
        // Check if payment fields are filled
        const hasPaymentType =
          this.newPaymentConfirmationData.paymentType &&
          this.newPaymentConfirmationData.paymentType.length > 0;
        const hasPaymentMethod =
          this.newPaymentConfirmationData.paymentMethod &&
          this.newPaymentConfirmationData.paymentMethod.length > 0;
        const hasPaymentAmount =
          this.newPaymentConfirmationData.paymentAmount !== undefined &&
          this.newPaymentConfirmationData.paymentAmount !== null &&
          this.newPaymentConfirmationData.paymentAmount >= 0;
        return hasPaymentType && hasPaymentMethod && hasPaymentAmount;
      }
      // If processPaymentNow is false or undefined, can confirm without payment
      return true;
    },
    getQueueName(id) {
      if (id && this.queues && this.queues.length > 0) {
        const queuesFiltered = this.queues.filter(queue => queue.id === id);
        if (queuesFiltered && queuesFiltered.length > 0) {
          if (queuesFiltered[0] && queuesFiltered[0].id && queuesFiltered[0].name) {
            return queuesFiltered[0].name;
          }
        }
      }
    },
    async loadTimelineData() {
      console.log('[AttentionDetailsModal] loadTimelineData called');
      console.log('[AttentionDetailsModal] this.attention:', this.attention);
      console.log('[AttentionDetailsModal] this.attention type:', typeof this.attention);
      console.log('[AttentionDetailsModal] this.attention is null?', this.attention === null);
      console.log(
        '[AttentionDetailsModal] this.attention is undefined?',
        this.attention === undefined,
      );

      if (this.attention) {
        console.log('[AttentionDetailsModal] attention.id:', this.attention.id);
        console.log('[AttentionDetailsModal] attention.attentionId:', this.attention.attentionId);
        console.log('[AttentionDetailsModal] attention keys:', Object.keys(this.attention || {}));
        console.log('[AttentionDetailsModal] attention has id?', 'id' in (this.attention || {}));
        console.log(
          '[AttentionDetailsModal] attention has attentionId?',
          'attentionId' in (this.attention || {}),
        );
      }

      const attentionId = this.attention?.id || this.attention?.attentionId;
      console.log('[AttentionDetailsModal] resolved attentionId:', attentionId);

      if (!this.attention || !attentionId) {
        console.log('[AttentionDetailsModal] No attention or attention.id, skipping timeline load');
        console.log('[AttentionDetailsModal] attention:', this.attention);
        console.log('[AttentionDetailsModal] attentionId:', attentionId);
        return;
      }

      try {
        console.log('[AttentionDetailsModal] Loading timeline data for attention:', attentionId);
        // Load attention details with full stageHistory
        const attentionDetails = await getAttentionDetails(attentionId);
        console.log('[AttentionDetailsModal] Attention details loaded:', attentionDetails);
        console.log('[AttentionDetailsModal] Attention details has id?', attentionDetails?.id);
        console.log(
          '[AttentionDetailsModal] Attention details has stageHistory?',
          !!attentionDetails?.stageHistory,
        );
        console.log(
          '[AttentionDetailsModal] Attention details stageHistory length:',
          attentionDetails?.stageHistory?.length,
        );
        console.log(
          '[AttentionDetailsModal] Attention details keys:',
          Object.keys(attentionDetails || {}),
        );

        // Ensure attentionDetails has id (map attentionId to id if needed)
        if (attentionDetails && !attentionDetails.id && attentionDetails.attentionId) {
          attentionDetails.id = attentionDetails.attentionId;
        }

        // If attentionDetails doesn't have stageHistory, try to get it from the original attention
        if (attentionDetails && !attentionDetails.stageHistory && this.attention?.stageHistory) {
          console.log('[AttentionDetailsModal] Using stageHistory from original attention');
          attentionDetails.stageHistory = this.attention.stageHistory;
        }

        this.attentionDetails = attentionDetails;

        // Load booking if exists
        if (attentionDetails.bookingId) {
          try {
            this.booking = await getBookingDetails(attentionDetails.bookingId);
          } catch (error) {
            console.error('Error loading booking:', error);
            this.booking = null;
          }
        } else {
          this.booking = null;
        }

        // Build collaborators map from stageHistory and attention
        const collaboratorsMap = {};

        // Add main collaborator
        if (attentionDetails.collaboratorId) {
          try {
            const collaborator = await getCollaboratorById(attentionDetails.collaboratorId);
            if (collaborator) {
              collaboratorsMap[attentionDetails.collaboratorId] =
                collaborator.name || collaborator.alias || attentionDetails.collaboratorId;
            }
          } catch (error) {
            console.error('Error loading main collaborator:', error);
          }
        }

        // Add collaborators from stageHistory
        if (attentionDetails.stageHistory && Array.isArray(attentionDetails.stageHistory)) {
          const uniqueCollaboratorIds = new Set();
          attentionDetails.stageHistory.forEach(entry => {
            if (entry.enteredBy) uniqueCollaboratorIds.add(entry.enteredBy);
            if (entry.exitedBy) uniqueCollaboratorIds.add(entry.exitedBy);
          });

          // Load all unique collaborators
          const collaboratorPromises = Array.from(uniqueCollaboratorIds).map(
            async collaboratorId => {
              if (!collaboratorsMap[collaboratorId]) {
                try {
                  const collaborator = await getCollaboratorById(collaboratorId);
                  if (collaborator) {
                    collaboratorsMap[collaboratorId] =
                      collaborator.name || collaborator.alias || collaboratorId;
                  } else {
                    collaboratorsMap[collaboratorId] = collaboratorId;
                  }
                } catch (error) {
                  console.error(`Error loading collaborator ${collaboratorId}:`, error);
                  collaboratorsMap[collaboratorId] = collaboratorId;
                }
              }
            },
          );

          await Promise.allSettled(collaboratorPromises);
        }

        this.collaboratorsMap = collaboratorsMap;
      } catch (error) {
        console.error('Error loading timeline data:', error);
        this.attentionDetails = null;
        this.booking = null;
        this.collaboratorsMap = {};
      }
    },
    getTimelineAttention() {
      // Use attentionDetails if available, otherwise use attention
      const att = this.attentionDetails || this.attention;
      if (!att) return null;

      // Ensure it has an id field (map attentionId to id if needed)
      if (!att.id && att.attentionId) {
        return { ...att, id: att.attentionId };
      }

      return att;
    },
    canCancelAttention(attention) {
      if (!attention) return false;
      // If no status property, allow cancellation (for backwards compatibility)
      if (!attention.status) return true;
      // Can cancel if status is not already cancelled or terminated
      const cancelledStatuses = [
        ATTENTION_STATUS.CANCELLED,
        ATTENTION_STATUS.USER_CANCELLED,
        ATTENTION_STATUS.TERMINATED,
      ];
      return !cancelledStatuses.includes(attention.status);
    },
  },
  watch: {
    show(newVal) {
      console.log('[AttentionDetailsModal] show changed:', newVal);
      if (newVal) {
        document.body.style.overflow = 'hidden';
        console.log('[AttentionDetailsModal] Modal opened, calling loadTimelineData');
        this.loadTimelineData();
      } else {
        document.body.style.overflow = '';
      }
    },
    attention: {
      handler(newVal, oldVal) {
        console.log('[AttentionDetailsModal] attention changed');
        console.log('[AttentionDetailsModal] newVal:', newVal);
        console.log('[AttentionDetailsModal] oldVal:', oldVal);
        console.log('[AttentionDetailsModal] this.show:', this.show);
        if (newVal && this.show) {
          console.log(
            '[AttentionDetailsModal] Attention changed and modal is open, calling loadTimelineData',
          );
          this.loadTimelineData();
        }
      },
      immediate: true,
    },
  },
  beforeUnmount() {
    document.body.style.overflow = '';
    // Clean up polling interval
    this.stopConsentStatusPolling();
  },
};
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="show" class="attention-modal-overlay" @click.self="closeModal">
        <div
          class="modal-dialog modal-dialog-scrollable modal-lg attention-modal-dialog"
          @click.stop
        >
          <div class="modal-content attention-modal-content">
            <!-- Modal Header -->
            <div class="modal-header">
              <h5 class="modal-title" id="attentionDetailsModalLabel">
                <i class="bi bi-qr-code"></i>
                {{ $t('dashboard.attentionDetails') || 'Detalles del Atendimiento' }}
              </h5>
              <button
                type="button"
                class="btn-close"
                @click="closeModal"
                aria-label="Close"
              ></button>
            </div>

            <!-- Modal Body -->
            <div class="modal-body">
              <Spinner :show="loading"></Spinner>

              <!-- Client Info Section - Matching Booking Style -->
              <div class="attention-client-info">
                <div class="attention-client-header">
                  <div class="attention-client-name-section">
                    <div class="attention-client-avatar">
                      <i class="bi bi-person-circle"></i>
                    </div>
                    <div class="attention-client-details">
                      <span class="attention-client-name">{{ attentionFullName }}</span>
                      <button class="btn-copy-mini" @click="copyAttention()" title="Copiar datos">
                        <i class="bi bi-file-earmark-spreadsheet"></i>
                      </button>
                      <button
                        v-if="attention && canCancelAttention(attention)"
                        class="btn btn-sm btn-size fw-bold btn-danger rounded-pill px-3 card-action"
                        @click="goCancel()"
                        :disabled="!toggles || !toggles['collaborator.attentions.cancel']"
                        title="Cancelar atención"
                      >
                        <i class="bi bi-person-x-fill"></i>
                        {{ $t('collaboratorBookingsView.cancel') }}
                      </button>
                    </div>
                  </div>
                </div>
                <div class="attention-client-contact">
                  <a
                    class="attention-contact-item whatsapp-item"
                    :href="'https://wa.me/' + clientPhone"
                    target="_blank"
                  >
                    <div class="contact-icon-wrapper whatsapp-bg">
                      <i class="bi bi-whatsapp"></i>
                    </div>
                    <span class="contact-text">{{ clientPhone || 'N/I' }}</span>
                  </a>
                  <a
                    class="attention-contact-item email-item"
                    :href="'mailto:' + clientEmail"
                    target="_blank"
                  >
                    <div class="contact-icon-wrapper email-bg">
                      <i class="bi bi-envelope"></i>
                    </div>
                    <span class="contact-text">{{ clientEmail || 'N/I' }}</span>
                  </a>
                  <div class="attention-contact-item id-item">
                    <div class="contact-icon-wrapper id-bg">
                      <i class="bi bi-person-vcard"></i>
                    </div>
                    <span class="contact-text">{{ formatIdNumber(clientIdNumber) || 'N/I' }}</span>
                  </div>
                </div>
              </div>

              <!-- Attention Context Info -->
              <div
                v-if="
                  attention.queueName ||
                  attention.collaboratorName ||
                  (attention.servicesDetails && attention.servicesDetails.length > 0) ||
                  attention.createdDate
                "
                class="attention-context-info-compact"
              >
                <div v-if="attention.queueName" class="attention-context-item-inline">
                  <i class="bi bi-person-lines-fill"></i>
                  <span class="attention-context-label-inline">Fila</span>
                  <span class="attention-context-value-inline">{{
                    attention.queueName || 'N/I'
                  }}</span>
                </div>
                <div v-if="attention.collaboratorName" class="attention-context-item-inline">
                  <i class="bi bi-person-fill"></i>
                  <span class="attention-context-label-inline">Colaborador</span>
                  <span class="attention-context-value-inline">{{
                    attention.collaboratorName || 'N/I'
                  }}</span>
                </div>
                <div v-if="attention.createdDate" class="attention-context-item-inline">
                  <i class="bi bi-calendar-event"></i>
                  <span class="attention-context-label-inline">Fecha</span>
                  <span class="attention-context-value-inline">{{
                    getDate(attention.createdDate)
                  }}</span>
                </div>
                <div
                  v-if="attention.servicesDetails && attention.servicesDetails.length > 0"
                  class="attention-context-item-inline"
                >
                  <i class="bi bi-scissors"></i>
                  <span class="attention-context-label-inline">Servicio(s)</span>
                  <span class="attention-context-value-inline">
                    {{ attention.servicesDetails.map(s => s.name).join(', ') }}
                  </span>
                </div>
                <div
                  v-if="attention.daysSinceAttention !== undefined"
                  class="attention-context-item-inline"
                >
                  <i
                    :class="`bi ${clasifyDaysSinceComment(attention.daysSinceAttention || 0)}`"
                  ></i>
                  <span class="attention-context-label-inline">Días desde atención</span>
                  <span class="attention-context-value-inline">{{
                    attention.daysSinceAttention || 0
                  }}</span>
                </div>
              </div>

              <div class="attention-divider"></div>

              <!-- Payment Data Section -->
              <div
                v-if="attention.paid !== undefined && attention.paid === true"
                class="attention-confirmation-badges"
              >
                <div class="attention-confirmation-header">
                  <i class="bi bi-check-circle-fill"></i>
                  <span>{{
                    $t('collaboratorBookingsView.paymentData') || 'Dados de Pagamento'
                  }}</span>
                </div>
                <div class="attention-confirmation-tags">
                  <span v-if="attention.paymentType" class="badge-mini confirmation-tag">
                    {{ $t(`paymentTypes.${attention.paymentType}`) }}
                  </span>
                  <span v-if="attention.paymentMethod" class="badge-mini confirmation-tag">
                    {{ $t(`paymentClientMethods.${attention.paymentMethod}`) }}
                  </span>
                  <span
                    v-if="attention.paymentAmount"
                    class="badge-mini confirmation-tag payment-amount"
                  >
                    <i class="bi bi-coin"></i>
                    {{ attention.paymentAmount }}
                  </span>
                  <span
                    v-if="attention.paymentCommission"
                    class="badge-mini confirmation-tag payment-commission"
                  >
                    <i class="bi bi-coin"></i>
                    {{ attention.paymentCommission }}
                  </span>
                </div>
              </div>

              <!-- Survey Data Section -->
              <div v-if="attention.rating || attention.nps" class="attention-confirmation-badges">
                <div class="attention-confirmation-header">
                  <i class="bi bi-star-fill"></i>
                  <span>{{ $t('dashboard.surveyData') || 'Dados da Pesquisa' }}</span>
                </div>
                <div class="attention-confirmation-tags">
                  <span v-if="attention.rating" class="badge-mini confirmation-tag">
                    <i class="bi bi-star-fill yellow-icon"></i>
                    CSAT: {{ attention.rating }}
                  </span>
                  <span v-if="attention.nps" class="badge-mini confirmation-tag">
                    <i class="bi bi-emoji-smile-fill blue-icon"></i>
                    NPS: {{ attention.nps }}
                  </span>
                </div>
              </div>

              <!-- Stage History Section -->
              <div
                v-if="
                  getActiveFeature(commerce, 'attention-stages-enabled', 'PRODUCT') &&
                  attention.stageHistory &&
                  Array.isArray(attention.stageHistory) &&
                  attention.stageHistory.length > 0
                "
                class="attention-stage-history-section"
              >
                <div class="attention-confirmation-header">
                  <i class="bi bi-clock-history"></i>
                  <span>{{ $t('attention.stageHistory') || 'Historial de Etapas' }}</span>
                </div>
                <div class="stage-history-timeline">
                  <div
                    v-for="(historyEntry, index) in attention.stageHistory"
                    :key="index"
                    class="stage-history-item"
                    :class="{
                      'stage-history-active':
                        historyEntry.stage === attention.currentStage && !historyEntry.exitedAt,
                    }"
                  >
                    <div class="stage-history-dot"></div>
                    <div class="stage-history-content">
                      <div class="stage-history-stage">
                        <span class="badge-mini stage-badge-history">{{
                          $t(`attention.stage.${historyEntry.stage}`)
                        }}</span>
                        <span
                          v-if="historyEntry.stage === attention.currentStage"
                          class="stage-current-indicator"
                        >
                          {{ $t('attention.current') || 'Actual' }}
                        </span>
                      </div>
                      <div class="stage-history-details">
                        <span v-if="historyEntry.enteredAt" class="stage-history-time">
                          <i class="bi bi-calendar-event"></i>
                          {{ getDate(historyEntry.enteredAt) }}
                        </span>
                        <span v-if="historyEntry.enteredBy" class="stage-history-user">
                          <i class="bi bi-person-fill"></i>
                          {{ historyEntry.enteredBy }}
                        </span>
                        <span
                          v-if="
                            historyEntry.duration !== undefined && historyEntry.duration !== null
                          "
                          class="stage-history-duration"
                        >
                          <i class="bi bi-stopwatch"></i>
                          {{ Math.round(historyEntry.duration) }} min
                        </span>
                      </div>
                      <div v-if="historyEntry.notes" class="stage-history-notes">
                        <i class="bi bi-chat-left-text"></i>
                        {{ historyEntry.notes }}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Action Buttons -->
              <div class="attention-actions-tabs">
                <button
                  v-if="
                    getActiveFeature(commerce, 'attention-confirm-payment', 'PRODUCT') &&
                    !attention.paid
                  "
                  class="attention-action-tab"
                  :class="{ 'attention-action-tab-active': extendedPaymentEntity }"
                  @click.prevent="showPaymentDetails()"
                >
                  <i class="bi bi-cash-coin"></i>
                  <span>{{ $t('collaboratorBookingsView.paymentConfirm') }}</span>
                  <i
                    :class="`bi ${extendedPaymentEntity ? 'bi-chevron-up' : 'bi-chevron-down'}`"
                  ></i>
                </button>
                <button
                  v-if="getActiveFeature(commerce, 'attention-transfer-queue', 'PRODUCT')"
                  class="attention-action-tab"
                  :class="{ 'attention-action-tab-active': extendedTransferEntity }"
                  @click.prevent="showTransferDetails()"
                >
                  <i class="bi bi-arrow-left-right"></i>
                  <span>{{ $t('collaboratorBookingsView.transferQueue') }}</span>
                  <i
                    :class="`bi ${extendedTransferEntity ? 'bi-chevron-up' : 'bi-chevron-down'}`"
                  ></i>
                </button>
                <button
                  v-if="
                    getActiveFeature(commerce, 'attention-stages-enabled', 'PRODUCT') &&
                    attention.currentStage &&
                    getNextStages(attention.currentStage).length > 0
                  "
                  class="attention-action-tab"
                  :class="{
                    'attention-action-tab-active': goToAdvanceStage,
                    'attention-action-tab-disabled': hasBlockingConsents(),
                  }"
                  :disabled="hasBlockingConsents()"
                  @click.prevent="goAdvanceStage()"
                  :title="
                    hasBlockingConsents()
                      ? $t('attention.lgpd.cannotAdvanceStage', {
                          count: getBlockingConsentsCount(),
                        })
                      : ''
                  "
                >
                  <i class="bi bi-arrow-right-circle"></i>
                  <span>{{ $t('attention.advanceStage') || 'Avanzar Etapa' }}</span>
                  <i v-if="hasBlockingConsents()" class="bi bi-shield-exclamation text-danger"></i>
                  <i
                    v-else
                    :class="`bi ${goToAdvanceStage ? 'bi-chevron-up' : 'bi-chevron-down'}`"
                  ></i>
                </button>
              </div>

              <!-- PAYMENT -->
              <Transition name="slide-fade">
                <div
                  v-if="
                    extendedPaymentEntity &&
                    getActiveFeature(commerce, 'attention-confirm-payment', 'PRODUCT')
                  "
                  class="attention-action-section"
                >
                  <div class="attention-action-content">
                    <div v-if="!attention.paid" class="attention-action-form">
                      <div class="attention-action-header">
                        <i class="bi bi-cash-coin"></i>
                        <span>{{ $t('collaboratorBookingsView.paymentConfirm') }}</span>
                      </div>
                      <PaymentForm
                        :id="attention.id"
                        :commerce="commerce"
                        :client-id="attention.clientId"
                        :service-id="
                          attention.servicesId && attention.servicesId.length > 0
                            ? attention.servicesId[0]
                            : undefined
                        "
                        :confirm-payment="
                          getActiveFeature(commerce, 'attention-confirm-payment', 'PRODUCT')
                        "
                        :errors-add="errorsAdd"
                        :receive-data="receiveData"
                      >
                      </PaymentForm>
                      <div class="attention-action-buttons">
                        <button
                          class="btn btn-sm btn-size fw-bold btn-primary rounded-pill px-3 card-action"
                          @click="goConfirm()"
                          :disabled="!canConfirmPayment()"
                        >
                          <i class="bi bi-person-check-fill"></i>
                          {{ $t('collaboratorBookingsView.confirm') }}
                        </button>
                      </div>
                      <AreYouSure
                        :show="goToConfirm"
                        :yes-disabled="!toggles || !toggles['collaborator.attentions.confirm']"
                        :no-disabled="!toggles || !toggles['collaborator.attentions.confirm']"
                        @actionYes="confirm()"
                        @actionNo="confirmCancel()"
                      >
                      </AreYouSure>
                    </div>
                    <div v-else class="attention-action-message">
                      <Message
                        :title="$t('collaboratorBookingsView.message.8.title')"
                        :content="$t('collaboratorBookingsView.message.8.content')"
                      />
                    </div>
                  </div>
                </div>
              </Transition>

              <!-- TRANSFER -->
              <Transition name="slide-fade">
                <div
                  v-if="
                    extendedTransferEntity &&
                    getActiveFeature(commerce, 'attention-transfer-queue', 'PRODUCT')
                  "
                  class="attention-action-section"
                >
                  <div class="attention-action-content">
                    <div
                      v-if="queuesToTransfer && queuesToTransfer.length > 0"
                      class="attention-action-form"
                    >
                      <div class="attention-action-header">
                        <i class="bi bi-arrow-left-right"></i>
                        <span>{{ $t('collaboratorBookingsView.transferQueue') }}</span>
                      </div>
                      <div class="attention-transfer-selector">
                        <div class="attention-queue-info">
                          <span class="attention-queue-label">{{
                            $t('collaboratorBookingsView.selectQueueToTransfer')
                          }}</span>
                          <div class="attention-queue-current">
                            <i class="bi bi-arrow-right"></i>
                            <span class="fw-bold">{{ queue.name }}</span>
                          </div>
                        </div>
                        <select
                          class="attention-select-modern"
                          aria-label="form-select-sm"
                          v-model="queueToTransfer"
                        >
                          <option
                            v-for="queue in queuesToTransfer"
                            :key="queue.id"
                            :value="queue.id"
                          >
                            {{ queue.name }}
                          </option>
                        </select>
                      </div>
                      <div class="attention-action-buttons">
                        <button
                          class="btn btn-sm btn-size fw-bold btn-primary rounded-pill px-3 card-action"
                          @click="goTransfer()"
                          :disabled="
                            !queueToTransfer ||
                            loading ||
                            !toggles ||
                            !toggles['collaborator.attentions.transfer']
                          "
                        >
                          <i class="bi bi-person-check-fill"></i>
                          {{ $t('collaboratorBookingsView.transfer') }}
                        </button>
                      </div>
                      <AreYouSure
                        :show="goToTransfer"
                        :yes-disabled="!toggles || !toggles['collaborator.attentions.transfer']"
                        :no-disabled="!toggles || !toggles['collaborator.attentions.transfer']"
                        @actionYes="transfer()"
                        @actionNo="cancelTransfer()"
                      >
                      </AreYouSure>
                    </div>
                    <div v-else class="attention-action-message">
                      <Message
                        :title="$t('collaboratorBookingsView.message.6.title')"
                        :content="$t('collaboratorBookingsView.message.6.content')"
                      />
                    </div>
                  </div>
                </div>
              </Transition>

              <!-- ADVANCE STAGE -->
              <Transition name="slide-fade">
                <div
                  v-if="
                    goToAdvanceStage &&
                    getActiveFeature(commerce, 'attention-stages-enabled', 'PRODUCT') &&
                    attention.currentStage
                  "
                  class="attention-action-section"
                >
                  <div class="attention-action-content">
                    <div
                      v-if="getNextStages(attention.currentStage).length > 0"
                      class="attention-action-form"
                    >
                      <div class="attention-action-header">
                        <i class="bi bi-arrow-right-circle"></i>
                        <span>{{ $t('attention.advanceStage') || 'Avanzar Etapa' }}</span>
                      </div>
                      <div class="attention-stage-selector">
                        <div class="attention-stage-info">
                          <span class="attention-stage-label">{{
                            $t('attention.advanceStage.selectNext') ||
                            'Selecciona la siguiente etapa'
                          }}</span>
                          <div class="attention-stage-current">
                            <i class="bi bi-arrow-right"></i>
                            <span class="fw-bold">{{
                              $t(`attention.stage.${attention.currentStage}`)
                            }}</span>
                          </div>
                        </div>
                        <select
                          class="attention-select-modern"
                          aria-label="Select next stage"
                          v-model="selectedNextStage"
                        >
                          <option value="">
                            {{ $t('attention.advanceStage.select') || 'Selecciona...' }}
                          </option>
                          <option
                            v-for="stage in getNextStages(attention.currentStage)"
                            :key="stage"
                            :value="stage"
                          >
                            {{ $t(`attention.stage.${stage}`) }}
                          </option>
                        </select>
                        <div class="attention-stage-notes mt-2">
                          <label class="form-label">{{
                            $t('attention.advanceStage.notes') || 'Notas (opcional)'
                          }}</label>
                          <textarea
                            class="form-control"
                            v-model="stageNotes"
                            :placeholder="
                              $t('attention.advanceStage.notesPlaceholder') ||
                              'Agregar notas sobre esta transición...'
                            "
                            rows="3"
                          ></textarea>
                        </div>
                      </div>
                      <div class="attention-action-buttons">
                        <button
                          class="btn btn-sm btn-size fw-bold btn-primary rounded-pill px-3 card-action"
                          :class="{ 'btn-danger': hasBlockingConsents() }"
                          @click="confirmAdvanceStage()"
                          :disabled="!selectedNextStage || loading || hasBlockingConsents()"
                          :title="
                            hasBlockingConsents()
                              ? $t('attention.lgpd.cannotAdvanceStage', {
                                  count: getBlockingConsentsCount(),
                                })
                              : ''
                          "
                        >
                          <i class="bi bi-arrow-right-circle-fill"></i>
                          {{ $t('attention.advanceStage.confirm') || 'Avanzar' }}
                        </button>
                        <div v-if="hasBlockingConsents()" class="alert alert-danger mt-2 mb-0">
                          <i class="bi bi-shield-exclamation"></i>
                          {{
                            $t('attention.lgpd.cannotAdvanceStage', {
                              count: getBlockingConsentsCount(),
                            }) ||
                            `No se puede avanzar: faltan ${getBlockingConsentsCount()} consentimiento(s) bloqueante(s)`
                          }}
                        </div>
                      </div>
                      <AreYouSure
                        :show="goToAdvanceStage && selectedNextStage"
                        :yes-disabled="!selectedNextStage || loading"
                        :no-disabled="!selectedNextStage || loading"
                        @actionYes="confirmAdvanceStage()"
                        @actionNo="cancelAdvanceStage()"
                      >
                      </AreYouSure>
                    </div>
                    <div v-else class="attention-action-message">
                      <Message
                        :title="
                          $t('attention.advanceStage.noNextStages.title') ||
                          'No hay siguientes etapas'
                        "
                        :content="
                          $t('attention.advanceStage.noNextStages.content') ||
                          'Esta atención ya está en la etapa final o no hay etapas siguientes disponibles.'
                        "
                      />
                    </div>
                  </div>
                </div>
              </Transition>

              <!-- Timeline Section -->
              <div
                v-if="attention && (attention.id || attention.attentionId)"
                class="attention-timeline-section"
              >
                <AttentionTimeline
                  :attention="getTimelineAttention()"
                  :booking="booking"
                  :commerce="commerce"
                  :collaborators-map="collaboratorsMap"
                />
              </div>

              <!-- Actions Footer -->
              <div class="attention-actions-footer" v-if="!loading">
                <div class="attention-actions-confirmations">
                  <AreYouSure
                    :show="goToCancel"
                      :yes-disabled="!toggles || !toggles['collaborator.attentions.cancel']"
                      :no-disabled="!toggles || !toggles['collaborator.attentions.cancel']"
                    @actionYes="cancel()"
                    @actionNo="cancelCancel()"
                  >
                  </AreYouSure>
                </div>
              </div>

              <!-- Metadata Footer -->
              <div class="attention-metadata-footer">
                <span class="metric-card-details"
                  ><strong>Id:</strong> {{ attention.attentionId || attention.id }}</span
                >
                <span class="metric-card-details"
                  ><strong>Date:</strong> {{ getDate(attention.createdDate) }}</span
                >
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Modal Overlay */
.attention-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  display: flex;
  justify-content: center;
  padding: 1rem;
}

/* Modal Dialog - Matching Booking Style */
.attention-modal-dialog {
  max-width: 1200px !important;
  width: 95vw !important;
}

.attention-modal-content {
  border-radius: 0.5rem !important;
  box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.175) !important;
}

/* Modal Header - Matching Booking Style */
.modal-header {
  background: linear-gradient(
    135deg,
    var(--azul-turno, #004aad) 0%,
    var(--verde-tu, #00c2cb) 100%
  ) !important;
  color: white !important;
  border-bottom: none !important;
  padding: 1rem 1.25rem !important;
  border-radius: 0.5rem 0.5rem 0 0 !important;
}

.modal-title {
  color: white !important;
  font-weight: 700 !important;
  margin: 0 !important;
  display: flex !important;
  align-items: center !important;
  gap: 0.5rem !important;
}

.modal-title i {
  color: white !important;
  font-size: 1.125rem !important;
}

.btn-close {
  filter: invert(1) grayscale(100%) brightness(200%) !important;
  opacity: 0.9 !important;
}

.btn-close:hover {
  opacity: 1 !important;
}

/* Modal Body */
.modal-body {
  background: #f8f9fa !important;
  padding: 1.25rem !important;
}

/* Client Info Section - Matching Booking Style */
.attention-client-info {
  margin-bottom: 0.5rem;
  padding: 0.625rem 0.75rem;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.attention-client-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.375rem;
  padding-bottom: 0.375rem;
  border-bottom: 1px solid rgba(169, 169, 169, 0.2);
}

.attention-client-name-section {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.attention-client-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: rgba(0, 194, 203, 0.12);
  border-radius: 6px;
  flex-shrink: 0;
}

.attention-client-avatar i {
  font-size: 1.125rem;
  color: #00c2cb;
}

.attention-client-details {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex: 1;
  min-width: 0;
}

.attention-client-name {
  font-size: 0.875rem;
  font-weight: 700;
  color: #000000;
  line-height: 1.3;
  letter-spacing: -0.01em;
  flex: 1;
  min-width: 0;
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

.attention-timeline-section {
  width: 100%;
  margin-top: 0.75rem;
  margin-bottom: 0.75rem;
}

.attention-client-contact {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  margin-top: 0.25rem;
}

.attention-contact-item {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.625rem;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-radius: 6px;
  text-decoration: none;
  color: rgba(0, 0, 0, 0.7);
  transition: all 0.2s ease;
  cursor: pointer;
}

.attention-contact-item:hover {
  background: rgba(255, 255, 255, 1);
  border-color: rgba(0, 194, 203, 0.3);
  text-decoration: none;
  color: rgba(0, 0, 0, 0.85);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 194, 203, 0.1);
}

.contact-icon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  flex-shrink: 0;
}

.whatsapp-bg {
  background: rgba(37, 211, 102, 0.12);
  color: #25d366;
}

.email-bg {
  background: rgba(0, 122, 255, 0.12);
  color: #007aff;
}

.id-bg {
  background: rgba(0, 194, 203, 0.12);
  color: #00c2cb;
}

.contact-icon-wrapper i {
  font-size: 0.7rem;
}

.contact-text {
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
  line-height: 1.3;
  letter-spacing: -0.01em;
}

.whatsapp-item:hover .whatsapp-bg {
  background: rgba(37, 211, 102, 0.25);
}

.email-item:hover .email-bg {
  background: rgba(0, 122, 255, 0.25);
}

.id-item:hover .id-bg {
  background: rgba(0, 194, 203, 0.2);
}

.attention-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(169, 169, 169, 0.2), transparent);
  margin: 0.5rem 0;
}

/* Context Info - Matching Booking Style */
.attention-context-info-compact {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-radius: 6px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.attention-context-item-inline {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-shrink: 0;
}

.attention-context-item-inline i {
  color: #00c2cb;
  font-size: 0.8125rem;
  flex-shrink: 0;
}

.attention-context-label-inline {
  font-size: 0.625rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.attention-context-value-inline {
  font-size: 0.75rem;
  font-weight: 700;
  color: #000000;
  line-height: 1.2;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

/* Confirmation Badges - Matching Booking Style */
.attention-confirmation-badges {
  margin-bottom: 0.5rem;
  padding: 0.625rem 0.75rem;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.attention-confirmation-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.375rem;
  padding-bottom: 0.375rem;
  border-bottom: 1px solid rgba(169, 169, 169, 0.2);
  font-size: 0.75rem;
  font-weight: 700;
  color: #000000;
  letter-spacing: -0.01em;
}

.attention-confirmation-header i {
  color: #00c2cb;
  font-size: 1rem;
}

.attention-confirmation-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.confirmation-tag {
  background: rgba(169, 169, 169, 0.15);
  color: rgba(0, 0, 0, 0.7);
  padding: 0.375rem 0.625rem;
  border-radius: 6px;
  font-size: 0.6875rem;
  font-weight: 600;
  border: 1px solid rgba(169, 169, 169, 0.2);
}

.confirmation-tag.payment-amount {
  background: rgba(0, 194, 203, 0.12);
  color: #00c2cb;
  border-color: rgba(0, 194, 203, 0.25);
}

.confirmation-tag.payment-commission {
  background: rgba(249, 195, 34, 0.12);
  color: #f9c322;
  border-color: rgba(249, 195, 34, 0.25);
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

/* Metadata Footer */
.attention-metadata-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(169, 169, 169, 0.2);
  font-size: 0.6875rem;
  color: rgba(0, 0, 0, 0.5);
}

.metric-card-details {
  font-size: 0.6875rem;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.5);
}

.metric-card-details strong {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
}

/* Icon Colors */
.yellow-icon {
  color: var(--amarillo-star);
}

.blue-icon {
  color: var(--azul-turno);
}

.green-icon {
  color: var(--verde-tu);
}

.red-icon {
  color: var(--rojo-warning);
}

/* Modal Transitions */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-active .attention-modal-dialog,
.modal-fade-leave-active .attention-modal-dialog {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .attention-modal-dialog,
.modal-fade-leave-to .attention-modal-dialog {
  transform: scale(0.9) translateY(-20px);
  opacity: 0;
}

.modal-fade-enter-to .attention-modal-dialog,
.modal-fade-leave-from .attention-modal-dialog {
  transform: scale(1) translateY(0);
  opacity: 1;
}

/* Action Tabs - Matching Booking Style */
.attention-actions-tabs {
  display: flex;
  gap: 0.375rem;
  margin-bottom: 0.5rem;
  padding: 0.375rem;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(169, 169, 169, 0.15);
  border-radius: 8px;
  flex-wrap: wrap;
}

.attention-action-tab {
  flex: 1;
  min-width: 90px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.375rem 0.625rem;
  font-size: 0.6875rem;
  font-weight: 600;
  line-height: 1.2;
  color: #004aad;
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.15) 0%, rgba(0, 194, 203, 0.08) 100%);
  border: 1px solid rgba(0, 74, 173, 0.25);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: -0.01em;
}

.attention-action-tab:hover {
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.2) 0%, rgba(0, 194, 203, 0.1) 100%);
  border-color: rgba(0, 74, 173, 0.4);
  color: #004aad;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 74, 173, 0.15);
}

.attention-action-tab-active {
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.25) 0%, rgba(0, 194, 203, 0.15) 100%);
  color: #004aad;
  border-color: rgba(0, 74, 173, 0.4);
  box-shadow: 0 2px 8px rgba(0, 74, 173, 0.2);
}

.attention-action-tab-disabled {
  opacity: 0.6;
  cursor: not-allowed !important;
  background: linear-gradient(
    135deg,
    rgba(220, 53, 69, 0.1) 0%,
    rgba(220, 53, 69, 0.05) 100%
  ) !important;
  border-color: rgba(220, 53, 69, 0.3) !important;
  color: #dc3545 !important;
}

.attention-action-tab-disabled:hover {
  background: linear-gradient(
    135deg,
    rgba(220, 53, 69, 0.15) 0%,
    rgba(220, 53, 69, 0.08) 100%
  ) !important;
  border-color: rgba(220, 53, 69, 0.4) !important;
}

.attention-action-tab span {
  line-height: 1.2;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

.attention-action-tab i:first-child {
  font-size: 0.75rem;
  flex-shrink: 0;
}

.attention-action-tab i:last-child {
  font-size: 0.625rem;
  margin-left: auto;
  flex-shrink: 0;
}

/* Action Section Container */
.attention-action-section {
  margin-bottom: 0.5rem;
  min-height: 180px;
  display: flex;
  flex-direction: column;
}

.attention-action-section:last-child {
  margin-bottom: 0;
}

.attention-action-content {
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-radius: 8px;
  padding: 0.625rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  min-height: 180px;
  display: flex;
  flex-direction: column;
}

.attention-action-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.625rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(169, 169, 169, 0.2);
  font-size: 0.8125rem;
  font-weight: 700;
  color: #000000;
  letter-spacing: -0.01em;
}

.attention-action-header i {
  color: #00c2cb;
  font-size: 0.9375rem;
}

.attention-action-form {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  flex: 1;
}

.attention-action-message {
  padding: 1rem 0;
}

.attention-action-buttons {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding-top: 0.625rem;
  border-top: 1px solid rgba(169, 169, 169, 0.2);
  justify-content: center;
  align-items: center;
}

/* Transfer Section */
.attention-transfer-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.attention-queue-info {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.attention-queue-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
}

.attention-queue-current {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.625rem;
  background: rgba(0, 194, 203, 0.08);
  border: 1px solid rgba(0, 194, 203, 0.2);
  border-radius: 6px;
  font-size: 0.75rem;
  color: #00c2cb;
}

.attention-queue-current i {
  font-size: 0.875rem;
}

.attention-select-modern {
  padding: 0.5rem 0.75rem;
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.95);
  font-size: 0.8125rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
  transition: all 0.2s ease;
  cursor: pointer;
}

.attention-select-modern:hover {
  border-color: rgba(0, 194, 203, 0.3);
  background: rgba(255, 255, 255, 1);
}

.attention-select-modern:focus {
  outline: none;
  border-color: #00c2cb;
  box-shadow: 0 0 0 3px rgba(0, 194, 203, 0.1);
}

/* Actions Footer */
.attention-actions-footer {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(169, 169, 169, 0.2);
}

.attention-actions-buttons {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  flex-wrap: wrap;
}

.attention-actions-buttons .card-action {
  flex: 0 0 auto;
  min-width: 120px;
}

.attention-actions-confirmations {
  width: 100%;
}

.card-action {
  padding: 0.5rem 1rem !important;
  font-size: 0.75rem !important;
  margin-top: 0.5rem !important;
  margin-bottom: 0.5rem !important;
  border-radius: 6px !important;
  border: 1px solid rgba(169, 169, 169, 0.2) !important;
  transition: all 0.2s ease !important;
}

.card-action:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.card-action i {
  font-size: 0.75rem;
}

/* Slide Fade Transition */
.slide-fade-enter-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-fade-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-fade-enter-from {
  opacity: 0;
  transform: translateY(-10px);
  max-height: 0;
  margin-bottom: 0;
}

.slide-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
  max-height: 0;
  margin-bottom: 0;
}

.slide-fade-enter-to,
.slide-fade-leave-from {
  opacity: 1;
  transform: translateY(0);
  max-height: 1000px;
}

/* Stage Info Section */
.attention-stage-info-compact {
  margin-bottom: 0.5rem;
  padding: 0.625rem 0.75rem;
  background: rgba(0, 194, 203, 0.08);
  border: 1px solid rgba(0, 194, 203, 0.2);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.attention-stage-current {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.attention-stage-current i {
  color: #00c2cb;
  font-size: 1rem;
}

.attention-stage-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
}

.stage-badge-current {
  background: linear-gradient(135deg, rgba(0, 194, 203, 0.9) 0%, rgba(0, 74, 173, 0.9) 100%);
  color: white;
  padding: 0.25rem 0.625rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
}

/* Stage History Section */
.attention-stage-history-section {
  margin-bottom: 0.5rem;
  padding: 0.625rem 0.75rem;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.stage-history-timeline {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.5rem;
  position: relative;
  padding-left: 1.5rem;
}

.stage-history-timeline::before {
  content: '';
  position: absolute;
  left: 0.5rem;
  top: 0;
  bottom: 0;
  width: 2px;
  background: rgba(0, 194, 203, 0.2);
}

.stage-history-item {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.stage-history-dot {
  position: absolute;
  left: -1.75rem;
  top: 0.25rem;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(0, 194, 203, 0.3);
  border: 2px solid rgba(0, 194, 203, 0.5);
  z-index: 1;
}

.stage-history-active .stage-history-dot {
  background: #00c2cb;
  border-color: #004aad;
  box-shadow: 0 0 0 3px rgba(0, 194, 203, 0.2);
  animation: pulse-dot 2s ease-in-out infinite;
}

@keyframes pulse-dot {
  0%,
  100% {
    box-shadow: 0 0 0 3px rgba(0, 194, 203, 0.2);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(0, 194, 203, 0);
  }
}

.stage-history-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.stage-history-stage {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.stage-badge-history {
  background: rgba(0, 194, 203, 0.15);
  color: #00c2cb;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  font-size: 0.6875rem;
  font-weight: 600;
  border: 1px solid rgba(0, 194, 203, 0.3);
}

.stage-history-active .stage-badge-history {
  background: linear-gradient(135deg, rgba(0, 194, 203, 0.9) 0%, rgba(0, 74, 173, 0.9) 100%);
  color: white;
  border-color: rgba(0, 194, 203, 0.5);
}

.stage-current-indicator {
  font-size: 0.625rem;
  font-weight: 700;
  color: #00c2cb;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.stage-history-details {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  font-size: 0.6875rem;
  color: rgba(0, 0, 0, 0.6);
}

.stage-history-time,
.stage-history-user,
.stage-history-duration {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.stage-history-time i,
.stage-history-user i,
.stage-history-duration i {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.4);
}

.stage-history-notes {
  padding: 0.375rem 0.5rem;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 6px;
  font-size: 0.6875rem;
  color: rgba(0, 0, 0, 0.7);
  font-style: italic;
  display: flex;
  align-items: flex-start;
  gap: 0.375rem;
  border-left: 3px solid rgba(0, 194, 203, 0.3);
}

.stage-history-notes i {
  color: rgba(0, 194, 203, 0.6);
  font-size: 0.75rem;
  margin-top: 0.125rem;
  flex-shrink: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .attention-modal-dialog {
    max-width: 95vw !important;
    width: 95vw !important;
    margin: 1rem auto !important;
  }

  .modal-body {
    padding: 0.75rem !important;
  }

  .attention-modal-overlay {
    padding: 0;
  }

  .attention-context-info-compact {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
</style>
