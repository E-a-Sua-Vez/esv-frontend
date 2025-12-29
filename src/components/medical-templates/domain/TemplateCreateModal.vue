<template>
  <div v-if="show" class="modal-overlay" @click.self="handleClose">
    <div class="modal-content template-editor-modal">
      <div class="modal-header">
        <h5 class="modal-title">
          <i class="bi bi-file-earmark-text me-2"></i>
          {{ editingTemplate ? 'Editar Template' : 'Crear Template' }}
        </h5>
        <button type="button" class="btn-close" @click="handleClose"></button>
      </div>
      <div class="modal-body">
        <!-- Basic Info Section -->
        <div class="form-section">
          <div class="row mb-3">
            <div class="col-md-8">
              <label class="form-label">Nombre del Template *</label>
              <input
                type="text"
                class="form-control"
                v-model="formData.name"
                placeholder="Ej: Hipertensión Arterial"
                :class="{ 'is-invalid': errors.name }"
              />
              <div v-if="errors.name" class="invalid-feedback">{{ errors.name }}</div>
            </div>
            <div class="col-md-4">
              <label class="form-label">Tipo *</label>
              <select
                class="form-control"
                v-model="formData.type"
                :class="{ 'is-invalid': errors.type }"
              >
                <option value="GENERAL">General</option>
                <option value="DIAGNOSTIC">Diagnóstico</option>
                <option value="ANAMNESIS">Anamnesis</option>
                <option value="EVOLUTION">Evolución</option>
                <option value="PRESCRIPTION">Receta</option>
                <option value="EXAM_ORDER">Pedido de Examen</option>
                <option value="REFERENCE">Referencia</option>
              </select>
            </div>
          </div>

          <div class="row mb-3">
            <div class="col-md-6">
              <label class="form-label">Descripción</label>
              <input
                type="text"
                class="form-control"
                v-model="formData.description"
                placeholder="Descripción breve del template"
              />
            </div>
            <div class="col-md-6">
              <label class="form-label">Categoría</label>
              <input
                type="text"
                class="form-control"
                v-model="formData.category"
                placeholder="Ej: Cardiología"
              />
            </div>
          </div>

          <div class="row mb-3">
            <div class="col-md-6">
              <label class="form-label">Alcance</label>
              <select class="form-control" v-model="formData.scope">
                <option value="PERSONAL">Personal (solo para mí)</option>
                <option value="COMMERCE">Comercio (todos los médicos del comercio)</option>
                <option value="GLOBAL">Global (todos los comercios)</option>
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label">Tags (separados por comas)</label>
              <input
                type="text"
                class="form-control"
                v-model="tagsInput"
                placeholder="Ej: hipertensión, cardiovascular, crónico"
              />
            </div>
          </div>
        </div>

        <!-- Variables Section -->
        <div class="form-section">
          <div class="section-header">
            <h6 class="section-title">
              <i class="bi bi-sliders me-2"></i>
              Variables Personalizadas
            </h6>
            <button
              type="button"
              class="btn btn-sm btn-outline-primary"
              @click="showAddVariable = true"
            >
              <i class="bi bi-plus-circle me-1"></i>
              Agregar Variable
            </button>
          </div>

          <!-- Variables List -->
          <div v-if="formData.variables && formData.variables.length > 0" class="variables-list">
            <div
              v-for="(variable, index) in formData.variables"
              :key="index"
              class="variable-item"
              draggable="true"
              @dragstart="handleDragStart(index, $event)"
              @dragover.prevent
              @drop="handleDrop(index, $event)"
            >
              <div class="variable-handle">
                <i class="bi bi-grip-vertical"></i>
              </div>
              <div class="variable-content">
                <div class="variable-name">
                  <strong>{{ variable.name }}</strong>
                  <span class="badge bg-secondary ms-2">{{ variable.type }}</span>
                  <span v-if="variable.required" class="badge bg-danger ms-1">Requerido</span>
                </div>
                <div class="variable-label text-muted">{{ variable.label }}</div>
              </div>
              <div class="variable-actions">
                <button
                  type="button"
                  class="btn btn-sm btn-outline-primary"
                  @click="insertVariable(variable.name)"
                  title="Insertar en contenido"
                >
                  <i class="bi bi-arrow-down-circle"></i>
                </button>
                <button
                  type="button"
                  class="btn btn-sm btn-outline-danger"
                  @click="removeVariable(index)"
                  title="Eliminar"
                >
                  <i class="bi bi-trash"></i>
                </button>
              </div>
            </div>
          </div>
          <div v-else class="text-muted text-center py-3">
            No hay variables personalizadas. Agrega variables para hacer el template más dinámico.
          </div>
        </div>

        <!-- Content Editor Section -->
        <div class="form-section">
          <div class="section-header">
            <h6 class="section-title">
              <i class="bi bi-file-text me-2"></i>
              Contenido del Template *
            </h6>
            <div class="toolbar">
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary"
                @click="insertSystemVariable('date')"
                title="Insertar fecha"
              >
                <i class="bi bi-calendar me-1"></i>
                Fecha
              </button>
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary"
                @click="insertSystemVariable('time')"
                title="Insertar hora"
              >
                <i class="bi bi-clock me-1"></i>
                Hora
              </button>
              <button
                type="button"
                class="btn btn-sm btn-outline-secondary"
                @click="insertSystemVariable('datetime')"
                title="Insertar fecha y hora"
              >
                <i class="bi bi-calendar-event me-1"></i>
                Fecha/Hora
              </button>
              <div v-if="formData.variables && formData.variables.length > 0" class="dropdown ms-2">
                <button
                  class="btn btn-sm btn-outline-primary dropdown-toggle"
                  type="button"
                  data-bs-toggle="dropdown"
                >
                  <i class="bi bi-tag me-1"></i>
                  Variables
                </button>
                <ul class="dropdown-menu">
                  <li v-for="variable in formData.variables" :key="variable.name">
                    <a
                      class="dropdown-item"
                      href="#"
                      @click.prevent="insertVariable(variable.name)"
                    >
                      {{ variable.label }} ({{ variable.name }})
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <!-- Content Textarea with Autocompletion -->
          <div class="content-editor-wrapper">
            <textarea
              ref="contentTextarea"
              class="form-control content-editor"
              v-model="formData.content"
              rows="12"
              :placeholder="contentPlaceholder"
              @input="handleContentInput"
              @keydown="handleKeydown"
            ></textarea>
            <!-- Autocompletion Dropdown -->
            <div
              v-if="showAutocomplete && autocompleteOptions.length > 0"
              class="autocomplete-dropdown"
            >
              <div
                v-for="(option, index) in autocompleteOptions"
                :key="index"
                class="autocomplete-item"
                :class="{ active: autocompleteIndex === index }"
                @click="selectAutocomplete(index)"
              >
                <strong>{{ option.name }}</strong>
                <span class="text-muted ms-2">{{ option.label }}</span>
              </div>
            </div>
          </div>
          <small class="form-text text-muted">
            {{ contentHelp }}
          </small>
          <div v-if="errors.content" class="text-danger mt-1">{{ errors.content }}</div>
        </div>

        <!-- Preview Section -->
        <div class="form-section">
          <div class="section-header">
            <h6 class="section-title">
              <i class="bi bi-eye me-2"></i>
              Vista Previa
            </h6>
            <button
              type="button"
              class="btn btn-sm btn-outline-secondary"
              @click="showPreview = !showPreview"
            >
              <i :class="showPreview ? 'bi bi-chevron-up' : 'bi bi-chevron-down'"></i>
            </button>
          </div>
          <div v-if="showPreview" class="preview-content">
            <div class="preview-text" v-html="previewContent"></div>
          </div>
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
          {{ editingTemplate ? 'Actualizar' : 'Crear' }} Template
        </button>
      </div>
    </div>

    <!-- Add Variable Modal -->
    <div
      v-if="showAddVariable"
      class="modal-overlay variable-modal-overlay"
      @click.self="showAddVariable = false"
    >
      <div class="modal-content variable-modal">
        <div class="modal-header">
          <h6 class="modal-title">Agregar Variable</h6>
          <button type="button" class="btn-close" @click="showAddVariable = false"></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label class="form-label">Nombre de la Variable *</label>
            <input
              type="text"
              class="form-control"
              v-model="newVariable.name"
              placeholder="Ej: patientName"
              :class="{ 'is-invalid': variableErrors.name }"
            />
            <div v-if="variableErrors.name" class="invalid-feedback">{{ variableErrors.name }}</div>
            <small class="form-text text-muted">
              Solo letras, números y guiones bajos. No puede empezar con número.
            </small>
          </div>
          <div class="mb-3">
            <label class="form-label">Etiqueta *</label>
            <input
              type="text"
              class="form-control"
              v-model="newVariable.label"
              placeholder="Ej: Nombre del Paciente"
              :class="{ 'is-invalid': variableErrors.label }"
            />
            <div v-if="variableErrors.label" class="invalid-feedback">
              {{ variableErrors.label }}
            </div>
          </div>
          <div class="mb-3">
            <label class="form-label">Tipo *</label>
            <select class="form-control" v-model="newVariable.type">
              <option value="text">Texto</option>
              <option value="date">Fecha</option>
              <option value="number">Número</option>
              <option value="select">Selección</option>
            </select>
          </div>
          <div v-if="newVariable.type === 'select'" class="mb-3">
            <label class="form-label">Opciones (una por línea) *</label>
            <textarea
              class="form-control"
              v-model="newVariable.optionsText"
              rows="4"
              placeholder="Opción 1&#10;Opción 2&#10;Opción 3"
            ></textarea>
          </div>
          <div class="mb-3">
            <label class="form-label">Valor por Defecto</label>
            <input
              type="text"
              class="form-control"
              v-model="newVariable.defaultValue"
              placeholder="Valor predeterminado"
            />
          </div>
          <div class="form-check">
            <input
              class="form-check-input"
              type="checkbox"
              v-model="newVariable.required"
              id="variableRequired"
            />
            <label class="form-check-label" for="variableRequired"> Variable requerida </label>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="showAddVariable = false">
            Cancelar
          </button>
          <button type="button" class="btn btn-primary" @click="addVariable">Agregar</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed, watch, nextTick, onMounted } from 'vue';
