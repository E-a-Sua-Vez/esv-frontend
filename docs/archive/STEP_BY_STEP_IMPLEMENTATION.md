# Step-by-Step Implementation Guide

## 🎯 Goal

Implement improvements **one step at a time** with **testing after each step**
to ensure zero regressions.

## 📋 Pre-Implementation Checklist

Before starting, ensure:

- [ ] App is running: `npm run dev:br`
- [ ] No uncommitted changes (or commit current work)
- [ ] Browser DevTools open (Console tab)
- [ ] Test credentials ready for all user types

---

## Step 1: Add Constants to Router (Safest - 5 minutes)

### What We're Doing

Replacing magic strings with constants. **Zero logic change** - just using
constants instead of strings.

### Implementation

1. **Open** `src/router/index.js`

2. **Add import at the top** (after existing imports):

```javascript
import {
  USER_TYPES,
  SESSION_TIMEOUT_DAYS,
  INVITED_SESSION_TIMEOUT_HOURS,
} from '@/shared/constants';
```

3. **Replace string comparisons** (one at a time):

```javascript
// Find this line (around line 95):
if (currentUserType === 'collaborator') {

// Replace with:
if (currentUserType === USER_TYPES.COLLABORATOR) {
```

```javascript
// Find this line (around line 98):
} else if (currentUserType === 'business') {

// Replace with:
} else if (currentUserType === USER_TYPES.BUSINESS) {
```

```javascript
// Find this line (around line 101):
} else if (currentUserType === 'master') {

// Replace with:
} else if (currentUserType === USER_TYPES.MASTER) {
```

```javascript
// Find this line (around line 148):
if (currentUserType === 'colaborator') {  // Note: typo in original

// Replace with:
if (currentUserType === USER_TYPES.COLLABORATOR) {
```

Continue replacing all instances of:

- `'business'` → `USER_TYPES.BUSINESS`
- `'collaborator'` → `USER_TYPES.COLLABORATOR`
- `'master'` → `USER_TYPES.MASTER`
- `'invited'` → `USER_TYPES.INVITED`

### Testing (2 minutes)

**Quick Test**:

1. ✅ Save file, check console for errors
2. ✅ Login as **Business** user → Should redirect to business menu
3. ✅ Logout
4. ✅ Login as **Collaborator** user → Should redirect to collaborator menu
5. ✅ Logout
6. ✅ Login as **Master** user → Should redirect to master menu
7. ✅ Verify all routes accessible

**Expected Result**: Everything works **exactly the same** as before.

**If anything breaks**: Revert the change immediately.

### Commit

```bash
git add src/router/index.js
git commit -m "refactor: use constants for user types in router"
```

---

## Step 2: Use Storage Utilities in Store (10 minutes)

### What We're Doing

Replacing localStorage code with safe utilities. **Same behavior** - just safer
and cleaner.

### Implementation

1. **Open** `src/stores/index.js`

2. **Add imports at the top**:

```javascript
import {
  getStorageItem,
  setStorageItem,
  removeStorageItem,
  STORAGE_KEYS,
} from '@/shared/utils/storage';
```

3. **Update getters** (one at a time, test after each):

#### Update `getCurrentUser`:

```javascript
// BEFORE (lines 18-24):
getCurrentUser: (state) => {
  const localValue = localStorage.getItem('currentUser');
  let value = state.currentUser || localValue || undefined;
  value = value === 'undefined' ? undefined : value;
  value = value ? JSON.parse(value) : value;
  return value;
},

// AFTER:
getCurrentUser: (state) => {
  return state.currentUser || getStorageItem(STORAGE_KEYS.CURRENT_USER);
},
```

**Test immediately**: Login, verify user loads, refresh page, verify
persistence.

#### Update `getCurrentPermissions`:

```javascript
// BEFORE:
getCurrentPermissions: (state) => {
  const localValue = localStorage.getItem('currentPermissions');
  let value = state.currentPermissions || localValue || undefined;
  value = value === 'undefined' ? undefined : value;
  value = value ? JSON.parse(value) : value;
  return value;
},

// AFTER:
getCurrentPermissions: (state) => {
  return state.currentPermissions || getStorageItem(STORAGE_KEYS.CURRENT_PERMISSIONS);
},
```

