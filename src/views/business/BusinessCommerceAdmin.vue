<script>
import { ref, reactive, computed, onBeforeMount, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import {
  getActiveCommercesByBusinessId,
  updateCommerce,
  addCommerce,
} from '../../application/services/commerce';
import { getPermissions } from '../../application/services/permissions';
import { getDate, dateYYYYMMDD } from '../../shared/utils/date';
import Popper from 'vue3-popper';
import CommerceName from '../../components/common/CommerceName.vue';
import Toggle from '@vueform/toggle';
import Message from '../../components/common/Message.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import AreYouSure from '../../components/common/AreYouSure.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import DesktopPageHeader from '../../components/common/desktop/DesktopPageHeader.vue';
import SearchAdminItem from '../../components/common/SearchAdminItem.vue';
import SpecificCalendarForm from '../../components/domain/SpecificCalendarForm.vue';
import CommerceFormEdit from '../../components/commerce/CommerceFormEdit.vue';
import CommerceFormAdd from '../../components/commerce/CommerceFormAdd.vue';

export default {
  name: 'BusinessCommerceAdmin',
  components: {
    CommerceLogo,
    Message,
    Spinner,
    Alert,
    CommerceName,
    Toggle,
    Warning,
    Popper,
    AreYouSure,
    ComponentMenu,
    DesktopPageHeader,
    SearchAdminItem,
    SpecificCalendarForm,
    CommerceFormEdit,
    CommerceFormAdd,
  },
  async setup() {
    const router = useRouter();
    const store = globalStore();

    const loading = ref(false);
    const alertError = ref('');

    // Use global commerce from store
    const commerce = computed(() => store.getCurrentCommerce);
    const dateMask = ref({
      modelValue: 'YYYY-MM-DD',
    });
    const disabledDates = ref([
      {
        repeat: {
          weekdays: [],
        },
      },
    ]);
    const calendarAttributes = ref([
      {
        key: 'Available',
        highlight: {
          color: 'green',
          fillMode: 'light',
        },
        dates: [],
      },
    ]);

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
      errorsDateAdd: [],
      errorsUpdate: [],
      locale: 'es',
      selectedDate: new Date().setDate(new Date().getDate()),
      selectedHourFrom: undefined,
      selectedHourTo: undefined,
      selectedDates: {},
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
        'supermarket',
      ],
      filtered: [],
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.commerces = await getActiveCommercesByBusinessId(state.business.id);
        state.locale = state.business.localeInfo.language || 'es';
        state.filtered = state.commerces;
        state.toggles = await getPermissions('commerces', 'admin');
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    });

    const isActiveBusiness = () => state.business && state.business.active === true;

    const goBack = () => {
      router.back();
    };

    const validateAdd = commerce => {
      state.errorsAdd = [];
      if (!commerce.name || commerce.name.length === 0) {
        state.nameError = true;
        state.errorsAdd.push('businessCommercesAdmin.validate.name');
      } else {
        state.nameError = false;
      }
      if (!commerce.keyName || commerce.keyName.length === 0) {
        state.keyNameError = true;
        state.errorsAdd.push('businessCommercesAdmin.validate.keyName');
      } else {
        state.keyNameError = false;
      }
      if (!commerce.tag || commerce.tag.length === 0) {
        state.tagAddError = true;
        state.errorsAdd.push('businessCommercesAdmin.validate.tag');
      } else {
        state.tagAddError = false;
      }
      if (!commerce.category || commerce.category.length === 0) {
        state.categoryAddError = true;
        state.errorsAdd.push('businessCommercesAdmin.validate.category');
      } else {
        state.categoryAddError = false;
      }
      if (!commerce.email || commerce.email.length < 10) {
        state.emailError = true;
        state.errorsAdd.push('businessCommercesAdmin.validate.email');
      } else {
        state.emailError = false;
      }
      if (!commerce.contactInfo.phone || commerce.contactInfo.phone.length < 10) {
        state.phoneAddError = true;
        state.errorsAdd.push('businessCommercesAdmin.validate.phone');
      } else {
        state.phoneAddError = false;
      }
      if (!commerce.localeInfo.address || commerce.localeInfo.address.length < 10) {
        state.addressAddError = true;
        state.errorsAdd.push('businessCommercesAdmin.validate.address');
      } else {
        state.addressAddError = false;
      }
      if (state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    };

    const validateUpdate = commerce => {
      state.errorsUpdate = [];
      if (!commerce.tag || commerce.tag.length === 0) {
        state.tagUpdateError = true;
        state.errorsUpdate.push('businessCommercesAdmin.validate.tag');
      } else {
        state.tagUpdateError = false;
      }
      if (state.errorsUpdate.length === 0) {
        return true;
      }
      return false;
    };

    const showAdd = () => {
      state.showAdd = true;
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
          confirmNotificationDaysBefore: 1,
          surveyPostAttentionDaysAfter: 0,
          break: false,
          personalized: false,
          personalizedHours: {},
          holiday: false,
          holidays: {},
          specificCalendar: false,
          specificCalendarDays: {},
          ...state.business.serviceInfo,
        },
      };
    };

    const add = async () => {
      try {
        loading.value = true;
        if (validateAdd(state.newCommerce)) {
          if (!state.newCommerce.localeInfo) {
            state.newCommerce.localeInfo = {};
          }
          if (!state.newCommerce.localeInfo.language) {
            state.newCommerce.localeInfo.language = 'pt';
          }
          if (!state.newCommerce.localeInfo.timezone) {
            state.newCommerce.localeInfo.timezone = 'America/Sao_Paulo';
          }
          if (state.selectedDates && state.commerces.serviceInfo) {
            state.commerces.serviceInfo.selectedDates = state.selectedDates;
          }
          await addCommerce(state.newCommerce);
          const commerces = await getActiveCommercesByBusinessId(state.business.id);
          state.commerces = commerces;
          state.showAdd = false;
          closeAddModal();
          state.newCommerce = {};
        }
        state.extendedEntity = undefined;
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const update = async commerce => {
      try {
        loading.value = true;
        if (validateUpdate(commerce)) {
          if (state.selectedDates && state.commerces.serviceInfo) {
            state.commerces.serviceInfo.selectedDates = state.selectedDates;
          }
          await updateCommerce(commerce.id, commerce);
          const commerces = await getActiveCommercesByBusinessId(state.business.id);
          state.commerces = commerces;
          state.extendedEntity = undefined;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    };

    const unavailable = async commerce => {
      try {
        loading.value = true;
        if (commerce && commerce.id) {
          commerce.available = false;
          commerce.active = false;
          await updateCommerce(commerce.id, commerce);
          const commerces = await getActiveCommercesByBusinessId(state.business.id);
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
    };

    const goToUnavailable = () => {
      state.goToUnavailable = !state.goToUnavailable;
    };

    const unavailableCancel = () => {
      state.goToUnavailable = false;
    };

    const showUpdateForm = index => {
      state.extendedEntity = state.extendedEntity !== index ? index : undefined;
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

    const getCommerceLink = commerce => {
      const commerceKeyName = commerce.keyName;
      return `${import.meta.env.VITE_URL}/interno/comercio/${commerceKeyName}`;
    };

    const copyLink = commerce => {
      const textToCopy = getCommerceLink(commerce);
      navigator.clipboard.writeText(textToCopy);
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

    const initializedSpecificCalendar = serviceInfo => {
      if (serviceInfo.specificCalendar === true) {
        if (!serviceInfo.specificCalendarDays) {
          serviceInfo.specificCalendarDays = {};
        } else {
          const days = Object.keys(serviceInfo.specificCalendarDays);
          calendarAttributes.value[0].dates = [];
          calendarAttributes.value[0].dates.push(...days);
        }
      }
    };

    const addSpecificDate = index => {
      state.errorsDateAdd = [];
      let selectedDates = state.filtered[index].serviceInfo.specificCalendarDays;
      if (!selectedDates) {
        selectedDates = {};
      }
      if (selectedDates) {
        let date = dateYYYYMMDD(new Date());
        if (state.selectedDate) {
          date = dateYYYYMMDD(state.selectedDate);
        }
        if (date && state.selectedHourFrom && state.selectedHourTo) {
          if (state.selectedHourTo < state.selectedHourFrom) {
            state.errorsDateAdd.push('businessCommercesAdmin.validate.hours');
          } else if (Object.keys(selectedDates).length >= 0) {
            const [hourFrom, minuteFrom] = state.selectedHourFrom.split(':');
            const [hourTo, minuteTo] = state.selectedHourTo.split(':');
            const hourNumberFrom = +hourFrom + +minuteFrom / 60;
            const hourNumberTo = +hourTo + +minuteTo / 60;
            selectedDates[date] = {
              attentionHourFrom: hourNumberFrom,
              attentionHourTo: hourNumberTo,
            };
          }
        } else {
          state.errorsDateAdd.push('businessCommercesAdmin.validate.selectedDate');
        }
      }
      state.filtered[index].serviceInfo.specificCalendarDays = selectedDates;
      const days = Object.keys(selectedDates);
      calendarAttributes.value[0].dates = [];
      calendarAttributes.value[0].dates.push(...days);
    };

    const updateAddSpecificDate = () => {
      state.errorsDateAdd = [];
      let selectedDates = state.newCommerce.serviceInfo.specificCalendarDays;
      if (!selectedDates) {
        selectedDates = {};
      }
      if (selectedDates) {
        let date = dateYYYYMMDD(new Date());
        if (state.selectedDate) {
          date = dateYYYYMMDD(state.selectedDate);
        }
        if (date && state.selectedHourFrom && state.selectedHourTo) {
          if (state.selectedHourTo < state.selectedHourFrom) {
            state.errorsDateAdd.push('businessCommercesAdmin.validate.hours');
          } else if (Object.keys(selectedDates).length >= 0) {
            const [hourFrom, minuteFrom] = state.selectedHourFrom.split(':');
            const [hourTo, minuteTo] = state.selectedHourTo.split(':');
            const hourNumberFrom = +hourFrom + +minuteFrom / 60;
            const hourNumberTo = +hourTo + +minuteTo / 60;
            selectedDates[date] = {
              attentionHourFrom: hourNumberFrom,
              attentionHourTo: hourNumberTo,
            };
          }
        } else {
          state.errorsDateAdd.push('businessCommercesAdmin.validate.selectedDate');
        }
      }
      state.newCommerce.serviceInfo.specificCalendarDays = selectedDates;
      const days = Object.keys(selectedDates);
      calendarAttributes.value[0].dates = [];
      calendarAttributes.value[0].dates.push(...days);
    };

    const deleteSpecificDate = (index, date) => {
      const selectedDates = state.filtered[index].serviceInfo.specificCalendarDays;
      if (selectedDates) {
        if (Object.keys(selectedDates).length >= 0 && Object.keys(selectedDates).includes(date)) {
          delete selectedDates[date];
        }
      }
      state.filtered[index].serviceInfo.specificCalendarDays = selectedDates;
      const days = Object.keys(selectedDates);
      calendarAttributes.value[0].dates = [];
      calendarAttributes.value[0].dates.push(...days);
    };

    const updateDeleteSpecificDate = date => {
      const selectedDates = state.newCommerce.serviceInfo.specificCalendarDays;
      if (selectedDates) {
        if (Object.keys(selectedDates).length >= 0 && Object.keys(selectedDates).includes(date)) {
          delete selectedDates[date];
        }
      }
      state.newCommerce.serviceInfo.specificCalendarDays = selectedDates;
      const days = Object.keys(selectedDates);
      calendarAttributes.value[0].dates = [];
      calendarAttributes.value[0].dates.push(...days);
    };

    const timeConvert = num => {
      if (num) {
        const [hours, min = 0] = num.toString().split('.');
        let minutes = (num - hours) * 60;
        if (minutes === 0) {
          minutes = '00';
        }
        return `${hours}:${minutes}`;
      }
    };

    const receiveFilteredItems = items => {
      state.filtered = items;
    };

    const closeAddModal = () => {
      const modalCloseButton = document.getElementById('close-modal');
      modalCloseButton.click();
    };

    const resetAddForm = () => {
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
          confirmNotificationDaysBefore: 1,
          surveyPostAttentionDaysAfter: 0,
          break: false,
          personalized: false,
          personalizedHours: {},
          holiday: false,
          holidays: {},
          specificCalendar: false,
          specificCalendarDays: {},
          ...state.business.serviceInfo,
        },
      };
      state.errorsAdd = [];
      state.errorsDateAdd = [];
      state.nameError = false;
      state.keyNameError = false;
      state.tagAddError = false;
      state.phoneAddError = false;
      state.categoryAddError = false;
      state.urlAddError = false;
      state.emailError = false;
      state.selectedDates = {};
      state.selectedHourFrom = undefined;
      state.selectedHourTo = undefined;
      state.showAdd = false;
    };

    const handleCloseButtonMousedown = e => {
      // Remove focus immediately on mousedown (before click) to avoid aria-hidden warning
      if (e.target && (e.target.id === 'close-modal' || e.target.closest('#close-modal'))) {
        const button = e.target.id === 'close-modal' ? e.target : e.target.closest('#close-modal');
        if (button) {
          button.blur();
          // Also blur any active element to ensure no focus remains
          if (document.activeElement && document.activeElement !== document.body) {
            document.activeElement.blur();
          }
        }
      }
    };

    const handleModalBackdropClick = e => {
      // Remove focus when clicking backdrop to close modal
      if (e.target === e.currentTarget && document.activeElement) {
        document.activeElement.blur();
      }
    };

    onMounted(() => {
      const addModal = document.getElementById('add-commerce');
      const closeButton = document.getElementById('close-modal');

      if (addModal) {
        addModal.addEventListener('hidden.bs.modal', resetAddForm);
        // Remove focus when clicking backdrop
        addModal.addEventListener('click', handleModalBackdropClick);
      }

      // Use mousedown (fires before click) to remove focus early
      if (closeButton) {
        closeButton.addEventListener('mousedown', handleCloseButtonMousedown, true);
      }

      // Also listen on the document for any close button clicks
      document.addEventListener('mousedown', handleCloseButtonMousedown, true);
    });

    onUnmounted(() => {
      const addModal = document.getElementById('add-commerce');
      const closeButton = document.getElementById('close-modal');

      if (addModal) {
        addModal.removeEventListener('hidden.bs.modal', resetAddForm);
        addModal.removeEventListener('click', handleModalBackdropClick);
      }

      if (closeButton) {
        closeButton.removeEventListener('mousedown', handleCloseButtonMousedown, true);
      }

      document.removeEventListener('mousedown', handleCloseButtonMousedown, true);
    });

    return {
      state,
      loading,
      alertError,
      dateMask,
      disabledDates,
      calendarAttributes,
      getDate,
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
      unavailableCancel,
      receiveFilteredItems,
      initializedSpecificCalendar,
      addSpecificDate,
      updateAddSpecificDate,
      commerce,
      deleteSpecificDate,
      updateDeleteSpecificDate,
      timeConvert,
    };
  },
};
</script>

<template>
  <div>
    <!-- Mobile/Tablet Layout -->
    <div class="d-block d-lg-none">
      <div class="content text-center">
        <CommerceLogo
          :src="state.business?.logo"
          :business-id="state.business?.id"
          :loading="loading"
        ></CommerceLogo>
        <ComponentMenu
          :title="$t(`businessCommercesAdmin.title`)"
          :toggles="state.toggles"
          component-name="businessCommercesAdmin"
          @goBack="goBack"
        >
        </ComponentMenu>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <div id="businessCommercesAdmin">
          <div v-if="isActiveBusiness() && state.toggles['commerces.admin.view']">
            <div v-if="!loading" id="businessCommercesAdmin-result" class="mt-4">
              <div class="control-box my-4"></div>
              <div>
                <div v-if="state.commerces.length === 0" class="control-box">
                  <Message
                    :title="$t('businessCommercesAdmin.message.2.title')"
                    :content="$t('businessCommercesAdmin.message.2.content')"
                  />
                </div>
                <div class="row my-2">
                  <div class="col lefted">
                    <button
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4 pulse-btn"
                      @click="showAdd()"
                      data-bs-toggle="modal"
                      :data-bs-target="`#add-commerce`"
                      :disabled="!state.toggles['commerces.admin.add']"
                    >
                      <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                    </button>
                  </div>
                </div>
                <div>
                  <SearchAdminItem
                    :business-items="state.commerces"
                    :receive-filtered-items="receiveFilteredItems"
                  >
                  </SearchAdminItem>
                  <div v-for="(commerce, index) in state.filtered" :key="index" class="result-card">
                    <div class="row">
                      <div class="col-10">
                        <CommerceName
                          :name="commerce.name"
                          :tag="commerce.tag"
                          :active="commerce.active"
                          :key-name="commerce.keyName"
                        ></CommerceName>
                      </div>
                      <div class="col-2">
                        <a href="#" @click.prevent="showUpdateForm(index)">
                          <i
                            :id="index"
                            :class="`bi ${
                              state.extendedEntity === index ? 'bi-chevron-up' : 'bi-chevron-down'
                            }`"
                          ></i>
                        </a>
                      </div>
                    </div>
                    <CommerceFormEdit
                      v-if="state.toggles['commerces.admin.read']"
                      :class="{ show: state.extendedEntity === index }"
                      :commerce="commerce"
                      :categories="state.categories"
                      :toggles="state.toggles"
                      :business-id="state.business.id"
                      :business-logo="state.business?.logo"
                      :errors="{
                        tagUpdateError: state.tagUpdateError,
                        phoneUpdateError: state.phoneUpdateError,
                        urlUpdateError: state.urlUpdateError,
                        addressAddError: state.addressAddError,
                        errorsUpdate: state.errorsUpdate,
                      }"
                      :locale="state.locale"
                      :on-initialized-specific-calendar="initializedSpecificCalendar"
                      :on-initialized-personalized-hours="initializedParsonalizedHours"
                      @update:commerce="commerce = $event"
                    />
                    <div
                      v-if="state.toggles['commerces.admin.read'] && state.extendedEntity === index"
                      class="row g-1 mt-2"
                    >
                      <div class="col">
                        <button
                          class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                          @click="update(commerce)"
                          :disabled="!state.toggles['commerces.admin.update']"
                        >
                          {{ $t('businessCommercesAdmin.update') }} <i class="bi bi-save"></i>
                        </button>
                        <button
                          class="btn btn-lg btn-size fw-bold btn-danger rounded-pill mt-2 px-4"
                          @click="goToUnavailable()"
                          v-if="state.toggles['commerces.admin.unavailable']"
                        >
                          {{ $t('businessQueuesAdmin.unavailable') }}
                          <i class="bi bi-trash-fill"></i>
                        </button>
                        <AreYouSure
                          :show="state.goToUnavailable"
                          :yes-disabled="state.toggles['commerces.admin.unavailable']"
                          :no-disabled="state.toggles['commerces.admin.unavailable']"
                          @actionYes="unavailable(commerce)"
                          @actionNo="unavailableCancel()"
                        >
                        </AreYouSure>
                      </div>
                    </div>
                    <div
                      v-if="
                        (!isActiveBusiness() || !state.toggles['commerces.admin.read']) && !loading
                      "
                    >
                      <Message
                        :title="$t('businessCommercesAdmin.message.1.title')"
                        :content="$t('businessCommercesAdmin.message.1.content')"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="(!isActiveBusiness() || !state.toggles['commerces.admin.view']) && !loading">
            <Message
              :title="$t('businessCommercesAdmin.message.1.title')"
              :content="$t('businessCommercesAdmin.message.1.content')"
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
        <DesktopPageHeader
          :logo="state.business?.logo"
          :business-id="state.business?.id"
          :loading="loading"
          :title="$t('businessCommercesAdmin.title')"
          :toggles="state.toggles"
          component-name="businessCommercesAdmin"
          @go-back="goBack"
        />
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <Alert :show="false" :stack="alertError"></Alert>
        </div>
        <div id="businessCommercesAdmin">
          <div v-if="isActiveBusiness() && state.toggles['commerces.admin.view']">
            <div class="control-box my-4"></div>
            <div v-if="!loading" id="businessCommercesAdmin-result" class="mt-4">
              <div>
                <div v-if="state.commerces.length === 0" class="control-box">
                  <Message
                    :title="$t('businessCommercesAdmin.message.2.title')"
                    :content="$t('businessCommercesAdmin.message.2.content')"
                  />
                </div>
                <div class="row my-2">
                  <div class="col lefted">
                    <button
                      class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4 pulse-btn"
                      @click="showAdd()"
                      data-bs-toggle="modal"
                      :data-bs-target="`#add-commerce`"
                      :disabled="!state.toggles['commerces.admin.add']"
                    >
                      <i class="bi bi-plus-lg"></i> {{ $t('add') }}
                    </button>
                  </div>
                </div>
                <div>
                  <SearchAdminItem
                    :business-items="state.commerces"
                    :receive-filtered-items="receiveFilteredItems"
                  >
                  </SearchAdminItem>
                  <div v-for="(commerce, index) in state.filtered" :key="index" class="result-card">
                    <div class="row">
                      <div class="col-10">
                        <CommerceName
                          :name="commerce.name"
                          :tag="commerce.tag"
                          :active="commerce.active"
                          :key-name="commerce.keyName"
                        ></CommerceName>
                      </div>
                      <div class="col-2">
                        <a href="#" @click.prevent="showUpdateForm(index)">
                          <i
                            :id="index"
                            :class="`bi ${
                              state.extendedEntity === index ? 'bi-chevron-up' : 'bi-chevron-down'
                            }`"
                          ></i>
                        </a>
                      </div>
                    </div>
                    <CommerceFormEdit
                      v-if="state.toggles['commerces.admin.read']"
                      :class="{ show: state.extendedEntity === index }"
                      :commerce="commerce"
                      :categories="state.categories"
                      :toggles="state.toggles"
                      :business-id="state.business.id"
                      :business-logo="state.business?.logo"
                      :errors="{
                        tagUpdateError: state.tagUpdateError,
                        phoneUpdateError: state.phoneUpdateError,
                        urlUpdateError: state.urlUpdateError,
                        addressAddError: state.addressAddError,
                        errorsUpdate: state.errorsUpdate,
                      }"
                      :locale="state.locale"
                      :on-initialized-specific-calendar="initializedSpecificCalendar"
                      :on-initialized-personalized-hours="initializedParsonalizedHours"
                      @update:commerce="commerce = $event"
                    />
                    <div
                      v-if="state.toggles['commerces.admin.read'] && state.extendedEntity === index"
                      class="row g-1 mt-2"
                    >
                      <div class="col">
                        <button
                          class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                          @click="update(commerce)"
                          :disabled="!state.toggles['commerces.admin.update']"
                        >
                          {{ $t('businessCommercesAdmin.update') }} <i class="bi bi-save"></i>
                        </button>
                        <button
                          class="btn btn-lg btn-size fw-bold btn-danger rounded-pill mt-2 px-4"
                          @click="goToUnavailable()"
                          v-if="state.toggles['commerces.admin.unavailable']"
                        >
                          {{ $t('businessQueuesAdmin.unavailable') }}
                          <i class="bi bi-trash-fill"></i>
                        </button>
                        <AreYouSure
                          :show="state.goToUnavailable"
                          :yes-disabled="state.toggles['commerces.admin.unavailable']"
                          :no-disabled="state.toggles['commerces.admin.unavailable']"
                          @actionYes="unavailable(commerce)"
                          @actionNo="unavailableCancel()"
                        >
                        </AreYouSure>
                      </div>
                    </div>
                    <div
                      v-if="
                        (!isActiveBusiness() || !state.toggles['commerces.admin.read']) && !loading
                      "
                    >
                      <Message
                        :title="$t('businessCommercesAdmin.message.1.title')"
                        :content="$t('businessCommercesAdmin.message.1.content')"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-if="(!isActiveBusiness() || !state.toggles['commerces.admin.view']) && !loading">
            <Message
              :title="$t('businessCommercesAdmin.message.1.title')"
              :content="$t('businessCommercesAdmin.message.1.content')"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- Modal Add -->
    <div
      class="modal fade"
      :id="`add-commerce`"
      data-bs-keyboard="false"
      tabindex="-1"
      aria-labelledby="staticBackdropLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header border-0 active-name modern-modal-header">
            <div class="modern-modal-header-inner">
              <div class="modern-modal-icon-wrapper">
                <i class="bi bi-plus-lg"></i>
              </div>
              <div class="modern-modal-title-wrapper">
                <h5 class="modal-title fw-bold modern-modal-title">{{ $t('add') }}</h5>
              </div>
              <button
                id="close-modal"
                class="modern-modal-close-btn"
                type="button"
                data-bs-dismiss="modal"
                aria-label="Close"
              ><i class="bi bi-x-lg"></i></button>
            </div>
          </div>
          <div class="modal-body text-center mb-0" id="attentions-component">
            <Spinner :show="loading"></Spinner>
            <Alert :show="false" :stack="alertError"></Alert>
            <div
              id="add-commerce"
              class="result-card mb-4"
              v-if="state.showAdd && state.toggles['commerces.admin.add']"
            >
              <div v-if="state.commerces.length < state.toggles['commerces.admin.limit']">
                <CommerceFormAdd
                  v-model="state.newCommerce"
                  :categories="state.categories"
                  :toggles="state.toggles"
                  :business-id="state.business?.id"
                  :business-logo="state.business?.logo"
                  :errors="{
                    nameError: state.nameError,
                    keyNameError: state.keyNameError,
                    emailError: state.emailError,
                    tagAddError: state.tagAddError,
                    categoryAddError: state.categoryAddError,
                    phoneAddError: state.phoneAddError,
                    urlAddError: state.urlAddError,
                    addressAddError: state.addressAddError,
                    errorsAdd: state.errorsAdd,
                  }"
                  :locale="state.locale"
                  :on-initialized-specific-calendar="initializedSpecificCalendar"
                  :on-initialized-personalized-hours="initializedParsonalizedHours"
                />
                <div class="col">
                  <button
                    class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4 pulse-btn"
                    @click="add(state.newCommerce)"
                  >
                    {{ $t('businessCommercesAdmin.add') }} <i class="bi bi-save"></i>
                  </button>
                </div>
              </div>
              <div v-else>
                <Message
                  :title="$t('businessCommercesAdmin.message.3.title')"
                  :content="$t('businessCommercesAdmin.message.3.content')"
                />
              </div>
            </div>
          </div>
          <div class="mx-2 mb-4 text-center">
            <a
              class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4 mt-4"
              data-bs-dismiss="modal"
              aria-label="Close"
              >{{ $t('close') }} <i class="bi bi-check-lg"></i
            ></a>
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
.commerce-details-container {
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
.selected-days-title {
  line-height: 1rem;
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

/* Modern Modal Header Styles */
.modern-modal-header {
  padding: 0.75rem 1rem;
  background-color: var(--azul-turno);
  color: var(--color-background);
  border-radius: 1rem 1rem 0 0;
  min-height: auto;
  position: relative;
}

.modern-modal-header-inner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.modern-modal-icon-wrapper {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 0.5rem;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.modern-modal-icon-wrapper i {
  font-size: 1.125rem;
  color: #ffffff;
}

.modern-modal-title-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  flex: 1;
  min-width: 0;
}

.modern-modal-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-background);
  margin: 0;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.modern-modal-client-name {
  font-size: 0.75rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  margin: 0;
  line-height: 1.2;
}

.modern-modal-close-btn {
  position: absolute;
  right: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  opacity: 0.85;
  width: 1.75rem;
  height: 1.75rem;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 0.375rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  border: none;
  padding: 0;
}

.modern-modal-close-btn i {
  font-size: 1rem;
  color: #ffffff;
  line-height: 1;
}

.modern-modal-close-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.25);
}
</style>
