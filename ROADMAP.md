# Huddle — Implementation Roadmap

> **Start Date:** March 2026
> **Total Estimated Time:** 8–10 weeks
> **Rules:** No feature ships without backend validation, RBAC, and pagination.

---

## PHASE 0 — SECURITY & CORE STABILITY (1–2 Weeks)

> ⚠️ **BLOCKER** — No other phase starts until Phase 0 is complete.

### 0.1 RBAC (Role-Based Access Control)

**Objective:** Enforce strict server-side role validation.

**Data Model Change:**
```
User Document:
  role: "user" | "admin"          ← for RBAC privilege levels
  isVerifiedHost: true/false      ← separate from role
  isVerifiedVenue: true/false     ← separate from role
```

**Tasks:**
- [x] Add `role` field to user document (default: `"user"`)
- [x] Add `isVerifiedHost` and `isVerifiedVenue` fields (separate from role)
- [x] Create `@require_role("admin")` decorator in `middleware.py`
- [x] Middleware flow: Verify JWT → Fetch user from DB → Compare role → 403 if unauthorized
- [x] Protect admin endpoints (`/users/pending`, `/users/approved`, `/users/rejected`, etc.)
- [x] Protect venue approval endpoints
- [x] Protect verification approval/rejection endpoints
- [x] Protect future analytics & refund endpoints

**Acceptance Criteria:**
- [x] No privileged endpoint accessible without correct role
- [x] Role checked server-side (not frontend)
- [x] 403 returned for unauthorized access
- [x] A user can be both a verified host AND venue owner simultaneously

---

### 0.2 Validation Layer (Pydantic)

**Objective:** Strict schema validation for all write endpoints.

**Tasks:**
- [x] Install Pydantic (`pip install pydantic`)
- [x] Create Pydantic models:
  - [x] `EventCreate` — title (3–100 chars), description, date, location, category, max_participants
  - [x] `VenueCreate` — name, location, city, capacity (> 0), contact_email, contact_phone
  - [x] `BookingRequest` — event_name, date, start_time, end_time
  - [x] `CommentCreate` — text (1–1000 chars)
  - [x] `PaymentInit` — (Phase 1, define schema now)
  - [x] `RefundRequest` — (Phase 1, define schema now)
- [x] Add field constraints: min/max length, type enforcement, required fields
- [x] Add HTML sanitization for comments and event descriptions (use `bleach` library)
- [x] Apply validation to all `POST`/`PUT` endpoints
- [x] Return structured 400 errors with field-level messages

**Acceptance Criteria:**
- [x] Invalid payload → 400 with clear error message
- [x] No endpoint processes unvalidated JSON
- [x] XSS attempts sanitized (no raw HTML stored)

---

### 0.3 Rate Limiting (In-Memory)

**Objective:** Basic abuse protection without Redis.

**Tasks:**
- [x] Install Flask-Limiter (`pip install Flask-Limiter`)
- [x] Configure with in-memory backend (no Redis needed yet)
- [x] Apply limits:
  - [x] Login: 5/minute
  - [x] Signup: 3/minute
  - [x] Join event: 10/minute
  - [x] Booking request: 5/minute
  - [x] Comment creation: 20/minute
  - [x] Verification request: 2/hour
- [x] Return standard 429 response with `Retry-After` header

**Acceptance Criteria:**
- [x] Excess calls return 429
- [x] Limits configurable per route
- [x] Does not block legitimate usage

---

### 0.4 Pagination (Simple Limit Param)

**Objective:** Prevent loading entire collections.

**Tasks:**
- [x] Add `limit` query param (default: 20, max: 50) to:
  - [x] `GET /api/events`
  - [x] `GET /api/venues`
  - [x] `GET /api/notifications`
  - [x] `GET /api/events/:id/comments`
- [x] Add optional `last_doc_id` param for simple cursor-based pagination
- [x] Update frontend — Events, Venues, Notifications pages:
  - [x] Add "Load More" button or infinite scroll
  - [x] Track `lastDocId` in state
- [x] Return pagination metadata: `{ data: [], hasMore: bool, lastDocId: string }`

**Acceptance Criteria:**
- [x] No endpoint returns full collection
- [x] Frontend loads incrementally
- [x] Default limit of 20 applied even without param

---

### 0.5 Password Reset

**Objective:** Secure account recovery.

**Implementation:** Use Firebase Auth's built-in reset (Option A — simplest).

**Tasks:**
- [x] Add "Forgot Password?" link on `LoginPage.jsx`
- [x] Call `sendPasswordResetEmail(auth, email)` from Firebase client SDK
- [x] Show success message: "If an account exists, a reset link has been sent"
- [x] Handle errors (invalid email format, rate limit)
- [x] No information leakage — always show generic message regardless of whether email exists

