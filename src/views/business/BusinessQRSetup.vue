<script>
import { ref, reactive, computed, onBeforeMount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getBusinessByKeyName } from '../../application/services/business';
import { VueRecaptcha } from 'vue-recaptcha';
import { globalStore } from '../../stores';
import Message from '../../components/common/Message.vue';
import QR from '../../components/common/QR.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import CommerceContactInfo from '../../components/domain/CommerceContactInfo.vue';

export default {
  name: 'BusinessQRSetup',
  components: {
    CommerceLogo,
    Message,
    QR,
    VueRecaptcha,
    Spinner,
    Alert,
    CommerceContactInfo,
  },
  async setup() {
    const route = useRoute();
    const router = useRouter();
    const store = globalStore();
    const { id } = route.params;
    const mapsKey = import.meta.env.VITE_MAPS_API_KEY;
    const siteKey = import.meta.env.VITE_RECAPTCHA_INVISIBLE;
    const captchaEnabled = import.meta.env.VITE_RECAPTCHA_ENABLED || false;

    let captcha = false;

    const loading = ref(false);
    const alertError = ref('');

    const state = reactive({
      business: {},
      commerces: ref({}),
      commerce: {},
      getNumberRemote: {},
      extendedEntity: false,
      brokenLogos: new Set(),
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.business = await getBusinessByKeyName(id);
        // Mantener exactamente el mismo comportamiento que tenías antes:
        // el backend ya entrega los comercios en el formato adecuado.
        state.commerces = await state.business.commerces;
        // Log para entender qué forma real tiene commerces en este minisite
        // y cuántas unidades llegan.
        // eslint-disable-next-line no-console
        console.debug('[BusinessQRSetup] commerces loaded', {
          type: Array.isArray(state.commerces) ? 'array' : typeof state.commerces,
          length: state.commerces && state.commerces.length,
        });
        state.commerce = state.commerces && state.commerces.length > 0 ? state.commerces[0] : {};
        selectCommerce(state.commerce);
        store.setCurrentBusiness(state.business);
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    });

    const isActiveCommerce = () => {
      if (state.commerce) {
        return state.commerce.active === true;
      }
      return false;
    };

    const getQRValue = commerce => {
      const qrValue = `${import.meta.env.VITE_URL}/publico/comercio/${commerce.keyName}/filas`;
      return qrValue;
    };

    const goToRequestAttentionNumber = async () => {
      if (captchaEnabled) {
        await validateCaptchaOk(true);
      }
    };

    const validateCaptchaOk = async response => {
      if (response) {
        captcha = true;
        await store.setCurrentAttentionChannel('MINISITE');
        router.push({ path: `/publico/comercio/${state.commerce.keyName}/filas` });
      }
    };

    const validateCaptchaError = () => {
      captcha = false;
    };

    const showDropdown = ref(false);

    const selectCommerce = async commerce => {
      state.commerce = commerce;
      showDropdown.value = false;
    };

    const toggleDropdown = () => {
      showDropdown.value = !showDropdown.value;
    };

    const getFeature = (commerce, name) => {
      if (!commerce || !commerce.features) {
        return {};
      }
      const features = commerce.features;
      let feature = {};
      if (features && features.length > 0) {
        feature = features.find(feat => feat.name === name);
      }
      return feature;
    };

    const getActiveFeature = (commerce, name) => {
      const feature = getFeature(commerce, name);
      if (!feature) {
        return true;
      }
      return feature.active !== undefined ? feature.active : true;
    };

    const isAvailableCommerce = commerce => {
      const feature = getFeature(commerce, 'close-commerce-by-service-hours');
      if (!feature || feature.active === undefined || feature.active === false) {
        return true;
      }
      const timeZone =
        commerce.localeInfo.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      const clientCurrentDate = new Date().toLocaleString('en-US', { timeZone });
      let clientDayOfweek = new Date(clientCurrentDate).getDay();
      const clientHour = new Date(clientCurrentDate).getHours();
      let isInDays = false;
      let isInHours = false;
      if (clientDayOfweek === 0) {
        clientDayOfweek = 7;
      }
      if (commerce.serviceInfo.attentionDays.includes(clientDayOfweek)) {
        isInDays = true;
      }
      if (
        clientHour >= commerce.serviceInfo.attentionHourFrom &&
        clientHour <= commerce.serviceInfo.attentionHourTo
      ) {
        isInHours = true;
      }
      if (isInDays && isInHours) {
        return true;
      }
    };

    const showDetails = () => {
      state.extendedEntity = !state.extendedEntity;
    };

    const hasMultipleCommerces = () => state.commerces && state.commerces.length > 1;

    const handleLogoError = (commerceId, isBusiness = false) => {
      if (isBusiness) {
        state.brokenLogos.add('business_logo');
      } else {
        state.brokenLogos.add(commerceId);
      }
    };

    const getCommerceLogo = (commerce) => {
      if (!commerce) return null;
      // Si el logo del commerce está roto, devolver null para que intente el business logo
      if (state.brokenLogos.has(commerce.id)) {
        return null;
      }
      return commerce.logo || null;
    };

    const getBusinessLogo = () => {
      if (state.brokenLogos.has('business_logo')) {
        return null;
      }
      return state.business?.logo || null;
    };

    const hasValidLogo = (commerce) => {
      const commerceLogo = getCommerceLogo(commerce);
      const businessLogo = getBusinessLogo();
      return commerceLogo || businessLogo;
    };

    // ---- Geolocalización del cliente (NO modifica la lista de comercios) ----

    const supportsGeolocation = typeof navigator !== 'undefined' && !!navigator.geolocation;
    const clientLocation = ref(null);
    const distanceByCommerceId = reactive({});
    const nearestCommerceId = ref(null);

    const nearestCommerce = computed(() => {
      if (!nearestCommerceId.value || !state.commerces || !state.commerces.length) {
        return null;
      }
      return state.commerces.find(com => com.id === nearestCommerceId.value) || null;
    });

    const computeDistanceKm = (lat1, lon1, lat2, lon2) => {
      const toRad = value => (value * Math.PI) / 180;
      const R = 6371; // km
      const dLat = toRad(lat2 - lat1);
      const dLon = toRad(lon2 - lon1);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) *
          Math.cos(toRad(lat2)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    };

    const updateDistances = () => {
      // limpiar distancias anteriores
      Object.keys(distanceByCommerceId).forEach(key => {
        delete distanceByCommerceId[key];
      });
      nearestCommerceId.value = null;

      if (!state.commerces || !state.commerces.length || !clientLocation.value) {
        return;
      }

      let bestId = null;
      let bestDistance = Infinity;

      state.commerces.forEach(com => {
        const loc = com.localeInfo || {};
        const lat = loc.addressLat;
        const lng = loc.addressLng;

        if (typeof lat === 'number' && typeof lng === 'number') {
          const dist = computeDistanceKm(
            clientLocation.value.latitude,
            clientLocation.value.longitude,
            lat,
            lng,
          );
          distanceByCommerceId[com.id] = dist;
          if (dist < bestDistance) {
            bestDistance = dist;
            bestId = com.id;
          }
        }
      });

      if (bestId) {
        nearestCommerceId.value = bestId;
      }
    };

    const requestClientLocation = () => {
      if (!supportsGeolocation) {
        return;
      }

      navigator.geolocation.getCurrentPosition(
        position => {
          clientLocation.value = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          updateDistances();

          // Importante: solo preselecciona, NO filtra la lista
          if (nearestCommerce.value) {
            selectCommerce(nearestCommerce.value);
          }
        },
        () => {
          // en error no hacemos nada, la UI sigue igual
        },
        {
          enableHighAccuracy: false,
          timeout: 8000,
          maximumAge: 60000,
        },
      );
    };

    const getDistanceLabel = commerceId => {
      const distance = distanceByCommerceId[commerceId];
      if (distance == null) {
        return '';
      }

      if (distance < 1) {
        const meters = Math.round(distance * 1000);
        return `${meters} m`;
      }

      if (distance < 10) {
        return `${distance.toFixed(1)} km`;
      }

      return `${Math.round(distance)} km`;
    };

    const hasDistance = commerceId => distanceByCommerceId[commerceId] != null;

    // Lista usada por el dropdown; solo reenvía state.commerces y loguea la longitud
    const visibleCommerces = computed(() => {
      const list = state.commerces || [];
      // eslint-disable-next-line no-console
      console.debug('[BusinessQRSetup] visibleCommerces length', list.length);
      return list;
    });

    return {
      state,
      id,
      siteKey,
      captchaEnabled,
      loading,
      alertError,
      mapsKey,
      getQRValue,
      isActiveCommerce,
      isAvailableCommerce,
      getActiveFeature,
      selectCommerce,
      goToRequestAttentionNumber,
      validateCaptchaOk,
      validateCaptchaError,
      showDetails,
      hasMultipleCommerces,
      handleLogoError,
      getCommerceLogo,
      getBusinessLogo,
      hasValidLogo,
      // geolocalización
      supportsGeolocation,
      clientLocation,
      nearestCommerce,
      requestClientLocation,
      getDistanceLabel,
      hasDistance,
      visibleCommerces,
      showDropdown,
      toggleDropdown,
    };
  },
};
</script>

