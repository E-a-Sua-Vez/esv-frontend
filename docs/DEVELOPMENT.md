# Development Guide

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Git
- Code editor (VS Code recommended)
- Firebase account and project

### Initial Setup

```bash
# Clone repository
git clone [repository-url]
cd esv-frontend

# Install dependencies
npm install

# Set up environment variables
# Copy env_br.sh.example to env_br.sh and configure
# (Never commit actual env files)

# Start development server
npm run dev:br
```

## Development Workflow

### Code Style

- **Quotes**: Single quotes
- **Semicolons**: Always
- **Indentation**: 2 spaces
- **Line Length**: 100 characters
- **Trailing Commas**: ES5 style

### Linting and Formatting

```bash
# Check linting
npm run lint:check

# Fix linting issues
npm run lint

# Check formatting
npm run format:check

# Format code
npm run format
```

### Pre-commit Hooks

Husky and lint-staged are configured to automatically:
- Run ESLint on staged files
- Format code with Prettier
- Prevent commits with linting errors

## Project Structure

### Adding a New Service

1. Create file in `src/application/services/[entity].js`
2. Follow the service pattern:

```javascript
import { requestBackend, getHeaders } from '../api';

const entity = 'entityName';

export const getEntityById = async (id) => {
  return (await requestBackend.get(`/${entity}/${id}`, await getHeaders())).data;
};

export const createEntity = async (entityData) => {
  return (await requestBackend.post(`/${entity}`, entityData, await getHeaders())).data;
};

export const updateEntity = async (id, entityData) => {
  return (await requestBackend.patch(`/${entity}/${id}`, entityData, await getHeaders())).data;
};

export const deleteEntity = async (id) => {
  return (await requestBackend.delete(`/${entity}/${id}`, await getHeaders())).data;
};
```

### Adding a New Component

1. Place in appropriate directory:
   - `src/components/common/` - Shared components
   - `src/components/[feature]/` - Feature-specific
   - `src/components/domain/` - Domain components

2. Use Composition API when possible:

```vue
<script setup>
import { ref, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const loading = ref(false);

onMounted(() => {
  // Component initialization
});
</script>

<template>
  <div>
    {{ t('component.title') }}
  </div>
</template>

<style scoped>
/* Component styles */
</style>
```

3. Add i18n keys to `src/locales/*.json`

### Adding a New Route

1. Add route definition in appropriate router file:
   - `src/router/publico/` - Public routes
   - `src/router/interno/` - Private routes

2. Add route guard logic in `src/router/index.js` if needed

3. Create view component in `src/views/`

4. Add i18n keys for route labels

Example:

```javascript
// src/router/interno/commerce.js
const NewView = () => import('../../views/business/NewView.vue');

export default [
  {
    path: '/interno/negocio/new-feature',
    name: 'new-feature',
    component: NewView,
    meta: {
      requiresAuth: true,
      userType: 'business'
    }
  }
];
```

### Working with Firebase

1. Use collections from `src/application/firebase.js`

2. Create listener functions:

```javascript
import { ref, onUnmounted } from 'vue';
import { collection } from '../application/firebase';

export function updatedEntitiesByFilter(filterId) {
  const entities = ref([]);
  const query = collection
    .where('filterId', '==', filterId)
    .orderBy('createdAt', 'desc');

  const unsubscribe = query.onSnapshot(snapshot => {
    entities.value = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  });

  onUnmounted(unsubscribe);
  return entities;
}
```

3. Use in component:

```vue
<script setup>
import { onUnmounted } from 'vue';
import { updatedEntitiesByFilter } from '@/application/firebase';

const entities = updatedEntitiesByFilter(filterId);

onUnmounted(() => {
  // Unsubscribe handled by function
});
</script>
```

### Working with State (Pinia)

```javascript
import { globalStore } from '@/stores';

const store = globalStore();

// Get state
const user = await store.getCurrentUser;
const userType = await store.getCurrentUserType;

// Set state
await store.setCurrentUser(newUser);
await store.setCurrentUserType('business');

// Reset session
await store.resetSession();
```

### Internationalization

1. Add keys to all locale files:
   - `src/locales/es.json` (Spanish - default)
   - `src/locales/en.json` (English)
   - `src/locales/pt.json` (Portuguese)

2. Use in components:

```vue
<template>
  <!-- Template -->
  {{ $t('feature.section.key') }}
</template>

<script setup>
// Composition API
import { useI18n } from 'vue-i18n';
const { t } = useI18n();
const message = t('feature.section.key');
</script>
```

