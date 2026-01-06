<script>
import Toggle from '@vueform/toggle';
import SpecificCalendarForm from '../domain/SpecificCalendarForm.vue';

export default {
  name: 'CommerceFormService',
  components: { Toggle, SpecificCalendarForm },
  props: {
    modelValue: { type: Object, required: true },
    toggles: { type: Object, default: () => ({}) },
    locale: { type: String, default: 'es' },
    prefix: { type: String, default: '' },
    isAdd: { type: Boolean, default: false },
    onInitializedSpecificCalendar: { type: Function, default: null },
    onInitializedPersonalizedHours: { type: Function, default: null },
  },
  emits: ['update:modelValue'],
  computed: {
    serviceInfo: {
      get() {
        return this.modelValue.serviceInfo || {};
      },
      set(value) {
        this.$emit('update:modelValue', {
          ...this.modelValue,
          serviceInfo: value,
        });
      },
    },
    telemedicineRecordingEnabled: {
      get() {
        return this.modelValue.telemedicineRecordingEnabled || false;
      },
      set(value) {
        this.$emit('update:modelValue', {
          ...this.modelValue,
          telemedicineRecordingEnabled: value,
        });
      },
    },
  },
  methods: {
    handleSpecificCalendarClick() {
      if (this.onInitializedSpecificCalendar) {
        this.onInitializedSpecificCalendar(this.serviceInfo);
      }
    },
    handlePersonalizedClick() {
      if (this.onInitializedPersonalizedHours) {
        this.onInitializedPersonalizedHours(this.serviceInfo);
      }
    },
    dayChecked(day) {
      if (this.serviceInfo && this.serviceInfo.attentionDays) {
        return this.serviceInfo.attentionDays.includes(day);
      }
      return false;
    },
    checkDay(event, day) {
      if (this.serviceInfo) {
        if (!this.serviceInfo.attentionDays) {
          this.serviceInfo.attentionDays = [];
        }
        if (event.target.checked) {
          if (!this.serviceInfo.attentionDays.includes(day)) {
            this.serviceInfo.attentionDays.push(day);
          }
        } else {
          this.serviceInfo.attentionDays = this.serviceInfo.attentionDays.filter(el => el !== day);
        }
        this.serviceInfo.attentionDays.sort();
        if (this.serviceInfo.personalized === true && this.serviceInfo.personalizedHours) {
          this.serviceInfo.personalizedHours[day] = {
            attentionHourFrom: this.serviceInfo.attentionHourFrom,
            attentionHourTo: this.serviceInfo.attentionHourTo,
          };
        }
      }
    },
  },
};
</script>

