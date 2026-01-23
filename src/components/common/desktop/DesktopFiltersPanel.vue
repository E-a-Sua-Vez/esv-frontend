<script>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue';
import CommerceLogo from '../CommerceLogo.vue';

export default {
  name: 'DesktopFiltersPanel',
  components: {
    CommerceLogo,
  },
  props: {
    modelValue: { type: Object, default: () => ({}) },
    loading: { type: Boolean, default: false },
    commerces: {
      type: [Array, Object],
      default: () => [],
    },
    showCommerceSelector: { type: Boolean, default: false },
    showDateFilters: { type: Boolean, default: false },
    showQuickDateButtons: { type: Boolean, default: false },
    showRefreshButton: { type: Boolean, default: false },
    sticky: { type: Boolean, default: true },
    showAllOption: { type: Boolean, default: false },
    commerceSelectorId: { type: String, default: '' },
    onToggle: { type: Function, default: null },
    collapsed: { type: Boolean, default: false },
  },
  emits: ['update:modelValue', 'commerce-changed', 'refresh', 'toggle'],
  setup(props, { emit }) {
    const filtersCollapsed = ref(props.collapsed || false);
    const panelRef = ref(null);
    const buttonRef = ref(null);
    const dividerRef = ref(null);
    const dividerTop = ref(0);
    const dividerHeight = ref(0);
    const dividerLeft = ref(0);
    const buttonTop = ref(0);
    const filtersContentRef = ref(null);
    const panelScrollTop = ref(0);

    let animationFrame = null;
    const scrollListener = null;
    const panelScrollListener = null;

    // Watch for prop changes to sync collapsed state
    watch(
      () => props.collapsed,
      newVal => {
        filtersCollapsed.value = newVal;
      }
    );

    // Normalize commerces to always be an array
    const normalizedCommerces = computed(() => {
      if (!props.commerces) return [];
      if (Array.isArray(props.commerces)) return props.commerces;
      // If it's an object (during initial loading), return empty array
      if (typeof props.commerces === 'object') return [];
      return [];
    });

    const updateDividerAndButtonPosition = () => {
      if (!panelRef.value) return;

      const panelRect = panelRef.value.getBoundingClientRect();
      const mainContentWrapper = document.querySelector('.main-content-wrapper');
      const footer = document.querySelector('.modern-footer');

      if (!mainContentWrapper) return;

      const wrapperRect = mainContentWrapper.getBoundingClientRect();
      const footerRect = footer ? footer.getBoundingClientRect() : null;

      // Calculate where the divider should start - from the top of the visible panel area
      // When the panel is sticky, it has a top offset (110px). The divider should start
      // from where the panel's visible area begins, which is always the top of the sticky panel
      // regardless of internal scroll within the panel
      let filtersStartTop = panelRect.top;

      // Ensure the divider starts from the visible top of the sticky panel
      // The sticky panel is positioned at 110px from top when stuck
      if (props.sticky) {
        // The divider should start from the actual visible top of the sticky panel
        // This is always panelRect.top (the current visible position of the panel)
        filtersStartTop = panelRect.top;
      }

      // Calculate where the divider should end (before footer or bottom of viewport)
      let dividerBottom;
      if (footerRect && footerRect.top < window.innerHeight) {
        // Footer is visible, stop divider before it
        dividerBottom = footerRect.top;
      } else {
        // Footer not visible, go to bottom of viewport or content
        dividerBottom = Math.min(window.innerHeight, wrapperRect.bottom);
      }

      // Set divider position - starts from where the filters CONTENT actually begins
      dividerTop.value = filtersStartTop;
      dividerHeight.value = Math.max(0, dividerBottom - dividerTop.value);

      // Position divider at the right edge of the filter column or left when collapsed
      // Add margin for better presentation
      const dividerMargin = 8; // Margin in pixels
      if (filtersCollapsed.value) {
        // When collapsed, position at the left edge with margin
        dividerLeft.value = panelRect.left + dividerMargin;
      } else {
        // When open, position at the right edge of the filter column with margin
        dividerLeft.value = panelRect.right - dividerMargin;
      }

      // Calculate button position on the line based on the panel's internal scroll
      // The button should move like a scrollbar indicator showing scroll position within the panel
      let scrollPercentage = 0;

      if (panelRef.value && props.sticky) {
        // Get the scroll position within the panel itself
        const panelScrollTop = panelRef.value.scrollTop || 0;
        const panelScrollHeight = panelRef.value.scrollHeight || 0;
        const panelClientHeight = panelRef.value.clientHeight || 0;
        const panelScrollableHeight = Math.max(0, panelScrollHeight - panelClientHeight);

        // Calculate scroll percentage within the panel (0 to 1)
        scrollPercentage =
          panelScrollableHeight > 0
            ? Math.min(1, Math.max(0, panelScrollTop / panelScrollableHeight))
            : 0;
      } else {
        // Fallback to page scroll if panel is not scrollable
        const scrollY = window.scrollY || window.pageYOffset;
        const documentHeight = document.documentElement.scrollHeight;
        const windowHeight = window.innerHeight;
        const scrollableHeight = documentHeight - windowHeight;
        scrollPercentage =
          scrollableHeight > 0 ? Math.min(1, Math.max(0, scrollY / scrollableHeight)) : 0;
      }

      // Position button on the divider line based on scroll percentage
      // Button should move from top to bottom of the divider line
      // Button is 28px tall, so we need to keep it within the line bounds
      const buttonSize = 28; // Button height
      const availableHeight = Math.max(0, dividerHeight.value - buttonSize);
      // Start from the top of the divider line (where filters section starts)
      // Add scroll percentage to move it along the line
      const buttonPositionOnLine = dividerTop.value + scrollPercentage * availableHeight;

      // Position button so it's always on the line
      buttonTop.value = buttonPositionOnLine;
    };

    const startContinuousUpdate = () => {
      if (animationFrame) return;
      const updateLoop = () => {
        updateDividerAndButtonPosition();
        animationFrame = requestAnimationFrame(updateLoop);
      };
      animationFrame = requestAnimationFrame(updateLoop);
    };

    const stopUpdating = () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }
    };

    const handleScroll = () => {
      updateDividerAndButtonPosition();
    };

    const handlePanelScroll = () => {
      if (panelRef.value) {
        panelScrollTop.value = panelRef.value.scrollTop || 0;
      }
      updateDividerAndButtonPosition();
    };

    onMounted(() => {
      updateDividerAndButtonPosition();
      startContinuousUpdate();
      window.addEventListener('resize', updateDividerAndButtonPosition);
      window.addEventListener('scroll', handleScroll, { passive: true });

      // Listen to panel's internal scroll
      if (panelRef.value) {
        panelRef.value.addEventListener('scroll', handlePanelScroll, { passive: true });
      }
    });

    onUnmounted(() => {
      stopUpdating();
      window.removeEventListener('resize', updateDividerAndButtonPosition);
      window.removeEventListener('scroll', handleScroll);

      // Remove panel scroll listener
      if (panelRef.value) {
        panelRef.value.removeEventListener('scroll', handlePanelScroll);
      }
    });

    const toggleFilters = () => {
      filtersCollapsed.value = !filtersCollapsed.value;
      // Small delay to ensure DOM updates
      setTimeout(() => {
        updateDividerAndButtonPosition();
      }, 10);
      emit('toggle', filtersCollapsed.value);
      if (props.onToggle) {
        props.onToggle(filtersCollapsed.value);
      }
    };

    const handleCommerceChange = event => {
      const selectedId = event.target.value;
      if (selectedId === 'ALL') {
        emit('commerce-changed', { id: 'ALL' });
      } else {
        const commerce = normalizedCommerces.value.find(c => c.id === selectedId);
        if (commerce) {
          emit('commerce-changed', commerce);
        }
      }
    };

    const refresh = () => {
      emit('refresh');
    };

    // Get current date formatted
    const currentDate = computed(() => {
      const date = new Date();
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    });

    return {
      filtersCollapsed,
      panelRef,
      buttonRef,
      dividerRef,
      filtersContentRef,
      dividerTop,
      dividerHeight,
      dividerLeft,
      buttonTop,
      panelScrollTop,
      normalizedCommerces,
      toggleFilters,
      handleCommerceChange,
      refresh,
      currentDate,
    };
  },
};
</script>

