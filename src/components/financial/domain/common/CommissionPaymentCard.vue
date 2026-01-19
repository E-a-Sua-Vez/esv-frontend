<script>
import { ref, computed } from 'vue';
import { getDate } from '../../../../shared/utils/date';

export default {
  name: 'CommissionPaymentCard',
  props: {
    payment: { type: Object, required: true },
    professionals: { type: Array, default: () => [] },
  },
  emits: ['edit', 'confirm', 'cancel', 'downloadPdf'],
  setup(props, { emit }) {
    const showDetails = ref(false);

    const professional = computed(() => 
      props.professionals.find(p => p.id === props.payment.professionalId)
    );

    const statusColor = computed(() => {
      switch (props.payment.status) {
        case 'CREATED': return 'warning';
        case 'PAID': return 'success';
        case 'CANCELLED': return 'danger';
        default: return 'secondary';
      }
    });

    const formatDate = (date) => {
      return getDate(date);
    };

    const formatCurrency = (amount) => {
      return Number(parseFloat(amount || 0).toFixed(2)).toLocaleString('de-DE');
    };

    const toggleDetails = () => {
      showDetails.value = !showDetails.value;
    };

    return {
      showDetails,
      professional,
      statusColor,
      formatDate,
      formatCurrency,
      toggleDetails,
    };
  },
};
</script>

<template>
  <div class="metric-card">
    <!-- Header -->
    <div class="row align-items-center">
      <div class="col-md-6">
        <h5 class="mb-1">
          <i class="bi bi-person-badge text-primary"></i>
          {{ professional?.name || payment.professionalId }}
        </h5>
        <span class="badge" :class="`bg-${statusColor}`">
          {{ $t(`commissionPayments.status.${payment.status}`) }}
        </span>
      </div>
      <div class="col-md-6 text-end">
        <h3 class="text-success mb-0">
          ${{ formatCurrency(payment.totalCommission) }}
        </h3>
        <small class="text-muted">{{ $t('commissionPayments.totalCommission') }}</small>
      </div>
    </div>

    <!-- Info -->
    <div class="row mt-3">
      <div class="col-md-3">
        <small class="text-muted d-block">{{ $t('commissionPayments.period') }}</small>
        <p class="mb-0">
          {{ formatDate(payment.periodFrom) }}<br/>
          {{ formatDate(payment.periodTo) }}
        </p>
      </div>
      <div class="col-md-3">
        <small class="text-muted d-block">{{ $t('commissionPayments.incomes') }}</small>
        <p class="mb-0 fs-5 fw-bold">{{ payment.totalIncomes }}</p>
      </div>
      <div class="col-md-3">
        <small class="text-muted d-block">{{ $t('commissionPayments.totalAmount') }}</small>
        <p class="mb-0 fw-bold">${{ formatCurrency(payment.totalAmount) }}</p>
      </div>
      <div class="col-md-3">
        <small class="text-muted d-block">{{ $t('commissionPayments.createdAt') }}</small>
        <p class="mb-0">{{ formatDate(payment.createdAt) }}</p>
      </div>
    </div>

    <!-- Notas -->
    <div v-if="payment.notes" class="row mt-2">
      <div class="col-12">
        <div class="alert alert-info mb-0">
          <strong>{{ $t('commissionPayments.notes') }}:</strong> {{ payment.notes }}
        </div>
      </div>
    </div>

    <!-- Info de Pago (si está pagado) -->
    <div v-if="payment.status === 'PAID'" class="row mt-2">
      <div class="col-12">
        <div class="alert alert-success mb-0">
          <div class="row">
            <div class="col-md-4">
              <strong>{{ $t('commissionPayments.paidAt') }}:</strong>
              {{ formatDate(payment.paidAt) }}
            </div>
            <div class="col-md-4">
              <strong>{{ $t('commissionPayments.paymentMethod') }}:</strong>
              {{ $t(`paymentClientMethods.${payment.paymentMethod}`) }}
            </div>
            <div v-if="payment.paymentNotes" class="col-md-4">
              <strong>{{ $t('commissionPayments.paymentNotes') }}:</strong>
              {{ payment.paymentNotes }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Info de Cancelación -->
    <div v-if="payment.status === 'CANCELLED'" class="row mt-2">
      <div class="col-12">
        <div class="alert alert-danger mb-0">
          <div class="row">
            <div class="col-md-6">
              <strong>{{ $t('commissionPayments.cancelledAt') }}:</strong>
              {{ formatDate(payment.cancelledAt) }}
            </div>
            <div class="col-md-6">
              <strong>{{ $t('commissionPayments.cancellationReason') }}:</strong>
              {{ payment.cancellationReason }}
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Acciones -->
    <div class="row mt-3">
      <div class="col-12">
        <div class="btn-group" role="group">
          <button 
            @click="toggleDetails"
            class="btn btn-sm btn-outline-primary"
          >
            <i class="bi" :class="showDetails ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
            {{ showDetails ? $t('commissionPayments.hideDetails') : $t('commissionPayments.showDetails') }}
          </button>
          
          <button 
            v-if="payment.status === 'CREATED'"
            @click="$emit('edit', payment)"
            class="btn btn-sm btn-outline-warning"
          >
            <i class="bi bi-pencil"></i> {{ $t('commissionPayments.editPayment') }}
          </button>
          
          <button 
            v-if="payment.status === 'CREATED'"
            @click="$emit('confirm', payment)"
            class="btn btn-sm btn-success"
          >
            <i class="bi bi-check-circle"></i> {{ $t('commissionPayments.confirmPayment') }}
          </button>
          
          <button 
            v-if="payment.status === 'CREATED'"
            @click="$emit('cancel', payment)"
            class="btn btn-sm btn-outline-danger"
          >
            <i class="bi bi-x-circle"></i> {{ $t('commissionPayments.cancelPayment') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Detalles Expandibles -->
    <div v-if="showDetails" class="row mt-3">
      <div class="col-12">
        <div class="card">
          <div class="card-header bg-light">
            <h6 class="mb-0">
              <i class="bi bi-list-ul"></i> {{ $t('commissionPayments.includedIncomes') }}
            </h6>
          </div>
          <div class="card-body">
            <p class="text-muted">
              {{ $t('commissionPayments.incomeIdsCount', { count: payment.incomeIds.length }) }}
            </p>
            <div class="income-ids-container">
              <span 
                v-for="(incomeId, index) in payment.incomeIds" 
                :key="incomeId"
                class="badge bg-secondary me-1 mb-1"
              >
                {{ index + 1 }}. {{ incomeId.substring(0, 8) }}...
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.metric-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  transition: box-shadow 0.3s ease;
}

.metric-card:hover {
  box-shadow: 0 4px 8px rgba(0,0,0,0.15);
}

.income-ids-container {
  max-height: 200px;
  overflow-y: auto;
}

.btn-group {
  flex-wrap: wrap;
  gap: 5px;
}

.btn-group .btn {
  margin-bottom: 5px;
}
</style>
