<script>
import { ref, reactive, onBeforeMount } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getCommercesByBusinessId, updateCommerce, addCommerce, getActiveCommercesByBusinessId } from '../../application/services/commerce';
import { getPermissions } from '../../application/services/permissions';
import Popper from "vue3-popper";
import CommerceName from '../../components/common/CommerceName.vue';
import Toggle from '@vueform/toggle';
import Message from '../../components/common/Message.vue';
import PoweredBy from '../../components/common/PoweredBy.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import AreYouSure from '../../components/common/AreYouSure.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';

export default {
  name: 'BusinessCommerceAdmin',
  components: { CommerceLogo, Message, PoweredBy, Spinner, Alert, CommerceName, Toggle, Warning, Popper, AreYouSure, ComponentMenu },
  async setup() {
    const router = useRouter();
    const store = globalStore();

    let loading = ref(false);
    let alertError = ref('');

    const state = reactive({
      currentUser: {},
      business: {},
      activeBusiness: false,
      commerces: ref({}),
      modules: ref({}),
      commerce: {},
      showAdd: false,
      goToUnavailable: false,
      newCommerce: {},
      extendedEntity: undefined,
      errorsAdd: [],
      errorsUpdate: [],
      nameError: false,
      keyNameError: false,
      tagAddError: false,
      tagUpdateError: false,
      phoneAddError: false,
      phoneUpdateError: false,
      categoryAddError: false,
      urlAddError: false,
      urlUpdateError: false,
      emailError: false,
      addressAddError: false,
      toggles: {},
      categories: [
        'beauty',
        'entertaiment',
        'health',
        'shop',
        'pharmacy',
        'services',
        'restaurant',
        'supermarket'
      ],
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.commerces = await getCommercesByBusinessId(state.business.id);
        state.toggles = await getPermissions('commerces', 'admin');
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    })

    const isActiveBusiness = () => {
      return state.business && state.business.active === true;
    };

    const goBack = () => {
      router.back();
    }

    const validateAdd = (commerce) => {
      state.errorsAdd = [];
      if(!commerce.name || commerce.name.length === 0) {
        state.nameError = true;
        state.errorsAdd.push('businessCommercesAdmin.validate.name');
      } else {
        state.nameError = false;
      }
      if(!commerce.keyName || commerce.keyName.length === 0) {
        state.keyNameError = true;
        state.errorsAdd.push('businessCommercesAdmin.validate.keyName');
      } else {
        state.keyNameError = false;
      }
      if(!commerce.tag || commerce.tag.length === 0) {
        state.tagAddError = true;
        state.errorsAdd.push('businessCommercesAdmin.validate.tag');
      } else {
        state.tagAddError = false;
      }
      if(!commerce.category || commerce.category.length === 0) {
        state.categoryAddError = true;
        state.errorsAdd.push('businessCommercesAdmin.validate.category');
      } else {
        state.categoryAddError = false;
      }
      if(!commerce.email || commerce.email.length < 10) {
        state.emailError = true;
        state.errorsAdd.push('businessCommercesAdmin.validate.email');
      } else {
        state.emailError = false;
      }
      if(!commerce.contactInfo.phone || commerce.contactInfo.phone.length < 10) {
        state.phoneAddError = true;
        state.errorsAdd.push('businessCommercesAdmin.validate.phone');
      } else {
        state.phoneAddError = false;
      }
      if(!commerce.localeInfo.address || commerce.localeInfo.address.length < 10) {
        state.addressAddError = true;
        state.errorsAdd.push('businessCommercesAdmin.validate.address');
      } else {
        state.addressAddError = false;
      }
      if(state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    }

    const validateUpdate = (commerce) => {
      state.errorsUpdate = [];
      if(!commerce.tag || commerce.tag.length === 0) {
        state.tagUpdateError = true;
        state.errorsUpdate.push('businessCommercesAdmin.validate.tag');
      } else {
        state.tagUpdateError = false;
      }
      if(!commerce.phone || commerce.phone.length < 10) {
        state.phoneUpdateError = true;
        state.errorsUpdate.push('businessCommercesAdmin.validate.phone');
      } else {
        state.phoneUpdateError = false;
      }
      if(state.errorsUpdate.length === 0) {
        return true;
      }
      return false;
    }

    const showAdd = () => {
      state.showAdd = !state.showAdd;
      state.newCommerce = {
        businessId: state.business.id,
        name: state.business.name,
        url: state.business.url,
        phone: state.business.phone,
        logo: state.business.logo,
        country: state.business.country,
        localeInfo: state.business.localeInfo || {},
        contactInfo: state.business.contactInfo || {},
        serviceInfo: {
          break: false,
          personalized: false,
          personalizedHours: {},
          holiday: false,
          holidays: {},
          ...state.business.serviceInfo }
      }
    }

    const add = async () => {
      try {
        loading.value = true;
        if (validateAdd(state.newCommerce)) {
          await addCommerce(state.newCommerce);
          const commerces = await getCommercesByBusinessId(state.business.id);
          state.commerces = commerces;
          state.showAdd = false;
          state.newCommerce = {}
        }
        state.extendedEntity = undefined;
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    }

    const update = async (commerce) => {
      try {
        loading.value = true;
        if (validateUpdate(commerce)) {
          await updateCommerce(commerce.id, commerce);
          const commerces = await getCommercesByBusinessId(state.business.id);
          state.commerces = commerces;
          state.extendedEntity = undefined;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    }

    const unavailable = async (commerce) => {
      try {
        loading.value = true;
        if (commerce && commerce.id) {
          commerce.available = false;
          commerce.active = false;
          await updateCommerce(commerce.id, commerce);
          const commerces = await getCommercesByBusinessId(state.business.id);
          state.commerces = commerces;
          state.extendedEntity = undefined;
          state.goToUnavailable = false;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    }

    const goToUnavailable = () => {
      state.goToUnavailable = !state.goToUnavailable;
    }

    const unavailableCancel = () => {
      state.goToUnavailable = false;
    }

    const showUpdateForm = (index) => {
      state.extendedEntity = state.extendedEntity !== index ? index : undefined;
    }

    const dayChecked = (serviceInfo, day) => {
      if (serviceInfo && serviceInfo.attentionDays) {
        return serviceInfo.attentionDays.includes(day);
      }
      return false;
    }

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
            attentionHourTo: serviceInfo.attentionHourTo
          };
        }
      }
    }

    const getCommerceLink = (commerce) => {
      const commerceKeyName = commerce.keyName;
      return `${import.meta.env.VITE_URL}/interno/comercio/${commerceKeyName}`;
    }

    const copyLink = (commerce) => {
      const textToCopy = getSurveyLink(commerce);
      navigator.clipboard.writeText(textToCopy);
    }

    const initializedParsonalizedHours = (serviceInfo) => {
      if (serviceInfo.personalized === true) {
        if (!serviceInfo.personalizedHours) {
          serviceInfo.personalizedHours = {};
        }
        if (serviceInfo.attentionDays && serviceInfo.attentionDays.length > 0) {
          serviceInfo.attentionDays.forEach(day => {
            serviceInfo.personalizedHours[day] = {
              attentionHourFrom: serviceInfo.attentionHourFrom,
              attentionHourTo: serviceInfo.attentionHourTo
            };
          })
        }
      }
    }

    return {
      state,
      loading,
      alertError,
      showUpdateForm,
      update,
      showAdd,
      add,
      goBack,
      isActiveBusiness,
      dayChecked,
      checkDay,
      getCommerceLink,
      copyLink,
      initializedParsonalizedHours,
      unavailable,
      goToUnavailable,
      unavailableCancel
    }
  }
}
</script>

<template>
  <div>
    <div class="content text-center">
      <CommerceLogo :src="state.business.logo" :loading="loading"></CommerceLogo>
      <ComponentMenu
        :title="$t(`businessCommercesAdmin.title`)"
        :toggles="state.toggles"
        componentName="businessCommercesAdmin"
        @goBack="goBack">
      </ComponentMenu>
      <div id="page-header" class="text-center">
        <Spinner :show="loading"></Spinner>
        <Alert :show="loading" :stack="alertError"></Alert>
      </div>
      <div id="businessCommercesAdmin">
        <div v-if="isActiveBusiness && state.toggles['commerces.admin.view']">
          <div v-if="!loading" id="businessCommercesAdmin-result" class="mt-4">
            <div>
              <div v-if="state.commerces.length === 0" class="control-box">
                <Message
                  :title="$t('businessCommercesAdmin.message.2.title')"
                  :content="$t('businessCommercesAdmin.message.2.content')" />
              </div>
              <div class="row my-2">
                <div class="col-8 text-label">
                  <span>{{ $t("businessCommercesAdmin.listResult") }}</span>
                  <span class="fw-bold m-2">{{ state.commerces.length }}</span>
                </div>
                <div class="col-4">
                  <button
                    class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-4"
                    @click="showAdd()"
                    :disabled="!state.toggles['commerces.admin.add']">
                    <i class="bi bi-plus-lg"></i>
                  </button>
                </div>
              </div>
              <div id="add-commerce" class="commerce-card mb-4" v-if="state.showAdd && state.toggles['commerces.admin.add']">
                <div v-if="state.commerces.length < state.toggles['commerces.admin.limit']">
                  <div class="row g-1">
                    <div id="commerce-name-form-add" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessCommercesAdmin.name") }}
                      </div>
                      <div class="col-8">
                        <input
                          min="1"
                          max="50"
                          type="text"
                          class="form-control"
                          v-model="state.newCommerce.name"
                          v-bind:class="{ 'is-invalid': state.nameError }"
                          placeholder="brilliant-shop-1">
                      </div>
                    </div>
                    <div id="commerce-keyName-form-add" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessCommercesAdmin.keyName") }}
                        <Popper
                          :class="'dark p-1'"
                          arrow
                          disableClickAway
                          :content="$t('businessCommercesAdmin.keyNameHelp')">
                          <i class='bi bi-info-circle-fill h7'></i>
                        </Popper>
                      </div>
                      <div class="col-8">
                        <input
                          min="1"
                          max="50"
                          type="text"
                          class="form-control"
                          v-model="state.newCommerce.keyName"
                          v-bind:class="{ 'is-invalid': state.keyNameError }"
                          placeholder="brilliant-shop-1">
                      </div>
                    </div>
                    <div id="commerce-email-form-add" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessCommercesAdmin.email") }}
                      </div>
                      <div class="col-8">
                        <input
                          min="10"
                          type="email"
                          class="form-control"
                          v-model="state.newCommerce.email"
                          v-bind:class="{ 'is-invalid': state.emailError }"
                          placeholder="name@email.com">
                      </div>
                    </div>
                    <div id="commerce-tag-form-add" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessCommercesAdmin.tag") }}
                        <Popper
                          :class="'dark p-1'"
                          arrow
                          disableClickAway
                          :content="$t('businessCommercesAdmin.tagHelp')">
                          <i class='bi bi-info-circle-fill h7'></i>
                        </Popper>
                      </div>
                      <div class="col-8">
                        <input
                          min="1"
                          max="50"
                          type="text"
                          class="form-control"
                          v-model="state.newCommerce.tag"
                          v-bind:class="{ 'is-invalid': state.tagAddError }"
                          placeholder="Brilliant Shop I">
                      </div>
                    </div>
                    <div id="commerce-logo-form-add" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessCommercesAdmin.logo") }}
                      </div>
                      <div class="col-8">
                        <input
                          min="10"
                          type="text"
                          class="form-control"
                          v-model="state.newCommerce.logo"
                          placeholder="url/logo.png">
                      </div>
                    </div>
                    <div id="commerce-category-form-add" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessCommercesAdmin.category") }}
                      </div>
                      <div class="col-8">
                        <select
                          class="btn btn-md btn-light fw-bold text-dark select"
                          v-model="state.newCommerce.category"
                          id="caterogies"
                          v-bind:class="{ 'is-invalid': state.categoryAddError }">
                          <option v-for="cat in state.categories" :key="cat" :value="cat">{{ $t(`categories.${cat}`) }}</option>
                        </select>
                      </div>
                    </div>
                    <!-- Datos de localizacion -->
                    <div class="row g-1">
                      <a
                        class="nav-link fw-bold"
                        data-bs-toggle="collapse"
                        href="#add-location">
                        {{ $t("businessCommercesAdmin.location") }} <i class="bi bi-chevron-down"></i>
                      </a>
                    </div>
                    <div id="add-location" class="collapse row m-0">
                      <div id="commerce-country-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCommercesAdmin.country") }}
                        </div>
                        <div class="col-8">
                          <input
                            min="1"
                            max="12"
                            type="text"
                            class="form-control"
                            v-model="state.newCommerce.localeInfo.country"
                            placeholder="Ex. ve, br, cl">
                        </div>
                      </div>
                      <div id="commerce-language-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCommercesAdmin.language") }}
                        </div>
                        <div class="col-8">
                          <input
                            min="1"
                            max="3"
                            type="text"
                            class="form-control"
                            v-model="state.newCommerce.localeInfo.language"
                            placeholder="Ex.: es / en / pt">
                        </div>
                      </div>
                      <div id="commerce-timezone-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCommercesAdmin.timezone") }}
                        </div>
                        <div class="col-8">
                          <input
                            min="1"
                            max="30"
                            type="text"
                            class="form-control"
                            v-model="state.newCommerce.localeInfo.timezone"
                            placeholder="Ex.: America/Caracas">
                        </div>
                      </div>
                      <div id="commerce-address-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCommercesAdmin.address") }}
                        </div>
                        <div class="col-8">
                          <input
                            min="1"
                            max="80"
                            type="text"
                            class="form-control"
                            v-model="state.newCommerce.localeInfo.address"
                            v-bind:class="{ 'is-invalid': state.addressAddError }"
                            placeholder="Street 1, Building 56, City, State">
                        </div>
                      </div>
                      <div id="commerce-addressLat-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCommercesAdmin.addressLat") }}
                        </div>
                        <div class="col-8">
                          <input
                            min="1"
                            max="10"
                            type="number"
                            class="form-control"
                            v-model="state.newCommerce.localeInfo.addressLat"
                            placeholder="Ex.: 10.65656">
                        </div>
                      </div>
                      <div id="commerce-addressLng-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCommercesAdmin.addressLng") }}
                        </div>
                        <div class="col-8">
                          <input
                            min="1"
                            max="10"
                            type="number"
                            class="form-control"
                            v-model="state.newCommerce.localeInfo.addressLng"
                            placeholder="Ex.: -10.65656">
                        </div>
                      </div>
                    </div>
                    <!-- Datos de Contacto -->
                    <div class="row g-1">
                      <a
                        class="nav-link fw-bold"
                        data-bs-toggle="collapse"
                        href="#add-contact">
                        {{ $t("businessCommercesAdmin.contact") }} <i class="bi bi-chevron-down"></i>
                      </a>
                    </div>
                    <div id="add-contact" class="collapse row m-0">
                      <div id="commerce-contact-email-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCommercesAdmin.email") }}
                        </div>
                        <div class="col-8">
                          <input
                            min="1"
                            max="30"
                            type="email"
                            class="form-control"
                            v-model="state.newCommerce.contactInfo.email"
                            placeholder="Ex.: contact@commerce.com">
                        </div>
                      </div>
                      <div id="commerce-contact-url-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCommercesAdmin.url") }}
                        </div>
                        <div class="col-8">
                          <input
                            min="1"
                            max="30"
                            type="text"
                            class="form-control"
                            v-model="state.newCommerce.contactInfo.url"
                            placeholder="Ex.: https://www.commerce.com/">
                        </div>
                      </div>
                      <div id="commerce-phone-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCommercesAdmin.phone") }}
                        </div>
                        <div class="col-8">
                          <input
                            min="10"
                            type="tel"
                            class="form-control"
                            v-model="state.newCommerce.contactInfo.phone"
                            v-bind:class="{ 'is-invalid': state.phoneAddError }"
                            placeholder="Cod. Pais + Numero">
                        </div>
                      </div>
                      <div id="commerce-contact-phone2-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCommercesAdmin.phone2") }}
                        </div>
                        <div class="col-8">
                          <input
                            min="9"
                            max="12"
                            type="tel"
                            class="form-control"
                            v-model="state.newCommerce.contactInfo.phone2"
                            placeholder="Ex.: 56233445533">
                        </div>
                      </div>
                      <div id="commerce-contact-whatsapp-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCommercesAdmin.whatsapp") }}
                        </div>
                        <div class="col-8">
                          <input
                            min="9"
                            max="12"
                            type="tel"
                            class="form-control"
                            v-model="state.newCommerce.contactInfo.whatsapp"
                            placeholder="Ex.: 56233445533">
                        </div>
                      </div>
                      <div id="commerce-contact-twitter-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCommercesAdmin.twitter") }}
                        </div>
                        <div class="col-8">
                          <input
                            min="5"
                            max="20"
                            type="text"
                            class="form-control"
                            v-model="state.newCommerce.contactInfo.twitter"
                            placeholder="Ex.: tw_commerce">
                        </div>
                      </div>
                      <div id="commerce-contact-instagram-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCommercesAdmin.instagram") }}
                        </div>
                        <div class="col-8">
                          <input
                            min="5"
                            max="20"
                            type="text"
                            class="form-control"
                            v-model="state.newCommerce.contactInfo.instagram"
                            placeholder="Ex.: ig_commerce">
                        </div>
                      </div>
                      <div id="commerce-contact-facebook-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCommercesAdmin.facebook") }}
                        </div>
                        <div class="col-8">
                          <input
                            min="5"
                            max="20"
                            type="text"
                            class="form-control"
                            v-model="state.newCommerce.contactInfo.facebook"
                            placeholder="Ex.: fb_commerce">
                        </div>
                      </div>
                    </div>
                    <!-- Datos de Servicio -->
                    <div class="row g-1">
                      <a
                        class="nav-link fw-bold"
                        data-bs-toggle="collapse"
                        href="#add-service">
                        {{ $t("businessCommercesAdmin.service") }} <i class="bi bi-chevron-down"></i>
                      </a>
                    </div>
                    <div id="add-service" class="collapse row m-0">
                      <div id="commerce-serviceUrl-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCommercesAdmin.serviceUrl") }}
                        </div>
                        <div class="col-8">
                          <input
                            min="1"
                            max="12"
                            type="text"
                            class="form-control"
                            v-model="state.newCommerce.serviceInfo.serviceUrl"
                            placeholder="Ex. https://menu.commerce.com">
                        </div>
                      </div>
                      <div id="commerce-attentionHour-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCommercesAdmin.attentionHour") }}
                        </div>
                        <div class="col-3">
                          <input
                            min="0"
                            max="24"
                            minlength="1"
                            maxlength="2"
                            type="number"
                            class="form-control"
                            v-model="state.newCommerce.serviceInfo.attentionHourFrom"
                            placeholder="Ex. 8">
                        </div>
                        <div class="col-2">
                          -
                        </div>
                        <div class="col-3">
                          <input
                            min="0"
                            max="24"
                            minlength="1"
                            maxlength="2"
                            type="number"
                            class="form-control"
                            v-model="state.newCommerce.serviceInfo.attentionHourTo"
                            placeholder="Ex. 16">
                        </div>
                      </div>
                      <div id="add-commerce-break-active-form" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCommercesAdmin.break") }}
                        </div>
                        <div class="col-8">
                          <Toggle
                            v-model="state.newCommerce.serviceInfo.break"
                            :disabled="!state.toggles['commerces.admin.edit']"
                          />
                        </div>
                      </div>
                      <div id="commerce-attentionBreak-form-add" v-if="state.newCommerce.serviceInfo.break" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCommercesAdmin.breakHour") }}
                        </div>
                        <div class="col-3">
                          <input
                            min="0"
                            max="24"
                            minlength="1"
                            maxlength="5"
                            type="number"
                            class="form-control"
                            v-model="state.newCommerce.serviceInfo.breakHourFrom"
                            placeholder="Ex. 8">
                        </div>
                        <div class="col-2">
                          -
                        </div>
                        <div class="col-3">
                          <input
                            min="0"
                            max="24"
                            minlength="1"
                            maxlength="5"
                            type="number"
                            class="form-control"
                            v-model="state.newCommerce.serviceInfo.breakHourTo"
                            placeholder="Ex. 16">
                        </div>
                      </div>
                      <div id="commerce-attentionDays-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCommercesAdmin.attentionDays") }}
                        </div>
                        <div class="col-8">
                          <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="monday"
                              :checked="dayChecked(state.newCommerce.serviceInfo, 1)"
                              @click="checkDay($event, state.newCommerce.serviceInfo, 1)">
                            <label class="form-check-label" for="monday">{{ $t("days.1") }}</label>
                          </div>
                          <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="tuesday"
                              :checked="dayChecked(state.newCommerce.serviceInfo, 2)"
                              @click="checkDay($event, state.newCommerce.serviceInfo, 2)">
                            <label class="form-check-label" for="tuesday">{{ $t("days.2") }}</label>
                          </div>
                          <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="wednesday"
                              :checked="dayChecked(state.newCommerce.serviceInfo, 3)"
                              @click="checkDay($event, state.newCommerce.serviceInfo, 3)">
                            <label class="form-check-label" for="wednesday">{{ $t("days.3") }}</label>
                          </div>
                          <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="thursday"
                              :checked="dayChecked(state.newCommerce.serviceInfo, 4)"
                              @click="checkDay($event, state.newCommerce.serviceInfo, 4)">
                            <label class="form-check-label" for="thursday">{{ $t("days.4") }}</label>
                          </div>
                          <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="friday"
                              :checked="dayChecked(state.newCommerce.serviceInfo, 5)"
                              @click="checkDay($event, state.newCommerce.serviceInfo, 5)">
                            <label class="form-check-label" for="friday">{{ $t("days.5") }}</label>
                          </div>
                          <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="sabado"
                              :checked="dayChecked(state.newCommerce.serviceInfo, 6)"
                              @click="checkDay($event, state.newCommerce.serviceInfo, 6)">
                            <label class="form-check-label" for="sabado">{{ $t("days.6") }}</label>
                          </div>
                          <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="domingo"
                              :checked="dayChecked(state.newCommerce.serviceInfo)"
                              @click="checkDay($event, state.newCommerce.serviceInfo, 7)">
                            <label class="form-check-label" for="domingo">{{ $t("days.7") }}</label>
                          </div>
                        </div>
                      </div>
                      <div id="add-commerce-personalized-active-form" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCommercesAdmin.personalized") }}
                        </div>
                        <div class="col-8">
                          <Toggle
                            v-model="state.newCommerce.serviceInfo.personalized"
                            :disabled="!state.toggles['commerces.admin.edit']"
                            @click="initializedParsonalizedHours(state.newCommerce.serviceInfo)"
                          />
                        </div>
                      </div>
                      <div id="commerce-personalized-form-add" v-if="state.newCommerce.serviceInfo.personalized" class="row g-1">
                        <div class="row g-1" v-for="day in state.newCommerce.serviceInfo.attentionDays" :key="day">
                          <div class="col-4 text-label">
                            {{ $t(`days.${day}`) }}
                          </div>
                          <div class="col-3">
                            <input
                              min="0"
                              max="24"
                              minlength="1"
                              maxlength="2"
                              type="number"
                              class="form-control"
                              v-model="state.newCommerce.serviceInfo.personalizedHours[day].attentionHourFrom"
                              placeholder="Ex. 8">
                          </div>
                          <div class="col-2">
                            -
                          </div>
                          <div class="col-3">
                            <input
                              min="0"
                              max="24"
                              minlength="1"
                              maxlength="2"
                              type="number"
                              class="form-control"
                              v-model="state.newCommerce.serviceInfo.personalizedHours[day].attentionHourTo"
                              placeholder="Ex. 16">
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="col">
                      <button
                        class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                        @click="add(state.newCommerce)">
                        {{ $t("businessCommercesAdmin.add") }} <i class="bi bi-save"></i>
                      </button>
                    </div>
                    <div class="row g-1 errors" id="feedback" v-if="(state.errorsAdd.length > 0)">
                      <Warning>
                        <template v-slot:message>
                          <li v-for="(error, index) in state.errorsAdd" :key="index">
                            {{ $t(error) }}
                          </li>
                        </template>
                      </Warning>
                    </div>
                  </div>
                </div>
                <div v-else>
                  <Message
                    :title="$t('businessCommercesAdmin.message.3.title')"
                    :content="$t('businessCommercesAdmin.message.3.content')" />
                </div>
              </div>
              <div v-for="(commerce, index) in state.commerces" :key="index" class="commerce-card">
                <div class="row">
                  <div class="col-10">
                    <CommerceName :name="commerce.name" :tag="commerce.tag" :active="commerce.active"></CommerceName>
                  </div>
                  <div class="col-2">
                    <a
                      href="#"
                      @click.prevent="showUpdateForm(index)">
                      <i :id="index" :class="`bi ${state.extendedEntity === index ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
                    </a>
                  </div>
                </div>
                <div v-if="state.toggles['commerces.admin.read']"
                  :class="{ show: state.extendedEntity === index }"
                  class="detailed-data transition-slow"
                  >
                  <div class="row g-1">
                    <div id="commerce-link-form" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessCommercesAdmin.link") }}
                      </div>
                      <div class="col-8">
                        <a class="btn copy-icon"
                          @click="copyLink(commerce)">
                          <i class="bi bi-file-earmark-spreadsheet"></i>
                        </a>
                        <a class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-2"
                            :href="`${getCommerceLink(commerce)}`"
                            target="_blank">
                          <i class="bi bi-box-arrow-up-right"></i> {{ $t("businessCommercesAdmin.go") }}
                        </a>
                      </div>
                    </div>
                    <div id="commerce-name-form-add" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessCommercesAdmin.name") }}
                      </div>
                      <div class="col-8">
                        <input
                          :disabled="true"
                          min="1"
                          max="50"
                          type="text"
                          class="form-control"
                          v-model="commerce.name"
                          placeholder="brilliant-shop-1">
                      </div>
                    </div>
                    <div id="commerce-keyName-form-add" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessCommercesAdmin.keyName") }}
                      </div>
                      <div class="col-8">
                        <input
                          :disabled="true"
                          min="1"
                          max="50"
                          type="text"
                          class="form-control"
                          v-model="commerce.keyName"
                          placeholder="brilliant-shop-1">
                      </div>
                    </div>
                    <div id="commerce-email-form-add" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessCommercesAdmin.email") }}
                      </div>
                      <div class="col-8">
                        <input
                          :disabled="true"
                          min="10"
                          type="email"
                          class="form-control"
                          v-model="commerce.email"
                          placeholder="commerce@email.com">
                      </div>
                    </div>
                    <div id="commerce-tag-form-add" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessCommercesAdmin.tag") }}
                      </div>
                      <div class="col-8">
                        <input
                          :disabled="!state.toggles['commerces.admin.edit']"
                          min="1"
                          max="50"
                          type="text"
                          class="form-control"
                          v-model="commerce.tag"
                          v-bind:class="{ 'is-invalid': state.tagUpdateError }"
                          placeholder="brilliant-1">
                      </div>
                    </div>
                    <div id="commerce-logo-form-update" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessCommercesAdmin.logo") }}
                      </div>
                      <div class="col-8">
                        <input
                          min="10"
                          type="text"
                          class="form-control"
                          v-model="commerce.logo"
                          placeholder="url/logo.png">
                      </div>
                    </div>
                    <div id="commerce-category-form-update" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessCommercesAdmin.category") }}
                      </div>
                      <div class="col-8">
                        <select
                          class="btn btn-md btn-light fw-bold text-dark select"
                          v-model="commerce.category"
                          id="caterogies">
                          <option v-for="cat in state.categories" :key="cat" :value="cat">{{ $t(`categories.${cat}`) }}</option>
                        </select>
                      </div>
                    </div>
                    <div id="commerce-active-form" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessCommercesAdmin.active") }}
                      </div>
                      <div class="col-8">
                        <Toggle
                          v-model="commerce.active"
                          :disabled="!state.toggles['commerces.admin.edit']"
                        />
                      </div>
                    </div>
                    <!-- Datos de localizacion -->
                    <div class="row g-1">
                      <a
                        class="nav-link fw-bold"
                        data-bs-toggle="collapse"
                        aria-expanded="true"
                        aria-controls="update-location"
                        href="#update-location">
                        {{ $t("businessCommercesAdmin.location") }} <i class="bi bi-chevron-down"></i>
                      </a>
                    </div>
                    <div id="update-location" class="collapse row m-0">
                      <div id="commerce-country-form-update" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCommercesAdmin.country") }}
                        </div>
                        <div class="col-8">
                          <input
                            min="1"
                            max="12"
                            type="text"
                            class="form-control"
                            v-model="commerce.localeInfo.country"
                            placeholder="Ex. ve, br, cl">
                        </div>
                      </div>
                      <div id="commerce-language-form-update" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCommercesAdmin.language") }}
                        </div>
                        <div class="col-8">
                          <input
                            min="1"
                            max="3"
                            type="text"
                            class="form-control"
                            v-model="commerce.localeInfo.language"
                            placeholder="Ex.: es / en / pt">
                        </div>
                      </div>
                      <div id="commerce-timezone-form-update" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCommercesAdmin.timezone") }}
                        </div>
                        <div class="col-8">
                          <input
                            min="1"
                            max="30"
                            type="text"
                            class="form-control"
                            v-model="commerce.localeInfo.timezone"
                            placeholder="Ex.: America/Caracas">
                        </div>
                      </div>
                      <div id="commerce-address-form-update" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCommercesAdmin.address") }}
                        </div>
                        <div class="col-8">
                          <input
                            min="1"
                            max="80"
                            type="text"
                            class="form-control"
                            v-model="commerce.localeInfo.address"
                            v-bind:class="{ 'is-invalid': state.addressAddError }"
                            placeholder="Street 1, Building 56, City, State">
                        </div>
                      </div>
                      <div id="commerce-addressLat-form-update" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCommercesAdmin.addressLat") }}
                        </div>
                        <div class="col-8">
                          <input
                            min="1"
                            max="10"
                            type="number"
                            class="form-control"
                            v-model="commerce.localeInfo.addressLat"
                            placeholder="Ex.: 10.65656">
                        </div>
                      </div>
                      <div id="commerce-addressLng-form-update" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCommercesAdmin.addressLng") }}
                        </div>
                        <div class="col-8">
                          <input
                            min="1"
                            max="10"
                            type="number"
                            class="form-control"
                            v-model="commerce.localeInfo.addressLng"
                            placeholder="Ex.: -10.65656">
                        </div>
                      </div>
                    </div>
                    <!-- Datos de Contacto -->
                    <div class="row g-1">
                      <a
                        class="nav-link fw-bold"
                        data-bs-toggle="collapse"
                        href="#update-contact">
                        {{ $t("businessCommercesAdmin.contact") }} <i class="bi bi-chevron-down"></i>
                      </a>
                    </div>
                    <div id="update-contact" class="collapse row m-0">
                      <div id="commerce-contact-email-form-update" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCommercesAdmin.email") }}
                        </div>
                        <div class="col-8">
                          <input
                            min="1"
                            max="30"
                            type="email"
                            class="form-control"
                            v-model="commerce.contactInfo.email"
                            placeholder="Ex.: contact@commerce.com">
                        </div>
                      </div>
                      <div id="commerce-contact-url-form-update" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCommercesAdmin.url") }}
                        </div>
                        <div class="col-8">
                          <input
                            min="1"
                            max="30"
                            type="text"
                            class="form-control"
                            v-model="commerce.contactInfo.url"
                            placeholder="Ex.: https://www.commerce.com/">
                        </div>
                      </div>
                      <div id="commerce-phone-form-update" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCommercesAdmin.phone") }}
                        </div>
                        <div class="col-8">
                          <input
                            min="10"
                            type="tel"
                            class="form-control"
                            v-model="commerce.contactInfo.phone"
                            v-bind:class="{ 'is-invalid': state.phoneUpdateError }"
                            placeholder="Cod. Pais + Numero">
                        </div>
                      </div>
                      <div id="commerce-contact-phone2-form-update" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCommercesAdmin.phone2") }}
                        </div>
                        <div class="col-8">
                          <input
                            min="9"
                            max="12"
                            type="tel"
                            class="form-control"
                            v-model="commerce.contactInfo.phone2"
                            placeholder="Ex.: 56233445533">
                        </div>
                      </div>
                      <div id="commerce-contact-whatsapp-form-update" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCommercesAdmin.whatsapp") }}
                        </div>
                        <div class="col-8">
                          <input
                            min="9"
                            max="12"
                            type="tel"
                            class="form-control"
                            v-model="commerce.contactInfo.whatsapp"
                            placeholder="Ex.: 56233445533">
                        </div>
                      </div>
                      <div id="commerce-contact-twitter-form-update" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCommercesAdmin.twitter") }}
                        </div>
                        <div class="col-8">
                          <input
                            min="5"
                            max="20"
                            type="text"
                            class="form-control"
                            v-model="commerce.contactInfo.twitter"
                            placeholder="Ex.: tw_commerce">
                        </div>
                      </div>
                      <div id="commerce-contact-instagram-form-update" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCommercesAdmin.instagram") }}
                        </div>
                        <div class="col-8">
                          <input
                            min="5"
                            max="20"
                            type="text"
                            class="form-control"
                            v-model="commerce.contactInfo.instagram"
                            placeholder="Ex.: ig_commerce">
                        </div>
                      </div>
                      <div id="commerce-contact-facebook-form-update" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCommercesAdmin.facebook") }}
                        </div>
                        <div class="col-8">
                          <input
                            min="5"
                            max="20"
                            type="text"
                            class="form-control"
                            v-model="commerce.contactInfo.facebook"
                            placeholder="Ex.: fb_commerce">
                        </div>
                      </div>
                    </div>
                    <!-- Datos de Servicio -->
                    <div class="row g-1">
                      <a
                        class="nav-link fw-bold"
                        data-bs-toggle="collapse"
                        href="#update-service">
                        {{ $t("businessCommercesAdmin.service") }} <i class="bi bi-chevron-down"></i>
                      </a>
                    </div>
                    <div id="update-service" class="collapse row m-0">
                      <div id="commerce-serviceUrl-form-update" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCommercesAdmin.serviceUrl") }}
                        </div>
                        <div class="col-8">
                          <input
                            min="1"
                            max="12"
                            type="text"
                            class="form-control"
                            v-model="commerce.serviceInfo.serviceUrl"
                            placeholder="Ex. https://menu.commerce.com">
                        </div>
                      </div>
                      <div id="commerce-attentionHour-form-update" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCommercesAdmin.attentionHour") }}
                        </div>
                        <div class="col-3">
                          <input
                            min="0"
                            max="24"
                            minlength="1"
                            maxlength="2"
                            type="number"
                            class="form-control"
                            v-model="commerce.serviceInfo.attentionHourFrom"
                            placeholder="Ex. 8">
                        </div>
                        <div class="col-2">
                          -
                        </div>
                        <div class="col-3">
                          <input
                            min="0"
                            max="24"
                            minlength="1"
                            maxlength="2"
                            type="number"
                            class="form-control"
                            v-model="commerce.serviceInfo.attentionHourTo"
                            placeholder="Ex. 16">
                        </div>
                      </div>
                      <div id="add-commerce-break-active-form" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCommercesAdmin.break") }}
                        </div>
                        <div class="col-8">
                          <Toggle
                            v-model="commerce.serviceInfo.break"
                            :disabled="!state.toggles['commerces.admin.edit']"
                          />
                        </div>
                      </div>
                      <div id="commerce-attentionBreak-form-add" v-if="commerce.serviceInfo.break" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCommercesAdmin.breakHour") }}
                        </div>
                        <div class="col-3">
                          <input
                            min="0"
                            max="24"
                            minlength="1"
                            maxlength="5"
                            type="number"
                            class="form-control"
                            v-model="commerce.serviceInfo.breakHourFrom"
                            placeholder="Ex. 8">
                        </div>
                        <div class="col-2">
                          -
                        </div>
                        <div class="col-3">
                          <input
                            min="0"
                            max="24"
                            minlength="1"
                            maxlength="5"
                            type="number"
                            class="form-control"
                            v-model="commerce.serviceInfo.breakHourTo"
                            placeholder="Ex. 16">
                        </div>
                      </div>
                      <div id="commerce-attentionDays-form-update" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessCommercesAdmin.attentionDays") }}
                        </div>
                        <div class="col-8">
                          <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="monday"
                              :checked="dayChecked(commerce.serviceInfo, 1)"
                              @click="checkDay($event, commerce.serviceInfo, 1)">
                            <label class="form-check-label" for="monday">{{ $t("days.1") }}</label>
                          </div>
                          <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="tuesday"
                              :checked="dayChecked(commerce.serviceInfo, 2)"
                              @click="checkDay($event, commerce.serviceInfo, 2)">
                            <label class="form-check-label" for="tuesday">{{ $t("days.2") }}</label>
                          </div>
                          <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="wednesday"
                              :checked="dayChecked(commerce.serviceInfo, 3)"
                              @click="checkDay($event, commerce.serviceInfo, 3)">
                            <label class="form-check-label" for="wednesday">{{ $t("days.3") }}</label>
                          </div>
                          <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="thursday"
                              :checked="dayChecked(commerce.serviceInfo, 4)"
                              @click="checkDay($event, commerce.serviceInfo, 4)">
                            <label class="form-check-label" for="thursday">{{ $t("days.4") }}</label>
                          </div>
                          <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="friday"
                              :checked="dayChecked(commerce.serviceInfo, 5)"
                              @click="checkDay($event, commerce.serviceInfo, 5)">
                            <label class="form-check-label" for="friday">{{ $t("days.5") }}</label>
                          </div>
                          <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="sabado"
                              :checked="dayChecked(commerce.serviceInfo, 6)"
                              @click="checkDay($event, commerce.serviceInfo, 6)">
                            <label class="form-check-label" for="sabado">{{ $t("days.6") }}</label>
                          </div>
                          <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="domingo"
                              :checked="dayChecked(commerce.serviceInfo, 7)"
                              @click="checkDay($event, commerce.serviceInfo, 7)">
                            <label class="form-check-label" for="domingo">{{ $t("days.7") }}</label>
                          </div>
                        </div>
                      </div>
                      <div id="update-commerce-personalized-active-form" class="row g-1">
                            <div class="col-4 text-label">
                              {{ $t("businessCommercesAdmin.personalized") }}
                            </div>
                            <div class="col-8">
                              <Toggle
                                v-model="commerce.serviceInfo.personalized"
                                :disabled="!state.toggles['commerces.admin.edit']"
                                @click="initializedParsonalizedHours(commerce.serviceInfo)"
                              />
                            </div>
                      </div>
                      <div id="commerce-personalized-form-update" v-if="commerce.serviceInfo.personalized" class="row g-1">
                        <div class="row g-1" v-for="day in commerce.serviceInfo.attentionDays" :key="day">
                          <div class="col-4 text-label">
                            {{ $t(`days.${day}`) }}
                          </div>
                          <div class="col-3">
                            <input
                              min="0"
                              max="24"
                              minlength="1"
                              maxlength="2"
                              type="number"
                              class="form-control"
                              v-model="commerce.serviceInfo.personalizedHours[day].attentionHourFrom"
                              placeholder="Ex. 8">
                          </div>
                          <div class="col-2">
                            -
                          </div>
                          <div class="col-3">
                            <input
                              min="0"
                              max="24"
                              minlength="1"
                              maxlength="2"
                              type="number"
                              class="form-control"
                              v-model="commerce.serviceInfo.personalizedHours[day].attentionHourTo"
                              placeholder="Ex. 16">
                          </div>
                        </div>
                      </div>
                    </div>
                    <div id="commerce-id-form" class="row -2 mb-g3">
                      <div class="row commerce-details-container">
                        <div class="col">
                          <span><strong>Id:</strong> {{ commerce.id }}</span>
                        </div>
                      </div>
                    </div>
                    <div class="col">
                      <button
                        class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                        @click="update(commerce)"
                        :disabled="!state.toggles['commerces.admin.update']">
                        {{ $t("businessCommercesAdmin.update") }} <i class="bi bi-save"></i>
                      </button>
                      <button
                        class="btn btn-lg btn-size fw-bold btn-danger rounded-pill mt-2 px-4"
                        @click="goToUnavailable()"
                        v-if="state.toggles['commerces.admin.unavailable']">
                        {{ $t("businessQueuesAdmin.unavailable") }} <i class="bi bi-trash-fill"></i>
                      </button>
                      <AreYouSure
                        :show="state.goToUnavailable"
                        :yesDisabled="state.toggles['commerces.admin.unavailable']"
                        :noDisabled="state.toggles['commerces.admin.unavailable']"
                        @actionYes="unavailable(commerce)"
                        @actionNo="unavailableCancel()"
                      >
                      </AreYouSure>
                    </div>
                    <div class="row g-1 errors" id="feedback" v-if="(state.errorsUpdate.length > 0)">
                      <Warning>
                        <template v-slot:message>
                          <li v-for="(error, index) in state.errorsUpdate" :key="index">
                            {{ $t(error) }}
                          </li>
                        </template>
                      </Warning>
                    </div>
                  </div>
                </div>
                <div v-if="(!isActiveBusiness() || !state.toggles['commerces.admin.read']) && !loading">
                  <Message
                    :title="$t('businessCommercesAdmin.message.1.title')"
                    :content="$t('businessCommercesAdmin.message.1.content')" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="(!isActiveBusiness() || !state.toggles['commerces.admin.view']) && !loading">
          <Message
            :title="$t('businessCommercesAdmin.message.1.title')"
            :content="$t('businessCommercesAdmin.message.1.content')" />
        </div>
      </div>
    </div>
    <PoweredBy :name="state.business.name" />
  </div>
</template>

<style scoped>
.select {
  border-radius: .5rem;
  border: 1.5px solid var(--gris-clear);
}
.text-label {
  line-height: 1.2rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
.commerce-card {
  background-color: var(--color-background);
  padding: .5rem;
  margin-bottom: 1rem;
  border-radius: .5rem;
  border: .5px solid var(--gris-default);
  align-items: left;
}
.commerce-details-container {
  font-size: .8rem;
  margin-left: .5rem;
  margin-right: .5rem;
  margin-top: .5rem;
  margin-bottom: 0;
}
.is-disabled {
  opacity: 0.5;
}
.show {
  padding: 10px;
  max-height: 2000px !important;
  overflow-y: visible;
}
.errors {
  font-size: small;
  color: var(--rojo-warning);
}
</style>