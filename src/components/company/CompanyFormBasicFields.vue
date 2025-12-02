<script>
import Toggle from '@vueform/toggle';
import Popper from 'vue3-popper';

export default {
  name: 'CompanyFormBasicFields',
  components: { Toggle, Popper },
  props: {
    modelValue: { type: Object, required: true },
    types: { type: Array, default: () => [] },
    toggles: { type: Object, default: () => ({}) },
    errors: { type: Object, default: () => ({}) },
    prefix: { type: String, default: '' },
    isAdd: { type: Boolean, default: false },
    maxOrder: { type: Number, default: 1 },
  },
  emits: ['update:modelValue'],
  computed: {
    company: {
      get() {
        return this.modelValue;
      },
      set(value) {
        this.$emit('update:modelValue', value);
      },
    },
  },
};
</script>

<template>
  <div class="form-fields-container">
    <div class="form-group-modern" v-if="isAdd">
      <label class="form-label-modern">
        {{ $t('businessCompaniesAdmin.name') }}
      </label>
      <input
        :id="`${prefix}company-name-form`"
        :disabled="false"
        min="1"
        max="50"
        type="text"
        class="form-control-modern"
        :class="{ 'is-invalid': errors.nameError }"
        v-model="company.name"
        placeholder="Company A"
      />
    </div>
    <div class="form-group-modern">
      <label class="form-label-modern">
        {{ $t('businessCompaniesAdmin.tag') }}
        <Popper :class="'dark p-1'" arrow disable-click-away>
          <template #content>
            <div>{{ $t('businessCompaniesAdmin.tagHelp') }}</div>
          </template>
          <i class="bi bi-info-circle-fill form-help-icon"></i>
        </Popper>
      </label>
      <input
        :id="`${prefix}company-tag-form`"
        :disabled="isAdd ? false : !toggles['companies.admin.edit']"
        min="1"
        max="50"
        type="text"
        class="form-control-modern"
        :class="{ 'is-invalid': errors.tagError }"
        v-model="company.tag"
        placeholder="Serv-A"
      />
    </div>
    <div class="form-group-modern" v-if="isAdd">
      <label class="form-label-modern">
        {{ $t('businessCompaniesAdmin.type') }}
        <Popper :class="'dark p-1'" arrow disable-click-away>
          <template #content>
            <div>{{ $t('businessCompaniesAdmin.typeHelp') }}</div>
          </template>
          <i class="bi bi-info-circle-fill form-help-icon"></i>
        </Popper>
      </label>
      <select
        :id="`${prefix}company-type-form`"
        class="form-control-modern form-select-modern"
        :class="{ 'is-invalid': errors.typeError }"
        v-model="company.type"
      >
        <option v-for="typ in types" :key="typ.id" :value="typ.id">
          {{ $t(`companies.types.${typ.id}`) }}
        </option>
      </select>
    </div>
    <div class="form-group-modern" v-if="!isAdd">
      <label class="form-label-modern">
        {{ $t('businessQueuesAdmin.type') }}
      </label>
      <input
        :id="`${prefix}company-type-form`"
        :disabled="true"
        type="text"
        class="form-control-modern"
        v-model="company.type"
        placeholder="Type"
      />
    </div>
    <div class="form-group-modern">
      <label class="form-label-modern">
        {{ $t('businessCompaniesAdmin.order') }}
        <Popper :class="'dark p-1'" arrow disable-click-away>
          <template #content>
            <div>{{ $t('businessCompaniesAdmin.orderHelp') }}</div>
          </template>
          <i class="bi bi-info-circle-fill form-help-icon"></i>
        </Popper>
      </label>
      <input
        :id="`${prefix}company-order-form`"
        :disabled="isAdd ? false : !toggles['companies.admin.edit']"
        min="1"
        :max="maxOrder"
        type="number"
        class="form-control-modern"
        :class="{ 'is-invalid': errors.orderError }"
        v-model.number="company.order"
        placeholder="1"
      />
    </div>
    <div class="form-group-modern form-group-toggle">
      <label class="form-label-modern">
        {{ $t('businessCompaniesAdmin.online') }}
        <Popper :class="'dark p-1'" arrow disable-click-away>
          <template #content>
            <div>{{ $t('businessCompaniesAdmin.onlineHelp') }}</div>
          </template>
          <i class="bi bi-info-circle-fill form-help-icon"></i>
        </Popper>
      </label>
      <Toggle
        v-model="company.online"
        :disabled="isAdd ? false : !toggles['companies.admin.edit']"
      />
    </div>
    <div class="form-group-modern form-group-toggle">
      <label class="form-label-modern">
        {{ $t('businessCompaniesAdmin.active') }}
      </label>
      <Toggle
        v-model="company.active"
        :disabled="isAdd ? false : !toggles['companies.admin.edit']"
      />
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
</style>