import { createTemplate, updateTemplate } from '../../../application/services/medical-template';
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
      default: 'GENERAL',
    },
    template: {
      type: Object,
      default: null,
    },
  },
  emits: ['close', 'created'],
  setup(props, { emit }) {
    const store = globalStore();
    const creating = ref(false);
    const showPreview = ref(true);
    const showAddVariable = ref(false);
    const contentTextarea = ref(null);
    const showAutocomplete = ref(false);
    const autocompleteOptions = ref([]);
    const autocompleteIndex = ref(-1);
    const autocompletePosition = ref({ top: 0, left: 0 });
    const draggedIndex = ref(null);

    const editingTemplate = computed(() => !!props.template);

    const formData = ref({
      name: '',
      description: '',
      type: props.templateType || 'GENERAL',
      category: '',
      content: '',
      scope: 'PERSONAL',
      tags: [],
      variables: [],
    });

    const newVariable = ref({
      name: '',
      label: '',
      type: 'text',
      defaultValue: '',
      optionsText: '',
      required: false,
    });

    const tagsInput = ref('');
    const errors = ref({});
    const variableErrors = ref({});

    // System variables
    const systemVariables = [
      { name: 'date', label: 'Fecha actual' },
      { name: 'time', label: 'Hora actual' },
      { name: 'datetime', label: 'Fecha y hora actual' },
    ];

    // Reserved variable names
    const reservedNames = ['date', 'time', 'datetime', 'patientName', 'patientAge', 'diagnosis'];

    watch(
      () => props.templateType,
      newType => {
        if (newType && !editingTemplate.value) {
          formData.value.type = newType;
        }
      }
    );

    watch(
      () => props.template,
      newTemplate => {
        if (newTemplate) {
          formData.value = {
            name: newTemplate.name || '',
            description: newTemplate.description || '',
            type: newTemplate.type || 'GENERAL',
            category: newTemplate.category || '',
            content: newTemplate.content || '',
            scope: newTemplate.scope || 'PERSONAL',
            tags: newTemplate.tags || [],
            variables: newTemplate.variables || [],
          };
          tagsInput.value = (newTemplate.tags || []).join(', ');
        } else {
          resetForm();
        }
      },
      { immediate: true }
    );

    watch(
      () => props.show,
      newValue => {
        if (newValue && props.template) {
          // Load template data when modal opens
          formData.value = {
            name: props.template.name || '',
            description: props.template.description || '',
            type: props.template.type || 'GENERAL',
            category: props.template.category || '',
            content: props.template.content || '',
            scope: props.template.scope || 'PERSONAL',
            tags: props.template.tags || [],
            variables: props.template.variables || [],
          };
          tagsInput.value = (props.template.tags || []).join(', ');
        } else if (!newValue) {
          resetForm();
        }
      }
    );

    const isFormValid = computed(
      () =>
        formData.value.name.trim() !== '' &&
        formData.value.content.trim() !== '' &&
        Object.keys(errors.value).length === 0
    );

    const contentPlaceholder = computed(
      () => `Escribe el contenido del template. Usa {'{{'}variableName{'}}'} para variables.

Ejemplo:
Paciente: {'{{'}patientName{'}}'}
Fecha: {'{{'}date{'}}'}
Diagnóstico: {'{{'}diagnosis{'}}'}`
    );

    const contentHelp = computed(() => {
      const systemVars = systemVariables.map(v => `{'{{'}${v.name}{'}}'}`).join(', ');
      const customVars =
        formData.value.variables && formData.value.variables.length > 0
          ? formData.value.variables.map(v => `{'{{'}${v.name}{'}}'}`).join(', ')
          : '';
      return `Variables del sistema: ${systemVars}${
        customVars ? `. Variables personalizadas: ${customVars}` : ''
      }`;
    });

    const previewContent = computed(() => {
      let preview = formData.value.content || '';

      // Replace system variables
      preview = preview.replace(/\{\{date\}\}/g, new Date().toLocaleDateString('es-ES'));
      preview = preview.replace(/\{\{time\}\}/g, new Date().toLocaleTimeString('es-ES'));
      preview = preview.replace(/\{\{datetime\}\}/g, new Date().toLocaleString('es-ES'));

      // Replace custom variables with labels
      if (formData.value.variables) {
        formData.value.variables.forEach(variable => {
          const regex = new RegExp(`\\{\\{${variable.name}\\}\\}`, 'g');
          const placeholder =
            variable.type === 'select'
              ? `[${variable.label}]`
              : variable.type === 'date'
              ? `[${variable.label}: Fecha]`
              : variable.type === 'number'
              ? `[${variable.label}: Número]`
              : `[${variable.label}]`;
          preview = preview.replace(
            regex,
            `<span class="variable-placeholder">${placeholder}</span>`,
          );
        });
      }

      return preview.replace(/\n/g, '<br>');
    });

    const resetForm = () => {
      formData.value = {
        name: '',
        description: '',
        type: props.templateType || 'GENERAL',
        category: '',
        content: '',
        scope: 'PERSONAL',
        tags: [],
        variables: [],
      };
      tagsInput.value = '';
      errors.value = {};
      newVariable.value = {
        name: '',
        label: '',
        type: 'text',
        defaultValue: '',
        optionsText: '',
        required: false,
      };
      variableErrors.value = {};
    };

    const handleClose = () => {
      resetForm();
      emit('close');
    };

    // Variable Management
    const validateVariable = () => {
      variableErrors.value = {};

      if (!newVariable.value.name || newVariable.value.name.trim() === '') {
        variableErrors.value.name = 'El nombre es requerido';
        return false;
      }

      // Validate name format
      const nameRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
      if (!nameRegex.test(newVariable.value.name)) {
        variableErrors.value.name = 'Solo letras, números y guiones bajos. Debe empezar con letra.';
        return false;
      }

      // Check reserved names
      if (reservedNames.includes(newVariable.value.name)) {
        variableErrors.value.name = 'Este nombre está reservado para variables del sistema';
        return false;
      }

      // Check duplicates
      if (formData.value.variables.some(v => v.name === newVariable.value.name)) {
        variableErrors.value.name = 'Ya existe una variable con este nombre';
        return false;
      }

      if (!newVariable.value.label || newVariable.value.label.trim() === '') {
        variableErrors.value.label = 'La etiqueta es requerida';
        return false;
      }

      if (newVariable.value.type === 'select' && !newVariable.value.optionsText.trim()) {
        variableErrors.value.options = 'Las opciones son requeridas para tipo selección';
        return false;
      }

      return true;
    };

    const addVariable = () => {
      if (!validateVariable()) return;

      const variable = {
        name: newVariable.value.name.trim(),
        label: newVariable.value.label.trim(),
        type: newVariable.value.type,
        defaultValue: newVariable.value.defaultValue?.trim() || undefined,
        options:
          newVariable.value.type === 'select'
            ? newVariable.value.optionsText
                .split('\n')
                .map(o => o.trim())
                .filter(o => o !== '')
            : undefined,
        required: newVariable.value.required,
      };

      formData.value.variables = [...(formData.value.variables || []), variable];

      // Reset new variable form
      newVariable.value = {
        name: '',
        label: '',
        type: 'text',
        defaultValue: '',
        optionsText: '',
        required: false,
      };
      variableErrors.value = {};
      showAddVariable.value = false;

      // Insert variable in content
      insertVariable(variable.name);
    };

    const removeVariable = index => {
      formData.value.variables.splice(index, 1);
    };

    // Drag and Drop
    const handleDragStart = (index, event) => {
      draggedIndex.value = index;
      event.dataTransfer.effectAllowed = 'move';
    };

    const handleDrop = (targetIndex, event) => {
      event.preventDefault();
      if (draggedIndex.value === null || draggedIndex.value === targetIndex) return;

      const variables = [...formData.value.variables];
      const [removed] = variables.splice(draggedIndex.value, 1);
      variables.splice(targetIndex, 0, removed);
      formData.value.variables = variables;
      draggedIndex.value = null;
    };

    // Insert Variables
    const insertSystemVariable = variableName => {
      insertTextAtCursor(`{{${variableName}}}`);
    };

    const insertVariable = variableName => {
      insertTextAtCursor(`{{${variableName}}}`);
    };

    const insertTextAtCursor = text => {
      if (!contentTextarea.value) return;

      const textarea = contentTextarea.value;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const currentText = formData.value.content;

      formData.value.content = currentText.substring(0, start) + text + currentText.substring(end);

      nextTick(() => {
        textarea.focus();
        const newPosition = start + text.length;
        textarea.setSelectionRange(newPosition, newPosition);
      });
    };

    // Autocompletion
    const handleContentInput = event => {
      const textarea = event.target;
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = formData.value.content.substring(0, cursorPos);
      const match = textBeforeCursor.match(/\{\{([^}]*)$/);

      if (match) {
        const partial = match[1].toLowerCase();
        const options = [];

        // System variables
        systemVariables.forEach(v => {
          if (v.name.toLowerCase().startsWith(partial)) {
            options.push({ name: v.name, label: v.label, type: 'system' });
          }
        });

        // Custom variables
        if (formData.value.variables) {
          formData.value.variables.forEach(v => {
            if (v.name.toLowerCase().startsWith(partial)) {
              options.push({ name: v.name, label: v.label, type: 'custom' });
            }
          });
        }

        if (options.length > 0) {
          autocompleteOptions.value = options;
          showAutocomplete.value = true;
          autocompleteIndex.value = 0;
          updateAutocompletePosition(textarea, cursorPos);
        } else {
          showAutocomplete.value = false;
        }
      } else {
        showAutocomplete.value = false;
      }
    };

    const updateAutocompletePosition = (textarea, cursorPos) => {
      const textBeforeCursor = formData.value.content.substring(0, cursorPos);
      const lines = textBeforeCursor.split('\n');
      const currentLine = lines.length - 1;
      const lineStart = textBeforeCursor.lastIndexOf('\n') + 1;
      const col = cursorPos - lineStart;

      // Approximate position (this is a simplified calculation)
      const rect = textarea.getBoundingClientRect();
      const lineHeight = 20; // Approximate line height
      autocompletePosition.value = {
        top: rect.top + currentLine * lineHeight + lineHeight + 5,
        left: rect.left + col * 8 + 10, // Approximate character width
      };
    };

    const handleKeydown = event => {
      if (showAutocomplete.value && autocompleteOptions.value.length > 0) {
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          autocompleteIndex.value = Math.min(
            autocompleteIndex.value + 1,
            autocompleteOptions.value.length - 1
          );
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          autocompleteIndex.value = Math.max(autocompleteIndex.value - 1, -1);
        } else if (event.key === 'Enter' && autocompleteIndex.value >= 0) {
          event.preventDefault();
          selectAutocomplete(autocompleteIndex.value);
        } else if (event.key === 'Escape') {
          showAutocomplete.value = false;
        }
      }
    };

    const selectAutocomplete = index => {
      if (index < 0 || index >= autocompleteOptions.value.length) return;

      const option = autocompleteOptions.value[index];
      const textarea = contentTextarea.value;
      const cursorPos = textarea.selectionStart;
      const textBeforeCursor = formData.value.content.substring(0, cursorPos);
      const match = textBeforeCursor.match(/\{\{([^}]*)$/);

      if (match) {
        const start = cursorPos - match[0].length;
        const end = cursorPos;
        const currentText = formData.value.content;
        formData.value.content =
          currentText.substring(0, start) + `{{${option.name}}}` + currentText.substring(end);

        nextTick(() => {
          textarea.focus();
          const newPosition = start + `{{${option.name}}}`.length;
          textarea.setSelectionRange(newPosition, newPosition);
          showAutocomplete.value = false;
        });
      }
    };

    const handleCreate = async () => {
      // Validate
      errors.value = {};

      if (!formData.value.name.trim()) {
        errors.value.name = 'El nombre es requerido';
      }

      if (!formData.value.content.trim()) {
        errors.value.content = 'El contenido es requerido';
      }

      if (Object.keys(errors.value).length > 0) {
        return;
      }

      try {
        creating.value = true;

        // Process tags
        const tags = tagsInput.value
          .split(',')
          .map(tag => tag.trim())
          .filter(tag => tag !== '');

        const currentCommerce = store.getCurrentCommerce;
        const currentUser = await store.getCurrentUser;

        const templateData = {
          commerceId: currentCommerce?.id,
          doctorId: currentUser?.id,
          doctorName: currentUser?.userName || currentUser?.name,
          name: formData.value.name.trim(),
          description: formData.value.description?.trim() || undefined,
          type: formData.value.type,
          category: formData.value.category?.trim() || undefined,
          content: formData.value.content.trim(),
          scope: formData.value.scope,
          tags,
          variables: formData.value.variables || [],
        };

        if (editingTemplate.value && props.template?.id) {
          await updateTemplate(props.template.id, templateData);
        } else {
          await createTemplate(templateData);
        }

        emit('created');
        resetForm();
        handleClose();
      } catch (error) {
        console.error('Error saving template:', error);
        alert('Error al guardar el template: ' + (error.response?.data?.message || error.message));
      } finally {
        creating.value = false;
      }
    };

    onMounted(() => {
      // Close autocomplete when clicking outside
      document.addEventListener('click', event => {
        if (showAutocomplete.value && !event.target.closest('.content-editor-wrapper')) {
          showAutocomplete.value = false;
        }
      });
    });

    return {
      formData,
      tagsInput,
      isFormValid,
      creating,
      editingTemplate,
      handleClose,
      handleCreate,
      showPreview,
      previewContent,
      contentPlaceholder,
      contentHelp,
      showAddVariable,
      newVariable,
      variableErrors,
      addVariable,
      removeVariable,
      insertSystemVariable,
      insertVariable,
      contentTextarea,
      handleContentInput,
      handleKeydown,
      showAutocomplete,
      autocompleteOptions,
      autocompleteIndex,
      autocompletePosition,
      selectAutocomplete,
      handleDragStart,
      handleDrop,
      errors,
    };
  },
};
</script>

