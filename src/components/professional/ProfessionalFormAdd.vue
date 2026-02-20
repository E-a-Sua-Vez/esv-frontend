<script>
import Toggle from '@vueform/toggle';
import Popper from 'vue3-popper';

export default {
  name: 'ProfessionalFormAdd',
  components: { Toggle, Popper },
  props: {
    professional: { type: Object, required: true },
    commerceId: { type: String, required: true },
    types: { type: Array, default: () => [] },
    modules: { type: Array, default: () => [] },
    services: { type: Array, default: () => [] },
    toggles: { type: Object, default: () => ({}) },
    errors: { type: Object, default: () => ({}) },
    onSelectService: { type: Function, default: null },
    onDeleteService: { type: Function, default: null },
    showService: { type: Function, default: null },
  },
  emits: ['update:professional'],
  computed: {
    localProfessional: {
      get() {
        return this.professional;
      },
      set(value) {
        this.$emit('update:professional', value);
      },
    },
  },
  methods: {
    updatePersonalInfo(field, value) {
      const updated = { ...this.professional };
      if (!updated.personalInfo) updated.personalInfo = {};
      updated.personalInfo[field] = value;
      this.$emit('update:professional', updated);
    },
    updateProfessionalInfo(field, value) {
      const updated = { ...this.professional };
      if (!updated.professionalInfo) updated.professionalInfo = {};
      updated.professionalInfo[field] = value;
      this.$emit('update:professional', updated);
    },
    updateFinancialInfo(field, value) {
      const updated = { ...this.professional };
      if (!updated.financialInfo) updated.financialInfo = {};
      updated.financialInfo[field] = value;
      this.$emit('update:professional', updated);
    },
  },
};
</script>

<template>
  <div class="professional-form-add">
    <div class="form-fields-container">
      <!-- Información Personal -->
      <div class="form-group-modern">
        <label class="form-label-modern">
          {{ $t('professionals.name') }}:
          <Popper :class="'dark p-1'" arrow :disable-click-away="false">
            <template #content>
              <div>{{ $t('professionals.nameHelp') }}</div>
            </template>
            <i class="bi bi-info-circle-fill h7"></i>
          </Popper>
        </label>
        <input
          type="text"
          class="form-control-modern"
          :class="{ 'is-invalid': errors.nameError }"
          :value="professional.personalInfo?.name"
          @input="updatePersonalInfo('name', $event.target.value)"
          :placeholder="$t('professionals.namePlaceholder')"
        />
      </div>

      <div class="form-group-modern">
        <label class="form-label-modern">
          {{ $t('professionals.email') }}:
          <Popper :class="'dark p-1'" arrow :disable-click-away="false">
            <template #content>
              <div>{{ $t('professionals.emailHelp') }}</div>
            </template>
            <i class="bi bi-info-circle-fill h7"></i>
          </Popper>
        </label>
        <input
          type="email"
          class="form-control-modern"
          :class="{ 'is-invalid': errors.emailError }"
          :value="professional.personalInfo?.email"
          @input="updatePersonalInfo('email', $event.target.value)"
          :placeholder="$t('professionals.emailPlaceholder')"
        />
      </div>

      <div class="form-group-modern">
        <label class="form-label-modern">
          {{ $t('professionals.idNumber') }}:
          <Popper :class="'dark p-1'" arrow :disable-click-away="false">
            <template #content>
              <div>{{ $t('professionals.idNumberHelp') }}</div>
            </template>
            <i class="bi bi-info-circle-fill h7"></i>
          </Popper>
        </label>
        <input
          type="text"
          class="form-control-modern"
          :class="{ 'is-invalid': errors.idNumberError }"
          :value="professional.personalInfo?.idNumber"
          @input="updatePersonalInfo('idNumber', $event.target.value)"
          :placeholder="$t('professionals.idNumberPlaceholder')"
        />
      </div>

      <div class="form-group-modern">
        <label class="form-label-modern">
          {{ $t('professionals.type') }}:
          <Popper :class="'dark p-1'" arrow :disable-click-away="false">
            <template #content>
              <div>{{ $t('professionals.typeHelp') }}</div>
            </template>
            <i class="bi bi-info-circle-fill h7"></i>
          </Popper>
        </label>
        <select
          class="form-control-modern form-select-modern"
          :class="{ 'is-invalid': errors.typeError }"
          :value="professional.professionalInfo?.professionalType"
          @change="updateProfessionalInfo('professionalType', $event.target.value)"
        >
          <option value="">{{ $t('professionals.selectType') }}</option>
          <option v-for="type in types" :key="type.id" :value="type.id">
            {{ type.name }}
          </option>
        </select>
      </div>

      <div class="form-group-modern">
        <label class="form-label-modern">
          {{ $t('professionals.phone') }}:
          <Popper :class="'dark p-1'" arrow :disable-click-away="false">
            <template #content>
              <div>{{ $t('professionals.phoneHelp') }}</div>
            </template>
            <i class="bi bi-info-circle-fill h7"></i>
          </Popper>
        </label>
        <input
          type="tel"
          class="form-control-modern"
          :class="{ 'is-invalid': errors.phoneError }"
          :value="professional.personalInfo?.phone"
          @input="updatePersonalInfo('phone', $event.target.value)"
          :placeholder="$t('professionals.phonePlaceholder')"
        />
      </div>

      <div class="form-group-modern">
        <label class="form-label-modern">
          {{ $t('professionals.license') }} ({{ $t('optional') }}):
          <Popper :class="'dark p-1'" arrow :disable-click-away="false">
            <template #content>
              <div>{{ $t('professionals.licenseHelp') }}</div>
            </template>
            <i class="bi bi-info-circle-fill h7"></i>
          </Popper>
        </label>
        <input
          type="text"
          class="form-control-modern"
          :value="professional.professionalInfo?.license"
          @input="updateProfessionalInfo('license', $event.target.value)"
          :placeholder="$t('professionals.licensePlaceholder')"
        />
      </div>
    </div>

    <div class="form-fields-container">
      <!-- Servicios -->
      <div class="form-group-modern">
        <label class="form-label-modern">
          {{ $t('professionals.services') }}:
          <Popper :class="'dark p-1'" arrow :disable-click-away="false">
            <template #content>
              <div>{{ $t('professionals.servicesHelp') }}</div>
            </template>
            <i class="bi bi-info-circle-fill h7"></i>
          </Popper>
        </label>
        <div style="flex: 1; display: flex; flex-direction: column; gap: 0.5rem">
          <select
            v-if="services && services.length > 0"
            class="form-control-modern form-select-modern"
            @change="
              onSelectService &&
                onSelectService(
                  professional,
                  services.find(s => s.id === $event.target.value)
                );
              $event.target.value = '';
            "
          >
            <option value="">{{ $t('professionals.selectService') }}</option>
            <option v-for="service in services" :key="service.id" :value="service.id">
              {{ service.tag }}
            </option>
          </select>
          <div
            v-if="
              professional.professionalInfo?.servicesId &&
              professional.professionalInfo.servicesId.length > 0
            "
            class="selected-items-modern"
          >
            <span
              v-for="serviceId in professional.professionalInfo.servicesId"
              :key="serviceId"
              class="badge-modern"
            >
              {{ showService ? showService(serviceId) : serviceId }}
              <i
                class="bi bi-x-circle-fill"
                style="cursor: pointer; margin-left: 0.25rem"
                @click="onDeleteService && onDeleteService(professional, serviceId)"
              ></i>
            </span>
          </div>
        </div>
      </div>

      <!-- Información Financiera -->
      <div class="form-group-modern">
        <label class="form-label-modern">
          {{ $t('professionals.commissionType') }} ({{ $t('optional') }}):
          <Popper :class="'dark p-1'" arrow :disable-click-away="false">
            <template #content>
              <div>{{ $t('professionals.commissionTypeHelp') }}</div>
            </template>
            <i class="bi bi-info-circle-fill h7"></i>
          </Popper>
        </label>
        <select
          class="form-control-modern form-select-modern"
          :value="professional.financialInfo?.commissionType"
          @change="updateFinancialInfo('commissionType', $event.target.value)"
        >
          <option value="">{{ $t('professionals.selectCommissionType') }}</option>
          <option value="PERCENTAGE">{{ $t('professionals.percentage') }}</option>
          <option value="FIXED">{{ $t('professionals.fixed') }}</option>
        </select>
      </div>

      <div class="form-group-modern">
        <label class="form-label-modern">
          {{ $t('professionals.commissionValue') }} ({{ $t('optional') }}):
          <Popper :class="'dark p-1'" arrow :disable-click-away="false">
            <template #content>
              <div>{{ $t('professionals.commissionValueHelp') }}</div>
            </template>
            <i class="bi bi-info-circle-fill h7"></i>
          </Popper>
        </label>
        <input
          type="number"
          step="0.01"
          class="form-control-modern"
          :value="professional.financialInfo?.commissionValue"
          @input="updateFinancialInfo('commissionValue', parseFloat($event.target.value))"
          :placeholder="$t('professionals.commissionValuePlaceholder')"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.professional-form-add {
  width: 100%;
}

