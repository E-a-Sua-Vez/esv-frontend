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
          <i class="bi bi-heart-pulse me-2"></i>
          Dashboard Clínico
        </h5>

        <!-- Estado de Disponibilidad de Datos -->
        <div v-if="!dataAvailabilityStatus.hasMinimumData" class="alert alert-info mb-4">
          <i class="bi bi-info-circle me-2"></i>
          <strong>Datos Limitados:</strong>
          Solo {{ dataAvailabilityStatus.available }} de {{ dataAvailabilityStatus.total }} métricas
          disponibles. Se necesitan más registros de exámenes físicos, diagnósticos y consultas para
          un análisis completo.
        </div>

        <div v-else-if="dataAvailabilityStatus.percentage < 100" class="alert alert-warning mb-4">
          <i class="bi bi-exclamation-triangle me-2"></i>
          <strong>Dashboard Parcial:</strong>
          {{ dataAvailabilityStatus.available }} de {{ dataAvailabilityStatus.total }} métricas
          disponibles ({{ dataAvailabilityStatus.percentage }}%).
        </div>

        <!-- Signos Vitales Dashboard -->
        <div v-if="vitalSignsData && vitalSignsData.length > 0" class="vital-signs-dashboard">
          <h6 class="dashboard-title">
            <i class="bi bi-activity me-2"></i>
            Signos Vitales
          </h6>
          <div class="vital-signs-grid">
            <div
              v-for="vitalSign in vitalSignsData"
              :key="vitalSign.parameter"
              class="vital-sign-card"
              :class="getVitalSignAlertClass(vitalSign)"
            >
              <div class="vital-sign-header">
                <h6 class="vital-sign-title">
                  <i :class="getVitalSignIcon(vitalSign.parameter)" class="me-2"></i>
                  {{ vitalSign.parameter }}
                </h6>
                <div v-if="vitalSign.alert" class="alert-indicator">
                  <i class="bi bi-exclamation-triangle text-warning"></i>
                </div>
              </div>
              <div class="vital-sign-content">
                <div class="latest-value">
                  <span class="value">{{ vitalSign.latestValue }}</span>
                  <span v-if="vitalSign.unit" class="unit">{{ vitalSign.unit }}</span>
                  <span class="trend-indicator">
                    <i :class="getTrendIcon(vitalSign.trend)" :title="vitalSign.trend"></i>
                  </span>
                </div>
                <div class="range-info">Normal: {{ vitalSign.normalRange }}</div>
                <LineChart
                  :chart-data="vitalSign.chartData"
                  :options="vitalSignChartOptions"
                  class="mini-chart"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Métricas de Adherencia -->
        <div v-if="adherenceMetrics" class="adherence-section">
          <h6 class="dashboard-title">
            <i class="bi bi-clipboard-check me-2"></i>
            Adherencia al Tratamiento
          </h6>
          <div class="adherence-grid">
            <div class="adherence-card">
              <h6 class="adherence-title">Asistencia a Citas</h6>
              <div class="adherence-value">
                <span class="percentage">{{ adherenceMetrics.appointmentAttendance }}%</span>
                <div class="progress">
                  <div
                    class="progress-bar"
                    :class="getAdherenceClass(adherenceMetrics.appointmentAttendance)"
                    :style="{ width: adherenceMetrics.appointmentAttendance + '%' }"
                  ></div>
                </div>
              </div>
            </div>
            <div class="adherence-card">
              <h6 class="adherence-title">Seguimiento Regular</h6>
              <div class="adherence-value">
                <span class="percentage">{{ adherenceMetrics.followUpConsistency }}%</span>
                <div class="progress">
                  <div
                    class="progress-bar"
                    :class="getAdherenceClass(adherenceMetrics.followUpConsistency)"
                    :style="{ width: adherenceMetrics.followUpConsistency + '%' }"
                  ></div>
                </div>
              </div>
            </div>
            <div class="adherence-card">
              <h6 class="adherence-title">Tiempo Entre Consultas</h6>
              <div class="adherence-value">
                <span class="metric">{{ adherenceMetrics.averageDaysBetweenVisits }} días</span>
                <small class="text-muted">Promedio</small>
              </div>
            </div>
          </div>
        </div>

        <!-- Progreso Clínico -->
        <div v-if="clinicalProgressData" class="clinical-progress-section">
          <h6 class="dashboard-title">
            <i class="bi bi-graph-up-arrow me-2"></i>
            Progreso Clínico
          </h6>
          <div class="progress-grid">
            <div class="progress-card">
              <h6 class="progress-title">Diagnósticos Activos vs Resueltos</h6>
              <DoughnutChart
                :chart-data="clinicalProgressData.diagnosisResolution"
                :options="progressChartOptions"
              />
            </div>
            <div class="progress-card">
              <h6 class="progress-title">Evolución de Diagnósticos</h6>
              <LineChart
                :chart-data="clinicalProgressData.diagnosisEvolution"
                :options="progressLineOptions"
              />
            </div>
            <div class="progress-card">
              <h6 class="progress-title">Frecuencia de Consultas</h6>
              <BarChart
                :chart-data="clinicalProgressData.consultationFrequency"
                :options="progressBarOptions"
              />
            </div>
          </div>
        </div>

        <!-- Eventos Críticos Timeline -->
        <div v-if="criticalEvents && criticalEvents.length > 0" class="critical-events-section">
          <h6 class="dashboard-title">
            <i class="bi bi-exclamation-triangle me-2"></i>
            Eventos Críticos Recientes
          </h6>
          <div class="critical-events-timeline">
            <div
              v-for="event in criticalEvents"
              :key="event.id"
              class="critical-event-item"
              :class="getCriticalEventClass(event.severity)"
            >
              <div class="event-marker">
                <i :class="getCriticalEventIcon(event.type)"></i>
              </div>
              <div class="event-content">
                <div class="event-header">
                  <span class="event-type">{{ event.type }}</span>
                  <span class="event-date">{{ formatDate(event.date) }}</span>
                </div>
                <div class="event-description">{{ event.description }}</div>
                <div v-if="event.outcome" class="event-outcome">
                  <i class="bi bi-arrow-right me-1"></i>
                  {{ event.outcome }}
                </div>
              </div>
            </div>
          </div>
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

        // Debug: Verificar estructura de datos para desarrollo
        if (process.env.NODE_ENV === 'development') {
          console.group('🔍 Patient Evolution Data Analysis');
          console.log('Total records:', evolutionData.value.length);

          // Analizar tipos de datos disponibles
          const typeCount = {};
          const physicalExamSample = [];

          evolutionData.value.forEach(item => {
            typeCount[item.type] = (typeCount[item.type] || 0) + 1;

            // Capturar samples de exámenes físicos para debug
            if (
              (item.type === 'physical_exam' || item.type === 'physicalExam') &&
              physicalExamSample.length < 3
            ) {
              physicalExamSample.push({
                examDetails: item.examDetails || item.metadata?.examDetails,
                date: item.date,
                attentionId: item.attentionId,
              });
            }
          });

          console.log('Types available:', typeCount);
          console.log('Physical exam samples:', physicalExamSample);
          console.groupEnd();
        }
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

    // Signos Vitales con Alertas
    const vitalSignsData = computed(() => {
      const physicalExams = evolutionData.value
        .filter(item => item.type === 'physical_exam' || item.type === 'physicalExam')
        .map(item => ({
          ...item,
          examDetails: item.examDetails || item.metadata?.examDetails,
          date: new Date(item.date || item.metadata?.createdAt || new Date()),
        }))
        .filter(item => item.examDetails)
        .sort((a, b) => a.date.getTime() - b.date.getTime());

      if (physicalExams.length === 0) return [];

      // Definir rangos normales basados en los campos reales del backend PhysicalExam
      const vitalSignsConfig = {
        // Campos comunes de examen físico del backend
        presion_arterial_sistolica: {
          normalRange: '90-140 mmHg',
          unit: 'mmHg',
          icon: 'bi-heart-pulse',
          min: 90,
          max: 140,
          displayName: 'Presión Arterial Sistólica',
        },
        presion_arterial_diastolica: {
          normalRange: '60-90 mmHg',
          unit: 'mmHg',
          icon: 'bi-heart-pulse',
          min: 60,
          max: 90,
          displayName: 'Presión Arterial Diastólica',
        },
        frecuencia_cardiaca: {
          normalRange: '60-100 bpm',
          unit: 'bpm',
          icon: 'bi-heart',
          min: 60,
          max: 100,
          displayName: 'Frecuencia Cardíaca',
        },
        frecuencia_respiratoria: {
          normalRange: '12-20 rpm',
          unit: 'rpm',
          icon: 'bi-lungs',
          min: 12,
          max: 20,
          displayName: 'Frecuencia Respiratoria',
        },
        temperatura: {
          normalRange: '36-37.5°C',
          unit: '°C',
          icon: 'bi-thermometer',
          min: 36,
          max: 37.5,
          displayName: 'Temperatura',
        },
        peso: {
          normalRange: 'Variable',
          unit: 'kg',
          icon: 'bi-person-standing',
          min: null,
          max: null,
          displayName: 'Peso',
        },
        altura: {
          normalRange: 'Variable',
          unit: 'cm',
          icon: 'bi-rulers',
          min: null,
          max: null,
          displayName: 'Altura',
        },
        saturacion_oxigeno: {
          normalRange: '95-100%',
          unit: '%',
          icon: 'bi-lungs-fill',
          min: 95,
          max: 100,
          displayName: 'Saturación O2',
        },
        // También buscar por variaciones de nombres que puedan venir del formulario
        'Presión Arterial Sistólica': {
          normalRange: '90-140 mmHg',
          unit: 'mmHg',
          icon: 'bi-heart-pulse',
          min: 90,
          max: 140,
          displayName: 'Presión Arterial Sistólica',
        },
        'Frecuencia Cardíaca': {
          normalRange: '60-100 bpm',
          unit: 'bpm',
          icon: 'bi-heart',
          min: 60,
          max: 100,
          displayName: 'Frecuencia Cardíaca',
        },
        Temperatura: {
          normalRange: '36-37.5°C',
          unit: '°C',
          icon: 'bi-thermometer',
          min: 36,
          max: 37.5,
          displayName: 'Temperatura',
        },
        Peso: {
          normalRange: 'Variable',
          unit: 'kg',
          icon: 'bi-person-standing',
          min: null,
          max: null,
          displayName: 'Peso',
        },
      };

      const vitalSignsMap = {};

      physicalExams.forEach(exam => {
        Object.entries(exam.examDetails).forEach(([key, detail]) => {
          const normalizedKey = key.trim();

          // La estructura real del backend: examDetails es Record<string, ItemCharacteristics>
          // donde ItemCharacteristics tiene: value, result, name, active, etc.
          if (vitalSignsConfig[normalizedKey] && detail) {
            let numericValue = null;

            // Extraer valor numérico según la estructura real del backend
            if (typeof detail === 'object') {
              // ItemCharacteristics structure: {value: number, result: string, name: string, active: boolean}
              if (detail.value !== undefined && detail.value !== null) {
                numericValue = parseFloat(detail.value);
              } else if (detail.result && !isNaN(parseFloat(detail.result))) {
                numericValue = parseFloat(detail.result);
              }
            } else if (!isNaN(parseFloat(detail))) {
              numericValue = parseFloat(detail);
            }

            if (numericValue !== null && !isNaN(numericValue)) {
              if (!vitalSignsMap[normalizedKey]) {
                vitalSignsMap[normalizedKey] = [];
              }
              vitalSignsMap[normalizedKey].push({
                value: numericValue,
                date: exam.date.toLocaleDateString('pt-BR'),
                timestamp: exam.date.getTime(),
                attentionId: exam.attentionId || '',
                createdBy: exam.createdBy || '',
              });
            }
          }
        });
      });

      return Object.entries(vitalSignsMap)
        .filter(([_, values]) => values.length > 0)
        .map(([parameter, values]) => {
          values.sort((a, b) => a.timestamp - b.timestamp);
          const config = vitalSignsConfig[parameter];
          const latestValue = values[values.length - 1].value;

          // Calcular tendencia
          let trend = 'stable';
          if (values.length > 1) {
            const previous = values[values.length - 2].value;
            const change = ((latestValue - previous) / previous) * 100;
            if (change > 5) trend = 'up';
            else if (change < -5) trend = 'down';
          }

          // Verificar alerta
          let alert = false;
          if (config.min !== null && config.max !== null) {
            alert = latestValue < config.min || latestValue > config.max;
          }

          return {
            parameter: config.displayName || parameter,
            parameterKey: parameter, // Mantener la clave original para referencia
            latestValue: latestValue.toFixed(1),
            unit: config.unit,
            normalRange: config.normalRange,
            trend,
            alert,
            icon: config.icon,
            chartData: {
              labels: values.map(v => v.date),
              datasets: [
                {
                  label: parameter,
                  data: values.map(v => v.value),
                  borderColor: alert ? '#dc3545' : '#28a745',
                  backgroundColor: alert ? '#dc354520' : '#28a74520',
                  tension: 0.4,
                  fill: true,
                },
              ],
            },
          };
        });
    });

    // Métricas de Adherencia
    const adherenceMetrics = computed(() => {
      const consultations = evolutionData.value.filter(
        item =>
          item.type === 'consultation_reason' ||
          item.type === 'control' ||
          item.type === 'evolution'
      );

      if (consultations.length < 2) return null;

      const sortedConsultations = consultations
        .map(c => new Date(c.date))
        .sort((a, b) => a.getTime() - b.getTime());

      // Calcular días entre consultas
      const daysBetweenVisits = [];
      for (let i = 1; i < sortedConsultations.length; i++) {
        const days = (sortedConsultations[i] - sortedConsultations[i - 1]) / (1000 * 60 * 60 * 24);
        daysBetweenVisits.push(days);
      }

      const averageDaysBetweenVisits = Math.round(
        daysBetweenVisits.reduce((a, b) => a + b, 0) / daysBetweenVisits.length
      );

      // Calcular métricas de adherencia reales basadas en los datos disponibles
      // Adherencia calculada como: consultas dentro de 60 días del promedio
      const expectedDaysRange = 60; // Rango esperado para seguimiento regular
      const adherentVisits = daysBetweenVisits.filter(days => days <= expectedDaysRange).length;
      const appointmentAttendance =
        adherentVisits > 0 ? Math.round((adherentVisits / daysBetweenVisits.length) * 100) : 0;

      // Consistencia basada en consultas dentro de 90 días (seguimiento regular)
      const followUpConsistency =
        daysBetweenVisits.length > 0
          ? Math.round(
              (daysBetweenVisits.filter(days => days <= 90).length / daysBetweenVisits.length) * 100,
            )
          : 0;

      return {
        appointmentAttendance: Math.round(appointmentAttendance),
        followUpConsistency: Math.round(followUpConsistency),
        averageDaysBetweenVisits,
      };
    });

    // Progreso Clínico
    const clinicalProgressData = computed(() => {
      const diagnostics = evolutionData.value.filter(item => item.type === 'diagnostic');
      const consultations = evolutionData.value.filter(
        item => item.type === 'consultation_reason' || item.type === 'control'
      );

      if (diagnostics.length === 0) return null;

      // Diagnósticos por estado - usar la estructura real del backend
      // Los diagnósticos en el backend tienen: confirmation: 'presuntivo' | 'confirmado'
      const confirmedDiagnostics = diagnostics.filter(d => d.confirmation === 'confirmado').length;
      const presuntiveDiagnostics = diagnostics.filter(
        d => d.confirmation === 'presuntivo' || !d.confirmation,
      ).length;

      // Considerar diagnósticos recientes (últimos 6 meses) como activos
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const recentDiagnostics = diagnostics.filter(
        d => new Date(d.date || d.createdAt) >= sixMonthsAgo,
      ).length;
      const olderDiagnostics = diagnostics.length - recentDiagnostics;

      // Evolución de diagnósticos por mes
      const monthlyDiagnostics = {};
      diagnostics.forEach(d => {
        const month = new Date(d.date).toLocaleDateString('pt-BR', {
          year: 'numeric',
          month: 'short',
        });
        monthlyDiagnostics[month] = (monthlyDiagnostics[month] || 0) + 1;
      });

      // Frecuencia de consultas por mes
      const monthlyConsultations = {};
      consultations.forEach(c => {
        const month = new Date(c.date).toLocaleDateString('pt-BR', {
          year: 'numeric',
          month: 'short',
        });
        monthlyConsultations[month] = (monthlyConsultations[month] || 0) + 1;
      });

      return {
        diagnosisResolution: {
          labels: ['Confirmados', 'Presuntivos', 'Recientes', 'Anteriores'],
          datasets: [
            {
              data: [
                confirmedDiagnostics,
                presuntiveDiagnostics,
                recentDiagnostics,
                olderDiagnostics,
              ],
              backgroundColor: ['#28a745', '#ffc107', '#446ffc', '#6c757d'],
            },
          ],
        },
        diagnosisEvolution: {
          labels: Object.keys(monthlyDiagnostics),
          datasets: [
            {
              label: 'Nuevos Diagnósticos',
              data: Object.values(monthlyDiagnostics),
              borderColor: '#446ffc',
              backgroundColor: '#446ffc20',
              tension: 0.4,
            },
          ],
        },
        consultationFrequency: {
          labels: Object.keys(monthlyConsultations),
          datasets: [
            {
              label: 'Consultas',
              data: Object.values(monthlyConsultations),
              backgroundColor: '#17a2b8',
            },
          ],
        },
      };
    });

    // Eventos Críticos
    const criticalEvents = computed(() =>
      evolutionData.value
        .filter(item => {
          // Filtrar eventos críticos basados en datos reales
          if (item.type === 'diagnostic') {
            // Diagnósticos confirmados o con palabras clave críticas
            const content = (item.content || item.diagnostic || '').toLowerCase();
            const hasCriticalKeywords =
              content.includes('urgente') ||
              content.includes('grave') ||
              content.includes('severo') ||
              content.includes('agudo') ||
              content.includes('crisis') ||
              content.includes('emergencia');
            return item.confirmation === 'confirmado' || hasCriticalKeywords;
          }
          if (item.type === 'prescription') {
            // Prescripciones con indicadores de urgencia
            const content = (item.content || '').toLowerCase();
            return content.includes('urgente') || content.includes('inmediato');
          }
          // Otros tipos con palabras clave críticas
          const content = (item.content || '').toLowerCase();
          return content.includes('urgente') || content.includes('emergencia');
        })
        .sort(
          (a, b) =>
            new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime()
        )
        .slice(0, 5)
        .map(item => {
          const content = item.content || item.diagnostic || 'Sin descripción disponible';
          const isUrgent =
            content.toLowerCase().includes('urgente') || content.toLowerCase().includes('grave');
          const isConfirmed = item.confirmation === 'confirmado';

          return {
            id: item.id || `${item.date}-${item.type}`,
            type:
              item.type === 'diagnostic'
                ? 'Diagnóstico'
                : item.type === 'prescription'
                ? 'Medicación'
                : 'Evento',
            description: content,
            date: item.date || item.createdAt,
            severity: isUrgent ? 'high' : isConfirmed ? 'medium' : 'low',
            outcome:
              item.type === 'diagnostic'
                ? isConfirmed
                  ? 'Confirmado'
                  : 'En evaluación'
                : 'Aplicado',
            cie10Code: item.cie10Code || '',
            doctorName: item.createdBy || '',
          };
        })
    );

    // Validación de disponibilidad de datos
    const hasVitalSigns = computed(() => vitalSignsData.value && vitalSignsData.value.length > 0);
    const hasAdherenceData = computed(() => adherenceMetrics.value !== null);
    const hasClinicalProgress = computed(() => clinicalProgressData.value !== null);
    const hasCriticalEvents = computed(
      () => criticalEvents.value && criticalEvents.value.length > 0,
    );
    const hasPhysicalExamData = computed(
      () => physicalExamChartsData.value && physicalExamChartsData.value.length > 0,
    );

    // Estado de datos disponibles para métricas
    const dataAvailabilityStatus = computed(() => {
      const total = 5; // Total de métricas disponibles
      let available = 0;

      if (hasVitalSigns.value) available++;
      if (hasAdherenceData.value) available++;
      if (hasClinicalProgress.value) available++;
      if (hasCriticalEvents.value) available++;
      if (hasPhysicalExamData.value) available++;

      return {
        available,
        total,
        percentage: Math.round((available / total) * 100),
        hasMinimumData: available >= 2, // Al menos 2 métricas para mostrar dashboard
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

    // Nuevas opciones para gráficos clínicos
    const vitalSignChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label(context) {
              return `${context.parsed.y}`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: false,
          grid: { display: false },
          ticks: {
            font: { size: 10 },
            color: '#6c757d',
          },
        },
        x: {
          display: false,
        },
      },
      elements: {
        point: { radius: 2 },
        line: { borderWidth: 1.5 },
      },
    };

    const progressChartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
        },
        tooltip: {
          callbacks: {
            label(context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = ((context.parsed / total) * 100).toFixed(1);
              return `${context.label}: ${context.parsed} (${percentage}%)`;
            },
          },
        },
      },
    };

    const progressLineOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Cantidad',
          },
        },
        x: {
          title: {
            display: true,
            text: 'Período',
          },
        },
      },
    };

    const progressBarOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Cantidad',
          },
        },
        x: {
          title: {
            display: true,
            text: 'Período',
          },
        },
      },
    };

    // Funciones helper para las nuevas métricas
    const getVitalSignAlertClass = vitalSign => (vitalSign.alert ? 'vital-sign-alert' : '');

    const getVitalSignIcon = parameter => {
      const config = {
        'Presión Arterial Sistólica': 'bi-heart-pulse',
        'Presión Arterial Diastólica': 'bi-heart-pulse',
        'Frecuencia Cardíaca': 'bi-heart',
        'Frecuencia Respiratoria': 'bi-lungs',
        Temperatura: 'bi-thermometer',
        Peso: 'bi-person-standing',
        Altura: 'bi-rulers',
        'Saturación O2': 'bi-lungs-fill',
      };
      return config[parameter] || 'bi-activity';
    };

    const getTrendIcon = trend => {
      switch (trend) {
        case 'up':
          return 'bi bi-arrow-up text-warning';
        case 'down':
          return 'bi bi-arrow-down text-info';
        default:
          return 'bi bi-arrow-right text-muted';
      }
    };

    const getAdherenceClass = percentage => {
      if (percentage >= 90) return 'bg-success';
      if (percentage >= 70) return 'bg-warning';
      return 'bg-danger';
    };

    const getCriticalEventClass = severity => {
      switch (severity) {
        case 'high':
          return 'critical-event-high';
        case 'medium':
          return 'critical-event-medium';
        default:
          return 'critical-event-low';
      }
    };

    const getCriticalEventIcon = type => {
      switch (type) {
        case 'Diagnóstico':
          return 'bi bi-file-medical';
        case 'Medicación':
          return 'bi bi-prescription';
        default:
          return 'bi bi-exclamation-circle';
      }
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
      // Nuevos datos clínicos
      vitalSignsData,
      adherenceMetrics,
      clinicalProgressData,
      criticalEvents,
      physicalExamChartsData,
      // Validaciones de datos
      hasVitalSigns,
      hasAdherenceData,
      hasClinicalProgress,
      hasCriticalEvents,
      hasPhysicalExamData,
      dataAvailabilityStatus,
      // Opciones de gráficos
      chartOptions,
      doughnutOptions,
      physicalExamChartOptions,
      vitalSignChartOptions,
      progressChartOptions,
      progressLineOptions,
      progressBarOptions,
      // Funciones helper
      getVitalSignAlertClass,
      getVitalSignIcon,
      getTrendIcon,
      getAdherenceClass,
      getCriticalEventClass,
      getCriticalEventIcon,
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

/* Nuevos estilos para métricas clínicas */
.dashboard-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: #2c3e50;
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid #e9ecef;
}

