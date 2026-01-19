<script>
import Toggle from '@vueform/toggle';
import Popper from 'vue3-popper';

export default {
  name: 'CollaboratorFormBasicFields',
  components: { Toggle, Popper },
  props: {
    modelValue: { type: Object, required: true },
    types: { type: Array, default: () => [] },
    modules: { type: Array, default: () => [] },
    toggles: { type: Object, default: () => ({}) },
    errors: { type: Object, default: () => ({}) },
    prefix: { type: String, default: '' },
    isAdd: { type: Boolean, default: false },
    showRole: { type: Boolean, default: false }, // Nuevo prop para mostrar el selector de rol
  },
  emits: ['update:modelValue'],
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
};
</script>

<template>
  <div class="form-fields-container">
    <div class="form-group-modern">
      <label class="form-label-modern">
        {{ $t('businessCollaboratorsAdmin.name') }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>{{ $t('businessCollaboratorsAdmin.nameHelp') || 'Nombre completo del colaborador tal como se mostrará en el producto y en reportes.' }}</div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </label>
      <input
        :id="`${prefix}collaborator-name-form`"
        :disabled="isAdd ? false : !toggles['collaborators.admin.edit']"
        min="1"
        max="50"
        type="text"
        class="form-control-modern"
        :class="{ 'is-invalid': errors.nameError }"
        v-model="collaborator.name"
        placeholder="Jhon Pérez"
      />
    </div>
    <div class="form-group-modern">
      <label class="form-label-modern">
        {{ $t('collaborator.lastName') || 'Apellido' }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>{{ $t('collaborator.lastNameHelp') || 'Apellido del colaborador' }}</div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </label>
      <input
        :id="`${prefix}collaborator-lastName-form`"
        :disabled="isAdd ? false : !toggles['collaborators.admin.edit']"
        type="text"
        class="form-control-modern"
        v-model="collaborator.lastName"
        placeholder="García"
      />
    </div>
    <div class="form-group-modern">
      <label class="form-label-modern">
        {{ $t('collaborator.idNumber') || 'Documento de Identidad' }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>{{ $t('collaborator.idNumberHelp') || 'Número de documento de identidad del colaborador' }}</div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </label>
      <input
        :id="`${prefix}collaborator-idNumber-form`"
        :disabled="isAdd ? false : !toggles['collaborators.admin.edit']"
        type="text"
        class="form-control-modern"
        :class="{ 'is-invalid': errors.idNumberError }"
        v-model="collaborator.idNumber"
        placeholder="12345678-9"
        required
      />
    </div>
    <div class="form-group-modern" v-if="prefix === 'add-'">
      <label class="form-label-modern">
        {{ $t('businessCollaboratorsAdmin.email') }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>{{ $t('businessCollaboratorsAdmin.emailHelp') || 'Correo que usará el colaborador para ingresar y recibir notificaciones.' }}</div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </label>
      <input
        :id="`${prefix}collaborator-email-form`"
        min="10"
        type="email"
        class="form-control-modern"
        :class="{ 'is-invalid': errors.emailError }"
        v-model="collaborator.email"
        placeholder="name@email.com"
      />
    </div>
    <div class="form-group-modern" v-else>
      <label class="form-label-modern">
        {{ $t('businessCollaboratorsAdmin.email') }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>{{ $t('businessCollaboratorsAdmin.emailHelp') || 'Correo registrado del colaborador; no puede editarse desde aquí.' }}</div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </label>
      <input
        :id="`${prefix}collaborator-email-form`"
        :disabled="true"
        min="10"
        type="email"
        class="form-control-modern"
        v-model="collaborator.email"
        placeholder="name@email.com"
      />
    </div>
    <div class="form-group-modern">
      <label class="form-label-modern">
        {{ $t('businessCollaboratorsAdmin.alias') }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>{{ $t('businessCollaboratorsAdmin.aliasHelp') }}</div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </label>
      <input
        :id="`${prefix}collaborator-alias-form`"
        :disabled="isAdd ? false : !toggles['collaborators.admin.edit']"
        min="1"
        max="50"
        type="text"
        class="form-control-modern"
        v-model="collaborator.alias"
        placeholder="Jhon Pérez"
      />
    </div>
    <div class="form-group-modern">
      <label class="form-label-modern">
        {{ $t('businessCollaboratorsAdmin.type') }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>
              {{
                $t('businessCollaboratorsAdmin.typeHelp') ||
                  'Define el tipo de colaborador y su nivel de acceso: STANDARD (funciones básicas), ASSISTANT (apoyo operativo) y FULL (acceso completo).'
              }}
            </div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </label>
      <select
        :id="`${prefix}collaborator-type-form`"
        class="form-control-modern form-select-modern"
        :class="{ 'is-invalid': errors.typeError }"
        v-model="collaborator.type"
        :disabled="isAdd ? false : !toggles['collaborators.admin.edit']"
      >
        <option value="">
          {{ $t('businessCollaboratorsAdmin.selectType') || 'Seleccionar tipo' }}
        </option>
        <option v-for="typ in types" :key="typ.name" :value="typ.type">
          {{ typ.name }}
        </option>
      </select>
    </div>
    <div class="form-group-modern">
      <label class="form-label-modern">
        {{ $t('businessCollaboratorsAdmin.phone') }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>{{ $t('businessCollaboratorsAdmin.phoneHelp') || 'Teléfono de contacto del colaborador en formato internacional (código de país + número).' }}</div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </label>
      <input
        :id="`${prefix}collaborator-phone-form`"
        :disabled="isAdd ? false : !toggles['collaborators.admin.edit']"
        min="10"
        type="tel"
        class="form-control-modern"
        :class="{ 'is-invalid': errors.phoneAddError || errors.phoneUpdateError }"
        v-model="collaborator.phone"
        placeholder="Cod. Pais + Numero"
      />
    </div>
    <div class="form-group-modern">
      <label class="form-label-modern">
        {{ $t('businessCollaboratorsAdmin.module') }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>{{ $t('businessCollaboratorsAdmin.moduleHelp') || 'Módulo principal donde opera el colaborador (p. ej. agendas, colas, encuestas). Define en qué parte del producto aparece.' }}</div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </label>
      <select
        :id="`${prefix}collaborator-module-form`"
        class="form-control-modern form-select-modern"
        :class="{ 'is-invalid': errors.moduleError }"
        v-model="collaborator.moduleId"
        :disabled="isAdd ? false : !toggles['collaborators.admin.edit']"
      >
        <option value="">
          {{ $t('businessCollaboratorsAdmin.selectModule') || 'Seleccionar módulo' }}
        </option>
        <option v-for="mod in modules" :key="mod.name" :value="mod.id">
          {{ mod.name }}
        </option>
      </select>
    </div>

    <!-- Campo de rol específico (solo mostrar si showRole es true) -->
    <div class="form-group-modern" v-if="showRole">
      <label class="form-label-modern">
        {{ $t('businessCollaboratorsAdmin.role') || 'Rol Específico' }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>
              {{
                $t('businessCollaboratorsAdmin.roleHelp') ||
                  'Rol profesional o administrativo del colaborador. Algunos roles habilitan funciones adicionales como firma de documentos.'
              }}
            </div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </label>
      <select
        :id="`${prefix}collaborator-role-form`"
        class="form-control-modern form-select-modern"
        :class="{ 'is-invalid': errors.roleError }"
        v-model="collaborator.role"
        :disabled="isAdd ? false : !toggles['collaborators.admin.edit']"
      >
        <option value="">
          {{ $t('businessCollaboratorsAdmin.selectRole') || 'Seleccionar rol' }}
        </option>
        <optgroup :label="$t('collaborator.role.categories.medical') || 'Personal Médico'">
          <option value="DOCTOR">{{ $t('collaborator.role.types.DOCTOR') || 'Médico General' }}</option>
          <option value="SPECIALIST">{{ $t('collaborator.role.types.SPECIALIST') || 'Médico Especialista' }}</option>
          <option value="NURSE">{{ $t('collaborator.role.types.NURSE') || 'Enfermero/a' }}</option>
          <option value="MEDICAL_ASSISTANT">{{ $t('collaborator.role.types.MEDICAL_ASSISTANT') || 'Asistente Médico' }}</option>
        </optgroup>
        <optgroup :label="$t('collaborator.role.categories.administrative') || 'Personal Administrativo'">
          <option value="SECRETARY">{{ $t('collaborator.role.types.SECRETARY') || 'Secretaria' }}</option>
          <option value="RECEPTIONIST">{{ $t('collaborator.role.types.RECEPTIONIST') || 'Recepcionista' }}</option>
        </optgroup>
        <optgroup :label="$t('collaborator.role.categories.general') || 'Roles Generales'">
          <option value="STANDARD">{{ $t('collaborator.role.types.STANDARD') || 'Estándar' }}</option>
          <option value="ASSISTANT">{{ $t('collaborator.role.types.ASSISTANT') || 'Asistente' }}</option>
          <option value="FULL">{{ $t('collaborator.role.types.FULL') || 'Completo' }}</option>
        </optgroup>
      </select>
    </div>

    <div class="form-group-modern form-group-toggle" v-if="!isAdd">
      <label class="form-label-modern">
        {{ $t('businessCollaboratorsAdmin.active') }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>{{ $t('businessCollaboratorsAdmin.activeHelp') || 'Si está activo, el colaborador puede usar la plataforma y aparecerá en las listas de selección.' }}</div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </label>
      <Toggle
        v-model="collaborator.active"
        :disabled="isAdd ? false : !toggles['collaborators.admin.edit']"
      />
    </div>
    <div class="form-group-modern form-group-toggle">
      <label class="form-label-modern">
        {{ $t('businessCollaboratorsAdmin.bot') }}
        <Popper :class="'dark p-1'" arrow :disable-click-away="false">
          <template #content>
            <div>{{ $t('businessCollaboratorsAdmin.botHelp') || 'Marca este colaborador como bot cuando representa una automatización o integración y no una persona.' }}</div>
          </template>
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </label>
      <Toggle
        v-model="collaborator.bot"
        :disabled="isAdd ? false : !toggles['collaborators.admin.edit']"
      />
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
  align-items: center;
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

.form-select-modern {
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.625rem center;
  background-size: 1rem;
  padding-right: 2.5rem;
  appearance: none;
}

/* Form Group Toggle */
.form-group-toggle {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

/* Toggle Styles */
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

/* Responsive */
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
