<script>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import Popper from 'vue3-popper';

export default {
  name: 'SmartRecommendationsPanel',
  components: { Popper },
  props: {
    calculatedMetrics: { type: Object, default: () => ({}) },
    commerce: { type: Object, default: undefined },
  },
  setup(props) {
    const { t } = useI18n();
    const recommendations = computed(() => {
      const recs = [];
      const metrics = props.calculatedMetrics;
      const attention = metrics['attention.created'] || {};
      const booking = metrics['booking.created'] || {};
      const survey = metrics['survey.created'] || {};

      // 1. Análisis de conversión de reservas
      if (booking.bookingNumber > 0 && booking.bookingFlow) {
        const confirmed = booking.bookingFlow.datasets?.[1] || 0;
        const conversionRate = (confirmed / booking.bookingNumber) * 100;

        if (conversionRate < 60) {
          recs.push({
            type: 'warning',
            icon: 'bi-exclamation-triangle-fill',
            title: t('dashboard.smartRecommendations.recommendations.lowConversionRate.title'),
            message: t('dashboard.smartRecommendations.recommendations.lowConversionRate.message', { conversionRate: conversionRate.toFixed(1) }),
            recommendation: t('dashboard.smartRecommendations.recommendations.lowConversionRate.recommendation'),
            impact: t('dashboard.smartRecommendations.recommendations.lowConversionRate.impact'),
            priority: 'high',
          });
        } else if (conversionRate > 80) {
          recs.push({
            type: 'success',
            icon: 'bi-check-circle-fill',
            title: t('dashboard.smartRecommendations.recommendations.excellentConversionRate.title'),
            message: t('dashboard.smartRecommendations.recommendations.excellentConversionRate.message', { conversionRate: conversionRate.toFixed(1) }),
            recommendation: t('dashboard.smartRecommendations.recommendations.excellentConversionRate.recommendation'),
            impact: t('dashboard.smartRecommendations.recommendations.excellentConversionRate.impact'),
            priority: 'low',
          });
        }
      }

      // 2. Análisis de tiempo de atención
      if (attention.avgDuration) {
        const avgMinutes = Math.round(attention.avgDuration / 60);
        const pastAvg = attention.pastPeriodAttentionNumber?.dailyAvg || 0;

        if (avgMinutes > 30) {
          recs.push({
            type: 'warning',
            icon: 'bi-clock-fill',
            title: t('dashboard.smartRecommendations.recommendations.highAttentionTime.title'),
            message: t('dashboard.smartRecommendations.recommendations.highAttentionTime.message', { avgMinutes }),
            recommendation: t('dashboard.smartRecommendations.recommendations.highAttentionTime.recommendation'),
            impact: t('dashboard.smartRecommendations.recommendations.highAttentionTime.impact'),
            priority: 'high',
          });
        }
      }

      // 3. Análisis de satisfacción
      if (survey.avgRating) {
        if (survey.avgRating < 3.5) {
          recs.push({
            type: 'error',
            icon: 'bi-star-fill',
            title: t('dashboard.smartRecommendations.recommendations.lowCustomerSatisfaction.title'),
            message: t('dashboard.smartRecommendations.recommendations.lowCustomerSatisfaction.message', { avgRating: survey.avgRating.toFixed(1) }),
            recommendation: t('dashboard.smartRecommendations.recommendations.lowCustomerSatisfaction.recommendation'),
            impact: t('dashboard.smartRecommendations.recommendations.lowCustomerSatisfaction.impact'),
            priority: 'critical',
          });
        } else if (survey.avgRating >= 4.5) {
          recs.push({
            type: 'success',
            icon: 'bi-star-fill',
            title: t('dashboard.smartRecommendations.recommendations.excellentSatisfaction.title'),
            message: t('dashboard.smartRecommendations.recommendations.excellentSatisfaction.message', { avgRating: survey.avgRating.toFixed(1) }),
            recommendation: t('dashboard.smartRecommendations.recommendations.excellentSatisfaction.recommendation'),
            impact: t('dashboard.smartRecommendations.recommendations.excellentSatisfaction.impact'),
            priority: 'low',
          });
        }
      }

      // 4. Análisis de NPS
      if (survey.nps !== undefined) {
        const roundedNps = Math.round(survey.nps);
        if (survey.nps < 0) {
          recs.push({
            type: 'error',
            icon: 'bi-megaphone-fill',
            title: t('dashboard.smartRecommendations.recommendations.negativeNPS.title'),
            message: t('dashboard.smartRecommendations.recommendations.negativeNPS.message', { nps: `${roundedNps > 0 ? '+' : ''}${roundedNps}` }),
            recommendation: t('dashboard.smartRecommendations.recommendations.negativeNPS.recommendation'),
            impact: t('dashboard.smartRecommendations.recommendations.negativeNPS.impact'),
            priority: 'critical',
          });
        } else if (survey.nps >= 50) {
          recs.push({
            type: 'success',
            icon: 'bi-megaphone-fill',
            title: t('dashboard.smartRecommendations.recommendations.excellentNPS.title'),
            message: t('dashboard.smartRecommendations.recommendations.excellentNPS.message', { nps: roundedNps }),
            recommendation: t('dashboard.smartRecommendations.recommendations.excellentNPS.recommendation'),
            impact: t('dashboard.smartRecommendations.recommendations.excellentNPS.impact'),
            priority: 'low',
          });
        }
      }

      // 5. Análisis de distribución horaria
      if (attention.hourDistribution?.datasets) {
        const hours = attention.hourDistribution.datasets;
        const maxHour = Math.max(...hours);
        const minHour = Math.min(...hours.filter(h => h > 0));
        const ratio = maxHour / (minHour || 1);

        if (ratio > 3) {
          const maxIndex = hours.indexOf(maxHour);
          const maxHourLabel = attention.hourDistribution.labels?.[maxIndex] || 'N/A';

          recs.push({
            type: 'info',
            icon: 'bi-graph-up-arrow',
            title: t('dashboard.smartRecommendations.recommendations.optimizationOpportunity.title'),
            message: t('dashboard.smartRecommendations.recommendations.optimizationOpportunity.message', { maxHourLabel, maxHour }),
            recommendation: t('dashboard.smartRecommendations.recommendations.optimizationOpportunity.recommendation'),
            impact: t('dashboard.smartRecommendations.recommendations.optimizationOpportunity.impact'),
            priority: 'medium',
          });
        }
      }

      // 6. Análisis de tendencias
      if (attention.attentionNumber && attention.pastPeriodAttentionNumber) {
        const change =
          ((attention.attentionNumber - attention.pastPeriodAttentionNumber.number) /
            (attention.pastPeriodAttentionNumber.number || 1)) *
          100;

        if (change > 20) {
          recs.push({
            type: 'success',
            icon: 'bi-arrow-up-circle-fill',
            title: t('dashboard.smartRecommendations.recommendations.significantGrowth.title'),
            message: t('dashboard.smartRecommendations.recommendations.significantGrowth.message', { change: change.toFixed(1) }),
            recommendation: t('dashboard.smartRecommendations.recommendations.significantGrowth.recommendation'),
            impact: t('dashboard.smartRecommendations.recommendations.significantGrowth.impact'),
            priority: 'medium',
          });
        } else if (change < -15) {
          recs.push({
            type: 'warning',
            icon: 'bi-arrow-down-circle-fill',
            title: t('dashboard.smartRecommendations.recommendations.demandDrop.title'),
            message: t('dashboard.smartRecommendations.recommendations.demandDrop.message', { change: change.toFixed(1) }),
            recommendation: t('dashboard.smartRecommendations.recommendations.demandDrop.recommendation'),
            impact: t('dashboard.smartRecommendations.recommendations.demandDrop.impact'),
            priority: 'high',
          });
        }
      }

      // Ordenar por prioridad
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      return recs.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
    });

    const getRecommendationClass = type => {
      const classes = {
        error: 'recommendation-error',
        warning: 'recommendation-warning',
        success: 'recommendation-success',
        info: 'recommendation-info',
      };
      return classes[type] || 'recommendation-info';
    };

    const getImpactBadgeClass = priority => {
      const classes = {
        critical: 'impact-critical',
        high: 'impact-high',
        medium: 'impact-medium',
        low: 'impact-low',
      };
      return classes[priority] || 'impact-medium';
    };

    return {
      recommendations,
      getRecommendationClass,
      getImpactBadgeClass,
    };
  },
};
</script>

