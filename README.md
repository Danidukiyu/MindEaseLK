# MindEaseLK

App To Improve Youths Mental Health.

MindEaseLK is a full-stack mental wellness project with:
- A Node.js/Express backend (`backend/`)
- An Expo React Native frontend (`MindEaseApp/`)
- Optional PostgreSQL via Docker (`docker-compose.yml`)

## Project Structure

- `backend/`: API server and database logic
- `MindEaseApp/`: Mobile app built with Expo Router
- `setup.js` and `setup-test-account.js`: project setup helpers
- `docker-compose.yml`: local database container setup

## Prerequisites

- Node.js (LTS recommended)
- npm
- Docker Desktop (optional, for local DB)
- Expo CLI (used via `npx expo`)

## Install Dependencies

From project root:

```bash
npm install
```

Install frontend and backend packages if needed:

```bash
cd backend && npm install
cd ../MindEaseApp && npm install
```

## Run the Project

From project root:

```bash
npm run docker:db
npm run setup-test
npm run start:frontend
```

Available root scripts:

- `npm run setup`
- `npm run setup-test`
- `npm run docker:db`
- `npm run start:backend`
- `npm run start:frontend`
- `npm run start`

## Backend Run

```bash
cd backend
npm start
```

## Frontend Run

```bash
cd MindEaseApp
npx expo start
```

## Environment Variables

Create environment files as needed:

- `backend/.env`
- `MindEaseApp/.env`

Do not commit secrets.

## Collaborator Handoff

This push contains the backend scope and repository baseline docs.

The following two scopes are intentionally left for the other collaborators to push:

1. Mobile application scope
   - `MindEaseApp/`

2. Platform and startup scope
   - `docker-compose.yml`
   - `package.json`
   - `package-lock.json`
   - `setup.js`
   - `setup-test-account.js`
