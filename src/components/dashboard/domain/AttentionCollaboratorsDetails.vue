<script>
export default {
  name: 'AttentionCollaboratorsDetails',
  props: {
    show: { type: Boolean, default: true },
    collaborators: { type: Array, default: [] },
    limit: { type: Number, default: 10 },
  },
  data() {
    return {
      sortBy: 'attention_counter', // attention_counter, avg_duration, avg_rating, efficiency_score
      sortOrder: 'desc',
    };
  },
  computed: {
    sortedCollaborators() {
      if (!this.collaborators || this.collaborators.length === 0) return [];

      const sorted = [...this.collaborators].sort((a, b) => {
        const aVal = a[this.sortBy] || 0;
        const bVal = b[this.sortBy] || 0;

        if (this.sortOrder === 'desc') {
          return bVal - aVal;
        }
        return aVal - bVal;
      });

      return sorted.slice(0, this.limit);
    },
    averageMetrics() {
      if (!this.collaborators || this.collaborators.length === 0) {
        return { attentions: 0, duration: 0, rating: 0 };
      }

      const totalAttentions = this.collaborators.reduce((sum, c) => sum + (c.attention_counter || 0), 0);
      const totalDuration = this.collaborators.reduce((sum, c) => sum + (c.avg_duration || 0), 0);
      const totalRating = this.collaborators.reduce((sum, c) => sum + (c.avg_rating || 0), 0);
      const count = this.collaborators.length;

      return {
        attentions: count > 0 ? Math.round(totalAttentions / count) : 0,
        duration: count > 0 ? parseFloat((totalDuration / count).toFixed(2)) : 0,
        rating: count > 0 ? parseFloat((totalRating / count).toFixed(2)) : 0,
      };
    },
  },
  methods: {
    formatDuration(minutes) {
      if (!minutes || minutes === 0) return 'N/A';
      const hours = Math.floor(minutes / 60);
      const mins = Math.round(minutes % 60);
      if (hours > 0) {
        return `${hours}h ${mins}min`;
      }
      return `${mins} min`;
    },
    formatRating(rating) {
      if (!rating || rating === 0) return 'N/A';
      return rating.toFixed(1);
    },
    getPerformanceClass(vsAverage) {
      if (vsAverage > 10) return 'performance-excellent';
      if (vsAverage > 0) return 'performance-good';
      if (vsAverage > -10) return 'performance-neutral';
      return 'performance-poor';
    },
    getPerformanceIcon(vsAverage) {
      if (vsAverage > 10) return 'bi-arrow-up-circle-fill';
      if (vsAverage > 0) return 'bi-arrow-up-circle';
      if (vsAverage > -10) return 'bi-dash-circle';
      return 'bi-arrow-down-circle';
    },
    getRatingClass(rating) {
      if (!rating || rating === 0) return 'rating-neutral';
      if (rating >= 4.5) return 'rating-excellent';
      if (rating >= 4) return 'rating-good';
      if (rating >= 3) return 'rating-warning';
      return 'rating-poor';
    },
    changeSort(field) {
      if (this.sortBy === field) {
        this.sortOrder = this.sortOrder === 'desc' ? 'asc' : 'desc';
      } else {
        this.sortBy = field;
        this.sortOrder = 'desc';
      }
    },
    getSortIcon(field) {
      if (this.sortBy !== field) return 'bi-arrow-down-up';
      return this.sortOrder === 'desc' ? 'bi-arrow-down' : 'bi-arrow-up';
    },
  },
};
</script>

