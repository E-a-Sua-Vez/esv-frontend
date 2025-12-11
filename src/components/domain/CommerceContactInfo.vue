<script>
import { GoogleMap, Marker } from 'vue3-google-map';
import { useI18n } from 'vue-i18n';
import { getActiveFeature } from '../../shared/features';
import { onMounted, onUnmounted, ref } from 'vue';

export default {
  name: 'CommerceContactInfo',
  props: {
    commerce: { type: Object, default: {} },
  },
  components: { GoogleMap, Marker },
  setup() {
    const { t } = useI18n();
    const mapsKey = import.meta.env.VITE_MAPS_API_KEY;
    const showContact = ref(false);
    const showLocation = ref(false);
    const showService = ref(false);
    const copySuccess = ref({});

    const closeAll = () => {
      showContact.value = false;
      showLocation.value = false;
      showService.value = false;
    };

    const handleClickOutside = event => {
      const component = event.target.closest('.commerce-contact-info');
      if (!component) {
        closeAll();
      }
    };

    const copyToClipboard = async (text, key) => {
      try {
        await navigator.clipboard.writeText(text);
        copySuccess.value[key] = true;
        setTimeout(() => {
          copySuccess.value[key] = false;
        }, 2000);
      } catch (err) {
      }
    };

    onMounted(() => {
      document.addEventListener('click', handleClickOutside);
    });

    onUnmounted(() => {
      document.removeEventListener('click', handleClickOutside);
    });

    return {
      mapsKey,
      showContact,
      showLocation,
      showService,
      copySuccess,
      closeAll,
      copyToClipboard,
      t,
    };
  },
  methods: {
    attentionDays() {
      const dayList = [];
      const days = this.commerce.serviceInfo.attentionDays;
      if (days && days.length > 0) {
        days.forEach((day, index) => {
          dayList.push(this.t(`days.${index + 1}`));
        });
      }
      return dayList.join(', ');
    },
    mapsPosition() {
      if (this.commerce.localeInfo.addressLat && this.commerce.localeInfo.addressLng) {
        return {
          lat: this.commerce.localeInfo.addressLat || 0,
          lng: this.commerce.localeInfo.addressLng || 0,
        };
      }
      return undefined;
    },
    timeConvert(attentionHourFrom) {
      const minsFrom = attentionHourFrom * 60;
      const hours = Math.floor(minsFrom / 60);
      const minutes = minsFrom % 60;
      return `${hours}:${minutes === 0 ? '00' : minutes}`;
    },
    showContacts() {
      this.showContact = !this.showContact;
      this.showLocation = false;
      this.showService = false;
    },
    showLocations() {
      this.showContact = false;
      this.showLocation = !this.showLocation;
      this.showService = false;
    },
    showServices() {
      this.showContact = false;
      this.showLocation = false;
      this.showService = !this.showService;
    },
    getActiveFeature(commerce, name, type) {
      return getActiveFeature(commerce, name, type);
    },
    copyPhone(phone) {
      this.copyToClipboard(`+${phone}`, `phone-${phone}`);
    },
    copyAddress() {
      if (this.commerce.localeInfo && this.commerce.localeInfo.address) {
        this.copyToClipboard(this.commerce.localeInfo.address, 'address');
      }
    },
  },
};
</script>

