<template>
  <div class="message-composer-modal" v-if="isOpen">
    <div class="modal-overlay" @click="close"></div>

    <div class="modal-container">
      <div class="modal-header">
        <h3>
          <i class="bi bi-chat-left-text"></i>
          {{
            massMode && userRole !== 'administrator' && userRole !== 'business'
              ? $t('messages.compose.massMessage')
              : chatMode
              ? $t('chat.newChat')
              : $t('messages.compose.newMessage')
          }}
        </h3>
        <button @click="close" class="close-btn">
          <i class="bi bi-x-lg"></i>
        </button>
      </div>

      <div class="modal-body">
        <!-- Pickers jerárquicos para iniciar Chat -->
        <div v-if="chatMode" class="mass-filters-section compact" style="margin-bottom: 10px">
          <h4><i class="bi bi-funnel"></i> Selección de destinatario (Chat)</h4>
          <div class="compact-pickers chat-pickers">
            <!-- Business (single) - solo para master -->
            <div
              v-if="userRole === 'master'"
              class="picker"
              :class="{ open: showBusinessPicker }"
              ref="businessPickerRef"
            >
              <button type="button" class="picker-button" @click="toggleBusinessPicker">
                <i class="bi bi-building"></i>
                Negocio
                <span class="badge">{{ chatSelectedBusinessName || '—' }}</span>
                <i class="bi" :class="showBusinessPicker ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
              </button>
              <transition name="fade-slide">
                <div v-if="showBusinessPicker" class="picker-panel">
                  <input
                    v-model="businessSearch"
                    type="text"
                    class="picker-search"
                    placeholder="Buscar negocios..."
                  />
                  <div class="picker-actions">
                    <button type="button" class="link" @click="clearChatBusiness">Limpiar</button>
                  </div>
                  <div class="picker-list">
                    <label v-for="b in filteredBusinessList" :key="b.id" class="checkbox-item">
                      <input
                        type="radio"
                        name="chat-business"
                        :value="b.id"
                        :checked="chatSelectedBusiness === b.id"
                        @change="selectChatBusiness(b)"
                      />
                      <span>{{ b.name || b.tag }}</span>
                    </label>
                  </div>
                </div>
              </transition>
            </div>

            <!-- Commerce (single) - solo para master -->
            <div
              v-if="userRole === 'master'"
              class="picker"
              :class="{ disabled: !chatCanPickCommerces, open: showCommercesPicker }"
              ref="commercesPickerRef"
            >
              <button
                type="button"
                class="picker-button"
                :disabled="!chatCanPickCommerces"
                @click="toggleCommercesPicker"
              >
                <i class="bi bi-shop"></i>
                Comercio
                <span class="badge">{{ chatSelectedCommerceName || '—' }}</span>
                <i
                  class="bi"
                  :class="showCommercesPicker ? 'bi-chevron-up' : 'bi-chevron-down'"
                ></i>
              </button>
              <transition name="fade-slide">
                <div v-if="showCommercesPicker" class="picker-panel">
                  <input
                    v-model="commerceSearch"
                    type="text"
                    class="picker-search"
                    placeholder="Buscar comercios..."
                  />
                  <div class="picker-actions">
                    <button type="button" class="link" @click="clearChatCommerce">Limpiar</button>
                  </div>
                  <div class="picker-list">
                    <label
                      v-for="c in chatFilteredCommercesBySearch"
                      :key="c.id"
                      class="checkbox-item"
                    >
                      <input
                        type="radio"
                        name="chat-commerce"
                        :value="c.id"
                        :checked="chatSelectedCommerce === c.id"
                        @change="selectChatCommerce(c)"
                      />
                      <span>{{ c.name || c.tag }}</span>
                    </label>
                  </div>
                </div>
              </transition>
            </div>

            <!-- Tipo (single) -->
            <div class="picker types">
              <div class="segmented">
                <button
                  type="button"
                  :class="{ active: chatRecipientType === 'collaborator' }"
                  @click="selectChatRecipientType('collaborator')"
                >
                  <i class="bi bi-person"></i> Colaborador
                </button>
                <button
                  type="button"
                  :class="{ active: chatRecipientType === 'administrator' }"
                  @click="selectChatRecipientType('administrator')"
                >
                  <i class="bi bi-person-gear"></i> Administrador
                </button>
              </div>
            </div>

            <!-- Persona (single) -->
            <div
              class="picker"
              :class="{ disabled: !chatCanPickRecipients, open: showRecipientsPicker }"
              ref="recipientsPickerRef"
            >
              <button
                type="button"
                class="picker-button"
                :disabled="!chatCanPickRecipients"
                @click="toggleRecipientsPicker"
              >
                <i class="bi bi-people"></i>
                Persona
                <span class="badge">{{ chatSelectedRecipientName || '—' }}</span>
                <i
                  class="bi"
                  :class="showRecipientsPicker ? 'bi-chevron-up' : 'bi-chevron-down'"
                ></i>
              </button>
              <transition name="fade-slide">
                <div v-if="showRecipientsPicker" class="picker-panel">
                  <input
                    v-model="recipientSearch"
                    type="text"
                    class="picker-search"
                    placeholder="Buscar personas..."
                  />
                  <div class="picker-actions">
                    <button type="button" class="link" @click="clearChatRecipient">Limpiar</button>
                  </div>
                  <div class="picker-list">
                    <label
                      v-for="r in chatFilteredRecipientsBySearch"
                      :key="r.id"
                      class="checkbox-item"
                    >
                      <input
                        type="radio"
                        name="chat-recipient"
                        :value="r.id"
                        :checked="chatSelectedRecipient === r.id"
                        @change="selectChatRecipient(r)"
                      />
                      <span
                        >{{ r.name }} <small class="muted">{{ r.email }}</small></span
                      >
                    </label>
                  </div>
                </div>
              </transition>
            </div>
          </div>
        </div>
        <!-- Grid compacto de 2 columnas -->
        <div class="form-row" v-if="!chatMode">
          <div class="form-field">
            <label for="message-type"><i class="bi bi-tag"></i> Tipo</label>
            <select id="message-type" v-model="form.type" class="form-select">
              <option value="chat">{{ $t('messages.compose.chat') }}</option>
              <option value="notification" v-if="canSendNotifications">
                {{ $t('messages.compose.notification') }}
              </option>
            </select>
          </div>

          <div class="form-field">
            <label for="message-category"
              ><i class="bi bi-folder"></i> {{ $t('messages.compose.category') }} *</label
            >
            <select id="message-category" v-model="form.category" class="form-select">
              <option value="direct_message">{{ $t('messages.categories.direct_message') }}</option>
              <option value="announcement">{{ $t('messages.categories.announcement') }}</option>
              <option value="attention_reminder">
                {{ $t('messages.categories.attention_reminder') }}
              </option>
              <option value="booking_reminder">
                {{ $t('messages.categories.booking_reminder') }}
              </option>
              <option value="booking_confirmed">
                {{ $t('messages.categories.booking_confirmed') }}
              </option>
              <option value="task_assigned">{{ $t('messages.categories.task_assigned') }}</option>
              <option value="stock">{{ $t('messages.categories.stock') }}</option>
              <option value="low_stock">{{ $t('messages.categories.low_stock') }}</option>
              <option value="payment_received">
                {{ $t('messages.categories.payment_received') }}
              </option>
              <option value="payment_pending">
                {{ $t('messages.categories.payment_pending') }}
              </option>
            </select>
          </div>
        </div>

        <!-- Filtros para mensajes masivos -->
        <div v-if="massMode" class="mass-filters-section compact">
          <h4><i class="bi bi-funnel"></i> Filtros de Destinatarios</h4>
          <div class="compact-pickers">
            <!-- Picker: Business (solo master; para business/admin se usa implícitamente su próprio business) -->
            <div
              v-if="userRole === 'master'"
              class="picker"
              :class="{ open: showBusinessPicker }"
              ref="businessPickerRef"
            >
              <button type="button" class="picker-button" @click="toggleBusinessPicker">
                <i class="bi bi-building"></i>
                Negocios
                <span v-if="massFilters.selectAllBusiness" class="badge">Todos</span>
                <span v-else class="badge">{{ massFilters.selectedBusiness.length }}</span>
                <i class="bi" :class="showBusinessPicker ? 'bi-chevron-up' : 'bi-chevron-down'"></i>
              </button>
              <transition name="fade-slide">
                <div v-if="showBusinessPicker" class="picker-panel">
                  <input
                    v-model="businessSearch"
                    type="text"
                    class="picker-search"
                    placeholder="Buscar negocios..."
                  />
                  <div class="picker-actions">
                    <button type="button" class="link" @click="selectAllFilteredBusiness">
                      Seleccionar todo (filtrados)
                    </button>
                    <button type="button" class="link" @click="clearSelectedBusiness">
                      Limpiar
                    </button>
                  </div>
                  <div class="picker-list">
                    <label class="checkbox-item">
                      <input
                        type="checkbox"
                        v-model="massFilters.selectAllBusiness"
                        @change="toggleSelectAllBusiness"
                      />
                      <span>Todos los negocios</span>
                    </label>
                    <label
                      v-for="business in filteredBusinessList"
                      :key="business.id"
                      class="checkbox-item"
                    >
                      <input
                        type="checkbox"
                        :value="business.id"
                        v-model="massFilters.selectedBusiness"
                        @change="handleBusinessChange"
                      />
                      <span>{{ business.name }}</span>
                    </label>
                  </div>
                </div>
              </transition>
            </div>

            <!-- Picker: Comercios -->
            <div
              class="picker"
              :class="{ disabled: !canPickCommerces, open: showCommercesPicker }"
              ref="commercesPickerRef"
            >
              <button
                type="button"
                class="picker-button"
                :disabled="!canPickCommerces"
                @click="toggleCommercesPicker"
              >
                <i class="bi bi-shop"></i>
                Comercios
                <span v-if="massFilters.selectAllCommerces" class="badge">Todos</span>
                <span v-else class="badge">{{ massFilters.selectedCommerces.length }}</span>
                <i
                  class="bi"
                  :class="showCommercesPicker ? 'bi-chevron-up' : 'bi-chevron-down'"
                ></i>
              </button>
              <transition name="fade-slide">
                <div v-if="showCommercesPicker" class="picker-panel">
                  <input
                    v-model="commerceSearch"
                    type="text"
                    class="picker-search"
                    placeholder="Buscar comercios..."
                  />
                  <div class="picker-actions">
                    <button type="button" class="link" @click="selectAllFilteredCommerces">
                      Seleccionar todo (filtrados)
                    </button>
                    <button type="button" class="link" @click="clearSelectedCommerces">
                      Limpiar
                    </button>
                  </div>
                  <div class="picker-list">
                    <label class="checkbox-item">
                      <input
                        type="checkbox"
                        v-model="massFilters.selectAllCommerces"
                        @change="toggleSelectAllCommerces"
                      />
                      <span>Todos los comercios</span>
                    </label>
                    <label
                      v-for="commerce in filteredCommercesBySearch"
                      :key="commerce.id"
                      class="checkbox-item"
                    >
                      <input
                        type="checkbox"
                        :value="commerce.id"
                        v-model="massFilters.selectedCommerces"
                        @change="handleCommerceChange"
                      />
                      <span>{{ commerce.name }}</span>
                    </label>
                  </div>
                </div>
              </transition>
            </div>

            <!-- Tipos: Colaboradores / Administradores -->
            <div class="picker types">
              <div class="segmented">
                <button
                  type="button"
                  :class="{ active: massFilters.recipientTypes.includes('collaborator') }"
                  @click="toggleRecipientType('collaborator')"
                >
                  <i class="bi bi-person"></i> Colaboradores
                </button>
                <button
                  type="button"
                  :class="{ active: massFilters.recipientTypes.includes('administrator') }"
                  @click="toggleRecipientType('administrator')"
                >
                  <i class="bi bi-person-gear"></i> Administradores
                </button>
              </div>
            </div>

            <!-- Picker: Destinatarios -->
            <div
              class="picker"
              :class="{ disabled: !canPickRecipients, open: showRecipientsPicker }"
              ref="recipientsPickerRef"
            >
              <button
                type="button"
                class="picker-button"
                :disabled="!canPickRecipients"
                @click="toggleRecipientsPicker"
              >
                <i class="bi bi-people"></i>
                Personas
                <span class="badge">{{ massFilters.selectedRecipients.length }}</span>
                <i
                  class="bi"
                  :class="showRecipientsPicker ? 'bi-chevron-up' : 'bi-chevron-down'"
                ></i>
              </button>
              <transition name="fade-slide">
                <div v-if="showRecipientsPicker" class="picker-panel">
                  <input
                    v-model="recipientSearch"
                    type="text"
                    class="picker-search"
                    placeholder="Buscar personas..."
                  />
                  <div class="picker-actions">
                    <button type="button" class="link" @click="selectAllFilteredRecipients">
                      Seleccionar todo (filtrados)
                    </button>
                    <button type="button" class="link" @click="clearSelectedRecipients">
                      Limpiar
                    </button>
                  </div>
                  <div class="picker-list">
                    <label class="checkbox-item">
                      <input
                        type="checkbox"
                        v-model="massFilters.selectAllRecipients"
                        @change="toggleSelectAllRecipients"
                      />
                      <span>Seleccionar todos</span>
                    </label>
                    <label
                      v-for="recipient in filteredRecipientsBySearch"
                      :key="recipient.id"
                      class="checkbox-item"
                    >
                      <input
                        type="checkbox"
                        :value="recipient.id"
                        v-model="massFilters.selectedRecipients"
                        @change="handleRecipientChange"
                      />
                      <span
                        >{{ recipient.name }}
                        <small class="muted">{{ recipient.email }}</small></span
                      >
                    </label>
                  </div>
                </div>
              </transition>
            </div>
          </div>

          <!-- Resumen compacto -->
          <div v-if="hasAnySelection" class="selection-summary compact">
            <span class="chip"
              ><i class="bi bi-building"></i>
              {{ massFilters.selectAllBusiness ? 'Todos' : massFilters.selectedBusiness.length }}
              negocios</span
            >
            <span class="chip"
              ><i class="bi bi-shop"></i>
              {{ massFilters.selectAllCommerces ? 'Todos' : massFilters.selectedCommerces.length }}
              comercios</span
            >
            <span class="chip" v-if="massFilters.recipientTypes.length"
              ><i class="bi bi-people"></i> {{ massFilters.recipientTypes.join(', ') }}</span
            >
            <span class="chip primary"
              ><i class="bi bi-person-check"></i>
              {{ massFilters.selectedRecipients.length }} destinatarios</span
            >
          </div>
        </div>

        <!-- Selector de destinatario para mensajes normales -->
        <div
          class="form-field"
          v-if="form.recipientType && !massMode && !chatMode && userRole !== 'master'"
        >
          <label for="recipient-id"
            ><i class="bi bi-people"></i> {{ $t('messages.compose.selectRecipient') }} *</label
          >
          <select
            id="recipient-id"
            v-model="form.recipientId"
            class="form-select"
            :disabled="loadingRecipients"
          >
            <option value="">
              {{
                loadingRecipients ? $t('common.loading') : $t('messages.compose.chooseRecipient')
              }}
            </option>
            <option v-for="recipient in recipients" :key="recipient.id" :value="recipient.id">
              {{ recipient.name || recipient.email }}
            </option>
          </select>
        </div>

        <div class="form-field" v-if="!chatMode">
          <label for="message-title"
            ><i class="bi bi-card-heading"></i> {{ $t('messages.compose.title') }} *</label
          >
          <input
            id="message-title"
            v-model="form.title"
            type="text"
            class="form-input"
            :placeholder="$t('messages.compose.titlePlaceholder')"
            maxlength="100"
          />
        </div>

        <div class="form-field">
          <label for="message-content"
            ><i class="bi bi-text-paragraph"></i> {{ $t('messages.compose.content') }} *</label
          >
          <textarea
            id="message-content"
            v-model="form.content"
            class="form-textarea"
            :placeholder="$t('messages.compose.contentPlaceholder')"
            rows="4"
            maxlength="500"
          ></textarea>
          <small class="char-counter">{{ form.content.length }}/500</small>
        </div>

        <!-- Sección de acciones colapsable (solo en modo normal) -->
        <div class="action-toggle" v-if="!chatMode && !showActions && !form.actionLink">
          <button @click="showActions = true" class="btn-link">
            <i class="bi bi-plus-circle"></i> Agregar acción (opcional)
          </button>
        </div>

        <div class="form-row" v-if="!chatMode && (showActions || form.actionLink)">
          <div class="form-field">
            <label for="action-link"
              ><i class="bi bi-link-45deg"></i> {{ $t('messages.compose.actionLink') }}</label
            >
            <input
              id="action-link"
              v-model="form.actionLink"
              type="text"
              class="form-input-sm"
              :placeholder="$t('messages.compose.actionLinkPlaceholder')"
            />
          </div>

          <div class="form-field">
            <label for="action-label"
              ><i class="bi bi-tag"></i> {{ $t('messages.compose.actionLabel') }}</label
            >
            <input
              id="action-label"
              v-model="form.actionLabel"
              type="text"
              class="form-input-sm"
              :placeholder="$t('messages.compose.actionLabelPlaceholder')"
            />
          </div>
        </div>
      </div>
      <!-- Cierre del modal-body -->

      <div class="modal-footer">
        <button @click="close" class="btn-cancel">
          <i class="bi bi-x-circle"></i> {{ $t('common.cancel') }}
        </button>
        <button @click="send" class="btn-send" :disabled="!canSend || sending">
          <i class="bi" :class="sending ? 'bi-arrow-repeat spin' : 'bi-send'"></i>
          {{ sending ? $t('common.sending') : $t('messages.compose.send') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';
import internalMessageService from '@/application/services/internal-message';
import { requestBackend } from '@/application/api';
import { useChatConversations } from '@/composables/useChatConversations';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
  userRole: {
    type: String,
    default: 'collaborator', // 'master', 'administrator', 'business', 'collaborator'
  },
  userData: {
    type: Object,
    default: () => ({}), // { id, businessId, commerceId, commerceIds }
  },
  chatMode: {
    type: Boolean,
    default: false, // Cuando es true, simplifica el formulario solo para chat
  },
  massMode: {
    type: Boolean,
    default: false, // Cuando es true, permite mensajes masivos con filtro de comercios
  },
});

