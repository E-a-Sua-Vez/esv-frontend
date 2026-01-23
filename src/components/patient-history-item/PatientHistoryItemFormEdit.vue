<script>
import PatientHistoryItemFormBasicFields from './PatientHistoryItemFormBasicFields.vue';
import Warning from '../common/Warning.vue';

export default {
  name: 'PatientHistoryItemFormEdit',
  components: { PatientHistoryItemFormBasicFields, Warning },
  props: {
    item: { type: Object, required: true },
    types: { type: Array, default: () => [] },
    toggles: { type: Object, default: () => ({}) },
    errors: { type: Object, default: () => ({}) },
  },
  emits: ['update:item'],
  computed: {
    localItem: {
      get() {
        return this.item;
      },
      set(value) {
        this.$emit('update:item', value);
      },
    },
  },
  methods: {
    async copyIdToClipboard(id) {
      if (!id) return;
      try {
        if (navigator && navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(id);
        } else {
          const textarea = document.createElement('textarea');
          textarea.value = id;
          textarea.style.position = 'fixed';
          textarea.style.opacity = '0';
          document.body.appendChild(textarea);
          textarea.select();
          document.execCommand('copy');
          document.body.removeChild(textarea);
        }
      } catch (e) {
        // silent fallback
      }
    },
  },
};
</script>

<template>
  <div>
    <PatientHistoryItemFormBasicFields
      v-model="localItem"
      :types="types"
      :toggles="toggles"
      :is-add="false"
      :errors="{
        nameError: errors.nameError,
        tagError: errors.tagError,
        typeError: errors.typeError,
        orderError: errors.orderUpdateError,
      }"
      prefix="update-"
    />
    <div id="item-id-form" class="row -2 mb-g3">
      <div class="row item-details-container">
        <div class="col text-center">
          <span><strong>Id:</strong> {{ item.id }}</span>
          <button
            type="button"
            class="btn btn-link btn-copy-id p-0 ms-2 align-baseline"
            @click="copyIdToClipboard(item.id)"
            :title="$t('copy') || 'Copiar Id'"
          >
            <i class="bi bi-clipboard"></i>
          </button>
        </div>
      </div>
    </div>
    <div
      class="row g-1 errors"
      id="feedback"
      v-if="errors.errorsUpdate && errors.errorsUpdate.length > 0"
    >
      <Warning>
        <template v-slot:message>
          <li v-for="(error, index) in errors.errorsUpdate" :key="index">
            {{ $t(error) }}
          </li>
        </template>
      </Warning>
    </div>
  </div>
</template>

<style scoped>
.item-details-container {
  font-size: 0.8rem;
  margin-left: 0.5rem;
  margin-right: 0.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0;
}

.errors {
  margin-top: 0.5rem;
}

.btn-copy-id {
  font-size: 0.8rem;
  color: var(--gris-default);
  text-decoration: none;
}

.btn-copy-id:hover {
  color: var(--primary-color, #000);
  text-decoration: none;
}
</style>