<template>
  <div class="commerce-contact-info">
    <!-- WhatsApp Button (Top) -->
    <div
      v-if="
        getActiveFeature(commerce, 'attention-stock-register', 'PRODUCT') &&
        commerce.contactInfo.whatsapp
      "
      class="whatsapp-section mb-2"
    >
      <p class="whatsapp-question">{{ $t('commerceQRSetup.questions') }}</p>
      <a
        v-if="commerce.contactInfo.whatsapp"
        class="whatsapp-button-modern"
        :href="'https://wa.me/' + commerce.contactInfo.whatsapp"
        target="_blank"
      >
        <i class="bi bi-whatsapp"></i>
        <span>{{ $t('commerceQRSetup.whatsapp') }}</span>
      </a>
    </div>

    <!-- Commerce Details Label -->
    <div v-if="commerce.serviceInfo || commerce.contactInfo" class="commerce-details-label mb-2">
      {{ $t('userQueueBooking.commerceDetails') }}
    </div>

    <!-- Action Buttons Row - Clean Style -->
    <div class="action-buttons-row mb-2">
      <div class="row g-2">
        <div class="col-4" v-if="commerce.serviceInfo">
          <button
            class="action-btn-clean"
            :class="{ active: showService }"
            @click.stop="showServices"
          >
            <i class="bi bi-clock"></i>
            <span>{{ $t('commerceQRSetup.services') }}</span>
          </button>
        </div>
        <div class="col-4" v-if="commerce.contactInfo && commerce.contactInfo.phone">
          <button
            class="action-btn-clean"
            :class="{ active: showContact }"
            @click.stop="showContacts"
          >
            <i class="bi bi-telephone"></i>
            <span>{{ $t('commerceQRSetup.contact') }}</span>
          </button>
        </div>
        <div class="col-4" v-if="commerce.localeInfo && commerce.localeInfo.address">
          <button
            class="action-btn-clean"
            :class="{ active: showLocation }"
            @click.stop="showLocations"
          >
            <i class="bi bi-geo-alt"></i>
            <span>{{ $t('commerceQRSetup.location') }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Service Info Card -->
    <transition name="slide-fade">
      <div v-if="showService && commerce.serviceInfo" class="detail-card-clean" @click.stop>
        <div class="detail-header-clean">
          <div class="detail-icon-clean icon-info">
            <i class="bi bi-clock"></i>
          </div>
          <h3 class="detail-title-clean">{{ $t('commerceQRSetup.services') }}</h3>
          <button class="close-btn" @click.stop="showServices" title="Cerrar">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="detail-content-clean">
          <div v-if="commerce.category" class="detail-row">
            <span class="detail-label">{{ $t('commerceQRSetup.category') }}</span>
            <span class="detail-value">{{ $t(`categories.${commerce.category}`) }}</span>
          </div>

          <div v-if="commerce.serviceInfo.personalized === false" class="detail-row">
            <div
              v-if="
                commerce.serviceInfo.attentionHourFrom >= 0 &&
                commerce.serviceInfo.attentionHourTo >= 0
              "
            >
              <span class="detail-label">{{ $t('commerceQRSetup.attentionHours') }}</span>
              <div class="detail-value">
                <div class="schedule-clean">
                  <span class="schedule-days">{{ attentionDays() }}</span>
                  <span class="schedule-time">
                    {{ $t('commerceQRSetup.from') }}
                    <strong
                      >{{ timeConvert(commerce.serviceInfo.attentionHourFrom) }}
                      {{ $t('commerceQRSetup.hrs') }}</strong
                    >
                    {{ $t('commerceQRSetup.to') }}
                    <strong
                      >{{ timeConvert(commerce.serviceInfo.attentionHourTo) }}
                      {{ $t('commerceQRSetup.hrs') }}</strong
                    >
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div v-else>
            <div v-if="commerce.serviceInfo.personalizedHours" class="detail-row">
              <span class="detail-label">{{ $t('commerceQRSetup.attentionHours') }}</span>
              <div class="detail-value">
                <div
                  v-for="day in Object.keys(commerce.serviceInfo.personalizedHours || {})"
                  :key="day"
                  class="schedule-clean"
                >
                  <span class="schedule-day">{{ $t(`days.${day}`) }}</span>
                  <span class="schedule-time">
                    {{ $t('commerceQRSetup.from') }}
                    <strong
                      >{{
                        timeConvert(commerce.serviceInfo.personalizedHours[day].attentionHourFrom)
                      }}
                      {{ $t('commerceQRSetup.hrs') }}</strong
                    >
                    {{ $t('commerceQRSetup.to') }}
                    <strong>{{
                      timeConvert(commerce.serviceInfo.personalizedHours[day].attentionHourTo)
                    }}</strong>
                    {{ $t('commerceQRSetup.hrs') }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="commerce.serviceInfo.break === true" class="detail-row">
            <span class="detail-label">{{ $t('commerceQRSetup.breakHours') }}</span>
            <div class="detail-value">
              <div class="schedule-clean">
                <span class="schedule-time">
                  {{ $t('commerceQRSetup.from') }}
                  <strong
                    >{{ timeConvert(commerce.serviceInfo.breakHourFrom) }}
                    {{ $t('commerceQRSetup.hrs') }}</strong
                  >
                  {{ $t('commerceQRSetup.to') }}
                  <strong
                    >{{ timeConvert(commerce.serviceInfo.breakHourTo) }}
                    {{ $t('commerceQRSetup.hrs') }}</strong
                  >
                </span>
              </div>
            </div>
          </div>

          <div v-if="commerce.serviceInfo.serviceUrl" class="detail-row detail-action-row">
            <a class="detail-link-clean" :href="commerce.serviceInfo.serviceUrl" target="_blank">
              <i class="bi bi-menu-up"></i>
              <span>{{ $t('commerceQRSetup.menu') }}</span>
              <i class="bi bi-arrow-up-right"></i>
            </a>
          </div>
        </div>
      </div>
    </transition>

    <!-- Contact Info Card -->
    <transition name="slide-fade">
      <div v-if="showContact && commerce.contactInfo" class="detail-card-clean" @click.stop>
        <div class="detail-header-clean">
          <div class="detail-icon-clean icon-success">
            <i class="bi bi-telephone"></i>
          </div>
          <h3 class="detail-title-clean">{{ $t('commerceQRSetup.contact') }}</h3>
          <button class="close-btn" @click.stop="showContacts" title="Cerrar">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="detail-content-clean">
          <div v-if="commerce.contactInfo.phone || commerce.contactInfo.phone2" class="detail-row">
            <span class="detail-label">{{ $t('commerceQRSetup.phones') }}</span>
            <div class="detail-value">
              <div class="copyable-item" v-if="commerce.contactInfo.phone">
                <a :href="'tel:+' + commerce.contactInfo.phone" class="contact-link-clean">
                  +{{ commerce.contactInfo.phone }}
                </a>
                <button
                  class="copy-btn"
                  @click.stop="copyPhone(commerce.contactInfo.phone)"
                  :title="
                    copySuccess[`phone-${commerce.contactInfo.phone}`] ? 'Copiado!' : 'Copiar'
                  "
                >
                  <i
                    :class="
                      copySuccess[`phone-${commerce.contactInfo.phone}`]
                        ? 'bi bi-check'
                        : 'bi bi-copy'
                    "
                  ></i>
                </button>
              </div>
              <div class="copyable-item" v-if="commerce.contactInfo.phone2">
                <span v-if="commerce.contactInfo.phone" class="separator"> / </span>
                <a :href="'tel:+' + commerce.contactInfo.phone2" class="contact-link-clean">
                  +{{ commerce.contactInfo.phone2 }}
                </a>
                <button
                  class="copy-btn"
                  @click.stop="copyPhone(commerce.contactInfo.phone2)"
                  :title="
                    copySuccess[`phone-${commerce.contactInfo.phone2}`] ? 'Copiado!' : 'Copiar'
                  "
                >
                  <i
                    :class="
                      copySuccess[`phone-${commerce.contactInfo.phone2}`]
                        ? 'bi bi-check'
                        : 'bi bi-copy'
                    "
                  ></i>
                </button>
              </div>
            </div>
          </div>

          <div v-if="commerce.contactInfo.url" class="detail-row detail-action-row">
            <a class="detail-link-clean" :href="commerce.contactInfo.url" target="_blank">
              <i class="bi bi-link-45deg"></i>
              <span>{{ $t('commerceQRSetup.web') }}</span>
              <i class="bi bi-arrow-up-right"></i>
            </a>
          </div>

          <div v-if="commerce.contactInfo.email" class="detail-row detail-action-row">
            <a class="detail-link-clean" :href="'mailto:' + commerce.contactInfo.email">
              <i class="bi bi-envelope"></i>
              <span>{{ commerce.contactInfo.email }}</span>
              <i class="bi bi-arrow-up-right"></i>
            </a>
          </div>

          <div
            v-if="
              commerce.contactInfo.whatsapp ||
              commerce.contactInfo.facebook ||
              commerce.contactInfo.instagram ||
              commerce.contactInfo.twitter
            "
            class="detail-row"
          >
            <span class="detail-label">Redes Sociales</span>
            <div class="social-links-clean">
              <a
                v-if="commerce.contactInfo.whatsapp"
                class="social-link-clean whatsapp-link"
                :href="'https://wa.me/' + commerce.contactInfo.whatsapp"
                target="_blank"
                title="WhatsApp"
              >
                <i class="bi bi-whatsapp"></i>
              </a>
              <a
                v-if="commerce.contactInfo.facebook"
                class="social-link-clean facebook-link"
                :href="'https://www.facebook.com/' + commerce.contactInfo.facebook"
                target="_blank"
                title="Facebook"
              >
                <i class="bi bi-facebook"></i>
              </a>
              <a
                v-if="commerce.contactInfo.instagram"
                class="social-link-clean instagram-link"
                :href="'https://www.instagram.com/' + commerce.contactInfo.instagram"
                target="_blank"
                title="Instagram"
              >
                <i class="bi bi-instagram"></i>
              </a>
              <a
                v-if="commerce.contactInfo.twitter"
                class="social-link-clean twitter-link"
                :href="'https://www.twitter.com/' + commerce.contactInfo.twitter"
                target="_blank"
                title="Twitter"
              >
                <i class="bi bi-twitter"></i>
              </a>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- Location Info Card -->
    <transition name="slide-fade">
      <div v-if="showLocation && commerce.localeInfo" class="detail-card-clean" @click.stop>
        <div class="detail-header-clean">
          <div class="detail-icon-clean icon-warning">
            <i class="bi bi-geo-alt"></i>
          </div>
          <h3 class="detail-title-clean">{{ $t('commerceQRSetup.location') }}</h3>
          <button class="close-btn" @click.stop="showLocations" title="Cerrar">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>
        <div class="detail-content-clean">
          <div v-if="commerce.localeInfo.address" class="detail-row">
            <span class="detail-label">{{ $t('commerceQRSetup.address') }}</span>
            <div class="detail-value">
              <div class="copyable-item">
                <span class="address-clean">{{ commerce.localeInfo.address }}</span>
                <button
                  class="copy-btn"
                  @click.stop="copyAddress"
                  :title="copySuccess.address ? 'Copiado!' : 'Copiar dirección'"
                >
                  <i :class="copySuccess.address ? 'bi bi-check' : 'bi bi-copy'"></i>
                </button>
              </div>
            </div>
          </div>
          <GoogleMap
            v-if="mapsPosition()"
            :api-key="mapsKey"
            class="map-container-clean"
            style="width: 100%; height: 200px"
            :zoom="15"
            :center="mapsPosition()"
          >
            <Marker :options="{ position: mapsPosition() }" />
          </GoogleMap>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.commerce-contact-info {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  position: relative;
}

/* WhatsApp Button - Clean Style */
.whatsapp-section {
  text-align: center;
}

.whatsapp-question {
  font-size: 0.8rem;
  color: rgba(0, 0, 0, 0.65);
  margin-bottom: 0.5rem;
  font-weight: 500;
}

.commerce-details-label {
  font-size: 1.1rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.8);
  text-align: center;
  margin-top: 0.5rem;
}

.whatsapp-button-modern {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #25d366 0%, #128c7e 100%);
  color: white;
  border-radius: 50px;
  font-weight: 600;
  font-size: 0.8rem;
  text-decoration: none;
  box-shadow: 0 2px 6px rgba(37, 211, 102, 0.2);
  transition: all 0.2s ease;
}

.whatsapp-button-modern:hover {
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(37, 211, 102, 0.3);
  color: white;
  text-decoration: none;
}

.whatsapp-button-modern i {
  font-size: 1rem;
}

/* Action Buttons - Clean Style */
.action-buttons-row {
  margin-bottom: 0.75rem;
}

.action-btn-clean {
  width: 100%;
  padding: 0.625rem 0.5rem;
  border-radius: 10px;
  border: 1px solid rgba(169, 169, 169, 0.2);
  background: rgba(255, 255, 255, 0.95);
  color: rgba(0, 0, 0, 0.7);
  font-weight: 500;
  font-size: 0.75rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  transition: all 0.2s ease;
  cursor: pointer;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.action-btn-clean:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
  border-color: rgba(0, 74, 173, 0.3);
  background: rgba(255, 255, 255, 1);
}

.action-btn-clean.active {
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.1) 0%, rgba(0, 194, 203, 0.1) 100%);
  color: var(--azul-turno);
  border-color: var(--azul-turno);
  box-shadow: 0 2px 6px rgba(0, 74, 173, 0.15);
}

