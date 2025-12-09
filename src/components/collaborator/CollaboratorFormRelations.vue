<script>
import { ref } from 'vue';
import Popper from 'vue3-popper';

export default {
  name: 'CollaboratorFormRelations',
  components: { Popper },
  props: {
    modelValue: { type: Object, required: true },
    commerces: { type: Array, default: () => [] },
    services: { type: Array, default: () => [] },
    toggles: { type: Object, default: () => ({}) },
    prefix: { type: String, default: '' },
    isAdd: { type: Boolean, default: false },
    onSelectCommerce: { type: Function, default: null },
    onSelectService: { type: Function, default: null },
    onDeleteCommerce: { type: Function, default: null },
    onDeleteService: { type: Function, default: null },
    showCommerce: { type: Function, default: null },
    showService: { type: Function, default: null },
  },
  emits: ['update:modelValue'],
  setup() {
    const selectedCommerce = ref(null);
    const selectedService = ref(null);
    return {
      selectedCommerce,
      selectedService,
    };
  },
  computed: {
    collaborator: {
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
        this.onSelectCommerce(this.collaborator, commerce);
        this.selectedCommerce = null;
      }
    },
    handleSelectService(service) {
      if (service && this.onSelectService) {
        this.onSelectService(this.collaborator, service);
        this.selectedService = null;
      }
    },
    handleDeleteCommerce(commerceId) {
      if (this.onDeleteCommerce) {
        this.onDeleteCommerce(this.collaborator, commerceId);
      }
    },
    handleDeleteService(serviceId) {
      if (this.onDeleteService) {
        this.onDeleteService(this.collaborator, serviceId);
      }
    },
  },
};
</script>

<template>
  <div class="form-fields-container">
    <!-- Commerces Section -->
    <div class="form-group-modern">
      <label class="form-label-modern">
        {{ $t('businessCollaboratorsAdmin.commerces') }}
      </label>
      <div style="flex: 1; display: flex; flex-direction: column; gap: 0.5rem">
        <select
          :id="`${prefix}collaborator-commerces-form`"
          class="form-control-modern form-select-modern"
          v-model="selectedCommerce"
          @change="handleSelectCommerce(selectedCommerce)"
        >
          <option :value="null">
            {{ $t('businessCollaboratorsAdmin.selectCommerce') || 'Seleccionar comercio' }}
          </option>
          <option v-for="com in commerces" :key="com.id" :value="com">
            {{ com.active ? `🟢  ${com.tag}` : `🔴  ${com.tag}` }}
          </option>
        </select>
        <div
          v-if="collaborator.commercesId && collaborator.commercesId.length > 0"
          class="badges-container"
        >
          <span class="badge-modern" v-for="comId in collaborator.commercesId" :key="comId">
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

    <!-- Services Section -->
    <div class="form-group-modern">
      <label class="form-label-modern">
        {{ $t('businessCollaboratorsAdmin.services') }}
      </label>
      <div style="flex: 1; display: flex; flex-direction: column; gap: 0.5rem">
        <select
          :id="`${prefix}collaborator-services-form`"
          class="form-control-modern form-select-modern"
          v-model="selectedService"
          @change="handleSelectService(selectedService)"
        >
          <option :value="null">
            {{ $t('businessCollaboratorsAdmin.selectService') || 'Seleccionar servicio' }}
          </option>
          <option v-for="serv in services" :key="serv.id" :value="serv">
            {{ serv.active ? `🟢  ${serv.tag}` : `🔴  ${serv.tag}` }}
          </option>
        </select>
        <div
          v-if="collaborator.servicesId && collaborator.servicesId.length > 0"
          class="badges-container"
        >
          <span class="badge-modern" v-for="servId in collaborator.servicesId" :key="servId">
            {{ showService ? showService(servId) : servId }}
            <button
              type="button"
              class="badge-close"
              aria-label="Close"
              @click="handleDeleteService(servId)"
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
/* Form Fields Container */
.form-fields-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.5rem;
}

/* Form Group Modern */
.form-group-modern {
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: 0.25rem;
  width: 100%;
}

/* Form Label Modern */
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

/* Form Control Modern */
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

/* Badges Container */
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
  justify-content: center;
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  transition: all 0.2s ease;
}

.badge-close:hover {
  background: rgba(0, 0, 0, 0.1);
  color: #212529;
}

.badge-close i {
  font-size: 0.75rem;
}

/* Responsive */
@media (max-width: 768px) {
  .form-group-modern {
    flex-direction: column;
    align-items: flex-start;
  }

  .form-label-modern {
    min-width: auto;
    width: 100%;
    padding-top: 0;
  }
}
</style>