<template>
  <div class="business-qr-setup">
    <div class="content text-center">
      <!-- Loading and Error States -->
      <div id="page-header" class="text-center mb-2">
        <Spinner :show="loading"></Spinner>
        <Alert :show="false" :stack="alertError"></Alert>
      </div>

      <!-- Business Logo -->
      <div class="logo-container mb-2" v-if="!loading">
        <CommerceLogo
          :business-id="state.business?.id"
          :loading="loading"
          :large-size="true"
        ></CommerceLogo>
      </div>

      <!-- Welcome Section -->
      <div class="welcome-section mb-3" v-if="!loading">
        <h1 class="welcome-title">{{ $t('commerceQRSetup.welcome') }}</h1>
        <p class="welcome-subtitle">{{ $t('commerceQRSetup.youllReceive') }}</p>
      </div>

      <!-- Unit Selector - PRIMORDIAL: Always visible -->
      <div
        class="unit-selector-section mb-3"
        v-if="!loading && state.commerces && state.commerces.length > 0"
      >
        <div class="unit-selector-card">
          <div class="unit-selector-header">
            <i class="bi bi-shop unit-selector-icon"></i>
            <h2 class="unit-selector-title">{{ $t('commerceQRSetup.commerce') }}</h2>
          </div>
          <!-- Sugerencia de unidad por geolocalización (NO altera la lista) -->
          <div
            v-if="hasMultipleCommerces() && supportsGeolocation"
            class="location-suggestion mb-2"
          >
            <button type="button" class="location-btn" @click="requestClientLocation">
              <i class="bi bi-geo-alt-fill me-2"></i>
              <span>{{ $t('commerceQRSetup.useMyLocation') }}</span>
            </button>

            <p v-if="clientLocation && nearestCommerce" class="nearest-info">
              {{ $t('commerceQRSetup.nearestUnitPrefix') }}
              <strong>{{ nearestCommerce.tag }}</strong>
              <span class="distance-inline-badge">
                {{ getDistanceLabel(nearestCommerce.id) }}
                {{ $t('commerceQRSetup.away') }}
              </span>
            </p>
          </div>
          <!-- Dropdown when multiple units -->
          <div v-if="hasMultipleCommerces()" class="unit-dropdown-wrapper">
            <button
              class="unit-select-btn"
              type="button"
              id="select-commerce"
              :aria-expanded="showDropdown ? 'true' : 'false'"
              @click="toggleDropdown"
            >
              <div class="unit-select-content">
                <div class="unit-select-logo">
                  <CommerceLogo
                    :commerce-id="state.commerce?.id"
                    :business-id="state.business?.id"
                    class="unit-logo-img"
                  />
                </div>
                <div class="unit-select-info">
                  <span class="unit-select-name">{{ state.commerce.tag }}</span>
                  <span
                    v-if="state.commerce.localeInfo && state.commerce.localeInfo.address"
                    class="unit-select-address"
                  >
                    <i class="bi bi-geo-alt-fill"></i>
                    {{ state.commerce.localeInfo.address }}
                  </span>
                </div>
              </div>
              <i class="bi bi-chevron-down unit-select-arrow"></i>
            </button>
            <ul
              v-if="showDropdown"
              class="unit-dropdown"
              aria-labelledby="select-commerce"
            >
              <li v-for="com in visibleCommerces" :key="com.id" :value="com" class="list-item">
                <div class="unit-option" @click="selectCommerce(com)">
                  <div class="unit-option-logo">
                    <CommerceLogo
                      :commerce-id="com?.id"
                      :business-id="state.business?.id"
                      class="unit-logo-img"
                    />
                  </div>
                  <div class="unit-option-info">
                    <div class="unit-option-header-row">
                      <div class="unit-option-name">{{ com.tag }}</div>
                      <div
                        v-if="clientLocation && hasDistance(com.id)"
                        class="unit-option-badges"
                      >
                        <span class="distance-badge">{{ getDistanceLabel(com.id) }}</span>
                        <span
                          v-if="nearestCommerce && nearestCommerce.id === com.id"
                          class="nearest-badge"
                        >
                          {{ $t('commerceQRSetup.nearestBadge') }}
                        </span>
                      </div>
                    </div>
                    <div v-if="com.localeInfo !== undefined" class="unit-option-address">
                      <i class="bi bi-geo-alt-fill"></i>
                      {{ com.localeInfo.address }}
                    </div>
                  </div>
                  <i
                    v-if="com.id === state.commerce.id"
                    class="bi bi-check-circle-fill unit-option-check"
                  ></i>
                </div>
              </li>
            </ul>
          </div>
          <!-- Single unit display (no dropdown) -->
          <div v-else class="unit-select-single">
            <div class="unit-select-content">
              <div class="unit-select-logo">
                <CommerceLogo
                  :commerce-id="state.commerce?.id"
                  :business-id="state.business?.id"
                  class="unit-logo-img"
                />
              </div>
              <div class="unit-select-info">
                <span class="unit-select-name">{{ state.commerce.tag }}</span>
                <span
                  v-if="state.commerce.localeInfo && state.commerce.localeInfo.address"
                  class="unit-select-address"
                >
                  <i class="bi bi-geo-alt-fill"></i>
                  {{ state.commerce.localeInfo.address }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Action Section -->
      <div v-if="isActiveCommerce() && !loading" class="main-action-section">
        <div v-if="isAvailableCommerce(state.commerce)">
          <!-- Primary Action Card -->
          <div class="action-card modern-card">
            <!-- Remote Number Request (Primary Action) -->
            <div
              v-if="getActiveFeature(state.commerce, 'get-number-remote')"
              class="primary-action"
            >
              <div class="action-icon-container">
                <i class="bi bi-ticket-perforated action-icon"></i>
              </div>
              <h2 class="action-title">{{ $t('commerceQRSetup.wantToBeAttended') }}</h2>
              <p class="action-description">{{ $t('commerceQRSetup.request') }}</p>

              <div class="action-button-container">
                <div v-if="captchaEnabled === true">
                  <VueRecaptcha
                    :sitekey="siteKey"
                    @verify="validateCaptchaOk"
                    @error="validateCaptchaError"
                  >
                    <button
                      type="button"
                      class="btn btn-primary btn-lg action-button"
                      @click="goToRequestAttentionNumber()"
                    >
                      <i class="bi bi-ticket-perforated me-2"></i>
                      {{ $t('commerceQRSetup.action') }}
                    </button>
                  </VueRecaptcha>
                </div>
                <div v-else>
                  <button
                    type="button"
                    class="btn btn-primary btn-lg action-button"
                    @click="goToRequestAttentionNumber()"
                  >
                    <i class="bi bi-ticket-perforated me-2"></i>
                    {{ $t('commerceQRSetup.action') }}
                  </button>
                </div>
              </div>

              <!-- QR Code Toggle -->
              <div class="qr-toggle-section">
                <div class="qr-divider"></div>
                <button type="button" class="qr-toggle-btn" @click.prevent="showDetails()">
                  <i class="bi bi-qr-code-scan me-2"></i>
                  <span class="qr-toggle-text">{{ $t('commerceQRSetup.seeQrCode') }}</span>
                  <i
                    class="bi ms-2"
                    :class="state.extendedEntity ? 'bi-chevron-up' : 'bi-chevron-down'"
                  ></i>
                </button>
              </div>

              <!-- QR Code Section (Collapsible) -->
              <transition name="slide-fade">
                <div v-if="state.extendedEntity" class="qr-section">
                  <div class="qr-instructions">
                    <i class="bi bi-qr-code-scan qr-icon"></i>
                    <p class="qr-instruction-text">{{ $t('commerceQRSetup.scan') }}</p>
                  </div>
                  <div class="qr-code-wrapper">
                    <QR :value="getQRValue(state.commerce)"></QR>
                  </div>
                </div>
              </transition>
            </div>

            <!-- QR Code Only (No Remote Request) -->
            <div v-else class="qr-only-action">
              <div class="action-icon-container">
                <i class="bi bi-qr-code-scan action-icon"></i>
              </div>
              <h2 class="action-title">{{ $t('commerceQRSetup.scan') }}</h2>
              <p class="action-description">{{ $t('commerceQRSetup.youllReceive') }}</p>
              <div class="qr-code-wrapper">
                <QR :value="getQRValue(state.commerce)"></QR>
              </div>
            </div>
          </div>
        </div>

        <!-- Closed Commerce Message -->
        <div v-else class="closed-message-container">
          <Message
            :title="$t('commerceQRSetup.message4.title')"
            :content="$t('commerceQRSetup.message4.content')"
            :icon="'bi bi-emoji-frown'"
            type="warning"
          >
          </Message>
        </div>
      </div>

      <!-- Inactive Commerce Message -->
      <div v-if="!isActiveCommerce() && !loading" class="inactive-message-container">
        <Message
          :title="$t('commerceQRSetup.message3.title')"
          :content="$t('commerceQRSetup.message3.content')"
          :icon="'bi bi-emoji-smile'"
          type="warning"
        >
        </Message>
      </div>

      <!-- Commerce Information Section -->
      <div class="commerce-info-section mt-3" v-if="isActiveCommerce() && !loading">
        <CommerceContactInfo :commerce="state.commerce"></CommerceContactInfo>
      </div>

      <!-- Help Messages -->
      <div class="help-messages mt-3" v-if="isActiveCommerce() && !loading">
        <Message
          :title="$t('commerceQRSetup.message1.title')"
          :content="$t('commerceQRSetup.message1.content')"
          :icon="'bi bi-emoji-smile'"
          type="info"
        >
        </Message>
        <Message
          :title="$t('commerceQRSetup.message2.title')"
          :content="$t('commerceQRSetup.message2.content')"
          :icon="'bi bi-phone-vibrate'"
          type="info"
        >
        </Message>
      </div>
    </div>
  </div>
</template>

<style scoped>
.business-qr-setup {
  min-height: 100vh;
  padding: 0.75rem 0.5rem;
}

.logo-container {
  margin-bottom: 1rem;
}

.welcome-section {
  margin-bottom: 1.25rem;
}

.welcome-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 0.5rem;
  line-height: 1.2;
}

