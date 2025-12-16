<script>
import { getDate } from '../../../shared/utils/date';
import { getControlStatusTypes } from '../../../shared/utils/data';
import { globalStore } from '../../../stores';

export default {
  name: 'HistoryControlDetailsCard',
  props: {
    show: { type: Boolean, default: false },
    content: { type: String, default: undefined },
    date: { type: String, default: undefined },
    status: { type: String, default: undefined },
    reason: { type: String, default: undefined },
    index: { type: Number, default: undefined },
    commerce: { type: Object, default: {} },
    clientId: { type: String, default: undefined },
    toggles: { type: Object, default: {} },
  },
  data() {
    const store = globalStore();
    return {
      showAdd: false,
      extendedControlEntity: false,
      newResult: '',
      newStatus: '',
      statuses: [],
      store,
      userType: undefined,
    };
  },
  beforeMount() {
    this.statuses = getControlStatusTypes();
    this.newStatus = this.status || 'PENDING';
    this.newResult = this.content || '';
  },
  methods: {
    getDate(date) {
      return getDate(date);
    },
    async getUserType() {
      this.userType = await this.store.getCurrentUserType;
    },
    getStatusIcon(status) {
      if (status === 'PENDING') {
        return 'bi-clock-fill';
      } else if (status === 'PROCCESSED') {
        return 'bi-check-circle-fill';
      } else if (status === 'CANCELLED') {
        return 'bi-x-circle-fill';
      } else {
        return 'bi-clock-fill';
      }
    },
    getStatusBadgeClass(status) {
      if (status === 'PENDING') {
        return 'badge-warning';
      } else if (status === 'PROCCESSED') {
        return 'badge-success';
      } else if (status === 'CANCELLED') {
        return 'badge-danger';
      } else {
        return 'badge-secondary';
      }
    },
    update() {
      this.$emit('onSave', this.index, this.reason, this.newStatus, this.newResult);
    },
    getAttention() {
      const commerceKeyName = this.commerce.keyName;
      let url = `/interno/negocio/commerce/${commerceKeyName}/filas`;
      if (this.userType === 'collaborator') {
        url = `/interno/commerce/${commerceKeyName}/filas`;
      }
      let resolvedRoute;
      const query = {};
      if (this.clientId) {
        query['client'] = this.clientId;
      }
      if (Object.keys(query).length === 0) {
        resolvedRoute = this.$router.resolve({ path: url });
      } else {
        resolvedRoute = this.$router.resolve({ path: url, query });
      }
      window.open(resolvedRoute.href, '_blank');
    },
    showUpdate() {
      this.extendedControlEntity = !this.extendedControlEntity;
    },
  },
  watch: {
    store: {
      immediate: true,
      deep: true,
      async handler() {
        await this.getUserType();
      },
    },
    status: {
      immediate: true,
      handler(newStatus) {
        if (newStatus) {
          this.newStatus = newStatus;
        }
      },
    },
    content: {
      immediate: true,
      handler(newContent) {
        if (newContent) {
          this.newResult = newContent;
        }
      },
    },
  },
};
</script>

