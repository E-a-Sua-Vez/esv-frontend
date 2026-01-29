<template>
  <div v-if="show" class="modal-overlay" @click.self="handleClose">
    <div class="modal-content modal-content-large">
      <div class="modal-header">
        <h5 class="modal-title">
          <i class="bi bi-search me-2"></i>
          Búsqueda Avanzada en Historial Médico
        </h5>
        <button type="button" class="btn-close" @click="handleClose"></button>
      </div>
      <div class="modal-body">
        <div class="search-filters">
          <!-- Texto de búsqueda -->
          <div class="form-field-modern mb-3">
            <label class="form-label-modern">
              <i class="bi bi-textarea-resize me-2"></i>
              Buscar texto
            </label>
            <input
              type="text"
              class="form-control-modern"
              v-model="searchFilters.searchText"
              placeholder="Buscar en todo el historial..."
            />
          </div>

          <div class="row">
            <!-- Tipo de registro -->
            <div class="col-md-6 mb-3">
              <div class="form-field-modern">
                <label class="form-label-modern">
                  <i class="bi bi-tag me-2"></i>
                  Tipo de registro
                </label>
                <select class="form-control-modern" v-model="searchFilters.itemType">
                  <option value="">Todos los tipos</option>
                  <option value="diagnostic">Diagnóstico</option>
                  <option value="anamnesis">Anamnesis</option>
                  <option value="evolution">Evolución</option>
                  <option value="prescription">Receta</option>
                  <option value="exam_order">Pedido de Examen</option>
                  <option value="reference">Referencia</option>
                  <option value="consultation_reason">Motivo de Consulta</option>
                  <option value="physical_exam">Examen Físico</option>
                  <option value="functional_exam">Examen Funcional</option>
                  <option value="current_illness">Enfermedad Actual</option>
                  <option value="control">Control</option>
                  <option value="medical_order">Orden Médica</option>
                </select>
              </div>
            </div>

            <!-- CIE-10 -->
            <div class="col-md-6 mb-3">
              <div class="form-field-modern">
                <label class="form-label-modern">
                  <i class="bi bi-code-square me-2"></i>
                  Código CIE-10
                </label>
                <input
                  type="text"
                  class="form-control-modern"
                  v-model="searchFilters.cie10Code"
                  placeholder="Ej: E11, I10..."
                />
              </div>
            </div>
          </div>

          <div class="row">
            <!-- Fecha desde -->
            <div class="col-md-6 mb-3">
              <div class="form-field-modern">
                <label class="form-label-modern">
                  <i class="bi bi-calendar-event me-2"></i>
                  Fecha desde
                </label>
                <input type="date" class="form-control-modern" v-model="searchFilters.dateFrom" />
              </div>
            </div>

            <!-- Fecha hasta -->
            <div class="col-md-6 mb-3">
              <div class="form-field-modern">
                <label class="form-label-modern">
                  <i class="bi bi-calendar-event me-2"></i>
                  Fecha hasta
                </label>
                <input type="date" class="form-control-modern" v-model="searchFilters.dateTo" />
              </div>
            </div>
          </div>

          <!-- Ordenamiento -->
          <div class="row">
            <div class="col-md-6 mb-3">
              <div class="form-field-modern">
                <label class="form-label-modern">
                  <i class="bi bi-sort-alpha-down me-2"></i>
                  Ordenar por
                </label>
                <select class="form-control-modern" v-model="searchFilters.sortBy">
                  <option value="date">Fecha</option>
                  <option value="relevance">Relevancia</option>
                  <option value="type">Tipo</option>
                </select>
              </div>
            </div>
            <div class="col-md-6 mb-3">
              <div class="form-field-modern">
                <label class="form-label-modern">
                  <i class="bi bi-arrow-down-up me-2"></i>
                  Orden
                </label>
                <select class="form-control-modern" v-model="searchFilters.sortOrder">
                  <option value="desc">Más reciente primero</option>
                  <option value="asc">Más antiguo primero</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Resultados -->
        <div v-if="loading" class="text-center py-4">
          <Spinner />
        </div>

        <div
          v-else-if="searchResults && searchResults.items && searchResults.items.length > 0"
          class="search-results"
        >
          <div class="results-header">
            <h6>Resultados: {{ searchResults.total }} encontrado(s)</h6>
            <div class="results-pagination">
              <button
                class="btn btn-sm btn-modern btn-outline-primary"
                @click="loadPreviousPage"
                :disabled="currentPage === 1"
              >
                <i class="bi bi-chevron-left"></i>
              </button>
              <span class="mx-2 pagination-info">Página {{ currentPage }}</span>
              <button
                class="btn btn-sm btn-modern btn-outline-primary"
                @click="loadNextPage"
                :disabled="!searchResults.hasMore"
              >
                <i class="bi bi-chevron-right"></i>
              </button>
            </div>
          </div>

          <div class="results-list">
            <div
              v-for="item in searchResults.items"
              :key="item.id"
              class="result-item"
              @click="selectResult(item)"
            >
              <div class="result-item-header">
                <span class="result-type-badge" :class="getTypeClass(item.type)">
                  {{ getTypeLabel(item.type) }}
                </span>
                <span class="result-date">{{ formatDate(item.date) }}</span>
              </div>
              <div class="result-item-content">
                <p class="result-text">{{ truncateText(item.content, 200) }}</p>
                <div v-if="item.cie10Code" class="result-cie10">
                  <span class="badge bg-info">{{ item.cie10Code }}</span>
                </div>
                <div v-if="item.doctorName" class="result-doctor">
                  <i class="bi bi-person-circle me-1"></i>
                  {{ item.doctorName }}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else-if="hasSearched && !loading" class="empty-state-modern">
          <div class="empty-state-modern-icon">
            <i class="bi bi-search"></i>
          </div>
          <div class="empty-state-modern-title">No se encontraron resultados</div>
          <div class="empty-state-modern-text">
            Intenta ajustar los filtros de búsqueda o usar términos diferentes
          </div>
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-modern btn-secondary" @click="handleClose">
          Cerrar
        </button>
        <button
          type="button"
          class="btn btn-modern btn-primary"
          @click="performSearch"
          :disabled="loading"
        >
          <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
          <i v-else class="bi bi-search me-2"></i>
          Buscar
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive } from 'vue';
import Spinner from '../../common/Spinner.vue';
import { advancedSearch } from '../../../application/services/patient-history';
import { getDate } from '../../../shared/utils/date';