<template>
  <div v-if="recommendations.length > 0" class="smart-recommendations-panel">
    <div class="recommendations-header">
      <div class="recommendations-title">
        <i class="bi bi-lightbulb-fill"></i>
        <span>{{
          $t('dashboard.smartRecommendations.title') || 'Recomendaciones Inteligentes'
        }}</span>
        <Popper
          :class="'dark'"
          arrow
          disable-click-away
          :content="
            $t('dashboard.smartRecommendations.tooltip') ||
            'Recomendaciones inteligentes basadas en análisis de datos y métricas clave. Estas sugerencias se generan automáticamente analizando patrones, tendencias y oportunidades de mejora en tu negocio.'
          "
        >
          <i class="bi bi-info-circle-fill recommendations-info-icon"></i>
        </Popper>
      </div>
      <div class="recommendations-count">
        {{ recommendations.length }}
        {{ $t('dashboard.smartRecommendations.items') || 'sugerencias' }}
      </div>
    </div>

    <div class="recommendations-list">
      <div
        v-for="(rec, index) in recommendations"
        :key="index"
        class="recommendation-card"
        :class="getRecommendationClass(rec.type)"
      >
        <div class="recommendation-header">
          <div class="recommendation-icon-wrapper">
            <i :class="`bi ${rec.icon}`"></i>
          </div>
          <div class="recommendation-content">
            <div class="recommendation-title-row">
              <h4 class="recommendation-title">{{ rec.title }}</h4>
              <span class="impact-badge" :class="getImpactBadgeClass(rec.priority)">
                {{ rec.impact }}
              </span>
            </div>
            <p class="recommendation-message">{{ rec.message }}</p>
            <div class="recommendation-action">
              <i class="bi bi-arrow-right-circle"></i>
              <span>{{ rec.recommendation }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.smart-recommendations-panel {
  margin: 2rem auto;
  max-width: 100%;
  padding: 1.5rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 249, 250, 0.98) 100%);
  border-radius: 16px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(0, 0, 0, 0.08);
  animation: fadeInUp 0.6s ease-out;
  width: 100%;
  box-sizing: border-box;
}

