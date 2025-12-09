<script>
import Popper from 'vue3-popper';

export default {
  name: 'PatientHistoryItemName',
  components: { Popper },
  props: {
    item: { type: Object, default: () => ({ name: '', active: false, tag: '', type: '' }) },
  },
  computed: {
    statusClass() {
      return this.item.active ? 'item-active' : 'item-inactive';
    },
    statusIconClass() {
      return this.item.active ? 'icon-success' : 'icon-error';
    },
    statusTooltip() {
      return this.item.active
        ? this.$t('dashboard.clientCard.tooltip.itemActive') || 'Item activo'
        : this.$t('dashboard.clientCard.tooltip.itemInactive') || 'Item inactivo';
    },
  },
};
</script>

<template>
  <div class="item-name-container" :class="statusClass">
    <!-- Item Icon -->
    <Popper :class="'dark'" arrow disable-click-away>
      <template #content>
        <div>{{ statusTooltip }}</div>
      </template>
      <div class="item-icon" :class="statusIconClass">
        <i class="bi bi-file-text"></i>
      </div>
    </Popper>

    <!-- Item Name -->
    <span class="item-name-text" :class="statusClass">
      {{ item.name || 'N/I' }}
    </span>

    <!-- Item Tag -->
    <Popper v-if="item.tag" :class="'dark'" arrow disable-click-away>
      <template #content>
        <div>{{ $t('dashboard.clientCard.tooltip.itemTag') || 'Tag del item' }}</div>
      </template>
      <span class="item-tag">
        <i class="bi bi-tags-fill"></i>
        <span class="item-tag-text">{{ item.tag }}</span>
      </span>
    </Popper>
  </div>
</template>

<style scoped>
/* Item Name Container */
.item-name-container {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  width: 100%;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 6px;
  border: 1px solid rgba(169, 169, 169, 0.2);
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
  overflow: hidden;
  padding: 0.25rem 0.5rem;
}

.item-name-container:hover {
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 1);
}

.item-name-container.item-active {
  border-left: 3px solid #00c2cb;
}

.item-name-container.item-inactive {
  border-left: 3px solid #a52a2a;
  opacity: 0.7;
}

/* Item Icon */
.item-name-container :deep(.inline-block) {
  display: flex !important;
  align-items: center !important;
}

.item-icon {
  width: 32px;
  height: 32px;
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s ease;
  cursor: help;
}

.item-icon i {
  font-size: 0.9375rem;
}

.item-icon.icon-success {
  background: rgba(0, 194, 203, 0.12);
  color: #00c2cb;
}

.item-icon.icon-error {
  background: rgba(165, 42, 42, 0.12);
  color: #a52a2a;
}

.item-name-container:hover .item-icon {
  transform: scale(1.02);
}

/* Item Name Text */
.item-name-text {
  font-size: 0.8125rem;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.01em;
  flex: 1;
  min-width: 0;
  word-break: break-word;
}

.item-name-text.item-active {
  color: #000000;
}

.item-name-text.item-inactive {
  color: rgba(0, 0, 0, 0.5);
  text-decoration: line-through;
}

/* Item Tag */
.item-tag {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.375rem;
  background: rgba(0, 74, 173, 0.1);
  color: #004aad;
  border-radius: 9999px;
  font-size: 0.6875rem;
  font-weight: 700;
  cursor: help;
  transition: all 0.2s ease;
  line-height: 1.2;
}

.item-tag:hover {
  background: rgba(0, 74, 173, 0.15);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 74, 173, 0.2);
}

.item-tag i {
  font-size: 0.6875rem;
  flex-shrink: 0;
}

.item-tag-text {
  font-weight: 700;
  letter-spacing: 0.15px;
}

/* Tooltip z-index improvements */
:deep(.popper),
:deep(.popper-dark),
:deep([data-popper-placement]),
:deep([data-popper-placement] > div) {
  z-index: 10000 !important;
}

:deep(.popper__arrow),
:deep(.popper__arrow::before) {
  z-index: 10001 !important;
}

/* Allow tooltips to overflow parent containers */
.item-name-container {
  overflow: visible;
}
</style>
