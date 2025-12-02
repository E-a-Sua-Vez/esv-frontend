<script>
import Popper from 'vue3-popper';

export default {
  name: 'CollaboratorName',
  components: { Popper },
  props: {
    name: { type: String, default: '' },
    email: { type: String, default: '' },
    active: { type: Boolean, default: true },
  },
  computed: {
    statusClass() {
      return this.active ? 'collaborator-active' : 'collaborator-inactive';
    },
    statusIconClass() {
      return this.active ? 'icon-success' : 'icon-error';
    },
    statusTooltip() {
      return this.active
        ? this.$t('dashboard.clientCard.tooltip.collaboratorActive') || 'Colaborador ativo'
        : this.$t('dashboard.clientCard.tooltip.collaboratorInactive') || 'Colaborador inativo';
    },
  },
};
</script>

<template>
  <div class="collaborator-name-container" :class="statusClass">
    <!-- Collaborator Icon -->
    <Popper :class="'dark'" arrow hover>
      <template #content>
        <div>{{ statusTooltip }}</div>
      </template>
      <div class="collaborator-icon" :class="statusIconClass">
        <i class="bi bi-person"></i>
      </div>
    </Popper>

    <!-- Collaborator Name -->
    <span class="collaborator-name-text" :class="statusClass">
      {{ name || $t('dashboard.clientCard.label.noCollaborator') || 'N/I' }}
    </span>

    <!-- Collaborator Email -->
    <Popper v-if="email" :class="'dark'" arrow hover>
      <template #content>
        <div>{{ $t('dashboard.clientCard.tooltip.collaboratorEmail') || 'Email do colaborador' }}</div>
      </template>
      <span class="collaborator-email">
        <i class="bi bi-at"></i>
        <span class="collaborator-email-text">{{ email }}</span>
      </span>
    </Popper>
  </div>
</template>

<style scoped>
/* Collaborator Name Container */
.collaborator-name-container {
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

.collaborator-name-container.collaborator-active {
  border-left: 4px solid rgba(0, 194, 203, 0.8);
}

.collaborator-name-container.collaborator-inactive {
  border-left: 4px solid rgba(165, 42, 42, 0.6);
}

.collaborator-name-container:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

/* Collaborator Icon */
.collaborator-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 4px;
  font-size: 1rem;
  flex-shrink: 0;
}

.collaborator-icon.icon-success {
  background: rgba(0, 194, 203, 0.1);
  color: rgba(0, 194, 203, 0.9);
}

.collaborator-icon.icon-error {
  background: rgba(165, 42, 42, 0.1);
  color: rgba(165, 42, 42, 0.8);
}

/* Collaborator Name Text */
.collaborator-name-text {
  font-size: 0.875rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.85);
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: left;
}

.collaborator-name-text.collaborator-active {
  color: rgba(0, 0, 0, 0.9);
}

.collaborator-name-text.collaborator-inactive {
  color: rgba(0, 0, 0, 0.5);
}

/* Collaborator Email */
.collaborator-email {
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

.collaborator-email:hover {
  background: rgba(0, 74, 173, 0.15);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 74, 173, 0.2);
}

.collaborator-email i {
  font-size: 0.6875rem;
  flex-shrink: 0;
}

.collaborator-email-text {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 700;
  letter-spacing: 0.15px;
}

/* Allow tooltips to overflow parent containers */
.collaborator-name-container {
  overflow: visible;
}
</style>
