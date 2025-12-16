<script>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';
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
    toggles: { type: Object, default: () => {} },
    sessionId: { type: String, default: null },
  },
  emits: ['close', 'attention-created', 'error'],
  setup(props, { emit }) {
    const modalRef = ref(null);
    const modalId = ref(`attention-creation-modal-${Date.now()}`);
    const attentionFlowRef = ref(null);
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
          modalInstance.show();
        } else {
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
      <div class="modal-dialog modal-dialog-scrollable modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="attentionCreationModalLabel">
              <i class="bi bi-calendar-plus"></i>
              {{ $t('collaboratorBookingsView.create') || 'Criar Atendimento' }}
            </h5>
            <button type="button" class="btn-close" @click="closeModal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <AttentionCreationFlow
              ref="attentionFlowRef"
              :commerce="commerce"
              :queues="queues"
              :grouped-queues="groupedQueues"
              :collaborators="collaborators"
              :preselected-queue="preselectedQueue"
              :preselected-date="preselectedDate"
              :preselected-block="preselectedBlock"
              :preselected-client="preselectedClient"
              :toggles="toggles"
              :session-id="sessionId"
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
/* Modal header with blue background and white text */
.modal-header {
  background: linear-gradient(135deg, var(--azul-turno, #004aad) 0%, var(--verde-tu, #00c2cb) 100%);
  color: white;
  border-bottom: none;
  padding: 1rem 1.25rem;
}

.modal-title {
  color: white;
  font-weight: 700;
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.modal-title i {
  color: white;
  font-size: 1.125rem;
}

.btn-close {
  filter: invert(1) grayscale(100%) brightness(200%);
  opacity: 0.9;
}

.btn-close:hover {
  opacity: 1;
}
</style>
