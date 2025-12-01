<script>
import Toggle from '@vueform/toggle';
import Popper from 'vue3-popper';

export default {
  name: 'ModuleFormBasicFields',
  components: { Toggle, Popper },
  props: {
    modelValue: { type: Object, required: true },
    toggles: { type: Object, default: () => ({}) },
    errors: { type: Object, default: () => ({}) },
    prefix: { type: String, default: '' },
    isAdd: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
  computed: {
    module: {
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
    <div class="form-group-modern">
      <label class="form-label-modern" :for="`${prefix}module-name-form`">
        {{ $t('businessModulesAdmin.name') }}
      </label>
      <input
        :id="`${prefix}module-name-form`"
        :disabled="isAdd ? false : !toggles['modules.admin.edit']"
        min="1"
        max="50"
        type="text"
        class="form-control-modern"
        :class="{ 'is-invalid': errors.nameError }"
        v-model="module.name"
        placeholder="Module A"
      />
    </div>
    <div class="form-group-modern form-group-toggle">
      <label class="form-label-modern">
        {{ $t('businessModulesAdmin.active') }}
      </label>
      <Toggle
        v-model="module.active"
        :disabled="isAdd ? false : !toggles['modules.admin.edit']"
      />
    </div>
  </div>
</template>

<style scoped>
.form-fields-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
}

.form-group-modern {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.25rem;
}

.form-label-modern {
  min-width: 120px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #495057;
  text-transform: capitalize;
  flex-shrink: 0;
}

.form-control-modern {
  flex: 1;
  padding: 0.4rem 0.625rem;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: #212529;
  background-color: #fff;
  border: 1px solid #ced4da;
  border-radius: 5px;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.form-control-modern:focus {
  color: #212529;
  background-color: #fff;
  border-color: #86b7fe;
  outline: 0;
  box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.25);
}

.form-control-modern:disabled {
  background-color: #e9ecef;
  opacity: 0.6;
  cursor: not-allowed;
}

.form-control-modern.is-invalid {
  border-color: #dc3545;
}

.form-control-modern.is-invalid:focus {
  border-color: #dc3545;
  box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.25);
}

.form-group-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
</style>

