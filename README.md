# SilverPoint

Local and online price comparison: find the lowest price for a product or service in your area.

- **Backend:** `src/api` (ASP.NET Core 8)
- **Frontend:** `src/web` (React + TypeScript + Vite PWA)

## Run locally

**API:** From repo root, `cd src/api && dotnet run`. Listens on http://localhost:5000.

**Web:** `cd src/web && npm install && npm run dev`. Open the URL shown (e.g. http://localhost:5173).

## Test the API

With the API running, from repo root: `./scripts/test-api.sh`. Or manually: `curl http://localhost:5000/health` and `curl "http://localhost:5000/api/search?q=milk"`. You should see `{"status":"healthy"}` and a JSON array of three mock results (store, price, distance).
