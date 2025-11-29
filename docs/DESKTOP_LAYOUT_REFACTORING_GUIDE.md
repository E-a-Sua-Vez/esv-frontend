# Guia de Refatoração: Layout Desktop Padronizado

Este documento descreve o processo completo de refatoração de views para usar o layout desktop padronizado com componentes de filtros e conteúdo separados.

## Visão Geral

O objetivo é padronizar todas as views desktop para terem:
- **Painel de Filtros Lateral**: Componente `DesktopFiltersPanel` com filtros sempre visíveis (não colapsáveis)
- **Área de Conteúdo**: Componente principal renderizado em `DesktopContentLayout`
- **Comportamento Mobile**: Mantém o comportamento original com filtros colapsáveis dentro dos componentes

## Componentes Utilizados

### 1. `DesktopContentLayout`
- Localização: `src/components/common/desktop/DesktopContentLayout.vue`
- Props:
  - `filterColumnSize`: Tamanho da coluna de filtros (default: `'col-lg-3'`)
  - `contentColumnSize`: Tamanho da coluna de conteúdo (default: `'col-lg-9'`)
  - `showFilters`: Mostrar painel de filtros (default: `true`)
  - `filtersSticky`: Filtros fixos ao scroll (default: `true`)
- Slots:
  - `#filters`: Slot para o painel de filtros (recebe `onToggle` e `collapsed`)
  - `#content`: Slot para o conteúdo principal

### 2. `DesktopFiltersPanel`
- Localização: `src/components/common/desktop/DesktopFiltersPanel.vue`
- Props:
  - `modelValue`: Objeto com valores dos filtros (ex: `{ commerce: state.commerce }`)
  - `loading`: Estado de carregamento
  - `commerces`: Array de comércios para o seletor
  - `showCommerceSelector`: Mostrar seletor de comércio (default: `false`)
  - `showDateFilters`: Mostrar filtros de data (default: `false`)
  - `showQuickDateButtons`: Mostrar botões rápidos de data (default: `false`)
  - `showRefreshButton`: Mostrar botão de refresh (default: `false`)
  - `sticky`: Filtros fixos (default: `true`)
  - `showAllOption`: Mostrar opção "Todos" no seletor (default: `false`)
  - `commerceSelectorId`: ID único para o seletor
  - `onToggle`: Função para toggle do painel
  - `collapsed`: Estado colapsado do painel
- Slots:
  - `#custom-filters`: Slot para filtros customizados do componente filho

### 3. `DateRangeFilters`
- Localização: `src/components/common/desktop/DateRangeFilters.vue`
- Props:
  - `startDate`: Data inicial
  - `endDate`: Data final
  - `showQuickButtons`: Mostrar botões rápidos (default: `true`)
  - `disabled`: Desabilitado (default: `false`)
  - `showSearchButton`: Mostrar botão de busca (default: `true`)
- Events:
  - `@update:startDate`: Atualiza data inicial
  - `@update:endDate`: Atualiza data final
  - `@search`: Dispara busca

## Processo de Refatoração - Passo a Passo

### Passo 1: Preparar a View Principal

#### 1.1 Importar Componentes Necessários

**IMPORTANTE**: Importe os componentes diretamente dos arquivos `.vue` em vez de usar o `index.js` para evitar problemas de resolução de módulos:

```javascript
import DesktopContentLayout from '../../components/common/desktop/DesktopContentLayout.vue';
import DesktopFiltersPanel from '../../components/common/desktop/DesktopFiltersPanel.vue';
import DateRangeFilters from '../../components/common/desktop/DateRangeFilters.vue';
```

**Nota**: Embora exista um `index.js` que exporta esses componentes, importar diretamente evita problemas de cache do Vite e resolução de módulos.

#### 1.2 Adicionar Componentes ao `components`

```javascript
components: {
  // ... outros componentes
  DesktopContentLayout,
  DesktopFiltersPanel,
  DateRangeFilters,
}
```

