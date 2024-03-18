<script>
import { ref, reactive, toRefs, onBeforeMount, watch } from 'vue';
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
    receiveServices: { type: Function, default: () => {} }
  },
  async setup(props) {

    let loading = ref(false);

    const {
      commerce,
      queue,
    } = toRefs(props);

    const { receiveServices } = props;

    const state = reactive({
      service: {},
      services: [],
      selectedServices: [],
      duration: 0
    })

    onBeforeMount(async () => {
      try {
        loading.value = true;
        if (queue.value && queue.value.id) {
          if (queue.value.services && queue.value.services.length > 0) {
            state.services = queue.value.services;
          }
        }
        loading.value = false;
      } catch (error) {
        loading.value = false;
      }
    })

    const isActiveCommerce = () => {
      return commerce.value.active === true &&
        commerce.value.queues.length > 0
    };

    const isActiveQueues = () => {
      return queue.value.type === 'COLLABORATOR' && queue.value.services;
    };

    const checkService = (event, service) => {
      if (event.target.checked) {
        if (!state.selectedServices.includes(service)) {
          state.selectedServices.push(service);
        }
      } else {
        state.selectedServices = state.selectedServices.filter(el => el !== service);
      }
      receiveServices(state.selectedServices);
      state.duration = state.selectedServices.reduce((acc, service) => acc + (service.serviceInfo.blockTime || service.serviceInfo.estimatedTime), 0);
    }

    watch(
      queue,
      async () => {
        if (queue.value && queue.value.id) {
          if (queue.value.services && queue.value.services.length > 0) {
            state.services = queue.value.services;
          }
        }
      }
    )

    return {
      state,
      loading,
      commerce,
      queue,
      isActiveCommerce,
      isActiveQueues,
      checkService
    }
  }
}
</script>
<template>
  <div>
    <div id="queues" v-if="isActiveCommerce() && isActiveQueues() && !loading" class="mb-2">
      <div class="choose-attention py-2">
        <span v-if="queue && queue.id" class="fw-bold">{{ $t("commerceQueuesView.selectService") }}</span>
      </div>
      <div class="row g-1" v-if="state.services && state.services.length > 0">
        <div class="col col-md-10 offset-md-1 data-card">
          <div
            v-for="service in state.services"
            :key="service.id"
            class="d-grid btn-group btn-group-justified">
            <div class="btn-size btn-lg btn-block fw-bold col-12 mt-1 queue-btn px-4">
              <div class="form-check form-switch">
                <input class="form-check-input bnt-lg" type="checkbox" :id="service.name"
                  @click="checkService($event, service)">
                <div class="row queue-time-title">
                  <label class="form-check-label queue-title fw-bold" :for="service.name">{{ service.name }}</label>
                </div>
                <div class="row queue-time-title">
                  <span><i class="bi bi-stopwatch-fill"></i> {{ $t("commerceQueuesView.duration") }} {{ service.serviceInfo.blockTime || service.serviceInfo.estimatedTime }}'</span>
                </div>
              </div>
              <hr>
            </div>
          </div>
          <div class="col">
            <div class="badge rounded-pill bg-secondary py-2">
              <span> <i class="bi bi-stopwatch-fill"></i>  {{ $t("commerceQueuesView.totalDuration") }} {{ state.duration }} </span>
            </div>
          </div>
        </div>
      </div>
      <div v-else>
        <Message
          :title="$t('commerceQueuesView.message.title')"
          :content="$t('commerceQueuesView.message.content')">
        </Message>
      </div>
    </div>
  </div>
</template>
<style scoped>
.choose-attention {
  padding-bottom: 1rem;
  font-size: .9rem;
  font-weight: 500;
  line-height: 1rem;
}
.form-floating > label {
  text-align: center !important;
  transform-origin: center center !important;
  font-weight: 700;
  font-size: .9rem;
}
.form-control {
  border: 1.75px solid #ced4da !important;
  border-radius: 1rem !important;
  text-align: center;
  line-height: 1.5rem;
}
.data-card {
  background-color: var(--color-background);
  padding: .5rem;
  margin-bottom: 1rem;
  border-radius: .5rem;
  border: .5px solid var(--gris-default);
  align-items: left;
}
.examples {
  font-size: .8rem;
  line-height: 1rem;
  color: .5px solid var(--gris-default);
}
.queue-title {
  font-size: 1rem;
  line-height: 1rem;
  text-align: left;
}
.queue-time-title {
  font-size: .7rem;
  line-height: .8rem;
  font-weight: 500;
  text-align: left;
}
</style>