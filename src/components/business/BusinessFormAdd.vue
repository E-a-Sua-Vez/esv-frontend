<template>
  <div class="business-form-add">
    <div class="row">
      <div id="business-name-form-add" class="row">
        <div class="col-4 text-label">
          {{ $t('businessAdmin.name') }}
        </div>
        <div class="col-8">
          <input
            min="1"
            max="50"
            type="text"
            class="form-control"
            :value="modelValue.name"
            @input="updateField('name', $event.target.value)"
            :class="{ 'is-invalid': errors.nameError }"
            placeholder="brilliant-shop-1"
          />
        </div>
      </div>
      <div id="business-keyName-form-add" class="row g-1">
        <div class="col-4 text-label">
          {{ $t('businessAdmin.keyName') }}
          <Popper
            :class="'dark p-1'"
            arrow
            disable-click-away
            :content="$t('businessAdmin.keyNameHelp')"
          >
            <i class="bi bi-info-circle-fill h7"></i>
          </Popper>
        </div>
        <div class="col-8">
          <input
            min="1"
            max="50"
            type="text"
            class="form-control"
            :value="modelValue.keyName"
            @input="updateField('keyName', $event.target.value)"
            :class="{ 'is-invalid': errors.keyNameError }"
            placeholder="brilliant-shop-1"
          />
        </div>
      </div>
      <div id="business-email-form-add" class="row g-1">
        <div class="col-4 text-label">
          {{ $t('businessAdmin.email') }}
        </div>
        <div class="col-8">
          <input
            min="10"
            type="email"
            class="form-control"
            :value="modelValue.email"
            @input="updateField('email', $event.target.value)"
            :class="{ 'is-invalid': errors.emailError }"
            placeholder="name@email.com"
          />
        </div>
      </div>
      <div id="business-category-form-add" class="row g-1">
        <div class="col-4 text-label">
          {{ $t('businessAdmin.category') }}
        </div>
        <div class="col-8">
          <select
            class="btn btn-md btn-light fw-bold text-dark select"
            :value="modelValue.category"
            @change="updateField('category', $event.target.value)"
            :class="{ 'is-invalid': errors.categoryAddError }"
          >
            <option v-for="cat in categories" :key="cat" :value="cat">
              {{ $t(`categories.${cat}`) }}
            </option>
          </select>
        </div>
      </div>

      <!-- Datos de localización -->
      <div class="row g-1">
        <a class="nav-link fw-bold section-toggle-button" data-bs-toggle="collapse" href="#add-location">
          {{ $t('businessAdmin.location') }} <i class="bi bi-chevron-down"></i>
        </a>
      </div>
      <div id="add-location" class="collapse row m-0">
        <div id="business-country-form-add" class="row g-1">
          <div class="col-4 text-label">
            {{ $t('businessAdmin.country') }}
          </div>
          <div class="col-8">
            <input
              min="1"
              max="12"
              type="text"
              class="form-control"
              :value="modelValue.localeInfo?.country"
              @input="updateNestedField('localeInfo', 'country', $event.target.value)"
              :class="{ 'is-invalid': errors.countryAddError }"
              placeholder="Ex. ve, br, cl"
            />
          </div>
        </div>
        <div id="business-language-form-add" class="row g-1">
          <div class="col-4 text-label">
            {{ $t('businessAdmin.language') }}
          </div>
          <div class="col-8">
            <select
              class="btn btn-md btn-light fw-bold text-dark select"
              :value="modelValue.localeInfo?.language || 'pt'"
              @change="updateNestedField('localeInfo', 'language', $event.target.value)"
            >
              <option value="pt">Português</option>
              <option value="es">Español</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>
        <div id="business-timezone-form-add" class="row g-1">
          <div class="col-4 text-label">
            {{ $t('businessAdmin.timezone') }}
          </div>
          <div class="col-8">
            <select
              class="btn btn-md btn-light fw-bold text-dark select"
              :value="modelValue.localeInfo?.timezone || 'America/Sao_Paulo'"
              @change="updateNestedField('localeInfo', 'timezone', $event.target.value)"
            >
              <option value="America/Sao_Paulo">São Paulo (UTC-3)</option>
              <option value="America/Caracas">Caracas (UTC-4)</option>
              <option value="America/Santiago">Santiago (UTC-3/UTC-4)</option>
              <option value="America/Buenos_Aires">Buenos Aires (UTC-3)</option>
              <option value="America/Bogota">Bogotá (UTC-5)</option>
              <option value="America/Lima">Lima (UTC-5)</option>
              <option value="America/Mexico_City">Ciudad de México (UTC-6)</option>
              <option value="America/Montevideo">Montevideo (UTC-3)</option>
            </select>
          </div>
        </div>
        <div id="business-zip-form-add" class="row g-1">
          <div class="col-4 text-label">
            {{ $t('businessAdmin.zip') }}
          </div>
          <div class="col-8">
            <input
              min="1"
              max="20"
              type="text"
              class="form-control"
              :value="modelValue.localeInfo?.zip"
              @input="updateNestedField('localeInfo', 'zip', $event.target.value)"
              @blur="handleZipBlur"
              placeholder="Ex.: 01310-100"
            />
          </div>
        </div>
        <div id="business-address-form-add" class="row g-1">
          <div class="col-4 text-label">
            {{ $t('businessAdmin.address') }}
          </div>
          <div class="col-8">
            <input
              min="1"
              max="80"
              type="text"
              class="form-control"
              :value="modelValue.localeInfo?.address"
              @input="updateNestedField('localeInfo', 'address', $event.target.value)"
              :class="{ 'is-invalid': errors.addressAddError }"
              placeholder="Street 1, Building 56, City, State"
            />
          </div>
        </div>
        <div id="business-addressLat-form-add" class="row g-1">
          <div class="col-4 text-label">
            {{ $t('businessAdmin.addressLat') }}
          </div>
          <div class="col-8">
            <input
              min="1"
              max="10"
              type="number"
              class="form-control"
              :value="modelValue.localeInfo?.addressLat"
              @input="updateNestedField('localeInfo', 'addressLat', $event.target.value)"
              placeholder="Ex.: 10.65656"
            />
          </div>
        </div>
        <div id="business-addressLng-form-add" class="row g-1">
          <div class="col-4 text-label">
            {{ $t('businessAdmin.addressLng') }}
          </div>
          <div class="col-8">
            <input
              min="1"
              max="10"
              type="number"
              class="form-control"
              :value="modelValue.localeInfo?.addressLng"
              @input="updateNestedField('localeInfo', 'addressLng', $event.target.value)"
              placeholder="Ex.: -10.65656"
            />
          </div>
        </div>
      </div>

      <!-- Datos de Contacto -->
      <div class="row g-1">
        <a class="nav-link fw-bold section-toggle-button" data-bs-toggle="collapse" href="#add-contact">
          {{ $t('businessAdmin.contact') }} <i class="bi bi-chevron-down"></i>
        </a>
      </div>
      <div id="add-contact" class="collapse row m-0">
        <div id="business-contact-email-form-add" class="row g-1">
          <div class="col-4 text-label">
            {{ $t('businessAdmin.email') }}
          </div>
          <div class="col-8">
            <input
              min="1"
              max="30"
              type="email"
              class="form-control"
              :value="modelValue.contactInfo?.email"
              @input="updateNestedField('contactInfo', 'email', $event.target.value)"
              placeholder="Ex.: contact@business.com"
            />
          </div>
        </div>
        <div id="business-contact-url-form-add" class="row g-1">
          <div class="col-4 text-label">
            {{ $t('businessAdmin.url') }}
          </div>
          <div class="col-8">
            <input
              min="1"
              max="30"
              type="text"
              class="form-control"
              :value="modelValue.contactInfo?.url"
              @input="updateNestedField('contactInfo', 'url', $event.target.value)"
              placeholder="Ex.: https://www.business.com/"
            />
          </div>
        </div>
        <div id="business-phone-form-add" class="row g-1">
          <div class="col-4 text-label">
            {{ $t('businessAdmin.phone') }}
          </div>
          <div class="col-8">
            <input
              min="10"
              type="tel"
              class="form-control"
              :value="modelValue.contactInfo?.phone"
              @input="updateNestedField('contactInfo', 'phone', $event.target.value)"
              :class="{ 'is-invalid': errors.phoneAddError }"
              placeholder="Cod. Pais + Numero"
            />
          </div>
        </div>
        <div id="business-contact-phone2-form-add" class="row g-1">
          <div class="col-4 text-label">
            {{ $t('businessAdmin.phone2') }}
          </div>
          <div class="col-8">
            <input
              min="9"
              max="12"
              type="tel"
              class="form-control"
              :value="modelValue.contactInfo?.phone2"
              @input="updateNestedField('contactInfo', 'phone2', $event.target.value)"
              placeholder="Ex.: 56233445533"
            />
          </div>
        </div>
        <div id="business-contact-whatsapp-form-add" class="row g-1">
          <div class="col-4 text-label">
            {{ $t('businessAdmin.whatsapp') }}
          </div>
          <div class="col-8">
            <input
              min="9"
              max="12"
              type="tel"
              class="form-control"
              :value="modelValue.contactInfo?.whatsapp"
              @input="updateNestedField('contactInfo', 'whatsapp', $event.target.value)"
              placeholder="Ex.: 56233445533"
            />
          </div>
        </div>
        <div id="business-contact-twitter-form-add" class="row g-1">
          <div class="col-4 text-label">
            {{ $t('businessAdmin.twitter') }}
          </div>
          <div class="col-8">
            <input
              min="5"
              max="20"
              type="text"
              class="form-control"
              :value="modelValue.contactInfo?.twitter"
              @input="updateNestedField('contactInfo', 'twitter', $event.target.value)"
              placeholder="Ex.: tw_business"
            />
          </div>
        </div>
        <div id="business-contact-instagram-form-add" class="row g-1">
          <div class="col-4 text-label">
            {{ $t('businessAdmin.instagram') }}
          </div>
          <div class="col-8">
            <input
              min="5"
              max="20"
              type="text"
              class="form-control"
              :value="modelValue.contactInfo?.instagram"
              @input="updateNestedField('contactInfo', 'instagram', $event.target.value)"
              placeholder="Ex.: ig_business"
            />
          </div>
        </div>
        <div id="business-contact-facebook-form-add" class="row g-1">
          <div class="col-4 text-label">
            {{ $t('businessAdmin.facebook') }}
          </div>
          <div class="col-8">
            <input
              min="5"
              max="20"
              type="text"
              class="form-control"
              :value="modelValue.contactInfo?.facebook"
              @input="updateNestedField('contactInfo', 'facebook', $event.target.value)"
              placeholder="Ex.: fb_business"
            />
          </div>
        </div>
      </div>

      <!-- Datos de Servicio -->
      <div class="row g-1">
        <a class="nav-link fw-bold section-toggle-button" data-bs-toggle="collapse" href="#add-service">
          {{ $t('businessAdmin.service') }} <i class="bi bi-chevron-down"></i>
        </a>
      </div>
      <div id="add-service" class="collapse row m-0">
        <div id="business-serviceUrl-form-add" class="row g-1">
          <div class="col-4 text-label">
            {{ $t('businessAdmin.serviceUrl') }}
          </div>
          <div class="col-8">
            <input
              min="1"
              max="12"
              type="text"
              class="form-control"
              :value="modelValue.serviceInfo?.serviceUrl"
              @input="updateNestedField('serviceInfo', 'serviceUrl', $event.target.value)"
              placeholder="Ex. https://menu.business.com"
            />
          </div>
        </div>
        <div id="business-attentionHour-form-add" class="row g-1">
          <div class="col-4 text-label">
            {{ $t('businessAdmin.attentionHour') }}
          </div>
          <div class="col-3">
            <input
              min="0"
              max="24"
              minlength="1"
              maxlength="2"
              type="number"
              class="form-control"
              :value="modelValue.serviceInfo?.attentionHourFrom"
              @input="updateNestedField('serviceInfo', 'attentionHourFrom', $event.target.value)"
              placeholder="Ex. 8"
            />
          </div>
          <div class="col-2">-</div>
          <div class="col-3">
            <input
              min="0"
              max="24"
              minlength="1"
              maxlength="2"
              type="number"
              class="form-control"
              :value="modelValue.serviceInfo?.attentionHourTo"
              @input="updateNestedField('serviceInfo', 'attentionHourTo', $event.target.value)"
              placeholder="Ex. 16"
            />
          </div>
        </div>
        <div id="add-business-break-active-form" class="row g-1">
          <div class="col-4 text-label">
            {{ $t('businessCommercesAdmin.break') }}
          </div>
          <div class="col-8">
            <Toggle
              v-model="modelValue.serviceInfo.break"
              @update:model-value="updateNestedField('serviceInfo', 'break', $event)"
              :disabled="!toggles['businesses.admin.add']"
            />
          </div>
        </div>
        <div
          id="business-attentionBreak-form-add"
          v-if="modelValue.serviceInfo?.break === true"
          class="row g-1"
        >
          <div class="col-4 text-label">
            {{ $t('businessCommercesAdmin.breakHour') }}
          </div>
          <div class="col-3">
            <input
              min="0"
              max="24"
              minlength="1"
              maxlength="5"
              type="number"
              class="form-control"
              :value="modelValue.serviceInfo?.breakHourFrom"
              @input="updateNestedField('serviceInfo', 'breakHourFrom', $event.target.value)"
              placeholder="Ex. 8"
            />
          </div>
          <div class="col-2">-</div>
          <div class="col-3">
            <input
              min="0"
              max="24"
              minlength="1"
              maxlength="5"
              type="number"
              class="form-control"
              :value="modelValue.serviceInfo?.breakHourTo"
              @input="updateNestedField('serviceInfo', 'breakHourTo', $event.target.value)"
              placeholder="Ex. 16"
            />
          </div>
        </div>
        <div id="business-attentionDays-form-add" class="row g-1">
          <div class="col-4 text-label">
            {{ $t('businessAdmin.attentionDays') }}
          </div>
          <div class="col-8">
            <div class="form-check form-switch" v-for="day in [1, 2, 3, 4, 5, 6, 7]" :key="day">
              <input
                class="form-check-input"
                type="checkbox"
                :id="`day-${day}`"
                :checked="dayChecked(day)"
                @click="checkDay($event, day)"
              />
              <label class="form-check-label" :for="`day-${day}`">
                {{ $t(`days.${day}`) }}
              </label>
            </div>
          </div>
        </div>
        <div id="add-business-personalized-active-form" class="row g-1">
          <div class="col-4 text-label">
            {{ $t('businessCommercesAdmin.personalized') }}
          </div>
          <div class="col-8">
            <Toggle
              :model-value="modelValue.serviceInfo?.personalized"
              @update:model-value="handlePersonalizedToggle"
              :disabled="!toggles['businesses.admin.add']"
            />
          </div>
        </div>
        <div
          id="business-personalized-form-add"
          v-if="modelValue.serviceInfo?.personalized === true"
          class="row g-1"
        >
          <div
            class="row g-1"
            v-for="day in modelValue.serviceInfo?.attentionDays"
            :key="day"
          >
            <div class="col-4 text-label">
              {{ $t(`days.${day}`) }}
            </div>
            <div class="col-3">
              <input
                min="0"
                max="24"
                minlength="1"
                maxlength="2"
                type="number"
                class="form-control"
                :value="modelValue.serviceInfo?.personalizedHours?.[day]?.attentionHourFrom"
                @input="updatePersonalizedHours(day, 'attentionHourFrom', $event.target.value)"
                placeholder="Ex. 8"
              />
            </div>
            <div class="col-2">-</div>
            <div class="col-3">
              <input
                min="0"
                max="24"
                minlength="1"
                maxlength="2"
                type="number"
                class="form-control"
                :value="modelValue.serviceInfo?.personalizedHours?.[day]?.attentionHourTo"
                @input="updatePersonalizedHours(day, 'attentionHourTo', $event.target.value)"
                placeholder="Ex. 16"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { computed, ref } from 'vue';