#### 1.3 Garantir que Arrays Estão Inicializados como Arrays

Se a view usa componentes que esperam arrays, garantir que as variáveis de estado estejam inicializadas como arrays:

```javascript
const state = reactive({
  // ... outras propriedades
  queues: [],
  services: [],
  commerces: [],
  selectedCommerces: [],
});
```

### Passo 2: Modificar Componentes Filhos para Expor Filtros

#### 2.1 Adicionar Prop `filtersLocation`

Adicionar a prop `filtersLocation` ao componente filho:

```javascript
props: {
  // ... outras props
  filtersLocation: { type: String, default: 'component' }, // 'component' or 'slot'
}
```

#### 2.2 Adicionar Slot `filters-exposed` no Topo do Template

**IMPORTANTE**:
- O slot deve ser renderizado **fora** de qualquer condicional relacionada à visibilidade do componente principal
- Deve estar **antes** do div principal del template
- **Siempre verificar con `grep`** que el slot esté presente después de agregarlo

```vue
<template>
  <!-- Expose filters slot for desktop - rendered outside main content conditional -->
  <slot
    v-if="filtersLocation === 'slot'"
    name="filters-exposed"
    :clear="clear"
    :getToday="getToday"
    :getCurrentMonth="getCurrentMonth"
    :getLastMonth="getLastMonth"
    :getLastThreeMonths="getLastThreeMonths"
    :refresh="refresh"
    :startDate="startDate"
    :endDate="endDate"
    :searchText="searchText"
    :queueId="queueId"
    :serviceId="serviceId"
    :queues="queues"
    :services="services"
    :loading="loading"
    <!-- IMPORTANTE: Adicionar TODAS as propriedades e métodos que os filtros precisam -->
    <!-- Revisar los filtros originales del componente para identificar todos -->
  ></slot>

  <!-- Resto do componente -->
  <div v-if="showComponent === true">
    <!-- ... -->
  </div>
</template>
```

**Verificación**: Después de agregar el slot, verificar que esté presente:
```bash
grep -n "filters-exposed" src/components/[path]/ComponentName.vue
```

#### 2.3 Tornar Filtros Condicionais no Componente

Envolver a seção de filtros original com uma condicional:

```vue
<!-- Filters Section - Can be shown in component or exposed via slot -->
<div v-if="filtersLocation === 'component'" class="my-2 row metric-card">
  <!-- Filtros originais aqui -->
</div>
```

### Passo 3: Estruturar a View Desktop

#### 3.1 Criar Layout Desktop com DesktopContentLayout

```vue
<div class="d-none d-lg-block desktop-dashboard-layout">
  <!-- Header se necessário -->

  <DesktopContentLayout
    :show-filters="true"
    :filters-sticky="true"
    @filters-toggle="handleFiltersToggle"
  >
    <template #filters="{ onToggle, collapsed }">
      <DesktopFiltersPanel
        :model-value="{ commerce: state.commerce }"
        :loading="loading"
        :commerces="Array.isArray(state.commerces) ? state.commerces : []"
        :show-commerce-selector="true"
        :show-date-filters="false"
        :show-quick-date-buttons="false"
        :show-refresh-button="false"
        :sticky="true"
        :show-all-option="true"
        :commerce-selector-id="'unique-selector-id'"
        :on-toggle="onToggle"
        :collapsed="collapsed"
        @commerce-changed="handleCommerceChanged"
      >
        <template #custom-filters>
          <!-- Renderizar componentes filhos para expor filtros -->
        </template>
      </DesktopFiltersPanel>
    </template>

    <template #content>
      <!-- Renderizar componentes principais aqui -->
    </template>
  </DesktopContentLayout>
</div>
```

#### 3.2 Verificar TODOS los Subcomponentes con Filtros

**IMPORTANTE**: Antes de continuar, verificar TODOS los subcomponentes de la view para identificar cuáles tienen filtros "Pesquisar Dados":

