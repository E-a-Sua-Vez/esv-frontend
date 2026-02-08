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
            <div class="modal-header">
              <h5 class="modal-title" id="bookingDetailsModalLabel">
                <i class="bi bi-calendar-check-fill"></i>
                {{ $t('dashboard.bookingDetails') }}
              </h5>
              <button
                type="button"
                class="btn-close"
                @click="closeModal"
                :aria-label="$t('close')"
              ></button>
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

/* Modal Header - Matching Attention Style */
.modal-header {
  background-color: var(--azul-turno, #004aad);
  color: white !important;
  border-bottom: none !important;
  padding: 1rem 1.25rem !important;
  border-radius: 0.5rem 0.5rem 0 0 !important;
  flex-shrink: 0 !important;
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
