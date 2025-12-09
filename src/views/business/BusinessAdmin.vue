<script>
import { ref, reactive, onBeforeMount } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getBusinesses, updateBusiness, addBusiness } from '../../application/services/business';
import { getPermissions } from '../../application/services/permissions';
import Popper from 'vue3-popper';
import CommerceName from '../../components/common/CommerceName.vue';
import Toggle from '@vueform/toggle';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import SearchBar from '../../components/common/SearchBar.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';

export default {
  name: 'BusinessAdmin',
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    CommerceName,
    Toggle,
    Warning,
    Popper,
    SearchBar,
    ComponentMenu,
  },
  async setup() {
    const router = useRouter();
    const store = globalStore();

    const loading = ref(false);
    const alertError = ref('');

    const state = reactive({
      currentUser: {},
      business: {},
      activeBusiness: false,
      businesses: ref({}),
      modules: ref({}),
      showAdd: false,
      newBusiness: {},
      extendedEntity: undefined,
      errorsAdd: [],
      errorsUpdate: [],
      nameError: false,
      keyNameError: false,
      tagAddError: false,
      tagUpdateError: false,
      phoneAddError: false,
      phoneUpdateError: false,
      urlAddError: false,
      urlUpdateError: false,
      emailError: false,
      addressAddError: false,
      categoryAddError: false,
      countryAddError: false,
      countryUpdateError: false,
      categories: [
        'beauty',
        'entertaiment',
        'health',
        'shop',
        'pharmacy',
        'services',
        'restaurant',
        'supermarket',
      ],
      toggles: {},
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.businesses = await getBusinesses();
        state.business = {};
        store.setCurrentBusiness(state.business);
        state.toggles = await getPermissions('businesses', 'admin');
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    });

    const goBack = () => {
      router.back();
    };

    const validateAdd = business => {
      state.errorsAdd = [];
      if (!business.name || business.name.length === 0) {
        state.nameError = true;
        state.errorsAdd.push('businessAdmin.validate.name');
      } else {
        state.nameError = false;
      }
      if (!business.keyName || business.keyName.length === 0) {
        state.keyNameError = true;
        state.errorsAdd.push('businessAdmin.validate.keyName');
      } else {
        state.keyNameError = false;
      }
      if (!business.email || business.email.length < 10) {
        state.emailError = true;
        state.errorsAdd.push('businessAdmin.validate.email');
      } else {
        state.emailError = false;
      }
      if (!business.category || business.category.length === 0) {
        state.categoryAddError = true;
        state.errorsAdd.push('businessAdmin.validate.category');
      } else {
        state.categoryAddError = false;
      }
      if (!business.contactInfo.phone || business.contactInfo.phone.length < 10) {
        state.phoneAddError = true;
        state.errorsAdd.push('businessAdmin.validate.phone');
      } else {
        state.phoneAddError = false;
      }
      if (!business.localeInfo.country || business.localeInfo.country.length === 0) {
        state.countryAddError = true;
        state.errorsAdd.push('businessAdmin.validate.country');
      } else {
        state.countryAddError = false;
      }
      if (!business.localeInfo.address || business.localeInfo.address.length < 10) {
        state.addressAddError = true;
        state.errorsAdd.push('businessAdmin.validate.address');
      } else {
        state.addressAddError = false;
      }
      if (state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    };

    const validateUpdate = business => {
      state.errorsUpdate = [];
      if (!business.phone || business.phone.length < 10) {
        state.phoneUpdateError = true;
        state.errorsUpdate.push('businessAdmin.validate.phone');
      } else {
        state.phoneUpdateError = false;
      }
      if (state.errorsUpdate.length === 0) {
        return true;
      }
      return false;
    };

    const update = async business => {
      try {
        loading.value = true;
        if (validateUpdate(business)) {
          await updateBusiness(business.id, business);
          state.businesses = await getBusinesses();
          state.extendedEntity = undefined;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const showAdd = () => {
      state.showAdd = !state.showAdd;
      state.newBusiness = {
        localeInfo: {},
        contactInfo: {},
        serviceInfo: {
          break: false,
          personalized: false,
          personalizedHours: {},
          holiday: false,
          holidays: {},
        },
      };
    };

    const add = async () => {
      try {
        loading.value = true;
        if (validateAdd(state.newBusiness)) {
          const business = await addBusiness(state.newBusiness);
          state.business = business;
          state.businesses = await getBusinesses();
          state.showAdd = false;
          state.newBusiness = {};
        }
        state.extendedEntity = undefined;
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const showUpdateForm = index => {
      state.extendedEntity = state.extendedEntity !== index ? index : undefined;
    };

    const selectBusiness = business => {
      state.business = business;
      state.currentUser.businessId = business.id;
      store.setCurrentBusiness(state.business);
    };

    const closeBusiness = () => {
      state.business = {};
      state.currentUser.businessId = undefined;
      store.setCurrentBusiness({});
    };

    const dayChecked = (serviceInfo, day) => {
      if (serviceInfo && serviceInfo.attentionDays) {
        return serviceInfo.attentionDays.includes(day);
      }
      return false;
    };

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
            attentionHourTo: serviceInfo.attentionHourTo,
          };
        }
      }
    };

    const initializedParsonalizedHours = serviceInfo => {
      if (serviceInfo.personalized === true) {
        if (!serviceInfo.personalizedHours) {
          serviceInfo.personalizedHours = {};
        }
        if (serviceInfo.attentionDays && serviceInfo.attentionDays.length > 0) {
          serviceInfo.attentionDays.forEach(day => {
            serviceInfo.personalizedHours[day] = {
              attentionHourFrom: serviceInfo.attentionHourFrom,
              attentionHourTo: serviceInfo.attentionHourTo,
            };
          });
        }
      }
    };

    return {
      state,
      loading,
      alertError,
      showUpdateForm,
      update,
      showAdd,
      add,
      goBack,
      dayChecked,
      checkDay,
      selectBusiness,
      closeBusiness,
      initializedParsonalizedHours,
    };
  },
};
</script>

<template>
  <div>
    <!-- Mobile/Tablet Layout -->
    <div class="d-block d-lg-none">
      <div class="content text-center">
        <CommerceLogo></CommerceLogo>
        <ComponentMenu
          :title="$t(`businessAdmin.title`)"
          :toggles="state.toggles"
          component-name="businessAdmin"
          @goBack="goBack"
        >
        </ComponentMenu>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <div id="businessAdmin">
          <div v-if="state.toggles['businesses.admin.view']">
            <div v-if="!loading" id="businessAdmin-result" class="mt-4">
              <div>
                <div v-if="state.businesses.length === 0">
                  <Message
                    :title="$t('businessAdmin.message.2.title')"
                    :content="$t('businessAdmin.message.2.content')"
                  />
                </div>
                <div class="row mb-2">
                  <div class="col-8 text-label">
                    <span>{{ $t('businessAdmin.listResult') }}</span>
                    <span class="fw-bold m-2">{{ state.businesses.length }}</span>
                  </div>
                  <div class="col-4">
                    <button
                      class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-4"
                      @click="showAdd(business)"
                      :disabled="!state.toggles['businesses.admin.add']"
                    >
                      <i class="bi bi-plus-lg"></i>
                    </button>
                  </div>
                </div>
                <div
                  id="add-business"
                  class="business-card mb-4"
                  v-if="state.showAdd && state.toggles['businesses.admin.add']"
                >
                  <div v-if="state.businesses.length < state.toggles['businesses.admin.limit']">
                    <div class="row g-1">
                      <div id="business-name-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t('businessAdmin.name') }}
                        </div>
                        <div class="col-8">
                          <input
                            min="1"
                            max="50"
                            type="text"
                            class="form-control"
                            v-model="state.newBusiness.name"
                            v-bind:class="{ 'is-invalid': state.nameError }"
                            placeholder="brilliant-shop-1"
                          />
                        </div>
                      </div>
                      <div id="business-keyName-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t('businessAdmin.keyName') }}
                          <Popper
                            :class="'dark p-1'"
                            arrow
                            disable-click-away
                            :content="$t('businessAdmin.keyNameHelp')"
                          >
                            <i class="bi bi-info-circle-fill h7"></i>
                          </Popper>
                        </div>
                        <div class="col-8">
                          <input
                            min="1"
                            max="50"
                            type="text"
                            class="form-control"
                            v-model="state.newBusiness.keyName"
                            v-bind:class="{ 'is-invalid': state.keyNameError }"
                            placeholder="brilliant-shop-1"
                          />
                        </div>
                      </div>
                      <div id="business-email-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t('businessAdmin.email') }}
                        </div>
                        <div class="col-8">
                          <input
                            min="10"
                            type="email"
                            class="form-control"
                            v-model="state.newBusiness.email"
                            v-bind:class="{ 'is-invalid': state.emailError }"
                            placeholder="name@email.com"
                          />
                        </div>
                      </div>
                      <div id="business-logo-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t('businessAdmin.logo') }}
                        </div>
                        <div class="col-8">
                          <input
                            min="10"
                            type="text"
                            class="form-control"
                            v-model="state.newBusiness.logo"
                            placeholder="url/image.png"
                          />
                        </div>
                      </div>
                      <div id="business-category-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t('businessAdmin.category') }}
                        </div>
                        <div class="col-8">
                          <select
                            class="btn btn-md btn-light fw-bold text-dark select"
                            v-model="state.newBusiness.category"
                            id="caterogies"
                            v-bind:class="{ 'is-invalid': state.categoryAddError }"
                          >
                            <option v-for="cat in state.categories" :key="cat" :value="cat">
                              {{ $t(`categories.${cat}`) }}
                            </option>
                          </select>
                        </div>
                      </div>
                      <!-- Datos de localizacion -->
                      <div class="row g-1">
                        <a class="nav-link fw-bold" data-bs-toggle="collapse" href="#add-location">
                          {{ $t('businessAdmin.location') }} <i class="bi bi-chevron-down"></i>
                        </a>
                      </div>
                      <div id="add-location" class="collapse row m-0">
                        <div id="business-country-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.country') }}
                          </div>
                          <div class="col-8">
                            <input
                              min="1"
                              max="12"
                              type="text"
                              class="form-control"
                              v-model="state.newBusiness.localeInfo.country"
                              v-bind:class="{ 'is-invalid': state.countryAddError }"
                              placeholder="Ex. ve, br, cl"
                            />
                          </div>
                        </div>
                        <div id="business-language-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.language') }}
                          </div>
                          <div class="col-8">
                            <input
                              min="1"
                              max="3"
                              type="text"
                              class="form-control"
                              v-model="state.newBusiness.localeInfo.language"
                              placeholder="Ex.: es / en / pt"
                            />
                          </div>
                        </div>
                        <div id="business-timezone-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.timezone') }}
                          </div>
                          <div class="col-8">
                            <input
                              min="1"
                              max="30"
                              type="text"
                              class="form-control"
                              v-model="state.newBusiness.localeInfo.timezone"
                              placeholder="Ex.: America/Caracas"
                            />
                          </div>
                        </div>
                        <div id="business-address-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.address') }}
                          </div>
                          <div class="col-8">
                            <input
                              min="1"
                              max="80"
                              type="text"
                              class="form-control"
                              v-model="state.newBusiness.localeInfo.address"
                              v-bind:class="{ 'is-invalid': state.addressAddError }"
                              placeholder="Street 1, Building 56, City, State"
                            />
                          </div>
                        </div>
                        <div id="business-addressLat-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.addressLat') }}
                          </div>
                          <div class="col-8">
                            <input
                              min="1"
                              max="10"
                              type="number"
                              class="form-control"
                              v-model="state.newBusiness.localeInfo.addressLat"
                              placeholder="Ex.: 10.65656"
                            />
                          </div>
                        </div>
                        <div id="business-addressLng-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.addressLng') }}
                          </div>
                          <div class="col-8">
                            <input
                              min="1"
                              max="10"
                              type="number"
                              class="form-control"
                              v-model="state.newBusiness.localeInfo.addressLng"
                              placeholder="Ex.: -10.65656"
                            />
                          </div>
                        </div>
                      </div>
                      <!-- Datos de Contacto -->
                      <div class="row g-1">
                        <a class="nav-link fw-bold" data-bs-toggle="collapse" href="#add-contact">
                          {{ $t('businessAdmin.contact') }} <i class="bi bi-chevron-down"></i>
                        </a>
                      </div>
                      <div id="add-contact" class="collapse row m-0">
                        <div id="business-contact-email-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.email') }}
                          </div>
                          <div class="col-8">
                            <input
                              min="1"
                              max="30"
                              type="email"
                              class="form-control"
                              v-model="state.newBusiness.contactInfo.email"
                              placeholder="Ex.: contact@business.com"
                            />
                          </div>
                        </div>
                        <div id="business-contact-url-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.url') }}
                          </div>
                          <div class="col-8">
                            <input
                              min="1"
                              max="30"
                              type="text"
                              class="form-control"
                              v-model="state.newBusiness.contactInfo.url"
                              placeholder="Ex.: https://www.business.com/"
                            />
                          </div>
                        </div>
                        <div id="business-phone-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.phone') }}
                          </div>
                          <div class="col-8">
                            <input
                              min="10"
                              type="tel"
                              class="form-control"
                              v-model="state.newBusiness.contactInfo.phone"
                              v-bind:class="{ 'is-invalid': state.phoneAddError }"
                              placeholder="Cod. Pais + Numero"
                            />
                          </div>
                        </div>
                        <div id="business-contact-phone2-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.phone2') }}
                          </div>
                          <div class="col-8">
                            <input
                              min="9"
                              max="12"
                              type="tel"
                              class="form-control"
                              v-model="state.newBusiness.contactInfo.phone2"
                              placeholder="Ex.: 56233445533"
                            />
                          </div>
                        </div>
                        <div id="business-contact-whatsapp-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.whatsapp') }}
                          </div>
                          <div class="col-8">
                            <input
                              min="9"
                              max="12"
                              type="tel"
                              class="form-control"
                              v-model="state.newBusiness.contactInfo.whatsapp"
                              placeholder="Ex.: 56233445533"
                            />
                          </div>
                        </div>
                        <div id="business-contact-twitter-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.twitter') }}
                          </div>
                          <div class="col-8">
                            <input
                              min="5"
                              max="20"
                              type="text"
                              class="form-control"
                              v-model="state.newBusiness.contactInfo.twitter"
                              placeholder="Ex.: tw_business"
                            />
                          </div>
                        </div>
                        <div id="business-contact-instagram-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.instagram') }}
                          </div>
                          <div class="col-8">
                            <input
                              min="5"
                              max="20"
                              type="text"
                              class="form-control"
                              v-model="state.newBusiness.contactInfo.instagram"
                              placeholder="Ex.: ig_business"
                            />
                          </div>
                        </div>
                        <div id="business-contact-facebook-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.facebook') }}
                          </div>
                          <div class="col-8">
                            <input
                              min="5"
                              max="20"
                              type="text"
                              class="form-control"
                              v-model="state.newBusiness.contactInfo.facebook"
                              placeholder="Ex.: fb_business"
                            />
                          </div>
                        </div>
                      </div>
                      <!-- Datos de Servicio -->
                      <div class="row g-1">
                        <a class="nav-link fw-bold" data-bs-toggle="collapse" href="#add-service">
                          {{ $t('businessAdmin.service') }} <i class="bi bi-chevron-down"></i>
                        </a>
                      </div>
                      <div id="add-service" class="collapse row m-0">
                        <div id="business-serviceUrl-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.serviceUrl') }}
                          </div>
                          <div class="col-8">
                            <input
                              min="1"
                              max="12"
                              type="text"
                              class="form-control"
                              v-model="state.newBusiness.serviceInfo.serviceUrl"
                              placeholder="Ex. https://menu.business.com"
                            />
                          </div>
                        </div>
                        <div id="business-attentionHour-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.attentionHour') }}
                          </div>
                          <div class="col-3">
                            <input
                              min="0"
                              max="24"
                              minlength="1"
                              maxlength="2"
                              type="number"
                              class="form-control"
                              v-model="state.newBusiness.serviceInfo.attentionHourFrom"
                              placeholder="Ex. 8"
                            />
                          </div>
                          <div class="col-2">-</div>
                          <div class="col-3">
                            <input
                              min="0"
                              max="24"
                              minlength="1"
                              maxlength="2"
                              type="number"
                              class="form-control"
                              v-model="state.newBusiness.serviceInfo.attentionHourTo"
                              placeholder="Ex. 16"
                            />
                          </div>
                        </div>
                        <div id="add-business-break-active-form" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessCommercesAdmin.break') }}
                          </div>
                          <div class="col-8">
                            <Toggle
                              v-model="state.newBusiness.serviceInfo.break"
                              :disabled="!state.toggles['businesses.admin.edit']"
                            />
                          </div>
                        </div>
                        <div
                          id="business-attentionBreak-form-add"
                          v-if="state.newBusiness.serviceInfo.break"
                          class="row g-1"
                        >
                          <div class="col-4 text-label">
                            {{ $t('businessCommercesAdmin.breakHour') }}
                          </div>
                          <div class="col-3">
                            <input
                              min="0"
                              max="24"
                              minlength="1"
                              maxlength="5"
                              type="number"
                              class="form-control"
                              v-model="state.newBusiness.serviceInfo.breakHourFrom"
                              placeholder="Ex. 8"
                            />
                          </div>
                          <div class="col-2">-</div>
                          <div class="col-3">
                            <input
                              min="0"
                              max="24"
                              minlength="1"
                              maxlength="5"
                              type="number"
                              class="form-control"
                              v-model="state.newBusiness.serviceInfo.breakHourTo"
                              placeholder="Ex. 16"
                            />
                          </div>
                        </div>
                        <div id="business-attentionDays-form-add" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.attentionDays') }}
                          </div>
                          <div class="col-8">
                            <div class="form-check form-switch">
                              <input
                                class="form-check-input"
                                type="checkbox"
                                id="monday"
                                :checked="dayChecked(state.newBusiness.serviceInfo, 1)"
                                @click="checkDay($event, state.newBusiness.serviceInfo, 1)"
                              />
                              <label class="form-check-label" for="monday">{{
                                $t('days.1')
                              }}</label>
                            </div>
                            <div class="form-check form-switch">
                              <input
                                class="form-check-input"
                                type="checkbox"
                                id="tuesday"
                                :checked="dayChecked(state.newBusiness.serviceInfo, 2)"
                                @click="checkDay($event, state.newBusiness.serviceInfo, 2)"
                              />
                              <label class="form-check-label" for="tuesday">{{
                                $t('days.2')
                              }}</label>
                            </div>
                            <div class="form-check form-switch">
                              <input
                                class="form-check-input"
                                type="checkbox"
                                id="wednesday"
                                :checked="dayChecked(state.newBusiness.serviceInfo, 3)"
                                @click="checkDay($event, state.newBusiness.serviceInfo, 3)"
                              />
                              <label class="form-check-label" for="wednesday">{{
                                $t('days.3')
                              }}</label>
                            </div>
                            <div class="form-check form-switch">
                              <input
                                class="form-check-input"
                                type="checkbox"
                                id="thursday"
                                :checked="dayChecked(state.newBusiness.serviceInfo, 4)"
                                @click="checkDay($event, state.newBusiness.serviceInfo, 4)"
                              />
                              <label class="form-check-label" for="thursday">{{
                                $t('days.4')
                              }}</label>
                            </div>
                            <div class="form-check form-switch">
                              <input
                                class="form-check-input"
                                type="checkbox"
                                id="friday"
                                :checked="dayChecked(state.newBusiness.serviceInfo, 5)"
                                @click="checkDay($event, state.newBusiness.serviceInfo, 5)"
                              />
                              <label class="form-check-label" for="friday">{{
                                $t('days.5')
                              }}</label>
                            </div>
                            <div class="form-check form-switch">
                              <input
                                class="form-check-input"
                                type="checkbox"
                                id="sabado"
                                :checked="dayChecked(state.newBusiness.serviceInfo, 6)"
                                @click="checkDay($event, state.newBusiness.serviceInfo, 6)"
                              />
                              <label class="form-check-label" for="sabado">{{
                                $t('days.6')
                              }}</label>
                            </div>
                            <div class="form-check form-switch">
                              <input
                                class="form-check-input"
                                type="checkbox"
                                id="domingo"
                                :checked="dayChecked(state.newBusiness.serviceInfo)"
                                @click="checkDay($event, state.newBusiness.serviceInfo, 7)"
                              />
                              <label class="form-check-label" for="domingo">{{
                                $t('days.7')
                              }}</label>
                            </div>
                          </div>
                        </div>
                        <div id="add-business-personalized-active-form" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessCommercesAdmin.personalized') }}
                          </div>
                          <div class="col-8">
                            <Toggle
                              v-model="state.newBusiness.serviceInfo.personalized"
                              :disabled="!state.toggles['businesses.admin.edit']"
                              @click="initializedParsonalizedHours(state.newBusiness.serviceInfo)"
                            />
                          </div>
                        </div>
                        <div
                          id="business-personalized-form-add"
                          v-if="state.newBusiness.serviceInfo.personalized"
                          class="row g-1"
                        >
                          <div
                            class="row g-1"
                            v-for="day in state.newBusiness.serviceInfo.attentionDays"
                            :key="day"
                          >
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
                                v-model="
                                  state.newBusiness.serviceInfo.personalizedHours[day]
                                    .attentionHourFrom
                                "
                                placeholder="Ex. 8"
                              />
                            </div>
                            <div class="col-2">-</div>
                            <div class="col-3">
                              <input
                                min="0"
                                max="24"
                                minlength="1"
                                maxlength="2"
                                type="number"
                                class="form-control"
                                v-model="
                                  state.newBusiness.serviceInfo.personalizedHours[day]
                                    .attentionHourTo
                                "
                                placeholder="Ex. 16"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                      <div class="col">
                        <button
                          class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                          @click="add(state.newBusiness)"
                        >
                          {{ $t('businessAdmin.add') }} <i class="bi bi-save"></i>
                        </button>
                      </div>
                      <div class="row g-1 errors" id="feedback" v-if="state.errorsAdd.length > 0">
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
                      :title="$t('businessAdmin.message.3.title')"
                      :content="$t('businessAdmin.message.3.content')"
                    />
                  </div>
                </div>
                <div id="searcher" class="mx-3">
                  <SearchBar
                    :list="state.businesses"
                    :label="$t('masterMenu.business')"
                    @selectItem="selectBusiness"
                  >
                  </SearchBar>
                </div>
                <div class="business-admin">
                  <div v-if="state.business.id" class="card mt-1 mb-3">
                    <div class="row d-flex m-1 business-title">
                      <div class="col-4">
                        <img
                          :src="state.business.logo"
                          class="img-thumbnail rounded-start item-image"
                        />
                      </div>
                      <div class="col-7">
                        <span class="item-title fw-bold"> {{ state.business.name }} </span>
                      </div>
                      <button
                        type="button"
                        class="btn-close"
                        aria-label="Close"
                        @click="closeBusiness()"
                      ></button>
                    </div>
                    <div id="business-update" class="my-2">
                      <div
                        v-if="state.toggles['businesses.admin.read']"
                        :class="{ show: state.extendedEntity === undefined }"
                        class="detailed-data transition-slow"
                      >
                        <div class="row g-1">
                          <div id="business-name-form-update" class="row g-1">
                            <div class="col-4 text-label">
                              {{ $t('businessAdmin.name') }}
                            </div>
                            <div class="col-8">
                              <input
                                :disabled="true"
                                min="1"
                                max="50"
                                type="text"
                                class="form-control"
                                v-model="state.business.name"
                                placeholder="brilliant-shop-1"
                              />
                            </div>
                          </div>
                          <div id="business-keyName-form-update" class="row g-1">
                            <div class="col-4 text-label">
                              {{ $t('businessAdmin.keyName') }}
                            </div>
                            <div class="col-8">
                              <input
                                :disabled="true"
                                min="1"
                                max="50"
                                type="text"
                                class="form-control"
                                v-model="state.business.keyName"
                                placeholder="brilliant-shop-1"
                              />
                            </div>
                          </div>
                          <div id="business-email-form-update" class="row g-1">
                            <div class="col-4 text-label">
                              {{ $t('businessAdmin.email') }}
                            </div>
                            <div class="col-8">
                              <input
                                :disabled="true"
                                min="10"
                                type="email"
                                class="form-control"
                                v-model="state.business.email"
                                placeholder="business@email.com"
                              />
                            </div>
                          </div>
                          <div id="business-logo-form-update" class="row g-1">
                            <div class="col-4 text-label">
                              {{ $t('businessAdmin.logo') }}
                            </div>
                            <div class="col-8">
                              <input
                                min="10"
                                type="text"
                                class="form-control"
                                v-model="state.business.logo"
                                placeholder="url/logo.png"
                              />
                            </div>
                          </div>
                          <div id="business-category-form-update" class="row g-1">
                            <div class="col-4 text-label">
                              {{ $t('businessAdmin.category') }}
                            </div>
                            <div class="col-8">
                              <select
                                class="btn btn-md btn-light fw-bold text-dark select"
                                v-model="state.business.category"
                                id="caterogies"
                              >
                                <option v-for="cat in state.categories" :key="cat" :value="cat">
                                  {{ $t(`categories.${cat}`) }}
                                </option>
                              </select>
                            </div>
                          </div>
                          <div id="business-active-form" class="row g-1">
                            <div class="col-4 text-label">
                              {{ $t('businessCommercesAdmin.active') }}
                            </div>
                            <div class="col-8">
                              <Toggle
                                v-model="state.business.active"
                                :disabled="!state.toggles['businesses.admin.edit']"
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
                              href="#update-location"
                            >
                              {{ $t('businessCommercesAdmin.location') }}
                              <i class="bi bi-chevron-down"></i>
                            </a>
                          </div>
                          <div id="update-location" class="collapse row m-0">
                            <div id="business-country-form-update" class="row g-1">
                              <div class="col-4 text-label">
                                {{ $t('businessCommercesAdmin.country') }}
                              </div>
                              <div class="col-8">
                                <input
                                  min="1"
                                  max="12"
                                  type="text"
                                  class="form-control"
                                  v-model="state.business.localeInfo.country"
                                  v-bind:class="{ 'is-invalid': state.countryUpdateError }"
                                  placeholder="Ex. ve, br, cl"
                                />
                              </div>
                            </div>
                            <div id="business-language-form-update" class="row g-1">
                              <div class="col-4 text-label">
                                {{ $t('businessCommercesAdmin.language') }}
                              </div>
                              <div class="col-8">
                                <input
                                  min="1"
                                  max="3"
                                  type="text"
                                  class="form-control"
                                  v-model="state.business.localeInfo.language"
                                  placeholder="Ex.: es / en / pt"
                                />
                              </div>
                            </div>
                            <div id="business-timezone-form-update" class="row g-1">
                              <div class="col-4 text-label">
                                {{ $t('businessCommercesAdmin.timezone') }}
                              </div>
                              <div class="col-8">
                                <input
                                  min="1"
                                  max="30"
                                  type="text"
                                  class="form-control"
                                  v-model="state.business.localeInfo.timezone"
                                  placeholder="Ex.: America/Caracas"
                                />
                              </div>
                            </div>
                            <div id="business-address-form-update" class="row g-1">
                              <div class="col-4 text-label">
                                {{ $t('businessCommercesAdmin.address') }}
                              </div>
                              <div class="col-8">
                                <input
                                  min="1"
                                  max="80"
                                  type="text"
                                  class="form-control"
                                  v-model="state.business.localeInfo.address"
                                  v-bind:class="{ 'is-invalid': state.addressAddError }"
                                  placeholder="Street 1, Building 56, City, State"
                                />
                              </div>
                            </div>
                            <div id="business-addressLat-form-update" class="row g-1">
                              <div class="col-4 text-label">
                                {{ $t('businessCommercesAdmin.addressLat') }}
                              </div>
                              <div class="col-8">
                                <input
                                  min="1"
                                  max="10"
                                  type="number"
                                  class="form-control"
                                  v-model="state.business.localeInfo.addressLat"
                                  placeholder="Ex.: 10.65656"
                                />
                              </div>
                            </div>
                            <div id="business-addressLng-form-update" class="row g-1">
                              <div class="col-4 text-label">
                                {{ $t('businessCommercesAdmin.addressLng') }}
                              </div>
                              <div class="col-8">
                                <input
                                  min="1"
                                  max="10"
                                  type="number"
                                  class="form-control"
                                  v-model="state.business.localeInfo.addressLng"
                                  placeholder="Ex.: -10.65656"
                                />
                              </div>
                            </div>
                          </div>
                          <!-- Datos de Contacto -->
                          <div class="row g-1">
                            <a
                              class="nav-link fw-bold"
                              data-bs-toggle="collapse"
                              href="#update-contact"
                            >
                              {{ $t('businessCommercesAdmin.contact') }}
                              <i class="bi bi-chevron-down"></i>
                            </a>
                          </div>
                          <div id="update-contact" class="collapse row m-0">
                            <div id="business-contact-email-form-update" class="row g-1">
                              <div class="col-4 text-label">
                                {{ $t('businessCommercesAdmin.email') }}
                              </div>
                              <div class="col-8">
                                <input
                                  min="1"
                                  max="30"
                                  type="email"
                                  class="form-control"
                                  v-model="state.business.contactInfo.email"
                                  placeholder="Ex.: contact@business.com"
                                />
                              </div>
                            </div>
                            <div id="business-contact-url-form-update" class="row g-1">
                              <div class="col-4 text-label">
                                {{ $t('businessCommercesAdmin.url') }}
                              </div>
                              <div class="col-8">
                                <input
                                  min="1"
                                  max="30"
                                  type="text"
                                  class="form-control"
                                  v-model="state.business.contactInfo.url"
                                  placeholder="Ex.: https://www.business.com/"
                                />
                              </div>
                            </div>
                            <div id="business-phone-form-update" class="row g-1">
                              <div class="col-4 text-label">
                                {{ $t('businessCommercesAdmin.phone') }}
                              </div>
                              <div class="col-8">
                                <input
                                  min="10"
                                  type="tel"
                                  class="form-control"
                                  v-model="state.business.contactInfo.phone"
                                  v-bind:class="{ 'is-invalid': state.phoneUpdateError }"
                                  placeholder="Cod. Pais + Numero"
                                />
                              </div>
                            </div>
                            <div id="business-contact-phone2-form-update" class="row g-1">
                              <div class="col-4 text-label">
                                {{ $t('businessCommercesAdmin.phone2') }}
                              </div>
                              <div class="col-8">
                                <input
                                  min="9"
                                  max="12"
                                  type="tel"
                                  class="form-control"
                                  v-model="state.business.contactInfo.phone2"
                                  placeholder="Ex.: 56233445533"
                                />
                              </div>
                            </div>
                            <div id="business-contact-whatsapp-form-update" class="row g-1">
                              <div class="col-4 text-label">
                                {{ $t('businessCommercesAdmin.whatsapp') }}
                              </div>
                              <div class="col-8">
                                <input
                                  min="9"
                                  max="12"
                                  type="tel"
                                  class="form-control"
                                  v-model="state.business.contactInfo.whatsapp"
                                  placeholder="Ex.: 56233445533"
                                />
                              </div>
                            </div>
                            <div id="business-contact-twitter-form-update" class="row g-1">
                              <div class="col-4 text-label">
                                {{ $t('businessCommercesAdmin.twitter') }}
                              </div>
                              <div class="col-8">
                                <input
                                  min="5"
                                  max="20"
                                  type="text"
                                  class="form-control"
                                  v-model="state.business.contactInfo.twitter"
                                  placeholder="Ex.: tw_commerce"
                                />
                              </div>
                            </div>
                            <div id="business-contact-instagram-form-update" class="row g-1">
                              <div class="col-4 text-label">
                                {{ $t('businessCommercesAdmin.instagram') }}
                              </div>
                              <div class="col-8">
                                <input
                                  min="5"
                                  max="20"
                                  type="text"
                                  class="form-control"
                                  v-model="state.business.contactInfo.instagram"
                                  placeholder="Ex.: ig_commerce"
                                />
                              </div>
                            </div>
                            <div id="business-contact-facebook-form-update" class="row g-1">
                              <div class="col-4 text-label">
                                {{ $t('businessCommercesAdmin.facebook') }}
                              </div>
                              <div class="col-8">
                                <input
                                  min="5"
                                  max="20"
                                  type="text"
                                  class="form-control"
                                  v-model="state.business.contactInfo.facebook"
                                  placeholder="Ex.: fb_commerce"
                                />
                              </div>
                            </div>
                          </div>
                          <!-- Datos de Servicio -->
                          <div class="row g-1">
                            <a
                              class="nav-link fw-bold"
                              data-bs-toggle="collapse"
                              href="#update-service"
                            >
                              {{ $t('businessCommercesAdmin.service') }}
                              <i class="bi bi-chevron-down"></i>
                            </a>
                          </div>
                          <div id="update-service" class="collapse row m-0">
                            <div id="business-serviceUrl-form-update" class="row g-1">
                              <div class="col-4 text-label">
                                {{ $t('businessCommercesAdmin.serviceUrl') }}
                              </div>
                              <div class="col-8">
                                <input
                                  min="1"
                                  max="12"
                                  type="text"
                                  class="form-control"
                                  v-model="state.business.serviceInfo.serviceUrl"
                                  placeholder="Ex. https://menu.business.com"
                                />
                              </div>
                            </div>
                            <div id="business-attentionHour-form-update" class="row g-1">
                              <div class="col-4 text-label">
                                {{ $t('businessCommercesAdmin.attentionHour') }}
                              </div>
                              <div class="col-3">
                                <input
                                  min="0"
                                  max="24"
                                  minlength="1"
                                  maxlength="2"
                                  type="number"
                                  class="form-control"
                                  v-model="state.business.serviceInfo.attentionHourFrom"
                                  placeholder="Ex. 8"
                                />
                              </div>
                              <div class="col-2">-</div>
                              <div class="col-3">
                                <input
                                  min="0"
                                  max="24"
                                  minlength="1"
                                  maxlength="2"
                                  type="number"
                                  class="form-control"
                                  v-model="state.business.serviceInfo.attentionHourTo"
                                  placeholder="Ex. 16"
                                />
                              </div>
                            </div>
                            <div id="add-business-break-active-form" class="row g-1">
                              <div class="col-4 text-label">
                                {{ $t('businessCommercesAdmin.break') }}
                              </div>
                              <div class="col-8">
                                <Toggle
                                  v-model="state.business.serviceInfo.break"
                                  :disabled="!state.toggles['businesses.admin.edit']"
                                />
                              </div>
                            </div>
                            <div
                              id="business-attentionBreak-form-update"
                              v-if="state.business.serviceInfo.break"
                              class="row g-1"
                            >
                              <div class="col-4 text-label">
                                {{ $t('businessCommercesAdmin.breakHour') }}
                              </div>
                              <div class="col-3">
                                <input
                                  min="0"
                                  max="24"
                                  minlength="1"
                                  maxlength="5"
                                  type="number"
                                  class="form-control"
                                  v-model="state.business.serviceInfo.breakHourFrom"
                                  placeholder="Ex. 8"
                                />
                              </div>
                              <div class="col-2">-</div>
                              <div class="col-3">
                                <input
                                  min="0"
                                  max="24"
                                  minlength="1"
                                  maxlength="5"
                                  type="number"
                                  class="form-control"
                                  v-model="state.business.serviceInfo.breakHourTo"
                                  placeholder="Ex. 16"
                                />
                              </div>
                            </div>
                            <div id="business-attentionDays-form-update" class="row g-1">
                              <div class="col-4 text-label">
                                {{ $t('businessCommercesAdmin.attentionDays') }}
                              </div>
                              <div class="col-8">
                                <div class="form-check form-switch">
                                  <input
                                    class="form-check-input"
                                    type="checkbox"
                                    id="monday"
                                    :checked="dayChecked(state.business.serviceInfo, 1)"
                                    @click="checkDay($event, state.business.serviceInfo, 1)"
                                  />
                                  <label class="form-check-label" for="monday">{{
                                    $t('days.1')
                                  }}</label>
                                </div>
                                <div class="form-check form-switch">
                                  <input
                                    class="form-check-input"
                                    type="checkbox"
                                    id="tuesday"
                                    :checked="dayChecked(state.business.serviceInfo, 2)"
                                    @click="checkDay($event, state.business.serviceInfo, 2)"
                                  />
                                  <label class="form-check-label" for="tuesday">{{
                                    $t('days.2')
                                  }}</label>
                                </div>
                                <div class="form-check form-switch">
                                  <input
                                    class="form-check-input"
                                    type="checkbox"
                                    id="wednesday"
                                    :checked="dayChecked(state.business.serviceInfo, 3)"
                                    @click="checkDay($event, state.business.serviceInfo, 3)"
                                  />
                                  <label class="form-check-label" for="wednesday">{{
                                    $t('days.3')
                                  }}</label>
                                </div>
                                <div class="form-check form-switch">
                                  <input
                                    class="form-check-input"
                                    type="checkbox"
                                    id="thursday"
                                    :checked="dayChecked(state.business.serviceInfo, 4)"
                                    @click="checkDay($event, state.business.serviceInfo, 4)"
                                  />
                                  <label class="form-check-label" for="thursday">{{
                                    $t('days.4')
                                  }}</label>
                                </div>
                                <div class="form-check form-switch">
                                  <input
                                    class="form-check-input"
                                    type="checkbox"
                                    id="friday"
                                    :checked="dayChecked(state.business.serviceInfo, 5)"
                                    @click="checkDay($event, state.business.serviceInfo, 5)"
                                  />
                                  <label class="form-check-label" for="friday">{{
                                    $t('days.5')
                                  }}</label>
                                </div>
                                <div class="form-check form-switch">
                                  <input
                                    class="form-check-input"
                                    type="checkbox"
                                    id="sabado"
                                    :checked="dayChecked(state.business.serviceInfo, 6)"
                                    @click="checkDay($event, state.business.serviceInfo, 6)"
                                  />
                                  <label class="form-check-label" for="sabado">{{
                                    $t('days.6')
                                  }}</label>
                                </div>
                                <div class="form-check form-switch">
                                  <input
                                    class="form-check-input"
                                    type="checkbox"
                                    id="domingo"
                                    :checked="dayChecked(state.business.serviceInfo, 7)"
                                    @click="checkDay($event, state.business.serviceInfo, 7)"
                                  />
                                  <label class="form-check-label" for="domingo">{{
                                    $t('days.7')
                                  }}</label>
                                </div>
                              </div>
                            </div>
                            <div id="update-business-personalized-active-form" class="row g-1">
                              <div class="col-4 text-label">
                                {{ $t('businessCommercesAdmin.personalized') }}
                              </div>
                              <div class="col-8">
                                <Toggle
                                  v-model="state.business.serviceInfo.personalized"
                                  :disabled="!state.toggles['businesses.admin.edit']"
                                  @click="initializedParsonalizedHours(state.business.serviceInfo)"
                                />
                              </div>
                            </div>
                            <div
                              id="business-personalized-form-update"
                              v-if="state.business.serviceInfo.personalized"
                              class="row g-1"
                            >
                              <div
                                class="row g-1"
                                v-for="day in state.business.serviceInfo.attentionDays"
                                :key="day"
                              >
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
                                    v-model="
                                      state.business.serviceInfo.personalizedHours[day]
                                        .attentionHourFrom
                                    "
                                    placeholder="Ex. 8"
                                  />
                                </div>
                                <div class="col-2">-</div>
                                <div class="col-3">
                                  <input
                                    min="0"
                                    max="24"
                                    minlength="1"
                                    maxlength="2"
                                    type="number"
                                    class="form-control"
                                    v-model="
                                      state.business.serviceInfo.personalizedHours[day]
                                        .attentionHourTo
                                    "
                                    placeholder="Ex. 16"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                          <div id="business-id-form" class="row -2 mb-g3">
                            <div class="row business-details-container">
                              <div class="col">
                                <span><strong>Id:</strong> {{ state.business.id }}</span>
                              </div>
                            </div>
                          </div>
                          <div class="col">
                            <button
                              class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                              @click="update(state.business)"
                              :disabled="!state.toggles['businesses.admin.update']"
                            >
                              {{ $t('businessCommercesAdmin.update') }} <i class="bi bi-save"></i>
                            </button>
                          </div>
                          <div
                            class="row g-1 errors"
                            id="feedback"
                            v-if="state.errorsUpdate.length > 0"
                          >
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
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else>
            <Message
              :title="$t('businessAdmin.message.1.title')"
              :content="$t('businessAdmin.message.1.content')"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Desktop Layout -->
    <div class="d-none d-lg-block">
      <div class="content text-center">
        <div id="page-header" class="text-center mb-3">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <div class="row align-items-center mb-1 desktop-header-row justify-content-start">
          <div class="col-auto desktop-logo-wrapper">
            <div class="desktop-commerce-logo">
              <div id="commerce-logo-desktop">
                <img
                  v-if="!loading || state.business?.logo"
                  class="rounded img-fluid logo-desktop"
                  :alt="$t('logoAlt')"
                  :src="state.business?.logo || $t('hubLogoBlanco')"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
          <div class="col desktop-menu-wrapper" style="flex: 1 1 auto; min-width: 0">
            <ComponentMenu
              :title="$t(`businessAdmin.title`)"
              :toggles="state.toggles"
              component-name="businessAdmin"
              @goBack="goBack"
            >
            </ComponentMenu>
          </div>
        </div>
        <div id="businessAdmin">
          <div v-if="state.toggles['businesses.admin.view']">
            <div v-if="!loading" id="businessAdmin-result" class="mt-4">
              <div>
                <div v-if="state.businesses.length === 0">
                  <Message
                    :title="$t('businessAdmin.message.2.title')"
                    :content="$t('businessAdmin.message.2.content')"
                  />
                </div>
                <div class="row mb-2">
                  <div class="col-8 text-label">
                    <span>{{ $t('businessAdmin.listResult') }}</span>
                    <span class="fw-bold m-2">{{ state.businesses.length }}</span>
                  </div>
                  <div class="col-4">
                    <button
                      class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-4"
                      @click="showAdd(business)"
                      :disabled="!state.toggles['businesses.admin.add']"
                    >
                      <i class="bi bi-plus-lg"></i>
                    </button>
                  </div>
                </div>
                <div
                  id="add-business"
                  class="business-card mb-4"
                  v-if="state.showAdd && state.toggles['businesses.admin.add']"
                >
                  <div v-if="state.businesses.length < state.toggles['businesses.admin.limit']">
                    <div class="row g-1">
                      <div id="business-name-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t('businessAdmin.name') }}
                        </div>
                        <div class="col-8">
                          <input
                            min="1"
                            max="50"
                            type="text"
                            class="form-control"
                            v-model="state.newBusiness.name"
                            v-bind:class="{ 'is-invalid': state.nameError }"
                            placeholder="brilliant-shop"
                          />
                        </div>
                      </div>
                      <div id="business-keyName-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t('businessAdmin.keyName') }}
                        </div>
                        <div class="col-8">
                          <input
                            min="1"
                            max="50"
                            type="text"
                            class="form-control"
                            v-model="state.newBusiness.keyName"
                            v-bind:class="{ 'is-invalid': state.keyNameError }"
                            placeholder="brilliant-shop"
                          />
                        </div>
                      </div>
                      <div id="business-email-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t('businessAdmin.email') }}
                        </div>
                        <div class="col-8">
                          <input
                            min="10"
                            type="email"
                            class="form-control"
                            v-model="state.newBusiness.email"
                            v-bind:class="{ 'is-invalid': state.emailError }"
                            placeholder="name@email.com"
                          />
                        </div>
                      </div>
                      <div id="business-tag-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t('businessAdmin.tag') }}
                        </div>
                        <div class="col-8">
                          <input
                            min="1"
                            max="50"
                            type="text"
                            class="form-control"
                            v-model="state.newBusiness.tag"
                            v-bind:class="{ 'is-invalid': state.tagAddError }"
                            placeholder="Brilliant Shop"
                          />
                        </div>
                      </div>
                      <div id="business-logo-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t('businessAdmin.logo') }}
                        </div>
                        <div class="col-8">
                          <input
                            min="10"
                            type="text"
                            class="form-control"
                            v-model="state.newBusiness.logo"
                            placeholder="url/logo.png"
                          />
                        </div>
                      </div>
                      <div id="business-category-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t('businessAdmin.category') }}
                        </div>
                        <div class="col-8">
                          <select
                            class="btn btn-md btn-light fw-bold text-dark select"
                            v-model="state.newBusiness.category"
                            id="caterogies"
                            v-bind:class="{ 'is-invalid': state.categoryAddError }"
                          >
                            <option v-for="cat in state.categories" :key="cat" :value="cat">
                              {{ $t(`categories.${cat}`) }}
                            </option>
                          </select>
                        </div>
                      </div>
                      <div id="business-country-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t('businessAdmin.country') }}
                        </div>
                        <div class="col-8">
                          <input
                            min="1"
                            max="12"
                            type="text"
                            class="form-control"
                            v-model="state.newBusiness.country"
                            v-bind:class="{ 'is-invalid': state.countryAddError }"
                            placeholder="Ex. ve, br, cl"
                          />
                        </div>
                      </div>
                      <div id="business-url-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t('businessAdmin.url') }}
                        </div>
                        <div class="col-8">
                          <input
                            min="1"
                            max="30"
                            type="text"
                            class="form-control"
                            v-model="state.newBusiness.url"
                            v-bind:class="{ 'is-invalid': state.urlAddError }"
                            placeholder="Ex.: https://www.business.com/"
                          />
                        </div>
                      </div>
                      <div id="business-phone-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t('businessAdmin.phone') }}
                        </div>
                        <div class="col-8">
                          <input
                            min="10"
                            type="tel"
                            class="form-control"
                            v-model="state.newBusiness.phone"
                            v-bind:class="{ 'is-invalid': state.phoneAddError }"
                            placeholder="Cod. Pais + Numero"
                          />
                        </div>
                      </div>
                      <div id="business-address-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t('businessAdmin.address') }}
                        </div>
                        <div class="col-8">
                          <input
                            min="1"
                            max="80"
                            type="text"
                            class="form-control"
                            v-model="state.newBusiness.address"
                            v-bind:class="{ 'is-invalid': state.addressAddError }"
                            placeholder="Street 1, Building 56, City, State"
                          />
                        </div>
                      </div>
                      <div class="col">
                        <button
                          class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                          @click="add(state.newBusiness)"
                        >
                          {{ $t('businessAdmin.add') }} <i class="bi bi-save"></i>
                        </button>
                      </div>
                      <div class="row g-1 errors" id="feedback" v-if="state.errorsAdd.length > 0">
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
                      :title="$t('businessAdmin.message.3.title')"
                      :content="$t('businessAdmin.message.3.content')"
                    />
                  </div>
                </div>
                <div>
                  <SearchBar
                    :items="state.businesses"
                    :receive-filtered-items="receiveFilteredItems"
                  >
                  </SearchBar>
                </div>
                <div class="business-admin">
                  <div v-if="state.business.id" class="card mt-1 mb-3">
                    <div class="row d-flex m-1 business-title">
                      <div class="col-4">
                        <img
                          :src="state.business.logo"
                          class="img-thumbnail rounded-start item-image"
                        />
                      </div>
                      <div class="col-7">
                        <span class="item-title fw-bold"> {{ state.business.name }} </span>
                      </div>
                      <button
                        type="button"
                        class="btn-close"
                        aria-label="Close"
                        @click="closeBusiness()"
                      ></button>
                    </div>
                    <div id="business-update" class="my-2">
                      <div class="row g-1">
                        <div id="business-name-form-update" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.name') }}
                          </div>
                          <div class="col-8">
                            <input
                              min="1"
                              max="50"
                              type="text"
                              class="form-control"
                              v-model="state.business.name"
                              placeholder="brilliant-shop"
                            />
                          </div>
                        </div>
                        <div id="business-keyName-form-update" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.keyName') }}
                          </div>
                          <div class="col-8">
                            <input
                              min="1"
                              max="50"
                              type="text"
                              class="form-control"
                              v-model="state.business.keyName"
                              placeholder="brilliant-shop"
                            />
                          </div>
                        </div>
                        <div id="business-email-form-update" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.email') }}
                          </div>
                          <div class="col-8">
                            <input
                              min="10"
                              type="email"
                              class="form-control"
                              v-model="state.business.email"
                              placeholder="commerce@email.com"
                            />
                          </div>
                        </div>
                        <div id="business-tag-form-update" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.tag') }}
                          </div>
                          <div class="col-8">
                            <input
                              :disabled="!state.toggles['businesses.admin.edit']"
                              min="1"
                              max="50"
                              type="text"
                              class="form-control"
                              v-model="state.business.tag"
                              v-bind:class="{ 'is-invalid': state.tagUpdateError }"
                              placeholder="brilliant-1"
                            />
                          </div>
                        </div>
                        <div id="business-logo-form-update" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.logo') }}
                          </div>
                          <div class="col-8">
                            <input
                              min="10"
                              type="text"
                              class="form-control"
                              v-model="state.business.logo"
                              placeholder="url/logo.png"
                            />
                          </div>
                        </div>
                        <div id="business-category-form-update" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.category') }}
                          </div>
                          <div class="col-8">
                            <select
                              class="btn btn-md btn-light fw-bold text-dark select"
                              v-model="state.business.category"
                              id="caterogies"
                            >
                              <option v-for="cat in state.categories" :key="cat" :value="cat">
                                {{ $t(`categories.${cat}`) }}
                              </option>
                            </select>
                          </div>
                        </div>
                        <div id="business-country-form-update" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.country') }}
                          </div>
                          <div class="col-8">
                            <input
                              min="1"
                              max="12"
                              type="text"
                              class="form-control"
                              v-model="state.business.country"
                              v-bind:class="{ 'is-invalid': state.countryUpdateError }"
                              placeholder="Ex. ve, br, cl"
                            />
                          </div>
                        </div>
                        <div id="business-url-form-update" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.url') }}
                          </div>
                          <div class="col-8">
                            <input
                              min="1"
                              max="30"
                              type="text"
                              class="form-control"
                              v-model="state.business.url"
                              v-bind:class="{ 'is-invalid': state.urlUpdateError }"
                              placeholder="Ex.: https://www.business.com/"
                            />
                          </div>
                        </div>
                        <div id="business-phone-form-update" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.phone') }}
                          </div>
                          <div class="col-8">
                            <input
                              min="10"
                              type="tel"
                              class="form-control"
                              v-model="state.business.phone"
                              v-bind:class="{ 'is-invalid': state.phoneUpdateError }"
                              placeholder="Cod. Pais + Numero"
                            />
                          </div>
                        </div>
                        <div id="business-address-form-update" class="row g-1">
                          <div class="col-4 text-label">
                            {{ $t('businessAdmin.address') }}
                          </div>
                          <div class="col-8">
                            <input
                              min="1"
                              max="80"
                              type="text"
                              class="form-control"
                              v-model="state.business.address"
                              placeholder="Street 1, Building 56, City, State"
                            />
                          </div>
                        </div>
                        <div id="business-id-form" class="row -2 mb-g3">
                          <div class="row business-details-container">
                            <div class="col">
                              <span><strong>Id:</strong> {{ state.business.id }}</span>
                            </div>
                          </div>
                        </div>
                        <div class="col">
                          <button
                            class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                            @click="update(state.business)"
                            :disabled="!state.toggles['businesses.admin.update']"
                          >
                            {{ $t('businessCommercesAdmin.update') }} <i class="bi bi-save"></i>
                          </button>
                        </div>
                        <div
                          class="row g-1 errors"
                          id="feedback"
                          v-if="state.errorsUpdate.length > 0"
                        >
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
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else>
            <Message
              :title="$t('businessAdmin.message.1.title')"
              :content="$t('businessAdmin.message.1.content')"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.select {
  border-radius: 0.5rem;
  border: 1.5px solid var(--gris-clear);
}

/* Desktop Layout Styles - Only affects the header row */
@media (min-width: 992px) {
  .desktop-header-row {
    align-items: center;
    margin-bottom: 1.5rem;
    padding: 0.5rem 0;
    justify-content: flex-start;
    text-align: left;
  }

  .desktop-header-row .desktop-logo-wrapper {
    padding-right: 1rem;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    text-align: left;
  }

  .desktop-header-row .desktop-commerce-logo {
    display: flex;
    align-items: center;
    max-width: 150px;
    text-align: left;
  }

  .desktop-header-row .desktop-commerce-logo .logo-desktop {
    max-width: 120px;
    max-height: 100px;
    width: auto;
    height: auto;
    margin-bottom: 0;
  }

  .desktop-header-row #commerce-logo-desktop {
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }

  .desktop-header-row .desktop-menu-wrapper {
    flex: 1 1 0%;
    min-width: 0;
    width: auto;
    text-align: left;
  }
}
.business-card {
  background-color: var(--color-background);
  padding: 0.5rem;
  margin-bottom: 1rem;
  border-radius: 0.5rem;
  border: 0.5px solid var(--gris-default);
  align-items: left;
}
.business-details-container {
  font-size: 0.8rem;
  margin-left: 0.5rem;
  margin-right: 0.5rem;
  margin-top: 0.5rem;
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
.choose-attention {
  padding-bottom: 1rem;
  font-size: 1rem;
  font-weight: 700;
}
.business-title {
  display: flex;
  justify-content: center;
  align-items: center;
  max-height: 3rem;
  margin: 0.3rem;
  font-size: 1rem;
  line-height: 0.9rem;
}
.item-image {
  max-width: 100px;
  max-height: 60px;
}
</style>