```bash
# Buscar componentes con filtros
grep -r "showFilterOptions\|Pesquisar Dados\|aditionalFilters" src/components/[feature]/
```

Para cada componente que tiene filtros, debe:
1. Tener la prop `filtersLocation`
2. Tener el slot `filters-exposed` en el template
3. Tener los filtros condicionales con `v-if="filtersLocation === 'component'"`

#### 3.3 Renderizar Componentes Filhos nos Filtros

Para cada componente que tem filtros, renderizar uma instância oculta apenas para expor os filtros:

```vue
<template #custom-filters>
  <!-- Componente 1 - Filtros -->
  <ComponentName
    v-if="state.showComponent1"
    :show-component="false"
    :toggles="state.toggles"
    :commerce="state.commerce"
    :queues="Array.isArray(state.queues) ? state.queues : []"
    :commerces="Array.isArray(state.selectedCommerces) ? state.selectedCommerces : []"
    :services="Array.isArray(state.services) ? state.services : []"
    filters-location="slot"
  >
    <template #filters-exposed="filterProps">
      <div class="filters-content-wrapper">
        <!-- Botões de data rápida -->
        <div class="row my-2">
          <div class="col-6 mb-2">
            <button
              class="btn btn-sm btn-dark rounded-pill w-100"
              @click="filterProps.getToday()"
              :disabled="filterProps.loading"
            >
              {{ $t('dashboard.today') }}
            </button>
          </div>
          <!-- Repetir para outros botões: getCurrentMonth, getLastMonth, getLastThreeMonths -->
        </div>

        <!-- DateRangeFilters com botão de busca -->
        <DateRangeFilters
          :start-date="filterProps.startDate"
          :end-date="filterProps.endDate"
          :show-quick-buttons="false"
          :disabled="filterProps.loading"
          :show-search-button="true"
          @update:startDate="(val) => { filterProps.startDate = val; }"
          @update:endDate="(val) => { filterProps.endDate = val; }"
          @search="() => filterProps.refresh(1)"
        />

        <!-- Campos de busca -->
        <div class="mb-3">
          <label class="form-label fw-bold mb-2">{{ $t('dashboard.search') || 'Buscar' }}</label>
          <div class="d-flex gap-2">
            <input
              type="text"
              class="form-control flex-grow-1"
              :value="filterProps.searchText"
              @input="(e) => { filterProps.searchText = e.target.value; }"
              :placeholder="$t('dashboard.search')"
            />
            <button
              class="btn btn-sm btn-dark rounded-pill"
              @click="filterProps.refresh()"
              :disabled="filterProps.loading"
              style="flex-shrink: 0;"
            >
              <i class="bi bi-search"></i>
            </button>
          </div>
        </div>

        <!-- Seletores (fila, serviço, etc.) -->
        <div class="mb-3" v-if="filterProps.queues && filterProps.queues.length > 1">
          <label class="form-label fw-bold mb-2">{{ $t('dashboard.queue') }}</label>
          <select
            class="form-select metric-controls"
            :value="filterProps.queueId"
            @change="(e) => { filterProps.queueId = e.target.value; filterProps.refresh(1); }"
          >
            <option value="">{{ $t('dashboard.all') || 'Todos' }}</option>
            <option
              v-for="queue in filterProps.queues"
              :key="queue.name"
              :value="queue.id"
            >
              {{ queue.name }}
            </option>
          </select>
        </div>

        <!-- Filtros específicos do componente (checkboxes, radio buttons, etc.) -->
        <!-- Exemplo para atendimentos: -->
        <!--
        <div class="mb-3">
          <label class="form-label fw-bold mb-2">{{ $t('dashboard.tracing.filters.attention') }}</label>
          <div class="d-flex gap-2 align-items-center">
            <input
              type="radio"
              class="btn-check"
              :id="'filter-id-' + Math.random()"
              :value="'VALUE'"
              :checked="filterProps.filterProperty === 'VALUE'"
              @change="filterProps.filterProperty = 'VALUE'; filterProps.refresh(1)"
            />
            <label class="btn btn-sm" :for="'filter-id-' + Math.random()">
              <i class="bi bi-icon"></i>
            </label>
          </div>
        </div>
        -->

        <!-- Botão de limpar -->
        <div class="mb-3">
          <button
            class="btn btn-sm btn-size fw-bold btn-dark rounded-pill w-100"
            @click="filterProps.clear()"
          >
            <i class="bi bi-eraser-fill"></i> {{ $t('dashboard.clear') || 'Limpiar' }}
          </button>
        </div>
      </div>
    </template>
  </ComponentName>

  <!-- Repetir para outros componentes com filtros -->
</template>
```

