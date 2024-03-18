<script>
import { ref, reactive, toRefs, onBeforeMount } from 'vue';
import { getActiveFeature } from '../../shared/features';
import { VueRecaptcha } from 'vue-recaptcha';
import { getCollaboratorsByCommerceId } from '../../application/services/collaborator';
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
    receiveQueue: { type: Function, default: () => {} }
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

    const { receiveQueue } = props;

    const state = reactive({
      queue: {}
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
      receiveQueue(state.queue);
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
      isActiveQueues
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
        <div v-if="(!queueId || queueId === 'undefined') && getActiveFeature(commerce, 'attention-queue-typegrouped', 'PRODUCT')">
          <button
            class="btn-size btn btn-lg btn-block col-9 fw-bold btn-dark rounded-pill mt-1 mb-1"
            data-bs-toggle="collapse"
            href="#attention-collaborator-queue"
            :disabled="!accept">
            {{ $t("commerceQueuesView.byCollaborator") }} <i class="bi bi-chevron-down"></i>
          </button>
          <div :class="'collapse mx-2 my-2 hide'" id="attention-collaborator-queue">
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
          <button
            class="btn-size btn btn-lg btn-block col-9 fw-bold btn-dark rounded-pill mt-1 queue-btn"
            data-bs-toggle="collapse"
            href="#attention-service-queue"
            :disabled="!accept">
            {{ $t("commerceQueuesView.byService") }} <i class="bi bi-chevron-down"></i>
          </button>
          <div :class="'collapse mx-2 my-2 hide'" id="attention-service-queue">
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
      <div v-else>
        <Message
          :title="$t('commerceQueuesView.message.title')"
          :content="$t('commerceQueuesView.message.content')">
        </Message>
        <div class="col">
          <a class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4" @click="goBack()">{{ $t("businessSectionAtWorkView.return") }} <i class="bi bi-arrow-left"></i></a>
        </div>
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