<script>
import Toggle from '@vueform/toggle';
import Popper from 'vue3-popper';
import SpecificCalendarForm from '../domain/SpecificCalendarForm.vue';

export default {
  name: 'QueueFormServiceInfo',
  components: { Toggle, Popper, SpecificCalendarForm },
  props: {
    modelValue: { type: Object, required: true },
    toggles: { type: Object, default: () => ({}) },
    prefix: { type: String, default: '' },
    isAdd: { type: Boolean, default: false },
    locale: { type: String, default: 'es' },
    dayChecked: { type: Function, required: true },
    checkDay: { type: Function, required: true },
    initializedPersonalizedHours: { type: Function, required: true },
    initializedSpecificCalendar: { type: Function, required: true },
  },
  emits: ['update:modelValue'],
  computed: {
    queue: {
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
  <div v-if="queue.serviceInfo" class="service-info-container">
    <div class="form-group-service row g-2">
      <div class="col-4 text-label">
        {{ $t('businessQueuesAdmin.blockLimit') }}
      </div>
      <div class="col-8">
        <input
          :disabled="isAdd ? false : !toggles['queues.admin.edit']"
          min="1"
          type="number"
          class="form-control"
          v-model="queue.serviceInfo.blockLimit"
          placeholder="100"
        />
      </div>
    </div>

    <div class="form-group-service row g-2">
      <div class="col-4 text-label">
        {{ $t('businessQueuesAdmin.walkin') }}
        <Popper
          :class="'dark p-1'"
          arrow
          :disable-click-away="false"
          :content="$t('businessQueuesAdmin.walkinHelp')"
        >
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </div>
      <div class="col-8">
        <Toggle
          v-model="queue.serviceInfo.walkin"
          :disabled="isAdd ? false : !toggles['queues.admin.edit']"
        />
      </div>
    </div>

    <div class="form-group-service row g-2">
      <div class="col-4 text-label">
        {{ $t('businessQueuesAdmin.sameCommeceHours') }}
        <Popper
          :class="'dark p-1'"
          arrow
          :disable-click-away="false"
          :content="$t('businessQueuesAdmin.sameCommeceHelp')"
        >
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </div>
      <div class="col-8">
        <Toggle
          v-model="queue.serviceInfo.sameCommeceHours"
          :disabled="isAdd ? false : !toggles['queues.admin.edit']"
        />
      </div>
    </div>

    <div class="form-group-service row g-2">
      <div class="col-4 text-label">
        {{ $t('businessQueuesAdmin.attentionHour') }}
      </div>
      <div class="col-3">
        <input
          min="0"
          max="24"
          minlength="1"
          maxlength="2"
          type="number"
          class="form-control"
          v-model="queue.serviceInfo.attentionHourFrom"
          placeholder="Ex. 8"
        />
      </div>
      <div class="col-2 text-center align-self-center">-</div>
      <div class="col-3">
        <input
          min="0"
          max="24"
          minlength="1"
          maxlength="2"
          type="number"
          class="form-control"
          v-model="queue.serviceInfo.attentionHourTo"
          placeholder="Ex. 16"
        />
      </div>
    </div>

    <div class="form-group-service row g-2">
      <div class="col-4 text-label">
        {{ $t('businessQueuesAdmin.break') }}
      </div>
      <div class="col-8">
        <Toggle
          v-model="queue.serviceInfo.break"
          :disabled="isAdd ? false : !toggles['queues.admin.edit']"
        />
      </div>
    </div>

    <div
      v-if="queue.serviceInfo.break"
      class="form-group-service row g-2"
    >
      <div class="col-4 text-label">
        {{ $t('businessQueuesAdmin.breakHour') }}
      </div>
      <div class="col-3">
        <input
          min="0"
          max="24"
          minlength="1"
          maxlength="5"
          type="number"
          class="form-control"
          v-model="queue.serviceInfo.breakHourFrom"
          placeholder="Ex. 8"
        />
      </div>
      <div class="col-2 text-center align-self-center">-</div>
      <div class="col-3">
        <input
          min="0"
          max="24"
          minlength="1"
          maxlength="5"
          type="number"
          class="form-control"
          v-model="queue.serviceInfo.breakHourTo"
          placeholder="Ex. 16"
        />
      </div>
    </div>

    <div class="form-group-service row g-2">
      <div class="col-4 text-label">
        {{ $t('businessQueuesAdmin.attentionDays') }}
      </div>
      <div class="col-8">
        <div class="form-check form-switch text-label">
          <input
            class="form-check-input"
            type="checkbox"
            :id="`${prefix}monday`"
            :checked="dayChecked(queue.serviceInfo, 1)"
            @click="checkDay($event, queue.serviceInfo, 1)"
          />
          <label class="form-check-label" :for="`${prefix}monday`">{{ $t('days.1') }}</label>
        </div>
        <div class="form-check form-switch text-label">
          <input
            class="form-check-input"
            type="checkbox"
            :id="`${prefix}tuesday`"
            :checked="dayChecked(queue.serviceInfo, 2)"
            @click="checkDay($event, queue.serviceInfo, 2)"
          />
          <label class="form-check-label" :for="`${prefix}tuesday`">{{ $t('days.2') }}</label>
        </div>
        <div class="form-check form-switch text-label">
          <input
            class="form-check-input"
            type="checkbox"
            :id="`${prefix}wednesday`"
            :checked="dayChecked(queue.serviceInfo, 3)"
            @click="checkDay($event, queue.serviceInfo, 3)"
          />
          <label class="form-check-label" :for="`${prefix}wednesday`">{{ $t('days.3') }}</label>
        </div>
        <div class="form-check form-switch text-label">
          <input
            class="form-check-input"
            type="checkbox"
            :id="`${prefix}thursday`"
            :checked="dayChecked(queue.serviceInfo, 4)"
            @click="checkDay($event, queue.serviceInfo, 4)"
          />
          <label class="form-check-label" :for="`${prefix}thursday`">{{ $t('days.4') }}</label>
        </div>
        <div class="form-check form-switch text-label">
          <input
            class="form-check-input"
            type="checkbox"
            :id="`${prefix}friday`"
            :checked="dayChecked(queue.serviceInfo, 5)"
            @click="checkDay($event, queue.serviceInfo, 5)"
          />
          <label class="form-check-label" :for="`${prefix}friday`">{{ $t('days.5') }}</label>
        </div>
        <div class="form-check form-switch text-label">
          <input
            class="form-check-input"
            type="checkbox"
            :id="`${prefix}sabado`"
            :checked="dayChecked(queue.serviceInfo, 6)"
            @click="checkDay($event, queue.serviceInfo, 6)"
          />
          <label class="form-check-label" :for="`${prefix}sabado`">{{ $t('days.6') }}</label>
        </div>
        <div class="form-check form-switch text-label">
          <input
            class="form-check-input"
            type="checkbox"
            :id="`${prefix}domingo`"
            :checked="dayChecked(queue.serviceInfo, 7)"
            @click="checkDay($event, queue.serviceInfo, 7)"
          />
          <label class="form-check-label" :for="`${prefix}domingo`">{{ $t('days.7') }}</label>
        </div>
      </div>
    </div>

    <div class="form-group-service row g-1">
      <div class="col-4 text-label">
        {{ $t('businessQueuesAdmin.personalized') }}
        <Popper
          :class="'dark p-1'"
          arrow
          :disable-click-away="false"
          :content="$t('businessQueuesAdmin.personalizedHelp')"
        >
          <i class="bi bi-info-circle-fill h7"></i>
        </Popper>
      </div>
      <div class="col-8">
        <Toggle
          v-model="queue.serviceInfo.personalized"
          :disabled="isAdd ? false : !toggles['queues.admin.edit']"
          @click="initializedPersonalizedHours(queue.serviceInfo)"
        />
      </div>
    </div>

    <div
      v-if="queue.serviceInfo.personalized"
      class="personalized-hours-container"
    >
      <div
        class="form-group-service row g-1"
        v-for="day in queue.serviceInfo.attentionDays"
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
            class="form-control form-control-sm"
            v-model="queue.serviceInfo.personalizedHours[day].attentionHourFrom"
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
            class="form-control form-control-sm"
            v-model="queue.serviceInfo.personalizedHours[day].attentionHourTo"
            placeholder="Ex. 16"
          />
        </div>
      </div>
    </div>

    <div class="form-group-service row g-1">
      <div class="col-4 text-label">
        {{ $t('businessQueuesAdmin.specificCalendar') }}
      </div>
      <div class="col-8">
        <Toggle
          v-model="queue.serviceInfo.specificCalendar"
          :disabled="isAdd ? false : !toggles['queues.admin.edit']"
          @click="initializedSpecificCalendar(queue.serviceInfo)"
        />
      </div>
    </div>

    <!-- Show SpecificCalendarForm when specificCalendar is enabled -->
    <div v-if="queue.serviceInfo.specificCalendar" class="specific-calendar-section">
      <hr class="my-3" />
      <SpecificCalendarForm
        :show="queue.serviceInfo.specificCalendar"
        :locale="locale"
        :structure="queue"
      />
    </div>
  </div>
</template>

<style scoped>
.service-info-container {
  display: flex;
  flex-direction: column;
  gap: 0;
  padding: 0.5rem;
}

.form-group-service {
  margin-bottom: 0.5rem;
}

.row.g-2 {
  --bs-gutter-x: 0.5rem;
  --bs-gutter-y: 0.5rem;
  margin-bottom: 0.5rem;
}

.text-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #495057;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.form-control {
  font-size: 0.875rem;
  padding: 0.5rem 0.75rem;
  border-radius: 0.375rem;
  border: 1px solid #ced4da;
}

.form-control:focus {
  border-color: #80bdff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

.form-check {
  margin-bottom: 0.5rem;
}

.form-check-label {
  font-size: 0.875rem;
  font-weight: 500;
  margin-left: 0.5rem;
}

.personalized-hours-container {
  padding-left: 1rem;
  border-left: 3px solid #e5e7eb;
  margin-top: 0.25rem;
}

.specific-calendar-section {
  margin-top: 0.5rem;
  padding: 0.75rem;
  background-color: #f8f9fa;
  border-radius: 0.5rem;
  border: 1px solid #e5e7eb;
}

.subsection-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
}
</style>