#### 3.4 Renderizar Componentes Principais no Conteúdo

**IMPORTANTE**: Los botones de tabs/pestañas deben ir **dentro** del slot `#content`, antes de los componentes principales:

```vue
<template #content>
  <!-- Header with tabs - DEBE estar dentro del slot #content -->
  <div class="row col mx-1 mt-3 mb-3">
    <div class="col-3 centered">
      <button
        class="btn btn-md btn-size fw-bold btn-dark rounded-pill"
        :class="state.showTab1 ? 'btn-selected' : ''"
        @click="showTab1()"
      >
        Tab 1
      </button>
    </div>
    <!-- Más botones de tabs -->
  </div>

  <!-- Main content components -->
  <ComponentName
    :show-component="state.showComponent1"
    :toggles="state.toggles"
    :commerce="state.commerce"
    :queues="state.queues"
    :commerces="state.selectedCommerces"
    :services="state.services"
    filters-location="slot"
  >
  </ComponentName>

  <!-- Outros componentes -->
</template>
```

### Passo 4: Tratar Componentes Wrapper

Se um componente é um wrapper que contém outros componentes (como `DashboardAttentionsAndBookingsManagement`):

#### 4.1 Adicionar Prop `filtersLocation` ao Wrapper

```javascript
props: {
  // ... outras props
  filtersLocation: { type: String, default: 'component' },
}
```

#### 4.2 Expor Filtros do Componente Interno

```vue
<template>
  <!-- Expose filters slot from internal component for desktop -->
  <InternalComponent
    v-if="filtersLocation === 'slot'"
    :show-internal-component="false"
    :toggles="toggles"
    :commerce="commerce"
    :queues="queues"
    :commerces="commerces"
    :services="services"
    filters-location="slot"
  >
    <template #filters-exposed="filterProps">
      <slot name="filters-exposed" v-bind="filterProps"></slot>
    </template>
  </InternalComponent>

  <!-- Resto do componente wrapper -->
  <div v-if="showWrapper === true">
    <InternalComponent
      :show-internal-component="showInternal"
      :filters-location="filtersLocation"
      <!-- outras props -->
    >
    </InternalComponent>
  </div>
</template>
```

### Passo 5: Tratar Modais

#### 5.1 Usar Teleport para Modais

Modais devem ser renderizados usando `Teleport` para evitar problemas de overflow/position:

```vue
<template>
  <!-- ... resto do componente -->

  <!-- Modal - Use Teleport to render outside component -->
  <Teleport to="body">
    <div
      v-if="showComponent === true"
      class="modal fade"
      id="modalId"
      data-bs-backdrop="static"
      data-bs-keyboard="false"
      tabindex="-1"
      aria-labelledby="staticBackdropLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-xl">
        <div class="modal-content">
          <!-- Conteúdo do modal -->
        </div>
      </div>
    </div>
  </Teleport>
</template>
```

#### 5.2 IDs de Modais e Botões

- Usar IDs estáticos (não bindings dinâmicos) para `data-bs-target` e `id` do modal
- Exemplo: `data-bs-target="#addModal"` e `id="addModal"` (não `:data-bs-target` ou `:id`)

### Passo 6: Manter Comportamento Mobile

