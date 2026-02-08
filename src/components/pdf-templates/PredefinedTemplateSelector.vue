<template>
  <div class="predefined-selector-overlay" @click.self="$emit('cancel')">
    <div class="modal-dialog modal-xl">
      <div class="modal-content">
        <!-- Modal Header -->
        <div class="modal-header border-0 centered active-name">
          <h5 class="modal-title fw-bold">
            <i class="bi bi-layout-text-window-reverse"></i>
            {{ t('pdfTemplates.predefinedSelector.title') }}
          </h5>
          <button class="btn-close" @click="$emit('cancel')" type="button"></button>
        </div>

        <!-- Modal Body -->
        <div class="modal-body text-center mb-0">
          <div class="selector-intro">
            <p class="text-muted mb-3">
              {{ t('pdfTemplates.predefinedSelector.description') }}
            </p>
          </div>

          <div class="templates-grid">
            <!-- Opción en blanco -->
            <div
              class="template-card"
              :class="{ selected: selectedTemplateId === 'blank' }"
              @click="selectTemplate('blank')"
            >
              <div class="template-preview blank-preview">
                <i class="bi bi-square text-muted"></i>
              </div>
              <div class="template-info">
                <div class="template-name">{{ t('pdfTemplates.predefinedSelector.blank') }}</div>
                <div class="template-description">
                  {{ t('pdfTemplates.predefinedSelector.startFromScratch') }}
                </div>
              </div>
            </div>

            <!-- Templates predefinidos -->
            <div
              v-for="template in filteredTemplates"
              :key="template.id"
              class="template-card"
              :class="{ selected: selectedTemplateId === template.id }"
              @click="selectTemplate(template.id)"
            >
              <div class="template-preview">
                <img v-if="template.preview" :src="template.preview" :alt="template.name" />
                <div v-else class="template-preview-placeholder">
                  <i :class="template.icon || 'bi bi-file-text'"></i>
                </div>
              </div>
              <div class="template-info">
                <div class="template-name">{{ template.name }}</div>
                <div class="template-description">{{ template.description }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="mx-2 mb-4 text-center">
          <button
            type="button"
            class="btn btn-lg btn-size fw-bold btn-secondary rounded-pill mt-2 px-4 me-2"
            @click="$emit('cancel')"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
            @click="applyTemplate"
            :disabled="!selectedTemplateId"
          >
            <i class="bi bi-check-lg me-1"></i>
            {{ t('pdfTemplates.predefinedSelector.apply') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { getPredefinedTemplates } from './predefinedTemplatesData';

export default {
  name: 'PredefinedTemplateSelector',
  props: {
    section: {
      type: String,
      required: true, // 'header', 'footer', 'content'
    },
    documentType: {
      type: String,
      default: 'prescription', // 'prescription', 'exam_order', 'reference'
    },
    pageSize: {
      type: String,
      default: 'A4',
    },
    orientation: {
      type: String,
      default: 'portrait',
    },
  },
  emits: ['apply', 'cancel'],
  setup(props, { emit }) {
    const { t } = useI18n();
    const selectedTemplateId = ref(null);
    const allTemplates = getPredefinedTemplates();

    const filteredTemplates = computed(() =>
      allTemplates.filter(
        template =>
          template.section === props.section &&
          (!template.documentType || template.documentType === props.documentType),
      ),
    );

    const selectTemplate = templateId => {
      selectedTemplateId.value = templateId;
    };

    const applyTemplate = () => {
      if (!selectedTemplateId.value) return;

      if (selectedTemplateId.value === 'blank') {
        emit('apply', []);
        return;
      }

      const template = allTemplates.find(t => t.id === selectedTemplateId.value);
      if (template && template.elements) {
        // Ajustar elementos según el tamaño de página y orientación
        const adjustedElements = adjustElementsForPageSize(
          template.elements,
          template.pageSize || 'A4',
          props.pageSize,
          template.orientation || 'portrait',
          props.orientation
        );
        emit('apply', adjustedElements);
      }
    };

    const adjustElementsForPageSize = (
      elements,
      fromPageSize,
      toPageSize,
      fromOrientation,
      toOrientation,
    ) => {
      // Obtener dimensiones base
      const getBaseDimensions = pageSize => {
        switch (pageSize) {
          case 'LETTER':
            return { w: 612, h: 792 };
          case 'A5':
            return { w: 420, h: 595 };
          case 'LETTER_HALF':
            return { w: 396, h: 612 };
          case 'A4':
          default:
            return { w: 595, h: 842 };
        }
      };

      const fromDim = getBaseDimensions(fromPageSize);
      const toDim = getBaseDimensions(toPageSize);

      // Ajustar por orientación
      const fromW = fromOrientation === 'landscape' ? fromDim.h : fromDim.w;
      const fromH = fromOrientation === 'landscape' ? fromDim.w : fromDim.h;
      const toW = toOrientation === 'landscape' ? toDim.h : toDim.w;
      const toH = toOrientation === 'landscape' ? toDim.w : toDim.h;

      const scaleX = toW / fromW;
      const scaleY = toH / fromH;

      return elements.map(el => ({
        ...el,
        x: (el.x || 0) * scaleX,
        y: (el.y || 0) * scaleY,
        width: (el.width || 0) * scaleX,
        height: (el.height || 0) * scaleY,
        fontSize: el.fontSize ? Math.round(el.fontSize * Math.min(scaleX, scaleY)) : el.fontSize,
      }));
    };

    return {
      t,
      selectedTemplateId,
      filteredTemplates,
      selectTemplate,
      applyTemplate,
    };
  },
};
</script>

<style scoped>
.predefined-selector-overlay {
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

.selector-intro {
  font-size: 0.9rem;
}

.templates-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 1rem;
  max-height: 55vh;
  overflow-y: auto;
  padding: 0.5rem 0;
  margin-bottom: 1rem;
}

.template-card {
  border: 2px solid var(--border-color, #dee2e6);
  border-radius: var(--border-radius-md, 0.5rem);
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  background: #fff;
}

.template-card:hover {
  border-color: var(--azul-turno, #007bff);
  box-shadow: 0 2px 8px rgba(0, 123, 255, 0.15);
  transform: translateY(-2px);
}

.template-card.selected {
  border-color: var(--azul-turno, #007bff);
  background: rgba(0, 123, 255, 0.05);
  box-shadow: 0 2px 12px rgba(0, 123, 255, 0.3);
}

.template-preview {
  width: 100%;
  height: 110px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
  border-radius: var(--border-radius-sm, 0.375rem);
  margin-bottom: 0.75rem;
  overflow: hidden;
}

.template-preview.blank-preview {
  border: 2px dashed #dee2e6;
  background: #fff;
}

.template-preview i {
  font-size: 2.5rem;
}

.template-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.template-preview-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6c757d;
}

.template-preview-placeholder i {
  font-size: 2.5rem;
}

.template-info {
  text-align: center;
}

.template-name {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--color-text, #212529);
  margin-bottom: 0.25rem;
  line-height: 0.9rem;
}

.template-description {
  font-size: 0.75rem;
  color: var(--color-text-muted, #6c757d);
  line-height: 1.3;
}

/* Scrollbar styling para el grid */
.templates-grid::-webkit-scrollbar {
  width: 8px;
}

.templates-grid::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.templates-grid::-webkit-scrollbar-thumb {
  background: #888;
  border-radius: 4px;
}

.templates-grid::-webkit-scrollbar-thumb:hover {
  background: #555;
}
</style>
