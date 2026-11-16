# GARMENTOS Mobile

Expo + React Native foundation for the GARMENTOS Android and iOS applications.

## Current status

This is the initial mobile app shell, not a complete POS application. It includes:
- Android/iOS Expo app configuration.
- A starter home screen for the planned garment-retail modules.
- A backend health-check action using `GET /api/health`.

The POS, authentication, barcode camera flow, inventory, customers, orders and reports are not wired yet. They will be implemented against the same authenticated GARMENTOS API used by the web app. The mobile app must never connect directly to PostgreSQL.

## Requirements

- Node.js 20+
- Expo Go compatible with the project's Expo SDK, or an Android/iOS development build.

## Run

```bash
cd mobile
npm install
cp .env.example .env
npm start
```

For a physical phone, set `EXPO_PUBLIC_API_URL` to the reachable HTTPS URL of the deployed GARMENTOS server (or your computer's LAN IP during local development). Do not use `localhost` from a physical phone.

## Architecture

```
GARMENTOS Web (Next.js) ─┐
                         ├── Authenticated API ── PostgreSQL
GARMENTOS Mobile (Expo) ─┘
```

Keep database credentials and authentication secrets on the server only.
