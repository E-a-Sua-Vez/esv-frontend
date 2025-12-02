<script>
import Popper from 'vue3-popper';

export default {
  name: 'ProductFormLevels',
  components: { Popper },
  props: {
    modelValue: { type: Object, required: true },
    toggles: { type: Object, default: () => ({}) },
    errors: { type: Object, default: () => ({}) },
    prefix: { type: String, default: '' },
    isAdd: { type: Boolean, default: false },
    maxOrder: { type: Number, default: 1 },
  },
  emits: ['update:modelValue'],
  computed: {
    product: {
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
        {{ $t('businessProductsAdmin.actualLevel') }}
        <Popper :class="'dark p-1'" arrow disable-click-away>
          <template #content>
            <div>{{ $t('businessProductsAdmin.actualLevelHelp') }}</div>
          </template>
          <i class="bi bi-info-circle-fill form-help-icon"></i>
        </Popper>
      </label>
      <input
        :id="`${prefix}product-actuallevel-form`"
        :disabled="isAdd ? false : !toggles['products.admin.edit']"
        :min="0"
        type="number"
        class="form-control-modern"
        :class="{ 'is-invalid': errors.actualLevelError }"
        v-model.number="product.actualLevel"
        placeholder="1"
      />
    </div>
    <div class="form-group-modern">
      <label class="form-label-modern">
        {{ $t('businessProductsAdmin.optimumLevel') }}
        <Popper :class="'dark p-1'" arrow disable-click-away>
          <template #content>
            <div>{{ $t('businessProductsAdmin.optimumLevelHelp') }}</div>
          </template>
          <i class="bi bi-info-circle-fill form-help-icon"></i>
        </Popper>
      </label>
      <input
        :id="`${prefix}product-optimumLevel-form`"
        :disabled="isAdd ? false : !toggles['products.admin.edit']"
        :min="0"
        type="number"
        class="form-control-modern"
        :class="{ 'is-invalid': errors.optimumLevelError }"
        v-model.number="product.optimumLevel"
        placeholder="1"
      />
    </div>
    <div class="form-group-modern">
      <label class="form-label-modern">
        {{ $t('businessProductsAdmin.replacementLevel') }}
        <Popper :class="'dark p-1'" arrow disable-click-away>
          <template #content>
            <div>{{ $t('businessProductsAdmin.replacementLevelHelp') }}</div>
          </template>
          <i class="bi bi-info-circle-fill form-help-icon"></i>
        </Popper>
      </label>
      <input
        :id="`${prefix}product-replacementLevel-form`"
        :disabled="isAdd ? false : !toggles['products.admin.edit']"
        :min="0"
        type="number"
        class="form-control-modern"
        :class="{ 'is-invalid': errors.replacementLevelError }"
        v-model.number="product.replacementLevel"
        placeholder="1"
      />
    </div>
    <div class="form-group-modern">
      <label class="form-label-modern">
        {{ $t('businessProductsAdmin.maximumLevel') }}
        <Popper :class="'dark p-1'" arrow disable-click-away>
          <template #content>
            <div>{{ $t('businessProductsAdmin.maximumLevelHelp') }}</div>
          </template>
          <i class="bi bi-info-circle-fill form-help-icon"></i>
        </Popper>
      </label>
      <input
        :id="`${prefix}product-maximumLevel-form`"
        :disabled="isAdd ? false : !toggles['products.admin.edit']"
        :min="0"
        type="number"
        class="form-control-modern"
        :class="{ 'is-invalid': errors.maximumLevelError }"
        v-model.number="product.maximumLevel"
        placeholder="1"
      />
    </div>
    <div class="form-group-modern">
      <label class="form-label-modern">
        {{ $t('businessProductsAdmin.order') }}
        <Popper :class="'dark p-1'" arrow disable-click-away>
          <template #content>
            <div>{{ $t('businessProductsAdmin.orderHelp') }}</div>
          </template>
          <i class="bi bi-info-circle-fill form-help-icon"></i>
        </Popper>
      </label>
      <input
        :id="`${prefix}product-order-form`"
        :disabled="isAdd ? false : !toggles['products.admin.edit']"
        min="1"
        :max="maxOrder"
        type="number"
        class="form-control-modern"
        :class="{ 'is-invalid': errors.orderError }"
        v-model.number="product.order"
        placeholder="1"
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

.form-control-modern {
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

.form-control-modern:disabled {
  background-color: rgba(245, 246, 247, 0.8);
  color: rgba(0, 0, 0, 0.5);
  cursor: not-allowed;
  opacity: 0.7;
}

.form-control-modern::placeholder {
  color: rgba(0, 0, 0, 0.4);
  font-weight: 400;
}

.form-control-modern.is-invalid {
  border-color: rgba(165, 42, 42, 0.5);
  box-shadow: 0 0 0 2px rgba(165, 42, 42, 0.1);
}
</style>

