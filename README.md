# Mock Inspection App

A full-stack inspection management system — admins define inspection domains and checklist questions, users work through them answering Yes/No/N/A with evidence uploads, the system automatically scores each domain against a configurable pass threshold, and admins can drill into any user's submission to review answers and download proof files.

Modeled loosely on CQC-style inspection frameworks (e.g. "Safe", "Effective", "Caring", "Responsive", "Well-led" as top-level domains).

## Tech stack

**Backend**
- FastAPI (Python, async)
- MongoDB Atlas with Beanie (async ODM)
- JWT-based auth (access + refresh tokens)
- Resend API for transactional email (verification, password reset)
- Local filesystem for evidence file storage (MinIO variables are present in `.env` for a future migration to object storage, but the app currently serves uploads directly from local disk)

**Frontend**
- Next.js 16 (App Router)
- React 19
- TypeScript
- Tailwind CSS

## Features

### Authentication & Authorization
- JWT login / register / email verification flow
- Role-based access control (admin vs. user)
- Password reset / forgot password
- Access + refresh token handling with logout

### User Management (Admin)
- Paginated user list
- Search by name/email
- Filter by role, active status, inspection status, and overall status
- Promote/demote users to/from admin
- Activate/deactivate accounts
- View joined date

### Domain & Question Management (Admin)
- Create/edit/reorder/soft-delete inspection domains, each with a configurable passing percentage
- Create/edit/reorder/soft-delete checklist questions per domain, with critical-question flagging, evidence requirements, and reference/regulation tagging

### Inspection System (Users)
- Browse inspection domains via a tabbed navigator
- Answer each question Yes/No/N/A, with autosave per answer
- Upload proof files (images/documents) for questions that require evidence
- Live per-domain and overall progress tracking
- Domain completion gate — must finish a domain before continuing to the next
- Submit inspection once fully answered
- Reopen a submitted inspection to re-attempt (overwrites the same record — no submission history is kept)

### Scoring Engine
- Automatic per-domain scoring: `score = yes_count / (total - N/A count) * 100`
- Any critical question answered "No" automatically fails that domain regardless of score
- Overall inspection status = passed only if every domain passed

### Admin Review & Drill-Down
- View any user's submission across all domains
- Per-domain question breakdown with the answers the user gave
- Download proof files attached to any answer
- Filter submissions by overall status (In Progress / Passed / Failed)

### Dashboard
- Role-aware landing page — users are routed toward `/inspection`, admins toward `/domains`
- Logout

## Project structure

```
inspection-app/
├── backend/
│   ├── app/
│   │   ├── api/v1/       # route handlers (auth, admin_users, admin_domains,
│   │   │                 # admin_questions, inspection, uploads, admin review)
│   │   ├── core/         # config, database connection
│   │   ├── models/       # Beanie document models
│   │   └── schemas/      # Pydantic request/response schemas
│   ├── uploads/          # user-uploaded evidence files (gitignored)
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/       # login, register, verify, password reset
│   │   │   ├── (admin)/      # user/domain/question management + submission review
│   │   │   └── (user)/       # inspection-taking flow
│   │   ├── components/
│   │   └── lib/           # API client, auth context
│   └── package.json
└── .gitignore
```

## Setting up locally

### Prerequisites

- Python 3.11+
- Node.js 18+
- A MongoDB Atlas account (free tier is enough)
- A Resend account (free tier) for sending verification/reset emails

### 1. Clone the repo

```bash
git clone https://github.com/<your-username>/inspection-app.git
cd inspection-app
```

### 2. Set up MongoDB Atlas

1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com).
2. Create a database user and password.
3. Under Network Access, allow your current IP (or `0.0.0.0/0` for local dev).
4. Copy your connection string — you'll need it in step 4.

### 3. Set up Resend

1. Create a free account at [resend.com](https://resend.com).
2. Generate an API key from the dashboard.
3. Copy it — you'll need it in step 4.

### 4. Backend setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
```

Copy `.env.example` to `.env` and fill in your own values:

```bash
copy .env.example .env        # Windows
# cp .env.example .env        # macOS/Linux
```

At minimum you'll need to set:

```
MONGODB_URI=your_mongodb_connection_string
MONGODB_DB_NAME=inspection_app
SECRET_KEY=your_jwt_secret
RESEND_API_KEY=your_resend_api_key
ENVIRONMENT=development
```

(MinIO-related variables in `.env.example` can be left as-is — they're not used yet; the app currently stores uploaded files on local disk under `backend/uploads/`.)

Run the server:

```bash
uvicorn app.main:app --reload
```

- API: `http://localhost:8000`
- Interactive API docs: `http://localhost:8000/docs`

### 5. Frontend setup

```bash
cd frontend
npm install
```

Create `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Run the dev server:

```bash
npm run dev
```

App: `http://localhost:3000`

### 6. Create your first admin account

1. Register a normal account through `http://localhost:3000/register` and verify it via the emailed OTP.
2. In MongoDB Atlas, open the `users` collection for your database.
3. Find your user document and change its `role` field from `"user"` to `"admin"`.
4. Log out and back in — you'll now be routed to the admin side of the app.

