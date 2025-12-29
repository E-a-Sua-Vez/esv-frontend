<template>
  <div class="document-tree-view">
    <!-- Tree/List View Toggle -->
    <div class="view-controls">
      <div class="view-toggle">
        <button @click="viewMode = 'tree'" :class="['view-btn', { active: viewMode === 'tree' }]">
          <i class="bi bi-diagram-3"></i>
          Árbol
        </button>
        <button @click="viewMode = 'list'" :class="['view-btn', { active: viewMode === 'list' }]">
          <i class="bi bi-list-ul"></i>
          Lista
        </button>
        <button @click="viewMode = 'grid'" :class="['view-btn', { active: viewMode === 'grid' }]">
          <i class="bi bi-grid-3x3"></i>
          Galería
        </button>
      </div>

      <div class="tree-controls">
        <button @click="expandAll" class="control-btn" title="Expandir todo">
          <i class="bi bi-plus-square"></i>
        </button>
        <button @click="collapseAll" class="control-btn" title="Colapsar todo">
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
                :key="doc.id"
                class="document-item"
                @click="selectDocument(doc)"
              >
                <i :class="['doc-icon', getDocumentIcon(doc)]"></i>
                <div class="doc-info">
                  <span class="doc-name">{{ doc.name }}</span>
                  <span class="doc-date">{{ formatDate(doc.createdAt) }}</span>
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
        :key="doc.id"
        class="list-item"
        @click="selectDocument(doc)"
      >
        <i :class="['doc-icon', getDocumentIcon(doc)]"></i>
        <div class="doc-details">
          <div class="doc-name">{{ doc.name }}</div>
          <div class="doc-meta">
            <span class="doc-category">{{ getCategoryLabel(doc.category) }}</span>
            <span class="doc-date">{{ formatDate(doc.createdAt) }}</span>
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
        :key="doc.id"
        class="grid-item"
        @click="selectDocument(doc)"
      >
        <div class="grid-thumbnail">
          <img
            v-if="isImage(doc)"
            :src="getDocumentThumbnail(doc)"
            :alt="doc.name"
            class="thumbnail-image"
            @error="handleImageError"
          />
          <div v-else class="thumbnail-placeholder">
            <i :class="['placeholder-icon', getDocumentIcon(doc)]"></i>
          </div>
        </div>
        <div class="grid-info">
          <div class="grid-name">{{ doc.name }}</div>
          <div class="grid-date">{{ formatDate(doc.createdAt) }}</div>
        </div>
        <div class="grid-actions">
          <button @click.stop="previewDocument(doc)" class="grid-action-btn">
            <i class="bi bi-eye"></i>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';
import { getFileTypeIcon } from '../../application/services/document';

export default {
  name: 'DocumentTreeView',
  props: {
    documents: {
      type: Array,
      default: () => [],
    },
  },
  emits: ['document-selected', 'document-preview', 'document-download'],
  setup(props, { emit }) {
    const viewMode = ref('tree');
    const expandedNodes = ref(new Set());

    // Organize documents into tree structure
    const treeData = computed(() => {
      const tree = [];

      // Group by category first
      const categoryGroups = {};
      props.documents.forEach(doc => {
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
          const date = new Date(doc.createdAt);
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
    });

    // Flat list of all documents
    const flatDocuments = computed(() =>
      props.documents.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    );

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

    const getDocumentIcon = doc => getFileTypeIcon(doc.format || doc.type);

    const getCategoryLabel = category => {
      const labels = {
        LABORATORY_RESULTS: 'Laboratorio',
        IMAGING_STUDIES: 'Imágenes',
        PRESCRIPTIONS: 'Recetas',
        CONSULTATION_NOTES: 'Consultas',
        DISCHARGE_SUMMARY: 'Altas',
        REFERRALS: 'Derivaciones',
        CONSENT_FORMS: 'Consentimientos',
        INSURANCE_DOCUMENTS: 'Seguros',
        OTHER: 'Otros',
      };
      return labels[category] || category;
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
      return imageTypes.includes(doc.format) || /\.(jpg|jpeg|png|gif|webp)$/i.test(doc.name);
    };

    const getDocumentThumbnail = doc =>
      // In a real implementation, you would have thumbnail URLs
      // For now, return a placeholder or the document URL
      doc.thumbnailUrl || doc.url || '/api/documents/thumbnail/' + doc.id;
    const handleImageError = event => {
      event.target.style.display = 'none';
      event.target.nextElementSibling.style.display = 'flex';
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
      getDocumentIcon,
      getCategoryLabel,
      formatDate,
      isImage,
      getDocumentThumbnail,
      handleImageError,
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
  padding: 0.75rem;
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
  padding: 0.5rem;
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
  margin-top: 0.25rem;
}

.document-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.375rem;
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
  gap: 0.75rem;
  padding: 0.75rem;
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
