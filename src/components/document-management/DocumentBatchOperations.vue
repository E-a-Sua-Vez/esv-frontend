<template>
  <div class="document-batch-operations">
    <!-- Batch Selection Header -->
    <div class="batch-header visible">
      <div class="selection-info">
        <span class="selection-count">
          {{ selectedCountText }}
        </span>
        <button @click="clearSelection" class="clear-selection-btn">
          <i class="bi bi-x"></i>
          {{ $t('documents.batchOperations.clearSelection') }}
        </button>
      </div>

      <div class="batch-actions">
        <button
          @click="showBulkDownload = true"
          class="batch-action-btn download-btn"
          :disabled="loading"
        >
          <i class="bi bi-download"></i>
          {{ $t('documents.batchOperations.download') }}
        </button>

        <button @click="showBulkTag = true" class="batch-action-btn tag-btn" :disabled="loading">
          <i class="bi bi-tags"></i>
          {{ $t('documents.batchOperations.tag') }}
        </button>

        <button
          @click="showBulkCategory = true"
          class="batch-action-btn category-btn"
          :disabled="loading"
        >
          <i class="bi bi-folder"></i>
          {{ $t('documents.batchOperations.categorize') }}
        </button>

        <button
          @click="showBulkUrgency = true"
          class="batch-action-btn urgency-btn"
          :disabled="loading"
        >
          <i class="bi bi-exclamation-triangle"></i>
          {{ $t('documents.batchOperations.urgency') }}
        </button>

        <button
          @click="showBulkDelete = true"
          class="batch-action-btn delete-btn"
          :disabled="loading"
        >
          <i class="bi bi-trash"></i>
          {{ $t('documents.batchOperations.delete') }}
        </button>
      </div>
    </div>

    <!-- Bulk Download Modal -->
    <div v-if="showBulkDownload" class="modal-overlay" @click="showBulkDownload = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header border-0 active-name modern-modal-header">
          <div class="modern-modal-header-inner">
            <div class="modern-modal-icon-wrapper">
              <i class="bi bi-download document-icon"></i>
            </div>
            <div class="modern-modal-title-wrapper">
              <h5 class="modal-title fw-bold modern-modal-title">{{ $t('documents.batchOperations.downloadModal.title') }}</h5>
            </div>
          </div>
          <button @click="showBulkDownload = false" class="modern-modal-close-btn" type="button">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="modal-body">
          <p>{{ $t('documents.batchOperations.downloadModal.question', { count: selectedDocuments.length }) }}</p>

          <div class="download-options">
            <label class="download-option">
              <input type="radio" v-model="downloadFormat" value="individual" />
              <span class="option-content">
                <i class="bi bi-file-earmark"></i>
                <div>
                  <strong>{{ $t('documents.batchOperations.downloadModal.individualFiles') }}</strong>
                  <small>{{ $t('documents.batchOperations.downloadModal.individualDescription') }}</small>
                </div>
              </span>
            </label>

            <label class="download-option">
              <input type="radio" v-model="downloadFormat" value="zip" />
              <span class="option-content">
                <i class="bi bi-file-earmark-zip"></i>
                <div>
                  <strong>{{ $t('documents.batchOperations.downloadModal.zipFile') }}</strong>
                  <small>{{ $t('documents.batchOperations.downloadModal.zipDescription') }}</small>
                </div>
              </span>
            </label>
          </div>

          <div class="filename-input" v-if="downloadFormat === 'zip'">
            <label class="form-label">{{ $t('documents.batchOperations.downloadModal.zipFilenameLabel') }}</label>
            <input
              v-model="zipFilename"
              type="text"
              class="form-input"
              placeholder="documentos-paciente"
            />
          </div>
        </div>

        <div class="modal-actions">
          <button @click="showBulkDownload = false" class="btn-cancel">{{ $t('documents.batchOperations.cancel') }}</button>
          <button @click="executeBulkDownload" class="btn-confirm" :disabled="bulkLoading">
            <i class="bi bi-download me-2"></i>
            <span v-if="bulkLoading">{{ $t('documents.batchOperations.downloadModal.downloading') }}</span>
            <span v-else>{{ $t('documents.batchOperations.downloadModal.download') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Bulk Tag Modal -->
    <div v-if="showBulkTag" class="modal-overlay" @click="showBulkTag = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header border-0 active-name modern-modal-header">
          <div class="modern-modal-header-inner">
            <div class="modern-modal-icon-wrapper">
              <i class="bi bi-tags document-icon"></i>
            </div>
            <div class="modern-modal-title-wrapper">
              <h5 class="modal-title fw-bold modern-modal-title">{{ $t('documents.batchOperations.tagModal.title') }}</h5>
            </div>
          </div>
          <button @click="showBulkTag = false" class="modern-modal-close-btn" type="button">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="modal-body">
          <div class="tag-operation-selector">
            <label class="tag-operation">
              <input type="radio" v-model="tagOperation" value="add" />
              <span>{{ $t('documents.batchOperations.tagModal.addTags') }}</span>
            </label>
            <label class="tag-operation">
              <input type="radio" v-model="tagOperation" value="remove" />
              <span>{{ $t('documents.batchOperations.tagModal.removeTags') }}</span>
            </label>
            <label class="tag-operation">
              <input type="radio" v-model="tagOperation" value="replace" />
              <span>{{ $t('documents.batchOperations.tagModal.replaceTags') }}</span>
            </label>
          </div>

          <div class="tags-input-section">
            <div class="tags-input-container">
              <input
                v-model="newBulkTag"
                @keyup.enter="addBulkTag"
                type="text"
                placeholder="{{ $t('documents.batchOperations.tagModal.tagPlaceholder') }}"
                class="tag-input"
              />
              <button @click="addBulkTag" class="add-tag-btn">
                <i class="bi bi-plus"></i>
              </button>
            </div>

            <div class="selected-bulk-tags" v-if="bulkTags.length > 0">
              <span v-for="tag in bulkTags" :key="tag" class="tag">
                {{ tag }}
                <button @click="removeBulkTag(tag)" class="remove-tag-btn">
                  <i class="bi bi-x"></i>
                </button>
              </span>
            </div>
          </div>

          <!-- Common tags suggestions -->
          <div class="common-tags" v-if="commonTags.length > 0">
            <label class="form-label">{{ $t('documents.batchOperations.tagModal.commonTags') }}</label>
            <div class="tag-suggestions">
              <button
                v-for="tag in commonTags"
                :key="tag"
                @click="addBulkTag(tag)"
                class="tag-suggestion"
                :class="{ selected: bulkTags.includes(tag) }"
              >
                {{ tag }}
              </button>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="showBulkTag = false" class="btn-cancel">{{ $t('documents.batchOperations.cancel') }}</button>
          <button
            @click="executeBulkTag"
            class="btn-confirm"
            :disabled="bulkLoading || bulkTags.length === 0"
          >
            <i class="bi bi-tags me-2"></i>
            <span v-if="bulkLoading">{{ $t('documents.batchOperations.tagModal.applying') }}</span>
            <span v-else>{{ $t('documents.batchOperations.tagModal.applyTags') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Bulk Category Modal -->
    <div v-if="showBulkCategory" class="modal-overlay" @click="showBulkCategory = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header border-0 active-name modern-modal-header">
          <div class="modern-modal-header-inner">
            <div class="modern-modal-icon-wrapper">
              <i class="bi bi-folder document-icon"></i>
            </div>
            <div class="modern-modal-title-wrapper">
              <h5 class="modal-title fw-bold modern-modal-title">{{ $t('documents.batchOperations.categoryModal.title') }}</h5>
            </div>
          </div>
          <button @click="showBulkCategory = false" class="modern-modal-close-btn" type="button">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="modal-body">
          <p>{{ $t('documents.batchOperations.categoryModal.selectCategory', { count: selectedDocuments.length }) }}</p>

          <div class="category-grid">
            <label
              v-for="category in categories"
              :key="category.value"
              class="category-option"
              :class="{ selected: bulkCategory === category.value }"
            >
              <input type="radio" v-model="bulkCategory" :value="category.value" />
              <span class="category-content">
                <i :class="category.icon"></i>
                <span>{{ category.label }}</span>
              </span>
            </label>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="showBulkCategory = false" class="btn-cancel">{{ $t('documents.batchOperations.cancel') }}</button>
          <button
            @click="executeBulkCategory"
            class="btn-confirm"
            :disabled="bulkLoading || !bulkCategory"
          >
            <i class="bi bi-folder me-2"></i>
            <span v-if="bulkLoading">{{ $t('documents.batchOperations.categoryModal.applying') }}</span>
            <span v-else>{{ $t('documents.batchOperations.categoryModal.changeCategory') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Bulk Urgency Modal -->
    <div v-if="showBulkUrgency" class="modal-overlay" @click="showBulkUrgency = false">
      <div class="modal-content" @click.stop>
        <div class="modal-header border-0 active-name modern-modal-header">
          <div class="modern-modal-header-inner">
            <div class="modern-modal-icon-wrapper">
              <i class="bi bi-exclamation-triangle document-icon"></i>
            </div>
            <div class="modern-modal-title-wrapper">
              <h5 class="modal-title fw-bold modern-modal-title">{{ $t('documents.batchOperations.urgencyModal.title') }}</h5>
            </div>
          </div>
          <button @click="showBulkUrgency = false" class="modern-modal-close-btn" type="button">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="modal-body">
          <p>
            {{ $t('documents.batchOperations.urgencyModal.selectUrgency', { count: selectedDocuments.length }) }}
          </p>

          <div class="urgency-options">
            <label
              v-for="urgency in urgencyLevels"
              :key="urgency.value"
              class="urgency-option"
              :class="{ selected: bulkUrgency === urgency.value }"
            >
              <input type="radio" v-model="bulkUrgency" :value="urgency.value" />
              <span class="urgency-content" :style="{ borderColor: urgency.color }">
                <i :class="urgency.icon" :style="{ color: urgency.color }"></i>
                <div>
                  <strong>{{ urgency.label }}</strong>
                  <small>{{ getUrgencyDescription(urgency.value) }}</small>
                </div>
              </span>
            </label>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="showBulkUrgency = false" class="btn-cancel">{{ $t('documents.batchOperations.cancel') }}</button>
          <button
            @click="executeBulkUrgency"
            class="btn-confirm"
            :disabled="bulkLoading || !bulkUrgency"
          >
            <i class="bi bi-exclamation-triangle me-2"></i>
            <span v-if="bulkLoading">{{ $t('documents.batchOperations.urgencyModal.applying') }}</span>
            <span v-else>{{ $t('documents.batchOperations.urgencyModal.changeUrgency') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Bulk Delete Modal -->
    <div v-if="showBulkDelete" class="modal-overlay" @click="showBulkDelete = false">
      <div class="modal-content delete-modal" @click.stop>
        <div class="modal-header border-0 active-name modern-modal-header">
          <div class="modern-modal-header-inner">
            <div class="modern-modal-icon-wrapper">
              <i class="bi bi-trash document-icon"></i>
            </div>
            <div class="modern-modal-title-wrapper">
              <h5 class="modal-title fw-bold modern-modal-title">{{ $t('documents.batchOperations.deleteModal.title') }}</h5>
            </div>
          </div>
          <button @click="showBulkDelete = false" class="modern-modal-close-btn" type="button">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="modal-body">
          <div class="delete-warning">
            <i class="bi bi-exclamation-triangle-fill warning-icon"></i>
            <div class="warning-content">
              <h4>{{ $t('documents.batchOperations.deleteModal.confirmation') }}</h4>
              <p>
                {{ $t('documents.batchOperations.deleteModal.warning', {
                  count: selectedDocuments.length,
                  document: t('documents.batchOperations.document', selectedDocuments.length)
                }) }}
              </p>
            </div>
          </div>

          <div class="documents-to-delete">
            <h5>{{ $t('documents.batchOperations.deleteModal.documentsToDelete') }}</h5>
            <div class="delete-list">
              <div v-for="doc in selectedDocuments.slice(0, 5)" :key="doc.id" class="delete-item">
                <i :class="getFileTypeIcon(doc.format)"></i>
                <span>{{ doc.name }}</span>
              </div>
              <div v-if="selectedDocuments.length > 5" class="delete-item more-items">
                <i class="bi bi-three-dots"></i>
                <span>{{ $t('documents.batchOperations.deleteModal.andMore', { count: selectedDocuments.length - 5 }) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-actions">
          <button @click="showBulkDelete = false" class="btn-cancel">{{ $t('documents.batchOperations.cancel') }}</button>
          <button @click="executeBulkDelete" class="btn-delete" :disabled="bulkLoading">
            <i class="bi bi-trash me-2"></i>
            <span v-if="bulkLoading">{{ $t('documents.batchOperations.deleteModal.deleting') }}</span>
            <span v-else>{{ $t('documents.batchOperations.deleteModal.deleteDocuments') }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  getDocumentCategories,
  getDocumentUrgencyLevels,
  getFileTypeIcon,
  updateDocumentTags,
  updateDocumentCategory,
  updateDocumentUrgency,
  availableDocument,
  getClientDocument,
} from '../../application/services/document';

export default {
  name: 'DocumentBatchOperations',
  props: {
    selectedDocuments: { type: Array, default: () => [] },
    loading: { type: Boolean, default: false },
  },
  emits: ['clear-selection', 'documents-updated', 'documents-deleted'],
  setup(props, { emit }) {
    const { t } = useI18n();
    const bulkLoading = ref(false);

    // Modal states
    const showBulkDownload = ref(false);
    const showBulkTag = ref(false);
    const showBulkCategory = ref(false);
    const showBulkUrgency = ref(false);
    const showBulkDelete = ref(false);

    // Operation states
    const downloadFormat = ref('individual');
    const zipFilename = ref('documentos-paciente');
    const tagOperation = ref('add');
    const bulkTags = ref([]);
    const newBulkTag = ref('');
    const bulkCategory = ref('');
    const bulkUrgency = ref('');

    const categories = getDocumentCategories();
    const urgencyLevels = getDocumentUrgencyLevels();

    // Common tags extracted from existing documents
    const commonTags = computed(() => {
      const tagCounts = {};
      props.selectedDocuments.forEach(doc => {
        if (doc.tags) {
          doc.tags.forEach(tag => {
            tagCounts[tag] = (tagCounts[tag] || 0) + 1;
          });
        }
      });

      return Object.entries(tagCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([tag]) => tag);
    });

    const selectedCountText = computed(() => {
      try {
        return t('documents.batchOperations.selectedCount', {
          count: props.selectedDocuments.length,
          document: t('documents.batchOperations.document', props.selectedDocuments.length),
          selected: t('documents.batchOperations.selected', props.selectedDocuments.length)
        });
      } catch (error) {
        return `${props.selectedDocuments.length} documento(s) seleccionado(s)`;
      }
    });

    // Methods
    const clearSelection = () => {
      emit('clear-selection');
    };

    const addBulkTag = (tag = null) => {
      const tagToAdd = tag || newBulkTag.value.trim();
      if (tagToAdd && !bulkTags.value.includes(tagToAdd)) {
        bulkTags.value.push(tagToAdd);
        if (!tag) newBulkTag.value = '';
      }
    };

    const removeBulkTag = tag => {
      const index = bulkTags.value.indexOf(tag);
      if (index > -1) {
        bulkTags.value.splice(index, 1);
      }
    };

    const executeBulkDownload = async () => {
      try {
        bulkLoading.value = true;

        if (downloadFormat.value === 'individual') {
          // Download each file individually
          for (const doc of props.selectedDocuments) {
            const blob = await getClientDocument(doc.commerceId, doc.clientId, 'patient_documents', doc.name);
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = doc.name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            // Small delay between downloads
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } else {
          // Create ZIP file (simplified implementation)
          // In a real implementation, you would use a library like JSZip
        }

        showBulkDownload.value = false;
      } catch (error) {
        console.error('Error in bulk download:', error);
      } finally {
        bulkLoading.value = false;
      }
    };

    const executeBulkTag = async () => {
      try {
        bulkLoading.value = true;

        const updatedDocuments = [];

        for (const doc of props.selectedDocuments) {
          let newTags = [...(doc.tags || [])];

          switch (tagOperation.value) {
            case 'add':
              bulkTags.value.forEach(tag => {
                if (!newTags.includes(tag)) {
                  newTags.push(tag);
                }
              });
              break;
            case 'remove':
              newTags = newTags.filter(tag => !bulkTags.value.includes(tag));
              break;
            case 'replace':
              newTags = [...bulkTags.value];
              break;
          }

          const updatedDoc = await updateDocumentTags(doc.id, newTags);
          updatedDocuments.push(updatedDoc);
        }

        emit('documents-updated', updatedDocuments);
        showBulkTag.value = false;
        bulkTags.value = [];
      } catch (error) {
        console.error('Error in bulk tag operation:', error);
      } finally {
        bulkLoading.value = false;
      }
    };

    const executeBulkCategory = async () => {
      try {
        bulkLoading.value = true;

        const updatedDocuments = [];

        for (const doc of props.selectedDocuments) {
          const updatedDoc = await updateDocumentCategory(doc.id, bulkCategory.value);
          updatedDocuments.push(updatedDoc);
        }

        emit('documents-updated', updatedDocuments);
        showBulkCategory.value = false;
        bulkCategory.value = '';
      } catch (error) {
        console.error('Error in bulk category operation:', error);
      } finally {
        bulkLoading.value = false;
      }
    };

    const executeBulkUrgency = async () => {
      try {
        bulkLoading.value = true;

        const updatedDocuments = [];

        for (const doc of props.selectedDocuments) {
          const updatedDoc = await updateDocumentUrgency(doc.id, bulkUrgency.value);
          updatedDocuments.push(updatedDoc);
        }

        emit('documents-updated', updatedDocuments);
        showBulkUrgency.value = false;
        bulkUrgency.value = '';
      } catch (error) {
        console.error('Error in bulk urgency operation:', error);
      } finally {
        bulkLoading.value = false;
      }
    };

    const executeBulkDelete = async () => {
      try {
        bulkLoading.value = true;

        const deletedDocuments = [];

        for (const doc of props.selectedDocuments) {
          const deletedDoc = await availableDocument(doc.id, { available: false });
          deletedDocuments.push(deletedDoc);
        }

        emit('documents-deleted', deletedDocuments);
        showBulkDelete.value = false;
      } catch (error) {
        console.error('Error in bulk delete operation:', error);
      } finally {
        bulkLoading.value = false;
      }
    };

    const getUrgencyDescription = urgency => {
      return t(`documents.batchOperations.urgencyModal.descriptions.${urgency}`);
    };

    return {
      t,
      bulkLoading,
      showBulkDownload,
      showBulkTag,
      showBulkCategory,
      showBulkUrgency,
      showBulkDelete,
      downloadFormat,
      zipFilename,
      tagOperation,
      bulkTags,
      newBulkTag,
      bulkCategory,
      bulkUrgency,
      categories,
      urgencyLevels,
      commonTags,
      selectedCountText,
      clearSelection,
      addBulkTag,
      removeBulkTag,
      executeBulkDownload,
      executeBulkTag,
      executeBulkCategory,
      executeBulkUrgency,
      executeBulkDelete,
      getUrgencyDescription,
      getFileTypeIcon,
    };
  },
};
</script>

<style scoped>
.document-batch-operations {
  position: relative;
}

.batch-header {
  position: fixed;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%) translateY(100px);
  background: white;
  border: 1px solid #e9ecef;
  border-radius: 0.75rem;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
  padding: 0.4rem .5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  z-index: 1000;
  transition: all 0.3s ease;
  min-width: 700px;
}

.batch-header.visible {
  transform: translateX(-50%) translateY(0);
}

.selection-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: .8rem;
}

.selection-count {
  font-weight: 500;
  color: #2c3e50;
  font-size: 0.8rem;
  line-height: .8rem;
  text-align: center;
}

.clear-selection-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.5rem;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 0.25rem;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.2s ease;
}

.clear-selection-btn:hover {
  background: #5a6268;
}

.batch-actions {
  display: flex;
  gap: 0.5rem;
}

.batch-action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.2rem .5rem;
  border: none;
  border-radius: 0.5rem;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.download-btn {
  background: #28a745;
  color: white;
}

.download-btn:hover:not(:disabled) {
  background: #218838;
}

.tag-btn {
  background: var(--azul-turno);
  color: white;
}

.tag-btn:hover:not(:disabled) {
  background: #0056b3;
}

.category-btn {
  background: #6f42c1;
  color: white;
}

.category-btn:hover:not(:disabled) {
  background: #5a32a3;
}

.urgency-btn {
  background: #ffc107;
  color: #212529;
}

.urgency-btn:hover:not(:disabled) {
  background: #e0a800;
}

.delete-btn {
  background: #dc3545;
  color: white;
}

.delete-btn:hover:not(:disabled) {
  background: #c82333;
}

.batch-action-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 1rem;
}

.modal-content {
  border-radius: 0.75rem;
  width: 100%;
  max-width: 500px;
  max-height: 80vh;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-content.delete-modal {
  max-width: 600px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #2c3e50;
}

.close-modal-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.1);
  border: none;
  border-radius: 50%;
  color: #6c757d;
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-modal-btn:hover {
  background: rgba(0, 0, 0, 0.2);
  color: #495057;
}

.modal-body {
  padding: 1.5rem;
  max-height: 50vh;
  overflow-y: auto;
}

.modal-actions {
  display: flex;
  gap: 1rem;
  justify-content: flex-end;
  padding: 1rem 1.5rem;
  background: #f8f9fa;
  border-top: 1px solid #e9ecef;
}

.btn-cancel,
.btn-confirm,
.btn-delete {
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

.btn-confirm {
  background: var(--azul-turno);
  color: white;
}

.btn-confirm:hover:not(:disabled) {
  background: #0056b3;
}

.btn-delete {
  background: #dc3545;
  color: white;
}

.btn-delete:hover:not(:disabled) {
  background: #c82333;
}

.btn-cancel:disabled,
.btn-confirm:disabled,
.btn-delete:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Download Options */
.download-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 1rem 0;
}

.download-option {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  border: 2px solid #e9ecef;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.download-option:hover {
  border-color: var(--azul-turno);
  background: rgba(0, 123, 255, 0.05);
}

.download-option input[type='radio']:checked + .option-content {
  color: var(--azul-turno);
}

.option-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
}

.option-content i {
  font-size: 1.5rem;
}

.filename-input {
  margin-top: 1rem;
}

.form-label {
  display: block;
  font-weight: 600;
  color: #495057;
  margin-bottom: 0.5rem;
  font-size: 0.875rem;
}

.form-input {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid #e9ecef;
  border-radius: 0.5rem;
  font-size: 0.9rem;
  transition: border-color 0.2s ease;
}

.form-input:focus {
  outline: none;
  border-color: var(--azul-turno);
}

/* Tag Operations */
.tag-operation-selector {
  display: flex;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.tag-operation {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.tags-input-section {
  margin-bottom: 1.5rem;
}

.tags-input-container {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.tag-input {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: 1px solid #dee2e6;
  border-radius: 0.375rem;
  font-size: 0.875rem;
}

.add-tag-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--azul-turno);
  color: white;
  border: none;
  border-radius: 0.375rem;
  cursor: pointer;
}

.selected-bulk-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.25rem 0.75rem;
  background: #e9ecef;
  border-radius: 1rem;
  font-size: 0.75rem;
  color: #495057;
}

.remove-tag-btn {
  width: 16px;
  height: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #6c757d;
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  font-size: 0.6rem;
}

.common-tags {
  margin-top: 1rem;
}

.tag-suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag-suggestion {
  padding: 0.25rem 0.75rem;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 1rem;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tag-suggestion:hover {
  background: #e9ecef;
}

.tag-suggestion.selected {
  background: var(--azul-turno);
  color: white;
  border-color: var(--azul-turno);
}

/* Category Grid */
.category-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
}

.category-option {
  display: flex;
  align-items: center;
  padding: 1rem;
  border: 2px solid #e9ecef;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.category-option:hover {
  border-color: var(--azul-turno);
  background: rgba(0, 123, 255, 0.05);
}

.category-option.selected {
  border-color: var(--azul-turno);
  background: rgba(0, 123, 255, 0.1);
}

.category-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.category-content i {
  font-size: 1.25rem;
  color: var(--azul-turno);
}

/* Urgency Options */
.urgency-options {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin: 1rem 0;
}

.urgency-option {
  display: flex;
  align-items: center;
  padding: 1rem;
  border: 2px solid #e9ecef;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.urgency-option:hover {
  background: rgba(0, 0, 0, 0.02);
}

.urgency-option.selected {
  background: rgba(0, 0, 0, 0.05);
}

.urgency-content {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex: 1;
  border-left: 4px solid transparent;
  padding-left: 1rem;
}

.urgency-content i {
  font-size: 1.25rem;
}

/* Delete Warning */
.delete-warning {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 0.5rem;
  margin-bottom: 1.5rem;
}

.warning-icon {
  font-size: 2rem;
  color: #856404;
  flex-shrink: 0;
}

.warning-content h4 {
  margin: 0 0 0.5rem 0;
  color: #856404;
  font-size: 1rem;
}

.warning-content p {
  margin: 0;
  color: #856404;
  font-size: 0.9rem;
}

.documents-to-delete h5 {
  margin: 0 0 1rem 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: #495057;
}

.delete-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
}

.delete-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  background: #f8f9fa;
  border-radius: 0.375rem;
  font-size: 0.875rem;
}

.delete-item i {
  color: var(--azul-turno);
}

.delete-item.more-items {
  font-style: italic;
  color: #6c757d;
}

/* Responsive Design */
@media (max-width: 768px) {
  .batch-header {
    min-width: auto;
    width: calc(100% - 2rem);
    flex-direction: column;
    gap: 1rem;
  }

  .batch-actions {
    width: 100%;
    justify-content: space-between;
  }

  .batch-action-btn {
    flex: 1;
    justify-content: center;
    font-size: 0.8rem;
    padding: 0.5rem;
  }

  .modal-content {
    margin: 1rem;
    max-width: none;
  }

  .category-grid {
    grid-template-columns: 1fr;
  }

  .modal-actions {
    flex-direction: column;
  }

  .btn-cancel,
  .btn-confirm,
  .btn-delete {
    width: 100%;
    justify-content: center;
  }
}
</style>
