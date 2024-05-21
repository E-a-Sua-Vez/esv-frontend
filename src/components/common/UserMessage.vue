<script>
import Popper from "vue3-popper";
import { getDateAndHour } from '../../shared/utils/date';
import { updateMessage } from '../../application/services/message';

export default {
  name: 'UserMessage',
  components: { Popper },
  props: {
    id: { type: String, default: '' },
    title: { type: String, default: '' },
    content: { type: String, default: '' },
    type: { type: String, default: '' },
    date: { type: [String,Date], default: '' },
    icon: { type: String, default: 'bi bi-chat' },
    type: { type: String, default: 'normal' },
    upgrade: { type: Boolean, default: false },
    closable: { type: Boolean, default: false },
    closeFunction: { type: Boolean, default: false }
  },
  data() {
    return {}
  },
  methods: {
    getDateAndHour(date) {
      return getDateAndHour(date);
    },
    async close() {
      try {
        if (this.id) {
          const body = {
            read: true
          }
          await updateMessage(this.id, body)
        }
      } catch (error) {}
    }
  }
}
</script>

<template>
  <div :class="`message {{ type }}`" role="alert" class="alert-error alert alert-secondary alert-dismissible">
    <div class="message-title">
      <div class="row">
        <div :class="upgrade === true ? 'col-8' : 'col-12'">
          <i :class="`bi ${icon}`"></i><span class="m-2"> {{ title }}</span>
          <button v-if="closable && type !== 'SYSTEM'" @click="close()" id="close-alert" type="button" class="btn btn-sm btn-close" data-bs-dismiss="alert" aria-label="Close"> </button>
        </div>
      </div>
    </div>
    <span>{{ content }}</span>
    <div class="righted fw-bold mt-1 date" v-if="date">
      {{ getDateAndHour(date) }}
    </div>
  </div>

</template>

<style scoped>
.message {
  background-color: var(--color-background);
  margin-left: .1rem;
  margin-right: .1rem;
  padding: .5rem;
  border-radius: .5rem;
  font-weight: 400;
  line-height: 1rem;
  font-size: .8rem;
  border: .5px solid var(--gris-default);
}
.message-title {
  font-size: .9rem;
  font-weight: 600;
  text-align: left;
  line-height: 1.1rem;
  margin-bottom: .5rem;
}
.message-title > span {
  padding-left: .5rem;
}
.date {
  font-size: .7rem;
}
.btn-close {
  width: .1rem !important;
  height: .1rem !important;
}
</style>