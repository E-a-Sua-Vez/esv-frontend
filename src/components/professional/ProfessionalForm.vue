<script setup>
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import Toggle from '@vueform/toggle';
import Popper from 'vue3-popper';

const { t } = useI18n();

const props = defineProps({
  modelValue: {
    type: Object,
    required: true,
  },
  commerceId: {
    type: String,
    required: true,
  },
  businessId: {
    type: String,
    required: true,
  },
  services: {
    type: Array,
    default: () => [],
  },
  errors: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(['update:modelValue', 'submit', 'cancel']);

const professional = computed({
  get: () => props.modelValue,
  set: value => emit('update:modelValue', value),
});

const professionalTypes = [
  { id: 'STYLIST', name: 'Estilista' },
  { id: 'BARBER', name: 'Barbero' },
  { id: 'DOCTOR', name: 'Médico' },
  { id: 'DENTIST', name: 'Dentista' },
  { id: 'NURSE', name: 'Enfermero/a' },
  { id: 'THERAPIST', name: 'Terapeuta' },
  { id: 'NUTRITIONIST', name: 'Nutricionista' },
  { id: 'VETERINARIAN', name: 'Veterinario/a' },
  { id: 'PSYCHOLOGIST', name: 'Psicólogo/a' },
  { id: 'OTHER', name: 'Otro' },
];

const commissionTypes = [
  { id: 'PERCENTAGE', name: 'Porcentaje' },
  { id: 'FIXED', name: 'Fijo' },
];

const toggleService = serviceId => {
  const servicesId = professional.value.professionalInfo?.servicesId || [];
  const index = servicesId.indexOf(serviceId);

  if (index > -1) {
    servicesId.splice(index, 1);
  } else {
    servicesId.push(serviceId);
  }

  if (!professional.value.professionalInfo) {
    professional.value.professionalInfo = {};
  }
  professional.value.professionalInfo.servicesId = [...servicesId];
};

const isServiceSelected = serviceId => {
  const servicesId = professional.value.professionalInfo?.servicesId || [];
  return servicesId.includes(serviceId);
};
</script>

<template>
  <div class="professional-form">
    <!-- Personal Info Section -->
    <div class="form-section">
      <h5 class="section-title">
        <i class="bi bi-person"></i>
        {{ t('professionals.personalInfo') }}
      </h5>

      <div class="form-group-modern">
        <label class="form-label-modern required">
          {{ t('professionals.name') }}
          <Popper class="dark p-1" arrow>
            <template #content>
              <div>{{ t('professionals.nameHelp') }}</div>
            </template>
            <i class="bi bi-info-circle-fill h7"></i>
          </Popper>
        </label>
        <input
          v-model="professional.personalInfo.name"
          type="text"
          class="form-control-modern"
          :class="{ 'is-invalid': errors.name }"
          :placeholder="t('professionals.namePlaceholder')"
        />
        <div v-if="errors.name" class="invalid-feedback">{{ errors.name }}</div>
      </div>

      <div class="row">
        <div class="col-md-6">
          <div class="form-group-modern">
            <label class="form-label-modern">
              {{ t('professionals.idNumber') }}
            </label>
            <input
              v-model="professional.personalInfo.idNumber"
              type="text"
              class="form-control-modern"
              :placeholder="t('professionals.idNumberPlaceholder')"
            />
          </div>
        </div>
        <div class="col-md-6">
          <div class="form-group-modern">
            <label class="form-label-modern">
              {{ t('professionals.email') }}
            </label>
            <input
              v-model="professional.personalInfo.email"
              type="email"
              class="form-control-modern"
              :class="{ 'is-invalid': errors.email }"
              :placeholder="t('professionals.emailPlaceholder')"
            />
            <div v-if="errors.email" class="invalid-feedback">{{ errors.email }}</div>
          </div>
        </div>
      </div>

      <div class="form-group-modern">
        <label class="form-label-modern">
          {{ t('professionals.phone') }}
        </label>
        <input
          v-model="professional.personalInfo.phone"
          type="tel"
          class="form-control-modern"
          :placeholder="t('professionals.phonePlaceholder')"
        />
      </div>
    </div>

    <!-- Professional Info Section -->
    <div class="form-section">
      <h5 class="section-title">
        <i class="bi bi-briefcase"></i>
        {{ t('professionals.professionalInfo') }}
      </h5>

      <div class="row">
        <div class="col-md-6">
          <div class="form-group-modern">
            <label class="form-label-modern required">
              {{ t('professionals.type') }}
            </label>
            <select
              v-model="professional.professionalInfo.professionalType"
              class="form-control-modern form-select-modern"
              :class="{ 'is-invalid': errors.professionalType }"
            >
              <option :value="null">{{ t('professionals.selectType') }}</option>
              <option v-for="type in professionalTypes" :key="type.id" :value="type.id">
                {{ type.name }}
              </option>
            </select>
            <div v-if="errors.professionalType" class="invalid-feedback">
              {{ errors.professionalType }}
            </div>
          </div>
        </div>
        <div class="col-md-6">
          <div class="form-group-modern">
            <label class="form-label-modern">
              {{ t('professionals.license') }}
            </label>
            <input
              v-model="professional.professionalInfo.license"
              type="text"
              class="form-control-modern"
              :placeholder="t('professionals.licensePlaceholder')"
            />
          </div>
        </div>
      </div>

      <div class="form-group-modern">
        <label class="form-label-modern">
          {{ t('professionals.services') }}
          <Popper class="dark p-1" arrow>
            <template #content>
              <div>{{ t('professionals.servicesHelp') }}</div>
            </template>
            <i class="bi bi-info-circle-fill h7"></i>
          </Popper>
        </label>
        <div class="services-list">
          <div v-for="service in services" :key="service.id" class="service-item">
            <input
              :id="`service-${service.id}`"
              type="checkbox"
              :checked="isServiceSelected(service.id)"
              @change="toggleService(service.id)"
            />
            <label :for="`service-${service.id}`">{{ service.name }}</label>
          </div>
        </div>
      </div>
    </div>

    <!-- Financial Info Section -->
    <div class="form-section">
      <h5 class="section-title">
        <i class="bi bi-currency-dollar"></i>
        {{ t('professionals.financialInfo') }}
      </h5>

      <div class="row">
        <div class="col-md-4">
          <div class="form-group-modern">
            <label class="form-label-modern">
              {{ t('professionals.commissionType') }}
            </label>
            <select
              v-model="professional.financialInfo.commissionType"
              class="form-control-modern form-select-modern"
            >
              <option :value="null">{{ t('professionals.selectCommissionType') }}</option>
              <option v-for="type in commissionTypes" :key="type.id" :value="type.id">
                {{ type.name }}
              </option>
            </select>
          </div>
        </div>
        <div class="col-md-4">
          <div class="form-group-modern">
            <label class="form-label-modern">
              {{ t('professionals.commissionValue') }}
            </label>
            <input
              v-model.number="professional.financialInfo.commissionValue"
              type="number"
              step="0.01"
              min="0"
              class="form-control-modern"
              :placeholder="
                professional.financialInfo?.commissionType === 'PERCENTAGE' ? '0-100' : '0.00'
              "
            />
          </div>
        </div>
        <div class="col-md-4">
          <div class="form-group-modern">
            <label class="form-label-modern">
              {{ t('professionals.paymentAccount') }}
            </label>
            <input
              v-model="professional.financialInfo.paymentAccount"
              type="text"
              class="form-control-modern"
              :placeholder="t('professionals.paymentAccountPlaceholder')"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Status Section -->
    <div class="form-section">
      <h5 class="section-title">
        <i class="bi bi-toggle-on"></i>
        {{ t('professionals.status') }}
      </h5>

      <div class="row">
        <div class="col-md-6">
          <div class="form-group-modern form-group-toggle">
            <label class="form-label-modern">
              {{ t('professionals.active') }}
            </label>
            <Toggle v-model="professional.active" />
          </div>
        </div>
        <div class="col-md-6">
          <div class="form-group-modern form-group-toggle">
            <label class="form-label-modern">
              {{ t('professionals.available') }}
            </label>
            <Toggle v-model="professional.available" />
          </div>
        </div>
      </div>
    </div>

    <!-- Actions -->
    <div class="form-actions">
      <button type="button" class="btn btn-secondary" @click="emit('cancel')">
        <i class="bi bi-x-circle"></i>
        {{ t('common.cancel') }}
      </button>
      <button type="button" class="btn btn-primary" @click="emit('submit')">
        <i class="bi bi-check-circle"></i>
        {{ t('common.save') }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.professional-form {
  max-width: 1000px;
}

.form-section {
  margin-bottom: 2rem;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  color: #333;
  font-weight: 600;
}

.form-group-modern {
  margin-bottom: 1rem;
}

.form-label-modern {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: #555;
}

.form-label-modern.required::after {
  content: ' *';
  color: #dc3545;
}

.form-control-modern {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 1rem;
}

.form-control-modern:focus {
  outline: none;
  border-color: #80bdff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

.form-control-modern.is-invalid {
  border-color: #dc3545;
}

.invalid-feedback {
  display: block;
  margin-top: 0.25rem;
  font-size: 0.875rem;
  color: #dc3545;
}

.form-select-modern {
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 16px 12px;
  padding-right: 2.5rem;
}

.form-group-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.services-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.5rem;
  padding: 1rem;
  background: white;
  border: 1px solid #ced4da;
  border-radius: 4px;
  max-height: 300px;
  overflow-y: auto;
}

.service-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
}

.service-item input[type='checkbox'] {
  cursor: pointer;
}

.service-item label {
  cursor: pointer;
  margin: 0;
  user-select: none;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1.5rem;
  border-top: 1px solid #dee2e6;
}

.btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1.5rem;
  border: none;
  border-radius: 4px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background-color: #007bff;
  color: white;
}

.btn-primary:hover {
  background-color: #0056b3;
}

.btn-secondary {
  background-color: #6c757d;
  color: white;
}

.btn-secondary:hover {
  background-color: #545b62;
}
</style>
