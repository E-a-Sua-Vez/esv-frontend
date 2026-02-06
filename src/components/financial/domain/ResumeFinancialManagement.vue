<script>
import Spinner from '../../common/Spinner.vue';
import Alert from '../../common/Alert.vue';
import Warning from '../../common/Warning.vue';
import Popper from 'vue3-popper';
import Message from '../../common/Message.vue';
import SimpleDownloadCard from '../../reports/SimpleDownloadCard.vue';
import { globalStore } from '../../../stores';
import { getDate } from '../../../shared/utils/date';
import {
  downloadFormattedCSV,
} from '../../../shared/utils/excelExport';
import SimpleCard from '../../dashboard/common/SimpleCard.vue';
import { LineChart, DoughnutChart } from 'vue-chart-3';
import { Chart, registerables } from 'chart.js';
import PDFHeader from '../../reports/PDFHeader.vue';
import PDFFooter from '../../reports/PDFFooter.vue';
import SimpleDownloadButton from '../../reports/SimpleDownloadButton.vue';
import {
  getFinancialMetrics,
  getFinancialComparison,
  getFinancialTrends,
  getOutcomesCategoryAnalysis,
  getCashFlowMonthlyReport,
  getServiceProfitabilityReport,
  getMostProfitableClientsReport,
  getExpensesByProviderReport,
  getIncomesDetails,
} from '../../../application/services/query-stack';
import { getProfessionalsByCommerce } from '../../../application/services/professional';
import CollectionDetails from '../../dashboard/domain/CollectionDetails.vue';
import IncomesCollectionDetails from '../../dashboard/domain/IncomesCollectionDetails.vue';
import OutcomesCollectionDetails from '../../dashboard/domain/OutcomesCollectionDetails.vue';
import FinancialKPICard from '../common/FinancialKPICard.vue';
import FinancialAlerts from '../common/FinancialAlerts.vue';
import { DateModel } from '../../../shared/utils/date.model';

Chart.register(...registerables);

