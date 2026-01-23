<template>
  <div class="attention-step-bar">
    <div v-for="(step, index) in steps" :key="step.id" :class="['step', getStepClass(step, index)]">
      <div class="step-content">
        <div class="step-icon-wrapper">
          <div class="step-icon" :class="getStepIconClass(step, index)">
            <i :class="step.icon"></i>
          </div>
        </div>
        <div class="step-label">{{ t(step.labelKey) }}</div>
      </div>
      <div
        v-if="index < steps.length - 1"
        class="step-connector"
        :class="getConnectorClass(index)"
      ></div>
    </div>
  </div>
</template>

<script>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { getActiveFeature } from '../../../shared/features';

export default {
  name: 'AttentionStepBar',
  props: {
    currentStage: { type: String, default: '' },
    status: { type: String, default: '' },
    commerce: { type: Object, default: null },
  },
  setup(props) {
    const { t } = useI18n();
    const checkoutEnabled = computed(() => {
      if (!props.commerce) {
        return false;
      }

      // Log all features for debugging
      if (process.env.NODE_ENV === 'development') {
        const allFeatures = props.commerce?.features || [];

        // Log all PRODUCT type features
        const productFeatures = allFeatures.filter(f => f.type === 'PRODUCT');

        // Log all feature names for debugging
        productFeatures.forEach((f, index) => {});

        // Log features containing 'checkout' or 'stages' (case insensitive)
        const checkoutRelated = allFeatures.filter(
          f =>
            f.name &&
            (f.name.toLowerCase().includes('checkout') ||
              f.name.toLowerCase().includes('stages') ||
              f.name.toLowerCase().includes('check-out'))
        );

        // Also check if the name field might be different - try common variations
        const possibleCheckoutNames = [
          'attention-checkout-enabled',
          'checkout-enabled',
          'check-out-enabled',
          'attention-check-out-enabled',
          'checkout',
          'check-out',
        ];
        possibleCheckoutNames.forEach(name => {
          const found = allFeatures.find(f => f.name === name);
          if (found) {
          }
        });

        // Try to find checkout feature
        const checkoutFeature = allFeatures.find(
          f => f.name === 'attention-checkout-enabled' && f.type === 'PRODUCT',
        );

        // Try to find stages feature
        const stagesFeature = allFeatures.find(
          f => f.name === 'attention-stages-enabled' && f.type === 'PRODUCT',
        );
      }

      const enabled = getActiveFeature(props.commerce, 'attention-checkout-enabled', 'PRODUCT');

      // Debug: Log to help verify feature detection
      if (process.env.NODE_ENV === 'development') {
      }
      return enabled;
    });

    const stagesEnabled = computed(() => {
      if (!props.commerce) return false;
      const enabled = getActiveFeature(props.commerce, 'attention-stages-enabled', 'PRODUCT');
      // Debug: Log to help verify feature detection
      if (process.env.NODE_ENV === 'development') {
      }
      return enabled;
    });

    const steps = computed(() => {
      // Use i18n for labels - we'll get the translation key from the component
      const baseSteps = [
        {
          id: 'checkin',
          labelKey: 'attentionStepBar.steps.checkin',
          icon: 'bi bi-play-circle-fill',
          stage: 'CHECK_IN',
          status: 'PENDING',
        },
        {
          id: 'processing',
          labelKey: 'attentionStepBar.steps.processing',
          icon: 'bi bi-clock-history',
          stages: ['PRE_CONSULTATION', 'CONSULTATION', 'POST_CONSULTATION'],
          status: 'PROCESSING',
        },
      ];

      // Add checkout step if checkout is enabled
      // Note: This will only work properly if attention-stages-enabled is also active
      if (checkoutEnabled.value) {
        baseSteps.push({
          id: 'checkout',
          labelKey: 'attentionStepBar.steps.checkout',
          icon: 'bi bi-check-circle-fill',
          stage: 'CHECKOUT',
        });

        // Debug log
        if (process.env.NODE_ENV === 'development') {
        }
      } else {
        // Debug log when checkout is NOT enabled
        if (process.env.NODE_ENV === 'development') {
        }
      }

      baseSteps.push({
        id: 'terminated',
        labelKey: 'attentionStepBar.steps.terminated',
        icon: 'bi bi-check-all',
        stage: 'TERMINATED',
        status: 'TERMINATED',
      });

      // Debug log final steps
      if (process.env.NODE_ENV === 'development') {
      }

      return baseSteps;
    });

    const isStepActive = (step, index) => {
      // If stages are enabled, use currentStage
      if (stagesEnabled.value && props.currentStage) {
        if (step.stage && props.currentStage === step.stage) return true;
        if (step.stages && step.stages.includes(props.currentStage)) return true;
      }
      // Fallback to status
      if (step.status && props.status === step.status) return true;
      return false;
    };

    const isStepCompleted = (step, index) => {
      const currentStepIndex = steps.value.findIndex(s => isStepActive(s, 0));
      if (currentStepIndex === -1) {
        // If no active step, check by status/stage
        if (stagesEnabled.value && props.currentStage) {
          const currentIndex = steps.value.findIndex(s => {
            if (s.stage === props.currentStage) return true;
            if (s.stages && s.stages.includes(props.currentStage)) return true;
            return false;
          });
          return index < currentIndex;
        }
        // Fallback to status
        const statusOrder = ['PENDING', 'PROCESSING', 'TERMINATED'];
        const currentStatusIndex = statusOrder.indexOf(props.status);
        const stepStatusIndex = step.status ? statusOrder.indexOf(step.status) : -1;
        return stepStatusIndex !== -1 && stepStatusIndex < currentStatusIndex;
      }
      return index < currentStepIndex;
    };

    const getStepClass = (step, index) => {
      if (isStepActive(step, index)) return 'step-active';
      if (isStepCompleted(step, index)) return 'step-completed';
      return 'step-pending';
    };

    const getStepIconClass = (step, index) => {
      if (isStepActive(step, index)) return 'icon-active';
      if (isStepCompleted(step, index)) return 'icon-completed';
      return 'icon-pending';
    };

    const getConnectorClass = index => {
      const nextStep = steps.value[index + 1];
      if (!nextStep) return '';
      if (isStepCompleted(nextStep, index + 1)) return 'connector-completed';
      if (isStepActive(nextStep, index + 1)) return 'connector-active';
      return 'connector-pending';
    };

    return {
      steps,
      checkoutEnabled,
      stagesEnabled,
      isStepActive,
      isStepCompleted,
      getStepClass,
      getStepIconClass,
      getConnectorClass,
      t,
    };
  },
};
</script>

