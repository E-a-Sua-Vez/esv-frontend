# Security Fix Guide

This guide provides step-by-step instructions for fixing the remaining security
vulnerabilities.

## Quick Fixes (No Breaking Changes)

### 1. Fix micromatch vulnerability

```bash
npm install lint-staged@latest --save-dev
```

This updates lint-staged which will pull in a fixed version of micromatch.

**Verification**:

```bash
npm audit | grep micromatch
```

Should show no vulnerabilities for micromatch.

---

## Breaking Changes (Requires Testing)

### 2. Fix dompurify (via jspdf)

**Option A: Update jspdf (Recommended if PDF generation is used)**

```bash
npm install jspdf@latest
```

**Breaking Changes to Review**:

- Check jspdf v3.x changelog
- Test all PDF generation functionality
- Update code if API changed

**Verification**:

```bash
npm audit | grep dompurify
```

**If PDF generation breaks**:

- Review jspdf v3 migration guide
- Or consider alternative: `pdfmake`, `pdfkit`, or `react-pdf`

---

### 3. Fix esbuild/vite (Development Only)

**Option A: Update Vite (Plan for next major update)**

```bash
npm install vite@latest @vitejs/plugin-vue@latest --save-dev
```

**Breaking Changes**:

- Vite 7.x has breaking changes
- Review [Vite Migration Guide](https://vitejs.dev/guide/migration.html)
- Test build process thoroughly

**Verification**:

```bash
npm run build:br
npm run build:net
```

**Option B: Accept Risk (Recommended for now)**

- This vulnerability only affects the development server
- Not a production risk
- Can be addressed in next major update

---

### 4. Fix Firebase (Major Migration Required)

**⚠️ IMPORTANT**: Firebase v9+ uses a completely different modular SDK API.

**Current Code Pattern (v8)**:

```javascript
import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';

firebase.initializeApp(config);
const auth = firebase.auth();
const firestore = firebase.firestore();
```

**New Pattern (v9+)**:

```javascript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const app = initializeApp(config);
const auth = getAuth(app);
const firestore = getFirestore(app);
```

**Migration Steps**:

1. **Install Firebase v9+**:

   ```bash
   npm install firebase@latest
   ```

2. **Update firebase.js**:

   - Convert to modular imports
   - Update all collection references
   - Update all auth methods

3. **Update all components using Firebase**:

   - Update imports
   - Update method calls
   - Test real-time listeners

4. **Test thoroughly**:
   - Authentication flows
   - Real-time updates
   - Firestore queries
   - All Firebase features

**Resources**:

- [Firebase Migration Guide](https://firebase.google.com/docs/web/modular-upgrade)
- [Firebase v9 Documentation](https://firebase.google.com/docs/web/modular-api)

**Recommendation**:

- Plan as a separate migration task
- Create a feature branch
- Migrate incrementally
- Test each module as you migrate

---

### 5. Fix vue-cli-plugin-i18n (Low Priority)

**Option A: Remove if not needed**

Check if `vue-cli-plugin-i18n` is actually used. You're using
`@intlify/unplugin-vue-i18n`, so this might be redundant.

```bash
# Check usage
grep -r "vue-cli-plugin-i18n" src/

# If not used, remove
npm uninstall vue-cli-plugin-i18n
```

**Option B: Update if needed**

```bash
npm install vue-cli-plugin-i18n@latest --save-dev
```

**Note**: This is a dev dependency and doesn't affect production.

---

## Recommended Fix Order

### Phase 1: Quick Wins (Do Now)

1. ✅ Update lint-staged (fixes micromatch)
2. ✅ Review and remove vue-cli-plugin-i18n if not needed

### Phase 2: Low Risk Updates (Test First)

3. ⚠️ Update jspdf (if PDF generation is critical)
   - Test PDF generation
   - Review breaking changes

### Phase 3: Development Updates (Plan)

4. ⚠️ Update Vite (plan for next major update)
   - Review migration guide
   - Test build process
   - Update CI/CD if needed

### Phase 4: Major Migration (Separate Task)

5. ⚠️ Migrate Firebase to v9+ modular SDK
   - Create migration plan
   - Allocate dedicated time
   - Test thoroughly

---

## Testing Checklist

After each update, test:

- [ ] Application builds successfully
- [ ] Development server starts
- [ ] Authentication works (all user types)
- [ ] Real-time Firebase updates work
- [ ] API calls work correctly
- [ ] PDF generation (if applicable)
- [ ] All routes accessible
- [ ] No console errors
- [ ] Production build works

---

## Rollback Plan

If an update breaks functionality:

1. **Revert the change**:

   ```bash
   git checkout package.json package-lock.json
   npm install
   ```

2. **Document the issue**:

   - What broke?
   - Why did it break?
   - What's the workaround?

3. **Plan alternative fix**:
   - Can we use a different version?
   - Is there an alternative package?
   - Can we accept the risk temporarily?

---

## Automated Security Monitoring

### Set up Dependabot (GitHub)

Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: 'npm'
    directory: '/'
    schedule:
      interval: 'weekly'
    open-pull-requests-limit: 10
    reviewers:
      - 'your-team'
    labels:
      - 'dependencies'
      - 'security'
```

### Add to CI/CD

Add security check to your build pipeline:

```yaml
# In your CI config
- name: Security Audit
  run: npm audit --audit-level=moderate
```

---

## Questions?

- Review the main [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) for details
- Check package documentation for breaking changes
- Test in development environment first
- Create issues for tracking migration tasks

---

**Last Updated**: 2024