<style scoped>
.template-editor-modal {
  max-width: 900px;
  max-height: 95vh;
  overflow-y: auto;
  background: white;
  border-radius: 0.75rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.form-section {
  margin-bottom: 2rem;
  padding-bottom: 1.5rem;
  border-bottom: 2px solid rgba(0, 0, 0, 0.05);
}

.form-section:last-child {
  border-bottom: none;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--color-text);
  display: flex;
  align-items: center;
}

.toolbar {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.toolbar .btn {
  display: inline-flex;
  align-items: center;
  padding: 0.375rem 0.75rem;
  border: 1px solid rgba(0, 0, 0, 0.1);
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s ease;
  background: white;
  color: var(--color-text);
}

.toolbar .btn:hover {
  background: rgba(0, 123, 255, 0.05);
  border-color: var(--azul-turno);
  color: var(--azul-turno);
}

.content-editor-wrapper {
  position: relative;
}

.content-editor {
  font-family: 'Courier New', monospace;
  font-size: 14px;
  width: 100%;
  padding: 0.75rem;
  border: 2px solid rgba(0, 0, 0, 0.05);
  border-radius: 0.5rem;
  transition: all 0.2s ease;
  background: #fafafa;
}

.content-editor:focus {
  outline: none;
  border-color: var(--azul-turno);
  background: white;
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

.autocomplete-dropdown {
  position: absolute;
  background: white;
  border: 2px solid rgba(0, 123, 255, 0.2);
  border-radius: 0.5rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  max-height: 200px;
  overflow-y: auto;
  z-index: 1000;
  min-width: 300px;
}

.autocomplete-item {
  padding: 0.75rem 1rem;
  cursor: pointer;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.autocomplete-item:hover,
.autocomplete-item.active {
  background: linear-gradient(135deg, rgba(0, 123, 255, 0.1) 0%, rgba(0, 123, 255, 0.05) 100%);
  color: var(--azul-turno);
}

.autocomplete-item:last-child {
  border-bottom: none;
}

.preview-content {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.98) 100%);
  border: 2px solid rgba(0, 0, 0, 0.08);
  border-radius: 0.75rem;
  padding: 1rem;
  min-height: 100px;
  max-height: 300px;
  overflow-y: auto;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.preview-text {
  white-space: pre-wrap;
  line-height: 1.6;
  color: var(--color-text);
}

.variable-placeholder {
  background: linear-gradient(135deg, rgba(255, 193, 7, 0.2) 0%, rgba(255, 193, 7, 0.1) 100%);
  color: #856404;
  padding: 2px 8px;
  border-radius: 0.375rem;
  font-weight: 600;
  border: 1px solid rgba(255, 193, 7, 0.3);
}

.variables-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.variable-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.98) 100%);
  border: 2px solid rgba(0, 0, 0, 0.05);
  border-radius: 0.5rem;
  cursor: move;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
}