import Toggle from '@vueform/toggle';
import Popper from 'vue3-popper';
import { getAddressBR } from '../../application/services/address';

export default {
  name: 'BusinessFormAdd',
  components: {
    Toggle,
    Popper,
  },
  props: {
    modelValue: {
      type: Object,
      required: true,
    },
    errors: {
      type: Object,
      default: () => ({}),
    },
    categories: {
      type: Array,
      default: () => [],
    },
    toggles: {
      type: Object,
      default: () => ({}),
    },
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const loadingZip = ref(false);

    const handleZipBlur = async () => {
      const zip = props.modelValue.localeInfo?.zip;
      const country = props.modelValue.localeInfo?.country;

      if (zip && country === 'br') {
        const value = zip.replace(/\D/g, '');
        const validcep = /^[0-9]{8}$/;

        if (validcep.test(value)) {
          try {
            loadingZip.value = true;
            const result = await getAddressBR(zip);

            if (result && !result.erro) {
              const address = `${result.logradouro}, ${result.bairro}, ${result.localidade} ${result.uf}`;
              updateNestedField('localeInfo', 'address', address);
            }
          } catch (error) {
            // Error fetching address from CEP
          } finally {
            loadingZip.value = false;
          }
        }
      }
    };

    const updateField = (field, value) => {
      emit('update:modelValue', {
        ...props.modelValue,
        [field]: value,
      });
    };

    const updateNestedField = (parent, field, value) => {
      const parentObj = props.modelValue[parent] || {};
      emit('update:modelValue', {
        ...props.modelValue,
        [parent]: {
          ...parentObj,
          [field]: value,
        },
      });
    };

    const dayChecked = day => {
      return props.modelValue.serviceInfo?.attentionDays?.includes(day) || false;
    };

    const checkDay = (event, day) => {
      const serviceInfo = props.modelValue.serviceInfo || {};
      let attentionDays = serviceInfo.attentionDays || [];

      if (event.target.checked) {
        if (!attentionDays.includes(day)) {
          attentionDays = [...attentionDays, day].sort((a, b) => a - b);
        }
        // If personalized is enabled, initialize hours for this day
        if (serviceInfo.personalized === true) {
          const personalizedHours = serviceInfo.personalizedHours || {};
          if (!personalizedHours[day]) {
            personalizedHours[day] = {
              attentionHourFrom: serviceInfo.attentionHourFrom || 8,
              attentionHourTo: serviceInfo.attentionHourTo || 16,
            };
            emit('update:modelValue', {
              ...props.modelValue,
              serviceInfo: {
                ...serviceInfo,
                attentionDays,
                personalizedHours,
              },
            });
            return;
          }
        }
      } else {
        attentionDays = attentionDays.filter(d => d !== day);
        // Remove from personalizedHours if exists
        if (serviceInfo.personalizedHours && serviceInfo.personalizedHours[day]) {
          const { [day]: removed, ...rest } = serviceInfo.personalizedHours;
          emit('update:modelValue', {
            ...props.modelValue,
            serviceInfo: {
              ...serviceInfo,
              attentionDays,
              personalizedHours: rest,
            },
          });
          return;
        }
      }

      emit('update:modelValue', {
        ...props.modelValue,
        serviceInfo: {
          ...serviceInfo,
          attentionDays,
        },
      });
    };

    const handlePersonalizedToggle = value => {
      const serviceInfo = props.modelValue.serviceInfo || {};
      let personalizedHours = {};

      if (value === true) {
        // Initialize personalizedHours for all selected days
        const attentionDays = serviceInfo.attentionDays || [];
        if (attentionDays.length > 0) {
          attentionDays.forEach(day => {
            personalizedHours[day] = {
              attentionHourFrom: serviceInfo.attentionHourFrom || 8,
              attentionHourTo: serviceInfo.attentionHourTo || 16,
            };
          });
        }
      }

      emit('update:modelValue', {
        ...props.modelValue,
        serviceInfo: {
          ...serviceInfo,
          personalized: value,
          personalizedHours: value ? personalizedHours : {},
        },
      });
    };

    const updatePersonalizedHours = (day, field, value) => {
      const serviceInfo = props.modelValue.serviceInfo || {};
      const personalizedHours = serviceInfo.personalizedHours || {};
      const dayHours = personalizedHours[day] || {};

      emit('update:modelValue', {
        ...props.modelValue,
        serviceInfo: {
          ...serviceInfo,
          personalizedHours: {
            ...personalizedHours,
            [day]: {
              ...dayHours,
              [field]: value,
            },
          },
        },
      });
    };

    return {
      updateField,
      updateNestedField,
      dayChecked,
      checkDay,
      handlePersonalizedToggle,
      updatePersonalizedHours,
      handleZipBlur,
      loadingZip,
    };
  },
};
</script>

