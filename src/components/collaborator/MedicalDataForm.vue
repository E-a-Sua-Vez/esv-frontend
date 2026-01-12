<template>
  <div class="medical-data-form">
    <!-- Información de Licencia Médica -->
    <div class="form-group-modern mb-4">
      <div class="form-section-header">
        <h6 class="form-section-title">
          <i class="bi bi-patch-check"></i> {{ $t('collaborator.medicalData.license.title') }}
        </h6>
      </div>
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label-modern">
            {{ $t('collaborator.medicalData.license.number') }} *
            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
              <template #content>
                <div>
                  {{
                    $t('collaborator.medicalData.license.numberHelp') ||
                      'Número oficial de la licencia médica registrada en el colegio/CRM. Se usa para validar la identidad profesional.'
                  }}
                </div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            v-model="medicalData.medicalLicense"
            type="text"
            class="form-control-modern"
            :placeholder="$t('collaborator.medicalData.license.numberPlaceholder')"
            required
          />
        </div>
        <div class="col-md-6">
          <label class="form-label-modern">
            {{ $t('collaborator.medicalData.license.state') }}
            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
              <template #content>
                <div>
                  {{
                    $t('collaborator.medicalData.license.stateHelp') ||
                      'Estado o provincia donde fue emitida la licencia (por ejemplo, SP, RJ, etc.).'
                  }}
                </div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            v-model="medicalData.medicalLicenseState"
            type="text"
            class="form-control-modern"
            :placeholder="$t('collaborator.medicalData.license.statePlaceholder')"
          />
        </div>
        <div class="col-md-6">
          <label class="form-label-modern">
            {{ $t('collaborator.medicalData.specialization') }}
            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
              <template #content>
                <div>
                  {{
                    $t('collaborator.medicalData.specializationHelp') ||
                      'Área principal de actuación médica del profesional (por ejemplo, Cardiología, Pediatría).'
                  }}
                </div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            v-model="medicalData.specialization"
            type="text"
            class="form-control-modern"
            :placeholder="$t('collaborator.medicalData.specializationPlaceholder')"
          />
        </div>
        <div class="col-md-6">
          <label class="form-label-modern">
            {{ $t('collaborator.medicalData.subspecialization') }}
            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
              <template #content>
                <div>
                  {{
                    $t('collaborator.medicalData.subspecializationHelp') ||
                      'Sub-área específica dentro de la especialidad principal (por ejemplo, Cardiología Intervencionista). Campo opcional.'
                  }}
                </div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            v-model="medicalData.subspecialization"
            type="text"
            class="form-control-modern"
            :placeholder="$t('collaborator.medicalData.subspecializationPlaceholder')"
          />
        </div>
      </div>
    </div>

    <!-- Formación Académica -->
    <div class="form-group-modern mb-4">
      <div class="form-section-header">
        <h6 class="form-section-title">
          <i class="bi bi-mortarboard"></i> {{ $t('collaborator.medicalData.education.title') }}
        </h6>
      </div>
      <div class="row g-3">
        <div class="col-md-8">
          <label class="form-label-modern">
            {{ $t('collaborator.medicalData.education.school') }}
            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
              <template #content>
                <div>
                  {{
                    $t('collaborator.medicalData.education.schoolHelp') ||
                      'Nombre de la facultad o universidad donde el profesional obtuvo el título de medicina.'
                  }}
                </div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            v-model="medicalData.medicalSchool"
            type="text"
            class="form-control-modern"
            :placeholder="$t('collaborator.medicalData.education.schoolPlaceholder')"
          />
        </div>
        <div class="col-md-4">
          <label class="form-label-modern">
            {{ $t('collaborator.medicalData.education.graduationYear') }}
            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
              <template #content>
                <div>
                  {{
                    $t('collaborator.medicalData.education.graduationYearHelp') ||
                      'Año en que el profesional se graduó en medicina. Se usa para fines de contexto y experiencia.'
                  }}
                </div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            v-model="medicalData.graduationYear"
            type="number"
            class="form-control-modern"
            :placeholder="new Date().getFullYear().toString()"
            min="1950"
            :max="new Date().getFullYear()"
          />
        </div>
      </div>
    </div>

    <!-- Información de Contacto Profesional -->
    <div class="form-group-modern mb-4">
      <div class="form-section-header">
        <h6 class="form-section-title">
          <i class="bi bi-building"></i> {{ $t('collaborator.medicalData.contact.title') }}
        </h6>
      </div>
      <div class="row g-3">
        <div class="col-12">
          <label class="form-label-modern">
            {{ $t('collaborator.medicalData.contact.address') }}
            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
              <template #content>
                <div>
                  {{
                    $t('collaborator.medicalData.contact.addressHelp') ||
                      'Dirección profesional donde atiende el colaborador (consultorio o centro médico principal).'
                  }}
                </div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <textarea
            v-model="medicalData.professionalAddress"
            class="form-control-modern"
            rows="2"
            :placeholder="$t('collaborator.medicalData.contact.addressPlaceholder')"
          ></textarea>
        </div>
        <div class="col-md-6">
          <label class="form-label-modern">
            {{ $t('collaborator.medicalData.contact.phone') }}
            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
              <template #content>
                <div>
                  {{
                    $t('collaborator.medicalData.contact.phoneHelp') ||
                      'Teléfono fijo o principal del consultorio para contacto profesional.'
                  }}
                </div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            v-model="medicalData.professionalPhone"
            type="tel"
            class="form-control-modern"
            :placeholder="$t('collaborator.medicalData.contact.phonePlaceholder')"
          />
        </div>
        <div class="col-md-6">
          <label class="form-label-modern">
            {{ $t('collaborator.medicalData.contact.mobile') }}
            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
              <template #content>
                <div>
                  {{
                    $t('collaborator.medicalData.contact.mobileHelp') ||
                      'Celular profesional del colaborador (por ejemplo, teléfono corporativo o de guardia).'
                  }}
                </div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            v-model="medicalData.professionalMobile"
            type="tel"
            class="form-control-modern"
            :placeholder="$t('collaborator.medicalData.contact.mobilePlaceholder')"
          />
        </div>
        <div class="col-md-6">
          <label class="form-label-modern">
            {{ $t('collaborator.medicalData.contact.email') }}
            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
              <template #content>
                <div>
                  {{
                    $t('collaborator.medicalData.contact.emailHelp') ||
                      'Email de uso profesional donde el colaborador recibe comunicaciones clínicas o administrativas.'
                  }}
                </div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            v-model="medicalData.professionalEmail"
            type="email"
            class="form-control-modern"
            :placeholder="$t('collaborator.medicalData.contact.emailPlaceholder')"
          />
        </div>
        <div class="col-md-6">
          <label class="form-label-modern">
            {{ $t('collaborator.medicalData.contact.emergencyPhone') }}
            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
              <template #content>
                <div>
                  {{
                    $t('collaborator.medicalData.contact.emergencyPhoneHelp') ||
                      'Teléfono de contacto en casos de emergencia relacionados con la práctica profesional.'
                  }}
                </div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            v-model="medicalData.emergencyPhone"
            type="tel"
            class="form-control-modern"
            :placeholder="$t('collaborator.medicalData.contact.emergencyPhonePlaceholder')"
          />
        </div>
      </div>
    </div>

    <!-- Información de Clínica/Hospital -->
    <div class="form-group-modern mb-4">
      <div class="form-section-header">
        <h6 class="form-section-title">
          <i class="bi bi-hospital-fill"></i> {{ $t('collaborator.medicalData.clinic.title') }}
        </h6>
      </div>
      <div class="row g-3">
        <div class="col-md-6">
          <label class="form-label-modern">
            {{ $t('collaborator.medicalData.clinic.name') }}
            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
              <template #content>
                <div>
                  {{
                    $t('collaborator.medicalData.clinic.nameHelp') ||
                      'Nombre comercial de la clínica u hospital principal asociado al colaborador.'
                  }}
                </div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            v-model="medicalData.clinicName"
            type="text"
            class="form-control-modern"
            :placeholder="$t('collaborator.medicalData.clinic.namePlaceholder')"
          />
        </div>
        <div class="col-md-6">
          <label class="form-label-modern">
            {{ $t('collaborator.medicalData.clinic.phone') }}
            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
              <template #content>
                <div>
                  {{
                    $t('collaborator.medicalData.clinic.phoneHelp') ||
                      'Teléfono de contacto de la clínica/hospital donde atiende el colaborador.'
                  }}
                </div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            v-model="medicalData.clinicPhone"
            type="tel"
            class="form-control-modern"
            :placeholder="$t('collaborator.medicalData.clinic.phonePlaceholder')"
          />
        </div>
        <div class="col-12">
          <label class="form-label-modern">
            {{ $t('collaborator.medicalData.clinic.address') }}
            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
              <template #content>
                <div>
                  {{
                    $t('collaborator.medicalData.clinic.addressHelp') ||
                      'Dirección completa de la clínica u hospital donde atiende el colaborador.'
                  }}
                </div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <textarea
            v-model="medicalData.clinicAddress"
            class="form-control-modern"
            rows="2"
            :placeholder="$t('collaborator.medicalData.clinic.addressPlaceholder')"
          ></textarea>
        </div>
      </div>
    </div>

    <!-- Configuraciones Adicionales -->
    <div class="form-group-modern mb-4">
      <div class="form-section-header">
        <h6 class="form-section-title">
          <i class="bi bi-gear"></i> {{ $t('collaborator.medicalData.additional.title') }}
        </h6>
      </div>
      <div class="row g-3">
        <div class="col-12">
          <label class="form-label-modern">
            {{ $t('collaborator.medicalData.additional.workingHours') }}
            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
              <template #content>
                <div>
                  {{
                    $t('collaborator.medicalData.additional.workingHoursHelp') ||
                      'Horario habitual de atención del profesional (por ejemplo, días de la semana y franja horaria).'
                  }}
                </div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            v-model="medicalData.workingHours"
            type="text"
            class="form-control-modern"
            :placeholder="$t('collaborator.medicalData.additional.workingHoursPlaceholder')"
          />
        </div>
        <div class="col-md-6">
          <label class="form-label-modern">{{ $t('collaborator.medicalData.additional.languages') }}</label>
          <input
            v-model="languagesText"
            type="text"
            class="form-control-modern"
            :placeholder="$t('collaborator.medicalData.additional.languagesPlaceholder')"
            @input="updateLanguages"
          />
          <small class="form-text text-muted">{{ $t('collaborator.medicalData.additional.languagesHelp') }}</small>
        </div>
        <div class="col-md-6">
          <label class="form-label-modern">{{ $t('collaborator.medicalData.additional.insurance') }}</label>
          <input
            v-model="insuranceText"
            type="text"
            class="form-control-modern"
            :placeholder="$t('collaborator.medicalData.additional.insurancePlaceholder')"
            @input="updateInsurance"
          />
          <small class="form-text text-muted">{{ $t('collaborator.medicalData.additional.insuranceHelp') }}</small>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import Popper from 'vue3-popper';