<template>
  <div v-if="show" class="collaborators-performance">
    <div v-if="collaborators && collaborators.length > 0">
      <!-- Summary Stats -->
      <div class="collaborators-summary">
        <div class="summary-stat">
          <div class="summary-stat-label">{{ $t('dashboard.collaborators.total') || 'Total Colaboradores' }}</div>
          <div class="summary-stat-value">{{ collaborators.length }}</div>
        </div>
        <div class="summary-stat">
          <div class="summary-stat-label">{{ $t('dashboard.collaborators.avgAttentions') || 'Promedio Atenciones' }}</div>
          <div class="summary-stat-value">{{ averageMetrics.attentions }}</div>
        </div>
        <div class="summary-stat">
          <div class="summary-stat-label">{{ $t('dashboard.collaborators.avgDuration') || 'Tiempo Promedio' }}</div>
          <div class="summary-stat-value">{{ formatDuration(averageMetrics.duration) }}</div>
        </div>
        <div class="summary-stat">
          <div class="summary-stat-label">{{ $t('dashboard.collaborators.avgRating') || 'Rating Promedio' }}</div>
          <div class="summary-stat-value">{{ formatRating(averageMetrics.rating) }}</div>
        </div>
      </div>

      <!-- Sort Controls -->
      <div class="collaborators-sort">
        <span class="sort-label">{{ $t('dashboard.collaborators.sortBy') || 'Ordenar por:' }}</span>
        <button
          @click="changeSort('attention_counter')"
          class="sort-btn"
          :class="{ active: sortBy === 'attention_counter' }"
        >
          <i :class="getSortIcon('attention_counter')"></i>
          {{ $t('dashboard.collaborators.sort.attentions') || 'Atenciones' }}
        </button>
        <button
          @click="changeSort('avg_duration')"
          class="sort-btn"
          :class="{ active: sortBy === 'avg_duration' }"
        >
          <i :class="getSortIcon('avg_duration')"></i>
          {{ $t('dashboard.collaborators.sort.duration') || 'Duración' }}
        </button>
        <button
          @click="changeSort('avg_rating')"
          class="sort-btn"
          :class="{ active: sortBy === 'avg_rating' }"
        >
          <i :class="getSortIcon('avg_rating')"></i>
          {{ $t('dashboard.collaborators.sort.rating') || 'Rating' }}
        </button>
        <button
          @click="changeSort('efficiency_score')"
          class="sort-btn"
          :class="{ active: sortBy === 'efficiency_score' }"
        >
          <i :class="getSortIcon('efficiency_score')"></i>
          {{ $t('dashboard.collaborators.sort.efficiency') || 'Eficiencia' }}
        </button>
      </div>

      <!-- Collaborators List -->
      <div class="collaborators-list">
        <div
          v-for="(collaborator, index) in sortedCollaborators"
          :key="collaborator.id"
          class="collaborator-card"
          :class="{ 'top-performer': index === 0 && sortBy === 'attention_counter' }"
        >
          <div class="collaborator-header">
            <div class="collaborator-rank">
              <i :class="`bi bi-${index + 1}-circle-fill`"></i>
            </div>
            <div class="collaborator-info">
              <div class="collaborator-name">{{ collaborator.name || collaborator.alias || 'Sin nombre' }}</div>
              <div class="collaborator-alias" v-if="collaborator.alias && collaborator.name">
                {{ collaborator.alias }}
              </div>
            </div>
            <div class="collaborator-badge" v-if="index === 0 && sortBy === 'attention_counter'">
              <i class="bi bi-trophy-fill"></i>
              <span>{{ $t('dashboard.collaborators.topPerformer') || 'Top' }}</span>
            </div>
          </div>

          <div class="collaborator-metrics">
            <div class="metric-row">
              <div class="metric-item">
                <div class="metric-icon">
                  <i class="bi bi-qr-code"></i>
                </div>
                <div class="metric-content">
                  <div class="metric-label">{{ $t('dashboard.collaborators.attentions') || 'Atenciones' }}</div>
                  <div class="metric-value">{{ collaborator.attention_counter || 0 }}</div>
                  <div
                    v-if="collaborator.vs_average_attentions !== undefined"
                    class="metric-comparison"
                    :class="getPerformanceClass(collaborator.vs_average_attentions)"
                  >
                    <i :class="getPerformanceIcon(collaborator.vs_average_attentions)"></i>
                    <span>{{ Math.abs(collaborator.vs_average_attentions).toFixed(1) }}%</span>
                    <span class="vs-label">vs promedio</span>
                  </div>
                </div>
              </div>

              <div class="metric-item">
                <div class="metric-icon">
                  <i class="bi bi-clock-history"></i>
                </div>
                <div class="metric-content">
                  <div class="metric-label">{{ $t('dashboard.collaborators.avgDuration') || 'Tiempo Medio' }}</div>
                  <div class="metric-value">{{ formatDuration(collaborator.avg_duration) }}</div>
                  <div
                    v-if="collaborator.vs_average_duration !== undefined"
                    class="metric-comparison"
                    :class="getPerformanceClass(-collaborator.vs_average_duration)"
                  >
                    <i :class="getPerformanceIcon(-collaborator.vs_average_duration)"></i>
                    <span>{{ Math.abs(collaborator.vs_average_duration).toFixed(1) }}%</span>
                    <span class="vs-label">vs promedio</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="metric-row">
              <div class="metric-item" v-if="collaborator.avg_rating > 0">
                <div class="metric-icon">
                  <i class="bi bi-star-fill"></i>
                </div>
                <div class="metric-content">
                  <div class="metric-label">{{ $t('dashboard.collaborators.rating') || 'Rating' }}</div>
                  <div class="metric-value" :class="getRatingClass(collaborator.avg_rating)">
                    {{ formatRating(collaborator.avg_rating) }}
                  </div>
                  <div class="metric-stars">
                    <i
                      v-for="n in 5"
                      :key="n"
                      class="bi"
                      :class="n <= Math.round(collaborator.avg_rating) ? 'bi-star-fill' : 'bi-star'"
                    ></i>
                  </div>
                  <div
                    v-if="collaborator.vs_average_rating !== undefined && collaborator.vs_average_rating !== 0"
                    class="metric-comparison"
                    :class="getPerformanceClass(collaborator.vs_average_rating)"
                  >
                    <i :class="getPerformanceIcon(collaborator.vs_average_rating)"></i>
                    <span>{{ Math.abs(collaborator.vs_average_rating).toFixed(1) }}%</span>
                    <span class="vs-label">vs promedio</span>
                  </div>
                </div>
              </div>

              <div class="metric-item" v-if="collaborator.efficiency_score > 0">
                <div class="metric-icon">
                  <i class="bi bi-speedometer2"></i>
                </div>
                <div class="metric-content">
                  <div class="metric-label">{{ $t('dashboard.collaborators.efficiency') || 'Eficiencia' }}</div>
                  <div class="metric-value">{{ collaborator.efficiency_score.toFixed(1) }}</div>
                  <div class="metric-subtext">
                    {{ $t('dashboard.collaborators.efficiencyDesc') || 'atenciones/hora' }}
                  </div>
                </div>
              </div>

              <div class="metric-item" v-if="collaborator.surveys_count > 0">
                <div class="metric-icon">
                  <i class="bi bi-chat-heart"></i>
                </div>
                <div class="metric-content">
                  <div class="metric-label">{{ $t('dashboard.collaborators.surveys') || 'Encuestas' }}</div>
                  <div class="metric-value">{{ collaborator.surveys_count }}</div>
                  <div class="metric-subtext" v-if="collaborator.nps_score !== undefined && collaborator.nps_score !== 0">
                    NPS: {{ collaborator.nps_score > 0 ? '+' : '' }}{{ collaborator.nps_score.toFixed(1) }}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="no-data">
      <i class="bi bi-info-circle"></i>
      <span>{{ $t('dashboard.collaborators.noData') || 'No hay datos de colaboradores disponibles' }}</span>
    </div>
  </div>