.action-btn-clean i {
  font-size: 1.1rem;
  color: inherit;
}

.action-btn-clean span {
  font-size: 0.7rem;
  line-height: 1.2;
  text-align: center;
}

/* Detail Cards - Clean Style (like dashboard) */
.detail-card-clean {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 251, 252, 0.98) 100%);
  backdrop-filter: blur(10px);
  padding: 1rem 0.875rem;
  margin-top: 0.5rem;
  margin-bottom: 0.5rem;
  border-radius: 12px;
  border: 1px solid rgba(169, 169, 169, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.detail-card-clean::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, #00c2cb 0%, #00c4cc 50%, #00c2cb 100%);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.detail-card-clean:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
  border-color: rgba(169, 169, 169, 0.3);
}

.detail-card-clean:hover::before {
  opacity: 0.4;
}

.detail-header-clean {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  margin-bottom: 0.875rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid rgba(169, 169, 169, 0.1);
  position: relative;
}

.detail-icon-clean {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 1rem;
}

.icon-info {
  background: rgba(0, 74, 173, 0.15);
  color: #004aad;
}

.icon-success {
  background: rgba(0, 194, 203, 0.15);
  color: #00c2cb;
}

.icon-warning {
  background: rgba(249, 195, 34, 0.15);
  color: #f9c322;
}