<template>
  <div v-if="show" class="control-card-modern">
    <div class="control-card-header">
      <div class="control-card-date-badge">
        <i class="bi bi-calendar3 me-1"></i>
        <span>{{ getDate(date) }}</span>
      </div>
      <div class="control-card-status-badge" :class="getStatusBadgeClass(status)">
        <i :class="`bi ${getStatusIcon(status)} me-1`"></i>
        <span>{{ $t(`controlStatusTypes.${status}`) }}</span>
      </div>
    </div>

    <div class="control-card-body">
      <div class="control-card-reason">
        <i class="bi bi-tag-fill control-reason-icon"></i>
        <span class="control-reason-text">{{ $t(`controlReasonTypes.${reason}`) }}</span>
      </div>

      <div v-if="content" class="control-card-content">
        <p class="control-card-text">{{ content }}</p>
      </div>

      <div
        v-if="toggles['patient.history.control-update'] && status === 'PENDING'"
        class="control-card-actions"
      >
        <button class="btn-control-action btn-edit" @click.prevent="showUpdate()">
          <i class="bi bi-pencil-fill me-1"></i>
          <span>{{ $t('patientHistoryView.attendControl') }}</span>
          <i :class="`bi ${extendedControlEntity ? 'bi-chevron-up' : 'bi-chevron-down'} ms-2`"></i>
        </button>
        <button class="btn-control-action btn-create" @click.prevent="getAttention()">
          <i class="bi bi-box-arrow-up-right me-1"></i>
          <span>{{ $t('collaboratorBookingsView.create') }}</span>
        </button>
      </div>
    </div>

    <div v-if="extendedControlEntity" class="control-update-form">
      <div class="form-header-modern">
        <i class="bi bi-pencil-square form-header-icon"></i>
        <h4 class="form-header-title">{{ $t('patientHistoryView.attendControl') }}</h4>
      </div>

      <div class="form-content-modern">
        <div class="form-field-modern">
          <label class="form-label-modern" for="select-status">
            <i class="bi bi-info-circle me-1"></i>
            {{ $t('patientHistoryView.controlStatus') }}
          </label>
          <select
            id="select-status"
            class="form-control-modern form-select-modern"
            v-model="newStatus"
          >
            <option v-for="status in statuses" :key="status.name" :value="status.id">
              {{ $t(`controlStatusTypes.${status.id}`) }}
            </option>
          </select>
        </div>

        <div class="form-field-modern">
          <label class="form-label-modern" for="control-comment">
            <i class="bi bi-chat-left-text me-1"></i>
            {{ $t('businessPatientHistoryItemAdmin.comment') }}
          </label>
          <textarea
            id="control-comment"
            :disabled="!toggles['patient.history.control-edit']"
            class="form-control-modern"
            rows="5"
            :maxlength="500"
            v-model="newResult"
          ></textarea>
        </div>

        <div class="form-actions-modern">
          <button
            class="btn-save-control"
            @click="update()"
            :disabled="!toggles['patient.history.control-update']"
          >
            <i class="bi bi-check-circle-fill me-2"></i>
            {{ $t('patientHistoryView.update') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.control-card-modern {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.98) 100%);
  padding: 1rem;
  margin: 0.75rem 0;
  border-radius: 0.75rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.control-card-modern::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
}

.control-card-modern:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: rgba(0, 0, 0, 0.12);
}

.control-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.control-card-date-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.5rem;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  border-radius: 0.75rem;
  font-size: 0.7rem;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
  line-height: 1.2;
}

.control-card-status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.5rem;
  border-radius: 0.75rem;
  font-size: 0.7rem;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
  line-height: 1.2;
}

.control-card-status-badge.badge-warning {
  background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%);
  color: #000;
}

.control-card-status-badge.badge-success {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  color: white;
}

.control-card-status-badge.badge-danger {
  background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
  color: white;
}

.control-card-status-badge.badge-secondary {
  background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
  color: white;
}

.control-card-body {
  padding-left: 0.25rem;
}

.control-card-reason {
  display: flex;
  align-items: center;
  margin-bottom: 0.75rem;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 0.5rem;
}

.control-reason-icon {
  color: var(--azul-turno);
  font-size: 1rem;
  margin-right: 0.5rem;
}

.control-reason-text {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--color-text);
}

.control-card-content {
  margin-bottom: 0.75rem;
}

.control-card-text {
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--color-text);
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.control-card-actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.btn-control-action {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-decoration: none;
  color: white;
}

.btn-control-action:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.btn-control-action:active {
  transform: translateY(0);
}

.btn-edit {
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
}

.btn-edit:hover {
  background: linear-gradient(135deg, var(--verde-tu) 0%, var(--azul-turno) 100%);
}

.btn-create {
  background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
}

.btn-create:hover {
  background: linear-gradient(135deg, #138496 0%, #17a2b8 100%);
}

.control-update-form {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 2px solid rgba(0, 0, 0, 0.1);
  animation: slideDown 0.3s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.form-header-modern {
  display: flex;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
}

.form-header-icon {
  font-size: 1.25rem;
  color: var(--azul-turno);
  margin-right: 0.5rem;
}

.form-header-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.form-content-modern {
  padding: 0.5rem 0;
}

.form-field-modern {
  margin-bottom: 1rem;
}

.form-label-modern {
  display: flex;
  align-items: center;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.form-control-modern {
  width: 100%;
  padding: 0.6rem;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 0.5rem;
  font-size: 0.9rem;
  transition: all 0.2s ease;
  background-color: white;
  color: var(--color-text);
}

.form-control-modern:focus {
  outline: none;
  border-color: var(--azul-turno);
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.form-control-modern:disabled {
  background-color: #f8f9fa;
  cursor: not-allowed;
  opacity: 0.6;
}

.form-select-modern {
  cursor: pointer;
}

.form-actions-modern {
  display: flex;
  justify-content: flex-end;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.btn-save-control {
  display: inline-flex;
  align-items: center;
  padding: 0.6rem 1.5rem;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

.btn-save-control:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.btn-save-control:active:not(:disabled) {
  transform: translateY(0);
}

.btn-save-control:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}
</style>
