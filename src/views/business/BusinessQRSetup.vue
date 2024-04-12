<script>
import { ref, reactive, onBeforeMount } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getBusinessByKeyName } from '../../application/services/business';
import { VueRecaptcha } from 'vue-recaptcha';
import { globalStore } from '../../stores';
import PoweredBy from '../../components/common/PoweredBy.vue';
import Message from '../../components/common/Message.vue';
import QR from '../../components/common/QR.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import CommerceContactInfo from '../../components/domain/CommerceContactInfo.vue';

export default {
  name: 'BusinessQRSetup',
  components: { CommerceLogo, PoweredBy, Message, QR, VueRecaptcha, Spinner, Alert, CommerceContactInfo },
  async setup() {
    const route = useRoute();
    const router = useRouter();
    const store = globalStore();
    const { id } = route.params;
    const mapsKey = import.meta.env.VITE_MAPS_API_KEY;
    const siteKey = import.meta.env.VITE_RECAPTCHA_INVISIBLE;
    const captchaEnabled = import.meta.env.VITE_RECAPTCHA_ENABLED || false;

    let captcha = false;

    let loading = ref(false);
    let alertError = ref('');

    const state = reactive({
      business: {},
      commerces: ref({}),
      commerce: {},
      getNumberRemote: {},
      extendedEntity: false,
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.business = await getBusinessByKeyName(id);
        state.commerces = await state.business.commerces;
        state.commerce = state.commerces && state.commerces.length >= 0 ? state.commerces[0] : {};
        selectCommerce(state.commerce);
        store.setCurrentBusiness(state.business);
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    })

    const isActiveCommerce = () => {
      if (state.commerce) {
        return state.commerce.active === true;
      }
      return false;
    };

    const getQRValue = (commerce) => {
      const qrValue = `${import.meta.env.VITE_URL}/publico/comercio/${commerce.keyName}/filas`;
      return qrValue;
    };

    const goToRequestAttentionNumber = async () => {
      if (captchaEnabled) {
       await validateCaptchaOk(true);
      }
    };

    const validateCaptchaOk = async (response) => {
      if(response) {
        captcha = true;
        await store.setCurrentAttentionChannel('MINISITE');
        router.push({ path: `/publico/comercio/${state.commerce.keyName}/filas` })
      }
    };

    const validateCaptchaError = () => {
      captcha = false;
    };

    const selectCommerce = async (commerce) => {
      state.commerce = commerce;
    };

    const getFeature = (commerce, name) => {
      const features = commerce.features;
      let feature = {};
      if (features && features.length > 0) {
        feature = features.find(feat => { return feat.name === name });
      }
      return feature;
    }

    const getActiveFeature = (commerce, name) => {
      const feature = getFeature(commerce, name);
      if (!feature) {
        return true;
      }
      return  feature.active !== undefined ? feature.active : true;
    }

    const isAvailableCommerce = (commerce) => {
      const feature = getFeature(commerce, 'close-commerce-by-service-hours');
      if (!feature || feature.active === undefined || feature.active === false) {
        return true;
      }
      const timeZone = commerce.localeInfo.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      const clientCurrentDate = new Date().toLocaleString("en-US", { timeZone });
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
      if (clientHour >= commerce.serviceInfo.attentionHourFrom
        && clientHour <= commerce.serviceInfo.attentionHourTo) {
        isInHours = true;
      }
      if (isInDays && isInHours) {
        return true;
      }
    }

    const showDetails = () => {
      state.extendedEntity = !state.extendedEntity;
    };

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
      showDetails
    }
  }
}
</script>

