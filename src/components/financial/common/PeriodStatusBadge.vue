<template>
  <span
    class="badge period-status-badge"
    :class="`badge-${statusClass}`"
  >
    <i :class="`bi ${statusIcon} me-1`"></i>
    {{ statusText }}
  </span>
</template>

<script>
export default {
  name: 'PeriodStatusBadge',
  props: {
    status: {
      type: String,
      required: true,
      validator: (value) => ['OPEN', 'CLOSED', 'LOCKED'].includes(value),
    },
  },
  computed: {
    statusClass() {
      const classes = {
        OPEN: 'success',
        CLOSED: 'warning',
        LOCKED: 'secondary',
      };
      return classes[this.status] || 'secondary';
    },
    statusIcon() {
      const icons = {
        OPEN: 'bi-unlock',
        CLOSED: 'bi-lock',
        LOCKED: 'bi-shield-lock',
      };
      return icons[this.status] || 'bi-question-circle';
    },
    statusText() {
      return this.$t(`financial.periods.status.${this.status.toLowerCase()}`);
    },
  },
};
</script>

<style scoped>
.period-status-badge {
  font-size: 0.625rem;
  font-weight: 600;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  display: inline-flex;
  align-items: center;
  line-height: 1.2;
}

.period-status-badge i {
  font-size: 0.625rem;
}

.badge-success {
  background-color: #28a745;
  color: white;
}

.badge-warning {
  background-color: #ffc107;
  color: #000;
}

.badge-secondary {
  background-color: #6c757d;
  color: white;
}
</style>
