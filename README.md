# SilverPoint

Local and online price comparison: find the lowest price for a product or service in your area.

- **Backend:** `src/api` (ASP.NET Core 8)
- **Frontend:** `src/web` (React + TypeScript + Vite PWA)

## Run locally

**API:** From repo root, `cd src/api && dotnet run`. Health: `GET https://localhost:7xxx/health`. Demo search: `GET https://localhost:7xxx/api/search?q=milk`.

**Web:** `cd src/web && npm install && npm run dev`. Open the URL shown (e.g. http://localhost:5173).
