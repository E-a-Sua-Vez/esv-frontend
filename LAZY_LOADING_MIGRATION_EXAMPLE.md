# Lazy Loading Migration Example

This document shows how to migrate components to use lazy loading for heavy
libraries.

---

## Example: Migrating html2pdf

### Before (Eager Loading)

```javascript
// Component loads html2pdf immediately (684KB in initial bundle)
<script>
import html2pdf from 'html2pdf.js';

export default {
  methods: {
    downloadPDF() {
      const element = document.getElementById('content');
      html2pdf()
        .set({ margin: 1 })
        .from(element)
        .save();
    }
  }
}
</script>
```

### After (Lazy Loading)

```javascript
// Component loads html2pdf only when needed (0KB in initial bundle)
<script>
import { lazyLoadHtml2Pdf } from '@/shared/utils/lazyLoad';

export default {
  data() {
    return {
      pdfLoading: false,
    };
  },
  methods: {
    async downloadPDF() {
      try {
        this.pdfLoading = true;
        // Load library only when user clicks download
        const html2pdf = await lazyLoadHtml2Pdf();
        const element = document.getElementById('content');
        html2pdf()
          .set({ margin: 1 })
          .from(element)
          .save();
      } catch (error) {
        console.error('Error loading PDF library:', error);
        // Show error message to user
      } finally {
        this.pdfLoading = false;
      }
    }
  }
}
</script>

<template>
  <button @click="downloadPDF" :disabled="pdfLoading">
    {{ pdfLoading ? 'Loading...' : 'Download PDF' }}
  </button>
</template>
```

---

## Example: Migrating Chart.js

### Before (Eager Loading)

```javascript
<script>
import { Chart, registerables } from 'chart.js';
import { LineChart, BarChart } from 'vue-chart-3';

Chart.register(...registerables);

export default {
  components: {
    LineChart,
    BarChart,
  },
  // ...
}
</script>
```

### After (Lazy Loading)

```javascript
<script>
import { lazyLoadChartJs, lazyLoadVueCharts } from '@/shared/utils/lazyLoad';

export default {
  data() {
    return {
      chartsLoaded: false,
      LineChart: null,
      BarChart: null,
    };
  },
  async mounted() {
    // Load charts when component mounts (or on demand)
    try {
      const { Chart, registerables } = await lazyLoadChartJs();
      Chart.register(...registerables);

      const vueCharts = await lazyLoadVueCharts();
      this.LineChart = vueCharts.LineChart;
      this.BarChart = vueCharts.BarChart;
      this.chartsLoaded = true;
    } catch (error) {
      console.error('Error loading charts:', error);
    }
  },
  // ...
}
</script>

<template>
  <div v-if="chartsLoaded">
    <LineChart :data="chartData" />
  </div>
  <div v-else>
    Loading charts...
  </div>
</template>
```

---

## Benefits

1. **Smaller Initial Bundle**: 684KB+ saved
2. **Faster Initial Load**: Library loads only when needed
3. **Better User Experience**: Page loads faster, library loads in background
4. **Progressive Loading**: Users see content faster

---

## Migration Strategy

1. **Start with Most Used Components**

   - Components used on main pages
   - Components with heavy libraries

2. **Test Each Migration**

   - Verify functionality works
   - Check bundle size reduction
   - Test user experience

3. **Gradual Migration**
   - Don't need to migrate all at once
   - Can migrate incrementally
   - Each migration improves performance

---

## Components to Migrate (Priority Order)

### High Priority (Most Impact)

1. Dashboard components (most visited)
2. Report components (heavy libraries)
3. Chart components (used frequently)

### Medium Priority

4. Admin components
5. Form components

### Low Priority

6. Rarely used components
7. Legacy components

---

**Note**: Lazy loading is **optional** but **highly recommended** for maximum
performance gains.



