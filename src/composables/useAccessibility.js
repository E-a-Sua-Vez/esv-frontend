import { ref, onMounted, onUnmounted } from 'vue';

/**
 * Composable para mejoras de accesibilidad
 */
export function useAccessibility() {
  const isKeyboardNavigation = ref(false);
  const focusVisible = ref(false);

  /**
   * Detectar navegación por teclado
   */
  const setupKeyboardDetection = () => {
    const handleKeyDown = e => {
      if (e.key === 'Tab') {
        isKeyboardNavigation.value = true;
        focusVisible.value = true;
      }
    };

    const handleMouseDown = () => {
      isKeyboardNavigation.value = false;
    };

    const handleFocus = e => {
      if (isKeyboardNavigation.value) {
        e.target.classList.add('focus-visible');
      }
    };

    const handleBlur = e => {
      e.target.classList.remove('focus-visible');
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('focus', handleFocus, true);
    document.addEventListener('blur', handleBlur, true);

    onUnmounted(() => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('focus', handleFocus, true);
      document.removeEventListener('blur', handleBlur, true);
    });
  };

  /**
   * Skip to main content link
   */
  const setupSkipLink = () => {
    const skipLink = document.createElement('a');
    skipLink.href = '#main-content';
    skipLink.textContent = 'Saltar al contenido principal';
    skipLink.className = 'skip-link';
    skipLink.style.cssText = `
      position: absolute;
      top: -40px;
      left: 0;
      background: var(--azul-turno);
      color: white;
      padding: 8px;
      text-decoration: none;
      z-index: 10000;
    `;

    skipLink.addEventListener('focus', () => {
      skipLink.style.top = '0';
    });

    skipLink.addEventListener('blur', () => {
      skipLink.style.top = '-40px';
    });

    document.body.insertBefore(skipLink, document.body.firstChild);
  };

  /**
   * ARIA live regions para anuncios
   */
  const announceToScreenReader = (message, priority = 'polite') => {
    let liveRegion = document.getElementById('aria-live-region');

    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.id = 'aria-live-region';
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', priority);
      liveRegion.setAttribute('aria-atomic', 'true');
      liveRegion.style.cssText = `
        position: absolute;
        left: -10000px;
        width: 1px;
        height: 1px;
        overflow: hidden;
      `;
      document.body.appendChild(liveRegion);
    }

    liveRegion.textContent = message;

    // Limpiar después de un tiempo
    setTimeout(() => {
      liveRegion.textContent = '';
    }, 1000);
  };

  /**
   * Mejorar contraste de colores
   */
  const checkColorContrast = (foreground, background) => {
    // Implementación simplificada - en producción usar librería completa
    const getLuminance = color => {
      const rgb = color.match(/\d+/g);
      if (!rgb) return 0;
      const [r, g, b] = rgb.map(val => {
        val = parseInt(val) / 255;
        return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const l1 = getLuminance(foreground);
    const l2 = getLuminance(background);
    const ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);

    return ratio >= 4.5; // WCAG AA standard
  };

  /**
   * Focus trap para modales
   */
  const createFocusTrap = container => {
    const focusableElements = container.querySelectorAll(
      'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = e => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    firstElement?.focus();

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  };

  onMounted(() => {
    setupKeyboardDetection();
    setupSkipLink();
  });

  return {
    isKeyboardNavigation,
    focusVisible,
    announceToScreenReader,
    checkColorContrast,
    createFocusTrap,
  };
}
