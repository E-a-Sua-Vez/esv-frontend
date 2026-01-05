<template>
  <div>
    <div class="content text-center">
      <!-- Commerce Logo -->
      <CommerceLogo
        v-if="commerce && commerce.logo"
        :src="commerce.logo"
        :loading="false"
      ></CommerceLogo>

      <!-- Header -->
      <div id="page-header" class="text-center mt-4">
        <div class="welcome">
          <span>{{ $t('clientPortal.profile.title') }}</span>
        </div>
        <div class="mt-2">
          <button type="button" class="btn btn-link text-muted" @click="goBack">
            <i class="bi bi-arrow-left me-2"></i>
            {{ $t('clientPortal.profile.backToMenu') }}
          </button>
        </div>
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
      <div v-else-if="profile" class="profile-container">
        <div class="profile-card">
          <div class="profile-header">
            <div class="profile-avatar">
              <i class="bi bi-person-circle"></i>
            </div>
            <h4 class="profile-name">
              {{ `${profile.name || ''} ${profile.lastName || ''}`.trim() || 'Cliente' }}
            </h4>
          </div>

          <div class="profile-body">
            <div class="profile-section">
              <h6 class="section-title">
                <i class="bi bi-info-circle me-2"></i>
                {{ $t('clientPortal.profile.personalInfo') }}
              </h6>
              <div class="info-grid">
                <div class="info-item" v-if="profile.idNumber">
                  <span class="info-label">{{ $t('clientPortal.profile.idNumber') }}:</span>
                  <span class="info-value">{{ profile.idNumber }}</span>
                </div>
                <div class="info-item" v-if="profile.email">
                  <span class="info-label">{{ $t('clientPortal.profile.email') }}:</span>
                  <span class="info-value">{{ profile.email }}</span>
                </div>
                <div class="info-item" v-if="profile.phone">
                  <span class="info-label">{{ $t('clientPortal.profile.phone') }}:</span>
                  <span class="info-value">{{ profile.phone }}</span>
                </div>
                <div class="info-item" v-if="profile.country">
                  <span class="info-label">{{ $t('clientPortal.profile.country') }}:</span>
                  <span class="info-value">{{ profile.country }}</span>
                </div>
              </div>
            </div>

            <div class="profile-section" v-if="profile.personalInfo">
              <h6 class="section-title">
                <i class="bi bi-card-text me-2"></i>
                {{ $t('clientPortal.profile.additionalInfo') }}
              </h6>
              <div class="info-grid">
                <div class="info-item" v-if="profile.personalInfo.code1">
                  <span class="info-label">{{ $t('clientPortal.profile.code1') }}:</span>
                  <span class="info-value">{{ profile.personalInfo.code1 }}</span>
                </div>
                <div class="info-item" v-if="profile.personalInfo.code2">
                  <span class="info-label">{{ $t('clientPortal.profile.code2') }}:</span>
                  <span class="info-value">{{ profile.personalInfo.code2 }}</span>
                </div>
                <div class="info-item" v-if="profile.personalInfo.code3">
                  <span class="info-label">{{ $t('clientPortal.profile.code3') }}:</span>
                  <span class="info-value">{{ profile.personalInfo.code3 }}</span>
                </div>
              </div>
            </div>

            <div class="profile-section">
              <h6 class="section-title">
                <i class="bi bi-calendar-event me-2"></i>
                {{ $t('clientPortal.profile.accountInfo') }}
              </h6>
              <div class="info-grid">
                <div class="info-item" v-if="profile.createdAt">
                  <span class="info-label">{{ $t('clientPortal.profile.memberSince') }}:</span>
                  <span class="info-value">{{ formatDate(profile.createdAt) }}</span>
                </div>
                <div class="info-item" v-if="profile.counter !== undefined">
                  <span class="info-label">{{ $t('clientPortal.profile.totalAttentions') }}:</span>
                  <span class="info-value">{{ profile.counter || 0 }}</span>
                </div>
                <div class="info-item" v-if="profile.frequentCustomer !== undefined">
                  <span class="info-label">{{ $t('clientPortal.profile.frequentCustomer') }}:</span>
                  <span class="info-value">
                    <i
                      :class="`bi ${
                        profile.frequentCustomer
                          ? 'bi-check-circle-fill text-success'
                          : 'bi-x-circle-fill text-muted'
                      }`"
                    ></i>
                    {{
                      profile.frequentCustomer
                        ? $t('clientPortal.profile.yes')
                        : $t('clientPortal.profile.no')
                    }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { getClientProfile } from '../../application/services/client-portal';
import CommerceLogo from '../../components/common/CommerceLogo.vue';

export default {
  name: 'ClientProfileView',
  components: {
    CommerceLogo,
  },
  setup() {
    const router = useRouter();
    const { t } = useI18n();

    const loading = ref(true);
    const error = ref('');
    const profile = ref(null);
    const client = ref(null);
    const commerce = ref(null);

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
      router.push({ path: '/portal' });
    };

    const loadProfile = async () => {
      try {
        loading.value = true;
        error.value = '';

        // Obtener datos del localStorage
        const storedClient = localStorage.getItem('clientPortalClient');
        const storedCommerce = localStorage.getItem('clientPortalCommerce');

        if (!storedClient || !storedCommerce) {
          router.push({ path: '/portal/login' });
          return;
        }

        client.value = JSON.parse(storedClient);
        commerce.value = JSON.parse(storedCommerce);

        // Obtener perfil completo
        const response = await getClientProfile(commerce.value.id, client.value.id);
        profile.value = response;
      } catch (err) {
        error.value =
          err.response?.data?.message || err.message || t('clientPortal.profile.loadError');
        console.error('Error loading profile:', err);
      } finally {
        loading.value = false;
      }
    };

    onMounted(async () => {
      await loadProfile();
    });

    return {
      loading,
      error,
      profile,
      client,
      commerce,
      formatDate,
      goBack,
    };
  },
};
</script>

<style scoped>
@import '../../shared/styles/prontuario-common.css';

.profile-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem;
}

.profile-card {
  background: var(--color-background);
  border-radius: 0.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: 0.5px solid var(--gris-default);
  overflow: hidden;
}

.profile-header {
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  padding: 2rem;
  text-align: center;
  color: white;
}

.profile-avatar {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.profile-name {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.profile-body {
  padding: 1.5rem;
}

.profile-section {
  margin-bottom: 2rem;
}

.profile-section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--color-text);
  display: flex;
  align-items: center;
}

.section-title i {
  color: var(--azul-turno);
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.info-item {
  display: flex;
  flex-direction: column;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 0.375rem;
}

.info-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-secondary);
  margin-bottom: 0.25rem;
}

.info-value {
  font-size: 1rem;
  color: var(--color-text);
  font-weight: 500;
}

.errors {
  margin-top: 0.75rem;
  font-size: 0.85rem;
  color: var(--rojo-warning);
  padding: 0 0.5rem;
}

@media (max-width: 768px) {
  .profile-container {
    padding: 0.5rem;
  }

  .profile-header {
    padding: 1.5rem;
  }

  .profile-avatar {
    font-size: 3rem;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
