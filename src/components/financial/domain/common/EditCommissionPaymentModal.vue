<script>
import { ref, computed, onMounted } from 'vue';
import Spinner from '../../../common/Spinner.vue';
import Alert from '../../../common/Alert.vue';
import {
  updateCommissionPayment,
  getUnpaidIncomesByProfessional,
} from '../../../../application/services/professional-commission-payment';
import { getDate } from '../../../../shared/utils/date';

export default {
  name: 'EditCommissionPaymentModal',
  components: { Spinner, Alert },
  props: {
    show: { type: Boolean, default: false },
    payment: { type: Object, required: true },
    commerce: { type: Object, required: true },
  },
  emits: ['close'],
  setup(props, { emit }) {
    const loading = ref(false);
    const alertError = ref('');
    const currentIncomeIds = ref([]);
    const availableIncomes = ref([]);
    const incomeIdsToAdd = ref([]);
    const incomeIdsToRemove = ref([]);
    const notes = ref('');

    const totalToAdd = computed(() => incomeIdsToAdd.value.length);
    const totalToRemove = computed(() => incomeIdsToRemove.value.length);
    const finalTotal = computed(
      () => currentIncomeIds.value.length - totalToRemove.value + totalToAdd.value
    );

    const loadAvailableIncomes = async () => {
      try {
        loading.value = true;
        availableIncomes.value = await getUnpaidIncomesByProfessional(
          props.payment.professionalId,
          props.commerce.id,
          null,
          null
        );
        loading.value = false;
      } catch (error) {
        console.error('Error loading available incomes:', error);
        alertError.value = error.response?.status || 500;
        loading.value = false;
      }
    };

    const saveChanges = async () => {
      try {
        loading.value = true;

        await updateCommissionPayment(
          props.payment.id,
          incomeIdsToAdd.value.length > 0 ? incomeIdsToAdd.value : undefined,
          incomeIdsToRemove.value.length > 0 ? incomeIdsToRemove.value : undefined,
          notes.value || undefined
        );

        loading.value = false;
        emit('close');
      } catch (error) {
        console.error('Error updating payment:', error);
        alertError.value = error.response?.status || 500;
        loading.value = false;
      }
    };

    const formatDate = date => getDate(date);
    const formatCurrency = amount =>
      Number(parseFloat(amount || 0).toFixed(2)).toLocaleString('de-DE');

    onMounted(async () => {
      currentIncomeIds.value = [...props.payment.incomeIds];
      notes.value = props.payment.notes || '';
      await loadAvailableIncomes();
    });

    return {
      loading,
      alertError,
      currentIncomeIds,
      availableIncomes,
      incomeIdsToAdd,
      incomeIdsToRemove,
      notes,
      totalToAdd,
      totalToRemove,
      finalTotal,
      saveChanges,
      formatDate,
      formatCurrency,
    };
  },
};
</script>

<template>
  <div class="modal fade show d-block" tabindex="-1" style="background-color: rgba(0, 0, 0, 0.5)">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="bi bi-pencil"></i> {{ $t('commissionPayments.editPayment') }}
          </h5>
          <button type="button" class="btn-close" @click="$emit('close')"></button>
        </div>

        <div class="modal-body">
          <Spinner :show="loading" />
          <Alert :show="alertError !== ''" :message="alertError" />

          <!-- Incomes Actuales -->
          <div class="mb-4">
            <h6 class="fw-bold">{{ $t('commissionPayments.currentIncomes') }}</h6>
            <div class="table-responsive">
              <table class="table table-sm">
                <thead>
                  <tr>
                    <th>
                      <i class="bi bi-trash text-danger"></i>
                    </th>
                    <th>{{ $t('commissionPayments.incomeId') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="incomeId in currentIncomeIds" :key="incomeId">
                    <td>
                      <input type="checkbox" v-model="incomeIdsToRemove" :value="incomeId" />
                    </td>
                    <td>{{ incomeId }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Incomes Disponibles para Agregar -->
          <div v-if="availableIncomes.length > 0" class="mb-4">
            <h6 class="fw-bold">{{ $t('commissionPayments.availableIncomes') }}</h6>
            <div class="table-responsive">
              <table class="table table-sm table-hover">
                <thead>
                  <tr>
                    <th>
                      <i class="bi bi-plus-circle text-success"></i>
                    </th>
                    <th>{{ $t('commissionPayments.date') }}</th>
                    <th>{{ $t('commissionPayments.type') }}</th>
                    <th>{{ $t('commissionPayments.amount') }}</th>
                    <th>{{ $t('commissionPayments.commission') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="income in availableIncomes" :key="income.id">
                    <td>
                      <input type="checkbox" v-model="incomeIdsToAdd" :value="income.id" />
                    </td>
                    <td>{{ formatDate(income.createdAt) }}</td>
                    <td>
                      <span class="badge bg-info">
                        {{ $t(`incomeTypes.${income.type}`) }}
                      </span>
                    </td>
                    <td>${{ formatCurrency(income.amount) }}</td>
                    <td class="text-success">
                      ${{ formatCurrency(income.professionalCommission) }}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Resumen de Cambios -->
          <div class="alert alert-warning">
            <h6 class="fw-bold">{{ $t('commissionPayments.changesSummary') }}</h6>
            <ul class="mb-0">
              <li v-if="totalToRemove > 0">
                <i class="bi bi-dash-circle text-danger"></i>
                {{ $t('commissionPayments.toRemove') }}: <strong>{{ totalToRemove }}</strong>
              </li>
              <li v-if="totalToAdd > 0">
                <i class="bi bi-plus-circle text-success"></i>
                {{ $t('commissionPayments.toAdd') }}: <strong>{{ totalToAdd }}</strong>
              </li>
              <li>
                <i class="bi bi-info-circle text-primary"></i>
                {{ $t('commissionPayments.finalTotal') }}: <strong>{{ finalTotal }}</strong>
              </li>
            </ul>
          </div>

          <!-- Notas -->
          <div class="mb-3">
            <label class="form-label fw-bold">{{ $t('commissionPayments.notes') }}</label>
            <textarea
              v-model="notes"
              class="form-control"
              rows="3"
              :placeholder="$t('commissionPayments.notesPlaceholder')"
            ></textarea>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="$emit('close')">
            {{ $t('commissionPayments.cancel') }}
          </button>
          <button
            type="button"
            class="btn btn-primary"
            @click="saveChanges"
            :disabled="
              loading || (totalToAdd === 0 && totalToRemove === 0 && notes === payment.notes)
            "
          >
            <i class="bi bi-save"></i> {{ $t('commissionPayments.saveChanges') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
