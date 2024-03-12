<script>
import { GoogleMap, Marker } from "vue3-google-map";
import { useI18n } from 'vue-i18n';

export default {
  name: 'CommerceContactInfo',
  props: {
    commerce: { type: Object, default: {} },
  },
  components: { GoogleMap, Marker },
  data() {
    const { t } = useI18n();
    const mapsKey = import.meta.env.VITE_MAPS_API_KEY;
    return {
      mapsKey,
      showContact: false,
      showLocation: false,
      showService: false,
      t
    }
  },
  methods: {
    attentionDays() {
      const dayList = [];
      const days = this.commerce.serviceInfo.attentionDays;
      if (days && days.length > 0) {
        days.forEach((day, index) => {
          dayList.push(this.t(`days.${index + 1}`));
        })
      }
      return dayList.join(', ');
    },
    mapsPosition() {
      if (this.commerce.localeInfo.addressLat &&
      this.commerce.localeInfo.addressLng) {
        return {
          lat: this.commerce.localeInfo.addressLat || 0,
          lng: this.commerce.localeInfo.addressLng || 0
        }
      }
      return undefined;
    },
    timeConvert(attentionHourFrom) {
      const minsFrom = attentionHourFrom * 60;
      const hours = Math.floor(minsFrom / 60);
      const minutes = minsFrom % 60;
      return `${hours}:${minutes === 0 ? '00': minutes}`;
    },
    showContacts() {
      this.showContact = !this.showContact ;
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
    }
  }
}
</script>