<template>
  <div
    class="desktop-filters-panel"
    :class="{ 'filters-collapsed': filtersCollapsed, sticky: sticky }"
    ref="panelRef"
  >
    <!-- Línea divisoria - siempre visible, desde donde comienzan los filtros hasta antes del footer -->
    <div
      ref="dividerRef"
      class="filters-divider"
      :style="{
        top: `${dividerTop}px`,
        left: `${dividerLeft}px`,
        height: `${dividerHeight}px`,
      }"
    ></div>

    <!-- Botón de toggle - se mueve con el scroll como un scrollbar, sobre la línea -->
    <button
      ref="buttonRef"
      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-2 filters-toggle-button"
      :class="{ collapsed: filtersCollapsed }"
      @click="toggleFilters"
      :aria-expanded="!filtersCollapsed"
      aria-label="Toggle filters"
      :style="{
        top: `${buttonTop}px`,
        left: `${dividerLeft}px`, // Button centered on line (transform handles centering)
      }"
    >
      <i :class="filtersCollapsed ? 'bi bi-chevron-right' : 'bi bi-chevron-left'"></i>
    </button>

    <!-- Contenido de filtros que se puede colapsar -->
    <div
      class="filters-content"
      :class="{ 'filters-content-collapsed': filtersCollapsed }"
      ref="filtersContentRef"
    >
      <!-- Selector de commerce - dentro del área colapsable -->
      <div
        v-if="showCommerceSelector && normalizedCommerces && normalizedCommerces.length > 0"
        class="mb-3"
      >
        <label class="form-label fw-bold mb-2">{{ $t('dashboard.commerce') || 'Commerce' }}</label>
        <select
          :id="commerceSelectorId"
          class="form-select metric-controls"
          :value="modelValue?.commerce?.id"
          @change="handleCommerceChange"
          :disabled="loading"
        >
          <option v-for="com in normalizedCommerces" :key="com.id" :value="com.id">
            {{ com.active ? `🟢  ${com.tag}` : `🔴  ${com.tag}` }} - {{ currentDate }}
          </option>
          <option v-if="showAllOption" :value="'ALL'">
            {{ $t('dashboard.all') || 'All' }} - {{ currentDate }}
          </option>
        </select>
      </div>
      <slot name="custom-filters"></slot>
    </div>
  </div>