.detail-title-clean {
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
  margin: 0;
  letter-spacing: 0.01em;
  flex: 1;
}

.close-btn {
  background: transparent;
  border: none;
  color: rgba(0, 0, 0, 0.4);
  font-size: 1rem;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.close-btn:hover {
  background: rgba(0, 0, 0, 0.05);
  color: rgba(0, 0, 0, 0.7);
}

.detail-content-clean {
  font-size: 0.85rem;
  line-height: 1.5;
}

.detail-row {
  margin-bottom: 0.875rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.detail-row:last-child {
  margin-bottom: 0;
}

.detail-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.6);
  letter-spacing: 0.01em;
}

.detail-value {
  color: rgba(0, 0, 0, 0.7);
  font-size: 0.85rem;
  line-height: 1.5;
}

.copyable-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.copyable-item:last-child {
  margin-bottom: 0;
}

.copy-btn {
  background: transparent;
  border: none;
  color: rgba(0, 0, 0, 0.5);
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0.375rem 0.5rem;
  border-radius: 4px;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  opacity: 0.7;
  min-width: 28px;
  min-height: 28px;
}

.copy-btn:hover {
  background: rgba(0, 74, 173, 0.1);
  color: var(--azul-turno);
  opacity: 1;
}

.copy-btn i {
  font-size: 0.9rem;
  display: block;
}