const emit = defineEmits(['close', 'sent']);

const { t } = useI18n();

// Chat composable
const { getOrCreateConversation, sendMessage: sendChatMessage } = useChatConversations();

const form = ref({
  type: 'chat',
  recipientType: '',
  recipientId: '',
  commerceFilter: '', // Para filtrado de comercios en modo masivo
  category: 'direct_message',
  priority: 'normal',
  title: '',
  content: '',
  actionLink: '',
  actionLabel: '',
});

const recipients = ref([]);
const allRecipients = ref([]); // Lista completa sin filtrar
const availableCommerces = ref([]);
const availableBusiness = ref([]);
const loadingRecipients = ref(false);
const sending = ref(false);
const showActions = ref(false);

// Filtros para mensajes masivos
const massFilters = ref({
  selectAllBusiness: false,
  selectedBusiness: [],
  selectAllCommerces: false,
  selectedCommerces: [],
  recipientTypes: [],
  selectAllRecipients: false,
  selectedRecipients: [],
});

// Estado UI compacta (pickers + búsquedas)
const showBusinessPicker = ref(false);
const showCommercesPicker = ref(false);
const showRecipientsPicker = ref(false);
const businessSearch = ref('');
const commerceSearch = ref('');
const recipientSearch = ref('');
// Estado para selección de Chat (master)
const chatSelectedBusiness = ref('');
const chatSelectedCommerce = ref('');
const chatRecipientType = ref('');
const chatSelectedRecipient = ref('');

