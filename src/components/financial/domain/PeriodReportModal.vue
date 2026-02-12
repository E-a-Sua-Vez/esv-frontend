<template>
  <div
    v-if="show"
    class="modal fade show"
    tabindex="-1"
    style="display: block; z-index: 1055;"
  >
    <div class="modal-backdrop fade show" style="z-index: 1054;"></div>
    <div class="modal-dialog modal-xl" style="z-index: 1056;">
      <div class="modal-content">
        <div class="modal-header border-0 active-name modern-modal-header">
          <div class="modern-modal-header-inner">
            <div class="modern-modal-icon-wrapper">
              <i class="bi bi-file-earmark-text"></i>
            </div>
            <div class="modern-modal-title-wrapper">
              <h5 class="modal-title fw-bold modern-modal-title">
                {{ $t('financial.periods.report.title') }}
              </h5>
              <p v-if="period" class="modern-modal-subtitle">
                {{ period.name }} - {{ formatDate(period.startDate) }} {{ $t('financial.periods.report.until') }} {{ formatDate(period.endDate) }}
              </p>
            </div>
          </div>
          <button
            type="button"
            class="modern-modal-close-btn"
            @click="$emit('close')"
            aria-label="Close"
          >
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="modal-body">
          <div v-if="loading" class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">{{ $t('financial.periods.report.loading') }}</span>
            </div>
            <p class="mt-3 text-muted">{{ $t('financial.periods.report.loadingReport') }}</p>
          </div>

          <div v-else>
            <!-- Period Status Badge -->
            <div class="mb-4">
              <span
                class="badge"
                :class="{
                  'bg-success': period.status === 'OPEN',
                  'bg-warning': period.status === 'CLOSED',
                  'bg-secondary': period.status === 'LOCKED'
                }"
              >
                <i
                  class="bi me-1"
                  :class="{
                    'bi-unlock': period.status === 'OPEN',
                    'bi-lock': period.status === 'CLOSED',
                    'bi-shield-lock': period.status === 'LOCKED'
                  }"
                ></i>
                {{ $t(`financial.periods.report.status.${period.status.toLowerCase()}`) }}
              </span>
            </div>

            <!-- Financial Summary Cards -->
            <div class="row g-3 mb-4">
              <div class="col-md-3">
                <div class="summary-card success">
                  <div class="summary-icon">
                    <i class="bi bi-arrow-down-circle"></i>
                  </div>
                  <div class="summary-content">
                    <div class="summary-label">{{ $t('financial.periods.totals.incomes') }}</div>
                    <div class="summary-value">{{ formatCurrency(summary.totalIncomes) }}</div>
                    <div class="summary-count">{{ summary.incomesCount }} {{ $t('financial.periods.report.transactions') }}</div>
                  </div>
                </div>
              </div>
              <div class="col-md-3">
                <div class="summary-card danger">
                  <div class="summary-icon">
                    <i class="bi bi-arrow-up-circle"></i>
                  </div>
                  <div class="summary-content">
                    <div class="summary-label">{{ $t('financial.periods.totals.outcomes') }}</div>
                    <div class="summary-value">{{ formatCurrency(summary.totalOutcomes) }}</div>
                    <div class="summary-count">{{ summary.outcomesCount }} {{ $t('financial.periods.report.transactions') }}</div>
                  </div>
                </div>
              </div>
              <div class="col-md-2">
                <div class="summary-card info">
                  <div class="summary-icon">
                    <i class="bi bi-percent"></i>
                  </div>
                  <div class="summary-content">
                    <div class="summary-label">{{ $t('financial.periods.totals.commissions') }}</div>
                    <div class="summary-value">{{ formatCurrency(summary.totalCommissions) }}</div>
                  </div>
                </div>
              </div>
              <div v-if="summary.totalRefunds > 0" class="col-md-2">
                <div class="summary-card warning">
                  <div class="summary-icon">
                    <i class="bi bi-arrow-counterclockwise"></i>
                  </div>
                  <div class="summary-content">
                    <div class="summary-label">{{ $t('financial.periods.totals.refunds') }}</div>
                    <div class="summary-value">{{ formatCurrency(summary.totalRefunds) }}</div>
                  </div>
                </div>
              </div>
              <div class="col-md-2">
                <div class="summary-card primary">
                  <div class="summary-icon">
                    <i class="bi bi-currency-dollar"></i>
                  </div>
                  <div class="summary-content">
                    <div class="summary-label">{{ $t('financial.periods.totals.netAmount') }}</div>
                    <div class="summary-value fw-bold">{{ formatCurrency(summary.netAmount) }}</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Period Notes -->
            <div v-if="period.notes" class="notes-section mb-4">
              <h6 class="notes-title">
                <i class="bi bi-journal-text me-2"></i>
                {{ $t('financial.periods.report.notes') }}
              </h6>
              <p class="notes-content">{{ period.notes }}</p>
            </div>

            <!-- Reconciliation Data (if period is closed) -->
            <div v-if="period.reconciliationData && period.status !== 'OPEN'" class="reconciliation-section mb-4">
              <h6 class="reconciliation-title">
                <i class="bi bi-bank me-2"></i>
                {{ $t('financial.periods.report.bankReconciliation') }}
              </h6>
              <div class="row g-3">
                <div class="col-md-4">
                  <div class="reconciliation-item">
                    <label>{{ $t('financial.periods.report.bankBalance') }}</label>
                    <div class="value">{{ formatCurrency(period.reconciliationData.bankBalance) }}</div>
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="reconciliation-item">
                    <label>{{ $t('financial.periods.report.systemBalance') }}</label>
                    <div class="value">{{ formatCurrency(period.reconciliationData.systemBalance) }}</div>
                  </div>
                </div>
                <div class="col-md-4">
                  <div class="reconciliation-item">
                    <label>{{ $t('financial.periods.report.difference') }}</label>
                    <div class="value" :class="{ 'text-danger': period.reconciliationData.difference !== 0 }">
                      {{ formatCurrency(period.reconciliationData.difference) }}
                    </div>
                  </div>
                </div>
              </div>
              <div v-if="period.reconciliationData.notes" class="reconciliation-notes mt-3">
                <label>Observações da Conciliação</label>
                <p>{{ period.reconciliationData.notes }}</p>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="action-buttons mt-4">
              <button class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4" @click="exportPDF">
                <i class="bi bi-file-pdf me-1"></i>
                Exportar PDF
              </button>
              <button class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4 ms-2" @click="exportExcel">
                <i class="bi bi-file-excel me-1"></i>
                Exportar Excel
              </button>
            </div>
          </div>
        </div>

        <div class="modal-footer border-0">
          <button
            type="button"
            class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-4"
            @click="$emit('close')"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch } from 'vue';
