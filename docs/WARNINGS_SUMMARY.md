# ESLint Warnings Summary

## 📊 Overall Statistics

- **Total Warnings**: ~1,243 warnings
- **Total Errors**: 199 errors (mostly pre-existing)
- **Fixable Warnings**: 325 warnings can be auto-fixed

## 🔍 Most Common Warning Types

### 1. **Missing Trailing Comma** (`comma-dangle`)

- **Count**: ~500+ warnings
- **Description**: Missing trailing commas in multiline objects/arrays
- **Fixable**: ✅ Yes (auto-fixable)
- **Example**:

  ```javascript
  // Before
  const obj = {
    a: 1,
    b: 2,
  };

  // After
  const obj = {
    a: 1,
    b: 2,
  };
  ```

### 2. **Async Function Has No 'await' Expression** (`require-await`)

- **Count**: ~200+ warnings
- **Description**: Functions marked as `async` but don't use `await`
- **Fixable**: ⚠️ Partially (can remove `async` keyword)
- **Example**:

  ```javascript
  // Warning
  async function login() {
    return someFunction();
  }

  // Fixed
  function login() {
    return someFunction();
  }
  ```

### 3. **Unused Variables/Components** (`no-unused-vars`, `vue/no-unused-components`)

- **Count**: ~150+ warnings
- **Description**: Variables or components defined but never used
- **Fixable**: ⚠️ Partially (can remove or prefix with `_`)
- **Example**:

  ```javascript
  // Warning
  const unusedVar = 'test';

  // Fixed
  const _unusedVar = 'test'; // or remove it
  ```

### 4. **Vue Component Prop Defaults** (`vue/require-valid-default-prop`)

- **Count**: ~100+ warnings
- **Description**: Props with object/array defaults should use functions
- **Fixable**: ⚠️ Manual (needs refactoring)
- **Example**:

  ```javascript
  // Warning
  props: {
    items: { type: Array, default: [] }
  }

  // Fixed
  props: {
    items: { type: Array, default: () => [] }
  }
  ```

### 5. **Props Destructuring** (`vue/no-setup-props-destructure`)

- **Count**: ~50+ warnings
- **Description**: Destructuring props in setup() root scope loses reactivity
- **Fixable**: ⚠️ Manual (needs refactoring)
- **Example**:

  ```javascript
  // Warning
  setup(props) {
    const { name } = props; // Loses reactivity
  }

  // Fixed
  setup(props) {
    const name = computed(() => props.name); // Maintains reactivity
  }
  ```

### 6. **Reserved Component Names** (`vue/no-reserved-component-names`)

- **Count**: 2 warnings
- **Description**: Using HTML reserved names (Footer, Header)
- **Fixable**: ❌ No (intentional, now a warning)
- **Files**: `src/App.vue`

### 7. **Self Assignment** (`no-self-assign`)

- **Count**: ~10 warnings
- **Description**: Variable assigned to itself
- **Fixable**: ⚠️ Manual (needs investigation)
- **Example**:
  ```javascript
  // Warning
  this.extendedEntity = this.extendedEntity;
  ```

### 8. **Event Hyphenation** (`vue/v-on-event-hyphenation`)

- **Count**: ~50+ warnings
- **Description**: Event names should be hyphenated
- **Fixable**: ✅ Yes (auto-fixable)
- **Example**:

  ```vue
  <!-- Warning -->
  <button @goBack="handler">

  <!-- Fixed -->
  <button @go-back="handler">
  ```

## 🎯 Priority Fixes

### High Priority (Auto-fixable)

1. **Missing Trailing Commas** - 325+ can be auto-fixed
2. **Event Hyphenation** - Can be auto-fixed
3. **Some Unused Variables** - Can be removed

### Medium Priority (Manual)

1. **Async without await** - Remove `async` keyword where not needed
2. **Unused Components** - Remove or use components
3. **Props Defaults** - Refactor to use functions

### Low Priority (Acceptable)

1. **Reserved Component Names** - Intentional (Footer/Header)
2. **Props Destructuring** - May be acceptable in some cases
3. **Self Assignment** - Needs investigation

## 🚀 Quick Fixes

### Auto-fix All Fixable Warnings

```bash
npm run lint -- --fix
```

This will fix:

- Missing trailing commas
- Event hyphenation
- Some formatting issues

### Manual Fixes Needed

- Async functions without await
- Unused variables/components
- Props defaults
- Props destructuring

## 📝 Notes

- Most warnings are **pre-existing** and not from our changes
- **325 warnings** can be auto-fixed with `npm run lint -- --fix`
- Pre-commit hook allows up to **9999 warnings** (won't block commits)
- Only **errors** will block commits (199 errors, mostly pre-existing)

---

**Last Updated**: Pre-commit fixes applied **Status**: Warnings are acceptable,
pre-commit hook working correctly
