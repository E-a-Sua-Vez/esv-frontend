<script>
import QueueAttentionDetails from '../domain/QueueAttentionDetails.vue';

export default {
  components: { QueueAttentionDetails },
  name: 'QueueName',
  props: {
    queue: { type: Object, default: { name: '', active: false } },
    details: { type: Boolean, default: false },
    queuePendingDetails: { type: Object, default: [] },
    queueProcessingDetails: { type: Object, default: [] },
    selected: { type: Boolean, default: false },
  },
  data() {
    return {
      extendedEntity: false,
    };
  },
  methods: {
    showDetails() {
      this.extendedEntity = !this.extendedEntity;
    },
  },
  mounted() {
    // Fix accessibility issue: ensure aria-hidden is properly managed during Bootstrap modal transitions
    // Bootstrap automatically manages aria-hidden, but we need to ensure it's removed before focus moves
    const modalElement = document.getElementById('queueModal');

    if (modalElement) {
      // Remove aria-hidden synchronously when modal starts opening (before transition and focus)
      // Using capture phase to ensure we run before Bootstrap's handlers
      modalElement.addEventListener(
        'show.bs.modal',
        () => {
          // Remove aria-hidden immediately and synchronously
          modalElement.removeAttribute('aria-hidden');
        },
        { capture: true, once: false }
      );

      // Ensure aria-hidden stays removed when modal is fully shown
      modalElement.addEventListener('shown.bs.modal', () => {
        modalElement.removeAttribute('aria-hidden');
      });

      // Safety net: ensure aria-hidden is removed if modal or its children receive focus
      // This catches edge cases during Bootstrap's transition animations
      const handleFocusIn = (e) => {
        if (modalElement.contains(e.target) && modalElement.getAttribute('aria-hidden') === 'true') {
          modalElement.removeAttribute('aria-hidden');
        }
      };
      modalElement.addEventListener('focusin', handleFocusIn, true);

      // Restore aria-hidden when modal starts hiding
      modalElement.addEventListener('hide.bs.modal', () => {
        modalElement.setAttribute('aria-hidden', 'true');
      });

      // Ensure aria-hidden is set when modal is fully hidden
      modalElement.addEventListener('hidden.bs.modal', () => {
        modalElement.setAttribute('aria-hidden', 'true');
      });
    }
  },
};
</script>

<template>
  <div>
    <div
      :class="
        selected === true ? 'selected bg-primary' : queue?.active === true ? 'active' : 'desactived'
      "
    >
      <span v-if="details" class="queue-details" data-bs-toggle="modal" href="#queueModal">
        <div class="row centered">
          <div class="col-8"><i class="bi bi-person-lines-fill"></i> {{ queue?.name }}</div>
          <div class="col-3">
            <span data-bs-toggle="modal" href="#queueModal">
              <span class="see-queue"> {{ $t('collaboratorQueueAttentions.seeQueue') }} </span>
              <i class="dark fw-bold" :class="'bi bi-arrow-right-circle-fill'"></i>
            </span>
          </div>
        </div>
      </span>
      <span
        v-else
        :class="
          selected === true
            ? 'selected bg-primary'
            : queue?.active === true
            ? 'active'
            : 'desactived'
        "
      >
        <i class="bi bi-person-lines-fill"></i> {{ queue?.name }}
      </span>
    </div>
    <!-- Modal Queue Details - Use Teleport to render outside component to avoid overflow/position issues -->
    <Teleport to="body">
    <div
      class="modal fade"
      id="queueModal"
      data-bs-backdrop="static"
      data-bs-keyboard="false"
      tabindex="-1"
      aria-labelledby="queueModalLabel"
      role="dialog"
      aria-modal="true"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div
            class="modal-header border-0 centered"
            :class="queue?.active === true ? 'active-name' : 'desactived-name'"
          >
            <h5 class="modal-title fw-bold" id="queueModalLabel">
              <i class="bi bi-person-lines-fill"></i> {{ queue?.name }}
            </h5>
            <button
              id="close-modal"
              class="btn-close btn-light"
              type="button"
              data-bs-dismiss="modal"
              aria-label="Close"
              tabindex="0"
            ></button>
          </div>
          <div class="modal-body text-center pb-3">
            <QueueAttentionDetails
              :queue="queue"
              :queue-pending-details="queuePendingDetails"
              :queue-processing-details="queueProcessingDetails"
            ></QueueAttentionDetails>
            <a
              class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4"
              data-bs-toggle="modal"
              data-bs-target="#queueModal"
              >{{ $t('close') }} <i class="bi bi-check-lg"></i
            ></a>
          </div>
        </div>
      </div>
    </div>
    </Teleport>
  </div>
</template>

<style scoped>
.active {
  background-color: var(--azul-turno);
  margin: 0.1rem;
  border-radius: 1rem;
  line-height: 1.5rem;
  border: 1.5px solid var(--azul-turno);
  color: var(--color-background);
  font-weight: 700;
  font-size: 0.9rem;
}
.active-name {
  background-color: var(--azul-turno);
  color: var(--color-background);
  font-weight: 700;
  font-size: 0.9rem;
}
.desactived {
  background-color: var(--gris-tooltip);
  margin: 0.1rem;
  border-radius: 1rem;
  line-height: 1.5rem;
  border: 1.5px solid var(--gris-tooltip);
  color: var(--color-background);
  font-weight: 700;
  font-size: 0.9rem;
}
.selected {
  background-color: rgba(var(--bs-primary-rgb), var(--bs-bg-opacity));
  margin: 0.1rem;
  border-radius: 1rem;
  line-height: 1.5rem;
  border: 2px solid rgba(var(--bs-primary-rgb), var(--bs-bg-opacity));
  color: var(--color-background);
  font-weight: 700;
  font-size: 0.9rem;
  padding-top: 0.15rem;
  padding-bottom: 0.15rem;
}
.show {
  padding: 0.5rem;
  overflow-y: auto;
}
.queue-details {
  cursor: pointer;
}
.see-queue {
  text-decoration: underline;
  font-size: 0.7rem;
  margin-right: 0.2rem;
  font-weight: 600;
}
</style>
