<template>
  <div class="template-picker">
    <div class="template-picker-header">
      <button
        type="button"
        class="btn-action btn-action-secondary"
        @click="showPicker = !showPicker"
        :disabled="loading"
      >
        <i class="bi bi-file-earmark-text me-1"></i>
        {{ showPicker ? 'Ocultar' : 'Templates' }}
      </button>
    </div>

    <div v-if="showPicker" class="template-picker-content">
      <div class="template-search-bar">
        <input
          type="text"
          class="form-control"
          v-model="searchTerm"
          @input="debouncedSearch"
          placeholder="Buscar templates..."
        />
        <select v-model="filterType" class="form-control ms-2" style="max-width: 200px">
          <option value="">Todos los tipos</option>
          <option value="diagnostic">Diagnóstico</option>
          <option value="anamnesis">Anamnesis</option>
          <option value="evolution">Evolución</option>
          <option value="prescription">Receta</option>
          <option value="exam_order">Pedido de Examen</option>
          <option value="reference">Referencia</option>
          <option value="general">General</option>
        </select>
        <button
          type="button"
          class="btn-action ms-2"
          :class="showFavoritesOnly ? 'btn-action-primary' : 'btn-action-secondary'"
          @click="showFavoritesOnly = !showFavoritesOnly"
        >
          <i class="bi bi-star-fill me-1"></i>
          Favoritos
        </button>
      </div>

      <div v-if="loading" class="text-center py-3">
        <Spinner />
      </div>

      <div v-else-if="templates.length === 0" class="text-center py-3 text-muted">
        No se encontraron templates
      </div>

      <div v-else class="template-list">
        <div
          v-for="template in templates"
          :key="template.id"
          class="template-item"
          :class="{ 'template-favorite': template.isFavorite }"
        >
          <div class="template-item-header">
            <div class="template-item-title">
              <i v-if="template.isFavorite" class="bi bi-star-fill text-warning me-1"></i>
              <strong>{{ template.name }}</strong>
              <span class="badge bg-secondary ms-2">{{ getTypeLabel(template.type) }}</span>
            </div>
            <div class="template-item-actions">
              <button
                type="button"
                class="btn-action btn-action-secondary"
                @click="toggleFavorite(template.id)"
                :title="template.isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'"
              >
                <i :class="template.isFavorite ? 'bi bi-star-fill text-warning' : 'bi bi-star'"></i>
              </button>
              <button type="button" class="btn-action btn-action-primary" @click="applyTemplate(template)">
                <i class="bi bi-check-circle me-1"></i>
                Usar
              </button>
            </div>
          </div>
          <div v-if="template.description" class="template-item-description">
            {{ template.description }}
          </div>
          <div v-if="template.category" class="template-item-category">
            <i class="bi bi-tag me-1"></i>
            {{ template.category }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted } from 'vue';
import Spinner from '../../common/Spinner.vue';
import {
  searchTemplates,
  processTemplate,
  toggleFavorite,
} from '../../../application/services/medical-template';
import { debounce } from '../../../shared/utils/debounce';
import { useKeyboardShortcuts } from '../../../composables/useKeyboardShortcuts';

