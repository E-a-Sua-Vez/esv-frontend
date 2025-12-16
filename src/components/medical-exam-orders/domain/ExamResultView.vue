<template>
  <div class="exam-result-view">
    <div class="result-header">
      <div class="result-title">
        <h6>{{ result.examName }}</h6>
        <span class="result-date">
          <i class="bi bi-calendar me-1"></i>
          {{ formatDate(result.resultDate || result.performedAt) }}
        </span>
      </div>
      <div class="result-status">
        <span
          class="badge"
          :class="{
            'bg-warning': result.status === 'preliminary',
            'bg-success': result.status === 'final',
            'bg-info': result.status === 'corrected',
          }"
        >
          {{ getStatusLabel(result.status) }}
        </span>
      </div>
    </div>

    <!-- Alertas de valores anormales -->
    <div v-if="hasAbnormalValues" class="alerts-section">
      <div
        v-for="(alert, index) in abnormalValues"
        :key="index"
        class="alert-item"
        :class="{
          'alert-critical': alert.status === 'critical',
          'alert-warning': alert.status === 'high' || alert.status === 'low',
        }"
      >
        <i class="bi bi-exclamation-triangle me-2"></i>
        <strong>{{ alert.parameter }}:</strong>
        {{ alert.value }} {{ alert.unit }}
        <span class="alert-message"> ({{ getStatusMessage(alert) }}) </span>
      </div>
    </div>

    <!-- Valores estructurados -->
    <div v-if="result.values && result.values.length > 0" class="values-section">
      <h6 class="section-title">Valores del Examen</h6>
      <div class="values-table">
        <table class="table table-sm">
          <thead>
            <tr>
              <th>Parámetro</th>
              <th>Valor</th>
              <th>Unidad</th>
              <th>Rango Normal</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="(value, index) in result.values"
              :key="index"
              :class="{
                'table-danger': value.status === 'critical',
                'table-warning': value.status === 'high' || value.status === 'low',
                'table-success': value.status === 'normal',
              }"
            >
              <td>
                <strong>{{ value.parameter }}</strong>
              </td>
              <td>{{ value.value }}</td>
              <td>{{ value.unit }}</td>
              <td>{{ value.referenceRange || '-' }}</td>
              <td>
                <span
                  class="badge"
                  :class="{
                    'bg-success': value.status === 'normal',
                    'bg-warning': value.status === 'high' || value.status === 'low',
                    'bg-danger': value.status === 'critical',
                  }"
                >
                  {{ getStatusLabel(value.status) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Gráfico de evolución (si hay múltiples resultados) -->
      <div v-if="historicalResults && historicalResults.length > 1" class="chart-section mt-4">
        <h6 class="section-title">Evolución de Valores</h6>
        <div class="chart-container">
          <canvas ref="chartCanvas"></canvas>
        </div>
      </div>
    </div>

    <!-- Observaciones -->
    <div v-if="result.observations" class="observations-section mt-3">
      <h6 class="section-title">
        <i class="bi bi-chat-left-text"></i>
        Observaciones
      </h6>
      <p class="observations-text">{{ result.observations }}</p>
    </div>

    <!-- Documentos adjuntos -->
    <div v-if="result.documents && result.documents.length > 0" class="documents-section mt-3">
      <h6 class="section-title">Documentos Adjuntos</h6>
      <div class="documents-list">
        <a
          v-for="(doc, index) in result.documents"
          :key="index"
          :href="doc"
          target="_blank"
          class="document-link"
        >
          <i class="bi bi-file-earmark-pdf me-2"></i>
          Documento {{ index + 1 }}
          <i class="bi bi-box-arrow-up-right ms-2"></i>
        </a>
      </div>
    </div>

    <!-- Comparación con valores anteriores -->
    <div v-if="previousResult && result.values" class="comparison-section mt-4">
      <h6 class="section-title">
        <i class="bi bi-arrow-left-right"></i>
        Comparación con Resultado Anterior
      </h6>
      <div class="comparison-table">
        <table class="table table-sm table-bordered">
          <thead>
            <tr>
              <th>Parámetro</th>
              <th>Anterior</th>
              <th>Actual</th>
              <th>Variación</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(currentValue, index) in result.values" :key="index">
              <td>
                <strong>{{ currentValue.parameter }}</strong>
              </td>
              <td>
                <span v-if="getPreviousValue(currentValue.parameter)">
                  {{ getPreviousValue(currentValue.parameter).value }}
                  {{ getPreviousValue(currentValue.parameter).unit }}
                </span>
                <span v-else class="text-muted">-</span>
              </td>
              <td>{{ currentValue.value }} {{ currentValue.unit }}</td>
              <td>
                <span
                  v-if="getVariation(currentValue)"
                  :class="{
                    'text-success': getVariation(currentValue) > 0,
                    'text-danger': getVariation(currentValue) < 0,
                    'text-muted': getVariation(currentValue) === 0,
                  }"
                >
                  <i
                    :class="{
                      'bi bi-arrow-up': getVariation(currentValue) > 0,
                      'bi bi-arrow-down': getVariation(currentValue) < 0,
                      'bi bi-dash': getVariation(currentValue) === 0,
                    }"
                  ></i>
                  {{ Math.abs(getVariation(currentValue)).toFixed(1) }}%
                </span>
                <span v-else class="text-muted">-</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { Chart, registerables } from 'chart.js';
