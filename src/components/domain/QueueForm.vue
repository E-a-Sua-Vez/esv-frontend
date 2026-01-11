<script>
import { ref, reactive, toRefs, onBeforeMount, watch, computed } from 'vue';
import { getActiveFeature, isTelemedicineEnabled } from '../../shared/features';
import { VueRecaptcha } from 'vue-recaptcha';
import { getServiceByCommerce, getServicesById } from '../../application/services/service';
import Warning from '../common/Warning.vue';
import Message from '../common/Message.vue';
import QueueButton from '../common/QueueButton.vue';

export default {
  name: 'QueueForm',
  components: { Warning, Message, VueRecaptcha, QueueButton },
  props: {
    commerce: { type: Object, default: {} },
    queues: { type: Array, default: [] },
    groupedQueues: { type: Object, default: {} },
    queueId: { type: String, default: undefined },
    accept: { type: Boolean, default: false },
    collaborators: { type: Array, default: [] },
    receiveQueue: { type: Function, default: () => {} },
    receiveServices: { type: Function, default: () => {} },
    preselectedServiceId: { type: String, default: null }, // Service ID to filter collaborators
  },
  async setup(props) {
    const loading = ref(false);
    const captchaEnabled = import.meta.env.VITE_RECAPTCHA_ENABLED || false;

    const { commerce, queues, groupedQueues, collaborators, queueId, accept } = toRefs(props);

    const { receiveQueue, receiveServices } = props;

    const state = reactive({
      queue: {},
      showProfessional: false,
      showService: false,
      showSelectServices: false,
      filteredCollaboratorQueues: [],
      searchCollaboratorText: undefined,
      counter: 0,
      page: 1,
      totalPages: 0,
      limit: 5,
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        if (queues.value && queues.value.length > 0) {
          const collaboratorQueues = queues.value.filter(queue => queue.type === 'COLLABORATOR');
          if (collaboratorQueues && collaboratorQueues.length > 0) {
            if (getActiveFeature(commerce.value, 'attention-queue-typegrouped', 'PRODUCT')) {
              const queues = groupedQueues.value['COLLABORATOR'];
              const queueAux = [];
              queues.forEach(queue => {
                if (queue.type === 'COLLABORATOR') {
                  const collaboratorsAux = collaborators.value.filter(collaborator => {
                    // If preselectedServiceId is provided, filter collaborators that have this service
                    if (props.preselectedServiceId) {
                      const hasService =
                        collaborator.services &&
                        collaborator.services.some(
                          service => service.id === props.preselectedServiceId
                        );
                      return collaborator.id === queue.collaboratorId && hasService;
                    }
                    return collaborator.id === queue.collaboratorId;
                  });
                  if (collaboratorsAux && collaboratorsAux.length > 0) {
                    queue.collaborator = collaboratorsAux[0];
                    // If preselectedServiceId is provided, filter services to show only that service
                    if (props.preselectedServiceId && collaboratorsAux[0].services) {
                      const filteredServices = collaboratorsAux[0].services.filter(
                        service => service.id === props.preselectedServiceId
                      );
                      queue.services = filteredServices;
                      queue.servicesName =
                        filteredServices.length > 0 ? filteredServices.map(serv => serv.name) : [];
                    } else {
                      queue.services = collaboratorsAux[0].services || [];
                      queue.servicesName =
                        collaboratorsAux[0].services && collaboratorsAux[0].services.length > 0
                          ? collaboratorsAux[0].services.map(serv => serv.name)
                          : [];
                    }
                  }
                  queueAux.push(queue);
                }
              });
              groupedQueues.value['COLLABORATOR'] = queueAux;
              state.filteredCollaboratorQueues = groupedQueues.value['COLLABORATOR'];
            } else {
              queues.value.forEach(queue => {
                if (queue.type === 'COLLABORATOR') {
                  const collaboratorsAux = collaborators.value.filter(collaborator => {
                    // If preselectedServiceId is provided, filter collaborators that have this service
                    if (props.preselectedServiceId) {
                      const hasService =
                        collaborator.services &&
                        collaborator.services.some(
                          service => service.id === props.preselectedServiceId
                        );
                      return collaborator.id === queue.collaboratorId && hasService;
                    }
                    return collaborator.id === queue.collaboratorId;
                  });
                  if (collaboratorsAux && collaboratorsAux.length > 0) {
                    queue.collaborator = collaboratorsAux[0];
                    // If preselectedServiceId is provided, filter services to show only that service
                    if (props.preselectedServiceId && collaboratorsAux[0].services) {
                      const filteredServices = collaboratorsAux[0].services.filter(
                        service => service.id === props.preselectedServiceId
                      );
                      queue.services = filteredServices;
                      queue.servicesName =
                        filteredServices.length > 0 ? filteredServices.map(serv => serv.name) : [];
                    } else {
                      queue.services = collaboratorsAux[0].services || [];
                      queue.servicesName =
                        collaboratorsAux[0].services && collaboratorsAux[0].services.length > 0
                          ? collaboratorsAux[0].services.map(serv => serv.name)
                          : [];
                    }
                  }
                }
              });
            }
            state.filteredCollaboratorQueues = groupedQueues.value['COLLABORATOR'];
            refresh(state.filteredCollaboratorQueues);
          }
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    });

    const isActiveCommerce = () => commerce.value.active === true;

    const isActiveQueues = () =>
      commerce.value !== undefined && queues.value !== undefined && queues.value.length > 0;

    const getQueue = async queueIn => {
      state.queue = queueIn;
      if (['SERVICE'].includes(queueIn.type)) {
        // If preselectedServiceId is provided, filter services to show only that service
        let servicesToSend = state.queue.services;
        if (props.preselectedServiceId && servicesToSend) {
          servicesToSend = servicesToSend.filter(
            service => service.id === props.preselectedServiceId
          );
        }
        receiveServices(servicesToSend);
      }
      if (['MULTI_SERVICE'].includes(queueIn.type)) {
        state.queue.services = await getServicesById(queueIn.servicesId);
        // If preselectedServiceId is provided, filter services to show only that service
        let servicesToSend = state.queue.services;
        if (props.preselectedServiceId && servicesToSend) {
          servicesToSend = servicesToSend.filter(
            service => service.id === props.preselectedServiceId
          );
        }
        receiveServices(servicesToSend);
      }
      if (queueIn.type === 'SELECT_SERVICE') {
        const services = await getServiceByCommerce(commerce.value.id);
        if (services && services.length > 0) {
          let filteredServices = services.filter(serv => serv.type === 'SELECTABLE');
          // If preselectedServiceId is provided, filter services to show only that service
          if (props.preselectedServiceId) {
            filteredServices = filteredServices.filter(
              service => service.id === props.preselectedServiceId
            );
          }
          state.queue.services = filteredServices;
        }
        receiveServices(state.queue.services);
      }
      // For COLLABORATOR queues, filter services if preselectedServiceId is provided
      if (queueIn.type === 'COLLABORATOR' && props.preselectedServiceId && queueIn.services) {
        const filteredServices = queueIn.services.filter(
          service => service.id === props.preselectedServiceId
        );
        state.queue.services = filteredServices;
        receiveServices(filteredServices);
      } else if (queueIn.type === 'COLLABORATOR') {
        receiveServices(queueIn.services || []);
      }
      receiveQueue(state.queue);
    };

    const showByProfessional = () => {
      state.showProfessional = true;
      state.showService = false;
      state.showSelectServices = false;
      receiveQueue({});
      receiveServices([]);
    };

    const showByService = () => {
      state.showService = true;
      state.showProfessional = false;
      state.showSelectServices = false;
      receiveQueue({});
      receiveServices([]);
    };

    const showServices = () => {
      state.showService = false;
      state.showProfessional = false;
      state.showSelectServices = true;
      const queues = groupedQueues.value['SELECT_SERVICE'];
      if (queues.length > 0) {
        getQueue(queues[0]);
      }
      receiveQueue({});
      receiveServices([]);
    };

    const clearSearchCollaborator = () => {
      state.searchCollaboratorText = '';
      state.queue = {};
      getQueue(state.queue);
      refresh(state.filteredCollaboratorQueues);
    };

    const setPage = pageIn => {
      state.page = pageIn;
    };

    const refresh = queues => {
      if (queues && queues.length > 0) {
        const counter = queues.length;
        state.counter = counter;
        const total = counter / state.limit;
        const totalB = Math.trunc(total);
        state.totalPages = totalB <= 0 ? 1 : counter % state.limit === 0 ? totalB : totalB + 1;
        const filtered = queues.slice((state.page - 1) * state.limit, state.page * state.limit);
        state.filteredCollaboratorQueues = filtered;
      } else {
        state.counter = 0;
        state.totalPages = 0;
      }
    };

    const changeSearchCollaboratorText = computed(() => {
      const { searchCollaboratorText } = state;
      return {
        searchCollaboratorText,
      };
    });

    const changePage = computed(() => {
      const { page } = state;
      return {
        page,
      };
    });

    watch(changeSearchCollaboratorText, async newData => {
      if (newData.searchCollaboratorText && newData.searchCollaboratorText.length > 3) {
        if (state.queue && state.queue.id) {
          state.queue = {};
          getQueue(state.queue);
        }
        const searchText = newData.searchCollaboratorText.toUpperCase();
        const collaboratorQueues = groupedQueues.value['COLLABORATOR'];
        if (collaboratorQueues && collaboratorQueues.length > 0) {
          const result = collaboratorQueues.filter(queue => {
            const containQueueName = queue.name.toUpperCase().includes(searchText);
            const containCollaboratorName = queue.collaborator.name
              .toUpperCase()
              .includes(searchText);
            const containServiceName = queue.servicesName.filter(service =>
              service.toUpperCase().includes(searchText)
            );
            if (
              containQueueName === true ||
              containCollaboratorName === true ||
              containServiceName.length > 0
            ) {
              return queue;
            }
          });
          state.filteredCollaboratorQueues = result;
        }
      } else {
        state.filteredCollaboratorQueues = groupedQueues.value['COLLABORATOR'];
      }
      refresh(state.filteredCollaboratorQueues);
    });

    watch(changePage, async newData => {
      if (newData.page) {
        refresh(groupedQueues.value['COLLABORATOR']);
      }
    });

    return {
      state,
      captchaEnabled,
      loading,
      commerce,
      queues,
      groupedQueues,
      queueId,
      accept,
      setPage,
      clearSearchCollaborator,
      isActiveCommerce,
      getActiveFeature,
      getQueue,
      isActiveQueues,
      showByProfessional,
      showByService,
      showServices,
      isTelemedicineEnabled,
    };
  },
};
</script>
<template>
  <div>
    <div id="queues" v-if="isActiveCommerce() && !loading" class="mb-2">
      <div v-if="isActiveCommerce()" class="choose-attention py-2 pt-3 centered">
        <i class="bi bi-2-circle-fill h5 m-1"></i>
        <span v-if="queues && queues.length > 0" class="fw-bold h6">{{
          $t('commerceQueuesView.choose')
        }}</span>
      </div>
      <div class="row g-1" v-if="isActiveQueues()">
        <!-- Selection Buttons Card -->
        <div class="col col-md-10 offset-md-1 data-card">
          <div
            v-if="
              (!queueId || queueId === 'undefined') &&
              getActiveFeature(commerce, 'attention-queue-typegrouped', 'PRODUCT')
            "
          >
            <div class="row">
              <div class="col-6">
                <button
                  class="btn-size btn btn-md btn-block col-12 fw-bold btn-step-action rounded-pill mt-1 mb-1 px-3 py-2"
                  :class="state.showProfessional ? 'btn-selected' : ''"
                  @click="showByProfessional"
                  :disabled="!accept"
                >
                  <i class="bi bi-person-circle me-2"></i>
                  {{ $t('commerceQueuesView.byCollaborator') }}
                </button>
              </div>
              <div
                v-if="getActiveFeature(commerce, 'attention-service-select', 'PRODUCT')"
                class="col-6"
              >
                <button
                  class="btn-size btn btn-md btn-block col-12 fw-bold btn-step-action rounded-pill mt-1 mb-1 px-3 py-2 queue-btn"
                  :class="state.showSelectServices ? 'btn-selected' : ''"
                  @click="showServices"
                  :disabled="!accept"
                >
                  <i class="bi bi-hand-index-thumb-fill me-2"></i>
                  {{ $t('commerceQueuesView.byService') }}
                </button>
              </div>
              <div v-else class="col-6">
                <button
                  class="btn-size btn btn-md btn-block col-12 fw-bold btn-step-action rounded-pill mt-1 mb-1 px-3 py-2 queue-btn"
                  :class="state.showService ? 'btn-selected' : ''"
                  @click="showByService"
                  :disabled="!accept"
                >
                  <i class="bi bi-tag-fill me-2"></i>
                  {{ $t('commerceQueuesView.byService') }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Professional Selection Content Card -->
        <div class="col col-md-10 offset-md-1 data-card" v-if="state.showProfessional">
          <div class="choose-attention py-2">
            <span class="fw-bold">{{ $t('commerceQueuesView.byCollaboratorTitle') }}</span>
          </div>
          <div id="attention-collaborator-queue">
            <div v-if="state.filteredCollaboratorQueues">
              <div class="row col-md mb-2">
                <input
                  min="1"
                  max="50"
                  type="text"
                  class="col form-control mx-2"
                  v-model="state.searchCollaboratorText"
                  :placeholder="$t('commerceQueuesView.searchCollaboratorQueue')"
                />
                <button
                  class="col-2 btn btn-sm btn-size fw-bold btn-dark rounded-pill px-2 mx-2"
                  @click="clearSearchCollaborator()"
                >
                  <span><i class="bi bi-eraser-fill"></i></span>
                </button>
              </div>
            </div>
            <div
              class="centered mt-1"
              v-if="state.filteredCollaboratorQueues && collaborators.length > state.limit"
            >
              <nav>
                <ul class="pagination pagination-ul">
                  <li class="page-item">
                    <button
                      class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-3 py-1"
                      aria-label="Previous"
                      @click="setPage(state.page - 1)"
                      :disabled="state.page === 1 || state.totalPages === 0"
                    >
                      <span aria-hidden="true">&laquo;</span>
                    </button>
                  </li>
                  <li>
                    <select
                      class="btn btn-md btn-light fw-bold text-dark select mx-1 py-1"
                      v-model="state.page"
                      :disabled="state.totalPages === 0"
                    >
                      <option
                        v-for="pag in state.totalPages"
                        :key="pag"
                        :value="pag"
                        id="select-queue"
                      >
                        {{ pag }}
                      </option>
                    </select>
                  </li>
                  <li class="page-item">
                    <button
                      class="btn btn-md btn-size fw-bold btn-dark rounded-pill px-3 py-1"
                      aria-label="Next"
                      @click="setPage(state.page + 1)"
                      :disabled="state.page === state.totalPages || state.totalPages === 0"
                    >
                      <span aria-hidden="true">&raquo;</span>
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
            <div
              v-if="state.filteredCollaboratorQueues && state.filteredCollaboratorQueues.length > 0"
            >
              <div v-for="(queue, index) in state.filteredCollaboratorQueues" :key="index">
                <QueueButton
                  :queue="queue"
                  :selected-queue="state.queue"
                  :get-queue="getQueue"
                  :accept="accept"
                  :telemedicine-enabled="isTelemedicineEnabled(commerce, queue)"
                  :presential-enabled="queue.presentialEnabled !== false"
                >
                </QueueButton>
              </div>
            </div>
            <div v-else>
              <Message
                :title="$t('commerceQueuesView.message.title')"
                :content="$t('commerceQueuesView.message.content')"
              >
              </Message>
            </div>
          </div>
        </div>

        <!-- Service Selection Content Card -->
        <div class="col col-md-10 offset-md-1 data-card" v-if="state.showService">
          <div id="attention-service-queue">
            <div
              v-if="groupedQueues['SELECT_SERVICE'] && groupedQueues['SELECT_SERVICE'].length > 0"
            >
              <div v-for="(queue, index) in groupedQueues['SELECT_SERVICE']" :key="index">
                <QueueButton
                  :queue="queue"
                  :selected-queue="state.queue"
                  :get-queue="getQueue"
                  :accept="accept"
                  :telemedicine-enabled="isTelemedicineEnabled(commerce, queue)"
                  :presential-enabled="queue.presentialEnabled !== false"
                >
                </QueueButton>
              </div>
            </div>
            <div v-if="groupedQueues['SERVICE'] && groupedQueues['SERVICE'].length > 0">
              <div v-for="(queue, index) in groupedQueues['SERVICE']" :key="index">
                <QueueButton
                  :queue="queue"
                  :selected-queue="state.queue"
                  :get-queue="getQueue"
                  :accept="accept"
                  :telemedicine-enabled="isTelemedicineEnabled(commerce, queue)"
                  :presential-enabled="queue.presentialEnabled !== false"
                >
                </QueueButton>
              </div>
            </div>
            <div v-if="groupedQueues['MULTI_SERVICE'] && groupedQueues['MULTI_SERVICE'].length > 0">
              <div v-for="(queue, index) in groupedQueues['MULTI_SERVICE']" :key="index">
                <QueueButton
                  :queue="queue"
                  :selected-queue="state.queue"
                  :get-queue="getQueue"
                  :accept="accept"
                  :telemedicine-enabled="isTelemedicineEnabled(commerce, queue)"
                  :presential-enabled="queue.presentialEnabled !== false"
                >
                </QueueButton>
              </div>
            </div>
            <div v-if="groupedQueues['STANDARD'] && groupedQueues['STANDARD'].length > 0">
              <div v-for="(queue, index) in groupedQueues['STANDARD']" :key="index">
                <QueueButton
                  :queue="queue"
                  :selected-queue="state.queue"
                  :get-queue="getQueue"
                  :accept="accept"
                  :telemedicine-enabled="isTelemedicineEnabled(commerce, queue)"
                  :presential-enabled="queue.presentialEnabled !== false"
                >
                </QueueButton>
              </div>
            </div>
          </div>
        </div>

        <!-- Other queue types (not grouped) -->
        <div
          class="col col-md-10 offset-md-1 data-card"
          v-if="
            !getActiveFeature(commerce, 'attention-queue-typegrouped', 'PRODUCT') ||
            (queueId && queueId !== 'undefined')
          "
        >
          <div>
            <div v-if="queues && queues.length === 1">
              <QueueButton
                :queue="queues[0]"
                :selected-queue="queues[0]"
                :get-queue="getQueue"
                :accept="accept"
                :telemedicine-enabled="isTelemedicineEnabled(commerce, queues[0])"
                :presential-enabled="queues[0].presentialEnabled !== false"
              >
              </QueueButton>
            </div>
            <div v-else>
              <div
                v-for="queue in queues"
                :key="queue.id"
                class="d-grid btn-group btn-group-justified"
              >
                <QueueButton
                  :queue="queue"
                  :selected-queue="state.queue"
                  :get-queue="getQueue"
                  :accept="accept"
                  :telemedicine-enabled="isTelemedicineEnabled(commerce, queue)"
                  :presential-enabled="queue.presentialEnabled !== false"
                >
                </QueueButton>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-else>
        <Message
          :title="$t('commerceQueuesView.message.title')"
          :content="$t('commerceQueuesView.message.content')"
        >
        </Message>
      </div>
    </div>
  </div>
</template>
<style scoped>
.choose-attention {
  padding-bottom: 1rem;
  font-size: 0.9rem;
  font-weight: 500;
  line-height: 1rem;
}
.form-floating > label {
  text-align: center !important;
  transform-origin: center center !important;
  font-weight: 700;
  font-size: 0.9rem;
}
.form-control {
  border: 1.75px solid #ced4da !important;
  border-radius: 1rem !important;
  text-align: center;
  line-height: 1.5rem;
}
.data-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.98) 100%);
  padding: 2rem .5rem;
  margin-bottom: 1.5rem;
  border-radius: 1rem;
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  align-items: left;
}

