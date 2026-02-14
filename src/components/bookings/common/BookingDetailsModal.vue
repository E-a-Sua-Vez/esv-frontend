<script>
import Spinner from '../../common/Spinner.vue';
import BookingDetailsCard from './BookingDetailsCard.vue';

export default {
  name: 'BookingDetailsModal',
  components: {
    Spinner,
    BookingDetailsCard,
  },
  props: {
    show: { type: Boolean, default: false },
    booking: { type: Object, default: undefined },
    commerce: { type: Object, default: undefined },
    queues: { type: Array, default: undefined },
    toggles: { type: Object, default: undefined },
    disabledDates: { type: Object, default: undefined },
    calendarAttributes: { type: Array, default: [] },
    groupedQueues: { type: Object, default: undefined },
    selectedQueue: { type: Object, default: undefined },
    selectedDate: { type: String, default: undefined },
  },
  emits: ['close', 'booking-updated', 'getAvailableDatesByCalendarMonth'],
  data() {
    return {
      loading: false,
    };
  },
  methods: {
    closeModal() {
      // SIMPLE como antes - solo emitir close
      this.$emit('close');
    },
    restoreMainModal() {
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
      } else {
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
    handleBookingUpdated(updatedBooking) {
      this.$emit('booking-updated', updatedBooking);
    },
    handleGetAvailableDatesByCalendarMonth(data) {
      this.$emit('getAvailableDatesByCalendarMonth', data);
    },
  },
  watch: {
    show(newValue) {
      if (newValue) {
        const mainModal = document.querySelector('#modalAgenda');
        if (mainModal) {
          mainModal.style.display = 'none';
        }
      } else {
        // FORZAR reapertura del modal
        setTimeout(() => {
          const mainModal = document.querySelector('#modalAgenda');
          if (mainModal) {
            // Restaurar completamente
            mainModal.style.display = 'block';
            mainModal.classList.add('show');
            mainModal.setAttribute('aria-modal', 'true');
            mainModal.setAttribute('role', 'dialog');
            mainModal.style.paddingLeft = '0px';

            // Asegurar que el body tenga las clases correctas
            document.body.classList.add('modal-open');
            document.body.style.overflow = 'hidden';
            document.body.style.paddingRight = '0px';

            // Crear o mostrar backdrop
            let backdrop = document.querySelector('.modal-backdrop');
            if (!backdrop) {
              backdrop = document.createElement('div');
              backdrop.className = 'modal-backdrop fade show';
              document.body.appendChild(backdrop);
            } else {
              backdrop.style.display = 'block';
              backdrop.classList.add('show');
            }
          }
        }, 50);
      }
    },
  },
};
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="show" class="booking-details-modal-overlay" @click.self="closeModal">
        <div
          class="modal-dialog modal-dialog-scrollable modal-lg booking-details-modal-dialog"
          @click.stop
        >
          <div class="modal-content booking-details-modal-content">
            <!-- Modal Header -->
            <div class="modal-header border-0 active-name modern-modal-header">
              <div class="modern-modal-header-inner">
                <div class="modern-modal-icon-wrapper">
                  <i class="bi bi-calendar-check-fill"></i>
                </div>
                <div class="modern-modal-title-wrapper">
                  <h5 class="modal-title fw-bold modern-modal-title" id="bookingDetailsModalLabel">
                    {{ $t('dashboard.bookingDetails') }}
                  </h5>
                  <p v-if="booking && booking.clientName" class="modern-modal-client-name">
                    {{ booking.clientName }}
                  </p>
                </div>
              </div>
              <button
                type="button"
                class="modern-modal-close-btn"
                @click="closeModal"
                :aria-label="$t('close')"
              >
                <i class="bi bi-x-lg"></i>
              </button>
            </div>

            <!-- Modal Body -->
            <div class="modal-body">
              <Spinner :show="loading"></Spinner>

              <BookingDetailsCard
                v-if="booking"
                :booking="booking"
                :show="true"
                :details-opened="true"
                :toggles="toggles"
                :commerce="commerce"
                :queues="queues"
                :disabled-dates="disabledDates"
                :calendar-attributes="calendarAttributes"
                :grouped-queues="groupedQueues"
                :selected-queue="selectedQueue"
                :selected-date="selectedDate"
                @getAvailableDatesByCalendarMonth="handleGetAvailableDatesByCalendarMonth"
                @booking-updated="handleBookingUpdated"
                style="pointer-events: auto !important; user-select: auto !important"
              >
              </BookingDetailsCard>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Modal Overlay */
.booking-details-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  z-index: 2147483647;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
}

