<template>
  <div class="existing-document-selector">
    <!-- Search Bar -->
    <div class="search-section">
      <div class="search-input-group">
        <i class="bi bi-search search-icon"></i>
        <input
          v-model="searchText"
          @input="handleSearch"
          type="text"
          placeholder="Buscar documentos existentes..."
          class="search-input"
        />
      </div>

      <div class="filter-controls">
        <select v-model="categoryFilter" @change="applyFilters" class="filter-select">
          <option value="">Todas las categorías</option>
          <option v-for="category in categories" :key="category.value" :value="category.value">
            {{ category.label }}
          </option>
        </select>

        <select v-model="dateFilter" @change="applyDateFilter" class="filter-select">
          <option value="">Todas las fechas</option>
          <option value="today">Hoy</option>
          <option value="week">Esta semana</option>
          <option value="month">Este mes</option>
          <option value="year">Este año</option>
        </select>
      </div>
    </div>

    <!-- Documents List -->
    <div class="documents-list" v-if="!loading">
      <div v-if="filteredDocuments.length === 0" class="empty-state">
        <i class="bi bi-file-earmark-x empty-icon"></i>
        <h4>No se encontraron documentos</h4>
        <p>No hay documentos que coincidan con los criterios de búsqueda</p>
      </div>

      <div v-else class="documents-grid">
        <div
          v-for="document in filteredDocuments"
          :key="document.id"
          class="document-item"
          :class="{ selected: selectedDocument?.id === document.id }"
          @click="selectDocument(document)"
        >
          <div class="document-preview">
            <i :class="getFileTypeIcon(document.format)" class="file-icon"></i>

            <!-- Document badges -->
            <div class="document-badges">
              <span v-if="document.urgency === 'CRITICAL'" class="badge badge-critical">
                <i class="bi bi-exclamation-triangle-fill"></i>
              </span>
              <span v-if="document.isConfidential" class="badge badge-confidential">
                <i class="bi bi-shield-lock"></i>
              </span>
            </div>
          </div>

          <div class="document-info">
            <h4 class="document-title">{{ document.name }}</h4>
            <p class="document-category">{{ getCategoryLabel(document.category) }}</p>

            <div class="document-meta">
              <span class="document-date">
                <i class="bi bi-calendar3 me-1"></i>
                {{ formatDate(document.createdAt) }}
              </span>
              <span class="document-urgency" :class="`urgency-${document.urgency?.toLowerCase()}`">
                {{ getUrgencyLabel(document.urgency) }}
              </span>
            </div>

            <!-- Original attention info -->
            <div class="original-attention" v-if="document.attentionId">
              <i class="bi bi-link-45deg me-1"></i>
              <span class="attention-text">Consulta: {{ document.attentionId }}</span>
            </div>

            <!-- Tags -->
            <div class="document-tags" v-if="document.tags && document.tags.length > 0">
              <span v-for="tag in document.tags.slice(0, 3)" :key="tag" class="tag">
                {{ tag }}
              </span>
              <span v-if="document.tags.length > 3" class="tag-more">
                +{{ document.tags.length - 3 }}
              </span>
            </div>
          </div>

          <!-- Selection indicator -->
          <div class="selection-indicator" v-if="selectedDocument?.id === document.id">
            <i class="bi bi-check-circle-fill"></i>
          </div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-else class="loading-state">
      <div class="loading-spinner"></div>
      <p>Cargando documentos...</p>
    </div>

    <!-- Selected Document Preview -->
    <div class="selected-preview" v-if="selectedDocument">
      <h5>Documento seleccionado:</h5>
      <div class="preview-card">
        <div class="preview-icon">
          <i :class="getFileTypeIcon(selectedDocument.format)"></i>
        </div>
        <div class="preview-info">
          <h6>{{ selectedDocument.name }}</h6>
          <p>{{ getCategoryLabel(selectedDocument.category) }}</p>
          <small>{{ formatDate(selectedDocument.createdAt) }}</small>
        </div>
        <button @click="selectedDocument = null" class="remove-selection-btn">
          <i class="bi bi-x"></i>
        </button>
      </div>
    </div>

    <!-- Actions -->
    <div class="actions-section">
      <button @click="$emit('cancel')" class="btn-cancel" :disabled="loading">Cancelar</button>
      <button @click="linkDocument" class="btn-link" :disabled="!selectedDocument || loading">
        <i class="bi bi-link-45deg me-2"></i>
        Vincular Documento
      </button>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue';
