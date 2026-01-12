<script>
import Toggle from '@vueform/toggle';
import Popper from 'vue3-popper';
import { getActiveFeature } from '../../shared/features';

export default {
  name: 'QueueFormBasicFields',
  components: { Toggle, Popper },
  props: {
    modelValue: { type: Object, required: true },
    types: { type: Array, default: () => [] },
    toggles: { type: Object, default: () => ({}) },
    errors: { type: Object, default: () => ({}) },
    prefix: { type: String, default: '' },
    isAdd: { type: Boolean, default: false },
    commerce: { type: Object, default: null },
  },
  emits: ['update:modelValue'],
  computed: {
    queue: {
      get() {
        return this.modelValue;
      },
      set(value) {
        this.$emit('update:modelValue', value);
      },
    },
    showTelemedicineToggle() {
      if (!this.commerce || !this.commerce.features || !Array.isArray(this.commerce.features)) {
        return false;
      }
      return this.getActiveFeature(this.commerce, 'telemedicine-active', 'PRODUCT');
    },
  },
  methods: {
    getActiveFeature,
  },
};
</script>

<template>
  <div class="form-fields-container">
    <div class="form-group-modern">
      <label class="form-label-modern" :for="`${prefix}queue-name-form`">
        {{ $t('businessQueuesAdmin.name') }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>{{ $t('businessQueuesAdmin.nameHelp') }}</div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </label>
      <input
        :id="`${prefix}queue-name-form`"
        :disabled="isAdd ? false : !toggles['queues.admin.edit']"
        min="1"
        max="50"
        type="text"
        class="form-control-modern"
        :class="{ 'is-invalid': errors.nameError }"
        v-model="queue.name"
        placeholder="Queue A"
      />
    </div>
    <div class="form-group-modern" v-if="prefix === 'add-'">
      <label class="form-label-modern" :for="`${prefix}queue-type-form`">
        {{ $t('businessQueuesAdmin.type') }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>{{ $t('businessQueuesAdmin.typeHelp') }}</div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </label>
      <select
        :id="`${prefix}queue-type-form`"
        class="form-control-modern form-select-modern"
        :class="{ 'is-invalid': errors.typeError }"
        v-model="queue.type"
      >
        <option v-for="typ in types" :key="typ.id" :value="typ.id">
          {{ $t(`queues.types.${typ.id}`) }}
        </option>
      </select>
    </div>
    <div class="form-group-modern" v-else>
      <label class="form-label-modern" :for="`${prefix}queue-type-form`">
        {{ $t('businessQueuesAdmin.type') }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>{{ $t('businessQueuesAdmin.typeHelp') }}</div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </label>
      <input
        :id="`${prefix}queue-type-form`"
        type="text"
        class="form-control-modern"
        :disabled="true"
        v-model="queue.type"
        placeholder="Type"
      />
    </div>
    <div class="form-group-modern">
      <label class="form-label-modern" :for="`${prefix}queue-limit-form`">
        {{ $t('businessQueuesAdmin.limit') }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>{{ $t('businessQueuesAdmin.limitHelp') }}</div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </label>
      <input
        :id="`${prefix}queue-limit-form`"
        :disabled="isAdd ? false : !toggles['queues.admin.edit']"
        min="1"
        :max="toggles['queues.admin.queue-limit']"
        type="number"
        class="form-control-modern"
        :class="{ 'is-invalid': errors.limitError }"
        v-model="queue.limit"
        placeholder="100"
      />
    </div>
    <div class="form-group-modern">
      <label class="form-label-modern" :for="`${prefix}queue-order-form`">
        {{ $t('businessQueuesAdmin.order') }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>{{ $t('businessQueuesAdmin.orderHelp') }}</div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </label>
      <input
        :id="`${prefix}queue-order-form`"
        :disabled="isAdd ? false : !toggles['queues.admin.edit']"
        min="1"
        type="number"
        class="form-control-modern"
        :class="{ 'is-invalid': errors.orderError }"
        v-model="queue.order"
        placeholder="1"
      />
    </div>
    <div class="form-group-modern">
      <label class="form-label-modern" :for="`${prefix}queue-estimated-form`">
        {{ $t('businessQueuesAdmin.estimated') }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>{{ $t('businessQueuesAdmin.estimatedHelp') }}</div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </label>
      <input
        :id="`${prefix}queue-estimated-form`"
        :disabled="isAdd ? false : !toggles['queues.admin.edit']"
        min="1"
        type="number"
        class="form-control-modern"
        :class="{ 'is-invalid': errors.timeError }"
        v-model="queue.estimatedTime"
        placeholder="1"
      />
    </div>
    <div class="form-group-modern">
      <label class="form-label-modern" :for="`${prefix}queue-block-form`">
        {{ $t('businessQueuesAdmin.blockTime') }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>{{ $t('businessQueuesAdmin.blockTimeHelp') }}</div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </label>
      <input
        :id="`${prefix}queue-block-form`"
        :disabled="isAdd ? false : !toggles['queues.admin.edit']"
        min="1"
        type="number"
        class="form-control-modern"
        :class="{ 'is-invalid': errors.blockError }"
        v-model="queue.blockTime"
        placeholder="1"
      />
    </div>
    <div class="form-group-modern form-group-toggle">
      <label class="form-label-modern">
        {{ $t('businessQueuesAdmin.active') }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>{{ $t('businessQueuesAdmin.activeHelp') }}</div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </label>
      <Toggle v-model="queue.active" :disabled="isAdd ? false : !toggles['queues.admin.edit']" />
    </div>
    <div class="form-group-modern form-group-toggle">
      <label class="form-label-modern">
        {{ $t('businessQueuesAdmin.online') }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>{{ $t('businessQueuesAdmin.onlineHelp') }}</div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </label>
      <Toggle v-model="queue.online" :disabled="isAdd ? false : !toggles['queues.admin.edit']" />
    </div>
    <div v-if="showTelemedicineToggle" class="form-group-modern form-group-toggle">
      <label class="form-label-modern">
        <i class="bi bi-camera-video me-2"></i>
        {{ $t('businessQueuesAdmin.telemedicine') || 'Telemedicina' }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>
              {{
                $t('businessQueuesAdmin.telemedicineHelp') ||
                'Habilita la opción de telemedicina para esta fila'
              }}
            </div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </label>
      <Toggle
        v-model="queue.telemedicineEnabled"
        :disabled="isAdd ? false : !toggles['queues.admin.edit']"
      />
    </div>
    <div class="form-group-modern form-group-toggle">
      <label class="form-label-modern">
        <i class="bi bi-person me-2"></i>
        {{ $t('businessQueuesAdmin.presential') || 'Atención presencial' }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>
              {{
                $t('businessQueuesAdmin.presentialHelp') ||
                'Habilita la atención presencial para esta fila'
              }}
            </div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </label>
      <Toggle
        v-model="queue.presentialEnabled"
        :disabled="isAdd ? false : !toggles['queues.admin.edit']"
      />
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
  align-items: center;
  gap: 0.25rem;
}

.form-label-modern {
  min-width: 120px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: #495057;
  text-transform: capitalize;
  flex-shrink: 0;
}

.form-control-modern,
.form-select-modern {
  flex: 1;
  padding: 0.4rem 0.625rem;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: #212529;
  background-color: #fff;
  border: 1px solid #ced4da;
  border-radius: 5px;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.form-control-modern:focus,
.form-select-modern:focus {
  color: #212529;
  background-color: #fff;
  border-color: #86b7fe;
  outline: 0;
  box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.25);
}

.form-control-modern:disabled,
.form-select-modern:disabled {
  background-color: #e9ecef;
  opacity: 0.6;
  cursor: not-allowed;
}

.form-control-modern.is-invalid,
.form-select-modern.is-invalid {
  border-color: #dc3545;
}

.form-control-modern.is-invalid:focus,
.form-select-modern.is-invalid:focus {
  border-color: #dc3545;
  box-shadow: 0 0 0 2px rgba(220, 53, 69, 0.25);
}

.form-group-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.form-select-modern {
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 16px 12px;
  padding-right: 2.5rem;
}
</style>
