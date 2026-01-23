<template>
  <div class="role-selector">
    <div class="form-group-modern">
      <label class="form-label-modern">
        <i class="bi bi-person-badge"></i>
        {{ $t('collaborator.role.title') }}
      </label>
      <select
        v-model="selectedRole"
        class="form-control-modern form-select-modern"
        :class="{ 'is-invalid': error }"
        :disabled="disabled"
        @change="handleRoleChange"
      >
        <option value="">{{ $t('collaborator.role.selectRole') }}</option>
        <optgroup :label="$t('collaborator.role.categories.medical')">
          <option value="DOCTOR">{{ $t('collaborator.role.types.DOCTOR') }}</option>
          <option value="SPECIALIST">{{ $t('collaborator.role.types.SPECIALIST') }}</option>
          <option value="NURSE">{{ $t('collaborator.role.types.NURSE') }}</option>
          <option value="MEDICAL_ASSISTANT">
            {{ $t('collaborator.role.types.MEDICAL_ASSISTANT') }}
          </option>
          <option value="TECHNICIAN">{{ $t('collaborator.role.types.TECHNICIAN') }}</option>
          <option value="PHARMACIST">{{ $t('collaborator.role.types.PHARMACIST') }}</option>
          <option value="THERAPIST">{{ $t('collaborator.role.types.THERAPIST') }}</option>
        </optgroup>
        <optgroup :label="$t('collaborator.role.categories.administrative')">
          <option value="SECRETARY">{{ $t('collaborator.role.types.SECRETARY') }}</option>
          <option value="RECEPTIONIST">{{ $t('collaborator.role.types.RECEPTIONIST') }}</option>
          <option value="ADMINISTRATOR">{{ $t('collaborator.role.types.ADMINISTRATOR') }}</option>
        </optgroup>
        <optgroup :label="$t('collaborator.role.categories.general')">
          <option value="STANDARD">{{ $t('collaborator.role.types.STANDARD') }}</option>
          <option value="ASSISTANT">{{ $t('collaborator.role.types.ASSISTANT') }}</option>
          <option value="FULL">{{ $t('collaborator.role.types.FULL') }}</option>
        </optgroup>
      </select>
    </div>

    <!-- Descripción del Rol Seleccionado -->
    <div v-if="selectedRole" class="role-description mt-2">
      <div class="role-info-card">
        <div class="role-header">
          <i :class="roleIcon" class="role-icon"></i>
          <div class="role-details">
            <h6 class="role-title">{{ $t(`collaborator.role.types.${selectedRole}`) }}</h6>
            <p class="role-subtitle">{{ $t(`collaborator.role.descriptions.${selectedRole}`) }}</p>
          </div>
        </div>

        <!-- Permisos del Rol -->
        <div class="role-permissions">
          <h6 class="permissions-title">{{ $t('collaborator.role.permissions.title') }}</h6>
          <div class="permissions-grid">
            <div
              v-for="permission in rolePermissions"
              :key="permission.key"
              class="permission-item"
              :class="{ 'permission-granted': permission.value }"
            >
              <i :class="permission.value ? 'bi bi-check-circle-fill' : 'bi bi-x-circle'"></i>
              <span>{{ $t(`collaborator.role.permissions.${permission.key}`) }}</span>
            </div>
          </div>
        </div>

        <!-- Requisitos especiales -->
        <div v-if="roleRequirements.length > 0" class="role-requirements">
          <h6 class="requirements-title">{{ $t('collaborator.role.requirements.title') }}</h6>
          <ul class="requirements-list">
            <li v-for="requirement in roleRequirements" :key="requirement">
              {{ $t(`collaborator.role.requirements.${requirement}`) }}
            </li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  error: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue', 'roleChanged']);

// Estado
const selectedRole = ref(props.modelValue);

// Configuración de roles y permisos
const ROLE_PERMISSIONS = {
  DOCTOR: {
    canPrescribe: true,
    canOrderExams: true,
    canCreateReferences: true,
    canAccessPatientHistory: true,
    canEditPatientHistory: true,
    canGenerateDocuments: true,
    canSignDocuments: true,
    hasDigitalSignature: true,
    requiresMedicalLicense: true,
  },
  SPECIALIST: {
    canPrescribe: true,
    canOrderExams: true,
    canCreateReferences: true,
    canAccessPatientHistory: true,
    canEditPatientHistory: true,
    canGenerateDocuments: true,
    canSignDocuments: true,
    hasDigitalSignature: true,
    requiresMedicalLicense: true,
  },
  NURSE: {
    canPrescribe: false,
    canOrderExams: false,
    canCreateReferences: false,
    canAccessPatientHistory: true,
    canEditPatientHistory: true,
    canGenerateDocuments: false,
    canSignDocuments: false,
    hasDigitalSignature: false,
    requiresMedicalLicense: true,
  },
  SECRETARY: {
    canPrescribe: false,
    canOrderExams: false,
    canCreateReferences: false,
    canAccessPatientHistory: true,
    canEditPatientHistory: false,
    canGenerateDocuments: true,
    canSignDocuments: false,
    hasDigitalSignature: false,
    requiresMedicalLicense: false,
  },
  RECEPTIONIST: {
    canPrescribe: false,
    canOrderExams: false,
    canCreateReferences: false,
    canAccessPatientHistory: false,
    canEditPatientHistory: false,
    canGenerateDocuments: false,
    canSignDocuments: false,
    hasDigitalSignature: false,
    requiresMedicalLicense: false,
  },
  // ... otros roles
};

