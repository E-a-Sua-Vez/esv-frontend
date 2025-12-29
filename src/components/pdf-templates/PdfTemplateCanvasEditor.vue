<template>
  <div class="pdf-template-canvas-editor">
    <div class="editor-toolbar mb-3">
      <div class="toolbar-section">
        <div class="toolbar-title">Insertar</div>
        <div class="btn-group" role="group">
          <button type="button" class="btn btn-sm btn-dark rounded-pill px-3" @click="addTextElement" title="Adicionar Texto">
            <i class="bi bi-type"></i> Texto
          </button>
          <button type="button" class="btn btn-sm btn-dark rounded-pill px-3" @click="addImageElement" title="Adicionar Imagem">
            <i class="bi bi-image"></i> Imagem
          </button>
          <button type="button" class="btn btn-sm btn-dark rounded-pill px-3" @click="addLogoElement" title="Adicionar Logo">
            <i class="bi bi-image-fill"></i> Logo
          </button>
          <button type="button" class="btn btn-sm btn-dark rounded-pill px-3" @click="addSignatureElement" title="Adicionar Assinatura">
            <i class="bi bi-pen"></i> Assinatura
          </button>
          <button type="button" class="btn btn-sm btn-dark rounded-pill px-3" @click="addQrCodeElement" title="Adicionar QR Code">
            <i class="bi bi-qr-code"></i> QR Code
          </button>
          <button type="button" class="btn btn-sm btn-dark rounded-pill px-3" @click="addLineElement" title="Adicionar Linha">
            <i class="bi bi-hr"></i> Linha
          </button>
        </div>
      </div>

      <div class="toolbar-section">
        <div class="toolbar-title">Canvas</div>
        <div class="btn-group" role="group">
          <button type="button" class="btn btn-sm btn-dark rounded-pill px-3" @click="fitToCanvas">
            <i class="bi bi-aspect-ratio"></i> Ajustar ao Canvas
          </button>
        </div>
      </div>

      <div class="toolbar-section">
        <div class="toolbar-title">Alineación</div>
        <div class="btn-group" role="group">
          <button type="button" class="btn btn-sm btn-dark rounded-pill px-3" @click="centerElementHorizontally" title="Centrar horizontalmente">
            <i class="bi bi-arrows-collapse-vertical"></i> Centro H
          </button>
          <button type="button" class="btn btn-sm btn-dark rounded-pill px-3" @click="centerElementVertically" title="Centrar verticalmente">
            <i class="bi bi-arrows-collapse-horizontal"></i> Centro V
          </button>
          <button type="button" class="btn btn-sm btn-dark rounded-pill px-3" @click="centerElementBoth" title="Centrar ambos">
            <i class="bi bi-arrows-move"></i> Centro HV
          </button>
          <button type="button" class="btn btn-sm btn-dark rounded-pill px-3" @click="alignElementTop" title="Alinear arriba">
            <i class="bi bi-align-top"></i> Top
          </button>
          <button type="button" class="btn btn-sm btn-dark rounded-pill px-3" @click="alignElementBottom" title="Alinear abajo">
            <i class="bi bi-align-bottom"></i> Bottom
          </button>
        </div>
      </div>

      <div class="toolbar-section">
        <div class="toolbar-title">Formato</div>
        <div class="btn-group" role="group">
          <button type="button" class="btn btn-sm btn-outline-dark rounded-pill px-3" @click="toggleBold" :disabled="!isTextSelected" title="Negrita">
            <i class="bi bi-type-bold" :class="{ active: isTextSelected && selectedElement?.bold }"></i>
          </button>
          <button type="button" class="btn btn-sm btn-outline-dark rounded-pill px-3" @click="toggleItalic" :disabled="!isTextSelected" title="Cursiva">
            <i class="bi bi-type-italic" :class="{ active: isTextSelected && selectedElement?.italic }"></i>
          </button>
          <button type="button" class="btn btn-sm btn-outline-dark rounded-pill px-3" @click="toggleUnderline" :disabled="!isTextSelected" title="Subrayado">
            <i class="bi bi-type-underline" :class="{ active: isTextSelected && selectedElement?.underline }"></i>
          </button>
          <div class="vr mx-1"></div>
          <button type="button" class="btn btn-sm btn-outline-dark rounded-pill px-3" @click="setParagraphAlign('left')" :disabled="!isTextSelected" title="Alinear izquierda">
            <i class="bi bi-text-left" :class="{ active: isTextSelected && selectedElement?.align === 'left' }"></i>
          </button>
          <button type="button" class="btn btn-sm btn-outline-dark rounded-pill px-3" @click="setParagraphAlign('center')" :disabled="!isTextSelected" title="Alinear centro">
            <i class="bi bi-text-center" :class="{ active: isTextSelected && selectedElement?.align === 'center' }"></i>
          </button>
          <button type="button" class="btn btn-sm btn-outline-dark rounded-pill px-3" @click="setParagraphAlign('right')" :disabled="!isTextSelected" title="Alinear derecha">
            <i class="bi bi-text-right" :class="{ active: isTextSelected && selectedElement?.align === 'right' }"></i>
          </button>
          <button type="button" class="btn btn-sm btn-outline-dark rounded-pill px-3" @click="setParagraphAlign('justify')" :disabled="!isTextSelected" title="Justificar">
            <i class="bi bi-justify" :class="{ active: isTextSelected && selectedElement?.align === 'justify' }"></i>
          </button>
          <div class="vr mx-1"></div>
          <select class="form-select form-select-sm w-auto" :disabled="!isTextSelected" :value="isTextSelected ? (selectedElement.fontSize || 12) : 12" @change="setFontSize(parseInt($event.target.value, 10))" title="Tamaño de fuente">
            <option v-for="size in [10,12,14,16,18,24,36,48,72]" :key="size" :value="size">{{ size }} pt</option>
          </select>
          <input type="color" class="form-control form-control-color form-control-sm ms-2" :disabled="!isTextSelected" :value="isTextSelected ? (selectedElement.color || '#000000') : '#000000'" @input="setTextColor($event.target.value)" title="Color de texto" />
          <div class="vr mx-1"></div>
          <select class="form-select form-select-sm w-auto" :disabled="!isTextSelected" :value="isTextSelected ? (selectedElement.fontFamily || 'Arial') : 'Arial'" @change="setFontFamily($event.target.value)" title="Familia de fuente">
            <option value="Arial">Arial</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Courier New">Courier New</option>
            <option value="Helvetica">Helvetica</option>
            <option value="Roboto">Roboto</option>
          </select>
          <input type="number" min="1" max="2" step="0.1" class="form-control form-control-sm ms-2 w-auto" :disabled="!isTextSelected" :value="isTextSelected ? (selectedElement.lineHeight || 1.2) : 1.2" @input="setLineHeight(parseFloat($event.target.value))" title="Interlineado (multiplicador)" />
        </div>
      </div>

      <div class="toolbar-section">
        <div class="toolbar-title">Ver</div>
        <div class="btn-group" role="group">
          <button type="button" class="btn btn-sm btn-dark rounded-pill px-3" @click="toggleGrid">
            <i class="bi bi-grid-3x3"></i> {{ showGrid ? 'Ocultar cuadrícula' : 'Mostrar cuadrícula' }}
          </button>
          <button type="button" class="btn btn-sm btn-dark rounded-pill px-3" @click="toggleRulers">
            <i class="bi bi-rulers"></i> {{ showRulers ? 'Ocultar reglas' : 'Mostrar reglas' }}
          </button>
        </div>
      </div>

      <div class="toolbar-section">
        <div class="toolbar-title">Historial</div>
        <div class="btn-group" role="group">
          <button type="button" class="btn btn-sm btn-dark rounded-pill px-3" @click="undo" :disabled="!canUndo">
            <i class="bi bi-arrow-counterclockwise"></i> Desfazer
          </button>
          <button type="button" class="btn btn-sm btn-dark rounded-pill px-3" @click="redo" :disabled="!canRedo">
            <i class="bi bi-arrow-clockwise"></i> Refazer
          </button>
          <button type="button" class="btn btn-sm btn-danger rounded-pill px-3" @click="clearCanvas">
            <i class="bi bi-trash"></i> Limpar
          </button>
        </div>
      </div>

      <div class="toolbar-section ms-auto">
        <div class="toolbar-title">Acciones</div>
        <div class="btn-group" role="group">
          <button type="button" class="btn btn-sm btn-dark rounded-pill px-3" @click="saveTemplate" :disabled="saving">
            <i class="bi bi-save"></i> {{ saving ? 'Salvando...' : 'Salvar' }}
          </button>
        </div>
      </div>
    </div>

    <div class="page-info mb-2">
      <small>
        Tamanho: {{ pageLabel }} ({{ canvasWidth }} × {{ canvasHeight }} pt) • Orientação: {{ orientationLabel }}
      </small>
    </div>

    <div class="editor-container">
      <div class="rulers">
        <canvas ref="rulerHRef" :width="canvasWidth" height="24" class="ruler-horizontal" :class="{ 'ruler-hidden': !showRulers }"></canvas>
        <div class="ruler-body">
          <canvas ref="rulerVRef" :height="canvasHeight" width="24" class="ruler-vertical" :class="{ 'ruler-hidden': !showRulers }"></canvas>
          <div class="canvas-wrapper" :style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }">
            <canvas
              ref="canvasRef"
              :width="canvasWidth"
              :height="canvasHeight"
              class="template-canvas"
              @mousedown="handleMouseDown"
              @mousemove="handleMouseMove"
              @mouseup="handleMouseUp"
              @click="handleCanvasClick"
            ></canvas>
          </div>
        </div>
      </div>

      <div class="properties-panel">
        <h6 class="mb-3">Propriedades</h6>
        <div v-if="selectedElement" class="element-properties">
          <div class="panel-group">
            <div class="group-title"><i class="bi bi-info-circle"></i> Elemento</div>
            <div class="group-body">
              <div class="form-group-modern mb-2">
                <label class="form-label-modern">Tipo</label>
                <input type="text" class="form-control-modern" :value="selectedElement.type" disabled />
              </div>
              <div class="form-row">
                <div class="form-col">
                  <label class="form-label-modern">Posição X</label>
                  <input type="number" v-model.number="selectedElement.x" class="form-control-modern" @input="updateElement" />
                </div>
                <div class="form-col">
                  <label class="form-label-modern">Posição Y</label>
                  <input type="number" v-model.number="selectedElement.y" class="form-control-modern" @input="updateElement" />
                </div>
              </div>
              <div class="form-row mt-2">
                <div class="form-col">
                  <label class="form-label-modern">Largura</label>
                  <input type="number" v-model.number="selectedElement.width" class="form-control-modern" @input="updateElement" />
                </div>
                <div class="form-col">
                  <label class="form-label-modern">Altura</label>
                  <input type="number" v-model.number="selectedElement.height" class="form-control-modern" @input="updateElement" />
                </div>
              </div>
            </div>
          </div>

          <div v-if="selectedElement.type === 'text'" class="panel-group mt-3">
            <div class="group-title"><i class="bi bi-text-paragraph"></i> Texto</div>
            <div class="group-body">
              <div class="form-group-modern mb-2">
                <label class="form-label-modern">Contenido</label>
                <textarea v-model="selectedElement.text" class="form-control-modern" rows="3" @input="updateElement"></textarea>
              </div>
              <div class="form-row">
                <div class="form-col">
                  <label class="form-label-modern">Tamaño de Fuente</label>
                  <input type="number" v-model.number="selectedElement.fontSize" class="form-control-modern" min="8" max="72" @input="updateElement" />
                </div>
                <div class="form-col">
                  <label class="form-label-modern">Color</label>
                  <input type="color" v-model="selectedElement.color" class="form-control-modern" style="height: 38px;" @input="updateElement" />
                </div>
              </div>

              <div class="form-group-modern mt-2">
                <label class="form-label-modern">Alineación</label>
                <div class="btn-group btn-group-sm w-100" role="group">
                  <input type="radio" class="btn-check" name="align" id="align-left" value="left" v-model="selectedElement.align" @change="updateElement" />
                  <label class="btn btn-dark rounded-pill px-3" for="align-left" title="Izquierda"><i class="bi bi-text-left"></i></label>
                  <input type="radio" class="btn-check" name="align" id="align-center" value="center" v-model="selectedElement.align" @change="updateElement" />
                  <label class="btn btn-dark rounded-pill px-3" for="align-center" title="Centro"><i class="bi bi-text-center"></i></label>
                  <input type="radio" class="btn-check" name="align" id="align-right" value="right" v-model="selectedElement.align" @change="updateElement" />
                  <label class="btn btn-dark rounded-pill px-3" for="align-right" title="Derecha"><i class="bi bi-text-right"></i></label>
                  <input type="radio" class="btn-check" name="align" id="align-justify" value="justify" v-model="selectedElement.align" @change="updateElement" />
                  <label class="btn btn-dark rounded-pill px-3" for="align-justify" title="Justificar"><i class="bi bi-justify"></i></label>
                </div>
              </div>

              <div class="form-group-modern mt-2">
                <label class="form-label-modern">Estilos</label>
                <div class="btn-group btn-group-sm w-100" role="group">
                  <input type="checkbox" class="btn-check" id="bold" v-model="selectedElement.bold" @change="updateElement" />
                  <label class="btn btn-dark rounded-pill px-3" for="bold" title="Negrita"><i class="bi bi-type-bold"></i></label>
                  <input type="checkbox" class="btn-check" id="italic" v-model="selectedElement.italic" @change="updateElement" />
                  <label class="btn btn-dark rounded-pill px-3" for="italic" title="Cursiva"><i class="bi bi-type-italic"></i></label>
                  <input type="checkbox" class="btn-check" id="underline" v-model="selectedElement.underline" @change="updateElement" />
                  <label class="btn btn-dark rounded-pill px-3" for="underline" title="Subrayado"><i class="bi bi-type-underline"></i></label>
                </div>
              </div>

              <div class="form-group-modern mt-2">
                <label class="form-label-modern">Tipo de Lista</label>
                <select v-model="selectedElement.listType" class="form-control-modern" @change="updateElement">
                  <option value="">Sin lista</option>
                  <option value="bullet">• Viñetas</option>
                  <option value="dot">∘ Puntos</option>
                  <option value="number">Numerada</option>
                </select>
              </div>
            </div>
          </div>

          <div v-if="selectedElement.type === 'line'" class="panel-group mt-3">
            <div class="group-title"><i class="bi bi-slash-lg"></i> Línea</div>
            <div class="group-body">
              <div class="form-row">
                <div class="form-col">
                  <label class="form-label-modern">Estilo</label>
                  <select v-model="selectedElement.lineStyle" class="form-control-modern" @change="updateElement">
                    <option value="solid">Línea continua</option>
                    <option value="dashed">Línea punteada</option>
                    <option value="double">Línea doble</option>
                  </select>
                </div>
                <div class="form-col">
                  <label class="form-label-modern">Grosor</label>
                  <input type="number" v-model.number="selectedElement.lineWidth" class="form-control-modern" min="1" max="10" @input="updateElement" />
                </div>
              </div>
            </div>
          </div>

          <div class="panel-group mt-3">
            <div class="group-title"><i class="bi bi-aspect-ratio"></i> Alineación en Canvas</div>
            <div class="group-body">
              <div class="btn-group btn-group-sm w-100 mb-2" role="group">
                <button type="button" class="btn btn-sm btn-dark rounded-pill px-3" @click="centerElementHorizontally" title="Centrar horizontalmente"><i class="bi bi-arrows-collapse-vertical"></i> H</button>
                <button type="button" class="btn btn-sm btn-dark rounded-pill px-3" @click="centerElementVertically" title="Centrar verticalmente"><i class="bi bi-arrows-collapse-horizontal"></i> V</button>
                <button type="button" class="btn btn-sm btn-dark rounded-pill px-3" @click="centerElementBoth" title="Centrar en ambos ejes"><i class="bi bi-arrows-move"></i> HV</button>
              </div>
              <div class="btn-group btn-group-sm w-100" role="group">
                <button type="button" class="btn btn-sm btn-dark rounded-pill px-3" @click="alignElementTop" title="Alinear arriba"><i class="bi bi-align-top"></i> Top</button>
                <button type="button" class="btn btn-sm btn-dark rounded-pill px-3" @click="alignElementBottom" title="Alinear abajo"><i class="bi bi-align-bottom"></i> Bottom</button>
              </div>
              <button type="button" class="btn btn-sm btn-danger rounded-pill w-100 mt-2" @click="deleteElement" title="Remover elemento"><i class="bi bi-trash"></i> Remover</button>
            </div>
          </div>

          <div class="text-muted small mt-3">
            <p><strong>Tip:</strong> Ctrl+Click para seleccionar múltiples elementos</p>
          </div>
        </div>

        <div v-else class="empty-state">
          <div class="empty-icon"><i class="bi bi-cursor"></i></div>
          <div class="empty-text">Selecione um elemento para editar</div>
          <div class="empty-subtext">Use la barra "Insertar" para añadir elementos al canvas</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, reactive, onMounted, onUnmounted, computed, watch, nextTick } from 'vue';
