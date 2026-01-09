<script>
import CollaboratorFormBasicFields from './CollaboratorFormBasicFields.vue';
import CollaboratorFormRelations from './CollaboratorFormRelations.vue';
import DigitalSignatureUpload from './DigitalSignatureUpload.vue';
import MedicalDataForm from './MedicalDataForm.vue';
import ProfilePhotoUpload from './ProfilePhotoUpload.vue';
import RoleSelector from './RoleSelector.vue';

export default {
  name: 'CollaboratorFormEdit',
  components: {
    CollaboratorFormBasicFields,
    CollaboratorFormRelations,
    DigitalSignatureUpload,
    MedicalDataForm,
    ProfilePhotoUpload,
    RoleSelector,
  },
  props: {
    collaborator: { type: Object, required: true },
    commerceId: { type: String, required: true },
    types: { type: Array, default: () => [] },
    modules: { type: Array, default: () => [] },
    commerces: { type: Array, default: () => [] },
    services: { type: Array, default: () => [] },
    toggles: { type: Object, default: () => ({}) },
    errors: { type: Object, default: () => ({}) },
    onSelectCommerce: { type: Function, default: null },
    onSelectService: { type: Function, default: null },
    onDeleteCommerce: { type: Function, default: null },
    onDeleteService: { type: Function, default: null },
    showCommerce: { type: Function, default: null },
    showService: { type: Function, default: null },
  },
  emits: ['update:collaborator'],
  computed: {
    localCollaborator: {
      get() {
        return this.collaborator;
      },
      set(value) {
        this.$emit('update:collaborator', value);
      },
    },
    isMedicalRole() {
      return ['DOCTOR', 'SPECIALIST', 'NURSE', 'MEDICAL_ASSISTANT'].includes(this.collaborator.role);
    },
    canSignDocuments() {
      return ['DOCTOR', 'SPECIALIST'].includes(this.collaborator.role);
    },
  },
  methods: {
    handleChildChange({ field, value }) {
      const updated = { ...this.collaborator };
      if (field === 'medicalData') {
        updated.medicalData = { ...(updated.medicalData || {}), ...value };
      } else if (field === 'digitalSignature') {
        updated.digitalSignature = value.digitalSignature;
        if (value.file) {
          updated.digitalSignatureFile = value.file;
        }
        updated.crm = value.crm;
        updated.crmState = value.crmState;
      } else if (field === 'profilePhoto') {
        updated.profilePhoto = value;
      }
      this.$emit('update:collaborator', updated);
    },
    handlePhotoUpdated(partial) {
      // Acepta payloads del componente de foto que envían un objeto parcial
      const updated = { ...this.collaborator, ...partial };
      this.$emit('update:collaborator', updated);
    },
    handleRoleChanged(roleData) {
      // Actualizar el colaborador con el nuevo rol y configuraciones
      this.$emit('update:collaborator', {
        ...this.collaborator,
        role: roleData.role,
        canSignDocuments: roleData.permissions.some(p => p.key === 'canSignDocuments' && p.value),
      });
    },
  },
};
</script>

<template>
  <div class="collaborator-form-edit">
    <!-- Campos Básicos (incluyendo rol integrado) -->
    <CollaboratorFormBasicFields
      v-model="localCollaborator"
      :types="types"
      :modules="modules"
      :toggles="toggles"
      :errors="errors"
      :showRole="true"
      prefix="update-"
      :is-add="false"
    />

    <!-- Relaciones -->
    <CollaboratorFormRelations
      v-model="localCollaborator"
      :commerces="commerces"
      :services="services"
      :toggles="toggles"
      prefix="update-"
      :is-add="false"
      :on-select-commerce="onSelectCommerce"
      :on-select-service="onSelectService"
      :on-delete-commerce="onDeleteCommerce"
      :on-delete-service="onDeleteService"
      :show-commerce="showCommerce"
      :show-service="showService"
    />

    <!-- Foto de Perfil (siempre visible) -->
    <div class="mt-3">
      <div class="form-section-header">
        <h6 class="form-section-title">{{ $t('collaborator.profilePhoto.title') || 'Foto de Perfil' }}</h6>
      </div>
      <ProfilePhotoUpload
        :collaborator-id="collaborator.id"
        :commerce-id="commerceId"
        :existing-photo="collaborator.profilePhoto"
        @updated="handlePhotoUpdated"
        @photo-captured="handlePhotoUpdated"
        @photo-uploaded="handlePhotoUpdated"
      />
    </div>

    <!-- Datos Médicos (solo para roles médicos) -->
    <div v-if="isMedicalRole" class="mt-3">
      <div class="form-section-header">
        <h6 class="form-section-title">{{ $t('collaborator.medicalData.title') || 'Datos Médicos' }}</h6>
      </div>
      <MedicalDataForm
        :collaborator-id="collaborator.id"
        :current-medical-data="collaborator.medicalData || {}"
        @change="handleChildChange"
      />
    </div>

    <!-- Firma Digital (solo para roles que pueden firmar documentos) -->
    <div v-if="canSignDocuments" class="mt-3">
      <div class="form-section-header">
        <h6 class="form-section-title">{{ $t('digitalSignature.title') || 'Firma Digital' }}</h6>
      </div>
      <DigitalSignatureUpload
        :collaborator-id="collaborator.id"
        :current-signature="collaborator.digitalSignature"
        :current-crm="collaborator.crm"
        :current-crm-state="collaborator.crmState"
        @change="handleChildChange"
      />
    </div>
  </div>
</template>

<style scoped>
.collaborator-form-edit {
  width: 100%;
}

.form-section-header {
  margin-bottom: 0.5rem;
}

.form-section-title {
  font-size: 0.8125rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.75);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin: 0;
  padding-bottom: 0.25rem;
  border-bottom: 1px solid #e9ecef;
}

.detailed-data {
  width: 100%;
  max-height: 0px;
  height: auto;
  overflow: hidden;
  margin: 0px auto auto;
  background-color: var(--color-background);
  transition: max-height 0.3s ease;
}

.detailed-data.show {
  padding: 10px;
  max-height: 2000px !important;
  overflow-y: visible;
}
</style>