.welcome-subtitle {
  font-size: 0.95rem;
  color: rgba(0, 0, 0, 0.7);
  line-height: 1.4;
  margin: 0;
}

/* Unit Selector Card - PRIMORDIAL */
.unit-selector-section {
  max-width: 600px;
  margin: 0 auto 1.5rem;
  position: relative;
  z-index: 100;
}

.unit-selector-section * {
  position: relative;
  z-index: inherit;
}

.unit-selector-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(250, 251, 252, 0.98) 100%);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  box-shadow: 0 4px 20px rgba(0, 74, 173, 0.15), 0 2px 8px rgba(0, 0, 0, 0.08);
  padding: 1.25rem;
  transition: all 0.3s ease;
  position: relative;
  overflow: visible;
}

.unit-selector-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(
    90deg,
    var(--azul-turno) 0%,
    var(--azul-es) 50%,
    var(--azul-turno) 100%
  );
  border-radius: 16px 16px 0 0;
  z-index: 1;
}

.unit-selector-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(0, 74, 173, 0.15);
}

.unit-selector-icon {
  font-size: 1.5rem;
  color: var(--azul-turno);
}

.unit-selector-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}

.unit-select-btn {
  width: 100%;
  padding: 1rem;
  border-radius: 12px;
  border: 2px solid var(--gris-default);
  background: var(--color-background);
  color: var(--color-text);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  transition: all 0.2s ease;
  cursor: pointer;
}