**Acceptance Criteria:**
- [x] User can reset password via email
- [x] No information leakage
- [x] Works for email/password accounts (not Google OAuth)

---

### 0.6 Error Handling & 404

**Objective:** Centralized, structured error responses.

**Backend Tasks:**
- [x] Add global Flask error handlers for 400, 401, 403, 404, 500
- [x] Standard JSON format for all errors:
  ```json
  { "error": "Resource not found", "code": 404 }
  ```
- [x] Catch unhandled exceptions → return 500 (no stack traces in production)
- [x] Set `FLASK_DEBUG=0` in production

**Frontend Tasks:**
- [x] Create `NotFoundPage.jsx` (404 page)
- [x] Add catch-all route `<Route path="*" element={<NotFoundPage />} />`
- [x] Add React Error Boundary component wrapping `<App />`
- [x] Show fallback UI on unexpected errors

**Acceptance Criteria:**
- [x] No raw stack traces exposed to client
- [x] All errors return structured JSON
- [x] Unknown frontend routes show 404 page
- [x] App doesn't white-screen on JS errors

---

### 0.7 CORS Tightening

**Objective:** Restrict cross-origin requests to known domains.

**Tasks:**
- [x] Replace `CORS(app)` with explicit config:
  ```python
  CORS(app, origins=["https://your-app.vercel.app", "http://localhost:5173"])
  ```
- [x] Allow only required headers: `Authorization`, `Content-Type`
- [x] Allow only required methods: `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`
- [x] Test preflight requests work correctly

**Acceptance Criteria:**
- [x] API rejects unknown origins
- [x] Preflight requests handled correctly
- [x] Local dev still works (`localhost:5173` allowed)

---

## PHASE 1 — MONETIZATION (2–3 Weeks)

### 1.1 Razorpay Integration

> Do this FIRST — prove payment plumbing works before wiring up event model.

**Tasks:**
- [x] Create Razorpay account + get API keys (Using MOCK mode temporarily)
- [x] Install `razorpay` Python package
- [x] Create `POST /api/payments/create-order` endpoint:
  - [x] Create Razorpay order with amount, currency, receipt
  - [x] Store order in `payment_orders` Firestore collection
  - [x] Return `order_id` to frontend
- [x] Create `POST /api/payments/verify` endpoint:
  - [x] Verify Razorpay signature (`razorpay_order_id + razorpay_payment_id + razorpay_signature`)
  - [x] Mark payment as `verified` in DB
  - [x] Implement idempotency — duplicate verification requests are safe
- [x] Create `POST /api/payments/webhook` endpoint:
  - [x] Verify webhook signature
  - [x] Handle `payment.captured` event
  - [x] Handle duplicate webhooks safely (idempotency key)
  - [x] Handle payment success but DB write failure (retry logic)
- [x] Frontend: Integrate Razorpay checkout.js
- [ ] Handle abandoned orders — expire stale orders after 30 minutes

**Edge Cases to Handle:**
- [x] Duplicate webhook delivery
- [x] Payment success but DB write failure
- [x] Client spoofing payment success (never trust client-side)
- [ ] Order created but user abandons payment

**Acceptance Criteria:**
- [x] Payment confirmed ONLY after server-side signature verification
- [x] Duplicate payments handled safely
- [x] Payment failure does not create ticket
- [ ] Abandoned orders don't corrupt `tickets_sold` counter

---

### 1.2 Paid Event Model

**Tasks:**
- [x] Add fields to event document:
  - [x] `is_paid: bool` (default: false)
  - [x] `ticket_price: float`
  - [x] `currency: str` (default: "INR")
  - [x] `max_tickets: int`
  - [x] `tickets_sold: int` (default: 0)
- [x] Update `CreateEventPage.jsx`:
  - [x] Add "Paid Event" toggle
  - [x] Show price, currency, max tickets fields when toggled
- [x] Modify join flow:
  - [x] If `is_paid == false` → direct join (current behavior)
  - [x] If `is_paid == true` → initiate Razorpay payment → join on success
- [x] Update `EventDetailsPage.jsx`:
  - [x] Show ticket price
  - [x] Change "Join" button to "Buy Ticket" for paid events
- [x] Increment `tickets_sold` atomically (Firestore transaction)

**Acceptance Criteria:**
- [x] Free events work exactly as before
- [x] Paid events require payment before joining
- [x] `tickets_sold` never exceeds `max_tickets`

---

### 1.3 Ticket System + QR Codes

**Tasks:**
- [x] On payment success → create ticket document:
  ```
  tickets/{ticketId}:
    id: UUID
    eventId: string
    userId: string
    paymentId: string
    status: "active" | "used" | "refunded"
    createdAt: timestamp
  ```
