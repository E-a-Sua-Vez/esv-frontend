<script>
import Toggle from '@vueform/toggle';
import Popper from 'vue3-popper';

export default {
  name: 'AdministratorFormBasicFields',
  components: { Toggle, Popper },
  props: {
    modelValue: { type: Object, required: true },
    toggles: { type: Object, default: () => ({}) },
    errors: { type: Object, default: () => ({}) },
    prefix: { type: String, default: '' },
    isAdd: { type: Boolean, default: false },
  },
  emits: ['update:modelValue'],
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
};
</script>

<template>
  <div class="form-fields-container">
    <!-- Nombre -->
    <div class="form-group-modern">
      <label class="form-label-modern">
        {{ $t('businessAdministratorAdmin.name') }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>
              {{
                $t('businessAdministratorAdmin.nameHelp') ||
                  'Nombre completo del administrador tal como aparecerá en el panel y reportes.'
              }}
            </div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </label>
      <input
        :id="`${prefix}administrator-name-form`"
        :disabled="isAdd ? false : true"
        min="1"
        max="50"
        type="text"
        class="form-control-modern"
        :class="{ 'is-invalid': errors.nameError }"
        v-model="administrator.name"
        placeholder="Jhon Pérez"
      />
    </div>

    <!-- Email -->
    <div class="form-group-modern">
      <label class="form-label-modern">
        {{ $t('businessAdministratorAdmin.email') }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>
              {{
                $t('businessAdministratorAdmin.emailHelp') ||
                  (isAdd
                    ? 'Correo de acceso del administrador. Se usa para iniciar sesión y recibir notificaciones.'
                    : 'Correo de acceso registrado del administrador; no se puede editar desde aquí.')
              }}
            </div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </label>
      <input
        :id="`${prefix}administrator-email-form`"
        min="10"
        type="email"
        class="form-control-modern"
        :class="{ 'is-invalid': errors.emailError }"
        v-model="administrator.email"
        :disabled="!isAdd"
        placeholder="name@email.com"
      />
    </div>

    <!-- Activo (solo edición) -->
    <div class="form-group-modern form-group-toggle" v-if="!isAdd">
      <label class="form-label-modern">
        {{ $t('businessAdministratorAdmin.active') }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>
              {{
                $t('businessAdministratorAdmin.activeHelp') ||
                  'Si está activo, el administrador puede acceder al sistema y gestionar los comercios asignados.'
              }}
            </div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </label>
      <Toggle
        v-model="administrator.active"
        :disabled="!toggles['administrators.admin.edit']"
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

.form-group-toggle {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

:deep(.toggle) {
  --toggle-bg-on: #28a745;
  --toggle-bg-off: #6c757d;
  --toggle-width: 2.25rem;
  --toggle-height: 1rem;
}

:deep(.toggle:disabled) {
  opacity: 0.6;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .form-group-modern {
    flex-direction: column;
    align-items: flex-start;
  }

  .form-label-modern {
    min-width: auto;
    width: 100%;
  }

  .form-control-modern,
  .form-select-modern {
    width: 100%;
  }
}
</style>
