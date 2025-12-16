<template>
  <div class="reference-list-modern">
    <div class="list-header">
      <div class="list-header-content">
        <div class="list-header-icon">
          <i class="bi bi-arrow-left-right"></i>
        </div>
        <div class="list-header-title">
          <h4>Historial de Referencias Médicas</h4>
          <p class="text-muted small mb-0">{{ references.length }} referencia(s)</p>
        </div>
      </div>
      <div class="list-header-actions">
        <button
          v-if="toggles['patient.history.edit']"
          type="button"
          class="btn btn-sm btn-primary"
          @click="$emit('create-new')"
        >
          <i class="bi bi-plus-circle me-1"></i>
          Nueva Referencia
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <Spinner />
    </div>

    <div v-else-if="references.length === 0" class="empty-state">
      <Message
        title="No hay referencias registradas"
        content="Aún no se han registrado referencias médicas para este paciente"
      />
    </div>

    <div v-else class="references-timeline">
      <div v-for="reference in sortedReferences" :key="reference.id" class="reference-card">
        <div class="reference-card-header">
          <div class="reference-meta">
            <span class="reference-date-badge">
              <i class="bi bi-calendar3 me-1"></i>
              {{ getDate(reference.createdAt) }}
            </span>
            <span class="reference-status-badge" :class="getStatusClass(reference.status)">
              {{ getStatusLabel(reference.status) }}
            </span>
            <span
              v-if="reference.urgency"
              class="reference-urgency-badge"
              :class="getUrgencyClass(reference.urgency)"
            >
              {{ getUrgencyLabel(reference.urgency) }}
            </span>
          </div>
          <div class="reference-actions">
            <!-- PDF Button: Always visible, different states -->
            <button
              v-if="reference.pdfUrl"
              type="button"
              class="btn btn-sm btn-outline-danger"
              @click="downloadPdf(reference.id)"
              title="Descargar PDF"
              :disabled="downloadingPdf === reference.id"
            >
              <i v-if="downloadingPdf !== reference.id" class="bi bi-file-earmark-pdf"></i>
              <span v-else class="spinner-border spinner-border-sm" role="status"></span>
              <span v-if="downloadingPdf !== reference.id" class="ms-1">PDF</span>
            </button>
            <button
              v-else
              type="button"
              class="btn btn-sm btn-outline-secondary"
              title="Generando PDF..."
              disabled
            >
              <span class="spinner-border spinner-border-sm me-1" role="status"></span>
              <span>Generando PDF...</span>
            </button>
            <button
              v-if="reference.status === 'PENDING' && toggles['patient.history.edit']"
              type="button"
              class="btn btn-sm btn-outline-success"
              @click="$emit('accept', reference.id)"
              title="Aceptar referencia"
            >
              <i class="bi bi-check-circle"></i>
            </button>
            <button
              v-if="reference.status === 'ACCEPTED' && toggles['patient.history.edit']"
              type="button"
              class="btn btn-sm btn-outline-primary"
              @click="$emit('attend', reference.id)"
              title="Marcar como atendida"
            >
              <i class="bi bi-person-check"></i>
            </button>
          </div>
        </div>

        <div class="reference-destination">
          <div class="reference-destination-info">
            <i class="bi bi-arrow-right-circle me-2"></i>
            <strong>Especialidad:</strong> {{ reference.specialtyDestination }}
            <span v-if="reference.doctorDestinationName" class="ms-2">
              - Dr(a). {{ reference.doctorDestinationName }}
            </span>
          </div>
        </div>

        <div v-if="reference.reason" class="reference-reason">
          <strong>Motivo de referencia:</strong>
          <p>{{ reference.reason }}</p>
        </div>

        <div v-if="reference.presumptiveDiagnosis" class="reference-diagnosis">
          <strong>Diagnóstico presuntivo:</strong>
          <p>{{ reference.presumptiveDiagnosis }}</p>
        </div>

        <div v-if="reference.studiesPerformed" class="reference-studies">
          <strong>Estudios realizados:</strong>
          <p>{{ reference.studiesPerformed }}</p>
        </div>

        <div v-if="reference.currentTreatment" class="reference-treatment">
          <strong>Tratamiento actual:</strong>
          <p>{{ reference.currentTreatment }}</p>
        </div>

        <div v-if="reference.returnReport" class="reference-return">
          <strong>Informe de retorno:</strong>
          <p>{{ reference.returnReport }}</p>
        </div>

        <div class="reference-footer">
          <div class="reference-dates">
            <span v-if="reference.acceptedDate">
              <i class="bi bi-check-circle me-1"></i>
              Aceptada: {{ getDate(reference.acceptedDate) }}
            </span>
            <span v-if="reference.attendedDate">
              <i class="bi bi-person-check me-1"></i>
              Atendida: {{ getDate(reference.attendedDate) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref, watch, onUnmounted } from 'vue';
import Spinner from '../../common/Spinner.vue';
import Message from '../../common/Message.vue';
import { getDate } from '../../../shared/utils/date';
import {
  downloadReferencePdf,
  getReferenceById,
} from '../../../application/services/medical-reference';

export default {
  name: 'MedicalReferenceList',
  components: {
    Spinner,
    Message,
  },
  props: {
    references: {
      type: Array,
      default: () => [],
    },
    loading: {
      type: Boolean,
      default: false,
    },
    toggles: {
      type: Object,
      default: () => {},
    },
    sortAsc: {
      type: Boolean,
      default: true,
    },
  },
  emits: ['create-new', 'accept', 'attend', 'refresh'],
  setup(props, { emit }) {
    const downloadingPdf = ref(null);
    const pollingIntervals = ref({});
    const sortedReferences = computed(() => {
      const sorted = [...props.references];
      if (props.sortAsc) {
        return sorted.sort(
          (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      } else {
        return sorted.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      }
    });

    const getStatusClass = status => {
      const statusMap = {
        PENDING: 'status-pending',
        ACCEPTED: 'status-accepted',
        REJECTED: 'status-rejected',
        ATTENDED: 'status-attended',
      };
      return statusMap[status] || 'status-default';
    };

    const getStatusLabel = status => {
      const labelMap = {
        PENDING: 'Pendiente',
        ACCEPTED: 'Aceptada',
        REJECTED: 'Rechazada',
        ATTENDED: 'Atendida',
      };
      return labelMap[status] || status;
    };

    const getUrgencyClass = urgency => {
      const urgencyMap = {
        routine: 'urgency-routine',
        urgent: 'urgency-urgent',
        emergency: 'urgency-emergency',
      };
      return urgencyMap[urgency] || 'urgency-default';
    };

    const getUrgencyLabel = urgency => {
      const labelMap = {
        routine: 'Rutina',
        urgent: 'Urgente',
        emergency: 'Emergencia',
      };
      return labelMap[urgency] || urgency;
    };

    const downloadPdf = async referenceId => {
      try {
        downloadingPdf.value = referenceId;
        const blob = await downloadReferencePdf(referenceId);

        // Crear URL del blob y descargar
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `medical-reference-${referenceId}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } catch (error) {
        console.error('Error downloading PDF:', error);
        alert('Error al descargar el PDF. Por favor, intente nuevamente.');
      } finally {
        downloadingPdf.value = null;
      }
    };

    // Polling para verificar si el PDF está listo
    const startPollingForPdf = referenceId => {
      // No iniciar polling si ya está activo para esta referencia
      if (pollingIntervals.value[referenceId]) {
        return;
      }

      // Solo hacer polling para referencias recientes (menos de 5 minutos)
      const reference = props.references.find(r => r.id === referenceId);
      if (!reference) return;

      const referenceAge = Date.now() - new Date(reference.createdAt).getTime();
      const maxPollingAge = 5 * 60 * 1000; // 5 minutos

      if (referenceAge > maxPollingAge) {
        return; // No hacer polling para referencias antiguas
      }

      let attempts = 0;
      const maxAttempts = 20; // Máximo 20 intentos (2 minutos con intervalo de 6 segundos)

      pollingIntervals.value[referenceId] = setInterval(async () => {
        attempts++;

        try {
          const updatedReference = await getReferenceById(referenceId);

          // Si el PDF ya está disponible, actualizar la lista
          if (updatedReference.pdfUrl) {
            stopPollingForPdf(referenceId);
            // Emitir evento para refrescar la lista
            emit('refresh');
            return;
          }

          // Si excedemos los intentos máximos, detener polling
          if (attempts >= maxAttempts) {
            stopPollingForPdf(referenceId);
          }
        } catch (error) {
          console.error(`Error polling PDF for reference ${referenceId}:`, error);
          stopPollingForPdf(referenceId);
        }
      }, 6000); // Verificar cada 6 segundos
    };

    const stopPollingForPdf = referenceId => {
      if (pollingIntervals.value[referenceId]) {
        clearInterval(pollingIntervals.value[referenceId]);
        delete pollingIntervals.value[referenceId];
      }
    };

    const stopAllPolling = () => {
      Object.keys(pollingIntervals.value).forEach(referenceId => {
        stopPollingForPdf(referenceId);
      });
    };

    // Iniciar polling para referencias sin PDF
    watch(
      () => props.references,
      newReferences => {
        newReferences.forEach(reference => {
          if (!reference.pdfUrl) {
            startPollingForPdf(reference.id);
          } else {
            stopPollingForPdf(reference.id);
          }
        });
      },
      { immediate: true }
    );

    onUnmounted(() => {
      stopAllPolling();
    });

    return {
      sortedReferences,
      getDate,
      getStatusClass,
      getStatusLabel,
      getUrgencyClass,
      getUrgencyLabel,
      downloadPdf,
      downloadingPdf,
    };
  },
};
</script>

<style scoped>
.reference-list-modern {
  width: 100%;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(0, 0, 0, 0.1);
}

.list-header-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.list-header-icon {
  width: 48px;
  height: 48px;
  border-radius: 0.75rem;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
}

.list-header-title h4 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
}

.loading-state,
.empty-state {
  padding: 3rem;
  text-align: center;
}

.references-timeline {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.reference-card {
  background: white;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-radius: 0.75rem;
  padding: 1.25rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.reference-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
}

.reference-card:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: rgba(0, 0, 0, 0.15);
}

.reference-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.reference-meta {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}

.reference-date-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.75rem;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  border-radius: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
}

.reference-status-badge,
.reference-urgency-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
}

.status-pending {
  background: #ffc107;
  color: #000;
}

.status-accepted {
  background: #17a2b8;
  color: white;
}

.status-rejected {
  background: #dc3545;
  color: white;
}

.status-attended {
  background: #28a745;
  color: white;
}

.urgency-routine {
  background: #6c757d;
  color: white;
}

.urgency-urgent {
  background: #fd7e14;
  color: white;
}

.urgency-emergency {
  background: #dc3545;
  color: white;
}

.reference-destination {
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: rgba(0, 123, 255, 0.05);
  border-radius: 0.5rem;
  border-left: 3px solid var(--azul-turno);
}

.reference-destination-info {
  font-size: 1rem;
  color: var(--color-text);
}

.reference-reason,
.reference-diagnosis,
.reference-studies,
.reference-treatment,
.reference-return {
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 0.5rem;
}

.reference-reason p,
.reference-diagnosis p,
.reference-studies p,
.reference-treatment p,
.reference-return p {
  margin: 0.5rem 0 0 0;
  font-size: 0.9rem;
  line-height: 1.6;
}

.reference-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.7;
}

.reference-dates {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .reference-card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .reference-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
</style>
