# Modal Duplicate ID Solution Pattern

## Problem

When views are split into mobile (`d-block d-lg-none`) and desktop (`d-none d-lg-block`) sections, components with modals get rendered twice. This creates **duplicate modal IDs**, which breaks Bootstrap modal functionality because Bootstrap requires unique IDs.

## Root Cause

Bootstrap modals use `id` attributes to identify modals. When the same component is rendered in both mobile and desktop sections:
- Two modals with the same ID exist in the DOM
- Bootstrap's `data-bs-target` can't reliably find the correct modal
- Modals fail to open or behave incorrectly

## Solution Pattern

Render the component with the modal **once outside the responsive sections** (hidden) to provide a single modal that both mobile and desktop buttons can target.

### Pattern Structure

```vue
<template>
  <div>
    <!-- Mobile/Tablet Layout -->
    <div class="d-block d-lg-none">
      <div class="content text-center">
        <!-- Component content visible here, but modal button targets hidden modal -->
        <ComponentWithModal
          :show-component="state.showComponent"
          :toggles="state.toggles"
          <!-- other props -->
        >
        </ComponentWithModal>
      </div>
    </div>

    <!-- Desktop Layout -->
    <div class="d-none d-lg-block">
      <div class="content text-center">
        <!-- Component content visible here, but modal button targets hidden modal -->
        <ComponentWithModal
          :show-component="state.showComponent"
          :toggles="state.toggles"
          <!-- other props -->
        >
        </ComponentWithModal>
      </div>
    </div>

    <!-- Render component once outside responsive sections for the modal -->
    <!-- This ensures single modal ID - buttons in both mobile and desktop will target this modal -->
    <!-- Bootstrap modals are appended to body when opened, so this hidden instance will work -->
    <div style="position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; visibility: hidden; pointer-events: none;">
      <ComponentWithModal
        :show-component="true"
        :toggles="state.toggles"
        <!-- other props - ensure modal is always accessible -->
      >
      </ComponentWithModal>
    </div>
  </div>
</template>
```

## Implementation Steps

### Step 1: Identify Components with Modals

Check if any components rendered in both mobile and desktop sections have modals:
- Look for `data-bs-toggle="modal"` or `data-bs-target` attributes
- Check for `<div class="modal fade">` elements
- Components that define modals internally

### Step 2: Render Component Three Times

1. **Mobile section**: Render component normally (for content display)
2. **Desktop section**: Render component normally (for content display)
3. **Hidden instance**: Render component once outside responsive sections (for modal only)

### Step 3: Configure Hidden Instance

The hidden instance should:
- Be always rendered (no conditional `v-if` that might prevent rendering)
- Have `show-component="true"` or equivalent to ensure modal is accessible
- Use the same props as visible instances (especially `toggles` if needed for modal permissions)
- Be hidden with CSS: `position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; visibility: hidden; pointer-events: none;`

### Step 4: Ensure Modal IDs Are Static

- Use static IDs (not dynamic bindings) for modals: `id="modalId"` not `:id="modalId"`
- Use static `data-bs-target`: `data-bs-target="#modalId"` not `:data-bs-target="'#modalId'"`
- This ensures Bootstrap can reliably find the modal

## Examples

### Example 1: ConfigurationWhatsappManagement (BusinessConfiguration.vue)

```vue
<template>
  <div>
    <!-- Mobile/Tablet Layout -->
    <div class="d-block d-lg-none">
      <ConfigurationWhatsappManagement
        :show-configurations="state.showWhatsapp"
        :toggles="state.toggles"
        <!-- other props -->
      >
      </ConfigurationWhatsappManagement>
    </div>

    <!-- Desktop Layout -->
    <div class="d-none d-lg-block">
      <ConfigurationWhatsappManagement
        :show-configurations="state.showWhatsapp"
        :toggles="state.toggles"
        <!-- other props -->
      >
      </ConfigurationWhatsappManagement>
    </div>

    <!-- Hidden instance for modal -->
    <div v-if="state.showWhatsapp && state.toggles['configuration.admin.whatsapps']" style="position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; visibility: hidden; pointer-events: none;">
      <ConfigurationWhatsappManagement
        :show-configurations="true"
        :toggles="state.toggles"
        <!-- other props -->
      >
      </ConfigurationWhatsappManagement>
    </div>
  </div>
</template>
```

