<template>
  <div class="professional-profile-panel" :class="{ 'is-open': isOpen }">
    <div class="profile-overlay" @click="close" v-if="isOpen"></div>

    <div class="profile-container" v-if="isOpen">
      <!-- Header -->
      <div class="profile-header">
        <h3>{{ $t('professional.profile.title') || 'Professional Profile' }}</h3>
        <button @click="close" class="close-button" :aria-label="$t('common.close')">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>

      <!-- Content -->
      <div class="profile-content" v-if="professional">
        <!-- Profile Photo -->
        <div class="profile-photo-section">
          <div class="profile-photo-wrapper">
            <img
              v-if="photoSignedUrl"
              :src="photoSignedUrl"
              :alt="professionalFullName"
              class="profile-photo"
            />
            <div v-else class="profile-photo-placeholder">
              <i class="bi bi-person-circle"></i>
            </div>
          </div>
        </div>

        <!-- Personal Info -->
        <div class="info-section">
          <h4 class="section-title">
            {{ $t('professional.profile.personalInfo') || 'Personal Information' }}
          </h4>
          <div class="info-item">
            <span class="label">{{ $t('professional.profile.name') || 'Name' }}:</span>
            <span class="value">{{ professionalFullName }}</span>
          </div>
          <div class="info-item" v-if="professional.personalInfo?.email">
            <span class="label">{{ $t('professional.profile.email') || 'Email' }}:</span>
            <span class="value">{{ professional.personalInfo.email }}</span>
          </div>
          <div class="info-item" v-if="professional.personalInfo?.phone">
            <span class="label">{{ $t('professional.profile.phone') || 'Phone' }}:</span>
            <span class="value">{{ professional.personalInfo.phone }}</span>
          </div>
          <div class="info-item" v-if="professional.personalInfo?.document">
            <span class="label">{{ $t('professional.profile.document') || 'Document' }}:</span>
            <span class="value">{{ professional.personalInfo.document }}</span>
          </div>
        </div>

        <!-- Professional Info -->
        <div class="info-section" v-if="professional.professionalInfo">
          <h4 class="section-title">
            {{ $t('professional.profile.professionalInfo') || 'Professional Information' }}
          </h4>
          <div class="info-item" v-if="professional.professionalInfo.crm">
            <span class="label">{{ $t('professional.profile.crm') || 'CRM' }}:</span>
            <span class="value">{{ professional.professionalInfo.crm }}</span>
          </div>
          <div
            class="info-item"
            v-if="
              professional.professionalInfo.specialties &&
              professional.professionalInfo.specialties.length
            "
          >
            <span class="label"
              >{{ $t('professional.profile.specialties') || 'Specialties' }}:</span
            >
            <div class="specialties-list">
              <span
                v-for="specialty in professional.professionalInfo.specialties"
                :key="specialty"
                class="specialty-badge"
              >
                {{ specialty }}
              </span>
            </div>
          </div>
          <div class="info-item" v-if="professional.professionalInfo.role">
            <span class="label">{{ $t('professional.profile.role') || 'Role' }}:</span>
            <span class="value">{{ professional.professionalInfo.role }}</span>
          </div>
        </div>

        <!-- Medical Data -->
        <div class="info-section" v-if="professional.medicalData">
          <h4 class="section-title">
            {{ $t('professional.profile.medicalData') || 'Medical Data' }}
          </h4>
          <div class="medical-toggles">
            <div
              class="toggle-item"
              v-if="typeof professional.medicalData.acceptsEmergencies === 'boolean'"
            >
              <span class="toggle-label">{{
                $t('professional.profile.acceptsEmergencies') || 'Accepts Emergencies'
              }}</span>
              <span
                class="toggle-value"
                :class="{ 'is-true': professional.medicalData.acceptsEmergencies }"
              >
                {{ professional.medicalData.acceptsEmergencies ? '✓' : '✗' }}
              </span>
            </div>
            <div
              class="toggle-item"
              v-if="typeof professional.medicalData.homeVisits === 'boolean'"
            >
              <span class="toggle-label">{{
                $t('professional.profile.homeVisits') || 'Home Visits'
              }}</span>
              <span
                class="toggle-value"
                :class="{ 'is-true': professional.medicalData.homeVisits }"
              >
                {{ professional.medicalData.homeVisits ? '✓' : '✗' }}
              </span>
            </div>
            <div
              class="toggle-item"
              v-if="typeof professional.medicalData.telemedicine === 'boolean'"
            >
              <span class="toggle-label">{{
                $t('professional.profile.telemedicine') || 'Telemedicine'
              }}</span>
              <span
                class="toggle-value"
                :class="{ 'is-true': professional.medicalData.telemedicine }"
              >
                {{ professional.medicalData.telemedicine ? '✓' : '✗' }}
              </span>
            </div>
            <div
              class="toggle-item"
              v-if="typeof professional.medicalData.canSignDocuments === 'boolean'"
            >
              <span class="toggle-label">{{
                $t('professional.profile.canSignDocuments') || 'Can Sign Documents'
              }}</span>
              <span
                class="toggle-value"
                :class="{ 'is-true': professional.medicalData.canSignDocuments }"
              >
                {{ professional.medicalData.canSignDocuments ? '✓' : '✗' }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="spinner-border" role="status"></div>
        <p>{{ $t('common.loadingData') || 'Loading...' }}</p>
      </div>

      <!-- Error State -->
      <div v-if="error" class="error-state">
        <i class="bi bi-exclamation-triangle"></i>
        <p>{{ $t(error) || error }}</p>
        <button @click="loadProfile" class="retry-button">
          {{ $t('common.retry') || 'Retry' }}
        </button>
      </div>

      <!-- Empty State -->
      <div v-if="!loading && !error && !professional" class="empty-state">
        <i class="bi bi-person-slash"></i>
        <p>
          {{ $t('professional.profile.noProfessional') || 'No professional profile available' }}
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue';
import { useProfessionalProfileStore } from '@/stores/professional-profile';
import { getProfessionalByCollaboratorId } from '@/application/services/professional';
import { requestBackend } from '@/application/api';

export default {
  name: 'ProfessionalProfileModal',
  props: {
    isOpen: {
      type: Boolean,
      default: false,
    },
    collaboratorId: {
      type: String,
      default: null,
    },
  },
  emits: ['close'],
  setup(props, { emit }) {
    const store = useProfessionalProfileStore();
    const loading = ref(false);
    const error = ref('');
    const retryCount = ref(0);
    const MAX_RETRIES = 3;
    const photoSignedUrl = ref(null);

    const professional = computed(() => store.getProfessional);

    const professionalFullName = computed(() => {
      if (!professional.value) return '';
      // Intentar obtener el nombre de personalInfo.name o de personalInfo firstName/lastName
      const name =
        professional.value.personalInfo?.name ||
        `${professional.value.personalInfo?.firstName || ''} ${
          professional.value.personalInfo?.lastName || ''
        }`.trim();
      return name;
    });

    const close = () => {
      error.value = '';
      emit('close');
    };

    const getPhotoSignedUrl = async professionalId => {
      if (!professionalId) {
        return null;
      }
      try {
        const response = await requestBackend.get(`/professional/photo-url/${professionalId}`);
        const url = response.data?.photoUrl;
        return url || null;
      } catch (error) {
        return null;
      }
    };

    const loadProfile = async (retry = 0) => {
      if (!props.collaboratorId) {
        return;
      }

      loading.value = true;
      error.value = '';

      try {
        // Primero intentar cargar desde localStorage
        store.restoreProfessionalFromStorage();

        // Si no existe o es la primera vez, cargar del backend
        if (!professional.value) {
          const data = await getProfessionalByCollaboratorId(props.collaboratorId);
          store.setProfessional(data);

          // Obtener URL presignada para la foto
          if (data?.id) {
            photoSignedUrl.value = await getPhotoSignedUrl(data.id);
          } else {
          }
        } else {
          // Si ya hay datos en el store, obtener URL presignada si no la tenemos
          if (!photoSignedUrl.value && professional.value?.id) {
            photoSignedUrl.value = await getPhotoSignedUrl(professional.value.id);
          }
        }
        retryCount.value = 0; // Reset retry count on success
      } catch (e) {
        // Detectar error 404 o "not found"
        const is404 =
          e.response?.status === 404 ||
          e.message?.includes('404') ||
          e.message?.includes('not found');

        // Reintentar automáticamente si no hemos alcanzado el máximo (excepto para 404)
        if (retry < MAX_RETRIES && !is404) {
          retryCount.value = retry + 1;
          // Esperar 1 segundo antes de reintentar
          setTimeout(() => {
            loadProfile(retry + 1);
          }, 1000);
        } else {
          // Si alcanzamos el máximo de reintentos, mostrar error
          if (is404) {
            error.value = 'professional.profile.notFound';
          } else {
            error.value = e.message || 'professional.profile.loadError';
          }
          retryCount.value = 0;
        }
      } finally {
        // Siempre establecer loading a false después del primer intento
        if (retry === 0) {
          loading.value = false;
        }
      }
    };

    // Observar cuando el modal se abre
    watch(
      () => props.isOpen,
      newVal => {
        if (newVal) {
          loadProfile();
        }
      },
      { immediate: true },
    );

    return {
      professional,
      professionalFullName,
      photoSignedUrl,
      loading,
      error,
      close,
      loadProfile,
    };
  },
};
</script>

<style scoped>
/* Panel Container */
.professional-profile-panel {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  pointer-events: none;
}

.professional-profile-panel.is-open {
  pointer-events: auto;
}

.profile-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(4px);
  animation: fadeIn 0.3s ease;
  z-index: 1;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.profile-container {
  position: fixed;
  top: 0;
  right: 0;
  width: 90%;
  max-width: 480px;
  height: 100vh;
  background: linear-gradient(to bottom, #f8f9fa 0%, #ffffff 100%);
  box-shadow: -4px 0 24px rgba(0, 0, 0, 0.15);
  z-index: 2;
  display: flex;
  flex-direction: column;
  animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

@keyframes slideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* Header */
.profile-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  background: linear-gradient(135deg, var(--azul-hub, #1f3f92) 0%, rgba(31, 63, 146, 0.95) 100%);
  color: white;
  box-shadow: 0 2px 8px rgba(31, 63, 146, 0.2);
  flex-shrink: 0;
}

.profile-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
}

.close-button {
  background: rgba(255, 255, 255, 0.15);
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 0.5rem;
  color: white;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
}

.close-button:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(1.05);
}

.close-button i {
  font-size: 1.1rem;
}

/* Content */
.profile-content {
  flex: 1;
  overflow-y: auto;
  padding: 2rem 1.5rem;
  background: #f8f9fa;
}

.profile-content::-webkit-scrollbar {
  width: 8px;
}

.profile-content::-webkit-scrollbar-track {
  background: #f1f3f5;
}

.profile-content::-webkit-scrollbar-thumb {
  background: #adb5bd;
  border-radius: 4px;
}

.profile-content::-webkit-scrollbar-thumb:hover {
  background: #868e96;
}

/* Photo Section */
.profile-photo-section {
  display: flex;
  justify-content: center;
  margin-bottom: 2rem;
}

.profile-photo-wrapper {
  position: relative;
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  background: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.profile-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-photo-placeholder {
  font-size: 3.5rem;
  color: #adb5bd;
}

/* Info Sections */
.info-section {
  background: white;
  padding: 1.5rem;
  border-radius: 0.75rem;
  margin-bottom: 1.25rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.section-title {
  margin: 0 0 1rem 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #004aad;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 2px solid #00c2cb;
  padding-bottom: 0.75rem;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  border-bottom: 1px solid #e9ecef;
}

.info-item:last-child {
  border-bottom: none;
}

.info-item .label {
  font-weight: 600;
  color: #495057;
  font-size: 0.9rem;
  flex: 1;
}

.info-item .value {
  color: #6c757d;
  font-size: 0.9rem;
  text-align: right;
  flex: 1;
  word-break: break-word;
}

/* Specialties */
.specialties-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.specialty-badge {
  display: inline-block;
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.1) 0%, rgba(0, 194, 203, 0.1) 100%);
  color: #004aad;
  padding: 0.35rem 0.75rem;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 500;
  border: 1px solid rgba(0, 74, 173, 0.2);
}

/* Medical Toggles */
.medical-toggles {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.toggle-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 0.5rem;
  border: 1px solid #e9ecef;
}

.toggle-label {
  font-size: 0.9rem;
  color: #495057;
  font-weight: 500;
}

.toggle-value {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #f0f0f0;
  color: #dc3545;
  font-weight: bold;
  font-size: 1.1rem;
}

.toggle-value.is-true {
  background: #d4edda;
  color: #28a745;
}

/* States */
.loading-state,
.error-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  text-align: center;
  color: #6c757d;
  flex: 1;
}

.loading-state .spinner-border {
  width: 3rem;
  height: 3rem;
  color: #004aad;
  margin-bottom: 1rem;
}

.error-state i,
.empty-state i {
  margin-bottom: 1rem;
  font-size: 2.5rem;
}

.empty-state i {
  color: #adb5bd;
}

.error-state p,
.empty-state p {
  margin: 1rem 0;
  font-size: 0.9rem;
  color: #6c757d;
}

.retry-button {
  padding: 0.75rem 1.5rem;
  border: none;
  background: linear-gradient(135deg, #004aad 0%, #00c2cb 100%);
  color: white;
  border-radius: 0.5rem;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 74, 173, 0.2);
}

.retry-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 74, 173, 0.3);
}

/* Responsive */
@media (max-width: 640px) {
  .profile-container {
    max-width: 100%;
    width: 100%;
  }

  .profile-header {
    padding: 1rem;
  }

  .profile-header h3 {
    font-size: 1.1rem;
  }

  .profile-content {
    padding: 1.5rem 1rem;
  }

  .info-section {
    padding: 1rem;
    margin-bottom: 1rem;
  }
}
</style>