- [x] Generate QR code containing ticket ID (use `qrcode` Python library)
- [x] Create `GET /api/tickets/:id/qr` — returns QR image
- [x] Create `POST /api/tickets/:id/checkin` — mark ticket as used:
  - [x] Validate ticket exists and is `active`
  - [x] Mark as `used`
  - [x] Prevent duplicate check-in
- [x] Frontend: Show ticket with QR on dashboard/event details
- [ ] Add ticket download option

**Acceptance Criteria:**
- [x] Ticket created only after confirmed payment
- [x] QR endpoint validates authenticity
- [x] Duplicate check-in blocked
- [x] Ticket linked to event + user + payment

---

### 1.4 Refund System

**Tasks:**
- [x] Create `POST /api/payments/:paymentId/refund`:
  - [x] Only host or admin can initiate
  - [x] Call Razorpay refund API
  - [x] Update ticket status to `refunded`
  - [x] Decrement `tickets_sold`
- [x] Handle Razorpay refund webhook
- [x] Prevent check-in for refunded tickets
- [x] Auto-refund all tickets when host cancels event
- [x] Notify user on refund completion

**Acceptance Criteria:**
- [x] Refund updates DB correctly
- [x] Webhook updates refund status
- [x] Ticket invalid after refund
- [x] Event cancellation triggers bulk refund

---

## PHASE 2 — VENUE BOOKING WORKFLOW (1–2 Weeks)

### 2.1 Booking State Machine

**States:**
```
pending → approved → payment_pending → confirmed → completed
                  ↘ rejected
pending → cancelled (by requester)
confirmed → cancelled (with refund)
```

**Tasks:**
- [x] Define valid state transitions in a config/constant
- [x] Validate transitions server-side (reject invalid ones)
- [x] Store transition history with timestamps

**Acceptance Criteria:**
- [x] No boolean flags used for status
- [x] Invalid transitions rejected with 400
- [x] Full audit trail of status changes

---

### 2.2 Booking Management Dashboard

**Tasks:**
- [x] **Owner View** (in Dashboard):
  - [x] List incoming booking requests per venue
  - [x] Show requester info, dates, times
  - [x] Approve button → updates status + sends notification
  - [x] Reject button → requires reason → sends notification
- [x] **User View** (in Dashboard):
  - [x] "My Bookings" tab
  - [x] Show booking status + venue details
  - [x] Show payment status
  - [x] Cancel booking option (if pending)