const props = defineProps({
  collaboratorId: {
    type: String,
    required: true,
  },
  currentMedicalData: {
    type: Object,
    default: () => ({}),
  },
});

const emit = defineEmits(['change', 'updated']);

// Estado del formulario
const medicalData = ref({
  medicalLicense: '',
  medicalLicenseState: '',
  specialization: '',
  subspecialization: '',
  medicalSchool: '',
  graduationYear: null,
  professionalAddress: '',
  professionalPhone: '',
  professionalMobile: '',
  professionalEmail: '',
  emergencyPhone: '',
  clinicName: '',
  clinicAddress: '',
  clinicPhone: '',
  workingHours: '',
  acceptsInsurance: [],
  languages: [],
});

// Estado de la UI
const error = ref(null);
const success = ref(false);
const languagesText = ref('');
const insuranceText = ref('');

// Computed
const isValid = computed(() => {
  return medicalData.value.medicalLicense && medicalData.value.medicalLicense.length > 0;
});

// Métodos
const updateLanguages = () => {
  medicalData.value.languages = languagesText.value
    .split(',')
    .map(lang => lang.trim())
    .filter(lang => lang.length > 0);
};

const updateInsurance = () => {
  medicalData.value.acceptsInsurance = insuranceText.value
    .split(',')
    .map(ins => ins.trim())
    .filter(ins => ins.length > 0);
};

