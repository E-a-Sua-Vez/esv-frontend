# Modules Documentation

## Overview

This document describes the main modules and features of the ESV Frontend application.

## Core Modules

### 1. Authentication Module

**Location**: `src/application/services/auth.js`, `src/application/firebase.js`

**Purpose**: Handles user authentication and session management.

**Features**:
- Email/password authentication
- Anonymous (invited) user authentication
- Password reset
- Session management
- Token refresh

**User Types**:
- Business administrators
- Collaborators
- Master administrators
- Invited (anonymous) users

**Key Functions**:
- `signIn(email, password, userType)`: Authenticate user
- `signOut(email, userType)`: Logout user
- `signInInvited()`: Create anonymous session
- `changePassword(email, userType)`: Reset password

**Routes**:
- `/publico/negocio/login` - Business login
- `/publico/colaborador/login` - Collaborator login
- `/publico/master/login` - Master login

---

### 2. Queue Management Module

**Location**: `src/application/services/queue.js`, `src/components/queues/`, `src/views/CommerceQueuesView.vue`

**Purpose**: Manages digital queues for businesses.

**Features**:
- Create and manage queues
- Real-time queue updates via Firebase
- Queue ordering and prioritization
- Multiple queues per commerce

**Key Functions**:
- `getQueueById(id)`: Get queue details
- `getQueuesByCommerceId(commerceId)`: Get all queues for a commerce
- `updateQueue(id, queue)`: Update queue configuration
- `updatedQueuesByCommerce(commerceId)`: Real-time queue updates

**Components**:
- `QueueList.vue`: Display queues
- `QueueForm.vue`: Create/edit queue
- `CommerceQueuesView.vue`: Main queue view

---

### 3. Attention Module

**Location**: `src/application/services/attention.js`, `src/components/attentions/`

**Purpose**: Handles queue attentions (serving customers).

**Features**:
- Create attentions (add customers to queue)
- Real-time attention tracking
- Attention status management (PENDING, TERMINATED, RATED)
- Number assignment

**Key Functions**:
- `getAttentionById(id)`: Get attention details
- `createAttention(attention)`: Add customer to queue
- `updateAttention(id, attention)`: Update attention status
- `updatedAvailableAttentions(queueId)`: Real-time pending attentions

**Components**:
- `AttentionList.vue`: Display attentions
- `AttentionForm.vue`: Create attention
- `AttentionCard.vue`: Attention display card

---

### 4. Booking Module

**Location**: `src/application/services/booking.js`, `src/components/bookings/`, `src/views/UserQueueBooking.vue`

**Purpose**: Manages appointment bookings.

**Features**:
- Create and manage bookings
- Calendar integration
- Booking status tracking
- Block number management

**Key Functions**:
- `getBookingById(id)`: Get booking details
- `createBooking(booking)`: Create new booking
- `updateBooking(id, booking)`: Update booking
- `getBookingsByCommerceId(commerceId)`: Get commerce bookings

**Components**:
- `BookingCalendar.vue`: Calendar view
- `BookingForm.vue`: Create/edit booking
- `BookingList.vue`: List bookings

**Routes**:
- `/publico/comercio/:id/cola/:queueId/reserva` - Public booking
- `/interno/negocio/reservas` - Business booking management

---

### 5. Waitlist Module

**Location**: `src/application/services/waitlist.js`, `src/components/waitlist/`, `src/views/UserQueueWaitlist.vue`

**Purpose**: Manages waitlists for queues.

**Features**:
- Add customers to waitlist
- Real-time waitlist updates
- Position tracking

**Key Functions**:
- `getWaitlistById(id)`: Get waitlist entry
- `createWaitlist(waitlist)`: Add to waitlist
- `updateWaitlist(id, waitlist)`: Update waitlist entry

**Routes**:
- `/publico/comercio/:id/cola/:queueId/lista-espera` - Public waitlist

---

### 6. Client Management Module

**Location**: `src/application/services/client.js`, `src/components/clients/`, `src/views/business/BusinessTracing.vue`

**Purpose**: Manages client information and history.

**Features**:
- Client profiles
- Client history tracking
- Client search and filtering
- Client statistics

**Key Functions**:
- `getClientById(id)`: Get client details
- `getClientsByCommerceId(commerceId)`: Get commerce clients
- `updateClient(id, client)`: Update client information
- `searchClients(query)`: Search clients

**Components**:
- `ClientList.vue`: Display clients
- `ClientForm.vue`: Create/edit client
- `ClientCard.vue`: Client information card
- `ClientHistory.vue`: Client interaction history

