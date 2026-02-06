<script>
import { ref, watch, onUnmounted, nextTick } from 'vue';
import { Modal } from 'bootstrap';
import AttentionCreationFlow from './AttentionCreationFlow.vue';

export default {
  name: 'AttentionCreationModal',
  components: {
    AttentionCreationFlow,
  },
  props: {
    show: { type: Boolean, default: false },
    commerce: { type: Object, required: true },
    queues: { type: Array, default: () => [] },
    groupedQueues: { type: Object, default: () => {} },
    collaborators: { type: Array, default: () => [] },
    preselectedQueue: { type: Object, default: null },
    preselectedDate: { type: [String, Object], default: null },
    preselectedBlock: { type: Object, default: null },
    preselectedClient: { type: Object, default: null },
    clientData: { type: Object, default: null }, // Enhanced client data
    toggles: { type: Object, default: () => {} },
    sessionId: { type: String, default: null },
    creationType: { type: String, default: 'booking' }, // 'attention' | 'booking'
    preselectedPackageId: { type: String, default: null }, // Package ID to associate with attention/booking
    preselectedServiceId: { type: String, default: null }, // Service ID to filter services/collaborators
  },
  emits: ['close', 'attention-created', 'error'],
  setup(props, { emit }) {
    const modalRef = ref(null);
    const modalId = ref(`attention-creation-modal-${Date.now()}`);
    const attentionFlowRef = ref(null);
    const isVisible = ref(false);
    let modalInstance = null;

    const closeModal = () => {
      if (modalInstance) {
        modalInstance.hide();
      }
      emit('close');
    };

    const handleAttentionCreated = attention => {
      emit('attention-created', attention);
      closeModal();
    };

    const handleError = errors => {
      emit('error', errors);
    };

    const handleHidden = () => {
      emit('close');
    };

    watch(
      () => props.show,
      async isOpen => {
        await nextTick();
        if (!modalRef.value) return;

        if (!modalInstance) {
          modalInstance = new Modal(modalRef.value, {
            backdrop: true,
            keyboard: true,
            focus: true,
          });

          // Listen for hidden event
          modalRef.value.addEventListener('hidden.bs.modal', handleHidden);
        }

        if (isOpen) {
          // Reset state when modal opens - await to ensure blocks are loaded
          await nextTick();
          if (attentionFlowRef.value && attentionFlowRef.value.resetState) {
            await attentionFlowRef.value.resetState();
          }
          isVisible.value = true;
          modalInstance.show();
        } else {
          isVisible.value = false;
          modalInstance.hide();
        }
      }
    );

    onUnmounted(() => {
      if (modalInstance) {
        modalInstance.dispose();
      }
      if (modalRef.value) {
        modalRef.value.removeEventListener('hidden.bs.modal', handleHidden);
      }
    });

    return {
      modalRef,
      modalId,
      attentionFlowRef,
      closeModal,
      handleAttentionCreated,
      handleError,
      isVisible,
    };
  },
};
</script>

<template>
  <Teleport to="body">
    <div
      ref="modalRef"
      class="modal fade"
      :id="modalId"
      tabindex="-1"
      aria-labelledby="attentionCreationModalLabel"
      aria-hidden="true"
      data-bs-backdrop="true"
      data-bs-keyboard="true"
    >
      <div class="modal-dialog modal-dialog-scrollable modal-xl modern-modal-wrapper">
        <div class="modal-content modern-modal-container">
          <div class="modal-header border-0 active-name modern-modal-header">
            <div class="modern-modal-header-inner">
              <div class="modern-modal-icon-wrapper">
                <i class="bi bi-calendar-plus"></i>
              </div>
              <div class="modern-modal-title-wrapper">
                <h5 class="modal-title fw-bold modern-modal-title" id="attentionCreationModalLabel">
                  {{ $t('attentionCreation.createBooking') }}
                </h5>
                <p v-if="clientData" class="modern-modal-client-name">
                  {{ clientData.userName || clientData.userIdNumber || clientData.userEmail }}
                </p>
              </div>
            </div>
            <button
              type="button"
              class="modern-modal-close-btn"
              @click="closeModal"
              aria-label="Close"
            >
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
          <div class="modal-body modern-modal-body-content">
            <AttentionCreationFlow
              ref="attentionFlowRef"
              :commerce="commerce"
              :queues="queues"
              :grouped-queues="groupedQueues"
              :collaborators="collaborators"
              :preselected-queue="preselectedQueue"
              :preselected-date="preselectedDate"
              :preselected-package-id="preselectedPackageId"
              :preselected-service-id="preselectedServiceId"
              :preselected-block="preselectedBlock"
              :preselected-client="preselectedClient"
              :client-data="clientData"
              :toggles="toggles"
              :creation-type="creationType"
              :session-id="sessionId"
              :is-visible="isVisible"
              mode="modal"
              @attention-created="handleAttentionCreated"
              @cancel="closeModal"
              @error="handleError"
            />
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
/* Modern Modal Styles - Homologated with other modals */
.modern-modal-wrapper {
  margin: 0;
  max-width: 90vw;
  height: 100vh;
  display: flex;
  align-items: stretch;
}

.modern-modal-container {
  border: none;
  border-radius: 0;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 100vh;
}

.modern-modal-header {
  padding: 0.75rem 1rem;
  background-color: var(--azul-turno);
  color: var(--color-background);
  border-radius: 0.75rem 0.75rem 0 0;
  min-height: auto;
  position: relative;
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

.modern-modal-body-content {
  padding: 1rem;
  background: #ffffff;
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  min-height: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .modern-modal-wrapper {
    margin: 0;
    max-width: 100vw;
    height: 100vh;
  }

  .modern-modal-body-content {
    padding: 0.75rem;
  }
}
</style>
