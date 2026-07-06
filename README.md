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

### 1. Cloning the Repository
First, clone the repository to your local system and navigate to the project directory:

```bash
git clone https://github.com/hiepquocchung5-blip/nexusdrop.git
cd nexusdrop
```

### 2. Run the Application
For a seamless and automated setup, use the provided `run.sh` script. The script checks for root privileges, copies the example environment configurations if they do not exist, and starts the containerized development environment:

```bash
sudo ./run.sh
```

Alternatively, you can manually bootstrap and run the services without root:
```bash
# Bootstrap env files
cp -n backend/.env.example backend/.env || true
cp -n frontend/.env.example frontend/.env || true

# Run containers
docker compose up --build
```

Once running, the application services will be accessible at:
- **Frontend SPA**: `http://localhost:5173`
- **Backend API**: `http://localhost:8000`
- **Django Admin**: `http://localhost:8000/admin`

---

## 🔌 Supplier API Configuration
NexusDrop supports routing orders to a real third-party game microtransaction supplier. 

To configure a real supplier API:
1. Open `backend/.env`.
2. Update the base URL and API keys:
   ```env
   SUPPLIER_API_BASE_URL=https://api.realsupplier.com
   SUPPLIER_API_KEY=your-actual-supplier-api-key
   ```

### Asynchronous Order Dispatch & Retries:
- When a payment proof is approved in the admin queue, an asynchronous task (`dispatch_order_to_supplier`) is pushed to Celery.
- If `SUPPLIER_API_BASE_URL` is left empty or set to the default mock domain (`https://supplier.example.test`), the task automatically falls back to instant **Mock Completion** for offline development.
- For a **real API configuration**, the worker sends a POST request containing:
  ```json
  {
    "order_id": "<uuid>",
    "sku": "<package_sku>",
    "player_id": "<player_id>",
    "zone_id": "<zone_id>"
  }
  ```
- **Error Handling & Resilience**:
  - Connection timeouts and rate limits (HTTP `429`, `5xx`) trigger Celery's exponential backoff retry mechanism (up to 3 retries).
  - Validation or authentication errors (HTTP `400`, `401`, `403`, `404`) mark the order status as `FAILED` and record the failure reason directly onto the order ledger.
