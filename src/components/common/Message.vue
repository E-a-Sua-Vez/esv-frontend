<script>
import Popper from "vue3-popper";

export default {
  name: 'Message',
  components: { Popper },
  props: {
    title: { type: String, default: '' },
    content: { type: String, default: '' },
    icon: { type: String, default: 'bi bi-chat' },
    type: { type: String, default: 'normal' },
    upgrade: { type: Boolean, default: false }
  },
  data() {
    return {}
  }
}
</script>

<template>
  <div :class="`message {{ type }}`">
    <div class="message-title">
      <div class="row">
        <div :class="upgrade === true ? 'col-8' : 'col-12'">
          <i :class="`bi ${icon}`"></i><span class="m-2"> {{ title }}</span>
        </div>
        <div class="col-4 d-flex justify-content-end">
          <Popper
            v-if="upgrade"
            :class="'dark'"
            arrow
            disableClickAway
            :content="$t('upgrade')">
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
  margin-left: .5rem;
  margin-right: .5rem;
  padding: 1rem;
  border-radius: 1rem;
  font-weight: 400;
  line-height: 1.1rem;
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
</style>