.unit-select-btn:hover {
  border-color: var(--azul-turno);
  background-color: rgba(0, 74, 173, 0.05);
  box-shadow: 0 2px 8px rgba(0, 74, 173, 0.1);
}

.unit-select-single {
  width: 100%;
  padding: 1rem;
  border-radius: 12px;
  border: 2px solid rgba(169, 169, 169, 0.2);
  background: rgba(255, 255, 255, 0.5);
}

.unit-select-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  text-align: left;
}

.unit-select-logo {
  flex-shrink: 0;
  width: 50px;
  height: 50px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--gris-default);
}

.unit-logo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.unit-logo-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: var(--azul-turno);
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.1) 0%, rgba(0, 194, 203, 0.1) 100%);
}

.unit-select-info {
  flex: 1;
  min-width: 0;
}

.unit-select-name {
  display: block;
  font-weight: 600;
  font-size: 1rem;
  color: var(--color-text);
  margin-bottom: 0.25rem;
}

.unit-select-address {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.85rem;
  color: rgba(0, 0, 0, 0.6);
  line-height: 1.3;
}

.unit-select-arrow {
  font-size: 1.25rem;
  color: var(--azul-turno);
  flex-shrink: 0;
}

.unit-dropdown-wrapper {
  position: relative;
  z-index: 1000;
}

