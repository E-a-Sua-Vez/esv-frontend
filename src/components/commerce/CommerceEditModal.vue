<template>
  <div
    ref="modalElement"
    class="modal fade"
    :id="`commerce-edit-modal-${commerce?.id || 'new'}`"
    data-bs-backdrop="static"
    data-bs-keyboard="false"
    tabindex="-1"
    aria-labelledby="commerceEditModalLabel"
    aria-hidden="true"
  >
    <div class="modal-dialog modal-xl modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header border-0 active-name modern-modal-header">
          <div class="modern-modal-header-inner">
            <div class="modern-modal-icon-wrapper">
              <i class="bi bi-plus-lg"></i>
            </div>
            <div class="modern-modal-title-wrapper">
              <h5 class="modal-title fw-bold modern-modal-title">
                {{ $t('businessCommercesAdmin.edit') }}: {{ commerce?.name || '' }}
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
        <div class="modal-body p-0 commerce-edit-modal-body">
          <Spinner :show="loading"></Spinner>
          <div class="row g-0 commerce-edit-layout" v-if="commerce">
            <!-- SIDEBAR MENU -->
            <div class="col-12 col-lg-2 d-none d-md-block sidebar-column">
              <div class="commerce-edit-sidebar modern-card-sidebar">
                <!-- Basic Info Section -->
                <div class="sidebar-section-header">
                  <i class="bi bi-info-circle me-2"></i>
                  <span class="fw-bold sidebar-section-title">{{ $t('businessCommercesAdmin.basicInfo') }}</span>
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
                    <span class="sidebar-menu-text">{{ $t('businessCommercesAdmin.location') }}</span>
                  </button>
                  <button
                    class="sidebar-menu-item"
                    :class="{ 'sidebar-menu-item-active': activeSection === 'contact' }"
                    @click="setActiveSection('contact')"
                  >
                    <i class="bi bi-telephone sidebar-menu-icon"></i>
                    <span class="sidebar-menu-text">{{ $t('businessCommercesAdmin.contact') }}</span>
                  </button>
                </div>

                <!-- Service Section -->
                <div class="sidebar-section-header mt-3">
                  <i class="bi bi-gear me-2"></i>
                  <span class="fw-bold sidebar-section-title">{{ $t('businessCommercesAdmin.service') }}</span>
                </div>
                <div class="sidebar-menu-group">
                  <button
                    class="sidebar-menu-item"
                    :class="{ 'sidebar-menu-item-active': activeSection === 'service' }"
                    @click="setActiveSection('service')"
                  >
                    <i class="bi bi-clock-history sidebar-menu-icon"></i>
                    <span class="sidebar-menu-text">{{ $t('businessCommercesAdmin.serviceConfig') }}</span>
                  </button>
                  <button
                    class="sidebar-menu-item"
                    :class="{ 'sidebar-menu-item-active': activeSection === 'nonWorkingDates' }"
                    @click="setActiveSection('nonWorkingDates')"
                  >
                    <i class="bi bi-calendar-x sidebar-menu-icon"></i>
                    <span class="sidebar-menu-text">{{ $t('businessCommercesAdmin.nonWorkingDates') }}</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- MAIN CONTENT AREA -->
            <div class="col-12 col-lg-10 content-column">
              <div class="content-wrapper">
                <Alert :show="false" :stack="alertError"></Alert>

                <!-- Basic Fields Section -->
                <div v-if="activeSection === 'basic'" class="content-section">
                  <h6 class="section-title">
                    <i class="bi bi-pencil-square me-2"></i>
                    {{ $t('businessCommercesAdmin.basicFields') }}
                  </h6>
                  <CommerceFormBasicFields
                    v-model="localCommerce"
                    :categories="categories"
                    :toggles="toggles"
                    :is-add="false"
                    :business-id="commerce.businessId"
                    :business-logo="businessLogo"
                    :errors="errors"
                    prefix="modal-"
                  />
                </div>

                <!-- Location Section -->
                <div v-if="activeSection === 'location'" class="content-section">
                  <h6 class="section-title">
                    <i class="bi bi-geo-alt me-2"></i>
                    {{ $t('businessCommercesAdmin.location') }}
                  </h6>
                  <CommerceFormLocation
                    v-model="localCommerce"
                    :errors="errors"
                    :toggles="toggles"
                    :is-add="false"
                    prefix="modal-"
                  />
                </div>

                <!-- Contact Section -->
                <div v-if="activeSection === 'contact'" class="content-section">
                  <h6 class="section-title">
                    <i class="bi bi-telephone me-2"></i>
                    {{ $t('businessCommercesAdmin.contact') }}
                  </h6>
                  <CommerceFormContact
                    v-model="localCommerce"
                    :errors="errors"
                    :toggles="toggles"
                    :is-add="false"
                    prefix="modal-"
                  />
                </div>

                <!-- Service Section -->
                <div v-if="activeSection === 'service'" class="content-section">
                  <h6 class="section-title">
                    <i class="bi bi-clock-history me-2"></i>
                    {{ $t('businessCommercesAdmin.service') }}
                  </h6>
                  <CommerceFormService
                    v-model="localCommerce"
                    :toggles="toggles"
                    :locale="locale"
                    :is-add="false"
                    prefix="modal-"
                    :on-initialized-specific-calendar="onInitializedSpecificCalendar"
                    :on-initialized-personalized-hours="onInitializedPersonalizedHours"
                  />
                </div>

                <!-- Non-Working Dates Section -->
                <div v-if="activeSection === 'nonWorkingDates'" class="content-section">
                  <h6 class="section-title">
                    <i class="bi bi-calendar-x me-2"></i>
                    {{ $t('businessCommercesAdmin.nonWorkingDates') }}
                  </h6>
                  <NonWorkingDatesManager
                    :show="true"
                    :loading="loading"
                    :serviceInfo="localCommerce.serviceInfo"
                    :level="'commerce'"
                    :readonly="!toggles['commerces.admin.edit']"
                    @update:serviceInfo="localCommerce.serviceInfo = $event"
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
              <div id="commerce-id-form" class="service-details-container">
                <span>
                  <strong>Id:</strong> {{ commerce?.id }}
                </span>
                <button
                  type="button"
                  class="btn btn-link btn-copy-id p-0 ms-2 align-baseline"
                  title="copy"
                  @click="copyToClipboard(commerce?.id)"
                >
                  <i class="bi bi-clipboard"></i>
                </button>
              </div>
            </div>
            <div class="footer-actions">
              <button
                v-if="toggles['commerces.admin.edit']"
                type="button"
                class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                @click="updateCommerce"
                :disabled="loading"
              >
                <i class="bi bi-save me-1"></i> {{ $t('save') }}
              </button>
              <button
                v-if="toggles['commerces.admin.edit'] || toggles['commerces.admin.delete']"
                type="button"
                class="btn btn-sm btn-size fw-bold btn-danger rounded-pill px-3 ms-2"
                @click="deleteCommerce"
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
import { ref, computed } from 'vue';
import * as bootstrap from 'bootstrap';
import Spinner from '../common/Spinner.vue';
import Alert from '../common/Alert.vue';
import AreYouSure from '../common/AreYouSure.vue';
import CommerceFormBasicFields from './CommerceFormBasicFields.vue';
import CommerceFormLocation from './CommerceFormLocation.vue';
import CommerceFormContact from './CommerceFormContact.vue';
import CommerceFormService from './CommerceFormService.vue';
import NonWorkingDatesManager from '../domain/NonWorkingDatesManager.vue';