<style scoped>
/* Estilos modernos adaptados */
.business-form-add {
  padding: 0.5rem;
}

.row.g-1 {
  --bs-gutter-x: 0.5rem;
  --bs-gutter-y: 0.5rem;
  margin-bottom: 0.5rem;
}

.text-label {
  font-size: 0.75rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.75);
  text-transform: capitalize;
  letter-spacing: 0.3px;
  display: flex;
  align-items: center;
  padding: 0.5rem 0;
}

.form-control {
  padding: 0.5rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.5;
  color: #212529;
  background-color: #fff;
  border: 1.5px solid rgba(169, 169, 169, 0.3);
  border-radius: 0.375rem;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.form-control:focus {
  outline: 0;
  border-color: rgba(0, 194, 203, 0.6);
  box-shadow: 0 0 0 0.2rem rgba(0, 194, 203, 0.15);
}

.form-control:hover:not(:disabled):not(:focus) {
  border-color: rgba(169, 169, 169, 0.5);
}

.form-control:disabled {
  background-color: rgba(245, 246, 247, 0.9);
  opacity: 0.7;
}

.form-control::placeholder {
  color: rgba(0, 0, 0, 0.4);
  font-weight: 400;
}

.form-control.is-invalid {
  border-color: rgba(220, 53, 69, 0.6);
  box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.15);
}

