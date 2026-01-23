<template>
  <div class="lgpd-consent-manager">
    <div v-if="loading" class="text-center py-5">
      <Spinner />
      <p class="text-muted mt-3">{{ $t('common.loadingData') }}...</p>
    </div>

    <div v-else>
      <!-- Widget de Estado Consolidado -->
      <ConsentStatusWidget
        :commerce-id="commerceId"
        :client-id="clientId"
        :consents="consentStatus?.consents || []"
        :requirements="consentStatus?.requirements || []"
        :auto-refresh="false"
        @refresh="loadConsentStatus"
        @open-manager="() => {}"
        class="mb-4"
      />

      <!-- Alerta de Blocking Consents -->
      <div v-if="hasBlockingConsents" class="alert alert-danger mb-3">
        <i class="bi bi-shield-exclamation me-2"></i>
        <strong>{{
          $t('attention.lgpd.blockingConsents', { count: blockingConsentsCount })
        }}</strong>
        <p class="mb-0 mt-1 small">{{ $t('lgpd.consent.widget.blockingWarning') }}</p>
        <div class="mt-2">
          <button
            @click="requestPendingConsents"
            class="btn btn-sm btn-size fw-bold btn-danger rounded-pill px-3"
            :disabled="requesting"
          >
            <i class="bi bi-send me-2"></i>
            {{ $t('lgpd.consent.widget.requestBlockingConsents') }}
          </button>
        </div>
      </div>

      <!-- Resumen de Estado -->
      <div v-if="consentStatus?.summary" class="row mb-3">
        <div class="col-12">
          <div class="metric-card p-3">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h6 class="mb-1">{{ $t('lgpd.consent.title') }}</h6>
                <p class="mb-0 text-muted small">
                  {{
                    $t('lgpd.consent.widget.summary', {
                      granted: consentStatus.summary.granted,
                      total: consentStatus.summary.total,
                    })
                  }}
                </p>
              </div>
              <div class="text-end">
                <span class="badge bg-success me-2">
                  {{ $t('lgpd.consent.status.GRANTED') }}: {{ consentStatus.summary.granted }}
                </span>
                <span class="badge bg-info me-2">
                  {{ $t('lgpd.consent.status.PENDING') }}: {{ consentStatus.summary.pending }}
                </span>
                <span v-if="consentStatus.summary.denied > 0" class="badge bg-danger">
                  {{ $t('lgpd.consent.status.DENIED') }}: {{ consentStatus.summary.denied }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Consentimientos Faltantes (solo no bloqueantes) -->
      <div
        v-if="nonBlockingMissingConsents && nonBlockingMissingConsents.length > 0"
        class="row mb-3"
      >
        <div class="col-12">
          <div class="metric-card p-3 border-warning">
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h6 class="mb-1">
                  <i class="bi bi-exclamation-triangle-fill text-warning me-2"></i>
                  {{ $t('lgpd.consent.widget.requestAllPending') }}
                </h6>
                <p class="mb-0 text-muted small">
                  {{ nonBlockingMissingConsents.length }}
                  {{ $t('lgpd.consent.widget.requestAllPending').toLowerCase() }}
                </p>
              </div>
              <button
                @click="requestPendingConsents"
                class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
                :disabled="requesting"
              >
                <i class="bi bi-send me-2"></i>
                {{
                  requesting ? $t('common.loading') : $t('lgpd.consent.widget.requestAllPending')
                }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Lista de Consentimientos -->
      <div v-if="consents.length > 0" class="mb-3">
        <h6 class="mb-3">{{ $t('lgpd.consent.title') }}</h6>
        <div v-for="consent in consents" :key="consent.id" class="row mb-2">
          <div class="col-12">
            <div class="metric-card p-3" :class="getConsentStatusClass(consent.status)">
              <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                  <div class="mb-2">
                    <span class="badge bg-primary px-3 py-2">
                      {{ getConsentTypeLabel(consent.consentType) }}
                    </span>
                    <span :class="getStatusBadgeClass(consent.status)" class="ms-2 px-3 py-2">
                      {{ getStatusLabel(consent.status) }}
                    </span>
                    <span
                      v-if="isBlockingRequirement(consent.consentType)"
                      class="badge bg-danger ms-2 px-3 py-2"
                    >
                      <i class="bi bi-shield-exclamation me-1"></i>
                      {{ $t('lgpd.consent.blocking') || 'Bloqueante' }}
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
                    {{ $t('lgpd.consent.revoke') }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else-if="!loading" class="text-center py-4">
        <i class="bi bi-inbox" style="font-size: 3rem; color: #ccc"></i>
        <p class="text-muted mt-3">{{ $t('lgpd.consent.noConsents') }}</p>
      </div>

      <!-- Formulário de Novo Consentimento -->
      <div class="row my-2 metric-card">
        <div class="col-12">
          <span
            class="metric-card-subtitle"
            style="cursor: pointer"
            @click="newConsentExpanded = !newConsentExpanded"
          >
            <span class="form-check-label metric-keyword-subtitle mx-1">
              <i :class="newConsentExpanded ? 'bi bi-chevron-up' : 'bi bi-plus-circle'"></i>
              {{ $t('lgpd.consent.newConsent') }}
            </span>
          </span>
        </div>
        <div v-show="newConsentExpanded" class="col-12 mt-3">
          <div class="mb-3">
            <label class="form-label"
              ><small>{{ $t('lgpd.consent.consentType') }} *</small></label
            >
            <select v-model="newConsent.consentType" class="form-select" required>
              <option value="">{{ $t('lgpd.consent.selectType') }}</option>
              <option value="DATA_PROCESSING">
                {{ $t('lgpd.consent.types.DATA_PROCESSING') }}
              </option>
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
            <label class="form-label"
              ><small>{{ $t('lgpd.consent.purpose') }} *</small></label
            >
            <input
              v-model="newConsent.purpose"
              type="text"
              class="form-control"
              :placeholder="$t('lgpd.consent.purposePlaceholder')"
              required
            />
          </div>

          <div class="mb-3">
            <label class="form-label"
              ><small>{{ $t('lgpd.consent.description') }}</small></label
            >
            <textarea
              v-model="newConsent.description"
              class="form-control"
              rows="3"
              :placeholder="$t('lgpd.consent.descriptionPlaceholder')"
            ></textarea>
          </div>

          <div class="row mb-3">
            <div class="col-md-6">
              <label class="form-label"
                ><small>{{ $t('lgpd.consent.expiresAt') }}</small></label
              >
              <input v-model="newConsent.expiresAt" type="date" class="form-control" />
              <small class="form-text text-muted">{{ $t('lgpd.consent.expiresAtHelp') }}</small>
            </div>
            <div class="col-md-6">
              <label class="form-label"
                ><small>{{ $t('lgpd.consent.consentMethod') }}</small></label
              >
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
              <i class="bi bi-check-circle me-2"></i>
              {{ $t('lgpd.consent.create') }}
            </button>
            <button
              @click="denyConsent"
              class="btn btn-sm btn-size fw-bold btn-danger rounded-pill px-3"
              :disabled="!canCreateConsent || creating"
            >
              <i class="bi bi-x-circle me-2"></i>
              {{ $t('lgpd.consent.deny') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import Spinner from '../common/Spinner.vue';
import ConsentStatusWidget from './ConsentStatusWidget.vue';
import {
  getConsentsByClient,
  createOrUpdateConsent,
  revokeConsent as revokeConsentService,
} from '../../application/services/lgpd-consent';
import {
  getConsentStatus,
  getMissingConsents,
  requestAllPendingConsents,
} from '../../application/services/consent';

export default {
  name: 'LgpdConsentManager',
  components: {
    Spinner,
    ConsentStatusWidget,
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
    isVisible: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['consent-updated'],
  setup(props, { emit }) {
    const { t } = useI18n();
    const loading = ref(false);
    const creating = ref(false);
    const revoking = ref(false);
    const requesting = ref(false);
    const consents = ref([]);
    const consentStatus = ref(null);
    const missingConsents = ref([]);
    const newConsentExpanded = ref(false);

    const nonBlockingMissingConsents = computed(() => {
      if (!missingConsents.value) return [];
      return missingConsents.value.filter(req => !(req.blockingForAttention && req.required));
    });

    const newConsent = reactive({
      consentType: '',
      purpose: '',
      description: '',
      expiresAt: '',
      consentMethod: 'WEB',
      status: 'GRANTED',
    });

    const canCreateConsent = computed(() => newConsent.consentType && newConsent.purpose);

    const hasBlockingConsents = computed(() => {
      if (!consentStatus.value || !consentStatus.value.missing) {
        return false;
      }
      return consentStatus.value.missing.some(req => req.blockingForAttention && req.required);
    });

    const blockingConsentsCount = computed(() => {
      if (!consentStatus.value || !consentStatus.value.missing) {
        return 0;
      }
      return consentStatus.value.missing.filter(req => req.blockingForAttention && req.required)
        .length;
    });

    const loadConsentStatus = async (showLoading = true) => {
      try {
        if (showLoading) {
          loading.value = true;
        }
        const status = await getConsentStatus(props.commerceId, props.clientId);
        // Solo actualizar si hay cambios para evitar re-renders innecesarios
        if (JSON.stringify(consentStatus.value) !== JSON.stringify(status)) {
          consentStatus.value = status;
          consents.value = status.consents || [];
          missingConsents.value = status.missing || [];
        }
      } catch (error) {
        console.error('Error loading consent status:', error);
        // Fallback: cargar solo consentimientos si falla el estado consolidado
        await loadConsents();
      } finally {
        if (showLoading) {
          loading.value = false;
        }
      }
    };

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

    const requestPendingConsents = async () => {
      try {
        requesting.value = true;
        await requestAllPendingConsents(props.commerceId, props.clientId, 'MANUAL');
        await loadConsentStatus();
        emit('consent-updated');
        alert(t('lgpd.consent.widget.requestSent'));
      } catch (error) {
        console.error('Error requesting pending consents:', error);
        alert(error.response?.data?.message || t('common.error'));
      } finally {
        requesting.value = false;
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
        await loadConsentStatus();
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
        await loadConsentStatus();
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
        await loadConsentStatus();
        emit('consent-updated');
      } catch (error) {
        console.error('Error revoking consent:', error);
        alert(error.response?.data?.message || t('lgpd.consent.errorRevoking'));
      } finally {
        revoking.value = false;
      }
    };

    const getConsentTypeLabel = type => t(`lgpd.consent.types.${type}`) || type;

    const getStatusLabel = status => t(`lgpd.consent.status.${status}`) || status;

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

    const isBlockingRequirement = consentType => {
      if (!consentStatus.value || !consentStatus.value.requirements) {
        return false;
      }
      const requirement = consentStatus.value.requirements.find(
        req => req.consentType === consentType
      );
      return requirement?.blockingForAttention && requirement?.required;
    };

    let consentStatusIntervalId = null;

    const startConsentStatusPolling = () => {
      // Polling cada 10 segundos para atualização em tempo real
      if (consentStatusIntervalId) {
        clearInterval(consentStatusIntervalId);
      }
      consentStatusIntervalId = setInterval(() => {
        if (props.commerceId && props.clientId) {
          // No mostrar spinner en actualizaciones automáticas
          loadConsentStatus(false);
        }
      }, 10000); // 10 segundos
    };

    const stopConsentStatusPolling = () => {
      if (consentStatusIntervalId) {
        clearInterval(consentStatusIntervalId);
        consentStatusIntervalId = null;
      }
    };

    onMounted(() => {
      // Solo cargar si el componente es visible
      if (props.isVisible) {
        loadConsentStatus();
        startConsentStatusPolling();
      }
    });

    onUnmounted(() => {
      stopConsentStatusPolling();
    });

    // Watch para mudanças em props
    watch(
      () => [props.commerceId, props.clientId, props.isVisible],
      ([newCommerceId, newClientId, newIsVisible], [oldCommerceId, oldClientId, oldIsVisible]) => {
        // Si el componente se hace visible, cargar datos
        if (newIsVisible && !oldIsVisible && newCommerceId && newClientId) {
          loadConsentStatus();
          startConsentStatusPolling();
        }
        // Si el componente se oculta, detener polling
        else if (!newIsVisible && oldIsVisible) {
          stopConsentStatusPolling();
        }
        // Si cambian commerceId o clientId mientras está visible, recargar
        else if (newIsVisible && (newCommerceId !== oldCommerceId || newClientId !== oldClientId)) {
          stopConsentStatusPolling();
          if (newCommerceId && newClientId) {
            loadConsentStatus();
            startConsentStatusPolling();
          }
        }
      }
    );

    return {
      loading,
      creating,
      revoking,
      requesting,
      consents,
      consentStatus,
      missingConsents,
      nonBlockingMissingConsents,
      hasBlockingConsents,
      blockingConsentsCount,
      newConsent,
      newConsentExpanded,
      canCreateConsent,
      createConsent,
      denyConsent,
      revokeConsent,
      requestPendingConsents,
      loadConsentStatus,
      getConsentTypeLabel,
      getStatusLabel,
      getStatusBadgeClass,
      getConsentStatusClass,
      formatDate,
      isBlockingRequirement,
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