import { getDate } from '../../../shared/utils/date';
import { compareExamResult } from '../../../application/services/medical-exam-order';

Chart.register(...registerables);

export default {
  name: 'ExamResultView',
  props: {
    result: {
      type: Object,
      required: true,
    },
    historicalResults: {
      type: Array,
      default: () => [],
    },
    previousResult: {
      type: Object,
      default: null,
    },
  },
  setup(props) {
    const chartCanvas = ref(null);
    let chartInstance = null;

    const hasAbnormalValues = computed(() => {
      if (!props.result.values) return false;
      return props.result.values.some(v => v.status && v.status !== 'normal');
    });

    const abnormalValues = computed(() => {
      if (!props.result.values) return [];
      return props.result.values.filter(v => v.status && v.status !== 'normal');
    });

    const formatDate = date => {
      if (!date) return '';
      return getDate(date);
    };

    const getStatusLabel = status => {
      const labels = {
        normal: 'Normal',
        high: 'Alto',
        low: 'Bajo',
        critical: 'Crítico',
        preliminary: 'Preliminar',
        final: 'Final',
        corrected: 'Corregido',
      };
      return labels[status] || status;
    };

    const getStatusMessage = value => {
      if (value.status === 'critical') {
        return 'Valor crítico - requiere atención inmediata';
      }
      if (value.status === 'high') {
        return `Valor por encima del rango normal (${value.referenceRange})`;
      }
      if (value.status === 'low') {
        return `Valor por debajo del rango normal (${value.referenceRange})`;
      }
      return '';
    };

    const getPreviousValue = parameter => {
      if (!props.previousResult || !props.previousResult.values) return null;
      return props.previousResult.values.find(v => v.parameter === parameter);
    };

    const getVariation = currentValue => {
      const previous = getPreviousValue(currentValue.parameter);
      if (!previous) return null;

      const current = parseFloat(currentValue.value);
      const prev = parseFloat(previous.value);

      if (isNaN(current) || isNaN(prev) || prev === 0) return null;

      return ((current - prev) / prev) * 100;
    };

    const renderChart = () => {
      if (!chartCanvas.value || !props.historicalResults || props.historicalResults.length < 2) {
        return;
      }

      if (chartInstance) {
        chartInstance.destroy();
      }

      // Agrupar valores por parámetro
      const parameters = new Set();
      props.historicalResults.forEach(result => {
        if (result.values) {
          result.values.forEach(v => parameters.add(v.parameter));
        }
      });

      const datasets = Array.from(parameters).map((param, index) => {
        const data = props.historicalResults.map(result => {
          const value = result.values?.find(v => v.parameter === param);
          return value ? parseFloat(value.value) : null;
        });

        const colors = [
          'rgb(68, 111, 252)',
          'rgb(255, 99, 132)',
          'rgb(75, 192, 192)',
          'rgb(255, 205, 86)',
          'rgb(153, 102, 255)',
        ];

        return {
          label: param,
          data,
          borderColor: colors[index % colors.length],
          backgroundColor: colors[index % colors.length] + '40',
          tension: 0.1,
        };
      });

      const labels = props.historicalResults.map(r => formatDate(r.resultDate || r.performedAt));

      chartInstance = new Chart(chartCanvas.value, {
        type: 'line',
        data: {
          labels,
          datasets,
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
            },
            title: {
              display: true,
              text: 'Evolución de Valores',
            },
          },
          scales: {
            y: {
              beginAtZero: false,
            },
          },
        },
      });
    };

    onMounted(() => {
      if (props.historicalResults && props.historicalResults.length > 1) {
        setTimeout(() => renderChart(), 100);
      }
    });

    watch(
      () => props.historicalResults,
      () => {
        if (props.historicalResults && props.historicalResults.length > 1) {
          setTimeout(() => renderChart(), 100);
        }
      }
    );

    return {
      chartCanvas,
      hasAbnormalValues,
      abnormalValues,
      formatDate,
      getStatusLabel,
      getStatusMessage,
      getPreviousValue,
      getVariation,
    };
  },
};
</script>