const chatSelectedBusinessName = computed(() => {
  const b = availableBusiness.value.find(b => b.id === chatSelectedBusiness.value);
  return b?.name || b?.tag || '';
});
const chatSelectedCommerceName = computed(() => {
  const c = availableCommerces.value.find(c => c.id === chatSelectedCommerce.value);
  return c?.name || c?.tag || '';
});
const chatSelectedRecipientName = computed(
  () => allRecipients.value.find(r => r.id === chatSelectedRecipient.value)?.name || '',
);

const chatFilteredCommerces = computed(() => {
  if (!chatSelectedBusiness.value) return [];
  const target = String(chatSelectedBusiness.value);

  function getBizId(c) {
    if (!c) return '';
    if (c.businessId) return String(c.businessId);
    const b = c.business;
    if (!b) return '';
    if (typeof b === 'string') return String(b);
    if (typeof b === 'object') {
      if (b.id) return String(b.id);
      if (b.uid) return String(b.uid);
      if (b._id) return String(b._id);
    }
    return '';
  }

  return (availableCommerces.value || []).filter(c => getBizId(c) === target);
});

const chatFilteredCommercesBySearch = computed(() => {
  const base = chatFilteredCommerces.value;
  const q = commerceSearch.value.trim().toLowerCase();
  if (!q) return base;
  return base.filter(c => (c.name || '').toLowerCase().includes(q));
});

const chatFilteredRecipients = computed(() => {
  // Para master: requiere tipo y commerce
  if (props.userRole === 'master') {
    if (!chatRecipientType.value || !chatSelectedCommerce.value) return [];
    const selectedId = String(chatSelectedCommerce.value);
    return allRecipients.value.filter(r => {
      if (r.type !== chatRecipientType.value) return false;
      const cid = r?.commerceId || r?.commerce?.id;
      if (cid && String(cid) === selectedId) return true;
      const cids = r?.commercesId;
      if (Array.isArray(cids) && cids.map(x => String(x)).includes(selectedId)) return true;
      return false;
    });
  }

  // Para no-master: usar recipients ya filtrados por loadRecipients
  if (!chatRecipientType.value) return [];
  return recipients.value.filter(r => r.type === chatRecipientType.value);
});

const chatFilteredRecipientsBySearch = computed(() => {
  const base = chatFilteredRecipients.value;
  const q = recipientSearch.value.trim().toLowerCase();
  if (!q) return base;
  return base.filter(
    r => (r.name || '').toLowerCase().includes(q) || (r.email || '').toLowerCase().includes(q),
  );
});

const chatCanPickCommerces = computed(() => !!chatSelectedBusiness.value);
const chatCanPickRecipients = computed(() => {
  // Para master: requiere commerce y tipo seleccionados
  if (props.userRole === 'master') {
    const result = !!chatSelectedCommerce.value && !!chatRecipientType.value;
    console.log({
      chatSelectedCommerce: chatSelectedCommerce.value,
      chatRecipientType: chatRecipientType.value,
      result,
    });
    return result;
  }
  // Para no-master: solo requiere tipo seleccionado
  const result = !!chatRecipientType.value;
  console.log({
    chatRecipientType: chatRecipientType.value,
    userRole: props.userRole,
    result,
  });
  return result;
});

function selectChatBusiness(biz) {
  chatSelectedBusiness.value = biz.id;
  chatSelectedCommerce.value = '';
  chatRecipientType.value = '';
  chatSelectedRecipient.value = '';
  showBusinessPicker.value = false;
  // Intentar garantizar comercios para ese negocio si no están cargados
  ensureCommercesForBusiness(biz.id);
  // Abrir el picker de comercios para que el usuario elija
  showCommercesPicker.value = true;
}
function clearChatBusiness() {
  selectChatBusiness({ id: '' });
}

function selectChatCommerce(com) {
  chatSelectedCommerce.value = com.id;
  chatRecipientType.value = '';
  chatSelectedRecipient.value = '';
  showCommercesPicker.value = false;
  // Abrir el picker de personas para que el usuario elija
  showRecipientsPicker.value = true;
}
function clearChatCommerce() {
  selectChatCommerce({ id: '' });
}