<template>
  <div>
    <div  class="text-center">
      <div id="commerce-info">
        <div class="row col-11 col-md-12">
          <div class="col-4" v-if="commerce.serviceInfo">
            <button
              class="btn btn-md btn-block btn-size fw-bold btn-secondary rounded-pill"
              @click="showServices">
              {{ $t("commerceQRSetup.services") }} <br> <i class="bi bi-info-circle"></i>
            </button>
          </div>
          <div class="col-4" v-if="commerce.contactInfo && commerce.contactInfo.phone">
            <button
              class="btn btn-md btn-block btn-size fw-bold btn-secondary rounded-pill"
              @click="showContacts">
              {{ $t("commerceQRSetup.contact") }} <br> <i class="bi bi-whatsapp"></i>
            </button>
          </div>
          <div class="col-4" v-if="commerce.localeInfo && commerce.localeInfo.address">
            <button
              class="btn btn-md btn-block btn-size fw-bold btn-secondary rounded-pill"
              @click="showLocations">
              {{ $t("commerceQRSetup.location") }} <br><i class="bi bi-pin-map"></i>
          </button>
          </div>
        </div>
        <div id="service-info" v-if="showService">
          <div v-if="commerce.serviceInfo" class="info-card mt-4">
            <div v-if="commerce.category">
              <span class="fw-bold"> {{ $t("commerceQRSetup.category") }} </span>
              <p> {{ $t(`categories.${commerce.category}`) }}</p>
            </div>
            <div v-if="commerce.serviceInfo.personalized === false">
              <div v-if="commerce.serviceInfo.attentionHourFrom >= 0 && commerce.serviceInfo.attentionHourTo >= 0">
                <span class="fw-bold mb-1"> {{ $t("commerceQRSetup.attentionHours") }} </span>
                {{ attentionDays() }}
                {{ $t("commerceQRSetup.from") }}
                <span class="fw-bold">{{ timeConvert(commerce.serviceInfo.attentionHourFrom) }} {{ $t("commerceQRSetup.hrs") }}</span>
                {{ $t("commerceQRSetup.to") }}
                <span class="fw-bold">{{ timeConvert(commerce.serviceInfo.attentionHourTo) }}</span> {{ $t("commerceQRSetup.hrs") }}
              </div>
            </div>
            <div v-else>
              <div v-if="commerce.serviceInfo.personalizedHours">
                <span class="fw-bold mb-1"> {{ $t("commerceQRSetup.attentionHours") }} </span>
                <div v-for="day in Object.keys(commerce.serviceInfo.personalizedHours || {})" :key="day">
                  {{ $t(`days.${day}`)}}
                  {{ $t("commerceQRSetup.from") }}
                  <span class="fw-bold">{{ timeConvert(commerce.serviceInfo.personalizedHours[day].attentionHourFrom) }} {{ $t("commerceQRSetup.hrs") }}</span>
                  {{ $t("commerceQRSetup.to") }}
                  <span class="fw-bold">{{ timeConvert(commerce.serviceInfo.personalizedHours[day].attentionHourTo) }}</span> {{ $t("commerceQRSetup.hrs") }}
                </div>
              </div>
            </div>
            <div v-if="commerce.serviceInfo.break === true" class="mt-2">
              <span class="fw-bold"> {{ $t("commerceQRSetup.breakHours") }} </span>
              {{ $t("commerceQRSetup.from") }}
              <span class="fw-bold">{{ timeConvert(commerce.serviceInfo.breakHourFrom) }} {{ $t("commerceQRSetup.hrs") }}</span>
              {{ $t("commerceQRSetup.to") }}
              <span class="fw-bold">{{ timeConvert(commerce.serviceInfo.breakHourTo) }}</span> {{ $t("commerceQRSetup.hrs") }}
            </div>
            <div v-if="commerce.serviceInfo.serviceUrl">
              <a
                type="button"
                class="btn-size btn btn-lg btn-block fw-bold btn-dark rounded-pill mt-3 my-1"
                :href="commerce.serviceInfo.serviceUrl"
                target="_blank">
                {{ $t("commerceQRSetup.menu") }} <i class="bi bi-menu-up"></i>
              </a>
            </div>
          </div>
        </div>
        <div id="contact-info" v-if="showContact">
          <div v-if="commerce.contactInfo" class="info-card mt-4">
            <span class="fw-bold"> {{ $t("commerceQRSetup.phones") }} </span>
            <span v-if="commerce.contactInfo.phone"> +{{ commerce.contactInfo.phone }} </span>
            <span v-if="commerce.contactInfo.phone2"> / +{{ commerce.contactInfo.phone2 }} </span>
            <div class="mt-2">
              <a
                type="button"
                v-if="commerce.contactInfo.url"
                class="btn-size btn btn-lg btn-block fw-bold rounded-pill my-2"
                :href="commerce.contactInfo.url"
                target="_blank">
                <i class="bi bi-link"></i> {{ commerce.contactInfo.url }}
              </a>
              <a
                type="button"
                v-if="commerce.contactInfo.email"
                class="btn-size btn btn-lg btn-block fw-bold rounded-pill my-2"
                :href="'mailto:'+commerce.contactInfo.email"
                target="_blank">
                <i class="bi bi-envelope"></i> {{ commerce.contactInfo.email }}
              </a>
            </div>
            <div class="row">
              <div class="col-3">
                <button
                  v-if="commerce.contactInfo.whatsapp"
                  class="btn btn-lg btn-size btn-block fw-bold btn-dark rounded-pill mt-2 whatsapp-button"
                  :href="'https://wa.me/'+commerce.contactInfo.whatsapp"
                  target="_blank">
                  <i class="bi bi-whatsapp"></i>
              </button>
              </div>
              <div class="col-3">
                <button
                  v-if="commerce.contactInfo.facebook"
                  class="btn btn-lg btn-size btn-block fw-bold btn-dark rounded-pill mt-2 facebook-button"
                  :href="'https://www.facebook.com/'+commerce.contactInfo.facebook"
                  target="_blank">
                  <i class="bi bi-facebook"></i>
                </button>
              </div>
              <div class="col-3">
                <a
                  type="button"
                  v-if="commerce.contactInfo.instagram"
                  class="btn btn-lg btn-size btn-block fw-bold btn-dark rounded-pill mt-2 instagram-button"
                  :href="'https://www.instagram.com/'+commerce.contactInfo.instagram"
                  target="_blank">
                  <i class="bi bi-instagram"></i>
                </a>
              </div>
              <div class="col-3">
                <a
                  type="button"
                  v-if="commerce.contactInfo.twitter"
                  class="btn btn-lg btn-size btn-block fw-bold btn-dark rounded-pill mt-2 twitter-button"
                  :href="'https://www.twitter.com/'+commerce.contactInfo.twitter"
                  target="_blank">
                  <i class="bi bi-twitter"></i>
                </a>
              </div>
            </div>
          </div>
        </div>
        <div id="map-info" v-if="showLocation">
          <div v-if="commerce.localeInfo" class="info-card mt-4">
            <span class="fw-bold"> {{ $t("commerceQRSetup.address") }} </span>
            <span v-if="commerce.localeInfo.address"> {{ commerce.localeInfo.address }} </span>
            <GoogleMap
              v-if="mapsPosition()"
              :api-key="mapsKey"
              class="mt-3" style="width: 100%; height: 300px" :zoom="15"
              :center="mapsPosition()">
              <Marker :options="{ position: mapsPosition() }" />
            </GoogleMap>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scan-qr {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.2rem;
}
.get-attention {
  padding-bottom: 1rem;
  font-size: .9rem;
  line-height: 1rem;
}
.btn {
  border-color: var(--color-text)
}
.info-card {
  line-height: 1.2rem;
  background-color: var(--color-background);
  padding: 1rem;
  margin: .5rem;
  border-radius: 1rem;
  border: .5px solid var(--gris-default);
  margin-bottom: 1rem;
  font-size: .9rem;
}
</style>