.form-fields-container {
  display: flex;
  flex-direction: column;
  margin-bottom: 1rem;
}

.form-group-modern {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
}

.form-label-modern {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.375rem;
  min-width: 10rem;
  font-weight: 600;
  font-size: 0.75rem;
  color: #1f2937;
  padding-top: 0.375rem;
}

.form-label-modern i {
  font-size: 0.875rem;
  color: #6b7280;
  cursor: help;
}

.form-control-modern,
.form-select-modern {
  flex: 1;
  padding: 0.4rem 0.625rem;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: #212529;
  background-color: #fff;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 5px;
  transition: all 0.2s ease;
}

.form-control-modern:focus,
.form-select-modern:focus {
  outline: none;
  border-color: rgba(0, 74, 173, 0.5);
  box-shadow: 0 0 0 2px rgba(0, 74, 173, 0.1);
}

.form-control-modern:disabled,
.form-select-modern:disabled {
  background-color: #e9ecef;
  opacity: 0.6;
  cursor: not-allowed;
}

.form-control-modern.is-invalid,
.form-select-modern.is-invalid {
  border-color: #dc3545;
}

.form-select-modern {
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.625rem center;
  background-size: 1rem;
  padding-right: 2.5rem;
  appearance: none;
}

.form-group-toggle {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.selected-items-modern {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.5rem;
}

.badge-modern {
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.625rem;
  background: linear-gradient(135deg, #004aad 0%, #004aad 100%);
  color: white;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.badge-modern:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 74, 173, 0.3);
}

.badge-modern i {
  margin-left: 0.25rem;
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 0.2s ease;
}

.badge-modern i:hover {
  opacity: 1;
}

:deep(.toggle) {
  --toggle-bg-on: #28a745;
  --toggle-bg-off: #6c757d;
  --toggle-width: 2.25rem;
  --toggle-height: 1rem;
}

:deep(.toggle:disabled) {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .form-group-modern {
    flex-direction: column;
    align-items: flex-start;
  }

  .form-label-modern {
    min-width: auto;
    width: 100%;
  }

  .form-control-modern,
  .form-select-modern {
    width: 100%;
  }
}
</style>