<style scoped>
@import '../../../shared/styles/prontuario-common.css';

.exam-result-view {
  background: white;
  border-radius: var(--border-radius-md);
  padding: 1.5rem;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-sm);
}

.result-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(68, 111, 252, 0.2);
  flex-wrap: wrap;
  gap: 1rem;
}

.result-title h6 {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
}

.result-date {
  font-size: 0.85rem;
  color: #666;
  display: block;
  margin-top: 0.25rem;
}

.alerts-section {
  margin-bottom: 1.5rem;
}

.alert-item {
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
}

.alert-critical {
  background: rgba(220, 53, 69, 0.1);
  border-left: 4px solid #dc3545;
  color: #721c24;
}

.alert-warning {
  background: rgba(255, 193, 7, 0.1);
  border-left: 4px solid #ffc107;
  color: #856404;
}

.alert-message {
  margin-left: 0.5rem;
  font-size: 0.9rem;
  opacity: 0.8;
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--color-text);
  display: flex;
  align-items: center;
}

.section-title i {
  margin-right: 0.5rem;
  color: var(--azul-turno);
}

.values-table {
  overflow-x: auto;
  border-radius: var(--border-radius-md);
  box-shadow: var(--shadow-sm);
}

.values-table .table {
  margin-bottom: 0;
}

.values-table .table thead {
  background: var(--gradient-primary);
  color: white;
}

.values-table .table thead th {
  border: none;
  font-weight: 600;
  font-size: 0.875rem;
}

.values-table .table tbody tr {
  transition: all 0.2s ease;
}

.values-table .table tbody tr:hover {
  background: rgba(68, 111, 252, 0.05);
}

.chart-section {
  margin-top: 2rem;
}

.chart-container {
  position: relative;
  height: 300px;
  margin-top: 1rem;
}

.observations-text,
.interpretation-text,
.comparison-notes-text {
  padding: 1rem;
  background: rgba(0, 0, 0, 0.02);
  border-radius: var(--border-radius-md);
  margin: 0;
  line-height: 1.6;
  color: var(--color-text);
  border-left: 3px solid var(--azul-turno);
}

.interpretation-section,
.comparison-notes-section {
  margin-top: 1.5rem;
}

.documents-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.document-link {
  display: inline-flex;
  align-items: center;
  padding: 0.75rem 1rem;
  background: rgba(68, 111, 252, 0.1);
  border-radius: var(--border-radius-md);
  color: var(--azul-turno);
  text-decoration: none;
  transition: all 0.2s ease;
  border: 1px solid rgba(68, 111, 252, 0.2);
}

.document-link:hover {
  background: rgba(68, 111, 252, 0.15);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
  background: rgba(68, 111, 252, 0.2);
  transform: translateX(4px);
}

.comparison-table {
  overflow-x: auto;
}
</style>
