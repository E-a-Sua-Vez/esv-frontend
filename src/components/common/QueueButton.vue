<script>
import { toRefs } from 'vue';
import { VueRecaptcha } from 'vue-recaptcha';

export default {
  name: 'QueueButton',
  components: { VueRecaptcha },
  props: {
    queue: { type: Object, default: {} },
    selectedQueue: { type: Object, default: {} },
    accept: { type: Boolean, default: false },
    getQueue: { type: Function, default: () => {} },
  },
  async setup(props) {
    const captchaEnabled = import.meta.env.VITE_RECAPTCHA_ENABLED || false;
    const { queue, selectedQueue, accept } = toRefs(props);

    const { getQueue } = props;

    const clickAction = async queueIn => {
      getQueue(queueIn);
    };

    const queueIcon = type => {
      if (type) {
        if (type === 'COLLABORATOR') {
          return 'bi-person-circle';
        }
        if (type === 'SERVICE') {
          return 'bi-tag-fill';
        }
        if (type === 'MULTI_SERVICE') {
          return 'bi-tags-fill';
        }
        if (type === 'SELECT_SERVICE') {
          return 'bi-hand-index-thumb-fill';
        }
        return 'bi-clipboard2-check-fill';
      }
      return 'bi-clipboard2-check-fill';
    };

    const queueStyle = type => {
      if (type) {
        if (type === 'COLLABORATOR') {
          return 'btn-light';
        }
        return 'btn-secondary';
      }
      return 'btn-secondary';
    };

    return {
      captchaEnabled,
      queue,
      selectedQueue,
      accept,
      clickAction,
      queueIcon,
      queueStyle,
    };
  },
};
</script>
<template>
  <div>
    <div v-if="captchaEnabled === true" class="my-2">
      <VueRecaptcha :sitekey="siteKey" @verify="validateCaptchaOk" @error="validateCaptchaError">
        <button
          v-if="queue.active"
          class="btn-size btn-sm btn-block fw-bold col-12 rounded-pill mt-1 queue-btn"
          :class="queue.id === selectedQueue.id ? 'btn-primary' : `${queueStyle(queue.type)}`"
          @click="clickAction(queue)"
          :disabled="!accept"
        >
          <div class="row mt-1">
            <div class="col-2 text-right centered">
              <h4><i :class="`bi ${queueIcon(queue.type)}`"></i></h4>
            </div>
            <div class="col-10 text-right">
              <div class="row queue-title">
                <span>{{ queue.name }}</span>
              </div>
              <div
                v-if="['SERVICE', 'MULTI_SERVICE', 'COLLABORATOR'].includes(queue.type)"
                class="row queue-time-title"
              >
                <span
                  ><i class="bi bi-tag-fill"></i>
                  {{
                    queue.services && queue.services.length > 0
                      ? queue.services.map(serv => serv.name).join(', ')
                      : queue.name
                  }}</span
                >
              </div>
              <div
                class="row queue-time-title"
                v-if="
                  !['COLLABORATOR', 'SELECT_SERVICE', 'MULTI_SERVICE'].includes(queue.type) &&
                  (queue.blockTime || queue.estimatedTime)
                "
              >
                <span
                  ><i class="bi bi-stopwatch-fill"></i> {{ $t('commerceQueuesView.duration') }}
                  {{ queue.blockTime || queue.estimatedTime }}'</span
                >
              </div>
            </div>
          </div>
        </button>
      </VueRecaptcha>
    </div>
    <div v-else>
      <button
        v-if="queue.active"
        type="button"
        class="btn-size btn btn-sm btn-block col-12 fw-bold rounded-pill mt-2 queue-btn"
        :class="queue.id === selectedQueue.id ? 'btn-primary' : `${queueStyle(queue.type)}`"
        @click="clickAction(queue)"
        :disabled="!accept"
      >
        <div class="row mt-1">
          <div class="col-2 text-right centered">
            <h4><i :class="`bi ${queueIcon(queue.type)}`"></i></h4>
          </div>
          <div class="col-10 text-right">
            <div class="row queue-title">
              <span>{{ queue.name }}</span>
            </div>
            <div v-if="['COLLABORATOR'].includes(queue.type)" class="row queue-time-title">
              <span
                ><i class="bi bi-tag-fill"></i>
                {{
                  queue.services && queue.services.length > 0
                    ? queue.services.map(serv => serv.name).join(', ')
                    : queue.name
                }}</span
              >
            </div>
            <div
              v-if="['SERVICE', 'MULTI_SERVICE'].includes(queue.type)"
              class="row queue-time-title"
            >
              <span>
                {{
                  queue.services && queue.services.length > 0
                    ? queue.services.map(serv => serv.name).join(', ')
                    : queue.name
                }}</span
              >
            </div>
            <div v-if="['SELECT_SERVICE'].includes(queue.type)" class="row queue-time-title">
              <span> {{ $t('commerceQueuesView.selectTheService') }} </span>
            </div>
            <div
              class="row queue-time-title"
              v-if="
                !['COLLABORATOR', 'SELECT_SERVICE', 'MULTI_SERVICE'].includes(queue.type) &&
                (queue.blockTime || queue.estimatedTime)
              "
            >
              <span
                ><i class="bi bi-stopwatch-fill"></i> {{ $t('commerceQueuesView.duration') }}
                {{ queue.blockTime || queue.estimatedTime }}'</span
              >
            </div>
          </div>
        </div>
      </button>
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
  background-color: var(--color-background);
  padding: 0.5rem;
  margin-bottom: 1rem;
  border-radius: 0.5rem;
  border: 0.5px solid var(--gris-default);
  align-items: left;
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
</style>
