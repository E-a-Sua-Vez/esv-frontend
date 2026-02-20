<template>
  <div
    ref="modalElement"
    class="modal fade"
    :id="`business-edit-modal-${business?.id || 'new'}`"
    data-bs-backdrop="static"
    data-bs-keyboard="false"
    tabindex="-1"
    aria-labelledby="businessEditModalLabel"
    aria-hidden="true"
  >
    <div class="modal-dialog modal-xl modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header border-0 active-name modern-modal-header">
          <div class="modern-modal-header-inner">
            <div class="modern-modal-icon-wrapper">
              <i class="bi bi-building"></i>
            </div>
            <div class="modern-modal-title-wrapper">
              <h5 class="modal-title fw-bold modern-modal-title">
                {{ $t('businessAdmin.edit') }}: {{ business?.name || '' }}
              </h5>
            </div>
            <button
              id="close-modal"
              class="modern-modal-close-btn"
              type="button"
              data-bs-dismiss="modal"
              aria-label="Close"
            >
              <i class="bi bi-x-lg"></i>
            </button>
          </div>
        </div>
        <div class="modal-body p-0 business-edit-modal-body">
          <Spinner :show="loading"></Spinner>
          <div class="row g-0 business-edit-layout" v-if="business">
            <!-- SIDEBAR MENU -->
            <div class="col-12 col-lg-2 d-none d-md-block sidebar-column">
              <div class="business-edit-sidebar modern-card-sidebar">
                <!-- Basic Info Section -->
                <div class="sidebar-section-header">
                  <i class="bi bi-info-circle me-2"></i>
                  <span class="fw-bold sidebar-section-title">{{ $t('businessCommercesAdmin.basicInfo') || 'Información Básica' }}</span>
                </div>
                <div class="sidebar-menu-group">
                  <button
                    class="sidebar-menu-item"
                    :class="{ 'sidebar-menu-item-active': activeSection === 'basic' }"
                    @click="setActiveSection('basic')"
                  >
                    <i class="bi bi-pencil-square sidebar-menu-icon"></i>
                    <span class="sidebar-menu-text">{{ $t('businessCommercesAdmin.basicFields') }}</span>
                  </button>
                  <button
                    class="sidebar-menu-item"
                    :class="{ 'sidebar-menu-item-active': activeSection === 'location' }"
                    @click="setActiveSection('location')"
                  >
                    <i class="bi bi-geo-alt sidebar-menu-icon"></i>
                    <span class="sidebar-menu-text">{{ $t('businessCommercesAdmin.location') || 'Localización' }}</span>
                  </button>
                  <button
                    class="sidebar-menu-item"
                    :class="{ 'sidebar-menu-item-active': activeSection === 'contact' }"
                    @click="setActiveSection('contact')"
                  >
                    <i class="bi bi-telephone sidebar-menu-icon"></i>
                    <span class="sidebar-menu-text">{{ $t('businessCommercesAdmin.contact') || 'Contacto' }}</span>
                  </button>
                </div>

                <!-- Service Section -->
                <div class="sidebar-section-header mt-3">
                  <i class="bi bi-gear me-2"></i>
                  <span class="fw-bold sidebar-section-title">{{ $t('businessCommercesAdmin.service') || 'Servicio' }}</span>
                </div>
                <div class="sidebar-menu-group">
                  <button
                    class="sidebar-menu-item"
                    :class="{ 'sidebar-menu-item-active': activeSection === 'service' }"
                    @click="setActiveSection('service')"
                  >
                    <i class="bi bi-clock-history sidebar-menu-icon"></i>
                    <span class="sidebar-menu-text">{{ $t('businessCommercesAdmin.serviceConfig') || 'Configuración' }}</span>
                  </button>
                  <button
                    class="sidebar-menu-item"
                    :class="{ 'sidebar-menu-item-active': activeSection === 'nonWorkingDates' }"
                    @click="setActiveSection('nonWorkingDates')"
                  >
                    <i class="bi bi-calendar-x sidebar-menu-icon"></i>
                    <span class="sidebar-menu-text">{{ $t('businessCommercesAdmin.nonWorkingDates') || 'Días No Laborables' }}</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- MAIN CONTENT AREA -->
            <div class="col-12 col-lg-10 content-column">
              <div class="content-wrapper">
                <Alert :show="false" :stack="alertError"></Alert>

                <!-- Basic Section -->
                <div v-if="activeSection === 'basic'" class="content-section">
                  <h6 class="section-title">
                    <i class="bi bi-pencil-square me-2"></i>
                    {{ $t('businessCommercesAdmin.basicFields') }}
                  </h6>
                  <div class="basic-fields-wrapper">
                    <BusinessFormEdit
                      :business="localBusiness"
                      :index="0"
                      :toggles="toggles"
                      :business-logos="businessLogos"
                      :show="true"
                      :show-only="'basic'"
                      @openLogoUpload="$emit('openLogoUpload', localBusiness)"
                      @loadLogo="$emit('loadLogo', localBusiness.id, localBusiness.logo)"
                    />
                  </div>
                </div>

                <!-- Location Section -->
                <div v-if="activeSection === 'location'" class="content-section">
                  <h6 class="section-title">
                    <i class="bi bi-geo-alt me-2"></i>
                    {{ $t('businessCommercesAdmin.location') || 'Localización' }}
                  </h6>
                  <div class="location-fields-wrapper">
                    <BusinessFormEdit
                      :business="localBusiness"
                      :index="0"
                      :toggles="toggles"
                      :business-logos="businessLogos"
                      :show="true"
                      :show-only="'location'"
                      @openLogoUpload="$emit('openLogoUpload', localBusiness)"
                      @loadLogo="$emit('loadLogo', localBusiness.id, localBusiness.logo)"
                    />
                  </div>
                </div>

                <!-- Contact Section -->
                <div v-if="activeSection === 'contact'" class="content-section">
                  <h6 class="section-title">
                    <i class="bi bi-telephone me-2"></i>
                    {{ $t('businessCommercesAdmin.contact') || 'Contacto' }}
                  </h6>
                  <div class="contact-fields-wrapper">
                    <BusinessFormEdit
                      :business="localBusiness"
                      :index="0"
                      :toggles="toggles"
                      :business-logos="businessLogos"
                      :show="true"
                      :show-only="'contact'"
                      @openLogoUpload="$emit('openLogoUpload', localBusiness)"
                      @loadLogo="$emit('loadLogo', localBusiness.id, localBusiness.logo)"
                    />
                  </div>
                </div>

                <!-- Service Section -->
                <div v-if="activeSection === 'service'" class="content-section">
                  <h6 class="section-title">
                    <i class="bi bi-clock-history me-2"></i>
                    {{ $t('businessCommercesAdmin.service') || 'Servicio' }}
                  </h6>
                  <div class="service-fields-wrapper">
                    <BusinessFormEdit
                      :business="localBusiness"
                      :index="0"
                      :toggles="toggles"
                      :business-logos="businessLogos"
                      :show="true"
                      :show-only="'service'"
                      @openLogoUpload="$emit('openLogoUpload', localBusiness)"
                      @loadLogo="$emit('loadLogo', localBusiness.id, localBusiness.logo)"
                    />
                  </div>
                </div>

                <!-- Non-Working Dates Section -->
                <div v-if="activeSection === 'nonWorkingDates'" class="content-section">
                  <h6 class="section-title">
                    <i class="bi bi-calendar-x me-2"></i>
                    {{ $t('businessCommercesAdmin.nonWorkingDates') || 'Días No Laborables' }}
                  </h6>
                  <NonWorkingDatesManager
                    :show="true"
                    :loading="loading"
                    :serviceInfo="localBusiness.serviceInfo"
                    :level="'business'"
                    :readonly="!toggles['businesses.admin.edit']"
                    @update:serviceInfo="localBusiness.serviceInfo = $event"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- MODAL FOOTER -->
        <div class="modal-footer border-0">
          <div class="d-flex justify-content-between w-100 align-items-center">
            <div class="footer-info">
              <div class="business-details-container">
                <span><strong>Id:</strong> {{ business?.id }}</span>
                <button
                  @click="copyToClipboard(business?.id)"
                  class="btn-copy-id ms-2"
                  title="Copiar ID"
                >
                  <i class="bi bi-clipboard"></i>
                </button>
              </div>
            </div>
            <div class="footer-actions">
              <button
                v-if="toggles['businesses.admin.edit']"
                type="button"
                class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                @click="updateBusiness"
                :disabled="loading"
              >
                <i class="bi bi-save me-1"></i> {{ $t('save') }}
              </button>
              <button
                v-if="!isOwnBusiness && (toggles['businesses.admin.delete'] || toggles['businesses.admin.edit'])"
                type="button"
                class="btn btn-sm btn-size fw-bold btn-danger rounded-pill px-3 ms-2"
                @click="deleteBusiness"
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
import * as bootstrap from 'bootstrap';
import Spinner from '../common/Spinner.vue';
import Alert from '../common/Alert.vue';
import AreYouSure from '../common/AreYouSure.vue';
import BusinessFormEdit from './BusinessFormEdit.vue';
import NonWorkingDatesManager from '../domain/NonWorkingDatesManager.vue';

