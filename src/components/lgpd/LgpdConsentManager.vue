<template>
  <div class="lgpd-consent-manager">
    <div v-if="loading" class="text-center">
      <Spinner />
    </div>

    <div v-else>
      <!-- Lista de Consentimentos -->
      <div v-if="consents.length > 0" class="mb-3">
        <div v-for="consent in consents" :key="consent.id" class="row mb-2">
          <div class="col-12">
            <div
              class="metric-card p-3"
              :class="getConsentStatusClass(consent.status)"
            >
              <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                  <div class="mb-2">
                    <span class="badge bg-primary px-3 py-2">
                      {{ getConsentTypeLabel(consent.consentType) }}
                    </span>
                    <span :class="getStatusBadgeClass(consent.status)" class="ms-2 px-3 py-2">
                      {{ getStatusLabel(consent.status) }}
                    </span>
                  </div>
                  <p class="mb-1">
                    <strong>{{ $t('lgpd.consent.purpose') }}:</strong> {{ consent.purpose }}
                  </p>
                  <p v-if="consent.description" class="mb-1 text-muted small">
                    {{ consent.description }}
                  </p>
                  <div class="mt-2">
                    <small class="text-muted">
                      <i class="bi bi-calendar"></i>
                      {{ $t('lgpd.consent.grantedAt') }}: {{ formatDate(consent.grantedAt) }}
                    </small>
                    <span v-if="consent.expiresAt" class="ms-3">
                      <small class="text-muted">
                        <i class="bi bi-clock"></i>
                        {{ $t('lgpd.consent.expiresAt') }}: {{ formatDate(consent.expiresAt) }}
                      </small>
                    </span>
                  </div>
                </div>
                <div v-if="consent.status === 'GRANTED'">
                  <button
                    @click="revokeConsent(consent.id)"
                    class="btn btn-sm btn-size fw-bold btn-danger rounded-pill px-3"
                    :disabled="revoking"
                  >
                    <i class="bi bi-x-circle"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="text-center py-4">
        <i class="bi bi-inbox" style="font-size: 3rem; color: #ccc"></i>
        <p class="text-muted mt-3">{{ $t('lgpd.consent.noConsents') }}</p>
      </div>

      <!-- Formulário de Novo Consentimento -->
      <div class="row my-2 metric-card">
        <div class="col-12">
          <span class="metric-card-subtitle">
            <span class="form-check-label metric-keyword-subtitle mx-1">
              <i class="bi bi-plus-circle"></i> {{ $t('lgpd.consent.newConsent') }}
            </span>
          </span>
        </div>
        <div class="col-12 mt-3">
          <div class="mb-3">
            <label class="form-label"><small>{{ $t('lgpd.consent.consentType') }} *</small></label>
            <select v-model="newConsent.consentType" class="form-select" required>
              <option value="">{{ $t('lgpd.consent.selectType') }}</option>
              <option value="DATA_PROCESSING">{{ $t('lgpd.consent.types.DATA_PROCESSING') }}</option>
              <option value="DATA_SHARING">{{ $t('lgpd.consent.types.DATA_SHARING') }}</option>
              <option value="MARKETING">{{ $t('lgpd.consent.types.MARKETING') }}</option>
              <option value="RESEARCH">{{ $t('lgpd.consent.types.RESEARCH') }}</option>
              <option value="THIRD_PARTY">{{ $t('lgpd.consent.types.THIRD_PARTY') }}</option>
              <option value="DATA_EXPORT">{{ $t('lgpd.consent.types.DATA_EXPORT') }}</option>
              <option value="TELEMEDICINE">{{ $t('lgpd.consent.types.TELEMEDICINE') }}</option>
              <option value="BIOMETRIC">{{ $t('lgpd.consent.types.BIOMETRIC') }}</option>
            </select>
          </div>

          <div class="mb-3">
            <label class="form-label"><small>{{ $t('lgpd.consent.purpose') }} *</small></label>
            <input
              v-model="newConsent.purpose"
              type="text"
              class="form-control"
              :placeholder="$t('lgpd.consent.purposePlaceholder')"
              required
            />
          </div>

          <div class="mb-3">
            <label class="form-label"><small>{{ $t('lgpd.consent.description') }}</small></label>
            <textarea
              v-model="newConsent.description"
              class="form-control"
              rows="3"
              :placeholder="$t('lgpd.consent.descriptionPlaceholder')"
            ></textarea>
          </div>

          <div class="row mb-3">
            <div class="col-md-6">
              <label class="form-label"><small>{{ $t('lgpd.consent.expiresAt') }}</small></label>
              <input v-model="newConsent.expiresAt" type="date" class="form-control" />
              <small class="form-text text-muted">{{ $t('lgpd.consent.expiresAtHelp') }}</small>
            </div>
            <div class="col-md-6">
              <label class="form-label"><small>{{ $t('lgpd.consent.consentMethod') }}</small></label>
              <select v-model="newConsent.consentMethod" class="form-select">
                <option value="WEB">Web</option>
                <option value="MOBILE">Mobile</option>
                <option value="PRESENTIAL">Presencial</option>
                <option value="EMAIL">Email</option>
                <option value="PHONE">Telefone</option>
                <option value="OTHER">Outro</option>
              </select>
            </div>
          </div>

          <div class="d-flex gap-2">
            <button
              @click="createConsent"
              class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
              :disabled="!canCreateConsent || creating"
            >
              <i class="bi bi-check-circle"></i>
            </button>
            <button
              @click="denyConsent"
              class="btn btn-sm btn-size fw-bold btn-danger rounded-pill px-3"
              :disabled="!canCreateConsent || creating"
            >
              <i class="bi bi-x-circle"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import Spinner from '../common/Spinner.vue';