function selectChatRecipientType(type) {

  chatRecipientType.value = type;
  chatSelectedRecipient.value = '';

  // Para master: requiere commerce seleccionado
  // Para no-master: cargar recipients inmediatamente
  if (props.userRole === 'master') {
    if (chatSelectedCommerce.value) {
      showRecipientsPicker.value = true;
    }
  } else {
    // Para no-master, cargar recipients del tipo seleccionado
    form.value.recipientType = type;
    loadRecipients().then(() => {
      showRecipientsPicker.value = true;
    });
  }
}

function selectChatRecipient(r) {
  chatSelectedRecipient.value = r.id;
  showRecipientsPicker.value = false;
}
function clearChatRecipient() {
  chatSelectedRecipient.value = '';
  form.value.recipientId = '';
}

// Refs para detectar clicks fuera de los pickers
const businessPickerRef = ref(null);
const commercesPickerRef = ref(null);
const recipientsPickerRef = ref(null);

// Computed para comercios filtrados por business seleccionados
const filteredCommerces = computed(() => {
  // Para usuarios business/administrator, los comercios ya vienen filtrados por su business:
  // no hace falta seleccionar business manualmente.
  if (props.userRole === 'business' || props.userRole === 'administrator') {
    return availableCommerces.value;
  }

  if (massFilters.value.selectAllBusiness) {
    return availableCommerces.value;
  }
  return availableCommerces.value.filter(commerce =>
    massFilters.value.selectedBusiness.includes(commerce.businessId)
  );
});

// Computed para destinatarios filtrados
const filteredRecipients = computed(() => {
  if (!massFilters.value.recipientTypes.length) return [];

  let filtered = allRecipients.value.filter(recipient =>
    massFilters.value.recipientTypes.includes(recipient.type)
  );

  // Filtrar por comercios si no es "todos"
  if (!massFilters.value.selectAllCommerces && massFilters.value.selectedCommerces.length > 0) {
    const selectedCommerces = massFilters.value.selectedCommerces.map(id => String(id));
    filtered = filtered.filter(recipient => {
      const singleCid = recipient.commerceId || recipient.commerce?.id;
      if (singleCid && selectedCommerces.includes(String(singleCid))) {
        return true;
      }
      if (recipient.commercesId && Array.isArray(recipient.commercesId)) {
        return recipient.commercesId.some(id => selectedCommerces.includes(String(id)));
      }
      return false;
    });
  }

  // Para usuarios business/administrator, asegurar que los administradores pertenezcan a su business
  if (
    (props.userRole === 'business' || props.userRole === 'administrator') &&
    props.userData.businessId
  ) {
    const currentBizId = String(props.userData.businessId);
    filtered = filtered.filter(recipient => {
      if (recipient.type !== 'administrator') return true; // colaboradores ya están restringidos por comercios
      return recipient.businessId && String(recipient.businessId) === currentBizId;
    });
  }

  return filtered;
});

// Filtrado adicional por búsqueda (listas potencialmente grandes)
const filteredBusinessList = computed(() => {
  const q = businessSearch.value.trim().toLowerCase();
  if (!q) return availableBusiness.value;
  return availableBusiness.value.filter(b => (b.name || '').toLowerCase().includes(q));
});

const filteredCommercesBySearch = computed(() => {
  const base = filteredCommerces.value;
  const q = commerceSearch.value.trim().toLowerCase();
  if (!q) return base;
  return base.filter(c => (c.name || '').toLowerCase().includes(q));
});

const filteredRecipientsBySearch = computed(() => {
  const base = filteredRecipients.value;
  const q = recipientSearch.value.trim().toLowerCase();
  if (!q) return base;
  return base.filter(
    r => (r.name || '').toLowerCase().includes(q) || (r.email || '').toLowerCase().includes(q),
  );
});

// Habilitaciones y resumen
const canPickCommerces = computed(() => {
  // Para business/administrator, los comercios ya vienen filtrados por su business
  // así que el picker de comercios debe estar siempre habilitado.
  if (props.userRole === 'business' || props.userRole === 'administrator') {
    return availableCommerces.value.length > 0;
  }
  return massFilters.value.selectAllBusiness || massFilters.value.selectedBusiness.length > 0;
});
const canPickRecipients = computed(
  () =>
    (massFilters.value.selectAllCommerces || massFilters.value.selectedCommerces.length > 0) &&
    massFilters.value.recipientTypes.length > 0,
);
const hasAnySelection = computed(
  () =>
    massFilters.value.selectAllBusiness ||
    massFilters.value.selectedBusiness.length > 0 ||
    massFilters.value.selectAllCommerces ||
    massFilters.value.selectedCommerces.length > 0 ||
    massFilters.value.recipientTypes.length > 0 ||
    massFilters.value.selectedRecipients.length > 0,
);

// Determina qué tipos de destinatarios puede seleccionar según el rol
const availableRecipientTypes = computed(() => {
  switch (props.userRole) {
    case 'master':
      // MASTER puede enviar a todos (collaborators y administrators)
      return ['collaborator', 'administrator'];
    case 'administrator':
    case 'business':
      // ADMINISTRATOR/BUSINESS puede enviar a collaborators de su businessId y otros administrators de su businessId
      return ['collaborator', 'administrator'];
    case 'collaborator':
      // COLLABORATOR puede enviar a otros collaborators de su commerceId y administrators de su businessId
      return ['collaborator', 'administrator'];
    default:
      return ['collaborator'];
  }
});

const canSendNotifications = computed(
  () => props.userRole === 'master' || props.userRole === 'administrator'
);

const canSend = computed(() => {
  // En chat mode no se requiere title
  if (props.chatMode) {
    const hasRecipient =
      props.userRole === 'master'
        ? chatSelectedRecipient.value // Para master se usa el selector completo
        : chatSelectedRecipient.value; // Para no-master se usa el selector simple
    return hasRecipient && form.value.content.trim();
  }

  // En modo masivo, no se requiere recipientId específico, pero sí recipientType
  if (props.massMode) {
    return (
      massFilters.value.selectedRecipients.length > 0 &&
      form.value.category &&
      form.value.title.trim() &&
      form.value.content.trim()
    );
  }

  // Modo normal
  return (
    form.value.recipientId &&
    form.value.recipientType &&
    form.value.category &&
    form.value.title.trim() &&
    form.value.content.trim()
  );
});

watch(
  () => props.isOpen,
  newVal => {
    if (newVal) {
      resetForm();
      // En chat mode, preconfigurar valores DESPUÉS del reset
      if (props.chatMode) {
        form.value.type = 'chat';
        form.value.category = 'direct_message';
        form.value.priority = 'normal';
        if (props.userRole === 'master') {
          loadAvailableBusiness();
          loadAvailableCommerces();
          loadAllRecipients();
        } else {
          // Para usuarios no-master en chat mode, configurar tipo por defecto y cargar recipients
          chatRecipientType.value = 'collaborator';
          loadRecipients();
        }
      }
      // En modo masivo, cargar datos iniciales
      if (props.massMode) {
        loadAvailableBusiness();
        loadAvailableCommerces();
        loadAllRecipients();
      }
      // Para no-master, establecer tipo por defecto para habilitar selección de destinatario
      if (!props.chatMode && props.userRole !== 'master') {
        form.value.type = 'chat';
        form.value.recipientType = form.value.recipientType || 'collaborator';
        loadRecipients();
      }
    }
  },
);

// Función para cargar business disponibles
async function loadAvailableBusiness() {
  try {
    let endpoint = '';
    if (props.userRole === 'master') {
      // Master puede ver todos los business
      endpoint = '/business';
    } else if (props.userData.businessId) {
      // Otros usuarios solo ven su business
      availableBusiness.value = [
        {
          id: props.userData.businessId,
          name: props.userData.businessName || 'Mi Negocio',
        },
      ];
      return;
    } else {
      return;
    }

    const response = await requestBackend.get(endpoint);
    availableBusiness.value = response.data || [];
  } catch (error) {
    console.error('Error loading business:', error);
    availableBusiness.value = [];
  }
}

