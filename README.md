# Smart Campus Operations Hub

Smart Campus Operations Hub is a full-stack campus operations management system built for booking facilities, handling incident tickets, managing resources, and delivering admin analytics.

## Project Overview

The application supports:
- Facilities catalogue and resource management
- Booking workflows with conflict detection and approval handling
- Incident ticketing with attachments, technician updates, and QR code access
- Role-based notifications, admin dashboards, and improved OAuth authentication

## Team Contributions

| Member    | GitHub | Responsibilities |
|-----------|--------|------------------|
| Ayyash    | [@YehyaAyyash](https://github.com/YehyaAyyash) | Facilities catalogue + resource management endpoints |
| Nipun     | [@NipunDemintha](https://github.com/NipunDemintha) | Booking workflow + conflict checking |
| Yasiru    | [@diw-666](https://github.com/diw-666) | Incident tickets + attachments + technician updates + QR code |
| Dhanajana | [@nadee2k](https://github.com/nadee2k) | Notifications + role management + OAuth integration improvement + Admin Analytics |

## Tech Stack

- Backend: Spring Boot 3.2, Java, Maven
- Frontend: React, Vite, Tailwind CSS
- Database: PostgreSQL
- Authentication: OAuth 2.0 + JWT

## Repository Layout

- `backend/` — Spring Boot REST API and database migrations
- `frontend/` — React client application
- `docs/` — project documentation and report
- `postman/` — API collection for testing

## Setup Instructions

### 1. Prerequisites

- Java 17+ (or compatible JDK)
- Node.js 20+
- PostgreSQL
- Google OAuth credentials for authentication

### 2. Configure the Database

Create the PostgreSQL database used by the backend:

```bash
createdb smartcampus
```

### 3. Run the Backend

From `backend/`:

```bash
cd backend
mvn spring-boot:run
```

The backend API starts at `http://localhost:8080`.

### 4. Run the Frontend

From `frontend/`:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`.

## Key Modules

- `Resources` — facility catalogue, asset registration, availability, and resource management APIs
- `Bookings` — booking creation, approval flow, and conflict checking logic
- `Tickets` — incident ticket creation, uploads, technician updates, and QR code scanning workflows
- `Notifications` — role-aware alerts, notification feeds, and admin notifications
- `Analytics` — admin dashboards with usage summaries and key campus metrics

## Notes

- Backend migrations are located under `backend/src/main/resources/db/migration`
- Frontend pages live under `frontend/src/pages`
- OAuth and security config is managed through backend environment variables and Spring Security


