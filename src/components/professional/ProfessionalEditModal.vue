<template>
  <div
    ref="modalElement"
    class="modal fade"
    :id="`professional-edit-modal-${professional?.id || 'new'}`"
    data-bs-backdrop="static"
    data-bs-keyboard="false"
    tabindex="-1"
    aria-labelledby="professionalEditModalLabel"
    aria-hidden="true"
  >
    <div class="modal-dialog modal-xl modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header border-0 active-name modern-modal-header">
          <div class="modern-modal-header-inner">
            <div class="modern-modal-icon-wrapper">
              <i class="bi bi-person-badge"></i>
            </div>
            <div class="modern-modal-title-wrapper">
              <h5 class="modal-title fw-bold modern-modal-title">
                {{ $t('businessProfessionalsAdmin.edit') }}: {{ professional?.personalInfo?.name || '' }}
              </h5>
            </div>
            <button
              id="close-modal-professional"
              class="modern-modal-close-btn"
              type="button"
              data-bs-dismiss="modal"
              aria-label="Close"
            >
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </div>
        <div class="modal-body p-0 professional-edit-modal-body">
          <Spinner :show="loading"></Spinner>
          <div class="row g-0 professional-edit-layout" v-if="professional">
            <!-- SIDEBAR MENU -->
            <div class="col-12 col-lg-2 d-none d-md-block sidebar-column">
              <div class="professional-edit-sidebar modern-card-sidebar">
                <!-- Personal Info Section -->
                <div class="sidebar-section-header">
                  <i class="bi bi-person me-2"></i>
                  <span class="fw-bold sidebar-section-title">{{ $t('professionals.personalInfo') || 'Información Personal' }}</span>
                </div>
                <div class="sidebar-menu-group">
                  <button
                    class="sidebar-menu-item"
                    :class="{ 'sidebar-menu-item-active': activeSection === 'personal' }"
                    @click="setActiveSection('personal')"
                  >
                    <i class="bi bi-person-circle sidebar-menu-icon"></i>
                    <span class="sidebar-menu-text">{{ $t('professionals.basicInfo') || 'Datos Básicos' }}</span>
                  </button>
                  <button
                    class="sidebar-menu-item"
                    :class="{ 'sidebar-menu-item-active': activeSection === 'professional' }"
                    @click="setActiveSection('professional')"
                  >
                    <i class="bi bi-badge-vr sidebar-menu-icon"></i>
                    <span class="sidebar-menu-text">{{ $t('professionals.professionalInfo') || 'Info Profesional' }}</span>
                  </button>
                </div>

                <!-- Services & Modules Section -->
                <div class="sidebar-section-header mt-3">
                  <i class="bi bi-briefcase me-2"></i>
                  <span class="fw-bold sidebar-section-title">{{ $t('professionals.workConfig') || 'Configuración' }}</span>
                </div>
                <div class="sidebar-menu-group">
                  <button
                    class="sidebar-menu-item"
                    :class="{ 'sidebar-menu-item-active': activeSection === 'services' }"
                    @click="setActiveSection('services')"
                  >
                    <i class="bi bi-list-check sidebar-menu-icon"></i>
                    <span class="sidebar-menu-text">{{ $t('professionals.services') || 'Servicios' }}</span>
                  </button>
                  <button
                    class="sidebar-menu-item"
                    :class="{ 'sidebar-menu-item-active': activeSection === 'modules' }"
                    @click="setActiveSection('modules')"
                  >
                    <i class="bi bi-grid-3x3-gap sidebar-menu-icon"></i>
                    <span class="sidebar-menu-text">{{ $t('professionals.modules') || 'Módulos' }}</span>
                  </button>
                </div>

                <!-- Medical Data Section -->
                <div class="sidebar-section-header mt-3">
                  <i class="bi bi-heart-pulse me-2"></i>
                  <span class="fw-bold sidebar-section-title">{{ $t('professionals.medicalData') || 'Datos Médicos' }}</span>
                </div>
                <div class="sidebar-menu-group">
                  <button
                    class="sidebar-menu-item"
                    :class="{ 'sidebar-menu-item-active': activeSection === 'medicalInfo' }"
                    @click="setActiveSection('medicalInfo')"
                  >
                    <i class="bi bi-file-medical sidebar-menu-icon"></i>
                    <span class="sidebar-menu-text">{{ $t('professionals.medicalInfo') || 'Info Médica' }}</span>
                  </button>
                  <button
                    class="sidebar-menu-item"
                    :class="{ 'sidebar-menu-item-active': activeSection === 'contact' }"
                    @click="setActiveSection('contact')"
                  >
                    <i class="bi bi-telephone sidebar-menu-icon"></i>
                    <span class="sidebar-menu-text">{{ $t('professionals.professionalContact') || 'Contacto' }}</span>
                  </button>
                  <button
                    class="sidebar-menu-item"
                    :class="{ 'sidebar-menu-item-active': activeSection === 'practice' }"
                    @click="setActiveSection('practice')"
                  >
                    <i class="bi bi-gear sidebar-menu-icon"></i>
                    <span class="sidebar-menu-text">{{ $t('professionals.practiceConfig') || 'Configuración' }}</span>
                  </button>
                </div>

                <!-- Financial Section -->
                <div class="sidebar-section-header mt-3">
                  <i class="bi bi-cash-coin me-2"></i>
                  <span class="fw-bold sidebar-section-title">{{ $t('professionals.financial') || 'Información Financiera' }}</span>
                </div>
                <div class="sidebar-menu-group">
                  <button
                    class="sidebar-menu-item"
                    :class="{ 'sidebar-menu-item-active': activeSection === 'financial' }"
                    @click="setActiveSection('financial')"
                  >
                    <i class="bi bi-wallet2 sidebar-menu-icon"></i>
                    <span class="sidebar-menu-text">{{ $t('professionals.payment') || 'Pagos' }}</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- MAIN CONTENT AREA -->
            <div class="col-12 col-lg-10 content-column">
              <div class="content-wrapper">
                <Alert :show="false" :stack="alertError"></Alert>

                <!-- Personal Section -->
                <div v-if="activeSection === 'personal'" class="content-section">
                  <h6 class="section-title">
                    <i class="bi bi-person-circle me-2"></i>
                    {{ $t('professionals.basicInfo') || 'Datos Básicos' }}
                  </h6>
                  <div class="personal-fields-wrapper">
                    <ProfessionalFormEdit
                      :professional="localProfessional"
                      :commerce-id="commerceId"
                      :types="types"
                      :modules="modules"
                      :services="services"
                      :toggles="toggles"
                      :errors="errors"
                      :show-only="'personal'"
                      @update:professional="localProfessional = $event"
                    />
                  </div>
                </div>

                <!-- Professional Info Section -->
                <div v-if="activeSection === 'professional'" class="content-section">
                  <h6 class="section-title">
                    <i class="bi bi-badge-vr me-2"></i>
                    {{ $t('professionals.professionalInfo') || 'Información Profesional' }}
                  </h6>
                  <div class="professional-fields-wrapper">
                    <ProfessionalFormEdit
                      :professional="localProfessional"
                      :commerce-id="commerceId"
                      :types="types"
                      :modules="modules"
                      :services="services"
                      :toggles="toggles"
                      :errors="errors"
                      :show-only="'professionalInfo'"
                      :on-select-service="onSelectService"
                      :on-delete-service="onDeleteService"
                      :show-service="showService"
                      @update:professional="localProfessional = $event"
                    />
                  </div>
                </div>

                <!-- Services Section -->
                <div v-if="activeSection === 'services'" class="content-section">
                  <h6 class="section-title">
                    <i class="bi bi-list-check me-2"></i>
                    {{ $t('professionals.services') || 'Servicios' }}
                  </h6>
                  <div class="services-fields-wrapper">
                    <ProfessionalFormEdit
                      :professional="localProfessional"
                      :commerce-id="commerceId"
                      :types="types"
                      :modules="modules"
                      :services="services"
                      :toggles="toggles"
                      :errors="errors"
                      :show-only="'services'"
                      :on-select-service="onSelectService"
                      :on-delete-service="onDeleteService"
                      :show-service="showService"
                      @update:professional="localProfessional = $event"
                    />
                  </div>
                </div>

                <!-- Modules Section -->
                <div v-if="activeSection === 'modules'" class="content-section">
                  <h6 class="section-title">
                    <i class="bi bi-grid-3x3-gap me-2"></i>
                    {{ $t('professionals.modules') || 'Módulos Activos' }}
                  </h6>
                  <div class="modules-fields-wrapper">
                    <ProfessionalFormEdit
                      :professional="localProfessional"
                      :commerce-id="commerceId"
                      :types="types"
                      :modules="modules"
                      :services="services"
                      :toggles="toggles"
                      :errors="errors"
                      :show-only="'modules'"
                      :on-select-module="onSelectModule"
                      :on-delete-module="onDeleteModule"
                      :show-module="showModule"
                      @update:professional="localProfessional = $event"
                    />
                  </div>
                </div>

                <!-- Medical Info Section -->
                <div v-if="activeSection === 'medicalInfo'" class="content-section">
                  <h6 class="section-title">
                    <i class="bi bi-file-medical me-2"></i>
                    {{ $t('professionals.medicalProfessionalInfo') || 'Información Profesional Médica' }}
                  </h6>
                  <div class="medical-fields-wrapper">
                    <ProfessionalFormEdit
                      :professional="localProfessional"
                      :commerce-id="commerceId"
                      :types="types"
                      :modules="modules"
                      :services="services"
                      :toggles="toggles"
                      :errors="errors"
                      :show-only="'medicalInfo'"
                      @update:professional="localProfessional = $event"
                    />
                  </div>
                </div>

                <!-- Contact Section -->
                <div v-if="activeSection === 'contact'" class="content-section">
                  <h6 class="section-title">
                    <i class="bi bi-telephone me-2"></i>
                    {{ $t('professionals.professionalContact') || 'Datos de Contacto Profesional' }}
                  </h6>
                  <div class="contact-fields-wrapper">
                    <ProfessionalFormEdit
                      :professional="localProfessional"
                      :commerce-id="commerceId"
                      :types="types"
                      :modules="modules"
                      :services="services"
                      :toggles="toggles"
                      :errors="errors"
                      :show-only="'contact'"
                      @update:professional="localProfessional = $event"
                    />
                  </div>
                </div>

                <!-- Practice Configuration Section -->
                <div v-if="activeSection === 'practice'" class="content-section">
                  <h6 class="section-title">
                    <i class="bi bi-gear me-2"></i>
                    {{ $t('professionals.practiceConfig') || 'Configuraciones de Práctica' }}
                  </h6>
                  <div class="practice-fields-wrapper">
                    <ProfessionalFormEdit
                      :professional="localProfessional"
                      :commerce-id="commerceId"
                      :types="types"
                      :modules="modules"
                      :services="services"
                      :toggles="toggles"
                      :errors="errors"
                      :show-only="'practice'"
                      @update:professional="localProfessional = $event"
                    />
                  </div>
                </div>

                <!-- Financial Section -->
                <div v-if="activeSection === 'financial'" class="content-section">
                  <h6 class="section-title">
                    <i class="bi bi-wallet2 me-2"></i>
                    {{ $t('professionals.payment') || 'Información de Pagos' }}
                  </h6>
                  <div class="financial-fields-wrapper">
                    <ProfessionalFormEdit
                      :professional="localProfessional"
                      :commerce-id="commerceId"
                      :types="types"
                      :modules="modules"
                      :services="services"
                      :toggles="toggles"
                      :errors="errors"
                      :show-only="'financial'"
                      @update:professional="localProfessional = $event"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- MODAL FOOTER -->
        <div class="modal-footer border-0">
          <div class="d-flex justify-content-between w-100 align-items-center">
            <div class="footer-info">
              <div class="professional-details-container">
                <span><strong>Id:</strong> {{ professional?.id }}</span>
                <button
                  type="button"
                  @click="copyToClipboard(professional?.id)"
                  class="btn btn-link btn-copy-id p-0 ms-2 align-baseline"
                  :title="$t('copy') || 'Copiar ID'"
                >
                  <i class="bi bi-clipboard"></i>
                </button>
              </div>
            </div>
            <div class="footer-actions">
              <button
                v-if="toggles['professionals.admin.update']"
                type="button"
                class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                @click="updateProfessional"
                :disabled="loading"
              >
                <i class="bi bi-save me-1"></i> {{ $t('save') }}
              </button>
              <button
                v-if="toggles['professionals.admin.unavailable']"
                type="button"
                class="btn btn-sm btn-size fw-bold btn-danger rounded-pill px-3 ms-2"
                @click="deleteProfessional"
                :disabled="loading"
              >
                <i class="bi bi-trash-fill me-1"></i> {{ $t('delete') }}
              </button>
            </div>
          </div>
          <div class="d-flex justify-content-end w-100">
            <AreYouSure
              :show="showDeleteConfirm"
              @actionYes="confirmDelete"
              @actionNo="cancelDelete"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';