O layout mobile deve permanecer inalterado:

```vue
<div class="d-lg-none">
  <!-- Layout mobile original -->
  <ComponentName
    :show-component="state.showComponent1"
    :toggles="state.toggles"
    <!-- outras props -->
    filters-location="component"
  >
  </ComponentName>
</div>
```

## Checklist de Refatoração

### Preparación
- [ ] Importar componentes desktop necessários (directamente de `.vue`)
- [ ] Adicionar componentes ao `components`
- [ ] Inicializar arrays corretamente no estado (`ref([])` em vez de `ref({})`)
- [ ] Agregar handlers necesarios (`handleFiltersToggle`, `handleCommerceChanged`)

### Componentes Hijos
- [ ] **Identificar TODOS los subcomponentes** que tienen filtros "Pesquisar Dados"
- [ ] Adicionar prop `filtersLocation` a cada componente hijo que tenga filtros
- [ ] Adicionar slot `filters-exposed` no topo do template dos componentes filhos (antes del div principal)
- [ ] **Verificar con `grep`** que el slot esté presente: `grep -n "filters-exposed" src/components/[path]/ComponentName.vue`
- [ ] Exponer todos los métodos y propiedades necesarios en el slot (métodos de fecha, `clear`, `refresh`, propiedades de filtro, `loading`)
- [ ] Tornar filtros condicionais nos componentes filhos (`v-if="filtersLocation === 'component'"`)

### Estructura Desktop
- [ ] Crear estructura desktop con `DesktopContentLayout` dentro de `div class="d-none d-lg-block"`
- [ ] Agregar header desktop con logo y menu (usar estilos de `BusinessTracing.vue`)
- [ ] Configurar `DesktopFiltersPanel` con seletor de comércio si es necesario
- [ ] **Mover botones de tabs/pestañas dentro del slot `#content`** (antes de los componentes principales)
- [ ] Renderizar componentes hijos en `#custom-filters` para cada tab activa (`v-if="state.showTab"`)
- [ ] Agregar filtros completos para cada subcomponente en el panel de filtros
- [ ] Renderizar componentes principales en el slot `#content` (después de los botones de tabs)

### Componentes Wrapper
- [ ] Tratar componentes wrapper si necessário (pasar `filtersLocation` y forwardear slot)

### Modales
- [ ] Usar `Teleport` para modais
- [ ] Usar IDs estáticos para modais (no bindings dinámicos)

### Mobile
- [ ] Manter layout mobile inalterado (`d-block d-lg-none`)
- [ ] Asegurar que mobile use `filters-location="component"`

### Estilos
- [ ] Agregar estilos CSS para desktop header (logo y menu)
- [ ] Usar estilos consistentes con otras views refactorizadas

### Verificación
- [ ] Verificar estructura de fechamento de divs (no tags inválidas)
- [ ] Testar funcionalidade dos filtros (todos los subcomponentes)
- [ ] Testar abertura de modais
- [ ] Verificar alinhamento e layout (logo, menu, filtros, contenido)
- [ ] Verificar que todos los filtros "Pesquisar Dados" estén en el panel de filtros
- [ ] Verificar que los botones de tabs estén dentro del slot `#content`

## Exemplo Completo: BusinessTracing.vue

### Estrutura da View

