<script>
import { ref } from 'vue';
import Popper from 'vue3-popper';

export default {
  name: 'AdministratorFormRelations',
  components: { Popper },
  props: {
    modelValue: { type: Object, required: true },
    commerces: { type: Array, default: () => [] },
    prefix: { type: String, default: '' },
    isAdd: { type: Boolean, default: false },
    onSelectCommerce: { type: Function, default: null },
    onDeleteCommerce: { type: Function, default: null },
    showCommerce: { type: Function, default: null },
  },
  emits: ['update:modelValue'],
  setup() {
    const selectedCommerce = ref(null);
    return { selectedCommerce };
  },
  computed: {
    administrator: {
      get() {
        return this.modelValue;
      },
      set(value) {
        this.$emit('update:modelValue', value);
      },
    },
  },
  methods: {
    handleSelectCommerce(commerce) {
      if (commerce && this.onSelectCommerce) {
        this.onSelectCommerce(this.administrator, commerce);
        this.selectedCommerce = null;
      }
    },
    handleDeleteCommerce(commerceId) {
      if (this.onDeleteCommerce) {
        this.onDeleteCommerce(this.administrator, commerceId);
      }
    },
  },
};
</script>

<template>
  <div class="form-fields-container">
    <div class="form-group-modern">
      <label class="form-label-modern">
        {{ $t('businessAdministratorAdmin.commerces') }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>
              {{
                $t('businessAdministratorAdmin.commercesHelp') ||
                  'Lista de comercios a los que este administrador tiene acceso. Selecciona uno o varios y usa la X para removerlos.'
              }}
            </div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </label>
      <div style="flex: 1; display: flex; flex-direction: column; gap: 0.5rem">
        <select
          :id="`${prefix}administrator-commerces-form`"
          class="form-control-modern form-select-modern"
          v-model="selectedCommerce"
          @change="handleSelectCommerce(selectedCommerce)"
        >
          <option :value="null">
            {{ $t('businessAdministratorAdmin.selectCommerce') || 'Seleccionar comercio' }}
          </option>
          <option v-for="com in commerces" :key="com.id" :value="com">
            {{ com.active ? `🟢  ${com.tag}` : `🔴  ${com.tag}` }}
          </option>
        </select>
        <div
          v-if="administrator.commercesId && administrator.commercesId.length > 0"
          class="badges-container"
        >
          <span class="badge-modern" v-for="comId in administrator.commercesId" :key="comId">
            {{ showCommerce ? showCommerce(comId) : comId }}
            <button
              type="button"
              class="badge-close"
              aria-label="Close"
              @click="handleDeleteCommerce(comId)"
            >
              <i class="bi bi-x"></i>
            </button>
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.form-fields-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
}

.form-group-modern {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 0.25rem;
  width: 100%;
}

.form-label-modern {
  min-width: 120px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.75);
  text-transform: capitalize;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex-shrink: 0;
  padding-top: 0.4rem;
}

.form-control-modern,
.form-select-modern {
  flex: 1;
  padding: 0.4rem 0.625rem;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: #212529;
  background-color: #fff;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 5px;
  transition: all 0.2s ease;
}

.form-control-modern:focus,
.form-select-modern:focus {
  outline: none;
  border-color: rgba(0, 74, 173, 0.5);
  box-shadow: 0 0 0 2px rgba(0, 74, 173, 0.1);
}

.form-select-modern {
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.625rem center;
  background-size: 1rem;
  padding-right: 2.5rem;
  appearance: none;
}

.badges-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.25rem;
}

.badge-modern {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  background: rgba(108, 117, 125, 0.15);
  color: #495057;
  border-radius: 9999px;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.badge-close {
  background: none;
  border: none;
  color: #495057;
  cursor: pointer;
  padding: 0;
  margin-left: 0.25rem;
  display: flex;
  align-items: center;
}
</style>