// Función para cargar comercios disponibles
async function loadAvailableCommerces() {
  try {
    let endpoint = '';
    if (props.userRole === 'master') {
      // Master puede ver todos los comercios
      endpoint = '/commerce';
    } else if (props.userData.businessId) {
      // Otros usuarios ven comercios de su negocio
      endpoint = `/commerce/businessId/${props.userData.businessId}`;
    } else {
      return;
    }

    const response = await requestBackend.get(endpoint);
    availableCommerces.value = response.data || [];
  } catch (error) {
    console.error('Error loading commerces:', error);
    availableCommerces.value = [];
  }
}

// Cargar todos los destinatarios para filtrado masivo
async function loadAllRecipients() {
  try {
    // Cargar collaborators (endpoint disponible)
    const collaboratorsResponse = await requestBackend.get('/collaborator');

    const collaborators = (collaboratorsResponse.data || []).map(item => ({
      id: item.id,
      name: item.name || `${item.firstName || ''} ${item.lastName || ''}`.trim(),
      email: item.email,
      type: 'collaborator',
      commerceId: item.commerceId,
      commercesId: item.commercesId,
      businessId: item.businessId,
    }));

    // Para administrators, necesitamos obtenerlos por business ya que no hay endpoint general
    let administrators = [];
    try {
      // Primero obtener todos los business disponibles
      const businessResponse = await requestBackend.get('/business');
      const businesses = businessResponse.data || [];

      // Obtener administrators de cada business
      const administratorsPromises = businesses.map(business =>
        requestBackend.get(`/administrator/businessId/${business.id}`).catch(error => {
          console.warn(`Error loading administrators for business ${business.id}:`, error);
          return { data: [] }; // Return empty array if fails
        })
      );

      const administratorsResponses = await Promise.all(administratorsPromises);

      // Combinar todos los administrators y eliminar duplicados por ID
      const allAdministrators = administratorsResponses.flatMap(response => response.data || []);
      const uniqueAdministrators = new Map();

      allAdministrators.forEach(admin => {
        if (!uniqueAdministrators.has(admin.id)) {
          uniqueAdministrators.set(admin.id, {
            id: admin.id,
            name:
              admin.name ||
              admin.businessName ||
              `${admin.firstName || ''} ${admin.lastName || ''}`.trim(),
            email: admin.email,
            type: 'administrator',
            businessId: admin.businessId,
            commerceId: admin.commerceId || admin.commerce?.id,
            commercesId: admin.commercesId || [],
          });
        }
      });

      administrators = Array.from(uniqueAdministrators.values());
    } catch (error) {
      console.error('Error loading administrators:', error);
      // Si falla, continúa solo con collaborators
    }

    allRecipients.value = [...collaborators, ...administrators];

    // Filtrar el usuario actual
    if (props.userData.id) {
      allRecipients.value = allRecipients.value.filter(item => item.id !== props.userData.id);
    }
  } catch (error) {
    console.error('Error loading all recipients:', error);
    allRecipients.value = [];
  }
}

// Handlers para filtros masivos
function toggleAllBusiness() {
  if (massFilters.value.selectAllBusiness) {
    massFilters.value.selectedBusiness = [];
  } else {
    massFilters.value.selectedBusiness = availableBusiness.value.map(b => b.id);
  }
  onBusinessChange();
}

function onBusinessChange() {
  // Reset comercios y destinatarios cuando cambia business
  massFilters.value.selectedCommerces = [];
  massFilters.value.selectAllCommerces = false;
  massFilters.value.selectedRecipients = [];
  massFilters.value.selectAllRecipients = false;
}

function toggleAllCommerces() {
  if (massFilters.value.selectAllCommerces) {
    massFilters.value.selectedCommerces = [];
  } else {
    massFilters.value.selectedCommerces = filteredCommerces.value.map(c => c.id);
  }
  onCommerceChange();
}

function onCommerceChange() {
  // Reset destinatarios cuando cambian comercios
  massFilters.value.selectedRecipients = [];
  massFilters.value.selectAllRecipients = false;
}

function onRecipientTypeChange() {
  // Reset destinatarios cuando cambia tipo
  massFilters.value.selectedRecipients = [];
  massFilters.value.selectAllRecipients = false;
}

function toggleAllRecipients() {
  if (massFilters.value.selectAllRecipients) {
    massFilters.value.selectedRecipients = [];
  } else {
    massFilters.value.selectedRecipients = filteredRecipients.value.map(r => r.id);
  }
}

function onRecipientChange() {
  massFilters.value.selectAllRecipients =
    massFilters.value.selectedRecipients.length === filteredRecipients.value.length;
}

// Función para filtrar destinatarios por comercio
function filterRecipientsByCommerce() {
  if (!form.value.commerceFilter) {
    // Si no hay filtro, mostrar todos
    recipients.value = allRecipients.value;
    return;
  }

  // Filtrar por comercio seleccionado
  recipients.value = allRecipients.value.filter(recipient => {
    if (recipient.commerceId === form.value.commerceFilter) {
      return true;
    }
    if (recipient.commercesId && Array.isArray(recipient.commercesId)) {
      return recipient.commercesId.includes(form.value.commerceFilter);
    }
    return false;
  });
}