import {
  getConsentsByClient,
  createOrUpdateConsent,
  revokeConsent as revokeConsentService,
} from '../../application/services/lgpd-consent';

export default {
  name: 'LgpdConsentManager',
  components: {
    Spinner,
  },
  props: {
    commerceId: {
      type: String,
      required: true,
    },
    clientId: {
      type: String,
      required: true,
    },
  },
  emits: ['consent-updated'],
  setup(props, { emit }) {
    const { t } = useI18n();
    const loading = ref(false);
    const creating = ref(false);
    const revoking = ref(false);
    const consents = ref([]);

    const newConsent = reactive({
      consentType: '',
      purpose: '',
      description: '',
      expiresAt: '',
      consentMethod: 'WEB',
      status: 'GRANTED',
    });

    const canCreateConsent = computed(() => newConsent.consentType && newConsent.purpose);

    const loadConsents = async () => {
      try {
        loading.value = true;
        consents.value = await getConsentsByClient(props.commerceId, props.clientId, false);
      } catch (error) {
        console.error('Error loading consents:', error);
      } finally {
        loading.value = false;
      }
    };

    const createConsent = async () => {
      if (!canCreateConsent.value) return;

      try {
        creating.value = true;
        const consentData = {
          clientId: props.clientId,
          commerceId: props.commerceId,
          consentType: newConsent.consentType,
          status: 'GRANTED',
          purpose: newConsent.purpose,
          description: newConsent.description,
          expiresAt: newConsent.expiresAt
            ? new Date(newConsent.expiresAt).toISOString()
            : undefined,
          consentMethod: newConsent.consentMethod,
          ipAddress: '', // Será preenchido pelo backend
        };

        await createOrUpdateConsent(consentData);
        await loadConsents();
        emit('consent-updated');

        // Reset form
        newConsent.consentType = '';
        newConsent.purpose = '';
        newConsent.description = '';
        newConsent.expiresAt = '';
      } catch (error) {
        console.error('Error creating consent:', error);
        alert(error.response?.data?.message || t('lgpd.consent.errorCreating'));
      } finally {
        creating.value = false;
      }
    };

    const denyConsent = async () => {
      if (!newConsent.consentType) return;

      try {
        creating.value = true;
        const consentData = {
          clientId: props.clientId,
          commerceId: props.commerceId,
          consentType: newConsent.consentType,
          status: 'DENIED',
          purpose: newConsent.purpose,
          description: newConsent.description,
          consentMethod: newConsent.consentMethod,
        };

        await createOrUpdateConsent(consentData);
        await loadConsents();
        emit('consent-updated');

        // Reset form
        newConsent.consentType = '';
        newConsent.purpose = '';
        newConsent.description = '';
        newConsent.expiresAt = '';
      } catch (error) {
        console.error('Error denying consent:', error);
        alert(error.response?.data?.message || t('lgpd.consent.errorDenying'));
      } finally {
        creating.value = false;
      }
    };

    const revokeConsent = async id => {
      if (!confirm(t('lgpd.consent.confirmRevoke'))) return;

      try {
        revoking.value = true;
        await revokeConsentService(id);
        await loadConsents();
        emit('consent-updated');
      } catch (error) {
        console.error('Error revoking consent:', error);
        alert(error.response?.data?.message || t('lgpd.consent.errorRevoking'));
      } finally {
        revoking.value = false;
      }
    };

    const getConsentTypeLabel = type => {
      const labels = {
        DATA_PROCESSING: t('lgpd.consent.types.DATA_PROCESSING'),
        DATA_SHARING: t('lgpd.consent.types.DATA_SHARING'),
        MARKETING: t('lgpd.consent.types.MARKETING'),
        RESEARCH: t('lgpd.consent.types.RESEARCH'),
        THIRD_PARTY: t('lgpd.consent.types.THIRD_PARTY'),
        DATA_EXPORT: t('lgpd.consent.types.DATA_EXPORT'),
        TELEMEDICINE: t('lgpd.consent.types.TELEMEDICINE'),
        BIOMETRIC: t('lgpd.consent.types.BIOMETRIC'),
      };
      return labels[type] || type;
    };

    const getConsentTypeBadgeClass = type => 'badge bg-primary';

    const getStatusLabel = status => {
      const labels = {
        GRANTED: t('lgpd.consent.status.GRANTED'),
        DENIED: t('lgpd.consent.status.DENIED'),
        REVOKED: t('lgpd.consent.status.REVOKED'),
        EXPIRED: t('lgpd.consent.status.EXPIRED'),
        PENDING: t('lgpd.consent.status.PENDING'),
      };
      return labels[status] || status;
    };

    const getStatusBadgeClass = status => {
      const classes = {
        GRANTED: 'badge bg-success',
        DENIED: 'badge bg-danger',
        REVOKED: 'badge bg-warning',
        EXPIRED: 'badge bg-secondary',
        PENDING: 'badge bg-info',
      };
      return classes[status] || 'badge bg-secondary';
    };

    const getConsentStatusClass = status => {
      const classes = {
        GRANTED: 'border-success',
        DENIED: 'border-danger',
        REVOKED: 'border-warning',
        EXPIRED: 'border-secondary',
        PENDING: 'border-info',
      };
      return classes[status] || '';
    };

    const formatDate = date => {
      if (!date) return '';
      return new Date(date).toLocaleString();
    };

    onMounted(() => {
      loadConsents();
    });

    return {
      loading,
      creating,
      revoking,
      consents,
      newConsent,
      canCreateConsent,
      createConsent,
      denyConsent,
      revokeConsent,
      getConsentTypeLabel,
      getConsentTypeBadgeClass,
      getStatusLabel,
      getStatusBadgeClass,
      getConsentStatusClass,
      formatDate,
    };
  },
};
</script>

<style scoped>
.lgpd-consent-manager {
  width: 100%;
}

.metric-card.border-success {
  border-left: 3px solid #10b981 !important;
}

.metric-card.border-danger {
  border-left: 3px solid #ef4444 !important;
}

.metric-card.border-warning {
  border-left: 3px solid #f59e0b !important;
}

.metric-card.border-secondary {
  border-left: 3px solid #6b7280 !important;
}

.metric-card.border-info {
  border-left: 3px solid #2563eb !important;
}
</style>



