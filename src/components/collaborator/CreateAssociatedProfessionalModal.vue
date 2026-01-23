<template>
  <div
    class="modal fade show"
    style="display: block"
    tabindex="-1"
    aria-hidden="false"
    @click.self="$emit('close')"
  >
    <div class="modal-dialog modal-xl">
      <div class="modal-content">
        <div class="modal-header border-0 centered active-name">
          <h5 class="modal-title fw-bold">
            <i class="bi bi-person-plus"></i>
            {{ $t('collaborator.createProfessional.title') || 'Criar Perfil Profissional' }}
          </h5>
          <button
            class="btn-close"
            type="button"
            @click="$emit('close')"
            aria-label="Close"
          ></button>
        </div>

        <div class="modal-body text-center mb-0">
          <Spinner :show="loading"></Spinner>
          <div class="result-card mb-4">
            <p class="text-muted mb-3">
              {{
                $t('collaborator.createProfessional.description') ||
                'Crie um perfil profissional para que este colaborador possa executar serviços.'
              }}
            </p>

            <!-- Información del colaborador -->
            <div class="alert alert-light mb-3">
              <strong>{{ $t('collaborator.name') || 'Nome' }}:</strong> {{ collaborator.name }}
              <br />
              <strong>{{ $t('collaborator.email') || 'E-mail' }}:</strong> {{ collaborator.email }}
            </div>

            <!-- Form Fields Container -->
            <div class="form-fields-container">
              <div class="form-group-modern">
                <label class="form-label-modern">
                  {{ $t('professional.role.label') || 'Función Profesional' }}
                  <span class="text-danger">*</span>
                </label>
                <select
                  v-model="form.role"
                  class="form-control-modern form-select-modern"
                  :class="{ 'is-invalid': errors.role }"
                  required
                >
                  <option value="">{{ $t('professional.selectRole') || 'Seleccionar rol' }}</option>
                  <optgroup :label="$t('professional.role.categories.beauty') || 'Belleza'">
                    <option value="STYLIST">
                      {{ $t('professional.role.types.STYLIST') || 'Estilista' }}
                    </option>
                    <option value="BARBER">
                      {{ $t('professional.role.types.BARBER') || 'Barbero' }}
                    </option>
                  </optgroup>
                  <optgroup :label="$t('professional.role.categories.medical') || 'Médico'">
                    <option value="DOCTOR">
                      {{ $t('professional.role.types.DOCTOR') || 'Médico General' }}
                    </option>
                    <option value="SPECIALIST">
                      {{ $t('professional.role.types.SPECIALIST') || 'Especialista' }}
                    </option>
                    <option value="NURSE">
                      {{ $t('professional.role.types.NURSE') || 'Enfermero/a' }}
                    </option>
                    <option value="MEDICAL_ASSISTANT">
                      {{ $t('professional.role.types.MEDICAL_ASSISTANT') || 'Asistente Médico' }}
                    </option>
                  </optgroup>
                  <optgroup :label="$t('professional.role.categories.general') || 'General'">
                    <option value="STANDARD">
                      {{ $t('professional.role.types.STANDARD') || 'Estándar' }}
                    </option>
                    <option value="ASSISTANT">
                      {{ $t('professional.role.types.ASSISTANT') || 'Asistente' }}
                    </option>
                    <option value="RECEPTIONIST">
                      {{ $t('professional.role.types.RECEPTIONIST') || 'Recepcionista' }}
                    </option>
                  </optgroup>
                </select>
                <div v-if="errors.role" class="invalid-feedback d-block">
                  {{ errors.role }}
                </div>
              </div>

              <!-- Especialidades (opcional) -->
              <div class="form-group-modern">
                <label class="form-label-modern">{{
                  $t('professional.specialties') || 'Especialidades'
                }}</label>
                <input
                  v-model="form.specialties"
                  type="text"
                  class="form-control-modern"
                  :placeholder="
                    $t('professional.specialtiesPlaceholder') || 'Ej: Cardiologia, Dermatologia'
                  "
                />
                <small class="form-text text-muted">
                  {{
                    $t('professional.specialtiesHelp') ||
                    'Separar múltiplas especialidades com vírgulas'
                  }}
                </small>
              </div>

              <!-- Servicios que puede ejecutar -->
              <div class="form-group-modern" v-if="services && services.length > 0">
                <label class="form-label-modern">{{
                  $t('professional.services') || 'Serviços'
                }}</label>
                <select
                  v-model="form.servicesId"
                  class="form-control-modern form-select-modern"
                  multiple
                  size="5"
                >
                  <option v-for="service in services" :key="service.id" :value="service.id">
                    {{ service.name }}
                  </option>
                </select>
                <small class="form-text text-muted">
                  {{
                    $t('professional.servicesHelp') ||
                    'Mantenha Ctrl/Cmd pressionado para selecionar múltiplos'
                  }}
                </small>
              </div>

              <!-- Campos médicos (solo si rol es DOCTOR, SPECIALIST, NURSE, MEDICAL_ASSISTANT) -->
              <div v-if="isMedicalRole" class="medical-fields">
                <h6 class="mb-3">
                  <i class="bi bi-heart-pulse"></i>
                  {{ $t('professional.medicalData.title') || 'Dados Médicos' }}
                </h6>

                <div class="form-group-modern">
                  <label class="form-label-modern">{{
                    $t('professional.crm') || 'Registro Profissional (CRM)'
                  }}</label>
                  <input v-model="form.medicalData.crm" type="text" class="form-control-modern" />
                </div>

                <div class="form-group-modern">
                  <label class="form-label-modern">{{
                    $t('professional.crmState') || 'Estado do CRM'
                  }}</label>
                  <input
                    v-model="form.medicalData.crmState"
                    type="text"
                    class="form-control-modern"
                  />
                </div>

                <div class="form-group-modern">
                  <label class="form-label-modern">{{
                    $t('professional.professionalTitle') || 'Título Profissional'
                  }}</label>
                  <input
                    v-model="form.medicalData.professionalTitle"
                    type="text"
                    class="form-control-modern"
                  />
                </div>

                <div class="form-group-modern">
                  <label class="form-label-modern">{{
                    $t('professional.department') || 'Departamento'
                  }}</label>
                  <input
                    v-model="form.medicalData.department"
                    type="text"
                    class="form-control-modern"
                  />
                </div>

                <div class="form-check mb-2">
                  <input
                    v-model="form.medicalData.canSignDocuments"
                    type="checkbox"
                    class="form-check-input"
                    id="canSignDocuments"
                  />
                  <label class="form-check-label" for="canSignDocuments">
                    {{ $t('professional.canSignDocuments') || 'Pode assinar documentos médicos' }}
                  </label>
                </div>
              </div>
            </div>
            <!-- End Form Fields Container -->

            <!-- Botón de crear -->
            <div class="col">
              <button
                class="btn btn-lg btn-size fw-bold btn-dark rounded-pill mt-2 px-4"
                @click="createProfessional"
                :disabled="!form.role || loading"
              >
                <span v-if="loading" class="spinner-border spinner-border-sm me-2"></span>
                <i v-else class="bi bi-person-plus me-2"></i>
                {{ $t('common.create') || 'Crear' }}
              </button>
            </div>

            <!-- Mensajes de error -->
            <div class="row g-1 errors" id="feedback" v-if="errorMessage">
              <div class="alert alert-danger" role="alert">
                <i class="bi bi-exclamation-triangle"></i>
                {{ errorMessage }}
              </div>
            </div>
          </div>
        </div>
        <div class="mx-2 mb-4 text-center">
          <a
            class="nav-link btn btn-sm fw-bold btn-dark text-white rounded-pill p-1 px-4 mt-4"
            @click="$emit('close')"
            >{{ $t('common.close') || 'Fechar' }} <i class="bi bi-check-lg"></i
          ></a>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, computed } from 'vue';