// Computed
const roleIcon = computed(() => {
  const iconMap = {
    DOCTOR: 'bi bi-heart-pulse-fill',
    SPECIALIST: 'bi bi-award-fill',
    NURSE: 'bi bi-plus-circle-fill',
    SECRETARY: 'bi bi-clipboard-data-fill',
    RECEPTIONIST: 'bi bi-person-workspace',
    MEDICAL_ASSISTANT: 'bi bi-bandaid-fill',
    TECHNICIAN: 'bi bi-gear-fill',
    PHARMACIST: 'bi bi-capsule',
    THERAPIST: 'bi bi-activity',
    ADMINISTRATOR: 'bi bi-building',
    STANDARD: 'bi bi-person',
    ASSISTANT: 'bi bi-person-check',
    FULL: 'bi bi-person-fill-gear',
  };
  return iconMap[selectedRole.value] || 'bi bi-person';
});

const rolePermissions = computed(() => {
  if (!selectedRole.value || !ROLE_PERMISSIONS[selectedRole.value]) {
    return [];
  }

  const permissions = ROLE_PERMISSIONS[selectedRole.value];
  return Object.entries(permissions).map(([key, value]) => ({
    key,
    value,
  }));
});

const roleRequirements = computed(() => {
  const requirements = [];

  if (selectedRole.value) {
    const permissions = ROLE_PERMISSIONS[selectedRole.value];

    if (permissions?.requiresMedicalLicense) {
      requirements.push('medicalLicense');
    }
    if (permissions?.hasDigitalSignature) {
      requirements.push('digitalSignature');
    }
  }

  return requirements;
});

// Métodos
const handleRoleChange = () => {
  emit('update:modelValue', selectedRole.value);
  emit('roleChanged', {
    role: selectedRole.value,
    permissions: rolePermissions.value,
    requirements: roleRequirements.value,
  });
};

// Watchers
watch(
  () => props.modelValue,
  newValue => {
    selectedRole.value = newValue;
  },
);
</script>

<style scoped>
/* Usar exactamente los mismos estilos que el producto */
.role-selector .form-group-modern {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.25rem;
  width: 100%;
}

.form-label-modern {
  min-width: 120px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.75);
  text-transform: capitalize;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
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

.form-select-modern {
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.625rem center;
  background-size: 1rem;
  padding-right: 2.5rem;
  appearance: none;
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

.is-invalid {
  border-color: #dc3545;
}

.role-description {
  animation: slideDown 0.3s ease-out;
  margin-top: 0.5rem;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.role-info-card {
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 5px;
  overflow: hidden;
}

.role-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background-color: #f8f9fa;
  border-bottom: 1px solid rgba(0, 0, 0, 0.15);
  color: #212529;
}

.role-icon {
  font-size: 1.5rem;
  color: rgba(0, 74, 173, 0.7);
}

.role-details {
  flex: 1;
}

.role-title {
  margin: 0 0 0.125rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.75);
}

.role-subtitle {
  margin: 0;
  font-size: 0.75rem;
  line-height: 1.4;
  color: #6c757d;
}

.role-permissions,
.role-requirements {
  padding: 0.75rem;
}

.permissions-title,
.requirements-title {
  margin: 0 0 0.75rem 0;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.75);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.permissions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.5rem;
}

.permission-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem 0.5rem;
  border-radius: 5px;
  font-size: 0.75rem;
  transition: all 0.2s ease;
}

.permission-item.permission-granted {
  background: rgba(40, 167, 69, 0.1);
  color: #155724;
  border: 1px solid rgba(40, 167, 69, 0.2);
}

.permission-item:not(.permission-granted) {
  background: rgba(220, 53, 69, 0.1);
  color: #721c24;
  border: 1px solid rgba(220, 53, 69, 0.2);
}

.permission-item i {
  font-size: 0.75rem;
}

.requirements-list {
  margin: 0;
  padding-left: 1.25rem;
  color: #6c757d;
}

.requirements-list li {
  margin-bottom: 0.375rem;
  font-size: 0.75rem;
}

/* Responsive */
@media (max-width: 768px) {
  .role-selector .form-group-modern {
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
