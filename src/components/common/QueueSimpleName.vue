<script>
import Popper from 'vue3-popper';

export default {
  name: 'QueueSimpleName',
  components: {
    Popper,
  },
  props: {
    queue: { type: Object, default: () => ({ name: '', active: false, type: '', tag: '', id: '' }) },
    details: { type: Boolean, default: false },
    commerceKeyName: { type: String, default: '' },
  },
  computed: {
    statusClass() {
      return this.queue.active ? 'queue-active' : 'queue-inactive';
    },
    statusIconClass() {
      return this.queue.active ? 'icon-success' : 'icon-error';
    },
    statusTooltip() {
      return this.queue.active
        ? this.$t('dashboard.clientCard.tooltip.queueActive') || 'Fila activa'
        : this.$t('dashboard.clientCard.tooltip.queueInactive') || 'Fila inactiva';
    },
    queueTag() {
      if (this.queue.type && this.queue.type !== 'STANDARD') {
        return this.queue.tag || this.queue.type;
      }
      return this.queue.type || '';
    },
    tagTooltip() {
      return this.$t('dashboard.clientCard.tooltip.queueTag') || 'Tag de la fila';
    },
    queueLink() {
      if (!this.commerceKeyName || !this.queue.id) return '';
      return `${import.meta.env.VITE_URL}/publico/comercio/${this.commerceKeyName}/filas/${this.queue.id}`;
    },
  },
  methods: {
    copyLink() {
      if (this.queueLink) {
        navigator.clipboard.writeText(this.queueLink);
      }
    },
  },
};
</script>

<template>
  <div class="queue-name-container" :class="statusClass">
    <!-- Queue Icon -->
    <Popper :class="'dark'" arrow hover>
      <template #content>
        <div>{{ statusTooltip }}</div>
      </template>
      <div class="queue-icon" :class="statusIconClass">
        <i class="bi bi-person-lines-fill"></i>
      </div>
    </Popper>

    <!-- Queue Name -->
    <span class="queue-name-text" :class="statusClass">
      {{ queue.name || $t('dashboard.clientCard.label.noQueue') || 'N/I' }}
    </span>

    <!-- Queue Tag -->
    <Popper v-if="queueTag" :class="'dark'" arrow hover>
      <template #content>
        <div>{{ tagTooltip }}</div>
      </template>
      <span class="queue-tag">
        <i class="bi bi-tags-fill"></i>
        <span class="queue-tag-text">{{ queueTag }}</span>
      </span>
    </Popper>

    <!-- Action Buttons -->
    <Popper v-if="queueLink" :class="'dark'" arrow hover>
      <template #content>
        <div>{{ $t('dashboard.clientCard.tooltip.copy') || 'Copiar link de la fila' }}</div>
      </template>
      <button class="btn-copy-mini" @click.stop="copyLink()">
        <i class="bi bi-file-earmark-spreadsheet"></i>
      </button>
    </Popper>
    <Popper v-if="queueLink" :class="'dark'" arrow hover>
      <template #content>
        <div>{{ $t('dashboard.clientCard.tooltip.openWebsite') || 'Abrir fila' }}</div>
      </template>
      <a
        class="btn-link-mini"
        :href="queueLink"
        target="_blank"
        @click.stop
      >
        <i class="bi bi-box-arrow-up-right"></i>
      </a>
    </Popper>
  </div>
</template>

<style scoped>
/* Queue Name Container */
.queue-name-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  background: rgba(255, 255, 255, 0.95);
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  border: 1.5px solid rgba(169, 169, 169, 0.25);
  transition: all 0.2s ease;
}

.queue-name-container.queue-active {
  border-left: 4px solid rgba(0, 194, 203, 0.8);
}

.queue-name-container.queue-inactive {
  border-left: 4px solid rgba(165, 42, 42, 0.6);
}

/* Queue Icon */
.queue-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 4px;
  font-size: 1rem;
  flex-shrink: 0;
}

.queue-icon.icon-success {
  background: rgba(0, 194, 203, 0.1);
  color: rgba(0, 194, 203, 0.9);
}

.queue-icon.icon-error {
  background: rgba(165, 42, 42, 0.1);
  color: rgba(165, 42, 42, 0.8);
}

/* Queue Name Text */
.queue-name-text {
  font-size: 0.875rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.85);
  flex: 1;
  text-align: left;
}

.queue-name-text.queue-active {
  color: rgba(0, 0, 0, 0.9);
}

.queue-name-text.queue-inactive {
  color: rgba(0, 0, 0, 0.5);
}

/* Queue Tag */
.queue-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.1875rem 0.5rem;
  background: rgba(0, 74, 173, 0.1);
  color: #004aad;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: help;
  transition: all 0.2s ease;
  line-height: 1.3;
}

.queue-tag:hover {
  background: rgba(0, 74, 173, 0.15);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 74, 173, 0.2);
}

.queue-tag i {
  font-size: 0.6875rem;
  flex-shrink: 0;
}

.queue-tag-text {
  font-weight: 700;
  letter-spacing: 0.15px;
  text-transform: capitalize;
}

/* Action Buttons */
.btn-copy-mini {
  background: transparent;
  border: none;
  padding: 0.25rem;
  cursor: pointer;
  color: rgba(0, 0, 0, 0.4);
  transition: all 0.2s ease;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.btn-copy-mini:hover {
  background: rgba(169, 169, 169, 0.1);
  color: rgba(0, 0, 0, 0.7);
}

.btn-copy-mini i {
  font-size: 0.875rem;
}

.btn-link-mini {
  background: transparent;
  border: none;
  padding: 0.25rem;
  cursor: pointer;
  color: rgba(0, 0, 0, 0.4);
  transition: all 0.2s ease;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  text-decoration: none;
}

.btn-link-mini:hover {
  background: rgba(169, 169, 169, 0.1);
  color: rgba(0, 0, 0, 0.7);
}

.btn-link-mini i {
  font-size: 0.875rem;
}

/* Allow tooltips to overflow parent containers */
.queue-name-container {
  overflow: visible;
}
</style>