#### Update `getCurrentQueue`:

```javascript
// BEFORE:
getCurrentQueue: async (state) => {
  const localValue = localStorage.getItem('currentQueue');
  let value = state.currentQueue || localValue || undefined;
  value = value === 'undefined' ? undefined : value;
  value = value ? JSON.parse(value) : value;
  return value;
},

// AFTER (remove async - now synchronous):
getCurrentQueue: (state) => {
  return state.currentQueue || getStorageItem(STORAGE_KEYS.CURRENT_QUEUE);
},
```

#### Update `getCurrentUserType`:

```javascript
// BEFORE:
getCurrentUserType: async (state) => {
  const localValue = localStorage.getItem('currentUserType');
  const value = state.currentUserType || localValue || undefined;
  return value === 'undefined' ? undefined : value;
},

// AFTER (remove async):
getCurrentUserType: (state) => {
  const stored = state.currentUserType || localStorage.getItem(STORAGE_KEYS.CURRENT_USER_TYPE);
  return stored && stored !== 'undefined' ? stored : null;
},
```

#### Update `getCurrentCommerce`:

```javascript
// BEFORE:
getCurrentCommerce: async (state) => {
  let localValue = localStorage.getItem('currentCommerce');
  let value = state.currentCommerce || localValue || undefined;
  value = value === 'undefined' ? undefined : value;
  value = value ? JSON.parse(value) : value;
  return value;
},

// AFTER (remove async):
getCurrentCommerce: (state) => {
  return state.currentCommerce || getStorageItem(STORAGE_KEYS.CURRENT_COMMERCE);
},
```

#### Update `getCurrentBusiness`:

```javascript
// BEFORE:
getCurrentBusiness: async (state) => {
  let localValue = localStorage.getItem('currentBusiness');
  let value = state.currentBusiness || localValue || undefined;
  value = value === 'undefined' ? undefined : value;
  value = value ? JSON.parse(value) : value;
  return value;
},

// AFTER (remove async):
getCurrentBusiness: (state) => {
  return state.currentBusiness || getStorageItem(STORAGE_KEYS.CURRENT_BUSINESS);
},
```

#### Update `getCurrentAttentionChannel`:

```javascript
// BEFORE:
getCurrentAttentionChannel: async (state) => {
  const localValue = localStorage.getItem('currentAttentionChannel');
  let value = state.currentAttentionChannel || localValue || 'QR';
  return value === 'undefined' ? undefined : value;
},

// AFTER (remove async):
getCurrentAttentionChannel: (state) => {
  const stored = state.currentAttentionChannel || localStorage.getItem(STORAGE_KEYS.CURRENT_ATTENTION_CHANNEL);
  return stored && stored !== 'undefined' ? stored : 'QR';
},
```

#### Update `getCurrentActiveAttentions`:

```javascript
// BEFORE:
getCurrentActiveAttentions: async (state) => {
  let localValue = localStorage.getItem('currentActiveAttentions');
  let value = state.currentActiveAttentions || localValue || undefined;
  value = value === 'undefined' ? undefined : value;
  value = value ? JSON.parse(value) : value;
  return value;
},

// AFTER (remove async):
getCurrentActiveAttentions: (state) => {
  return state.currentActiveAttentions || getStorageItem(STORAGE_KEYS.CURRENT_ACTIVE_ATTENTIONS);
},
```

4. **Update setters**:

#### Update `setCurrentUser`:

```javascript
// BEFORE:
async setCurrentUser(value) {
  const val = value ? JSON.stringify(value) : value;
  await localStorage.setItem('currentUser', val);
  this.$state.currentUser = val;
},

// AFTER:
async setCurrentUser(value) {
  this.currentUser = value;
  setStorageItem(STORAGE_KEYS.CURRENT_USER, value);
},
```

Continue for all setters following the same pattern.

5. **Update `resetSession`**:

```javascript
// BEFORE:
async resetSession() {
  await localStorage.setItem('currentUser', undefined);
  await localStorage.setItem('currentQueue', undefined);
  await localStorage.setItem('currentPermissions', undefined);
  await localStorage.setItem('currentActiveAttentions', undefined);
  await this.setCurrentUser(undefined);
  await this.setCurrentQueue(undefined);
  await this.setCurrentPermissions(undefined);
  await this.setCurrentActiveAttentions(undefined);
  this.currentUser = undefined;
  this.currentQueue = undefined;
  this.currentPermissions = undefined;
  this.currentActiveAttentions = undefined;
},

// AFTER:
async resetSession() {
  // Clear state
  this.currentUser = null;
  this.currentQueue = null;
  this.currentPermissions = null;
  this.currentActiveAttentions = null;

  // Clear storage
  removeStorageItem(STORAGE_KEYS.CURRENT_USER);
  removeStorageItem(STORAGE_KEYS.CURRENT_QUEUE);
  removeStorageItem(STORAGE_KEYS.CURRENT_PERMISSIONS);
  removeStorageItem(STORAGE_KEYS.CURRENT_ACTIVE_ATTENTIONS);
},
```

### Testing (5 minutes)

**Critical Test**:

1. ✅ **Login** as business user
2. ✅ **Verify** user data loads correctly
3. ✅ **Refresh page** (F5) → Session should persist
4. ✅ **Navigate** to different routes → Should work
5. ✅ **Logout** → Should clear session
6. ✅ **Login again** → Should work
7. ✅ **Check localStorage** in DevTools → Keys should be correct

**Expected Result**:

- Same behavior as before
- No console errors
- Session persists correctly
- All getters return correct data

**If anything breaks**: Revert immediately.

### Commit

```bash
git add src/stores/index.js
git commit -m "refactor: use storage utilities in store"
```

---

## Step 3: Update Components Using Store (Gradual)

### What We're Doing

Updating components that use async store getters to use synchronous getters.

### Find Components Using Async Getters

Search for:

```bash
grep -r "await store.getCurrent" src/
```

### Update Pattern

**BEFORE**:

```javascript
const user = await store.getCurrentUser;
```

**AFTER**:

```javascript
const user = store.getCurrentUser; // Now synchronous
```

Update **one component at a time**, test after each.

### Testing

After each component update:

1. ✅ Component renders
2. ✅ Data loads correctly
3. ✅ No console errors
4. ✅ Functionality works

---

## Step 4: Add Error Handler (Optional - Already Prepared)

The error handler is ready. To enable it:

1. **Open** `src/application/api.js`

2. **Add import**:

```javascript
import { handleApiError } from './errorHandler';
```

3. **Add interceptor** (before export):

```javascript
// Add error interceptor (non-breaking - only handles errors)
requestBackend.interceptors.response.use(
  response => response, // Success - no change
  error => {
    const errorInfo = handleApiError(error, 'Backend API');
    if (import.meta.env.DEV) {
      console.error('API Error:', errorInfo);
    }
    return Promise.reject(error); // Maintains current behavior
  }
);
```

### Testing

1. ✅ **Normal API calls** → Should work exactly as before
2. ✅ **Disconnect network** → Should show better error message
3. ✅ **Invalid request** → Should handle gracefully

---

## 🧪 Complete Regression Test

After all steps, run full test:

### Authentication

- [ ] Business login works
- [ ] Collaborator login works
- [ ] Master login works
- [ ] Invited access works
- [ ] Session persists on refresh
- [ ] Session expires correctly
- [ ] Logout works

### Data Loading

- [ ] All API calls work
- [ ] Store getters return correct data
- [ ] Store setters update correctly
- [ ] localStorage syncs properly

### Navigation

- [ ] All routes accessible
- [ ] Route guards work
- [ ] Redirects work correctly

### Real-time

- [ ] Firebase listeners work
- [ ] Real-time updates appear
- [ ] No memory leaks

---

## 🚨 If Something Breaks

1. **Stop immediately**
2. **Revert the change**:
   ```bash
   git checkout src/[file]
   ```
3. **Document what broke**
4. **Fix the issue** before retrying
5. **Test more thoroughly** next time

---

## ✅ Success Criteria

- ✅ All tests pass
- ✅ No console errors
- ✅ Same behavior as before
- ✅ Code is cleaner
- ✅ Easier to maintain

---

## 📝 Notes

- **Go slow**: One change at a time
- **Test immediately**: Don't accumulate changes
- **Document issues**: Note what doesn't work
- **Ask for help**: If stuck, ask before breaking things

---

**Ready to start? Begin with Step 1!** 🚀