// Watcher para emitir cambios automáticamente
watch(medicalData, (newValue) => {
  emit('change', { field: 'medicalData', value: newValue });
}, { deep: true });

// Inicialización
onMounted(() => {
  if (props.currentMedicalData) {
    Object.assign(medicalData.value, props.currentMedicalData);
    languagesText.value = (props.currentMedicalData.languages || []).join(', ');
    insuranceText.value = (props.currentMedicalData.acceptsInsurance || []).join(', ');
  }
});
</script>

<style scoped>
/* Usar estilos consistentes con el resto del formulario */
.medical-data-form {
  width: 100%;
}

.form-group-modern {
  margin-bottom: 1rem;
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

.form-section-title i {
  color: rgba(0, 74, 173, 0.7);
  margin-right: 0.5rem;
}

.form-label-modern {
  font-size: 0.8125rem;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.75);
  margin-bottom: 0.25rem;
  display: block;
}

.form-control-modern {
  padding: 0.4rem 0.625rem;
  font-size: 0.8125rem;
  line-height: 1.4;
  color: #212529;
  background-color: #fff;
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 5px;
  transition: all 0.2s ease;
  width: 100%;
}

.form-control-modern:focus {
  border-color: rgba(0, 74, 173, 0.3);
  outline: 0;
  box-shadow: 0 0 0 0.2rem rgba(0, 74, 173, 0.1);
}

.form-text {
  font-size: 0.75rem;
  color: #6c757d;
}

.alert {
  font-size: 0.8125rem;
  padding: 0.5rem 0.75rem;
  border-radius: 5px;
}
</style>