export default {
  name: 'AdvancedSearchModal',
  components: {
    Spinner,
  },
  props: {
    show: {
      type: Boolean,
      default: false,
    },
    clientId: {
      type: String,
      required: false,
      default: '',
    },
    commerceId: {
      type: String,
      required: false,
      default: '',
    },
    initialSearchTerm: {
      type: String,
      default: '',
    },
  },
  emits: ['close', 'result-selected'],
  setup(props, { emit }) {
    const loading = ref(false);
    const hasSearched = ref(false);
    const searchResults = ref(null);
    const currentPage = ref(1);
    const pageSize = 20;

    const searchFilters = reactive({
      searchText: props.initialSearchTerm || '',
      itemType: '',
      cie10Code: '',
      dateFrom: '',
      dateTo: '',
      sortBy: 'date',
      sortOrder: 'desc',
    });

    const performSearch = async () => {
      if (!props.clientId || !props.commerceId) return;

      try {
        loading.value = true;
        hasSearched.value = true;

        // Convert date strings to ISO format if provided
        const dateFrom = searchFilters.dateFrom
          ? new Date(searchFilters.dateFrom + 'T00:00:00').toISOString()
          : undefined;
        const dateTo = searchFilters.dateTo
          ? new Date(searchFilters.dateTo + 'T23:59:59').toISOString()
          : undefined;

        const searchDto = {
          clientId: props.clientId,
          commerceId: props.commerceId,
          searchText: searchFilters.searchText?.trim() || undefined,
          itemType: searchFilters.itemType || undefined,
          cie10Code: searchFilters.cie10Code?.trim() || undefined,
          dateFrom,
          dateTo,
          sortBy: searchFilters.sortBy,
          sortOrder: searchFilters.sortOrder,
          page: currentPage.value,
          limit: pageSize,
        };

        const result = await advancedSearch(searchDto);
        searchResults.value = result;
      } catch (error) {
        console.error('Error performing search:', error);
        searchResults.value = { items: [], total: 0, hasMore: false };
      } finally {
        loading.value = false;
      }
    };

    const loadNextPage = () => {
      if (searchResults.value && searchResults.value.hasMore) {
        currentPage.value++;
        performSearch();
      }
    };

    const loadPreviousPage = () => {
      if (currentPage.value > 1) {
        currentPage.value--;
        performSearch();
      }
    };

    const selectResult = item => {
      emit('result-selected', item);
      emit('close');
    };

    const handleClose = () => {
      emit('close');
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

    const formatDate = date => {
      if (!date) return '';
      return getDate(date);
    };

    const truncateText = (text, maxLength) => {
      if (!text) return '';
      if (text.length <= maxLength) return text;
      return text.substring(0, maxLength) + '...';
    };

    return {
      loading,
      hasSearched,
      searchResults,
      currentPage,
      searchFilters,
      performSearch,
      loadNextPage,
      loadPreviousPage,
      selectResult,
      handleClose,
      getTypeClass,
      getTypeLabel,
      formatDate,
      truncateText,
    };
  },
};
</script>

<style scoped>
@import '../../../shared/styles/prontuario-common.css';

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
}

