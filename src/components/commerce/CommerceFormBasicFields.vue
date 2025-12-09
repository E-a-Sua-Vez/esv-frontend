<script>
import Toggle from '@vueform/toggle';

export default {
  name: 'CommerceFormBasicFields',
  components: { Toggle },
  props: {
    modelValue: { type: Object, required: true },
    categories: { type: Array, default: () => [] },
    toggles: { type: Object, default: () => ({}) },
    errors: { type: Object, default: () => ({}) },
    prefix: { type: String, default: '' },
    isAdd: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
  computed: {
    commerce: {
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
      <label class="form-label-modern">
        {{ $t('businessCommercesAdmin.name') }}
      </label>
      <input
        :id="`${prefix}commerce-name-form`"
        :disabled="isAdd ? false : !toggles['commerces.admin.edit']"
        min="1"
        max="50"
        type="text"
        class="form-control-modern"
        :class="{ 'is-invalid': errors.nameError }"
        v-model="commerce.name"
        placeholder="brilliant-shop-1"
      />
    </div>
    <div class="form-group-modern">
      <label class="form-label-modern">
        {{ $t('businessCommercesAdmin.keyName') }}
      </label>
      <input
        :id="`${prefix}commerce-keyName-form`"
        :disabled="isAdd ? false : !toggles['commerces.admin.edit']"
        min="1"
        max="50"
        type="text"
        class="form-control-modern"
        :class="{ 'is-invalid': errors.keyNameError }"
        v-model="commerce.keyName"
        placeholder="brilliant-shop-1"
      />
    </div>
    <div class="form-group-modern">
      <label class="form-label-modern">
        {{ $t('businessCommercesAdmin.email') }}
      </label>
      <input
        :id="`${prefix}commerce-email-form`"
        :disabled="isAdd ? false : !toggles['commerces.admin.edit']"
        min="10"
        type="email"
        class="form-control-modern"
        :class="{ 'is-invalid': errors.emailError }"
        v-model="commerce.email"
        placeholder="commerce@email.com"
      />
    </div>
    <div class="form-group-modern">
      <label class="form-label-modern">
        {{ $t('businessCommercesAdmin.tag') }}
      </label>
      <input
        :id="`${prefix}commerce-tag-form`"
        :disabled="!toggles['commerces.admin.edit']"
        min="1"
        max="50"
        type="text"
        class="form-control-modern"
        :class="{ 'is-invalid': errors.tagError }"
        v-model="commerce.tag"
        placeholder="brilliant-1"
      />
    </div>
    <div class="form-group-modern">
      <label class="form-label-modern">
        {{ $t('businessCommercesAdmin.logo') }}
      </label>
      <input
        :id="`${prefix}commerce-logo-form`"
        :disabled="isAdd ? false : !toggles['commerces.admin.edit']"
        min="10"
        type="text"
        class="form-control-modern"
        v-model="commerce.logo"
        placeholder="url/logo.png"
      />
    </div>
    <div class="form-group-modern">
      <label class="form-label-modern">
        {{ $t('businessCommercesAdmin.category') }}
      </label>
      <select
        :id="`${prefix}commerce-category-form`"
        :disabled="isAdd ? false : !toggles['commerces.admin.edit']"
        class="form-control-modern form-select-modern"
        :class="{ 'is-invalid': errors.categoryError }"
        v-model="commerce.category"
      >
        <option v-for="cat in categories" :key="cat" :value="cat">
          {{ $t(`categories.${cat}`) }}
        </option>
      </select>
    </div>
    <div class="form-group-modern form-group-toggle">
      <label class="form-label-modern">
        {{ $t('businessCommercesAdmin.active') }}
      </label>
      <Toggle
        v-model="commerce.active"
        :disabled="isAdd ? false : !toggles['commerces.admin.edit']"
      />
    </div>
  </div>
</template>

<style scoped>
/* Modern Form Styles - Compact */
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
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 16px 12px;
  padding-right: 2.5rem;
}
</style>
