<template>
  <div class="modal-overlay" @click.self="$emit('cancel')">
    <div class="modal-content">
      <div class="modal-header">
        <h5>{{ $t('clientPortal.consents.revoke.title') }}</h5>
        <button type="button" class="btn-close" @click="$emit('cancel')"></button>
      </div>
      <div class="modal-body">
        <p>{{ $t('clientPortal.consents.revoke.confirmMessage') }}</p>
        <div class="form-group">
          <label
            >{{ $t('clientPortal.consents.revoke.reason') }} ({{
              $t('clientPortal.consents.revoke.optional')
            }})</label
          >
          <textarea
            v-model="reason"
            class="form-control"
            rows="3"
            :placeholder="$t('clientPortal.consents.revoke.reasonPlaceholder')"
          ></textarea>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" @click="$emit('cancel')">
          {{ $t('clientPortal.consents.revoke.cancel') }}
        </button>
        <button type="button" class="btn btn-danger" @click="confirm">
          {{ $t('clientPortal.consents.revoke.confirm') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref } from 'vue';

export default {
  name: 'ConsentRevokeModal',
  props: {
    consent: {
      type: Object,
      required: true,
    },
  },
  emits: ['confirm', 'cancel'],
  setup(props, { emit }) {
    const reason = ref('');

    const confirm = () => {
      emit('confirm', reason.value);
    };

    return {
      reason,
      confirm,
    };
  },
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
}

.modal-content {
  background: white;
  border-radius: 0.5rem;
  max-width: 500px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  padding: 1rem;
  border-bottom: 1px solid var(--gris-default);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h5 {
  margin: 0;
}

.modal-body {
  padding: 1rem;
}

.modal-footer {
  padding: 1rem;
  border-top: 1px solid var(--gris-default);
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}
</style>