import { useI18n } from 'vue-i18n';

export default {
  name: 'PdfTemplateCanvasEditor',
  props: {
    template: {
      type: Object,
      default: () => ({}),
    },
    section: {
      type: String,
      required: true, // 'header', 'footer', 'content'
    },
  },
  emits: ['save', 'cancel'],
  setup(props, { emit }) {
    const { t } = useI18n();
    const canvasRef = ref(null);
    const rulerHRef = ref(null);
    const rulerVRef = ref(null);
    const canvasWidth = ref(595); // Page width
    const canvasHeight = ref(842); // Page height
    const showGrid = ref(true);
    const showRulers = ref(true);
    const isTextSelected = computed(() => !!selectedElement.value && selectedElement.value.type === 'text');
    const selectedElement = ref(null);
    const selectedElements = ref([]); // Para multi-select
    const elements = ref([]);
    const history = ref([]);
    const historyIndex = ref(-1);
    const saving = ref(false);
    const isDragging = ref(false);
    const isResizing = ref(false);
    const resizeHandle = ref(null); // 'se', 'sw', 'ne', 'nw', 'e', 'w', 'n', 's'
    const dragOffset = ref({ x: 0, y: 0 });
    const initialSize = ref({ width: 0, height: 0, x: 0, y: 0 });

    const canUndo = computed(() => historyIndex.value > 0);
    const canRedo = computed(() => historyIndex.value < history.value.length - 1);
    const pageLabel = computed(() => {
      const ps = props.template?.pageSize || 'A4';
      switch (ps) {
        case 'LETTER': return 'Letter';
        case 'A5': return 'A5';
        case 'LETTER_HALF': return 'Half Letter';
        default: return 'A4';
      }
    });
    const orientationLabel = computed(() => (props.template?.orientation || 'portrait') === 'portrait' ? 'Retrato' : 'Paisagem');

    let ctx = null;

    const getBaseDimensions = (pageSize) => {
      switch (pageSize) {
        case 'LETTER':
          return { w: 612, h: 792 };
        case 'A5':
          return { w: 420, h: 595 };
        case 'LETTER_HALF':
          return { w: 396, h: 612 };
        case 'A4':
        default:
          return { w: 595, h: 842 };
      }
    };

    const applyDimensions = () => {
      const ps = props.template?.pageSize || 'A4';
      const orient = props.template?.orientation || 'portrait';
      const { w, h } = getBaseDimensions(ps);
      if (orient === 'landscape') {
        canvasWidth.value = h;
        canvasHeight.value = w;
      } else {
        canvasWidth.value = w;
        canvasHeight.value = h;
      }
    };

    const initCanvas = () => {
      if (!canvasRef.value) return;
      ctx = canvasRef.value.getContext('2d');
      // Asegurar que las reglas y cuadrícula se muestren siempre al iniciar
      showGrid.value = true;
      showRulers.value = true;
      applyDimensions();
      loadTemplate();
      autoFitElements();
      drawCanvas();
      drawRulers();
    };

    const loadTemplate = () => {
      if (props.template && props.template[props.section]) {
        const section = props.template[props.section];
        if (section.elements) {
          elements.value = JSON.parse(JSON.stringify(section.elements));
        }
      }
    };

    const autoFitElements = () => {
      if (!elements.value || elements.value.length === 0) return;
      const maxRight = Math.max(
        ...elements.value.map(el => (el.x || 0) + (el.width || 0))
      );
      const maxBottom = Math.max(
        ...elements.value.map(el => (el.y || 0) + (el.height || 0))
      );
      if (maxRight <= canvasWidth.value && maxBottom <= canvasHeight.value) return;
      const sx = canvasWidth.value / Math.max(maxRight, 1);
      const sy = canvasHeight.value / Math.max(maxBottom, 1);
      const s = Math.min(sx, sy);
      if (!isFinite(s) || s <= 0) return;
      elements.value.forEach(el => {
        if (typeof el.x === 'number') el.x = Math.round(el.x * s);
        if (typeof el.y === 'number') el.y = Math.round(el.y * s);
        if (typeof el.width === 'number') el.width = Math.round(el.width * s);
        if (typeof el.height === 'number') el.height = Math.round(el.height * s);
        if (typeof el.fontSize === 'number') el.fontSize = Math.max(6, Math.round(el.fontSize * s));
        if (typeof el.lineWidth === 'number') el.lineWidth = Math.max(1, Math.round(el.lineWidth * s));
      });
    };

    const drawCanvas = () => {
      if (!ctx) return;

      // Clear canvas
      ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value);

      // Draw background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvasWidth.value, canvasHeight.value);

      // Draw grid (optional, for alignment)
      if (showGrid.value) {
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 0.5;
        for (let x = 0; x <= canvasWidth.value; x += 20) {
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, canvasHeight.value);
          ctx.stroke();
        }
        for (let y = 0; y <= canvasHeight.value; y += 20) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(canvasWidth.value, y);
          ctx.stroke();
        }
      }

      // Draw elements
      elements.value.forEach((element, index) => {
        drawElement(element, index === elements.value.indexOf(selectedElement.value));
      });
    };

    const drawRulers = () => {
      const hCanvas = rulerHRef.value;
      const vCanvas = rulerVRef.value;
      if (!hCanvas || !vCanvas) return;

      const hCtx = hCanvas.getContext('2d');
      const vCtx = vCanvas.getContext('2d');
      if (!hCtx || !vCtx) return;

      // Horizontal ruler
      hCtx.clearRect(0, 0, hCanvas.width, hCanvas.height);
      hCtx.fillStyle = '#f3f3f3';
      hCtx.fillRect(0, 0, hCanvas.width, hCanvas.height);
      hCtx.strokeStyle = '#bdbdbd';
      hCtx.beginPath();
      hCtx.moveTo(0, hCanvas.height - 1);
      hCtx.lineTo(hCanvas.width, hCanvas.height - 1);
      hCtx.stroke();

      hCtx.strokeStyle = '#888';
      hCtx.fillStyle = '#555';
      hCtx.font = '10px Arial';
      for (let x = 0; x <= canvasWidth.value; x += 10) {
        const isMajor = x % 100 === 0;
        const isMedium = x % 50 === 0;
        const tickHeight = isMajor ? 12 : isMedium ? 8 : 5;
        hCtx.beginPath();
        hCtx.moveTo(x + 0.5, hCanvas.height - tickHeight);
        hCtx.lineTo(x + 0.5, hCanvas.height - 1);
        hCtx.stroke();
        if (isMajor) {
          hCtx.fillText(String(x), x + 2, 10);
        }
      }

      // Vertical ruler
      vCtx.clearRect(0, 0, vCanvas.width, vCanvas.height);
      vCtx.fillStyle = '#f3f3f3';
      vCtx.fillRect(0, 0, vCanvas.width, vCanvas.height);
      vCtx.strokeStyle = '#bdbdbd';
      vCtx.beginPath();
      vCtx.moveTo(vCanvas.width - 1, 0);
      vCtx.lineTo(vCanvas.width - 1, vCanvas.height);
      vCtx.stroke();

      vCtx.strokeStyle = '#888';
      vCtx.fillStyle = '#555';
      vCtx.font = '10px Arial';
      for (let y = 0; y <= canvasHeight.value; y += 10) {
        const isMajor = y % 100 === 0;
        const isMedium = y % 50 === 0;
        const tickWidth = isMajor ? 12 : isMedium ? 8 : 5;
        vCtx.beginPath();
        vCtx.moveTo(vCanvas.width - tickWidth, y + 0.5);
        vCtx.lineTo(vCanvas.width - 1, y + 0.5);
        vCtx.stroke();
        if (isMajor) {
          // Rotate text drawing for readability is optional; keep simple
          vCtx.save();
          vCtx.translate(0, 0);
          vCtx.fillText(String(y), 2, y + 10);
          vCtx.restore();
        }
      }
    };

    const fitToCanvas = () => {
      autoFitElements();
      saveHistory();
      drawCanvas();
      drawRulers();
    };

    const toggleGrid = () => {
      showGrid.value = !showGrid.value;
      drawCanvas();
      drawRulers();
    };

    const toggleRulers = () => {
      showRulers.value = !showRulers.value;
      if (showRulers.value) {
        drawRulers();
      }
    };

    const toggleBold = () => {
      if (!isTextSelected.value) return;
      selectedElement.value.bold = !selectedElement.value.bold;
      updateElement();
      saveHistory();
    };

    const toggleItalic = () => {
      if (!isTextSelected.value) return;
      selectedElement.value.italic = !selectedElement.value.italic;
      updateElement();
      saveHistory();
    };

    const toggleUnderline = () => {
      if (!isTextSelected.value) return;
      selectedElement.value.underline = !selectedElement.value.underline;
      updateElement();
      saveHistory();
    };

    const setParagraphAlign = align => {
      if (!isTextSelected.value) return;
      selectedElement.value.align = align;
      updateElement();
      saveHistory();
    };

    const setFontSize = size => {
      if (!isTextSelected.value) return;
      const s = Math.min(72, Math.max(8, Number(size) || 12));
      selectedElement.value.fontSize = s;
      updateElement();
      saveHistory();
    };

    const setTextColor = color => {
      if (!isTextSelected.value) return;
      selectedElement.value.color = color || '#000000';
      updateElement();
      saveHistory();
    };

    const setFontFamily = family => {
      if (!isTextSelected.value) return;
      selectedElement.value.fontFamily = String(family || 'Arial');
      updateElement();
      saveHistory();
    };

    const setLineHeight = lh => {
      if (!isTextSelected.value) return;
      const v = Math.min(2.0, Math.max(1.0, Number(lh) || 1.2));
      selectedElement.value.lineHeight = v;
      updateElement();
      saveHistory();
    };

    const drawElement = (element, isSelected = false) => {
      if (!ctx) return;

      if (element.type === 'text') {
        // Aplicar estilos
        let fontStyle = '';
        if (element.bold) fontStyle += 'bold ';
        if (element.italic) fontStyle += 'italic ';
        ctx.font = `${fontStyle}${element.fontSize || 12}px ${element.fontFamily || 'Arial'}`;
        ctx.fillStyle = element.color || '#000000';
        ctx.textAlign = 'left'; // Always use left alignment for canvas

        const lines = (element.text || '').split('\n');
        const elementWidth = element.width || 100;
        const fontSize = element.fontSize || 12;
        const lineHeightPx = (element.lineHeight || 1.2) * fontSize;

        lines.forEach((line, i) => {
          let textLine = line;

          // Aplicar prefijo según tipo de lista
          if (element.listType === 'bullet') textLine = '• ' + line;
          else if (element.listType === 'dot') textLine = '∘ ' + line;
          else if (element.listType === 'number') textLine = (i + 1) + '. ' + line;

          const yPos = (element.y || 0) + lineHeightPx * (i + 1);

          // Calcular posición X basándose en alineación dentro del elemento
          let xPos = element.x || 0;
          if (element.align === 'center') {
            const textWidth = ctx.measureText(textLine).width;
            xPos = (element.x || 0) + (elementWidth - textWidth) / 2;
          } else if (element.align === 'right') {
            const textWidth = ctx.measureText(textLine).width;
            xPos = (element.x || 0) + elementWidth - textWidth;
          } else if (element.align === 'justify') {
            const isLastLine = i === lines.length - 1;
            const words = textLine.split(' ');
            if (!isLastLine && words.length > 1) {
              const spaceW = ctx.measureText(' ').width;
              const wordsW = words.reduce((sum, w) => sum + ctx.measureText(w).width, 0);
              const spacesCount = words.length - 1;
              const totalBase = wordsW + spaceW * spacesCount;
              const extra = Math.max(0, elementWidth - totalBase);
              const extraPerSpace = extra / spacesCount;
              let cursorX = element.x || 0;
              words.forEach((w, wi) => {
                ctx.fillText(w, cursorX, yPos);
                const wW = ctx.measureText(w).width;
                if (wi < words.length - 1) {
                  cursorX += wW + spaceW + extraPerSpace;
                }
              });
              // underline for justified: approximate over full width
              if (element.underline) {
                ctx.strokeStyle = element.color || '#000000';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(element.x || 0, yPos + 2);
                ctx.lineTo((element.x || 0) + elementWidth, yPos + 2);
                ctx.stroke();
              }
              return; // we've drawn the line; skip default draw
            }
          }

          ctx.fillText(textLine, xPos, yPos);

          // Dibujar subrayado si está activo
          if (element.underline) {
            const textWidth = ctx.measureText(textLine).width;
            ctx.strokeStyle = element.color || '#000000';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(xPos, yPos + 2);
            ctx.lineTo(xPos + textWidth, yPos + 2);
            ctx.stroke();
          }
        });
      } else if (element.type === 'line') {
        ctx.strokeStyle = element.color || '#000000';
        ctx.lineWidth = element.lineWidth || 2;

        // Aplicar estilo de línea
        if (element.lineStyle === 'dashed') {
          ctx.setLineDash([5, 5]);
        } else if (element.lineStyle === 'double') {
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.moveTo(element.x || 0, element.y || 0);
          ctx.lineTo((element.x || 0) + (element.width || 100), element.y || 0);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(element.x || 0, (element.y || 0) + 3);
          ctx.lineTo((element.x || 0) + (element.width || 100), (element.y || 0) + 3);
          ctx.stroke();
        } else {
          ctx.setLineDash([]);
        }

        ctx.beginPath();
        ctx.moveTo(element.x || 0, element.y || 0);
        ctx.lineTo((element.x || 0) + (element.width || 100), element.y || 0);
        ctx.stroke();
        ctx.setLineDash([]);
      } else if (
        element.type === 'image' ||
        element.type === 'logo' ||
        element.type === 'signature'
      ) {
        const img = new Image();
        img.onload = () => {
          ctx.drawImage(
            img,
            element.x || 0,
            element.y || 0,
            element.width || img.width,
            element.height || img.height
          );
          if (isSelected) {
            drawSelectionBox(element);
          }
        };
        img.src = element.src || element.url || '';
      } else if (element.type === 'qrcode') {
        // Draw placeholder for QR code
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.strokeRect(element.x || 0, element.y || 0, element.width || 100, element.height || 100);
        ctx.fillStyle = '#000000';
        ctx.font = '10px Arial';
        ctx.fillText('QR Code', (element.x || 0) + 10, (element.y || 0) + 50);
      }

      if (isSelected) {
        drawSelectionBox(element);
      }
    };

    const drawSelectionBox = element => {
      if (!ctx) return;
      const x = element.x || 0;
      const y = element.y || 0;
      const w = element.width || 100;
      const h = element.height || 50;

      // Dibujar borde de selección
      ctx.strokeStyle = '#007bff';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);

      // Dibujar handles de resize (cuadrados en las esquinas y bordes)
      const handleSize = 8;
      ctx.fillStyle = '#007bff';

      // Esquinas
      ctx.fillRect(x - handleSize/2, y - handleSize/2, handleSize, handleSize); // nw
      ctx.fillRect(x + w - handleSize/2, y - handleSize/2, handleSize, handleSize); // ne
      ctx.fillRect(x - handleSize/2, y + h - handleSize/2, handleSize, handleSize); // sw
      ctx.fillRect(x + w - handleSize/2, y + h - handleSize/2, handleSize, handleSize); // se

      // Bordes (medio de cada lado)
      ctx.fillRect(x + w/2 - handleSize/2, y - handleSize/2, handleSize, handleSize); // n
      ctx.fillRect(x + w/2 - handleSize/2, y + h - handleSize/2, handleSize, handleSize); // s
      ctx.fillRect(x - handleSize/2, y + h/2 - handleSize/2, handleSize, handleSize); // w
      ctx.fillRect(x + w - handleSize/2, y + h/2 - handleSize/2, handleSize, handleSize); // e
    };

    const getResizeHandle = (x, y, element) => {
      if (!element) return null;

      const ex = element.x || 0;
      const ey = element.y || 0;
      const ew = element.width || 100;
      const eh = element.height || 50;
      const handleSize = 8;
      const tolerance = handleSize;

      // Verificar esquinas primero
      if (Math.abs(x - ex) < tolerance && Math.abs(y - ey) < tolerance) return 'nw';
      if (Math.abs(x - (ex + ew)) < tolerance && Math.abs(y - ey) < tolerance) return 'ne';
      if (Math.abs(x - ex) < tolerance && Math.abs(y - (ey + eh)) < tolerance) return 'sw';
      if (Math.abs(x - (ex + ew)) < tolerance && Math.abs(y - (ey + eh)) < tolerance) return 'se';

      // Verificar bordes
      if (Math.abs(x - (ex + ew/2)) < tolerance && Math.abs(y - ey) < tolerance) return 'n';
      if (Math.abs(x - (ex + ew/2)) < tolerance && Math.abs(y - (ey + eh)) < tolerance) return 's';
      if (Math.abs(x - ex) < tolerance && Math.abs(y - (ey + eh/2)) < tolerance) return 'w';
      if (Math.abs(x - (ex + ew)) < tolerance && Math.abs(y - (ey + eh/2)) < tolerance) return 'e';

      return null;
    };

    const addTextElement = () => {
      const element = {
        id: Date.now().toString(),
        type: 'text',
        text: 'Novo Texto',
        x: 50,
        y: 50,
        fontSize: 12,
        fontFamily: 'Arial',
        lineHeight: 1.2,
        color: '#000000',
        align: 'left',
        width: 200,
        height: 30,
      };
      elements.value.push(element);
      selectedElement.value = element;
      saveHistory();
      drawCanvas();
    };

    const addImageElement = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = e => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = event => {
            const element = {
              id: Date.now().toString(),
              type: 'image',
              src: event.target.result,
              x: 50,
              y: 50,
              width: 200,
              height: 200,
            };
            elements.value.push(element);
            selectedElement.value = element;
            saveHistory();
            drawCanvas();
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    };

    const addLogoElement = () => {
      // Similar to addImageElement but with logo-specific properties
      addImageElement();
    };

    const addSignatureElement = () => {
      // Similar to addImageElement but with signature-specific properties
      addImageElement();
    };

    const addQrCodeElement = () => {
      const element = {
        id: Date.now().toString(),
        type: 'qrcode',
        x: 50,
        y: 50,
        width: 100,
        height: 100,
        data: '{{verificationUrl}}',
      };
      elements.value.push(element);
      selectedElement.value = element;
      saveHistory();
      drawCanvas();
    };

    const addLineElement = () => {
      const element = {
        id: Date.now().toString(),
        type: 'line',
        x: 50,
        y: 100,
        width: 200,
        height: 0,
        lineWidth: 2,
        color: '#000000',
        lineStyle: 'solid', // solid, dashed, double
      };
      elements.value.push(element);
      selectedElement.value = element;
      saveHistory();
      drawCanvas();
    };

    const updateElement = () => {
      if (selectedElement.value) {
        drawCanvas();
      }
    };

    const deleteElement = () => {
      if (selectedElement.value) {
        const index = elements.value.indexOf(selectedElement.value);
        if (index > -1) {
          elements.value.splice(index, 1);
          selectedElement.value = null;
          saveHistory();
          drawCanvas();
        }
      }
    };

    const handleCanvasClick = event => {
      const rect = canvasRef.value.getBoundingClientRect();
      const scaleX = canvasWidth.value / rect.width;
      const scaleY = canvasHeight.value / rect.height;
      const x = (event.clientX - rect.left) * scaleX;
      const y = (event.clientY - rect.top) * scaleY;

      // Find clicked element
      const clickedElement = elements.value.find(
        el =>
          x >= el.x && x <= el.x + (el.width || 100) && y >= el.y && y <= el.y + (el.height || 50)
      );

      // Multi-select con Ctrl+Click
      if (event.ctrlKey || event.metaKey) {
        if (clickedElement) {
          // Agregar o remover de la selección
          const index = selectedElements.value.indexOf(clickedElement);
          if (index > -1) {
            selectedElements.value.splice(index, 1);
          } else {
            selectedElements.value.push(clickedElement);
          }
          selectedElement.value = clickedElement;
        }
      } else {
        // Click normal: seleccionar solo uno
        selectedElement.value = clickedElement || null;
        selectedElements.value = clickedElement ? [clickedElement] : [];
      }
      drawCanvas();
    };

    const handleMouseDown = event => {
      const rect = canvasRef.value.getBoundingClientRect();
      const scaleX = canvasWidth.value / rect.width;
      const scaleY = canvasHeight.value / rect.height;
      const x = (event.clientX - rect.left) * scaleX;
      const y = (event.clientY - rect.top) * scaleY;

      if (selectedElement.value) {
        // Verificar si se está clickeando un handle de resize
        const handle = getResizeHandle(x, y, selectedElement.value);
        if (handle) {
          isResizing.value = true;
          resizeHandle.value = handle;
          initialSize.value = {
            width: selectedElement.value.width || 100,
            height: selectedElement.value.height || 50,
            x: selectedElement.value.x || 0,
            y: selectedElement.value.y || 0,
          };
          dragOffset.value = { x, y };
          return;
        }

        // Verificar si se está clickeando dentro del elemento para moverlo
        if (
          x >= selectedElement.value.x &&
          x <= selectedElement.value.x + (selectedElement.value.width || 100) &&
          y >= selectedElement.value.y &&
          y <= selectedElement.value.y + (selectedElement.value.height || 50)
        ) {
          isDragging.value = true;
          dragOffset.value = {
            x: x - selectedElement.value.x,
            y: y - selectedElement.value.y,
          };
        }
      }
    };

    const handleMouseMove = event => {
      const rect = canvasRef.value.getBoundingClientRect();
      const scaleX = canvasWidth.value / rect.width;
      const scaleY = canvasHeight.value / rect.height;
      const x = (event.clientX - rect.left) * scaleX;
      const y = (event.clientY - rect.top) * scaleY;

      if (isResizing.value && selectedElement.value) {
        const deltaX = x - dragOffset.value.x;
        const deltaY = y - dragOffset.value.y;

        const handle = resizeHandle.value;
        const el = selectedElement.value;

        // Aplicar resize según el handle
        if (handle === 'se') {
          el.width = Math.max(20, initialSize.value.width + deltaX);
          el.height = Math.max(20, initialSize.value.height + deltaY);
        } else if (handle === 'sw') {
          const newWidth = Math.max(20, initialSize.value.width - deltaX);
          el.x = initialSize.value.x + (initialSize.value.width - newWidth);
          el.width = newWidth;
          el.height = Math.max(20, initialSize.value.height + deltaY);
        } else if (handle === 'ne') {
          el.width = Math.max(20, initialSize.value.width + deltaX);
          const newHeight = Math.max(20, initialSize.value.height - deltaY);
          el.y = initialSize.value.y + (initialSize.value.height - newHeight);
          el.height = newHeight;
        } else if (handle === 'nw') {
          const newWidth = Math.max(20, initialSize.value.width - deltaX);
          const newHeight = Math.max(20, initialSize.value.height - deltaY);
          el.x = initialSize.value.x + (initialSize.value.width - newWidth);
          el.y = initialSize.value.y + (initialSize.value.height - newHeight);
          el.width = newWidth;
          el.height = newHeight;
        } else if (handle === 'e') {
          el.width = Math.max(20, initialSize.value.width + deltaX);
        } else if (handle === 'w') {
          const newWidth = Math.max(20, initialSize.value.width - deltaX);
          el.x = initialSize.value.x + (initialSize.value.width - newWidth);
          el.width = newWidth;
        } else if (handle === 's') {
          el.height = Math.max(20, initialSize.value.height + deltaY);
        } else if (handle === 'n') {
          const newHeight = Math.max(20, initialSize.value.height - deltaY);
          el.y = initialSize.value.y + (initialSize.value.height - newHeight);
          el.height = newHeight;
        }

        drawCanvas();
      } else if (isDragging.value && selectedElement.value) {
        const deltaX = x - dragOffset.value.x - selectedElement.value.x;
        const deltaY = y - dragOffset.value.y - selectedElement.value.y;

        // Mover el elemento principal
        selectedElement.value.x = Math.max(0, x - dragOffset.value.x);
        selectedElement.value.y = Math.max(0, y - dragOffset.value.y);

        // Mover también los otros elementos seleccionados con el mismo delta
        selectedElements.value.forEach(el => {
          if (el !== selectedElement.value) {
            el.x = Math.max(0, el.x + deltaX);
            el.y = Math.max(0, el.y + deltaY);
          }
        });

        drawCanvas();
      }
    };

    const handleMouseUp = () => {
      if (isDragging.value || isResizing.value) {
        isDragging.value = false;
        isResizing.value = false;
        resizeHandle.value = null;
        saveHistory();
      }
    };

    const saveHistory = () => {
      history.value = history.value.slice(0, historyIndex.value + 1);
      history.value.push(JSON.parse(JSON.stringify(elements.value)));
      historyIndex.value = history.value.length - 1;
    };

    const undo = () => {
      if (canUndo.value) {
        historyIndex.value--;
        elements.value = JSON.parse(JSON.stringify(history.value[historyIndex.value]));
        selectedElement.value = null;
        drawCanvas();
      }
    };

    const redo = () => {
      if (canRedo.value) {
        historyIndex.value++;
        elements.value = JSON.parse(JSON.stringify(history.value[historyIndex.value]));
        selectedElement.value = null;
        drawCanvas();
      }
    };

    const clearCanvas = () => {
      if (confirm('Tem certeza que deseja limpar o canvas?')) {
        elements.value = [];
        selectedElement.value = null;
        saveHistory();
        drawCanvas();
      }
    };

    const centerElementHorizontally = () => {
      const elementsToCenter = selectedElements.value.length > 0 ? selectedElements.value : (selectedElement.value ? [selectedElement.value] : []);

      elementsToCenter.forEach(el => {
        const elementWidth = el.width || 100;
        // Posicionar el elemento para que su CENTRO esté en el centro horizontal de la página
        el.x = (canvasWidth.value / 2) - (elementWidth / 2);
      });

      saveHistory();
      drawCanvas();
    };

    const centerElementVertically = () => {
      const elementsToCenter = selectedElements.value.length > 0 ? selectedElements.value : (selectedElement.value ? [selectedElement.value] : []);

      elementsToCenter.forEach(el => {
        const elementHeight = el.height || 50;
        // Posicionar el elemento para que su CENTRO esté en el centro vertical de la página
        el.y = (canvasHeight.value / 2) - (elementHeight / 2);
      });

      saveHistory();
      drawCanvas();
    };

    const centerElementBoth = () => {
      const elementsToCenter = selectedElements.value.length > 0 ? selectedElements.value : (selectedElement.value ? [selectedElement.value] : []);

      elementsToCenter.forEach(el => {
        const elementWidth = el.width || 100;
        const elementHeight = el.height || 50;
        // Posicionar el elemento para que su CENTRO esté en el centro de la página
        el.x = (canvasWidth.value / 2) - (elementWidth / 2);
        el.y = (canvasHeight.value / 2) - (elementHeight / 2);
      });

      saveHistory();
      drawCanvas();
    };

    const alignElementTop = () => {
      const elementsToAlign = selectedElements.value.length > 0 ? selectedElements.value : (selectedElement.value ? [selectedElement.value] : []);

      elementsToAlign.forEach(el => {
        el.y = 0;
      });

      saveHistory();
      drawCanvas();
    };

    const alignElementBottom = () => {
      const elementsToAlign = selectedElements.value.length > 0 ? selectedElements.value : (selectedElement.value ? [selectedElement.value] : []);

      elementsToAlign.forEach(el => {
        const elementHeight = el.height || 50;
        // Posicionar para que el borde inferior esté al final de la página
        el.y = canvasHeight.value - elementHeight;
      });

      saveHistory();
      drawCanvas();
    };

    const saveTemplate = () => {
      const templateData = {
        ...props.template,
        [props.section]: {
          ...props.template[props.section],
          type: props.section, // Asegurar que el tipo esté presente
          enabled: elements.value.length > 0 ? true : (props.template[props.section]?.enabled || false), // Habilitar si hay elementos
          elements: elements.value,
        },
      };
      emit('save', templateData);
    };

    onMounted(() => {
      nextTick(() => {
        initCanvas();
      });
    });

    watch(
      () => [props.template?.pageSize, props.template?.orientation],
      () => {
        nextTick(() => {
          applyDimensions();
          drawCanvas();
          drawRulers();
        });
      }
    );

    return {
      rulerHRef,
      rulerVRef,
      canvasRef,
      canvasWidth,
      canvasHeight,
      showGrid,
      showRulers,
      isTextSelected,
      pageLabel,
      orientationLabel,
      selectedElement,
      selectedElements,
      elements,
      saving,
      canUndo,
      canRedo,
      addTextElement,
      addImageElement,
      addLogoElement,
      addSignatureElement,
      addQrCodeElement,
      addLineElement,
      updateElement,
      deleteElement,
      centerElementHorizontally,
      centerElementVertically,
      centerElementBoth,
      alignElementTop,
      alignElementBottom,
      handleCanvasClick,
      handleMouseDown,
      handleMouseMove,
      handleMouseUp,
      undo,
      redo,
      clearCanvas,
      fitToCanvas,
      toggleGrid,
      toggleRulers,
      toggleBold,
      toggleItalic,
      toggleUnderline,
      setParagraphAlign,
      setFontSize,
      setTextColor,
      setFontFamily,
      setLineHeight,
      saveTemplate,
    };
  },
};
</script>