<template>
  <div>
    <button
      class="section-toggle-button"
      type="button"
      data-bs-toggle="collapse"
      :aria-expanded="false"
      :aria-controls="`${prefix}service`"
      :data-bs-target="`#${prefix}service`"
    >
      <span class="section-toggle-text">{{ $t('businessCommercesAdmin.service') }}</span>
      <i class="bi bi-chevron-down section-toggle-icon"></i>
    </button>
    <div :id="`${prefix}service`" class="collapse">
      <div class="form-fields-container">
        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('businessCommercesAdmin.serviceUrl') }}
          </label>
          <input
            :id="`${prefix}commerce-serviceUrl-form`"
            :disabled="isAdd ? false : !toggles['commerces.admin.edit']"
            min="1"
            max="12"
            type="text"
            class="form-control-modern"
            v-model="serviceInfo.serviceUrl"
            placeholder="Ex. https://menu.commerce.com"
          />
        </div>
        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('businessCommercesAdmin.confirmNotificationDaysBefore') }}
          </label>
          <input
            :id="`${prefix}commerce-confirmNotificationDaysBefore-form`"
            min="1"
            max="8"
            type="text"
            class="form-control-modern"
            :disabled="isAdd ? false : !toggles['commerces.admin.edit']"
            v-model="serviceInfo.confirmNotificationDaysBefore"
            placeholder="5"
          />
        </div>
        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('businessCommercesAdmin.surveyPostAttentionDaysAfter') }}
          </label>
          <input
            :id="`${prefix}commerce-surveyPostAttentionDaysAfter-form`"
            min="1"
            max="8"
            type="text"
            class="form-control-modern"
            :disabled="isAdd ? false : !toggles['commerces.admin.edit']"
            v-model="serviceInfo.surveyPostAttentionDaysAfter"
            placeholder="5"
          />
        </div>
        <div class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('businessCommercesAdmin.attentionHour') }}
          </label>
          <div style="display: flex; gap: 0.5rem; align-items: center">
            <input
              :id="`${prefix}commerce-attentionHourFrom-form`"
              :disabled="isAdd ? false : !toggles['commerces.admin.edit']"
              min="0"
              max="24"
              minlength="1"
              maxlength="2"
              type="number"
              class="form-control-modern"
              style="flex: 1"
              v-model="serviceInfo.attentionHourFrom"
              placeholder="Ex. 8"
            />
            <span>-</span>
            <input
              :id="`${prefix}commerce-attentionHourTo-form`"
              :disabled="isAdd ? false : !toggles['commerces.admin.edit']"
              min="0"
              max="24"
              minlength="1"
              maxlength="2"
              type="number"
              class="form-control-modern"
              style="flex: 1"
              v-model="serviceInfo.attentionHourTo"
              placeholder="Ex. 16"
            />
          </div>
        </div>
        <div class="form-group-modern form-group-toggle">
          <label class="form-label-modern">
            {{ $t('businessCommercesAdmin.break') }}
          </label>
          <Toggle
            v-model="serviceInfo.break"
            :disabled="isAdd ? false : !toggles['commerces.admin.edit']"
          />
        </div>
        <div v-if="serviceInfo.break" class="form-group-modern">
          <label class="form-label-modern">
            {{ $t('businessCommercesAdmin.breakHour') }}
          </label>
          <div style="display: flex; gap: 0.5rem; align-items: center">
            <input
              :id="`${prefix}commerce-breakHourFrom-form`"
              :disabled="isAdd ? false : !toggles['commerces.admin.edit']"
              min="0"
              max="24"
              minlength="1"
              maxlength="5"
              type="number"
              class="form-control-modern"
              style="flex: 1"
              v-model="serviceInfo.breakHourFrom"
              placeholder="Ex. 12"
            />
            <span>-</span>
            <input
              :id="`${prefix}commerce-breakHourTo-form`"
              :disabled="isAdd ? false : !toggles['commerces.admin.edit']"
              min="0"
              max="24"
              minlength="1"
              maxlength="5"
              type="number"
              class="form-control-modern"
              style="flex: 1"
              v-model="serviceInfo.breakHourTo"
              placeholder="Ex. 14"
            />
          </div>
        </div>
        <div
          class="form-group-modern"
          style="flex-direction: column; align-items: flex-start; gap: 0.5rem"
        >
          <label class="form-label-modern">
            {{ $t('businessCommercesAdmin.attentionDays') }}
          </label>
          <div
            class="form-fields-container days-container"
            style="padding: 0.375rem; gap: 0.75rem; flex-direction: row; flex-wrap: wrap; align-items: center"
          >
            <div
              v-for="day in [1, 2, 3, 4, 5, 6, 7]"
              :key="day"
              class="day-toggle-container"
            >
              <label class="form-check-label day-label">{{ $t(`days.${day}`) }}</label>
              <input
                type="checkbox"
                :id="`${prefix}day-${day}`"
                :checked="dayChecked(day)"
                :disabled="isAdd ? false : !toggles['commerces.admin.edit']"
                @click="checkDay($event, day)"
                class="toggle-checkbox"
              />
            </div>
          </div>
        </div>
        <div class="form-group-modern form-group-toggle">
          <label class="form-label-modern">
            {{ $t('businessCommercesAdmin.personalized') }}
          </label>
          <Toggle
            v-model="serviceInfo.personalized"
            :disabled="isAdd ? false : !toggles['commerces.admin.edit']"
            @click="handlePersonalizedClick"
          />
        </div>
        <div v-if="serviceInfo.personalized && serviceInfo.attentionDays" class="form-group-modern">
          <div
            class="form-fields-container"
            style="padding: 0.375rem; gap: 0.5rem; flex-direction: column"
          >
            <div v-for="day in serviceInfo.attentionDays" :key="day" class="form-group-modern">
              <label class="form-label-modern">
                {{ $t(`days.${day}`) }}
              </label>
              <div style="display: flex; gap: 0.5rem; align-items: center; flex: 1">
                <input
                  :id="`${prefix}personalized-hour-from-${day}`"
                  :disabled="isAdd ? false : !toggles['commerces.admin.edit']"
                  min="0"
                  max="24"
                  minlength="1"
                  maxlength="2"
                  type="number"
                  class="form-control-modern"
                  style="flex: 1"
                  v-model="serviceInfo.personalizedHours[day].attentionHourFrom"
                  placeholder="Ex. 8"
                />
                <span>-</span>
                <input
                  :id="`${prefix}personalized-hour-to-${day}`"
                  :disabled="isAdd ? false : !toggles['commerces.admin.edit']"
                  min="0"
                  max="24"
                  minlength="1"
                  maxlength="2"
                  type="number"
                  class="form-control-modern"
                  style="flex: 1"
                  v-model="serviceInfo.personalizedHours[day].attentionHourTo"
                  placeholder="Ex. 16"
                />
              </div>
            </div>
          </div>
        </div>
        <div class="form-group-modern form-group-toggle">
          <label class="form-label-modern">
            {{ $t('businessCommercesAdmin.specificCalendar') }}
          </label>
          <Toggle
            v-model="serviceInfo.specificCalendar"
            :disabled="isAdd ? false : !toggles['commerces.admin.edit']"
            @click="handleSpecificCalendarClick"
          />
        </div>
        <div v-if="serviceInfo.specificCalendar" class="form-group-modern">
          <SpecificCalendarForm
            :show="serviceInfo.specificCalendar"
            :locale="locale"
            :structure="modelValue"
          />
        </div>
        <!-- Telemedicine Recording Configuration -->
        <div class="form-group-modern form-group-toggle">
          <label class="form-label-modern">
            {{ $t('businessCommercesAdmin.telemedicineRecordingEnabled') }}
          </label>
          <Toggle
            v-model="telemedicineRecordingEnabled"
            :disabled="isAdd ? false : !toggles['commerces.admin.edit']"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Modern Form Styles - Compact */
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
  gap: 0.5rem;
}

