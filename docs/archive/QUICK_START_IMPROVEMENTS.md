# Quick Start: Safe Improvements

This guide helps you implement the safest improvements first, with zero risk of
breaking existing functionality.

## 🎯 Goal

Improve code quality **without changing any business logic or user behavior**.

## ✅ Step 1: Add Constants (5 minutes)

**File**: `src/shared/constants/index.js` (already created)

**Usage Example**:

```javascript
// Before (in router/index.js)
if (currentUserType === 'business') {

// After
import { USER_TYPES } from '@/shared/constants';
if (currentUserType === USER_TYPES.BUSINESS) {
```

**Benefits**:

- ✅ No logic change
- ✅ Prevents typos
- ✅ Better IDE autocomplete
- ✅ Easier refactoring

**Test**: App should work exactly the same.

---

## ✅ Step 2: Use Storage Utilities (10 minutes)

**File**: `src/shared/utils/storage.js` (already created)

**Usage Example**:

```javascript
// Before (in stores/index.js)
const localValue = localStorage.getItem('currentUser');
let value = state.currentUser || localValue || undefined;
value = value === 'undefined' ? undefined : value;
value = value ? JSON.parse(value) : value;

// After
import { getStorageItem, STORAGE_KEYS } from '@/shared/utils/storage';

const value = state.currentUser || getStorageItem(STORAGE_KEYS.CURRENT_USER);
```

**Benefits**:

- ✅ Safer error handling
- ✅ Less code duplication
- ✅ Consistent behavior
- ✅ No logic change

**Test**: Login, refresh page, verify session persists.

---

## ✅ Step 3: Add Error Handler (10 minutes)

**File**: `src/application/errorHandler.js` (already created) **File**:
`src/application/api.js` (already updated)

**What Changed**:

- Added error interceptor to API client
- **Only affects error cases** (success flow unchanged)
- Better error messages

**Test**:

1. Test successful API calls (should work exactly as before)
2. Test error cases (disconnect network, should show better message)

---

## 📋 Implementation Checklist

### Phase 1: Foundation (Safest - Do First)

- [ ] **Step 1**: Use constants in router

  - Update `src/router/index.js` to use `USER_TYPES`
  - Test: All user types can login

- [ ] **Step 2**: Use storage utilities in store

  - Update `src/stores/index.js` getters
  - Test: Session persists, all getters work

- [ ] **Step 3**: Verify error handler
  - Test: API errors show better messages
  - Test: Successful calls unchanged

### Phase 2: Gradual Refactoring (After Phase 1)

- [ ] Refactor store getters (one at a time)
- [ ] Extract Firebase listener composable
- [ ] Extract common component patterns

---

## 🧪 Testing After Each Step

### Quick Test (2 minutes)

1. Login as business user
2. Navigate to dashboard
3. Refresh page (verify session persists)
4. Logout

### Full Test (10 minutes)

1. Test all user types login
2. Test session persistence
3. Test API calls (success and error)
4. Check browser console (no new errors)

---

## 🚨 Safety Rules

1. **One change at a time**: Make one improvement, test, commit
2. **Test immediately**: Don't accumulate changes
3. **Keep it simple**: Don't over-engineer
4. **Document changes**: Note what changed and why
5. **Rollback ready**: Be prepared to revert if needed

---

## 📝 Example: Updating Router (Safe)

```javascript
// src/router/index.js

// Add import at top
import { USER_TYPES, SESSION_TIMEOUT_DAYS, INVITED_SESSION_TIMEOUT_HOURS } from '@/shared/constants';

// Replace string comparisons
// Before:
if (currentUserType === 'business') {

// After:
if (currentUserType === USER_TYPES.BUSINESS) {

// Before:
if (currentUserType === 'collaborator') {

// After:
if (currentUserType === USER_TYPES.COLLABORATOR) {
```

**Test**: All routes should work exactly as before.

---

## 📝 Example: Updating Store (Safe)

```javascript
// src/stores/index.js

// Add imports
import { getStorageItem, setStorageItem, STORAGE_KEYS } from '@/shared/utils/storage';

// Update getter
// Before:
getCurrentUser: (state) => {
  const localValue = localStorage.getItem('currentUser');
  let value = state.currentUser || localValue || undefined;
  value = value === 'undefined' ? undefined : value;
  value = value ? JSON.parse(value) : value;
  return value;
}

// After:
getCurrentUser: (state) => {
  return state.currentUser || getStorageItem(STORAGE_KEYS.CURRENT_USER);
}

// Update setter
// Before:
async setCurrentUser(value) {
  const val = value ? JSON.stringify(value) : value;
  await localStorage.setItem('currentUser', val);
  this.$state.currentUser = val;
}

// After:
async setCurrentUser(value) {
  this.currentUser = value;
  setStorageItem(STORAGE_KEYS.CURRENT_USER, value);
}
```

**Test**: Login, verify user data loads, refresh page, verify persistence.

---

## 🎯 Next Steps

After completing Phase 1:

1. Review [SAFE_IMPROVEMENTS_PLAN.md](./SAFE_IMPROVEMENTS_PLAN.md) for Phase 2
2. Continue with store refactoring
3. Extract common patterns
4. Add composables

---

## ❓ Questions?

- **Q**: What if something breaks? **A**: Revert the change immediately.
  Document what broke and why.

- **Q**: How do I know if it's safe? **A**: If it doesn't change business logic,
  only code structure, it's safe.

- **Q**: Can I skip steps? **A**: Not recommended. Each step builds on the
  previous.

- **Q**: How long will this take? **A**: Phase 1: 1-2 hours. Full plan: 2-3
  weeks (part-time).

---

**Remember**: Slow and steady wins the race! 🐢🏆
