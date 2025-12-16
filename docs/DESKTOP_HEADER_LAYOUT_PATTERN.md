# Desktop Header Layout Pattern Guide

## Overview
This guide documents the exact pattern for adding a desktop layout where the CommerceLogo and ComponentMenu (title) appear side-by-side on desktop, while keeping mobile layout unchanged.

## Reference Implementation
- **Reference Page**: `src/views/business/BusinessTracing.vue`
- **Applied To**: `src/views/business/BusinessCommerceAdmin.vue`

## Key Principle
**CRITICAL**: Only modify the header row structure. Do NOT change alignment of other components. The desktop content div MUST keep `text-center` class to preserve existing component alignment.

---

## Step-by-Step Implementation

### Step 1: Wrap Existing Content in Mobile Layout

**Find**: The existing template structure that starts with:
```vue
<template>
  <div>
    <div class="content text-center">
      <CommerceLogo ... />
      <ComponentMenu ... />
      ...
    </div>
  </div>
</template>
```

**Replace with**:
```vue
<template>
  <div>
    <!-- Mobile/Tablet Layout -->
    <div class="d-block d-lg-none">
      <div class="content text-center">
        <CommerceLogo ... />
        <ComponentMenu ... />
        <!-- ALL EXISTING CONTENT STAYS HERE UNCHANGED -->
        ...
      </div>
    </div>
    <!-- Desktop Layout will be added after this -->
  </div>
</template>
```

**Important**:
- Keep `text-center` on mobile content div
- Keep ALL existing content inside the mobile layout section
- Close the mobile section with `</div></div>` (two closing divs)

---

### Step 2: Add Desktop Layout Section

**Add immediately after the mobile layout closing tags**:

```vue
    <!-- Desktop Layout -->
    <div class="d-none d-lg-block">
      <div class="content text-center">
        <div id="page-header" class="text-center mb-3">
          <Spinner :show="loading"></Spinner>
          <Alert :show="loading" :stack="alertError"></Alert>
        </div>
        <div class="row align-items-center mb-1 desktop-header-row justify-content-start">
          <div class="col-auto desktop-logo-wrapper">
            <div class="desktop-commerce-logo">
              <div id="commerce-logo-desktop">
                <img
                  v-if="!loading || state.business.logo"
                  class="rounded img-fluid logo-desktop"
                  :alt="$t('logoAlt')"
                  :src="state.business.logo || $t('hubLogoBlanco')"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
          <div class="col desktop-menu-wrapper" style="flex: 1 1 auto; min-width: 0">
            <ComponentMenu
              :title="$t(`[YOUR_TITLE_KEY]`)"
              :toggles="state.toggles"
              component-name="[YOUR_COMPONENT_NAME]"
              @goBack="goBack"
            >
            </ComponentMenu>
          </div>
        </div>
        <!-- ALL EXISTING CONTENT DUPLICATED HERE (except CommerceLogo and ComponentMenu from top) -->
        <div id="[YOUR_MAIN_CONTENT_ID]">
          <!-- Rest of your content exactly as it appears in mobile -->
        </div>
      </div>
    </div>
```

**Key Points**:
- Desktop content div MUST have `text-center` class (preserves other component alignment)
- Header row has `justify-content-start` to align logo and title to left
- Replace `[YOUR_TITLE_KEY]` with your actual i18n key
- Replace `[YOUR_COMPONENT_NAME]` with your actual component name
- Replace `[YOUR_MAIN_CONTENT_ID]` with your actual main content div id
- Duplicate ALL content from mobile section (except the CommerceLogo and ComponentMenu that are now in the header row)

---

### Step 3: Add CSS Styles

**Add to the `<style scoped>` section at the end of the file**:

```css
/* Desktop Layout Styles - Only affects the header row */
@media (min-width: 992px) {
  .desktop-header-row {
    align-items: center;
    margin-bottom: 1.5rem;
    padding: 0.5rem 0;
    justify-content: flex-start;
    text-align: left;
  }

  .desktop-header-row .desktop-logo-wrapper {
    padding-right: 1rem;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    text-align: left;
  }

  .desktop-header-row .desktop-commerce-logo {
    display: flex;
    align-items: center;
    max-width: 150px;
    text-align: left;
  }

  .desktop-header-row .desktop-commerce-logo .logo-desktop {
    max-width: 120px;
    max-height: 100px;
    width: auto;
    height: auto;
    margin-bottom: 0;
  }

  .desktop-header-row #commerce-logo-desktop {
    display: flex;
    align-items: center;
    justify-content: flex-start;
  }

  .desktop-header-row .desktop-menu-wrapper {
    flex: 1 1 0%;
    min-width: 0;
    width: auto;
    text-align: left;
  }
}
```