export default {
  name: 'CommerceEditModal',
  components: {
    Spinner,
    Alert,
    AreYouSure,
    CommerceFormBasicFields,
    CommerceFormLocation,
    CommerceFormContact,
    CommerceFormService,
    NonWorkingDatesManager,
  },
  props: {
    commerce: { type: Object, required: true },
    categories: { type: Array, default: () => [] },
    toggles: { type: Object, default: () => ({}) },
    businessLogo: { type: String, default: '' },
    locale: { type: String, default: 'es' },
    onInitializedSpecificCalendar: { type: Function, default: null },
    onInitializedPersonalizedHours: { type: Function, default: null },
  },
  emits: ['update', 'delete', 'close'],
  setup(props, { emit }) {
    const loading = ref(false);
    const alertError = ref('');
    const activeSection = ref('basic');
    const errors = ref({});
    const modalElement = ref(null);
    const showDeleteConfirm = ref(false);

    // Local copy for editing
    const localCommerce = computed({
      get: () => props.commerce,
      set: (value) => {
        // Update is handled through v-model in sub-components
      }
    });

    const setActiveSection = (section) => {
      activeSection.value = section;
    };

    const closeModal = () => {
      try {
        if (modalElement.value) {
          const bsModal = bootstrap.Modal.getInstance(modalElement.value);
          if (bsModal) {
            bsModal.hide();
          } else {
            // If instance doesn't exist, create one and hide it
            const modal = new bootstrap.Modal(modalElement.value);
            modal.hide();
          }
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

    const updateCommerce = async () => {
      try {
        emit('update', localCommerce.value);
        // Close modal after update with delay to allow parent to process
        setTimeout(() => {
          closeModal();
        }, 300);
      } catch (error) {
        console.error('Error updating commerce:', error);
      }
    };

    const deleteCommerce = () => {
      showDeleteConfirm.value = true;
    };

    const confirmDelete = async () => {
      try {
        showDeleteConfirm.value = false;
        emit('delete', localCommerce.value.id);
        // Close modal after delete with delay to allow parent to process
        setTimeout(() => {
          closeModal();
        }, 300);
      } catch (error) {
        console.error('Error deleting commerce:', error);
      }
    };

    const cancelDelete = () => {
      showDeleteConfirm.value = false;
    };

    const copyToClipboard = async (text) => {
      try {
        await navigator.clipboard.writeText(text);
      } catch (err) {
        console.error('Failed to copy: ', err);
      }
    };

    return {
      loading,
      alertError,
      activeSection,
      localCommerce,
      errors,
      modalElement,
      showDeleteConfirm,
      setActiveSection,
      updateCommerce,
      deleteCommerce,
      confirmDelete,
      cancelDelete,
      copyToClipboard,
    };
  },
};
</script>

<style scoped>

.commerce-edit-modal-body {
  min-height: 500px;
  background: white;
}

.commerce-edit-layout {
  min-height: 500px;
}

.sidebar-column {
  background: #f8f9fa;
  border-right: 1px solid #e5e7eb;
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
  margin-bottom: 1.5rem;
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

/* Sidebar Styles */
.commerce-edit-sidebar {
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

.footer-info {
  flex: 1;
}

.footer-actions {
  display: flex;
  gap: 0.75rem;
}

.service-details-container {
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
#commerce-edit-modal-new .modal-content,
[id^="commerce-edit-modal-"] .modal-content {
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