<style scoped>
.pdf-template-canvas-editor {
  padding: 1rem;
}

.editor-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: #ffffff;
  border: 1px solid #dee2e6;
  border-radius: 0.5rem;
}
.toolbar-section {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.toolbar-title {
  font-size: 0.72rem;
  font-weight: 700;
  color: #6c757d;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.editor-container {
  display: flex;
  gap: 1rem;
  height: calc(100vh - 300px);
  align-items: flex-start;
}

.canvas-wrapper {
  flex: 0 0 auto;
  border: 1px solid #dee2e6;
  border-radius: 0.5rem;
  overflow: hidden;
  background: #ffffff;
}

.template-canvas {
  display: block;
  cursor: crosshair;
}

.properties-panel {
  width: 300px;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 0.5rem;
  overflow-y: auto;
}

.properties-panel .form-group-modern {
  flex-direction: column;
  align-items: flex-start;
  gap: 0.25rem;
}

.properties-panel .form-label-modern {
  min-width: auto;
  width: 100%;
}

/* Modern Form Styles */
.form-group-modern {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.5rem;
}

.form-label-modern {
  font-size: 0.7rem;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.7);
  text-transform: capitalize;
  letter-spacing: 0.5px;
  margin-bottom: 0;
  min-width: 120px;
  flex-shrink: 0;
}

