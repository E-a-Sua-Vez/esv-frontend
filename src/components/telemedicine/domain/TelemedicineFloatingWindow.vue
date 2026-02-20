<template>
  <Teleport to="body">
    <!-- Main Floating Window -->
    <div
      v-if="show"
      class="telemedicine-floating-window"
      :class="{
        minimized: isMinimized,
        maximized: isMaximized,
        dragging: isDragging,
      }"
      :style="windowStyle"
    >
      <!-- Window Header -->
      <div class="floating-window-header" @mousedown="handleHeaderMouseDown">
        <div class="floating-window-header-left">
          <div class="floating-window-icon">
            <i class="bi" :class="iconClass"></i>
          </div>
          <div class="floating-window-title">
            <h6 class="mb-0">{{ title }}</h6>
            <div class="floating-window-status">
              <span
                class="status-indicator"
                :class="{
                  'status-connected': isConnected,
                  'status-connecting': isConnecting,
                  'status-disconnected': !isConnected && !isConnecting,
                }"
              >
                <i class="bi bi-circle-fill"></i>
                {{ connectionStatusText }}
              </span>
              <span v-if="clientConnected" class="client-status ms-2">
                <i class="bi bi-person-check-fill text-success"></i>
                {{ $t('telemedicineSession.floatingWindow.clientConnected') }}
              </span>
            </div>
          </div>
        </div>
        <div class="floating-window-actions" @mousedown.stop>
          <button
            v-if="allowMinimize"
            type="button"
            class="btn-window-action"
            @click="toggleMinimize"
            :title="isMinimized ? $t('telemedicineSession.floatingWindow.maximize') : $t('telemedicineSession.floatingWindow.minimize')"
          >
            <i :class="isMinimized ? 'bi bi-arrows-angle-expand' : 'bi bi-dash-lg'"></i>
          </button>
          <button
            v-if="!isMinimized"
            type="button"
            class="btn-window-action"
            @click="toggleMaximize"
            :title="isMaximized ? $t('telemedicineSession.floatingWindow.restore') : $t('telemedicineSession.floatingWindow.maximize')"
          >
            <i :class="isMaximized ? 'bi bi-arrows-angle-contract' : 'bi bi-square'"></i>
          </button>
          <button
            type="button"
            class="btn-window-action btn-window-action-close"
            @click="$emit('close')"
            :title="$t('telemedicineSession.floatingWindow.close')"
          >
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      </div>

      <!-- Window Content -->
      <div v-if="!isMinimized" class="floating-window-content">
        <slot></slot>
      </div>
    </div>
  </Teleport>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';

export default {
  name: 'TelemedicineFloatingWindow',
  props: {
    show: {
      type: Boolean,
      default: false,
    },
    title: {
      type: String,
      default: 'Consulta Teleconsulta',
    },
    iconClass: {
      type: String,
      default: 'bi-camera-video',
    },
    isConnected: {
      type: Boolean,
      default: false,
    },
    isConnecting: {
      type: Boolean,
      default: false,
    },
    clientConnected: {
      type: Boolean,
      default: false,
    },
    initialPosition: {
      type: Object,
      default: () => ({ x: 20, y: 20 }),
    },
    remoteVideoRef: {
      type: Object,
      default: null,
    },
    allowMinimize: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['close'],
  setup(props, { emit }) {
    const isMinimized = ref(false);
    const isMaximized = ref(false);
    const isDragging = ref(false);
    const position = ref({ ...props.initialPosition });
    const dragOffset = ref({ x: 0, y: 0 });
    const savedVerticalPosition = ref(null); // Store vertical position before minimizing

    const connectionStatusText = computed(() => {
      if (props.isConnected) return 'Conectado';
      if (props.isConnecting) return 'Conectando...';
      return 'Desconectado';
    });

    const windowStyle = computed(() => {
      if (isMaximized.value) {
        return {
          top: '0',
          left: '0',
          right: '0',
          bottom: '0',
          width: '100%',
          height: '100%',
          transform: 'none',
        };
      }
      if (isMinimized.value) {
        return {
          bottom: '20px',
          left: `${position.value.x}px`,
          width: '320px',
          height: 'auto',
          top: 'auto',
          transform: 'none',
        };
      }
      return {
        top: `${position.value.y}px`,
        left: `${position.value.x}px`,
        width: '480px',
        height: '640px',
      };
    });

    const startDrag = e => {
      // Don't allow dragging when maximized
      if (isMaximized.value) return;

      // Don't start drag if clicking on buttons or interactive elements
      if (e.target.closest('button') || e.target.closest('.btn-window-action')) {
        return;
      }

      isDragging.value = true;

      // Calculate offset based on current position
      const rect = e.currentTarget.getBoundingClientRect();
      dragOffset.value = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };

      document.addEventListener('mousemove', onDrag);
      document.addEventListener('mouseup', stopDrag);
      e.preventDefault();
    };

    const onDrag = e => {
      if (!isDragging.value) return;

      // Calculate new position - allow window to be moved anywhere
      const newX = e.clientX - dragOffset.value.x;
      const newY = e.clientY - dragOffset.value.y;

      // If minimized, only allow horizontal movement (vertical stays at bottom)
      if (isMinimized.value) {
        position.value = {
          x: newX,
          y: position.value.y, // Keep vertical position (will be overridden by bottom in CSS)
        };
      } else {
        position.value = {
          x: newX,
          y: newY,
        };
      }

      e.preventDefault();
    };

    const stopDrag = () => {
      isDragging.value = false;
      document.removeEventListener('mousemove', onDrag);
      document.removeEventListener('mouseup', stopDrag);

      // If minimized, ensure it stays at the bottom
      if (isMinimized.value) {
        const headerHeight = 60;
        position.value = {
          x: position.value.x,
          y: window.innerHeight - headerHeight - 20,
        };
      }
    };

    const toggleMinimize = () => {
      if (!isMinimized.value) {
        // Saving vertical position before minimizing
        savedVerticalPosition.value = position.value.y;
        isMinimized.value = true;
        isMaximized.value = false;
        // Position minimized window at the bottom of the screen
        const headerHeight = 60; // Approximate header height
        position.value = {
          x: position.value.x, // Keep horizontal position
          y: window.innerHeight - headerHeight - 20, // 20px from bottom
        };
      } else {
        // Restoring vertical position when maximizing
        isMinimized.value = false;
        if (savedVerticalPosition.value !== null) {
          position.value = {
            x: position.value.x,
            y: savedVerticalPosition.value,
          };
        }
      }
    };

    const toggleMaximize = () => {
      isMaximized.value = !isMaximized.value;
      if (isMaximized.value) {
        isMinimized.value = false;
      }
    };

    const handleHeaderMouseDown = e => {
      // Don't start drag if clicking on buttons or interactive elements
      if (e.target.closest('button') || e.target.closest('.btn-window-action')) {
        return;
      }
      startDrag(e);
    };

    onUnmounted(() => {
      stopDrag();
    });

    return {
      isMinimized,
      isMaximized,
      isDragging,
      windowStyle,
      connectionStatusText,
      startDrag,
      stopDrag,
      onDrag,
      handleHeaderMouseDown,
      toggleMinimize,
      toggleMaximize,
      allowMinimize: props.allowMinimize,
    };
  },
};
</script>