export default {
  name: 'TemplatePicker',
  components: {
    Spinner,
  },
  props: {
    commerceId: {
      type: String,
      required: true,
    },
    doctorId: {
      type: String,
      required: true,
    },
    templateType: {
      type: String,
      default: 'general',
    },
    toggles: {
      type: Object,
      default: () => ({}),
    },
  },
  emits: ['template-selected'],
  setup(props, { emit }) {
    const showPicker = ref(false);
    const loading = ref(false);
    const templates = ref([]);
    const searchTerm = ref('');
    const filterType = ref(props.templateType || '');
    const showFavoritesOnly = ref(false);

    const loadTemplates = async () => {
      if (!props.commerceId || !props.doctorId) return;

      try {
        loading.value = true;
        const result = await searchTemplates(props.commerceId, props.doctorId, {
          searchTerm: searchTerm.value || undefined,
          type: filterType.value || undefined,
          favoritesOnly: showFavoritesOnly.value || undefined,
          page: 1,
          limit: 50,
        });
        templates.value = result.templates || [];
      } catch (error) {
        console.error('Error loading templates:', error);
        templates.value = [];
      } finally {
        loading.value = false;
      }
    };

    const debouncedSearch = debounce(loadTemplates, 300);

    watch([filterType, showFavoritesOnly], () => {
      loadTemplates();
    });

    const getTypeLabel = type => {
      const labels = {
        diagnostic: 'Diagnóstico',
        anamnesis: 'Anamnesis',
        evolution: 'Evolución',
        prescription: 'Receta',
        exam_order: 'Examen',
        reference: 'Referencia',
        general: 'General',
      };
      return labels[type] || type;
    };

    const applyTemplate = async template => {
      try {
        console.log('🔵 TemplatePicker: Aplicando template:', template);

        // Procesar template con variables del sistema
        const variables = {
          date: new Date().toLocaleDateString('pt-BR'),
          time: new Date().toLocaleTimeString('pt-BR'),
          datetime: new Date().toLocaleString('pt-BR'),
        };

        console.log('🔵 TemplatePicker: Procesando con variables:', variables);
        const result = await processTemplate(template.id, variables);
        console.log('🔵 TemplatePicker: Resultado procesado:', result);
        console.log('🔵 TemplatePicker: Emitiendo template-selected con:', result.processedContent);

        emit('template-selected', result.processedContent);
        showPicker.value = false;
      } catch (error) {
        console.error('❌ Error processing template:', error);
        alert('Error al procesar el template');
      }
    };

    const toggleFavoriteTemplate = async templateId => {
      try {
        await toggleFavorite(templateId);
        await loadTemplates();
      } catch (error) {
        console.error('Error toggling favorite:', error);
      }
    };

    // Atajo de teclado Ctrl+T para abrir/cerrar templates
    useKeyboardShortcuts(
      {
        'ctrl+t': () => {
          if (props.commerceId && props.doctorId) {
            showPicker.value = !showPicker.value;
            if (showPicker.value && templates.value.length === 0) {
              loadTemplates();
            }
          }
        },
        escape: () => {
          if (showPicker.value) {
            showPicker.value = false;
          }
        },
      },
      [props.commerceId, props.doctorId]
    );

    onMounted(() => {
      if (props.commerceId && props.doctorId) {
        loadTemplates();
      }
    });

    return {
      showPicker,
      loading,
      templates,
      searchTerm,
      filterType,
      showFavoritesOnly,
      debouncedSearch,
      getTypeLabel,
      applyTemplate,
      toggleFavorite: toggleFavoriteTemplate,
    };
  },
};
</script>

<style scoped>
@import '../../../shared/styles/prontuario-common.css';

.template-picker {
  margin-bottom: 0.5rem;
}

.template-picker-header {
  display: flex;
  align-items: center;
  margin-bottom: 0.25rem;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.btn-action {
  display: inline-flex;
  align-items: center;
  padding: 0.3rem 0.5rem;
  border: none;
  border-radius: 0.3rem;
  font-weight: 600;
  font-size: 0.75rem;
  transition: all 0.2s ease;
  cursor: pointer;
  white-space: nowrap;
  height: 32px;
}

.btn-action i {
  font-size: 0.85rem;
}

.btn-action-primary {
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.btn-action-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.btn-action-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-action-secondary {
  background: white;
  color: var(--color-text);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.btn-action-secondary:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.03);
  border-color: var(--azul-turno);
}

.btn-action-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.template-picker-content {
  background: #fafbfc;
  border: 1px solid #d1d7dd;
  border-radius: 4px;
  padding: 0.5rem;
  margin-top: 0.25rem;
}

.template-search-bar {
  display: flex;
  margin-bottom: 0.5rem;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.template-search-bar .form-control {
  flex: 1;
  min-width: 150px;
  font-size: 0.813rem;
  padding: 0.25rem 0.5rem;
  height: 30px;
}

.template-search-bar select.form-control {
  max-width: 150px;
  font-size: 0.813rem;
}

.template-search-bar .btn-action {
  height: 30px;
}

.template-list {
  max-height: 300px;
  overflow-y: auto;
}

.template-item {
  padding: 0.5rem;
  border: 1px solid #d1d7dd;
  border-radius: 4px;
  margin-bottom: 0.25rem;
  transition: all 0.2s ease;
  background: white;
}

.template-item:hover {
  background: rgba(68, 111, 252, 0.05);
  border-color: var(--azul-turno);
}

.template-favorite {
  border-color: #f59e0b;
  background: rgba(245, 158, 11, 0.03);
}

.template-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.template-item-title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.25rem;
  font-size: 0.875rem;
}

.template-item-title strong {
  font-size: 0.875rem;
  font-weight: 600;
}

.template-item-title .badge {
  font-size: 0.7rem;
  padding: 0.15rem 0.4rem;
}

.template-item-actions {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.template-item-actions .btn-action {
  height: 28px;
  padding: 0.25rem 0.4rem;
  font-size: 0.7rem;
}

.template-item-actions .btn-action i {
  font-size: 0.75rem;
}

.template-item-description {
  color: #6c757d;
  font-size: 0.75rem;
  margin-bottom: 0.15rem;
  line-height: 1.3;
}

.template-item-category {
  color: #6c757d;
  font-size: 0.7rem;
  display: flex;
  align-items: center;
}

@media (max-width: 768px) {
  .template-search-bar {
    flex-direction: column;
  }

  .template-search-bar .form-control,
  .template-search-bar select {
    width: 100%;
    min-width: unset;
  }

  .template-item-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .template-item-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
