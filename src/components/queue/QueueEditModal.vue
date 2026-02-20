<template>
  <div
    ref="modalElement"
    class="modal fade"
    :id="`queue-edit-modal-${queue?.id || 'new'}`"
    data-bs-backdrop="static"
    data-bs-keyboard="false"
    tabindex="-1"
    aria-labelledby="queueEditModalLabel"
    aria-hidden="true"
  >
    <div class="modal-dialog modal-xl modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header border-0 active-name modern-modal-header">
          <div class="modern-modal-header-inner">
            <div class="modern-modal-icon-wrapper">
              <i class="bi bi-list-ol"></i>
            </div>
            <div class="modern-modal-title-wrapper">
              <h5 class="modal-title fw-bold modern-modal-title">
                {{ $t('businessQueuesAdmin.edit') }}: {{ queue?.name || '' }}
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
        <div class="modal-body p-0 queue-edit-modal-body">
          <Spinner :show="loading"></Spinner>
          <div class="row g-0 queue-edit-layout" v-if="queue">
            <!-- SIDEBAR MENU -->
            <div class="col-12 col-lg-2 d-none d-md-block sidebar-column">
              <div class="queue-edit-sidebar modern-card-sidebar">
                <!-- Basic Info Section -->
                <div class="sidebar-section-header">
                  <i class="bi bi-info-circle me-2"></i>
                  <span class="fw-bold sidebar-section-title">{{ $t('businessQueuesAdmin.basicInfo') }}</span>
                </div>
                <div class="sidebar-menu-group">
                  <button
                    class="sidebar-menu-item"
                    :class="{ 'sidebar-menu-item-active': activeSection === 'general' }"
                    @click="setActiveSection('general')"
                  >
                    <i class="bi bi-pencil-square sidebar-menu-icon"></i>
                    <span class="sidebar-menu-text">{{ $t('businessQueuesAdmin.general') }}</span>
                  </button>
                </div>

                <!-- Service Section -->
                <div class="sidebar-section-header mt-3">
                  <i class="bi bi-gear me-2"></i>
                  <span class="fw-bold sidebar-section-title">{{ $t('businessQueuesAdmin.service') }}</span>
                </div>
                <div class="sidebar-menu-group">
                  <button
                    class="sidebar-menu-item"
                    :class="{ 'sidebar-menu-item-active': activeSection === 'serviceInfo' }"
                    @click="setActiveSection('serviceInfo')"
                  >
                    <i class="bi bi-clock-history sidebar-menu-icon"></i>
                    <span class="sidebar-menu-text">{{ $t('businessQueuesAdmin.serviceInfo') }}</span>
                  </button>
                  <button
                    class="sidebar-menu-item"
                    :class="{ 'sidebar-menu-item-active': activeSection === 'nonWorkingDates' }"
                    @click="setActiveSection('nonWorkingDates')"
                  >
                    <i class="bi bi-calendar-x sidebar-menu-icon"></i>
                    <span class="sidebar-menu-text">{{ $t('businessQueuesAdmin.nonWorkingDates') }}</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- MAIN CONTENT AREA -->
            <div class="col-12 col-lg-10 content-column">
              <div class="content-wrapper">
                <Alert :show="false" :stack="alertError"></Alert>

                <!-- General Section -->
                <div v-if="activeSection === 'general'" class="content-section">
                  <h6 class="section-title">
                    <i class="bi bi-pencil-square me-2"></i>
                    {{ $t('businessQueuesAdmin.general') }}
                  </h6>
                  <QueueFormBasicFields
                    v-model="localQueue"
                    :types="types"
                    :toggles="toggles"
                    :errors="errors"
                    :is-add="false"
                    :commerce="commerce"
                    prefix="modal-"
                  />
                </div>

                <!-- Service Info Section -->
                <div v-if="activeSection === 'serviceInfo'" class="content-section">
                  <h6 class="section-title">
                    <i class="bi bi-clock-history me-2"></i>
                    {{ $t('businessQueuesAdmin.serviceInfo') }}
                  </h6>
                  <QueueFormServiceInfo
                    v-model="localQueue"
                    :toggles="toggles"
                    :is-add="false"
                    :locale="locale"
                    prefix="modal-"
                    :day-checked="dayChecked"
                    :check-day="checkDay"
                    :initialized-personalized-hours="initializedPersonalizedHours"
                    :initialized-specific-calendar="initializedSpecificCalendar"
                  />
                </div>

                <!-- Non-Working Dates Section -->
                <div v-if="activeSection === 'nonWorkingDates'" class="content-section">
                  <h6 class="section-title">
                    <i class="bi bi-calendar-x me-2"></i>
                    {{ $t('businessQueuesAdmin.nonWorkingDates') }}
                  </h6>
                  <NonWorkingDatesManager
                    :show="true"
                    :loading="loading"
                    :serviceInfo="localQueue.serviceInfo"
                    :level="'queue'"
                    :readonly="!toggles['queues.admin.update']"
                    @update:serviceInfo="localQueue.serviceInfo = $event"
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
              <div id="queue-id-form" class="service-details-container">
                <span>
                  <strong>Id:</strong> {{ queue?.id }}
                </span>
                <button
                  type="button"
                  class="btn btn-link btn-copy-id p-0 ms-2 align-baseline"
                  title="copy"
                  @click="copyToClipboard(queue?.id)"
                >
                  <i class="bi bi-clipboard"></i>
                </button>
              </div>
            </div>
            <div class="footer-actions">
              <button
                v-if="toggles['queues.admin.update']"
                type="button"
                class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                @click="updateQueue"
                :disabled="loading"
              >
                <i class="bi bi-save me-1"></i> {{ $t('save') }}
              </button>
              <button
                v-if="toggles['queues.admin.edit'] || toggles['queues.admin.delete']"
                type="button"
                class="btn btn-sm btn-size fw-bold btn-danger rounded-pill px-3 ms-2"
                @click="deleteQueue"
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
import QueueFormBasicFields from './QueueFormBasicFields.vue';
import QueueFormServiceInfo from './QueueFormServiceInfo.vue';
import SpecificCalendarForm from '../domain/SpecificCalendarForm.vue';
import NonWorkingDatesManager from '../domain/NonWorkingDatesManager.vue';