.copy-btn i.bi-check {
  color: var(--verde-tu);
}

.schedule-clean {
  padding: 0.5rem 0.75rem;
  background: rgba(0, 74, 173, 0.04);
  border-radius: 6px;
  border-left: 2px solid rgba(0, 74, 173, 0.2);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-top: 0.25rem;
}

.schedule-day,
.schedule-days {
  font-weight: 600;
  color: var(--azul-turno);
  font-size: 0.8rem;
}

.schedule-time {
  font-size: 0.8rem;
  color: rgba(0, 0, 0, 0.65);
}

.schedule-time strong {
  color: rgba(0, 0, 0, 0.8);
  font-weight: 600;
}

.contact-link-clean {
  color: var(--azul-turno);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
  display: inline-block;
  flex: 1;
}

.contact-link-clean:hover {
  color: var(--azul-es);
  text-decoration: underline;
}

.separator {
  color: rgba(0, 0, 0, 0.3);
  margin: 0 0.25rem;
}

.detail-action-row {
  padding-top: 0.5rem;
  border-top: 1px solid rgba(169, 169, 169, 0.1);
  margin-top: 0.5rem;
}

.detail-link-clean {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.875rem;
  background: rgba(0, 74, 173, 0.08);
  color: var(--azul-turno);
  border-radius: 8px;
  text-decoration: none;
  font-weight: 500;
  font-size: 0.8rem;
  transition: all 0.2s ease;
  border: 1px solid rgba(0, 74, 173, 0.15);
}

.detail-link-clean:hover {
  background: rgba(0, 74, 173, 0.12);
  color: var(--azul-es);
  transform: translateX(2px);
  text-decoration: none;
}

.detail-link-clean i:first-child {
  font-size: 0.9rem;
}

.detail-link-clean i:last-child {
  font-size: 0.75rem;
  opacity: 0.7;
}

.social-links-clean {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-top: 0.25rem;
}