### Example 2: DocumentsManagement (BusinessDocuments.vue)

```vue
<template>
  <div>
    <!-- Mobile/Tablet Layout -->
    <div class="d-block d-lg-none">
      <DocumentsManagement
        :show-client-management="true"
        :toggles="state.toggles"
        <!-- other props -->
      >
      </DocumentsManagement>
    </div>

    <!-- Desktop Layout -->
    <div class="d-none d-lg-block">
      <DocumentsManagement
        :show-client-management="true"
        :toggles="state.toggles"
        <!-- other props -->
      >
      </DocumentsManagement>
    </div>

    <!-- Hidden instance for modal -->
    <div style="position: absolute; left: -9999px; width: 1px; height: 1px; overflow: hidden; visibility: hidden; pointer-events: none;">
      <DocumentsManagement
        :show-client-management="true"
        :toggles="state.toggles"
        <!-- other props -->
      >
      </DocumentsManagement>
    </div>
  </div>
</template>
```

## When to Apply This Pattern

Apply this pattern when:
- ✅ View has mobile/desktop sections (`d-block d-lg-none` and `d-none d-lg-block`)
- ✅ Component with modal is rendered in both sections
- ✅ Modal uses Bootstrap's `data-bs-toggle` and `data-bs-target`
- ✅ Modal has a static ID (not dynamically generated per instance)

**Do NOT apply** when:
- ❌ Modal is defined directly in the view (not in a child component) - render it once outside sections
- ❌ Component is only rendered in one section (mobile or desktop, not both)
- ❌ Modal uses Vue's `v-if`/`v-show` instead of Bootstrap's modal system

## Alternative Solutions

### Option 1: Move Modal Outside Sections (For View-Level Modals)

If the modal is defined directly in the view (not in a child component), move it outside the responsive sections:

```vue
<template>
  <div>
    <!-- Mobile Layout -->
    <div class="d-block d-lg-none">
      <!-- Content with button -->
      <button data-bs-toggle="modal" data-bs-target="#myModal">Open</button>
    </div>

    <!-- Desktop Layout -->
    <div class="d-none d-lg-block">
      <!-- Content with button -->
      <button data-bs-toggle="modal" data-bs-target="#myModal">Open</button>
    </div>

    <!-- Modal outside sections - single instance -->
    <div class="modal fade" id="myModal">
      <!-- Modal content -->
    </div>
  </div>
</template>
```

### Option 2: Use Teleport (Vue 3)

For Vue 3, you can use `Teleport` to render modals outside the component tree:

```vue
<template>
  <Teleport to="body">
    <div class="modal fade" id="myModal">
      <!-- Modal content -->
    </div>
  </Teleport>
</template>
```

## Verification Checklist

After applying the fix:
- [ ] Modal opens from mobile layout
- [ ] Modal opens from desktop layout
- [ ] No console errors about duplicate IDs
- [ ] Modal content displays correctly
- [ ] Modal can be closed properly
- [ ] Only one modal with the ID exists in DOM (check with browser DevTools)

## Common Issues

### Issue: Modal still doesn't open
- **Check**: Ensure hidden instance is always rendered (remove conditional `v-if` if needed)
- **Check**: Verify modal ID is static (not dynamic)
- **Check**: Ensure `toggles` or permissions are available in hidden instance

### Issue: Modal opens but content is wrong
- **Check**: Ensure hidden instance receives same props as visible instances
- **Check**: Verify `show-component` or equivalent prop is set correctly

### Issue: Performance concerns with hidden instance
- **Note**: Hidden instance is minimal overhead (just modal definition)
- **Note**: Component content is not rendered when `show-component="false"` (if component respects this)
- **Alternative**: Use `Teleport` to move modal to body when opened

## Notes

- Bootstrap modals are automatically appended to `body` when opened, so hidden instances work correctly
- The hidden instance should be rendered **after** the responsive sections in the template
- Always test on both mobile and desktop to ensure modals work from both layouts


