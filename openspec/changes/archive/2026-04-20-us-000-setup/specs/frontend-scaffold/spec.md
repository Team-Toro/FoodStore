## ADDED Requirements

### Requirement: Vite + React + TypeScript project with strict mode
The system SHALL have a frontend project at `frontend/` configured with Vite, React 18, TypeScript 5 with `strict: true` and `noImplicitAny: true`. `npm run dev` SHALL start the dev server at port 5173 without errors.

#### Scenario: Dev server starts
- **WHEN** `npm install && npm run dev` is executed from `frontend/`
- **THEN** the Vite dev server starts at `http://localhost:5173` with no TypeScript or build errors

#### Scenario: Build succeeds
- **WHEN** `npm run build` is executed
- **THEN** production bundle is generated in `dist/` with no errors

---

### Requirement: Feature-Sliced Design folder structure
The frontend SHALL be organized following FSD layers. Imports SHALL only flow downward: `pages` → `features` → hooks/stores → `api` → `types`. Cross-feature imports are prohibited.

#### Scenario: FSD directories exist
- **WHEN** the scaffold is complete
- **THEN** the following directories exist: `src/app/`, `src/pages/`, `src/widgets/`, `src/features/`, `src/entities/`, `src/shared/`

---

### Requirement: Centralized Axios client with JWT interceptor
The system SHALL provide a single Axios instance at `src/shared/api/client.ts`. The request interceptor SHALL attach `Authorization: Bearer <token>` reading the token from `authStore.getState().accessToken`. The response interceptor SHALL handle 401 responses by attempting token refresh before retrying the original request.

#### Scenario: Request includes Authorization header
- **WHEN** a request is made via the Axios client and `authStore` has a valid access token
- **THEN** the request includes `Authorization: Bearer <token>`

#### Scenario: 401 triggers token refresh
- **WHEN** the backend returns HTTP 401 and a refresh token is available
- **THEN** the interceptor calls `POST /api/v1/auth/refresh`, updates the store with new tokens, and retries the original request

---

### Requirement: Four Zustand stores scaffolded with types
The system SHALL define the four stores (`authStore`, `cartStore`, `paymentStore`, `uiStore`) with their TypeScript types and persist middleware where applicable.

#### Scenario: authStore persists accessToken only
- **WHEN** the app reloads after a user has logged in
- **THEN** `accessToken` is recovered from localStorage; full user object is NOT in localStorage (reconstructed via `/auth/me`)

#### Scenario: cartStore persists items
- **WHEN** the browser is closed and reopened
- **THEN** `cartStore.items` is restored from localStorage with the previously added items

#### Scenario: paymentStore and uiStore do not persist
- **WHEN** the browser reloads
- **THEN** `paymentStore` and `uiStore` start with their initial (empty) state

---

### Requirement: Tailwind CSS configured
The system SHALL have Tailwind CSS v3 installed and configured via PostCSS. Utility classes SHALL be available in all `src/**/*.tsx` files.

#### Scenario: Tailwind classes render correctly
- **WHEN** a component uses `className="bg-red-500 text-white"`
- **THEN** the element is rendered with a red background and white text in the browser
