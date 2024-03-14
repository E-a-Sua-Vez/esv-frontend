<script>
import { ref, reactive, onBeforeMount } from 'vue';
import { useRouter } from 'vue-router';
import { globalStore } from '../../stores';
import { getQueueByCommerce, updateQueue, addQueue, getQueuesByCommerceId } from '../../application/services/queue';
import { getActiveServicesByCommerceId, getServiceByCommerce } from '../../application/services/service';
import { getCollaboratorsByCommerceId } from '../../application/services/collaborator';
import { getPermissions } from '../../application/services/permissions';
import ToggleCapabilities from '../../components/common/ToggleCapabilities.vue';
import QueueSimpleName from '../../components/common/QueueSimpleName.vue';
import Toggle from '@vueform/toggle';
import Message from '../../components/common/Message.vue';
import PoweredBy from '../../components/common/PoweredBy.vue';
import CommerceLogo from '../../components/common/CommerceLogo.vue';
import Spinner from '../../components/common/Spinner.vue';
import Alert from '../../components/common/Alert.vue';
import Warning from '../../components/common/Warning.vue';
import AreYouSure from '../../components/common/AreYouSure.vue';

export default {
  name: 'BusinessQueuesAdmin',
  components: { CommerceLogo, Message, PoweredBy, Spinner, Alert, QueueSimpleName, Toggle, ToggleCapabilities, Warning, AreYouSure },
  async setup() {
    const router = useRouter();
    const store = globalStore();

    let loading = ref(false);
    let alertError = ref('');

    const state = reactive({
      currentUser: {},
      business: {},
      activeBusiness: false,
      commerces: ref([]),
      queues: ref([]),
      services: ref({}),
      collaborators: ref({}),
      types: [
        {  name: 'Standard', type: 'STANDARD' },
        {  name: 'Collaborator', type: 'COLLABORATOR' },
        {  name: 'Service', type: 'SERVICE' },
      ],
      commerce: {},
      showAdd: false,
      goToUnavailable: false,
      newQueue: {},
      selectedCollaborator: {},
      selectedService: {},
      extendedEntity: undefined,
      errorsAdd: [],
      errorsUpdate: [],
      nameAddError: false,
      nameUpdateError: false,
      limitAddError: false,
      limitUpdateError: false,
      orderAddError: false,
      orderUpdateError: false,
      timeAddError: false,
      timeUpdateError: false,
      typeError: false,
      toggles: {}
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        state.currentUser = await store.getCurrentUser;
        state.business = await store.getActualBusiness();
        state.commerces = await store.getAvailableCommerces(state.business.commerces);
        state.commerce = state.commerces && state.commerces.length >= 0 ? state.commerces[0] : undefined;
        if (state.commerce) {
          state.queues = await getQueuesByCommerceId(state.commerce.id);
          state.services = await getActiveServicesByCommerceId(state.commerce.id);
          state.collaborators = await getCollaboratorsByCommerceId(state.commerce.id);
        }
        state.toggles = await getPermissions('queues', 'admin');
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

    const validateAdd = (queue) => {
      state.errorsAdd = [];
      if(!queue.name || queue.name.length === 0) {
        state.nameAddError = true;
        state.errorsAdd.push('businessQueuesAdmin.validate.name');
      } else {
        state.nameAddError = false;
      }
      if(!queue.type || queue.type.length === 0) {
        state.typeError = true;
        state.errorsAdd.push('businessQueuesAdmin.validate.type');
      } else {
        state.typeError = false;
      }
      if (queue.type) {
        if (queue.type === 'COLLABORATOR' && !queue.collaboratorId) {
          state.errorsAdd.push('businessQueuesAdmin.validate.collaborator');
        }
        if (queue.type === 'SERVICE' && !queue.serviceId) {
          state.errorsAdd.push('businessQueuesAdmin.validate.service');
        }
        if (queue.type === 'STANDARD') {
          if (queue.tag === undefined) {
            queue.tag = queue.name;
          }
        }
      }
      if(!queue.limit || queue.limit.length === 0 || queue.limit > state.toggles['queues.admin.queue-limit']) {
        state.limitAddError = true;
        state.errorsAdd.push('businessQueuesAdmin.validate.limit');
      } else {
        state.limitAddError = false;
      }
      if(!queue.order || queue.order.length === 0) {
        state.orderAddError = true;
        state.errorsAdd.push('businessQueuesAdmin.validate.order');
      } else {
        state.orderAddError = false;
      }
      if(!queue.estimatedTime || queue.estimatedTime.length === 0) {
        state.timeAddError = true;
        state.errorsAdd.push('businessQueuesAdmin.validate.estimatedTime');
      } else {
        state.timeAddError = false;
      }
      if(state.errorsAdd.length === 0) {
        return true;
      }
      return false;
    }

    const validateUpdate = (queue) => {
      state.errorsUpdate = [];
      if(!queue.name || queue.name.length === 0) {
        state.nameUpdateError = true;
        state.errorsAdd.push('businessQueuesAdmin.validate.name');
      } else {
        state.nameUpdateError = false;
      }
      if(!queue.limit || queue.limit.length === 0 || queue.limit > state.toggles['queues.admin.queue-limit']) {
        state.limitUpdateError = true;
        state.errorsUpdate.push('businessQueuesAdmin.validate.limit');
      } else {
        state.limitUpdateError = false;
      }
      if(!queue.type || queue.type.length === 0) {
        state.typeError = true;
        state.errorsAdd.push('businessQueuesAdmin.validate.type');
      } else {
        state.typeError = false;
      }
      if(!queue.order || queue.order.length === 0) {
        state.orderUpdateError = true;
        state.errorsUpdate.push('businessQueuesAdmin.validate.order');
      } else {
        state.orderUpdateError = false;
      }
      if(!queue.estimatedTime || queue.estimatedTime.length === 0) {
        state.timeUpdateError = true;
        state.errorsUpdate.push('businessQueuesAdmin.validate.estimatedTime');
      } else {
        state.timeUpdateError = false;
      }
      if(state.errorsUpdate.length === 0) {
        return true;
      }
      return false;
    }

    const showAdd = () => {
      state.showAdd = !state.showAdd;
      state.newQueue = {
        order: state.queues.length + 1,
        serviceInfo: {
          sameCommeceHours: true,
          break: false,
          personalized: false,
          personalizedHours: {},
          holiday: false,
          holidays: {},
          walkin: false,
          ...state.business.serviceInfo
        }
      }
    }

    const add = async () => {
      try {
        loading.value = true;
        if (validateAdd(state.newQueue)) {
          state.newQueue.commerceId = state.commerce.id;
          await addQueue(state.newQueue);
          state.queues = await getQueuesByCommerceId(state.commerce.id);
          state.showAdd = false;
          state.newQueue = {}
          state.extendedEntity = undefined;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    }

    const update = async (queue) => {
      try {
        loading.value = true;
        if (validateUpdate(queue)) {
          await updateQueue(queue.id, queue);
          state.queues = await getQueuesByCommerceId(state.commerce.id);
          state.extendedEntity = undefined;
        }
        alertError.value = '';
        loading.value = false;
      } catch (error) {
        alertError.value = error.response.status || 500;
        loading.value = false;
      }
    }

    const unavailable = async (queue) => {
      try {
        loading.value = true;
        if (queue && queue.id) {
          queue.available = false;
          queue.active = false;
          await updateQueue(queue.id, queue);
          state.queues = await getQueuesByCommerceId(state.commerce.id);
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
        const selectedCommerce = await getQueueByCommerce(state.commerce.id);
        state.queues = selectedCommerce.queues;
        state.services = await getServiceByCommerce(state.commerce.id);
        state.collaborators = await getCollaboratorsByCommerceId(state.commerce.id);
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

    const getQueueLink = (queue) => {
      const commerceKeyName = state.commerce.keyName;
      const queueId = queue.id;
      if (queueId) {
        return `${import.meta.env.VITE_URL}/publico/comercio/${commerceKeyName}/filas/${queueId}`;
      }
      return `${import.meta.env.VITE_URL}/publico/comercio/${commerceKeyName}/filas`;
    }

    const copyLink = (queue) => {
      const textToCopy = getQueueLink(queue);
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

    const initializedSameCommerceHours = (serviceInfo) => {
      if (serviceInfo.sameCommeceHours === true) {
        if (state.commerce.serviceInfo) {
          serviceInfo.sameCommeceHours = true;
          serviceInfo.attentionDays = state.commerce.serviceInfo.attentionDays;
          serviceInfo.attentionHourFrom = state.commerce.serviceInfo.attentionHourFrom;
          serviceInfo.attentionHourTo = state.commerce.serviceInfo.attentionHourTo;
          serviceInfo.break = state.commerce.serviceInfo.break;
          serviceInfo.breakHourFrom = state.commerce.serviceInfo.breakHourFrom;
          serviceInfo.breakHourTo = state.commerce.serviceInfo.breakHourTo;
          serviceInfo.personalized = state.commerce.serviceInfo.personalized;
          serviceInfo.personalizedHours = state.commerce.serviceInfo.personalizedHours;
          serviceInfo.holiday = state.commerce.serviceInfo.holiday;
          serviceInfo.holidays = state.commerce.serviceInfo.holidays;
        };
      }
    }

    const selectCollaborator = (queue, collaborator) => {
      if (queue !== undefined && collaborator !== undefined && collaborator.id !== undefined) {
        queue.collaboratorId = collaborator.id;
        queue.tag = `${collaborator.email}`;
        state.selectedCollaborator = collaborator;
      }
    }

    const selectService = (queue, service) => {
      if (queue !== undefined && service !== undefined && service.id !== undefined) {
        queue.serviceId = service.id;
        queue.tag = `${service.name}`;
        state.selectedService = service;
        queue.estimatedTime = service.serviceInfo.estimatedTime;
        queue.blockTime = service.serviceInfo.blockTime;
      }
    }

    const selectType = (queue, type) => {
      if (queue) {
        if (typ === 'COLLABORATOR') {
          queue.serviceId = undefined;
          queue.type = type.name;
        }
        if (typ === 'SERVICE') {
          queue.collaboratorId = undefined;
          queue.type = type.name;
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
      selectCommerce,
      dayChecked,
      checkDay,
      getQueueLink,
      copyLink,
      initializedParsonalizedHours,
      initializedSameCommerceHours,
      selectCollaborator,
      selectService,
      selectType,
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
      <div class="col">
        <a class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4" @click="goBack()"> {{ $t("businessQueuesAdmin.return") }} <i class="bi bi-arrow-left"></i></a>
      </div>
      <div id="page-header" class="text-center mt-4">
        <span class="welcome-user">{{ $t("businessQueuesAdmin.title") }}</span>
        <ToggleCapabilities
          :toggles="state.toggles"
          componentName="businessQueuesAdmin"
        ></ToggleCapabilities>
        <Spinner :show="loading"></Spinner>
        <Alert :show="loading" :stack="alertError"></Alert>
      </div>
      <div id="businessQueuesAdmin">
        <div v-if="isActiveBusiness && state.toggles['queues.admin.view']">
          <div id="businessQueuesAdmin-controls" class="control-box">
            <div class="row">
              <div class="col" v-if="state.commerces.length > 0">
                <span>{{ $t("businessQueuesAdmin.commerce") }} </span>
                <select class="btn btn-md fw-bold text-dark m-1 select" v-model="state.commerce" @change="selectCommerce(state.commerce)" id="modules">
                  <option v-for="com in state.commerces" :key="com.id" :value="com">{{ com.active ? `🟢  ${com.tag}` : `🔴  ${com.tag}` }}</option>
                </select>
              </div>
              <div v-else>
                <Message
                  :title="$t('businessQueuesAdmin.message.4.title')"
                  :content="$t('businessQueuesAdmin.message.4.content')" />
              </div>
            </div>
          </div>
          <div v-if="!loading" id="businessQueuesAdmin-result" class="mt-4">
            <div>
              <div v-if="state.queues.length === 0">
                <Message
                  :title="$t('businessQueuesAdmin.message.2.title')"
                  :content="$t('businessQueuesAdmin.message.2.content')" />
              </div>
              <div v-if="state.commerce" class="row mb-2">
                <div class="col-8 text-label">
                  <span>{{ $t("businessQueuesAdmin.listResult") }}</span>
                  <span class="fw-bold m-2">{{ state.queues.length }}</span>
                </div>
                <div class="col-4">
                  <button
                    class="btn btn-lg btn-size fw-bold btn-dark rounded-pill px-4"
                    @click="showAdd(queue)"
                    :disabled="!state.toggles['queues.admin.add']">
                    <i class="bi bi-plus-lg"></i>
                  </button>
                </div>
              </div>
              <div id="add-queue" class="queue-card mb-4" v-if="state.showAdd && state.toggles['queues.admin.add']">
                <div v-if="state.queues.length < state.toggles['queues.admin.limit']">
                  <div class="row g-1">
                    <div id="queue-name-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t("businessQueuesAdmin.name") }}
                      </div>
                      <div class="col-6">
                        <input
                          min="1"
                          max="50"
                          type="text"
                          class="form-control"
                          v-model="state.newQueue.name"
                          v-bind:class="{ 'is-invalid': state.nameAddError }"
                          placeholder="Service A">
                      </div>
                    </div>
                    <div id="queue-type-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t("businessQueuesAdmin.type") }}
                      </div>
                      <div class="col-6">
                        <select
                          class="btn btn-md btn-light fw-bold text-dark select"
                          v-model="state.newQueue.type"
                          id="types"
                          v-bind:class="{ 'is-invalid': state.typeError }"
                          @change="selectType(typ)">
                          <option v-for="typ in state.types" :key="typ.name" :value="typ.type">{{ typ.name }}</option>
                        </select>
                      </div>
                    </div>
                    <div v-if="state.newQueue.type === 'COLLABORATOR'" class="row g-1">
                      <div class="col-12 text-label">
                        <div class="dropdown">
                          <button class="btn btn-ligth dropdown-toggle m-1" type="button" id="select-commerce" data-bs-toggle="dropdown" aria-expanded="false">
                            <span class="fw-bold m-1"> {{ state.selectedCollaborator.name || $t("businessQueuesAdmin.selectCollaborator") }} </span>
                          </button>
                          <ul class="dropdown-menu" aria-labelledby="select-commerce">
                            <li v-for="col in state.collaborators" :key="col.id" :value="col" class="list-item">
                              <div class="row d-flex m-1 searcher" @click="selectCollaborator(state.newQueue, col)">
                                <div class="col-12">
                                  <div>
                                    <span class="item-title fw-bold"> {{ col.name }} </span>
                                  </div>
                                  <div v-if="col !== undefined">
                                    <span class="item-subtitle text-break"> {{ col.email }} </span>
                                  </div>
                                </div>
                              </div>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div v-if="state.newQueue.type === 'SERVICE'" class="row g-1">
                      <div class="col-12 text-label">
                        <div class="dropdown">
                          <button class="btn btn-ligth dropdown-toggle m-1" type="button" id="select-commerce" data-bs-toggle="dropdown" aria-expanded="false">
                            <span class="fw-bold m-1"> {{ state.selectedService.name || $t("businessQueuesAdmin.selectService") }} </span>
                          </button>
                          <ul class="dropdown-menu" aria-labelledby="select-commerce">
                            <li v-for="serv in state.services" :key="serv.id" :value="serv" class="list-item">
                              <div class="row d-flex m-1 searcher" @click="selectService(state.newQueue, serv)">
                                <div class="col-12">
                                  <div>
                                    <span class="item-title fw-bold"> {{ serv.name }} </span>
                                  </div>
                                  <div v-if="serv !== undefined">
                                    <span class="item-subtitle text-break"> {{ serv.tag }} </span>
                                  </div>
                                </div>
                              </div>
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                    <div id="queue-limit-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t("businessQueuesAdmin.limit") }}
                      </div>
                      <div class="col-6">
                        <input
                          min="1"
                          :max="state.toggles['queues.admin.queue-limit']"
                          type="number"
                          class="form-control"
                          v-model="state.newQueue.limit"
                          v-bind:class="{ 'is-invalid': state.limitAddError }"
                          placeholder="100">
                      </div>
                    </div>
                    <div id="queue-order-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t("businessQueuesAdmin.order") }}
                      </div>
                      <div class="col-6">
                        <input
                          min="1"
                          :max="state.queues.length + 1"
                          type="number"
                          class="form-control"
                          v-model="state.newQueue.order"
                          v-bind:class="{ 'is-invalid': state.orderAddError }"
                          placeholder="1">
                      </div>
                    </div>
                    <div id="queue-estimated-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t("businessQueuesAdmin.estimated") }}
                      </div>
                      <div class="col-6">
                        <input
                          min="1"
                          type="number"
                          class="form-control"
                          v-model="state.newQueue.estimatedTime"
                          v-bind:class="{ 'is-invalid': state.timeAddError }"
                          placeholder="1">
                      </div>
                    </div>
                    <div id="queue-block-form-add" class="row g-1">
                      <div class="col-6 text-label">
                        {{ $t("businessQueuesAdmin.blockTime") }}
                      </div>
                      <div class="col-6">
                        <input
                          min="1"
                          type="number"
                          class="form-control"
                          v-model="state.newQueue.blockTime"
                          placeholder="1">
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
                      <div id="add-queue-samecommerce-active-form" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessQueuesAdmin.walkin") }}
                        </div>
                        <div class="col-8">
                          <Toggle
                            v-model="state.newQueue.serviceInfo.walkin"
                            :disabled="!state.toggles['queues.admin.edit']"
                          />
                        </div>
                      </div>
                      <div id="add-queue-samecommerce-active-form" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessQueuesAdmin.sameCommeceHours") }}
                        </div>
                        <div class="col-8">
                          <Toggle
                            v-model="state.newQueue.serviceInfo.sameCommeceHours"
                            :disabled="!state.toggles['queues.admin.edit']"
                            @click="initializedSameCommerceHours(state.newQueue.serviceInfo)"
                          />
                        </div>
                      </div>
                      <div id="commerce-attentionHour-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessQueuesAdmin.attentionHour") }}
                        </div>
                        <div class="col-3">
                          <input
                            min="0"
                            max="24"
                            minlength="1"
                            maxlength="2"
                            type="number"
                            class="form-control"
                            v-model="state.newQueue.serviceInfo.attentionHourFrom"
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
                            v-model="state.newQueue.serviceInfo.attentionHourTo"
                            placeholder="Ex. 16">
                        </div>
                      </div>
                      <div id="add-queue-break-active-form" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessQueuesAdmin.break") }}
                        </div>
                        <div class="col-8">
                          <Toggle
                            v-model="state.newQueue.serviceInfo.break"
                            :disabled="!state.toggles['queues.admin.edit']"
                          />
                        </div>
                      </div>
                      <div id="queue-attentionBreak-form-add" v-if="state.newQueue.serviceInfo.break" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessQueuesAdmin.breakHour") }}
                        </div>
                        <div class="col-3">
                          <input
                            min="0"
                            max="24"
                            minlength="1"
                            maxlength="5"
                            type="number"
                            class="form-control"
                            v-model="state.newQueue.serviceInfo.breakHourFrom"
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
                            v-model="state.newQueue.serviceInfo.breakHourTo"
                            placeholder="Ex. 16">
                        </div>
                      </div>
                      <div id="queue-attentionDays-form-add" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessQueuesAdmin.attentionDays") }}
                        </div>
                        <div class="col-8">
                          <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="monday"
                              :checked="dayChecked(state.newQueue.serviceInfo, 1)"
                              @click="checkDay($event, state.newQueue.serviceInfo, 1)">
                            <label class="form-check-label" for="monday">{{ $t("days.1") }}</label>
                          </div>
                          <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="tuesday"
                              :checked="dayChecked(state.newQueue.serviceInfo, 2)"
                              @click="checkDay($event, state.newQueue.serviceInfo, 2)">
                            <label class="form-check-label" for="tuesday">{{ $t("days.2") }}</label>
                          </div>
                          <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="wednesday"
                              :checked="dayChecked(state.newQueue.serviceInfo, 3)"
                              @click="checkDay($event, state.newQueue.serviceInfo, 3)">
                            <label class="form-check-label" for="wednesday">{{ $t("days.3") }}</label>
                          </div>
                          <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="thursday"
                              :checked="dayChecked(state.newQueue.serviceInfo, 4)"
                              @click="checkDay($event, state.newQueue.serviceInfo, 4)">
                            <label class="form-check-label" for="thursday">{{ $t("days.4") }}</label>
                          </div>
                          <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="friday"
                              :checked="dayChecked(state.newQueue.serviceInfo, 5)"
                              @click="checkDay($event, state.newQueue.serviceInfo, 5)">
                            <label class="form-check-label" for="friday">{{ $t("days.5") }}</label>
                          </div>
                          <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="sabado"
                              :checked="dayChecked(state.newQueue.serviceInfo, 6)"
                              @click="checkDay($event, state.newQueue.serviceInfo, 6)">
                            <label class="form-check-label" for="sabado">{{ $t("days.6") }}</label>
                          </div>
                          <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="domingo"
                              :checked="dayChecked(state.newQueue.serviceInfo, 7)"
                              @click="checkDay($event, state.newQueue.serviceInfo, 7)">
                            <label class="form-check-label" for="domingo">{{ $t("days.7") }}</label>
                          </div>
                        </div>
                      </div>
                      <div id="add-queue-personalized-active-form" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessQueuesAdmin.personalized") }}
                        </div>
                        <div class="col-8">
                          <Toggle
                            v-model="state.newQueue.serviceInfo.personalized"
                            :disabled="!state.toggles['queues.admin.edit']"
                            @click="initializedParsonalizedHours(state.newQueue.serviceInfo)"
                          />
                        </div>
                      </div>
                      <div id="queue-personalized-form-add" v-if="state.newQueue.serviceInfo.personalized" class="row g-1">
                        <div class="row g-1" v-for="day in state.newQueue.serviceInfo.attentionDays" :key="day">
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
                              v-model="state.newQueue.serviceInfo.personalizedHours[day].attentionHourFrom"
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
                              v-model="state.newQueue.serviceInfo.personalizedHours[day].attentionHourTo"
                              placeholder="Ex. 16">
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="col">
                      <button
                        class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                        @click="add(state.newQueue)">
                        {{ $t("businessQueuesAdmin.add") }} <i class="bi bi-save"></i>
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
                    :title="$t('businessQueuesAdmin.message.3.title')"
                    :content="$t('businessQueuesAdmin.message.3.content')" />
                </div>
              </div>
              <div v-for="(queue, index) in state.queues" :key="index" class="queue-card">
                <div class="row">
                  <div class="col-10">
                    <QueueSimpleName :queue="queue"></QueueSimpleName>
                  </div>
                  <div class="col-2">
                    <a
                      href="#"
                      @click.prevent="showUpdateForm(index)">
                      <i :id="index" :class="`bi ${state.extendedEntity === index ? 'bi-chevron-up' : 'bi-chevron-down'}`"></i>
                    </a>
                  </div>
                </div>
                <div v-if="state.toggles['queues.admin.read']"
                  :class="{ show: state.extendedEntity === index }"
                  class="detailed-data transition-slow"
                  >
                  <div class="row g-1">
                    <div id="queue-link-form" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessQueuesAdmin.link") }}
                      </div>
                      <div class="col-8">
                        <a class="btn copy-icon"
                          @click="copyLink(queue)">
                          <i class="bi bi-file-earmark-spreadsheet"></i>
                        </a>
                        <a class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-2"
                            :href="`${getQueueLink(queue)}`"
                            target="_blank">
                          <i class="bi bi-box-arrow-up-right"></i> {{ $t("businessQueuesAdmin.go") }}
                        </a>
                      </div>
                    </div>
                    <div id="queue-name-form-update" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessQueuesAdmin.name") }}
                      </div>
                      <div class="col-8">
                        <input
                          min="1"
                          max="50"
                          type="text"
                          class="form-control"
                          v-model="queue.name"
                          v-bind:class="{ 'is-invalid': state.nameUpdateError }"
                          placeholder="Service A">
                      </div>
                    </div>
                    <div id="queue-type-form-update" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessQueuesAdmin.type") }}
                      </div>
                      <div class="col-8">
                        <input
                          :disabled="true"
                          type="text"
                          class="form-control"
                          v-model="queue.type"
                          placeholder="Type">
                      </div>
                    </div>
                    <div id="queue-limit-form-update" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessQueuesAdmin.limit") }}
                      </div>
                      <div class="col-8">
                        <input
                          :disabled="!state.toggles['queues.admin.edit']"
                          min="1"
                          :max="state.toggles['queues.admin.queue-limit']"
                          type="number"
                          class="form-control"
                          v-model="queue.limit"
                          v-bind:class="{ 'is-invalid': state.limitUpdateError }"
                          placeholder="100">
                      </div>
                    </div>
                    <div id="queue-order-form-update" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessQueuesAdmin.order") }}
                      </div>
                      <div class="col-8">
                        <input
                          :disabled="!state.toggles['queues.admin.edit']"
                          min="1"
                          :max="state.queues.length"
                          type="number"
                          class="form-control"
                          v-model="queue.order"
                          v-bind:class="{ 'is-invalid': state.orderUpdateError }"
                          placeholder="1">
                      </div>
                    </div>
                    <div id="queue-estimated-form-update" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessQueuesAdmin.estimated") }}
                      </div>
                      <div class="col-8">
                        <input
                          :disabled="!state.toggles['queues.admin.edit']"
                          min="1"
                          type="number"
                          class="form-control"
                          v-model="queue.estimatedTime"
                          v-bind:class="{ 'is-invalid': state.timeUpdateError }"
                          placeholder="1">
                      </div>
                    </div>
                    <div id="queue-block-form-update" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessQueuesAdmin.blockTime") }}
                      </div>
                      <div class="col-8">
                        <input
                          min="1"
                          type="number"
                          class="form-control"
                          v-model="queue.blockTime"
                          placeholder="1">
                      </div>
                    </div>
                    <div id="queue-active-form-update" class="row g-1">
                      <div class="col-4 text-label">
                        {{ $t("businessQueuesAdmin.active") }}
                      </div>
                      <div class="col-8">
                        <Toggle
                          v-model="queue.active"
                          :disabled="!state.toggles['queues.admin.edit']"
                        />
                      </div>
                    </div>
                    <!-- Datos de Servicio -->
                    <div class="row g-1">
                      <a
                        class="nav-link fw-bold"
                        data-bs-toggle="collapse"
                        href="#update-service">
                        {{ $t("businessQueuesAdmin.service") }} <i class="bi bi-chevron-down"></i>
                      </a>
                    </div>
                    <div id="update-service" class="collapse row m-0">
                      <div id="update-queue-samecommerce-active-form" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessQueuesAdmin.walkin") }}
                        </div>
                        <div class="col-8">
                          <Toggle
                            v-model="queue.serviceInfo.walkin"
                            :disabled="!state.toggles['queues.admin.edit']"
                          />
                        </div>
                      </div>
                      <div id="update-queue-samecommerce-active-form" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessQueuesAdmin.sameCommeceHours") }}
                        </div>
                        <div class="col-8">
                          <Toggle
                            v-model="queue.serviceInfo.sameCommeceHours"
                            :disabled="!state.toggles['queues.admin.edit']"
                            @click="initializedSameCommerceHours(queue.serviceInfo)"
                          />
                        </div>
                      </div>
                      <div id="queue-attentionHour-form-update" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessQueuesAdmin.attentionHour") }}
                        </div>
                        <div class="col-3">
                          <input
                            min="0"
                            max="24"
                            minlength="1"
                            maxlength="2"
                            type="number"
                            class="form-control"
                            v-model="queue.serviceInfo.attentionHourFrom"
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
                            v-model="queue.serviceInfo.attentionHourTo"
                            placeholder="Ex. 16">
                        </div>
                      </div>
                      <div id="update-queue-break-active-form" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessQueuesAdmin.break") }}
                        </div>
                        <div class="col-8">
                          <Toggle
                            v-model="queue.serviceInfo.break"
                            :disabled="!state.toggles['queues.admin.edit']"
                          />
                        </div>
                      </div>
                      <div id="queue-attentionBreak-form-update" v-if="queue.serviceInfo.break" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessQueuesAdmin.breakHour") }}
                        </div>
                        <div class="col-3">
                          <input
                            min="0"
                            max="24"
                            minlength="1"
                            maxlength="5"
                            type="number"
                            class="form-control"
                            v-model="queue.serviceInfo.breakHourFrom"
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
                            v-model="queue.serviceInfo.breakHourTo"
                            placeholder="Ex. 16">
                        </div>
                      </div>
                      <div id="queue-attentionDays-form-update" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessQueuesAdmin.attentionDays") }}
                        </div>
                        <div class="col-8">
                          <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="monday"
                              :checked="dayChecked(queue.serviceInfo, 1)"
                              @click="checkDay($event, queue.serviceInfo, 1)">
                            <label class="form-check-label" for="monday">{{ $t("days.1") }}</label>
                          </div>
                          <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="tuesday"
                              :checked="dayChecked(queue.serviceInfo, 2)"
                              @click="checkDay($event, queue.serviceInfo, 2)">
                            <label class="form-check-label" for="tuesday">{{ $t("days.2") }}</label>
                          </div>
                          <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="wednesday"
                              :checked="dayChecked(queue.serviceInfo, 3)"
                              @click="checkDay($event, queue.serviceInfo, 3)">
                            <label class="form-check-label" for="wednesday">{{ $t("days.3") }}</label>
                          </div>
                          <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="thursday"
                              :checked="dayChecked(queue.serviceInfo, 4)"
                              @click="checkDay($event, queue.serviceInfo, 4)">
                            <label class="form-check-label" for="thursday">{{ $t("days.4") }}</label>
                          </div>
                          <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="friday"
                              :checked="dayChecked(queue.serviceInfo, 5)"
                              @click="checkDay($event, queue.serviceInfo, 5)">
                            <label class="form-check-label" for="friday">{{ $t("days.5") }}</label>
                          </div>
                          <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="sabado"
                              :checked="dayChecked(queue.serviceInfo, 6)"
                              @click="checkDay($event, queue.serviceInfo, 6)">
                            <label class="form-check-label" for="sabado">{{ $t("days.6") }}</label>
                          </div>
                          <div class="form-check form-switch">
                            <input class="form-check-input" type="checkbox" id="domingo"
                              :checked="dayChecked(queue.serviceInfo, 7)"
                              @click="checkDay($event, queue.serviceInfo, 7)">
                            <label class="form-check-label" for="domingo">{{ $t("days.7") }}</label>
                          </div>
                        </div>
                      </div>
                      <div id="update-queue-personalized-active-form" class="row g-1">
                        <div class="col-4 text-label">
                          {{ $t("businessQueuesAdmin.personalized") }}
                        </div>
                        <div class="col-8">
                          <Toggle
                            v-model="queue.serviceInfo.personalized"
                            :disabled="!state.toggles['queues.admin.edit']"
                            @click="initializedParsonalizedHours(queue.serviceInfo)"
                          />
                        </div>
                      </div>
                      <div id="queue-personalized-form-update" v-if="queue.serviceInfo.personalized" class="row g-1">
                        <div class="row g-1" v-for="day in queue.serviceInfo.attentionDays" :key="day">
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
                              v-model="queue.serviceInfo.personalizedHours[day].attentionHourFrom"
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
                              v-model="queue.serviceInfo.personalizedHours[day].attentionHourTo"
                              placeholder="Ex. 16">
                          </div>
                        </div>
                      </div>
                    </div>
                    <div id="queue-id-form" class="row -2 mb-g3">
                      <div class="row queue-details-container">
                        <div class="col">
                          <span><strong>Id:</strong> {{ queue.id }}</span>
                        </div>
                      </div>
                    </div>
                    <div class="col">
                      <button
                        class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                        @click="update(queue)"
                        v-if="state.toggles['queues.admin.update']">
                        {{ $t("businessQueuesAdmin.update") }} <i class="bi bi-save"></i>
                      </button>
                      <button
                        class="btn btn-lg btn-size fw-bold btn-danger rounded-pill mt-2 px-4"
                        @click="goToUnavailable()"
                        v-if="state.toggles['queues.admin.unavailable']">
                        {{ $t("businessQueuesAdmin.unavailable") }} <i class="bi bi-trash-fill"></i>
                      </button>
                      <AreYouSure
                        :show="state.goToUnavailable"
                        :yesDisabled="state.toggles['queues.admin.unavailable']"
                        :noDisabled="state.toggles['queues.admin.unavailable']"
                        @actionYes="unavailable(queue)"
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
                <div v-if="(!isActiveBusiness() || !state.toggles['queues.admin.read']) && !loading">
                  <Message
                    :title="$t('businessQueuesAdmin.message.1.title')"
                    :content="$t('businessQueuesAdmin.message.1.content')" />
                </div>
              </div>
            </div>
          </div>
        </div>
        <div v-if="(!isActiveBusiness() || !state.toggles['queues.admin.view']) && !loading">
          <Message
            :title="$t('businessQueuesAdmin.message.1.title')"
            :content="$t('businessQueuesAdmin.message.1.content')" />
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
.queue-card {
  background-color: var(--color-background);
  padding: .5rem;
  margin-bottom: 1rem;
  border-radius: .5rem;
  border: .5px solid var(--gris-default);
  align-items: left;
}
.control-box {
  background-color: var(--color-background);
  padding: .5rem;
  margin: .1rem;
  border-radius: .5rem;
  border: 1.5px solid var(--gris-default);
}
.queue-details-container {
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
.detailed-data {
  width: 100%;
  max-height: 0px;
  height: auto;
  overflow: hidden;
  margin: 0px auto auto;
}
.copy-icon {
  color: var(--gris-default);
  cursor: pointer;
  margin: .5rem;
}
.list-item {
  cursor: pointer;
}
.searcher {
  display: flex;
  justify-content: center;
  align-items: center;
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
</style>