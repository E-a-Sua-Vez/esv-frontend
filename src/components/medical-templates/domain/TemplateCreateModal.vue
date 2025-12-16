<template>
  <div v-if="show" class="modal-overlay" @click.self="handleClose">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Crear Template</h5>
        <button type="button" class="btn-close" @click="handleClose"></button>
      </div>
      <div class="modal-body">
        <div class="form-group mb-3">
          <label>Nombre del Template *</label>
          <input
            type="text"
            class="form-control"
            v-model="formData.name"
            placeholder="Ej: Hipertensión Arterial"
          />
        </div>

        <div class="form-group mb-3">
          <label>Descripción</label>
          <textarea
            class="form-control"
            v-model="formData.description"
            rows="2"
            placeholder="Descripción breve del template"
          ></textarea>
        </div>

        <div class="row mb-3">
          <div class="col-md-6">
            <label>Tipo *</label>
            <select class="form-control" v-model="formData.type">
              <option value="diagnostic">Diagnóstico</option>
              <option value="anamnesis">Anamnesis</option>
              <option value="evolution">Evolución</option>
              <option value="prescription">Receta</option>
              <option value="exam_order">Pedido de Examen</option>
              <option value="reference">Referencia</option>
              <option value="general">General</option>
            </select>
          </div>
          <div class="col-md-6">
            <label>Categoría</label>
            <input
              type="text"
              class="form-control"
              v-model="formData.category"
              placeholder="Ej: Cardiología"
            />
          </div>
        </div>

        <div class="form-group mb-3">
          <label>Contenido *</label>
          <textarea
            class="form-control"
            v-model="formData.content"
            rows="8"
            placeholder="Escribe el contenido del template. Usa {{variableName}} para variables."
          ></textarea>
          <small class="form-text text-muted">
            Variables disponibles: {{ date }}, {{ time }}, {{ datetime }}, {{ patientName }}, etc.
          </small>
        </div>

        <div class="form-group mb-3">
          <label>Alcance</label>
          <select class="form-control" v-model="formData.scope">
            <option value="personal">Personal (solo para mí)</option>
            <option value="commerce">Comercio (todos los médicos del comercio)</option>
          </select>
        </div>

        <div class="form-group mb-3">
          <label>Tags (separados por comas)</label>
          <input
            type="text"
            class="form-control"
            v-model="tagsInput"
            placeholder="Ej: hipertensión, cardiovascular, crónico"
          />
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" @click="handleClose">Cancelar</button>
        <button
          type="button"
          class="btn btn-primary"
          @click="handleCreate"
          :disabled="!isFormValid || creating"
        >
          <span v-if="creating" class="spinner-border spinner-border-sm me-2"></span>
          Crear Template
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch } from 'vue';
import { createTemplate } from '../../../application/services/medical-template';
import { globalStore } from '../../../stores';

export default {
  name: 'TemplateCreateModal',
  props: {
    show: {
      type: Boolean,
      default: false,
    },
    templateType: {
      type: String,
      default: 'general',
    },
  },
  emits: ['close', 'created'],
  setup(props, { emit }) {
    const store = globalStore();
    const creating = ref(false);

    const formData = ref({
      name: '',
      description: '',
      type: props.templateType || 'general',
      category: '',
      content: '',
      scope: 'personal',
      tags: [],
    });

    const tagsInput = ref('');

    watch(
      () => props.templateType,
      newType => {
        if (newType) {
          formData.value.type = newType;
        }
      }
    );

    const isFormValid = computed(
      () => formData.value.name.trim() !== '' && formData.value.content.trim() !== ''
    );

    const handleClose = () => {
      emit('close');
    };

    const handleCreate = async () => {
      if (!isFormValid.value) return;

      try {
        creating.value = true;

        // Procesar tags
        const tags = tagsInput.value
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag !== '');

        const templateData = {
          commerceId: store.commerce?.id,
          doctorId: store.user?.id,
          doctorName: store.user?.name,
          name: formData.value.name,
          description: formData.value.description,
          type: formData.value.type,
          category: formData.value.category,
          content: formData.value.content,
          scope: formData.value.scope,
          tags,
          variables: [], // Por ahora sin variables personalizadas
        };

        await createTemplate(templateData);
        emit('created');

        // Reset form
        formData.value = {
          name: '',
          description: '',
          type: props.templateType || 'general',
          category: '',
          content: '',
          scope: 'personal',
          tags: [],
        };
        tagsInput.value = '';
      } catch (error) {
        console.error('Error creating template:', error);
        alert('Error al crear el template');
      } finally {
        creating.value = false;
      }
    };

    return {
      formData,
      tagsInput,
      isFormValid,
      creating,
      handleClose,
      handleCreate,
    };
  },
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050;
}

.modal-content {
  background: white;
  border-radius: 0.5rem;
  width: 90%;
  max-width: 700px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
}

.modal-body {
  padding: 1rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 1rem;
  border-top: 1px solid rgba(0, 0, 0, 0.1);
}
</style>
