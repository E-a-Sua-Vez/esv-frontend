<template>
  <div class="prescription-list-modern">
    <div class="list-header">
      <div class="list-header-content">
        <div class="list-header-icon">
          <i class="bi bi-prescription"></i>
        </div>
        <div class="list-header-title">
          <h4>Historial de Recetas</h4>
          <p class="text-muted small mb-0">{{ prescriptions.length }} receta(s)</p>
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
          Nueva Receta
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-state">
      <Spinner />
    </div>

    <div v-else-if="prescriptions.length === 0" class="empty-state">
      <Message
        title="No hay recetas registradas"
        content="Aún no se han registrado recetas para este paciente"
      />
    </div>

    <div v-else class="prescriptions-timeline">
      <div
        v-for="prescription in sortedPrescriptions"
        :key="prescription.id"
        class="prescription-card"
      >
        <div class="prescription-card-header">
          <div class="prescription-meta">
            <span class="prescription-date-badge">
              <i class="bi bi-calendar3 me-1"></i>
              {{ getDate(prescription.createdAt) }}
            </span>
            <span class="prescription-status-badge" :class="getStatusClass(prescription.status)">
              {{ getStatusLabel(prescription.status) }}
            </span>
          </div>
          <div class="prescription-actions">
            <button
              v-if="prescription.pdfUrl"
              type="button"
              class="btn btn-sm btn-outline-danger"
              @click="downloadPdf(prescription.id)"
              title="Descargar PDF"
              :disabled="downloadingPdf === prescription.id"
            >
              <i v-if="downloadingPdf !== prescription.id" class="bi bi-file-earmark-pdf"></i>
              <span v-else class="spinner-border spinner-border-sm" role="status"></span>
            </button>
            <button
              v-if="prescription.status === 'ACTIVE' && toggles['patient.history.edit']"
              type="button"
              class="btn btn-sm btn-outline-primary"
              @click="$emit('refill', prescription.id)"
              title="Reforzar receta"
            >
              <i class="bi bi-arrow-repeat"></i>
            </button>
            <button
              v-if="prescription.status === 'ACTIVE' && toggles['patient.history.edit']"
              type="button"
              class="btn btn-sm btn-outline-success"
              @click="$emit('dispense', prescription.id)"
              title="Registrar dispensación"
            >
              <i class="bi bi-check-circle"></i>
            </button>
          </div>
        </div>

        <div class="prescription-medications">
          <div
            v-for="(medication, index) in prescription.medications"
            :key="index"
            class="medication-item"
          >
            <div class="medication-info">
              <div class="medication-name">
                <strong>{{ medication.medicationName }}</strong>
                <span v-if="medication.commercialName" class="text-muted small ms-2">
                  ({{ medication.commercialName }})
                </span>
              </div>
              <div class="medication-details">
                <span class="detail-badge">
                  <i class="bi bi-capsule me-1"></i>
                  {{ medication.dosage }}
                </span>
                <span class="detail-badge">
                  <i class="bi bi-clock me-1"></i>
                  {{ medication.frequency }}
                </span>
                <span class="detail-badge">
                  <i class="bi bi-calendar-check me-1"></i>
                  {{ medication.duration }} días
                </span>
                <span class="detail-badge">
                  <i class="bi bi-arrow-right-circle me-1"></i>
                  {{ medication.route }}
                </span>
              </div>
              <div v-if="medication.instructions" class="medication-instructions">
                <i class="bi bi-info-circle me-1"></i>
                {{ medication.instructions }}
              </div>
            </div>
          </div>
        </div>

        <div v-if="prescription.instructions" class="prescription-instructions">
          <strong>Instrucciones generales:</strong>
          <p>{{ prescription.instructions }}</p>
        </div>

        <div class="prescription-footer">
          <div class="prescription-validity">
            <span v-if="prescription.validUntil">
              <i class="bi bi-calendar-x me-1"></i>
              Válida hasta: {{ getDate(prescription.validUntil) }}
            </span>
          </div>
          <div class="prescription-refills" v-if="prescription.refillsAllowed > 0">
            <i class="bi bi-arrow-repeat me-1"></i>
            Refuerzos permitidos: {{ prescription.refillsUsed || 0 }}/{{
              prescription.refillsAllowed
            }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref } from 'vue';
import Spinner from '../../common/Spinner.vue';
import Message from '../../common/Message.vue';
import { getDate } from '../../../shared/utils/date';
import { downloadPrescriptionPdf } from '../../../application/services/prescription';

export default {
  name: 'PrescriptionList',
  components: {
    Spinner,
    Message,
  },
  props: {
    prescriptions: {
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
  emits: ['create-new', 'refill', 'dispense'],
  setup(props) {
    const downloadingPdf = ref(null);
    const sortedPrescriptions = computed(() => {
      const sorted = [...props.prescriptions];
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
        ACTIVE: 'status-active',
        REFILLED: 'status-refilled',
        DISPENSED: 'status-dispensed',
        CANCELLED: 'status-cancelled',
      };
      return statusMap[status] || 'status-default';
    };

    const getStatusLabel = status => {
      const labelMap = {
        ACTIVE: 'Activa',
        REFILLED: 'Reforzada',
        DISPENSED: 'Dispensada',
        CANCELLED: 'Cancelada',
      };
      return labelMap[status] || status;
    };

    const downloadPdf = async prescriptionId => {
      try {
        downloadingPdf.value = prescriptionId;
        const blob = await downloadPrescriptionPdf(prescriptionId);

        // Crear URL del blob y descargar
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `prescription-${prescriptionId}.pdf`;
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

    return {
      sortedPrescriptions,
      getDate,
      getStatusClass,
      getStatusLabel,
      downloadPdf,
      downloadingPdf,
    };
  },
};
</script>

<style scoped>
.prescription-list-modern {
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

.prescriptions-timeline {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.prescription-card {
  background: white;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-radius: 0.75rem;
  padding: 1.25rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.prescription-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
}

.prescription-card:hover {
  transform: translateX(4px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: rgba(0, 0, 0, 0.15);
}

.prescription-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.prescription-meta {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}

.prescription-date-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.75rem;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  border-radius: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
}

.prescription-status-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.85rem;
  font-weight: 600;
}

.status-active {
  background: #28a745;
  color: white;
}

.status-refilled {
  background: #ffc107;
  color: #000;
}

.status-dispensed {
  background: #17a2b8;
  color: white;
}

.status-cancelled {
  background: #dc3545;
  color: white;
}

.prescription-actions {
  display: flex;
  gap: 0.5rem;
}

.prescription-medications {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1rem;
}

.medication-item {
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.03);
  border-radius: 0.5rem;
  border-left: 3px solid var(--azul-turno);
}

.medication-name {
  margin-bottom: 0.5rem;
  font-size: 1rem;
}

.medication-details {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}

.detail-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  background: white;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 0.375rem;
  font-size: 0.8rem;
  color: var(--color-text);
}

.medication-instructions {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.8;
  font-style: italic;
}

.prescription-instructions {
  padding: 0.75rem;
  background: rgba(40, 167, 69, 0.05);
  border-radius: 0.5rem;
  border-left: 3px solid #28a745;
  margin-bottom: 1rem;
}

.prescription-instructions p {
  margin: 0.5rem 0 0 0;
  font-size: 0.9rem;
}

.prescription-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 0.75rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.7;
}

@media (max-width: 768px) {
  .prescription-card-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .prescription-footer {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}
</style>
