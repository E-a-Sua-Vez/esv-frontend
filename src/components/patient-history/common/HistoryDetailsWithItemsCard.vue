<script>
import { getDate } from '../../../shared/utils/date';

export default {
  name: 'HistoryDetailsWithItemsCard',
  props: {
    show: { type: Boolean, default: false },
    content: { type: String, default: undefined },
    details: { type: Object, default: {} },
    date: { type: String, default: '' },
  },
  data() {
    return {};
  },
  methods: {
    getDate(date) {
      return getDate(date);
    },
  },
};
</script>

<template>
  <div v-if="show" class="history-card-modern history-card-with-items">
    <div class="history-card-header">
      <div class="history-card-date-badge" v-if="date">
        <i class="bi bi-calendar3 me-1"></i>
        <span>{{ getDate(date) }}</span>
      </div>
    </div>
    <div v-if="Object.keys(details).length > 0" class="history-card-items">
      <div class="history-items-grid">
        <div v-for="(item, index) in Object.keys(details)" :key="index" class="history-item-badge">
          <span class="history-item-label">{{ details[item].name }}</span>
          <span class="history-item-value">{{ details[item].value }}</span>
        </div>
      </div>
    </div>
    <div class="history-card-content" v-if="content">
      <p class="history-card-text">{{ content }}</p>
    </div>
  </div>
</template>

<style scoped>
.history-card-modern.history-card-with-items {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.98) 100%);
  padding: 1rem;
  margin: 0.75rem 0;
  border-radius: 0.75rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.history-card-modern.history-card-with-items::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
}

.history-card-modern.history-card-with-items:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: rgba(0, 0, 0, 0.12);
}

.history-card-header {
  display: flex;
  align-items: center;
  margin-bottom: 0.5rem;
}

.history-card-date-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.5rem;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  border-radius: 0.75rem;
  font-size: 0.7rem;
  font-weight: 600;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
  line-height: 1.2;
}

.history-card-items {
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.history-items-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.history-item-badge {
  display: inline-flex;
  flex-direction: column;
  padding: 0.3rem 0.5rem;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 0.4rem;
  border: 1px solid rgba(0, 0, 0, 0.05);
  min-width: 100px;
  line-height: 1.3;
}

.history-item-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--color-text);
  opacity: 0.7;
  margin-bottom: 0.15rem;
}

.history-item-value {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--azul-turno);
}

.history-card-content {
  padding-left: 0.25rem;
}

.history-card-text {
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--color-text);
  margin: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}
</style>