.form-control-modern {
  flex: 1;
  padding: 0.4rem 0.625rem;
  font-size: 0.8125rem;
  font-weight: 500;
  line-height: 1.4;
  color: #000000;
  background-color: rgba(255, 255, 255, 0.95);
  border: 1.5px solid rgba(169, 169, 169, 0.25);
  border-radius: 5px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}

.form-control-modern:focus {
  outline: none;
  border-color: rgba(0, 194, 203, 0.5);
  box-shadow: 0 0 0 2px rgba(0, 194, 203, 0.1);
  background-color: rgba(255, 255, 255, 1);
}

.form-control-modern:hover:not(:disabled) {
  border-color: rgba(169, 169, 169, 0.4);
  background-color: rgba(255, 255, 255, 1);
}

.form-control-modern:disabled {
  background-color: rgba(245, 246, 247, 0.8);
  cursor: not-allowed;
  opacity: 0.6;
}

.modal.show {
  background: rgba(0, 0, 0, 0.5);
}

/* Rulers and layout alignment */
.rulers {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.ruler-horizontal {
  display: block;
  height: 24px;
  margin-left: 24px; /* align with vertical ruler width */
}

.ruler-horizontal.ruler-hidden {
  visibility: hidden;
}

.ruler-body {
  display: flex;
  align-items: flex-start;
}

.ruler-vertical {
  display: block;
  width: 24px;
}

.ruler-vertical.ruler-hidden {
  visibility: hidden;
}

.page-info {
  display: flex;
  align-items: center;
  color: #6c757d;
}

/* Properties panel enhancements */
.panel-group {
  border: 1px solid #e9ecef;
  border-radius: 8px;
  background: #ffffff;
}
.panel-group + .panel-group {
  margin-top: 0.75rem;
}
.group-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.75rem;
  font-weight: 700;
  color: #495057;
  background: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
}
.group-body {
  padding: 0.75rem;
}
.form-row {
  display: flex;
  gap: 0.5rem;
}
.form-col {
  flex: 1;
}
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 2rem 1rem;
  border: 1px dashed #ced4da;
  border-radius: 8px;
  background: #ffffff;
}
.empty-icon {
  font-size: 2rem;
  color: #adb5bd;
}
.empty-text {
  margin-top: 0.5rem;
  font-weight: 700;
  color: #495057;
}
.empty-subtext {
  font-size: 0.8rem;
  color: #6c757d;
}

