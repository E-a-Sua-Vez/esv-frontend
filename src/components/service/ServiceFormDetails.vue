<script>
import Popper from 'vue3-popper';

export default {
  name: 'ServiceFormDetails',
  components: { Popper },
  props: {
    modelValue: { type: Object, required: true },
    errors: { type: Object, default: () => ({}) },
    prefix: { type: String, default: '' },
    toggles: { type: Object, default: () => ({}) },
    isAdd: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
  computed: {
    serviceInfo: {
      get() {
        return this.modelValue.serviceInfo || {};
      },
      set(value) {
        this.$emit('update:modelValue', {
          ...this.modelValue,
          serviceInfo: value,
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
      :aria-expanded="false"
      :aria-controls="`${prefix}service-details`"
      :data-bs-target="`#${prefix}service-details`"
    >
      <span class="section-toggle-text">{{ $t('businessServicesAdmin.service') }}</span>
      <i class="bi bi-chevron-down section-toggle-icon"></i>
    </button>
    <div :id="`${prefix}service-details`" class="collapse">
      <div class="form-fields-container">
        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('businessServicesAdmin.shortDescription') }}
            <Popper :class="'dark p-1'" arrow>
              <template #content>
                <div>{{ $t('businessServicesAdmin.shortDescriptionHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            :id="`${prefix}service-short-description-form`"
            :disabled="isAdd ? false : !toggles['services.admin.edit']"
            min="1"
            max="50"
            type="text"
            class="form-control-modern"
            :class="{ 'is-invalid': errors.shortDescriptionError }"
            v-model="serviceInfo.shortDescription"
            placeholder="Service A is great"
          />
        </div>
        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('businessServicesAdmin.longDescription') }}
            <Popper :class="'dark p-1'" arrow>
              <template #content>
                <div>{{ $t('businessServicesAdmin.longDescriptionHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <textarea
            :id="`${prefix}service-description-form`"
            :disabled="isAdd ? false : !toggles['services.admin.edit']"
            min="1"
            max="500"
            class="form-control-modern"
            v-model="serviceInfo.longDescription"
            placeholder="Benefit A-Benefit B..."
            rows="3"
          ></textarea>
        </div>
        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('businessServicesAdmin.estimatedTime') }}
            <Popper :class="'dark p-1'" arrow>
              <template #content>
                <div>{{ $t('businessServicesAdmin.estimatedTimeHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            :id="`${prefix}service-time-form`"
            :disabled="isAdd ? false : !toggles['services.admin.edit']"
            min="1"
            type="number"
            class="form-control-modern"
            :class="{ 'is-invalid': errors.estimatedTimeError }"
            v-model="serviceInfo.estimatedTime"
            placeholder="1"
          />
        </div>
        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('businessServicesAdmin.blockTime') }}
            <Popper :class="'dark p-1'" arrow>
              <template #content>
                <div>{{ $t('businessServicesAdmin.blockTimeHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            :id="`${prefix}service-block-form`"
            :disabled="isAdd ? false : !toggles['services.admin.edit']"
            min="1"
            type="number"
            class="form-control-modern"
            :class="{ 'is-invalid': errors.blockTimeError }"
            v-model="serviceInfo.blockTime"
            placeholder="1"
          />
        </div>
        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('businessServicesAdmin.procedures') }}
            <Popper :class="'dark p-1'" arrow>
              <template #content>
                <div>{{ $t('businessServicesAdmin.proceduresHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            :id="`${prefix}service-procedures-form`"
            :disabled="isAdd ? false : !toggles['services.admin.edit']"
            min="1"
            type="number"
            class="form-control-modern"
            v-model="serviceInfo.procedures"
            placeholder="1"
          />
        </div>
        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('businessServicesAdmin.proceduresList') || 'Lista de Procedimientos' }}
            <Popper :class="'dark p-1'" arrow>
              <template #content>
                <div>
                  {{
                    $t('businessServicesAdmin.proceduresListHelp') ||
                    'Lista separada por comas de cantidades disponibles (ej: 3,10,20)'
                  }}
                </div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            :id="`${prefix}service-procedures-list-form`"
            :disabled="isAdd ? false : !toggles['services.admin.edit']"
            type="text"
            class="form-control-modern"
            v-model="serviceInfo.proceduresList"
            placeholder="3,10,20"
          />
        </div>
        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('businessServicesAdmin.daysBetweenProcedures') || 'Días entre Procedimientos' }}
            <Popper :class="'dark p-1'" arrow>
              <template #content>
                <div>
                  {{
                    $t('businessServicesAdmin.daysBetweenProceduresHelp') ||
                    'Días mínimos entre sesiones del mismo servicio'
                  }}
                </div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            :id="`${prefix}service-days-between-procedures-form`"
            :disabled="isAdd ? false : !toggles['services.admin.edit']"
            min="0"
            type="number"
            class="form-control-modern"
            v-model="serviceInfo.daysBetweenProcedures"
            placeholder="0"
          />
        </div>
        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('businessServicesAdmin.price') }}
            <Popper :class="'dark p-1'" arrow>
              <template #content>
                <div>{{ $t('businessServicesAdmin.priceHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            :id="`${prefix}service-price-form`"
            :disabled="isAdd ? false : !toggles['services.admin.edit']"
            min="0"
            type="number"
            class="form-control-modern"
            v-model="serviceInfo.price"
            placeholder="1000"
          />
        </div>
        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('businessServicesAdmin.onlinePrice') }}
            <Popper :class="'dark p-1'" arrow>
              <template #content>
                <div>{{ $t('businessServicesAdmin.onlinePriceHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            :id="`${prefix}service-onlinePrice-form`"
            :disabled="isAdd ? false : !toggles['services.admin.edit']"
            min="0"
            type="number"
            class="form-control-modern"
            v-model="serviceInfo.onlinePrice"
            placeholder="1000"
          />
        </div>
        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('businessServicesAdmin.saving') }}
            <Popper :class="'dark p-1'" arrow>
              <template #content>
                <div>{{ $t('businessServicesAdmin.savingHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            :id="`${prefix}service-saving-form`"
            :disabled="isAdd ? false : !toggles['services.admin.edit']"
            min="0"
            type="number"
            class="form-control-modern"
            v-model="serviceInfo.saving"
            placeholder="25"
          />
        </div>
        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('businessServicesAdmin.onlineSaving') }}
            <Popper :class="'dark p-1'" arrow>
              <template #content>
                <div>{{ $t('businessServicesAdmin.onlineSavingHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            :id="`${prefix}service-onlineSaving-form`"
            :disabled="isAdd ? false : !toggles['services.admin.edit']"
            min="0"
            type="number"
            class="form-control-modern"
            v-model="serviceInfo.onlineSaving"
            placeholder="30"
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

textarea.form-control-modern {
  resize: vertical;
  min-height: 60px;
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

.section-toggle-button[aria-expanded='true'] {
  background: rgba(0, 0, 0, 0.85);
}

.section-toggle-button[aria-expanded='true']:hover {
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

.section-toggle-button[aria-expanded='true'] .section-toggle-icon {
  transform: rotate(180deg);
}
</style>
