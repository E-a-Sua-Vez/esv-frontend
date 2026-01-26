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
      this.$emit('close');
    },
    handleBookingUpdated(updatedBooking) {
      this.$emit('booking-updated', updatedBooking);
    },
    handleGetAvailableDatesByCalendarMonth(data) {
      this.$emit('getAvailableDatesByCalendarMonth', data);
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
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
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