/* Editor buttons style - flat white background with dark text */
.pdf-template-canvas-editor .btn {
  background: #ffffff !important;
  background-image: none !important;
  border: 1px solid #6c757d !important;
  color: #343a40 !important;
  box-shadow: none !important;
}
.pdf-template-canvas-editor .btn:hover {
  background: #f1f3f5 !important;
  border-color: #495057 !important;
  color: #212529 !important;
}
.pdf-template-canvas-editor .btn:active,
.pdf-template-canvas-editor .btn.active {
  background: #ced4da !important;
  border-color: #495057 !important;
  color: #212529 !important;
  box-shadow: none !important;
}
.pdf-template-canvas-editor .btn-danger {
  background: #ffffff !important;
  border-color: #dc3545 !important;
  color: #dc3545 !important;
}
.pdf-template-canvas-editor .btn-danger:hover {
  background: #fff5f5 !important;
  border-color: #bb2d3b !important;
  color: #bb2d3b !important;
}
.pdf-template-canvas-editor .btn-primary {
  background: #ffffff !important;
  border-color: #0d6efd !important;
  color: #0d6efd !important;
}
.pdf-template-canvas-editor .btn-primary:hover {
  background: #f0f7ff !important;
  border-color: #0a58ca !important;
  color: #0a58ca !important;
}
</style>
