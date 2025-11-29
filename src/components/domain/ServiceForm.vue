<script>
import { ref, reactive, toRefs, onBeforeMount, watch, computed } from 'vue';
import { VueRecaptcha } from 'vue-recaptcha';
import Warning from '../common/Warning.vue';
import Message from '../common/Message.vue';
import QueueButton from '../common/QueueButton.vue';

export default {
  name: 'ServiceForm',
  components: { Warning, Message, VueRecaptcha, QueueButton },
  props: {
    commerce: { type: Object, default: {} },
    queue: { type: Object, default: {} },
    selectedServices: { type: Object, default: {} },
    receiveSelectedServices: { type: Function, default: () => {} },
  },
  async setup(props) {
    const loading = ref(false);

    const { commerce, queue, selectedServices } = toRefs(props);

    const { receiveSelectedServices } = props;

    const state = reactive({
      service: {},
      services: [],
      selectedServices: [],
      duration: 0,
      filteredServices: [],
      searchServiceText: undefined,
      counter: 0,
      page: 1,
      totalPages: 0,
      limit: 5,
    });

    onBeforeMount(async () => {
      try {
        loading.value = true;
        if (selectedServices.value && selectedServices.value.length > 0) {
          state.selectedServices.push(selectedServices.value);
        }
        if (queue.value && queue.value.id) {
          if (queue.value.services && queue.value.services.length > 0) {
            state.services = queue.value.services;
            refresh(queue.value.services);
          }
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    });

    const isActiveCommerce = () => commerce.value.active === true;

    const isActiveQueues = () =>
      ['COLLABORATOR', 'SELECT_SERVICE', 'MULTI_SERVICE'].includes(queue.value.type) &&
      queue.value.services;

    const checkService = (event, service) => {
      if (event.target.checked) {
        if (!state.selectedServices.includes(service)) {
          state.selectedServices.push(service);
        }
      } else {
        state.selectedServices = state.selectedServices.filter(el => el !== service);
      }
      receiveSelectedServices(state.selectedServices);
      state.duration = state.selectedServices.reduce(
        (acc, service) =>
          acc + (service.serviceInfo.blockTime || service.serviceInfo.estimatedTime),
        0
      );
    };

    const serviceChecked = service => {
      const selServices = selectedServices.value || state.selectedServices;
      state.selectedServices = selServices;
      if (state.selectedServices && state.selectedServices.length > 0) {
        state.duration = state.selectedServices.reduce(
          (acc, service) =>
            acc + (service.serviceInfo.blockTime || service.serviceInfo.estimatedTime),
          0
        );
        const ids = state.selectedServices.map(serv => serv.id);
        return ids.includes(service.id);
      }
      return false;
    };

    const clearSearchService = () => {
      state.searchServiceText = '';
      state.queue = {};
      refresh(state.filteredServices);
    };

    const setPage = pageIn => {
      state.page = pageIn;
    };

    const refresh = services => {
      if (services && services.length > 0) {
        const counter = services.length;
        state.counter = counter;
        const total = counter / state.limit;
        const totalB = Math.trunc(total);
        state.totalPages = totalB <= 0 ? 1 : counter % state.limit === 0 ? totalB : totalB + 1;
        const filtered = services.slice((state.page - 1) * state.limit, state.page * state.limit);
        state.filteredServices = filtered;
      } else {
        state.counter = 0;
        state.totalPages = 0;
      }
    };

    const convertDuration = duration => {
      if (duration) {
        if (duration > 0 && duration < 60) {
          return `${duration}m`;
        } else {
          const hours = Math.trunc(duration / 60);
          const minutes = duration % 60;
          if (minutes === 0) {
            return `${hours}h`;
          } else {
            return `${hours}h ${minutes}m`;
          }
        }
      }
    };

    const changeSearchServiceText = computed(() => {
      const { searchServiceText } = state;
      return {
        searchServiceText,
      };
    });

    const changePage = computed(() => {
      const { page } = state;
      return {
        page,
      };
    });

    watch(queue.value, async () => {
      state.selectedServices = [];
      state.duration = 0;
      receiveSelectedServices(state.selectedServices);
      if (queue.value && queue.value.id) {
        if (queue.value.services && queue.value.services.length > 0) {
          state.services = queue.value.services;
          refresh(queue.value.services);
        }
      }
    });

    watch(queue, async () => {
      state.selectedServices = [];
      state.duration = 0;
      state.page = 1;
      receiveSelectedServices(state.selectedServices);
      if (queue.value && queue.value.id) {
        if (queue.value.services && queue.value.services.length > 0) {
          state.services = queue.value.services;
          refresh(queue.value.services);
        }
      }
    });

    watch(changeSearchServiceText, async newData => {
      if (newData.searchServiceText && newData.searchServiceText.length > 3) {
        const searchText = newData.searchServiceText.toUpperCase();
        const services = queue.value.services;
        if (services && services.length > 0) {
          const result = services.filter(service =>
            service.name.toUpperCase().includes(searchText)
          );
          state.filteredServices = result;
        }
      } else {
        state.filteredServices = queue.value.services;
      }
      refresh(state.filteredServices);
    });

    watch(changePage, async newData => {
      if (newData.page) {
        refresh(queue.value.services);
      }
    });

    return {
      state,
      loading,
      commerce,
      queue,
      clearSearchService,
      setPage,
      isActiveCommerce,
      isActiveQueues,
      checkService,
      serviceChecked,
      convertDuration,
    };
  },
};
</script>
<template>
  <div>
    <div id="queues" v-if="isActiveCommerce() && isActiveQueues() && !loading" class="mb-2">
      <div class="choose-attention py-2">
        <span v-if="queue && queue.id" class="fw-bold">{{
          $t('commerceQueuesView.selectService')
        }}</span>
      </div>
      <div class="row g-1" v-if="state.services && state.services.length > 0">
        <div class="col col-md-10 offset-md-1 data-card">
          <div v-if="state.filteredServices">
            <div class="row col-md mb-2">
              <input
                min="1"
                max="50"
                type="text"
                class="col form-control mx-2 py-1"
                v-model="state.searchServiceText"
                :placeholder="$t('commerceQueuesView.searchServiceQueue')"
              />
              <button
                class="col-2 btn btn-md btn-size fw-bold btn-dark rounded-pill px-2 mx-2"
                @click="clearSearchService()"
              >
                <span><i class="bi bi-eraser-fill"></i></span>
              </button>
            </div>
          </div>
          <div
            class="centered mt-1"
            v-if="state.filteredServices && state.services.length > state.limit"
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
            v-for="service in state.filteredServices"
            :key="service.id"
            class="d-grid btn-group btn-group-justified mt-2"
          >
            <div class="btn-size btn-lg btn-block fw-bold queue-btn px-1">
              <div class="form-check form-switch">
                <div class="row">
                  <div class="col-1">
                    <input
                      class="form-check-input py-2 px-3 col-12"
                      type="checkbox"
                      :id="`queue-${service.id}`"
                      :checked="serviceChecked(service)"
                      @click="checkService($event, service)"
                    />
                  </div>
                  <div class="col">
                    <div class="row queue-time-title col-12">
                      <label class="form-check-label queue-title fw-bold" :for="service.name">{{
                        service.name
                      }}</label>
                    </div>
                    <div class="row queue-time-title col-12">
                      <span
                        ><i class="bi bi-stopwatch-fill"></i>
                        {{ $t('commerceQueuesView.duration') }}
                        {{
                          service.serviceInfo.blockTime || service.serviceInfo.estimatedTime
                        }}'</span
                      >
                      <span
                        v-if="service.serviceInfo.procedures && service.serviceInfo.procedures > 1"
                        ><i class="bi bi-person-up"></i> {{ $t('commerceQueuesView.procedures') }}
                        {{ service.serviceInfo.procedures }}</span
                      >
                    </div>
                  </div>
                </div>
              </div>
              <hr />
            </div>
          </div>
          <div class="col">
            <div class="badge rounded-pill bg-secondary py-2">
              <span>
                <i class="bi bi-stopwatch-fill"></i> {{ $t('commerceQueuesView.totalDuration') }}
                {{ convertDuration(state.duration) }}
              </span>
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
  margin-bottom: 0.5rem !important;
}
</style>