.modal-content {
  background: white;
  border-radius: var(--border-radius-lg);
  width: 90%;
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-xl);
}

.modal-content-large {
  max-width: 1200px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--azul-turno, #004aad);
}

.modal-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text);
  display: flex;
  align-items: center;
}

.modal-title i {
  color: var(--azul-turno);
}

.modal-body {
  padding: 1.5rem;
}

.search-filters {
  margin-bottom: 2rem;
}

.search-results {
  margin-top: 2rem;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid var(--border-color);
}

.results-header h6 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
}

.results-pagination {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.pagination-info {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  font-weight: 600;
}

.results-list {
  max-height: 500px;
  overflow-y: auto;
  padding-right: 0.5rem;
}

.results-list::-webkit-scrollbar {
  width: 6px;
}

.results-list::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.05);
  border-radius: 3px;
}

.results-list::-webkit-scrollbar-thumb {
  background: var(--azul-turno);
  border-radius: 3px;
}

.result-item {
  background: white;
  border: 1px solid var(--border-color);
  border-radius: var(--border-radius-md);
  padding: 1rem;
  margin-bottom: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: var(--shadow-sm);
}

.result-item:hover {
  background: rgba(68, 111, 252, 0.05);
  border-color: var(--azul-turno);
  box-shadow: var(--shadow-md);
  transform: translateX(4px);
}

.result-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.result-type-badge {
  padding: 0.35rem 0.75rem;
  border-radius: var(--border-radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
  color: white;
}

.result-type-badge.type-diagnostic {
  background: linear-gradient(135deg, #dc3545 0%, #c82333 100%);
}

.result-type-badge.type-anamnesis {
  background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
}

.result-type-badge.type-evolution {
  background: linear-gradient(135deg, #28a745 0%, #218838 100%);
}

.result-type-badge.type-prescription {
  background: linear-gradient(135deg, #ffc107 0%, #e0a800 100%);
  color: #000;
}

.result-type-badge.type-exam {
  background: linear-gradient(135deg, #6f42c1 0%, #5a32a3 100%);
}

.result-type-badge.type-reference {
  background: linear-gradient(135deg, #20c997 0%, #1aa179 100%);
}

.result-type-badge.type-consultation {
  background: linear-gradient(135deg, #fd7e14 0%, #e8650e 100%);
}

.result-type-badge.type-physical {
  background: linear-gradient(135deg, #e83e8c 0%, #d91a72 100%);
}

.result-type-badge.type-functional {
  background: linear-gradient(135deg, #6610f2 0%, #520dc2 100%);
}

.result-type-badge.type-illness {
  background: linear-gradient(135deg, #f4623a 0%, #d94e2a 100%);
}

.result-type-badge.type-control {
  background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
}

.result-type-badge.type-order {
  background: linear-gradient(135deg, var(--azul-turno) 0%, #2f407a 100%);
}

.result-type-badge.type-default {
  background: linear-gradient(135deg, #6c757d 0%, #5a6268 100%);
}

.result-date {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  font-weight: 600;
}

.result-item-content {
  color: var(--color-text);
}

.result-text {
  margin: 0.5rem 0;
  line-height: 1.6;
  color: var(--color-text);
}

.result-cie10 {
  margin: 0.5rem 0;
}

.result-cie10 .badge {
  background: var(--azul-turno);
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: var(--border-radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
}

.result-doctor {
  font-size: 0.85rem;
  color: var(--color-text-muted);
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
}

.result-doctor i {
  color: var(--azul-turno);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.25rem;
  border-top: 1px solid var(--border-color);
  background: rgba(248, 249, 250, 0.5);
}

.btn-modern {
  padding: 0.5rem 1.25rem;
  font-weight: 600;
  border-radius: var(--border-radius-md);
  transition: all 0.2s ease;
  border: 1px solid transparent;
}

.btn-modern.btn-primary {
  background: var(--gradient-primary);
  color: white;
  border: none;
}

.btn-modern.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-modern.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-modern.btn-secondary {
  background: white;
  color: var(--color-text);
  border: 1px solid var(--border-color);
}

.btn-modern.btn-secondary:hover {
  background: rgba(0, 0, 0, 0.05);
  border-color: var(--azul-turno);
}

.btn-modern.btn-outline-primary {
  background: white;
  color: var(--azul-turno);
  border: 1px solid var(--azul-turno);
}

.btn-modern.btn-outline-primary:hover:not(:disabled) {
  background: var(--azul-turno);
  color: white;
}

.btn-modern.btn-outline-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