import { getPeriodSummary, getPeriodTransactions } from '../../../application/services/accountingPeriod';
import { lazyLoadJsPDF } from '../../../shared/utils/lazyLoad';

export default {
  name: 'PeriodReportModal',
  props: {
    show: { type: Boolean, default: false },
    period: { type: Object, required: true },
  },
  emits: ['close'],
  setup(props) {
    const loading = ref(false);
    const summary = ref({
      totalIncomes: 0,
      totalOutcomes: 0,
      totalCommissions: 0,
      totalRefunds: 0,
      netAmount: 0,
      incomesCount: 0,
      outcomesCount: 0,
    });

    const transactions = ref({
      incomes: [],
      outcomes: [],
    });

    const loadSummary = async () => {
      if (!props.period?.id) return;

      loading.value = true;
      try {
        const data = await getPeriodSummary(props.period.id);
        summary.value = data;

        // Cargar transacciones
        const txData = await getPeriodTransactions(props.period.id);
        transactions.value = txData;
      } catch (error) {
        console.error('Error loading period summary:', error);
      } finally {
        loading.value = false;
      }
    };

    watch(() => props.show, (newVal) => {
      if (newVal) {
        loadSummary();
      }
    }, { immediate: true });

    const formatDate = (date) => {
      if (!date) return '';
      // Parsear la fecha como fecha local sin conversión de timezone
      const d = new Date(date);
      // Si la fecha viene de Firestore (Timestamp) o ya es Date, usar directamente
      if (date.toDate) {
        return date.toDate().toLocaleDateString('pt-BR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }
      // Si es string ISO, extraer año/mes/día directamente para evitar conversión UTC
      if (typeof date === 'string' && date.includes('-')) {
        const [year, month, day] = date.split('T')[0].split('-');
        const localDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return localDate.toLocaleDateString('pt-BR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      }
      return d.toLocaleDateString('pt-BR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    const formatCurrency = (amount) => {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(amount || 0);
    };

    const formatCurrencyValue = (amount) => {
      return (amount || 0).toFixed(2);
    };

    const exportPDF = async () => {
      try {
        const jsPDF = await lazyLoadJsPDF();
        const doc = new jsPDF();

        // Header with logo
        // Logo Hub (usando logo horizontal transparente)
        const logoUrl = '/images/hub/logo/hub-color-transparente.png';
        try {
          const img = new Image();
          img.src = logoUrl;
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve; // Continue even if logo fails
          });
          if (img.complete && img.width > 0) {
            doc.addImage(img, 'PNG', 160, 10, 30, 10);
          }
        } catch (e) {
          console.warn('Could not load logo:', e);
        }

        doc.setFontSize(18);
        doc.setFont(undefined, 'bold');
        doc.text('Relatório do Período Contábil', 14, 20);

        doc.setFontSize(12);
        doc.setFont(undefined, 'normal');
        doc.text(props.period.name, 14, 28);
        doc.setFontSize(10);
        doc.text(`${formatDate(props.period.startDate)} até ${formatDate(props.period.endDate)}`, 14, 34);

        // Status
        const statusText = props.period.status === 'OPEN' ? 'Aberto' :
                          props.period.status === 'CLOSED' ? 'Fechado' : 'Bloqueado';
        doc.text(`Status: ${statusText}`, 14, 40);

        // Line separator
        doc.setDrawColor(200);
        doc.line(14, 44, 196, 44);

        // Financial Summary
        doc.setFontSize(14);
        doc.setFont(undefined, 'bold');
        doc.text('Resumo Financeiro', 14, 52);

        doc.setFontSize(11);
        doc.setFont(undefined, 'normal');
        let yPos = 60;

        doc.text(`Receitas:`, 14, yPos);
        doc.setFont(undefined, 'bold');
        doc.text(formatCurrency(summary.value.totalIncomes), 80, yPos);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        doc.text(`(${summary.value.incomesCount} transações)`, 120, yPos);
        doc.setFontSize(11);
        yPos += 8;

        doc.text(`Despesas:`, 14, yPos);
        doc.setFont(undefined, 'bold');
        doc.text(formatCurrency(summary.value.totalOutcomes), 80, yPos);
        doc.setFont(undefined, 'normal');
        doc.setFontSize(9);
        doc.text(`(${summary.value.outcomesCount} transações)`, 120, yPos);
        doc.setFontSize(11);
        yPos += 8;

        doc.text(`Comissões:`, 14, yPos);
        doc.setFont(undefined, 'bold');
        doc.text(formatCurrency(summary.value.totalCommissions), 80, yPos);
        doc.setFont(undefined, 'normal');
        yPos += 8;

        doc.text(`Reembolsos:`, 14, yPos);
        doc.setFont(undefined, 'bold');
        doc.text(formatCurrency(summary.value.totalRefunds), 80, yPos);
        doc.setFont(undefined, 'normal');
        yPos += 10;

        // Line
        doc.setDrawColor(200);
        doc.line(14, yPos, 196, yPos);
        yPos += 8;

        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`Valor Líquido:`, 14, yPos);
        doc.setFontSize(14);
        doc.text(formatCurrency(summary.value.netAmount), 80, yPos);
        yPos += 12;

        // Transactions Section - Incomes
        if (transactions.value.incomes.length > 0) {
          if (yPos > 220) {
            doc.addPage();
            yPos = 20;
          }

          doc.setDrawColor(200);
          doc.line(14, yPos, 196, yPos);
          yPos += 8;

          doc.setFontSize(14);
          doc.setFont(undefined, 'bold');
          doc.text('Receitas Detalhadas', 14, yPos);
          yPos += 8;

          doc.setFontSize(8);
          doc.setFont(undefined, 'bold');
          doc.text('Data', 14, yPos);
          doc.text('Cliente', 38, yPos);
          doc.text('Profissional', 85, yPos);
          doc.text('Valor', 140, yPos);
          doc.text('Comissão', 166, yPos);
          yPos += 4;
          doc.setDrawColor(150);
          doc.line(14, yPos, 196, yPos);
          yPos += 4;

          doc.setFont(undefined, 'normal');
          transactions.value.incomes.forEach((income) => {
            if (yPos > 270) {
              doc.addPage();
              yPos = 20;
            }

            const date = new Date(income.paidAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            const clientName = (income.clientName || 'N/A').substring(0, 20);
            const professionalName = (income.professionalName || 'N/A').substring(0, 20);
            const amount = formatCurrencyValue(income.amount);
            const commission = formatCurrencyValue(income.professionalCommission);

            doc.text(date, 14, yPos);
            doc.text(clientName, 38, yPos);
            doc.text(professionalName, 85, yPos);
            doc.text(`R$ ${amount}`, 140, yPos);
            doc.text(`R$ ${commission}`, 166, yPos);
            yPos += 5;
          });

          yPos += 4;
        }

        // Transactions Section - Outcomes
        if (transactions.value.outcomes.length > 0) {
          if (yPos > 220) {
            doc.addPage();
            yPos = 20;
          }

          doc.setDrawColor(200);
          doc.line(14, yPos, 196, yPos);
          yPos += 8;

          doc.setFontSize(14);
          doc.setFont(undefined, 'bold');
          doc.text('Despesas Detalhadas', 14, yPos);
          yPos += 8;

          doc.setFontSize(8);
          doc.setFont(undefined, 'bold');
          doc.text('Data', 14, yPos);
          doc.text('Conceito', 38, yPos);
          doc.text('Descrição', 100, yPos);
          doc.text('Valor', 170, yPos);
          yPos += 4;
          doc.setDrawColor(150);
          doc.line(14, yPos, 196, yPos);
          yPos += 4;

          doc.setFont(undefined, 'normal');
          transactions.value.outcomes.forEach((outcome) => {
            if (yPos > 270) {
              doc.addPage();
              yPos = 20;
            }

            const date = new Date(outcome.paidAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            const concept = (outcome.concept || 'N/A').substring(0, 25);
            const description = (outcome.description || 'N/A').substring(0, 25);
            const amount = formatCurrencyValue(outcome.amount);

            doc.text(date, 14, yPos);
            doc.text(concept, 38, yPos);
            doc.text(description, 100, yPos);
            doc.text(`R$ ${amount}`, 170, yPos);
            yPos += 5;
          });

          yPos += 4;
        }

        // Notes
        if (props.period.notes) {
          if (yPos > 240) {
            doc.addPage();
            yPos = 20;
          }

          doc.setDrawColor(200);
          doc.line(14, yPos, 196, yPos);
          yPos += 8;

          doc.setFontSize(12);
          doc.setFont(undefined, 'bold');
          doc.text('Notas', 14, yPos);
          yPos += 6;

          doc.setFontSize(10);
          doc.setFont(undefined, 'normal');
          const splitNotes = doc.splitTextToSize(props.period.notes, 180);
          doc.text(splitNotes, 14, yPos);
          yPos += (splitNotes.length * 5) + 6;
        }

        // Reconciliation
        if (props.period.reconciliationData && props.period.status !== 'OPEN') {
          if (yPos > 240) {
            doc.addPage();
            yPos = 20;
          }

          doc.setDrawColor(200);
          doc.line(14, yPos, 196, yPos);
          yPos += 8;

          doc.setFontSize(12);
          doc.setFont(undefined, 'bold');
          doc.text('Conciliação Bancária', 14, yPos);
          yPos += 8;

          doc.setFontSize(10);
          doc.setFont(undefined, 'normal');
          doc.text(`Saldo Bancário: ${formatCurrency(props.period.reconciliationData.bankBalance)}`, 14, yPos);
          yPos += 6;
          doc.text(`Saldo do Sistema: ${formatCurrency(props.period.reconciliationData.systemBalance)}`, 14, yPos);
          yPos += 6;
          doc.text(`Diferença: ${formatCurrency(props.period.reconciliationData.difference)}`, 14, yPos);
          yPos += 8;

          if (props.period.reconciliationData.notes) {
            doc.setFont(undefined, 'bold');
            doc.text('Observações da Conciliação:', 14, yPos);
            yPos += 5;
            doc.setFont(undefined, 'normal');
            const splitRecNotes = doc.splitTextToSize(props.period.reconciliationData.notes, 180);
            doc.text(splitRecNotes, 14, yPos);
          }
        }

        // Footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setFont(undefined, 'normal');
          doc.text(
            `Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`,
            14,
            285
          );
          doc.text(`Página ${i} de ${pageCount}`, 196 - 20, 285, { align: 'right' });

          // "Generado por Hub" centered at bottom
          doc.setFontSize(7);
          doc.setTextColor(100, 100, 100);
          doc.text('Gerado por Hub', 105, 292, { align: 'center' });
          doc.setTextColor(0, 0, 0); // Reset color
        }

        // Save
        doc.save(`Relatorio_${props.period.name}_${new Date().toISOString().split('T')[0]}.pdf`);
      } catch (error) {
        console.error('Error generating PDF:', error);
        alert('Erro ao gerar PDF. Tente novamente.');
      }
    };

    const exportExcel = () => {
      try {
        console.log('📊 Exporting Excel with transactions:', {
          incomesCount: transactions.value.incomes.length,
          outcomesCount: transactions.value.outcomes.length,
        });

        // Create CSV content
        let csv = 'Relatório do Período Contábil\n\n';
        csv += `Período:,${props.period.name}\n`;
        csv += `Data Início:,${formatDate(props.period.startDate)}\n`;
        csv += `Data Fim:,${formatDate(props.period.endDate)}\n`;
        csv += `Status:,${props.period.status === 'OPEN' ? 'Aberto' : props.period.status === 'CLOSED' ? 'Fechado' : 'Bloqueado'}\n\n`;

        csv += 'Resumo Financeiro\n';
        csv += 'Categoria,Valor,Transações\n';
        csv += `Receitas,${formatCurrencyValue(summary.value.totalIncomes)},${summary.value.incomesCount}\n`;
        csv += `Despesas,${formatCurrencyValue(summary.value.totalOutcomes)},${summary.value.outcomesCount}\n`;
        csv += `Comissões,${formatCurrencyValue(summary.value.totalCommissions)},\n`;
        csv += `Reembolsos,${formatCurrencyValue(summary.value.totalRefunds)},\n`;
        csv += `Valor Líquido,${formatCurrencyValue(summary.value.netAmount)},\n\n`;

        // Detailed Incomes
        if (transactions.value.incomes.length > 0) {
          csv += 'Receitas Detalhadas\n';
          csv += 'Data,Cliente,Profissional,Valor,Comissão,Status\n';
          transactions.value.incomes.forEach((income) => {
            const date = new Date(income.paidAt).toLocaleDateString('pt-BR');
            const clientName = (income.clientName || 'N/A').replace(/,/g, ' ');
            const professionalName = (income.professionalName || 'N/A').replace(/,/g, ' ');
            const amount = formatCurrencyValue(income.amount);
            const commission = formatCurrencyValue(income.professionalCommission);
            const status = income.status || '';
            csv += `${date},"${clientName}","${professionalName}",${amount},${commission},${status}\n`;
          });
          csv += '\n';
        }

        // Detailed Outcomes
        if (transactions.value.outcomes.length > 0) {
          csv += 'Despesas Detalhadas\n';
          csv += 'Data,Conceito,Descrição,Valor,Status,Método Pagamento\n';
          transactions.value.outcomes.forEach((outcome) => {
            const date = new Date(outcome.paidAt).toLocaleDateString('pt-BR');
            const concept = (outcome.concept || 'N/A').replace(/,/g, ' ');
            const description = (outcome.description || 'N/A').replace(/,/g, ' ').replace(/"/g, '""');
            const amount = formatCurrencyValue(outcome.amount);
            const status = outcome.status || '';
            const paymentMethod = outcome.paymentMethod || '';
            csv += `${date},"${concept}","${description}",${amount},${status},${paymentMethod}\n`;
          });
          csv += '\n';
        }

        if (props.period.notes) {
          csv += 'Notas\n';
          csv += `"${props.period.notes.replace(/"/g, '""')}"\n\n`;
        }

        if (props.period.reconciliationData && props.period.status !== 'OPEN') {
          csv += 'Conciliação Bancária\n';
          csv += `Saldo Bancário,${formatCurrencyValue(props.period.reconciliationData.bankBalance)}\n`;
          csv += `Saldo do Sistema,${formatCurrencyValue(props.period.reconciliationData.systemBalance)}\n`;
          csv += `Diferença,${formatCurrencyValue(props.period.reconciliationData.difference)}\n`;
          if (props.period.reconciliationData.notes) {
            csv += `Observações,"${props.period.reconciliationData.notes.replace(/"/g, '""')}"\n`;
          }
        }

        // Create blob and download
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `Relatorio_${props.period.name}_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (error) {
        console.error('Error generating Excel:', error);
        alert('Erro ao gerar Excel. Tente novamente.');
      }
    };

    return {
      loading,
      summary,
      formatDate,
      formatCurrency,
      exportPDF,
      exportExcel,
    };
  },
};
</script>

<style scoped>
/* Modern Modal Header - Reusing ClosePeriodModal styles */
.modern-modal-header {
  padding: 0.625rem 1rem;
  background-color: var(--azul-turno);
  color: var(--color-background);
  border-radius: 0;
  min-height: auto;
  position: relative;
}

.modern-modal-header-inner {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  flex: 1;
}

.modern-modal-icon-wrapper {
  width: 2rem;
  height: 2rem;
  border-radius: 0.375rem;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.modern-modal-icon-wrapper i {
  font-size: 1rem;
  color: #ffffff;
}

.modern-modal-title-wrapper {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  flex: 1;
  min-width: 0;
}

.modern-modal-title {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-background);
  margin: 0;
  line-height: 1.2;
  letter-spacing: -0.01em;
}

.modern-modal-subtitle {
  font-size: 0.6875rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.85);
  margin: 0;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.modern-modal-close-btn {
  position: relative;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 0.375rem;
  background: rgba(255, 255, 255, 0.15);
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  color: #ffffff;
  flex-shrink: 0;
  padding: 0;
}

.modern-modal-close-btn:hover {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(1.05);
}

.modern-modal-close-btn i {
  font-size: 0.75rem;
}

/* Modal Body */
.modal-body {
  padding: 1rem;
}

/* Summary Cards */
.row.g-3 {
  display: flex;
  align-items: stretch;
}

.summary-card {
  padding: 0.75rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  border: 1px solid rgba(169, 169, 169, 0.15);
  transition: all 0.2s ease;
  height: 100%;
  min-height: 5rem;
}

.summary-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.summary-card.success {
  background: rgba(0, 194, 203, 0.05);
  border-color: rgba(0, 194, 203, 0.2);
}

.summary-card.danger {
  background: rgba(165, 42, 42, 0.05);
  border-color: rgba(165, 42, 42, 0.2);
}

.summary-card.info {
  background: rgba(249, 195, 34, 0.05);
  border-color: rgba(249, 195, 34, 0.2);
}

.summary-card.primary {
  background: rgba(0, 194, 203, 0.1);
  border-color: rgba(0, 194, 203, 0.3);
}

.summary-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 1.25rem;
}

.success .summary-icon {
  background: rgba(0, 194, 203, 0.15);
  color: #00c2cb;
}

.danger .summary-icon {
  background: rgba(165, 42, 42, 0.15);
  color: #a52a2a;
}

.info .summary-icon {
  background: rgba(249, 195, 34, 0.15);
  color: #f9c322;
}

.primary .summary-icon {
  background: rgba(0, 194, 203, 0.2);
  color: #00c2cb;
}

.summary-content {
  flex: 1;
  min-width: 0;
}

.summary-label {
  font-size: 0.6875rem;
  color: rgba(0, 0, 0, 0.6);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin-bottom: 0.25rem;
}

.summary-value {
  font-size: 0.9375rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.85);
  line-height: 1.2;
}

.summary-count {
  font-size: 0.6875rem;
  color: rgba(0, 0, 0, 0.5);
  margin-top: 0.125rem;
}

/* Notes Section */
.notes-section {
  padding: 0.75rem;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(169, 169, 169, 0.15);
  border-radius: 8px;
}

.notes-title {
  font-size: 0.8125rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.85);
  margin-bottom: 0.5rem;
}

.notes-content {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.7);
  margin: 0;
  line-height: 1.5;
  white-space: pre-wrap;
}

/* Reconciliation Section */
.reconciliation-section {
  padding: 0.75rem;
  background: rgba(249, 195, 34, 0.05);
  border: 1px solid rgba(249, 195, 34, 0.2);
  border-radius: 8px;
}

.reconciliation-title {
  font-size: 0.8125rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.85);
  margin-bottom: 0.75rem;
}

.reconciliation-item {
  padding: 0.625rem;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(169, 169, 169, 0.15);
  border-radius: 6px;
}

.reconciliation-item label {
  font-size: 0.6875rem;
  color: rgba(0, 0, 0, 0.6);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin-bottom: 0.25rem;
  display: block;
}

.reconciliation-item .value {
  font-size: 0.875rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.85);
}

.reconciliation-notes {
  padding: 0.625rem;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(169, 169, 169, 0.15);
  border-radius: 6px;
}

.reconciliation-notes label {
  font-size: 0.6875rem;
  color: rgba(0, 0, 0, 0.6);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  margin-bottom: 0.25rem;
  display: block;
}

.reconciliation-notes p {
  font-size: 0.75rem;
  color: rgba(0, 0, 0, 0.7);
  margin: 0;
  line-height: 1.5;
  white-space: pre-wrap;
}

/* Action Buttons */
.action-buttons {
  padding-top: 0.75rem;
  border-top: 1px solid rgba(169, 169, 169, 0.15);
}

/* Badge */
.badge {
  font-size: 0.75rem;
  padding: 0.375rem 0.75rem;
  border-radius: 6px;
  font-weight: 600;
}

/* Modal Footer */
.modal-footer {
  padding: 0.75rem 1rem;
  border-top: 1px solid rgba(169, 169, 169, 0.15);
}

.btn-size {
  font-size: small !important;
}
</style>