<style scoped>
@import '../../../shared/styles/prontuario-common.css';

.telemedicine-floating-window {
  position: fixed;
  z-index: 9999;
  background: white;
  border-radius: var(--border-radius-lg);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: move;
  min-width: 320px;
  max-width: 100vw;
  max-height: 100vh;
  pointer-events: auto;
}

.telemedicine-floating-window.minimized {
  height: auto;
  cursor: pointer;
  max-height: none;
  overflow: visible;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
}

.telemedicine-floating-window.maximized {
  width: 100% !important;
  height: 100% !important;
  top: 0 !important;
  left: 0 !important;
  right: 0 !important;
  bottom: 0 !important;
  border-radius: 0;
}

.floating-window-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--gradient-primary);
  background: linear-gradient(135deg, #0d6efd 0%, #198754 100%);
  color: white;
  cursor: move;
  user-select: none;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.telemedicine-floating-window.dragging {
  cursor: move;
  user-select: none;
}

.telemedicine-floating-window.dragging * {
  pointer-events: none;
}

.floating-window-header-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
}

.floating-window-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--border-radius-md);
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  flex-shrink: 0;
}

.floating-window-title {
  flex: 1;
  min-width: 0;
}

.floating-window-title h6 {
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.floating-window-status {
  display: flex;
  align-items: center;
  font-size: 0.75rem;
  margin-top: 0.25rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.7rem;
  opacity: 0.9;
}

.status-indicator i {
  font-size: 0.5rem;
}

.status-connected {
  color: #10b981;
}

.status-connecting {
  color: #f59e0b;
  animation: pulse 2s infinite;
}

.status-disconnected {
  color: #ef4444;
}

.client-status {
  font-size: 0.7rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.floating-window-actions {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}

.btn-window-action {
  width: 32px;
  height: 32px;
  border: none;
  background: rgba(255, 255, 255, 0.25);
  color: white;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1rem;
  padding: 0;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.btn-window-action:hover {
  background: rgba(255, 255, 255, 0.4);
  transform: scale(1.05);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.3);
}

.btn-window-action-close:hover {
  background: rgba(220, 53, 69, 0.9);
  color: white;
}

.floating-window-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.telemedicine-floating-window.minimized .floating-window-content {
  position: fixed;
  top: -9999px;
  left: -9999px;
  width: 1px;
  height: 1px;
  opacity: 0.01;
  pointer-events: none;
  z-index: -1;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .telemedicine-floating-window:not(.minimized):not(.maximized) {
    width: calc(100vw - 40px) !important;
    height: calc(100vh - 40px) !important;
    top: 20px !important;
    left: 20px !important;
  }
}
</style>