```vue
<template>
  <!-- Mobile Layout (mantém original) -->
  <div class="d-lg-none">
    <!-- Layout mobile original -->
  </div>

  <!-- Desktop Layout -->
  <div class="d-none d-lg-block desktop-dashboard-layout">
    <!-- Header -->
    <div class="row mb-3">
      <!-- Tabs/Buttons -->
    </div>

    <DesktopContentLayout
      :show-filters="true"
      :filters-sticky="true"
      @filters-toggle="handleFiltersToggle"
    >
      <template #filters="{ onToggle, collapsed }">
        <DesktopFiltersPanel
          :model-value="{ commerce: state.commerce }"
          :loading="loading"
          :commerces="Array.isArray(state.commerces) ? state.commerces : []"
          :show-commerce-selector="true"
          :on-toggle="onToggle"
          :collapsed="collapsed"
          @commerce-changed="handleCommerceChanged"
        >
          <template #custom-filters>
            <!-- Filtros do Componente 1 -->
            <Component1
              v-if="state.showComponent1"
              :show-component="false"
              filters-location="slot"
            >
              <template #filters-exposed="filterProps">
                <!-- Renderizar filtros aqui -->
              </template>
            </Component1>

            <!-- Filtros do Componente 2 -->
            <Component2
              v-if="state.showComponent2"
              :show-component="false"
              filters-location="slot"
            >
              <template #filters-exposed="filterProps">
                <!-- Renderizar filtros aqui -->
              </template>
            </Component2>
          </template>
        </DesktopFiltersPanel>
      </template>

      <template #content>
        <!-- Componentes principais -->
        <Component1
          :show-component="state.showComponent1"
          filters-location="slot"
        >
        </Component1>

        <Component2
          :show-component="state.showComponent2"
          filters-location="slot"
        >
        </Component2>
      </template>
    </DesktopContentLayout>
  </div>
</template>
```

## Notas Importantes

1. **Sempre usar `Array.isArray()` ao passar arrays como props** para evitar erros de tipo
2. **O slot `filters-exposed` deve estar no topo do template**, fora de condicionais de visibilidade
3. **Modais sempre com `Teleport`** para evitar problemas de overflow
4. **IDs estáticos para modais** (não usar bindings dinâmicos)
5. **Manter comportamento mobile inalterado** - apenas adicionar layout desktop
6. **Filtros sempre visíveis no desktop** (não colapsáveis no painel lateral)
7. **Garantir que `togglesClient` ou permissões sejam carregadas** mesmo quando `showComponent === false` se necessário para modais
8. **Importar componentes desktop diretamente dos arquivos `.vue`** em vez de usar `index.js` para evitar problemas de resolução de módulos
9. **Usar `d-flex gap-2` para campos de busca com botão** em vez de `row` com colunas separadas para manter input e botão próximos e evitar que o botão seja cortado
10. **Verificar estrutura de fechamento de divs** - A estrutura correta deve seguir: `content` > `product-stock`/`dashboard` > condicionais (`v-if`/`v-else`) > `DesktopContentLayout`. Sempre verificar que cada div aberta tem sua correspondente fechada na ordem correta
11. **Verificar TODOS los subcomponentes para "Pesquisar Dados"** - Cuando una view tiene múltiples subcomponentes (tabs, pestañas, etc.), cada uno debe ser verificado para ver si tiene filtros "Pesquisar Dados" que necesitan ser movidos al panel de filtros. Todos los subcomponentes con filtros deben exponerlos via slot `filters-exposed`
12. **Botones de tabs/pestañas deben ir dentro del slot `#content`** - Los botones de navegación entre tabs (como "Resumo", "Recebidos", "Despesas") deben estar dentro del template `#content` del `DesktopContentLayout`, no fuera de él
13. **Estilos del logo del comercio** - El logo del comercio en desktop debe usar los mismos estilos que `BusinessTracing.vue` para mantener consistencia. Usar las clases `.desktop-header-row`, `.desktop-logo-wrapper`, `.desktop-commerce-logo`, `#commerce-logo-desktop`, `.desktop-menu-wrapper` con los estilos correctos
14. **Verificar que el slot `filters-exposed` esté realmente en el template** - A veces el `search_replace` puede fallar silenciosamente. Siempre verificar con `grep` que el slot esté presente en el template del componente hijo antes de continuar
15. **Exponer todos los métodos y propiedades necesarios en el slot** - Asegurarse de que el slot `filters-exposed` exponga todos los métodos (como `getToday`, `getCurrentMonth`, `checkAsc`, etc.) y propiedades (como `startDate`, `endDate`, `searchText`, etc.) que los filtros necesitan para funcionar correctamente