export default {
  name: 'QueueEditModal',
  components: {
    Spinner,
    Alert,
    AreYouSure,
    QueueFormBasicFields,
    QueueFormServiceInfo,
    SpecificCalendarForm,
    NonWorkingDatesManager,
  },
  props: {
    queue: { type: Object, required: true },
    types: { type: Array, default: () => [] },
    toggles: { type: Object, default: () => ({}) },
    locale: { type: String, default: 'es' },
    commerce: { type: Object, default: null },
    errors: { type: Object, default: () => ({}) },
  },
  emits: ['update', 'delete', 'close'],
  setup(props, { emit }) {
    const loading = ref(false);
    const alertError = ref('');
    const showDeleteConfirm = ref(false);
    const activeSection = ref('general');
    const modalElement = ref(null);

    // Local copy for editing
    const localQueue = computed({
      get: () => props.queue,
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

    const updateQueue = async () => {
      try {
        emit('update', localQueue.value);
        closeModal();
      } catch (error) {
        console.error('Error updating queue:', error);
      }
    };

    const deleteQueue = async () => {
      try {
        showDeleteConfirm.value = true;
      } catch (error) {
        console.error('Error deleting queue:', error);
      }
    };

    const confirmDelete = () => {
      try {
        showDeleteConfirm.value = false;
        emit('delete', localQueue.value.id);
      } catch (error) {
        console.error('Error confirming delete:', error);
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

    // Service Info helpers
    const dayChecked = (serviceInfo, day) => {
      if (serviceInfo && serviceInfo.attentionDays) {
        return serviceInfo.attentionDays.includes(day);
      }
      return false;
    };

    const checkDay = (event, serviceInfo, day) => {
      if (serviceInfo) {
        if (!serviceInfo.attentionDays) {
          serviceInfo.attentionDays = [];
        }
        if (event.target.checked) {
          if (!serviceInfo.attentionDays.includes(day)) {
            serviceInfo.attentionDays.push(day);
          }
        } else {
          serviceInfo.attentionDays = serviceInfo.attentionDays.filter(el => el !== day);
        }
        serviceInfo.attentionDays.sort();
        if (serviceInfo.personalized === true) {
          serviceInfo.personalizedHours[day] = {
            attentionHourFrom: serviceInfo.attentionHourFrom,
            attentionHourTo: serviceInfo.attentionHourTo,
          };
        }
      }
    };

    const initializedPersonalizedHours = (serviceInfo) => {
      if (serviceInfo.personalized === true) {
        if (!serviceInfo.personalizedHours) {
          serviceInfo.personalizedHours = {};
        }
        if (serviceInfo.attentionDays && serviceInfo.attentionDays.length > 0) {
          serviceInfo.attentionDays.forEach(day => {
            serviceInfo.personalizedHours[day] = {
              attentionHourFrom: serviceInfo.attentionHourFrom,
              attentionHourTo: serviceInfo.attentionHourTo,
            };
          });
        }
      }
    };

    const initializedSpecificCalendar = (serviceInfo) => {
      if (serviceInfo.specificCalendar === true) {
        if (!serviceInfo.specificCalendarDays) {
          if (
            props.commerce &&
            props.commerce.serviceInfo &&
            props.commerce.serviceInfo.specificCalendar === true
          ) {
            serviceInfo.specificCalendarDays = props.commerce.serviceInfo.specificCalendarDays;
          } else {
            serviceInfo.specificCalendarDays = serviceInfo.specificCalendarDays || {};
          }
        }
      }
    };

    return {
      loading,
      alertError,
      showDeleteConfirm,
      activeSection,
      localQueue,
      modalElement,
      setActiveSection,
      updateQueue,
      deleteQueue,
      confirmDelete,
      cancelDelete,
      copyToClipboard,
      dayChecked,
      checkDay,
      initializedPersonalizedHours,
      initializedSpecificCalendar,
    };
  },
};
</script>

<style scoped>

.queue-edit-modal-body {
  min-height: 500px;
  background: white;
}

.queue-edit-layout {
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
.queue-edit-sidebar {
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
#queue-edit-modal-new .modal-content,
[id^="queue-edit-modal-"] .modal-content {
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