**Routes**:
- `/interno/negocio/trazabilidad` - Client tracing

---

### 7. Commerce Management Module

**Location**: `src/application/services/commerce.js`, `src/views/business/BusinessCommerceAdmin.vue`

**Purpose**: Manages commerce/business locations.

**Features**:
- Create and manage commerces
- Commerce configuration
- Multiple commerces per business
- Commerce activation/deactivation

**Key Functions**:
- `getCommerceById(id)`: Get commerce details
- `getCommercesByBusinessId(businessId)`: Get business commerces
- `updateCommerce(id, commerce)`: Update commerce
- `addCommerce(commerce)`: Create new commerce

**Routes**:
- `/interno/negocio/comercios` - Commerce administration

---

### 8. Service Management Module

**Location**: `src/application/services/service.js`, `src/views/business/BusinessServicesAdmin.vue`

**Purpose**: Manages services offered by commerces.

**Features**:
- Create and manage services
- Service configuration
- Service assignment to queues

**Key Functions**:
- `getServiceById(id)`: Get service details
- `getServicesByCommerceId(commerceId)`: Get commerce services
- `updateService(id, service)`: Update service

**Routes**:
- `/interno/negocio/servicios` - Service administration

---

### 9. Product Management Module

**Location**: `src/application/services/product.js`, `src/views/business/BusinessProductsAdmin.vue`, `src/views/business/BusinessProductStockAdmin.vue`

**Purpose**: Manages products and inventory.

**Features**:
- Product catalog
- Stock management
- Product assignment to services

**Key Functions**:
- `getProductById(id)`: Get product details
- `getProductsByCommerceId(commerceId)`: Get commerce products
- `updateProduct(id, product)`: Update product
- `updateStock(id, stock)`: Update inventory

**Routes**:
- `/interno/negocio/productos` - Product administration
- `/interno/negocio/stock` - Stock management

---

### 10. Collaborator Management Module

**Location**: `src/application/services/collaborator.js`, `src/views/business/BusinessCollaboratorAdmin.vue`

**Purpose**: Manages staff/collaborators.

**Features**:
- Create and manage collaborators
- Permission assignment
- Collaborator activation

**Key Functions**:
- `getCollaboratorById(id)`: Get collaborator details
- `getCollaboratorsByCommerceId(commerceId)`: Get commerce collaborators
- `updateCollaborator(id, collaborator)`: Update collaborator

**Routes**:
- `/interno/negocio/colaboradores` - Collaborator administration

---

### 11. Dashboard & Analytics Module

**Location**: `src/views/business/BusinessDashboard.vue`, `src/application/services/query-stack.js`

**Purpose**: Provides business insights and metrics.

**Features**:
- Performance metrics
- Daily/weekly/monthly reports
- Charts and visualizations
- Executive reports

**Key Functions**:
- `getDailyMetrics(type, subtype, from, to)`: Get daily metrics
- `getMetrics(commerceId, queues, from, to)`: Get commerce metrics
- `getFinancialMetrics(commercesId, from, to)`: Get financial data
- `getBusinessExecutiveReport(businessId, from, to)`: Executive report

**Components**:
- `Dashboard.vue`: Main dashboard
- `MetricsChart.vue`: Chart components
- `MetricsCard.vue`: Metric cards

**Routes**:
- `/interno/negocio/dashboard` - Business dashboard

---

### 12. Reports Module

**Location**: `src/views/business/BusinessReports.vue`, `src/components/reports/`

**Purpose**: Generates and displays business reports.

**Features**:
- Attention reports
- Booking reports
- Waitlist reports
- Export functionality

**Key Functions**:
- `getAttentionsReport(commerceId, commerceIds, from, to)`: Attention report
- `getBookingsReport(commerceId, commerceIds, from, to)`: Booking report
- `getWaitlistsReport(commerceId, commerceIds, from, to)`: Waitlist report

**Routes**:
- `/interno/negocio/reportes` - Reports center

---

### 13. Financial Module

**Location**: `src/views/business/BusinessFinancial.vue`, `src/components/financial/`

**Purpose**: Manages financial data and transactions.

**Features**:
- Income tracking
- Outcome tracking
- Outcome types management
- Financial reports

**Key Functions**:
- `getIncomeByCommerceId(commerceId)`: Get income data
- `getOutcomeByCommerceId(commerceId)`: Get outcome data

**Routes**:
- `/interno/negocio/financiero` - Financial management

---

### 14. Survey Module