/* Signos Vitales Dashboard */
.vital-signs-dashboard {
  margin-bottom: 2.5rem;
}

.vital-signs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1rem;
}

.vital-sign-card {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.vital-sign-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.vital-sign-card.vital-sign-alert {
  border-color: #dc3545;
  background: #fff5f5;
}

.vital-sign-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.vital-sign-title {
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0;
  color: #495057;
}

.alert-indicator {
  color: #dc3545;
  font-size: 1rem;
}

.vital-sign-content {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.latest-value {
  display: flex;
  align-items: baseline;
  gap: 0.25rem;
  margin-bottom: 0.5rem;
}

.latest-value .value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #2c3e50;
}

.latest-value .unit {
  font-size: 0.75rem;
  color: #6c757d;
  font-weight: 500;
}

.trend-indicator {
  margin-left: auto;
}

.range-info {
  font-size: 0.75rem;
  color: #6c757d;
  margin-bottom: 0.75rem;
}

.mini-chart {
  height: 60px !important;
  margin-top: 0.5rem;
}

/* Métricas de Adherencia */
.adherence-section {
  margin-bottom: 2.5rem;
}

.adherence-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.adherence-card {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  padding: 1.25rem;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.adherence-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.adherence-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: #495057;
  margin-bottom: 1rem;
}

.adherence-value .percentage {
  display: block;
  font-size: 2rem;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 0.5rem;
}

.adherence-value .metric {
  display: block;
  font-size: 1.5rem;
  font-weight: 700;
  color: #2c3e50;
  margin-bottom: 0.25rem;
}

.progress {
  height: 8px;
  background-color: #e9ecef;
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  transition: width 0.6s ease;
}

/* Progreso Clínico */
.clinical-progress-section {
  margin-bottom: 2.5rem;
}

.progress-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 1.5rem;
}

