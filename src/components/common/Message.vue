<script>
import Popper from 'vue3-popper';

export default {
  name: 'Message',
  components: { Popper },
  props: {
    title: { type: String, default: '' },
    content: { type: String, default: '' },
    icon: { type: String, default: 'bi bi-chat' },
    type: { type: String, default: 'normal' },
    upgrade: { type: Boolean, default: false },
    closable: { type: Boolean, default: false },
  },
  computed: {
    /**
     * Backwards compatible icon handling:
     * - If caller passes 'bi bi-inbox' or 'bi-inbox', we keep it.
     * - If caller passes 'inbox' (without prefix), we convert to 'bi bi-inbox'.
     */
    iconClass() {
      const raw = (this.icon || '').trim();
      if (!raw) return ['message-icon', 'bi', 'bi-chat'];

      const parts = raw.split(/\s+/).filter(Boolean);
      const hasBiToken = parts.includes('bi');
      const hasBiPrefix = parts.some(p => p.startsWith('bi-'));

      if (hasBiPrefix) {
        // Ensure 'bi' is present once
        const withoutBi = parts.filter(p => p !== 'bi');
        return ['message-icon', 'bi', ...withoutBi];
      }

      if (hasBiToken) {
        // Already includes 'bi' token (and maybe other classes)
        return ['message-icon', ...parts];
      }

      // Assume it's a Bootstrap icon name without prefix (e.g. 'inbox', 'file-earmark-pdf')
      return ['message-icon', 'bi', `bi-${raw}`];
    },
  },
  data() {
    return {};
  },
};
</script>

<template>
  <div :class="['message', `message-${type}`]" role="alert">
    <div class="message-content">
      <div class="message-header">
        <div class="message-title-section">
          <i :class="iconClass"></i>
          <span class="message-title-text">{{ title }}</span>
          <button
            v-if="closable"
            id="close-alert"
            type="button"
            class="message-close-btn"
            data-bs-dismiss="alert"
            aria-label="Close"
          >
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div v-if="upgrade" class="message-upgrade-section">
          <Popper :class="'dark'" arrow disable-click-away :content="$t('upgrade')">
            <span class="upgrade fw-bold">UPGRADE</span>
          </Popper>
        </div>
      </div>
      <div class="message-body">
        <span>{{ content }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.message {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 251, 252, 0.98) 100%);
  backdrop-filter: blur(10px);
  margin: 1rem 0.5rem;
  padding: 0;
  border-radius: 12px;
  border: 1px solid rgba(169, 169, 169, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  position: relative;
}

.message::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--verde-tu) 0%, var(--azul-es) 50%, var(--verde-tu) 100%);
  opacity: 0.6;
}

.message:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.message-content {
  padding: 1.25rem 1.5rem;
}

.message-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  gap: 1rem;
}

.message-title-section {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 0.75rem;
}

.message-icon {
  font-size: 1.25rem;
  color: var(--verde-tu);
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: rgba(0, 194, 203, 0.1);
  border-radius: 8px;
  transition: all 0.2s ease;
}

.message:hover .message-icon {
  background: rgba(0, 194, 203, 0.15);
  transform: scale(1.05);
}

.message-title-text {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.4;
  letter-spacing: 0.01em;
}

.message-close-btn {
  background: transparent;
  border: none;
  padding: 0.25rem 0.5rem;
  margin-left: auto;
  cursor: pointer;
  color: var(--gris-default);
  border-radius: 6px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.message-close-btn:hover {
  background: rgba(169, 169, 169, 0.1);
  color: var(--color-text);
  transform: scale(1.1);
}

.message-close-btn:active {
  transform: scale(0.95);
}

.message-close-btn i {
  font-size: 0.875rem;
}

.message-upgrade-section {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.message-body {
  font-size: 0.875rem;
  font-weight: 400;
  line-height: 1.5;
  color: rgba(0, 0, 0, 0.75);
  padding-top: 0.5rem;
  border-top: 1px solid rgba(169, 169, 169, 0.15);
}

/* Type variations */
.message-normal {
  border-left: 3px solid var(--gris-default);
}

.message-info {
  border-left: 3px solid var(--azul-turno);
}

.message-info .message-icon {
  color: var(--azul-turno);
  background: rgba(0, 74, 173, 0.1);
}

.message-success {
  border-left: 3px solid var(--verde-tu);
}

.message-warning {
  border-left: 3px solid var(--amarillo-star);
}

.message-warning .message-icon {
  color: var(--amarillo-star);
  background: rgba(249, 195, 34, 0.1);
}

.message-error {
  border-left: 3px solid var(--rojo-warning);
}

.message-error .message-icon {
  color: var(--rojo-warning);
  background: rgba(165, 42, 42, 0.1);
}

/* Upgrade badge styling */
.upgrade {
  font-size: 0.75rem;
  padding: 0.375rem 0.75rem;
  background: linear-gradient(135deg, var(--verde-tu) 0%, var(--azul-es) 100%);
  color: white;
  border-radius: 6px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  box-shadow: 0 2px 4px rgba(0, 194, 203, 0.3);
  transition: all 0.2s ease;
}

.upgrade:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 194, 203, 0.4);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .message {
    margin: 1rem 0.25rem;
    border-radius: 10px;
  }

  .message-content {
    padding: 1rem 1.25rem;
  }

  .message-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .message-title-section {
    width: 100%;
  }

  .message-upgrade-section {
    align-self: flex-end;
  }

  .message-icon {
    width: 24px;
    height: 24px;
    font-size: 1.1rem;
  }

  .message-title-text {
    font-size: 0.9rem;
  }

  .message-body {
    font-size: 0.85rem;
  }
}

@media (max-width: 576px) {
  .message-content {
    padding: 0.875rem 1rem;
  }

  .message-title-text {
    font-size: 0.875rem;
  }

  .message-body {
    font-size: 0.8rem;
    line-height: 1.4;
  }
}
</style>
