# NexusDrop - Game Top-Up Marketplace

NexusDrop is a production-grade digital marketplace for gaming microtransactions (Mobile Legends, PUBG, Free Fire, etc.). It features an automated supplier API integration layer alongside a secure, manual verification pipeline for local payment proofs.

## 🏗 System Architecture

The application uses a decoupled architecture. A React-based SPA communicates via RESTful endpoints to a Django API. High-latency operations (supplier API integration) are handled asynchronously via Celery.

### Core Modules
- **Frontend (Client):** Dark-themed, responsive SPA optimized for low-latency interactions.
- **Backend (API):** Django REST Framework serving stateless JSON APIs.
- **Worker (Celery):** Background task queue for async supplier communication and webhook processing.
- **Database:** PostgreSQL enforcing ACID properties for wallet and ledger tables.

## 🚀 Features

### Frontend (User & Reseller)
- **Storefront:** Dynamic game category cards, tiered pricing packages.
- **Identity Verification:** Pre-flight Player ID and Server/Zone ID validation.
- **Order Lifecycle:** Real-time order status tracking (Pending, Processing, Completed, Failed).
- **Wallet System:** Reseller dashboard with ledger history and balance management.
- **Dark UI:** Optimized contrast ratios for gaming demographics using Tailwind CSS.

### Backend (Admin & Core)
- **Auth & IAM:** JWT-based authentication, role-based access control (User vs. Reseller vs. Admin).
- **Catalog Management:** Dynamic product/package management with automated profit margin calculation.
- **Financial Ledger:** Immutable transaction history.
- **Manual Fulfillment:** Upload pipelines for payment proofs with an Admin approval queue.
- **Automated Fulfillment:** API integration with 3rd-party diamond/UC suppliers.

## 🛠 Tech Stack

| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React, Vite, Tailwind, React Query | Client SPA, Server-state caching |
| **Backend** | Python 3.12, Django, DRF | Core API, Admin panel, ORM |
| **Database** | PostgreSQL 16 | Relational data, ACID transactions |
| **Cache/Queue**| Redis | Session caching, Celery message broker |
| **Storage** | AWS S3 / MinIO | Payment proof image storage |
| **DevOps** | Docker, Docker Compose | Containerization and orchestration |

## 💻 Local Development Setup

### Prerequisites
- Docker & Docker Compose
- Node.js (v20+)
- Python 3.12+ (if running bare-metal)

### 1. Environment Configuration
Copy the sample environment files and configure your local credentials.

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
