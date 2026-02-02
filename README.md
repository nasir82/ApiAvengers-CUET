# CareForAll Donation Platform

## 🎯 Project Overview

A robust, scalable fundraising backend platform designed to handle high traffic (1000+ req/s) with proper idempotency, event reliability, state management, and full observability.

---

## 📚 Documentation

**All documentation is in the `/docs` folder.**

### Quick Links:
- **[System Design](./docs/SYSTEM_DESIGN.md)** - Complete architecture & design (CHECKPOINT 1)
- **[Architecture Presentation](./docs/ARCHITECTURE_PRESENTATION.md)** - For judges/demo
- **[Infrastructure Checklist](./docs/INFRASTRUCTURE_CHECKLIST.md)** - Our work checklist
- **[Quick Start](./QUICK_START.md)** - Get started quickly

### Complete Documentation:
See [docs/README.md](./docs/README.md) for full documentation index.

---

## 🚀 Quick Start

### Start Simple Services (Infrastructure Testing)

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Test services
curl http://localhost:3001/health
curl http://localhost:3002/health
```

See [QUICK_START.md](./QUICK_START.md) for more details.

---

## 📁 Project Structure

```
CUETHACK/
├── services/
│   ├── service-a/          # Simple CRUD API (for testing)
│   └── service-b/          # Event Consumer (for testing)
├── docs/                   # All documentation
│   ├── SYSTEM_DESIGN.md
│   ├── API_SPECIFICATION.md
│   ├── MONGODB_SCHEMAS.md
│   └── ...
├── docker-compose.yml      # Infrastructure setup
├── QUICK_START.md          # Quick start guide
└── README.md               # This file
```

---

## ✅ Current Status

### Completed:
- ✅ Phase 1: Simple 2-service project
- ✅ Docker Compose setup
- ✅ System Design Document (CHECKPOINT 1)
- ✅ Complete documentation

### In Progress:
- ⏳ Phase 2: Complete infrastructure setup
- ⏳ Phase 3-10: Observability, CI/CD, etc.

---

## 🎯 Key Features

- **Idempotency** - Prevents duplicate charges
- **Transactional Outbox** - No lost events
- **State Machine** - Valid payment transitions
- **CQRS Read Models** - Fast queries
- **Full Observability** - Logs, metrics, traces
- **Scalable** - 1000+ req/s capable

---

## 📞 Team Resources

- **Frontend Team**: See `docs/FRONTEND_DEVELOPER_GUIDE.md`
- **Backend Team**: See `docs/BACKEND_ENGINEER_GUIDE.md`
- **Infrastructure Team**: See `docs/INFRASTRUCTURE_CHECKLIST.md`

---

**For complete documentation, see the `/docs` folder.** 📚

