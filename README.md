# SilverPoint

Local and online price comparison: find the lowest price for a product or service in your area.

## Problem

Identical goods often cost 15–40% more at one store than another a few miles away. Shoppers have no efficient way to compare in-store prices without visiting multiple locations or juggling many store apps. Most price engines focus on e-commerce; the majority of retail still happens in physical stores. People also want to know if an item is in stock before driving across town.

## Solution

SilverPoint is a real-time, local comparison engine. You search for a product—from milk to infant formula—and see a ranked list of the lowest prices nearby, with store names, distance, and stock when available. We aggregate data from large retailers, local grocers, and specialty shops. We're adding a crowdsourced "Scan-to-Save" layer: users verify prices by scanning receipts or shelf tags and earn points, which keeps data fresh and builds a defensible dataset.

## Why we're building this

We're building SilverPoint because we've all paid the "convenience tax" of shopping at the nearest store without knowing a better price was down the road. We want the same price transparency for local retail that exists online. If we succeed, SilverPoint becomes the place you check before every grocery or hardware run—and helps households save meaningful money every year.

## Current progress

- **Backend:** ASP.NET Core 8 API with health and demo search endpoints (mock results; optional lat/lng for future geo).
- **Frontend:** React + TypeScript + Vite PWA with search, "Use my location," and results list. Installable; service worker for offline shell.
- **Validation:** Demo tested end-to-end; early user conversations confirm desire for a single app to compare local prices.
- **Next:** Core data model and API contracts, first retailer integrations, Scan-to-Save flow, then closed pilot in one city.

## Tech stack

- **Backend:** `src/api` — ASP.NET Core 8 (C#)
- **Frontend:** `src/web` — React 18, TypeScript, Vite, PWA (vite-plugin-pwa)
- **Later:** PostgreSQL, Redis, external APIs, scraping pipeline

## Run locally

**API:** From repo root, `cd src/api && dotnet run`. Listens on http://localhost:5000.

**Web:** `cd src/web && npm install && npm run dev`. Open the URL shown (e.g. http://localhost:5173). Use the proxy so the app calls the API at `/api` and `/health`.

## Test the API

With the API running, from repo root: `./scripts/test-api.sh`. Or: `curl http://localhost:5000/health` and `curl "http://localhost:5000/api/search?q=milk"`. You should see `{"status":"healthy"}` and a JSON array of three mock results (store, price, distance).

## Docs

- [Docs index](docs/README.md) — domain models and API contracts (as added).
