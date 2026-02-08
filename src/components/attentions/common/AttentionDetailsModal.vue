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
  assignProfessional,
} from '../../../application/services/attention';
import { getActiveFeature } from '../../../shared/features';
import { getPaymentMethods, getPaymentTypes } from '../../../shared/utils/data.ts';
import { getQueueById } from '../../../application/services/queue';
import { getBookingDetails } from '../../../application/services/booking';
import {
  getActiveProfessionalsByCommerce,
  getProfessionalById,
} from '../../../application/services/professional';
import { getCollaboratorById } from '../../../application/services/collaborator';
import { getAttentionDetails } from '../../../application/services/attention';
import { getConsentStatus } from '../../../application/services/consent';
import { ATTENTION_STATUS } from '../../../shared/constants';
import Warning from '../../common/Warning.vue';
import AreYouSure from '../../common/AreYouSure.vue';
import PaymentForm from '../../payments/PaymentForm.vue';
import Message from '../../common/Message.vue';
import AttentionTimeline from './AttentionTimeline.vue';
import ProfessionalSelector from '../../professional/ProfessionalSelector.vue';

export default {
  name: 'AttentionDetailsModal',
  components: {
    Popper,
    Spinner,
    Warning,
    AreYouSure,
    PaymentForm,
    Message,
    AttentionTimeline,
    ProfessionalSelector,
  },
  props: {
    show: { type: Boolean, default: false },
    attention: { type: Object, default: undefined },
    commerce: { type: Object, default: undefined },
    queues: { type: Array, default: undefined },
    toggles: { type: Object, default: undefined },
    handleMainModal: { type: Boolean, default: false },
  },
  emits: ['close', 'attention-updated'],
  data() {
    return {
      loading: false,
      extendedPaymentEntity: false,
      extendedTransferEntity: false,
      extendedProfessionalEntity: false,
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
      goToAssignProfessional: false,
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
      selectedProfessional: null,
      professionalCommission: '', // Inicializar como string vacío para permitir escritura libre
      commissionManuallyEdited: false, // Bandera para rastrear si el usuario editó la comisión
      professionals: [],
      loadingProfessionalData: false,
      loadedProfessionalName: '', // Para almacenar el nombre del profesional cargado
      _permissionsDebugLogged: false,
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
      handler(newVal, oldVal) {
        if (newVal && newVal.clientId && newVal.commerceId) {
          this.loadConsentStatus();
          this.startConsentStatusPolling();

          // Solo inicializar si es una atención nueva o ha cambiado el professionalId
          if (
            newVal.professionalId &&
            (!oldVal || newVal.professionalId !== oldVal.professionalId)
          ) {
            this.$nextTick(() => {
              this.initializeProfessionalData();
            });
          }
        } else {
          this.stopConsentStatusPolling();
        }
      },
      immediate: true,
      deep: false, // Cambiar a false para evitar watchers excesivos
    },
    selectedProfessional: {
      handler(newVal) {
        if (newVal) {
          // Llamar handleProfessionalSelected cuando cambie selectedProfessional
          this.handleProfessionalSelected(newVal);
        }
      },
      immediate: false,
      deep: false,
    },
    // Watcher para actualizar la comisión cuando la atención cambie
    'attention.professionalCommissionValue': {
      handler(newVal) {
        if (newVal !== undefined && newVal !== null && !this.commissionManuallyEdited) {
          // Solo actualizar si el usuario no ha editado manualmente la comisión
          this.professionalCommission = String(newVal);
        }
      },
      immediate: true,
    },
    // También watch para cuando toda la atención cambie (para inicialización)
    attention: {
      handler(newAttention) {
        if (
          newAttention?.professionalCommissionValue !== undefined &&
          newAttention?.professionalCommissionValue !== null &&
          !this.commissionManuallyEdited
        ) {
          this.professionalCommission = String(newAttention.professionalCommissionValue);
        }
      },
      immediate: true,
    },
    show: {
      handler(newValue) {
        if (newValue) {
          // Cuando se abre el modal, ocultar el modal principal
          this.hideMainModal();
        } else {
          // Cuando se cierra el modal, restaurar el modal principal
          setTimeout(() => {
            this.restoreMainModal();
          }, 100); // Pequeño delay para asegurar que el modal se haya cerrado completamente
        }
      },
      immediate: false,
    },
  },
  computed: {
    // Check if toggles have been loaded (not empty object)
    togglesLoaded() {
      return (
        this.toggles && typeof this.toggles === 'object' && Object.keys(this.toggles).length > 0
      );
    },
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
    // Check if attention is terminated or cancelled
    isAttentionTerminatedOrCancelled() {
      if (!this.attention || !this.attention.status) return false;
      const terminatedOrCancelledStatuses = [
        ATTENTION_STATUS.TERMINATED,
        ATTENTION_STATUS.RATED,
        ATTENTION_STATUS.CANCELLED,
        ATTENTION_STATUS.SKIPED,
        ATTENTION_STATUS.USER_CANCELLED,
        ATTENTION_STATUS.TERMINATED_RESERVE_CANCELLED,
      ];
      return terminatedOrCancelledStatuses.includes(this.attention.status);
    },
    // Get professional name - check various sources
    professionalDisplayName() {
      if (!this.attention) return '';

      // First check if professionalName is already available
      if (this.attention.professionalName) {
        return this.attention.professionalName;
      }

      // Check if we have loaded professional data
      if (this.loadedProfessionalName) {
        return this.loadedProfessionalName;
      }

      // If we have professionalId, show loading or the ID as fallback
      const professionalId =
        this.attention.professionalId || this.attention.paymentConfirmationData?.professionalId;
      if (professionalId) {
        return this.loadingProfessionalData ? 'Carregando...' : professionalId;
      }

      return '';
    },
    // Check if professional is assigned
    isProfessionalAssigned() {
      if (!this.attention) return false;
      return !!(
        this.attention.professionalName ||
        this.attention.professionalId ||
        this.attention.paymentConfirmationData?.professionalId ||
        this.loadedProfessionalName
      );
    },
    // Selected professional ID for the selector
    selectedProfessionalId: {
      get() {
        return this.selectedProfessional?.id || this.attention?.professionalId || null;
      },
      set(newId) {
        if (!newId) {
          this.selectedProfessional = null;
          return;
        }

        // Find the professional in the list
        const professional = this.professionals?.find(p => p.id === newId);
        if (professional) {
          this.selectedProfessional = professional;
          // No llamar handleProfessionalSelected aquí para evitar loops
          // this.handleProfessionalSelected(professional);
        } else {
          console.warn('[AttentionDetailsModal] Professional not found in list:', newId);
        }
      },
    },
    // Professional commission type para PaymentForm
    professionalCommissionType() {
      // 1. Primero verificar si la atención ya tiene comisión asignada
      if (this.attention?.professionalCommissionType) {
        return this.attention.professionalCommissionType;
      }

      // 2. Verificar si hay confirmationData (atención ya pagada)
      if (this.attention?.paymentConfirmationData?.professionalCommissionType) {
        return this.attention.paymentConfirmationData.professionalCommissionType;
      }

      // 3. Verificar selectedProfessional
      if (this.selectedProfessional?.financialInfo?.commissionType) {
        return this.selectedProfessional.financialInfo.commissionType;
      }

      // 4. Si hay profesional asignado, buscar en la lista
      if (this.attention?.professionalId && this.professionals?.length > 0) {
        const assignedProfessional = this.professionals.find(
          p => p.id === this.attention.professionalId,
        );
        if (assignedProfessional?.financialInfo?.commissionType) {
          return assignedProfessional.financialInfo.commissionType;
        }
      }

      // Default: FIXED (si no es explícitamente PERCENTAGE, es FIXED)
      return 'FIXED';
    },
    // Professional display name para PaymentForm
    professionalDisplayName() {
      const selectedName =
        this.selectedProfessional?.personalInfo?.name ||
        this.selectedProfessional?.name ||
        this.loadedProfessionalName;

      const attentionName = this.attention?.professionalName;

      return selectedName || attentionName || 'N/I';
    },
    // Professional commission value para PaymentForm (computed property que lee primero de la atención)
    computedProfessionalCommission() {
      // 1. Primero verificar si la atención ya tiene comisión asignada
      if (
        this.attention?.professionalCommissionValue !== undefined &&
        this.attention?.professionalCommissionValue !== null
      ) {
        return this.attention.professionalCommissionValue;
      }

      // 2. Verificar si hay confirmationData (atención ya pagada)
      if (this.attention?.paymentConfirmationData?.professionalCommissionValue) {
        return this.attention.paymentConfirmationData.professionalCommissionValue;
      }

      // 3. Si no hay comisión de la atención, usar la variable reactiva actual (para edición manual)
      if (this.professionalCommission && this.professionalCommission !== '') {
        return Number(this.professionalCommission);
      }

      // 4. Fallback: selectedProfessional
      if (this.selectedProfessional?.financialInfo?.commissionValue) {
        return this.selectedProfessional.financialInfo.commissionValue;
      }

      // 5. Fallback: profesional asignado en la lista
      if (this.attention?.professionalId && this.professionals?.length > 0) {
        const assignedProfessional = this.professionals.find(
          p => p.id === this.attention.professionalId,
        );
        if (assignedProfessional?.financialInfo?.commissionValue) {
          return assignedProfessional.financialInfo.commissionValue;
        }
      }

      return null;
    },
  },
  methods: {
    // Permission helper: supports exact keys and keys with extra segments (prefix match)
    hasPermission(keyOrPrefix) {
      if (!this.toggles || typeof this.toggles !== 'object') return false;
      if (this.toggles[keyOrPrefix] === true) return true;
      const prefix = `${keyOrPrefix}.`;
      return Object.keys(this.toggles).some(k => k.startsWith(prefix) && this.toggles[k] === true);
    },
    // Collaborator attention permissions have been seen with both "attention" and "attentions"
    hasCollaboratorAttentionPermission(action) {
      const directMatch =
        this.hasPermission(`collaborator.attentions.${action}`) ||
        this.hasPermission(`collaborator.attention.${action}`);
      if (directMatch) return true;

      // Fallback: accept any collaborator.* key that looks like attention+action.
      // This handles variants like collaborator.attentions.confirm-payment, collaborator.attentions.paymentConfirm, etc.
      if (this.toggles && typeof this.toggles === 'object') {
        const keys = Object.keys(this.toggles);
        const actionLower = String(action || '').toLowerCase();
        const fuzzyMatch = keys.some(k => {
          const kl = k.toLowerCase();
          return (
            kl.startsWith('collaborator.') &&
            kl.includes('attent') &&
            kl.includes(actionLower) &&
            this.toggles[k] === true
          );
        });
        if (fuzzyMatch) return true;

        // Debug once: print what keys arrived so we can align exactly
        if (this.togglesLoaded && !this._permissionsDebugLogged) {
          this._permissionsDebugLogged = true;
          const related = keys
            .filter(
              k => k.toLowerCase().startsWith('collaborator.') && k.toLowerCase().includes('attent'),
            )
            .sort();
          console.warn('[AttentionDetailsModal] collaborator attention permission keys:', related);
          console.warn('[AttentionDetailsModal] requested action:', action, 'value:', {
            directConfirm: this.toggles['collaborator.attentions.confirm'],
            directCancel: this.toggles['collaborator.attentions.cancel'],
            directTransfer: this.toggles['collaborator.attentions.transfer'],
          });
        }
      }

      return false;
    },
    closeModal() {
      this.$emit('close');
    },
    hideMainModal() {
      if (!this.handleMainModal) return;

      const mainModal = document.querySelector('#modalAgenda');
      if (mainModal) {
        mainModal.style.display = 'none';
      }
    },
    restoreMainModal() {
      if (!this.handleMainModal) return;

      const mainModal = document.querySelector('#modalAgenda');
      if (mainModal) {
        // Restaurar estilos
        mainModal.style.display = '';
        mainModal.style.pointerEvents = '';
        mainModal.style.opacity = '';
        mainModal.style.visibility = '';

        // IMPORTANTE: Reactivar el modal de Bootstrap si está inactivo
        if (!mainModal.classList.contains('show')) {
          mainModal.classList.add('show');
          mainModal.style.display = 'block';
        }

        // Asegurar que el body tenga las clases correctas para modals
        if (!document.body.classList.contains('modal-open')) {
          document.body.classList.add('modal-open');
        }
      }

      // Restaurar o crear backdrop si es necesario
      let backdrop = document.querySelector('.modal-backdrop');
      if (!backdrop) {
        backdrop = document.createElement('div');
        backdrop.className = 'modal-backdrop fade show';
        document.body.appendChild(backdrop);
      } else {
        backdrop.style.display = '';
        backdrop.style.visibility = '';
        if (!backdrop.classList.contains('show')) {
          backdrop.classList.add('show');
        }
      }
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
    async showPaymentDetails() {
      this.extendedPaymentEntity = !this.extendedPaymentEntity;

      // Consultar datos frescos de la atención cuando se abre el collapsible
      if (this.extendedPaymentEntity) {
        await this.refreshAttentionDataWithoutOverriding();
      }

      this.extendedTransferEntity = false;
      this.extendedProfessionalEntity = false;
      this.newPaymentConfirmationData = {
        // Keep consistent with bookings: allow confirming without forcing payment fields
        // PaymentForm can toggle this to true when user chooses to process payment now.
        processPaymentNow: false,
      };
    },
    async showTransferDetails() {
      this.extendedTransferEntity = !this.extendedTransferEntity;
      this.extendedPaymentEntity = false;
      this.extendedProfessionalEntity = false;
      if (this.extendedTransferEntity === true) {
        await this.toTransfer();
      }
    },
    async showProfessionalDetails() {
      this.extendedProfessionalEntity = !this.extendedProfessionalEntity;

      // Consultar datos frescos de la atención cuando se abre el collapsible
      if (this.extendedProfessionalEntity) {
        await this.refreshAttentionDataWithoutOverriding();
      }

      this.extendedPaymentEntity = false;
      this.extendedTransferEntity = false;
      // Cargar profesionales solo cuando se abre la sección
      if (this.extendedProfessionalEntity && this.professionals.length === 0) {
        this.loadProfessionals();
      }
    },
    async loadProfessionals() {
      if (!this.attention || !this.attention.commerceId) {
        return;
      }
      try {
        this.professionals = await getActiveProfessionalsByCommerce(this.attention.commerceId);
      } catch (error) {
        console.error('[AttentionDetailsModal] Error loading professionals:', error);
        this.professionals = [];
      }
    },
    async refreshAttentionDataWithoutOverriding() {
      const attentionId = this.attention?.id || this.attention?.attentionId;

      if (!attentionId) {
        return;
      }

      try {
        // NO usar this.loading = true para evitar que se cierre el modal
        const freshAttention = await getAttentionDetails(attentionId);

        if (freshAttention) {
          // Update attention data with fresh information
          this.attention.professionalId = freshAttention.professionalId;
          this.attention.professionalName = freshAttention.professionalName;
          this.attention.paymentConfirmationData = freshAttention.paymentConfirmationData;
          this.attention.paid = freshAttention.paid;
          this.attention.paidAt = freshAttention.paidAt;

          // Update any other relevant fields
          this.attention.status = freshAttention.status;
          this.attention.comment = freshAttention.comment;

          // Load professional name if it has changed and we don't have it
          if (this.attention.professionalId && !this.professionalDisplayName) {
            await this.loadProfessionalName();
          }

          // NO cargar comisión si el usuario ya editó manualmente
          if (
            !this.commissionManuallyEdited &&
            this.selectedProfessional?.financialInfo?.commissionValue
          ) {
            this.professionalCommission = this.selectedProfessional.financialInfo.commissionValue;
          } else if (this.commissionManuallyEdited) {
          }

          // NO emitir evento que puede causar que se cierre el modal
          // this.$emit('attention-updated', this.attention);
        } else {
          console.warn('[AttentionDetailsModal] No fresh attention data received');
        }
      } catch (error) {
        // If attention not found in backend (404), log warning but don't treat as error
        // The query-stack may have data for attentions that no longer exist in the main collection
        if (error.response?.status === 404) {
          console.warn(
            '[AttentionDetailsModal] Attention not found in backend (may be deleted or archived):',
            attentionId,
          );
          console.warn('[AttentionDetailsModal] Using data from query-stack instead');
        } else {
          console.error('[AttentionDetailsModal] Error refreshing attention data:', error);
          console.error('[AttentionDetailsModal] Error details:', error.message, error.stack);
        }
      }
      // NO usar finally con this.loading = false
    },
    async initializeProfessionalData() {
      if (!this.attention?.professionalId) return;

      // Si ya tenemos el profesional seleccionado, no hacer nada
      if (this.selectedProfessional?.id === this.attention.professionalId) return;

      try {
        // Cargar lista de profesionales si no está disponible
        if (!this.professionals || this.professionals.length === 0) {
          await this.loadProfessionals();
        }

        // Buscar el profesional en la lista
        let professional = this.professionals.find(p => p.id === this.attention.professionalId);

        // Si no se encuentra o no tiene información financiera completa, cargar por ID
        if (
          !professional ||
          !professional.financialInfo ||
          professional.financialInfo.commissionValue === undefined
        ) {
          professional = await getProfessionalById(this.attention.professionalId);
        }

        if (professional) {
          this.selectedProfessional = professional;
          this.loadedProfessionalName =
            professional.personalInfo?.name || professional.name || this.attention.professionalId;

          // Cargar comisión si no ha sido editada manualmente
          if (
            !this.commissionManuallyEdited &&
            professional?.financialInfo?.commissionValue !== undefined
          ) {
            this.professionalCommission = professional.financialInfo.commissionValue;
          }
        } else {
          console.warn(
            '[AttentionDetailsModal] Professional not found:',
            this.attention.professionalId,
          );
        }
      } catch (error) {
        console.error('[AttentionDetailsModal] Error initializing professional data:', error);
      }
    },
    async loadProfessionalName() {
      if (!this.attention) return;

      // If we already have the name, no need to load
      if (this.attention.professionalName) {
        this.loadedProfessionalName = this.attention.professionalName;
        return;
      }

      // Get professionalId from various sources
      const professionalId =
        this.attention.professionalId || this.attention.paymentConfirmationData?.professionalId;

      if (!professionalId) return;

      try {
        this.loadingProfessionalData = true;

        // Load commission data if available
        if (this.attention.paymentConfirmationData?.professionalCommissionValue) {
          this.professionalCommission =
            this.attention.paymentConfirmationData.professionalCommissionValue;
          this.commissionManuallyEdited = true; // Mark as manually edited to maintain priority
        }

        // Load professionals if not loaded
        if (this.professionals.length === 0) {
          await this.loadProfessionals();
        }

        // Find the assigned professional
        let professional = this.professionals.find(p => p.id === professionalId) || null;

        // If not found or incomplete, fetch by id to ensure commission info is available
        if (
          !professional ||
          !professional.financialInfo ||
          professional.financialInfo.commissionValue === undefined
        ) {
          professional = await getProfessionalById(professionalId);
        }

        if (professional) {
          this.selectedProfessional = professional;
          this.loadedProfessionalName =
            professional.personalInfo?.name || professional.name || professionalId;
        } else {
          this.loadedProfessionalName = professionalId;
        }
      } catch (error) {
        console.error('[AttentionDetailsModal] Error loading professional:', error);
        // Fallback to ID if can't load name
        this.loadedProfessionalName = professionalId;
      } finally {
        this.loadingProfessionalData = false;
      }
    },
    handleProfessionalSelected(professional) {
      this.selectedProfessional = professional;
      // Solo establecer la comisión por defecto si el usuario no ha editado el campo
      if (professional?.financialInfo && !this.commissionManuallyEdited) {
        const { commissionValue } = professional.financialInfo;
        if (commissionValue !== undefined && commissionValue !== null) {
          this.professionalCommission = commissionValue;
        }
      }
    },
    handleCommissionInput(event) {
      // Marcar que el usuario ha editado manualmente la comisión
      this.commissionManuallyEdited = true;
      // Permitir escribir libremente, solo validar formato básico
      let value = event.target.value;
      // Remover caracteres no numéricos excepto punto decimal
      value = value.replace(/[^0-9.]/g, '');
      // Asegurar que solo haya un punto decimal
      const parts = value.split('.');
      if (parts.length > 2) {
        value = parts[0] + '.' + parts.slice(1).join('');
      }
      // Actualizar el valor solo si cambió (para evitar loops)
      if (this.professionalCommission !== value) {
        this.professionalCommission = value;
      }
    },
    handleInputClick(event) {
      // Solo detener propagación, no prevenir el comportamiento por defecto
      event.stopPropagation();
      // Forzar focus en el input
      this.$nextTick(() => {
        if (this.$refs.commissionInputRef) {
          this.$refs.commissionInputRef.focus();
        }
      });
    },
    handleInputMouseDown(event) {
      // Solo detener propagación, no prevenir el comportamiento por defecto
      event.stopPropagation();
    },
    getFormattedCommissionForDisplay() {
      const data = this.getAssignedProfessionalCommissionData();
      if (!data.commission || !this.professionalCommissionType) {
        return null;
      }

      if (this.professionalCommissionType === 'PERCENTAGE') {
        return `${data.commission}%`;
      } else {
        return `${data.commission} ${this.commerce?.currency || 'BRL'}`;
      }
    },
    getSuggestedCommission() {
      // 1. Primero verificar si la atención ya tiene comisión asignada
      if (
        this.attention?.professionalCommissionValue &&
        this.attention?.professionalCommissionType
      ) {
        const { professionalCommissionType, professionalCommissionValue } = this.attention;
        if (professionalCommissionType === 'PERCENTAGE') {
          return `${professionalCommissionValue}%`;
        } else {
          return `${professionalCommissionValue} ${this.commerce?.currency || 'BRL'}`;
        }
      }

      // 2. Verificar selectedProfessional
      if (this.selectedProfessional?.financialInfo) {
        const { commissionType, commissionValue } = this.selectedProfessional.financialInfo;
        if (commissionValue) {
          if (commissionType === 'PERCENTAGE') {
            return `${commissionValue}%`;
          } else {
            return `${commissionValue} ${this.commerce?.currency || 'BRL'}`;
          }
        }
      }

      // 3. Si no hay selectedProfessional pero sí hay profesional asignado, buscar en la lista
      if (this.attention?.professionalId && this.professionals?.length > 0) {
        const assignedProfessional = this.professionals.find(
          p => p.id === this.attention.professionalId,
        );
        if (assignedProfessional?.financialInfo) {
          const { commissionType, commissionValue } = assignedProfessional.financialInfo;
          if (commissionValue) {
            if (commissionType === 'PERCENTAGE') {
              return `${commissionValue}%`;
            } else {
              return `${commissionValue} ${this.commerce?.currency || 'BRL'}`;
            }
          }
        }
      }

      return '';
    },
    async loadProfessionalDataIfNeeded() {
      if (this.loadingProfessionalData) return;
      if (!this.attention?.professionalId) return;

      this.loadingProfessionalData = true;
      try {
        // Try list first (active professionals by commerce) to avoid extra calls
        if (
          (!this.professionals || this.professionals.length === 0) &&
          this.attention?.commerceId
        ) {
          await this.loadProfessionals();
        }

        let professional =
          (this.professionals || []).find(p => p.id === this.attention.professionalId) || null;

        // If not found (or missing financialInfo), fetch by id to guarantee full data
        if (
          !professional ||
          !professional.financialInfo ||
          professional.financialInfo.commissionValue === undefined
        ) {
          professional = await getProfessionalById(this.attention.professionalId);
        }

        if (professional) {
          this.selectedProfessional = professional;
          if (
            professional.financialInfo?.commissionValue !== undefined &&
            professional.financialInfo?.commissionValue !== null
          ) {
            this.professionalCommission = professional.financialInfo.commissionValue;
          }
        }
      } catch (e) {
        console.warn('[AttentionDetailsModal] Could not reload professional data:', e);
      } finally {
        this.loadingProfessionalData = false;
      }
    },
    // PROFESSIONAL PAYMENT COMMISSION DATA (used by PaymentForm)
    getAssignedProfessionalCommissionData() {
      if (!this.isProfessionalAssigned) {
        return { name: null, commission: null, suggestedAmount: 0 };
      }

      // 0) FIRST: Check for commission data directly on attention (from assign-professional)
      if (
        this.attention?.professionalCommissionType &&
        this.attention?.professionalCommissionValue !== undefined &&
        this.attention?.professionalCommissionValue !== null
      ) {
        const { professionalCommissionType, professionalCommissionValue } = this.attention;
        let suggestedAmount = 0;
        const commissionDisplay = '';

        if (professionalCommissionValue && professionalCommissionValue > 0) {
          if (professionalCommissionType === 'PERCENTAGE') {
            // For percentage, we would need payment amount to calculate the final amount
            suggestedAmount = professionalCommissionValue; // Keep as percentage for now
          } else {
            suggestedAmount = Number(professionalCommissionValue);
          }
        }

        return {
          name: this.professionalDisplayName,
          commission: professionalCommissionValue,
          suggestedAmount,
        };
      }

      // 1) Prefer persisted confirmation data (if backend already stored it)
      const confirmationData = this.attention?.paymentConfirmationData;

      // First check for direct commission amount (from booking data)
      if (confirmationData?.professionalCommissionAmount) {
        return {
          name: this.professionalDisplayName,
          commission: `${confirmationData.professionalCommissionAmount} ${
            this.commerce?.currency || 'BRL'
          }`,
          suggestedAmount: Number(confirmationData.professionalCommissionAmount),
        };
      }

      // Then check for commission type and value
      if (
        confirmationData?.professionalCommissionType &&
        confirmationData?.professionalCommissionValue
      ) {
        const { professionalCommissionType, professionalCommissionValue } = confirmationData;
        let suggestedAmount = 0;
        const commissionDisplay = '';

        if (professionalCommissionValue && professionalCommissionValue > 0) {
          if (professionalCommissionType === 'PERCENTAGE') {
            if (this.newPaymentConfirmationData?.paymentAmount) {
              suggestedAmount = Math.round(
                (this.newPaymentConfirmationData.paymentAmount * professionalCommissionValue) / 100
              );
            } else if (confirmationData?.professionalCommissionAmount) {
              suggestedAmount = confirmationData.professionalCommissionAmount;
            }
          } else {
            suggestedAmount = Number(professionalCommissionValue);
          }
        }

        return {
          name: this.professionalDisplayName,
          commission: professionalCommissionValue,
          suggestedAmount,
        };
      }

      // 2) Use selectedProfessional (if available)
      if (this.selectedProfessional?.financialInfo) {
        const { commissionType, commissionValue } = this.selectedProfessional.financialInfo;
        let suggestedAmount = 0;
        const commissionDisplay = '';

        if (commissionValue) {
          if (commissionType === 'PERCENTAGE') {
            if (this.newPaymentConfirmationData?.paymentAmount) {
              suggestedAmount = Math.round(
                (this.newPaymentConfirmationData.paymentAmount * commissionValue) / 100,
              );
            }
          } else {
            suggestedAmount = Number(commissionValue);
          }
        }

        return {
          name: this.professionalDisplayName,
          commission: commissionValue,
          suggestedAmount,
        };
      }

      // 3) If we have professionalId but not the professional data yet, reload it
      const professionalId =
        this.attention?.professionalId || this.attention?.paymentConfirmationData?.professionalId;
      if (professionalId && !this.selectedProfessional && !this.loadingProfessionalData) {
        // fire and forget; computed will re-run after state updates
        this.loadProfessionalDataIfNeeded();
      }

      // Fallback: name only
      return {
        name: this.professionalDisplayName,
        commission: null,
        suggestedAmount: 0,
      };
    },
    goAssignProfessional() {
      // NO llamar handleProfessionalSelected aquí para evitar sobrescribir la comisión editada
      this.goToAssignProfessional = !this.goToAssignProfessional;
    },
    cancelAssignProfessional() {
      this.goToAssignProfessional = false;
    },
    async confirmAssignProfessional() {
      if (!this.attention || !this.attention.id) {
        console.error('[AttentionDetailsModal] No attention or attention.id');
        this.alertError = 'No se puede asignar un profesional sin atención';
        return;
      }

      if (!this.selectedProfessional && !this.selectedProfessionalId) {
        console.error('[AttentionDetailsModal] No selected professional');
        this.alertError = 'Por favor, seleccione un profesional';
        return;
      }

      // Prevent action if attention is terminated or cancelled
      if (this.isAttentionTerminatedOrCancelled) {
        this.alertError = 'No se puede asignar un profesional a una atención terminada o cancelada';
        return;
      }

      try {
        this.loading = true;

        // Si no tenemos selectedProfessional pero sí tenemos selectedProfessionalId, buscar el profesional
        let professional = this.selectedProfessional;
        if (!professional && this.selectedProfessionalId) {
          professional = this.professionals.find(p => p.id === this.selectedProfessionalId);
          if (!professional) {
            throw new Error('No se pudo encontrar el profesional seleccionado');
          }
        }

        const name = professional.personalInfo?.name || professional.name || professional.id;

        // Usar la comisión editada por el usuario si existe, sino usar la del profesional
        // Convertir a número si es string
        let commissionToUse = null;
        const commissionValue =
          typeof this.professionalCommission === 'string'
            ? this.professionalCommission.trim()
            : String(this.professionalCommission || '').trim();
        if (commissionValue && commissionValue !== '') {
          const parsed = parseFloat(commissionValue);
          if (!isNaN(parsed) && isFinite(parsed)) {
            commissionToUse = parsed;
          }
        }
        if (commissionToUse === null) {
          commissionToUse = professional.financialInfo?.commissionValue || null;
        }
        const commissionType = professional.financialInfo?.commissionType || null;

        await assignProfessional(
          this.attention.id,
          professional.id,
          name,
          commissionToUse,
          commissionType,
        );

        this.$emit('attention-updated');
        this.extendedProfessionalEntity = false;
        this.goToAssignProfessional = false;
        this.commissionManuallyEdited = false; // Reset flag
      } catch (error) {
        console.error('[AttentionDetailsModal] Error assigning professional:', error);
        this.alertError = error.message || 'Error al asignar profesional';
      } finally {
        this.loading = false;
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
      // Prevent action if attention is terminated or cancelled
      if (this.isAttentionTerminatedOrCancelled) {
        this.alertError = 'No se puede confirmar el pago de una atención terminada o cancelada';
        return;
      }
      try {
        this.loading = true;

        // Refrescar datos de la atención antes de confirmar
        await this.refreshAttentionDataWithoutOverriding();

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
            // Refrescar datos de la atención después de confirmar para actualizar el estado
            await this.refreshAttentionDataWithoutOverriding();
            this.$emit('attention-updated');
            this.extendedPaymentEntity = false;
            this.goToConfirm = false;
          }
        }
        this.loading = false;
      } catch (error) {
        console.error('[AttentionDetailsModal] Error confirming payment:', error);
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
      // Prevent action if attention is terminated or cancelled
      if (this.isAttentionTerminatedOrCancelled) {
        this.alertError = 'No se puede transferir una atención terminada o cancelada';
        return;
      }
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

          // Auto-suggest commission when possible (mirrors BookingDetailsCard behavior)
          if (this.attention?.professionalName && data.paymentAmount > 0) {
            const commissionData = this.getAssignedProfessionalCommissionData();
            if (
              commissionData.suggestedAmount > 0 &&
              (this.newPaymentConfirmationData.paymentCommission === undefined ||
                this.newPaymentConfirmationData.paymentCommission === null)
            ) {
              this.newPaymentConfirmationData.paymentCommission = commissionData.suggestedAmount;
            }
          }
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

        // Attach professionalId/commission amount when applicable (used by income creation)
        if (this.attention?.professionalId) {
          this.newPaymentConfirmationData.professionalId = this.attention.professionalId;
        }
        if (this.newPaymentConfirmationData.paymentCommission !== undefined) {
          this.newPaymentConfirmationData.professionalCommissionAmount =
            this.newPaymentConfirmationData.paymentCommission;
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
      if (this.togglesLoaded && !this.hasCollaboratorAttentionPermission('confirm')) {
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
      if (this.attention) {
      }

      const attentionId = this.attention?.id || this.attention?.attentionId;

      if (!this.attention || !attentionId) {
        return;
      }

      try {
        // Load attention details with full stageHistory
        const attentionDetails = await getAttentionDetails(attentionId);

        // Ensure attentionDetails has id (map attentionId to id if needed)
        if (attentionDetails && !attentionDetails.id && attentionDetails.attentionId) {
          attentionDetails.id = attentionDetails.attentionId;
        }

        // If attentionDetails doesn't have stageHistory, try to get it from the original attention
        if (attentionDetails && !attentionDetails.stageHistory && this.attention?.stageHistory) {
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
                collaborator.name || collaborator.alias || 'N/A';
            } else {
              // If collaborator not found, set to null so it displays as N/A
              collaboratorsMap[attentionDetails.collaboratorId] = null;
            }
          } catch (error) {
            console.error('Error loading main collaborator:', error);
            // On error, set to null so it displays as N/A
            collaboratorsMap[attentionDetails.collaboratorId] = null;
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
                      collaborator.name || collaborator.alias || 'N/A';
                  } else {
                    // If collaborator not found, don't show the ID, show N/A instead
                    collaboratorsMap[collaboratorId] = null;
                  }
                } catch (error) {
                  console.error(`Error loading collaborator ${collaboratorId}:`, error);
                  // On error, don't show the ID, show null so it displays as N/A
                  collaboratorsMap[collaboratorId] = null;
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
      if (newVal) {
        document.body.classList.add('modal-open');
        document.body.style.overflow = 'hidden';
      } else {
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        // Remove backdrop when modal closes
        const backdrop = document.querySelector('.modal-backdrop');
        if (backdrop) {
          backdrop.remove();
        }
      }
    },
    attention: {
      handler(newVal, oldVal) {
        if (newVal) {
          this.loadTimelineData();
          this.loadProfessionalName();
        }
      },
      immediate: true,
    },
  },
  mounted() {
    if (!this.attention) return;
    this.loadTimelineData();
    this.loadProfessionalName();
  },
  beforeUnmount() {
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    // Remove backdrop
    const backdrop = document.querySelector('.modal-backdrop');
    if (backdrop) {
      backdrop.remove();
    }
    // Clean up polling interval
    this.stopConsentStatusPolling();
  },
};
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="attention-modal-overlay" @click.self="closeModal">
      <div class="modal-dialog modal-dialog-scrollable modal-lg attention-modal-dialog" @click.stop>
        <div class="modal-content attention-modal-content">
          <!-- Modal Header -->
          <div class="modal-header">
            <h5 class="modal-title" id="attentionDetailsModalLabel">
              <i class="bi bi-qr-code"></i>
              {{ $t('dashboard.attentionDetails') || 'Detalles del Atendimiento' }}
            </h5>
            <button type="button" class="btn-close" @click="closeModal" aria-label="Close"></button>
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
                    <span
                      v-if="attention && attention.number"
                      class="attention-number-badge-inline"
                    >
                      #{{ attention.number }}
                    </span>
                    <!-- Paid Status Badge -->
                    <div
                      v-if="
                        attention?.paymentConfirmationData?.paid === true ||
                        attention?.paid === true
                      "
                      class="attention-paid-badge"
                      :title="
                        $t('collaboratorBookingsView.paymentConfirmed') || 'Pagamento Confirmado'
                      "
                    >
                      <i class="bi bi-check-circle-fill"></i>
                      <span class="paid-text">{{ $t('dashboard.paid') }}</span>
                    </div>
                    <button class="btn-copy-mini" @click="copyAttention()" title="Copiar datos">
                      <i class="bi bi-file-earmark-spreadsheet"></i>
                    </button>
                    <button
                      v-if="attention && canCancelAttention(attention)"
                      class="btn btn-sm btn-size fw-bold btn-danger rounded-pill px-3 card-action"
                      @click="goCancel()"
                      :disabled="togglesLoaded && !hasCollaboratorAttentionPermission('cancel')"
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
                (queues && queues.length > 0 && queues[0]?.name) ||
                attention.collaboratorName ||
                professionalDisplayName ||
                (attention.servicesDetails && attention.servicesDetails.length > 0) ||
                attention.createdDate
              "
              class="attention-context-info-compact"
            >
              <div
                v-if="attention.queueName || (queues && queues.length > 0 && queues[0]?.name)"
                class="attention-context-item-inline"
              >
                <i class="bi bi-person-lines-fill"></i>
                <span class="attention-context-label-inline">Fila</span>
                <span class="attention-context-value-inline">{{
                  attention.queueName || (queues && queues.length > 0 ? queues[0].name : 'N/I')
                }}</span>
              </div>
              <div v-if="attention.collaboratorName" class="attention-context-item-inline">
                <i class="bi bi-person-fill"></i>
                <span class="attention-context-label-inline">Colaborador</span>
                <span class="attention-context-value-inline">{{
                  attention.collaboratorName || 'N/I'
                }}</span>
              </div>
              <div v-if="professionalDisplayName" class="attention-context-item-inline">
                <i class="bi bi-person-badge"></i>
                <span class="attention-context-label-inline">{{
                  $t('professionals.professional') || 'Profesional'
                }}</span>
                <span class="attention-context-value-inline">{{ professionalDisplayName }}</span>
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
                <i :class="`bi ${clasifyDaysSinceComment(attention.daysSinceAttention || 0)}`"></i>
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
              <div class="attention-context-info-compact">
                <div
                  v-if="attention.paymentConfirmationData?.paymentType"
                  class="attention-context-item-inline"
                >
                  <i class="bi bi-credit-card"></i>
                  <span class="attention-context-label-inline">{{
                    $t('collaboratorBookingsView.paymentType') || 'Tipo de Pago'
                  }}</span>
                  <span class="attention-context-value-inline">{{
                    $t(`paymentTypes.${attention.paymentConfirmationData.paymentType}`)
                  }}</span>
                </div>
                <div
                  v-if="attention.paymentConfirmationData?.paymentMethod"
                  class="attention-context-item-inline"
                >
                  <i class="bi bi-wallet2"></i>
                  <span class="attention-context-label-inline">{{
                    $t('collaboratorBookingsView.paymentMethod') || 'Método de Pago'
                  }}</span>
                  <span class="attention-context-value-inline">{{
                    $t(`paymentClientMethods.${attention.paymentConfirmationData.paymentMethod}`)
                  }}</span>
                </div>
                <div
                  v-if="attention.paymentConfirmationData?.paymentFiscalNote"
                  class="attention-context-item-inline"
                >
                  <i class="bi bi-receipt"></i>
                  <span class="attention-context-label-inline">{{
                    $t('collaboratorBookingsView.fiscalNote') || 'Nota Fiscal'
                  }}</span>
                  <span class="attention-context-value-inline">{{
                    attention.paymentConfirmationData.paymentFiscalNote
                  }}</span>
                </div>
                <div
                  v-if="attention.paymentConfirmationData?.paymentAmount"
                  class="attention-context-item-inline"
                >
                  <i class="bi bi-coin"></i>
                  <span class="attention-context-label-inline">{{
                    $t('collaboratorBookingsView.paymentAmount') || 'Valor Pagado'
                  }}</span>
                  <span class="attention-context-value-inline payment-amount-value">{{
                    attention.paymentConfirmationData.paymentAmount
                  }}</span>
                </div>
                <div
                  v-if="attention.paymentConfirmationData?.totalAmount"
                  class="attention-context-item-inline"
                >
                  <i class="bi bi-cash-stack"></i>
                  <span class="attention-context-label-inline">{{
                    $t('collaboratorBookingsView.totalAmount') || 'Total'
                  }}</span>
                  <span class="attention-context-value-inline">{{
                    attention.paymentConfirmationData.totalAmount
                  }}</span>
                </div>
                <div
                  v-if="attention.paymentConfirmationData?.paymentCommission"
                  class="attention-context-item-inline"
                >
                  <i class="bi bi-percent"></i>
                  <span class="attention-context-label-inline">{{
                    $t('collaboratorBookingsView.commission') || 'Comissão'
                  }}</span>
                  <span class="attention-context-value-inline payment-commission-value">{{
                    attention.paymentConfirmationData.paymentCommission
                  }}</span>
                </div>
                <div
                  v-if="
                    attention.paymentConfirmationData?.installments &&
                    attention.paymentConfirmationData.installments > 1
                  "
                  class="attention-context-item-inline"
                >
                  <i class="bi bi-calendar-check"></i>
                  <span class="attention-context-label-inline">{{
                    $t('collaboratorBookingsView.installments') || 'Parcelas'
                  }}</span>
                  <span class="attention-context-value-inline">{{
                    attention.paymentConfirmationData.installments
                  }}</span>
                </div>
                <div
                  v-if="attention.paymentConfirmationData?.packageId && attention.packageName"
                  class="attention-context-item-inline"
                >
                  <i class="bi bi-box-seam"></i>
                  <span class="attention-context-label-inline">{{
                    $t('package.package') || 'Pacote'
                  }}</span>
                  <span class="attention-context-value-inline">{{ attention.packageName }}</span>
                </div>
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

            <!-- Action Buttons -->
            <div class="attention-actions-tabs">
              <button
                v-if="getActiveFeature(commerce, 'attention-confirm-payment', 'PRODUCT')"
                class="attention-action-tab"
                :class="{
                  'attention-action-tab-active': extendedPaymentEntity,
                  'attention-action-tab-disabled': isAttentionTerminatedOrCancelled,
                }"
                :disabled="isAttentionTerminatedOrCancelled"
                @click.prevent="showPaymentDetails()"
              >
                <i class="bi bi-cash-coin"></i>
                <span>{{ $t('collaboratorBookingsView.paymentConfirm') }}</span>
                <i :class="`bi ${extendedPaymentEntity ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
              </button>
              <button
                v-if="getActiveFeature(commerce, 'professional-assignment-enabled', 'PRODUCT')"
                class="attention-action-tab"
                :class="{
                  'attention-action-tab-active': extendedProfessionalEntity,
                  'attention-action-tab-disabled': isAttentionTerminatedOrCancelled,
                }"
                :disabled="isAttentionTerminatedOrCancelled"
                @click.prevent="showProfessionalDetails()"
              >
                <i class="bi bi-person-badge"></i>
                <span>{{ $t('professionals.assignProfessional') }}</span>
                <i
                  :class="`bi ${extendedProfessionalEntity ? 'bi-chevron-up' : 'bi-chevron-down'}`"
                ></i>
              </button>
              <button
                v-if="getActiveFeature(commerce, 'attention-transfer-queue', 'PRODUCT')"
                class="attention-action-tab"
                :class="{
                  'attention-action-tab-active': extendedTransferEntity,
                  'attention-action-tab-disabled': isAttentionTerminatedOrCancelled,
                }"
                :disabled="isAttentionTerminatedOrCancelled"
                @click.prevent="showTransferDetails()"
              >
                <i class="bi bi-arrow-left-right"></i>
                <span>{{ $t('collaboratorBookingsView.transferQueue') }}</span>
                <i
                  :class="`bi ${extendedTransferEntity ? 'bi-chevron-up' : 'bi-chevron-down'}`"
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
                      v-if="
                        (attention.servicesId && attention.servicesId.length > 0) ||
                        (attention.servicesDetails && attention.servicesDetails.length > 0)
                      "
                      :id="attention.id"
                      :commerce="commerce"
                      :client-id="attention.clientId"
                      :service-id="attention.servicesId?.[0]"
                      :service-ids="attention.servicesId || []"
                      :services="attention.servicesDetails || []"
                      :confirm-payment="true"
                      :errors-add="errorsAdd"
                      :receive-data="receiveData"
                      :professional-id="attention.professionalId"
                      :professional-name="attention.professionalName || professionalDisplayName"
                      :professional-commission="computedProfessionalCommission || null"
                      :professional-commission-type="professionalCommissionType"
                      :suggested-commission-amount="0"
                    >
                    </PaymentForm>
                    <!-- Warning cuando no hay servicios -->
                    <div v-else class="alert alert-warning">
                      <i class="bi bi-exclamation-triangle"></i>
                      <span>
                        {{
                          $t('collaboratorBookingsView.noServicesAssigned') ||
                          'Atención sin servicios asignados.'
                        }}
                      </span>
                    </div>
                    <div class="attention-action-buttons">
                      <button
                        class="btn btn-sm btn-size fw-bold btn-primary rounded-pill px-3 card-action"
                        @click="goConfirm()"
                        :disabled="!canConfirmPayment() || isAttentionTerminatedOrCancelled"
                      >
                        <i class="bi bi-person-check-fill"></i>
                        {{ $t('collaboratorBookingsView.confirm') }}
                      </button>
                    </div>
                    <AreYouSure
                      :show="goToConfirm"
                      :yes-disabled="
                        isAttentionTerminatedOrCancelled ||
                        (togglesLoaded && !hasCollaboratorAttentionPermission('confirm'))
                      "
                      :no-disabled="
                        isAttentionTerminatedOrCancelled ||
                        (togglesLoaded && !hasCollaboratorAttentionPermission('confirm'))
                      "
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

            <!-- PROFESSIONAL ASSIGNMENT -->
            <Transition name="slide-fade">
              <div
                v-if="
                  extendedProfessionalEntity &&
                  getActiveFeature(commerce, 'professional-assignment-enabled', 'PRODUCT')
                "
                class="attention-action-section"
              >
                <div class="attention-action-content">
                  <div class="attention-action-form payment-form-modern">
                    <div class="attention-action-header">
                      <i class="bi bi-person-badge"></i>
                      <span>Atribuir Profissional</span>
                    </div>
                    <div class="payment-form-content">
                      <div v-if="isProfessionalAssigned" class="professional-assigned-alert">
                        <i class="bi bi-person-badge-fill"></i>
                        <span class="alert-text">
                          Profissional já atribuído:
                          <strong>{{ professionalDisplayName }}</strong>
                          <span
                            v-if="getAssignedProfessionalCommissionData().commission"
                            class="commission-info"
                          >
                            (Comissão: <strong>{{ getFormattedCommissionForDisplay() }}</strong
                            >)
                          </span>
                        </span>
                        <small class="alert-action">
                          Você pode substituí-lo selecionando outro
                        </small>
                      </div>
                      <div class="payment-form-field">
                        <label class="payment-form-label">Selecionar profissional</label>
                        <ProfessionalSelector
                          v-model="selectedProfessionalId"
                          :professionals="professionals"
                          :filter-by-service="attention.servicesId"
                          :show-commission="false"
                          @professional-selected="handleProfessionalSelected"
                        />
                      </div>
                      <div
                        v-if="
                          (selectedProfessional || isProfessionalAssigned) &&
                          getActiveFeature(commerce, 'professional-commission-enabled', 'PRODUCT')
                        "
                        class="payment-form-field"
                      >
                        <label class="payment-form-label">Comissão</label>
                        <div class="d-flex align-items-center gap-2">
                          <input
                            ref="commissionInputRef"
                            v-model="professionalCommission"
                            type="text"
                            inputmode="decimal"
                            class="payment-form-input commission-input-fix"
                            :placeholder="getSuggestedCommission()"
                            :value="computedProfessionalCommission || professionalCommission"
                            @input="handleCommissionInput"
                            @click="handleInputClick"
                            @mousedown="handleInputMouseDown"
                            tabindex="0"
                          />
                          <span class="text-muted">
                            {{
                              selectedProfessional?.financialInfo?.commissionType === 'PERCENTAGE'
                                ? '%'
                                : commerce.currency || 'BRL'
                            }}
                          </span>
                        </div>
                        <!-- Warning about suggested commission -->
                        <div
                          v-if="getSuggestedCommission()"
                          class="alert alert-warning mt-2 commission-warning"
                        >
                          <i class="bi bi-info-circle me-2"></i>
                          <span
                            >Comissão sugerida:
                            <strong>{{ getSuggestedCommission() }}</strong></span
                          >
                          <Popper :class="'dark'" arrow hover>
                            <template #content>
                              <div>Esta é a comissão configurada para este profissional</div>
                            </template>
                            <i class="bi bi-question-circle ms-2"></i>
                          </Popper>
                        </div>
                      </div>
                      <div class="attention-action-buttons">
                        <button
                          class="btn btn-sm btn-size fw-bold btn-primary rounded-pill px-3 card-action"
                          @click="goAssignProfessional()"
                          :disabled="
                            (!selectedProfessional && !isProfessionalAssigned) ||
                            loading ||
                            isAttentionTerminatedOrCancelled
                          "
                        >
                          <i class="bi bi-person-check-fill"></i>
                          Atribuir Profissional
                        </button>
                      </div>
                      <AreYouSure
                        :show="goToAssignProfessional"
                        :yes-disabled="
                          !selectedProfessional || loading || isAttentionTerminatedOrCancelled
                        "
                        :no-disabled="
                          !selectedProfessional || loading || isAttentionTerminatedOrCancelled
                        "
                        @actionYes="confirmAssignProfessional()"
                        @actionNo="cancelAssignProfessional()"
                      >
                      </AreYouSure>
                    </div>
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
                        <option v-for="queue in queuesToTransfer" :key="queue.id" :value="queue.id">
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
                          isAttentionTerminatedOrCancelled ||
                          (togglesLoaded && !hasCollaboratorAttentionPermission('transfer'))
                        "
                      >
                        <i class="bi bi-person-check-fill"></i>
                        {{ $t('collaboratorBookingsView.transfer') }}
                      </button>
                    </div>
                    <AreYouSure
                      :show="goToTransfer"
                      :yes-disabled="
                        isAttentionTerminatedOrCancelled ||
                        (togglesLoaded && !hasCollaboratorAttentionPermission('transfer'))
                      "
                      :no-disabled="
                        isAttentionTerminatedOrCancelled ||
                        (togglesLoaded && !hasCollaboratorAttentionPermission('transfer'))
                      "
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
                  :yes-disabled="togglesLoaded && !hasCollaboratorAttentionPermission('cancel')"
                  :no-disabled="togglesLoaded && !hasCollaboratorAttentionPermission('cancel')"
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
                ><strong>Date:</strong>
                {{ getDate(attention.createdAt || attention.createdDate || attention.date) }}</span
              >
            </div>
          </div>
        </div>
      </div>
    </div>
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
  background-color: var(--azul-turno, #004aad);
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

.attention-number-badge-inline {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.25rem 0.5rem;
  background: linear-gradient(135deg, var(--azul-turno) 0%, #00b8c4 100%);
  border: 1px solid rgba(0, 194, 203, 0.3);
  border-radius: 0.75rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: white;
  margin-left: 0.5rem;
  box-shadow: 0 2px 4px rgba(0, 194, 203, 0.2);
  flex-shrink: 0;
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

.attention-paid-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  background: linear-gradient(135deg, #e8f5e8 0%, #c8e6c9 100%);
  color: #2e7d32;
  border: 1px solid #a5d6a7;
  border-radius: 12px;
  font-size: 0.625rem;
  font-weight: 600;
  padding: 0.25rem 0.5rem;
  margin-left: 0.5rem;
  flex-shrink: 0;
}

.attention-paid-badge i {
  font-size: 0.75rem;
}

.attention-paid-badge .paid-text {
  line-height: 1;
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

/* Payment amount and commission value styling */
.attention-context-value-inline.payment-amount-value {
  color: #00c2cb;
  font-weight: 700;
}

.attention-context-value-inline.payment-commission-value {
  color: #f9c322;
  font-weight: 700;
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

.professional-assigned-alert {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
  border: 1px solid #90caf9;
  border-radius: 8px;
  padding: 10px 12px;
  margin: 8px 0;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  line-height: 1.3;
  color: #1565c0;
}

.professional-assigned-alert i {
  color: #1976d2;
  font-size: 14px;
  flex-shrink: 0;
}

.professional-assigned-alert .alert-text {
  flex: 1;
  margin: 0;
}

.professional-assigned-alert .alert-action {
  display: block;
  color: #1976d2;
  font-size: 11px;
  margin-top: 2px;
  font-style: italic;
}

.professional-assigned-alert strong {
  color: #0d47a1;
  font-weight: 600;
}

.professional-assigned-alert .commission-info {
  font-size: 0.85rem;
  color: rgba(0, 0, 0, 0.8);
  margin-left: 0.5rem;
}

.professional-assigned-alert .commission-info strong {
  color: #28a745;
}

.payment-form-modern {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.payment-form-content {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

.payment-form-field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.payment-form-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
  letter-spacing: -0.01em;
}

.payment-form-input {
  padding: 0.375rem 0.625rem;
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.95);
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
  transition: all 0.2s ease;
  width: 100%;
}

.payment-form-input:hover {
  border-color: rgba(0, 194, 203, 0.3);
  background: rgba(255, 255, 255, 1);
}

.payment-form-input:focus {
  outline: none;
  border-color: #00c2cb;
  box-shadow: 0 0 0 3px rgba(0, 194, 203, 0.1);
}

/* Fix para input de comisión bloqueado */
.commission-input-fix {
  pointer-events: auto !important;
  user-select: text !important;
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  -ms-user-select: text !important;
  cursor: text !important;
  z-index: 10000 !important;
  position: relative !important;
}

.commission-input-fix:focus {
  pointer-events: auto !important;
  user-select: text !important;
  outline: 2px solid #00c2cb !important;
  outline-offset: 2px !important;
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

/* Estilos para warning de comisión */
.commission-warning {
  font-size: 0.85rem;
}
</style>

<style>
/* CSS GLOBAL ULTRA AGRESIVO PARA MODAL DE ATENCION - SIN SCOPED */
.attention-modal-overlay,
.attention-modal-overlay *,
.attention-modal-content,
.attention-modal-content * {
  pointer-events: auto !important;
}

.attention-modal-overlay input,
.attention-modal-content input,
.modal-body input {
  pointer-events: auto !important;
  user-select: text !important;
  cursor: text !important;
  -webkit-user-select: text !important;
  background: white !important;
  z-index: 999999 !important;
  border: 1px solid #ccc !important;
  padding: 8px !important;
}

.attention-modal-overlay input:focus,
.attention-modal-content input:focus {
  outline: 2px solid #00c2cb !important;
  border-color: #00c2cb !important;
}

/* Asegurar que el modal esté por encima de TODO */
.attention-modal-overlay {
  z-index: 999999 !important;
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
}

.attention-modal-dialog {
  z-index: 999999 !important;
  position: relative !important;
}

/* Fix universal para todos los inputs dentro de modales de atención */
.attention-modal-overlay input,
.attention-modal-overlay textarea,
.attention-modal-overlay select,
.attention-modal-content input,
.attention-modal-content textarea,
.attention-modal-content select,
.modal-body input,
.modal-body textarea,
.modal-body select,
.payment-form-modern input,
.payment-form-modern textarea,
.payment-form-modern select {
  pointer-events: auto !important;
  user-select: text !important;
  cursor: text !important;
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  -ms-user-select: text !important;
  background: white !important;
  z-index: 999999 !important;
  position: relative !important;
}

/* Fix para inputs de comisión */
.commission-input-fix,
input[ref='commissionInputRef'] {
  pointer-events: auto !important;
  user-select: text !important;
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  -ms-user-select: text !important;
  cursor: text !important;
  z-index: 999999 !important;
  position: relative !important;
  background: white !important;
  -webkit-touch-callout: default !important;
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0) !important;
  touch-action: manipulation !important;
}

/* Fix para inputs de tipo number */
input[type='number'] {
  pointer-events: auto !important;
  user-select: text !important;
  cursor: text !important;
  -moz-appearance: textfield !important;
}

input[type='number']::-webkit-outer-spin-button,
input[type='number']::-webkit-inner-spin-button {
  -webkit-appearance: none !important;
  margin: 0 !important;
}
</style>