import Spinner from '../common/Spinner.vue';
import Alert from '../common/Alert.vue';
import AreYouSure from '../common/AreYouSure.vue';
import ProfessionalFormEdit from './ProfessionalFormEdit.vue';

export default {
  name: 'ProfessionalEditModal',
  components: {
    Spinner,
    Alert,
    AreYouSure,
    ProfessionalFormEdit,
  },
  props: {
    show: { type: Boolean, default: false },
    professional: { type: Object, default: () => ({}) },
    commerceId: { type: String, default: '' },
    types: { type: Array, default: () => [] },
    modules: { type: Array, default: () => [] },
    services: { type: Array, default: () => [] },
    toggles: { type: Object, default: () => ({}) },
    errors: { type: Object, default: () => ({}) },
    onSelectService: { type: Function, default: null },
    onDeleteService: { type: Function, default: null },
    showService: { type: Function, default: null },
    onSelectModule: { type: Function, default: null },
    onDeleteModule: { type: Function, default: null },
    showModule: { type: Function, default: null },
  },
  emits: ['update', 'delete', 'close'],
  setup(props, { emit }) {
    const loading = ref(false);
    const alertError = ref('');
    const showDeleteConfirm = ref(false);
    const activeSection = ref('personal');
    const modalElement = ref(null);
    let modalInstance = null;

    // Local copy for editing - ref to make it reactive
    const localProfessional = ref({ ...props.professional });

    // Watch for prop changes
    watch(
      () => props.professional,
      (newVal) => {
        if (newVal) {
          localProfessional.value = { ...newVal };
        }
      },
      { deep: true }
    );

    const isMedicalProfessional = computed(() => {
      const medicalTypes = [
        'DOCTOR',
        'SPECIALIST',
        'NURSE',
        'MEDICAL_ASSISTANT',
        'THERAPIST',
        'DENTIST',
        'PHYSIOTHERAPIST',
        'PSYCHOLOGIST',
        'NUTRITIONIST',
        'PHARMACIST',
        'TECHNICIAN',
      ];
      const professionalType = props.professional.professionalInfo?.professionalType;
      return medicalTypes.includes(professionalType);
    });

    const setActiveSection = (section) => {
      activeSection.value = section;
    };

    const closeModal = () => {
      try {
        if (modalInstance) {
          modalInstance.hide();
        }
        // Clean up backdrop
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => backdrop.remove());
        document.body.classList.remove('modal-open');
        emit('close');
      } catch (error) {
        console.error('Error closing modal:', error);
        // Force cleanup even on error
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => backdrop.remove());
        document.body.classList.remove('modal-open');
      }
    };

    const updateProfessional = () => {
      try {
        emit('update', localProfessional.value);
      } catch (error) {
        console.error('Error updating professional:', error);
      }
    };

    const deleteProfessional = () => {
      try {
        showDeleteConfirm.value = true;
      } catch (error) {
        console.error('Error deleting professional:', error);
      }
    };

    const confirmDelete = () => {
      try {
        showDeleteConfirm.value = false;
        emit('delete', localProfessional.value.id);
        // Close modal after delete with delay to allow parent to process
        setTimeout(() => {
          closeModal();
        }, 300);
      } catch (error) {
        console.error('Error confirming delete:', error);
      }
    };

    const cancelDelete = () => {
      showDeleteConfirm.value = false;
    };

    const copyToClipboard = (text) => {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text);
      }
    };

    // Watch for show prop changes
    watch(() => props.show, async (newVal) => {
      if (newVal && modalInstance) {
        await new Promise(resolve => setTimeout(resolve, 100));
        modalInstance.show();
      } else if (!newVal && modalInstance) {
        modalInstance.hide();
      }
    });

    onMounted(async () => {
      // Initialize Bootstrap Modal
      await new Promise(resolve => setTimeout(resolve, 100));
      if (modalElement.value) {
        const { Modal } = await import('bootstrap');
        modalInstance = new Modal(modalElement.value, {
          backdrop: 'static',
          keyboard: false
        });

        // Show modal if prop is true
        if (props.show) {
          await new Promise(resolve => setTimeout(resolve, 100));
          modalInstance.show();
        }

        // Listen for modal hidden event
        modalElement.value.addEventListener('hidden.bs.modal', () => {
          emit('close');
        });
      }
    });

    onUnmounted(() => {
      if (modalInstance) {
        modalInstance.dispose();
      }
    });

    return {
      loading,
      alertError,
      showDeleteConfirm,
      activeSection,
      modalElement,
      localProfessional,
      isMedicalProfessional,
      setActiveSection,
      closeModal,
      updateProfessional,
      deleteProfessional,
      confirmDelete,
      cancelDelete,
      copyToClipboard,
    };
  },
};
</script>