.unit-dropdown-wrapper .dropdown-menu {
  position: absolute !important;
  top: 100% !important;
  left: 0 !important;
  right: 0 !important;
  z-index: 9999 !important;
  margin-top: 0.5rem !important;
  transform: translateY(0) !important;
}

.unit-dropdown-wrapper .dropdown-menu.show,
.unit-dropdown-wrapper.show .dropdown-menu,
.unit-dropdown-wrapper .dropdown-menu[data-bs-popper] {
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
}

.unit-dropdown {
  width: 100%;
  border-radius: 12px;
  border: 1px solid var(--gris-default);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 0.375rem;
  max-height: 400px;
  overflow-y: auto;
  background: white !important;
  min-width: 100%;
}

.unit-option {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.625rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
  gap: 0.625rem;
  position: relative;
}

.unit-option:hover {
  background-color: rgba(0, 74, 173, 0.08);
}

.unit-option-logo {
  flex-shrink: 0;
  width: 45px;
  height: 45px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid var(--gris-default);
}

.unit-option-info {
  flex: 1;
  min-width: 0;
}

.unit-option-name {
  display: block;
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--color-text);
  margin-bottom: 0.25rem;
}

.unit-option-address {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: 0.8rem;
  color: rgba(0, 0, 0, 0.6);
  line-height: 1.3;
}

