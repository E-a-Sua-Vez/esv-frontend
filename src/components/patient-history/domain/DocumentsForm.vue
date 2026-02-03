<script>
import { ref, reactive, onBeforeMount, toRefs, watch } from 'vue';
import { VueRecaptcha } from 'vue-recaptcha';
import { getPermissions } from '../../../application/services/permissions';
import { getDateAndHour } from '../../../shared/utils/date';
import {
  getClientDocument,
  addClientDocument,
  availableDocument,
  searchDocuments,
  getDocumentCategories,
  getDocumentUrgencyLevels,
  updateDocumentTags,
  linkDocumentToAttention,
  trackDocumentAccess,
  trackDocumentDownload,
} from '../../../application/services/document';
import Warning from '../../common/Warning.vue';
import Spinner from '../../common/Spinner.vue';
import Toggle from '@vueform/toggle';
import Message from '../../common/Message.vue';
import HistoryDetailsCard from '../common/HistoryDetailsCard.vue';
import DragDropFileUpload from '../../common/DragDropFileUpload.vue';
import DocumentViewer from '../../document-management/DocumentViewer.vue';
import DocumentSearch from '../../document-management/DocumentSearch.vue';
import DocumentBatchOperations from '../../document-management/DocumentBatchOperations.vue';
import DocumentTreeView from '../../document-management/DocumentTreeView.vue';
import DocumentImageCarousel from '../../document-management/DocumentImageCarousel.vue';

