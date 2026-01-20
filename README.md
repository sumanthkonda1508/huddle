# Huddle: Community Event Ticketing & Management 🎟️

**Huddle** is a full-stack web application designed for discovering, hosting, and managing local community events. From board game nights to tech meetups, Huddle connects people through real-world experiences.

![Huddle App Screenshot](https://via.placeholder.com/800x400?text=Huddle+App+Preview) 
*(Replace with actual screenshot)*

## 🚀 Features

### For Attendees
-   **Discover Events**: Search and filter events by city, hobby category, or keywords.
-   **Join & Manage**: RSVP to events and track your schedule in a personalized dashboard.
-   **Social Features**: View who else is attending and engage in event-specific discussions.
-   **Notifications**: Get real-time alerts for event updates and interactions.

### For Hosts
-   **Identity Verification**: Secure host verification process with government ID upload (simulated) for community safety.
-   **Event Management**: Create, edit, and cancel events with advanced controls (e.g., set participant limits, time/date).
-   **Attendee Control**: View attendee lists and manage participants (kick users if necessary).
-   **Plan Tiers**: Subscription-based hosting limits (Free vs Pro tiers).

### Core Platform
-   **Secure Authentication**: Powered by **Firebase Auth** with enforced email verification.
-   **Responsive Design**: Modern, mobile-friendly UI built with React.
-   **Real-time Updates**: Live commenting and notifications.
-   **Admin Dashboard**: Dedicated interface for approving new host verifications.

---

## 🛠️ Tech Stack

### Frontend
-   **React 19** (Vite)
-   **React Router 7**
-   **Axios** (API Client)
-   **CSS Modules** (Custom Design System)

### Backend
-   **Python Flask**
-   **Firebase Admin SDK** (Firestore & Auth)
-   **Flask-CORS**

### Infrastructure
-   **Authentication**: Firebase Auth
-   **Database**: Firestore (NoSQL)
-   **Hosting**: Vercel (Frontend) & Render (Backend)

---

## 🏁 Getting Started

### Prerequisites
-   Node.js (v18+)
-   Python (v3.9+)
-   Firebase Project (Credentials required)

### 1. Backend Setup

```bash
cd backend
python -m venv venv
# Windows
.\venv\Scripts\activate 
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt
```

**Environment Variables (.env)**
Create a `.env` file in `backend/`:
```env
FLASK_APP=app
FLASK_DEBUG=1
FIREBASE_CREDENTIALS=serviceAccountKey.json
```
*Note: Place your `serviceAccountKey.json` from Firebase in the `backend/` folder.*

**Run Backend:**
```bash
python run.py
```
Server starts at `http://localhost:8080`.

### 2. Frontend Setup

```bash
cd frontend
npm install
```

**Environment Variables (.env)**
Create a `.env` file in `frontend/`:
```env
VITE_API_URL=http://localhost:8080/api
```

**Run Frontend:**
```bash
npm run dev
```
Client starts at `http://localhost:5173`.

---

## 📦 Deployment

### Backend (Render / Heroku)
-   Set `FIREBASE_CREDENTIALS` as an environment variable (content of JSON file).
-   Set `FLASK_ENV` to `production`.

### Frontend (Vercel / Netlify)
-   Set `VITE_API_URL` to your production backend URL.

---

## 🤝 Contributing
1.  Fork the repo
2.  Create a feature branch (`git checkout -b feature/amazing-feature`)
3.  Commit changes (`git commit -m 'Add amazing feature'`)
4.  Push to branch (`git push origin feature/amazing-feature`)
5.  Open a Pull Request

---

## 📄 License
Distributed under the MIT License. See `LICENSE` for more information.