import { createAssociatedProfessional } from '../../application/services/collaborator';
import Spinner from '../common/Spinner.vue';

export default {
  name: 'CreateAssociatedProfessionalModal',
  components: {
    Spinner,
  },
  props: {
    collaborator: { type: Object, required: true },
    services: { type: Array, default: () => [] },
  },
  emits: ['created', 'close'],
  setup(props, { emit }) {
    const loading = ref(false);
    const errorMessage = ref('');
    const errors = ref({});

    const form = ref({
      role: '',
      specialties: '',
      servicesId: [],
      medicalData: {
        crm: '',
        crmState: '',
        professionalTitle: '',
        department: '',
        canSignDocuments: false,
      },
    });

    const isMedicalRole = computed(() =>
      ['DOCTOR', 'SPECIALIST', 'NURSE', 'MEDICAL_ASSISTANT'].includes(form.value.role)
    );

    const validate = () => {
      errors.value = {};

      if (!form.value.role) {
        errors.value.role = 'El rol profesional es obligatorio';
        return false;
      }

      return true;
    };

    const createProfessional = async () => {
      errorMessage.value = '';

      if (!validate()) {
        return;
      }

      try {
        loading.value = true;

        const payload = {
          role: form.value.role,
        };

        // Especialidades (convertir string a array)
        if (form.value.specialties && form.value.specialties.trim()) {
          payload.specialties = form.value.specialties
            .split(',')
            .map(s => s.trim())
            .filter(s => s.length > 0);
        }

        // Servicios
        if (form.value.servicesId.length > 0) {
          payload.servicesId = form.value.servicesId;
        }

        // Solo incluir datos médicos si es rol médico y hay datos
        if (isMedicalRole.value) {
          if (form.value.medicalData.crm) {
            payload.crm = form.value.medicalData.crm;
          }
          if (form.value.medicalData.crmState) {
            payload.crmState = form.value.medicalData.crmState;
          }

          const medicalData = {};
          if (form.value.medicalData.professionalTitle) {
            medicalData.professionalTitle = form.value.medicalData.professionalTitle;
          }
          if (form.value.medicalData.department) {
            medicalData.department = form.value.medicalData.department;
          }

          if (Object.keys(medicalData).length > 0) {
            payload.medicalData = medicalData;
          }

          payload.canSignDocuments = form.value.medicalData.canSignDocuments;
        }

        console.log('Creating associated professional with payload:', payload);
        const result = await createAssociatedProfessional(props.collaborator.id, payload);
        console.log('Professional created successfully:', result);

        emit('created', result);
        emit('close');
      } catch (error) {
        console.error('Error creating professional:', error);
        errorMessage.value =
          error.response?.data?.message ||
          error.message ||
          'Error al crear perfil profesional. Por favor intenta nuevamente.';
      } finally {
        loading.value = false;
      }
    };

    return {
      loading,
      errorMessage,
      errors,
      form,
      isMedicalRole,
      createProfessional,
    };
  },
};
</script>

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

/* Medical Fields */
.medical-fields {
  margin-top: 1.5rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.medical-fields h6 {
  color: #495057;
  font-weight: 600;
}

/* Errors */
.errors {
  font-size: small;
  color: var(--rojo-warning);
}

.btn-close {
  height: 0em !important;
}

.spinner-border-sm {
  width: 1rem;
  height: 1rem;
  border-width: 0.15em;
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
