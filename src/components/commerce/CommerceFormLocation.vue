<script>
export default {
  name: 'CommerceFormLocation',
  props: {
    modelValue: { type: Object, required: true },
    errors: { type: Object, default: () => ({}) },
    prefix: { type: String, default: '' },
    toggles: { type: Object, default: () => ({}) },
    isAdd: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
  computed: {
    localeInfo: {
      get() {
        return this.modelValue.localeInfo || {};
      },
      set(value) {
        this.$emit('update:modelValue', {
          ...this.modelValue,
          localeInfo: value,
        });
      },
    },
  },
};
</script>

<template>
  <div>
    <button
      class="section-toggle-button"
      type="button"
      data-bs-toggle="collapse"
      :aria-expanded="true"
      :aria-controls="`${prefix}location`"
      :data-bs-target="`#${prefix}location`"
    >
      <span class="section-toggle-text">{{ $t('businessCommercesAdmin.location') }}</span>
      <i class="bi bi-chevron-down section-toggle-icon"></i>
    </button>
    <div :id="`${prefix}location`" class="collapse">
      <div class="form-fields-container">
        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('businessCommercesAdmin.country') }}
          </label>
          <input
            :id="`${prefix}commerce-country-form`"
            min="1"
            max="12"
            type="text"
            class="form-control-modern"
            :disabled="isAdd ? false : !toggles['commerces.admin.edit']"
            v-model="localeInfo.country"
            placeholder="Ex. ve, br, cl"
          />
        </div>
        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('businessCommercesAdmin.language') }}
          </label>
          <input
            :id="`${prefix}commerce-language-form`"
            min="1"
            max="3"
            type="text"
            class="form-control-modern"
            :disabled="isAdd ? false : !toggles['commerces.admin.edit']"
            v-model="localeInfo.language"
            placeholder="Ex.: es / en / pt"
          />
        </div>
        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('businessCommercesAdmin.timezone') }}
          </label>
          <input
            :id="`${prefix}commerce-timezone-form`"
            min="1"
            max="30"
            type="text"
            class="form-control-modern"
            :disabled="isAdd ? false : !toggles['commerces.admin.edit']"
            v-model="localeInfo.timezone"
            placeholder="Ex.: America/Caracas"
          />
        </div>
        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('businessCommercesAdmin.address') }}
          </label>
          <input
            :id="`${prefix}commerce-address-form`"
            min="1"
            max="80"
            type="text"
            class="form-control-modern"
            :class="{ 'is-invalid': errors.addressError }"
            :disabled="isAdd ? false : !toggles['commerces.admin.edit']"
            v-model="localeInfo.address"
            placeholder="Street 1, Building 56, City, State"
          />
        </div>
        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('businessCommercesAdmin.addressLat') }}
          </label>
          <input
            :id="`${prefix}commerce-addressLat-form`"
            min="1"
            max="10"
            type="number"
            class="form-control-modern"
            :disabled="isAdd ? false : !toggles['commerces.admin.edit']"
            v-model="localeInfo.addressLat"
            placeholder="Ex.: 10.65656"
          />
        </div>
        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('businessCommercesAdmin.addressLng') }}
          </label>
          <input
            :id="`${prefix}commerce-addressLng-form`"
            min="1"
            max="10"
            type="number"
            class="form-control-modern"
            :disabled="isAdd ? false : !toggles['commerces.admin.edit']"
            v-model="localeInfo.addressLng"
            placeholder="Ex.: -10.65656"
          />
        </div>
      </div>
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

/* Modern Section Toggle Button - Compact with Black Background */
.section-toggle-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.35rem 0.625rem;
  margin-bottom: 0.375rem;
  background: rgba(0, 0, 0, 0.85);
  border: none;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  text-transform: capitalize;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.section-toggle-button:hover {
  background: rgba(0, 0, 0, 0.95);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.section-toggle-button:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.3);
}

.section-toggle-button[aria-expanded="true"] {
  background: rgba(0, 0, 0, 0.85);
}

.section-toggle-button[aria-expanded="true"]:hover {
  background: rgba(0, 0, 0, 0.95);
}

.section-toggle-text {
  flex: 1;
  text-align: left;
}

.section-toggle-icon {
  font-size: 0.75rem;
  transition: transform 0.2s ease;
  flex-shrink: 0;
  margin-left: 0.5rem;
}

.section-toggle-button[aria-expanded="true"] .section-toggle-icon {
  transform: rotate(180deg);
}
</style>