3. Translation structure:
```json
{
  "feature": {
    "section": {
      "key": "Translated text"
    }
  }
}
```

## Testing

### Running Tests

```bash
# E2E tests (Cypress)
npm run test:e2e

# Unit tests (when added)
npm run test:unit
```

### Writing Tests

- Add E2E tests in `cypress/e2e/`
- Test critical user flows
- Test authentication flows
- Test real-time updates

## Debugging

### Vue DevTools

Install Vue DevTools browser extension for:
- Component inspection
- State inspection
- Performance profiling

### Console Logging

- Use `console.log` in development only
- Remove before committing
- Consider using a logging service in production

### Firebase Debugging

- Use Firebase Console for:
  - Database inspection
  - Authentication debugging
  - Security rules testing

## Environment Configuration

### Environment Variables

All environment variables must be prefixed with `VITE_`:

```bash
VITE_BACKEND_URL=http://localhost:3000/
VITE_FIREBASE_API_KEY=your-key
# ... etc
```

### Environment Files

- `env_br.sh` - Brazil environment
- `env_net.sh` - Network environment
- Never commit these files

### Vite Configs

- `vite.config-br.js` - Brazil build
- `vite.config-net.js` - Network build
- `vite.config-test-br.js` - Test build

## Common Tasks

### Adding a New Feature

1. Create service in `src/application/services/`
2. Create components in `src/components/[feature]/`
3. Create views in `src/views/[feature]/`
4. Add routes in `src/router/`
5. Add i18n translations
6. Update documentation

### Fixing a Bug

1. Reproduce the bug
2. Identify root cause
3. Write test (if possible)
4. Fix the issue
5. Test thoroughly
6. Update documentation if needed

### Refactoring

1. Identify code to refactor
2. Ensure tests exist (or add them)
3. Refactor incrementally
4. Test after each change
5. Update documentation

## Best Practices

### Code Quality

- Write clean, readable code
- Follow existing patterns
- Use meaningful names
- Add comments for complex logic
- Keep functions small and focused

### Performance

- Use lazy loading for routes
- Optimize images
- Minimize bundle size
- Use `v-memo` for expensive lists
- Debounce search inputs

### Security

- Never commit secrets
- Validate all inputs
- Sanitize outputs
- Use HTTPS in production
- Review Firebase Security Rules

### Accessibility

- Use semantic HTML
- Add ARIA labels
- Ensure keyboard navigation
- Test with screen readers
- Maintain color contrast

## Troubleshooting

### Common Issues

**Issue**: Build fails
- Check Node.js version
- Clear `node_modules` and reinstall
- Check for syntax errors

**Issue**: Firebase connection fails
- Verify environment variables
- Check Firebase project configuration
- Review Firebase Security Rules

**Issue**: Routing not working
- Check route definitions
- Verify route guards
- Check user authentication state

**Issue**: i18n not working
- Verify translation keys exist
- Check locale configuration
- Ensure keys match exactly

### Getting Help

1. Check documentation
2. Review `.cursorrules` for context
3. Check existing code for patterns
4. Review error messages carefully
5. Ask team members

## Git Workflow

### Branching

- `main` - Production code
- `develop` - Development branch
- `feature/[name]` - Feature branches
- `fix/[name]` - Bug fix branches

### Commits

- Write clear commit messages
- Follow conventional commits format
- One logical change per commit
- Run linting before committing

### Pull Requests

- Write descriptive PR descriptions
- Link related issues
- Request reviews
- Ensure CI passes

## Deployment

### Pre-deployment Checklist

- [ ] All tests pass
- [ ] Linting passes
- [ ] No console errors
- [ ] Environment variables configured
- [ ] Documentation updated
- [ ] Security review completed

### Build Process

```bash
# Build for production
npm run build:br  # or build:net

# Test build locally
npm run preview
```

### Deployment

Deployment is automated via Google Cloud Build:
- Push to repository triggers build
- Build creates Docker image
- Image deployed to Cloud Run

## Resources

- [Vue 3 Documentation](https://vuejs.org/)
- [Vite Documentation](https://vitejs.dev/)
- [Pinia Documentation](https://pinia.vuejs.org/)
- [Vue Router Documentation](https://router.vuejs.org/)
- [Firebase Documentation](https://firebase.google.com/docs)

