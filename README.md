# Smart Campus Operations Hub

A full-stack web application for managing campus facilities, bookings, maintenance tickets, and notifications.

**Course:** IT3030 – Programming Applications and Frameworks

## Tech Stack

| Layer      | Technology                          |
|------------|-------------------------------------|
| Backend    | Spring Boot 3.2, Java 17, Maven    |
| Frontend   | React 18, Vite, Tailwind CSS       |
| Database   | PostgreSQL                          |
| Auth       | OAuth 2.0 (Google) + JWT            |
| CI/CD      | GitHub Actions                      |

## Project Structure

```
paf/
├── backend/          Spring Boot REST API
├── frontend/         React client application
├── docs/             Documentation and report
├── postman/          Postman collection
└── .github/          CI/CD workflows
```

## Prerequisites

- Java 17+
- Node.js 20+
- PostgreSQL 15+
- Google OAuth 2.0 credentials

## Getting Started

### 1. Database Setup

```bash
createdb smartcampus
```

### 2. Backend

```bash
cd backend
# Set environment variables
export GOOGLE_CLIENT_ID=your-google-client-id
export GOOGLE_CLIENT_SECRET=your-google-client-secret
export JWT_SECRET=your-256-bit-secret-key

mvn spring-boot:run
```

The API starts at `http://localhost:8080`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

The client starts at `http://localhost:5173`.

## Business Modules

| Module        | Description                              |
|---------------|------------------------------------------|
| Resources     | Campus facilities & assets catalogue     |
| Bookings      | Room/equipment booking with approvals    |
| Tickets       | Maintenance & incident ticketing system  |
| Notifications | In-app notification system               |
| Analytics     | Admin dashboard with charts & metrics    |

## API Documentation

Swagger UI available at `http://localhost:8080/swagger-ui.html` when the backend is running.

See [Endpoint Reference](docs/report.md#4-rest-api-endpoint-design) for the full endpoint list.

## Team Contributions

| Member   | Module               | Backend Package              | Frontend Pages           |
|----------|----------------------|------------------------------|--------------------------|
| Member 1 | Resources            | `com.smartcampus.resource`   | `pages/resources/`       |
| Member 2 | Bookings             | `com.smartcampus.booking`    | `pages/bookings/`        |
| Member 3 | Tickets              | `com.smartcampus.ticket`     | `pages/tickets/`         |
| Member 4 | Auth + Notifications | `com.smartcampus.auth`, `com.smartcampus.notification` | `pages/notifications/`, `context/` |

## Git Strategy

- `main` — stable releases
- `develop` — integration branch
- `feature/*` — per-feature branches
- Commit prefixes: `feat:`, `fix:`, `docs:`, `test:`, `chore:`

## License

This project is for academic purposes only.