<style scoped>
/* Modal Layout */
.professional-edit-modal-body {
  min-height: 500px;
  max-height: calc(100vh - 200px);
}

.professional-edit-layout {
  min-height: 500px;
}

/* Sidebar Styles */
.sidebar-column {
  background-color: #f8f9fa;
  border-right: 1px solid #dee2e6;
}

.professional-edit-sidebar {
  padding: 1rem;
  height: 100%;
}

.sidebar-section-header {
  display: flex;
  align-items: center;
  padding: 0.5rem 0;
  font-size: 0.75rem;
  color: #6b7280;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #e5e7eb;
}

.sidebar-section-title {
  font-size: 0.75rem;
  line-height: .9rem;
}

.sidebar-menu-group {
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
}

.sidebar-menu-item {
  display: flex;
  align-items: center;
  width: 100%;
  padding: 0.625rem 0.75rem;
  border: none;
  background: transparent;
  color: #374151;
  font-size: 0.875rem;
  font-weight: 500;
  text-align: left;
  border-radius: 0.375rem;
  transition: all 0.2s ease;
  cursor: pointer;
  margin-bottom: 0.25rem;
}

.sidebar-menu-item:hover {
  background: rgba(37, 99, 235, 0.1);
  color: #2563eb;
}

.sidebar-menu-item-active {
  background: rgba(37, 99, 235, 0.15);
  color: #2563eb;
  font-weight: 600;
  line-height: .9rem;
}