import {
  searchDocuments,
  getDocumentCategories,
  getDocumentUrgencyLevels,
  getFileTypeIcon,
} from '../../application/services/document';
import { getDateAndHour } from '../../shared/utils/date';

export default {
  name: 'ExistingDocumentSelector',
  props: {
    client: { type: Object, required: true },
    commerce: { type: Object, required: true },
    excludeAttentionId: { type: String, default: null },
  },
  emits: ['document-selected', 'cancel'],
  setup(props, { emit }) {
    const loading = ref(false);
    const documents = ref([]);
    const selectedDocument = ref(null);
    const searchText = ref('');
    const categoryFilter = ref('');
    const dateFilter = ref('');

    const categories = getDocumentCategories();
    const urgencyLevels = getDocumentUrgencyLevels();

    const filteredDocuments = computed(() => {
      let filtered = [...documents.value];

      // Exclude documents from current attention
      if (props.excludeAttentionId) {
        filtered = filtered.filter(doc => doc.attentionId !== props.excludeAttentionId);
      }

      // Apply search filter
      if (searchText.value) {
        const search = searchText.value.toLowerCase();
        filtered = filtered.filter(
          doc =>
            doc.name?.toLowerCase().includes(search) ||
            doc.category?.toLowerCase().includes(search) ||
            doc.tags?.some(tag => tag.toLowerCase().includes(search))
        );
      }

      // Apply category filter
      if (categoryFilter.value) {
        filtered = filtered.filter(doc => doc.category === categoryFilter.value);
      }

      return filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    });

    // Methods
    const loadDocuments = async () => {
      try {
        loading.value = true;

        const searchCriteria = {
          commerceId: props.commerce.id,
          clientId: props.client.id,
        };

        documents.value = await searchDocuments(searchCriteria);
      } catch (error) {
        console.error('Error loading documents:', error);
        documents.value = [];
      } finally {
        loading.value = false;
      }
    };

    const handleSearch = () => {
      // Search is handled by computed property
    };

    const applyFilters = () => {
      // Filters are handled by computed property
    };

    const applyDateFilter = () => {
      if (!dateFilter.value) return;

      const now = new Date();
      let startDate;

      switch (dateFilter.value) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          break;
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          return;
      }

      documents.value = documents.value.filter(doc => new Date(doc.createdAt) >= startDate);
    };

    const selectDocument = document => {
      selectedDocument.value = selectedDocument.value?.id === document.id ? null : document;
    };

    const linkDocument = () => {
      if (selectedDocument.value) {
        emit('document-selected', selectedDocument.value);
      }
    };

    const getCategoryLabel = category => {
      const cat = categories.find(c => c.value === category);
      return cat?.label || category;
    };

    const getUrgencyLabel = urgency => {
      const urg = urgencyLevels.find(u => u.value === urgency);
      return urg?.label || urgency;
    };

    const formatDate = date => getDateAndHour(date);

    // Lifecycle
    onMounted(() => {
      loadDocuments();
    });

    return {
      loading,
      documents,
      selectedDocument,
      searchText,
      categoryFilter,
      dateFilter,
      categories,
      filteredDocuments,
      handleSearch,
      applyFilters,
      applyDateFilter,
      selectDocument,
      linkDocument,
      getCategoryLabel,
      getUrgencyLabel,
      formatDate,
      getFileTypeIcon,
    };
  },
};
</script>

<style scoped>
.existing-document-selector {
  display: flex;
  flex-direction: column;
  height: 100%;
  max-height: 60vh;
}

.search-section {
  padding: 1rem;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fa;
}

.search-input-group {
  position: relative;
  margin-bottom: 1rem;
}

.search-icon {
  position: absolute;
  left: 1rem;
  top: 50%;
  transform: translateY(-50%);
  color: #6c757d;
  z-index: 1;
}

.search-input {
  width: 100%;
  padding: 0.75rem 1rem 0.75rem 2.5rem;
  border: 2px solid #e9ecef;
  border-radius: 0.5rem;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  border-color: var(--azul-turno);
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.filter-controls {
  display: flex;
  gap: 1rem;
}

.filter-select {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid #dee2e6;
  border-radius: 0.375rem;
  background: white;
  font-size: 0.875rem;
}

.documents-list {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  color: #6c757d;
}

.loading-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid #e9ecef;
  border-top: 3px solid var(--azul-turno);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 3rem;
  text-align: center;
  color: #6c757d;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state h4 {
  margin: 0 0 0.5rem 0;
  color: #495057;
}

