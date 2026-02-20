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
  emits: ['update:modelValue', 'type-changed'],
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
    <div class="form-group-modern row g-2">
      <div class="col-4 text-label">
        {{ $t('businessQueuesAdmin.name') }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>{{ $t('businessQueuesAdmin.nameHelp') }}</div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </div>
      <div class="col-8">
        <input
          :id="`${prefix}queue-name-form`"
          :disabled="isAdd ? false : !toggles['queues.admin.edit']"
          min="1"
          max="50"
          type="text"
          class="form-control"
          :class="{ 'is-invalid': errors.nameError }"
          v-model="queue.name"
          placeholder="Queue A"
        />
      </div>
    </div>
    <div class="form-group-modern row g-2" v-if="prefix === 'add-'">
      <div class="col-4 text-label">
        {{ $t('businessQueuesAdmin.type') }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>{{ $t('businessQueuesAdmin.typeHelp') }}</div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </div>
      <div class="col-8">
        <select
          :id="`${prefix}queue-type-form`"
          class="form-control form-select"
          :class="{ 'is-invalid': errors.typeError }"
          v-model="queue.type"
          @change="$emit('type-changed', { queue, type: queue.type })"
        >
          <option v-for="typ in types" :key="typ.id" :value="typ.id">
            {{ $t(`queues.types.${typ.id}`) }}
          </option>
        </select>
      </div>
    </div>
    <div class="form-group-modern row g-2" v-else>
      <div class="col-4 text-label">
        {{ $t('businessQueuesAdmin.type') }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>{{ $t('businessQueuesAdmin.typeHelp') }}</div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </div>
      <div class="col-8">
        <input
          :id="`${prefix}queue-type-form`"
          type="text"
          class="form-control"
          :disabled="true"
          v-model="queue.type"
          placeholder="Type"
        />
      </div>
    </div>
    <div class="form-group-modern row g-2">
      <div class="col-4 text-label">
        {{ $t('businessQueuesAdmin.limit') }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>{{ $t('businessQueuesAdmin.limitHelp') }}</div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </div>
      <div class="col-8">
        <input
          :id="`${prefix}queue-limit-form`"
          :disabled="isAdd ? false : !toggles['queues.admin.edit']"
          min="1"
          :max="toggles['queues.admin.queue-limit']"
          type="number"
          class="form-control"
          :class="{ 'is-invalid': errors.limitError }"
          v-model="queue.limit"
          placeholder="100"
        />
      </div>
    </div>
    <div class="form-group-modern row g-2">
      <div class="col-4 text-label">
        {{ $t('businessQueuesAdmin.order') }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>{{ $t('businessQueuesAdmin.orderHelp') }}</div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </div>
      <div class="col-8">
        <input
          :id="`${prefix}queue-order-form`"
          :disabled="isAdd ? false : !toggles['queues.admin.edit']"
          min="1"
          type="number"
          class="form-control"
          :class="{ 'is-invalid': errors.orderError }"
          v-model="queue.order"
          placeholder="1"
        />
      </div>
    </div>
    <div class="form-group-modern row g-2">
      <div class="col-4 text-label">
        {{ $t('businessQueuesAdmin.estimated') }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>{{ $t('businessQueuesAdmin.estimatedHelp') }}</div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </div>
      <div class="col-8">
        <input
          :id="`${prefix}queue-estimated-form`"
          :disabled="isAdd ? false : !toggles['queues.admin.edit']"
          min="1"
          type="number"
          class="form-control"
          :class="{ 'is-invalid': errors.timeError }"
          v-model="queue.estimatedTime"
          placeholder="1"
        />
      </div>
    </div>
    <div class="form-group-modern row g-2">
      <div class="col-4 text-label">
        {{ $t('businessQueuesAdmin.blockTime') }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>{{ $t('businessQueuesAdmin.blockTimeHelp') }}</div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </div>
      <div class="col-8">
        <input
          :id="`${prefix}queue-block-form`"
          :disabled="isAdd ? false : !toggles['queues.admin.edit']"
          min="1"
          type="number"
          class="form-control"
          :class="{ 'is-invalid': errors.blockError }"
          v-model="queue.blockTime"
          placeholder="1"
        />
      </div>
    </div>
    <div class="form-group-modern form-group-toggle row g-2">
      <div class="col-4 text-label">
        {{ $t('businessQueuesAdmin.active') }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>{{ $t('businessQueuesAdmin.activeHelp') }}</div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </div>
      <div class="col-8">
        <Toggle v-model="queue.active" :disabled="isAdd ? false : !toggles['queues.admin.edit']" />
      </div>
    </div>
    <div class="form-group-modern form-group-toggle row g-2">
      <div class="col-4 text-label">
        {{ $t('businessQueuesAdmin.online') }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>{{ $t('businessQueuesAdmin.onlineHelp') }}</div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </div>
      <div class="col-8">
        <Toggle v-model="queue.online" :disabled="isAdd ? false : !toggles['queues.admin.edit']" />
      </div>
    </div>
    <div v-if="showTelemedicineToggle" class="form-group-modern form-group-toggle row g-2">
      <div class="col-4 text-label">
        <i class="bi bi-camera-video me-2"></i>
        {{ $t('businessQueuesAdmin.telemedicine') || 'Teleconsulta' }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>
              {{
                $t('businessQueuesAdmin.telemedicineHelp') ||
                'Habilita la opción de teleconsulta para esta fila'
              }}
            </div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </div>
      <div class="col-8">
        <Toggle
          v-model="queue.telemedicineEnabled"
          :disabled="isAdd ? false : !toggles['queues.admin.edit']"
        />
      </div>
    </div>
    <div class="form-group-modern form-group-toggle row g-2">
      <div class="col-4 text-label">
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
      </div>
      <div class="col-8">
        <Toggle
          v-model="queue.presentialEnabled"
          :disabled="isAdd ? false : !toggles['queues.admin.edit']"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.form-fields-container {
  display: flex;
  flex-direction: column;
  padding: 0.5rem;
}

.form-group-modern {
  margin-bottom: 0.5rem;
  align-items: center;
}

.row.g-2 {
  --bs-gutter-x: 0.5rem;
  --bs-gutter-y: 0.5rem;
  margin-bottom: 0.5rem;
}

.text-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #495057;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.form-control,
.form-select {
  font-size: 0.875rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  border: 1px solid #ced4da;
}

.form-control:focus,
.form-select:focus {
  border-color: #80bdff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

.form-control:disabled {
  background-color: #e9ecef;
  opacity: 0.6;
  cursor: not-allowed;
}

.form-control.is-invalid,
.form-select.is-invalid {
  border-color: #dc3545;
}

.form-control.is-invalid:focus,
.form-select.is-invalid:focus {
  border-color: #dc3545;
  box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25);
}

.form-group-toggle {
  align-items: center;
}
</style>