</template>

<style scoped>
.desktop-filters-panel {
  position: relative;
  padding-right: 1rem;
  transition: width 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94),
    padding 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.desktop-filters-panel.sticky {
  position: sticky;
  top: 110px;
  align-self: flex-start;
  /* Calculate max-height to stop before footer - dynamically calculated in JS */
  max-height: calc(100vh - 110px);
  overflow-y: auto;
  overflow-x: hidden;
  scrollbar-width: thin;
  scrollbar-color: var(--gris-default, #dee2e6) transparent;
}

.desktop-filters-panel.sticky::-webkit-scrollbar {
  width: 6px;
}

.desktop-filters-panel.sticky::-webkit-scrollbar-track {
  background: transparent;
}

.desktop-filters-panel.sticky::-webkit-scrollbar-thumb {
  background-color: var(--gris-default, #dee2e6);
  border-radius: 3px;
}

.desktop-filters-panel.sticky::-webkit-scrollbar-thumb:hover {
  background-color: var(--gris-default, #adb5bd);
}

.desktop-filters-panel.filters-collapsed {
  padding-right: 0;
  flex: 0 0 auto;
  width: auto;
  min-width: 0;
  transition: width 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94),
    padding 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

/* Línea divisoria - siempre visible, desde donde está el botón hasta antes del footer */
.filters-divider {
  position: fixed;
  width: 1px; /* Slightly thicker for better visibility */
  background-color: var(--gris-default, #dee2e6);
  z-index: 5;
  pointer-events: none;
  transition: left 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), top 0s linear, height 0s linear;
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.1); /* Subtle shadow for depth */
}

/* Botón de toggle - se mueve con el scroll como un scrollbar, sobre la línea */
.filters-toggle-button {
  position: fixed;
  z-index: 100; /* Low z-index to avoid interfering with modals and other interactive elements */
  transform: translateX(-15px); /* Center horizontally on the line */
  transition: left 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  /* Override Bootstrap defaults to maintain circular shape */
  width: auto;
  min-width: 28px;
  height: 28px;
  padding: 0.25rem 0.5rem !important;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto; /* Ensure button itself is clickable */
  /* Ensure button doesn't block clicks on other elements */
  touch-action: manipulation;
}

/* Remove all hover effects */
.filters-toggle-button:hover,
.filters-toggle-button:focus,
.filters-toggle-button:active {
  transform: translateX(-15px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15);
}

/* Contenido de filtros con animación suavizada */
.filters-content {
  padding-right: 1rem;
  position: relative;
  z-index: 2;
  max-height: 5000px;
  opacity: 1;
  overflow: hidden;
  font-size: 0.8rem;
  line-height: .9;
  font-weight: 300 !important;
  color: rgba(0, 0, 0, 0.7);
  text-transform: uppercase;
  align-items: flex-start;
  transition: max-height 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94),
    opacity 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94),
    padding 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94),
    margin 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.filters-content.filters-content-collapsed {
  opacity: 0;
  pointer-events: none;
  max-height: 0;
  padding: 0;
  margin: 0;
  transition: max-height 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94),
    opacity 0.25s cubic-bezier(0.25, 0.46, 0.45, 0.94),
    padding 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94),
    margin 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

/* Reduce placeholder text size for all inputs and selects */
.filters-content ::placeholder,
.filters-content input::placeholder,
.filters-content select::placeholder,
.filters-content textarea::placeholder {
  font-size: 0.7rem !important;
  opacity: 0.6;
}

/* Also apply to form-control and form-select classes within filters */
.filters-content .form-control::placeholder,
.filters-content .form-select::placeholder,
.filters-content .form-control-sm::placeholder {
  font-size: 0.7rem !important;
  opacity: 0.6;
}

/* Reduce button text size */
.filters-content .btn,
.filters-content .btn-sm,
.filters-content button {
  font-size: 0.75rem !important;
  line-height: 1.2;
}

/* Keep icon sizes normal but reduce text */
.filters-content .btn i,
.filters-content button i {
  font-size: 0.9rem;
}
</style>