async function loadRecipients() {
  if (!form.value.recipientType) {
    recipients.value = [];
    return;
  }

  loadingRecipients.value = true;
  try {
    let endpoint = '';
    let data = [];
    let response;

    switch (form.value.recipientType) {
      case 'collaborator':
        if (props.userRole === 'master') {
          // MASTER puede ver TODOS los collaborators
          endpoint = '/collaborator';
          response = await requestBackend.get(endpoint);

          data = response.data;
        } else if (
          (props.userRole === 'business' || props.userRole === 'administrator') &&
          props.userData.businessId
        ) {
          // ADMINISTRATOR/BUSINESS puede enviar a collaborators de los commerces de su negocio
          // 1. Primero obtener los commerces del businessId
          const commercesResponse = await requestBackend.get(
            `/commerce/businessId/${props.userData.businessId}`,
          );
          const commerces = commercesResponse.data;
          const commercesIds = commerces.map(c => c.id);

          // 2. Luego obtener todos los collaborators y filtrar por commerceId
          endpoint = '/collaborator';
          response = await requestBackend.get(endpoint);

          // Filtrar collaborators cuyo commerceId esté en la lista de commerces del business
          data = response.data.filter(collab => {
            // El collaborator puede tener commerceId (singular) o commercesId (array)
            if (collab.commerceId && commercesIds.includes(collab.commerceId)) {
              return true;
            }
            if (collab.commercesId && Array.isArray(collab.commercesId)) {
              // Verificar si alguno de los commerces del collaborator está en los del business
              return collab.commercesId.some(id => commercesIds.includes(id));
            }
            return false;
          });
        } else if (props.userRole === 'collaborator' && props.userData.commerceId) {
          // COLLABORATOR solo puede enviar a otros de su mismo commerceId
          endpoint = `/collaborator/commerceId/${props.userData.commerceId}`;
          response = await requestBackend.get(endpoint);
          data = response.data;
        } else {
          // Fallback: traer todos
          endpoint = '/collaborator';
          response = await requestBackend.get(endpoint);
          data = response.data;
        }
        break;

      case 'administrator':
        if (props.userRole === 'master') {
          // MASTER puede ver TODOS los administrators de todos los business
          try {
            // Obtener todos los business disponibles
            const businessResponse = await requestBackend.get('/business');
            const businesses = businessResponse.data || [];

            if (businesses.length === 0) {
              console.warn('[MessageComposer] No businesses found');
              data = [];
              break;
            }

            // Obtener administrators de cada business
            const administratorsPromises = businesses.map(business =>
              requestBackend.get(`/administrator/businessId/${business.id}`).catch(error => {
                console.warn(`Error loading administrators for business ${business.id}:`, error);
                return { data: [] }; // Return empty array if fails
              })
            );

            const administratorsResponses = await Promise.all(administratorsPromises);

            // Combinar todos los administrators y eliminar duplicados por ID
            const allAdministrators = administratorsResponses.flatMap(
              response => response.data || [],
            );
            const uniqueAdministrators = new Map();

            allAdministrators.forEach(admin => {
              if (!uniqueAdministrators.has(admin.id)) {
                uniqueAdministrators.set(admin.id, admin);
              }
            });

            data = Array.from(uniqueAdministrators.values());
          } catch (error) {
            console.error('[MessageComposer] Error loading all administrators for master:', error);
            data = [];
          }
        } else if (
          (props.userRole === 'business' || props.userRole === 'administrator') &&
          props.userData.businessId
        ) {
          // ADMINISTRATOR/BUSINESS puede enviar a otros administrators de su businessId
          endpoint = `/administrator/businessId/${props.userData.businessId}`;
          response = await requestBackend.get(endpoint);
          data = response.data;
        } else if (props.userRole === 'collaborator') {
          // COLLABORATOR puede enviar a administrators de su businessId
          // Primero necesitamos obtener el businessId desde el commerce
          let businessId = props.userData.businessId;

          if (!businessId && props.userData.commerceId) {
            try {
              const commerceResponse = await requestBackend.get(
                `/commerce/${props.userData.commerceId}`,
              );
              businessId = commerceResponse.data?.businessId;
            } catch (error) {
              console.error('[MessageComposer] Error fetching commerce:', error);
            }
          }

          if (businessId) {
            endpoint = `/administrator/businessId/${businessId}`;
            response = await requestBackend.get(endpoint);
            data = response.data;
          } else {
            console.warn(
              '[MessageComposer] Collaborator without businessId - cannot list administrators',
            );
            data = [];
          }
        } else {
          // Sin businessId no podemos traer administrators
          console.warn('[MessageComposer] No businessId available - cannot list administrators');
          data = [];
        }
        break;
    }

    // Filtrar el usuario actual
    if (props.userData.id) {
      data = data.filter(item => item.id !== props.userData.id);
    }

    const mappedData = data.map(item => ({
      id: item.id,
      name:
        item.name || item.businessName || `${item.firstName || ''} ${item.lastName || ''}`.trim(),
      email: item.email,
      type: form.value.recipientType, // Agregar el tipo basado en recipientType
      commerceId: item.commerceId || item.commerce?.id, // Guardar commerceId del destinatario
      commercesId: item.commercesId, // Array de commerces si existe
    }));

    // Guardar en allRecipients para filtrado
    allRecipients.value = mappedData;

    // Aplicar filtro si existe (tanto para modo masivo como normal)
    if (form.value.commerceFilter) {
      filterRecipientsByCommerce();
    } else {
      recipients.value = mappedData;
    }

    // Cargar comercios disponibles para usuarios con permisos
    if (
      props.userRole === 'master' ||
      props.userRole === 'administrator' ||
      props.userRole === 'business'
    ) {
      await loadAvailableCommerces();
    }
  } catch (error) {
    console.error('Error loading recipients:', error);
    recipients.value = [];
  } finally {
    loadingRecipients.value = false;
  }
}