.sidebar-menu-icon {
  margin-right: 0.75rem;
  font-size: 1rem;
}

.sidebar-menu-text {
  flex: 1;
  line-height: .9rem;
}

/* Content Styles */
.content-column {
  background-color: #ffffff;
}

.content-wrapper {
  padding: 2rem;
}

.content-section {
  animation: fadeIn 0.3s ease-in-out;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.section-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #212529;
  margin-bottom: 1.5rem;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #dee2e6;
}

/* Modern Modal Header */
.modern-modal-header {
  padding: 0.75rem 1rem;
  background-color: var(--azul-turno);
  color: var(--color-background);
  border-radius: 1rem 1rem 0 0;
  min-height: auto;
  position: relative;
}

.modern-modal-header-inner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.modern-modal-icon-wrapper {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.modern-modal-icon-wrapper i {
  font-size: 1.125rem;
  color: #ffffff;
}

.modern-modal-title-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  flex: 1;
  min-width: 0;
}

.modern-modal-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-background);
  margin: 0;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.modern-modal-client-name {
  font-size: 0.75rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  line-height: 1.2;
}

.modern-modal-close-btn {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.85;
  width: 1.75rem;
  height: 1.75rem;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 0.375rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  border: none;
  padding: 0;
}

.modern-modal-close-btn i {
  font-size: 1rem;
  color: #ffffff;
  line-height: 1;
}