<template>
  <div>
    <div class="content text-center">
      <CommerceLogo :src="state.business.logo" :loading="loading"></CommerceLogo>
      <div id="page-header" class="text-center mt-4">
        <div class="welcome">
          <span>{{ $t("commerceQRSetup.welcome") }}</span>
          <Spinner :show="loading"></Spinner>
          <Alert :show="loading" :stack="alertError"></Alert>
        </div>
        <div class="row mt-2">
          <div class="col" v-if="state.commerces && state.commerces.length > 0">
            <div class="dropdown">
              <span class="fw-bold">{{ $t("commerceQRSetup.commerce") }} </span><br>
              <button class="btn btn-ligth dropdown-toggle m-1" type="button" id="select-commerce" data-bs-toggle="dropdown" aria-expanded="false">
                <span class="fw-bold m-1"> {{ state.commerce.tag }} </span>
              </button>
              <ul class="dropdown-menu" aria-labelledby="select-commerce">
                <li v-for="com in state.commerces" :key="com.id" :value="com" class="list-item">
                  <div class="row d-flex m-1 searcher" @click="selectCommerce(com)">
                    <div class="col-3">
                      <img :src="com.logo" class="img-thumbnail rounded-start item-image">
                    </div>
                    <div class="col-9">
                      <div>
                        <span class="item-title fw-bold"> {{ com.tag }} </span>
                      </div>
                      <div v-if="com.localeInfo !== undefined">
                        <span class="item-subtitle text-break"> {{ com.localeInfo.address }} </span>
                      </div>
                    </div>
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div v-if="isActiveCommerce() && !loading">
        <div v-if="isAvailableCommerce(state.commerce)">
          <div>
            <div hidden class="scan-qr">
              <span>{{ $t("commerceQRSetup.scan") }}</span>
            </div>
            <div hidden class="get-attention mt-3">
              <span>{{ $t("commerceQRSetup.youllReceive") }}</span>
            </div>
            <div hidden @click="getQRValue(state.commerce)">
              <QR :value="getQRValue(state.commerce)"></QR>
            </div>
          </div>
          <div hidden v-if="getActiveFeature(state.commerce, 'get-number-remote')" class="get-attention">
            <span>{{ $t("commerceQRSetup.request") }}</span>
          </div>
          <div v-if="captchaEnabled === true">
            <VueRecaptcha
              :sitekey="siteKey"
              @verify="validateCaptchaOk"
              @error="validateCaptchaError">
              <button
                :hidden="!getActiveFeature(state.commerce, 'get-number-remote')"
                type="button"
                class="btn-size btn btn-lg btn-block fw-bold btn-dark rounded-pill mt-4 mb-3 py-3 px-5"
                @click="goToRequestAttentionNumber()">
                {{ $t("commerceQRSetup.action") }}
              </button>
            </VueRecaptcha>
            <div class="details-arrow mt-3" v-if="!getActiveFeature(state.commerce, 'get-number-remote')">
              <div>
                <div>
                  <div class="scan-qr">
                    <span>{{ $t("commerceQRSetup.scan") }}</span>
                  </div>
                  <div class="get-attention mt-3">
                    <span>{{ $t("commerceQRSetup.youllReceive") }}</span>
                  </div>
                </div>
                <div @click="getQRValue(state.commerce)">
                  <QR :value="getQRValue(state.commerce)"></QR>
                </div>
              </div>
            </div>
            <div class="details-arrow" v-else>
              <div class="centered">
                <span
                  href="#"
                  @click.prevent="showDetails()">
                  <span class="details-title">{{ $t("commerceQRSetup.seeQrCode") }}</span>
                  <i class="dark" :class="`bi ${state.extendedEntity ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
                </span>
              </div>
              <div
                :class="{ show: state.extendedEntity }"
                class="detailed-data transition-slow">
                <div>
                  <div class="scan-qr">
                    <span>{{ $t("commerceQRSetup.scan") }}</span>
                  </div>
                  <div class="get-attention mt-3">
                    <span>{{ $t("commerceQRSetup.youllReceive") }}</span>
                  </div>
                </div>
                <div @click="getQRValue(state.commerce)">
                  <QR :value="getQRValue(state.commerce)"></QR>
                </div>
                <div hidden v-if="getActiveFeature(state.commerce, 'get-number-remote')" class="get-attention">
                  <span>{{ $t("commerceQRSetup.request") }}</span>
                </div>
              </div>
            </div>
          </div>
          <div v-else>
            <button
              :hidden="!getActiveFeature(state.commerce, 'get-number-remote')"
              type="button"
              class="btn-size btn btn-lg fw-bold btn-dark rounded-pill mt-4 mb-3 py-3 px-5"
              @click="goToRequestAttentionNumber()">
              {{ $t("commerceQRSetup.action") }} <i class="bi bi-emoji-wink-fill"></i>
            </button>
            <div class="details-arrow mt-3" v-if="!getActiveFeature(state.commerce, 'get-number-remote')">
              <div>
                <div>
                  <div class="scan-qr">
                    <span>{{ $t("commerceQRSetup.scan") }}</span>
                  </div>
                  <div class="get-attention mt-3">
                    <span>{{ $t("commerceQRSetup.youllReceive") }}</span>
                  </div>
                </div>
                <div @click="getQRValue(state.commerce)">
                  <QR :value="getQRValue(state.commerce)"></QR>
                </div>
              </div>
            </div>
            <div class="details-arrow" v-else>
              <div class="centered">
                <span
                  href="#"
                  @click.prevent="showDetails()">
                  <span class="details-title">{{ $t("commerceQRSetup.seeQrCode") }}</span>
                  <i class="dark" :class="`bi ${state.extendedEntity ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
                </span>
              </div>
              <div
                :class="{ show: state.extendedEntity }"
                class="detailed-data transition-slow">
                <div>
                  <div class="scan-qr">
                    <span>{{ $t("commerceQRSetup.scan") }}</span>
                  </div>
                  <div class="get-attention mt-3">
                    <span>{{ $t("commerceQRSetup.youllReceive") }}</span>
                  </div>
                </div>
                <div @click="getQRValue(state.commerce)">
                  <QR :value="getQRValue(state.commerce)"></QR>
                </div>
                <div hidden v-if="getActiveFeature(state.commerce, 'get-number-remote')" class="get-attention">
                  <span>{{ $t("commerceQRSetup.request") }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-else>
          <Message
            :title="$t('commerceQRSetup.message4.title')"
            :content="$t('commerceQRSetup.message4.content')"
            :icon="'bi bi-emoji-frown'">
          </Message>
        </div>
      </div>
      <div class="mt-4">
        <CommerceContactInfo
          :commerce="state.commerce">
        </CommerceContactInfo>
      </div>
      <div>
        <Message
          :title="$t('commerceQRSetup.message1.title')"
          :content="$t('commerceQRSetup.message1.content')"
          :icon="'bi bi-emoji-smile'">
        </Message>
        <Message
          :title="$t('commerceQRSetup.message2.title')"
          :content="$t('commerceQRSetup.message2.content')"
          :icon="'bi-phone-vibrate'">
        </Message>
      </div>
      <div v-if="!isActiveCommerce() && !loading">
        <Message
          :title="$t('commerceQRSetup.message3.title')"
          :content="$t('commerceQRSetup.message3.content')"
          :icon="'bi bi-emoji-smile'">
        </Message>
      </div>
    </div>
    <PoweredBy :name="state.commerce?.name || ''" />
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
  font-size: 1rem;
  line-height: 1rem;
}
.select {
  border-radius: .5rem;
  border: 1.5px solid var(--gris-clear);
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
}
.item-image {
  border-radius: 1;
  max-width: 50px;
  max-height: 40px;
}
.list-item {
  cursor: pointer;
}
.item-title {
  display: flex;
  justify-content: left;
  align-items: left;
  margin: .1rem .3rem;
  font-size: 1rem;
  line-height: .9rem !important;
}
.item-subtitle {
  display: flex;
  justify-content: left;
  align-items: left;
  margin: .1rem .3rem;
  font-size: .6rem;
  line-height: .6rem !important;
}
.details-arrow {
  margin: .5rem;
  margin-top: 0;
  border-bottom-left-radius: .5rem;
  border-bottom-right-radius: .5rem;
  line-height: 1.1rem;
  border-top: 0;
}
.show {
  padding: 10px;
  max-height: 800px !important;
  overflow-y: auto;
}
.details-title {
  cursor: pointer;
  text-decoration: underline;
  font-size: .9rem;
  color: var(--color-text);
}
</style>