import { ref, onMounted, onUnmounted } from 'vue';

/**
 * Composable para optimizaciones de rendimiento
 */
export function usePerformanceOptimization() {
  const isVisible = ref(true);
  const observer = ref(null);

  /**
   * Lazy loading de imágenes
   */
  const setupLazyImages = () => {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              imageObserver.unobserve(img);
            }
          }
        });
      });

      document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
      });
    }
  };

  /**
   * Virtual scrolling para listas largas
   */
  const useVirtualScrolling = (items, itemHeight = 50, containerHeight = 400) => {
    const visibleItems = ref([]);
    const scrollTop = ref(0);
    const startIndex = ref(0);
    const endIndex = ref(0);

    const calculateVisibleItems = () => {
      startIndex.value = Math.floor(scrollTop.value / itemHeight);
      endIndex.value = Math.min(
        startIndex.value + Math.ceil(containerHeight / itemHeight) + 1,
        items.value.length
      );

      visibleItems.value = items.value.slice(startIndex.value, endIndex.value);
    };

    const handleScroll = event => {
      scrollTop.value = event.target.scrollTop;
      calculateVisibleItems();
    };

    onMounted(() => {
      calculateVisibleItems();
    });

    return {
      visibleItems,
      startIndex,
      endIndex,
      handleScroll,
      totalHeight: computed(() => items.value.length * itemHeight),
    };
  };

  /**
   * Debounce para búsquedas
   */
  const useDebouncedSearch = (searchFn, delay = 300) => {
    let timeoutId = null;

    const debouncedSearch = (...args) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        searchFn(...args);
      }, delay);
    };

    onUnmounted(() => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    });

    return debouncedSearch;
  };

  /**
   * Memoización de cálculos costosos
   */
  const useMemo = (computeFn, dependencies) => {
    const cached = ref(null);
    const lastDeps = ref(null);

    const getMemoized = () => {
      const depsString = JSON.stringify(dependencies);
      if (depsString !== lastDeps.value) {
        cached.value = computeFn();
        lastDeps.value = depsString;
      }
      return cached.value;
    };

    return getMemoized;
  };

  /**
   * Preload de recursos críticos
   */
  const preloadResource = (url, type = 'script') =>
    new Promise((resolve, reject) => {
      let element;

      if (type === 'script') {
        element = document.createElement('script');
        element.src = url;
      } else if (type === 'style') {
        element = document.createElement('link');
        element.rel = 'stylesheet';
        element.href = url;
      } else if (type === 'image') {
        element = document.createElement('img');
        element.src = url;
      }

      element.onload = () => resolve();
      element.onerror = () => reject();
      document.head.appendChild(element);
    });

  /**
   * Throttle para eventos de scroll/resize
   */
  const useThrottle = (fn, delay = 100) => {
    let lastCall = 0;

    return (...args) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        fn(...args);
      }
    };
  };

  onMounted(() => {
    setupLazyImages();
  });

  return {
    isVisible,
    setupLazyImages,
    useVirtualScrolling,
    useDebouncedSearch,
    useMemo,
    preloadResource,
    useThrottle,
  };
}
