<template>
  <div class="patient-evolution-view">
    <div class="evolution-header">
      <div class="form-header-modern">
        <div class="form-header-icon">
          <i class="bi bi-graph-up-arrow"></i>
        </div>
        <div class="form-header-content">
          <h3 class="form-header-title">Evolución del Paciente</h3>
          <p class="form-header-subtitle">Visualización cronológica y gráficos de evolución</p>
        </div>
      </div>
      <div class="evolution-header-actions">
        <select v-model="selectedView" class="form-select form-select-sm" style="max-width: 200px">
          <option value="timeline">Timeline</option>
          <option value="charts">Gráficos</option>
          <option value="both">Ambos</option>
        </select>
        <button
          type="button"
          class="btn btn-sm btn-outline-primary ms-2"
          @click="refreshData"
          :disabled="loading"
        >
          <i class="bi bi-arrow-clockwise" :class="{ spinning: loading }"></i>
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-5">
      <Spinner />
    </div>

    <div v-else-if="evolutionData.length === 0" class="empty-state">
      <Message
        title="No hay datos de evolución"
        content="Aún no se han registrado datos de evolución para este paciente"
      />
    </div>

    <div v-else>
      <!-- Timeline View -->
      <div
        v-if="selectedView === 'timeline' || selectedView === 'both'"
        class="evolution-timeline-section"
      >
        <h5 class="section-title">
          <i class="bi bi-clock-history me-2"></i>
          Timeline de Evolución
        </h5>
        <div class="timeline-container">
          <div
            v-for="(item, index) in sortedEvolutionData"
            :key="item._stableKey || `evolution-${index}-${item.date}`"
            class="timeline-item"
          >
            <div class="timeline-marker" :class="getTypeClass(item.type)">
              <i :class="getTypeIcon(item.type)"></i>
            </div>
            <div class="timeline-content">
              <div class="timeline-header">
                <span class="timeline-date">{{ formatDate(item.date) }}</span>
                <span class="timeline-type-badge" :class="getTypeClass(item.type)">
                  {{ getTypeLabel(item.type) }}
                </span>
              </div>
              <div class="timeline-body">
                <div v-if="item.cie10Code" class="timeline-cie10">
                  <span class="badge bg-info">{{ item.cie10Code }}</span>
                </div>
                <p v-if="item.content" class="timeline-text">{{ item.content }}</p>

                <!-- Physical Exam Values -->
                <div
                  v-if="
                    (item.type === 'physical_exam' || item.type === 'physicalExam') &&
                    (item.examDetails || item.metadata?.examDetails)
                  "
                  class="timeline-physical-exam"
                >
                  <div
                    v-for="(detail, detailKey) in item.examDetails ||
                    item.metadata?.examDetails ||
                    {}"
                    :key="detailKey"
                    class="physical-exam-item"
                  >
                    <div
                      v-if="
                        detail &&
                        typeof detail === 'object' &&
                        detail.value !== undefined &&
                        detail.value !== null &&
                        detail.value !== ''
                      "
                      class="physical-exam-value"
                    >
                      <strong>{{ detail.name || detail.label || detailKey }}:</strong>
                      <span>{{ detail.value }}</span>
                      <span v-if="detail.unit" class="physical-exam-unit">{{ detail.unit }}</span>
                    </div>
                    <div
                      v-else-if="detail && typeof detail === 'object' && detail.active"
                      class="physical-exam-check"
                    >
                      <i class="bi bi-check-circle text-success"></i>
                      <span>{{ detail.name || detail.label || detailKey }}</span>
                    </div>
                    <div
                      v-else-if="
                        detail && typeof detail !== 'object' && detail !== null && detail !== ''
                      "
                      class="physical-exam-value"
                    >
                      <strong>{{ detailKey }}:</strong>
                      <span>{{ detail }}</span>
                    </div>
                  </div>
                </div>

                <div v-if="item.doctorName" class="timeline-doctor">
                  <i class="bi bi-person-circle me-1"></i>
                  {{ item.doctorName }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Charts View -->
      <div
        v-if="selectedView === 'charts' || selectedView === 'both'"
        class="evolution-charts-section"
      >
        <h5 class="section-title">
          <i class="bi bi-bar-chart me-2"></i>
          Gráficos de Evolución
        </h5>
        <div class="charts-grid">
          <!-- Diagnósticos por Fecha -->
          <div class="chart-card" v-if="diagnosticsChartData">
            <h6 class="chart-title">Diagnósticos en el Tiempo</h6>
            <LineChart :chart-data="diagnosticsChartData" :options="chartOptions" />
          </div>

          <!-- Tipos de Registros -->
          <div class="chart-card" v-if="typesChartData">
            <h6 class="chart-title">Distribución por Tipo</h6>
            <DoughnutChart :chart-data="typesChartData" :options="doughnutOptions" />
          </div>

          <!-- Evolución Mensual -->
          <div class="chart-card" v-if="monthlyChartData">
            <h6 class="chart-title">Registros por Mes</h6>
            <BarChart :chart-data="monthlyChartData" :options="chartOptions" />
          </div>
        </div>

        <!-- Physical Exam Evolution Charts -->
        <div
          v-if="physicalExamChartsData && physicalExamChartsData.length > 0"
          class="physical-exam-charts-section"
        >
          <h5 class="section-title mt-4">
            <i class="bi bi-heart-pulse me-2"></i>
            Evolución del Examen Físico
          </h5>
          <p class="section-subtitle mb-3">
            Gráficos de evolución de los valores numéricos registrados en los exámenes físicos
          </p>
          <div class="charts-grid">
            <div
              v-for="chartData in physicalExamChartsData"
              :key="chartData.parameter"
              class="chart-card"
            >
              <h6 class="chart-title">
                <i class="bi bi-graph-up me-2"></i>
                {{ chartData.parameter }}
              </h6>
              <LineChart :chart-data="chartData.data" :options="physicalExamChartOptions" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import { LineChart, DoughnutChart, BarChart } from 'vue-chart-3';
import { Chart, registerables } from 'chart.js';
import Spinner from '../../common/Spinner.vue';
import Message from '../../common/Message.vue';
import { getDate } from '../../../shared/utils/date';
import { advancedSearch } from '../../../application/services/patient-history';

Chart.register(...registerables);

export default {
  name: 'PatientEvolutionView',
  components: {
    LineChart,
    DoughnutChart,
    BarChart,
    Spinner,
    Message,
  },
  props: {
    clientId: {
      type: String,
      required: true,
    },
    commerceId: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const loading = ref(false);
    const evolutionData = ref([]);
    const selectedView = ref('both');

    const loadEvolutionData = async () => {
      if (!props.clientId || !props.commerceId) return;

      try {
        loading.value = true;
        const result = await advancedSearch({
          clientId: props.clientId,
          commerceId: props.commerceId,
          sortBy: 'date',
          sortOrder: 'desc',
          limit: 100,
        });
        evolutionData.value = result.items || [];
      } catch (error) {
        console.error('Error loading evolution data:', error);
        evolutionData.value = [];
      } finally {
        loading.value = false;
      }
    };

    const refreshData = () => {
      loadEvolutionData();
    };

    const sortedEvolutionData = computed(() => {
      const sorted = [...evolutionData.value].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      // Create stable keys based on item properties, not index
      return sorted.map((item, index) => {
        // Use id if available, otherwise create a unique key from item properties
        const stableKey =
          item.id ||
          `${item.date || ''}-${item.type || ''}-${item.cie10Code || ''}-${
            item.content?.substring(0, 20) || ''
          }-${index}`;
        return {
          ...item,
          _stableKey: stableKey,
        };
      });
    });

    const formatDate = date => {
      if (!date) return '';
      return getDate(date);
    };

    const getTypeClass = type => {
      const classes = {
        diagnostic: 'type-diagnostic',
        anamnesis: 'type-anamnesis',
        evolution: 'type-evolution',
        prescription: 'type-prescription',
        exam_order: 'type-exam',
        reference: 'type-reference',
        consultation_reason: 'type-consultation',
        physical_exam: 'type-physical',
        functional_exam: 'type-functional',
        current_illness: 'type-illness',
        control: 'type-control',
        medical_order: 'type-order',
      };
      return classes[type] || 'type-default';
    };

    const getTypeIcon = type => {
      const icons = {
        diagnostic: 'bi-file-medical',
        anamnesis: 'bi-clipboard-data',
        evolution: 'bi-arrow-repeat',
        prescription: 'bi-prescription',
        exam_order: 'bi-clipboard-check',
        reference: 'bi-arrow-right-circle',
        consultation_reason: 'bi-chat-dots',
        physical_exam: 'bi-heart-pulse',
        functional_exam: 'bi-activity',
        current_illness: 'bi-thermometer',
        control: 'bi-calendar-check',
        medical_order: 'bi-file-earmark-medical',
      };
      return icons[type] || 'bi-circle';
    };

    const getTypeLabel = type => {
      const labels = {
        diagnostic: 'Diagnóstico',
        anamnesis: 'Anamnesis',
        evolution: 'Evolución',
        prescription: 'Receta',
        exam_order: 'Examen',
        reference: 'Referencia',
        consultation_reason: 'Motivo',
        physical_exam: 'Examen Físico',
        functional_exam: 'Examen Funcional',
        current_illness: 'Enfermedad Actual',
        control: 'Control',
        medical_order: 'Orden Médica',
      };
      return labels[type] || type;
    };

    // Preparar datos para gráficos
    const diagnosticsChartData = computed(() => {
      const diagnostics = evolutionData.value.filter(item => item.type === 'diagnostic');
      if (diagnostics.length === 0) return null;

      const dates = diagnostics.map(d => new Date(d.date).toLocaleDateString('pt-BR'));
      const uniqueDates = [...new Set(dates)];

      return {
        labels: uniqueDates,
        datasets: [
          {
            label: 'Diagnósticos',
            data: uniqueDates.map(
              date =>
                diagnostics.filter(d => new Date(d.date).toLocaleDateString('pt-BR') === date)
                  .length
            ),
            borderColor: '#446ffc',
            backgroundColor: 'rgba(68, 111, 252, 0.1)',
            tension: 0.4,
          },
        ],
      };
    });

    const typesChartData = computed(() => {
      const typeCounts = {};
      evolutionData.value.forEach(item => {
        typeCounts[item.type] = (typeCounts[item.type] || 0) + 1;
      });

      const colors = [
        '#446ffc',
        '#2f407a',
        '#7c91d9',
        '#0e2678',
        '#b1bde6',
        '#28a745',
        '#ffc107',
        '#dc3545',
      ];

      return {
        labels: Object.keys(typeCounts).map(type => getTypeLabel(type)),
        datasets: [
          {
            data: Object.values(typeCounts),
            backgroundColor: colors.slice(0, Object.keys(typeCounts).length),
          },
        ],
      };
    });

    const monthlyChartData = computed(() => {
      const monthlyCounts = {};
      evolutionData.value.forEach(item => {
        const date = new Date(item.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyCounts[monthKey] = (monthlyCounts[monthKey] || 0) + 1;
      });

      const sortedMonths = Object.keys(monthlyCounts).sort();
      const monthLabels = sortedMonths.map(month => {
        const [year, monthNum] = month.split('-');
        const date = new Date(parseInt(year), parseInt(monthNum) - 1);
        return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
      });

      return {
        labels: monthLabels,
        datasets: [
          {
            label: 'Registros',
            data: sortedMonths.map(month => monthlyCounts[month]),
            backgroundColor: '#446ffc',
          },
        ],
      };
    });

    // Physical Exam Evolution Charts
    const physicalExamChartsData = computed(() => {
      // Filter physical exams and extract examDetails from item or metadata
      const physicalExams = evolutionData.value
        .filter(item => item.type === 'physical_exam' || item.type === 'physicalExam')
        .map(item => {
          // Try to get examDetails from item directly, or from metadata
          const examDetails = item.examDetails || item.metadata?.examDetails;
          if (!examDetails) return null;

          return {
            ...item,
            examDetails,
            date: item.date || item.metadata?.createdAt || new Date(),
          };
        })
        .filter(item => item !== null && item.examDetails);

      if (physicalExams.length === 0) return [];

      // Collect all parameters with numeric values
      const parameterData = {};

      physicalExams.forEach(exam => {
        const examDate = exam.date ? new Date(exam.date).toLocaleDateString('pt-BR') : '';
        if (!exam.examDetails) return;

        // Handle examDetails as object or array
        const detailsObj = exam.examDetails;

        Object.entries(detailsObj).forEach(([key, detail]) => {
          // Handle both object format {value, name, active} and direct values
          let value = null;
          let name = key;

          if (detail && typeof detail === 'object') {
            value = detail.value;
            name = detail.name || detail.label || key;
          } else if (detail !== null && detail !== undefined && detail !== '') {
            // Direct numeric value
            value = detail;
          }

          if (value !== null && value !== undefined && value !== '') {
            const numericValue = parseFloat(value);
            if (!isNaN(numericValue)) {
              if (!parameterData[name]) {
                parameterData[name] = [];
              }
              parameterData[name].push({
                date: examDate,
                value: numericValue,
                timestamp: new Date(exam.date).getTime(),
              });
            }
          }
        });
      });

      // Convert to chart data format, sorted by date
      return Object.entries(parameterData)
        .filter(([_, data]) => data.length > 0)
        .map(([parameter, data]) => {
          // Sort by timestamp
          data.sort((a, b) => a.timestamp - b.timestamp);

          const colors = [
            '#446ffc',
            '#28a745',
            '#ffc107',
            '#dc3545',
            '#6f42c1',
            '#fd7e14',
            '#17a2b8',
            '#20c997',
          ];
          const colorIndex = Object.keys(parameterData).indexOf(parameter) % colors.length;

          return {
            parameter,
            data: {
              labels: data.map(d => d.date),
              datasets: [
                {
                  label: parameter,
                  data: data.map(d => d.value),
                  borderColor: colors[colorIndex],
                  backgroundColor: colors[colorIndex] + '20',
                  tension: 0.4,
                  fill: true,
                },
              ],
            },
          };
        });
    });

    const physicalExamChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
        },
        tooltip: {
          callbacks: {
            label(context) {
              return `${context.dataset.label}: ${context.parsed.y}`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: false,
          title: {
            display: true,
            text: 'Valor',
          },
        },
        x: {
          title: {
            display: true,
            text: 'Fecha',
          },
        },
      },
    };

    const chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
        },
      },
    };

    const doughnutOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'right',
        },
      },
    };

    onMounted(() => {
      loadEvolutionData();
    });

    return {
      loading,
      evolutionData,
      selectedView,
      sortedEvolutionData,
      formatDate,
      getTypeClass,
      getTypeIcon,
      getTypeLabel,
      diagnosticsChartData,
      typesChartData,
      monthlyChartData,
      physicalExamChartsData,
      chartOptions,
      doughnutOptions,
      physicalExamChartOptions,
      refreshData,
    };
  },
};
</script>