.form-group-toggle {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}

.form-label-modern {
  font-size: 0.7rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.7);
  text-transform: capitalize;
  letter-spacing: 0.5px;
  margin-bottom: 0;
  min-width: 120px;
  flex-shrink: 0;
}

.form-control-modern {
  flex: 1;
  padding: 0.4rem 0.625rem;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.4;
  color: #000000;
  background-color: rgba(255, 255, 255, 0.95);
  border: 1.5px solid rgba(169, 169, 169, 0.25);
  border-radius: 5px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.form-control-modern:focus {
  outline: none;
  border-color: rgba(0, 194, 203, 0.5);
  box-shadow: 0 0 0 2px rgba(0, 194, 203, 0.1);
  background-color: rgba(255, 255, 255, 1);
}

.form-control-modern:hover:not(:disabled) {
  border-color: rgba(169, 169, 169, 0.4);
  background-color: rgba(255, 255, 255, 1);
}

.form-control-modern:disabled {
  background-color: rgba(245, 246, 247, 0.8);
  color: rgba(0, 0, 0, 0.5);
  cursor: not-allowed;
  opacity: 0.7;
}

.form-control-modern::placeholder {
  color: rgba(0, 0, 0, 0.4);
  font-weight: 400;
}

/* Modern Section Toggle Button - Compact with Black Background */
.section-toggle-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.35rem 0.625rem;
  margin-bottom: 0.375rem;
  background: rgba(0, 0, 0, 0.85);
  border: none;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.95);
  text-transform: capitalize;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.section-toggle-button:hover {
  background: rgba(0, 0, 0, 0.95);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
}

.section-toggle-button:focus {
  outline: none;
  box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.3);
}

.section-toggle-button[aria-expanded='true'] {
  background: rgba(0, 0, 0, 0.85);
}

.section-toggle-button[aria-expanded='true']:hover {
  background: rgba(0, 0, 0, 0.95);
}

.section-toggle-text {
  flex: 1;
  text-align: left;
}

.section-toggle-icon {
  font-size: 0.75rem;
  transition: transform 0.2s ease;
  flex-shrink: 0;
  margin-left: 0.5rem;
}

.section-toggle-button[aria-expanded='true'] .section-toggle-icon {
  transform: rotate(180deg);
}

/* Days container alignment */
.days-container {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
}

.day-toggle-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: auto;
}

.day-label {
  font-size: 0.75rem;
  font-weight: 600;
  margin: 0;
  text-transform: capitalize;
  min-width: 30px;
}

/* Toggle-styled checkbox */
.toggle-checkbox {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  width: 40px;
  height: 20px;
  background-color: #ddd;
  border-radius: 10px;
  position: relative;
  cursor: pointer;
  transition: background-color 0.3s ease;
  border: none;
  outline: none;
}

.toggle-checkbox:checked {
  background-color: #00c2cb;
}

.toggle-checkbox::before {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background-color: white;
  border-radius: 50%;
  transition: transform 0.3s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.toggle-checkbox:checked::before {
  transform: translateX(20px);
}

.toggle-checkbox:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
