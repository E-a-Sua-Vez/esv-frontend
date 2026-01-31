<script>
import Popper from 'vue3-popper';
import jsonToCsv from '../../../shared/utils/jsonToCsv';
import Spinner from '../../common/Spinner.vue';
import {
  cancelBooking,
  confirmBooking,
  assignProfessional,
} from '../../../application/services/booking';
import { getActiveFeature } from '../../../shared/features';
import { getPaymentMethods, getPaymentTypes } from '../../../shared/utils/data.ts';
import {
  getPendingCommerceBookingsByDate,
  transferBooking,
  editBooking,
  getBookingDetails,
} from '../../../application/services/booking';
import {
  getActiveProfessionalsByCommerce,
  getProfessionalById,
} from '../../../application/services/professional';
import { getQueueById } from '../../../application/services/queue';
import { getDate } from '../../../shared/utils/date';
import { formatIdNumber } from '../../../shared/utils/idNumber';
import Warning from '../../common/Warning.vue';
import AreYouSure from '../../common/AreYouSure.vue';
import PaymentForm from '../../payments/PaymentForm.vue';
import Message from '../../common/Message.vue';
import BookingDatePicker from './BookingDatePicker.vue';
import ProfessionalSelector from '../../professional/ProfessionalSelector.vue';

export default {
  name: 'BookingDetailsCard',
  components: {
    Popper,
    Spinner,
    Warning,
    AreYouSure,
    PaymentForm,
    Message,
    BookingDatePicker,
    ProfessionalSelector,
  },
  props: {
    show: { type: Boolean, default: true },
    booking: { type: Object, default: undefined },
    commerce: { type: Object, default: undefined },
    detailsOpened: { type: Boolean, default: false },
    toggles: { type: Object, default: undefined },
    queues: { type: Array, default: undefined },
    disabledDates: { type: Object, default: undefined },
    groupedQueues: { type: Object, default: undefined },
    calendarAttributes: { type: Object, default: undefined },
    drawerMode: { type: Boolean, default: false },
    selectedQueue: { type: Object, default: undefined },
    selectedDate: { type: String, default: undefined },
  },
  emits: ['getAvailableDatesByCalendarMonth', 'open-drawer', 'booking-updated'],
  data() {
    return {
      loading: false,
      extendedEntity: false,
      extendedPaymentEntity: false,
      extendedTransferEntity: false,
      extendedEditEntity: false,
      extendedProfessionalEntity: false,
      newConfirmationData: {},
      paymentTypes: [],
      paymentMethods: [],
      paymentAmountError: false,
      paymentTypeError: false,
      paymentMethodError: false,
      errorsAdd: [],
      goToTransfer: false,
      goToEdit: false,
      goToCancel: false,
      goToConfirm1: false,
      goToConfirm2: false,
      checked: false,
      queue: {},
      queuesToTransfer: [],
      queueToTransfer: null,
      dateMask: { modelValue: 'YYYY-MM-DD' },
      locale: 'es',
      internalSelectedDate: new Date().setDate(new Date().getDate() + 1),
      minDate: new Date().setDate(new Date().getDate()),
      maxDate: new Date().setDate(new Date().getDate() + 90),
      amountofBlocksNeeded: 1,
      availableBookingSuperBlocks: [],
      showBookingDataPicker: false,
      dateToEdit: undefined,
      blockToEdit: undefined,
      selectedProfessional: null,
      professionalCommission: null,
      commissionManuallyEdited: false, // Bandera para rastrear si el usuario editó la comisión
      professionals: [],
      goToAssignProfessional: false,
      loadingProfessionalData: false,
    };
  },
  mounted() {
    // Asegurar que los inputs sean interactivos después de montar
    this.$nextTick(() => {
      this.ensureInputsAreInteractive();
    });

    // Inicializar comisión desde datos guardados si existe profesional asignado
    // Primero intentar desde campos directos del booking
    if (this.booking?.professionalName && this.booking?.professionalCommissionValue) {
      this.professionalCommission = this.booking.professionalCommissionValue;
      this.commissionManuallyEdited = true; // Marcar como editada para mantener la prioridad
    }
    // Fallback: desde confirmationData
    else if (this.booking?.professionalName && this.booking?.confirmationData?.professionalCommissionValue) {
      this.professionalCommission = this.booking.confirmationData.professionalCommissionValue;
      this.commissionManuallyEdited = true; // Marcar como editada para mantener la prioridad
    }

    // Fix específico para el input de comisión con delay
    setTimeout(() => {
      if (this.$refs.commissionInputRef) {
        this.$refs.commissionInputRef.style.setProperty('pointer-events', 'auto', 'important');
        this.$refs.commissionInputRef.style.setProperty('user-select', 'text', 'important');
        this.$refs.commissionInputRef.style.setProperty('cursor', 'text', 'important');
      }
    }, 300);
  },
  beforeMount() {
    this.paymentTypes = getPaymentTypes();
    this.paymentMethods = getPaymentMethods();
    this.locale = this.commerce.localeInfo.language;
  },
  computed: {
    // Check if toggles have been loaded (not empty object)
    togglesLoaded() {
      return (
        this.toggles && typeof this.toggles === 'object' && Object.keys(this.toggles).length > 0
      );
    },
    // Check if booking is processed and cannot be modified
    isBookingProcessed() {
      return this.booking && (this.booking.processed || this.booking.status === 'PROCESSED');
    },
    // Check if booking is cancelled or processed (cannot perform actions)
    isBookingCancelledOrProcessed() {
      if (!this.booking) return false;
      return (
        this.booking.status === 'CANCELLED' ||
        this.booking.status === 'USER_CANCELED' ||
        this.booking.cancelled === true ||
        this.isBookingProcessed
      );
    },
  },
  methods: {
    showDetails() {
      if (this.drawerMode) {
        this.$emit('open-drawer', this.booking);
      } else {
        this.extendedEntity = !this.extendedEntity;
      }
    },
    showPaymentDetails() {
      this.extendedPaymentEntity = !this.extendedPaymentEntity;
      this.extendedEditEntity = false;
      this.extendedTransferEntity = false;
      this.extendedProfessionalEntity = false;
      this.newConfirmationData = {
        processPaymentNow: false,
      };
    },
    async showProfessionalDetails() {
      this.extendedProfessionalEntity = !this.extendedProfessionalEntity;

      // Consultar datos frescos del booking cuando se abre el collapsible
      if (this.extendedProfessionalEntity) {
        await this.refreshBookingDataWithoutOverriding();
      }

      // Forzar focus en el input cuando se muestra la sección
      if (this.extendedProfessionalEntity) {
        this.$nextTick(() => {
          if (this.$refs.commissionInputRef) {
            setTimeout(() => {
              this.$refs.commissionInputRef.focus();
            }, 100);
          }
        });
      }
      this.extendedPaymentEntity = false;
      this.extendedEditEntity = false;
      this.extendedTransferEntity = false;
      // Cargar profesionales solo cuando se abre la sección
      if (this.extendedProfessionalEntity && this.professionals.length === 0) {
        this.loadProfessionals();
      }
    },
    handleProfessionalSelected(professional) {
      this.selectedProfessional = professional;
      // Solo establecer la comisión por defecto si el usuario no ha editado el campo
      // Usar una bandera para rastrear si el usuario ha editado manualmente
      if (professional && professional.financialInfo && !this.commissionManuallyEdited) {
        const { commissionType, commissionValue } = professional.financialInfo;
        if (commissionValue !== undefined && commissionValue !== null) {
          this.professionalCommission = commissionValue;
        }
      }
    },
    handleProfessionalIdChanged(professionalId) {
      // Cuando cambia el ID del profesional seleccionado en el dropdown
      if (professionalId) {
        // Buscar el profesional completo en la lista
        const professional = this.professionals.find(p => p.id === professionalId);
        if (professional) {
          this.handleProfessionalSelected(professional);
        }
      } else {
        // Si se deselecciona el profesional
        this.selectedProfessional = null;
        if (!this.commissionManuallyEdited) {
          this.professionalCommission = null;
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

      // Actualizar el valor directamente
      this.professionalCommission = value;
    },
    handleCommissionFocus(event) {
      // Handle commission input focus event
      // Aplicar los mismos fixes que funcionaron en los inputs de prueba
      const input = event.target;

      // Forzar habilitación completa
      input.disabled = false;
      input.readOnly = false;
      input.removeAttribute('disabled');
      input.removeAttribute('readonly');
      input.removeAttribute('aria-disabled');

      // Aplicar estilos ultra-agresivos que funcionaron
      input.style.setProperty('pointer-events', 'auto', 'important');
      input.style.setProperty('user-select', 'text', 'important');
      input.style.setProperty('-webkit-user-select', 'text', 'important');
      input.style.setProperty('cursor', 'text', 'important');
      input.style.setProperty('background', 'white', 'important');
      input.style.setProperty('z-index', '999999999', 'important');
      input.style.setProperty('position', 'relative', 'important');
      input.style.setProperty('opacity', '1', 'important');
      input.style.setProperty('visibility', 'visible', 'important');

    },
    ensureInputsAreInteractive() {
      // Método completamente vacío para evitar errores
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
    getSuggestedCommission() {
      if (!this.selectedProfessional || !this.selectedProfessional.financialInfo) {
        return '';
      }
      const { commissionType, commissionValue } = this.selectedProfessional.financialInfo;
      if (!commissionValue) return '';

      if (commissionType === 'PERCENTAGE') {
        return `${commissionValue}%`;
      }
      return `${commissionValue} ${this.commerce?.currency || 'BRL'}`;
    },
    // PROFESSIONAL PAYMENT COMMISSION DATA
    getAssignedProfessionalCommissionData() {
      // DEBUG object for development
      const debugData = {
        'this.booking?.professionalCommissionType': this.booking?.professionalCommissionType,
        'typeof': typeof this.booking?.professionalCommissionType,
        'this.booking?.professionalCommissionValue': this.booking?.professionalCommissionValue,
        'typeof value': typeof this.booking?.professionalCommissionValue,
        'condition result': !!(this.booking?.professionalCommissionType && this.booking?.professionalCommissionValue)
      };

      if (!this.booking?.professionalName) {
        return { id: null, name: null, commission: null, commissionType: null, suggestedAmount: 0 };
      }

      // DEBUG: Comentar toda la lógica intermedia para ir directo al final
      /*
        professionalCommission: this.professionalCommission,
        'booking.professionalCommissionType': this.booking?.professionalCommissionType,
        'booking.professionalCommissionValue': this.booking?.professionalCommissionValue,
        'booking.confirmationData': this.booking?.confirmationData,
        'booking.confirmationData.professionalCommissionValue': this.booking?.confirmationData?.professionalCommissionValue,
        'selectedProfessional': this.selectedProfessional?.financialInfo
      });

      // Si el usuario ha editado manualmente la comisión, usar ese valor
      if (this.commissionManuallyEdited && this.professionalCommission !== null && this.professionalCommission !== undefined && this.professionalCommission !== '') {
        const manualCommissionValue = typeof this.professionalCommission === 'string'
          ? parseFloat(this.professionalCommission)
          : Number(this.professionalCommission);

        if (manualCommissionValue > 0) {
          let suggestedAmount = 0;

          // Calculate percentage of payment amount if available
          if (this.newConfirmationData.paymentAmount) {
            suggestedAmount = Math.round(
              (this.newConfirmationData.paymentAmount * manualCommissionValue) / 100,
            );
          }


          return {
            id: this.selectedProfessional?.id || this.booking.professionalId,
            name: this.booking.professionalName,
            commission: manualCommissionValue,
            commissionType: 'PERCENTAGE',
            suggestedAmount,
          };
        }
      }

      // 1. Primero intentar usar datos guardados directamente en el booking
      if (this.booking?.professionalCommissionType && this.booking?.professionalCommissionValue) {
        const { professionalCommissionType, professionalCommissionValue } = this.booking;
        let suggestedAmount = 0;

        if (professionalCommissionValue && professionalCommissionValue > 0) {
          if (professionalCommissionType === 'PERCENTAGE') {
            // Calculate percentage of payment amount if available
            if (this.newConfirmationData.paymentAmount) {
              suggestedAmount = Math.round(
                (this.newConfirmationData.paymentAmount * professionalCommissionValue) / 100,
              );
            } else if (this.booking.professionalCommissionAmount) {
              suggestedAmount = this.booking.professionalCommissionAmount;
            }
          } else {
            suggestedAmount = Number(professionalCommissionValue);
          }
        }

          professionalCommissionValue,
          professionalCommissionType,
          rawType: this.booking.professionalCommissionType
        });

        return {
          id: this.selectedProfessional?.id || this.booking.professionalId,
          name: this.booking.professionalName,
          commission: professionalCommissionValue,
          commissionType: professionalCommissionType,
          suggestedAmount,
        };
      }

      // 2. Fallback: intentar usar datos de confirmationData (guardados al asignar profesional)
      if (
        this.booking?.confirmationData?.professionalCommissionType &&
        this.booking?.confirmationData?.professionalCommissionValue
      ) {
        const { professionalCommissionType, professionalCommissionValue } =
          this.booking.confirmationData;
        let suggestedAmount = 0;

        if (professionalCommissionValue && professionalCommissionValue > 0) {
          if (professionalCommissionType === 'PERCENTAGE') {
            // Calculate percentage of payment amount if available
            if (this.newConfirmationData.paymentAmount) {
              suggestedAmount = Math.round(
                (this.newConfirmationData.paymentAmount * professionalCommissionValue) / 100,
              );
            } else if (this.booking.confirmationData?.professionalCommissionAmount) {
              suggestedAmount = this.booking.confirmationData.professionalCommissionAmount;
            }
          } else {
            suggestedAmount = Number(professionalCommissionValue);
          }
        }


        return {
          id: this.selectedProfessional?.id || this.booking.professionalId,
          name: this.booking.professionalName,
          commission: professionalCommissionValue,
          commissionType: professionalCommissionType,
          suggestedAmount,
        };
      }

      // 3. Fallback: usar selectedProfessional (si está disponible)
      if (this.selectedProfessional?.financialInfo) {
        const { commissionType, commissionValue } = this.selectedProfessional.financialInfo;
        let suggestedAmount = 0;

        if (commissionValue) {
          if (commissionType === 'PERCENTAGE') {
            // Calculate percentage of payment amount if available
            if (this.newConfirmationData.paymentAmount) {
              suggestedAmount = Math.round(
                (this.newConfirmationData.paymentAmount * commissionValue) / 100,
              );
            }
          } else {
            suggestedAmount = Number(commissionValue);
          }
        }


        return {
          id: this.selectedProfessional.id,
          name: this.booking.professionalName,
          commission: commissionValue,
          commissionType: commissionType,
          suggestedAmount,
        };
      }

      // 3. Si hay professionalId pero no selectedProfessional, intentar cargar automáticamente
      if (
        this.booking?.professionalId &&
        !this.selectedProfessional &&
        !this.loadingProfessionalData
      ) {
        // Evitar loops infinitos con flag
        this.loadProfessionalDataIfNeeded();
      }
      */

      // TEMPORARY DEBUG VERSION - FORCE USE BOOKING DATA DIRECTLY
      return {
        id: this.booking.professionalId,
        name: this.booking.professionalName,
        commission: this.booking.professionalCommissionValue || null,
        commissionType: this.booking.professionalCommissionType || 'UNKNOWN',
        suggestedAmount: 0,
      };
    },
    getFormattedCommissionForDisplay() {
      const data = this.getAssignedProfessionalCommissionData();
      if (!data.commission || !data.commissionType) {
        return null;
      }

      if (data.commissionType === 'PERCENTAGE') {
        return `${data.commission}%`;
      } else {
        return `${data.commission} ${this.commerce?.currency || 'BRL'}`;
      }
    },
    async loadProfessionals() {
      if (!this.booking || !this.booking.commerceId) {
        return;
      }
      console.log(
        '[BookingDetailsCard] Loading professionals for commerce:',
        this.booking.commerceId,
      );
      try {
        this.professionals = await getActiveProfessionalsByCommerce(this.booking.commerceId);
        console.log(
          '[BookingDetailsCard] Professionals loaded:',
          this.professionals.length,
          this.professionals,
        );
      } catch (error) {
        console.error('[BookingDetailsCard] Error loading professionals:', error);
        this.professionals = [];
      }
    },
    async loadProfessionalDataIfNeeded() {
      // Prevenir llamadas múltiples
      if (this.loadingProfessionalData) {
        return;
      }

      this.loadingProfessionalData = true;
      try {
        // Cargar comisión guardada si hay profesional asignado
        // Primero intentar desde campos directos del booking
        if (this.booking?.professionalName && this.booking?.professionalCommissionValue) {
          this.professionalCommission = this.booking.professionalCommissionValue;
          this.commissionManuallyEdited = true; // Marcar como editada para mantener prioridad
        }
        // Fallback: desde confirmationData
        else if (this.booking?.professionalName && this.booking?.confirmationData?.professionalCommissionValue) {
          this.professionalCommission = this.booking.confirmationData.professionalCommissionValue;
          this.commissionManuallyEdited = true; // Marcar como editada para mantener prioridad
        }

        // Solo cargar si existe professionalId pero no selectedProfessional
        if (
          this.booking?.professionalId &&
          (!this.selectedProfessional || !this.selectedProfessional.financialInfo)
        ) {
          console.log(
            '[BookingDetailsCard] Auto-loading professional data for:',
            this.booking.professionalId
          );

          // Cargar profesionales si no están cargados
          if (this.professionals.length === 0) {
            await this.loadProfessionals();
          }

          // Buscar el profesional asignado
          let professional =
            this.professionals.find(p => p.id === this.booking.professionalId) || null;

          // If not found or incomplete, fetch by id to ensure commission info is available
          if (
            !professional ||
            !professional.financialInfo ||
            professional.financialInfo.commissionValue === undefined
          ) {
            professional = await getProfessionalById(this.booking.professionalId);
          }

          if (professional) {
            this.selectedProfessional = professional;
          }
        }
      } catch (error) {
        console.error('[BookingDetailsCard] Error loading professional data:', error);
      } finally {
        this.loadingProfessionalData = false;
      }
    },
    async refreshBookingData() {
      if (!this.booking?.id) {
        return;
      }

      try {
        this.loading = true; // Show loading indicator
        const freshBooking = await getBookingDetails(this.booking.id);


        if (freshBooking) {
          // Update booking data with fresh information
          this.booking.professionalId = freshBooking.professionalId;
          this.booking.professionalName = freshBooking.professionalName;
          this.booking.professionalCommissionType = freshBooking.professionalCommissionType;
          this.booking.professionalCommissionValue = freshBooking.professionalCommissionValue;
          this.booking.professionalCommissionAmount = freshBooking.professionalCommissionAmount;
          this.booking.professionalCommissionNotes = freshBooking.professionalCommissionNotes;

          // Also update confirmationData if it exists
          if (freshBooking.confirmationData) {
            this.booking.confirmationData = freshBooking.confirmationData;
          }

          console.log({
            professionalId: this.booking.professionalId,
            professionalName: this.booking.professionalName,
            professionalCommissionType: this.booking.professionalCommissionType,
            professionalCommissionValue: this.booking.professionalCommissionValue
          });

          // Load fresh commission data
          if (this.booking.professionalCommissionValue) {
            this.professionalCommission = this.booking.professionalCommissionValue;
            this.commissionManuallyEdited = true;
          }

          // Emit event to notify parent component of data changes
          this.$emit('booking-updated', this.booking);

        } else {
          console.warn('[BookingDetailsCard] No fresh booking data received');
        }
      } catch (error) {
        console.error('[BookingDetailsCard] Error refreshing booking data:', error);
        console.error('[BookingDetailsCard] Error details:', error.message, error.stack);
      } finally {
        this.loading = false; // Hide loading indicator
      }
    },
    async refreshBookingDataWithoutOverriding() {
      if (!this.booking?.id) {
        return;
      }

      try {
        this.loading = true;
        const freshBooking = await getBookingDetails(this.booking.id);


        if (freshBooking) {
          // Update booking data with fresh information
          this.booking.professionalId = freshBooking.professionalId;
          this.booking.professionalName = freshBooking.professionalName;
          this.booking.professionalCommissionType = freshBooking.professionalCommissionType;
          this.booking.professionalCommissionValue = freshBooking.professionalCommissionValue;
          this.booking.professionalCommissionAmount = freshBooking.professionalCommissionAmount;
          this.booking.professionalCommissionNotes = freshBooking.professionalCommissionNotes;

          // Also update confirmationData if it exists
          if (freshBooking.confirmationData) {
            this.booking.confirmationData = freshBooking.confirmationData;
          }

          console.log({
            professionalId: this.booking.professionalId,
            professionalName: this.booking.professionalName,
            professionalCommissionType: this.booking.professionalCommissionType,
            professionalCommissionValue: this.booking.professionalCommissionValue
          });

          // NO cargar comisión si el usuario ya editó manualmente
          if (!this.commissionManuallyEdited && this.booking.professionalCommissionValue) {
            this.professionalCommission = this.booking.professionalCommissionValue;
          } else if (this.commissionManuallyEdited) {
          }

          // Emit event to notify parent component of data changes
          this.$emit('booking-updated', this.booking);

        } else {
          console.warn('[BookingDetailsCard] No fresh booking data received');
        }
      } catch (error) {
        console.error('[BookingDetailsCard] Error refreshing booking data:', error);
        console.error('[BookingDetailsCard] Error details:', error.message, error.stack);
      } finally {
        this.loading = false;
      }
    },
    async goAssignProfessional() {
      if (!this.selectedProfessional) {
        this.alertError =
          this.$t('professionals.selectProfessionalFirst') || 'Por favor seleccione un profesional';
        return;
      }
      // NO llamar handleProfessionalSelected aquí para evitar sobrescribir la comisión editada
      this.goToAssignProfessional = !this.goToAssignProfessional;
    },
    cancelAssignProfessional() {
      this.goToAssignProfessional = false;
    },
    async confirmAssignProfessional() {
      if (!this.selectedProfessional) {
        this.alertError =
          this.$t('professionals.selectProfessionalFirst') || 'Por favor seleccione un profesional';
        return;
      }
      try {
        this.loading = true;
        this.alertError = '';
        if (this.booking && this.booking.id) {
          // Usar la comisión editada por el usuario si existe, sino usar la del profesional
          // Convertir a número si es string
          let commissionToUse = null;
          if (this.professionalCommission !== null && this.professionalCommission !== undefined && this.professionalCommission !== '') {
            commissionToUse = typeof this.professionalCommission === 'string'
              ? parseFloat(this.professionalCommission)
              : this.professionalCommission;
            // Validar que sea un número válido
            if (isNaN(commissionToUse)) {
              commissionToUse = null;
            }
          }
          if (commissionToUse === null) {
            commissionToUse = this.selectedProfessional.financialInfo?.commissionValue || null;
          }
          const commissionType = this.selectedProfessional.financialInfo?.commissionType || null;

          await assignProfessional(
            this.booking.id,
            this.selectedProfessional.id,
            this.selectedProfessional.personalInfo?.name || this.selectedProfessional.name,
            commissionToUse,
            commissionType,
          );
          this.$emit('booking-updated');
          this.goToAssignProfessional = false;
          this.extendedProfessionalEntity = false;
          this.commissionManuallyEdited = false; // Reset flag
        }
        this.loading = false;
      } catch (error) {
        this.loading = false;
        this.alertError =
          error.response?.data?.message ||
          error.message ||
          this.$t('professionals.assignError') ||
          'Error al asignar profesional';
      }
    },
    async showEditDetails() {
      try {
        const wasOpen = this.extendedEditEntity;
        this.extendedEditEntity = !this.extendedEditEntity;
        this.extendedPaymentEntity = false;
        this.extendedTransferEntity = false;
        this.extendedProfessionalEntity = false;

        if (this.extendedEditEntity === true) {
          // Load queue and other data first, then show the picker
          await this.toEdit();
          // Show picker after queue is loaded
          this.showBookingDataPicker = true;
        } else {
          // Reset when closing
          this.showBookingDataPicker = false;
        }
      } catch (error) {
        console.error('Error in showEditDetails:', error);
        // If opening failed, still try to show picker if we have booking data
        if (this.extendedEditEntity && this.booking?.queueId) {
          this.showBookingDataPicker = true;
        }
      }
    },
    async showTransferDetails() {
      this.extendedTransferEntity = !this.extendedTransferEntity;
      this.extendedEditEntity = false;
      this.extendedPaymentEntity = false;
      this.extendedProfessionalEntity = false;
      if (this.extendedTransferEntity === true) {
        await this.toTransfer();
      }
    },
    getDate(dateIn, timeZoneIn) {
      return getDate(dateIn, timeZoneIn);
    },
    copyBooking() {
      const textToCopy = jsonToCsv([this.booking]);
      navigator.clipboard.writeText(textToCopy);
    },
    async cancel() {
      try {
        this.loading = true;
        if (this.booking && this.booking.id) {
          await cancelBooking(this.booking.id);
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
        getActiveFeature(this.commerce, 'booking-confirm-payment', 'PRODUCT')
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
      // Prevent action if booking is cancelled or processed
      if (this.isBookingCancelledOrProcessed) {
        this.alertError = 'No se puede confirmar el pago de una reserva cancelada o procesada';
        return;
      }
      try {
        this.loading = true;
        this.alertError = '';
        if (this.booking && this.booking.id) {
          if (this.validateConfirm(this.newConfirmationData)) {
            const body = {
              confirmationData: {
                paid: true,
                paymentDate: new Date(),
                ...this.newConfirmationData,
              },
            };
            const updatedBooking = await confirmBooking(this.booking.id, body);

            // Emit event to refresh the booking list - let parent component handle the update
            if (updatedBooking) {
              // Emit event with the updated booking data to parent component
              this.$emit('booking-updated', updatedBooking);
            }

            // Close the payment modal after successful confirmation
            this.extendedPaymentEntity = false;
            this.goToConfirm1 = false;
            this.goToConfirm2 = false;

          }
        }
        this.loading = false;
      } catch (error) {
        this.loading = false;
        this.alertError = error.message;
        console.error('[BookingDetailsCard] Error confirming booking payment:', error);
      }
    },
    async toTransfer() {
      try {
        this.loading = true;
        // Reset queuesToTransfer
        this.queuesToTransfer = [];
        this.queueToTransfer = null;

        if (this.booking && this.booking.queueId) {
          try {
            this.queue = await getQueueById(this.booking.queueId);
          } catch (error) {
            console.error('Error loading queue:', error);
            this.queue = {};
          }
        }

        const queuesToTransfer = this.queues; //this.queues.filter(queue => queue.type === 'PROFESSIONAL');
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

        if (!this.booking || !this.booking.date) {
          console.warn('Booking or booking.date is not available');
          // If no date, add all queues
          this.queuesToTransfer = [...queuesToTransfer];
          this.loading = false;
          return;
        }

        try {
          const date = this.booking.date;
          const bookings = await getPendingCommerceBookingsByDate(this.commerce.id, date);
          if (bookings && bookings.length > 0) {
            const groupedBookings = bookings.reduce((acc, book) => {
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
              const bookingsByQueue = groupedBookings[queue.id];
              if (bookingsByQueue && bookingsByQueue.length > 0) {
                const bookingsReserved = bookingsByQueue
                  .map(booking => {
                    if (booking.block) {
                      if (booking.block.blockNumbers && booking.block.blockNumbers.length > 0) {
                        return [...booking.block.blockNumbers];
                      } else if (booking.block.number !== undefined) {
                        return booking.block.number;
                      }
                    }
                    return null;
                  })
                  .filter(Boolean);
                const totalBlocksReserved = bookingsReserved.flat(Infinity).sort();
                const uniqueBlocksReserved = [...new Set(totalBlocksReserved)];
                const blockedBlocks = [];
                uniqueBlocksReserved.forEach(block => {
                  const times = totalBlocksReserved.filter(reserved => reserved === block).length;
                  if (times >= limit - 1) {
                    blockedBlocks.push(block);
                  }
                });
                let blocksToCheck = [];
                if (this.booking.block) {
                  blocksToCheck =
                    this.booking.block.blockNumbers ||
                    (this.booking.block.number !== undefined ? [this.booking.block.number] : []);
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
            // If no bookings, add all queues
            this.queuesToTransfer = [...queuesToTransfer];
          }
        } catch (error) {
          console.error('Error loading pending bookings:', error);
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
      // Prevent action if booking is cancelled or processed
      if (this.isBookingCancelledOrProcessed) {
        this.alertError = 'No se puede transferir una reserva cancelada o procesada';
        return;
      }
      try {
        this.loading = true;
        if (!this.booking || !this.booking.id) {
          throw new Error('Reserva no disponible');
        }
        if (!this.queueToTransfer) {
          throw new Error('Por favor seleccione una fila para transferir');
        }
        const body = {
          queueId: this.queueToTransfer,
        };
        const updatedBooking = await transferBooking(this.booking.id, body);

        // Emit event to parent to refresh booking data
        this.$emit('booking-updated', updatedBooking || this.booking);
        this.goToTransfer = false;
        this.queueToTransfer = null;
        this.queuesToTransfer = [];
      } catch (error) {
        console.error('Error transferring booking:', error);
        this.alertError = error.message || 'Error al transferir la reserva';
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
    async toEdit() {
      try {
        // Get queue information first - this is critical for the date picker
        if (this.booking && this.booking.queueId) {
          try {
            this.queue = await getQueueById(this.booking.queueId);
            if (!this.queue || !this.queue.id) {
              console.warn('BookingDetailsCard: Queue loaded but missing id. Queue:', this.queue);
            }
          } catch (error) {
            console.error('Error loading queue:', error);
            // Set a minimal queue object with just the id so the picker can work
            if (this.booking.queueId) {
              this.queue = { id: this.booking.queueId };
            }
          }
        } else {
          console.warn('BookingDetailsCard: No queueId in booking. Cannot load queue.');
        }

        // Set amount of blocks needed based on booking block data
        if (this.booking?.block) {
          if (
            this.booking.block.blockNumbers &&
            Array.isArray(this.booking.block.blockNumbers) &&
            this.booking.block.blockNumbers.length > 0
          ) {
            this.amountofBlocksNeeded = this.booking.block.blockNumbers.length;
          } else if (this.booking.block.number) {
            this.amountofBlocksNeeded = 1;
          }
        } else {
          // Default to 1 block if no block data
          this.amountofBlocksNeeded = 1;
        }
      } catch (error) {
        console.error('Error in toEdit:', error);
        // Set minimal queue if we have queueId
        if (this.booking?.queueId) {
          this.queue = { id: this.booking.queueId };
        }
        this.amountofBlocksNeeded = 1;
      }
    },
    async edit() {
      try {
        this.loading = true;
        if (this.booking && this.booking.id) {
          const body = {
            date: this.dateToEdit,
            block: this.blockToEdit,
          };
          const updatedBooking = await editBooking(this.booking.id, body);

          // Emit event to parent to refresh booking data
          this.$emit('booking-updated', updatedBooking || this.booking);
        }
        this.loading = false;
        this.goToEdit = false;
      } catch (error) {
        this.loading = false;
        this.alertError = error.message;
      }
    },
    async getAvailableDatesByMonth(pages) {
      await this.$emit('getAvailableDatesByCalendarMonth', pages);
    },
    goEdit() {
      this.goToEdit = !this.goToEdit;
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
    cancelEdit() {
      this.goToEdit = false;
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
    async goConfirm1() {
      // Refresh booking data to get latest commission information
      await this.refreshBookingData();

      this.goToConfirm1 = !this.goToConfirm1;
    },
    confirmCancel1() {
      this.goToConfirm1 = false;
    },
    async goConfirm2() {
      // Refresh booking data to get latest commission information
      await this.refreshBookingData();

      this.goToConfirm2 = !this.goToConfirm2;
    },
    confirmCancel2() {
      this.goToConfirm2 = false;
    },
    receiveData(data) {
      if (data) {
        if (data.procedureNumber !== undefined && data.procedureNumber >= 0) {
          this.newConfirmationData.procedureNumber = data.procedureNumber;
        }
        if (data.proceduresTotalNumber !== undefined && data.proceduresTotalNumber >= 0) {
          this.newConfirmationData.proceduresTotalNumber = data.proceduresTotalNumber;
        }
        if (data.paymentFiscalNote) {
          this.newConfirmationData.paymentFiscalNote = data.paymentFiscalNote;
        }
        if (data.paymentType) {
          this.newConfirmationData.paymentType = data.paymentType;
        }
        if (data.paymentMethod) {
          this.newConfirmationData.paymentMethod = data.paymentMethod;
        }
        if (data.paymentAmount !== undefined && data.paymentAmount >= 0) {
          this.newConfirmationData.paymentAmount = data.paymentAmount;

          // AUTO-SUGGEST COMMISSION based on professional assigned and payment amount
          if (this.booking?.professionalName && data.paymentAmount > 0) {
            const commissionData = this.getAssignedProfessionalCommissionData();
            if (
              commissionData.suggestedAmount > 0 &&
              (!data.paymentCommission || data.paymentCommission === 0)
            ) {
              this.newConfirmationData.paymentCommission = commissionData.suggestedAmount;
            }
          }
        }
        if (data.totalAmount !== undefined && data.totalAmount >= 0) {
          this.newConfirmationData.totalAmount = data.totalAmount;
        }
        if (data.installments !== undefined && data.installments >= 0) {
          this.newConfirmationData.installments = data.installments;
        }
        if (data.paymentCommission !== undefined && data.paymentCommission >= 0) {
          this.newConfirmationData.paymentCommission = data.paymentCommission;
        }
        if (data.paymentComment) {
          this.newConfirmationData.paymentComment = data.paymentComment;
        }
        if (data.packageId) {
          this.newConfirmationData.packageId = data.packageId;
        }
        if (data.pendingPaymentId) {
          this.newConfirmationData.pendingPaymentId = data.pendingPaymentId;
        }
        if (data.processPaymentNow !== undefined) {
          this.newConfirmationData.processPaymentNow = data.processPaymentNow;
        }

        // ADD PROFESSIONAL DATA FOR INCOME CREATION
        if (this.booking?.professionalId) {
          this.newConfirmationData.professionalId = this.booking.professionalId;
        }
        // Add the suggested commission amount (already calculated in PaymentForm)
        if (this.newConfirmationData.paymentCommission) {
          this.newConfirmationData.professionalCommissionAmount =
            this.newConfirmationData.paymentCommission;
        }
        if (data.packagePaid !== undefined) {
          this.newConfirmationData.packagePaid = data.packagePaid;
        }
        if (data.packagePaid !== undefined) {
          this.newConfirmationData.confirmInstallments = data.confirmInstallments;
        }
        if (data.processPaymentNow === false) {
          this.errorsAdd = [];
        }
      }
    },
    receiveBookingEdit(data) {
      if (data) {
        if (data.date) {
          this.dateToEdit = data.date;
        }
        if (data.block) {
          this.blockToEdit = data.block;
        }
      }
    },
    formatIdNumber(commerce, idNumber) {
      return formatIdNumber(commerce, idNumber);
    },
    getStatusIcon() {
      if (this.booking.status === 'PENDING') return 'bi bi-clock-fill';
      if (this.booking.status === 'CONFIRMED') return 'bi bi-check-circle-fill';
      if (this.booking.status === 'CANCELLED' || this.booking.status === 'RESERVE_CANCELLED') return 'bi bi-x-circle-fill';
      return 'bi bi-calendar-check-fill';
    },
    getStatusIconClass() {
      if (this.booking.status === 'CONFIRMED') return 'icon-success';
      if (this.booking.status === 'PENDING') return 'icon-warning';
      if (this.booking.status === 'CANCELLED' || this.booking.status === 'RESERVE_CANCELLED') return 'icon-error';
      return 'icon-info';
    },
    getStatusTooltip() {
      if (this.booking.status === 'PENDING') return 'Reserva pendente';
      if (this.booking.status === 'CONFIRMED') return 'Reserva confirmada';
      if (this.booking.status === 'CANCELLED' || this.booking.status === 'RESERVE_CANCELLED') return 'Reserva cancelada';
      return 'Estado da reserva';
    },
    getCardTypeClass() {
      if (this.booking.status === 'CONFIRMED') return 'booking-card-success';
      if (this.booking.status === 'PENDING') return 'booking-card-warning';
      if (this.booking.status === 'CANCELLED' || this.booking.status === 'RESERVE_CANCELLED') return 'booking-card-error';
      return 'booking-card-info';
    },
  },
  watch: {
    booking: {
      handler(newVal) {
        // Cargar comisión guardada si hay profesional asignado
        // Primero intentar desde campos directos del booking
        if (newVal && newVal.professionalName && newVal.professionalCommissionValue) {
          this.professionalCommission = newVal.professionalCommissionValue;
          this.commissionManuallyEdited = true; // Marcar como editada para mantener prioridad
        }
        // Fallback: cargar desde confirmationData
        else if (newVal && newVal.professionalName && newVal.confirmationData?.professionalCommissionValue) {
          this.professionalCommission = newVal.confirmationData.professionalCommissionValue;
          this.commissionManuallyEdited = true; // Marcar como editada para mantener prioridad
        }

        // Auto-cargar datos del profesional si es necesario
        if (newVal && newVal.professionalId && !this.selectedProfessional) {
          this.$nextTick(() => {
            this.loadProfessionalDataIfNeeded();
          });
        }
      },
      immediate: true,
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
};
</script>

<template>
  <div v-if="show && booking" data-booking-component="BookingDetailsCard">
    <!-- Card view - hidden when details are already opened (modal mode) -->
    <div
      v-if="!detailsOpened"
      class="booking-row-card"
      :class="getCardTypeClass()"
      @click.prevent="showDetails()"
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
        <div v-if="booking.servicesDetails || booking.packageId" class="service-badges-inline">
          <span
            v-for="serv in booking.servicesDetails"
            :key="serv.id"
            class="badge-mini service-tag-mini"
          >
            {{ serv.name }}
          </span>
          <span v-if="booking.packageId" class="badge-mini service-tag-mini bg-secondary">
            <i class="bi bi-box-fill"></i> {{ booking.packageProcedureNumber }}
          </span>
        </div>

        <!-- Client Info - Horizontal -->
        <div class="booking-info-inline">
          <div class="booking-name-inline">
            <span class="booking-name-text">{{
              booking.user?.name?.split(' ')[0].toUpperCase() || 'N/I'
            }}</span>
            <Popper :class="'dark'" arrow disable-click-away hover>
              <template #content>
                <div>Copiar dados da reserva</div>
              </template>
              <button class="btn-copy-mini" @click.stop="copyBooking()">
                <i class="bi bi-file-earmark-spreadsheet"></i>
              </button>
            </Popper>
          </div>
          <div class="booking-meta-inline">
            <span class="booking-time-inline" v-if="booking.block && booking.block.hourFrom">
              {{ booking.block.hourFrom }} - {{ booking.block.hourTo }}
            </span>
            <Popper
              v-if="booking.termsConditionsAcceptedCode"
              :class="'dark'"
              arrow
              disable-click-away
              hover
            >
              <template #content>
                <div>Termos e condições aceitos</div>
              </template>
              <i class="bi bi-person-fill-check icon-mini-separated" @click.stop></i>
            </Popper>
            <i
              v-if="booking.confirmationData?.paid"
              class="bi bi-coin icon-mini-separated blue-icon"
              @click.stop
            ></i>
            <i
              v-if="booking.transfered"
              class="bi bi-arrow-left-right icon-mini-separated blue-icon"
              @click.stop
            ></i>
            <i v-if="booking.edited" class="bi bi-pencil-fill icon-mini-separated" @click.stop></i>
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
    <!-- Details section - always shown when extendedEntity is true or detailsOpened is true -->
    <div v-if="extendedEntity || detailsOpened" class="booking-details-expanded">
      <div :class="{ show: extendedEntity }" class="transition-slow">
        <!-- Client Info - Matching Attention Style -->
        <div class="attention-client-info">
          <div class="attention-client-header">
            <div class="attention-client-name-section">
              <div class="attention-client-avatar">
                <i class="bi bi-person-circle"></i>
              </div>
              <div class="attention-client-details">
                <span class="attention-client-name"
                  >{{ booking.user.name || 'N/I' }} {{ booking.user.lastName || '' }}</span
                >
                <span v-if="booking && booking.number" class="attention-number-badge-inline">
                  #{{ booking.number }}
                </span>
                <!-- Paid Status Badge -->
                <div
                  v-if="booking.confirmationData?.paid || booking.confirmed"
                  class="attention-paid-badge"
                  :title="$t('collaboratorBookingsView.paymentConfirmed') || 'Pagamento Confirmado'"
                >
                  <i class="bi bi-check-circle-fill"></i>
                  <span class="paid-text">{{ $t('dashboard.paid') }}</span>
                </div>
                <button class="btn-copy-mini" @click="copyBooking()" title="Copiar dados">
                  <i class="bi bi-file-earmark-spreadsheet"></i>
                </button>
                <button
                  v-if="
                    booking &&
                    booking.status !== 'USER_CANCELED' &&
                    !booking.cancelled &&
                    !isBookingProcessed
                  "
                  class="btn btn-sm btn-size fw-bold btn-danger rounded-pill px-3 card-action"
                  @click="goCancel()"
                  :disabled="
                    booking.status === 'USER_CANCELED' ||
                    booking.cancelled ||
                    isBookingProcessed ||
                    (togglesLoaded && !toggles['collaborator.bookings.cancel'] && !toggles['business.bookings.manage'])
                  "
                  title="Cancelar reserva"
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
              :href="'https://wa.me/' + booking.user.phone"
              target="_blank"
            >
              <div class="contact-icon-wrapper whatsapp-bg">
                <i class="bi bi-whatsapp"></i>
              </div>
              <span class="contact-text">{{ booking.user.phone || 'N/I' }}</span>
            </a>
            <a
              class="attention-contact-item email-item"
              :href="'mailto:' + booking.user.email"
              target="_blank"
            >
              <div class="contact-icon-wrapper email-bg">
                <i class="bi bi-envelope"></i>
              </div>
              <span class="contact-text">{{ booking.user.email || 'N/I' }}</span>
            </a>
            <div class="attention-contact-item id-item">
              <div class="contact-icon-wrapper id-bg">
                <i class="bi bi-person-vcard"></i>
              </div>
              <span class="contact-text">{{
                formatIdNumber(commerce, booking.user.idNumber) || 'N/I'
              }}</span>
            </div>
          </div>
        </div>
        <!-- Booking Context Info - Matching Attention Style -->
        <div
          v-if="
            selectedQueue ||
            (queue && queue.name) ||
            (booking && booking.queueName) ||
            booking.block ||
            booking.professionalName ||
            (booking.services && booking.services.length > 0) ||
            booking.date
          "
          class="attention-context-info-compact"
        >
          <div
            v-if="selectedQueue || (queue && queue.name) || (booking && booking.queueName)"
            class="attention-context-item-inline"
          >
            <i class="bi bi-person-lines-fill"></i>
            <span class="attention-context-label-inline">Fila</span>
            <span class="attention-context-value-inline">{{
              selectedQueue?.name || queue?.name || booking?.queueName || 'N/I'
            }}</span>
          </div>
          <div v-if="booking.block" class="attention-context-item-inline">
            <i class="bi bi-clock-fill"></i>
            <span class="attention-context-label-inline">Horário</span>
            <span class="attention-context-value-inline">
              {{ booking.block.hourFrom || 'N/I' }}
              <span v-if="booking.block.hourTo"> - {{ booking.block.hourTo }}</span>
            </span>
          </div>
          <div v-if="booking.professionalName" class="attention-context-item-inline">
            <i class="bi bi-person-badge"></i>
            <span class="attention-context-label-inline">{{
              $t('professionals.professional') || 'Profesional'
            }}</span>
            <span class="attention-context-value-inline">{{
              booking.professionalName || 'N/I'
            }}</span>
          </div>
          <div v-if="booking.date" class="attention-context-item-inline">
            <i class="bi bi-calendar-event"></i>
            <span class="attention-context-label-inline">Data</span>
            <span class="attention-context-value-inline">{{ getDate(booking.date) }}</span>
          </div>
          <div
            v-if="booking.services && booking.services.length > 0"
            class="attention-context-item-inline"
          >
            <i class="bi bi-scissors"></i>
            <span class="attention-context-label-inline">Serviço(s)</span>
            <span class="attention-context-value-inline">
              {{ booking.services.map(s => s.name).join(', ') }}
            </span>
          </div>
          <!-- Telemedicine Info -->
          <div v-if="booking.type === 'TELEMEDICINE'" class="attention-context-item-inline">
            <i class="bi bi-camera-video"></i>
            <span class="booking-context-label-inline">Telemedicina</span>
            <span class="booking-context-value-inline">
              <span v-if="booking.telemedicineConfig && booking.telemedicineConfig.type === 'VIDEO'"
                >Video</span
              >
              <span
                v-else-if="booking.telemedicineConfig && booking.telemedicineConfig.type === 'CHAT'"
                >Chat</span
              >
              <span
                v-else-if="booking.telemedicineConfig && booking.telemedicineConfig.type === 'BOTH'"
                >Video y Chat</span
              >
              <span
                v-if="booking.telemedicineConfig && booking.telemedicineConfig.recordingEnabled"
                class="ms-2"
              >
                <i class="bi bi-record-circle text-danger"></i>
              </span>
            </span>
          </div>
          <div
            v-if="
              booking.type === 'TELEMEDICINE' &&
              booking.telemedicineConfig &&
              booking.telemedicineConfig.scheduledAt
            "
            class="attention-context-item-inline"
          >
            <i class="bi bi-calendar-event"></i>
            <span class="booking-context-label-inline">Sesión Programada</span>
            <span class="booking-context-value-inline">
              {{ new Date(booking.telemedicineConfig.scheduledAt).toLocaleString() }}
            </span>
          </div>
        </div>

        <!-- Telemedicine Client Instructions -->
        <div
          v-if="booking.type === 'TELEMEDICINE'"
          class="telemedicine-instructions mt-3 p-3 border rounded bg-info bg-opacity-10"
        >
          <h6 class="mb-3 fw-bold">
            <i class="bi bi-info-circle me-2"></i>
            {{ $t('collaboratorBookingsView.telemedicineInstructions.title') }}
          </h6>
          <div class="telemedicine-instructions-content">
            <div class="mb-2">
              <strong
                ><i class="bi bi-1-circle me-2"></i
                >{{
                  $t('collaboratorBookingsView.telemedicineInstructions.preparation.title')
                }}</strong
              >
              <ul class="mb-0 mt-1 small">
                <li>
                  {{ $t('collaboratorBookingsView.telemedicineInstructions.preparation.internet') }}
                </li>
                <li>
                  {{ $t('collaboratorBookingsView.telemedicineInstructions.preparation.camera') }}
                </li>
                <li>
                  {{ $t('collaboratorBookingsView.telemedicineInstructions.preparation.location') }}
                </li>
                <li
                  v-if="
                    booking.telemedicineConfig.type === 'VIDEO' ||
                    booking.telemedicineConfig.type === 'BOTH'
                  "
                >
                  {{ $t('collaboratorBookingsView.telemedicineInstructions.preparation.device') }}
                </li>
              </ul>
            </div>
            <div class="mb-2">
              <strong
                ><i class="bi bi-2-circle me-2"></i
                >{{ $t('collaboratorBookingsView.telemedicineInstructions.access.title') }}</strong
              >
              <ul class="mb-0 mt-1 small">
                <li>{{ $t('collaboratorBookingsView.telemedicineInstructions.access.link') }}</li>
                <li>
                  {{ $t('collaboratorBookingsView.telemedicineInstructions.access.activation') }}
                </li>
                <li>{{ $t('collaboratorBookingsView.telemedicineInstructions.access.code') }}</li>
                <li>{{ $t('collaboratorBookingsView.telemedicineInstructions.access.doctor') }}</li>
              </ul>
            </div>
            <div class="mb-2">
              <strong
                ><i class="bi bi-3-circle me-2"></i
                >{{ $t('collaboratorBookingsView.telemedicineInstructions.during.title') }}</strong
              >
              <ul class="mb-0 mt-1 small">
                <li
                  v-if="
                    booking.telemedicineConfig.type === 'VIDEO' ||
                    booking.telemedicineConfig.type === 'BOTH'
                  "
                >
                  {{ $t('collaboratorBookingsView.telemedicineInstructions.during.camera') }}
                </li>
                <li
                  v-if="
                    booking.telemedicineConfig.type === 'CHAT' ||
                    booking.telemedicineConfig.type === 'BOTH'
                  "
                >
                  {{ $t('collaboratorBookingsView.telemedicineInstructions.during.chat') }}
                </li>
                <li>
                  {{ $t('collaboratorBookingsView.telemedicineInstructions.during.documents') }}
                </li>
                <li v-if="booking.telemedicineConfig.recordingEnabled">
                  <i class="bi bi-record-circle text-danger me-1"></i>
                  {{ $t('collaboratorBookingsView.telemedicineInstructions.during.recording') }}
                </li>
              </ul>
            </div>
            <div class="alert alert-warning mb-0 mt-2 small">
              <i class="bi bi-exclamation-triangle me-2"></i>
              <strong>{{
                $t('collaboratorBookingsView.telemedicineInstructions.important')
              }}</strong>
            </div>
          </div>
        </div>

        <div class="attention-divider"></div>
        <!-- CONFIRMATION DETAILS -->
        <div
          class="attention-confirmation-badges"
          v-if="booking.confirmed === true && booking.confirmationData"
        >
          <div class="attention-confirmation-header">
            <i class="bi bi-check-circle-fill"></i>
            <span>{{ $t('collaboratorBookingsView.paymentData') || 'Dados de Confirmação' }}</span>
          </div>
          <!-- Payment Details with Inline Labels Style -->
          <div class="attention-context-info-compact" v-if="booking.confirmationData">
            <div v-if="booking.confirmationData.paymentType" class="attention-context-item-inline">
              <i class="bi bi-credit-card"></i>
              <span class="attention-context-label-inline">
                {{ $t('collaboratorBookingsView.paymentType') || 'Tipo de Pago' }}
              </span>
              <span class="attention-context-value-inline">
                {{
                  $t(`paymentTypes.${booking.confirmationData.paymentType}`) ||
                  booking.confirmationData.paymentType
                }}
              </span>
            </div>

            <div
              v-if="booking.confirmationData.paymentMethod"
              class="attention-context-item-inline"
            >
              <i class="bi bi-wallet2"></i>
              <span class="attention-context-label-inline">
                {{ $t('collaboratorBookingsView.paymentMethod') || 'Método de Pago' }}
              </span>
              <span class="attention-context-value-inline">
                {{
                  $t(`paymentClientMethods.${booking.confirmationData.paymentMethod}`) ||
                  booking.confirmationData.paymentMethod
                }}
              </span>
            </div>

            <div
              v-if="booking.confirmationData.paymentFiscalNote"
              class="attention-context-item-inline"
            >
              <i class="bi bi-receipt"></i>
              <span class="attention-context-label-inline">
                {{ $t('collaboratorBookingsView.fiscalNote') || 'Nota Fiscal' }}
              </span>
              <span class="attention-context-value-inline">
                {{ booking.confirmationData.paymentFiscalNote }}
              </span>
            </div>

            <div
              v-if="booking.confirmationData.paymentAmount"
              class="attention-context-item-inline"
            >
              <i class="bi bi-coin"></i>
              <span class="attention-context-label-inline">
                {{ $t('collaboratorBookingsView.paymentAmount') || 'Valor Pagado' }}
              </span>
              <span class="attention-context-value-inline payment-amount-value">
                {{ booking.confirmationData.paymentAmount }}
              </span>
            </div>

            <div v-if="booking.confirmationData.totalAmount" class="attention-context-item-inline">
              <i class="bi bi-cash-stack"></i>
              <span class="attention-context-label-inline">
                {{ $t('collaboratorBookingsView.totalAmount') || 'Total' }}
              </span>
              <span class="attention-context-value-inline">
                {{ booking.confirmationData.totalAmount }}
              </span>
            </div>

            <div
              v-if="booking.confirmationData.paymentCommission"
              class="attention-context-item-inline"
            >
              <i class="bi bi-percent"></i>
              <span class="attention-context-label-inline">
                {{ $t('collaboratorBookingsView.commission') || 'Comissão' }}
              </span>
              <span class="attention-context-value-inline payment-commission-value">
                {{ booking.confirmationData.paymentCommission }}
              </span>
            </div>

            <div
              v-if="
                booking.confirmationData.installments && booking.confirmationData.installments > 1
              "
              class="attention-context-item-inline"
            >
              <i class="bi bi-calendar-check"></i>
              <span class="attention-context-label-inline">
                {{ $t('collaboratorBookingsView.installments') || 'Parcelas' }}
              </span>
              <span class="attention-context-value-inline">
                {{ booking.confirmationData.installments }}
              </span>
            </div>

            <div
              v-if="booking.confirmationData.packageId && booking.packageName"
              class="attention-context-item-inline"
            >
              <i class="bi bi-box-seam"></i>
              <span class="attention-context-label-inline">
                {{ $t('package.package') || 'Pacote' }}
              </span>
              <span class="attention-context-value-inline">
                {{ booking.packageName }}
              </span>
            </div>

            <div v-if="booking.confirmationData.paymentDate" class="attention-context-item-inline">
              <i class="bi bi-calendar-check"></i>
              <span class="attention-context-label-inline">
                {{ $t('collaboratorBookingsView.paymentDate') || 'Data do Pagamento' }}
              </span>
              <span class="attention-context-value-inline">
                {{ getDate(booking.confirmationData.paymentDate) }}
              </span>
            </div>
          </div>
        </div>
        <div
          v-if="booking.confirmed === true && booking.confirmationData"
          class="booking-divider"
        ></div>

        <!-- Action Buttons -->
        <div
          class="attention-actions-tabs"
          v-if="!isBookingProcessed && booking.status !== 'USER_CANCELED' && !booking.cancelled"
        >
          <button
            v-if="
              getActiveFeature(commerce, 'booking-confirm', 'PRODUCT') &&
              toggles &&
              (toggles['collaborator.bookings.confirm'] || toggles['business.bookings.manage']) &&
              booking.status !== 'USER_CANCELED' &&
              !booking.cancelled &&
              !isBookingProcessed
            "
            class="attention-action-tab"
            :class="{ 'booking-action-tab-active': extendedPaymentEntity }"
            @click.prevent="showPaymentDetails()"
            :disabled="isBookingCancelledOrProcessed"
          >
            <i class="bi bi-cash-coin"></i>
            <span>{{ $t('collaboratorBookingsView.paymentConfirm') }}</span>
            <i :class="`bi ${extendedPaymentEntity ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
          </button>
          <button
            v-if="
              getActiveFeature(commerce, 'professional-assignment-enabled', 'PRODUCT') &&
              booking.status !== 'USER_CANCELED' &&
              !booking.cancelled &&
              !isBookingProcessed
            "
            class="attention-action-tab"
            :class="{ 'booking-action-tab-active': extendedProfessionalEntity }"
            @click.prevent="showProfessionalDetails()"
            :disabled="isBookingCancelledOrProcessed"
          >
            <i class="bi bi-person-badge"></i>
            <span>{{ $t('professionals.assignProfessional') }}</span>
            <i
              :class="`bi ${extendedProfessionalEntity ? 'bi-chevron-up' : 'bi-chevron-down'}`"
            ></i>
          </button>
          <button
            v-if="
              getActiveFeature(commerce, 'booking-transfer-queue', 'PRODUCT') &&
              booking.status !== 'USER_CANCELED' &&
              !booking.cancelled &&
              !isBookingProcessed
            "
            class="attention-action-tab"
            :class="{ 'booking-action-tab-active': extendedTransferEntity }"
            @click.prevent="showTransferDetails()"
            :disabled="isBookingCancelledOrProcessed"
          >
            <i class="bi bi-arrow-left-right"></i>
            <span>{{ $t('collaboratorBookingsView.transferQueue') }}</span>
            <i :class="`bi ${extendedTransferEntity ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
          </button>
          <button
            v-if="
              getActiveFeature(commerce, 'booking-edit', 'PRODUCT') &&
              booking.status !== 'USER_CANCELED' &&
              !booking.cancelled &&
              !isBookingProcessed
            "
            class="attention-action-tab"
            :class="{ 'booking-action-tab-active': extendedEditEntity }"
            @click.prevent="showEditDetails()"
            :disabled="isBookingCancelledOrProcessed"
          >
            <i class="bi bi-pencil-fill"></i>
            <span>{{ $t('collaboratorBookingsView.edit') }}</span>
            <i :class="`bi ${extendedEditEntity ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
          </button>
        </div>
        <!-- PAYMENT -->
        <Transition name="slide-fade">
          <div
            v-if="
              extendedPaymentEntity &&
              getActiveFeature(commerce, 'booking-confirm', 'PRODUCT') &&
              toggles &&
              (toggles['collaborator.bookings.confirm'] || toggles['business.bookings.manage'])
            "
            class="attention-action-section"
          >
            <div class="attention-action-content">
              <div v-if="!booking.confirmed" class="booking-action-form">
                <div class="booking-action-header">
                  <i class="bi bi-cash-coin"></i>
                  <span>{{ $t('collaboratorBookingsView.paymentConfirm') }}</span>
                </div>
                <PaymentForm
                  :id="booking.id"
                  entity-type="booking"
                  :commerce="commerce"
                  :client-id="booking.clientId"
                  :service-id="
                    booking.servicesId && booking.servicesId.length > 0
                      ? booking.servicesId[0]
                      : undefined
                  "
                  :service-ids="booking.servicesId || []"
                  :services="booking.servicesDetails || booking.services || []"
                  :confirm-payment="
                    getActiveFeature(commerce, 'booking-confirm-payment', 'PRODUCT')
                  "
                  :errors-add="errorsAdd"
                  :receive-data="receiveData"
                  :professional-id="getAssignedProfessionalCommissionData().id"
                  :professional-name="getAssignedProfessionalCommissionData().name"
                  :professional-commission="getAssignedProfessionalCommissionData().commission"
                  :professional-commission-type="getAssignedProfessionalCommissionData().commissionType"
                  :suggested-commission-amount="
                    getAssignedProfessionalCommissionData().suggestedAmount
                  "
                  :existing-confirmation-data="booking.confirmationData"
                >
                </PaymentForm>
                <div class="booking-action-buttons">
                  <button
                    class="btn btn-sm btn-size fw-bold btn-primary rounded-pill px-3 card-action"
                    @click="goConfirm2()"
                    :disabled="
                      isBookingCancelledOrProcessed ||
                      booking.status === 'CONFIRMED' ||
                      booking.confirmed ||
                      (togglesLoaded && !toggles['collaborator.bookings.confirm'] && !toggles['business.bookings.manage'])
                    "
                  >
                    <i class="bi bi-person-check-fill"></i>
                    {{ $t('collaboratorBookingsView.confirm') }}
                  </button>
                </div>
                <AreYouSure
                  :show="goToConfirm2"
                  :yes-disabled="
                    isBookingCancelledOrProcessed ||
                    (togglesLoaded && !toggles['collaborator.bookings.confirm'] && !toggles['business.bookings.manage'])
                  "
                  :no-disabled="
                    isBookingCancelledOrProcessed ||
                    (togglesLoaded && !toggles['collaborator.bookings.confirm'] && !toggles['business.bookings.manage'])
                  "
                  @actionYes="confirm()"
                  @actionNo="confirmCancel2()"
                >
                </AreYouSure>
              </div>
              <div v-else class="booking-action-message">
                <Message
                  :title="$t('collaboratorBookingsView.message.7.title')"
                  :content="$t('collaboratorBookingsView.message.7.content')"
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
            style="position: relative; z-index: 1; pointer-events: auto;"
          >
            <div class="attention-action-content" style="position: relative; z-index: 1; pointer-events: auto;">
              <div class="booking-action-form payment-form-modern" style="position: relative; z-index: 1; pointer-events: auto;">
                <div class="booking-action-header">
                  <i class="bi bi-person-badge"></i>
                  <span>{{ $t('professionals.assignProfessional') }}</span>
                </div>
                <div class="payment-form-content">
                  <div v-if="booking.professionalName" class="professional-assigned-alert">
                    <i class="bi bi-person-badge-fill"></i>
                    <span class="alert-text">
                      {{ $t('professionals.alreadyAssigned') || 'Profesional ya asignado' }}:
                      <strong>{{ booking.professionalName }}</strong>
                      <span v-if="getAssignedProfessionalCommissionData().commission" class="commission-info">
                        ({{ $t('professionals.commission') || 'Comisión' }}: <strong>{{ getFormattedCommissionForDisplay() }}</strong>)
                      </span>
                    </span>
                    <small class="alert-action">
                      {{
                        $t('professionals.canReplace') || 'Puede reemplazarlo seleccionando otro.'
                      }}
                    </small>
                  </div>
                  <div class="payment-form-field">
                    <label class="payment-form-label">{{
                      $t('professionals.selectProfessional')
                    }}</label>
                    <ProfessionalSelector
                      :model-value="booking?.professionalId"
                      :professionals="professionals"
                      :filter-by-service="booking.servicesId"
                      :show-commission="false"
                      @professional-selected="handleProfessionalSelected"
                      @update:model-value="handleProfessionalIdChanged"
                    />
                  </div>
                  <div
                    v-if="
                      selectedProfessional &&
                      getActiveFeature(commerce, 'professional-commission-enabled', 'PRODUCT')
                    "
                    class="payment-form-field"
                    style="position: relative; z-index: 2; pointer-events: auto;"
                  >
                    <label class="payment-form-label">{{ $t('professionals.commission') }}</label>
                      <div class="d-flex align-items-center gap-2">
                        <!-- Input de comisión restaurado -->
                        <input
                          id="professional-commission-input"
                          ref="commissionInputRef"
                          type="text"
                          v-model="professionalCommission"
                          :placeholder="getSuggestedCommission()"
                          autocomplete="off"
                          class="commission-input payment-form-select"
                          @input="commissionManuallyEdited = true"
                          @click.stop
                          @mousedown.stop
                          @focus="handleCommissionFocus"
                        />
                        <span class="text-muted commission-unit">
                          {{
                            selectedProfessional.financialInfo?.commissionType === 'PERCENTAGE'
                              ? '%'
                              : commerce.currency || 'BRL'
                          }}
                        </span>
                      </div>
                    <!-- Warning about suggested commission -->
                    <div v-if="getSuggestedCommission()" class="alert alert-warning mt-2 commission-warning">
                      <i class="bi bi-info-circle me-2"></i>
                      <span>{{ $t('professionals.suggestedCommission') }}: <strong>{{ getSuggestedCommission() }}</strong></span>
                      <Popper :class="'dark'" arrow hover>
                        <template #content>
                          <div>
                            {{ $t('paymentForm.suggestedCommissionWarning.tooltip') }}
                          </div>
                        </template>
                        <i class="bi bi-question-circle ms-2"></i>
                      </Popper>
                    </div>
                  </div>
                  <div
                    v-if="
                      professionalCommission &&
                      !selectedProfessional &&
                      getActiveFeature(commerce, 'professional-commission-enabled', 'PRODUCT')
                    "
                    class="alert alert-warning mt-2"
                  >
                    <i class="bi bi-exclamation-triangle"></i>
                    {{ $t('professionals.commissionWithoutProfessional') }}
                  </div>
                </div>
                <div class="booking-action-buttons">
                  <button
                    class="btn btn-sm btn-size fw-bold btn-primary rounded-pill px-3 card-action"
                    @click="goAssignProfessional()"
                    :disabled="
                      !selectedProfessional || isBookingCancelledOrProcessed || loading
                    "
                  >
                    <i v-if="loading" class="bi bi-arrow-clockwise spinner-icon"></i>
                    <i v-else class="bi bi-person-check-fill"></i>
                    {{ $t('professionals.assignProfessional') }}
                  </button>
                </div>
                <AreYouSure
                  :show="goToAssignProfessional"
                  @actionYes="confirmAssignProfessional()"
                  @actionNo="cancelAssignProfessional()"
                >
                </AreYouSure>
              </div>
            </div>
          </div>
        </Transition>
        <!-- TRANSFER -->
        <Transition name="slide-fade">
          <div
            v-if="
              extendedTransferEntity &&
              getActiveFeature(commerce, 'booking-transfer-queue', 'PRODUCT')
            "
            class="attention-action-section"
          >
            <div class="attention-action-content">
              <div v-if="booking.transfered" class="booking-transfer-history">
                <div class="booking-action-header">
                  <i class="bi bi-arrow-left-right"></i>
                  <span>{{ $t('collaboratorBookingsView.transferData') }}</span>
                </div>
                <div class="booking-transfer-badges">
                  <span v-if="booking.transferedOrigin" class="booking-badge-modern">
                    {{ getQueueName(booking.transferedOrigin || undefined) }}
                  </span>
                  <span v-if="booking.transferedCount" class="booking-badge-modern">
                    {{ booking.transferedCount }}
                  </span>
                  <span
                    v-if="booking.transferedAt"
                    class="booking-badge-modern booking-badge-secondary"
                  >
                    {{ getDate(booking.transferedAt) }}
                  </span>
                </div>
              </div>
              <div
                v-if="queuesToTransfer && queuesToTransfer.length > 0"
                class="booking-action-form"
              >
                <div class="booking-action-header">
                  <i class="bi bi-arrow-left-right"></i>
                  <span>{{ $t('collaboratorBookingsView.transferQueue') }}</span>
                </div>
                <div class="booking-transfer-selector">
                  <div class="booking-queue-info">
                    <span class="booking-queue-label">{{
                      $t('collaboratorBookingsView.selectQueueToTransfer')
                    }}</span>
                    <div class="booking-queue-current">
                      <i class="bi bi-arrow-right"></i>
                      <span class="fw-bold">{{ queue.name }}</span>
                    </div>
                  </div>
                  <select
                    class="booking-select-modern"
                    aria-label="form-select-sm"
                    v-model="queueToTransfer"
                  >
                    <option v-for="queue in queuesToTransfer" :key="queue.id" :value="queue.id">
                      {{ queue.name }}
                    </option>
                  </select>
                </div>
                <div class="booking-action-buttons">
                    <button
                      class="btn btn-sm btn-size fw-bold btn-primary rounded-pill px-3 card-action"
                      @click="goTransfer()"
                      :disabled="
                        !queueToTransfer ||
                        loading ||
                        isBookingCancelledOrProcessed ||
                        (togglesLoaded && !toggles['collaborator.bookings.transfer'] && !toggles['business.bookings.manage'])
                      "
                    >
                      <i class="bi bi-person-check-fill"></i>
                      {{ $t('collaboratorBookingsView.transfer') }}
                    </button>
                  </div>
                  <AreYouSure
                    :show="goToTransfer"
                    :yes-disabled="
                      isBookingCancelledOrProcessed ||
                      (togglesLoaded && !toggles['collaborator.bookings.transfer'] && !toggles['business.bookings.manage'])
                    "
                    :no-disabled="
                      isBookingCancelledOrProcessed ||
                      (togglesLoaded && !toggles['collaborator.bookings.transfer'] && !toggles['business.bookings.manage'])
                    "
                    @actionYes="transfer()"
                    @actionNo="cancelTransfer()"
                  >
                  </AreYouSure>
              </div>
              <div v-else class="booking-action-message">
                <Message
                  :title="$t('collaboratorBookingsView.message.6.title')"
                  :content="$t('collaboratorBookingsView.message.6.content')"
                />
              </div>
            </div>
          </div>
        </Transition>
        <!-- EDIT -->
        <Transition name="slide-fade">
          <div
            v-if="extendedEditEntity && getActiveFeature(commerce, 'booking-edit', 'PRODUCT')"
            class="attention-action-section"
          >
            <div class="attention-action-content">
              <div v-if="booking.edited" class="booking-edit-history">
                <div class="booking-action-header">
                  <i class="bi bi-pencil-fill"></i>
                  <span>{{ $t('collaboratorBookingsView.editData') }}</span>
                </div>
                <div class="booking-edit-badges">
                  <span v-if="booking.editedDateOrigin" class="booking-badge-modern">
                    {{ getDate(booking.editedDateOrigin) }}
                  </span>
                  <span v-if="booking.editedBlockOrigin" class="booking-badge-modern">
                    {{ booking.editedBlockOrigin.hourFrom }} -
                    {{ booking.editedBlockOrigin.hourTo }}
                  </span>
                  <span v-if="booking.editedCount" class="booking-badge-modern">
                    {{ booking.editedCount }}
                  </span>
                  <span
                    v-if="booking.editedAt"
                    class="booking-badge-modern booking-badge-secondary"
                  >
                    {{ getDate(booking.editedAt) }}
                  </span>
                </div>
              </div>
              <div class="booking-action-form">
                <div class="booking-action-header">
                  <i class="bi bi-pencil-fill"></i>
                  <span>{{ $t('collaboratorBookingsView.selectDataToEdit') }}</span>
                </div>
                <div class="booking-edit-picker">
                  <div class="booking-edit-picker-wrapper">
                    <BookingDatePicker
                      :show="extendedEditEntity && showBookingDataPicker"
                      :booking="booking"
                      :queue="queue"
                      :commerce="commerce"
                      :view="`monthly`"
                      :amountof-blocks-needed="amountofBlocksNeeded"
                      :grouped-queues="groupedQueues"
                      :receive-booking-edit="receiveBookingEdit"
                    >
                    </BookingDatePicker>
                  </div>
                </div>
                <div class="booking-action-buttons">
                  <button
                    class="btn btn-sm btn-size fw-bold btn-primary rounded-pill px-3 card-action"
                    @click="goEdit()"
                    :disabled="!toggles['collaborator.bookings.edit'] || isBookingProcessed"
                  >
                    <i class="bi bi-person-check-fill"></i>
                    {{ $t('collaboratorBookingsView.edit') }}
                  </button>
                </div>
                <AreYouSure
                  :show="goToEdit"
                  :yes-disabled="togglesLoaded && !toggles['collaborator.bookings.edit']"
                  :no-disabled="togglesLoaded && !toggles['collaborator.bookings.edit']"
                  @actionYes="edit()"
                  @actionNo="cancelEdit()"
                >
                </AreYouSure>
              </div>
            </div>
          </div>
        </Transition>
        <div
          class="attention-actions-footer"
          v-if="
            !loading &&
            !isBookingProcessed &&
            booking.status !== 'USER_CANCELED' &&
            !booking.cancelled
          "
        >
          <div class="attention-actions-buttons">
            <button
              v-if="
                getActiveFeature(commerce, 'booking-confirm', 'PRODUCT') &&
                !getActiveFeature(commerce, 'booking-confirm-payment', 'PRODUCT') &&
                toggles &&
                toggles['collaborator.bookings.confirm']
              "
              class="btn btn-sm btn-size fw-bold btn-primary rounded-pill px-3 card-action"
              @click="goConfirm1()"
              :disabled="
                booking.status === 'CONFIRMED' ||
                booking.confirmed ||
                isBookingProcessed ||
                (togglesLoaded && !toggles['collaborator.bookings.confirm'])
              "
            >
              <i class="bi bi-person-check-fill"> </i> {{ $t('collaboratorBookingsView.confirm') }}
            </button>
          </div>
          <div class="attention-actions-confirmations">
            <AreYouSure
              :show="goToCancel"
              :yes-disabled="togglesLoaded && !toggles['collaborator.bookings.cancel']"
              :no-disabled="togglesLoaded && !toggles['collaborator.bookings.cancel']"
              @actionYes="cancel()"
              @actionNo="cancelCancel()"
            >
            </AreYouSure>
            <AreYouSure
              :show="goToConfirm1"
              :yes-disabled="togglesLoaded && !toggles['collaborator.bookings.confirm']"
              :no-disabled="togglesLoaded && !toggles['collaborator.bookings.confirm']"
              @actionYes="confirm()"
              @actionNo="confirmCancel1()"
            >
            </AreYouSure>
          </div>
        </div>
        <div class="attention-metadata-footer">
          <span class="metric-card-details"><strong>Id:</strong> {{ booking.id }}</span>
          <span class="metric-card-details"
            ><strong>Date:</strong>
            {{ getDate(booking.createdAt || booking.createdDate || booking.date) }}</span
          >
        </div>
      </div>
    </div>
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

.booking-details-expanded {
  background-color: transparent;
  border-radius: 0;
  border: none;
  margin: 0;
  padding: 0;
}

.show {
  padding: 0;
  max-height: none !important;
  overflow-y: visible;
}

.detailed-data {
  padding: 0.75rem 0;
  margin-bottom: 0.75rem;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(169, 169, 169, 0.15);
  border-radius: 8px;
  padding: 0.875rem;
}

.detailed-data .row {
  margin: 0.5rem 0;
}

.detailed-data .row:first-child {
  margin-top: 0;
}

.detailed-data .row:last-child {
  margin-bottom: 0;
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

/* Client Info Section - Standardized */
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

.booking-client-avatar i {
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

.booking-contact-item:hover {
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

/* Confirmation Badges */
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

/* Action Tabs - Compact and Modern */
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

.booking-action-tab:hover {
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.2) 0%, rgba(0, 194, 203, 0.1) 100%);
  border-color: rgba(0, 74, 173, 0.4);
  color: #004aad;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 74, 173, 0.15);
}

.booking-action-tab-active {
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.25) 0%, rgba(0, 194, 203, 0.15) 100%);
  color: #004aad;
  border-color: rgba(0, 74, 173, 0.4);
  box-shadow: 0 2px 8px rgba(0, 74, 173, 0.2);
}

.booking-action-tab span {
  line-height: 1.2;
  letter-spacing: -0.01em;
  white-space: nowrap;
}

.booking-action-tab i:first-child {
  font-size: 0.75rem;
  flex-shrink: 0;
}

.booking-action-tab i:last-child {
  font-size: 0.625rem;
  margin-left: auto;
  flex-shrink: 0;
}

/* Footer Info */
.booking-footer-info {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  padding-top: 0.4rem;
  margin-top: 0.4rem;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  font-size: 0.65rem;
  color: #6c757d;
}

.booking-footer-item {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.booking-footer-item strong {
  font-weight: 600;
  color: #495057;
}
.details-title {
  text-decoration: underline;
  font-size: 0.8rem;
  color: var(--color-text);
  cursor: pointer;
}
.step-title {
  font-size: 0.7rem;
  line-height: 0.7rem;
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
  line-height: 0.8rem;
}
.index {
  background-color: var(--azul-qr);
  padding: 0.05rem;
  margin-top: 0.25rem;
  border-radius: 0.5rem !important;
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
.booking-link {
  cursor: pointer;
}

/* Details Expandable Section */
.details-expandable-section {
  margin: 0.25rem 0.375rem;
  margin-top: 0;
  border-radius: 0 0 8px 8px;
  overflow: visible;
  background: transparent;
}

.details-expand-enter-active,
.details-expand-leave-active {
  transition: all 0.3s ease;
  overflow: hidden;
}

.details-expand-enter-from,
.details-expand-leave-to {
  opacity: 0;
  max-height: 0;
  transform: translateY(-10px);
}

.details-expand-enter-to,
.details-expand-leave-from {
  opacity: 1;
  max-height: 2000px;
  transform: translateY(0);
}

.detailed-data {
  padding: 0.5rem 0;
}

/* Info Section */
.info-section {
  margin-bottom: 0.75rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.info-section:last-child {
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.compact-section {
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
}

/* Action Buttons Grid */
.action-buttons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.5rem;
  margin-bottom: 0;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  padding: 0.625rem 0.75rem;
  background: #ffffff;
  border: 1.5px solid rgba(0, 0, 0, 0.1);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.75rem;
  font-weight: 600;
  color: #495057;
  min-height: 60px;
}

.action-btn:hover {
  background: rgba(0, 194, 203, 0.08);
  border-color: rgba(0, 194, 203, 0.3);
  color: var(--azul-turno);
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(0, 194, 203, 0.15);
}

.action-btn-active {
  background: linear-gradient(135deg, var(--azul-turno) 0%, #00b8c4 100%);
  color: #ffffff;
  border-color: var(--azul-turno);
  box-shadow: 0 2px 4px rgba(0, 194, 203, 0.25);
}

.action-btn i {
  font-size: 1.125rem;
}

.action-btn span {
  font-size: 0.6875rem;
  line-height: 1.2;
}

/* Info Section Header Compact */
.info-section-header-compact {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  padding-bottom: 0.375rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.info-section-header-compact i {
  font-size: 0.875rem;
  color: var(--azul-turno);
}

.info-section-title-compact {
  font-size: 0.8125rem;
  font-weight: 700;
  color: #000000;
  letter-spacing: -0.01em;
}

/* Contact Data Grid */
.contact-data-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.5rem;
}

.data-item-compact {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem 0.625rem;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 6px;
  transition: all 0.2s ease;
  text-decoration: none;
  color: inherit;
}

.data-item-compact:hover {
  background: rgba(0, 194, 203, 0.08);
  border-color: rgba(0, 194, 203, 0.2);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 194, 203, 0.1);
}

.data-item-compact.whatsapp:hover {
  background: rgba(37, 211, 102, 0.1);
  border-color: rgba(37, 211, 102, 0.3);
}

.data-item-compact.email:hover {
  background: rgba(0, 122, 255, 0.1);
  border-color: rgba(0, 122, 255, 0.3);
}

.data-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Paid Badge Styles */
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
}

.attention-paid-badge i {
  font-size: 0.75rem;
}

.paid-text {
  line-height: 1;
}

/* Inline Payment Details Styles */
.attention-context-info-compact {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 1rem;
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: white;
  border: 1px solid rgba(222, 226, 230, 0.6);
  border-radius: 8px;
}

.attention-context-item-inline {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.75rem;
  line-height: 1.3;
  padding: 0.25rem 0.5rem;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 6px;
  min-width: fit-content;
}

.attention-context-item-inline i {
  color: #00c2cb;
  font-size: 0.875rem;
  width: 16px;
  text-align: center;
  flex-shrink: 0;
}

.attention-context-label-inline {
  color: rgba(0, 0, 0, 0.6);
  font-weight: 600;
  min-width: auto;
  flex-shrink: 0;
}

.attention-context-value-inline {
  color: rgba(0, 0, 0, 0.8);
  font-weight: 500;
  white-space: nowrap;
}

.data-label {
  font-size: 0.625rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.data-value {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: #000000;
}

.data-value i {
  font-size: 0.875rem;
  color: var(--azul-turno);
}

.data-item-compact.whatsapp .data-value i {
  color: #25d366;
}

.data-item-compact.email .data-value i {
  color: #007aff;
}

/* Info Badges */
.info-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.info-badge {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: rgba(0, 194, 203, 0.08);
  border: 1px solid rgba(0, 194, 203, 0.15);
  border-radius: 6px;
  font-size: 0.7rem;
  transition: all 0.2s ease;
  line-height: 1.2;
}

.info-badge:hover {
  background: rgba(0, 194, 203, 0.12);
  border-color: rgba(0, 194, 203, 0.25);
}

.info-badge i {
  font-size: 0.75rem;
  color: var(--azul-turno);
}

.badge-label {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
}

.badge-value {
  font-weight: 700;
  color: #000000;
}

.service-tag {
  display: inline-block;
  padding: 0.125rem 0.375rem;
  background: rgba(0, 194, 203, 0.15);
  border: 1px solid rgba(0, 194, 203, 0.25);
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--azul-turno);
  margin-left: 0.25rem;
  line-height: 1;
}

.service-tag:first-child {
  margin-left: 0;
}

.services-badge {
  align-items: center;
  flex-direction: row;
  flex-wrap: wrap;
  gap: 0;
}

.services-badge .badge-label {
  margin-right: 0.5rem;
  flex-shrink: 0;
}

/* Metadata Section */
.metadata-section {
  margin-top: 0.5rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
  border-bottom: none;
  margin-bottom: 0;
  padding-bottom: 0;
}

.metadata-item-compact {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.6875rem;
  color: rgba(0, 0, 0, 0.5);
  flex-wrap: wrap;
}

.metadata-label {
  font-weight: 600;
  color: rgba(0, 0, 0, 0.5);
}

.metadata-value {
  font-weight: 700;
  color: #000000;
}

.metadata-separator {
  color: rgba(0, 0, 0, 0.3);
  margin: 0 0.125rem;
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

.booking-actions-buttons .card-action {
  flex: 0 0 auto;
  min-width: 120px;
}

.attention-actions-confirmations {
  width: 100%;
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

.booking-metadata-footer .metric-card-details {
  font-size: 0.6875rem;
  font-weight: 400;
  color: rgba(0, 0, 0, 0.5);
}

.booking-metadata-footer .metric-card-details strong {
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

/* Booking Context Info - Reservation Details (Compact Horizontal) */
/* Action Section Container - Completely Hidden Until Activated */
.attention-action-section {
  margin-bottom: 0.5rem;
  min-height: 180px;
  display: flex;
  flex-direction: column;
  pointer-events: auto !important;
}

.attention-action-section * {
  pointer-events: auto !important;
}

.attention-action-section input,
.attention-action-section textarea,
.attention-action-section select,
.attention-action-section button {
  pointer-events: auto !important;
  user-select: text !important;
  -webkit-user-select: text !important;
}

.booking-action-section:last-child {
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

.booking-action-header {
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

.booking-action-header i {
  color: #00c2cb;
  font-size: 0.9375rem;
}

.booking-action-form {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  flex: 1;
}

.booking-action-message {
  padding: 1rem 0;
}

.booking-action-buttons {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding-top: 0.625rem;
  border-top: 1px solid rgba(169, 169, 169, 0.2);
  justify-content: center;
  align-items: center;
}

/* Transfer Section */
.booking-transfer-history {
  margin-bottom: 0.625rem;
  padding-bottom: 0.625rem;
  border-bottom: 1px solid rgba(169, 169, 169, 0.2);
}

.booking-transfer-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.375rem;
}

.booking-transfer-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.booking-queue-info {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.booking-queue-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
}

.booking-queue-current {
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

.booking-queue-current i {
  font-size: 0.875rem;
}

.booking-select-modern {
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

.booking-select-modern:hover {
  border-color: rgba(0, 194, 203, 0.3);
  background: rgba(255, 255, 255, 1);
}

.booking-select-modern:focus {
  outline: none;
  border-color: #00c2cb;
  box-shadow: 0 0 0 3px rgba(0, 194, 203, 0.1);
}

/* Edit Section */
.booking-edit-history {
  margin-bottom: 0.625rem;
  padding-bottom: 0.625rem;
  border-bottom: 1px solid rgba(169, 169, 169, 0.2);
}

.booking-edit-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.375rem;
}

.booking-edit-picker {
  margin: 0.375rem 0;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.booking-edit-picker-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.booking-edit-picker-wrapper > div {
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.booking-edit-picker-wrapper .booking-calendar-wrapper {
  max-width: 500px;
  width: 100%;
}

.booking-edit-picker-wrapper .booking-block-selector {
  width: 100%;
  max-width: 100%;
}

.booking-edit-picker-wrapper .centered {
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}

.booking-edit-picker-wrapper .col {
  display: flex;
  justify-content: center;
  align-items: center;
}

.booking-edit-picker-wrapper .col-md-9 {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  max-width: 100%;
}

/* Modern Badges */
.booking-badge-modern {
  display: inline-flex;
  align-items: center;
  padding: 0.375rem 0.625rem;
  background: rgba(0, 194, 203, 0.12);
  color: #00c2cb;
  border: 1px solid rgba(0, 194, 203, 0.25);
  border-radius: 6px;
  font-size: 0.6875rem;
  font-weight: 600;
  line-height: 1.2;
}

.booking-badge-modern.booking-badge-secondary {
  background: rgba(169, 169, 169, 0.15);
  color: rgba(0, 0, 0, 0.7);
  border-color: rgba(169, 169, 169, 0.2);
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

/* Payment Form Styles - Para formulario de profesionales */
.payment-form-modern {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
}

/* Disabled Action Tabs */
.attention-action-tab:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background-color: rgba(169, 169, 169, 0.1);
  color: rgba(0, 0, 0, 0.4);
  border-color: rgba(169, 169, 169, 0.2);
}

.attention-action-tab:disabled:hover {
  background-color: rgba(169, 169, 169, 0.1);
  color: rgba(0, 0, 0, 0.4);
  transform: none;
  box-shadow: none;
}

.payment-form-content {
  display: flex;
  flex-direction: column;
  gap: 0.625rem;
  pointer-events: auto !important;
}

.payment-form-field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  pointer-events: auto !important;
}

.payment-form-field * {
  pointer-events: auto !important;
}

.payment-form-label {
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
  letter-spacing: -0.01em;
}

.payment-form-select,
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
  pointer-events: auto !important;
  user-select: text !important;
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  -ms-user-select: text !important;
}

.payment-form-input[type="text"] {
  pointer-events: auto !important;
  user-select: text !important;
  cursor: text !important;
}

.payment-form-select:hover,
.payment-form-input:hover {
  border-color: rgba(0, 194, 203, 0.3);
  background: rgba(255, 255, 255, 1);
}

.payment-form-select:focus,
.payment-form-input:focus {
  outline: none;
  border-color: #00c2cb;
  box-shadow: 0 0 0 3px rgba(0, 194, 203, 0.1);
}

.payment-form-select.is-invalid,
.payment-form-input.is-invalid {
  border-color: #dc3545;
}

/* Fix para input de comisión bloqueado */
.commission-input-fix {
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

.commission-input-fix:focus,
.commission-input-fix:focus-visible,
.commission-input-fix:focus-within {
  pointer-events: auto !important;
  user-select: text !important;
  outline: 2px solid #00c2cb !important;
  outline-offset: 2px !important;
  background: white !important;
  z-index: 999999 !important;
  border-color: #00c2cb !important;
}

.commission-input-fix:focus {
  pointer-events: auto !important;
  user-select: text !important;
  outline: 2px solid #00c2cb !important;
  outline-offset: 2px !important;
  background: white !important;
  z-index: 999999 !important;
}

.commission-input-fix:hover {
  pointer-events: auto !important;
  cursor: text !important;
  background: white !important;
}

.commission-input-fix:active {
  pointer-events: auto !important;
  user-select: text !important;
}

.commission-input-fix * {
  pointer-events: auto !important;
}

/* Forzar interacción en TODO el formulario de profesional */
.booking-action-form.payment-form-modern,
.booking-action-form.payment-form-modern *,
.payment-form-modern,
.payment-form-modern * {
  pointer-events: auto !important;
}

.booking-action-form.payment-form-modern input,
.booking-action-form.payment-form-modern textarea,
.booking-action-form.payment-form-modern select,
.booking-action-form.payment-form-modern button {
  pointer-events: auto !important;
  user-select: text !important;
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  -ms-user-select: text !important;
  cursor: text !important;
}


.booking-action-form.payment-form-modern input[type="text"],
.booking-action-form.payment-form-modern input[type="number"] {
  pointer-events: auto !important;
  user-select: text !important;
  -webkit-user-select: text !important;
  cursor: text !important;
  -webkit-touch-callout: default !important;
  -webkit-tap-highlight-color: rgba(0, 0, 0, 0) !important;
}

/* Fix específico para inputs dentro del modal */
.booking-details-modal-overlay input,
.booking-details-modal-overlay textarea,
.booking-details-modal-overlay select {
  pointer-events: auto !important;
  user-select: text !important;
  -webkit-user-select: text !important;
  cursor: text !important;
  z-index: 9999 !important;
  position: relative !important;
}

/* Fix para inputs de tipo number que se bloquean */
input[type="number"] {
  pointer-events: auto !important;
  user-select: text !important;
  cursor: text !important;
  -moz-appearance: textfield !important;
}

/* Remover flechas por defecto de inputs number */
input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none !important;
  margin: 0 !important;
}

/* Asegurar que el formulario de pago no bloquee inputs */
.payment-form-modern,
.payment-form-modern *,
.payment-form-content,
.payment-form-content *,
.attention-action-section,
.attention-action-section * {
  pointer-events: auto !important;
}

.payment-form-modern input,
.payment-form-content input,
.attention-action-section input {
  pointer-events: auto !important;
  user-select: text !important;
  cursor: text !important;
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  -ms-user-select: text !important;
}

/* Fix universal para todos los inputs dentro de modales y formularios de booking */
.booking-details-modal-overlay input,
.booking-details-modal-overlay textarea,
.booking-details-modal-overlay select,
.booking-details-modal-content input,
.booking-details-modal-content textarea,
.booking-details-modal-content select,
.booking-row-card input,
.booking-row-card textarea,
.booking-row-card select {
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

/* Asegurar que los eventos de click y focus funcionen */
.booking-details-modal-overlay input:focus,
.booking-details-modal-content input:focus,
.booking-row-card input:focus {
  outline: 2px solid #00c2cb !important;
  outline-offset: 2px !important;
  border-color: #00c2cb !important;
  pointer-events: auto !important;
}

/* Fix para inputs de tipo number - remover completamente las flechas */
input[type="number"]::-webkit-outer-spin-button,
input[type="number"]::-webkit-inner-spin-button {
  -webkit-appearance: none !important;
  margin: 0 !important;
  display: none !important;
}

/* Convertir inputs number problemáticos en inputs text visualmente */
input[type="number"] {
  -moz-appearance: textfield !important;
}

/* Spinner animation for loading buttons */
.spinner-icon {
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
</style>

<style>
/* Estilos globales para fix de inputs en modales (sin scoped) */
.booking-details-modal-overlay *,
.booking-details-modal-content *,
.modal-dialog * {
  pointer-events: auto !important;
}

.booking-details-modal-overlay input,
.booking-details-modal-content input,
.modal-dialog input {
  pointer-events: auto !important;
  user-select: text !important;
  cursor: text !important;
  -webkit-user-select: text !important;
}
</style>

<style>
/* SOLO CSS ESPECIFICO PARA INPUTS EN MODALES - SIN SCOPED */
.booking-details-modal-overlay input,
.booking-details-modal-content input,
.modal-body input,
.modal input,
.commission-fix-input {
  pointer-events: auto !important;
  user-select: text !important;
  cursor: text !important;
  -webkit-user-select: text !important;
}

.commission-fix-input:focus {
  outline: 2px solid #00c2cb !important;
  border-color: #00c2cb !important;
  pointer-events: auto !important;
  user-select: text !important;
}

/* Estilos para warning de comisión y unidad */
.commission-warning {
  font-size: 0.85rem;
}

.commission-unit {
  font-weight: bold;
  color: #495057 !important;
}
</style>
