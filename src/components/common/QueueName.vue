<script>
import QueueAttentionDetails from '../domain/QueueAttentionDetails.vue';
import {
  updatedAvailableAttentions,
  updatedProcessingAttentions,
  updatedTerminatedAttentions,
} from '../../application/firebase';

export default {
  components: { QueueAttentionDetails },
  name: 'QueueName',
  props: {
    queue: { type: Object, default: { name: '', active: false } },
    details: { type: Boolean, default: false },
    queuePendingDetails: { type: Array, default: () => null },
    queueProcessingDetails: { type: Array, default: () => null },
    queueTerminatedDetails: { type: Array, default: () => null },
    commerce: { type: Object, default: null },
    selected: { type: Boolean, default: false },
    useDrawer: { type: Boolean, default: false },
    hideSeeQueue: { type: Boolean, default: false },
    disableClick: { type: Boolean, default: false },
    listUpdateKey: { type: Number, default: 0 },
  },
  emits: ['open-drawer'],
  data() {
    return {
      extendedEntity: false,
      // Internal Firebase listeners for modal
      internalPendingDetails: [],
      internalProcessingDetails: [],
      internalTerminatedDetails: [],
      pendingAttentionsRef: null,
      processingAttentionsRef: null,
      terminatedAttentionsRef: null,
    };
  },
  computed: {
    // Use external props if provided, otherwise use internal Firebase data
    finalPendingDetails() {
      return Array.isArray(this.queuePendingDetails) && this.queuePendingDetails.length > 0
        ? this.queuePendingDetails
        : this.internalPendingDetails;
    },
    finalProcessingDetails() {
      return Array.isArray(this.queueProcessingDetails) && this.queueProcessingDetails.length > 0
        ? this.queueProcessingDetails
        : this.internalProcessingDetails;
    },
    finalTerminatedDetails() {
      return Array.isArray(this.queueTerminatedDetails) && this.queueTerminatedDetails.length > 0
        ? this.queueTerminatedDetails
        : this.internalTerminatedDetails;
    },
  },
  mounted() {
    // Initialize Firebase listeners when details is true and we have a queue
    if (this.details && this.queue?.id) {
      this.initializeFirebaseListeners();
    }
  },
  beforeUnmount() {
    this.cleanupFirebaseListeners();
  },
  watch: {
    queue(newQueue, oldQueue) {
      if (this.details && newQueue?.id && newQueue.id !== oldQueue?.id) {
        this.initializeFirebaseListeners();
      }
    },
  },
  methods: {
    showDetails() {
      this.extendedEntity = !this.extendedEntity;
    },
    openDrawer() {
      if (this.useDrawer) {
        this.$emit('open-drawer');
      }
    },

    initializeFirebaseListeners() {
      if (!this.queue?.id) return;

      // Clean up previous listeners
      this.cleanupFirebaseListeners();

      // Initialize Firebase listeners
      this.pendingAttentionsRef = updatedAvailableAttentions(this.queue.id);
      this.processingAttentionsRef = updatedProcessingAttentions(this.queue.id);
      this.terminatedAttentionsRef = updatedTerminatedAttentions(this.queue.id);

      // Watch for changes and update internal data
      this.$watch(
        () => this.pendingAttentionsRef?.value,
        (newVal) => {
          if (Array.isArray(newVal)) {
            this.internalPendingDetails.splice(0, this.internalPendingDetails.length, ...newVal);
          }
        },
        { immediate: true, deep: true }
      );

      this.$watch(
        () => this.processingAttentionsRef?.value,
        (newVal) => {
          if (Array.isArray(newVal)) {
            this.internalProcessingDetails.splice(0, this.internalProcessingDetails.length, ...newVal);
          }
        },
        { immediate: true, deep: true }
      );

      this.$watch(
        () => this.terminatedAttentionsRef?.value,
        (newVal) => {
          if (Array.isArray(newVal)) {
            this.internalTerminatedDetails.splice(0, this.internalTerminatedDetails.length, ...newVal);
          }
        },
        { immediate: true, deep: true }
      );
    },

    cleanupFirebaseListeners() {
      if (this.pendingAttentionsRef && this.pendingAttentionsRef._unsubscribe) {
        this.pendingAttentionsRef._unsubscribe();
      }
      if (this.processingAttentionsRef && this.processingAttentionsRef._unsubscribe) {
        this.processingAttentionsRef._unsubscribe();
      }
      if (this.terminatedAttentionsRef && this.terminatedAttentionsRef._unsubscribe) {
        this.terminatedAttentionsRef._unsubscribe();
      }
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
      const handleFocusIn = e => {
        if (
          modalElement.contains(e.target) &&
          modalElement.getAttribute('aria-hidden') === 'true'
        ) {
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
      <span
        v-if="details"
        :class="disableClick ? 'queue-details-no-click' : 'queue-details'"
        :data-bs-toggle="disableClick || useDrawer ? null : 'modal'"
        :href="disableClick || useDrawer ? null : '#queueModal'"
        @click="disableClick ? null : useDrawer ? openDrawer() : null"
      >
        <div class="row centered">
          <div :class="hideSeeQueue ? 'col-12' : 'col-8'">
            <i class="bi bi-person-lines-fill"></i> {{ queue?.name }}
          </div>
          <div v-if="!hideSeeQueue" class="col-3">
            <span
              :data-bs-toggle="disableClick || useDrawer ? null : 'modal'"
              :href="disableClick || useDrawer ? null : '#queueModal'"
              @click.stop="disableClick ? null : useDrawer ? openDrawer() : null"
            >
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
    <Teleport to="body" v-if="!useDrawer">
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
        <div class="modal-dialog modal-fullscreen">
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
                :key="`queue-modal-${queue?.id}-${listUpdateKey || 0}`"
                :queue="queue"
                :queue-pending-details="Array.isArray(queuePendingDetails) ? queuePendingDetails : []"
                :queue-processing-details="Array.isArray(queueProcessingDetails) ? queueProcessingDetails : []"
                :queue-terminated-details="Array.isArray(queueTerminatedDetails) ? queueTerminatedDetails : []"
                :commerce="commerce"
              ></QueueAttentionDetails>
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
.queue-details-no-click {
  cursor: default;
}
.see-queue {
  text-decoration: underline;
  font-size: 0.7rem;
  margin-right: 0.2rem;
  font-weight: 600;
}
</style>

<style>
/* Reduce column width for QueueAttentionDetails when inside queueModal */
#queueModal .modal-body .attention-pipeline-column {
  flex: 0 0 calc(33.333% - 0.67rem) !important;
  min-width: 250px !important;
  max-width: 280px !important;
}

@media (max-width: 768px) {
  #queueModal .modal-body .attention-pipeline-column {
    flex: 0 0 calc(100% - 1rem) !important;
    min-width: 250px !important;
    max-width: 100% !important;
  }
}
</style>
