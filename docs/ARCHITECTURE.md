# Architecture Documentation

## System Overview

ESV Frontend is a Vue 3 Single Page Application (SPA) that provides a comprehensive queue management system for businesses. It handles real-time queue management, bookings, waitlists, client tracking, and administrative functions.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    ESV Frontend                         │
│                  (Vue 3 + Vite)                         │
└─────────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Backend    │  │   Firebase   │  │  Query API   │
│     API      │  │  (Auth +     │  │              │
│              │  │  Firestore)  │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
```

## Technology Stack

### Core Technologies
- **Vue 3.2+**: Progressive JavaScript framework
- **Vite 3**: Next-generation frontend build tool
- **Vue Router 4**: Client-side routing
- **Pinia**: State management (primary)
- **Vuex 4**: State management (legacy, to be removed)

### UI & Styling
- **Bootstrap 5**: CSS framework
- **Bootstrap Icons**: Icon library
- **Custom CSS**: Application-specific styles

### Data & Communication
- **Axios**: HTTP client for API communication
- **Firebase Auth**: Authentication
- **Firebase Firestore**: Real-time database
- **Vue I18n**: Internationalization

### Additional Libraries
- **Chart.js + vue-chart-3**: Data visualization
- **Day.js**: Date manipulation
- **V-Calendar**: Calendar component
- **QRCode.vue**: QR code generation
- **Vue3 Google Map**: Maps integration

## Application Architecture

### Layer Structure

```
┌─────────────────────────────────────┐
│         Presentation Layer           │
│  (Components, Views, Router)         │
└─────────────────────────────────────┘
                │
┌─────────────────────────────────────┐
│         Application Layer            │
│  (Services, State, Events)          │
└─────────────────────────────────────┘
                │
┌─────────────────────────────────────┐
│         Infrastructure Layer         │
│  (API, Firebase, Utils)             │
└─────────────────────────────────────┘
```

### Component Architecture

```
App.vue
├── Header (Navigation, User Info, Messages)
├── RouterView
│   ├── Public Routes
│   │   ├── HomeView
│   │   ├── Login Views (Business, Collaborator, Master)
│   │   └── Public Queue Views
│   └── Private Routes
│       ├── Business Routes
│       ├── Collaborator Routes
│       ├── Master Routes
│       └── User Routes
└── Footer
```

## Data Flow

### Authentication Flow

```
User Login
    │
    ▼
Firebase Auth
    │
    ▼
Get User Token
    │
    ▼
Backend API (Get User Data)
    │
    ▼
Pinia Store (Set User State)
    │
    ▼
LocalStorage (Persist Session)
    │
    ▼
Router Guard (Validate Access)
    │
    ▼
Navigate to Dashboard
```

### Real-time Data Flow

```
Firebase Firestore
    │
    ▼
Firestore Listener (onSnapshot)
    │
    ▼
Vue Reactive Ref
    │
    ▼
Component Re-render
    │
    ▼
UI Update
```

### API Request Flow

```
Component
    │
    ▼
Service Layer
    │
    ▼
API Client (Axios)
    │
    ├── Add Auth Headers
    ├── Add Request Config
    └── Handle Errors
    │
    ▼
Backend API
    │
    ▼
Response Handler
    │
    ▼