.select {
  width: 100%;
  padding: 0.5rem 2.5rem 0.5rem 0.75rem;
  font-size: 0.8125rem;
  font-weight: 600;
  line-height: 1.5;
  color: #212529;
  background-color: #fff;
  border: 1.5px solid rgba(169, 169, 169, 0.3);
  border-radius: 0.375rem;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
  appearance: none;
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 0.75rem center;
  background-size: 16px 12px;
}

.select:focus {
  outline: 0;
  border-color: rgba(0, 194, 203, 0.6);
  box-shadow: 0 0 0 0.2rem rgba(0, 194, 203, 0.15);
}

.select.is-invalid {
  border-color: rgba(220, 53, 69, 0.6);
}

.section-toggle-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.875rem;
  margin: 0;
  background: rgba(0, 0, 0, 0.88);
  border: none;
  border-radius: 0.375rem;
  font-size: 0.8125rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.97);
  text-transform: capitalize;
  letter-spacing: 0.4px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.section-toggle-button:hover {
  background: rgba(0, 0, 0, 0.95);
  box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
  transform: translateY(-1px);
}

.section-toggle-button:active {
  transform: translateY(0);
}

.collapse {
  padding: 0.5rem 0;
}

.form-check {
  padding: 0.35rem 0;
  margin-bottom: 0.25rem;
}

.form-check-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.75);
  margin-left: 0.5rem;
}

.form-check-input {
  cursor: pointer;
}

.form-check-input:checked {
  background-color: rgba(0, 194, 203, 0.9);
  border-color: rgba(0, 194, 203, 0.9);
}
</style>
