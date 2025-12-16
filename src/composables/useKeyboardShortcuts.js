import { onMounted, onUnmounted } from 'vue';

/**
 * Composable para manejar atajos de teclado
 * @param {Object} shortcuts - Objeto con los atajos: { 'ctrl+t': callback, 'esc': callback }
 * @param {Array} dependencies - Dependencias que deben estar activas para que funcionen los atajos
 */
export function useKeyboardShortcuts(shortcuts = {}, dependencies = []) {
  const handleKeyDown = event => {
    // Verificar si hay dependencias activas
    if (dependencies.length > 0 && !dependencies.every(dep => dep)) {
      return;
    }

    // Construir la combinación de teclas
    const keys = [];
    if (event.ctrlKey || event.metaKey) keys.push('ctrl');
    if (event.shiftKey) keys.push('shift');
    if (event.altKey) keys.push('alt');

    const key = event.key.toLowerCase();
    if (key !== 'control' && key !== 'shift' && key !== 'alt' && key !== 'meta') {
      keys.push(key);
    }

    const shortcut = keys.join('+');

    // Buscar el atajo exacto o parcial
    for (const [pattern, callback] of Object.entries(shortcuts)) {
      if (shortcut === pattern || shortcut.endsWith(pattern.split('+').pop())) {
        event.preventDefault();
        callback(event);
        break;
      }
    }
  };

  onMounted(() => {
    window.addEventListener('keydown', handleKeyDown);
  });

  onUnmounted(() => {
    window.removeEventListener('keydown', handleKeyDown);
  });

  return {
    handleKeyDown,
  };
}