/* Modal Dialog - Matching Attention Style */
.booking-details-modal-dialog {
  max-width: 1200px !important;
  width: 95vw !important;
  max-height: 90vh !important;
  margin: auto !important;
  display: flex !important;
  flex-direction: column !important;
}

.booking-details-modal-content {
  display: flex !important;
  flex-direction: column !important;
  max-height: 90vh !important;
  overflow: hidden !important;
  border-radius: 0.5rem !important;
  box-shadow: 0 1rem 3rem rgba(0, 0, 0, 0.175) !important;
}

/* Modal Header - Modern Style */
.modern-modal-header {
  padding: 0.75rem 1rem;
  background-color: var(--azul-turno);
  color: var(--color-background);
  border-radius: 0.75rem 0.75rem 0 0;
  min-height: auto;
  position: relative;
  flex-shrink: 0 !important;
}

.modern-modal-header-inner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.modern-modal-icon-wrapper {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.modern-modal-icon-wrapper i {
  font-size: 1.125rem;
  color: #ffffff;
}

.modern-modal-title-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  flex: 1;
  min-width: 0;
}

.modern-modal-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-background);
  margin: 0;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.modern-modal-client-name {
  font-size: 0.75rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.modern-modal-close-btn {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.85;
  width: 1.75rem;
  height: 1.75rem;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 0.375rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  border: none;
  padding: 0;
}

.modern-modal-close-btn i {
  font-size: 1rem;
  color: #ffffff;
  line-height: 1;
}

.modern-modal-close-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.25);
}

.modal-body {
  background: #f8f9fa !important;
  padding: 1.25rem !important;
  overflow-y: auto !important;
  overflow-x: hidden !important;
  flex: 1 1 auto !important;
  min-height: 0 !important;
  max-height: calc(90vh - 80px) !important;
  pointer-events: auto !important;
  user-select: auto !important;
}

.modal-body *,
.modal-body input,
.modal-body textarea,
.modal-body select,
.modal-body button {
  pointer-events: auto !important;
  user-select: auto !important;
}

.modal-body input[type='text'],
.modal-body input[type='number'] {
  pointer-events: auto !important;
  user-select: text !important;
  cursor: text !important;
  -webkit-user-select: text !important;
  -moz-user-select: text !important;
  -ms-user-select: text !important;
  -webkit-touch-callout: default !important;
  touch-action: manipulation !important;
}

/* Modal fade transition */
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-active .booking-details-modal-dialog,
.modal-fade-leave-active .booking-details-modal-dialog {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-fade-enter-from .booking-details-modal-dialog,
.modal-fade-leave-to .booking-details-modal-dialog {
  transform: scale(0.9) translateY(-20px);
  opacity: 0;
}

.modal-fade-enter-to .booking-details-modal-dialog,
.modal-fade-leave-from .booking-details-modal-dialog {
  transform: scale(1) translateY(0);
  opacity: 1;
}

/* Responsive */
@media (max-width: 768px) {
  .booking-details-modal-dialog {
    max-width: 95vw !important;
    width: 95vw !important;
    margin: 1rem auto !important;
  }

  .modal-body {
    padding: 0.75rem !important;
  }

  .booking-details-modal-overlay {
    padding: 0;
  }
}
</style>

<style>
/* CSS GLOBAL ULTRA AGRESIVO PARA MODAL - SIN SCOPED */
.booking-details-modal-overlay,
.booking-details-modal-overlay *,
.booking-details-modal-content,
.booking-details-modal-content * {
  pointer-events: auto !important;
}

.booking-details-modal-overlay input,
.booking-details-modal-content input,
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

.booking-details-modal-overlay input:focus,
.booking-details-modal-content input:focus {
  outline: 2px solid #00c2cb !important;
  border-color: #00c2cb !important;
}

/* Asegurar que el modal esté por encima de TODO */
.booking-details-modal-overlay {
  z-index: 999999 !important;
  position: fixed !important;
  top: 0 !important;
  left: 0 !important;
  width: 100vw !important;
  height: 100vh !important;
}

.booking-details-modal-dialog {
  z-index: 999999 !important;
  position: relative !important;
}
</style>