.social-link-clean {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  text-decoration: none;
  font-size: 1rem;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.whatsapp-link {
  background: rgba(37, 211, 102, 0.15);
  color: #25d366;
}

.whatsapp-link:hover {
  background: #25d366;
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(37, 211, 102, 0.3);
}

.facebook-link {
  background: rgba(24, 119, 242, 0.15);
  color: #1877f2;
}

.facebook-link:hover {
  background: #1877f2;
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(24, 119, 242, 0.3);
}

.instagram-link {
  background: rgba(196, 53, 132, 0.15);
  color: #c13584;
}

.instagram-link:hover {
  background: linear-gradient(135deg, #e4405f 0%, #c13584 50%, #833ab4 100%);
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(196, 53, 132, 0.3);
}

.twitter-link {
  background: rgba(29, 161, 242, 0.15);
  color: #1da1f2;
}

.twitter-link:hover {
  background: #1da1f2;
  color: white;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(29, 161, 242, 0.3);
}

.address-clean {
  padding: 0.5rem 0.75rem;
  background: rgba(0, 74, 173, 0.04);
  border-radius: 6px;
  border-left: 2px solid rgba(0, 74, 173, 0.2);
  display: inline-block;
  font-weight: 500;
  flex: 1;
}

.map-container-clean {
  margin-top: 0.75rem;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

/* Animations */
.slide-fade-enter-active {
  transition: all 0.3s ease-out;
}

.slide-fade-leave-active {
  transition: all 0.3s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-8px);
  opacity: 0;
}

/* Responsive Design */
@media (max-width: 768px) {
  .whatsapp-question {
    font-size: 0.75rem;
  }

  .whatsapp-button-modern {
    padding: 0.45rem 0.875rem;
    font-size: 0.75rem;
  }

  .action-btn-clean {
    padding: 0.5rem 0.375rem;
    font-size: 0.7rem;
    gap: 0.3rem;
  }

  .action-btn-clean i {
    font-size: 1rem;
  }

  .action-btn-clean span {
    font-size: 0.65rem;
  }

  .detail-card-clean {
    padding: 0.875rem 0.75rem;
  }

  .detail-icon-clean {
    width: 28px;
    height: 28px;
    font-size: 0.9rem;
  }

  .detail-title-clean {
    font-size: 0.8rem;
  }

  .detail-content-clean {
    font-size: 0.8rem;
  }

  .detail-label {
    font-size: 0.7rem;
  }

  .detail-value {
    font-size: 0.8rem;
  }

  .copy-btn {
    font-size: 0.8rem;
    padding: 0.2rem 0.3rem;
  }

  .map-container-clean {
    height: 180px;
  }
}

@media (max-width: 576px) {
  .whatsapp-section {
    margin-bottom: 0.5rem;
  }

  .whatsapp-question {
    font-size: 0.7rem;
    margin-bottom: 0.375rem;
  }

  .whatsapp-button-modern {
    padding: 0.4rem 0.75rem;
    font-size: 0.7rem;
    gap: 0.4rem;
  }

  .whatsapp-button-modern i {
    font-size: 0.9rem;
  }

  .action-buttons-row {
    margin-bottom: 0.5rem;
  }

  .action-btn-clean {
    padding: 0.45rem 0.25rem;
    font-size: 0.65rem;
    gap: 0.25rem;
    border-radius: 8px;
  }

  .action-btn-clean i {
    font-size: 0.95rem;
  }

  .action-btn-clean span {
    font-size: 0.6rem;
  }

  .detail-card-clean {
    padding: 0.75rem 0.625rem;
    border-radius: 10px;
  }

  .detail-header-clean {
    gap: 0.5rem;
    margin-bottom: 0.75rem;
    padding-bottom: 0.625rem;
  }

  .detail-icon-clean {
    width: 26px;
    height: 26px;
    font-size: 0.85rem;
  }

  .detail-title-clean {
    font-size: 0.75rem;
  }

  .close-btn {
    width: 20px;
    height: 20px;
    font-size: 0.9rem;
  }

  .detail-row {
    margin-bottom: 0.75rem;
  }

  .copy-btn {
    font-size: 0.75rem;
    padding: 0.2rem;
  }

  .social-link-clean {
    width: 28px;
    height: 28px;
    font-size: 0.9rem;
  }

  .map-container-clean {
    height: 160px;
  }
}
</style>