async function send() {
  if (!canSend.value || sending.value) return;

  sending.value = true;
  try {
    if (props.massMode) {
      // Modo masivo: enviar a todos los destinatarios seleccionados

      const selectedRecipients = allRecipients.value.filter(r =>
        massFilters.value.selectedRecipients.includes(r.id)
      );
      // Generar un identificador de lote para marcar mensajes masivos
      const batchId = `mass_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      const batchSize = selectedRecipients.length;

      const promises = selectedRecipients.map(recipient => {
        if (form.value.type === 'chat') {
          return internalMessageService.sendMessage({
            category: form.value.category,
            priority: form.value.priority,
            title: form.value.title,
            content: form.value.content,
            icon: getCategoryIcon(form.value.category),
            actionLink: form.value.actionLink || undefined,
            actionLabel: form.value.actionLabel || undefined,
            // Marcadores de envío masivo
            mass: true,
            massBatchId: batchId,
            massTotal: batchSize,
            metadata: {
              mass: true,
              massBatchId: batchId,
              massTotal: batchSize,
            },
            recipientId: recipient.id,
            recipientType: recipient.type,
          });
        } else {
          return internalMessageService.sendSystemNotification({
            category: form.value.category,
            priority: form.value.priority,
            title: form.value.title,
            content: form.value.content,
            icon: getCategoryIcon(form.value.category),
            actionLink: form.value.actionLink || undefined,
            actionLabel: form.value.actionLabel || undefined,
            // Marcadores de envío masivo
            mass: true,
            massBatchId: batchId,
            massTotal: batchSize,
            metadata: {
              mass: true,
              massBatchId: batchId,
              massTotal: batchSize,
            },
            recipientId: recipient.id,
            recipientType: recipient.type,
          });
        }
      });

      await Promise.all(promises);
    } else if (props.chatMode) {
      // Chat mode: crear conversación y enviar mensaje

      // Determinar el recipiente según el rol del usuario
      const recipientId =
        props.userRole === 'master' ? chatSelectedRecipient.value : chatSelectedRecipient.value;
      const selectedRecipient = allRecipients.value.find(r => r.id === recipientId);
      const recipientType = selectedRecipient?.type || 'collaborator';
      if (!recipientId) {
        throw new Error('No recipient selected for chat');
      }

      // Obtener commerceId: priorizar comercio seleccionado en pickers; si no, usar del destinatario o del usuario
      const commerceId =
        chatSelectedCommerce.value ||
        selectedRecipient?.commerceId ||
        props.userData.commerceId ||
        props.userData.commerce?.id;

      if (!commerceId) {
        throw new Error('commerceId is required for chat');
      }

      // Crear o obtener conversación
      const conversation = await getOrCreateConversation(recipientId, recipientType, commerceId);

      // Enviar mensaje en la conversación
      await sendChatMessage(
        conversation.id,
        form.value.content,
        recipientId,
        recipientType,
        commerceId
      );


      // Emitir conversationId para que se seleccione automáticamente
      emit('sent', { conversationId: conversation.id });
      close();
      return; // Salir antes del emit genérico
    } else if (form.value.type === 'chat') {
      await internalMessageService.sendMessage({
        category: form.value.category,
        priority: form.value.priority,
        title: form.value.title,
        content: form.value.content,
        icon: getCategoryIcon(form.value.category),
        actionLink: form.value.actionLink || undefined,
        actionLabel: form.value.actionLabel || undefined,
        recipientId: form.value.recipientId,
        recipientType: form.value.recipientType,
      });
    } else {
      await internalMessageService.sendSystemNotification({
        category: form.value.category,
        priority: form.value.priority,
        title: form.value.title,
        content: form.value.content,
        icon: getCategoryIcon(form.value.category),
        actionLink: form.value.actionLink || undefined,
        actionLabel: form.value.actionLabel || undefined,
        recipientId: form.value.recipientId,
        recipientType: form.value.recipientType,
      });
    }

    emit('sent');
    close();
  } catch (error) {
    console.error('Error sending message:', error);
    alert(t('messages.compose.error'));
  } finally {
    sending.value = false;
  }
}

function getCategoryIcon(category) {
  const icons = {
    direct_message: 'bi-chat-dots',
    announcement: 'bi-megaphone',
    attention_reminder: 'bi-person-circle',
    booking_reminder: 'bi-calendar-event',
    booking_confirmed: 'bi-calendar-check',
    booking_cancelled: 'bi-calendar-x',
    stock: 'bi-box',
    low_stock: 'bi-box-seam',
    out_of_stock: 'bi-exclamation-triangle',
    payment_received: 'bi-credit-card-2-front',
    payment_pending: 'bi-credit-card',
    payment_overdue: 'bi-exclamation-circle',
    plan_expiring: 'bi-hourglass-split',
    plan_expired: 'bi-hourglass',
    plan_upgraded: 'bi-arrow-up-circle',
    survey_pending: 'bi-clipboard-check',
    document_available: 'bi-file-earmark-text',
    form_pending: 'bi-file-earmark-check',
    system_update: 'bi-gear',
    feature_announcement: 'bi-stars',
    maintenance: 'bi-tools',
    task_assigned: 'bi-list-task',
    task_completed: 'bi-check-circle',
    task_overdue: 'bi-clock-history',
  };
  return icons[category] || 'bi-envelope';
}

// Mass filter handlers (adaptados a listas filtradas por búsqueda)
function toggleSelectAllBusiness() {
  if (massFilters.value.selectAllBusiness) {
    massFilters.value.selectedBusiness = [];
  } else {
    massFilters.value.selectedBusiness = filteredBusinessList.value.map(b => b.id);
  }
  massFilters.value.selectAllBusiness = !massFilters.value.selectAllBusiness;

  // Reset en cascada
  massFilters.value.selectedCommerces = [];
  massFilters.value.selectAllCommerces = false;
  massFilters.value.selectedRecipients = [];
  massFilters.value.selectAllRecipients = false;
  commerceSearch.value = '';
  recipientSearch.value = '';
}

function handleBusinessChange() {
  massFilters.value.selectAllBusiness =
    filteredBusinessList.value.length > 0 &&
    massFilters.value.selectedBusiness.length === filteredBusinessList.value.length;
  massFilters.value.selectedCommerces = [];
  massFilters.value.selectAllCommerces = false;
  massFilters.value.selectedRecipients = [];
  massFilters.value.selectAllRecipients = false;
  commerceSearch.value = '';
  recipientSearch.value = '';
}

function toggleSelectAllCommerces() {
  if (massFilters.value.selectAllCommerces) {
    massFilters.value.selectedCommerces = [];
  } else {
    massFilters.value.selectedCommerces = filteredCommercesBySearch.value.map(c => c.id);
  }
  massFilters.value.selectAllCommerces = !massFilters.value.selectAllCommerces;

  massFilters.value.selectedRecipients = [];
  massFilters.value.selectAllRecipients = false;
  recipientSearch.value = '';
}

function handleCommerceChange() {
  massFilters.value.selectAllCommerces =
    filteredCommercesBySearch.value.length > 0 &&
    massFilters.value.selectedCommerces.length === filteredCommercesBySearch.value.length;
  massFilters.value.selectedRecipients = [];
  massFilters.value.selectAllRecipients = false;
}

function handleRecipientTypeChange() {
  massFilters.value.selectedRecipients = [];
  massFilters.value.selectAllRecipients = false;
}

function toggleSelectAllRecipients() {
  if (massFilters.value.selectAllRecipients) {
    massFilters.value.selectedRecipients = [];
  } else {
    massFilters.value.selectedRecipients = filteredRecipientsBySearch.value.map(r => r.id);
  }
  massFilters.value.selectAllRecipients = !massFilters.value.selectAllRecipients;
}

function handleRecipientChange() {
  massFilters.value.selectAllRecipients =
    filteredRecipientsBySearch.value.length > 0 &&
    massFilters.value.selectedRecipients.length === filteredRecipientsBySearch.value.length;
}

// Pickers (abrir/cerrar)
function toggleBusinessPicker() {
  showBusinessPicker.value = !showBusinessPicker.value;
  if (showBusinessPicker.value) {
    showCommercesPicker.value = false;
    showRecipientsPicker.value = false;
  }
}
function toggleCommercesPicker() {
  if (!canPickCommerces.value) return;
  showCommercesPicker.value = !showCommercesPicker.value;
  if (showCommercesPicker.value) {
    showBusinessPicker.value = false;
    showRecipientsPicker.value = false;
  }
}
function toggleRecipientsPicker() {
  if (!canPickRecipients.value) return;
  showRecipientsPicker.value = !showRecipientsPicker.value;
  if (showRecipientsPicker.value) {
    showBusinessPicker.value = false;
    showCommercesPicker.value = false;
  }
}

// Acciones seleccionar todo (filtrados) y limpiar
function selectAllFilteredBusiness() {
  massFilters.value.selectedBusiness = filteredBusinessList.value.map(b => b.id);
  massFilters.value.selectAllBusiness =
    massFilters.value.selectedBusiness.length === filteredBusinessList.value.length &&
    filteredBusinessList.value.length > 0;
  handleBusinessChange();
}
function clearSelectedBusiness() {
  massFilters.value.selectedBusiness = [];
  massFilters.value.selectAllBusiness = false;
  handleBusinessChange();
}
function selectAllFilteredCommerces() {
  massFilters.value.selectedCommerces = filteredCommercesBySearch.value.map(c => c.id);
  massFilters.value.selectAllCommerces =
    massFilters.value.selectedCommerces.length === filteredCommercesBySearch.value.length &&
    filteredCommercesBySearch.value.length > 0;
  handleCommerceChange();
}
function clearSelectedCommerces() {
  massFilters.value.selectedCommerces = [];
  massFilters.value.selectAllCommerces = false;
  handleCommerceChange();
}
function selectAllFilteredRecipients() {
  massFilters.value.selectedRecipients = filteredRecipientsBySearch.value.map(r => r.id);
  massFilters.value.selectAllRecipients =
    massFilters.value.selectedRecipients.length === filteredRecipientsBySearch.value.length &&
    filteredRecipientsBySearch.value.length > 0;
}
function clearSelectedRecipients() {
  massFilters.value.selectedRecipients = [];
  massFilters.value.selectAllRecipients = false;
}
function toggleRecipientType(type) {
  const i = massFilters.value.recipientTypes.indexOf(type);
  if (i >= 0) massFilters.value.recipientTypes.splice(i, 1);
  else massFilters.value.recipientTypes.push(type);
  handleRecipientTypeChange();
}

function resetForm() {
  form.value = {
    type: 'chat',
    recipientType: '',
    recipientId: '',
    category: 'direct_message',
    priority: 'normal',
    title: '',
    content: '',
    actionLink: '',
    actionLabel: '',
  };
  recipients.value = [];
  showActions.value = false;
}

function close() {
  // Reset formulario y listas locales
  resetForm();

  // Reset búsquedas y estado de pickers
  businessSearch.value = '';
  commerceSearch.value = '';
  recipientSearch.value = '';
  showBusinessPicker.value = false;
  showCommercesPicker.value = false;
  showRecipientsPicker.value = false;

  // Reset variables de chat
  chatSelectedBusiness.value = '';
  chatSelectedCommerce.value = '';
  chatRecipientType.value = '';
  chatSelectedRecipient.value = '';

  // Reset filtros masivos
  massFilters.value = {
    selectedBusiness: [],
    selectAllBusiness: false,
    selectedCommerces: [],
    selectAllCommerces: false,
    recipientTypes: [],
    selectedRecipients: [],
    selectAllRecipients: false,
  };

  emit('close');
}

// Cerrar pickers al hacer click fuera
function onDocumentClick(e) {
  const target = e.target;
  if (
    showBusinessPicker.value &&
    businessPickerRef.value &&
    !businessPickerRef.value.contains(target)
  ) {
    showBusinessPicker.value = false;
  }
  if (
    showCommercesPicker.value &&
    commercesPickerRef.value &&
    !commercesPickerRef.value.contains(target)
  ) {
    showCommercesPicker.value = false;
  }
  if (
    showRecipientsPicker.value &&
    recipientsPickerRef.value &&
    !recipientsPickerRef.value.contains(target)
  ) {
    showRecipientsPicker.value = false;
  }
}

function onDocumentKeydown(e) {
  if (e.key !== 'Escape') return;
  let handled = false;
  if (showRecipientsPicker.value) {
    showRecipientsPicker.value = false;
    handled = true;
  }
  if (showCommercesPicker.value) {
    showCommercesPicker.value = false;
    handled = true;
  }
  if (showBusinessPicker.value) {
    showBusinessPicker.value = false;
    handled = true;
  }
  if (handled) {
    e.stopPropagation();
    e.preventDefault();
  }
}

onMounted(() => {
  document.addEventListener('click', onDocumentClick, true);
  document.addEventListener('keydown', onDocumentKeydown, true);
});

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick, true);
  document.removeEventListener('keydown', onDocumentKeydown, true);
});

// Si al seleccionar negocio no hay comercios listados, traer específicos por businessId
async function ensureCommercesForBusiness(businessId) {
  try {
    const existing = (availableCommerces.value || []).some(c => {
      const bid = c.businessId || c.business?.id || c.business;
      return String(bid) === String(businessId);
    });
    if (existing) return;
    const resp = await requestBackend.get(`/commerce/businessId/${businessId}`);
    const items = resp.data || [];
    // Merge únicos por id
    const map = new Map((availableCommerces.value || []).map(c => [c.id, c]));
    items.forEach(c => {
      if (c?.id && !map.has(c.id)) map.set(c.id, c);
    });
    availableCommerces.value = Array.from(map.values());
  } catch (e) {
    console.warn('[Composer] ensureCommercesForBusiness failed', e);
  }
}
</script>

<style scoped>
.message-composer-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
}

.modal-container {
  position: relative;
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 650px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px 12px 0 0;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.close-btn {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
  transition: all 0.2s;
}

.close-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.05);
}

.modal-body {
  padding: 1rem;
  overflow-y: auto;
  flex: 1;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.form-field {
  display: flex;
  flex-direction: column;
  margin-bottom: 0.75rem;
}

.form-field label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.375rem;
  display: flex;
  align-items: center;
  gap: 0.375rem;
}

.form-field label i {
  color: #667eea;
  font-size: 0.875rem;
}

.form-select,
.form-input,
.form-input-sm,
.form-textarea {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  font-size: 0.9375rem;
  transition: all 0.2s;
  font-family: inherit;
}

.form-select:focus,
.form-input:focus,
.form-input-sm:focus,
.form-textarea:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-input-sm {
  padding: 0.375rem 0.625rem;
  font-size: 0.875rem;
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

.char-counter {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.25rem;
  text-align: right;
}

.action-toggle {
  margin: 0.5rem 0 1rem;
}

.btn-link {
  background: none;
  border: none;
  color: #667eea;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0;
  transition: all 0.2s;
}

.btn-link:hover {
  color: #5568d3;
  text-decoration: underline;
}

/* Priority buttons */
.priority-buttons {
  display: flex;
  gap: 0.375rem;
}

.priority-btn {
  flex: 1;
  padding: 0.5rem 0.5rem;
  border: 1.5px solid #e5e7eb;
  background: white;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.375rem;
  transition: all 0.15s;
  font-size: 0.813rem;
  color: #6b7280;
  white-space: nowrap;
}

.priority-btn i {
  font-size: 1rem;
}

.priority-btn span {
  font-weight: 500;
}

.priority-btn:hover {
  border-color: #667eea;
  background: #f0f0ff;
}

.priority-btn.active {
  border-color: #667eea;
  background: #667eea;
  color: white;
}

.priority-btn.urgent {
  border-color: #fee2e2;
}

.priority-btn.urgent:hover {
  border-color: #ef4444;
  background: #fef2f2;
}

.priority-btn.urgent.active {
  border-color: #ef4444;
  background: #ef4444;
  color: white;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  background: #f9fafb;
  border-radius: 0 0 12px 12px;
}

.btn-cancel,
.btn-send {
  padding: 0.625rem 1.25rem;
  border-radius: 6px;
  font-weight: 500;
  font-size: 0.9375rem;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
}

.btn-cancel {
  background: white;
  color: #6b7280;
  border: 1px solid #d1d5db;
}

.btn-cancel:hover {
  background: #f3f4f6;
  border-color: #9ca3af;
}

.btn-send {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-send:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.btn-send:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Mass filters styling */
.mass-filters-section {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 16px;
}

.mass-filters-section h4 {
  margin: 0 0 12px 0;
  color: #374151;
  font-size: 0.875rem;
  font-weight: 600;
}

.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 150px;
  overflow-y: auto;
}

.checkbox-item {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.2s;
}

.checkbox-item:hover {
  background: #f1f5f9;
}

.checkbox-item input[type='checkbox'] {
  margin: 0;
}

.checkbox-item span {
  font-size: 0.9rem;
  color: #374151;
}

.recipients-selection {
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
}

.selection-header {
  padding: 12px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
  border-radius: 6px 6px 0 0;
}

.recipients-list {
  max-height: 200px;
  overflow-y: auto;
  padding: 8px;
}

.selection-summary {
  background: #dbeafe;
  border: 1px solid #3b82f6;
  border-radius: 6px;
  padding: 12px;
  margin-top: 16px;
}

.selection-summary h5 {
  margin: 0 0 8px 0;
  color: #1d4ed8;
  font-size: 1rem;
}

.selection-summary p {
  margin: 4px 0;
  color: #1e40af;
  font-size: 0.9rem;
}

/* Mass recipients info styling */
.mass-recipients-info {
  background: #f0f9ff;
  border: 1px solid #0ea5e9;
  border-radius: 8px;
  padding: 12px;
  margin-top: 8px;
}

.mass-recipients-info p {
  margin: 0 0 4px 0;
  color: #0369a1;
  font-weight: 500;
}

.mass-recipients-info small {
  color: #64748b;
  font-size: 0.875rem;
}

/* Compact pickers for large lists */
.mass-filters-section.compact {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 10px;
}

.compact-pickers {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

/* Chat pickers: for long names, stack vertically to avoid overflow */
.compact-pickers.chat-pickers {
  grid-template-columns: 1fr;
}

.picker {
  position: relative;
}

.picker-button {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  padding: 8px 10px;
  background: #f8fafc;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  color: #1f2937;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.15s ease-in-out;
}

.picker-button:hover:not(:disabled) {
  background: #eef2ff;
  border-color: #c7d2fe;
  box-shadow: 0 1px 0 rgba(99, 102, 241, 0.15);
}

.picker.disabled .picker-button {
  opacity: 0.6;
  cursor: not-allowed;
}

.picker .badge {
  background: #eef2ff;
  color: #4338ca;
  border: 1px solid #c7d2fe;
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 600;
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.picker-panel {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  right: 0;
  z-index: 10;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
  padding: 10px;
}

/* Animaciones de apertura/cierre de pickers */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: opacity 120ms ease, transform 120ms ease;
}
.fade-slide-enter-from,
.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.picker-search {
  width: 100%;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 8px 10px;
  margin-bottom: 8px;
  font-size: 0.9rem;
}

.picker-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.picker-actions .link {
  background: transparent;
  border: none;
  color: #2563eb;
  font-size: 0.85rem;
  cursor: pointer;
  padding: 4px 0;
}

.picker-list {
  max-height: 260px;
  overflow-y: auto;
  padding-right: 4px;
}

.picker-list .checkbox-item {
  padding: 6px 8px;
  border-radius: 8px;
}

.picker-list .checkbox-item span {
  display: inline-block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Segmented toggle for types */
.picker.types .segmented {
  display: inline-flex;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
}

.picker.types .segmented button {
  padding: 6px 10px;
  background: transparent;
  border: none;
  color: #4b5563;
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
}

.picker.types .segmented button:hover {
  background: #e5e7eb;
}

.picker.types .segmented button.active {
  background: #4f46e5;
  color: white;
}

/* Chips resumen */
.selection-summary.compact {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
  background: transparent;
  border: none;
  padding: 0;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  border-radius: 9999px;
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #e5e7eb;
  font-size: 12px;
}

.chip.primary {
  background: #eef2ff;
  color: #3730a3;
  border-color: #c7d2fe;
}

/* Responsive tweaks for pickers */
@media (max-width: 768px) {
  .compact-pickers {
    grid-template-columns: 1fr;
  }

  .picker-panel {
    position: relative;
    top: 6px;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.06);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .modal-container {
    max-width: 100%;
    max-height: 100vh;
    border-radius: 0;
  }

  .modal-header {
    border-radius: 0;
  }

  .modal-footer {
    border-radius: 0;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
