<script>
import CollaboratorFormBasicFields from './CollaboratorFormBasicFields.vue';
import CollaboratorFormRelations from './CollaboratorFormRelations.vue';
import DigitalSignatureUpload from './DigitalSignatureUpload.vue';
import MedicalDataForm from './MedicalDataForm.vue';
import ProfilePhotoUpload from './ProfilePhotoUpload.vue';
import RoleSelector from './RoleSelector.vue';
import CreateAssociatedProfessionalModal from './CreateAssociatedProfessionalModal.vue';
import Popper from 'vue3-popper';

export default {
  name: 'CollaboratorFormEdit',
  components: {
    CollaboratorFormBasicFields,
    CollaboratorFormRelations,
    DigitalSignatureUpload,
    MedicalDataForm,
    ProfilePhotoUpload,
    RoleSelector,
    CreateAssociatedProfessionalModal,
    Popper,
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
  emits: ['update:collaborator', 'professional-created'],
  data() {
    return {
      showCreateProfessionalModal: false,
    };
  },
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
      return ['DOCTOR', 'SPECIALIST', 'NURSE', 'MEDICAL_ASSISTANT'].includes(
        this.collaborator.role,
      );
    },
    canSignDocuments() {
      return ['DOCTOR', 'SPECIALIST'].includes(this.collaborator.role);
    },
  },
  methods: {
    openCreateProfessionalModal() {
      this.showCreateProfessionalModal = true;
    },
    handleChildChange({ field, value }) {
      const updated = { ...this.collaborator };
      if (field === 'medicalData') {
        // NOTA: medicalData ahora está en Professional, no en Collaborator
        // Mantener por compatibilidad temporal pero advertir
        console.warn('medicalData should be managed in Professional entity, not Collaborator');
        updated.medicalData = { ...(updated.medicalData || {}), ...value };
      } else if (field === 'digitalSignature') {
        // NOTA: digitalSignature ahora está en Professional, no en Collaborator
        console.warn('digitalSignature should be managed in Professional entity, not Collaborator');
        // No actualizar collaborator con estos campos deprecados
        if (updated.isProfessional) {
          // Si tiene Professional asociado, mostrar mensaje
          console.info(
            'Collaborator has associated Professional. Update signature in Professional profile.',
          );
        }
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
    handleProfessionalCreated(result) {
      // Actualizar el colaborador local con los datos actualizados
      const updated = {
        ...this.collaborator,
        isProfessional: true,
        professionalId: result.professional.id,
      };
      this.$emit('update:collaborator', updated);
      this.$emit('professional-created', result);
      this.showCreateProfessionalModal = false;
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
      :show-role="true"
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
      <ProfilePhotoUpload
        :collaborator-id="collaborator.id"
        :commerce-id="commerceId"
        :existing-photo="collaborator.profilePhoto"
        @updated="handlePhotoUpdated"
        @photo-captured="handlePhotoUpdated"
        @photo-uploaded="handlePhotoUpdated"
      />
    </div>

    <!-- Modal para crear perfil profesional -->
    <CreateAssociatedProfessionalModal
      v-if="showCreateProfessionalModal"
      :collaborator="localCollaborator"
      :services="services"
      @created="handleProfessionalCreated"
      @close="showCreateProfessionalModal = false"
    />

    <div
      v-if="localCollaborator && localCollaborator.id"
      id="collaborator-id-form"
      class="row -2 mb-g3 mt-2"
    >
      <div class="row collaborator-details-container">
        <div class="col">
          <span><strong>Id:</strong> {{ localCollaborator.id }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.collaborator-form-edit {
  width: 100%;
}

.collaborator-details-container {
  font-size: 0.8rem;
  margin-left: 0.5rem;
  margin-right: 0.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0;
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
