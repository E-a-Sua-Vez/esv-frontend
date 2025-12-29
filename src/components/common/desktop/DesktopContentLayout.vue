<script>
export default {
  name: 'DesktopContentLayout',
  props: {
    filterColumnSize: { type: String, default: 'col-lg-3' },
    contentColumnSize: { type: String, default: 'col-lg-9' },
    showFilters: { type: Boolean, default: true },
    filtersSticky: { type: Boolean, default: true },
    initialCollapsed: { type: Boolean, default: false },
  },
  data() {
    return {
      filtersCollapsed: this.initialCollapsed,
    };
  },
  watch: {
    initialCollapsed(newVal) {
      this.filtersCollapsed = newVal;
    },
  },
  methods: {
    onFiltersToggle(collapsed) {
      this.filtersCollapsed = collapsed;
    },
  },
};
</script>

<template>
  <div class="desktop-content-layout">
    <div class="row">
      <div
        v-if="showFilters"
        :class="[
          'desktop-filters-column',
          filtersCollapsed ? 'filters-collapsed' : filterColumnSize,
        ]"
      >
        <slot name="filters" :on-toggle="onFiltersToggle" :collapsed="filtersCollapsed"></slot>
      </div>
      <div
        :class="[
          filtersCollapsed && showFilters ? 'col-lg-12' : contentColumnSize,
          'desktop-content-column',
        ]"
      >
        <div class="content-wrapper">
          <slot name="content"></slot>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.desktop-content-layout {
  width: 100%;
  position: relative;
}

.desktop-filters-column {
  padding-right: 0;
  transition: width 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94),
    flex 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94),
    max-width 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
  overflow: visible;
  position: relative;
}

.desktop-filters-column.filters-collapsed {
  flex: 0 0 auto;
  width: auto;
  min-width: 0;
  max-width: none;
  padding: 0;
  margin: 0;
  overflow: visible;
}

.desktop-content-column {
  padding-left: 2rem;
  transition: padding-left 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94),
    width 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94),
    flex 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94),
    max-width 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.desktop-content-column:has(+ .desktop-filters-column.filters-collapsed),
.row > .desktop-filters-column.filters-collapsed + .desktop-content-column {
  padding-left: 3rem;
  width: 100%;
  flex: 0 0 100%;
  max-width: 100%;
  transition: padding-left 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94),
    width 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94),
    flex 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94),
    max-width 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.content-wrapper {
  width: 100%;
}

@media (min-width: 992px) {
  .desktop-content-column {
    min-height: 100vh;
  }
}
</style>
