<script>
import Toggle from '@vueform/toggle';
import Popper from 'vue3-popper';
import ProfessionalProfilePhotoUpload from './ProfessionalProfilePhotoUpload.vue';
import { getDigitalSignatureUrl } from '../../application/services/professional';
import { onMounted, ref } from 'vue';

export default {
  name: 'ProfessionalFormEdit',
  components: { Toggle, Popper, ProfessionalProfilePhotoUpload },
  props: {
    professional: { type: Object, required: true },
    commerceId: { type: String, required: true },
    types: { type: Array, default: () => [] },
    modules: { type: Array, default: () => [] },
    services: { type: Array, default: () => [] },
    toggles: { type: Object, default: () => ({}) },
    errors: { type: Object, default: () => ({}) },
    onSelectService: { type: Function, default: null },
    onDeleteService: { type: Function, default: null },
    showService: { type: Function, default: null },
  },
  emits: ['update:professional'],
  setup(props, { emit }) {
    const signatureFileInputRef = ref(null);

    // Load signature URL on mount
    onMounted(async () => {
      if (props.professional?.id && props.professional?.personalInfo?.digitalSignature) {
        try {
          const response = await getDigitalSignatureUrl(props.professional.id);
          if (response?.signatureUrl) {
            const updated = { ...props.professional };
            if (!updated.personalInfo) updated.personalInfo = {};
            updated.personalInfo.digitalSignature = response.signatureUrl;
            emit('update:professional', updated);
          }
        } catch (e) {
          console.error('Error loading signature URL:', e);
        }
      }
    });

    return {
      signatureFileInputRef,
    };
  },
  computed: {
    localProfessional: {
      get() {
        // Crear una copia profunda para mantener reactividad
        const prof = JSON.parse(JSON.stringify(this.professional));

        // Asegurar que medicalData siempre existe (temporalmente para debug)
        if (!prof.medicalData || typeof prof.medicalData !== 'object') {
          prof.medicalData = {
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
            acceptsEmergencies: false,
            homeVisits: false,
            telemedicine: false,
            canSignDocuments: false,
            languages: [],
            insuranceProviders: []
          };
        }
        return prof;
      },
      set(value) {
        // Asegurar que medicalData siempre existe cuando se actualiza (temporalmente para debug)
        if (!value.medicalData || typeof value.medicalData !== 'object') {
          value.medicalData = {
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
            acceptsEmergencies: false,
            homeVisits: false,
            telemedicine: false,
            canSignDocuments: false,
            languages: [],
            insuranceProviders: []
          };
        }
        this.$emit('update:professional', value);
      },
    },
    professionalTypeName() {
      const type = this.types.find(
        t => t.id === this.professional.professionalInfo?.professionalType,
      );
      return type ? type.name : '';
    },
    isMedicalProfessional() {
      const medicalTypes = [
        'DOCTOR',
        'SPECIALIST',
        'NURSE',
        'MEDICAL_ASSISTANT',
        'THERAPIST',
        'DENTIST',
        'PHYSIOTHERAPIST',
        'PSYCHOLOGIST',
        'NUTRITIONIST',
        'PHARMACIST',
        'TECHNICIAN',
      ];
      const professionalType = this.professional.professionalInfo?.professionalType;
      const isMedical = medicalTypes.includes(professionalType);

      return isMedical;
    },
  },
  methods: {
    updatePersonalInfo(field, value) {
      const updated = { ...this.professional };
      if (!updated.personalInfo) updated.personalInfo = {};
      updated.personalInfo[field] = value;
      this.$emit('update:professional', updated);
    },
    updateProfessionalInfo(field, value) {
      const updated = { ...this.professional };
      if (!updated.professionalInfo) updated.professionalInfo = {};
      updated.professionalInfo[field] = value;
      this.$emit('update:professional', updated);
    },
    updateFinancialInfo(field, value) {
      const updated = { ...this.professional };
      if (!updated.financialInfo) updated.financialInfo = {};
      updated.financialInfo[field] = value;
      this.$emit('update:professional', updated);
    },
    updateMedicalData(field, value) {
      const updated = { ...this.professional };

      // Asegurar que medicalData existe
      if (!updated.medicalData || typeof updated.medicalData !== 'object') {
        updated.medicalData = {};
      }

      // Deep clone medicalData to ensure reactivity
      updated.medicalData = { ...updated.medicalData };
      updated.medicalData[field] = value;


      this.$emit('update:professional', updated);
    },
    handlePhotoUpdated(partial) {
      // Acepta payloads del componente de foto que envían un objeto parcial
      const updated = { ...this.professional };

      // Si viene con estructura profilePhoto.file, extraer y guardar en personalInfo
      if (partial.profilePhoto && partial.profilePhoto.file instanceof File) {
        if (!updated.personalInfo) updated.personalInfo = {};
        updated.personalInfo.profilePhoto = partial.profilePhoto.file;
      } else if (partial.profilePhoto) {
        // Si es una URL string, guardar también en personalInfo
        if (!updated.personalInfo) updated.personalInfo = {};
        updated.personalInfo.profilePhoto = partial.profilePhoto;
      }

      this.$emit('update:professional', updated);
    },
    triggerSignatureFileSelect() {
      if (this.$refs.signatureFileInputRef) {
        this.$refs.signatureFileInputRef.click();
      }
    },
    handleSignatureUpload(event) {
      const file = event.target.files[0];
      if (!file) return;

      // Validate file type
      const supportedFormats = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!supportedFormats.includes(file.type)) {
        alert(this.$t('collaborator.profilePhoto.invalidFormat') || 'Formato no válido');
        return;
      }

      // Validate file size
      const maxFileSize = 10 * 1024 * 1024; // 10MB for signatures
      if (file.size > maxFileSize) {
        alert(this.$t('collaborator.profilePhoto.fileTooLarge') || 'Archivo muy grande');
        return;
      }

      // Create preview URL for display
      const reader = new FileReader();
      reader.onload = e => {
        const updated = { ...this.professional };
        // Store the File object in personalInfo so updateProfessional can detect and upload it
        if (!updated.personalInfo) updated.personalInfo = {};
        updated.personalInfo.digitalSignature = file;
        // Also store preview URL for immediate display
        updated.digitalSignaturePreview = e.target.result;
        this.$emit('update:professional', updated);
      };

      reader.onerror = () => {
        alert(this.$t('collaborator.profilePhoto.uploadError') || 'Error al leer el archivo');
      };

      reader.readAsDataURL(file);
    },
    updatePaymentAccount(value) {
      const updated = { ...this.professional };
      if (!updated.financialInfo) updated.financialInfo = {};

      // Si paymentAccount no existe o es string, crear/actualizar como objeto
      if (
        !updated.financialInfo.paymentAccount ||
        typeof updated.financialInfo.paymentAccount === 'string'
      ) {
        updated.financialInfo.paymentAccount = {
          accountNumber: value,
          bank: '',
          accountType: '',
          pixKey: '',
          holder: '',
        };
      } else {
        // Si ya es objeto, solo actualizar accountNumber
        updated.financialInfo.paymentAccount.accountNumber = value;
      }

      this.$emit('update:professional', updated);
    },
  },
  watch: {
    // Removido el watcher de professional.medicalData que causaba loops infinitos
    // El binding correcto con localProfessional elimina la necesidad de este watcher
  },
};
</script>