.data-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}
.examples {
  font-size: 0.8rem;
  line-height: 1rem;
  color: 0.5px solid var(--gris-default);
}
.queue-btn {
  border: 0.5px solid var(--gris-default);
}
.queue-title {
  font-size: 1rem;
  line-height: 1rem;
  text-align: left;
}
.queue-time-title {
  font-size: 0.7rem;
  line-height: 0.8rem;
  font-weight: 500;
  text-align: left;
}
.pagination-ul {
  margin-bottom: 0rem !important;
}

/* Step Action Buttons */
.btn-step-action {
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%) !important;
  border: none !important;
  color: white !important;
  font-size: 1.05rem;
  font-weight: 700;
  letter-spacing: 0.3px;
  box-shadow: 0 4px 15px rgba(0, 74, 173, 0.3);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  min-height: 45px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-step-action::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s ease;
}

.btn-step-action:hover:not(:disabled)::before {
  left: 100%;
}

.btn-step-action:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 6px 20px rgba(0, 74, 173, 0.5);
}

.btn-step-action:active:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 3px 10px rgba(0, 74, 173, 0.4);
}

.btn-step-action:disabled {
  background: linear-gradient(135deg, #a9a9a9 0%, #808080 100%) !important;
  box-shadow: none;
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-step-action.btn-selected {
  background: linear-gradient(135deg, var(--verde-tu) 0%, var(--azul-turno) 100%) !important;
  box-shadow: 0 4px 20px rgba(0, 194, 203, 0.5);
  animation: selectedPulse 1.5s ease-in-out infinite;
}

@keyframes selectedPulse {
  0%,
  100% {
    box-shadow: 0 4px 20px rgba(0, 194, 203, 0.5);
  }
  50% {
    box-shadow: 0 4px 30px rgba(0, 194, 203, 0.7), 0 0 20px rgba(0, 194, 203, 0.4);
  }
}

.btn-step-action i {
  font-size: 1.1rem;
  vertical-align: middle;
  transition: transform 0.3s ease;
}

.btn-step-action:hover:not(:disabled) .bi-chevron-down {
  animation: chevronBounce 0.6s ease-in-out infinite;
}

@keyframes chevronBounce {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(4px);
  }
}
</style>
