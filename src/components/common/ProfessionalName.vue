<script>
import Popper from 'vue3-popper';
import { formatIdNumberBr } from '../../shared/utils/idNumber';

export default {
  name: 'ProfessionalName',
  components: { Popper },
  props: {
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    active: { type: Boolean, default: true },
    idNumber: { type: String, default: '' },
    hasCollaborator: { type: Boolean, default: false },
    professional: { type: Object, default: null },
  },
  methods: {
    formatIdNumber(idNumber) {
      return formatIdNumberBr('br', idNumber);
    },
  },
  computed: {
    statusClass() {
      return this.active ? 'professional-active' : 'professional-inactive';
    },
    statusIconClass() {
      return this.active ? 'icon-success' : 'icon-error';
    },
    statusTooltip() {
      return this.active
        ? this.$t('businessProfessionalsAdmin.tooltip.professionalActive') || 'Profissional ativo'
        : this.$t('businessProfessionalsAdmin.tooltip.professionalInactive') ||
            'Profissional inativo';
    },
  },
};
</script>

<template>
  <div class="professional-name-container" :class="statusClass">
    <!-- Professional Icon -->
    <Popper :class="'dark'" arrow hover>
      <template #content>
        <div>{{ statusTooltip }}</div>
      </template>
      <div class="professional-icon" :class="statusIconClass">
        <i class="bi bi-person"></i>
      </div>
    </Popper>

    <!-- Professional Name and ID Number -->
    <div class="professional-info">
      <span class="professional-name-text" :class="statusClass">
        {{ name || $t('businessProfessionalsAdmin.noProfessional') || 'N/I' }}
      </span>
      <span v-if="idNumber || professional?.personalInfo?.idNumber" class="professional-id-number">
        <i class="bi bi-person-vcard"></i>
        {{ formatIdNumber(idNumber || professional?.personalInfo?.idNumber) || 'N/I' }}
      </span>
    </div>

    <!-- Collaborator Tag -->
    <span v-if="hasCollaborator" class="collaborator-tag">
      <i class="bi bi-person-check-fill"></i>
    </span>

    <!-- Professional Email -->
    <Popper v-if="email" :class="'dark'" arrow hover>
      <template #content>
        <div>
          {{ $t('businessProfessionalsAdmin.tooltip.professionalEmail') || 'Email do profissional' }}
        </div>
      </template>
      <span class="professional-email">
        <i class="bi bi-at"></i>
        <span class="professional-email-text">{{ email }}</span>
      </span>
    </Popper>
  </div>
</template>

<style scoped>
/* Professional Name Container */
.professional-name-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  background: rgba(255, 255, 255, 0.95);
  border: 1.5px solid rgba(169, 169, 169, 0.25);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  transition: all 0.2s ease;
}

.professional-name-container.professional-active {
  border-left: 4px solid rgba(0, 194, 203, 0.8);
}

.professional-name-container.professional-inactive {
  border-left: 4px solid rgba(165, 42, 42, 0.6);
}

.professional-name-container:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Professional Icon */
.professional-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 4px;
  font-size: 1rem;
  flex-shrink: 0;
}

.professional-icon.icon-success {
  background: rgba(0, 194, 203, 0.1);
  color: rgba(0, 194, 203, 0.9);
}

.professional-icon.icon-error {
  background: rgba(165, 42, 42, 0.1);
  color: rgba(165, 42, 42, 0.8);
}

/* Professional Info Container */
.professional-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  flex: 1;
  min-width: 0;
}

/* Professional Name Text */
.professional-name-text {
  font-size: 0.875rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.85);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}

.professional-name-text.professional-active {
  color: rgba(0, 0, 0, 0.9);
}

.professional-name-text.professional-inactive {
  color: rgba(0, 0, 0, 0.5);
}

/* Professional ID Number */
.professional-id-number {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.1rem 0.5rem;
  font-size: 0.7rem;
  font-weight: 600;
  transition: all 0.2s ease;
  flex-shrink: 0;
  line-height: 1;
}

/* Professional Email */
.professional-email {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  background: rgba(0, 74, 173, 0.1);
  color: #004aad;
  border-radius: 9999px;
  padding: 0.1875rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: help;
  transition: all 0.2s ease;
  flex-shrink: 0;
  line-height: 1.3;
}

.professional-email:hover {
  background: rgba(0, 74, 173, 0.15);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 74, 173, 0.2);
}

/* Collaborator Tag */
.collaborator-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  background: rgba(76, 175, 80, 0.15);
  color: rgba(76, 175, 80, 0.9);
  border-radius: 50%;
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
  cursor: help;
  transition: all 0.2s ease;
}

.collaborator-tag:hover {
  background: rgba(76, 175, 80, 0.25);
  transform: scale(1.1);
}

.professional-email i {
  font-size: 0.6875rem;
  flex-shrink: 0;
}

.professional-email-text {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 700;
  letter-spacing: 0.15px;
}

/* Allow tooltips to overflow parent containers */
.professional-name-container {
  overflow: visible;
}
</style>
