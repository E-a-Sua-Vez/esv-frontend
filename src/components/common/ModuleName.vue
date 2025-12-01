<script>
import Popper from 'vue3-popper';

export default {
  name: 'ModuleName',
  components: {
    Popper,
  },
  props: {
    name: { type: String, default: '' },
    active: { type: Boolean, default: true },
  },
  computed: {
    statusClass() {
      return this.active ? 'icon-success' : 'icon-danger';
    },
    statusIconClass() {
      return this.active ? 'bi-check-circle-fill green-icon' : 'bi-x-circle-fill red-icon';
    },
    statusTooltip() {
      return this.active
        ? this.$t('dashboard.clientCard.tooltip.moduleActive') || 'Módulo activo'
        : this.$t('dashboard.clientCard.tooltip.moduleInactive') || 'Módulo inactivo';
    },
  },
};
</script>

<template>
  <div class="module-name-container">
    <Popper :class="'dark'" arrow hover>
      <template #content>
        <div>{{ statusTooltip }}</div>
      </template>
      <div :class="['module-icon', statusClass]">
        <i class="bi bi-laptop"></i>
      </div>
    </Popper>
    <div class="module-name-text">
      <span class="module-name-title">{{ name }}</span>
    </div>
    <Popper :class="'dark'" arrow hover>
      <template #content>
        <div>{{ statusTooltip }}</div>
      </template>
      <div :class="['module-status-icon', statusClass]">
        <i :class="statusIconClass"></i>
      </div>
    </Popper>
  </div>
</template>

<style scoped>
.module-name-container {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.5rem 0.75rem;
  background: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.module-name-container:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.module-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  min-width: 2.5rem;
  border-radius: 6px;
  font-size: 1.25rem;
  flex-shrink: 0;
}

.module-icon.icon-success {
  background: rgba(40, 167, 69, 0.1);
  color: #28a745;
}

.module-icon.icon-danger {
  background: rgba(220, 53, 69, 0.1);
  color: #dc3545;
}

.module-name-text {
  flex: 1;
  display: flex;
  align-items: center;
  min-width: 0;
}

.module-name-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #212529;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.module-status-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  min-width: 1.75rem;
  border-radius: 50%;
  font-size: 1rem;
  flex-shrink: 0;
}

.module-status-icon.icon-success {
  background: rgba(40, 167, 69, 0.1);
}

.module-status-icon.icon-danger {
  background: rgba(220, 53, 69, 0.1);
}

.green-icon {
  color: #28a745;
}

.red-icon {
  color: #dc3545;
}
</style>