<style scoped>
@import '../../../shared/styles/prontuario-common.css';

.patient-evolution-view {
  width: 100%;
}

.evolution-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  gap: 1rem;
}

@media (max-width: 768px) {
  .evolution-header {
    flex-direction: column;
    align-items: flex-start;
  }
}

.evolution-header-actions {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.empty-state {
  padding: 3rem;
  text-align: center;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #333;
}

.evolution-timeline-section {
  margin-bottom: 2rem;
}

.timeline-container {
  position: relative;
  padding-left: 2rem;
}

.timeline-container::before {
  content: '';
  position: absolute;
  left: 15px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(180deg, #446ffc 0%, #2f407a 100%);
}

.timeline-item {
  position: relative;
  margin-bottom: 2rem;
  display: flex;
  align-items: flex-start;
}

.timeline-marker {
  position: absolute;
  left: -2rem;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 0.875rem;
  z-index: 1;
  border: 3px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.timeline-marker.type-diagnostic {
  background: #dc3545;
}

.timeline-marker.type-anamnesis {
  background: #17a2b8;
}

.timeline-marker.type-evolution {
  background: #28a745;
}

.timeline-marker.type-prescription {
  background: #ffc107;
}

.timeline-marker.type-exam {
  background: #6f42c1;
}

.timeline-marker.type-reference {
  background: #fd7e14;
}

.timeline-marker.type-physical {
  background: #17a2b8;
}

.timeline-marker.type-functional {
  background: #6f42c1;
}

.timeline-marker.type-illness {
  background: #fd7e14;
}

.timeline-marker.type-order {
  background: #20c997;
}

.timeline-marker.type-control {
  background: #ffc107;
}

.timeline-marker.type-consultation {
  background: #6c757d;
}

.timeline-marker.type-default {
  background: #6c757d;
}

.timeline-content {
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 0.5rem;
  padding: 1rem;
  margin-left: 1rem;
  flex: 1;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.timeline-date {
  font-weight: 600;
  color: #666;
  font-size: 0.9rem;
}

.timeline-type-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
}

.timeline-body {
  color: #333;
}

.timeline-cie10 {
  margin-bottom: 0.5rem;
}

.timeline-text {
  margin: 0.5rem 0;
  line-height: 1.6;
}

.timeline-doctor {
  font-size: 0.85rem;
  color: #666;
  margin-top: 0.5rem;
}

.timeline-physical-exam {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}

.physical-exam-item {
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.physical-exam-value {
  font-size: 0.9rem;
  color: #333;
}

.physical-exam-value strong {
  color: #446ffc;
  margin-right: 0.5rem;
}

.physical-exam-check {
  font-size: 0.9rem;
  color: #28a745;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.physical-exam-unit {
  font-size: 0.85rem;
  color: #666;
  margin-left: 0.25rem;
  font-style: italic;
}

.section-subtitle {
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 1rem;
}

.physical-exam-charts-section {
  margin-top: 2rem;
}

.evolution-charts-section {
  margin-top: 2rem;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
}

.chart-card {
  background: white;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
  transition: all 0.3s ease;
}

.chart-card:hover {
  box-shadow: var(--shadow-md);
}

.chart-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #333;
}

.chart-card > div {
  height: 250px;
}
</style>