<style scoped>
.attention-step-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 0.375rem;
  background: #f8f9fa;
  border-radius: 0.375rem;
  margin-top: 0.75rem;
  margin-bottom: 0.75rem;
  position: relative;
}

.step {
  display: flex;
  align-items: center;
  flex: 1;
  position: relative;
  z-index: 1;
}

.step-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  flex: 1;
}

.step-icon-wrapper {
  position: relative;
  z-index: 2;
}

.step-icon {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.875rem;
  transition: all 0.3s ease;
  border: 2px solid;
}

.step-label {
  font-size: 0.6875rem;
  font-weight: 500;
  text-align: center;
  color: #6c757d;
  transition: color 0.3s ease;
  line-height: 1.2;
}

/* Pending state */
.step-pending .step-icon {
  background: #ffffff;
  border-color: #dee2e6;
  color: #adb5bd;
}

.step-pending .step-label {
  color: #adb5bd;
}

/* Active state */
.step-active .step-icon {
  background: #0d6efd;
  border-color: #0d6efd;
  color: #ffffff;
  box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.2);
  animation: pulse 2s infinite;
}

.step-active .step-label {
  color: #0d6efd;
  font-weight: 600;
}

@keyframes pulse {
  0%,
  100% {
    box-shadow: 0 0 0 2px rgba(13, 110, 253, 0.2);
  }
  50% {
    box-shadow: 0 0 0 4px rgba(13, 110, 253, 0.1);
  }
}

/* Completed state */
.step-completed .step-icon {
  background: #198754;
  border-color: #198754;
  color: #ffffff;
}

.step-completed .step-label {
  color: #198754;
  font-weight: 500;
}

/* Connector */
.step-connector {
  flex: 1;
  height: 2px;
  margin: 0 0.25rem;
  position: relative;
  top: -0.875rem;
  z-index: 0;
  transition: background-color 0.3s ease;
}

.connector-pending {
  background: #dee2e6;
}

.connector-active {
  background: linear-gradient(to right, #198754 0%, #0d6efd 100%);
}

.connector-completed {
  background: #198754;
}

/* Responsive */
@media (max-width: 768px) {
  .attention-step-bar {
    padding: 0.375rem 0.25rem;
    margin-top: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .step-icon {
    width: 1.5rem;
    height: 1.5rem;
    font-size: 0.75rem;
  }

  .step-label {
    font-size: 0.625rem;
  }

  .step-connector {
    margin: 0 0.2rem;
    top: -0.75rem;
  }

  .step-content {
    gap: 0.15rem;
  }
}
</style>
