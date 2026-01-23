<script>
import { toRefs } from 'vue';
import { VueRecaptcha } from 'vue-recaptcha';
import Popper from 'vue3-popper';

export default {
  name: 'QueueButton',
  components: { VueRecaptcha, Popper },
  props: {
    queue: { type: Object, default: {} },
    selectedQueue: { type: Object, default: {} },
    accept: { type: Boolean, default: false },
    getQueue: { type: Function, default: () => {} },
    telemedicineEnabled: { type: Boolean, default: false },
    presentialEnabled: { type: Boolean, default: true },
  },
  async setup(props) {
    const captchaEnabled = import.meta.env.VITE_RECAPTCHA_ENABLED || false;
    const { queue, selectedQueue, accept, telemedicineEnabled, presentialEnabled } = toRefs(props);

    const { getQueue } = props;

    const clickAction = async queueIn => {
      getQueue(queueIn);
    };

    const queueIcon = type => {
      if (type) {
        if (type === 'PROFESSIONAL') {
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
        if (type === 'PROFESSIONAL') {
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
      telemedicineEnabled,
      presentialEnabled,
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
          :class="
            selectedQueue && selectedQueue.id && queue.id === selectedQueue.id
              ? 'btn-primary'
              : `${queueStyle(queue.type)}`
          "
          @click="clickAction(queue)"
          :disabled="!accept"
        >
          <div class="professional-card">
            <div class="professional-avatar">
              <div class="avatar-circle">
                <i :class="`bi ${queueIcon(queue.type)}`"></i>
              </div>
            </div>
            <div class="professional-info">
              <div class="professional-name">
                <span class="professional-name-text">{{ queue.name }}</span>
                <Popper
                  v-if="presentialEnabled"
                  :class="'dark'"
                  arrow
                  hover
                  :content="
                    $t('commerceQueuesView.presentialAvailable') || 'Atención presencial disponible'
                  "
                >
                  <span
                    class="telemedicine-badge"
                    :aria-label="
                      $t('commerceQueuesView.presentialAvailable') ||
                      'Atención presencial disponible'
                    "
                  >
                    <div class="telemedicine-avatar">
                      <i class="bi bi-person"></i>
                    </div>
                  </span>
                </Popper>
                <Popper
                  v-if="telemedicineEnabled"
                  :class="'dark'"
                  arrow
                  hover
                  :content="$t('commerceQueuesView.telemedicineAvailable') || 'Telemedicina disponible'"
                >
                  <span class="telemedicine-badge" aria-label="Telemedicina disponible">
                    <i class="bi bi-camera-video"></i>
                  </span>
                </Popper>
              </div>
              <div
                v-if="['SERVICE', 'MULTI_SERVICE', 'PROFESSIONAL'].includes(queue.type)"
                class="professional-services"
              >
                <i class="bi bi-tag-fill service-icon"></i>
                <span class="services-text">
                  {{
                    queue.services && queue.services.length > 0
                      ? queue.services.map(serv => serv.name).join(', ')
                      : queue.name
                  }}
                </span>
              </div>
              <div
                class="professional-duration"
                v-if="
                  !['PROFESSIONAL', 'SELECT_SERVICE', 'MULTI_SERVICE'].includes(queue.type) &&
                  (queue.blockTime || queue.estimatedTime)
                "
              >
                <i class="bi bi-stopwatch-fill"></i>
                <span
                  >{{ $t('commerceQueuesView.duration') }}
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
        :class="
          selectedQueue && selectedQueue.id && queue.id === selectedQueue.id
            ? 'btn-primary'
            : `${queueStyle(queue.type)}`
        "
        @click="clickAction(queue)"
        :disabled="!accept"
      >
        <div class="professional-card">
          <div class="professional-avatar">
            <div class="avatar-circle">
              <i :class="`bi ${queueIcon(queue.type)}`"></i>
            </div>
          </div>
          <div class="professional-info">
            <div class="professional-name">
              <span class="professional-name-text">{{ queue.name }}</span>
              <Popper
                v-if="presentialEnabled"
                :class="'dark'"
                arrow
                hover
                :content="
                  $t('commerceQueuesView.presentialAvailable') || 'Atención presencial disponible'
                "
              >
                <span
                  class="telemedicine-badge"
                  :aria-label="
                    $t('commerceQueuesView.presentialAvailable') || 'Atención presencial disponible'
                  "
                >
                  <div class="telemedicine-avatar">
                    <i class="bi bi-person"></i>
                  </div>
                </span>
              </Popper>
              <Popper
                v-if="telemedicineEnabled"
                :class="'dark'"
                arrow
                hover
                :content="$t('commerceQueuesView.telemedicineAvailable') || 'Telemedicina disponible'"
              >
                <span
                  class="telemedicine-badge"
                  :aria-label="$t('commerceQueuesView.telemedicineAvailable') || 'Telemedicina disponible'"
                >
                  <div class="telemedicine-avatar">
                    <i class="bi bi-camera-video"></i>
                  </div>
                </span>
              </Popper>
            </div>
            <div v-if="['PROFESSIONAL'].includes(queue.type)" class="professional-services">
              <i class="bi bi-tag-fill service-icon"></i>
              <span class="services-text">
                {{
                  queue.services && queue.services.length > 0
                    ? queue.services.map(serv => serv.name).join(', ')
                    : queue.name
                }}
              </span>
            </div>
            <div
              v-if="['SERVICE', 'MULTI_SERVICE'].includes(queue.type)"
              class="professional-services"
            >
              <span class="services-text">
                {{
                  queue.services && queue.services.length > 0
                    ? queue.services.map(serv => serv.name).join(', ')
                    : queue.name
                }}</span
              >
            </div>
            <div v-if="['SELECT_SERVICE'].includes(queue.type)" class="professional-services">
              <span class="services-text"> {{ $t('commerceQueuesView.selectTheService') }} </span>
            </div>
            <div
              class="professional-duration"
              v-if="
                !['PROFESSIONAL', 'SELECT_SERVICE', 'MULTI_SERVICE'].includes(queue.type) &&
                (queue.blockTime || queue.estimatedTime)
              "
            >
              <i class="bi bi-stopwatch-fill"></i>
              <span
                >{{ $t('commerceQueuesView.duration') }}
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
  border: 1px solid rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  border-radius: 1rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.98) 100%);
  padding: 0.5rem;
  text-align: left;
  margin-top: 1rem;
}

.queue-btn:hover:not(:disabled) {
  transform: translateY(-3px);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  border-color: rgba(0, 74, 173, 0.2);
}

.telemedicine-avatar {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.telemedicine-avatar i {
  font-size: 1.1rem;
  color: var(--azul-turno);
}

.queue-btn.btn-primary {
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%) !important;
  color: white !important;
  box-shadow: 0 4px 15px rgba(0, 74, 173, 0.35);
}

.queue-btn.btn-primary:hover:not(:disabled) {
  box-shadow: 0 6px 20px rgba(0, 74, 173, 0.45);
  transform: translateY(-3px);
}

/* Professional Card Layout */
.professional-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
}

.professional-avatar {
  flex-shrink: 0;
}

.avatar-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.1) 0%, rgba(0, 194, 203, 0.1) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.queue-btn.btn-primary .avatar-circle {
  background: rgba(255, 255, 255, 0.2);
  box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
}

.avatar-circle i {
  font-size: 1.2rem;
  color: var(--azul-turno);
  transition: all 0.3s ease;
}

.queue-btn.btn-primary .avatar-circle i {
  color: white;
}

.queue-btn:hover:not(:disabled) .avatar-circle {
  transform: scale(1.08);
}

.professional-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  text-align: left;
  min-width: 0;
}

