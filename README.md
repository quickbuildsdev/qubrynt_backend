<div align="center">

# Qubrynt Backend

**The API behind Qubrynt, a personal discipline tracker. Secure sign in, private per-user data, saved in MongoDB.**

[Frontend repo](https://github.com/quickbuildsdev/qubrynt_frontend)

</div>

---

## What it does
- Lets people create an account and sign in (JWT).
- Stores each person's habits, tasks, schedule, journal, notebook, money, goals, quick links and settings in MongoDB.
- Guarantees that one user can never read or change another user's data.
- Accepts changes in batches, so the app stays fast and keeps working on a weak connection.

For screenshots and the full feature tour, see the [frontend README](https://github.com/quickbuildsdev/qubrynt_frontend#readme).

## Tech stack
| Area | Tools |
|---|---|
| Runtime | Node.js 18.18+ (ES modules) |
| Framework | Express 4 |
| Database | MongoDB with Mongoose 8 |
| Auth | JWT (jsonwebtoken), passwords hashed with bcryptjs |
| Safety | zod validation, helmet, express-rate-limit, cors, Mongoose `sanitizeFilter` |

## Architecture
```
Request -> helmet / cors / rate limit -> requireAuth (JWT) -> controller -> Mongoose -> MongoDB
```
- Every document has `userId` and `id`, with a unique index on `{ userId, id }`. All queries filter by both, which is what keeps users apart.
- `GET /api/data` returns the whole state for the signed in user in one response.
- `POST /api/data/sync` takes up to 1000 operations: `{ c, id, data }` to save and `{ c, id, del: true }` to delete. Each one is validated against its schema, and invalid ones are returned in `rejected` without blocking the rest.

## Code structure
```
backend/
├── package.json
├── .env.example               copy to .env
├── src/
│   ├── server.js              connects to MongoDB, starts the server
│   ├── app.js                 middleware, routes, health check, serves frontend/dist if present
│   ├── config/index.js        reads and checks environment variables
│   ├── routes/
│   │   ├── auth.routes.js     register, login, me, delete account
│   │   └── data.routes.js     load all data, sync changes
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   └── data.controller.js
│   ├── middleware/
│   │   ├── auth.js            checks the JWT
│   │   └── error.js           one place for error responses
│   ├── models/
│   │   ├── User.js
│   │   └── collections.js    schemas for habits, tasks, notes, notebooks, money, ...
│   └── utils/
│       ├── defaults.js        starting categories and settings for new users
│       └── http.js            small helpers
└── test/
    └── smoke.mjs              end to end checks (auth, isolation, sync, deletion)
```

## Setup
```bash
git clone https://github.com/quickbuildsdev/qubrynt_backend.git
cd qubrynt_backend
npm install
cp .env.example .env        # PowerShell: Copy-Item .env.example .env
```

Edit `.env`:

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB connection string (local or Atlas) |
| `JWT_SECRET` | Long random string used to sign tokens |
| `JWT_EXPIRES` | Token lifetime, default `7d` |
| `PORT` | Server port, default `5000` |
| `CLIENT_ORIGIN` | Frontend URL allowed by CORS, no trailing slash |
| `NODE_ENV` | `development` or `production` |

Create a secret:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Run
```bash
npm run dev     # restarts on file changes
npm start       # production
```
Open `http://localhost:5000/api/health`. You should see `{"ok":true,"db":true,...}`.

## API
All routes are under `/api`. Send the token as `Authorization: Bearer <token>`.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/auth/register` | no | Create an account, returns a token |
| POST | `/auth/login` | no | Sign in, returns a token |
| GET | `/auth/me` | yes | Current user |
| DELETE | `/auth/me` | yes | Delete the account and all its data (needs the password) |
| GET | `/data` | yes | Load all of the user's data |
| POST | `/data/sync` | yes | Save a batch of changes |
| GET | `/health` | no | Health check |

Example:
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"your-password"}'
```

## Deploy (Render + MongoDB Atlas)
1. **Atlas:** create a free cluster, add a database user, and under Network Access allow `0.0.0.0/0`. Copy the connection string.
2. **Render:** New → Web Service → connect this repo.
3. Build command `npm install`, start command `npm start`.
4. Environment: `MONGODB_URI`, `JWT_SECRET`, `CLIENT_ORIGIN` (your Vercel URL), `NODE_ENV=production`.
5. Open `https://<service>.onrender.com/api/health` to confirm.

The free Render tier sleeps when idle, so the first request after a pause can take about 30 seconds.

## Tests
```bash
npm run test:smoke
```
Runs checks against a running server and database: sign up and sign in, validation, sync, that two users cannot see or change each other's data, and account deletion.

## Security
- Never commit `.env`.
- Passwords are hashed and never returned.
- Every query is scoped to the signed in user, and ids must be strings, which blocks operator injection.
- Auth routes are rate limited; responses use security headers (helmet).