export default {
  name: 'DocumentsForm',
  components: {
    Warning,
    Spinner,
    VueRecaptcha,
    Toggle,
    Message,
    HistoryDetailsCard,
    DragDropFileUpload,
    DocumentViewer,
    DocumentSearch,
    DocumentBatchOperations,
    DocumentTreeView,
    DocumentImageCarousel,
  },
  props: {
    commerce: { type: Object, default: {} },
    cacheData: { type: Object, default: undefined },
    patientHistoryData: { type: Object, default: {} },
    clientData: { type: Object, default: {} },
    toggles: { type: Object, default: {} },
    errorsAdd: { type: Array, default: [] },
    patientHistoryItems: { type: Array, default: [] },
    receiveData: { type: Function, default: () => {} },
    onUpdate: { type: Function, default: () => {} },
  },
  async setup(props) {
    const loading = ref(false);
    const alertError = ref('');
    const file = ref({});

    const {
      commerce,
      cacheData,
      clientData,
      patientHistoryData,
      toggles,
      patientHistoryItems,
      errorsAdd,
    } = toRefs(props);

    const { receiveData, onUpdate } = props;

    const state = reactive({
      newDocuments: {},
      oldDocuments: [],
      filteredDocuments: [],
      documentList: [],
      captcha: false,
      documentsError: false,
      asc: true,
      showHistory: false,
      showViewer: false,
      selectedDocument: null,
      selectedDocuments: [],
      selectionMode: false,
      errorsAdd: [],
      togglesDocuments: [],
      newDocument: {},
      optionSelected: {},
      file: undefined,
      searchText: '',
      activeFilters: {},
      viewMode: 'list', // 'list' or 'tree'
      showImageCarousel: false,
      selectedImageIndex: 0,
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.togglesDocuments = await getPermissions('document-client', 'admin');
        if (patientHistoryItems.value && patientHistoryItems.value.length > 0) {
          state.documentList = patientHistoryItems.value.filter(item =>
            ['PATIENT_DOCUMENTS'].includes(item.type)
          );
          state.documentList = state.documentList.sort((a, b) => b.order - a.order);
        }
        if (patientHistoryData.value && patientHistoryData.value.id) {
          // Map PatientDocument to Document objects for display
          // PatientDocument has structure: { documents: Document, comment, details, attentionId, createdAt, createdBy }
          state.oldDocuments = patientHistoryData.value.patientDocument
            .filter(patientDoc => patientDoc.documents && patientDoc.documents.available)
            .map(patientDoc => {
              // Merge PatientDocument metadata with Document for display
              const doc = { ...patientDoc.documents };
              // Preserve PatientDocument-specific fields
              doc.patientDocumentComment = patientDoc.comment;
              doc.patientDocumentDetails = patientDoc.details;
              doc.patientDocumentAttentionId = patientDoc.attentionId;
              doc.patientDocumentCreatedAt = patientDoc.createdAt;
              doc.patientDocumentCreatedBy = patientDoc.createdBy;
              return doc;
            });
          state.filteredDocuments = [...state.oldDocuments];
        }
        // Only use cacheData if no saved data exists in patientHistoryData
        if (!state.oldDocuments && cacheData.value) {
          state.newDocuments = cacheData.value;
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    });

    const sendData = async () => {
      await receiveData(state.newDocument);
    };

    const documentIcon = format => {
      if (format) {
        if (format === 'application/pdf') {
          return 'bi-file-earmark-pdf';
        } else if (format.startsWith('image')) {
          return 'bi-file-earmark-image';
        }
      }
    };

    // Check if document is auto-generated (prescription, exam order, or reference PDF)
    const isGeneratedDocument = doc => {
      if (!doc || !doc.option) return false;
      return ['prescription_pdf', 'exam_order_pdf', 'reference_pdf'].includes(doc.option);
    };

    // Get document type label for generated documents
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

    const checkAsc = event => {
      if (event.target.checked) {
        state.asc = true;
      } else {
        state.asc = false;
      }
      if (state.oldDocuments && state.oldDocuments.length > 0) {
        let elementsSorted = [];
        const elements = state.oldDocuments;
        if (state.asc) {
          elementsSorted = elements.sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
        } else {
          elementsSorted = elements.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }
        state.oldDocuments = elementsSorted.filter(doc => doc.available);
        applyFilters();
      }
    };

    const validateDocument = file => {
      state.errorsAdd = [];
      const typesPermitted = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (file.size === 0 || file.size > 5000000) {
        state.errorsAdd.push('businessDocument.validate.fileSize2');
      }
      if (!file.type || !typesPermitted.includes(file.type)) {
        state.errorsAdd.push('businessDocument.validate.fileType');
      }
      if (state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    };

    const getFile = async $event => {
      try {
        loading.value = true;
        const target = $event.target;
        if (target && target.files && target.files.length > 0) {
          const fileUploaded = target.files[0];
          if (validateDocument(fileUploaded)) {
            file.value = fileUploaded;
            state.newDocument.file = file.value;
            state.newDocument.format = file.value.type;
          }
        }
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const handleFileSelected = selectedFile => {
      if (selectedFile && validateDocument(selectedFile)) {
        file.value = selectedFile;
        state.newDocument.file = selectedFile;
        state.newDocument.format = selectedFile.type;
        state.errorsAdd = [];
      }
    };

    const handleFileRemoved = () => {
      file.value = {};
      state.newDocument.file = null;
      state.newDocument.format = null;
      state.errorsAdd = [];
    };

    const handleFileError = error => {
      state.errorsAdd = [error];
    };

    // Enhanced document management functions
    const handleSearch = searchText => {
      state.searchText = searchText;
      applyFilters();
    };

    const handleFiltersChanged = filters => {
      state.activeFilters = filters;
      applyFilters();
    };

    const applyFilters = () => {
      let filtered = [...state.oldDocuments];

      // Apply search text filter
      if (state.searchText) {
        const searchLower = state.searchText.toLowerCase();
        filtered = filtered.filter(
          doc =>
            doc.name?.toLowerCase().includes(searchLower) ||
            doc.details?.name?.toLowerCase().includes(searchLower) ||
            doc.documentMetadata?.clinicalNotes?.toLowerCase().includes(searchLower)
        );
      }

      // Apply category filter
      if (state.activeFilters.category) {
        filtered = filtered.filter(doc => doc.category === state.activeFilters.category);
      }

      // Apply urgency filter
      if (state.activeFilters.urgency) {
        filtered = filtered.filter(doc => doc.urgency === state.activeFilters.urgency);
      }

      // Apply date range filter
      if (state.activeFilters.dateFrom) {
        const fromDate = new Date(state.activeFilters.dateFrom);
        filtered = filtered.filter(doc => new Date(doc.createdAt) >= fromDate);
      }
      if (state.activeFilters.dateTo) {
        const toDate = new Date(state.activeFilters.dateTo);
        toDate.setHours(23, 59, 59, 999); // End of day
        filtered = filtered.filter(doc => new Date(doc.createdAt) <= toDate);
      }

      // Apply tags filter
      if (state.activeFilters.tags && state.activeFilters.tags.length > 0) {
        filtered = filtered.filter(doc =>
          state.activeFilters.tags.some(tag => doc.tags?.includes(tag)),
        );
      }

      state.filteredDocuments = filtered;
    };

    const selectDocument = async document => {
      // Track document access
      try {
        await trackDocumentAccess(document.id, 'view', 'collaborator');
      } catch (error) {
        console.warn('Failed to track document access:', error);
      }

      // Check if it's an image document
      const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
      const isImage =
        imageTypes.includes(document.format) ||
        /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(document.name);

      if (isImage) {
        openImageCarousel(document, state.filteredDocuments);
      } else {
        state.selectedDocument = document;
        state.showViewer = true;
      }
    };

    const closeViewer = () => {
      state.showViewer = false;
      state.selectedDocument = null;
    };

    const closeImageCarousel = () => {
      state.showImageCarousel = false;
      state.selectedImageIndex = 0;
    };

    const openImageCarousel = (document, documents) => {
      // Find the index of the selected document in the image documents
      const imageDocuments = documents.filter(doc => {
        const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
        return imageTypes.includes(doc.format) || /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(doc.name);
      });

      const index = imageDocuments.findIndex(doc => doc.id === document.id);
      state.selectedImageIndex = Math.max(0, index);
      state.showImageCarousel = true;
    };

    const downloadDocument = async document => {
      try {
        // Track document download
        await trackDocumentDownload(document.id, 'collaborator');

        // In a real implementation, this would trigger the actual download
        const downloadUrl = document.url || `/api/documents/${document.id}/download`;
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = document.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('Error downloading document:', error);
      }
    };

    const handleDocumentAnnotation = annotation => {
      // Handle document annotations
    };

    // Batch operations
    const toggleSelectionMode = () => {
      state.selectionMode = !state.selectionMode;
      if (!state.selectionMode) {
        state.selectedDocuments = [];
      }
    };

    const toggleDocumentSelection = document => {
      const index = state.selectedDocuments.findIndex(doc => doc.id === document.id);
      if (index > -1) {
        state.selectedDocuments.splice(index, 1);
      } else {
        state.selectedDocuments.push(document);
      }
    };

    const selectAllDocuments = () => {
      state.selectedDocuments = [...state.filteredDocuments];
    };

    const clearSelection = () => {
      state.selectedDocuments = [];
      state.selectionMode = false;
    };

    const handleBatchDocumentsUpdated = updatedDocuments => {
      // Update documents in the list
      updatedDocuments.forEach(updatedDoc => {
        const index = state.oldDocuments.findIndex(doc => doc.id === updatedDoc.id);
        if (index > -1) {
          state.oldDocuments[index] = updatedDoc;
        }
      });
      applyFilters();
      clearSelection();
    };

    const handleBatchDocumentsDeleted = deletedDocuments => {
      // Remove documents from the list
      const deletedIds = deletedDocuments.map(doc => doc.id);
      state.oldDocuments = state.oldDocuments.filter(doc => !deletedIds.includes(doc.id));
      applyFilters();
      clearSelection();
    };

    const validateAdd = () => {
      state.errorsAdd = [];
      if (state.optionSelected) {
        const documentMetadata = {
          clientName: clientData.value.userName,
          clientLastName: clientData.value.userLastName,
          clientIdNumber: clientData.value.userIdNumber,
          clientEmail: clientData.value.userEmail,
          optionSelected: state.optionSelected,
        };
        const time = new Date().getTime();
        state.newDocument.type = 'CLIENT';
        state.newDocument.name = `${state.optionSelected.name.toLowerCase().replaceAll(' ', '-')}-${
          clientData.value.id
        }-${time}`;
        state.newDocument.commerceId = commerce.value.id;
        state.newDocument.clientId = clientData.value.id;
        state.newDocument.documentMetadata = JSON.stringify(documentMetadata);
        state.newDocument.reportType = 'patient_documents';
        state.newDocument.details = JSON.stringify(state.optionSelected);

        // Enhanced ecosystem integration
        state.newDocument.patientHistoryId = patientHistoryData.value?.id;
        state.newDocument.category = state.optionSelected.category || 'OTHER';
        state.newDocument.urgency = 'NORMAL';
        state.newDocument.tags = [];
        state.newDocument.isConfidential = false;
      } else {
        state.errorsAdd.push('businessDocument.validate.feature');
      }
      if (!state.newDocument.file) {
        state.errorsAdd.push('businessDocument.validate.file');
      }
      if (state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    };

    const add = async () => {
      try {
        loading.value = true;
        if (validateAdd()) {
          const body = state.newDocument;
          state.newDocument = await addClientDocument(body, file.value);
          state.newDocument.details = state.optionSelected;
          state.optionSelected = {};
          sendData();
          file.value = {};
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const executeDownload = async item => {
      try {
        loading.value = true;
        const fileToDownload = await getClientDocument(item.commerceId, item.option, item.name);
        if (fileToDownload) {
          const file = new Blob([fileToDownload], { type: item.format });
          const fileURL = URL.createObjectURL(file);
          window.open(fileURL);
        }
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const updateDocument = async updatedDocument => {
      if (updatedDocument && updatedDocument.id) {
        const elements = state.oldDocuments.filter(doc => doc.id !== updatedDocument.id);
        if (elements) {
          elements.push(updatedDocument);
        }
        state.oldDocuments = elements;
        await onUpdate(state.oldDocuments);
      }
    };

    const executeDelete = async item => {
      try {
        loading.value = true;
        const body = item;
        body.available = false;
        const updatedDocument = await availableDocument(item.id, body);
        if (updatedDocument && updatedDocument.id) {
          updateDocument(updatedDocument);
        }
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const showPopUpFile = async () => {
      document.getElementById('document-fileUpload').click();
    };

    watch(patientHistoryData, async () => {
      loading.value = true;
      if (patientHistoryData.value && patientHistoryData.value.id) {
        if (
          patientHistoryData.value.patientDocument &&
          patientHistoryData.value.patientDocument.length > 0 &&
          patientHistoryData.value.patientDocument[0]
        ) {
          // Map PatientDocument to Document objects for display
          state.oldDocuments = patientHistoryData.value.patientDocument
            .filter(patientDoc => patientDoc.documents && patientDoc.documents.available)
            .map(patientDoc => {
              // Merge PatientDocument metadata with Document for display
              const doc = { ...patientDoc.documents };
              // Preserve PatientDocument-specific fields
              doc.patientDocumentComment = patientDoc.comment;
              doc.patientDocumentDetails = patientDoc.details;
              doc.patientDocumentAttentionId = patientDoc.attentionId;
              doc.patientDocumentCreatedAt = patientDoc.createdAt;
              doc.patientDocumentCreatedBy = patientDoc.createdBy;
              return doc;
            });
          state.filteredDocuments = [...state.oldDocuments];
        }
      }
      loading.value = false;
    });

    return {
      state,
      alertError,
      loading,
      commerce,
      toggles,
      errorsAdd,
      getDateAndHour,
      checkAsc,
      getFile,
      showPopUpFile,
      add,
      executeDownload,
      executeDelete,
      documentIcon,
      isGeneratedDocument,
      getGeneratedDocumentType,
      handleFileSelected,
      handleFileRemoved,
      handleFileError,
      handleSearch,
      handleFiltersChanged,
      selectDocument,
      closeViewer,
      closeImageCarousel,
      openImageCarousel,
      downloadDocument,
      handleDocumentAnnotation,
      toggleSelectionMode,
      toggleDocumentSelection,
      selectAllDocuments,
      clearSelection,
      handleBatchDocumentsUpdated,
      handleBatchDocumentsDeleted,
    };
  },
};
</script>
<template>
  <div class="patient-form-modern documents-form">
    <div class="form-header-modern">
      <div class="form-header-icon">
        <i class="bi bi-folder-fill"></i>
      </div>
      <div class="form-header-content">
        <h3 class="form-header-title">{{ $t('patientHistoryView.documents') }}</h3>
        <p class="form-header-subtitle">Gerencie os documentos do paciente</p>
      </div>
    </div>

    <Spinner :show="loading"></Spinner>

    <!-- Document Viewer Modal -->
    <div v-if="state.showViewer" class="document-viewer-modal" @click="closeViewer">
      <div class="viewer-modal-content" @click.stop>
        <button @click="closeViewer" class="close-viewer-btn">
          <i class="bi bi-x-lg"></i>
        </button>
        <DocumentViewer
          :documents="state.filteredDocuments"
          :initial-document="state.selectedDocument"
          :can-annotate="state.togglesDocuments['document-client.admin.edit']"
          :commerce="commerce"
          :client="clientData"
          @annotation-added="handleDocumentAnnotation"
        />
      </div>
    </div>

    <!-- Image Carousel Modal -->
    <DocumentImageCarousel
      :show="state.showImageCarousel"
      :documents="state.filteredDocuments"
      :initial-index="state.selectedImageIndex"
      @close="closeImageCarousel"
      @download="downloadDocument"
    />

    <div class="form-layout-modern">
      <!-- Search and Upload Section -->
      <div class="form-input-section">
        <!-- Document Search -->
        <DocumentSearch @search="handleSearch" @filters-changed="handleFiltersChanged" />

        <!-- Tree View Component -->
        <DocumentTreeView
          v-if="state.viewMode === 'tree'"
          :documents="
            state.filteredDocuments.filter(
              doc =>
                doc.available &&
                doc.active === true &&
                doc.details &&
                doc.details.characteristics &&
                doc.details.characteristics.document === true
            )
          "
          @document-selected="selectDocument"
          @document-preview="selectDocument"
          @document-download="downloadDocument"
        />

        <div
          v-if="state.documentList && state.documentList.length > 0"
          class="upload-section-modern"
        >
          <div class="upload-section-header">
            <i class="bi bi-cloud-upload upload-icon"></i>
            <h4 class="upload-title">{{ $t('businessDocument.uploadNewDocument') }}</h4>
          </div>

          <div class="upload-form-modern">
            <div class="form-field-modern">
              <label class="form-label-modern" for="document-type-select">
                <i class="bi bi-file-earmark-text me-1"></i>
                {{ $t('businessDocument.feature') }}
              </label>
              <select
                id="document-type-select"
                class="form-control-modern form-select-modern"
                v-model="state.optionSelected"
                v-bind:class="{ 'form-control-invalid': state.moduleError }"
              >
                <option :value="null">
                  {{ $t('patientHistoryView.select') || 'Selecione o tipo de documento...' }}
                </option>
                <option v-for="item in state.documentList" :key="item.name" :value="item">
                  {{ item.name }}
                </option>
              </select>
            </div>

            <div
              v-if="
                state.optionSelected &&
                state.optionSelected.characteristics &&
                state.optionSelected.characteristics.document &&
                state.optionSelected.characteristics.document === true
              "
              class="upload-actions-modern"
            >
              <DragDropFileUpload
                :model-value="state.newDocument.file"
                :disabled="!state.togglesDocuments['document-client.admin.edit']"
                :loading="loading"
                :accept="'.pdf,.jpg,.jpeg,.png'"
                :max-size="5000000"
                :title="$t('businessDocument.uploadNewDocument')"
                :subtitle="
                  $t('businessDocument.dragDropOrClick') ||
                  'Arraste e solte o arquivo aqui ou clique para selecionar'
                "
                :accepted-formats="'PDF, JPG, PNG (máx. 5MB)'"
                @file-selected="handleFileSelected"
                @file-removed="handleFileRemoved"
                @error="handleFileError"
              />

              <button
                id="document-add-button"
                v-if="state.newDocument.file"
                :disabled="!state.togglesDocuments['document-client.admin.edit'] || loading"
                class="btn-save-file-modern"
                @click="add()"
              >
                <i class="bi bi-check-circle-fill me-2"></i>
                {{ $t('businessDocument.add') }}
              </button>
            </div>

            <div class="form-errors-modern" v-if="state.errorsAdd.length > 0">
              <Warning>
                <template v-slot:message>
                  <li v-for="(error, index) in state.errorsAdd" :key="index">
                    {{ $t(error) }}
                  </li>
                </template>
              </Warning>
            </div>
          </div>
        </div>

        <div v-else class="empty-state-modern">
          <Message
            :title="$t('patientHistoryView.message.2.title')"
            :content="$t('patientHistoryView.message.2.content')"
          />
        </div>
      </div>

      <!-- Collapsed Indicator (visible when collapsed) - Outside the section -->
      <button
        v-if="state.oldDocuments && state.oldDocuments.length > 0 && !state.showHistory"
        class="history-collapsed-indicator"
        @click="state.showHistory = !state.showHistory"
        :title="$t('patientHistoryView.showMenu')"
      >
        <i class="bi bi-clock-history"></i>
        <i class="bi bi-chevron-left"></i>
      </button>

      <!-- Documents History -->
      <div
        v-if="state.oldDocuments && state.oldDocuments.length > 0"
        :class="['form-history-section', { collapsed: !state.showHistory }]"
      >
        <!-- Full History Section (visible when expanded) -->
        <template v-if="state.showHistory">
          <div class="history-section-header">
            <div class="history-header-content">
              <button
                class="history-toggle-btn"
                @click="state.showHistory = !state.showHistory"
                :title="$t('patientHistoryView.hideMenu')"
              >
                <i class="bi bi-chevron-right"></i>
              </button>
              <i class="bi bi-clock-history history-header-icon"></i>
              <h4 class="history-header-title">{{ $t('patientHistoryView.history') }}</h4>
            </div>

            <div class="history-actions">
              <button
                @click="toggleSelectionMode"
                class="selection-mode-btn"
                :class="{ active: state.selectionMode }"
                :title="state.selectionMode ? 'Salir del modo selección' : 'Modo selección'"
              >
                <i class="bi bi-check-square"></i>
              </button>

              <button
                v-if="state.selectionMode && state.filteredDocuments.length > 0"
                @click="selectAllDocuments"
                class="select-all-btn"
                title="Seleccionar todos"
              >
                <i class="bi bi-check-all"></i>
              </button>
            </div>
            <div class="history-sort-control">
              <label class="sort-toggle-label" for="asc-documents">
                <input
                  class="form-check-input sort-toggle-input"
                  :class="state.asc === false ? 'sort-desc' : 'sort-asc'"
                  type="checkbox"
                  name="asc"
                  id="asc-documents"
                  v-model="state.asc"
                  @click="checkAsc($event)"
                />
                <span class="sort-toggle-text">
                  <i :class="state.asc ? 'bi bi-sort-down' : 'bi bi-sort-up'"></i>
                  {{ state.asc ? $t('dashboard.asc') : $t('dashboard.desc') }}
                </span>
              </label>
            </div>
          </div>

          <!-- View Mode Toggle -->
          <div class="view-mode-selector">
            <button
              @click="state.viewMode = 'tree'"
              :class="['view-mode-btn', { active: state.viewMode === 'tree' }]"
            >
              <i class="bi bi-diagram-3"></i>
              Árbol
            </button>
            <button
              @click="state.viewMode = 'list'"
              :class="['view-mode-btn', { active: state.viewMode === 'list' }]"
            >
              <i class="bi bi-list-ul"></i>
              Lista
            </button>
          </div>

          <div class="history-timeline">
            <div v-if="state.viewMode === 'list'" class="documents-list">
              <div
                v-for="item in state.filteredDocuments.filter(
                  doc =>
                    doc.available &&
                    doc.active === true &&
                    doc.details &&
                    doc.details.characteristics &&
                    doc.details.characteristics.document === true
                )"
                :key="item.id"
                class="document-card-modern clickable"
                :class="{
                  selected: state.selectedDocuments.some(doc => doc.id === item.id),
                  'selection-mode': state.selectionMode,
                }"
                @click="state.selectionMode ? toggleDocumentSelection(item) : selectDocument(item)"
              >
                <!-- Selection checkbox -->
                <div v-if="state.selectionMode" class="selection-checkbox">
                  <input
                    type="checkbox"
                    :checked="state.selectedDocuments.some(doc => doc.id === item.id)"
                    @click.stop="toggleDocumentSelection(item)"
                  />
                </div>
                <div class="document-card-content">
                  <div class="document-card-main">
                    <div class="document-badges">
                      <!-- Generated Document Badge -->
                      <span
                        v-if="isGeneratedDocument(item)"
                        :class="[
                          'badge',
                          getGeneratedDocumentType(item)?.color || 'badge-success',
                          'badge-generated',
                        ]"
                        :title="`Documento generado automáticamente: ${
                          getGeneratedDocumentType(item)?.label
                        }`"
                      >
                        <i
                          :class="`bi ${
                            getGeneratedDocumentType(item)?.icon || 'bi-file-earmark-pdf'
                          } me-1`"
                        ></i>
                        {{ getGeneratedDocumentType(item)?.label }}
                      </span>
                      <!-- Regular Document Badges -->
                      <span
                        class="badge badge-primary"
                        v-if="item.details?.tag && !isGeneratedDocument(item)"
                        >{{ item.details.tag }}</span
                      >
                      <span
                        class="badge badge-secondary"
                        v-if="item.details?.name && !isGeneratedDocument(item)"
                        >{{ item.details.name }}</span
                      >
                    </div>
                    <div class="document-meta">
                      <i :class="`bi ${documentIcon(item.format)} document-type-icon`"></i>
                      <span class="document-date" v-if="item.createdAt">{{
                        getDateAndHour(item.createdAt)
                      }}</span>
                      <!-- Auto-generated indicator -->
                      <span
                        v-if="isGeneratedDocument(item)"
                        class="auto-generated-indicator"
                        title="Generado automáticamente"
                      >
                        <i class="bi bi-magic"></i>
                      </span>
                    </div>
                  </div>
                  <div class="document-actions">
                    <button
                      class="btn-document-action btn-download"
                      @click="executeDownload(item)"
                      title="Download"
                    >
                      <i class="bi bi-download"></i>
                    </button>
                    <button
                      class="btn-document-action btn-delete"
                      @click="executeDelete(item)"
                      title="Excluir"
                    >
                      <i class="bi bi-trash-fill"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Batch Operations -->
    <DocumentBatchOperations
      :selected-documents="state.selectedDocuments"
      :loading="loading"
      @clear-selection="clearSelection"
      @documents-updated="handleBatchDocumentsUpdated"
      @documents-deleted="handleBatchDocumentsDeleted"
    />
  </div>
</template>

<style scoped>
@import '../../../shared/styles/prontuario-common.css';

.patient-form-modern.documents-form {
  width: 100%;
  padding: 0;
}

/* Document Viewer Modal */
.document-viewer-modal {
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

.viewer-modal-content {
  position: relative;
  width: 95vw;
  height: 90vh;
  max-width: 1400px;
  background: white;
  border-radius: 0.75rem;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.close-viewer-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 10;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  border: none;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s ease;
}

.close-viewer-btn:hover {
  background: rgba(0, 0, 0, 0.9);
  transform: scale(1.1);
}

/* Upload Section */
.upload-section-modern {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.98) 100%);
  border-radius: 0.375rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  padding: 0.5rem;
  margin-bottom: 0.375rem;
}

.upload-section-header {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  margin-bottom: 0.5rem;
  padding-bottom: 0.375rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.upload-icon {
  font-size: 1.1rem;
  color: var(--azul-turno);
}

.upload-title {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.upload-form-modern {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-field-modern {
  display: flex;
  flex-direction: column;
}

.form-label-modern {
  display: flex;
  align-items: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: 0.25rem;
}

.form-control-modern {
  width: 100%;
  padding: 0.375rem 0.625rem;
  border: 2px solid rgba(0, 0, 0, 0.1);
  border-radius: 0.375rem;
  font-size: 0.8rem;
  background: white;
  transition: all 0.2s ease;
  font-family: inherit;
  z-index: 1 !important;
}

.form-control-modern:focus {
  outline: none;
  border-color: var(--azul-turno);
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
  background: white;
}

.form-control-invalid {
  border-color: #dc3545 !important;
}

.form-select-modern {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 16px 12px;
  padding-right: 2.5rem;
}

.upload-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.upload-actions-modern {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-top: 0.5rem;
}

.btn-upload-file,
.btn-save-file {
  display: inline-flex;
  align-items: center;
  padding: 0.65rem 1.25rem;
  border: none;
  border-radius: 0.625rem;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-upload-file {
  background: rgba(0, 0, 0, 0.05);
  color: var(--color-text);
}

.btn-upload-file:hover:not(:disabled) {
  background: rgba(0, 0, 0, 0.1);
}

.btn-save-file {
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.btn-save-file:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.btn-upload-file:disabled,
.btn-save-file:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-save-file-modern {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 0.625rem;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  width: 100%;
  margin-top: 0.5rem;
}

.btn-save-file-modern:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.btn-save-file-modern:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* File Preview */
.file-preview {
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.02);
  border-radius: 0.625rem;
  border: 1px solid rgba(0, 0, 0, 0.05);
}

.file-preview-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.file-icon {
  font-size: 2rem;
  color: var(--azul-turno);
}

.file-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.file-name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
}

.file-size {
  font-size: 0.75rem;
  color: var(--color-text);
  opacity: 0.6;
}

.btn-remove-file {
  background: none;
  border: none;
  color: var(--color-text);
  opacity: 0.6;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0.25rem;
  transition: all 0.2s ease;
}

.btn-remove-file:hover {
  opacity: 1;
  background: rgba(0, 0, 0, 0.05);
}

.form-errors-modern {
  margin-top: 1rem;
}

.empty-state-modern {
  margin: 2rem 0;
}

/* Form Layout */
.form-layout-modern {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  height: 100%;
  position: relative;
  overflow: visible;
}

/* Ensure the collapsed indicator container has space */
.form-layout-modern:has(.history-collapsed-indicator) {
  position: relative;
}

.form-layout-modern:has(.form-history-section.collapsed) .form-input-section {
  grid-column: 1 / -1;
}

.form-input-section,
.form-history-section {
  display: flex;
  flex-direction: column;
  min-height: 0;
  transition: all 0.3s ease;
}

.form-history-section {
  position: relative;
  overflow: visible;
}

.form-history-section.collapsed {
  width: 0;
  min-width: 0;
  padding: 0;
  margin: 0;
  border: none;
  overflow: visible;
  position: relative;
}

/* Collapsed Indicator - Always visible on the right edge, similar to sidebar toggle */
.history-collapsed-indicator {
  position: absolute;
  right: -12px;
  top: 0.25rem;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  border: none;
  border-radius: 0.5rem 0 0 0.5rem;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  padding: 0.5rem 0.3rem;
  pointer-events: auto;
}

.history-collapsed-indicator:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.history-collapsed-indicator i {
  font-size: 1rem;
}

.history-collapsed-indicator i:first-child {
  font-size: 1.1rem;
}

/* Documents History */
.history-timeline {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 0.5rem;
}

.history-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid rgba(0, 0, 0, 0.05);
}

.history-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.selection-mode-btn,
.select-all-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #dee2e6;
  border-radius: 0.375rem;
  background: white;
  color: #6c757d;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.9rem;
}

.selection-mode-btn:hover,
.select-all-btn:hover {
  background: #f8f9fa;
  color: #495057;
  border-color: #adb5bd;
}

.selection-mode-btn.active {
  background: var(--azul-turno);
  color: white;
  border-color: var(--azul-turno);
}

.select-all-btn {
  background: #28a745;
  color: white;
  border-color: #28a745;
}

.select-all-btn:hover {
  background: #218838;
  border-color: #1e7e34;
}

.history-header-content {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.history-toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  border-radius: 50%;
  border: none;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  font-size: 0.8rem;
}

.history-toggle-btn:hover {
  transform: scale(1.1);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.history-header-icon {
  font-size: 1.1rem;
  color: var(--azul-turno);
}

.history-header-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.history-sort-control {
  display: flex;
  align-items: center;
}

.sort-toggle-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.4rem 0.75rem;
  border-radius: 0.5rem;
  background: rgba(0, 0, 0, 0.03);
  transition: all 0.2s ease;
  margin: 0;
}

.sort-toggle-label:hover {
  background: rgba(0, 0, 0, 0.05);
}

.sort-toggle-input {
  margin: 0;
  cursor: pointer;
}

.sort-toggle-text {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.sort-asc {
  background-color: #28a745;
}

.sort-desc {
  background-color: #dc3545;
}

/* Documents List */
.documents-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 0.375rem;
}

.document-card-modern {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.98) 100%);
  border-radius: 0.375rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  padding: 0.5rem;
  margin-bottom: 0.375rem;
  transition: all 0.2s ease;
}

.document-card-modern:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
}

.document-card-modern.clickable {
  cursor: pointer;
}

.document-card-modern.clickable:hover {
  border-color: var(--azul-turno);
  box-shadow: 0 4px 16px rgba(0, 123, 255, 0.2);
}

.document-card-modern.selection-mode {
  position: relative;
  padding-left: 3rem;
}

.document-card-modern.selected {
  border-color: var(--azul-turno);
  background: rgba(0, 123, 255, 0.05);
  box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.2);
}

.selection-checkbox {
  position: absolute;
  top: 1rem;
  left: 1rem;
  z-index: 1;
}

.selection-checkbox input[type='checkbox'] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.document-card-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
}

.document-card-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.document-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.badge {
  padding: 0.1875rem 0.375rem;
  border-radius: 0.625rem;
  font-size: 0.625rem;
  font-weight: 600;
}

.badge-primary {
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
}

.badge-secondary {
  background: rgba(0, 0, 0, 0.05);
  color: var(--color-text);
}

.badge-generated {
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  animation: pulse 2s infinite;
}

.badge-success {
  background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
  color: white;
}

.badge-info {
  background: linear-gradient(135deg, #17a2b8 0%, #138496 100%);
  color: white;
}

.badge-warning {
  background: linear-gradient(135deg, #ffc107 0%, #ff9800 100%);
  color: #212529;
}

.auto-generated-indicator {
  display: inline-flex;
  align-items: center;
  margin-left: 0.5rem;
  color: #28a745;
  font-size: 0.875rem;
  animation: sparkle 2s infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

@keyframes sparkle {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}

.document-meta {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.document-type-icon {
  font-size: 1.25rem;
  color: var(--azul-turno);
}

.document-date {
  font-size: 0.85rem;
  color: var(--color-text);
  opacity: 0.7;
}

.document-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-document-action {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: 0.5rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 1rem;
}

.btn-download {
  background: rgba(0, 123, 255, 0.1);
  color: var(--azul-turno);
}

.btn-download:hover {
  background: rgba(0, 123, 255, 0.2);
}

.btn-delete {
  background: rgba(220, 53, 69, 0.1);
  color: #dc3545;
}

.btn-delete:hover {
  background: rgba(220, 53, 69, 0.2);
}

/* Responsive Design */
@media (max-width: 991px) {
  .form-layout-modern {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .form-section-header {
    margin-bottom: 0.75rem;
  }

  .history-section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
}

/* View Mode Selector */
.view-mode-selector {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding: 0.5rem;
  background: #f8f9fa;
  border-radius: 0.375rem;
  border: 1px solid #e9ecef;
}

.view-mode-btn {
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
  color: #495057;
}

.view-mode-btn:hover {
  background: #e9ecef;
  border-color: #adb5bd;
}

.view-mode-btn.active {
  background: var(--azul-turno);
  border-color: var(--azul-turno);
  color: white;
}

.view-mode-btn i {
  font-size: 0.875rem;
}

@media (max-width: 768px) {
  .documents-list {
    grid-template-columns: 1fr;
  }

  .upload-actions {
    flex-direction: column;
  }

  .btn-upload-file,
  .btn-save-file {
    width: 100%;
    justify-content: center;
  }

  .history-section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }
}
</style>
