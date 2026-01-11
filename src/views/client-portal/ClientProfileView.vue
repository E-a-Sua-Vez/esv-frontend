<template>
  <div>
    <div class="content text-center">
      <div class="d-block d-lg-none">
        <CommerceLogo
          :commerce-id="commerce?.id"
          :business-id="commerce?.businessId"
          :loading="loading"
        ></CommerceLogo>
      </div>
      <div class="row align-items-center mb-1 desktop-header-row d-none d-lg-flex">
        <div class="col-auto desktop-logo-wrapper">
          <div class="desktop-commerce-logo">
            <CommerceLogo
              :commerce-id="commerce?.id"
              :business-id="commerce?.businessId"
              :loading="loading"
              class="logo-desktop"
            />
          </div>
        </div>
        <div class="col desktop-menu-wrapper" style="flex: 1 1 auto; min-width: 0">
          <ComponentMenu
            :title="$t('clientPortal.profile.title')"
            :toggles="toggles"
            component-name="clientPortalProfile"
            :is-client-portal="true"
            @goBack="goBack"
          />
        </div>
      </div>
      <div class="d-block d-lg-none">
        <ComponentMenu
          :title="$t('clientPortal.profile.title')"
          :toggles="toggles"
          component-name="clientPortalProfile"
          :is-client-portal="true"
          @goBack="goBack"
        />
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">{{ $t('clientPortal.profile.loading') }}</span>
        </div>
        <p class="mt-3 text-muted">{{ $t('clientPortal.profile.loading') }}</p>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="errors">
        <div class="alert alert-danger text-center">
          <i class="bi bi-exclamation-triangle-fill me-2"></i>
          <strong>{{ error }}</strong>
        </div>
      </div>

      <!-- Profile Content -->
      <div v-else-if="profile" class="profile-container-modern">
        <!-- Header Card -->
        <div class="profile-header-card">
          <div class="profile-avatar-modern">
            <img
              v-if="photoUrl"
              :src="photoUrl"
              alt="Foto del perfil"
              class="avatar-photo"
              @error="photoUrl = null"
            />
            <i v-else class="bi bi-person-circle"></i>
          </div>
          <div class="profile-header-info">
            <h4 class="profile-name-modern">
              {{ `${profile.name || ''} ${profile.lastName || ''}`.trim() || 'Cliente' }}
            </h4>
            <div class="profile-badges">
              <span v-if="profile.frequentCustomer" class="profile-badge badge-frequent">
                <i class="bi bi-star-fill"></i>
                Cliente Frecuente
              </span>
              <span class="profile-badge badge-member">
                <i class="bi bi-calendar-check"></i>
                Miembro desde {{ formatDate(profile.createdAt) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Content Grid -->
        <div class="profile-grid-modern">
          <!-- Personal Info Card -->
          <div class="info-card-modern">
            <div class="info-card-header">
              <i class="bi bi-person-vcard"></i>
              <h6>{{ $t('clientPortal.profile.personalInfo') }}</h6>
            </div>
            <div class="info-card-body">
              <template v-if="profile.idNumber || profile.email || profile.phone || profile.country">
                <div class="info-row-modern" v-if="profile.idNumber">
                  <div class="info-row-label">
                    <i class="bi bi-card-heading"></i>
                    <span>{{ $t('clientPortal.profile.idNumber') }}</span>
                  </div>
                  <div class="info-row-value">{{ profile.idNumber }}</div>
                </div>
                <div class="info-row-modern" v-if="profile.email">
                  <div class="info-row-label">
                    <i class="bi bi-envelope"></i>
                    <span>{{ $t('clientPortal.profile.email') }}</span>
                  </div>
                  <div class="info-row-value">{{ profile.email }}</div>
                </div>
                <div class="info-row-modern" v-if="profile.phone">
                  <div class="info-row-label">
                    <i class="bi bi-telephone"></i>
                    <span>{{ $t('clientPortal.profile.phone') }}</span>
                  </div>
                  <div class="info-row-value">{{ profile.phone }}</div>
                </div>
                <div class="info-row-modern" v-if="profile.country">
                  <div class="info-row-label">
                    <i class="bi bi-globe-americas"></i>
                    <span>{{ $t('clientPortal.profile.country') }}</span>
                  </div>
                  <div class="info-row-value">{{ profile.country }}</div>
                </div>
              </template>
              <div v-else class="empty-card-message">
                <i class="bi bi-info-circle"></i>
                <span>No hay información disponible</span>
              </div>
            </div>
          </div>

          <!-- Additional Info Card -->
          <div class="info-card-modern">
            <div class="info-card-header">
              <i class="bi bi-card-text"></i>
              <h6>{{ $t('clientPortal.profile.additionalInfo') }}</h6>
            </div>
            <div class="info-card-body">
              <template v-if="profile.personalInfo && (profile.personalInfo.code1 || profile.personalInfo.code2 || profile.personalInfo.code3)">
                <div class="info-row-modern" v-if="profile.personalInfo.code1">
                  <div class="info-row-label">
                    <i class="bi bi-code"></i>
                    <span>{{ $t('clientPortal.profile.code1') }}</span>
                  </div>
                  <div class="info-row-value">{{ profile.personalInfo.code1 }}</div>
                </div>
                <div class="info-row-modern" v-if="profile.personalInfo.code2">
                  <div class="info-row-label">
                    <i class="bi bi-code"></i>
                    <span>{{ $t('clientPortal.profile.code2') }}</span>
                  </div>
                  <div class="info-row-value">{{ profile.personalInfo.code2 }}</div>
                </div>
                <div class="info-row-modern" v-if="profile.personalInfo.code3">
                  <div class="info-row-label">
                    <i class="bi bi-code"></i>
                    <span>{{ $t('clientPortal.profile.code3') }}</span>
                  </div>
                  <div class="info-row-value">{{ profile.personalInfo.code3 }}</div>
                </div>
              </template>
              <div v-else class="empty-card-message">
                <i class="bi bi-info-circle"></i>
                <span>No hay información adicional disponible</span>
              </div>
            </div>
          </div>

          <!-- Account Stats Card -->
          <div class="info-card-modern stats-card">
            <div class="info-card-header">
              <i class="bi bi-graph-up"></i>
              <h6>{{ $t('clientPortal.profile.accountInfo') }}</h6>
            </div>
            <div class="info-card-body">
              <template v-if="profile.counter !== undefined || profile.createdAt">
                <div class="stats-grid">
                  <div class="stat-item" v-if="profile.counter !== undefined">
                    <div class="stat-icon">
                      <i class="bi bi-calendar-check"></i>
                    </div>
                    <div class="stat-content">
                      <div class="stat-value">{{ profile.counter || 0 }}</div>
                      <div class="stat-label">{{ $t('clientPortal.profile.totalAttentions') }}</div>
                    </div>
                  </div>
                  <div class="stat-item" v-if="profile.createdAt">
                    <div class="stat-icon">
                      <i class="bi bi-clock-history"></i>
                    </div>
                    <div class="stat-content">
                      <div class="stat-value">{{ formatDate(profile.createdAt) }}</div>
                      <div class="stat-label">{{ $t('clientPortal.profile.memberSince') }}</div>
                    </div>
                  </div>
                </div>
              </template>
              <div v-else class="empty-card-message">
                <i class="bi bi-info-circle"></i>
                <span>No hay información de cuenta disponible</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { getClientProfile } from '../../application/services/client-portal';
import { getClientPortalPermissions } from '../../application/services/client-portal-permissions';
import { getPatientPhoto, getPatientPhotoThumbnailUrl } from '../../application/services/patient-photo';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';

export default {
  name: 'ClientProfileView',
  components: {
    ComponentMenu,
    CommerceLogo,
  },
  setup() {
    const router = useRouter();
    const route = useRoute();
    const { t } = useI18n();
    const commerceSlug = ref(route.params.commerceSlug);

    const loading = ref(true);
    const error = ref('');
    const profile = ref(null);
    const client = ref(null);
    const commerce = ref(null);
    const permissions = ref({});
    const photoUrl = ref(null);

    // Toggles para ComponentMenu (computed basado en permisos)
    const toggles = computed(() => ({
      'clientPortal.profile.view': permissions.value['client-portal.profile.view'] || false,
      'clientPortal.profile.edit': permissions.value['client-portal.profile.edit'] || false,
    }));

    const formatDate = dateString => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    const goBack = () => {
      router.push({ name: 'client-portal-menu', params: { commerceSlug: commerceSlug.value } });
    };

    const loadPatientPhoto = async (commerceId, clientId) => {
      try {
        const photo = await getPatientPhoto(commerceId, clientId);
        if (photo && photo.id) {
          const url = await getPatientPhotoThumbnailUrl(commerceId, clientId, photo.id);
          photoUrl.value = url;
        }
      } catch (err) {
        // Silently fail - not critical if photo is not available
        photoUrl.value = null;
      }
    };

    const loadProfile = async () => {
      try {
        loading.value = true;
        error.value = '';

        // Obtener datos del localStorage
        const storedClient = localStorage.getItem('clientPortalClient');
        const storedCommerce = localStorage.getItem('clientPortalCommerce');

        if (!storedClient || !storedCommerce) {
          router.push({ name: 'client-portal-login', params: { commerceSlug: commerceSlug.value } });
          return;
        }

        client.value = JSON.parse(storedClient);
        commerce.value = JSON.parse(storedCommerce);

        // Obtener perfil completo
        const response = await getClientProfile(commerce.value.id, client.value.id);
        profile.value = response;

        // Cargar foto del paciente
        await loadPatientPhoto(commerce.value.id, client.value.id);
      } catch (err) {
        error.value =
          err.response?.data?.message || err.message || t('clientPortal.profile.loadError');
        console.error('Error loading profile:', err);
      } finally {
        loading.value = false;
      }
    };

    const loadPermissions = async () => {
      try {
        const clientPermissions = await getClientPortalPermissions('client-portal', 'profile');
        permissions.value = clientPermissions;
      } catch (err) {
        console.error('Error loading permissions:', err);
        // Permisos por defecto si falla
        permissions.value = {
          'client-portal.profile.view': true,
          'client-portal.profile.edit': true,
        };
      }
    };

    onMounted(async () => {
      await loadPermissions();
      await loadProfile();
    });

    return {
      loading,
      error,
      profile,
      client,
      commerce,
      photoUrl,
      toggles,
      formatDate,
      goBack,
    };
  },
};
</script>

<style scoped>
@import '../../shared/styles/prontuario-common.css';

/* Desktop Header Styles */
.desktop-header-row {
  display: flex;
  align-items: center;
  margin-bottom: 1.5rem;
  padding: 0 1rem;
}

.desktop-logo-wrapper {
  flex: 0 0 auto;
  max-width: 200px;
}

.desktop-commerce-logo {
  display: flex;
  align-items: center;
  max-width: 150px;
  text-align: left;
}

.logo-desktop {
  max-width: 120px;
  max-height: 100px;
  width: auto;
  height: auto;
  margin-bottom: 0;
}

.desktop-menu-wrapper {
  flex: 1 1 0%;
  min-width: 0;
  width: auto;
  text-align: left;
}

/* Profile Container */
.profile-container-modern {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

/* Header Card */
.profile-header-card {
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  border-radius: 0.75rem;
  padding: 1.25rem;
  display: flex;
  align-items: center;
  gap: 1.25rem;
  margin-bottom: 1rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  color: white;
}

.profile-avatar-modern {
  font-size: 3.5rem;
  flex-shrink: 0;
  opacity: 0.95;
  width: 5rem;
  height: 5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
}

.profile-avatar-modern .avatar-photo {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
}

.profile-header-info {
  flex: 1;
}

.profile-name-modern {
  margin: 0 0 0.625rem 0;
  font-size: 1.375rem;
  font-weight: 600;
  color: white;
  text-align: left;
}

.profile-badges {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.profile-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.625rem;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border-radius: 1rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.profile-badge i {
  font-size: 0.625rem;
}

.badge-frequent {
  background: rgba(255, 215, 0, 0.3);
}

/* Content Grid */
.profile-grid-modern {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 1rem;
}

/* Info Cards */
.info-card-modern {
  background: var(--color-background);
  border-radius: 0.75rem;
  border: 1px solid rgba(0, 0, 0, 0.08);
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.info-card-modern:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.info-card-header {
  background: linear-gradient(135deg, rgba(4, 159, 217, 0.08) 0%, rgba(0, 182, 122, 0.08) 100%);
  padding: 0.875rem;
  display: flex;
  align-items: center;
  gap: 0.625rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
}

.info-card-header i {
  font-size: 1.125rem;
  color: var(--azul-turno);
}

.info-card-header h6 {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-text);
}

.info-card-body {
  padding: 0.875rem;
}

/* Info Rows */
.info-row-modern {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.625rem 0.75rem;
  border-radius: 0.5rem;
  transition: background 0.15s ease;
}

.info-row-modern:hover {
  background: rgba(0, 0, 0, 0.02);
}

.info-row-modern + .info-row-modern {
  margin-top: 0.375rem;
}

.info-row-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  font-weight: 500;
}

.info-row-label i {
  font-size: 0.875rem;
  color: var(--azul-turno);
  opacity: 0.7;
}

.info-row-value {
  font-size: 0.875rem;
  color: var(--color-text);
  font-weight: 600;
  text-align: right;
  max-width: 60%;
  word-break: break-word;
}

/* Stats Card */
.stats-card .info-card-header {
  background: linear-gradient(135deg, rgba(4, 159, 217, 0.12) 0%, rgba(0, 182, 122, 0.12) 100%);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.875rem;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem;
  background: linear-gradient(135deg, rgba(4, 159, 217, 0.05) 0%, rgba(0, 182, 122, 0.05) 100%);
  border-radius: 0.5rem;
  border: 1px solid rgba(4, 159, 217, 0.1);
}

.stat-icon {
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  border-radius: 0.5rem;
  color: white;
}

.stat-icon i {
  font-size: 1.125rem;
}

.stat-content {
  flex: 1;
  min-width: 0;
}

.stat-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.2;
}

.stat-label {
  font-size: 0.6875rem;
  color: var(--color-text-secondary);
  margin-top: 0.125rem;
  line-height: 1.3;
}

/* Empty Card Message */
.empty-card-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 1.5rem;
  color: var(--color-text-secondary);
  font-size: 0.875rem;
  text-align: center;
}

.empty-card-message i {
  font-size: 1.125rem;
  opacity: 0.6;
}

.errors {
  margin-top: 0.75rem;
  font-size: 0.85rem;
  color: var(--rojo-warning);
  padding: 0 0.5rem;
}

/* Responsive Design */
@media (max-width: 992px) {
  .profile-grid-modern {
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  }
}

@media (max-width: 768px) {
  .profile-container-modern {
    padding: 0.75rem;
  }

  .profile-header-card {
    flex-direction: column;
    text-align: center;
    padding: 1rem;
  }

  .profile-avatar-modern {
    font-size: 3rem;
    width: 4.5rem;
    height: 4.5rem;
  }

  .profile-name-modern {
    font-size: 1.25rem;
  }

  .profile-badges {
    justify-content: center;
  }

  .profile-grid-modern {
    grid-template-columns: 1fr;
    gap: 0.875rem;
  }

  .info-row-modern {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .info-row-value {
    text-align: left;
    max-width: 100%;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }
}
</style>