.recommendations-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid rgba(0, 74, 173, 0.1);
}

.recommendations-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1.25rem;
  font-weight: 700;
  color: #000;
}

.recommendations-title i {
  color: var(--azul-turno);
  font-size: 1.5rem;
}

.recommendations-info-icon {
  margin-left: 0.5rem;
  /* Styles unified in parent component */
}

.recommendations-count {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.6);
  background: rgba(0, 74, 173, 0.1);
  padding: 0.375rem 0.75rem;
  border-radius: 9999px;
  font-weight: 600;
}

.recommendations-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.recommendation-card {
  background: #ffffff;
  border-radius: 12px;
  padding: 1.25rem;
  border-left: 4px solid;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
  animation: slideInRight 0.5s ease-out;
  animation-fill-mode: both;
}

.recommendation-card:nth-child(1) {
  animation-delay: 0.1s;
}
.recommendation-card:nth-child(2) {
  animation-delay: 0.2s;
}
.recommendation-card:nth-child(3) {
  animation-delay: 0.3s;
}
.recommendation-card:nth-child(4) {
  animation-delay: 0.4s;
}
.recommendation-card:nth-child(5) {
  animation-delay: 0.5s;
}

@keyframes slideInRight {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.recommendation-card:hover {
  transform: translateX(4px) translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.recommendation-error {
  border-left-color: #a52a2a;
  background: linear-gradient(90deg, rgba(165, 42, 42, 0.05) 0%, #ffffff 5%);
}

.recommendation-warning {
  border-left-color: #f9c322;
  background: linear-gradient(90deg, rgba(249, 195, 34, 0.05) 0%, #ffffff 5%);
}

.recommendation-success {
  border-left-color: #00c2cb;
  background: linear-gradient(90deg, rgba(0, 194, 203, 0.05) 0%, #ffffff 5%);
}

.recommendation-info {
  border-left-color: #004aad;
  background: linear-gradient(90deg, rgba(0, 74, 173, 0.05) 0%, #ffffff 5%);
}

.recommendation-header {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.recommendation-icon-wrapper {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.3s ease;
}

.recommendation-error .recommendation-icon-wrapper {
  background: linear-gradient(135deg, rgba(165, 42, 42, 0.2) 0%, rgba(165, 42, 42, 0.15) 100%);
  color: #a52a2a;
}

.recommendation-warning .recommendation-icon-wrapper {
  background: linear-gradient(135deg, rgba(249, 195, 34, 0.2) 0%, rgba(249, 195, 34, 0.15) 100%);
  color: #f9c322;
}

.recommendation-success .recommendation-icon-wrapper {
  background: linear-gradient(135deg, rgba(0, 194, 203, 0.2) 0%, rgba(0, 194, 203, 0.15) 100%);
  color: #00c2cb;
}

.recommendation-info .recommendation-icon-wrapper {
  background: linear-gradient(135deg, rgba(0, 74, 173, 0.2) 0%, rgba(0, 74, 173, 0.15) 100%);
  color: #004aad;
}

.recommendation-icon-wrapper i {
  font-size: 1.25rem;
}

.recommendation-card:hover .recommendation-icon-wrapper {
  transform: scale(1.1) rotate(5deg);
}

.recommendation-content {
  flex: 1;
  min-width: 0;
}

.recommendation-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.recommendation-title {
  font-size: 1rem;
  font-weight: 700;
  color: #000;
  margin: 0;
  flex: 1;
}

.recommendation-message {
  font-size: 0.875rem;
  color: rgba(0, 0, 0, 0.7);
  margin: 0.5rem 0;
  line-height: 1.5;
}

.recommendation-action {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: rgba(0, 74, 173, 0.05);
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--azul-turno);
  transition: all 0.3s ease;
}

.recommendation-action i {
  font-size: 1rem;
  transition: transform 0.3s ease;
}

.recommendation-card:hover .recommendation-action {
  background: rgba(0, 74, 173, 0.1);
  transform: translateX(4px);
}

.recommendation-card:hover .recommendation-action i {
  transform: translateX(4px);
}

.impact-badge {
  font-size: 0.75rem;
  font-weight: 700;
  padding: 0.25rem 0.625rem;
  border-radius: 9999px;
  white-space: nowrap;
}

.impact-critical {
  background: rgba(165, 42, 42, 0.15);
  color: #a52a2a;
  border: 1px solid rgba(165, 42, 42, 0.3);
}

.impact-high {
  background: rgba(249, 195, 34, 0.15);
  color: #f9c322;
  border: 1px solid rgba(249, 195, 34, 0.3);
}

.impact-medium {
  background: rgba(0, 74, 173, 0.15);
  color: #004aad;
  border: 1px solid rgba(0, 74, 173, 0.3);
}

.impact-low {
  background: rgba(0, 194, 203, 0.15);
  color: #00c2cb;
  border: 1px solid rgba(0, 194, 203, 0.3);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .smart-recommendations-panel {
    margin: 1rem 0.25rem;
    padding: 1.25rem;
  }

  .recommendations-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .recommendation-title-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .recommendation-header {
    flex-direction: column;
    gap: 0.75rem;
  }
}
</style>