- [x] In-app notification on status change (don't wait for Phase 4)

**Acceptance Criteria:**
- [x] Owners see only their venue bookings
- [x] Approval updates status
- [x] Rejection requires reason
- [x] Both parties notified immediately

---

### 2.3 Conflict Detection

**Tasks:**
- [x] Before approval, check for time overlap with existing confirmed bookings
- [ ] Use Firestore transaction for atomic validation
- [ ] Show calendar view of venue availability (frontend)
- [x] Block overlapping bookings with clear error message

**Acceptance Criteria:**
- [x] Overlapping bookings rejected
- [ ] Race condition safe (transaction-based)
- [ ] Calendar shows booked slots

---

### 2.4 Venue Payment

**Tasks:**
- [ ] After owner approves → booking moves to `payment_pending`
- [ ] Requester receives notification to complete payment
- [ ] Reuse Phase 1 Razorpay infrastructure
- [ ] On payment success → booking moves to `confirmed`
- [ ] If payment not completed within 24h → auto-cancel booking

**Acceptance Criteria:**
- [ ] Approved booking without payment remains `payment_pending`
- [ ] Payment required before final confirmation
- [ ] Auto-cancellation of unpaid bookings

---

## PHASE 3 — SEARCH & DISCOVERY (1 Week)

### 3.1 Event Filters

**Tasks:**
- [x] Date filters: Upcoming, Past, Today, This Week, Custom Range
- [x] City filter (dropdown with autocomplete)
- [x] Category filter (multi-select)
- [x] Price filter: Free / Paid / Price range
- [x] Sort by: Date, Popularity, Price
- [x] Use Firestore indexed queries (create composite indexes)

**Acceptance Criteria:**
- [x] Filter combinations work together
- [x] Efficient indexed queries (no full-table scans)
- [x] "Upcoming" is the default view

---

### 3.2 Venue Filters

**Tasks:**
- [x] City filter
- [x] Price range (per hour)
- [x] Capacity range
- [x] Amenities (multi-select)
- [x] Sort by: Price, Capacity, Newest

**Acceptance Criteria:**
- [x] All filter combinations supported
- [x] Efficient queries

---

### 3.3 Geolocation — "Near Me" (If Time Permits)

**Tasks:**
- [ ] Store lat/lng on events and venues (from Google Places)
- [ ] Use browser Geolocation API
- [ ] Calculate distance client-side for filtered results
- [ ] Add radius filter (5km, 10km, 25km)

> **Note:** Skip geohash complexity. Filter by city first, then sort by distance client-side. Only invest in server-side geo queries at 1000+ events.

---

## PHASE 4 — REAL-TIME & EMAIL (1 Week)

### 4.1 Real-Time Listeners

**Tasks:**
- [x] Convert notifications to Firestore `onSnapshot` (or polling fallback) to show live bell badge
- [x] Convert comments to real-time (live chat feel)
- [x] Live participant count on event details

---

### 4.2 Email Notifications

**Tasks:**
- [x] Set up email service (Mock utility for MVP)
- [x] Trigger emails for:
  - [x] Payment success (receipt)
  - [x] Booking approval/rejection
  - [ ] Event reminder (24h before) - *Deferred to cron job phase*
  - [x] Verification result (approved/rejected)
  - [x] Event cancellation (with refund info)
- [x] Create email templates (HTML)
- [ ] Add unsubscribe option - *Deferred to real SMTP phase*

**Acceptance Criteria:**
- [ ] Email triggered on status change
- [ ] Templates are branded and mobile-friendly
- [ ] Unsubscribe works

---

## PHASE 5 — ADMIN ANALYTICS (3–4 Days)

**Tasks:**
- [x] Create admin analytics dashboard:
  - [x] Total users count
  - [x] Total events count
  - [x] Total revenue (sum of payments)
  - [x] Pending approvals count
  - [x] Active venues count
  - [x] Active bookings count
- [x] Protect dashboard with `@require_role("admin")`
- [x] Backend aggregation endpoints (not client-side counting)

---

### Host Analytics (Sub-feature)

- [ ] Views over time - *Deferred (Requires session tracking)*
- [x] Ticket sales per event
- [ ] Join conversion rate - *Pending advanced logic*
- [x] Revenue per event

---

## PHASE 6 — PERFORMANCE (DEFERRED)

> **Only implement when:** 10k+ events, 5k+ active users, or performance degradation observed.

**Future items:**
- [ ] Redis caching (popular events, venue lists)
- [ ] CDN for images (move off Base64 to cloud storage)
- [ ] Image lazy loading
- [ ] Query optimization + composite indexes
- [ ] Connection pooling

---

## ONGOING — TESTING (Start After Phase 1)

### Backend Tests (Minimum)

- [ ] Auth flow (login, signup, token verification)
- [ ] Join free event
- [ ] Join paid event
- [ ] Payment verification
- [ ] Ticket generation
- [ ] Booking approval flow
- [ ] Refund flow
- [ ] RBAC enforcement

### E2E Tests

- [ ] Signup → Create Paid Event → Purchase Ticket → QR Check-in → Refund
- [ ] Signup → Verify as Host → Create Event → User Joins → Host Kicks User
- [ ] Signup → Verify as Venue Owner → Create Venue → User Books → Owner Approves → Payment

---

## IMPLEMENTATION RULES (NON-NEGOTIABLE)

1. **No payment trust without signature verification**
2. **No privileged endpoint without RBAC**
3. **All write endpoints validated (Pydantic)**
4. **All list endpoints paginated**
5. **No business logic in frontend**
6. **All state transitions validated server-side**

---

## Files Modified Per Phase (Reference)

| Phase | Backend Files | Frontend Files |
|---|---|---|
| 0.1 RBAC | `middleware.py`, `users/routes.py` | — |
| 0.2 Validation | All `routes.py` files, new `schemas.py` | — |
| 0.3 Rate Limit | `__init__.py` | — |
| 0.4 Pagination | All `routes.py` | `EventsPage`, `VenuesPage`, `NotificationsPage` |
| 0.5 Password | — | `LoginPage.jsx` |
| 0.6 Errors | `__init__.py` | New `NotFoundPage.jsx`, `App.jsx` |
| 0.7 CORS | `__init__.py` | — |
| 1.x Payments | New `payments/` blueprint | `EventDetailsPage`, `CreateEventPage`, `DashboardPage` |
| 1.3 Tickets | New `tickets/` blueprint | `DashboardPage`, `EventDetailsPage` |
| 2.x Booking | `venues/routes.py` | `DashboardPage`, `VenueDetailsPage` |
| 3.x Search | `events/routes.py`, `venues/routes.py` | `EventsPage`, `VenuesPage`, `HomePage` |
| 4.x Real-time | `notifications/routes.py` | `NotificationsPage`, `EventDetailsPage` |
| 5 Admin | New `analytics/` blueprint | `AdminPage` |
