<script>
import Toggle from '@vueform/toggle';
import Popper from 'vue3-popper';

export default {
  name: 'FormFormBasicFields',
    components: { Toggle, Popper },
  props: {
    modelValue: { type: Object, required: true },
    types: { type: Array, default: () => [] },
    queues: { type: Array, default: () => [] },
    services: { type: Array, default: () => [] },
    toggles: { type: Object, default: () => ({}) },
    errors: { type: Object, default: () => ({}) },
    prefix: { type: String, default: '' },
    isAdd: { type: Boolean, default: false },
    showService: { type: Function, default: () => {} },
    selectService: { type: Function, default: () => {} },
    deleteService: { type: Function, default: () => {} },
    selectedService: { type: Object, default: null },
  },
  emits: ['update:modelValue', 'update:selectedService', 'selectType'],
  computed: {
    form: {
      get() {
        return this.modelValue;
      },
      set(value) {
        this.$emit('update:modelValue', value);
      },
    },
  },
  methods: {
    handleSelectService(service) {
      this.$emit('update:selectedService', service);
      if (this.selectService) {
        this.selectService(this.form, service);
      }
    },
    handleDeleteService(serviceId) {
      if (this.deleteService) {
        this.deleteService(this.form, serviceId);
      }
    },
  },
};
</script>

<template>
  <div class="form-fields-container">
    <div class="form-group-modern">
      <label class="form-label-modern">
        {{ $t('businessFormsAdmin.type') }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>{{ $t('businessFormsAdmin.typeHelp') }}</div>
          </template>
          <i class="bi bi-info-circle-fill form-help-icon"></i>
        </Popper>
      </label>
      <select
        :id="`${prefix}form-type-form`"
        class="form-control-modern form-select-modern"
        :class="{ 'is-invalid': errors.typeError }"
        v-model="form.type"
        @change="$emit('selectType', isAdd ? 'add' : 'update')"
      >
        <option v-for="typ in types" :key="typ" :value="typ">
          {{ $t(`forms.types.${typ}`) }}
        </option>
      </select>
    </div>
    <div class="form-group-modern">
      <label class="form-label-modern">
        {{ $t('businessFormsAdmin.queue') }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>{{ $t('businessFormsAdmin.queueHelp') }}</div>
          </template>
          <i class="bi bi-info-circle-fill form-help-icon"></i>
        </Popper>
      </label>
      <select
        :id="`${prefix}form-queue-form`"
        class="form-control-modern form-select-modern"
        :disabled="isAdd ? false : !toggles['forms.admin.edit']"
        v-model="form.queueId"
      >
        <option v-for="queue in queues" :key="queue.name" :value="queue.id">
          {{ queue.name }}
        </option>
      </select>
    </div>
    <div class="form-group-modern">
      <label class="form-label-modern">
        {{ $t('businessFormsAdmin.services') }}
      </label>
      <div class="form-services-wrapper">
        <select
          :id="`${prefix}form-services-form`"
          :disabled="isAdd ? false : !toggles['forms.admin.edit']"
          class="form-control-modern form-select-modern"
          @change="handleSelectService(services.find(s => s.id === $event.target.value))"
        >
          <option value="">-- Selecionar --</option>
          <option v-for="com in services" :key="com.id" :value="com.id">
            {{ com.active ? `🟢  ${com.tag}` : `🔴  ${com.tag}` }}
          </option>
        </select>
        <div class="selected-items-container" v-if="form.servicesId && form.servicesId.length > 0">
          <span class="badge-item" v-for="serviceId in form.servicesId" :key="serviceId">
            {{ showService(serviceId) }}
            <button
              type="button"
              class="btn-close-item"
              aria-label="Remove"
              @click="handleDeleteService(serviceId)"
            ></button>
          </span>
        </div>
      </div>
    </div>
    <div class="form-group-modern form-group-toggle" v-if="!isAdd">
      <label class="form-label-modern">
        {{ $t('businessFormsAdmin.active') }}
      </label>
      <Toggle v-model="form.active" :disabled="isAdd ? false : !toggles['forms.admin.edit']" />
    </div>
  </div>
</template>

<style scoped>
/* Modern Form Styles - Compact */
.form-fields-container {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  padding: 0.375rem;
}

.form-group-modern {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.form-group-toggle {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.form-label-modern {
  font-size: 0.7rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.7);
  text-transform: capitalize;
  letter-spacing: 0.5px;
  margin-bottom: 0;
  min-width: 120px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.form-help-icon {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.4);
  cursor: help;
}

.form-control-modern,
.form-select-modern {
  flex: 1;
  padding: 0.4rem 0.625rem;
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

.form-control-modern:focus,
.form-select-modern:focus {
  outline: none;
  border-color: rgba(0, 194, 203, 0.5);
  box-shadow: 0 0 0 2px rgba(0, 194, 203, 0.1);
  background-color: rgba(255, 255, 255, 1);
}

.form-control-modern:hover:not(:disabled),
.form-select-modern:hover:not(:disabled) {
  border-color: rgba(169, 169, 169, 0.4);
  background-color: rgba(255, 255, 255, 1);
}

.form-control-modern:disabled,
.form-select-modern:disabled {
  background-color: rgba(245, 246, 247, 0.8);
  color: rgba(0, 0, 0, 0.5);
  cursor: not-allowed;
  opacity: 0.7;
}

.form-control-modern::placeholder {
  color: rgba(0, 0, 0, 0.4);
  font-weight: 400;
}

.form-control-modern.is-invalid,
.form-select-modern.is-invalid {
  border-color: rgba(165, 42, 42, 0.5);
  box-shadow: 0 0 0 2px rgba(165, 42, 42, 0.1);
}

.form-select-modern {
  flex: 1;
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 16px 12px;
  padding-right: 2.5rem;
}

.form-services-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.selected-items-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.375rem;
}

.badge-item {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.3;
  color: #000000;
  background-color: rgba(0, 194, 203, 0.1);
  border: 1px solid rgba(0, 194, 203, 0.3);
  border-radius: 4px;
  transition: all 0.2s ease;
}

.badge-item:hover {
  background-color: rgba(0, 194, 203, 0.15);
  border-color: rgba(0, 194, 203, 0.4);
}

.btn-close-item {
  width: 14px;
  height: 14px;
  padding: 0;
  margin: 0;
  margin-left: 0.25rem;
  background: transparent;
  border: none;
  opacity: 0.6;
  cursor: pointer;
  transition: opacity 0.2s ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-close-item:hover {
  opacity: 1;
}

.btn-close-item::before {
  content: '×';
  font-size: 18px;
  line-height: 1;
  color: #000000;
  font-weight: 600;
}
</style>
