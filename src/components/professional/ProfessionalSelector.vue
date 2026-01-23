<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = defineProps({
  modelValue: {
    type: String,
    default: null,
  },
  professionals: {
    type: Array,
    default: () => [],
  },
  placeholder: {
    type: String,
    default: '',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  filterByService: {
    type: [String, Array],
    default: null,
  },
  showCommission: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue', 'change', 'professional-selected']);

const selectedId = ref(props.modelValue);

const filteredProfessionals = computed(() => {
  let professionals = props.professionals.filter(p => p.active && p.available);

  if (props.filterByService) {
    const servicesToFilter = Array.isArray(props.filterByService)
      ? props.filterByService
      : [props.filterByService];

    professionals = professionals.filter(p => {
      const servicesId = p.professionalInfo?.servicesId || [];
      // Professional must have at least one of the required services
      return servicesToFilter.some(serviceId => servicesId.includes(serviceId));
    });
  }

  return professionals;
});

const selectedProfessional = computed(() =>
  filteredProfessionals.value.find(p => p.id === selectedId.value)
);

const commissionInfo = computed(() => {
  if (!props.showCommission || !selectedProfessional.value) return null;

  const { commissionType, commissionValue } = selectedProfessional.value.financialInfo || {};
  if (!commissionType || !commissionValue) return null;

  return {
    type: commissionType,
    value: commissionValue,
    label: commissionType === 'PERCENTAGE' ? `${commissionValue}%` : `$${commissionValue}`,
  };
});

const getProfessionalLabel = professional => {
  const name = professional.personalInfo?.name || '-';
  const type = professional.professionalInfo?.professionalType || '';
  return `${name} ${type ? `(${t(`professionals.types.${type}`)})` : ''}`;
};

watch(
  () => props.modelValue,
  newVal => {
    selectedId.value = newVal;
  }
);

watch(selectedId, newVal => {
  emit('update:modelValue', newVal);
  emit('change', newVal);

  const professional = filteredProfessionals.value.find(p => p.id === newVal);
  if (professional) {
    emit('professional-selected', professional);
  }
});
</script>

<template>
  <div class="professional-selector">
    <select v-model="selectedId" class="payment-form-select" :disabled="disabled">
      <option :value="null">
        {{ placeholder || t('professionals.selectProfessional') }}
      </option>
      <option
        v-for="professional in filteredProfessionals"
        :key="professional.id"
        :value="professional.id"
      >
        {{ getProfessionalLabel(professional) }}
      </option>
    </select>

    <div v-if="commissionInfo" class="commission-info mt-2">
      <i class="bi bi-info-circle"></i>
      <span>
        {{ t('professionals.commissionWillBe') }}:
        <strong>{{ commissionInfo.label }}</strong>
        ({{ t(`professionals.commissionTypes.${commissionInfo.type}`) }})
      </span>
    </div>

    <div
      v-if="filterByService && filteredProfessionals.length === 0"
      class="alert alert-warning mt-2"
    >
      <i class="bi bi-exclamation-triangle"></i>
      {{ t('professionals.noAvailableForService') }}
    </div>
  </div>
</template>

<style scoped>
.professional-selector {
  width: 100%;
}

/* Payment Form Select Styles */
.payment-form-select {
  padding: 0.375rem 0.625rem;
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.95);
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
  transition: all 0.2s ease;
  width: 100%;
}

.payment-form-select:hover {
  border-color: rgba(0, 194, 203, 0.3);
  background: rgba(255, 255, 255, 1);
}

.payment-form-select:focus {
  outline: none;
  border-color: #00c2cb;
  box-shadow: 0 0 0 3px rgba(0, 194, 203, 0.1);
}

.payment-form-select.is-invalid {
  border-color: #dc3545;
}

.commission-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background-color: #e7f3ff;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #0066cc;
}

.commission-info i {
  font-size: 1.1rem;
}

.alert {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  margin-bottom: 0;
  font-size: 0.9rem;
}

.alert-warning {
  background-color: #fff3cd;
  border: 1px solid #ffc107;
  color: #856404;
}
</style>