.modern-modal-close-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.25);
}

/* Footer Styles */
.modal-footer {
  padding: 1rem 1.5rem;
  background-color: #f8f9fa;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-info {
  flex: 1;
}

.footer-actions {
  display: flex;
  gap: 0.75rem;
}

.professional-details-container {
  font-size: 0.8rem;
  margin-left: 0.5rem;
  margin-right: 0.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0;
  text-align: left;
}

.btn-copy-id {
  font-size: 0.8rem;
  color: var(--gris-default);
  text-decoration: none;
}

.btn-copy-id:hover {
  color: var(--primary-color, #000);
  text-decoration: none;
}

.btn-size {
  min-width: 120px;
  font-size: 0.875rem;
}

.modal-footer {
  padding: 1rem 1.5rem;
}

/* Responsive */
@media (max-width: 991px) {
  .sidebar-column {
    display: none !important;
  }

  .content-wrapper {
    padding: 1rem;
  }
}
</style>

<style>
/* Override prontuario-common.css max-width for edit modals */
#professional-edit-modal-new .modal-content,
[id^="professional-edit-modal-"] .modal-content {
  max-width: none !important;
}

.modal-xl .modal-content {
  max-width: none !important;
}

/* Ensure modal appears above everything */
.modal {
  z-index: 1060 !important;
}

.modal-backdrop {
  z-index: 1055 !important;
}

/* AreYouSure alignment in footer */
.modal-footer .question-card {
  width: auto !important;
  min-width: 400px;
}
</style>