.unit-option-check {
  font-size: 1.25rem;
  color: var(--verde-tu);
  flex-shrink: 0;
}

/* Unit Info Card (Single Unit) */
.unit-info-section {
  max-width: 600px;
  margin: 0 auto 1.25rem;
}

.unit-info-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(250, 251, 252, 0.98) 100%);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(169, 169, 169, 0.15);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
  padding: 1.25rem;
}

.unit-info-header {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.unit-info-logo {
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  border-radius: 10px;
  overflow: hidden;
  border: 2px solid var(--gris-default);
}

.unit-info-details {
  flex: 1;
  text-align: left;
}

.unit-info-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 0.375rem 0;
}

.unit-info-address {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  color: rgba(0, 0, 0, 0.7);
  margin: 0;
}

/* Modern Card Styles */
.modern-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(250, 251, 252, 0.98) 100%);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  border: 1px solid rgba(169, 169, 169, 0.15);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
  padding: 1.5rem;
  margin: 0 auto;
  max-width: 600px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  z-index: 1;
}

.modern-card:hover {
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12), 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

/* Main Action Card */
.action-card {
  margin: 0 auto 1.5rem;
}

.primary-action,
.qr-only-action {
  text-align: center;
}

.action-icon-container {
  margin-bottom: 1.25rem;
}

