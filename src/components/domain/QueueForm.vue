<script>
import { ref, reactive, toRefs, onBeforeMount } from 'vue';
import { getActiveFeature } from '../../shared/features';
import { VueRecaptcha } from 'vue-recaptcha';
import { getCollaboratorsByCommerceId } from '../../application/services/collaborator';
import { getServiceByCommerce } from '../../application/services/service';
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
    receiveQueue: { type: Function, default: () => {} },
    receiveServices: { type: Function, default: () => {} }
  },
  async setup(props) {

    let loading = ref(false);
    const captchaEnabled = import.meta.env.VITE_RECAPTCHA_ENABLED || false;

    const {
      commerce,
      queues,
      groupedQueues,
      queueId,
      accept
    } = toRefs(props);

    const { receiveQueue, receiveServices } = props;

    const state = reactive({
      queue: {},
      showProfessional: false,
      showService: false
    })

    onBeforeMount(async () => {
      try {
        loading.value = true;
        if (queues.value && queues.value.length > 0) {
          const collaboratorQueues = queues.value.filter(queue => queue.type === 'COLLABORATOR');
          if (collaboratorQueues && collaboratorQueues.length > 0) {
            const collaborators = await getCollaboratorsByCommerceId(commerce.value.id);
            if (getActiveFeature(commerce.value, 'attention-queue-typegrouped', 'PRODUCT')) {
              const queues = groupedQueues.value['COLLABORATOR'];
              const queueAux = [];
              queues.forEach(queue => {
                if (queue.type === 'COLLABORATOR') {
                  const collaboratorsAux = collaborators.filter(collaborator => collaborator.id === queue.collaboratorId);
                  if (collaboratorsAux && collaboratorsAux.length > 0) {
                    queue.services = collaboratorsAux[0].services;
                    queue.servicesName = queue.services.map(serv => serv.name);
                  }
                  queueAux.push(queue);
                }
              })
              groupedQueues.value['COLLABORATOR'] = queueAux;
            } else {
              queues.value.forEach(queue => {
                if (queue.type === 'COLLABORATOR') {
                  const collaboratorsAux = collaborators.filter(collaborator => collaborator.id === queue.collaboratorId);
                  if (collaboratorsAux && collaboratorsAux.length > 0) {
                    queue.services = collaboratorsAux[0].services;
                    queue.servicesName = queue.services.map(serv => serv.name);
                  }
                  queue.services = services;
                }
              })
            }
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
      return commerce.value !== undefined && commerce.value.queues !== undefined && commerce.value.queues.length > 0;
    };

    const getQueue = async (queueIn) => {
      state.queue = queueIn;
      if (['SERVICE', 'MULTI_SERVICE'].includes(queueIn.type)) {
        receiveServices(state.queue.services);
      }
      if (queueIn.type === 'SELECT_SERVICE') {
        state.queue.services = await getServiceByCommerce(commerce.value.id);
        receiveServices(state.queue.services);
      }
      receiveQueue(state.queue);
    }

    const showByProfessional = () => {
      state.showProfessional = true;
      state.showService = false;
      receiveQueue({});
      receiveServices([]);
    }

    const showByService = () => {
      state.showService = true;
      state.showProfessional = false;
      receiveQueue({});
      receiveServices([]);
    }

    const showServices = () => {
      state.showService = false;
      state.showProfessional = false;
      const queues = groupedQueues.value['SELECT_SERVICE'];
      if (queues.length > 0) {
        getQueue(queues[0]);
      }
      receiveQueue({});
      receiveServices([]);
    }

    return {
      state,
      captchaEnabled,
      loading,
      commerce,
      queues,
      groupedQueues,
      queueId,
      accept,
      isActiveCommerce,
      getActiveFeature,
      getQueue,
      isActiveQueues,
      showByProfessional,
      showByService,
      showServices
    }
  }
}
</script>
<template>
  <div>
    <div id="queues" v-if="isActiveCommerce() && !loading" class="mb-2">
      <div v-if="isActiveCommerce()" class="choose-attention py-2">
        <span v-if="queues && queues.length > 0" class="fw-bold">{{ $t("commerceQueuesView.choose") }}</span>
      </div>
      <div class="row g-1" v-if="isActiveQueues()">
        <div class="col col-md-10 offset-md-1 data-card">
          <div v-if="(!queueId || queueId === 'undefined') && getActiveFeature(commerce, 'attention-queue-typegrouped', 'PRODUCT')">
            <div class="row">
              <div class="col-6">
                <button
                  class="btn-size btn btn-md btn-block col-12 fw-bold btn-dark rounded-pill mt-1 mb-1"
                  data-bs-toggle="collapse"
                  href="#attention-collaborator-queue"
                  @click="showByProfessional"
                  :disabled="!accept">
                  {{ $t("commerceQueuesView.byCollaborator") }} <i class="bi bi-chevron-down"></i>
                </button>
              </div>
              <div v-if="getActiveFeature(commerce, 'attention-service-select', 'PRODUCT')" class="col-6">
                <button
                  class="btn-size btn btn-md btn-block col-12 fw-bold btn-dark rounded-pill mt-1 queue-btn"
                  data-bs-toggle="collapse"
                  href="#attention-service-queue"
                  @click="showServices"
                  :disabled="!accept">
                  {{ $t("commerceQueuesView.byService") }}
                </button>
              </div>
              <div v-else class="col-6">
                <button
                  class="btn-size btn btn-md btn-block col-12 fw-bold btn-dark rounded-pill mt-1 queue-btn"
                  data-bs-toggle="collapse"
                  href="#attention-service-queue"
                  @click="showByService"
                  :disabled="!accept">
                  {{ $t("commerceQueuesView.byService") }} <i class="bi bi-chevron-down"></i>
                </button>
              </div>
            </div>
            <div :class="' mx-2 my-2'" id="attention-collaborator-queue" v-if="state.showProfessional">
              <div v-if="groupedQueues['COLLABORATOR'] && groupedQueues['COLLABORATOR'].length > 0">
                <div v-for="(queue, index) in groupedQueues['COLLABORATOR']" :key="index">
                  <QueueButton
                    :queue="queue"
                    :selectedQueue="state.queue"
                    :getQueue="getQueue"
                    :accept="accept"
                  >
                  </QueueButton>
                </div>
              </div>
            </div>
            <div :class="' mx-2 my-2'" id="attention-service-queue" v-if="state.showService">
              <div v-if="groupedQueues['SERVICE'] && groupedQueues['SERVICE'].length > 0">
                <div v-for="(queue, index) in groupedQueues['SERVICE']" :key="index">
                  <QueueButton
                    :queue="queue"
                    :selectedQueue="state.queue"
                    :getQueue="getQueue"
                    :accept="accept"
                  >
                  </QueueButton>
                </div>
              </div>
              <div v-if="groupedQueues['MULTI_SERVICE'] && groupedQueues['MULTI_SERVICE'].length > 0">
                <div v-for="(queue, index) in groupedQueues['MULTI_SERVICE']" :key="index">
                  <QueueButton
                    :queue="queue"
                    :selectedQueue="state.queue"
                    :getQueue="getQueue"
                    :accept="accept"
                  >
                  </QueueButton>
                </div>
              </div>
              <div v-if="groupedQueues['STANDARD'] && groupedQueues['STANDARD'].length > 0">
                <div v-for="(queue, index) in groupedQueues['STANDARD']" :key="index">
                  <QueueButton
                    :queue="queue"
                    :selectedQueue="state.queue"
                    :getQueue="getQueue"
                    :accept="accept"
                  >
                  </QueueButton>
                </div>
              </div>
              <div v-if="getActiveFeature(state.commerce, 'attention-service-select', 'PRODUCT')">
                <div v-if="groupedQueues['SELECT_SERVICE'] && groupedQueues['SELECT_SERVICE'].length > 0">
                  <div v-for="(queue, index) in groupedQueues['SELECT_SERVICE']" :key="index">
                    <QueueButton
                      :queue="queue"
                      :selectedQueue="state.queue"
                      :getQueue="getQueue"
                      :accept="accept"
                    >
                    </QueueButton>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else>
            <div
              v-for="queue in queues"
              :key="queue.id"
              class="d-grid btn-group btn-group-justified">
              <QueueButton
                :queue="queue"
                :selectedQueue="state.queue"
                :getQueue="getQueue"
                :accept="accept"
              >
              </QueueButton>
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
.queue-btn {
  border: .5px solid var(--gris-default);
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