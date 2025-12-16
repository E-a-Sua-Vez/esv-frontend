<template>
  <div class="exam-result-template-manager patient-form-modern">
    <div class="template-manager-header">
      <div class="template-manager-header-content">
        <div class="template-manager-header-icon">
          <i class="bi bi-file-earmark-medical"></i>
        </div>
        <div class="template-manager-header-title">
          <h4>Gestión de Templates de Resultados</h4>
          <p class="text-muted small mb-0">
            Configure templates para cargar resultados estructurados
          </p>
        </div>
      </div>
      <div class="template-manager-header-actions">
        <button type="button" class="btn-modern" @click="showCreateModal = true">
          <i class="bi bi-plus-circle me-1"></i>
          Nuevo Template
        </button>
      </div>
    </div>

    <div v-if="loading" class="text-center py-5">
      <Spinner />
    </div>

    <div v-else-if="templates.length === 0" class="empty-state-modern">
      <div class="empty-state-modern-icon">
        <i class="bi bi-file-earmark-medical"></i>
      </div>
      <div class="empty-state-modern-title">No hay templates configurados</div>
      <div class="empty-state-modern-text">
        Cree un template para facilitar la carga de resultados de exámenes
      </div>
      <button type="button" class="btn-modern mt-3" @click="showCreateModal = true">
        <i class="bi bi-plus-circle me-1"></i>
        Crear Primer Template
      </button>
    </div>

    <div v-else class="templates-grid">
      <div v-for="template in templates" :key="template.id" class="template-card modern-card">
        <div class="template-card-header">
          <div class="template-card-title">
            <h6>{{ template.examName }}</h6>
            <span class="template-card-code">{{ template.examCode }}</span>
          </div>
          <div class="template-card-actions">
            <button
              type="button"
              class="btn btn-sm btn-outline-primary"
              @click="editTemplate(template)"
              title="Editar"
            >
              <i class="bi bi-pencil"></i>
            </button>
            <button
              type="button"
              class="btn btn-sm btn-outline-danger"
              @click="deleteTemplate(template.id)"
              title="Eliminar"
            >
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>

        <div class="template-card-body">
          <div class="template-info">
            <div class="template-info-item">
              <i class="bi bi-list-ul me-2"></i>
              <span>{{ template.parameters?.length || 0 }} parámetros</span>
            </div>
            <div class="template-info-item" v-if="template.commerceId">
              <i class="bi bi-building me-2"></i>
              <span>Específico del comercio</span>
            </div>
            <div class="template-info-item" v-else>
              <i class="bi bi-globe me-2"></i>
              <span>Template global</span>
            </div>
          </div>

          <div
            v-if="template.parameters && template.parameters.length > 0"
            class="template-parameters"
          >
            <h6 class="parameters-title">Parámetros:</h6>
            <div class="parameters-list">
              <span
                v-for="(param, index) in template.parameters.slice(0, 5)"
                :key="index"
                class="parameter-badge badge-modern badge-modern-info"
              >
                {{ param.name }}
              </span>
              <span
                v-if="template.parameters.length > 5"
                class="parameter-badge badge-modern badge-modern-info"
              >
                +{{ template.parameters.length - 5 }} más
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal para crear/editar template -->
    <ExamResultTemplateModal
      v-if="showCreateModal || editingTemplate"
      :show="showCreateModal || !!editingTemplate"
      :template="editingTemplate"
      :commerce-id="commerceId"
      @close="closeModal"
      @saved="handleTemplateSaved"
    />
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import Spinner from '../../common/Spinner.vue';
import ExamResultTemplateModal from './ExamResultTemplateModal.vue';
import {
  listExamResultTemplates,
  deleteExamResultTemplate,
} from '../../../application/services/medical-exam-order';
import { globalStore } from '../../../stores';

export default {
  name: 'ExamResultTemplateManager',
  components: {
    Spinner,
    ExamResultTemplateModal,
  },
  props: {
    commerceId: {
      type: String,
      required: true,
    },
  },
  setup(props) {
    const store = globalStore();
    const loading = ref(false);
    const templates = ref([]);
    const showCreateModal = ref(false);
    const editingTemplate = ref(null);

    const loadTemplates = async () => {
      try {
        loading.value = true;
        templates.value = await listExamResultTemplates(props.commerceId, store.business?.id);
      } catch (error) {
        console.error('Error loading templates:', error);
        templates.value = [];
      } finally {
        loading.value = false;
      }
    };

    const editTemplate = template => {
      editingTemplate.value = template;
    };

    const deleteTemplate = async id => {
      if (!confirm('¿Está seguro de eliminar este template?')) return;

      try {
        await deleteExamResultTemplate(id);
        await loadTemplates();
      } catch (error) {
        console.error('Error deleting template:', error);
        alert('Error al eliminar el template');
      }
    };

    const closeModal = () => {
      showCreateModal.value = false;
      editingTemplate.value = null;
    };

    const handleTemplateSaved = () => {
      closeModal();
      loadTemplates();
    };

    onMounted(() => {
      loadTemplates();
    });

    return {
      loading,
      templates,
      showCreateModal,
      editingTemplate,
      editTemplate,
      deleteTemplate,
      closeModal,
      handleTemplateSaved,
    };
  },
};
</script>

<style scoped>
@import '../../../shared/styles/prontuario-common.css';

.exam-result-template-manager {
  padding: 1.5rem;
  height: 100%;
  overflow-y: auto;
}

.template-manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(0, 0, 0, 0.05);
}

.template-manager-header-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.template-manager-header-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--border-radius-lg);
  background: var(--gradient-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.5rem;
}

.template-manager-header-title h4 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 1.5rem;
}

.template-card {
  transition: all 0.3s ease;
}

.template-card:hover {
  transform: translateY(-2px);
}

.template-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--border-color);
}

.template-card-title h6 {
  margin: 0 0 0.25rem 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-text);
}

.template-card-code {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  font-family: monospace;
}

.template-card-actions {
  display: flex;
  gap: 0.5rem;
}

.template-card-body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.template-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.template-info-item {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.template-parameters {
  margin-top: 0.5rem;
}

.parameters-title {
  font-size: 0.875rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: var(--color-text);
}

.parameters-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.parameter-badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
}

@media (max-width: 768px) {
  .template-manager-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .templates-grid {
    grid-template-columns: 1fr;
  }
}
</style>