</template>

<style scoped>
.collaborators-performance {
  padding: 1rem;
}

.collaborators-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.05) 0%, rgba(0, 194, 203, 0.05) 100%);
  border-radius: 12px;
  border: 1px solid rgba(0, 74, 173, 0.1);
}

.summary-stat {
  text-align: center;
}

.summary-stat-label {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.6);
  font-weight: 600;
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.summary-stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.9);
}

.collaborators-sort {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
}

.sort-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
  margin-right: 0.5rem;
}

.sort-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.4rem 0.75rem;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 6px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
  color: rgba(0, 0, 0, 0.7);
}

.sort-btn:hover {
  background: rgba(0, 74, 173, 0.05);
  border-color: rgba(0, 74, 173, 0.2);
}

.sort-btn.active {
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.1) 0%, rgba(0, 194, 203, 0.1) 100%);
  border-color: rgba(0, 74, 173, 0.3);
  color: rgba(0, 74, 173, 1);
  font-weight: 600;
}

.collaborators-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.collaborator-card {
  background: white;
  border-radius: 12px;
  padding: 1.25rem;
  border: 1px solid rgba(0, 0, 0, 0.1);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.collaborator-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.collaborator-card.top-performer {
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.1) 0%, rgba(255, 152, 0, 0.1) 100%);
  border: 2px solid rgba(255, 193, 7, 0.3);
  box-shadow: 0 4px 16px rgba(255, 193, 7, 0.2);
}

.collaborator-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(0, 0, 0, 0.05);
}

.collaborator-rank {
  font-size: 1.5rem;
  color: rgba(0, 74, 173, 0.7);
}

.collaborator-info {
  flex: 1;
}

.collaborator-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.9);
  margin-bottom: 0.25rem;
}

.collaborator-alias {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.6);
  font-style: italic;
}

.collaborator-badge {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.4rem 0.75rem;
  background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%);
  color: white;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.collaborator-metrics {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.metric-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.metric-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 8px;
}

.metric-icon {
  font-size: 1.25rem;
  color: rgba(0, 74, 173, 0.7);
  margin-top: 0.25rem;
}

.metric-content {
  flex: 1;
}

.metric-label {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.6);
  font-weight: 600;
  margin-bottom: 0.25rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.metric-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.9);
  margin-bottom: 0.25rem;
}

.metric-value.rating-excellent {
  color: #28a745;
}

.metric-value.rating-good {
  color: #ffc107;
}

.metric-value.rating-warning {
  color: #ff9800;
}

.metric-value.rating-poor {
  color: #dc3545;
}

.metric-stars {
  display: flex;
  gap: 0.1rem;
  margin-bottom: 0.25rem;
  color: #ffc107;
  font-size: 0.875rem;
}

.metric-comparison {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  margin-top: 0.25rem;
}

.metric-comparison.performance-excellent {
  color: #28a745;
}

.metric-comparison.performance-good {
  color: #6c757d;
}

.metric-comparison.performance-neutral {
  color: #ffc107;
}

.metric-comparison.performance-poor {
  color: #dc3545;
}

.vs-label {
  font-size: 0.7rem;
  color: rgba(0, 0, 0, 0.5);
  font-weight: 400;
}

.metric-subtext {
  font-size: 0.7rem;
  color: rgba(0, 0, 0, 0.5);
  margin-top: 0.25rem;
}

.no-data {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 2rem;
  color: rgba(0, 0, 0, 0.5);
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .collaborators-summary {
    grid-template-columns: repeat(2, 1fr);
  }

  .metric-row {
    grid-template-columns: 1fr;
  }

  .collaborators-sort {
    flex-direction: column;
    align-items: stretch;
  }

  .sort-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
