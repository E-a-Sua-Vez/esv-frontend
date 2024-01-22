<script>
import { DoughnutChart, useBarChart } from 'vue-chart-3';

export default {
  name: 'AttentionQuestionChooseOption',
  components: { DoughnutChart },
  props: {
    show: { type: Boolean, default: true },
    question: { type: Object, default: {} }
  },
  data() {
    return {
    }
  },
  methods: {
    getPieChartData(data) {
      const options = this.getOptions(data);
      const chartData = () => ({
        labels: options,
        datasets: [
          {
            data: options.map(opt => this.getPercentage(data[opt].avg)),
            backgroundColor: ['#446ffc', '#2f407a', '#7c91d9', '#0e2678', '#b1bde6']
          },
        ],
      });
      const { barChartProps } = useBarChart({
        chartData: chartData(),
        options: { plugins: { legend: { display: false } } }
      });
      return barChartProps.value;
    },
    getPercentage(avg) {
      return parseFloat((avg * 100).toFixed(2), 2) || 0;
    },
    getOptions(obj) {
      return Object.keys(obj).sort((a,b) => b - a);
    },
  },
}
</script>

<template>
  <div v-if="show && question">
    <div class="row centered my-2">
      <div class="col-12 m-4 centered">
        <DoughnutChart v-bind="getPieChartData(question['distribution'])" />
      </div>
      <div class="col-12">
        <div class="row centered m-1" v-for="(option, ind) in getOptions(question['distribution'])" :key="`option.${ind}`">
          <div class="col-6 centered">
            <span class="metric-card-title fw-bold"> {{ option }} </span>
          </div>
          <div class="col-2 centered">
            <span class="badge rounded-pill bg-secondary metric-card-subtitle"> {{ question['distribution'][option].counter }} </span>
          </div>
          <div class="col-4 centered">
            <span class="badge rounded-pill bg-primary metric-card-subtitle"> {{ getPercentage(question['distribution'][option].avg) }} % </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.metric-card-title {
  font-size: .9rem;
  font-weight: 600;
  line-height: .8rem;
  align-items: center;
  justify-content: center;
  display: flex;
}
.metric-card-subtitle {
  font-size: .8rem;
  font-weight: 500;
}
.metric-card-number {
  font-size: 1.2rem;
  font-weight: 700;
}
</style>