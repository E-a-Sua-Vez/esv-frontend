<script>
import Popper from 'vue3-popper';

export default {
  name: 'Message',
  components: { Popper },
  props: {
    title: { type: String, default: '' },
    content: { type: String, default: '' },
    icon: { type: String, default: 'bi bi-chat' },
    type: { type: String, default: 'normal' },
    upgrade: { type: Boolean, default: false },
    closable: { type: Boolean, default: false },
  },
  data() {
    return {};
  },
};
</script>

<template>
  <div
    :class="`message {{ type }}`"
    role="alert"
    class="alert-error alert alert-secondary alert-dismissible"
  >
    <div class="message-title">
      <div class="row">
        <div :class="upgrade === true ? 'col-8' : 'col-12'">
          <i :class="`bi ${icon}`"></i><span class="m-2"> {{ title }}</span>
          <button
            v-if="closable"
            id="close-alert"
            type="button"
            class="btn btn-sm btn-close"
            data-bs-dismiss="alert"
            aria-label="Close"
          ></button>
        </div>
        <div class="col-4 d-flex justify-content-end">
          <Popper v-if="upgrade" :class="'dark'" arrow disable-click-away :content="$t('upgrade')">
            <span class="upgrade fw-bold">UPGRADE</span>
          </Popper>
        </div>
      </div>
    </div>
    <span>{{ content }}</span>
  </div>
</template>

<style scoped>
.message {
  background-color: var(--color-background);
  margin-top: 1rem;
  margin-bottom: 1rem;
  margin-left: 0.5rem;
  margin-right: 0.5rem;
  padding: 1rem;
  border-radius: 1rem;
  font-weight: 400;
  line-height: 1.1rem;
  font-size: 0.8rem;
  border: 0.5px solid var(--gris-default);
}
.message-title {
  font-size: 0.9rem;
  font-weight: 600;
  text-align: left;
  line-height: 1.1rem;
  margin-bottom: 0.5rem;
}
.message-title > span {
  padding-left: 0.5rem;
}
</style>
