<script>
import { computed, onMounted, ref } from 'vue';

export default {
  name: 'GaugeChart',
  props: {
    value: { type: Number, required: true },
    min: { type: Number, default: 0 },
    max: { type: Number, default: 100 },
    label: { type: String, default: '' },
    unit: { type: String, default: '%' },
    threshold: { type: Number, default: 70 }, // Threshold for warning color
    color: { type: String, default: 'primary' }, // primary, success, warning, danger
    size: { type: Number, default: 200 },
  },
  setup(props) {
    const canvasRef = ref(null);
    const animationProgress = ref(0);

    const percentage = computed(() => {
      const clamped = Math.max(props.min, Math.min(props.max, props.value));
      return ((clamped - props.min) / (props.max - props.min)) * 100;
    });

    const getColor = computed(() => {
      if (percentage.value >= props.threshold) {
        return props.color === 'primary'
          ? '#004aad'
          : props.color === 'success'
          ? '#00c2cb'
          : props.color === 'warning'
          ? '#f9c322'
          : '#a52a2a';
      }
      return props.color === 'primary'
        ? '#7c91d9'
        : props.color === 'success'
        ? '#00c4cc'
        : props.color === 'warning'
        ? '#fac107'
        : '#d32f2f';
    });

    const getStatus = computed(() => {
      if (percentage.value >= props.threshold) return 'excellent';
      if (percentage.value >= props.threshold * 0.7) return 'good';
      return 'warning';
    });

    const drawGauge = () => {
      if (!canvasRef.value) return;

      const canvas = canvasRef.value;
      const ctx = canvas.getContext('2d');
      const dpr = window.devicePixelRatio || 1;
      const centerX = canvas.width / dpr / 2;
      const centerY = canvas.height / dpr / 2 - 12; // Adjust for label space
      const radius = Math.min(centerX, centerY) - 20; // Increased radius for bigger gauge

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw background arc
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, Math.PI, 0, false);
      ctx.lineWidth = 28; // Increased line width
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.stroke();

      // Draw progress arc with animation
      const progress = percentage.value * animationProgress.value;
      const angle = Math.PI + (progress / 100) * Math.PI;

      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, Math.PI, angle, false);
      ctx.lineWidth = 28; // Increased line width
      ctx.lineCap = 'round';
      ctx.strokeStyle = getColor.value;
      ctx.shadowBlur = 14;
      ctx.shadowColor = getColor.value;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw value text
      ctx.fillStyle = '#000';
      ctx.font = 'bold 36px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const displayValue = (props.value * animationProgress.value).toFixed(1);
      ctx.fillText(displayValue, centerX, centerY - 10);

      // Draw unit
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      ctx.font = '16px Arial';
      ctx.fillText(props.unit, centerX, centerY + 18);
    };

    const animate = () => {
      if (animationProgress.value < 1) {
        animationProgress.value += 0.05;
        drawGauge();
        requestAnimationFrame(animate);
      } else {
        animationProgress.value = 1;
        drawGauge();
      }
    };

    onMounted(() => {
      if (canvasRef.value) {
        const dpr = window.devicePixelRatio || 1;
        // Use full size for better visibility - increased size
        const size = props.size;
        const canvasHeight = size / 2 + 25; // Space for label and status
        canvasRef.value.width = size * dpr;
        canvasRef.value.height = canvasHeight * dpr;
        canvasRef.value.style.width = size + 'px';
        canvasRef.value.style.height = canvasHeight + 'px';

        const ctx = canvasRef.value.getContext('2d');
        ctx.scale(dpr, dpr);

        animate();
      }
    });

    return {
      canvasRef,
      percentage,
      getColor,
      getStatus,
    };
  },
};
</script>

<template>
  <div class="gauge-chart-container">
    <canvas ref="canvasRef" class="gauge-canvas"></canvas>
    <div class="gauge-status" :class="`status-${getStatus}`">
      <i
        :class="`bi ${
          getStatus === 'excellent'
            ? 'bi-check-circle-fill'
            : getStatus === 'good'
            ? 'bi-info-circle-fill'
            : 'bi-exclamation-triangle-fill'
        }`"
      ></i>
      <span>{{
        getStatus === 'excellent' ? 'Excelente' : getStatus === 'good' ? 'Bueno' : 'Mejorable'
      }}</span>
    </div>
  </div>
</template>

<style scoped>
.gauge-chart-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 0.5rem 1rem;
  position: relative;
  width: 100%;
  min-height: 280px;
  overflow: visible;
}

.gauge-canvas {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 0 auto;
}

.gauge-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-top: 1rem;
  padding: 0.625rem 1.25rem;
  border-radius: 9999px;
  font-size: 0.95rem;
  font-weight: 600;
  transition: all 0.3s ease;
  width: 100%;
  text-align: center;
}

.status-excellent {
  background: rgba(0, 194, 203, 0.15);
  color: #00c2cb;
  border: 1px solid rgba(0, 194, 203, 0.3);
}

.status-good {
  background: rgba(0, 74, 173, 0.15);
  color: #004aad;
  border: 1px solid rgba(0, 74, 173, 0.3);
}

.status-warning {
  background: rgba(249, 195, 34, 0.15);
  color: #f9c322;
  border: 1px solid rgba(249, 195, 34, 0.3);
}

.gauge-status i {
  font-size: 1rem;
}
</style>