## Problemas Comuns e Soluções

### Problema: Filtros não aparecem
- **Solução**: Verificar se o slot `filters-exposed` está no topo do template, fora de condicionais

### Problema: Modal não abre (backdrop aparece mas modal não)
- **Solução**: Usar `Teleport` para renderizar o modal no `body`

### Problema: Erro de tipo de prop (Expected Array, got Object)
- **Solução**: Inicializar arrays como `[]` e usar `Array.isArray()` ao passar como props

### Problema: Modal não encontra o elemento
- **Solução**: Usar IDs estáticos (não bindings dinâmicos) para `data-bs-target` e `id`

### Problema: Filtros não funcionam
- **Solução**: Verificar se todas as propriedades e métodos necessários estão sendo expostos no slot `filters-exposed`

### Problema: Componentes Desktop não são resolvidos (Failed to resolve component)
- **Solução**: Importar os componentes diretamente dos arquivos `.vue` em vez de usar o `index.js`:
  ```javascript
  // ❌ Não funciona em alguns casos
  import { DesktopContentLayout, DesktopFiltersPanel } from '../../components/common/desktop';

  // ✅ Funciona sempre
  import DesktopContentLayout from '../../components/common/desktop/DesktopContentLayout.vue';
  import DesktopFiltersPanel from '../../components/common/desktop/DesktopFiltersPanel.vue';
  ```

### Problema: Campo de busca e botão com muito espaço entre eles
- **Solução**: Usar `d-flex gap-2` em vez de `row` com colunas separadas:
  ```vue
  <!-- ❌ Muito espaço entre input e botão -->
  <div class="row">
    <div class="col-10">
      <input type="text" class="form-control" />
    </div>
    <div class="col-2">
      <button class="btn">Buscar</button>
    </div>
  </div>

  <!-- ✅ Input e botão próximos -->
  <div class="d-flex gap-2">
    <input type="text" class="form-control flex-grow-1" />
    <button class="btn" style="flex-shrink: 0;">Buscar</button>
  </div>
  ```
  - Use `flex-grow-1` no input para que ele ocupe o espaço disponível
  - Use `flex-shrink: 0` no botão para evitar que ele seja cortado
  - Use `gap-2` (ou outro valor de gap) para controlar o espaçamento entre elementos

### Problema: Logo del comercio fuera de lugar o mal alineado
- **Solución**: Usar los mismos estilos CSS que `BusinessTracing.vue`:
  ```css
  @media (min-width: 992px) {
    .desktop-header-row {
      align-items: center;
      margin-bottom: 1.5rem;
      padding: 0.5rem 0;
      justify-content: flex-start;
    }

    .desktop-logo-wrapper {
      padding-right: 1rem;
      flex-shrink: 0;
      display: flex;
      align-items: center;
    }

    .desktop-commerce-logo {
      display: flex;
      align-items: center;
      max-width: 150px;
    }

    .desktop-commerce-logo .logo-desktop {
      max-width: 120px;
      max-height: 100px;
      width: auto;
      height: auto;
      margin-bottom: 0;
    }

    #commerce-logo-desktop {
      display: flex;
      align-items: center;
      justify-content: flex-start;
    }

    .desktop-menu-wrapper {
      flex: 1 1 0%;
      min-width: 0;
      width: auto;
    }
  }
  ```

### Problema: Filtros "Pesquisar Dados" de subcomponentes no aparecen
- **Causa**: No se verificaron todos los subcomponentes para ver si tienen filtros que necesitan ser expuestos
- **Solución**:
  1. Verificar TODOS los subcomponentes de la view (especialmente cuando hay tabs/pestañas)
  2. Buscar en cada subcomponente si tiene `showFilterOptions`, `Pesquisar Dados`, o sección de filtros colapsable
  3. Agregar prop `filtersLocation` a cada subcomponente que tenga filtros
  4. Agregar slot `filters-exposed` al inicio del template de cada subcomponente
  5. Hacer los filtros condicionales con `v-if="filtersLocation === 'component'"`
  6. Agregar los filtros completos al `DesktopFiltersPanel` en el template `#custom-filters` con `v-if` para cada tab activa
  7. Verificar con `grep` que el slot esté presente: `grep -n "filters-exposed" src/components/[path]/ComponentName.vue`