**Location**: `src/application/services/survey.js`, `src/application/services/survey-personalized.js`, `src/components/survey/`

**Purpose**: Manages customer surveys and feedback.

**Features**:
- Create surveys
- Personalized surveys per commerce
- Survey responses
- Rating collection

**Key Functions**:
- `createSurvey(body)`: Create survey
- `getSurveyPersonalizedByCommerceId(commerceId)`: Get commerce surveys
- `createSurveyPersonalized(body)`: Create personalized survey

**Routes**:
- `/interno/negocio/encuestas` - Survey administration

---

### 15. Form Module

**Location**: `src/application/services/form.js`, `src/application/services/form-personalized.js`, `src/components/form/`

**Purpose**: Manages custom forms for data collection.

**Features**:
- Create custom forms
- Form field configuration
- Form responses

**Key Functions**:
- `getFormById(id)`: Get form details
- `createFormPersonalized(body)`: Create personalized form

**Routes**:
- `/interno/negocio/formularios` - Form administration

---

### 16. Permission Management Module

**Location**: `src/application/services/permissions.js`, `src/components/permissions/`, `src/views/business/BusinessPermissionsAdmin.vue`

**Purpose**: Manages user permissions and roles.

**Features**:
- Role-based permissions
- Permission assignment
- Permission checking

**Key Functions**:
- `getPermissionsByRolId(rolId)`: Get role permissions
- `updatePermissions(permissions)`: Update permissions

**Routes**:
- `/interno/negocio/permisos` - Permission administration

---

### 17. Plan Management Module

**Location**: `src/application/services/plan.js`, `src/views/business/BusinessPlan.vue`

**Purpose**: Manages subscription plans and features.

**Features**:
- Plan information
- Feature toggles
- Plan activation status

**Key Functions**:
- `getPlanById(id)`: Get plan details
- `getActivePlanActivation(businessId)`: Get active plan

**Routes**:
- `/interno/negocio/plan` - Plan information

---

### 18. Patient History Module

**Location**: `src/application/services/patient-history.js`, `src/components/patient-history/`

**Purpose**: Manages patient medical history (for healthcare businesses).

**Features**:
- Patient history items
- History tracking
- Medical record management

**Key Functions**:
- `getPatientHistoryByPatientId(patientId)`: Get patient history
- `createPatientHistoryItem(item)`: Add history item

**Routes**:
- `/interno/negocio/pacientes` - Patient management
- `/interno/negocio/historial-medico` - Medical history items

---

### 19. Document Module

**Location**: `src/application/services/document.js`, `src/components/document/`, `src/views/business/BusinessDocuments.vue`

**Purpose**: Manages business documents.

**Features**:
- Document upload
- Document management
- Document viewing

**Routes**:
- `/interno/negocio/documentos` - Document management

---

### 20. Message Module

**Location**: `src/components/common/Header.vue` (message display), Firebase `messageCollection`

**Purpose**: Manages internal messaging system.

**Features**:
- Real-time messages
- Message notifications
- Read/unread status

**Key Functions**:
- `updatedAvailableMessages(collaboratorId, administratorId)`: Real-time messages

---

## Module Dependencies

```
Authentication
    │
    ├──→ All Modules (Authorization)
    │
Commerce Management
    │
    ├──→ Queue Management
    ├──→ Service Management
    ├──→ Product Management
    └──→ Collaborator Management
        │
        └──→ Permission Management
            │
Queue Management
    │
    ├──→ Attention Module
    ├──→ Booking Module
    └──→ Waitlist Module
        │
Dashboard & Analytics
    │
    ├──→ Reports Module
    └──→ Financial Module
```

## Module Inputs/Outputs

### Common Patterns

**Input**: Most modules accept:
- Entity ID
- Commerce ID
- Business ID
- Date ranges (for reports)
- Filter parameters

**Output**: Most modules return:
- Entity objects
- Arrays of entities
- Success/error responses

**Real-time Updates**: Modules using Firebase return:
- Vue reactive refs
- Automatic updates on data changes
- Unsubscribe functions

## Module Integration Points

1. **Authentication** → All modules (via route guards)
2. **Commerce** → Queue, Service, Product, Collaborator
3. **Queue** → Attention, Booking, Waitlist
4. **Client** → Attention, Booking, History
5. **Dashboard** → All data modules (aggregation)

## Future Module Considerations

1. **Notification Module**: Push notifications
2. **Payment Module**: Payment processing
3. **Marketing Module**: Campaign management
4. **Integration Module**: Third-party integrations
5. **Analytics Module**: Advanced analytics