.progress-card {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.progress-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: #495057;
}

/* Eventos Críticos */
.critical-events-section {
  margin-bottom: 2rem;
}

.critical-events-timeline {
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.critical-event-item {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid #f1f3f4;
}

.critical-event-item:last-child {
  border-bottom: none;
}

.event-marker {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  color: white;
  flex-shrink: 0;
}

.critical-event-high .event-marker {
  background-color: #dc3545;
}

.critical-event-medium .event-marker {
  background-color: #ffc107;
  color: #000;
}

.critical-event-low .event-marker {
  background-color: #17a2b8;
}

.event-content {
  flex: 1;
  min-width: 0;
}

.event-header {
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: 0.25rem;
  gap: 1rem;
}

.event-type {
  font-weight: 600;
  color: #2c3e50;
  font-size: 0.875rem;
}

.event-date {
  font-size: 0.75rem;
  color: #6c757d;
  margin-left: auto;
  flex-shrink: 0;
}

.event-description {
  font-size: 0.875rem;
  color: #495057;
  margin-bottom: 0.25rem;
  line-height: 1.4;
}

.event-outcome {
  font-size: 0.75rem;
  color: #28a745;
  font-style: italic;
}

/* Responsive */
@media (max-width: 768px) {
  .vital-signs-grid,
  .adherence-grid,
  .progress-grid {
    grid-template-columns: 1fr;
  }

  .charts-grid {
    grid-template-columns: 1fr;
  }

  .vital-sign-card,
  .adherence-card,
  .progress-card {
    padding: 1rem;
  }

  .dashboard-title {
    font-size: 1rem;
  }
}
</style>
