<script setup>
import Spinner from './Spinner.vue';
import Alert from './Alert.vue';

defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: [String, Number],
    default: null,
  },
  empty: {
    type: Boolean,
    default: false,
  },
  emptyMessage: {
    type: String,
    default: null,
  },
  light: {
    type: Boolean,
    default: false,
  },
});
</script>

<template>
  <div v-if="loading" class="loading-state text-center py-4">
    <Spinner :show="true" :ligth="light" />
  </div>
  <div v-else-if="error" class="error-state">
    <Alert :show="false" :stack="error" />
  </div>
  <div v-else-if="empty" class="empty-state text-center py-4">
    <p class="text-muted">{{ emptyMessage || $t('noResults') }}</p>
  </div>
  <slot v-else />
</template>

<style scoped>
.loading-state,
.empty-state {
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