export default {
  name: 'ResumeFinancialManagement',
  components: {
    Message,
    SimpleDownloadCard,
    Spinner,
    Popper,
    Alert,
    Warning,
    SimpleCard,
    LineChart,
    DoughnutChart,
    PDFHeader,
    PDFFooter,
    SimpleDownloadButton,
    CollectionDetails,
    IncomesCollectionDetails,
    OutcomesCollectionDetails,
    FinancialKPICard,
    FinancialAlerts,
  },
  props: {
    showResumeFinancialManagement: { type: Boolean, default: false },
    toggles: { type: Object, default: undefined },
    attention: { type: Object, default: {} },
    commerce: { type: Object, default: undefined },
    commerces: { type: Array, default: undefined },
    business: { type: Object, default: undefined },
    queues: { type: Array, default: undefined },
    filtersLocation: { type: String, default: 'component' }, // 'component' or 'slot'
  },
  data() {
    const store = globalStore();
    return {
      loading: false,
      alertError: '',
      financialResume: {
        incomes: {
          paymentData: {},
        },
        outcomes: {
          paymentData: {},
        },
        resume: {},
        evolution: {},
        incomeDistribution: {},
        professionalIncomes: null,
      },
      newFinancialResume: {},
      showFilterOptions: false,
      store,
      userType: undefined,
      user: undefined,
      startDate: undefined,
      endDate: undefined,
      calculatedMetrics: {},
      detailsOpened: false,
      comparison: null,
      trends: null,
      outcomesCategoryAnalysis: null,
      alerts: [],
      healthStatus: 'good',
      reportsCollapsed: true, // Reports section collapsed by default
      lastRefreshParams: null, // Cache for last refresh parameters to avoid duplicate calls
    };
  },
  async beforeMount() {
    this.financialResume = {
      incomes: {
        paymentData: {},
      },
      outcomes: {
        paymentData: {},
      },
      resume: {},
      evolution: {},
    };
    await this.getCurrentMonth();
  },
  methods: {
    getDate(dateIn, timeZoneIn) {
      return getDate(dateIn, timeZoneIn);
    },
    async clear() {
      await this.getCurrentMonth();
    },
    async checkAsc(event) {
      if (event.target.checked) {
        this.asc = true;
      } else {
        this.asc = false;
      }
    },
    async refresh() {
      try {
        // Avoid duplicate calls with same parameters
        const refreshKey = `${this.commerce.id}-${this.startDate}-${this.endDate}`;
        if (this.loading && this.lastRefreshParams === refreshKey) {
          return; // Already loading with same params
        }

        this.loading = true;
        this.lastRefreshParams = refreshKey;
        const commerceIds = [this.commerce.id];

        // Get current metrics, comparison, trends, and category analysis in parallel
        // Using catch to prevent one failure from blocking others
        const [metricsResult, comparisonResult, trendsResult, categoryAnalysisResult] =
          await Promise.all([
            getFinancialMetrics(commerceIds, this.startDate, this.endDate),
            getFinancialComparison(commerceIds, this.startDate, this.endDate).catch(() => null),
            getFinancialTrends(commerceIds, this.endDate).catch(() => null),
            getOutcomesCategoryAnalysis(commerceIds, this.startDate, this.endDate).catch(
              () => null,
            ),
          ]);

        const { calculatedMetrics } = metricsResult;
        if (
          !calculatedMetrics ||
          !calculatedMetrics['incomes.created'] ||
          !calculatedMetrics['outcomes.created']
        ) {
          this.loading = false;
          return;
        }

        this.calculatedMetrics = calculatedMetrics;
        this.comparison = comparisonResult;
        this.trends = trendsResult;
        this.outcomesCategoryAnalysis = categoryAnalysisResult;

        const incomes = calculatedMetrics['incomes.created'];
        const outcomes = calculatedMetrics['outcomes.created'];
        this.financialResume.incomes = incomes;
        this.financialResume.outcomes = outcomes;

        // Validate and prepare evolution data for chart
        const incomesEvolution = incomes.evolution || { labels: [], datasets: [] };
        const outcomesEvolution = outcomes.evolution || { labels: [], datasets: [] };

        // Combine and sort all unique labels
        const allLabels = Array.from(
          new Set([...(incomesEvolution.labels || []), ...(outcomesEvolution.labels || [])])
        ).sort();

        // Helper function to map evolution data to chart format
        const mapEvolutionData = (allLabels, sourceLabels, sourceDatasets, field) => {
          if (
            !sourceLabels ||
            !sourceDatasets ||
            !Array.isArray(sourceLabels) ||
            !Array.isArray(sourceDatasets)
          ) {
            return allLabels.map(() => 0);
          }
          const dataMap = {};
          sourceLabels.forEach((label, index) => {
            if (sourceDatasets[index]) {
              dataMap[label] = +(sourceDatasets[index][field] || 0);
            }
          });
          return allLabels.map(label => dataMap[label] || 0);
        };

        // Use LineChart for better trend visualization
        // Ensure we have valid data before creating chart
        const incomesData = mapEvolutionData(
          allLabels,
          incomesEvolution.labels,
          incomesEvolution.datasets,
          'paymentAmountSum',
        );
        const commissionsData = mapEvolutionData(
          allLabels,
          incomesEvolution.labels,
          incomesEvolution.datasets,
          'paymentCommissionSum',
        );
        const outcomesData = mapEvolutionData(
          allLabels,
          outcomesEvolution.labels,
          outcomesEvolution.datasets,
          'paymentAmountSum',
        );

        // Only create chart if we have labels
        const chartData = allLabels.length > 0 ? {
          labels: allLabels,
          datasets: [
            {
              label: this.$t('dashboard.incomes') || 'Recebido',
              borderColor: '#004aad',
              backgroundColor: 'rgba(0, 74, 173, 0.1)',
              data: incomesData,
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6,
              pointBorderWidth: 2,
              pointBackgroundColor: '#004aad',
              pointBorderColor: '#ffffff',
              borderWidth: 2,
            },
            {
              label: this.$t('businessFinancial.commission') || 'Comissão',
              borderColor: '#f9c322',
              backgroundColor: 'rgba(249, 195, 34, 0.1)',
              borderDash: [5, 5],
              data: commissionsData,
              fill: false,
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6,
              pointBorderWidth: 2,
              pointBackgroundColor: '#f9c322',
              pointBorderColor: '#ffffff',
              borderWidth: 2,
            },
            {
              label: this.$t('dashboard.outcomes') || 'Despesas',
              borderColor: '#a52a2a',
              backgroundColor: 'rgba(165, 42, 42, 0.1)',
              data: outcomesData,
              fill: true,
              tension: 0.4,
              pointRadius: 4,
              pointHoverRadius: 6,
              pointBorderWidth: 2,
              pointBackgroundColor: '#a52a2a',
              pointBorderColor: '#ffffff',
              borderWidth: 2,
            },
          ],
        } : null;
        const chartOptions = {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            intersect: false,
            mode: 'index',
          },
          layout: {
            padding: {
              top: 5,
              bottom: 10,
              left: 5,
              right: 5,
            },
          },
          plugins: {
            legend: {
              display: true,
              position: 'top',
              labels: {
                usePointStyle: true,
                padding: 8,
                font: {
                  size: 10,
                },
                boxWidth: 10,
                boxHeight: 10,
              },
            },
            tooltip: {
              enabled: true,
              mode: 'index',
              intersect: false,
            },
          },
          scales: {
            x: {
              display: true,
              grid: {
                display: true,
                color: 'rgba(0, 0, 0, 0.05)',
                drawBorder: false,
              },
              ticks: {
                font: {
                  size: 9,
                },
                maxRotation: 45,
                minRotation: 0,
                padding: 5,
              },
            },
            y: {
              beginAtZero: true,
              display: true,
              grid: {
                display: true,
                color: 'rgba(0, 0, 0, 0.05)',
                drawBorder: false,
              },
              ticks: {
                font: {
                  size: 9,
                },
                padding: 5,
                callback: function(value) {
                  return value.toLocaleString('de-DE', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  });
                },
              },
            },
          },
          elements: {
            line: {
              borderWidth: 2,
            },
            point: {
              radius: 3,
              hoverRadius: 5,
              borderWidth: 1.5,
            },
          },
        };
        // Only set evolution chart if we have valid data
        if (chartData && chartData.labels && chartData.labels.length > 0) {
          this.financialResume.evolution = {
            chartData,
            options: chartOptions,
          };
        } else {
          this.financialResume.evolution = null;
        }

        // Calculate income distribution by type for donut chart
        const incomeTypeDistribution = incomes.paymentTypeDistribution || {};
        if (Object.keys(incomeTypeDistribution).length > 0) {
          const distributionLabels = Object.keys(incomeTypeDistribution).map(
            key => this.$t(`incomeTypes.${key}`) || key
          );
          const distributionData = Object.values(incomeTypeDistribution).map(item => +(item.totalAmount || 0));

          // Color palette for distribution chart
          const colorPalette = [
            '#004aad', // Blue
            '#00c2cb', // Cyan
            '#f9c322', // Yellow
            '#a52a2a', // Brown
            '#7c91d9', // Light Blue
            '#2f407a', // Dark Blue
            '#b1bde6', // Light Purple
            '#ff6b6b', // Red
            '#4ecdc4', // Teal
            '#ffe66d', // Light Yellow
          ];

          const donutChartData = {
            labels: distributionLabels,
            datasets: [
              {
                data: distributionData,
                backgroundColor: distributionLabels.map((_, index) =>
                  colorPalette[index % colorPalette.length]
                ),
                borderWidth: 2,
                borderColor: '#ffffff',
                hoverBorderWidth: 3,
                hoverOffset: 4,
              },
            ],
          };
          const donutChartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            cutout: distributionLabels.length === 1 ? '50%' : '60%', // Smaller cutout for single category
            layout: {
              padding: {
                top: 5,
                bottom: 5,
                left: 5,
                right: 5,
              },
            },
            plugins: {
              legend: {
                display: false,
              },
              tooltip: {
                enabled: true,
                callbacks: {
                  label: context => {
                    const label = context.label || '';
                    const value = context.parsed || 0;
                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                    const percentage = total > 0 ? ((value / total) * 100).toFixed(2) : 0;
                    return `${label}: ${value.toLocaleString('de-DE', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} (${percentage}%)`;
                  },
                },
              },
            },
            // Ensure proper rendering even with single category
            animation: {
              animateRotate: true,
              animateScale: true,
            },
            // Better spacing for single category
            spacing: distributionLabels.length === 1 ? 0 : 2,
          };
          this.financialResume.incomeDistribution = {
            chartData: donutChartData,
            options: donutChartOptions,
          };
        } else {
          this.financialResume.incomeDistribution = null;
        }

        // Calculate financial metrics with proper validation
        const totalIncomes = +(incomes.paymentData?.paymentAmountSum || 0);
        const totalCommissions = +(incomes.paymentData?.paymentCommissionSum || 0);
        const totalOutcomes = +(outcomes.paymentData?.paymentAmountSum || 0);
        const netIncomes = totalIncomes - totalCommissions;
        // Net profit = Total Incomes - Total Outcomes (comisiones ya están incluidas en las receitas)
        const diff = totalIncomes - totalOutcomes; // Net profit

        this.financialResume.resume.diff = diff;
        // Calculate margin: (profit / total incomes) * 100
        const avg = totalIncomes > 0 ? this.getPercentage(diff, totalIncomes) : 0;
        this.financialResume.resume.avg = avg;

        // Calculate additional metrics
        const daysInPeriod = this.calculateDaysInPeriod(this.startDate, this.endDate);
        // Use net incomes (after commissions) for average daily income
        this.financialResume.resume.averageDailyIncome =
          daysInPeriod > 0 ? netIncomes / daysInPeriod : 0;

        // Calculate professional incomes
        await this.calculateProfessionalIncomes();
        this.financialResume.resume.daysUntilMonthEnd = this.calculateDaysUntilMonthEnd();

        // Calculate alerts
        this.calculateAlerts(incomes, outcomes, diff, avg);

        this.loading = false;
      } catch (error) {
        this.loading = false;
      }
    },
    calculateAlerts(incomes, outcomes, profit, margin) {
      const alerts = [];
      const totalIncomes = +incomes.paymentData.paymentAmountSum || 0;
      const totalOutcomes = +outcomes.paymentData.paymentAmountSum || 0;
      const totalCommissions = +incomes.paymentData.paymentCommissionSum || 0;
      const netIncomes = totalIncomes - totalCommissions;
      const pendingIncomes = +incomes.paymentDistribution?.PENDING?.totalAmount || 0;
      const pendingOutcomes = +outcomes.paymentDistribution?.PENDING?.totalAmount || 0;
      const pendingIncomesCount = +incomes.paymentDistribution?.PENDING?.count || 0;
      const pendingOutcomesCount = +outcomes.paymentDistribution?.PENDING?.count || 0;

      // Alert: Expenses exceed income
      if (totalOutcomes > netIncomes) {
        alerts.push({
          type: 'error',
          icon: 'bi-exclamation-triangle-fill',
          message: this.$t('businessFinancial.alerts.expensesExceedIncome'),
        });
      }

      // Alert: Low margin (below 20%)
      if (margin < 20 && totalIncomes > 0) {
        const threshold = 20;
        alerts.push({
          type: 'warning',
          icon: 'bi-exclamation-circle-fill',
          message: this.$t('businessFinancial.alerts.lowMargin').replace('{threshold}', threshold),
          params: { threshold },
        });
      }

      // Alert: Pending payments > 7 days
      const pendingDaysThreshold = 7;
      if (pendingIncomesCount > 0) {
        alerts.push({
          type: 'info',
          icon: 'bi-clock-fill',
          message: this.$t('businessFinancial.alerts.pendingIncomes', {
            count: pendingIncomesCount,
            amount: pendingIncomes.toLocaleString('de-DE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
            days: pendingDaysThreshold,
          }),
          params: {
            count: pendingIncomesCount,
            amount: pendingIncomes,
            days: pendingDaysThreshold,
          },
        });
      }

      if (pendingOutcomesCount > 0) {
        alerts.push({
          type: 'warning',
          icon: 'bi-clock-fill',
          message: this.$t('businessFinancial.alerts.pendingOutcomes', {
            count: pendingOutcomesCount,
            amount: pendingOutcomes.toLocaleString('de-DE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
            days: pendingDaysThreshold,
          }),
          params: {
            count: pendingOutcomesCount,
            amount: pendingOutcomes,
            days: pendingDaysThreshold,
          },
        });
      }

      // Alert: Unusual expenses (compared to previous period)
      if (this.comparison && this.comparison.comparison) {
        const outcomesChange = this.comparison.comparison.outcomes || 0;
        if (outcomesChange > 30) {
          // Expenses increased more than 30%
          alerts.push({
            type: 'warning',
            icon: 'bi-graph-up-arrow',
            message: this.$t('businessFinancial.alerts.unusualExpenses', {
              percentage: Math.abs(outcomesChange).toFixed(2),
            }),
            params: { percentage: Math.abs(outcomesChange) },
          });
        }
      }

      // Calculate projected cash flow (use net incomes after commissions)
      const daysInPeriod = this.calculateDaysInPeriod(this.startDate, this.endDate);
      const daysUntilMonthEnd = this.calculateDaysUntilMonthEnd();
      const averageDailyIncome = daysInPeriod > 0 ? netIncomes / daysInPeriod : 0; // Use net incomes
      const averageDailyOutcome = daysInPeriod > 0 ? totalOutcomes / daysInPeriod : 0;
      const projectedIncome = averageDailyIncome * daysUntilMonthEnd;
      const projectedOutcome = averageDailyOutcome * daysUntilMonthEnd;
      const projectedCashFlow = projectedIncome - projectedOutcome;

      // Store projected cash flow for display
      this.financialResume.resume.projectedCashFlow = projectedCashFlow;
      this.financialResume.resume.projectedIncome = projectedIncome;
      this.financialResume.resume.projectedOutcome = projectedOutcome;

      // Alert: Negative projected cash flow
      if (projectedCashFlow < 0 && daysUntilMonthEnd > 0) {
        alerts.push({
          type: 'warning',
          icon: 'bi-cash-stack',
          message: this.$t('businessFinancial.alerts.negativeProjectedCashFlow', {
            amount: Math.abs(projectedCashFlow).toLocaleString('de-DE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
          }),
          params: { amount: Math.abs(projectedCashFlow) },
        });
      }

      // Calculate monthly goal progress (if we have a goal, use 80% of previous month as baseline)
      let monthlyGoal = 0;
      if (this.comparison && this.comparison.previous) {
        const previousIncomes =
          +this.comparison.previous['incomes.created']?.paymentData?.paymentAmountSum || 0;
        monthlyGoal = previousIncomes * 1.1; // 10% growth goal
      }
      const goalProgress = monthlyGoal > 0 ? (totalIncomes / monthlyGoal) * 100 : 0;
      this.financialResume.resume.monthlyGoal = monthlyGoal;
      this.financialResume.resume.goalProgress = goalProgress;

      // Alert: Behind monthly goal
      if (monthlyGoal > 0 && goalProgress < 70 && daysUntilMonthEnd < 7) {
        alerts.push({
          type: 'warning',
          icon: 'bi-target',
          message: this.$t('businessFinancial.alerts.behindMonthlyGoal', {
            progress: goalProgress.toFixed(1),
          }),
          params: { progress: goalProgress },
        });
      }

      // Determine health status
      if (alerts.length === 0 && margin >= 30) {
        this.healthStatus = 'excellent';
      } else if (alerts.length === 0) {
        this.healthStatus = 'good';
      } else if (alerts.some(a => a.type === 'error')) {
        this.healthStatus = 'critical';
      } else if (alerts.some(a => a.type === 'warning')) {
        this.healthStatus = 'warning';
      } else {
        this.healthStatus = 'good';
      }

      this.alerts = alerts;
    },
    async calculateProfessionalIncomes() {
      try {
        if (!this.commerce || !this.commerce.id || !this.startDate || !this.endDate) {
          this.financialResume.professionalIncomes = null;
          return;
        }

        // Get professionals to map IDs to names
        let professionalsMap = {};
        try {
          const professionals = await getProfessionalsByCommerce(this.commerce.id);
          if (Array.isArray(professionals)) {
            professionals.forEach(prof => {
              if (prof.id && prof.personalInfo) {
                const firstName = prof.personalInfo.firstName || '';
                const lastName = prof.personalInfo.lastName || '';
                professionalsMap[prof.id] = `${firstName} ${lastName}`.trim() || prof.personalInfo.name || 'Sin Nombre';
              }
            });
          }
        } catch (error) {
          console.warn('[calculateProfessionalIncomes] Could not fetch professionals:', error);
        }

        // Get all incomes for the date range
        const incomesArray = await getIncomesDetails(
          this.business?.id,
          this.commerce.id,
          this.startDate,
          this.endDate,
          [this.commerce.id],
          1,
          10000, // Large limit to get all incomes
          undefined,
          true,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined
        );

        if (!incomesArray || !Array.isArray(incomesArray) || incomesArray.length === 0) {
          this.financialResume.professionalIncomes = null;
          return;
        }

        // Group incomes by professional
        const professionalMap = {};

        incomesArray.forEach(income => {
          const professionalId = income.professionalId || income.professionalIdFromJoin;

          // Skip if no professional ID
          if (!professionalId || professionalId === 'unknown') {
            return;
          }

          // Get professional name - try multiple sources
          let professionalName = income.professionalName;
          if (!professionalName && professionalsMap[professionalId]) {
            professionalName = professionalsMap[professionalId];
          }
          if (!professionalName) {
            // Last resort: use a default
            professionalName = this.$t('businessFinancial.filters.professional') || 'Profesional';
          }

          if (!professionalMap[professionalId]) {
            professionalMap[professionalId] = {
              id: professionalId,
              name: professionalName,
              totalAmount: 0,
              totalCommission: 0,
              count: 0,
            };
          }

          const amount = +(income.totalAmount || income.amount || 0);
          const commission = +(income.professionalCommission || 0);

          professionalMap[professionalId].totalAmount += amount;
          professionalMap[professionalId].totalCommission += commission;
          professionalMap[professionalId].count += 1;
        });

        // Convert to array and sort by totalAmount (descending)
        const professionalList = Object.values(professionalMap)
          .filter(p => p.totalAmount > 0) // Only include professionals with income
          .sort((a, b) => b.totalAmount - a.totalAmount);

        if (professionalList.length === 0) {
          this.financialResume.professionalIncomes = null;
          return;
        }

        // Prepare chart data
        const chartLabels = professionalList.map(p => p.name);
        const chartData = professionalList.map(p => p.totalAmount);

        // Color palette for professional chart
        const colorPalette = [
          '#004aad', // Blue
          '#00c2cb', // Cyan
          '#f9c322', // Yellow
          '#a52a2a', // Brown
          '#7c91d9', // Light Blue
          '#2f407a', // Dark Blue
          '#b1bde6', // Light Purple
          '#ff6b6b', // Red
          '#4ecdc4', // Teal
          '#ffe66d', // Light Yellow
          '#95e1d3', // Mint
          '#f38181', // Coral
          '#aa96da', // Lavender
          '#fcbad3', // Pink
          '#a8d8ea', // Sky Blue
        ];

        const donutChartData = {
          labels: chartLabels,
          datasets: [
            {
              data: chartData,
              backgroundColor: chartLabels.map((_, index) =>
                colorPalette[index % colorPalette.length]
              ),
              borderWidth: 2,
              borderColor: '#ffffff',
              hoverBorderWidth: 3,
              hoverOffset: 4,
            },
          ],
        };

        const donutChartOptions = {
          responsive: true,
          maintainAspectRatio: false,
          cutout: professionalList.length === 1 ? '50%' : '60%',
          layout: {
            padding: {
              top: 5,
              bottom: 5,
              left: 5,
              right: 5,
            },
          },
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              enabled: true,
              callbacks: {
                label: context => {
                  const label = context.label || '';
                  const value = context.parsed || 0;
                  const total = context.dataset.data.reduce((a, b) => a + b, 0);
                  const percentage = total > 0 ? ((value / total) * 100).toFixed(2) : 0;
                  return `${label}: ${value.toLocaleString('de-DE', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} (${percentage}%)`;
                },
              },
            },
          },
          animation: {
            animateRotate: true,
            animateScale: true,
          },
          spacing: professionalList.length === 1 ? 0 : 2,
        };

        this.financialResume.professionalIncomes = {
          list: professionalList,
          chartData: donutChartData,
          options: donutChartOptions,
        };

      } catch (error) {
        console.error('[calculateProfessionalIncomes] Error calculating professional incomes:', error);
        this.financialResume.professionalIncomes = null;
      }
    },
    showFilters() {
      this.showFilterOptions = !this.showFilterOptions;
    },
    async downloadCashFlowReport() {
      try {
        this.loading = true;
        let commerceIds = [this.commerce.id];
        if (this.commerces && this.commerces.length > 0) {
          commerceIds = this.commerces.map(commerce => commerce.id);
        }

        const reportData = await getCashFlowMonthlyReport(
          this.commerce.id,
          commerceIds,
          this.startDate,
          this.endDate
        );

        // Format data for CSV/Excel export
        const exportData = [];

        // Add summary row
        exportData.push({
          [this.$t('businessFinancial.reports.cashFlow.month')]: this.$t(
            'businessFinancial.reports.cashFlow.summary',
          ),
          [this.$t('businessFinancial.reports.cashFlow.incomes')]:
            reportData.summary.totalIncomes.toLocaleString('de-DE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
          [this.$t('businessFinancial.reports.cashFlow.commissions')]:
            reportData.summary.totalCommissions.toLocaleString('de-DE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
          [this.$t('businessFinancial.reports.cashFlow.netIncomes')]:
            reportData.summary.totalNetIncomes.toLocaleString('de-DE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
          [this.$t('businessFinancial.reports.cashFlow.outcomes')]:
            reportData.summary.totalOutcomes.toLocaleString('de-DE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
          [this.$t('businessFinancial.reports.cashFlow.cashFlow')]:
            reportData.summary.totalCashFlow.toLocaleString('de-DE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
          [this.$t(
            'businessFinancial.reports.cashFlow.margin',
          )]: `${reportData.summary.averageMargin.toFixed(2)}%`,
        });

        // Add monthly data
        reportData.monthlyData.forEach(month => {
          exportData.push({
            [this.$t('businessFinancial.reports.cashFlow.month')]: month.monthLabel,
            [this.$t('businessFinancial.reports.cashFlow.incomes')]: month.incomes.toLocaleString(
              'de-DE',
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              },
            ),
            [this.$t('businessFinancial.reports.cashFlow.commissions')]:
              month.commissions.toLocaleString('de-DE', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }),
            [this.$t('businessFinancial.reports.cashFlow.netIncomes')]:
              month.netIncomes.toLocaleString('de-DE', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              }),
            [this.$t('businessFinancial.reports.cashFlow.outcomes')]: month.outcomes.toLocaleString(
              'de-DE',
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              },
            ),
            [this.$t('businessFinancial.reports.cashFlow.cashFlow')]: month.cashFlow.toLocaleString(
              'de-DE',
              {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              },
            ),
            [this.$t('businessFinancial.reports.cashFlow.margin')]: `${month.margin.toFixed(2)}%`,
            [this.$t('businessFinancial.reports.cashFlow.incomeCount')]: month.incomeCount,
            [this.$t('businessFinancial.reports.cashFlow.outcomeCount')]: month.outcomeCount,
          });
        });

        // Add projections section
        exportData.push({});
        exportData.push({
          [this.$t('businessFinancial.reports.cashFlow.month')]: this.$t(
            'businessFinancial.reports.cashFlow.projections',
          ),
        });
        exportData.push({
          [this.$t('businessFinancial.reports.cashFlow.month')]: this.$t(
            'businessFinancial.reports.cashFlow.nextMonth',
          ),
          [this.$t('businessFinancial.reports.cashFlow.projectedIncome')]:
            reportData.projections.nextMonth.projectedIncome.toLocaleString('de-DE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
          [this.$t('businessFinancial.reports.cashFlow.projectedOutcome')]:
            reportData.projections.nextMonth.projectedOutcome.toLocaleString('de-DE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
          [this.$t('businessFinancial.reports.cashFlow.projectedCashFlow')]:
            reportData.projections.nextMonth.projectedCashFlow.toLocaleString('de-DE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
        });
        exportData.push({
          [this.$t('businessFinancial.reports.cashFlow.month')]: this.$t(
            'businessFinancial.reports.cashFlow.nextQuarter',
          ),
          [this.$t('businessFinancial.reports.cashFlow.projectedIncome')]:
            reportData.projections.nextQuarter.projectedIncome.toLocaleString('de-DE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
          [this.$t('businessFinancial.reports.cashFlow.projectedOutcome')]:
            reportData.projections.nextQuarter.projectedOutcome.toLocaleString('de-DE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
          [this.$t('businessFinancial.reports.cashFlow.projectedCashFlow')]:
            reportData.projections.nextQuarter.projectedCashFlow.toLocaleString('de-DE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
        });

        // Download as formatted CSV
        downloadFormattedCSV(
          exportData,
          `cash-flow-monthly-${this.commerce.tag}-${this.startDate}-${this.endDate}`,
          {
            reportType: this.$t('businessFinancial.reports.cashFlow.title'),
            period: `${this.startDate} - ${this.endDate}`,
            commerce: this.commerce.name || this.commerce.tag,
            sheetName: 'Cash Flow Monthly',
          },
        );

        this.loading = false;
      } catch (error) {
        this.loading = false;
        console.error('Error downloading cash flow report:', error);
      }
    },
    async downloadServiceProfitabilityReport() {
      try {
        this.loading = true;
        let commerceIds = [this.commerce.id];
        if (this.commerces && this.commerces.length > 0) {
          commerceIds = this.commerces.map(commerce => commerce.id);
        }

        const reportData = await getServiceProfitabilityReport(
          this.commerce.id,
          commerceIds,
          this.startDate,
          this.endDate
        );

        // Format data for CSV/Excel export
        const exportData = reportData.map(service => ({
          [this.$t('businessFinancial.reports.serviceProfitability.serviceId')]: service.serviceId,
          [this.$t('businessFinancial.reports.serviceProfitability.serviceName')]:
            service.serviceName || service.serviceId,
          [this.$t('businessFinancial.reports.serviceProfitability.transactionCount')]:
            service.transactionCount,
          [this.$t('businessFinancial.reports.serviceProfitability.attentionCount')]:
            service.attentionCount,
          [this.$t('businessFinancial.reports.serviceProfitability.uniqueClients')]:
            service.uniqueClients,
          [this.$t('businessFinancial.reports.serviceProfitability.totalIncomes')]:
            service.totalIncomes.toLocaleString('de-DE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
          [this.$t('businessFinancial.reports.serviceProfitability.totalCommissions')]:
            service.totalCommissions.toLocaleString('de-DE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
          [this.$t('businessFinancial.reports.serviceProfitability.netIncomes')]:
            service.netIncomes.toLocaleString('de-DE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
          [this.$t('businessFinancial.reports.serviceProfitability.totalOutcomes')]:
            service.totalOutcomes.toLocaleString('de-DE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
          [this.$t('businessFinancial.reports.serviceProfitability.profit')]:
            service.profit.toLocaleString('de-DE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
          [this.$t(
            'businessFinancial.reports.serviceProfitability.margin',
          )]: `${service.margin.toFixed(2)}%`,
          [this.$t(
            'businessFinancial.reports.serviceProfitability.profitability',
          )]: `${service.profitability.toFixed(2)}%`,
          [this.$t('businessFinancial.reports.serviceProfitability.averageIncome')]:
            service.averageIncome.toLocaleString('de-DE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
        }));

        // Download as formatted CSV
        downloadFormattedCSV(
          exportData,
          `service-profitability-${this.commerce.tag}-${this.startDate}-${this.endDate}`,
          {
            reportType: this.$t('businessFinancial.reports.serviceProfitability.title'),
            period: `${this.startDate} - ${this.endDate}`,
            commerce: this.commerce.name || this.commerce.tag,
            sheetName: 'Service Profitability',
          },
        );

        this.loading = false;
      } catch (error) {
        this.loading = false;
        console.error('Error downloading service profitability report:', error);
      }
    },
    async downloadMostProfitableClientsReport() {
      try {
        this.loading = true;
        let commerceIds = [this.commerce.id];
        if (this.commerces && this.commerces.length > 0) {
          commerceIds = this.commerces.map(commerce => commerce.id);
        }

        const reportData = await getMostProfitableClientsReport(
          this.commerce.id,
          commerceIds,
          this.startDate,
          this.endDate
        );

        // Format data for CSV/Excel export
        const exportData = reportData.map(client => ({
          [this.$t('businessFinancial.reports.mostProfitableClients.clientName')]:
            client.clientFullName,
          [this.$t('businessFinancial.reports.mostProfitableClients.clientIdNumber')]:
            client.clientIdNumber,
          [this.$t('businessFinancial.reports.mostProfitableClients.clientEmail')]:
            client.clientEmail,
          [this.$t('businessFinancial.reports.mostProfitableClients.clientPhone')]:
            client.clientPhone,
          [this.$t('businessFinancial.reports.mostProfitableClients.transactionCount')]:
            client.transactionCount,
          [this.$t('businessFinancial.reports.mostProfitableClients.attentionCount')]:
            client.attentionCount,
          [this.$t('businessFinancial.reports.mostProfitableClients.bookingCount')]:
            client.bookingCount,
          [this.$t('businessFinancial.reports.mostProfitableClients.totalIncomes')]:
            client.totalIncomes.toLocaleString('de-DE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
          [this.$t('businessFinancial.reports.mostProfitableClients.totalCommissions')]:
            client.totalCommissions.toLocaleString('de-DE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
          [this.$t('businessFinancial.reports.mostProfitableClients.netIncomes')]:
            client.netIncomes.toLocaleString('de-DE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
          [this.$t('businessFinancial.reports.mostProfitableClients.averageTicket')]:
            client.averageTicket.toLocaleString('de-DE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
          [this.$t('businessFinancial.reports.mostProfitableClients.lifetimeValue')]:
            client.lifetimeValue.toLocaleString('de-DE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
          [this.$t('businessFinancial.reports.mostProfitableClients.firstPurchase')]:
            client.firstPurchase ? new Date(client.firstPurchase).toLocaleDateString() : '',
          [this.$t('businessFinancial.reports.mostProfitableClients.lastPurchase')]:
            client.lastPurchase ? new Date(client.lastPurchase).toLocaleDateString() : '',
          [this.$t('businessFinancial.reports.mostProfitableClients.activeMonths')]:
            client.activeMonths,
          [this.$t(
            'businessFinancial.reports.mostProfitableClients.frequency',
          )]: `${client.frequency.toFixed(1)} días`,
        }));

        // Download as formatted CSV
        downloadFormattedCSV(
          exportData,
          `most-profitable-clients-${this.commerce.tag}-${this.startDate}-${this.endDate}`,
          {
            reportType: this.$t('businessFinancial.reports.mostProfitableClients.title'),
            period: `${this.startDate} - ${this.endDate}`,
            commerce: this.commerce.name || this.commerce.tag,
            sheetName: 'Most Profitable Clients',
          },
        );

        this.loading = false;
      } catch (error) {
        this.loading = false;
        console.error('Error downloading most profitable clients report:', error);
      }
    },
    async downloadExpensesByProviderReport() {
      try {
        this.loading = true;
        let commerceIds = [this.commerce.id];
        if (this.commerces && this.commerces.length > 0) {
          commerceIds = this.commerces.map(commerce => commerce.id);
        }

        const reportData = await getExpensesByProviderReport(
          this.commerce.id,
          commerceIds,
          this.startDate,
          this.endDate
        );

        // Format data for CSV/Excel export
        const exportData = reportData.map(provider => ({
          [this.$t('businessFinancial.reports.expensesByProvider.providerName')]:
            provider.providerName,
          [this.$t('businessFinancial.reports.expensesByProvider.transactionCount')]:
            provider.transactionCount,
          [this.$t('businessFinancial.reports.expensesByProvider.totalAmount')]:
            provider.totalAmount.toLocaleString('de-DE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
          [this.$t('businessFinancial.reports.expensesByProvider.averageAmount')]:
            provider.averageAmount.toLocaleString('de-DE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
          [this.$t('businessFinancial.reports.expensesByProvider.previousAmount')]:
            provider.previousAmount.toLocaleString('de-DE', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
          [this.$t('businessFinancial.reports.expensesByProvider.change')]: `${
            provider.change >= 0 ? '+' : ''
          }${provider.change.toFixed(2)}%`,
          [this.$t('businessFinancial.reports.expensesByProvider.firstExpense')]:
            provider.firstExpense ? new Date(provider.firstExpense).toLocaleDateString() : '',
          [this.$t('businessFinancial.reports.expensesByProvider.lastExpense')]:
            provider.lastExpense ? new Date(provider.lastExpense).toLocaleDateString() : '',
          [this.$t('businessFinancial.reports.expensesByProvider.activeMonths')]:
            provider.activeMonths,
          [this.$t('businessFinancial.reports.expensesByProvider.categories')]: provider.categories,
        }));

        // Download as formatted CSV
        downloadFormattedCSV(
          exportData,
          `expenses-by-provider-${this.commerce.tag}-${this.startDate}-${this.endDate}`,
          {
            reportType: this.$t('businessFinancial.reports.expensesByProvider.title'),
            period: `${this.startDate} - ${this.endDate}`,
            commerce: this.commerce.name || this.commerce.tag,
            sheetName: 'Expenses by Provider',
          },
        );

        this.loading = false;
      } catch (error) {
        this.loading = false;
        console.error('Error downloading expenses by provider report:', error);
      }
    },
    exportToPDF() {
      this.loading = true;

      setTimeout(async () => {
        try {
          const { jsPDF } = await import('jspdf');
          const pdf = new jsPDF();

          // === HEADER ===
          pdf.setFillColor(52, 58, 64);
          pdf.rect(0, 0, 210, 35, 'F');

          pdf.setTextColor(255, 255, 255);
          pdf.setFontSize(16);
          pdf.setFont(undefined, 'bold');
          pdf.text('REPORTE FINANCIERO', 15, 20);

          pdf.setFontSize(9);
          pdf.setFont(undefined, 'normal');
          pdf.text(`${this.commerce?.name || 'N/A'}`, 15, 28);
          pdf.text(`${this.startDate} - ${this.endDate}`, 120, 20);
          pdf.text(`Generado: ${new Date().toLocaleDateString()}`, 120, 28);

          pdf.setTextColor(0, 0, 0);
          let yPos = 50;

          // === RESUMEN FINANCIERO ===
          if (this.calculatedMetrics && Object.keys(this.calculatedMetrics).length > 0) {
            const incomesAmount = this.calculatedMetrics['incomes.created']?.paymentData?.paymentAmountSum || 0;
            const incomesCount = this.calculatedMetrics['incomes.created']?.paymentData?.paymentCounter || 0;
            const outcomesAmount = this.calculatedMetrics['outcomes.created']?.paymentData?.paymentAmountSum || 0;
            const outcomesCount = this.calculatedMetrics['outcomes.created']?.paymentData?.paymentCounter || 0;
            const balance = incomesAmount - outcomesAmount;
            const margin = incomesAmount > 0 ? ((balance / incomesAmount) * 100).toFixed(1) : '0';
            const avgIncomePerOp = incomesCount > 0 ? (incomesAmount / incomesCount) : 0;
            const avgOutcomePerOp = outcomesCount > 0 ? (outcomesAmount / outcomesCount) : 0;

            // Financial summary cards
            pdf.setFillColor(240, 248, 255);
            pdf.rect(15, yPos, 55, 35, 'F');
            pdf.setFillColor(248, 255, 240);
            pdf.rect(75, yPos, 55, 35, 'F');
            pdf.setFillColor(255, 248, 240);
            pdf.rect(135, yPos, 55, 35, 'F');

            pdf.setFontSize(8);
            pdf.setTextColor(100, 100, 100);
            pdf.text('INGRESOS TOTALES', 17, yPos + 8);
            pdf.text('GASTOS TOTALES', 77, yPos + 8);
            pdf.text('UTILIDAD NETA', 137, yPos + 8);

            pdf.setFontSize(14);
            pdf.setFont(undefined, 'bold');
            pdf.setTextColor(0, 102, 204);
            pdf.text(`R$${incomesAmount.toLocaleString('de-DE')}`, 17, yPos + 18);
            pdf.setTextColor(255, 102, 0);
            pdf.text(`R$${outcomesAmount.toLocaleString('de-DE')}`, 77, yPos + 18);
            pdf.setTextColor(balance >= 0 ? 0 : 255, balance >= 0 ? 153 : 0, 0);
            pdf.text(`R$${balance.toLocaleString('de-DE')}`, 137, yPos + 18);

            pdf.setFontSize(7);
            pdf.setTextColor(100, 100, 100);
            pdf.setFont(undefined, 'normal');
            pdf.text(`${incomesCount} operaciones`, 17, yPos + 26);
            pdf.text(`Promedio: R$${Math.round(avgIncomePerOp).toLocaleString('de-DE')}`, 17, yPos + 32);
            pdf.text(`${outcomesCount} operaciones`, 77, yPos + 26);
            pdf.text(`Promedio: R$${Math.round(avgOutcomePerOp).toLocaleString('de-DE')}`, 77, yPos + 32);
            pdf.text(`Margen: ${margin}%`, 137, yPos + 26);
            pdf.text(`ROI: ${margin}%`, 137, yPos + 32);

            yPos += 45;
          } else {
            pdf.setFontSize(12);
            pdf.text('No hay datos disponibles para este período.', 20, yPos);
            yPos += 20;
          }

          // === ANÁLISIS DE RENDIMIENTO ===
          pdf.setTextColor(0, 0, 0);
          pdf.setFontSize(10);
          pdf.setFont(undefined, 'bold');
          pdf.text('ANÁLISIS DE RENDIMIENTO', 15, yPos);
          yPos += 12;

          // Performance metrics in two columns
          pdf.setFontSize(8);
          pdf.setFont(undefined, 'normal');

          if (this.calculatedMetrics && Object.keys(this.calculatedMetrics).length > 0) {
            const days = Math.ceil((new Date(this.endDate) - new Date(this.startDate)) / (1000 * 60 * 60 * 24)) || 1;
            const incomesAmount = this.calculatedMetrics['incomes.created']?.paymentData?.paymentAmountSum || 0;
            const outcomesAmount = this.calculatedMetrics['outcomes.created']?.paymentData?.paymentAmountSum || 0;
            const dailyAvgIncome = incomesAmount / days;
            const dailyAvgOutcome = outcomesAmount / days;
            const incomesCount = this.calculatedMetrics['incomes.created']?.paymentData?.paymentCounter || 0;
            const outcomesCount = this.calculatedMetrics['outcomes.created']?.paymentData?.paymentCounter || 0;
            const totalOps = incomesCount + outcomesCount;

            pdf.text('• Ingreso promedio diario:', 15, yPos);
            pdf.text(`R$${Math.round(dailyAvgIncome).toLocaleString('de-DE')}`, 80, yPos);
            pdf.text('• Gasto promedio diario:', 110, yPos);
            pdf.text(`R$${Math.round(dailyAvgOutcome).toLocaleString('de-DE')}`, 170, yPos);
            yPos += 8;

            pdf.text('• Días analizados:', 15, yPos);
            pdf.text(`${days}`, 80, yPos);
            pdf.text('• Frecuencia operaciones:', 110, yPos);
            pdf.text(`${(totalOps/days).toFixed(1)}/día`, 170, yPos);
            yPos += 15;
          } else {
            pdf.text('No hay suficientes datos para análisis de rendimiento.', 15, yPos);
            yPos += 15;
          }

          // === DISTRIBUCIÓN DE INGRESOS ===
          if (this.calculatedMetrics?.['incomes.created']?.paymentDistribution) {
            pdf.setFontSize(10);
            pdf.setFont(undefined, 'bold');
            pdf.text('MÉTODOS DE PAGO', 15, yPos);
            yPos += 10;

            const paymentDist = this.calculatedMetrics['incomes.created'].paymentDistribution;
            const totalIncome = this.calculatedMetrics['incomes.created']?.paymentData?.paymentAmountSum || 1;

            pdf.setFontSize(7);
            pdf.setFont(undefined, 'normal');

            let xPos = 15;
            let col = 0;
            Object.entries(paymentDist).forEach(([method, data]) => {
              if (data.paymentAmountSum > 0) {
                const percentage = ((data.paymentAmountSum || 0) / totalIncome * 100).toFixed(1);

                pdf.setFillColor(240, 240, 240);
                pdf.rect(xPos, yPos, 45, 12, 'F');

                pdf.text(`${method}`, xPos + 2, yPos + 4);
                pdf.text(`$${(data.paymentAmountSum || 0).toLocaleString()}`, xPos + 2, yPos + 8);
                pdf.text(`${percentage}%`, xPos + 30, yPos + 8);

                col++;
                if (col % 4 === 0) {
                  xPos = 15;
                  yPos += 16;
                } else {
                  xPos += 47;
                }
              }
            });

            if (col % 4 !== 0) yPos += 16;
            yPos += 8;
          }

          // === INGRESOS POR PROFESIONAL ===
          if (this.financialResume?.professionalIncomes?.list && this.financialResume.professionalIncomes.list.length > 0) {
            pdf.setFontSize(10);
            pdf.setFont(undefined, 'bold');
            pdf.text('TOP PROFESIONALES', 15, yPos);
            yPos += 10;

            // Sort by gross income and take top 5
            const topProfessionals = [...this.financialResume.professionalIncomes.list]
              .sort((a, b) => (b.grossIncome || 0) - (a.grossIncome || 0))
              .slice(0, 5);

            pdf.setFontSize(8);
            pdf.setFont(undefined, 'bold');
            pdf.text('PROFESIONAL', 15, yPos);
            pdf.text('BRUTO', 90, yPos);
            pdf.text('NETO', 120, yPos);
            pdf.text('EFECTIVIDAD', 150, yPos);
            yPos += 6;

            pdf.setFont(undefined, 'normal');
            let rank = 1;
            topProfessionals.forEach((prof) => {
              const gross = prof.grossIncome || 0;
              const net = prof.netIncome || 0;
              const effectiveness = gross > 0 ? ((net / gross) * 100).toFixed(1) : '0';

              pdf.setFontSize(7);
              pdf.text(`${rank}. ${prof.name.substring(0, 25)}`, 15, yPos);
              pdf.text(`R$${gross.toLocaleString('de-DE')}`, 90, yPos);
              pdf.text(`R$${net.toLocaleString('de-DE')}`, 120, yPos);
              pdf.text(`${effectiveness}%`, 150, yPos);

              rank++;
              yPos += 8;
            });
            yPos += 8;
          }

          // === TENDENCIAS Y PROYECCIONES ===
          if (this.trends && this.trends.length > 0) {
            if (yPos > 220) {
              pdf.addPage();
              yPos = 40;
            }

            pdf.setFontSize(10);
            pdf.setFont(undefined, 'bold');
            pdf.text('EVOLUCIÓN MENSUAL', 15, yPos);
            yPos += 10;

            // Create a simple chart-like visualization
            const recentTrends = this.trends.slice(-6);
            const maxIncome = Math.max(...recentTrends.map(t => t.incomes || 0));

            pdf.setFontSize(7);
            pdf.setFont(undefined, 'normal');

            recentTrends.forEach((trend, index) => {
              const date = new Date(trend.month || trend.date).toLocaleDateString('es', {month: 'short'});
              const incomes = trend.incomes || 0;
              const outcomes = trend.outcomes || 0;
              const profit = incomes - outcomes;
              const barWidth = maxIncome > 0 ? (incomes / maxIncome) * 120 : 0;

              pdf.text(`${date}`, 15, yPos);

              // Income bar
              pdf.setFillColor(0, 153, 0);
              pdf.rect(35, yPos - 3, barWidth, 4, 'F');

              pdf.text(`$${incomes.toLocaleString()}`, 160, yPos);

              yPos += 8;
            });
            yPos += 10;
          }

          // === RECOMENDACIONES AUTOMÁTICAS ===
          pdf.setFontSize(10);
          pdf.setFont(undefined, 'bold');
          pdf.text('INSIGHTS Y RECOMENDACIONES', 15, yPos);
          yPos += 10;

          pdf.setFontSize(8);
          pdf.setFont(undefined, 'normal');

          const insights = [];

          if (this.calculatedMetrics) {
            const balance = (this.calculatedMetrics['incomes.created']?.paymentData?.paymentAmountSum || 0) -
                           (this.calculatedMetrics['outcomes.created']?.paymentData?.paymentAmountSum || 0);
            const margin = balance > 0 ? ((balance / (this.calculatedMetrics['incomes.created']?.paymentData?.paymentAmountSum || 1)) * 100).toFixed(1) : 0;

            if (margin > 80) {
              insights.push('✓ Excelente rentabilidad. Considera expandir operaciones.');
            } else if (margin > 50) {
              insights.push('✓ Buena rentabilidad. Mantén el control de gastos.');
            } else if (margin > 20) {
              insights.push('⚠ Rentabilidad moderada. Revisa eficiencia operativa.');
            } else {
              insights.push('⚠ Baja rentabilidad. Requiere análisis de costos urgente.');
            }

            const avgTicket = (this.calculatedMetrics['incomes.created']?.paymentData?.paymentAmountSum || 0) /
                             (this.calculatedMetrics['incomes.created']?.paymentData?.paymentCounter || 1);

            if (avgTicket > 500) {
              insights.push('✓ Ticket promedio alto. Cliente objetivo premium.');
            } else if (avgTicket < 200) {
              insights.push('• Ticket promedio bajo. Considera servicios add-on.');
            }
          }

          if (this.professionalIncomes && this.professionalIncomes.length > 1) {
            const topPerformer = this.professionalIncomes.reduce((max, prof) =>
              (prof.grossIncome || 0) > (max.grossIncome || 0) ? prof : max);
            insights.push(`• Top performer: ${topPerformer.name}`);
          }

          insights.forEach(insight => {
            if (yPos > 270) {
              pdf.addPage();
              yPos = 30;
            }
            pdf.text(insight, 15, yPos, { maxWidth: 180 });
            yPos += 10;
          });

          // === FOOTER ===
          const pageCount = pdf.internal.getNumberOfPages();
          for (let i = 1; i <= pageCount; i++) {
            pdf.setPage(i);
            pdf.setFillColor(240, 240, 240);
            pdf.rect(0, 285, 210, 12, 'F');

            pdf.setFontSize(7);
            pdf.setTextColor(100, 100, 100);
            pdf.text(`${this.commerce?.name || 'Comercio'}`, 15, 292);
            pdf.text(`Página ${i}/${pageCount}`, 95, 292);
            pdf.text(`${new Date().toLocaleDateString()}`, 170, 292);
          }

          const fileName = `reporte-${this.commerce?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'comercio'}-${this.startDate}.pdf`;
          pdf.save(fileName);


        } catch (error) {
          console.error('Error generating PDF:', error);
          alert('Error al generar el PDF: ' + error.message);
        } finally {
          this.loading = false;
          this.detailsOpened = false;
          this.downloading = false;
        }
      }, 300);
    },
    async getUserType() {
      this.userType = await this.store.getCurrentUserType;
    },
    async getUser() {
      this.user = await this.store.getCurrentUser;
    },
    async getToday() {
      const date = new Date().toISOString().slice(0, 10);
      const [year, month, day] = date.split('-');
      this.startDate = `${year}-${month}-${day}`;
      this.endDate = `${year}-${month}-${day}`;
      await this.refresh();
    },
    async getCurrentMonth() {
      const date = new Date().toISOString().slice(0, 10);
      const [year, month, day] = date.split('-');
      this.startDate = `${year}-${month}-01`;
      this.endDate = `${year}-${month}-${day}`;
      await this.refresh();
    },
    async getLastMonth() {
      const date = new Date().toISOString().slice(0, 10);
      this.startDate = new DateModel(date).substractMonths(1).toString();
      this.endDate = new DateModel(this.startDate).endOfMonth().toString();
      await this.refresh();
    },
    async getLastThreeMonths() {
      const date = new Date().toISOString().slice(0, 10);
      this.startDate = new DateModel(date).substractMonths(3).toString();
      this.endDate = new DateModel(date).substractMonths(1).endOfMonth().toString();
      await this.refresh();
    },
    getPercentage(value, total) {
      const percentage = (value * 100) / total;
      return parseFloat(percentage.toFixed(2), 2) || 0;
    },
    calculateDaysInPeriod(startDate, endDate) {
      if (!startDate || !endDate) return 0;
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0); // Normalize to start of day
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999); // Normalize to end of day
      const diffTime = end - start;
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      return diffDays + 1; // +1 to include both start and end dates
    },
    calculateDaysUntilMonthEnd() {
      const today = new Date();
      const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      const diffTime = lastDayOfMonth - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 0 ? diffDays : 0;
    },
    getTrendsChartData() {
      if (!this.trends || !this.trends.monthlyData || this.trends.monthlyData.length === 0) {
        return { labels: [], datasets: [] };
      }

      const labels = this.trends.monthlyData.map(m => m.monthLabel);
      const incomesData = this.trends.monthlyData.map(m => m.incomes);
      const outcomesData = this.trends.monthlyData.map(m => m.outcomes);
      const profitData = this.trends.monthlyData.map(m => m.profit);
      const averageIncomesLine = this.trends.monthlyData.map(() => this.trends.averageIncomes);
      const averageOutcomesLine = this.trends.monthlyData.map(() => this.trends.averageOutcomes);

      return {
        labels,
        datasets: [
          {
            label: this.$t('dashboard.incomes'),
            borderColor: '#004aad',
            backgroundColor: 'rgba(0, 74, 173, 0.1)',
            data: incomesData,
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 5,
          },
          {
            label: this.$t('dashboard.outcomes'),
            borderColor: '#a52a2a',
            backgroundColor: 'rgba(165, 42, 42, 0.1)',
            data: outcomesData,
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 5,
          },
          {
            label: this.$t('businessFinancial.kpis.netProfit'),
            borderColor: '#00c2cb',
            backgroundColor: 'rgba(0, 194, 203, 0.1)',
            data: profitData,
            fill: true,
            tension: 0.4,
            pointRadius: 3,
            pointHoverRadius: 5,
          },
          {
            label: this.$t('businessFinancial.trends.averageIncomes'),
            borderColor: '#004aad',
            backgroundColor: 'transparent',
            data: averageIncomesLine,
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 0,
          },
          {
            label: this.$t('businessFinancial.trends.averageOutcomes'),
            borderColor: '#a52a2a',
            backgroundColor: 'transparent',
            data: averageOutcomesLine,
            borderDash: [5, 5],
            fill: false,
            pointRadius: 0,
            pointHoverRadius: 0,
          },
        ],
      };
    },
    getTrendsChartOptions() {
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'top',
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: context => {
                const label = context.dataset.label || '';
                const value = context.parsed.y || 0;
                return `${label}: ${value.toLocaleString('de-DE', {
                  style: 'currency',
                  currency: 'BRL',
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback(value) {
                return value.toLocaleString('de-DE', {
                  style: 'currency',
                  currency: 'BRL',
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                });
              },
            },
          },
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false,
        },
      };
    },
    getCategoryChartData() {
      if (
        !this.outcomesCategoryAnalysis ||
        !this.outcomesCategoryAnalysis.current ||
        Object.keys(this.outcomesCategoryAnalysis.current).length === 0
      ) {
        return null;
      }

      const categories = Object.keys(this.outcomesCategoryAnalysis.current);
      const labels = categories.map(
        cat => cat || this.$t('businessFinancial.categories.uncategorized'),
      );
      const data = categories.map(
        cat => +this.outcomesCategoryAnalysis.current[cat]?.totalAmount || 0
      );

      return {
        labels,
        datasets: [
          {
            data,
            backgroundColor: [
              '#a52a2a',
              '#dc3545',
              '#fd7e14',
              '#ffc107',
              '#20c997',
              '#0dcaf0',
              '#6f42c1',
              '#e91e63',
            ],
            borderWidth: 2,
            borderColor: '#ffffff',
          },
        ],
      };
    },
    getCategoryChartOptions() {
      return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
          },
          tooltip: {
            callbacks: {
              label: context => {
                const label = context.label || '';
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage = total > 0 ? ((value / total) * 100).toFixed(2) : 0;
                return `${label}: ${value.toLocaleString('de-DE', {
                  style: 'currency',
                  currency: 'BRL',
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} (${percentage}%)`;
              },
            },
          },
        },
      };
    },
  },
  watch: {
    store: {
      immediate: true,
      deep: true,
      async handler() {
        await this.getUserType();
        await this.getUser();
      },
    },
  },
};
</script>

<style scoped>
/* Report Cards - matching modern-metric-card style - compact */
.report-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 251, 252, 0.98) 100%);
  backdrop-filter: blur(10px);
  border-radius: 10px;
  border: 1px solid rgba(169, 169, 169, 0.2);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  cursor: pointer;
  line-height: 1;
}

.report-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #00c2cb 0%, #00c4cc 50%, #00c2cb 100%);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.report-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border-color: rgba(169, 169, 169, 0.3);
}

.report-card:hover::before {
  opacity: 0.6;
}

.report-card .btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Ensure all cards have same height and alignment */
.col-md-6.d-flex,
.col-12.d-flex,
.col-12.col-md-6.col-lg-4.d-flex {
  min-height: 100%;
}

.col-md-6.d-flex .w-100.h-100,
.col-12.d-flex .w-100.h-100,
.col-12.col-md-6.col-lg-4.d-flex .w-100.h-100 {
  display: flex;
  flex-direction: column;
}

/* Ensure consistent card widths */
.row > [class*='col-'] {
  padding-left: 0.75rem;
  padding-right: 0.75rem;
}

.cursor-pointer {
  cursor: pointer;
  user-select: none;
}

.cursor-pointer:hover {
  opacity: 0.8;
}

/* Projected Cash Flow Card Styling - matching modern-metric-card style */
.projected-cash-flow-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 251, 252, 0.98) 100%);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(169, 169, 169, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.projected-cash-flow-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #00c2cb 0%, #00c4cc 50%, #00c2cb 100%);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.projected-cash-flow-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border-color: rgba(169, 169, 169, 0.3);
}

.projected-cash-flow-card:hover::before {
  opacity: 0.6;
}

.projected-cash-flow-card .badge {
  font-size: 0.9rem;
  font-weight: 600;
}

.projected-cash-flow-card i {
  font-size: 1.25rem;
}

/* Monthly Goal Card Styling - matching modern-metric-card style */
.monthly-goal-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 251, 252, 0.98) 100%);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(169, 169, 169, 0.2);
  border-left: 3px solid #004aad;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.monthly-goal-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #00c2cb 0%, #00c4cc 50%, #00c2cb 100%);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.monthly-goal-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border-color: rgba(169, 169, 169, 0.3);
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.05) 0%, rgba(0, 74, 173, 0.02) 100%);
}

.monthly-goal-card:hover::before {
  opacity: 0.6;
}

.monthly-goal-card .badge {
  font-size: 0.9rem;
  font-weight: 600;
}

.monthly-goal-card i {
  font-size: 1.25rem;
}

/* Modern Card - unified style for all cards without borders */
.modern-card {
  border-left: 4px solid #004aad;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 251, 252, 0.98) 100%);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  border: 1px solid rgba(169, 169, 169, 0.2);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.modern-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #00c2cb 0%, #00c4cc 50%, #00c2cb 100%);
  opacity: 0;
  transition: opacity 0.2s ease;
}

.modern-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  border-color: rgba(169, 169, 169, 0.3);
}

.modern-card:hover::before {
  opacity: 0.6;
}

/* Mini Metric Cards - for YoY and Average metrics */
.modern-metric-mini-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(250, 251, 252, 0.98) 100%);
  backdrop-filter: blur(10px);
  border-radius: 8px;
  border: 1px solid rgba(169, 169, 169, 0.2);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.modern-metric-mini-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  border-color: rgba(169, 169, 169, 0.3);
}
</style>

<template>
  <div>
    <!-- Expose filters slot for desktop - rendered outside main content conditional -->
    <slot
      v-if="filtersLocation === 'slot'"
      name="filters-exposed"
      :clear="clear"
      :get-today="getToday"
      :get-current-month="getCurrentMonth"
      :get-last-month="getLastMonth"
      :get-last-three-months="getLastThreeMonths"
      :refresh="refresh"
      :start-date="startDate"
      :end-date="endDate"
      :loading="loading"
    ></slot>

    <div>
      <div
        id="financialResume-management"
        class="row"
        v-if="showResumeFinancialManagement === true && toggles['financial.resume.view']"
      >
        <div class="col">
          <div id="attention-management-component">
            <Spinner :show="loading"></Spinner>
            <Alert :show="loading" :stack="alertError"></Alert>
            <div>
              <div>
                <div>
                  <!-- Reports Download Section - Collapsable -->
                  <div id="admin-sub-menu" class="row mb-3 mx-0">
                    <div class="col-12">
                      <div class="modern-card p-2">
                        <div
                          class="d-flex justify-content-between align-items-center mb-2 cursor-pointer"
                          @click="reportsCollapsed = !reportsCollapsed"
                          style="cursor: pointer"
                        >
                          <h6 class="fw-bold mb-0" style="font-size: 0.95rem">
                            <i class="bi bi-file-earmark-arrow-down me-2"></i>
                            {{ $t('businessFinancial.reports.title') }}
                          </h6>
                          <i
                            :class="`bi ${reportsCollapsed ? 'bi-chevron-down' : 'bi-chevron-up'}`"
                            class="fs-6"
                          ></i>
                        </div>
                        <div v-show="!reportsCollapsed" class="row">
                          <!-- Resume Report -->
                          <div class="col-12 col-md-6 col-lg-4 mb-2 d-flex">
                            <div
                              class="report-card p-2 w-100 h-100 d-flex flex-column"
                              :class="{
                                'opacity-50': !toggles['financial.reports.resume'],
                              }"
                            >
                              <div class="d-flex align-items-center mb-1">
                                <i class="bi bi-file-earmark-pdf-fill text-primary fs-5 me-2"></i>
                                <span class="fw-bold" style="font-size: 0.875rem">{{
                                  $t('businessFinancial.reports.resume.title')
                                }}</span>
                              </div>
                              <p
                                class="text-muted small mb-2 flex-grow-1"
                                style="font-size: 0.75rem; line-height: 1.3"
                              >
                                {{ $t('businessFinancial.reports.resume.description') }}
                              </p>
                              <button
                                class="btn btn-sm btn-primary w-100"
                                style="font-size: 0.75rem; padding: 0.25rem 0.5rem"
                                @click="() => {
                                  exportToPDF();
                                }"
                                :disabled="!toggles['financial.reports.resume']"
                              >
                                <i class="bi bi-download me-1"></i>
                                {{ $t('businessFinancial.reports.download') }}
                              </button>
                            </div>
                          </div>

                          <!-- Cash Flow Report -->
                          <div class="col-12 col-md-6 col-lg-4 mb-2 d-flex">
                            <div
                              class="report-card p-2 w-100 h-100 d-flex flex-column"
                              :class="{
                                'opacity-50': !toggles['financial.reports.cashFlow'],
                              }"
                            >
                              <div class="d-flex align-items-center mb-1">
                                <i class="bi bi-graph-up-arrow text-success fs-5 me-2"></i>
                                <span class="fw-bold" style="font-size: 0.875rem">{{
                                  $t('businessFinancial.reports.cashFlow.title')
                                }}</span>
                              </div>
                              <p
                                class="text-muted small mb-2 flex-grow-1"
                                style="font-size: 0.75rem; line-height: 1.3"
                              >
                                {{ $t('businessFinancial.reports.cashFlow.description') }}
                              </p>
                              <button
                                class="btn btn-sm btn-success w-100"
                                style="font-size: 0.75rem; padding: 0.25rem 0.5rem"
                                @click="downloadCashFlowReport"
                                :disabled="!toggles['financial.reports.cashFlow']"
                              >
                                <i class="bi bi-download me-1"></i>
                                {{ $t('businessFinancial.reports.download') }}
                              </button>
                            </div>
                          </div>

                          <!-- Service Profitability Report -->
                          <div class="col-12 col-md-6 col-lg-4 mb-2 d-flex">
                            <div
                              class="report-card p-2 w-100 h-100 d-flex flex-column"
                              :class="{
                                'opacity-50': !toggles['financial.reports.serviceProfitability'],
                              }"
                            >
                              <div class="d-flex align-items-center mb-1">
                                <i class="bi bi-bar-chart-fill text-info fs-5 me-2"></i>
                                <span class="fw-bold" style="font-size: 0.875rem">{{
                                  $t('businessFinancial.reports.serviceProfitability.title')
                                }}</span>
                              </div>
                              <p
                                class="text-muted small mb-2 flex-grow-1"
                                style="font-size: 0.75rem; line-height: 1.3"
                              >
                                {{
                                  $t('businessFinancial.reports.serviceProfitability.description')
                                }}
                              </p>
                              <button
                                class="btn btn-sm btn-info w-100"
                                style="font-size: 0.75rem; padding: 0.25rem 0.5rem"
                                @click="downloadServiceProfitabilityReport"
                                :disabled="!toggles['financial.reports.serviceProfitability']"
                              >
                                <i class="bi bi-download me-1"></i>
                                {{ $t('businessFinancial.reports.download') }}
                              </button>
                            </div>
                          </div>

                          <!-- Most Profitable Clients Report -->
                          <div class="col-12 col-md-6 col-lg-4 mb-2 d-flex">
                            <div
                              class="report-card p-2 w-100 h-100 d-flex flex-column"
                              :class="{
                                'opacity-50': !toggles['financial.reports.mostProfitableClients'],
                              }"
                            >
                              <div class="d-flex align-items-center mb-1">
                                <i class="bi bi-people-fill text-warning fs-5 me-2"></i>
                                <span class="fw-bold" style="font-size: 0.875rem">{{
                                  $t('businessFinancial.reports.mostProfitableClients.title')
                                }}</span>
                              </div>
                              <p
                                class="text-muted small mb-2 flex-grow-1"
                                style="font-size: 0.75rem; line-height: 1.3"
                              >
                                {{
                                  $t('businessFinancial.reports.mostProfitableClients.description')
                                }}
                              </p>
                              <button
                                class="btn btn-sm btn-warning w-100"
                                style="font-size: 0.75rem; padding: 0.25rem 0.5rem"
                                @click="downloadMostProfitableClientsReport"
                                :disabled="!toggles['financial.reports.mostProfitableClients']"
                              >
                                <i class="bi bi-download me-1"></i>
                                {{ $t('businessFinancial.reports.download') }}
                              </button>
                            </div>
                          </div>

                          <!-- Expenses by Provider Report -->
                          <div class="col-12 col-md-6 col-lg-4 mb-2 d-flex">
                            <div
                              class="report-card p-2 w-100 h-100 d-flex flex-column"
                              :class="{
                                'opacity-50': !toggles['financial.reports.expensesByProvider'],
                              }"
                            >
                              <div class="d-flex align-items-center mb-1">
                                <i class="bi bi-building text-danger fs-5 me-2"></i>
                                <span class="fw-bold" style="font-size: 0.875rem">{{
                                  $t('businessFinancial.reports.expensesByProvider.title')
                                }}</span>
                              </div>
                              <p
                                class="text-muted small mb-2 flex-grow-1"
                                style="font-size: 0.75rem; line-height: 1.3"
                              >
                                {{ $t('businessFinancial.reports.expensesByProvider.description') }}
                              </p>
                              <button
                                class="btn btn-sm btn-danger w-100"
                                style="font-size: 0.75rem; padding: 0.25rem 0.5rem"
                                @click="downloadExpensesByProviderReport"
                                :disabled="!toggles['financial.reports.expensesByProvider']"
                              >
                                <i class="bi bi-download me-1"></i>
                                {{ $t('businessFinancial.reports.download') }}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <!-- Filters Section - Can be shown in component or exposed via slot -->
                  <div v-if="filtersLocation === 'component'" class="my-2 row">
                    <div class="col-12">
                      <span class="metric-card-subtitle">
                        <span
                          class="form-check-label metric-keyword-subtitle mx-1"
                          @click="showFilters()"
                        >
                          <i class="bi bi-search"></i> {{ $t('dashboard.aditionalFilters') }}
                        </span>
                      </span>
                      <button
                        class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3 py-1 mx-1"
                        @click="clear()"
                      >
                        <span><i class="bi bi-eraser-fill"></i></span>
                      </button>
                      <button
                        class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3 py-1 mx-1"
                        @click="clear()"
                        :disabled="loading"
                      >
                        <span><i class="bi bi-arrow-clockwise"></i></span>
                      </button>
                    </div>
                    <div>
                      <div class="row my-1">
                        <div class="col-3">
                          <button
                            class="btn btn-dark rounded-pill px-2 metric-filters"
                            @click="getToday()"
                            :disabled="loading"
                          >
                            {{ $t('dashboard.today') }}
                          </button>
                        </div>
                        <div class="col-3">
                          <button
                            class="btn btn-dark rounded-pill px-2 metric-filters"
                            @click="getCurrentMonth()"
                            :disabled="loading"
                          >
                            {{ $t('dashboard.thisMonth') }}
                          </button>
                        </div>
                        <div class="col-3">
                          <button
                            class="btn btn-dark rounded-pill px-2 metric-filters"
                            @click="getLastMonth()"
                            :disabled="loading"
                          >
                            {{ $t('dashboard.lastMonth') }}
                          </button>
                        </div>
                        <div class="col-3">
                          <button
                            class="btn btn-dark rounded-pill px-2 metric-filters"
                            @click="getLastThreeMonths()"
                            :disabled="loading"
                          >
                            {{ $t('dashboard.lastThreeMonths') }}
                          </button>
                        </div>
                      </div>
                      <div class="m-1">
                        <div class="row">
                          <div class="col-5">
                            <input
                              id="startDate"
                              class="form-control metric-controls"
                              type="date"
                              v-model="startDate"
                            />
                          </div>
                          <div class="col-5">
                            <input
                              id="endDate"
                              class="form-control metric-controls"
                              type="date"
                              v-model="endDate"
                            />
                          </div>
                          <div class="col-2">
                            <button
                              class="btn btn-sm btn-size fw-bold btn-dark rounded-pill px-3 py-2"
                              @click="refresh()"
                            >
                              <span><i class="bi bi-search"></i></span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div id="financial-component" v-if="this.financialResume">
                <PDFHeader
                  :show="toggles['financial.reports.resume']"
                  :title="$t('businessFinancial.reports.resume.title')"
                  :start-date="startDate"
                  :end-date="endDate"
                  :commerce="commerce"
                >
                </PDFHeader>
                <div>
                  <!-- KPIs Section - 2 per row with same height -->
                  <div
                    v-if="calculatedMetrics && Object.keys(calculatedMetrics).length > 0"
                    class="row mb-3 kpi-cards-container"
                  >
                    <div class="col-12 col-md-6 mb-3 d-flex">
                      <FinancialKPICard
                        :show="true"
                        :title="$t('businessFinancial.kpis.totalIncomes')"
                        :value="
                          calculatedMetrics['incomes.created']?.paymentData?.paymentAmountSum || 0
                        "
                        :change="comparison?.comparison?.incomes"
                        :change-label="$t('businessFinancial.kpis.vsPreviousMonth')"
                        icon="bi-arrow-down-circle-fill"
                        icon-style-class="green-icon"
                        :format-currency="true"
                        :show-tooltip="true"
                        :description="$t('businessFinancial.kpis.tooltips.totalIncomes')"
                        class="w-100 h-100"
                      />
                    </div>
                    <div class="col-12 col-md-6 mb-3 d-flex">
                      <FinancialKPICard
                        :show="true"
                        :title="$t('businessFinancial.kpis.totalOutcomes')"
                        :value="
                          calculatedMetrics['outcomes.created']?.paymentData?.paymentAmountSum || 0
                        "
                        :change="comparison?.comparison?.outcomes"
                        :change-label="$t('businessFinancial.kpis.vsPreviousMonth')"
                        icon="bi-arrow-up-circle-fill"
                        icon-style-class="red-icon"
                        :format-currency="true"
                        :show-tooltip="true"
                        :description="$t('businessFinancial.kpis.tooltips.totalOutcomes')"
                        class="w-100 h-100"
                      />
                    </div>
                    <div class="col-12 col-md-6 mb-3 d-flex">
                      <FinancialKPICard
                        :show="true"
                        :title="$t('businessFinancial.kpis.netProfit')"
                        :value="financialResume.resume.diff || 0"
                        :change="comparison?.comparison?.profit"
                        :change-label="$t('businessFinancial.kpis.vsPreviousMonth')"
                        icon="bi-graph-up-arrow"
                        icon-style-class="green-icon"
                        :format-currency="true"
                        :show-tooltip="true"
                        :description="$t('businessFinancial.kpis.tooltips.netProfit')"
                        class="w-100 h-100"
                      />
                    </div>
                    <div class="col-12 col-md-6 mb-3 d-flex">
                      <FinancialKPICard
                        :show="true"
                        :title="$t('businessFinancial.kpis.profitMargin')"
                        :value="financialResume.resume.avg || 0"
                        :change="comparison?.comparison?.margin"
                        :change-label="$t('businessFinancial.kpis.vsPreviousMonth')"
                        icon="bi-percent"
                        icon-style-class="blue-icon"
                        :format-currency="false"
                        :format-percentage="true"
                        :show-tooltip="true"
                        :description="$t('businessFinancial.kpis.tooltips.profitMargin')"
                        class="w-100 h-100"
                      />
                    </div>
                    <div class="col-12 col-md-6 mb-3 d-flex">
                      <FinancialKPICard
                        :show="true"
                        :title="$t('businessFinancial.kpis.averageDailyIncome')"
                        :value="financialResume.resume.averageDailyIncome || 0"
                        icon="bi-calendar-day"
                        icon-style-class="blue-icon"
                        :format-currency="true"
                        :show-tooltip="true"
                        :description="$t('businessFinancial.kpis.tooltips.averageDailyIncome')"
                        class="w-100 h-100"
                      />
                    </div>
                    <div class="col-12 col-md-6 mb-3 d-flex">
                      <FinancialKPICard
                        :show="true"
                        :title="$t('businessFinancial.kpis.daysUntilMonthEnd')"
                        :value="financialResume.resume.daysUntilMonthEnd || 0"
                        icon="bi-calendar-check"
                        icon-style-class="yellow-icon"
                        :format-currency="false"
                        :show-tooltip="true"
                        :description="$t('businessFinancial.kpis.tooltips.daysUntilMonthEnd')"
                        class="w-100 h-100"
                      />
                    </div>
                  </div>

                  <!-- Alerts Section -->
                  <div class="row mb-3">
                    <div class="col-12">
                      <FinancialAlerts
                        :show="true"
                        :alerts="alerts"
                        :health-status="healthStatus"
                      />
                    </div>
                  </div>

                  <!-- Projected Cash Flow and Goal Progress -->
                  <div
                    v-if="financialResume.resume.projectedCashFlow !== undefined"
                    class="row mb-1 mx-0"
                  >
                    <div class="col-12 mb-3 d-flex">
                      <div class="card p-3 w-100 h-100 projected-cash-flow-card">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                          <div class="d-flex align-items-center">
                            <i
                              class="bi bi-cash-stack me-2"
                              :class="
                                financialResume.resume.projectedCashFlow >= 0
                                  ? 'text-success'
                                  : 'text-danger'
                              "
                            ></i>
                            <span class="fw-bold">{{
                              $t('businessFinancial.projectedCashFlow')
                            }}</span>
                          </div>
                          <span
                            class="badge rounded-pill px-3 py-2"
                            :class="
                              (financialResume.resume.projectedCashFlow || 0) >= 0
                                ? 'bg-success'
                                : 'bg-danger'
                            "
                          >
                            {{
                              (financialResume.resume.projectedCashFlow || 0).toLocaleString(
                                'de-DE',
                                {
                                  style: 'currency',
                                  currency: 'BRL',
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                }
                              )
                            }}
                          </span>
                        </div>
                        <div class="small text-muted mt-2">
                          {{ $t('businessFinancial.projectedCashFlowDescription') }}
                          <span
                            v-if="financialResume.resume.daysUntilMonthEnd > 0"
                            class="d-block mt-1"
                          >
                            {{
                              $t('businessFinancial.projectedCashFlowDays', {
                                days: financialResume.resume.daysUntilMonthEnd,
                              })
                            }}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div
                      v-if="financialResume.resume.monthlyGoal > 0"
                      class="col-12 col-md-6 mb-3 d-flex"
                    >
                      <div class="card p-3 w-100 h-100 monthly-goal-card">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                          <div class="d-flex align-items-center">
                            <i class="bi bi-bullseye me-2 text-primary"></i>
                            <span class="fw-bold">{{ $t('businessFinancial.monthlyGoal') }}</span>
                          </div>
                          <span class="badge bg-primary rounded-pill px-3 py-2">
                            {{ (financialResume.resume.goalProgress || 0).toFixed(1) }}%
                          </span>
                        </div>
                        <div class="progress mt-2" style="height: 20px; border-radius: 10px">
                          <div
                            class="progress-bar"
                            :class="
                              (financialResume.resume.goalProgress || 0) >= 100
                                ? 'bg-success'
                                : (financialResume.resume.goalProgress || 0) >= 70
                                ? 'bg-warning'
                                : 'bg-danger'
                            "
                            :style="`width: ${Math.min(
                              financialResume.resume.goalProgress || 0,
                              100
                            )}%`"
                            style="border-radius: 10px"
                          >
                            {{ (financialResume.resume.goalProgress || 0).toFixed(1) }}%
                          </div>
                        </div>
                        <div class="small text-muted mt-2">
                          {{
                            (
                              calculatedMetrics['incomes.created']?.paymentData?.paymentAmountSum ||
                              0
                            ).toLocaleString('de-DE', {
                              style: 'currency',
                              currency: 'BRL',
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          }}
                          /
                          {{
                            financialResume.resume.monthlyGoal.toLocaleString('de-DE', {
                              style: 'currency',
                              currency: 'BRL',
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })
                          }}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="row">
                    <div v-if="calculatedMetrics && Object.keys(calculatedMetrics).length > 0">
                      <div class="modern-card m-2" v-if="calculatedMetrics['incomes.created']">
                        <div class="fw-bold mb-2">
                          <span> {{ $t('dashboard.incomes') }} </span>
                        </div>
                        <IncomesCollectionDetails
                          :show="!!toggles['financial.reports.resume']"
                          :distribution="calculatedMetrics['incomes.created'].paymentData"
                          :count="
                            calculatedMetrics['incomes.created']['paymentData'].paymentCounter || 0
                          "
                          :distribution-payment="
                            calculatedMetrics['incomes.created'].paymentDistribution
                          "
                          :distribution-type="
                            calculatedMetrics['incomes.created'].paymentTypeDistribution
                          "
                          :distribution-method="
                            calculatedMetrics['incomes.created'].paymentMethodDistribution
                          "
                          :distribution-fiscal-note="
                            calculatedMetrics['incomes.created'].paymentFiscalNoteDistribution
                          "
                          :details-opened="detailsOpened"
                        >
                        </IncomesCollectionDetails>
                      </div>
                      <div class="modern-card m-2" v-if="calculatedMetrics['outcomes.created']">
                        <div class="fw-bold mb-2">
                          <span> {{ $t('dashboard.outcomes') }} </span>
                        </div>
                        <OutcomesCollectionDetails
                          :show="!!toggles['financial.reports.resume']"
                          :distribution="calculatedMetrics['outcomes.created'].paymentData"
                          :distribution-payment="
                            calculatedMetrics['outcomes.created'].paymentDistribution
                          "
                          :count="
                            calculatedMetrics['outcomes.created']['paymentData'].paymentCounter || 0
                          "
                          :distribution-type="
                            calculatedMetrics['outcomes.created'].paymentTypeDistribution
                          "
                          :details-opened="detailsOpened"
                        >
                        </OutcomesCollectionDetails>
                      </div>
                    </div>
                  </div>
                  <!-- Charts Section -->
                  <div class="row mx-0 mt-3">
                    <!-- Evolution Chart -->
                    <div
                      class="col-12 col-lg-6 mb-3"
                      v-if="
                        financialResume.evolution &&
                        financialResume.evolution.chartData &&
                        financialResume.evolution.chartData.datasets &&
                        financialResume.evolution.chartData.datasets.length > 0
                      "
                    >
                      <div class="modern-card p-3" style="min-height: 500px; max-height: 500px; display: flex; flex-direction: column;">
                        <div class="fw-bold mb-2" style="flex-shrink: 0; font-size: 0.9rem;">
                          <span>{{ $t('businessFinancial.evolution') }} </span>
                        </div>
                        <div>
                          <LineChart
                            :chart-data="financialResume.evolution.chartData"
                            :options="financialResume.evolution.options"
                          />
                        </div>
                      </div>
                    </div>

                    <!-- Income Distribution Donut Chart -->
                    <div
                      class="col-12 col-lg-6 mb-3"
                      v-if="
                        financialResume.incomeDistribution &&
                        financialResume.incomeDistribution.chartData &&
                        financialResume.incomeDistribution.chartData.labels &&
                        financialResume.incomeDistribution.chartData.labels.length > 0
                      "
                    >
                      <div class="modern-card p-3" style="min-height: 500px; max-height: 500px; display: flex; flex-direction: column; overflow: hidden;">
                        <div class="fw-bold mb-2" style="flex-shrink: 0; font-size: 0.9rem;">
                          <span>{{ $t('businessFinancial.distribution.title') }} </span>
                        </div>
                        <div style="height: 300px; width: 100%; padding:1rem" class="centered">
                          <DoughnutChart
                            :chart-data="financialResume.incomeDistribution.chartData"
                            :options="financialResume.incomeDistribution.options"
                          />
                        </div>
                        <div class="mt-2" style="flex: 1; overflow-y: auto; min-height: 0;">
                          <div
                            v-for="(label, index) in financialResume.incomeDistribution.chartData
                              .labels"
                            :key="index"
                            class="d-flex justify-content-between align-items-center mb-1"
                          >
                            <div class="d-flex align-items-center">
                              <div
                                class="distribution-color-indicator me-2"
                                style="width: 12px; height: 12px; border-radius: 2px;"
                                :style="{
                                  backgroundColor:
                                    financialResume.incomeDistribution.chartData.datasets[0]
                                      .backgroundColor[index],
                                }"
                              ></div>
                              <span class="small">{{ label }}</span>
                            </div>
                            <span class="small fw-bold">
                              {{
                                financialResume.incomeDistribution.chartData.datasets[0].data[
                                  index
                                ].toLocaleString('de-DE', {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })
                              }}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Professional Incomes Card -->
                    <div
                      class="col-12 mb-3"
                      v-if="
                        financialResume.professionalIncomes &&
                        financialResume.professionalIncomes.list &&
                        financialResume.professionalIncomes.list.length > 0
                      "
                    >
                      <div class="modern-card p-3" style="min-height: 400px; max-height: 400px; display: flex; flex-direction: column; overflow: hidden;">
                        <div class="fw-bold mb-3" style="flex-shrink: 0; font-size: 0.9rem;">
                          <span>{{ $t('businessFinancial.professionalIncomes.title') }} </span>
                        </div>
                        <div class="row g-3" style="flex: 1; min-height: 0; overflow: hidden;">
                          <!-- Chart Section -->
                          <div class="col-12 col-md-6 d-flex align-items-center justify-content-center" style="min-height: 300px;">
                            <div style="width: 100%; max-width: 300px; height: 300px;">
                              <DoughnutChart
                                :chart-data="financialResume.professionalIncomes.chartData"
                                :options="financialResume.professionalIncomes.options"
                              />
                            </div>
                          </div>
                          <!-- List Section -->
                          <div class="col-12 col-md-6 d-flex flex-column" style="min-height: 0; overflow: hidden;">
                            <!-- Header -->
                            <div class="d-flex align-items-center py-2 px-2 fw-bold" style="border-bottom: 2px solid rgba(0, 0, 0, 0.1); font-size: 0.8rem; background-color: rgba(0, 0, 0, 0.02); flex-shrink: 0;">
                              <div style="width: 10px; flex-shrink: 0;"></div>
                              <div class="flex-grow-1 d-flex align-items-center justify-content-between" style="min-width: 0;">
                                <div style="max-width: 40%;">
                                  {{ $t('businessFinancial.filters.professional') || 'Profesional' }}
                                </div>
                                <div class="d-flex align-items-center gap-3" style="flex-shrink: 0;">
                                  <div class="text-center" style="min-width: 100px;">
                                    <span class="badge bg-primary" style="font-size: 0.65rem; padding: 0.2rem 0.4rem;">
                                      {{ $t('businessFinancial.professionalIncomes.grossIncome') }}
                                    </span>
                                  </div>
                                  <div class="text-center" style="min-width: 100px;">
                                    <span class="badge bg-warning text-dark" style="font-size: 0.65rem; padding: 0.2rem 0.4rem;">
                                      {{ $t('businessFinancial.commission') }}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <!-- List with scroll -->
                            <div style="overflow-y: auto; max-height: 320px; min-height: 0; flex: 1;">
                              <div
                                v-for="(professional, index) in financialResume.professionalIncomes.list"
                                :key="professional.id"
                                class="d-flex align-items-center py-2 px-2"
                                style="border-bottom: 1px solid rgba(0, 0, 0, 0.05); min-height: 40px;"
                              >
                                <div
                                  class="distribution-color-indicator me-2"
                                  style="width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0;"
                                  :style="{
                                    backgroundColor:
                                      financialResume.professionalIncomes.chartData.datasets[0]
                                        .backgroundColor[index],
                                  }"
                                ></div>
                                <div class="flex-grow-1 d-flex align-items-center justify-content-between" style="min-width: 0;">
                                  <div class="fw-bold text-truncate me-2" style="font-size: 0.85rem; max-width: 40%;">
                                    {{ professional.name }}
                                  </div>
                                  <div class="d-flex align-items-center gap-3" style="flex-shrink: 0;">
                                    <div class="text-end fw-bold" style="font-size: 0.8rem; white-space: nowrap; min-width: 100px;">
                                      {{ professional.totalAmount.toLocaleString('de-DE', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      }) }}
                                    </div>
                                    <div class="text-end fw-bold" style="font-size: 0.8rem; white-space: nowrap; min-width: 100px;">
                                      {{ professional.totalCommission.toLocaleString('de-DE', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      }) }}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Trends Section -->
                  <div v-if="trends && trends.averageIncomes !== undefined" class="row mb-3 mx-0">
                    <div class="col-12">
                      <div class="modern-card p-4">
                        <div class="fw-bold mb-3">
                          <span>{{ $t('businessFinancial.trends.title') }}</span>
                        </div>

                        <!-- Year over Year Comparison -->
                        <div v-if="trends.yearOverYear" class="row mb-3">
                          <div class="col-12">
                            <h6 class="fw-bold">
                              {{ $t('businessFinancial.trends.yearOverYear') }}
                            </h6>
                            <div class="row">
                              <div class="col-6 col-md-3 mb-2">
                                <div class="text-center p-2 modern-metric-mini-card">
                                  <div class="small text-muted">
                                    {{ $t('businessFinancial.kpis.totalIncomes') }}
                                  </div>
                                  <div
                                    class="fw-bold"
                                    :class="
                                      trends.yearOverYear.incomes >= 0
                                        ? 'text-success'
                                        : 'text-danger'
                                    "
                                  >
                                    <i
                                      :class="`bi ${
                                        trends.yearOverYear.incomes >= 0
                                          ? 'bi-arrow-up'
                                          : 'bi-arrow-down'
                                      }`"
                                    ></i>
                                    {{ Math.abs(trends.yearOverYear.incomes).toFixed(2) }}%
                                  </div>
                                </div>
                              </div>
                              <div class="col-6 col-md-3 mb-2">
                                <div class="text-center p-2 modern-metric-mini-card">
                                  <div class="small text-muted">
                                    {{ $t('businessFinancial.kpis.totalOutcomes') }}
                                  </div>
                                  <div
                                    class="fw-bold"
                                    :class="
                                      trends.yearOverYear.outcomes >= 0
                                        ? 'text-danger'
                                        : 'text-success'
                                    "
                                  >
                                    <i
                                      :class="`bi ${
                                        trends.yearOverYear.outcomes >= 0
                                          ? 'bi-arrow-up'
                                          : 'bi-arrow-down'
                                      }`"
                                    ></i>
                                    {{ Math.abs(trends.yearOverYear.outcomes).toFixed(2) }}%
                                  </div>
                                </div>
                              </div>
                              <div class="col-6 col-md-3 mb-2">
                                <div class="text-center p-2 modern-metric-mini-card">
                                  <div class="small text-muted">
                                    {{ $t('businessFinancial.kpis.netProfit') }}
                                  </div>
                                  <div
                                    class="fw-bold"
                                    :class="
                                      trends.yearOverYear.profit >= 0
                                        ? 'text-success'
                                        : 'text-danger'
                                    "
                                  >
                                    <i
                                      :class="`bi ${
                                        trends.yearOverYear.profit >= 0
                                          ? 'bi-arrow-up'
                                          : 'bi-arrow-down'
                                      }`"
                                    ></i>
                                    {{ Math.abs(trends.yearOverYear.profit).toFixed(2) }}%
                                  </div>
                                </div>
                              </div>
                              <div class="col-6 col-md-3 mb-2">
                                <div class="text-center p-2 modern-metric-mini-card">
                                  <div class="small text-muted">
                                    {{ $t('businessFinancial.kpis.profitMargin') }}
                                  </div>
                                  <div
                                    class="fw-bold"
                                    :class="
                                      trends.yearOverYear.margin >= 0
                                        ? 'text-success'
                                        : 'text-danger'
                                    "
                                  >
                                    <i
                                      :class="`bi ${
                                        trends.yearOverYear.margin >= 0
                                          ? 'bi-arrow-up'
                                          : 'bi-arrow-down'
                                      }`"
                                    ></i>
                                    {{ Math.abs(trends.yearOverYear.margin).toFixed(2) }}%
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <!-- Average Metrics -->
                        <div class="row mb-3">
                          <div class="col-6 col-md-3 mb-2 d-flex">
                            <div
                              class="text-center p-2 modern-metric-mini-card w-100 h-100 d-flex flex-column justify-content-center"
                            >
                              <div class="small text-muted">
                                {{ $t('businessFinancial.trends.averageIncomes') }}
                              </div>
                              <div class="fw-bold">
                                {{
                                  trends.averageIncomes.toLocaleString('de-DE', {
                                    style: 'currency',
                                    currency: 'BRL',
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })
                                }}
                              </div>
                            </div>
                          </div>
                          <div class="col-6 col-md-3 mb-2 d-flex">
                            <div
                              class="text-center p-2 modern-metric-mini-card w-100 h-100 d-flex flex-column justify-content-center"
                            >
                              <div class="small text-muted">
                                {{ $t('businessFinancial.trends.averageOutcomes') }}
                              </div>
                              <div class="fw-bold">
                                {{
                                  trends.averageOutcomes.toLocaleString('de-DE', {
                                    style: 'currency',
                                    currency: 'BRL',
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })
                                }}
                              </div>
                            </div>
                          </div>
                          <div class="col-6 col-md-3 mb-2 d-flex">
                            <div
                              class="text-center p-2 modern-metric-mini-card w-100 h-100 d-flex flex-column justify-content-center"
                            >
                              <div class="small text-muted">
                                {{ $t('businessFinancial.trends.averageProfit') }}
                              </div>
                              <div class="fw-bold">
                                {{
                                  trends.averageProfit.toLocaleString('de-DE', {
                                    style: 'currency',
                                    currency: 'BRL',
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })
                                }}
                              </div>
                            </div>
                          </div>
                          <div class="col-6 col-md-3 mb-2 d-flex">
                            <div
                              class="text-center p-2 modern-metric-mini-card w-100 h-100 d-flex flex-column justify-content-center"
                            >
                              <div class="small text-muted">
                                {{ $t('businessFinancial.trends.averageMargin') }}
                              </div>
                              <div class="fw-bold">{{ trends.averageMargin.toFixed(2) }}%</div>
                            </div>
                          </div>
                        </div>

                        <!-- Trends Chart -->
                        <div style="height: 400px">
                          <LineChart
                            :chart-data="getTrendsChartData()"
                            :options="getTrendsChartOptions()"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- Outcomes Category Analysis Section -->
                  <div
                    v-if="
                      outcomesCategoryAnalysis &&
                      outcomesCategoryAnalysis.topCategories &&
                      outcomesCategoryAnalysis.topCategories.length > 0
                    "
                    class="row mb-3 mx-0"
                  >
                    <div class="col-12">
                      <div class="modern-card p-4">
                        <div class="fw-bold mb-3">
                          <span>{{ $t('businessFinancial.categories.title') }}</span>
                        </div>

                        <div class="row">
                          <!-- Category Distribution Chart -->
                          <div class="col-12 col-lg-6 mb-3">
                            <h6 class="fw-bold mb-3">
                              {{ $t('businessFinancial.categories.distribution') }}
                            </h6>
                            <div v-if="getCategoryChartData()" style="height: 80%">
                              <DoughnutChart
                                :chart-data="getCategoryChartData()"
                                :options="getCategoryChartOptions()"
                              />
                            </div>
                          </div>

                          <!-- Top 5 Categories -->
                          <div class="col-12 col-lg-6 mb-3">
                            <h6 class="fw-bold mb-3">
                              {{ $t('businessFinancial.categories.topCategories') }}
                            </h6>
                            <div class="list-group">
                              <div
                                v-for="category in outcomesCategoryAnalysis.topCategories"
                                :key="category.name"
                                class="list-group-item d-flex justify-content-between align-items-center"
                              >
                                <div class="d-flex align-items-center">
                                  <span class="badge bg-primary rounded-pill me-2">{{
                                    category.rank
                                  }}</span>
                                  <div>
                                    <div class="fw-bold">{{ category.name }}</div>
                                    <div class="small text-muted">
                                      {{ category.count }}
                                      {{ $t('businessFinancial.categories.transactions') }}
                                    </div>
                                  </div>
                                </div>
                                <div class="text-end">
                                  <div class="fw-bold">
                                    {{
                                      category.amount.toLocaleString('de-DE', {
                                        style: 'currency',
                                        currency: 'BRL',
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })
                                    }}
                                  </div>
                                  <div
                                    class="small"
                                    :class="category.change >= 0 ? 'text-danger' : 'text-success'"
                                  >
                                    <i
                                      :class="`bi ${
                                        category.change >= 0 ? 'bi-arrow-up' : 'bi-arrow-down'
                                      }`"
                                    ></i>
                                    {{ Math.abs(category.change).toFixed(2) }}%
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <!-- Category Comparison Table -->
                        <div v-if="outcomesCategoryAnalysis.comparison" class="mt-4">
                          <h6 class="fw-bold mb-3">
                            {{ $t('businessFinancial.categories.comparison') }}
                          </h6>
                          <div class="table-responsive">
                            <table class="table table-sm table-hover">
                              <thead>
                                <tr>
                                  <th>{{ $t('businessFinancial.categories.category') }}</th>
                                  <th class="text-end">
                                    {{ $t('businessFinancial.categories.currentPeriod') }}
                                  </th>
                                  <th class="text-end">
                                    {{ $t('businessFinancial.categories.previousPeriod') }}
                                  </th>
                                  <th class="text-end">
                                    {{ $t('businessFinancial.categories.change') }}
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr
                                  v-for="(
                                    comparison, categoryName
                                  ) in outcomesCategoryAnalysis.comparison"
                                  :key="categoryName"
                                >
                                  <td>
                                    {{
                                      categoryName ||
                                      $t('businessFinancial.categories.uncategorized')
                                    }}
                                  </td>
                                  <td class="text-end">
                                    {{
                                      comparison.currentAmount.toLocaleString('de-DE', {
                                        style: 'currency',
                                        currency: 'BRL',
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })
                                    }}
                                  </td>
                                  <td class="text-end">
                                    {{
                                      comparison.previousAmount.toLocaleString('de-DE', {
                                        style: 'currency',
                                        currency: 'BRL',
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2,
                                      })
                                    }}
                                  </td>
                                  <td
                                    class="text-end fw-bold"
                                    :class="comparison.change >= 0 ? 'text-danger' : 'text-success'"
                                  >
                                    <i
                                      :class="`bi ${
                                        comparison.change >= 0 ? 'bi-arrow-up' : 'bi-arrow-down'
                                      }`"
                                    ></i>
                                    {{ Math.abs(comparison.change).toFixed(2) }}%
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <PDFFooter :show="toggles['financial.reports.resume']"></PDFFooter>
              </div>
              <div v-else>
                <Message
                  :icon="'graph-up-arrow'"
                  :title="$t('dashboard.message.2.title')"
                  :content="$t('dashboard.message.2.content')"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div v-if="showResumeFinancialManagement === true && !toggles['financial.resume.view']">
        <Message
          :icon="'graph-up-arrow'"
          :title="$t('dashboard.message.1.title')"
          :content="$t('dashboard.message.1.content')"
        />
      </div>
    </div>

  </div>
</template>

<style scoped>
.metric-card {
  background-color: var(--color-background);
  padding: 0.5rem;
  margin: 0.5rem;
  margin-bottom: 0;
  border-radius: 0.5rem;
  border: 1px solid var(--gris-default);
}
.filter-card {
  background-color: var(--color-background);
  padding-top: 0.2rem;
  padding-bottom: 0.2rem;
  margin: 0.2rem;
  border-radius: 0.5rem;
  border: 0.5px solid var(--gris-default);
}
.metric-card-title {
  font-size: 0.8rem;
  font-weight: 500;
  line-height: 0.8rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
.metric-card-comment {
  font-size: 0.8rem;
  font-weight: 500;
  line-height: 0.9rem;
}
.metric-card-number {
  font-size: 1.2rem;
  font-weight: 700;
}
.metric-keyword-tag {
  font-size: 0.6rem;
  font-weight: 400;
  cursor: pointer;
}
.metric-keyword-tag-selected {
  font-size: 0.6rem;
  font-weight: 400;
  background-color: var(--azul-es) !important;
}
.metric-keyword-tag:hover {
  font-size: 0.6rem;
  font-weight: 400;
  cursor: pointer;
  background-color: var(--azul-es) !important;
}
.metric-keyword-subtitle {
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
}
.select {
  border-radius: 0.5rem;
  border: 1.5px solid var(--gris-clear);
}
.form-control {
  font-size: 0.9rem;
}

/* Distribution Chart Styles */
.distribution-color-indicator {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
  border: 2px solid #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

/* Responsive chart adjustments */
@media (max-width: 992px) {
  .row.mx-2.mt-3 > div {
    margin-bottom: 1rem;
  }
}

/* Ensure KPI cards container allows poppers to overflow */
.kpi-cards-container {
  overflow: visible !important;
  position: relative;
  z-index: 1;
}

.kpi-cards-container .row {
  overflow: visible !important;
}

.kpi-cards-container .col-12,
.kpi-cards-container .col-md-6 {
  overflow: visible !important;
  position: relative;
  z-index: 1;
}
</style>
