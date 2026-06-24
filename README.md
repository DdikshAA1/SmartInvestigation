# Project Notes

This repository contains a pnpm workspace for a policing dashboard and API server.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — start the API server on port 5000
- `pnpm --filter @workspace/investigation-dashboard run dev` — start the frontend dashboard on port 3000
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — build the workspace

## Stack

- Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Frontend: React, Vite, Tailwind CSS

## Notes

- Remove any remaining workspace-specific tooling from configuration before deployment.
- The backend uses `PORT` to start and the frontend proxies `/api` to `http://127.0.0.1:5000`.