.variable-item:hover {
  background: white;
  border-color: var(--azul-turno);
  box-shadow: 0 4px 12px rgba(0, 123, 255, 0.15);
  transform: translateY(-2px);
}

.variable-item.dragging {
  opacity: 0.5;
}

.variable-handle {
  color: #6c757d;
  cursor: grab;
}

.variable-handle:active {
  cursor: grabbing;
}

.variable-content {
  flex: 1;
}

.variable-name {
  display: flex;
  align-items: center;
  margin-bottom: 0.25rem;
}

.variable-label {
  font-size: 0.875rem;
}

.variable-actions {
  display: flex;
  gap: 0.5rem;
}

.variable-modal-overlay {
  z-index: 1060;
}

.variable-modal {
  max-width: 500px;
  border-radius: 0.75rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.variable-modal .modal-header {
  border-radius: 0.75rem 0.75rem 0 0;
}

.variable-modal .modal-footer {
  border-radius: 0 0 0.75rem 0.75rem;
}

.variable-modal .form-control {
  border: 2px solid rgba(0, 0, 0, 0.05);
  border-radius: 0.5rem;
  padding: 0.75rem;
  transition: all 0.2s ease;
}

.variable-modal .form-control:focus {
  outline: none;
  border-color: var(--azul-turno);
  box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
}

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
  border-radius: 0.75rem;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.25rem 1.5rem;
  border-bottom: 2px solid rgba(0, 0, 0, 0.05);
  position: sticky;
  top: 0;
  background: white;
  z-index: 10;
  border-radius: 0.75rem 0.75rem 0 0;
}

.modal-header .modal-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
  display: flex;
  align-items: center;
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.25rem 1.5rem;
  border-top: 2px solid rgba(0, 0, 0, 0.05);
  position: sticky;
  bottom: 0;
  background: white;
  z-index: 10;
  border-radius: 0 0 0.75rem 0.75rem;
}

.modal-footer .btn {
  display: inline-flex;
  align-items: center;
  padding: 0.5rem 1.25rem;
  border-radius: 0.5rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.modal-footer .btn-primary {
  background: linear-gradient(135deg, var(--azul-turno) 0%, var(--verde-tu) 100%);
  color: white;
  border: none;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.modal-footer .btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.modal-footer .btn-secondary {
  background: white;
  color: var(--color-text);
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.modal-footer .btn-secondary:hover {
  background: rgba(0, 0, 0, 0.03);
  border-color: var(--azul-turno);
}
</style>
