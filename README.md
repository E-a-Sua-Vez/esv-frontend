# ESV Frontend - Queue Management System

A Vue 3 frontend application for managing digital queues, bookings, waitlists, and client interactions for businesses.

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm
- Firebase project configured
- Backend API running

### Installation

```bash
# Install dependencies
npm install

# Development (NET environment)
npm run dev

# Development (BR environment)
npm run dev:br
```

### Build

```bash
# Build for NET production
npm run build:net

# Build for BR production
npm run build:br

# Build for TEST-BR
npm run build:testbr
```

## 📁 Project Structure

```
src/
├── application/          # Core application logic
│   ├── api.js          # HTTP client configuration
│   ├── firebase.js     # Firebase setup & real-time listeners
│   ├── services/       # API service layer
│   └── events/         # Event definitions
├── components/         # Vue components
│   ├── common/        # Shared components
│   ├── domain/        # Domain components
│   └── [feature]/     # Feature-specific components
├── views/             # Route-level components
├── router/            # Vue Router configuration
├── stores/            # Pinia state management
├── locales/           # i18n translations (ES, EN, PT)
└── shared/            # Shared utilities
```

## 🏗️ Architecture

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture documentation.

## 📦 Modules

See [MODULES.md](./MODULES.md) for detailed module documentation.

## 🛠️ Development

See [DEVELOPMENT.md](./DEVELOPMENT.md) for development guidelines and best practices.

## 🔐 Security

- See [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) for security information
- Never commit `.env` files or `env*.sh` files
- Review Firebase Security Rules regularly

## 🌍 Internationalization

The application supports three languages:
- Spanish (ES) - Default
- English (EN)
- Portuguese (PT)

All user-facing text uses vue-i18n. Translation files are in `src/locales/`.

## 👥 User Types

1. **Business**: Business administrators
2. **Collaborator**: Staff members
3. **Master**: Multi-business administrators
4. **Invited**: Anonymous users (public queues)

## 🔧 Available Scripts

- `npm run dev` - Start development server (NET)
- `npm run dev:br` - Start development server (BR)
- `npm run build:net` - Build for NET production
- `npm run build:br` - Build for BR production
- `npm run lint` - Lint and fix code
- `npm run lint:check` - Check linting without fixing
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check formatting

## 🧪 Testing

Cypress is configured for E2E testing. Add tests in the `cypress/` directory.

## 🚢 Deployment

The application is containerized with Docker and deployed to Google Cloud Run. See deployment configuration in:
- `Dockerfile`
- `cloud_build*.yaml`

## 📚 Documentation

All documentation is available in the [`docs/`](./docs/) folder:

- [Safe Improvements Plan](./docs/SAFE_IMPROVEMENTS_PLAN.md) - **NEW**: Step-by-step guide for safe refactoring
- [Quick Start Improvements](./docs/QUICK_START_IMPROVEMENTS.md) - **NEW**: Get started with safest improvements
- [Regression Testing](./docs/REGRESSION_TESTING.md) - **NEW**: Testing checklist to prevent regressions
- [Project Analysis](./docs/PROJECT_ANALYSIS.md) - Comprehensive project analysis and recommendations
- [Architecture](./docs/ARCHITECTURE.md) - System architecture and design
- [Modules](./docs/MODULES.md) - Module documentation
- [Development Guide](./docs/DEVELOPMENT.md) - Development guidelines
- [Security Audit](./docs/SECURITY_AUDIT.md) - Security information and vulnerabilities
- [Security Fix Guide](./docs/SECURITY_FIX_GUIDE.md) - Step-by-step security fix instructions
- [Security Status](./docs/SECURITY_STATUS.md) - Current security status summary
- [Improvements](./docs/IMPROVEMENTS.md) - Potential improvements
- [Changes Summary](./docs/CHANGES_SUMMARY.md) - Summary of recent changes
- [.cursorrules](./.cursorrules) - Cursor AI guidelines

## 🤝 Contributing

1. Follow the coding standards (see `.cursorrules`)
2. Run linting and formatting before committing
3. Write tests for new features
4. Update documentation as needed

## 📄 License

[Add license information]

## 🔗 Links

- Public Site: [estuturno.app](https://estuturno.app)
- Service Status: [UptimeRobot](https://stats.uptimerobot.com/h0FFm0DpSc)
