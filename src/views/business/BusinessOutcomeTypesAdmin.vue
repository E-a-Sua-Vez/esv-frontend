<script>
import { ref, reactive, onBeforeMount } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getOutcomeTypesByCommerceId, updateOutcomeType, addOutcomeType } from '../../application/services/outcome-type';
import { getPermissions } from '../../application/services/permissions';
import ToggleCapabilities from '../../components/common/ToggleCapabilities.vue';
import OutcomeTypeName from '../../components/common/OutcomeTypeName.vue';
import Toggle from '@vueform/toggle';
import Message from '../../components/common/Message.vue';
import PoweredBy from '../../components/common/PoweredBy.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import AreYouSure from '../../components/common/AreYouSure.vue';
import ComponentMenu from '../../components/common/ComponentMenu.vue';
import SearchAdminItem from '../../components/common/SearchAdminItem.vue';
import { getOutcomeTypes } from '../../shared/utils/data';

export default {
  name: 'BusinessOutcomeTypesAdmin',
  components: { CommerceLogo, Message, PoweredBy, Spinner, Alert, OutcomeTypeName, Toggle, ToggleCapabilities, Warning, AreYouSure, ComponentMenu, SearchAdminItem },
  async setup() {
    const router = useRouter();
    const store = globalStore();

    let loading = ref(false);
    let alertError = ref('');

    const state = reactive({
      currentUser: {},
      business: {},
      activeBusiness: false,
      goToUnavailable: false,
      commerces: ref([]),
      outcomeTypes: ref([]),
      commerce: {},
      showAdd: false,
      newOutcomeType: {},
      extendedEntity: undefined,
      tagAddError: false,
      tadUpdateError: false,
      typeError: false,
      errorsAdd: [],
      nameError: false,
      toggles: {},
      filtered: [],
      types: []
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.types = getOutcomeTypes();
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.commerces = await store.getAvailableCommerces(state.business.commerces);
        state.commerce = state.commerces && state.commerces.length >= 0 ? state.commerces[0] : undefined;
        if (state.commerce) {
          const outcomeTypes = await getOutcomeTypesByCommerceId(state.commerce.id);
          state.outcomeTypes = outcomeTypes;
        }
        state.filtered = state.outcomeTypes;
        state.toggles = await getPermissions('outcome-types', 'admin');
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

    const validateAdd = (outcomeType) => {
      state.errorsAdd = [];
      if(!outcomeType.name || outcomeType.name.length === 0) {
        state.nameError = true;
        state.errorsAdd.push('businessOutcomeTypesAdmin.validate.name');
      } else {
        state.nameError = false;
      }
      if(!outcomeType.tag || outcomeType.tag.length === 0) {
        state.tagAddError = true;
        state.errorsAdd.push('businessOutcomeTypesAdmin.validate.tag');
      } else {
        state.tagAddError = false;
      }
      if(!outcomeType.type || outcomeType.type.length === 0) {
        state.typeError = true;
        state.errorsAdd.push('businessOutcomeTypesAdmin.validate.type');
      } else {
        state.typeError = false;
      }
      if(state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    }

    const validateUpdate = (outcomeType) => {
      state.errorsUpdate = [];
      if(!outcomeType.tag || outcomeType.tag.length === 0) {
        state.tagUpdateError = true;
        state.errorsAdd.push('businessOutcomeTypesAdmin.validate.tag');
      } else {
        state.tagUpdateError = false;
      }
      if(state.errorsUpdate.length === 0) {
        return true;
      }
      return false;
    }

    const showAdd = () => {
      state.showAdd = true;
      state.newOutcomeType = {
        order: state.outcomeTypes.length + 1
      }
    }

    const add = async () => {
      try {
        loading.value = true;
        if (validateAdd(state.newOutcomeType)) {
          state.newOutcomeType.commerceId = state.commerce.id;
          await addOutcomeType(state.newOutcomeType);
          state.outcomeTypes = await getOutcomeTypesByCommerceId(state.commerce.id);
          state.showAdd = false;
          closeAddModal();
          state.newOutcomeType = {};
          state.extendedEntity = undefined;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    }

    const update = async (outcomeType) => {
      try {
        loading.value = true;
        if (validateUpdate(outcomeType)) {
          await updateOutcomeType(outcomeType.id, outcomeType);
          state.outcomeTypes = await getOutcomeTypesByCommerceId(state.commerce.id);
          state.extendedEntity = undefined;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    }

    const unavailable = async (outcomeType) => {
      try {
        loading.value = true;
        if (outcomeType && outcomeType.id) {
          outcomeType.available = false;
          outcomeType.active = false;
          await updateOutcomeType(outcomeType.id, outcomeType);
          state.outcomeTypes = await getOutcomeTypesByCommerceId(state.commerce.id);
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

    const selectCommerce = async (commerce) => {
      try {
        loading.value = true;
        state.commerce = commerce;
        const selectedOutcomeTypes = await getOutcomeTypesByCommerceId(state.commerce.id);
        state.outcomeTypes = selectedOutcomeTypes;
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    }

    const showUpdateForm = (index) => {
      state.extendedEntity = state.extendedEntity !== index ? index : undefined;
    }

    const receiveFilteredItems = (items) => {
      state.filtered = items;
    }

    const closeAddModal = () => {
      const modalCloseButton = document.getElementById('close-modal');
      modalCloseButton.click();
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
      selectCommerce,
      unavailable,
      goToUnavailable,
      unavailableCancel,
      receiveFilteredItems
    }
  }
}
</script>

<template>
  <div>
    <div class="content text-center">
      <CommerceLogo :src="state.business.logo" :loading="loading"></CommerceLogo>
      <ComponentMenu
        :title="$t(`businessOutcomeTypesAdmin.title`)"
        :toggles="state.toggles"
        componentName="businessOutcomeTypesAdmin"
        @goBack="goBack">
      </ComponentMenu>
      <div id="page-header" class="text-center">
        <Spinner :show="loading"></Spinner>
        <Alert :show="loading" :stack="alertError"></Alert>
      </div>
      <div id="businessOutcomeTypesAdmin">
        <div v-if="isActiveBusiness && state.toggles['outcome-types.admin.view']">
          <div id="businessOutcomeTypesAdmin-controls" class="control-box">
            <div class="row">
              <div class="col" v-if="state.commerces.length > 0">
                <span>{{ $t("businessOutcomeTypesAdmin.commerce") }} </span>
                <select class="btn btn-md fw-bold text-dark m-1 select" v-model="state.commerce" @change="selectCommerce(state.commerce)" id="outcomeTypes">
                  <option v-for="com in state.commerces" :key="com.id" :value="com">{{ com.active ? `🟢  ${com.tag}` : `🔴  ${com.tag}` }}</option>
                </select>
              </div>
              <div v-else>
                <Message
                  :title="$t('businessOutcomeTypesAdmin.message.4.title')"
                  :content="$t('businessOutcomeTypesAdmin.message.4.content')" />
              </div>
            </div>
          </div>
          <div v-if="!loading" id="businessOutcomeTypesAdmin-result" class="mt-4">
            <div>
              <div v-if="state.outcomeTypes.length === 0">
                <Message
                  :title="$t('businessOutcomeTypesAdmin.message.2.title')"
                  :content="$t('businessOutcomeTypesAdmin.message.2.content')" />
              </div>
              <div v-if="state.commerce" class="row mb-2">
                <div class="col lefted">
                  <button
                    class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
                    @click="showAdd(outcomeType)"
                    data-bs-toggle="modal"
                    :data-bs-target="`#add-outcomeType`"
                    :disabled="!state.toggles['outcome-types.admin.add']">
                    <i class="bi bi-plus-lg"></i> {{ $t("add") }}
                  </button>
                </div>
              </div>
              <div>
                <SearchAdminItem
                  :businessItems="state.outcomeTypes"
                  :receiveFilteredItems="receiveFilteredItems"
                >
                </SearchAdminItem>
                <div v-for="(outcomeType, index) in state.filtered" :key="index" class="result-card">
                  <div class="row">
                    <div class="col-10">
                      <OutcomeTypeName :name="outcomeType.name" :active="outcomeType.active"></OutcomeTypeName>
                    </div>
                    <div class="col-2">
                      <a
                        href="#"
                        @click.prevent="showUpdateForm(index)">
                        <i :id="index" :class="`bi ${state.extendedEntity === index ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
                      </a>
                    </div>
                  </div>
                  <div v-if="state.toggles['outcome-types.admin.read']"
                    :class="{ show: state.extendedEntity === index }"
                    class="detailed-data transition-slow"
                    >
                    <div class="row g-1">
                      <div id="outcomeType-tag-form-update" class="row g-1">
                        <div class="col-6 text-label">
                          {{ $t("businessOutcomeTypesAdmin.tag") }}
                        </div>
                        <div class="col-6">
                          <input
                            min="1"
                            max="50"
                            type="text"
                            class="form-control"
                            v-model="outcomeType.type"
                            :disabled="true"
                            placeholder="OutcomeType A">
                        </div>
                      </div>
                      <div id="outcomeType-tag-form-update" class="row g-1">
                        <div class="col-6 text-label">
                          {{ $t("businessOutcomeTypesAdmin.tag") }}
                        </div>
                        <div class="col-6">
                          <input
                            min="1"
                            max="50"
                            type="text"
                            class="form-control"
                            v-model="outcomeType.tag"
                            v-bind:class="{ 'is-invalid': state.tagUpdateError }"
                            placeholder="OutcomeType A">
                        </div>
                      </div>
                      <div id="outcomeType-active-form" class="row g-1">
                        <div class="col-6 text-label">
                          {{ $t("businessOutcomeTypesAdmin.active") }}
                        </div>
                        <div class="col-6">
                          <Toggle
                            v-model="outcomeType.active"
                            :disabled="!state.toggles['outcome-types.admin.edit']"
                          />
                        </div>
                      </div>
                      <div id="outcomeType-id-form" class="row -2 mb-g3">
                        <div class="row outcomeType-details-container">
                          <div class="col">
                            <span><strong>Id:</strong> {{ outcomeType.id }}</span>
                          </div>
                        </div>
                      </div>
                      <div class="col">
                        <button
                          class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                          @click="update(outcomeType)"
                          v-if="state.toggles['outcome-types.admin.update']">
                          {{ $t("businessOutcomeTypesAdmin.update") }} <i class="bi bi-save"></i>
                        </button>
                        <button
                          class="btn btn-lg btn-size fw-bold btn-danger rounded-pill mt-2 px-4"
                          @click="goToUnavailable()"
                          v-if="state.toggles['outcome-types.admin.unavailable']">
                          {{ $t("businessQueuesAdmin.unavailable") }} <i class="bi bi-trash-fill"></i>
                        </button>
                        <AreYouSure
                          :show="state.goToUnavailable"
                          :yesDisabled="state.toggles['outcome-types.admin.unavailable']"
                          :noDisabled="state.toggles['outcome-types.admin.unavailable']"
                          @actionYes="unavailable(outcomeType)"
                          @actionNo="unavailableCancel()"
                        >
                        </AreYouSure>
                      </div>
                    </div>
                  </div>
                  <div v-if="(!isActiveBusiness() || !state.toggles['outcome-types.admin.read']) && !loading">
                    <Message
                      :title="$t('businessOutcomeTypesAdmin.message.1.title')"
                      :content="$t('businessOutcomeTypesAdmin.message.1.content')" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="(!isActiveBusiness() || !state.toggles['outcome-types.admin.view']) && !loading">
          <Message
            :title="$t('businessOutcomeTypesAdmin.message.1.title')"
            :content="$t('businessOutcomeTypesAdmin.message.1.content')" />
        </div>
      </div>
    </div>
    <!-- Modal Add -->
    <div class="modal fade" :id="`add-outcomeType`" data-bs-keyboard="false" tabindex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
      <div class=" modal-dialog modal-xl">
        <div class="modal-content">
          <div class="modal-header border-0 centered active-name">
            <h5 class="modal-title fw-bold"><i class="bi bi-plus-lg"></i> {{ $t("add") }} </h5>
            <button id="close-modal" class="btn-close" type="button" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body text-center mb-0" id="attentions-component">
            <Spinner :show="loading"></Spinner>
            <Alert :show="loading" :stack="alertError"></Alert>
            <div id="add-outcomeType" class="result-card mb-4" v-if="state.showAdd && state.toggles['outcome-types.admin.add']">
              <div v-if="state.outcomeTypes.length < state.toggles['outcome-types.admin.limit']">
                <div class="row g-1">
                  <div id="outcomeType-name-form-add" class="row g-1">
                    <div class="col-6 text-label">
                      {{ $t("businessOutcomeTypesAdmin.name") }}
                    </div>
                    <div class="col-6">
                      <input
                        min="1"
                        max="50"
                        type="text"
                        class="form-control"
                        v-model="state.newOutcomeType.name"
                        v-bind:class="{ 'is-invalid': state.nameError }"
                        placeholder="OutcomeType A">
                    </div>
                  </div>
                  <div id="outcomeType-tag-form-add" class="row g-1">
                    <div class="col-6 text-label">
                      {{ $t("businessOutcomeTypesAdmin.tag") }}
                    </div>
                    <div class="col-6">
                      <input
                        min="1"
                        max="50"
                        type="text"
                        class="form-control"
                        v-model="state.newOutcomeType.tag"
                        v-bind:class="{ 'is-invalid': state.tagAddError }"
                        placeholder="OutcomeType A">
                    </div>
                  </div>
                  <div id="outcomeType-type-form-add" class="row g-1">
                    <div class="col-6 text-label">
                      {{ $t("businessOutcomeTypesAdmin.type") }}
                    </div>
                    <div class="col-6">
                      <select
                        class="btn btn-md btn-light fw-bold text-dark select mx-2"
                        v-model="state.newOutcomeType.type"
                        id="features"
                        v-bind:class="{ 'is-invalid': state.typeError }">
                        <option v-for="opt in state.types" :key="opt.name" :value="opt.id">{{ $t(`outcomeTypes.${opt.name}`) }}</option>
                      </select>
                    </div>
                  </div>
                  <div class="col">
                    <button
                      class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                      @click="add(state.newOutcomeType)">
                      {{ $t("businessOutcomeTypesAdmin.add") }} <i class="bi bi-save"></i>
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
                  :title="$t('businessOutcomeTypesAdmin.message.3.title')"
                  :content="$t('businessOutcomeTypesAdmin.message.3.content')" />
              </div>
            </div>
          </div>
          <div class="mx-2 mb-4 text-center">
            <a class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4 mt-4" data-bs-dismiss="modal" aria-label="Close">{{ $t("close") }} <i class="bi bi-check-lg"></i></a>
          </div>
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
.outcomeType-details-container {
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
  max-height: 1500px !important;
  overflow-y: auto;
}
</style>