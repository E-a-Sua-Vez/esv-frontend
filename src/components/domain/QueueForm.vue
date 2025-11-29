<script>
import { ref, reactive, toRefs, onBeforeMount, watch, computed } from 'vue';
import { getActiveFeature } from '../../shared/features';
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
                  const collaboratorsAux = collaborators.value.filter(
                    collaborator => collaborator.id === queue.collaboratorId
                  );
                  if (collaboratorsAux && collaboratorsAux.length > 0) {
                    queue.collaborator = collaboratorsAux[0];
                    queue.services = collaboratorsAux[0].services;
                    queue.servicesName = queue.services.map(serv => serv.name);
                  }
                  queueAux.push(queue);
                }
              });
              groupedQueues.value['COLLABORATOR'] = queueAux;
              state.filteredCollaboratorQueues = groupedQueues.value['COLLABORATOR'];
            } else {
              queues.value.forEach(queue => {
                if (queue.type === 'COLLABORATOR') {
                  const collaboratorsAux = collaborators.value.filter(
                    collaborator => collaborator.id === queue.collaboratorId
                  );
                  if (collaboratorsAux && collaboratorsAux.length > 0) {
                    queue.collaborator = collaboratorsAux[0];
                    queue.services = collaboratorsAux[0].services;
                    queue.servicesName = queue.services.map(serv => serv.name);
                  }
                  queue.services = services;
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
        receiveServices(state.queue.services);
      }
      if (['MULTI_SERVICE'].includes(queueIn.type)) {
        state.queue.services = await getServicesById(queueIn.servicesId);
        receiveServices(state.queue.services);
      }
      if (queueIn.type === 'SELECT_SERVICE') {
        const services = await getServiceByCommerce(commerce.value.id);
        if (services && services.length > 0) {
          state.queue.services = services.filter(serv => serv.type === 'SELECTABLE');
        }
        receiveServices(state.queue.services);
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
    };
  },
};
</script>
<template>
  <div>
    <div id="queues" v-if="isActiveCommerce() && !loading" class="mb-2">
      <div v-if="isActiveCommerce()" class="choose-attention py-2 pt-3">
        <i class="bi bi-2-circle-fill h5 m-1"></i>
        <span v-if="queues && queues.length > 0" class="fw-bold h6">{{
          $t('commerceQueuesView.choose')
        }}</span>
      </div>
      <div class="row g-1" v-if="isActiveQueues()">
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
                  class="btn-size btn btn-md btn-block col-12 fw-bold btn-dark rounded-pill mt-1 mb-1"
                  :class="state.showProfessional ? 'btn-selected' : ''"
                  @click="showByProfessional"
                  :disabled="!accept"
                >
                  {{ $t('commerceQueuesView.byCollaborator') }} <i class="bi bi-chevron-down"></i>
                </button>
              </div>
              <div
                v-if="getActiveFeature(commerce, 'attention-service-select', 'PRODUCT')"
                class="col-6"
              >
                <button
                  class="btn-size btn btn-md btn-block col-12 fw-bold btn-dark rounded-pill mt-1 queue-btn"
                  :class="state.showSelectServices ? 'btn-selected' : ''"
                  @click="showServices"
                  :disabled="!accept"
                >
                  {{ $t('commerceQueuesView.byService') }}
                </button>
              </div>
              <div v-else class="col-6">
                <button
                  class="btn-size btn btn-md btn-block col-12 fw-bold btn-dark rounded-pill mt-1 queue-btn"
                  :class="state.showService ? 'btn-selected' : ''"
                  @click="showByService"
                  :disabled="!accept"
                >
                  {{ $t('commerceQueuesView.byService') }} <i class="bi bi-chevron-down"></i>
                </button>
              </div>
            </div>
            <div
              :class="'mx-2 my-2'"
              id="attention-collaborator-queue"
              v-if="state.showProfessional"
            >
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
                v-if="
                  state.filteredCollaboratorQueues && state.filteredCollaboratorQueues.length > 0
                "
              >
                <div v-for="(queue, index) in state.filteredCollaboratorQueues" :key="index">
                  <QueueButton
                    :queue="queue"
                    :selected-queue="state.queue"
                    :get-queue="getQueue"
                    :accept="accept"
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
            <div :class="'mx-2 my-2'" id="attention-service-queue" v-if="state.showService">
              <div
                v-if="groupedQueues['SELECT_SERVICE'] && groupedQueues['SELECT_SERVICE'].length > 0"
              >
                <div v-for="(queue, index) in groupedQueues['SELECT_SERVICE']" :key="index">
                  <QueueButton
                    :queue="queue"
                    :selected-queue="state.queue"
                    :get-queue="getQueue"
                    :accept="accept"
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
                  >
                  </QueueButton>
                </div>
              </div>
              <div
                v-if="groupedQueues['MULTI_SERVICE'] && groupedQueues['MULTI_SERVICE'].length > 0"
              >
                <div v-for="(queue, index) in groupedQueues['MULTI_SERVICE']" :key="index">
                  <QueueButton
                    :queue="queue"
                    :selected-queue="state.queue"
                    :get-queue="getQueue"
                    :accept="accept"
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
                  >
                  </QueueButton>
                </div>
              </div>
            </div>
          </div>
          <div v-else>
            <div v-if="queues && queues.length === 1">
              <QueueButton
                :queue="queues[0]"
                :selected-queue="queues[0]"
                :get-queue="getQueue"
                :accept="accept"
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
  padding: 2rem 1.5rem;
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
</style>