### Problema: Botones de tabs/pestañas aparecen fuera del área de contenido
- **Causa**: Los botones de navegación están fuera del `DesktopContentLayout` o fuera del slot `#content`
- **Solución**: Mover los botones de tabs/pestañas dentro del template `#content` del `DesktopContentLayout`, antes de los componentes principales:
  ```vue
  <template #content>
    <!-- Header with tabs -->
    <div class="row col mx-1 mt-3 mb-3">
      <!-- Botones de tabs aquí -->
    </div>

    <!-- Main content components -->
    <Component1 />
    <Component2 />
  </template>
  ```

### Problema: Slot filters-exposed no está en el template del componente hijo
- **Causa**: El `search_replace` puede fallar silenciosamente o el slot no se agregó correctamente
- **Solución**:
  1. Verificar con `grep` que el slot esté presente: `grep -n "filters-exposed" src/components/[path]/ComponentName.vue`
  2. Si no está, agregarlo manualmente al inicio del template, antes del div principal
  3. Asegurarse de que esté fuera de cualquier condicional `v-if` relacionada con la visibilidad del componente

### Problema: Filtros no funcionan (métodos o propiedades faltantes)
- **Causa**: El slot `filters-exposed` no expone todos los métodos y propiedades necesarios
- **Solución**:
  1. Revisar los filtros originales del componente para identificar todos los métodos y propiedades usados
  2. Agregar todos al slot `filters-exposed`: métodos (como `getToday`, `checkAsc`), propiedades (como `startDate`, `searchText`), y el estado `loading`
  3. Verificar que los nombres en el slot coincidan con los usados en el template del panel de filtros

### Problema: Invalid end tag (Tag de fechamento inválida)
- **Erro**: `[plugin:vite:vue] Invalid end tag.` na linha de fechamento do template
- **Causa**: Estrutura de divs desbalanceada, geralmente causada por:
  - Divs extras sendo fechadas
  - Divs não fechadas corretamente
  - Estrutura de aninhamento incorreta entre `content`, `product-stock`/`dashboard`, e condicionais `v-if`/`v-else`
- **Solução**: Verificar a estrutura de fechamento das divs seguindo este padrão:
  ```vue
  <!-- Desktop Layout -->
  <div class="d-none d-lg-block">
    <div class="content">
      <!-- page-header -->
      <div id="page-header">...</div>

      <!-- header-row -->
      <div class="row align-items-center mb-1 desktop-header-row">
        <!-- logo e menu -->
      </div>

      <!-- Conteúdo principal (product-stock ou dashboard) -->
      <div id="product-stock" v-if="isActiveBusiness()">
        <div v-if="state.commerces.length === 0">
          <!-- Mensagem quando não há comércios -->
        </div>
        <div v-else>
          <!-- DesktopContentLayout -->
        </div>
        <!-- Fechamento do v-else -->
      </div>

      <!-- Mensagem quando não há business ativo -->
      <div v-if="!isActiveBusiness() && !loading">
        <!-- Mensagem -->
      </div>
      <!-- Fechamento do product-stock -->
    </div>
    <!-- Fechamento do content -->
  </div>
  <!-- Fechamento do desktop layout -->
  ```
  **Ordem correta de fechamento:**
  1. Fecha `v-else` (se houver)
  2. Fecha `product-stock`/`dashboard`
  3. Fecha `content`
  4. Fecha `d-none d-lg-block` (desktop layout)
  5. Fecha wrapper principal
- **Dica**: Comparar com a estrutura de `BusinessTracing.vue` que funciona corretamente como referência

