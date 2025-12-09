<script>
import Popper from 'vue3-popper';
import Toggle from '@vueform/toggle';

export default {
  name: 'SimplePermissionCard',
  components: { Popper, Toggle },
  props: {
    show: { type: Boolean, default: true },
    canUpdate: { type: Boolean, default: true },
    permission: { type: Object, default: {} },
    showTooltip: { type: Boolean, default: false },
    icon: { type: String, default: '' },
    iconStyleClass: { type: String, default: '' },
  },
  data() {
    return {};
  },
  methods: {
    async update() {
      await this.$emit('update', this.permission);
    },
    getModule(name) {
      if (name) {
        const [module] = name.split('.');
        return module;
      }
    },
  },
};
</script>

<template>
  <div v-if="show">
    <div class="permission-card">
      <div class="permission-card-header">
        <div class="permission-badge">
          <span class="badge-modern">{{ getModule(permission.name) }}</span>
        </div>
        <div class="permission-title-wrapper">
          <div class="permission-title">
            <i :class="`bi ${icon} ${iconStyleClass} permission-icon`"></i>
            <span class="permission-label"> {{ $t(`permissions.${permission.name}`) }} </span>
          </div>
        </div>
        <div class="permission-toggle-wrapper">
          <div v-if="permission.value === true || permission.value === false">
            <Toggle v-model="permission.value" :disabled="!canUpdate" @click="update(permission)" />
          </div>
          <div class="permission-number-input" v-else>
            <input
              min="1"
              type="number"
              class="form-control-modern"
              v-model="permission.value"
              placeholder="Ex.: 10"
            />
            <button
              class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
              @click="update(permission)"
            >
              <i class="bi bi-check-lg"></i>
            </button>
          </div>
        </div>
      </div>
      <div class="permission-name">
        <span class="permission-name-text"> {{ permission.name }} </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.permission-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 251, 252, 0.98) 100%);
  backdrop-filter: blur(10px);
  padding: 0.625rem 0.875rem;
  margin: 0.5rem 0;
  border-radius: 8px;
  border: 1px solid rgba(169, 169, 169, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.permission-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
  border-color: rgba(169, 169, 169, 0.3);
}

.permission-card-header {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-bottom: 0.5rem;
}

.permission-badge {
  flex-shrink: 0;
}

.badge-modern {
  display: inline-block;
  padding: 0.1875rem 0.5rem;
  font-size: 0.625rem;
  font-weight: 700;
  line-height: 1.2;
  color: #004aad;
  background-color: rgba(0, 74, 173, 0.1);
  border: 1px solid rgba(0, 74, 173, 0.2);
  border-radius: 4px;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.permission-title-wrapper {
  flex: 1;
  min-width: 0;
}

.permission-title {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.3;
  color: #000000;
}

.permission-icon {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.5);
  flex-shrink: 0;
}

.permission-label {
  word-break: break-word;
  line-height: 1.3;
}

.permission-toggle-wrapper {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.permission-number-input {
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.permission-number-input .form-control-modern {
  width: 70px;
  padding: 0.3125rem 0.4375rem;
  font-size: 0.75rem;
}

.permission-name {
  margin-top: 0.375rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(169, 169, 169, 0.15);
}

.permission-name-text {
  font-size: 0.6875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.5);
  font-family: 'Courier New', monospace;
  word-break: break-all;
}

.form-control-modern {
  padding: 0.375rem 0.5rem;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.4;
  color: #000000;
  background-color: rgba(255, 255, 255, 0.95);
  border: 1.5px solid rgba(169, 169, 169, 0.25);
  border-radius: 5px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.form-control-modern:focus {
  outline: none;
  border-color: rgba(0, 194, 203, 0.5);
  box-shadow: 0 0 0 2px rgba(0, 194, 203, 0.1);
  background-color: rgba(255, 255, 255, 1);
}

.form-control-modern:hover:not(:disabled) {
  border-color: rgba(169, 169, 169, 0.4);
  background-color: rgba(255, 255, 255, 1);
}

.configuration-details-container {
  font-size: 0.8rem;
  margin-left: 0.5rem;
  margin-right: 0.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0;
}
</style>