<template>
  <div class="professional-form-edit">
    <!-- Form content starts here -->
    <div class="form-fields-container">
      <!-- Información Personal -->
      <div class="form-group-modern">
        <label class="form-label-modern">
          {{ $t('professionals.name') }}:
          <Popper :class="'dark p-1'" arrow :disable-click-away="false">
            <template #content>
              <div>{{ $t('professionals.nameHelp') }}</div>
            </template>
            <i class="bi bi-info-circle-fill h7"></i>
          </Popper>
        </label>
        <input
          type="text"
          class="form-control-modern"
          :class="{ 'is-invalid': errors.nameError }"
          :value="professional.personalInfo?.name"
          @input="updatePersonalInfo('name', $event.target.value)"
          :placeholder="$t('professionals.namePlaceholder')"
        />
      </div>

      <div class="form-group-modern">
        <label class="form-label-modern">
          {{ $t('professionals.email') }}:
          <Popper :class="'dark p-1'" arrow :disable-click-away="false">
            <template #content>
              <div>{{ $t('professionals.emailHelp') }}</div>
            </template>
            <i class="bi bi-info-circle-fill h7"></i>
          </Popper>
        </label>
        <input
          type="email"
          class="form-control-modern"
          :class="{ 'is-invalid': errors.emailError }"
          :value="professional.personalInfo?.email"
          @input="updatePersonalInfo('email', $event.target.value)"
          :placeholder="$t('professionals.emailPlaceholder')"
        />
      </div>

      <div class="form-group-modern">
        <label class="form-label-modern">
          {{ $t('professionals.idNumber') }} ({{ $t('optional') }}):
          <Popper :class="'dark p-1'" arrow :disable-click-away="false">
            <template #content>
              <div>{{ $t('professionals.idNumberHelp') }}</div>
            </template>
            <i class="bi bi-info-circle-fill h7"></i>
          </Popper>
        </label>
        <input
          type="text"
          class="form-control-modern"
          :value="professional.personalInfo?.idNumber"
          @input="updatePersonalInfo('idNumber', $event.target.value)"
          :placeholder="$t('professionals.idNumberPlaceholder')"
        />
      </div>

      <div class="form-group-modern">
        <label class="form-label-modern">
          {{ $t('professionals.type') }}:
          <Popper :class="'dark p-1'" arrow :disable-click-away="false">
            <template #content>
              <div>{{ $t('professionals.typeHelp') }}</div>
            </template>
            <i class="bi bi-info-circle-fill h7"></i>
          </Popper>
        </label>
        <select
          class="form-control-modern form-select-modern"
          :class="{ 'is-invalid': errors.typeError }"
          :value="professional.professionalInfo?.professionalType"
          @change="updateProfessionalInfo('professionalType', $event.target.value)"
        >
          <option value="">{{ $t('professionals.selectType') }}</option>
          <option v-for="type in types" :key="type.id" :value="type.id">
            {{ type.name }}
          </option>
        </select>
      </div>

      <div class="form-group-modern">
        <label class="form-label-modern">
          {{ $t('professionals.phone') }} ({{ $t('optional') }}):
          <Popper :class="'dark p-1'" arrow :disable-click-away="false">
            <template #content>
              <div>{{ $t('professionals.phoneHelp') }}</div>
            </template>
            <i class="bi bi-info-circle-fill h7"></i>
          </Popper>
        </label>
        <input
          type="tel"
          class="form-control-modern"
          :value="professional.personalInfo?.phone"
          @input="updatePersonalInfo('phone', $event.target.value)"
          :placeholder="$t('professionals.phonePlaceholder')"
        />
      </div>

      <div class="form-group-modern">
        <label class="form-label-modern">
          {{ $t('professionals.license') }} ({{ $t('optional') }}):
          <Popper :class="'dark p-1'" arrow :disable-click-away="false">
            <template #content>
              <div>{{ $t('professionals.licenseHelp') }}</div>
            </template>
            <i class="bi bi-info-circle-fill h7"></i>
          </Popper>
        </label>
        <input
          type="text"
          class="form-control-modern"
          :value="professional.professionalInfo?.license"
          @input="updateProfessionalInfo('license', $event.target.value)"
          :placeholder="$t('professionals.licensePlaceholder')"
        />
      </div>
    </div>

    <div class="form-fields-container">
      <!-- Servicios -->
      <div class="form-group-modern">
        <label class="form-label-modern">
          {{ $t('professionals.services') }}:
          <Popper :class="'dark p-1'" arrow :disable-click-away="false">
            <template #content>
              <div>{{ $t('professionals.servicesHelp') }}</div>
            </template>
            <i class="bi bi-info-circle-fill h7"></i>
          </Popper>
        </label>
        <div style="flex: 1; display: flex; flex-direction: column; gap: 0.5rem">
          <select
            v-if="services && services.length > 0"
            class="form-control-modern form-select-modern"
            @change="
              onSelectService &&
                onSelectService(
                  professional,
                  services.find(s => s.id === $event.target.value)
                );
              $event.target.value = '';
            "
          >
            <option value="">{{ $t('professionals.selectService') }}</option>
            <option v-for="service in services" :key="service.id" :value="service.id">
              {{ service.tag }}
            </option>
          </select>
          <div
            v-if="
              professional.professionalInfo?.servicesId &&
              professional.professionalInfo.servicesId.length > 0
            "
            class="selected-items-modern"
          >
            <span
              v-for="serviceId in professional.professionalInfo.servicesId"
              :key="serviceId"
              class="badge-modern"
            >
              {{ showService ? showService(serviceId) : serviceId }}
              <i
                class="bi bi-x-circle-fill"
                style="cursor: pointer; margin-left: 0.25rem"
                @click="onDeleteService && onDeleteService(professional, serviceId)"
              ></i>
            </span>
          </div>
        </div>
      </div>

      <!-- Información Financiera -->
      <div class="form-group-modern">
        <label class="form-label-modern">
          {{ $t('professionals.commissionType') }} ({{ $t('optional') }}):
          <Popper :class="'dark p-1'" arrow :disable-click-away="false">
            <template #content>
              <div>{{ $t('professionals.commissionTypeHelp') }}</div>
            </template>
            <i class="bi bi-info-circle-fill h7"></i>
          </Popper>
        </label>
        <select
          class="form-control-modern form-select-modern"
          :value="professional.financialInfo?.commissionType"
          @change="updateFinancialInfo('commissionType', $event.target.value)"
        >
          <option value="">{{ $t('professionals.selectCommissionType') }}</option>
          <option value="PERCENTAGE">{{ $t('professionals.percentage') }}</option>
          <option value="FIXED">{{ $t('professionals.fixed') }}</option>
        </select>
      </div>

      <div class="form-group-modern">
        <label class="form-label-modern">
          {{ $t('professionals.commissionValue') }} ({{ $t('optional') }}):
          <Popper :class="'dark p-1'" arrow :disable-click-away="false">
            <template #content>
              <div>{{ $t('professionals.commissionValueHelp') }}</div>
            </template>
            <i class="bi bi-info-circle-fill h7"></i>
          </Popper>
        </label>
        <input
          type="number"
          step="0.01"
          class="form-control-modern"
          :value="professional.financialInfo?.commissionValue"
          @input="updateFinancialInfo('commissionValue', parseFloat($event.target.value))"
          :placeholder="$t('professionals.commissionValuePlaceholder')"
        />
      </div>

      <div class="form-group-modern">
        <label class="form-label-modern">
          {{ $t('professionals.paymentAccount') }} ({{ $t('optional') }}):
          <Popper :class="'dark p-1'" arrow :disable-click-away="false">
            <template #content>
              <div>{{ $t('professionals.paymentAccountHelp') }}</div>
            </template>
            <i class="bi bi-info-circle-fill h7"></i>
          </Popper>
        </label>
        <input
          type="text"
          class="form-control-modern"
          :value="
            typeof professional.financialInfo?.paymentAccount === 'string'
              ? professional.financialInfo.paymentAccount
              : professional.financialInfo?.paymentAccount?.accountNumber
          "
          @input="updatePaymentAccount($event.target.value)"
          :placeholder="$t('professionals.paymentAccountPlaceholder')"
        />
      </div>

      <div class="form-group-modern form-group-toggle">
        <label class="form-label-modern">
          {{ $t('professionals.active') }}:
          <Popper :class="'dark p-1'" arrow :disable-click-away="false">
            <template #content>
              <div>{{ $t('professionals.activeHelp') }}</div>
            </template>
            <i class="bi bi-info-circle-fill h7"></i>
          </Popper>
        </label>
        <Toggle v-model="localProfessional.active" on-label=" " off-label=" " />
      </div>

      <div class="form-group-modern form-group-toggle">
        <label class="form-label-modern">
          {{ $t('professionals.available') }}:
          <Popper :class="'dark p-1'" arrow :disable-click-away="false">
            <template #content>
              <div>{{ $t('professionals.availableHelp') }}</div>
            </template>
            <i class="bi bi-info-circle-fill h7"></i>
          </Popper>
        </label>
        <Toggle v-model="localProfessional.available" on-label=" " off-label=" " />
      </div>
    </div>

    <!-- Dados Médicos -->
    <!-- Sección: Datos Médicos (temporalmente siempre visible para debug) -->
    <div class="form-fields-container">
      <!-- Sección: Información Profesional Médica -->
      <div class="form-section-group">
        <h6 class="form-section-title mb-3">
          <i class="bi bi-file-text me-2"></i>
          {{ $t('professionals.medicalProfessionalInfo') || 'Información Profesional Médica' }}
        </h6>

        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('professionals.medicalLicense') || 'Permiso/Colegiatura Médica' }} ({{
              $t('required')
            }}):
            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
              <template #content>
                <div>{{ $t('professionals.medicalLicenseHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            type="text"
            class="form-control-modern"
            :value="localProfessional.medicalData?.medicalLicense"
            @input="updateMedicalData('medicalLicense', $event.target.value)"
            :placeholder="$t('professionals.medicalLicensePlaceholder')"
          />
        </div>

        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('professionals.medicalLicenseState') || 'Estado del Permiso' }} ({{
              $t('optional')
            }}):
            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
              <template #content>
                <div>{{ $t('professionals.medicalLicenseStateHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            type="text"
            class="form-control-modern"
            :value="localProfessional.medicalData?.medicalLicenseState"
            @input="updateMedicalData('medicalLicenseState', $event.target.value)"
            :placeholder="$t('professionals.medicalLicenseStatePlaceholder')"
          />
        </div>

        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('professionals.specialization') || 'Especialización' }} ({{ $t('optional') }}):
            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
              <template #content>
                <div>{{ $t('professionals.specializationHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            type="text"
            class="form-control-modern"
            :value="localProfessional.medicalData?.specialization"
            @input="updateMedicalData('specialization', $event.target.value)"
            :placeholder="$t('professionals.specializationPlaceholder')"
          />
        </div>

        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('professionals.subspecialization') || 'Sub-especialización' }} ({{
              $t('optional')
            }}):
            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
              <template #content>
                <div>{{ $t('professionals.subspecializationHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            type="text"
            class="form-control-modern"
            :value="localProfessional.medicalData?.subspecialization"
            @input="updateMedicalData('subspecialization', $event.target.value)"
            :placeholder="$t('professionals.subspecializationPlaceholder')"
          />
        </div>

        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('professionals.medicalSchool') || 'Universidad de Medicina' }} ({{
              $t('optional')
            }}):
            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
              <template #content>
                <div>{{ $t('professionals.medicalSchoolHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            type="text"
            class="form-control-modern"
            :value="localProfessional.medicalData?.medicalSchool"
            @input="updateMedicalData('medicalSchool', $event.target.value)"
            :placeholder="$t('professionals.medicalSchoolPlaceholder')"
          />
        </div>

        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('professionals.graduationYear') || 'Año de Graduación' }} ({{ $t('optional') }}):
            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
              <template #content>
                <div>{{ $t('professionals.graduationYearHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            type="number"
            class="form-control-modern"
            :value="localProfessional.medicalData?.graduationYear"
            @input="
              updateMedicalData(
                'graduationYear',
                $event.target.value ? parseInt($event.target.value) : null
              )
            "
            :placeholder="$t('professionals.graduationYearPlaceholder')"
          />
        </div>
      </div>

      <!-- Sección: Datos de Contacto Profesional -->
      <div class="form-section-group">
        <h6 class="form-section-title mb-3">
          <i class="bi bi-telephone me-2"></i>
          {{ $t('professionals.professionalContact') || 'Datos de Contacto Profesional' }}
        </h6>

        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('professionals.professionalAddress') || 'Dirección Profesional' }} ({{
              $t('required')
            }}):
            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
              <template #content>
                <div>{{ $t('professionals.professionalAddressHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            type="text"
            class="form-control-modern"
            :value="localProfessional.medicalData?.professionalAddress"
            @input="updateMedicalData('professionalAddress', $event.target.value)"
            :placeholder="$t('professionals.professionalAddressPlaceholder')"
          />
        </div>

        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('professionals.professionalPhone') || 'Teléfono Profesional' }} ({{
              $t('required')
            }}):
            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
              <template #content>
                <div>{{ $t('professionals.professionalPhoneHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            type="tel"
            class="form-control-modern"
            :value="localProfessional.medicalData?.professionalPhone"
            @input="updateMedicalData('professionalPhone', $event.target.value)"
            :placeholder="$t('professionals.professionalPhonePlaceholder')"
          />
        </div>

        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('professionals.professionalMobile') || 'Móvil Profesional' }} ({{
              $t('optional')
            }}):
            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
              <template #content>
                <div>{{ $t('professionals.professionalMobileHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            type="tel"
            class="form-control-modern"
            :value="localProfessional.medicalData?.professionalMobile"
            @input="updateMedicalData('professionalMobile', $event.target.value)"
            :placeholder="$t('professionals.professionalMobilePlaceholder')"
          />
        </div>

        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('professionals.professionalEmail') || 'Email Profesional' }} ({{
              $t('optional')
            }}):
            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
              <template #content>
                <div>{{ $t('professionals.professionalEmailHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            type="email"
            class="form-control-modern"
            :value="localProfessional.medicalData?.professionalEmail"
            @input="updateMedicalData('professionalEmail', $event.target.value)"
            :placeholder="$t('professionals.professionalEmailPlaceholder')"
          />
        </div>

        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('professionals.emergencyPhone') || 'Teléfono de Emergencias' }} ({{
              $t('optional')
            }}):
            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
              <template #content>
                <div>{{ $t('professionals.emergencyPhoneHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            type="tel"
            class="form-control-modern"
            :value="localProfessional.medicalData?.emergencyPhone"
            @input="updateMedicalData('emergencyPhone', $event.target.value)"
            :placeholder="$t('professionals.emergencyPhonePlaceholder')"
          />
        </div>
      </div>

      <!-- Sección: Configuraciones de Práctica -->
      <div class="form-section-group">
        <h6 class="form-section-title mb-3">
          <i class="bi bi-gear me-2"></i>
          {{ $t('professionals.practiceConfig') || 'Configuraciones de Práctica' }}
        </h6>

        <div class="form-group-modern form-group-toggle">
          <label class="form-label-modern">
            {{ $t('professionals.acceptsEmergencies') || 'Acepta Emergencias' }}:
            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
              <template #content>
                <div>{{ $t('professionals.acceptsEmergenciesHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <Toggle
            :model-value="localProfessional.medicalData?.acceptsEmergencies || false"
            @update:model-value="updateMedicalData('acceptsEmergencies', $event)"
            on-label=" "
            off-label=" "
          />
        </div>

        <div class="form-group-modern form-group-toggle">
          <label class="form-label-modern">
            {{ $t('professionals.homeVisits') || 'Realiza Visitas Domiciliarias' }}:
            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
              <template #content>
                <div>{{ $t('professionals.homeVisitsHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <Toggle
            :model-value="localProfessional.medicalData?.homeVisits || false"
            @update:model-value="updateMedicalData('homeVisits', $event)"
            on-label=" "
            off-label=" "
          />
        </div>

        <div class="form-group-modern form-group-toggle">
          <label class="form-label-modern">
            {{ $t('professionals.telemedicine') || 'Ofrece Telemedicina' }}:
            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
              <template #content>
                <div>{{ $t('professionals.telemedicineHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <Toggle
            :model-value="localProfessional.medicalData?.telemedicine || false"
            @update:model-value="updateMedicalData('telemedicine', $event)"
            on-label=" "
            off-label=" "
          />
        </div>

        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('professionals.languages') || 'Idiomas' }} ({{ $t('optional') }}):
            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
              <template #content>
                <div>{{ $t('professionals.languagesHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            type="text"
            class="form-control-modern"
            :value="localProfessional.medicalData?.languages?.join(', ')"
            @input="
              updateMedicalData(
                'languages',
                $event.target.value ? $event.target.value.split(',').map(l => l.trim()) : []
              )
            "
            :placeholder="$t('professionals.languagesPlaceholder')"
          />
        </div>

        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('professionals.insuranceProviders') || 'Planes de Salud Aceptados' }} ({{
              $t('optional')
            }}):
            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
              <template #content>
                <div>{{ $t('professionals.insuranceProvidersHelp') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <input
            type="text"
            class="form-control-modern"
            :value="localProfessional.medicalData?.insuranceProviders?.join(', ')"
            @input="
              updateMedicalData(
                'insuranceProviders',
                $event.target.value ? $event.target.value.split(',').map(p => p.trim()) : []
              )
            "
            :placeholder="$t('professionals.insuranceProvidersPlaceholder')"
          />
        </div>
      </div>

      <!-- Sección: Configuraciones de Documentos -->
      <div class="form-section-group">
        <h6 class="form-section-title mb-3">
          <i class="bi bi-file-earmark-pdf me-2"></i>
          {{ $t('professionals.documentConfig') || 'Configuraciones de Documentos' }}
        </h6>

        <div class="form-group-modern form-group-toggle">
          <label class="form-label-modern">
            {{ $t('collaborator.professional.canSignDocuments') || 'Puede Firmar Documentos' }}:
            <Popper :class="'dark p-1'" arrow :disable-click-away="false">
              <template #content>
                <div>{{ $t('collaborator.professional.canSignDocuments') }}</div>
              </template>
              <i class="bi bi-info-circle-fill h7"></i>
            </Popper>
          </label>
          <Toggle
            :model-value="localProfessional.medicalData?.canSignDocuments || false"
            @update:model-value="updateMedicalData('canSignDocuments', $event)"
            on-label=" "
            off-label=" "
          />
        </div>
      </div>
    </div>

    <!-- Foto de Perfil -->
    <div class="mt-3">
      <ProfessionalProfilePhotoUpload
        :professional-id="professional.id"
        :commerce-id="commerceId"
        :existing-photo="professional.personalInfo?.profilePhoto"
        @updated="handlePhotoUpdated"
        @photo-captured="handlePhotoUpdated"
        @photo-uploaded="handlePhotoUpdated"
      />
    </div>

    <!-- Firma Digital -->
    <div v-if="professional.id" class="mt-3 pb-3">
      <div class="form-section">
        <h6 class="form-section-title mb-3">
          <i class="bi bi-pen me-2"></i>
          {{ $t('professionals.digitalSignature') || 'Firma Digital' }}
        </h6>
        <div class="d-flex align-items-center gap-3">
          <!-- Signature Preview -->
          <div class="signature-preview">
            <img
              v-if="
                localProfessional.digitalSignaturePreview ||
                (localProfessional.personalInfo?.digitalSignature &&
                  typeof localProfessional.personalInfo.digitalSignature === 'string')
              "
              :src="
                localProfessional.digitalSignaturePreview ||
                localProfessional.personalInfo?.digitalSignature
              "
              :alt="$t('professionals.digitalSignature')"
              class="signature-preview-img"
            />
            <div v-else class="signature-placeholder">
              <i class="bi bi-pen"></i>
            </div>
          </div>

          <!-- Upload Controls -->
          <div class="d-flex flex-column gap-2">
            <button
              type="button"
              class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3"
              @click="triggerSignatureFileSelect"
            >
              <i class="bi bi-upload me-1"></i>
              <span>{{
                localProfessional.digitalSignaturePreview ||
                typeof localProfessional.personalInfo?.digitalSignature === 'string'
                  ? $t('collaborator.profilePhoto.update')
                  : $t('collaborator.profilePhoto.upload')
              }}</span>
            </button>
            <small class="text-muted">{{ $t('collaborator.profilePhoto.fileFormats') }}</small>
          </div>
        </div>
      </div>
    </div>

    <!-- Hidden file input for signature -->
    <input
      ref="signatureFileInputRef"
      type="file"
      accept=".jpg,.jpeg,.png,.webp,.pdf"
      style="display: none"
      @change="handleSignatureUpload"
    />

    <!-- ID -->
    <div v-if="professional && professional.id" class="form-section mt-3">
      <div class="row -2 mb-g3 mt-2">
        <div class="row professional-details-container justify-content-center">
          <div class="col text-center">
            <span><strong>Id:</strong> {{ professional.id }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.professional-form-edit {
  width: 100%;
  padding: 1rem;
}

.professional-details-container {
  font-size: 0.8rem;
  margin-left: 0.5rem;
  margin-right: 0.5rem;
  margin-top: 0.5rem;
  margin-bottom: 0;
  justify-content: center;
  width: 100%;
}

.form-fields-container {
  display: flex;
  flex-direction: column;
  gap: 0.875rem;
  margin-bottom: 1rem;
}

.form-group-modern {
  display: flex;
  align-items: flex-start;
  gap: 0.625rem;
}

.form-label-modern {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.375rem;
  min-width: 10rem;
  font-weight: 600;
  font-size: 0.75rem;
  color: #1f2937;
  padding-top: 0.375rem;
}

.form-label-modern i {
  font-size: 0.875rem;
  color: #6b7280;
  cursor: help;
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

.form-select-modern {
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.625rem center;
  background-size: 1rem;
  padding-right: 2.5rem;
  appearance: none;
}

.form-group-toggle {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.selected-items-modern {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.5rem;
}

.badge-modern {
  display: inline-flex;
  align-items: center;
  padding: 0.35rem 0.625rem;
  background: linear-gradient(135deg, #004aad 0%, #004aad 100%);
  color: white;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  transition: all 0.2s ease;
}

.badge-modern:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(0, 74, 173, 0.3);
}

.badge-modern i {
  margin-left: 0.25rem;
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 0.2s ease;
}

.badge-modern i:hover {
  opacity: 1;
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

/* Form Section Styles */
.form-section {
  border-top: 1px solid #e3e6f0;
  padding-top: 1rem;
  margin-top: 1rem;
}

.form-section-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: #1f2937;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
}

/* Signature Styles */
.signature-preview {
  width: 120px;
  height: 80px;
  border-radius: 6px;
  overflow: hidden;
  border: 2px solid #e3e6f0;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background-color: #f8f9fa;
}

.signature-preview-img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 0.5rem;
}

.signature-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #adb5bd;
  font-size: 1.75rem;
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