Update State/Component
```

## State Management

### Pinia Store Structure

```javascript
globalStore {
  state: {
    currentUser: User | undefined
    currentPermissions: Permissions | undefined
    currentQueue: Queue | undefined
    currentCommerce: Commerce | undefined
    currentBusiness: Business | undefined
    currentUserType: 'business' | 'collaborator' | 'master' | 'invited'
    currentAttentionChannel: string
    currentActiveAttentions: Attention[]
  }

  getters: {
    getCurrentUser: () => User | undefined
    getCurrentPermissions: () => Permissions | undefined
    // ... other getters
  }

  actions: {
    setCurrentUser: (user) => void
    resetSession: () => void
    getActualBusiness: () => Business
    // ... other actions
  }
}
```

### State Persistence

- User session data persisted in `localStorage`
- State synchronized between Pinia store and `localStorage`
- Session timeout: 1 day (authenticated), 6 hours (invited)

## Routing Architecture

### Route Categories

1. **Root Routes** (`/`)
   - Home page
   - Landing page

2. **Public Routes** (`/publico/`)
   - Login pages (business, collaborator, master)
   - Public queue views
   - QR code setup

3. **Private Routes** (`/interno/`)
   - Business dashboard and admin
   - Collaborator dashboard
   - Master admin
   - User queue interactions

### Route Guards

Route guards in `router/index.js` handle:
- Authentication validation
- User type verification
- Session timeout checks
- Automatic redirects based on user state

## Service Layer

### Service Pattern

Each entity has a dedicated service file following this pattern:

```javascript
// src/application/services/[entity].js
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

### API Clients

Three Axios instances for different backends:
- `requestBackend`: Main API
- `requestEvent`: Event service
- `requestQuery`: Query/analytics service

## Firebase Integration

### Collections

- `attention`: Queue attentions
- `queue`: Queues
- `booking`: Bookings
- `waitlist`: Waitlists
- `message`: Messages
- `booking-block-number-used`: Booking number tracking

### Real-time Listeners

Functions following `updated[Entity]By[Filter]()` pattern:
- Return Vue reactive refs
- Automatically update on Firestore changes
- Must be unsubscribed in component `onUnmounted`

## Security Architecture

### Authentication
- Firebase Authentication for user auth
- JWT tokens for API authentication
- Session management with timeout

### Authorization
- Role-based access control (RBAC)
- Route-level guards
- Component-level permission checks
- Feature toggles per commerce

### Data Security
- Environment variables for sensitive config
- Firebase Security Rules (backend)
- Input validation (frontend)
- XSS prevention via Vue's template system

## Performance Considerations

### Code Splitting
- Route-based code splitting
- Lazy-loaded components
- Dynamic imports for heavy libraries

### Caching
- localStorage for session data
- Consider API response caching
- Static asset caching via CDN

### Optimization
- Tree-shaking for unused code
- Image optimization
- Bundle size monitoring
- Lazy loading for images

## Deployment Architecture

### Build Process

```
Source Code
    │
    ▼
Vite Build (Environment-specific)
    │
    ▼
Static Assets
    │
    ▼
Docker Container (Nginx)
    │
    ▼
Google Cloud Run
```

### Environments

1. **BR**: Brazil production
2. **NET**: Network production
3. **TEST-BR**: Brazil testing

Each environment has:
- Separate Vite config
- Separate build script
- Separate deployment config

## Error Handling

### Current Approach
- Try-catch blocks in async functions
- Error messages in UI
- Console logging (development)

### Recommended Improvements
- Centralized error handler
- Error boundary components
- Error tracking service (Sentry)
- User-friendly error messages

## Internationalization

### Structure
- Translation files: `src/locales/{locale}.json`
- Supported locales: ES, EN, PT
- Default locale: ES

### Usage
```javascript
// Template
{{ $t('key.path') }}

// Script
const { t } = useI18n();
const message = t('key.path');
```

## Future Architecture Considerations

1. **TypeScript Migration**: Gradual migration for type safety
2. **Micro-frontends**: Consider if scaling requires
3. **Service Worker**: Offline support
4. **GraphQL**: Consider for complex queries
5. **State Management**: Remove Vuex, standardize on Pinia

## Diagrams

### Component Hierarchy
See component structure in `src/components/` directory.

### Data Flow Diagrams
See flow descriptions above.

### Deployment Diagram
```
Developer
    │
    ▼
Git Repository
    │
    ▼
Google Cloud Build
    │
    ├── Build Docker Image
    ├── Push to Container Registry
    └── Deploy to Cloud Run
```