.professional-name {
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.2;
  color: #000000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.professional-name-text {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.queue-btn.btn-primary .professional-name {
  color: white;
}

.telemedicine-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 999px;
  background: transparent;
  color: inherit;
  font-size: 0.9rem;
  box-shadow: none;
}

.telemedicine-badge i {
  line-height: 1;
}

.professional-services {
  display: flex;
  align-items: flex-start;
  gap: 0.35rem;
  font-size: 0.75rem;
  line-height: 1.2;
  color: var(--gris-elite-1);
  font-weight: 500;
}

.queue-btn.btn-primary .professional-services {
  color: rgba(255, 255, 255, 0.9);
}

.service-icon {
  flex-shrink: 0;
  margin-top: 0.1rem;
  font-size: 0.75rem;
}

.services-text {
  flex: 1;
  word-break: break-word;
  font-weight: 400;
}

.professional-duration {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--gris-elite-1);
}

.queue-btn.btn-primary .professional-duration {
  color: rgba(255, 255, 255, 0.9);
}

.professional-duration i {
  font-size: 0.75rem;
}

/* Responsive adjustments */
@media (max-width: 576px) {
  .professional-card {
    gap: 0.5rem;
  }

  .avatar-circle {
    width: 32px;
    height: 32px;
  }

  .avatar-circle i {
    font-size: 1rem;
  }

  .professional-name {
    font-size: 0.95rem;
  }

  .professional-services,
  .professional-duration {
    font-size: 0.7rem;
  }
}

.queue-title {
  font-size: 1rem;
  line-height: 1.2rem;
  text-align: left;
  font-weight: 600;
}

.queue-time-title {
  font-size: 0.75rem;
  line-height: 1rem;
  font-weight: 500;
  text-align: left;
  color: var(--gris-elite-1);
}
</style>