**Critical CSS Rules**:
- ALL selectors MUST be prefixed with `.desktop-header-row` to scope styles
- This prevents affecting other components
- Media query `@media (min-width: 992px)` matches Bootstrap's `lg` breakpoint

---

## Complete Template Structure

```vue
<template>
  <div>
    <!-- Mobile/Tablet Layout -->
    <div class="d-block d-lg-none">
      <div class="content text-center">
        <CommerceLogo :src="state.business.logo" :loading="loading"></CommerceLogo>
        <ComponentMenu
          :title="$t(`your.title.key`)"
          :toggles="state.toggles"
          component-name="yourComponentName"
          @goBack="goBack"
        >
        </ComponentMenu>
        <div id="page-header" class="text-center">
          <Spinner :show="loading"></Spinner>
          <Alert :show="loading" :stack="alertError"></Alert>
        </div>
        <!-- ALL YOUR EXISTING CONTENT -->
      </div>
    </div>

    <!-- Desktop Layout -->
    <div class="d-none d-lg-block">
      <div class="content text-center">
        <div id="page-header" class="text-center mb-3">
          <Spinner :show="loading"></Spinner>
          <Alert :show="loading" :stack="alertError"></Alert>
        </div>
        <div class="row align-items-center mb-1 desktop-header-row justify-content-start">
          <div class="col-auto desktop-logo-wrapper">
            <div class="desktop-commerce-logo">
              <div id="commerce-logo-desktop">
                <img
                  v-if="!loading || state.business.logo"
                  class="rounded img-fluid logo-desktop"
                  :alt="$t('logoAlt')"
                  :src="state.business.logo || $t('hubLogoBlanco')"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
          <div class="col desktop-menu-wrapper" style="flex: 1 1 auto; min-width: 0">
            <ComponentMenu
              :title="$t(`your.title.key`)"
              :toggles="state.toggles"
              component-name="yourComponentName"
              @goBack="goBack"
            >
            </ComponentMenu>
          </div>
        </div>
        <!-- ALL YOUR EXISTING CONTENT (duplicated from mobile) -->
      </div>
    </div>
  </div>
</template>
```

---

## Common Mistakes to Avoid

### ❌ WRONG: Removing `text-center` from desktop content div
```vue
<!-- WRONG -->
<div class="content">  <!-- Missing text-center -->
```

**Why**: This will left-align all other components, breaking the layout.

### ✅ CORRECT: Keep `text-center` on desktop content div
```vue
<!-- CORRECT -->
<div class="content text-center">
```

### ❌ WRONG: Not scoping CSS selectors
```css
/* WRONG - affects all elements */
.desktop-logo-wrapper {
  ...
}
```

**Why**: This will affect other components that might have similar class names.

### ✅ CORRECT: Scope all CSS to header row
```css
/* CORRECT - only affects header row */
.desktop-header-row .desktop-logo-wrapper {
  ...
}
```

### ❌ WRONG: Forgetting to duplicate content
```vue
<!-- WRONG - content only in mobile -->
<div class="d-block d-lg-none">
  <!-- content here -->
</div>
<div class="d-none d-lg-block">
  <!-- missing content! -->
</div>
```

**Why**: Desktop layout will be empty.

### ✅ CORRECT: Duplicate content in both sections
```vue
<!-- CORRECT - content in both -->
<div class="d-block d-lg-none">
  <!-- content here -->
</div>
<div class="d-none d-lg-block">
  <!-- same content here (except header) -->
</div>
```

---

## Verification Checklist

After implementation, verify:

- [ ] Mobile layout unchanged (logo and title stacked vertically, centered)
- [ ] Desktop layout shows logo and title side-by-side (logo left, title right)
- [ ] Other components maintain their original alignment (centered)
- [ ] No CSS affecting components outside the header row
- [ ] Both mobile and desktop sections have all content
- [ ] Desktop content div has `text-center` class
- [ ] All CSS selectors are scoped with `.desktop-header-row`
- [ ] Breakpoint matches Bootstrap `lg` (992px)

---

## Testing

1. **Mobile (< 992px)**: Logo and title should be stacked, centered
2. **Desktop (≥ 992px)**: Logo and title should be side-by-side, left-aligned
3. **Other Components**: Should remain centered on both mobile and desktop

---

## Notes

- The pattern uses Bootstrap's responsive utilities: `d-block d-lg-none` (mobile) and `d-none d-lg-block` (desktop)
- The breakpoint 992px matches Bootstrap's `lg` breakpoint
- Logo image uses the same source as CommerceLogo component: `state.business.logo || $t('hubLogoBlanco')`
- The header row uses Bootstrap's grid system: `col-auto` for logo (fixed width), `col` for title (flexible width)