export default {
  name: 'BusinessEditModal',
  components: {
    Spinner,
    Alert,
    AreYouSure,
    BusinessFormEdit,
    NonWorkingDatesManager,
  },
  props: {
    business: { type: Object, required: true },
    show: { type: Boolean, default: false },
    toggles: { type: Object, default: () => ({}) },
    businessLogos: { type: Object, default: () => ({}) },
    isOwnBusiness: { type: Boolean, default: false },
  },
  emits: ['update', 'delete', 'openLogoUpload', 'loadLogo', 'close'],
  setup(props, { emit }) {
    const loading = ref(false);
    const alertError = ref('');
    const showDeleteConfirm = ref(false);
    const activeSection = ref('basic');
    const modalElement = ref(null);
    let modalInstance = null;

    // Local copy for editing
    const localBusiness = computed({
      get: () => props.business,
      set: (value) => {
        // Update is handled by parent
      }
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

    // Watch for show prop changes
    watch(() => props.show, (newVal) => {
      if (newVal && modalElement.value) {
        // Small delay to ensure click event has finished propagating
        setTimeout(() => {
          if (!modalInstance) {
            modalInstance = new bootstrap.Modal(modalElement.value, {
              backdrop: 'static',
              keyboard: false
            });

            // Listen for modal hide event
            modalElement.value.addEventListener('hidden.bs.modal', () => {
              emit('close');
            });
          }
          modalInstance.show();
        }, 300);
      } else if (!newVal && modalInstance) {
        modalInstance.hide();
      }
    }, { immediate: false });

    onMounted(() => {
      // If show is true on mount, show the modal
      if (props.show && modalElement.value) {
        // Increased delay to ensure DOM is fully ready
        setTimeout(() => {
          modalInstance = new bootstrap.Modal(modalElement.value, {
            backdrop: 'static',
            keyboard: false
          });

          // Listen for modal hide event
          modalElement.value.addEventListener('hidden.bs.modal', () => {
            emit('close');
          });

          modalInstance.show();
        }, 300);
      }
    });

    onUnmounted(() => {
      if (modalInstance) {
        modalInstance.dispose();
      }
    });

    const updateBusiness = async () => {
      try {
        emit('update', localBusiness.value);
        // Close modal after successful update
        setTimeout(() => {
          closeModal();
        }, 300);
      } catch (error) {
        console.error('Error updating business:', error);
      }
    };

    const deleteBusiness = async () => {
      try {
        showDeleteConfirm.value = true;
      } catch (error) {
        console.error('Error deleting business:', error);
      }
    };

    const confirmDelete = () => {
      try {
        showDeleteConfirm.value = false;
        emit('delete', localBusiness.value.id);
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
      if (navigator.clipboard && text) {
        navigator.clipboard.writeText(text).then(
          () => {
            console.log('ID copiado al portapapeles');
          },
          (err) => {
            console.error('Error al copiar ID: ', err);
          }
        );
      }
    };

    return {
      loading,
      alertError,
      showDeleteConfirm,
      activeSection,
      localBusiness,
      modalElement,
      setActiveSection,
      updateBusiness,
      deleteBusiness,
      confirmDelete,
      cancelDelete,
      copyToClipboard,
      closeModal,
    };
  },
};
</script>

<style scoped>

.business-edit-modal-body {
  min-height: 500px;
  background: white;
}

.business-edit-layout {
  height: 100%;
  min-height: 500px;
  max-height: calc(100vh - 200px);
}

.sidebar-column {
  background: #f8f9fa;
  border-right: 1px solid #e5e7eb;
  height: 100%;
  overflow-y: auto;
}

.content-column {
  height: 100%;
  overflow-y: auto;
}

.content-wrapper {
  padding: 1.5rem;
}

.content-section {
  animation: fadeIn 0.3s ease;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #111827;
  padding-bottom: 0.75rem;
  border-bottom: 2px solid #e5e7eb;
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

/* Sidebar Styles */
.business-edit-sidebar {
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
}

.sidebar-menu-icon {
  margin-right: 0.75rem;
  font-size: 1rem;
}

.sidebar-menu-text {
  flex: 1;
  line-height: .9rem;
}

.footer-info {
  flex: 1;
}

.footer-actions {
  display: flex;
  gap: 0.75rem;
}

.business-details-container {
  font-size: 0.8rem;
  margin-left: 0.5rem;
  margin-right: 0.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0;
  text-align: left;
}

.btn-copy-id {
  color: var(--gris-medio);
  font-size: 0.875rem;
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
}

.btn-copy-id:hover {
  color: var(--azul-turno);
}

.btn-size {
  min-width: 120px;
  font-size: 0.875rem;
}

.modal-footer {
  padding: 1rem 1.5rem;
  background-color: #f8f9fa;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>

<style>
/* Override prontuario-common.css max-width for edit modals */
#business-edit-modal-new .modal-content,
[id^="business-edit-modal-"] .modal-content {
  max-width: none !important;
  border-radius: 1rem !important;
}

.modal-xl .modal-content {
  max-width: none !important;
  border-radius: 1rem !important;
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