.action-icon {
  font-size: 3rem;
  color: var(--azul-turno);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 80px;
  height: 80px;
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.1) 0%, rgba(0, 194, 203, 0.1) 100%);
  border-radius: 50%;
  margin-bottom: 0.75rem;
  aspect-ratio: 1;
}

.action-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 0.5rem;
  line-height: 1.2;
}

.action-description {
  font-size: 0.95rem;
  color: rgba(0, 0, 0, 0.7);
  line-height: 1.4;
  margin-bottom: 1.5rem;
}

.action-button-container {
  margin-bottom: 1.5rem;
}

.action-button {
  padding: 0.875rem 2rem;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 50px;
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--azul-es) 100%);
  border: none;
  box-shadow: 0 4px 15px rgba(0, 74, 173, 0.3);
  transition: all 0.3s ease;
  min-width: 200px;
}

.action-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 74, 173, 0.4);
  background: linear-gradient(135deg, var(--azul-es) 0%, var(--azul-turno) 100%);
}

.action-button:active {
  transform: translateY(0);
}

/* QR Toggle */
.qr-toggle-section {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
}

.qr-divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(169, 169, 169, 0.3), transparent);
  margin-bottom: 1rem;
}

.qr-toggle-btn {
  background: transparent;
  border: none;
  color: var(--azul-turno);
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem;
  margin: 0 auto;
  transition: all 0.2s ease;
  border-radius: 8px;
}

.qr-toggle-btn:hover {
  background-color: rgba(0, 74, 173, 0.05);
  color: var(--azul-es);
}

.qr-toggle-text {
  text-decoration: underline;
}

/* QR Section */
.qr-section {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  animation: fadeIn 0.3s ease;
}

.qr-instructions {
  margin-bottom: 1.5rem;
}

.qr-icon {
  font-size: 2rem;
  color: var(--azul-turno);
  margin-bottom: 0.75rem;
}

.qr-instruction-text {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
}

.qr-code-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 1rem;
}

/* QR Only Action */
.qr-only-action .action-icon {
  color: var(--verde-tu);
  background: linear-gradient(135deg, rgba(0, 194, 203, 0.1) 0%, rgba(0, 194, 203, 0.15) 100%);
}

/* Messages */
.closed-message-container,
.inactive-message-container {
  max-width: 600px;
  margin: 0 auto 1.5rem;
  position: relative;
  z-index: 1;
}

