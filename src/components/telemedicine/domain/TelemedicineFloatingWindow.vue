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
                Cliente conectado
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
            :title="isMinimized ? 'Maximizar' : 'Minimizar'"
          >
            <i :class="isMinimized ? 'bi bi-arrows-angle-expand' : 'bi bi-dash-lg'"></i>
          </button>
          <button
            v-if="!isMinimized"
            type="button"
            class="btn-window-action"
            @click="toggleMaximize"
            :title="isMaximized ? 'Restaurar' : 'Maximizar'"
          >
            <i :class="isMaximized ? 'bi bi-arrows-angle-contract' : 'bi bi-square'"></i>
          </button>
          <button
            type="button"
            class="btn-window-action btn-window-action-close"
            @click="$emit('close')"
            title="Cerrar"
          >
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
      </div>

      <!-- Minimized Video Miniature (inside the minimized card) -->
      <div v-if="isMinimized && showVideoMiniature" class="minimized-video-miniature">
        <video
          ref="miniatureVideoRef"
          autoplay
          playsinline
          class="miniature-video-element"
          muted
        ></video>
        <div class="miniature-video-overlay">
          <span class="miniature-video-label">Paciente</span>
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
      default: 'Consulta Telemedicina',
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
    showVideoMiniature: {
      type: Boolean,
      default: true,
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
    const miniatureVideoRef = ref(null);
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
          minHeight: props.showVideoMiniature ? '180px' : 'auto', // Header (60px) + Video (120px)
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

    // Function to sync video stream to miniature
    const syncVideoToMiniature = async (retryCount = 0) => {
      // Extract the actual video element from the ref (could be a computed, ref, or direct element)
      let remoteVideoElement = null;

      if (props.remoteVideoRef) {
        // If it's a ref/computed, get its value
        if (typeof props.remoteVideoRef === 'object' && 'value' in props.remoteVideoRef) {
          remoteVideoElement = props.remoteVideoRef.value;
        } else {
          // It's already the element itself
          remoteVideoElement = props.remoteVideoRef;
        }
      }

      console.log('[TelemedicineFloatingWindow] syncVideoToMiniature called:', {
        retryCount,
        hasRemoteVideoRef: !!props.remoteVideoRef,
        remoteVideoRefType: typeof props.remoteVideoRef,
        remoteVideoElement: !!remoteVideoElement,
        remoteVideoElementType: remoteVideoElement?.tagName,
        hasSrcObject: !!remoteVideoElement?.srcObject,
        hasMiniatureRef: !!miniatureVideoRef.value,
        isMinimized: isMinimized.value,
        show: props.show,
        showVideoMiniature: props.showVideoMiniature,
      });

      if (!remoteVideoElement || !miniatureVideoRef.value) {
        // Retry up to 15 times if refs are not available yet (increased from 10)
        if (retryCount < 15 && props.show && isMinimized.value && props.showVideoMiniature) {
          setTimeout(() => syncVideoToMiniature(retryCount + 1), 300);
        } else if (retryCount >= 15) {
          console.warn(
            '[TelemedicineFloatingWindow] Max retries reached for syncVideoToMiniature',
            {
              hasRemoteVideoElement: !!remoteVideoElement,
              hasMiniatureRef: !!miniatureVideoRef.value,
            }
          );
        }
        return;
      }

      await nextTick();

      // Double-check after nextTick - re-extract in case the ref changed
      if (!remoteVideoElement || !miniatureVideoRef.value) {
        // Re-extract the element in case the computed ref updated
        if (props.remoteVideoRef) {
          if (typeof props.remoteVideoRef === 'object' && 'value' in props.remoteVideoRef) {
            remoteVideoElement = props.remoteVideoRef.value;
          } else {
            remoteVideoElement = props.remoteVideoRef;
          }
        }

        if (!remoteVideoElement || !miniatureVideoRef.value) {
          if (retryCount < 15 && props.show && isMinimized.value && props.showVideoMiniature) {
            setTimeout(() => syncVideoToMiniature(retryCount + 1), 300);
          }
          return;
        }
      }

      console.log('[TelemedicineFloatingWindow] Remote video element found:', {
        tagName: remoteVideoElement.tagName,
        hasSrcObject: !!remoteVideoElement.srcObject,
        srcObjectActive: remoteVideoElement.srcObject?.active,
        videoWidth: remoteVideoElement.videoWidth,
        videoHeight: remoteVideoElement.videoHeight,
      });

      // Check if the remote video has a stream
      if (remoteVideoElement.srcObject) {
        const remoteStream = remoteVideoElement.srcObject;

        // Only update if the stream is different
        if (miniatureVideoRef.value.srcObject !== remoteStream) {
          console.log('[TelemedicineFloatingWindow] Syncing video stream to miniature');

          // Use the stream directly - MediaStream can be shared between multiple video elements
          miniatureVideoRef.value.srcObject = remoteStream;

          try {
            await miniatureVideoRef.value.play();
            console.log('[TelemedicineFloatingWindow] Miniature video playing successfully');
          } catch (err) {
            console.warn('[TelemedicineFloatingWindow] Could not play miniature video:', err);
            // Retry playing
            setTimeout(async () => {
              if (miniatureVideoRef.value && remoteStream) {
                try {
                  await miniatureVideoRef.value.play();
                  console.log('[TelemedicineFloatingWindow] Miniature video playing (retry)');
                } catch (retryErr) {
                  console.warn(
                    '[TelemedicineFloatingWindow] Could not play miniature video (retry):',
                    retryErr
                  );
                }
              }
            }, 500);
          }
        } else {
          // Stream is already synced, but make sure it's playing
          if (miniatureVideoRef.value.paused) {
            try {
              await miniatureVideoRef.value.play();
            } catch (err) {
              console.warn('[TelemedicineFloatingWindow] Could not resume miniature video:', err);
            }
          }
        }
      } else {
        // If no stream yet, wait a bit and try again
        if (retryCount < 15) {
          console.log(
            '[TelemedicineFloatingWindow] Remote video has no stream, retrying...',
            retryCount
          );
          setTimeout(() => syncVideoToMiniature(retryCount + 1), 300);
        } else {
          console.warn('[TelemedicineFloatingWindow] Remote video has no stream after retries');
        }
      }
    };

    // Watch for remoteVideoRef changes and sync to miniature video
    watch(
      () => {
        // Extract the actual video element from the ref (could be a computed, ref, or direct element)
        if (!props.remoteVideoRef) return null;

        // If it's a ref/computed, get its value
        if (typeof props.remoteVideoRef === 'object' && 'value' in props.remoteVideoRef) {
          return props.remoteVideoRef.value;
        }
        // It's already the element itself
        return props.remoteVideoRef;
      },
      async newRefValue => {
        console.log('[TelemedicineFloatingWindow] remoteVideoRef changed:', {
          hasNewRefValue: !!newRefValue,
          newRefValueType: newRefValue?.tagName,
          hasSrcObject: !!newRefValue?.srcObject,
          isMinimized: isMinimized.value,
          showVideoMiniature: props.showVideoMiniature,
          hasMiniatureRef: !!miniatureVideoRef.value,
          remoteVideoRefType: typeof props.remoteVideoRef,
        });

        // Trigger sync if we have a valid video element, or if we're minimized and waiting for it
        if (
          newRefValue &&
          miniatureVideoRef.value &&
          isMinimized.value &&
          props.showVideoMiniature
        ) {
          // Add a small delay to ensure everything is ready
          await nextTick();
          setTimeout(async () => {
            await syncVideoToMiniature();
          }, 100);
        } else if (
          !newRefValue &&
          isMinimized.value &&
          props.showVideoMiniature &&
          miniatureVideoRef.value
        ) {
          // If we don't have the ref yet but we're minimized, keep trying
          // This handles the case where the computed returns null initially
          setTimeout(async () => {
            await syncVideoToMiniature();
          }, 500);
        }
      },
      { immediate: true, deep: true }
    );

    // Watch for miniature video ref to be available
    watch(miniatureVideoRef, async newVal => {
      console.log('[TelemedicineFloatingWindow] miniatureVideoRef changed:', {
        hasNewVal: !!newVal,
        isMinimized: isMinimized.value,
        showVideoMiniature: props.showVideoMiniature,
        hasRemoteVideoRef: !!props.remoteVideoRef,
      });

      if (newVal && props.remoteVideoRef && isMinimized.value && props.showVideoMiniature) {
        await nextTick();
        setTimeout(async () => {
          await syncVideoToMiniature();
        }, 100);
      }
    });

    // Also watch for when minimized state changes to sync video
    watch(isMinimized, async minimized => {
      console.log('[TelemedicineFloatingWindow] isMinimized changed:', {
        minimized,
        hasRemoteVideoRef: !!props.remoteVideoRef,
        hasMiniatureRef: !!miniatureVideoRef.value,
        showVideoMiniature: props.showVideoMiniature,
      });

      if (minimized && props.showVideoMiniature) {
        // Add a delay to ensure the DOM is updated and refs are available
        await nextTick();
        // Wait a bit more for the video element to be fully rendered and the computed ref to be available
        setTimeout(async () => {
          console.log('[TelemedicineFloatingWindow] Triggering sync after minimize');
          await syncVideoToMiniature();
        }, 800);
      } else if (!minimized) {
        // When maximizing, clear the miniature video stream to avoid conflicts
        if (miniatureVideoRef.value) {
          miniatureVideoRef.value.srcObject = null;
        }
      }
    });

    // Watch for changes in the remote video's srcObject
    watch(
      () => {
        if (!props.remoteVideoRef) return null;

        // Extract the actual video element
        let remoteVideoElement = null;
        if (typeof props.remoteVideoRef === 'object' && 'value' in props.remoteVideoRef) {
          remoteVideoElement = props.remoteVideoRef.value;
        } else {
          remoteVideoElement = props.remoteVideoRef;
        }

        return remoteVideoElement?.srcObject;
      },
      async newStream => {
        if (newStream && miniatureVideoRef.value && isMinimized.value && props.showVideoMiniature) {
          await nextTick();
          await syncVideoToMiniature();
        }
      },
      { deep: true }
    );

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
      miniatureVideoRef,
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
  display: none;
}

.minimized-video-miniature {
  width: 100%;
  height: 120px;
  background: #000;
  border-radius: 0;
  overflow: hidden;
  position: relative;
  margin-top: 0;
  flex-shrink: 0;
}

.miniature-video-element {
  width: 100%;
  height: 100%;
  object-fit: cover;
  background: #1a1a1a;
}

.miniature-video-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7) 0%, transparent 100%);
  padding: 0.5rem;
  display: flex;
  align-items: flex-end;
}

.miniature-video-label {
  color: white;
  font-size: 0.75rem;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
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
