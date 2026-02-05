<template>
  <div class="document-tree-view">
    <!-- Tree/List View Toggle -->
    <div class="view-controls">
      <div class="view-toggle">
        <button @click="setViewMode('tree')" :class="['view-btn', { active: viewMode === 'tree' }]">
          <i class="bi bi-diagram-3"></i>
          {{ $t('documentTreeView.tree') }}
        </button>
        <button @click="setViewMode('list')" :class="['view-btn', { active: viewMode === 'list' }]">
          <i class="bi bi-list-ul"></i>
          {{ $t('documentTreeView.list') }}
        </button>
        <button @click="setViewMode('grid')" :class="['view-btn', { active: viewMode === 'grid' }]">
          <i class="bi bi-grid-3x3"></i>
          {{ $t('documentTreeView.gallery') }}
        </button>
      </div>

      <div v-if="viewMode === 'tree'" class="tree-controls">
        <button @click="expandAll" class="control-btn" :title="$t('documentTreeView.expandAll')">
          <i class="bi bi-plus-square"></i>
        </button>
        <button @click="collapseAll" class="control-btn" :title="$t('documentTreeView.collapseAll')">
          <i class="bi bi-dash-square"></i>
        </button>
      </div>
    </div>

    <!-- Tree View -->
    <div v-if="viewMode === 'tree'" class="tree-container">
      <div class="tree-node" v-for="node in treeData" :key="node.id">
        <div
          class="tree-node-header"
          @click="toggleNode(node)"
          :class="{ expanded: node.expanded }"
        >
          <i
            :class="[
              'tree-icon',
              node.children?.length > 0
                ? node.expanded
                  ? 'bi-chevron-down'
                  : 'bi-chevron-right'
                : 'bi-file-earmark',
            ]"
          ></i>
          <i :class="['type-icon', node.icon]"></i>
          <span class="node-label">{{ node.label }}</span>
          <span class="node-count">({{ node.count }})</span>
        </div>

        <!-- Children -->
        <div v-if="node.expanded && node.children" class="tree-children">
          <div v-for="child in node.children" :key="child.id" class="tree-child">
            <div
              class="tree-child-header"
              @click="toggleNode(child)"
              :class="{ expanded: child.expanded }"
            >
              <i
                :class="[
                  'tree-icon',
                  child.children?.length > 0
                    ? child.expanded
                      ? 'bi-chevron-down'
                      : 'bi-chevron-right'
                    : 'bi-file-earmark',
                ]"
              ></i>
              <i :class="['type-icon', child.icon]"></i>
              <span class="child-label">{{ child.label }}</span>
              <span class="child-count">({{ child.count }})</span>
            </div>

            <!-- Documents in this category -->
            <div v-if="child.expanded && child.documents" class="document-items">
              <div
                v-for="doc in child.documents"
                :key="doc?.id || Math.random()"
                class="document-item"
                :class="{ 'selection-mode': selectionMode }"
                @click="selectionMode ? () => {} : selectDocument(doc)"
              >
                <div v-if="selectionMode" class="selection-checkbox">
                  <input
                    type="checkbox"
                    :checked="isDocumentSelected(doc)"
                    @change="toggleDocumentSelection(doc)"
                    @click.stop
                  />
                </div>
                <i :class="['doc-icon', getDocumentIcon(doc)]"></i>
                <div class="doc-info">
                  <div class="doc-header">
                    <span class="doc-name">{{ doc.name || 'Documento sin nombre' }}</span>
                    <div class="doc-badges">
                      <!-- Generated Document Badge -->
                      <span
                        v-if="isGeneratedDocument(doc)"
                        :class="[
                          'badge',
                          getGeneratedDocumentType(doc)?.color || 'badge-success',
                          'badge-generated',
                        ]"
                        :title="`Documento generado automáticamente: ${
                          getGeneratedDocumentType(doc)?.label
                        }`"
                      >
                        <i
                          :class="`bi ${
                            getGeneratedDocumentType(doc)?.icon || 'bi-file-earmark-pdf'
                          } me-1`"
                        ></i>
                        {{ getGeneratedDocumentType(doc)?.label }}
                      </span>
                      <!-- Category Badge -->
                      <span
                        v-if="doc.category && doc.category !== 'OTHER'"
                        class="badge badge-info"
                        :title="`Categoría: ${getCategoryLabel(doc.category)}`"
                      >
                        <i class="bi bi-folder me-1"></i>
                        {{ getCategoryLabel(doc.category) }}
                      </span>
                      <!-- Urgency Badge -->
                      <span
                        v-if="doc.urgency && doc.urgency !== 'NORMAL'"
                        :class="[
                          'badge',
                          doc.urgency === 'HIGH' ? 'badge-warning' :
                          doc.urgency === 'CRITICAL' ? 'badge-danger' : 'badge-secondary'
                        ]"
                        :title="`Urgencia: ${getUrgencyLabel(doc.urgency)}`"
                      >
                        <i class="bi bi-exclamation-triangle me-1"></i>
                        {{ getUrgencyLabel(doc.urgency) }}
                      </span>
                      <!-- Tags -->
                      <span
                        v-for="tag in doc.tags"
                        :key="tag"
                        class="badge badge-primary"
                        :title="`Etiqueta: ${tag}`"
                      >
                        <i class="bi bi-tag me-1"></i>
                        {{ tag }}
                      </span>
                      <!-- Regular Document Badges -->
                      <span
                        class="badge badge-primary"
                        v-if="doc.details?.tag && !isGeneratedDocument(doc)"
                        >{{ doc.details.tag }}</span
                      >
                      <span
                        class="badge badge-secondary"
                        v-if="doc.details?.name && !isGeneratedDocument(doc)"
                        >{{ doc.details.name }}</span
                      >
                    </div>
                  </div>
                  <span class="doc-date">{{ getDateAndHour(doc.createdAt) }}</span>
                  <!-- Auto-generated indicator -->
                  <span
                    v-if="isGeneratedDocument(doc)"
                    class="auto-generated-indicator"
                    title="Generado automáticamente"
                  >
                    <i class="bi bi-magic"></i>
                  </span>
                </div>
                <div class="doc-actions">
                  <button @click.stop="previewDocument(doc)" class="action-btn">
                    <i class="bi bi-eye"></i>
                  </button>
                  <button @click.stop="downloadDocument(doc)" class="action-btn">
                    <i class="bi bi-download"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- List View -->
    <div v-if="viewMode === 'list'" class="list-container">
      <div
        v-for="doc in flatDocuments"
        :key="doc?.id || Math.random()"
        class="list-item"
        :class="{ 'selection-mode': selectionMode }"
        @click="selectionMode ? () => {} : selectDocument(doc)"
      >
        <div v-if="selectionMode" class="selection-checkbox">
          <input
            type="checkbox"
            :checked="isDocumentSelected(doc)"
            @change="toggleDocumentSelection(doc)"
            @click.stop
          />
        </div>
        <i :class="['doc-icon', getDocumentIcon(doc)]"></i>
        <div class="doc-details">
          <div class="doc-header">
            <div class="doc-name">{{ doc.name || 'Documento sin nombre' }}</div>
            <div class="doc-badges">
              <!-- Generated Document Badge -->
              <span
                v-if="isGeneratedDocument(doc)"
                :class="[
                  'badge',
                  getGeneratedDocumentType(doc)?.color || 'badge-success',
                  'badge-generated',
                ]"
                :title="`Documento generado automáticamente: ${
                  getGeneratedDocumentType(doc)?.label
                }`"
              >
                <i
                  :class="`bi ${
                    getGeneratedDocumentType(doc)?.icon || 'bi-file-earmark-pdf'
                  } me-1`"
                ></i>
                {{ getGeneratedDocumentType(doc)?.label }}
              </span>
              <!-- Category Badge -->
              <span
                v-if="doc.category && doc.category !== 'OTHER'"
                class="badge badge-info"
                :title="`Categoría: ${getCategoryLabel(doc.category)}`"
              >
                <i class="bi bi-folder me-1"></i>
                {{ getCategoryLabel(doc.category) }}
              </span>
              <!-- Urgency Badge -->
              <span
                v-if="doc.urgency && doc.urgency !== 'NORMAL'"
                :class="[
                  'badge',
                  doc.urgency === 'HIGH' ? 'badge-warning' :
                  doc.urgency === 'CRITICAL' ? 'badge-danger' : 'badge-secondary'
                ]"
                :title="`Urgencia: ${getUrgencyLabel(doc.urgency)}`"
              >
                <i class="bi bi-exclamation-triangle me-1"></i>
                {{ getUrgencyLabel(doc.urgency) }}
              </span>
              <!-- Tags -->
              <span
                v-for="tag in doc.tags"
                :key="tag"
                class="badge badge-primary"
                :title="`Etiqueta: ${tag}`"
              >
                <i class="bi bi-tag me-1"></i>
                {{ tag }}
              </span>
              <!-- Regular Document Badges -->
              <span
                class="badge badge-primary"
                v-if="doc.details?.tag && !isGeneratedDocument(doc)"
                >{{ doc.details.tag }}</span
              >
              <span
                class="badge badge-secondary"
                v-if="doc.details?.name && !isGeneratedDocument(doc)"
                >{{ doc.details.name }}</span
              >
            </div>
          </div>
          <div class="doc-meta">
            <span class="doc-category">{{ getCategoryLabel(doc.category) }}</span>
            <span class="doc-date">{{ getDateAndHour(doc.createdAt) }}</span>
            <!-- Auto-generated indicator -->
            <span
              v-if="isGeneratedDocument(doc)"
              class="auto-generated-indicator"
              title="Generado automáticamente"
            >
              <i class="bi bi-magic"></i>
            </span>
          </div>
        </div>
        <div class="doc-actions">
          <button @click.stop="previewDocument(doc)" class="action-btn">
            <i class="bi bi-eye"></i>
          </button>
          <button @click.stop="downloadDocument(doc)" class="action-btn">
            <i class="bi bi-download"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- Grid View (Image Gallery) -->
    <div v-if="viewMode === 'grid'" class="grid-container">
      <div
        v-for="doc in flatDocuments"
        :key="doc?.id || Math.random()"
        class="grid-item"
        :class="{ 'selection-mode': selectionMode }"
        @click="selectionMode ? () => {} : selectDocument(doc)"
      >
        <div v-if="selectionMode" class="selection-checkbox grid-checkbox">
          <input
            type="checkbox"
            :checked="isDocumentSelected(doc)"
            @change="toggleDocumentSelection(doc)"
            @click.stop
          />
        </div>
        <div class="grid-thumbnail">
          <img
            v-if="isImage(doc)"
            :src="getDocumentThumbnail(doc)"
            :alt="doc.name || 'Documento sin nombre'"
            class="thumbnail-image"
            @error="handleImageError"
          />
          <div v-else class="thumbnail-placeholder">
            <i :class="['placeholder-icon', getDocumentIcon(doc)]"></i>
          </div>
        </div>
        <div class="grid-info">
          <div class="grid-name">{{ doc.name || 'Documento sin nombre' }}</div>
          <div class="grid-badges">
            <!-- Generated Document Badge -->
            <span
              v-if="isGeneratedDocument(doc)"
              :class="[
                'badge',
                getGeneratedDocumentType(doc)?.color || 'badge-success',
                'badge-generated',
              ]"
              :title="`Documento generado automáticamente: ${
                getGeneratedDocumentType(doc)?.label
              }`"
            >
              <i
                :class="`bi ${
                  getGeneratedDocumentType(doc)?.icon || 'bi-file-earmark-pdf'
                }`"
              ></i>
            </span>
            <!-- Category Badge -->
            <span
              v-if="doc.category && doc.category !== 'OTHER'"
              class="badge badge-info"
              :title="`Categoría: ${getCategoryLabel(doc.category)}`"
            >
              <i class="bi bi-folder"></i>
            </span>
            <!-- Urgency Badge -->
            <span
              v-if="doc.urgency && doc.urgency !== 'NORMAL'"
              :class="[
                'badge',
                doc.urgency === 'HIGH' ? 'badge-warning' :
                doc.urgency === 'CRITICAL' ? 'badge-danger' : 'badge-secondary'
              ]"
              :title="`Urgencia: ${getUrgencyLabel(doc.urgency)}`"
            >
              <i class="bi bi-exclamation-triangle"></i>
            </span>
            <!-- Tags (show only first tag as icon) -->
            <span
              v-if="doc.tags && doc.tags.length > 0"
              class="badge badge-primary"
              :title="`Etiquetas: ${doc.tags.join(', ')}`"
            >
              <i class="bi bi-tag"></i>
              <span v-if="doc.tags.length === 1" class="tag-text">{{ doc.tags[0] }}</span>
              <span v-else>+{{ doc.tags.length }}</span>
            </span>
            <!-- Regular Document Badges (compact) -->
            <span
              v-if="doc.details?.tag && !isGeneratedDocument(doc)"
              class="badge badge-primary"
              :title="doc.details.tag"
            >
              {{ doc.details.tag?.length > 3 ? doc.details.tag.substring(0, 3) + '...' : doc.details.tag }}
            </span>
            <span
              v-if="doc.details?.name && !isGeneratedDocument(doc)"
              class="badge badge-secondary"
              :title="doc.details.name"
            >
              {{ doc.details.name?.length > 3 ? doc.details.name.substring(0, 3) + '...' : doc.details.name }}
            </span>
          </div>
          <div class="grid-date">{{ getDateAndHour(doc.createdAt) }}</div>
        </div>
        <div class="grid-actions">
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, toRefs } from 'vue';
import { useI18n } from 'vue-i18n';
import { getFileTypeIcon } from '../../application/services/document';

export default {
  name: 'DocumentTreeView',
  props: {
    documents: {
      type: Array,
      default: () => [],
    },
    selectionMode: {
      type: Boolean,
      default: false,
    },
    selectedDocuments: {
      type: Array,
      default: () => [],
    },
  },
  emits: ['document-selected', 'document-preview', 'document-download', 'document-toggle-selection', 'view-mode-changed'],
  setup(props, { emit }) {
    const { t } = useI18n();
    const viewMode = ref('list');
    const expandedNodes = ref(new Set());

    // Make selectionMode reactive for template
    const selectionMode = computed(() => props.selectionMode);

    // Organize documents into tree structure
    const treeData = computed(() => {
      try {
        const tree = [];

        // Group by category first
        const categoryGroups = {};
        props.documents.forEach(doc => {
          if (!doc) return; // Skip null/undefined documents
          const category = doc.category || 'OTHER';
          if (!categoryGroups[category]) {
            categoryGroups[category] = [];
          }
          categoryGroups[category].push(doc);
        });

        // Create category nodes
        Object.keys(categoryGroups).forEach(category => {
          const categoryDocs = categoryGroups[category];
          const categoryNode = {
            id: `category-${category}`,
            label: getCategoryLabel(category),
            icon: getCategoryIcon(category),
            count: categoryDocs.length,
            expanded: expandedNodes.value.has(`category-${category}`),
            children: [],
          };

          // Group by date within category
          const dateGroups = {};
          categoryDocs.forEach(doc => {
            if (!doc.createdAt) return; // Skip documents without creation date
            const date = new Date(doc.createdAt);
            if (isNaN(date.getTime())) return; // Skip invalid dates
            const dateKey = getDateGroupKey(date);
            if (!dateGroups[dateKey]) {
              dateGroups[dateKey] = [];
            }
            dateGroups[dateKey].push(doc);
          });

          // Create date nodes
          Object.keys(dateGroups)
            .sort()
            .reverse()
            .forEach(dateKey => {
              const dateDocs = dateGroups[dateKey];
              const dateNode = {
                id: `${category}-${dateKey}`,
                label: dateKey,
                icon: 'bi-calendar3',
                count: dateDocs.length,
                expanded: expandedNodes.value.has(`${category}-${dateKey}`),
                documents: dateDocs,
              };
              categoryNode.children.push(dateNode);
            });

          tree.push(categoryNode);
        });

        return tree;
      } catch (error) {
        console.error('Error building tree data:', error);
        return [];
      }
    });

    // Flat list of all documents (preserve order from props)
    const flatDocuments = computed(() => {
      try {
        return props.documents.filter(doc => doc && doc.id).slice();
      } catch (error) {
        console.error('Error building flat documents:', error);
        return [];
      }
    });

    // Methods
    const toggleNode = node => {
      if (expandedNodes.value.has(node.id)) {
        expandedNodes.value.delete(node.id);
      } else {
        expandedNodes.value.add(node.id);
      }
      node.expanded = !node.expanded;
    };

    const expandAll = () => {
      const allNodeIds = [];
      const collectNodeIds = nodes => {
        nodes.forEach(node => {
          allNodeIds.push(node.id);
          if (node.children) {
            collectNodeIds(node.children);
          }
        });
      };
      collectNodeIds(treeData.value);
      expandedNodes.value = new Set(allNodeIds);
    };

    const collapseAll = () => {
      expandedNodes.value.clear();
    };

    const selectDocument = doc => {
      emit('document-selected', doc);
    };

    const previewDocument = doc => {
      emit('document-preview', doc);
    };

    const downloadDocument = doc => {
      emit('document-download', doc);
    };

    const toggleDocumentSelection = doc => {
      emit('document-toggle-selection', doc);
    };

    const isDocumentSelected = doc => {
      try {
        if (!doc || !doc.id) return false;
        return props.selectedDocuments.some(selected => selected && selected.id === doc.id);
      } catch (error) {
        console.error('Error checking document selection:', error);
        return false;
      }
    };

    const getDocumentIcon = doc => getFileTypeIcon(doc.format || doc.type);

    const setViewMode = mode => {
      viewMode.value = mode;
      emit('view-mode-changed', mode);
    };

    const getCategoryLabel = category => {
      return t('documents.categories.' + category, category);
    };

    const getCategoryIcon = category => {
      const icons = {
        LABORATORY_RESULTS: 'bi-flask',
        IMAGING_STUDIES: 'bi-camera',
        PRESCRIPTIONS: 'bi-prescription2',
        CONSULTATION_NOTES: 'bi-journal-medical',
        DISCHARGE_SUMMARY: 'bi-door-open',
        REFERRALS: 'bi-arrow-right-circle',
        CONSENT_FORMS: 'bi-file-earmark-check',
        INSURANCE_DOCUMENTS: 'bi-shield-check',
        PRESCRIPTION_RECORDS: 'bi-book-medical',
        OTHER: 'bi-file-earmark',
      };
      return icons[category] || 'bi-file-earmark';
    };

    const getDateGroupKey = date => {
      const now = new Date();
      const diffTime = now - date;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 1) return 'Hoy';
      if (diffDays <= 7) return 'Esta semana';
      if (diffDays <= 30) return 'Este mes';
      if (diffDays <= 90) return 'Últimos 3 meses';

      return date.getFullYear().toString();
    };

    const formatDate = dateStr => {
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    };

    const isImage = doc => {
      const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      return imageTypes.includes(doc?.format) || (doc?.name && /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.name));
    };

    const getDocumentThumbnail = doc =>
      // In a real implementation, you would have thumbnail URLs
      // For now, return a placeholder or the document URL
      doc.thumbnailUrl || doc.url || '/api/documents/thumbnail/' + doc.id;
    const handleImageError = event => {
      event.target.style.display = 'none';
      const placeholder = event.target.parentElement.querySelector('.thumbnail-placeholder');
      if (placeholder) placeholder.style.display = 'flex';
    };

    const getUrgencyLabel = urgency => {
      const labels = {
        LOW: 'Baja',
        NORMAL: 'Normal',
        HIGH: 'Alta',
        CRITICAL: 'Crítica',
      };
      return labels[urgency] || urgency;
    };

    const isGeneratedDocument = doc => {
      if (!doc || !doc.option) return false;
      return ['prescription_pdf', 'exam_order_pdf', 'reference_pdf'].includes(doc.option);
    };

    const getGeneratedDocumentType = doc => {
      if (!doc || !doc.option) return null;
      const typeMap = {
        prescription_pdf: {
          label: 'Receta Médica',
          icon: 'bi-prescription',
          color: 'badge-success',
        },
        exam_order_pdf: {
          label: 'Orden de Examen',
          icon: 'bi-clipboard-data',
          color: 'badge-info',
        },
        reference_pdf: {
          label: 'Referencia Médica',
          icon: 'bi-arrow-right-circle',
          color: 'badge-warning',
        },
      };
      return typeMap[doc.option] || null;
    };

    const getDateAndHour = dateStr => {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '';
      return date.toLocaleString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    };

    return {
      viewMode,
      treeData,
      flatDocuments,
      toggleNode,
      expandAll,
      collapseAll,
      selectDocument,
      previewDocument,
      downloadDocument,
      toggleDocumentSelection,
      isDocumentSelected,
      setViewMode,
      getDocumentIcon,
      getCategoryLabel,
      getUrgencyLabel,
      isGeneratedDocument,
      getGeneratedDocumentType,
      getDateAndHour,
      formatDate,
      isImage,
      getDocumentThumbnail,
      handleImageError,
      // Props for template access
      selectionMode,
    };
  },
};
</script>

<style scoped>
.document-tree-view {
  background: white;
  border-radius: 0.5rem;
  border: 1px solid #e9ecef;
  overflow: hidden;
}

.view-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.1rem;
  border-bottom: 1px solid #e9ecef;
  background: #f8f9fa;
}

.view-toggle {
  display: flex;
  gap: 0.25rem;
}

.view-btn {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  border: 1px solid #dee2e6;
  background: white;
  border-radius: 0.25rem;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.view-btn:hover {
  background: #e9ecef;
}

.view-btn.active {
  background: var(--azul-turno);
  border-color: var(--azul-turno);
  color: white;
}

.tree-controls {
  display: flex;
  gap: 0.25rem;
}

.control-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #dee2e6;
  background: white;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.control-btn:hover {
  background: #e9ecef;
}

/* Tree View Styles */
.tree-container {
  max-height: 600px;
  overflow-y: auto;
  padding: 0.5rem;
}

.tree-node {
  margin-bottom: 0.25rem;
}

.tree-node-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.2rem;
  cursor: pointer;
  border-radius: 0.25rem;
  transition: background 0.2s ease;
}

.tree-node-header:hover {
  background: #f8f9fa;
}

.tree-icon {
  width: 16px;
  color: #6c757d;
}

.type-icon {
  color: var(--azul-turno);
}

.node-label {
  font-weight: 600;
  color: #495057;
  font-size: 0.875rem;
}

.node-count {
  color: #6c757d;
  font-size: 0.75rem;
  margin-left: auto;
}

.tree-children {
  margin-left: 1.5rem;
  border-left: 1px solid #e9ecef;
  padding-left: 0.5rem;
}

.tree-child-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem;
  cursor: pointer;
  border-radius: 0.25rem;
  transition: background 0.2s ease;
}

.tree-child-header:hover {
  background: #f8f9fa;
}

.child-label {
  font-size: 0.8rem;
  color: #495057;
}

.child-count {
  color: #6c757d;
  font-size: 0.7rem;
  margin-left: auto;
}

.document-items {
  margin-left: 1rem;
  margin-top: 0.1rem;
}

.document-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.1rem;
  cursor: pointer;
  border-radius: 0.25rem;
  transition: all 0.2s ease;
}

.document-item:hover {
  background: #e3f2fd;
}

.doc-icon {
  color: #6c757d;
  font-size: 0.875rem;
}

.doc-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.doc-name {
  font-size: 0.8rem;
  color: #495057;
}

.doc-date {
  font-size: 0.7rem;
  color: #6c757d;
}

.doc-actions {
  display: flex;
  gap: 0.25rem;
}

.action-btn {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 0.25rem;
  cursor: pointer;
  transition: background 0.2s ease;
  font-size: 0.75rem;
}

.action-btn:hover {
  background: rgba(0, 123, 255, 0.1);
  color: var(--azul-turno);
}

/* List View Styles */
.list-container {
  max-height: 600px;
  overflow-y: auto;
}

.list-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-bottom: 1px solid #f1f3f4;
  cursor: pointer;
  transition: background 0.2s ease;
}

.list-item:hover {
  background: #f8f9fa;
}

.doc-details {
  flex: 1;
}

.doc-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: #495057;
  margin-bottom: 0.25rem;
}

.doc-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.75rem;
  color: #6c757d;
}

/* Grid View Styles */
.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 0.75rem;
  padding: 0.75rem;
  max-height: 600px;
  overflow-y: auto;
}

.grid-item {
  display: flex;
  flex-direction: column;
  border: 1px solid #e9ecef;
  border-radius: 0.375rem;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s ease;
}

.grid-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.grid-thumbnail {
  position: relative;
  width: 100%;
  height: 120px;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.thumbnail-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumbnail-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.placeholder-icon {
  font-size: 2rem;
  color: #6c757d;
}

.grid-info {
  padding: 0.5rem;
  flex: 1;
}

.grid-name {
  font-size: 0.75rem;
  font-weight: 500;
  color: #495057;
  margin-bottom: 0.25rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.grid-date {
  font-size: 0.7rem;
  color: #6c757d;
}

.grid-actions {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.grid-item:hover .grid-actions {
  opacity: 1;
}

.grid-action-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 0.25rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.grid-action-btn:hover {
  background: var(--azul-turno);
  color: white;
}

/* Badge Styles */
.doc-header {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.doc-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  align-items: center;
}

.doc-badges .badge {
  font-size: 0.65rem;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 0.125rem;
  white-space: nowrap;
}

.doc-badges .badge.badge-success {
  background-color: #28a745;
  color: white;
}

.doc-badges .badge.badge-info {
  background-color: #17a2b8;
  color: white;
}

.doc-badges .badge.badge-warning {
  background-color: #ffc107;
  color: #212529;
}

.doc-badges .badge.badge-danger {
  background-color: #dc3545;
  color: white;
}

.doc-badges .badge.badge-primary {
  background-color: #007bff;
  color: white;
}

.doc-badges .badge.badge-secondary {
  background-color: #6c757d;
  color: white;
}

.badge-generated {
  font-size: 0.6rem;
  font-weight: 600;
}

.grid-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.125rem;
  margin-bottom: 0.25rem;
  justify-content: center;
  max-height: 2rem;
  overflow: hidden;
}

.grid-badges .badge {
  font-size: 0.55rem;
  padding: 0.08rem 0.15rem;
  border-radius: 0.15rem;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 0.05rem;
}

.tag-text {
  max-width: 2rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.grid-badges .badge.badge-success {
  background-color: #28a745;
  color: white;
}

.grid-badges .badge.badge-info {
  background-color: #17a2b8;
  color: white;
}

.grid-badges .badge.badge-warning {
  background-color: #ffc107;
  color: #212529;
}

.grid-badges .badge.badge-danger {
  background-color: #dc3545;
  color: white;
}

.grid-badges .badge.badge-primary {
  background-color: #007bff;
  color: white;
}

.grid-badges .badge.badge-secondary {
  background-color: #6c757d;
  color: white;
}

.auto-generated-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  background: #28a745;
  color: white;
  border-radius: 50%;
  font-size: 0.6rem;
  margin-left: 0.25rem;
  flex-shrink: 0;
}

/* Selection Mode Styles */
.selection-checkbox {
  margin-right: 0.5rem;
  display: flex;
  align-items: center;
}

.selection-checkbox input[type="checkbox"] {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: var(--color-primary);
}

.document-item.selection-mode,
.list-item.selection-mode,
.grid-item.selection-mode {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.document-item.selection-mode:hover,
.list-item.selection-mode:hover,
.grid-item.selection-mode:hover {
  background-color: rgba(var(--color-primary-rgb), 0.05);
}

.grid-checkbox {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  z-index: 10;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 4px;
  padding: 0.25rem;
}

/* Responsive Design */
@media (max-width: 768px) {
  .view-controls {
    flex-direction: column;
    gap: 0.5rem;
  }

  .grid-container {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }

  .tree-children {
    margin-left: 1rem;
  }
}
</style>