.help-messages {
  max-width: 600px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

.commerce-info-section {
  max-width: 600px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
}

.list-item {
  list-style: none;
}

/* Línea divisoria entre items (excepto el último) */
.unit-dropdown .list-item:not(:last-child) .unit-option {
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
}

.unit-dropdown .list-item:not(:last-child) .unit-option {
  margin-bottom: 0.125rem;
  padding-bottom: 0.625rem;
}

/* Geolocalización: sugerencias y badges */
.location-suggestion {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.location-btn {
  width: 100%;
  border-radius: 999px;
  border: 1px dashed var(--azul-turno);
  background: rgba(0, 74, 173, 0.04);
  color: var(--azul-turno);
  font-size: 0.85rem;
  font-weight: 500;
  padding: 0.5rem 0.75rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  cursor: pointer;
  transition: all 0.2s ease;
  line-height: 1rem;
}

.location-btn:hover {
  background: rgba(0, 74, 173, 0.08);
}

.nearest-info {
  font-size: 0.8rem;
  color: rgba(0, 0, 0, 0.7);
  text-align: left;
  margin: 0;
}

.distance-inline-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.05rem 0.4rem;
  margin-left: 0.35rem;
  border-radius: 999px;
  background: rgba(0, 74, 173, 0.06);
  color: var(--azul-turno);
  font-size: 0.75rem;
  font-weight: 500;
}

.unit-option-header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.unit-option-badges {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.distance-badge {
  padding: 0.05rem 0.4rem;
  border-radius: 999px;
  background: rgba(0, 74, 173, 0.06);
  color: var(--azul-turno);
  font-size: 0.7rem;
  font-weight: 500;
  line-height: .8rem;
}

.nearest-badge {
  padding: 0.05rem 0.4rem;
  border-radius: 999px;
  background: rgba(0, 194, 203, 0.12);
  color: var(--azul-es);
  font-size: 0.7rem;
  font-weight: 600;
  line-height: .8rem;
}

/* Animations */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}

/* Responsive Design */
@media (max-width: 768px) {
  .business-qr-setup {
    padding: 0.5rem 0.5rem;
  }

  .logo-container {
    margin-bottom: 0.75rem;
  }

  .welcome-section {
    margin-bottom: 1rem;
  }

  .welcome-title {
    font-size: 1.25rem;
    margin-bottom: 0.375rem;
  }

  .welcome-subtitle {
    font-size: 0.9rem;
  }

  .unit-selector-card {
    padding: 1rem;
    border-radius: 14px;
    overflow: visible;
  }

  .unit-dropdown-wrapper {
    z-index: 1001;
  }

  .unit-dropdown {
    z-index: 1051 !important;
  }

  .unit-selector-header {
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
  }

  .unit-selector-title {
    font-size: 1rem;
  }

  .unit-select-btn {
    padding: 0.875rem;
  }

  .unit-select-logo {
    width: 45px;
    height: 45px;
  }

  .unit-select-name {
    font-size: 0.95rem;
  }

  .unit-select-address {
    font-size: 0.8rem;
  }

  .unit-info-card {
    padding: 1rem;
  }

  .unit-info-logo {
    width: 50px;
    height: 50px;
  }

  .unit-info-name {
    font-size: 1rem;
  }

  .unit-info-address {
    font-size: 0.85rem;
  }

  .modern-card {
    padding: 1.25rem;
    border-radius: 14px;
    margin-bottom: 1rem;
  }

  .action-title {
    font-size: 1.25rem;
    margin-bottom: 0.5rem;
  }

  .action-description {
    font-size: 0.9rem;
    margin-bottom: 1.25rem;
  }

  .action-icon {
    font-size: 2.5rem;
    width: 70px;
    height: 70px;
    margin-bottom: 0.5rem;
  }

  .action-button {
    min-width: 100%;
    padding: 0.75rem 1.5rem;
    font-size: 0.95rem;
  }

  .action-button-container {
    margin-bottom: 1.25rem;
  }

  .qr-toggle-section {
    margin-top: 1rem;
    padding-top: 1rem;
  }

  .commerce-info-section {
    margin-top: 1.5rem;
  }

  .help-messages {
    margin-top: 1.5rem;
  }
}

@media (max-width: 576px) {
  .business-qr-setup {
    padding: 0.5rem 0.5rem;
  }

  .welcome-title {
    font-size: 1.1rem;
  }

  .welcome-subtitle {
    font-size: 0.85rem;
  }

  .unit-selector-card {
    padding: 0.875rem;
    border-radius: 12px;
  }

  .unit-selector-icon {
    font-size: 1.25rem;
  }

  .unit-selector-title {
    font-size: 0.95rem;
  }

  .unit-select-btn {
    padding: 0.75rem;
    gap: 0.75rem;
  }

  .unit-select-logo {
    width: 40px;
    height: 40px;
  }

  .unit-select-name {
    font-size: 0.9rem;
  }

  .unit-select-address {
    font-size: 0.75rem;
  }

  .unit-info-card {
    padding: 0.875rem;
  }

  .unit-info-logo {
    width: 45px;
    height: 45px;
  }

  .modern-card {
    padding: 1rem;
    border-radius: 12px;
  }

  .action-title {
    font-size: 1.1rem;
  }

  .action-description {
    font-size: 0.85rem;
    margin-bottom: 1rem;
  }

  .action-icon {
    font-size: 2rem;
    width: 60px;
    height: 60px;
  }

  .action-button {
    padding: 0.7rem 1.25rem;
    font-size: 0.9rem;
  }
}
</style>
