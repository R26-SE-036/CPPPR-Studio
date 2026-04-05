# CPPPR-Studio (Collaborative Pair Programming & Peer Review Studio)

## 📌 Project Overview
CPPPR-Studio is a real-time collaborative platform designed for pair programming and peer reviews. It provides a structured environment where students can code together by taking on specific roles (**Driver** and **Navigator**), communicate in real-time, and review each other's code.

The system is smart enough to monitor the session's activity and send automated prompts (like reminding users to switch roles or encouraging participation if one person is too quiet).

---

## 🚀 Key Features & Capabilities
- **Role-Based Pair Programming**: Users are assigned roles such as Driver (writing the code) or Navigator (reviewing the code and guiding the logic).
- **Real-Time Code Sync & Chat**: Powered by WebSockets to ensure smooth real-time code syncing and chat messaging.
- **Session Analytics & Smart Prompts**: The system tracks metrics like `editCount`, `chatCount`, and `roleSwitchCount`. If it detects participation imbalance or weak communication, it automatically prompts the users.
- **Peer Review System**: Provides tools for students to review each other's work with line-by-line comments and rubric-based grading.
- **User Management**: Support for different account roles (`STUDENT`, `INSTRUCTOR`) with secure authentication (JWT).

---

## 🏗️ Project Structure
The project is organized as a monorepo containing two main user-facing applications (`api` and `web`).

```text
CPPPR-Studio/
├── apps/
│   ├── api/                 # The Backend API (NestJS)
│   │   ├── prisma/          # Database models (schema.prisma) and migrations
│   │   ├── src/             # Backend source code
│   │   │   ├── auth/        # Authentication & JWT logic
│   │   │   ├── chat/        # Real-time chat functionality
│   │   │   ├── collaboration# Code syncing and real-time sockets
│   │   │   ├── sessions/    # Session lifecycle management
│   │   │   ├── analytics/   # Tracking user participation
│   │   │   ├── prompts/     # Smart notification triggers
│   │   │   └── peer-review/ # Review and grading logic
│   │   └── package.json     # Backend dependencies (NestJS, Prisma, Socket.io)
│   │
│   └── web/                 # The Frontend App (Next.js)
│       ├── src/
│       │   ├── app/         # Next.js App Router (Pages & Layouts)
│       │   │   ├── login/   # Login page
│       │   │   ├── register/# Registration page
│       │   │   ├── dashboard# User dashboard (view sessions, etc.)
│       │   │   └── session/ # The actual coding interface/room
│       │   ├── components/  # Reusable UI components
│       │   └── lib/         # Utility functions and API clients
│       └── package.json     # Frontend dependencies (Next.js, React, TailwindCSS)
├── docker-compose.yml       # Docker config to run the database & Redis locally
└── README.md                # Project documentation
```

## 🛠️ Technology Stack
### Backend (`apps/api`)
- **Framework**: [NestJS](https://nestjs.com/) (Scalable Node.js framework)
- **Database & ORM**: PostgreSQL paired with [Prisma](https://www.prisma.io/)
- **Real-Time Communications**: Socket.io & Redis (for websocket state buffering)
- **Authentication**: Passport & JWT

### Frontend (`apps/web`)
- **Framework**: [Next.js (App Router)](https://nextjs.org/)
- **UI & Components**: React 19
- **Styling**: TailwindCSS

---

## 🏃‍♂️ How to Run Locally

1. **Start the Infrastructure (Database and Redis)**:
   Make sure Docker is running, then execute:
   ```bash
   docker-compose up -d
   ```
2. **Run Backend (API)**:
   ```bash
   cd apps/api
   npm install
   npm run start:dev
   ```
3. **Run Frontend (Web)**:
   ```bash
   cd apps/web
   npm install
   npm run dev
   ```