.empty-state p {
  margin: 0;
  font-size: 0.9rem;
}

.documents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.document-item {
  position: relative;
  background: white;
  border: 2px solid #e9ecef;
  border-radius: 0.75rem;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.document-item:hover {
  border-color: var(--azul-turno);
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.15);
}

.document-item.selected {
  border-color: var(--azul-turno);
  background: rgba(0, 123, 255, 0.05);
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.document-preview {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 80px;
  background: #f8f9fa;
  border-radius: 0.5rem;
  margin-bottom: 1rem;
}

.file-icon {
  font-size: 2.5rem;
  color: var(--azul-turno);
  opacity: 0.7;
}

.document-badges {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: flex;
  gap: 0.25rem;
}

.badge {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.25rem;
  font-size: 0.75rem;
}

.badge-critical {
  background: #dc3545;
  color: white;
}

.badge-confidential {
  background: #6f42c1;
  color: white;
}

.document-info {
  flex: 1;
}

.document-title {
  margin: 0 0 0.25rem 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: #2c3e50;
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.document-category {
  margin: 0 0 0.5rem 0;
  font-size: 0.8rem;
  color: var(--azul-turno);
  font-weight: 500;
}

.document-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  font-size: 0.75rem;
}

.document-date {
  color: #6c757d;
  display: flex;
  align-items: center;
}

.document-urgency {
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-weight: 600;
  text-transform: uppercase;
}

.urgency-low {
  background: #d4edda;
  color: #155724;
}
.urgency-normal {
  background: #d1ecf1;
  color: #0c5460;
}
.urgency-high {
  background: #fff3cd;
  color: #856404;
}
.urgency-critical {
  background: #f8d7da;
  color: #721c24;
}

.original-attention {
  margin-bottom: 0.5rem;
  font-size: 0.75rem;
  color: #6c757d;
  display: flex;
  align-items: center;
}

.attention-text {
  font-family: monospace;
}

.document-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.tag {
  padding: 0.125rem 0.375rem;
  background: #e9ecef;
  border-radius: 0.25rem;
  font-size: 0.625rem;
  color: #495057;
  font-weight: 500;
}

.tag-more {
  padding: 0.125rem 0.375rem;
  background: #6c757d;
  color: white;
  border-radius: 0.25rem;
  font-size: 0.625rem;
  font-weight: 500;
}

.selection-indicator {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  color: var(--azul-turno);
  font-size: 1.25rem;
}

.selected-preview {
  padding: 1rem;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
}

.selected-preview h5 {
  margin: 0 0 0.75rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #495057;
}

.preview-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: white;
  border: 1px solid #dee2e6;
  border-radius: 0.5rem;
}

.preview-icon {
  font-size: 1.5rem;
  color: var(--azul-turno);
}

.preview-info {
  flex: 1;
}

.preview-info h6 {
  margin: 0 0 0.25rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: #2c3e50;
}

.preview-info p {
  margin: 0 0 0.25rem 0;
  font-size: 0.75rem;
  color: var(--azul-turno);
}

.preview-info small {
  font-size: 0.7rem;
  color: #6c757d;
}

.remove-selection-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: background 0.2s ease;
}

.remove-selection-btn:hover {
  background: #495057;
}

.actions-section {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding: 1rem;
  border-top: 1px solid #e9ecef;
  background: #f8f9fa;
}

.btn-cancel,
.btn-link {
  display: flex;
  align-items: center;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-cancel {
  background: #6c757d;
  color: white;
}

.btn-cancel:hover:not(:disabled) {
  background: #5a6268;
}

.btn-link {
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
}

.btn-link:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
}

.btn-cancel:disabled,
.btn-link:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

/* Responsive Design */
@media (max-width: 768px) {
  .filter-controls {
    flex-direction: column;
  }

  .documents-grid {
    grid-template-columns: 1fr;
  }

  .actions-section {
    flex-direction: column;
  }

  .btn-cancel,
  .btn-link {
    width: 100%;
    justify-content: center;
  }
}
</style>
