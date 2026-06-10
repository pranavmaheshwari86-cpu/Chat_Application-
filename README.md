# FlashChat — Real-Time Chat Application

A premium, production-grade real-time chat platform built with **Next.js 16**, **NestJS 11**, **Socket.IO v4**, **MongoDB**, and **Redis**.

![FlashChat](https://img.shields.io/badge/FlashChat-v0.1.0-blue?style=for-the-badge)

---

## ✨ Features

### Core Messaging
- **Real-time messaging** via Socket.IO with Redis adapter for horizontal scaling
- **Message types**: text, images, files, voice, GIFs, system messages
- **Message actions**: edit, delete, reply, pin, react with emoji
- **Read receipts** & delivery indicators
- **Typing indicators** in real-time

### Conversations
- **Direct messages** (1:1)
- **Group chats** with roles (owner, admin, moderator, member)
- **Group settings**: admin-only sending, invite codes
- **Conversation search** & message search (MongoDB text index)

### Authentication
- **JWT** access + refresh token rotation
- **Google OAuth 2.0** social login
- **HTTP-only cookie** refresh tokens for security
- Rate limiting with `@nestjs/throttler`

### Media & Files
- **Cloudinary** integration for image/file uploads
- Inline image previews in chat

### Real-Time Infrastructure
- **Socket.IO** with `@socket.io/redis-adapter`
- **Presence system**: online/offline/away/DND
- **Notification gateway**: real-time push notifications

### Premium UI
- **Dark mode** by default with oklch color system
- **Framer Motion** animations throughout
- **Responsive** — works on desktop and mobile
- **Glassmorphism** effects on landing page
- Custom scrollbars, micro-interactions, keyboard shortcuts

---

## 🏗️ Architecture

```
┌──────────────┐    WebSocket    ┌──────────────┐
│   Next.js    │◄──────────────►│   NestJS     │
│   Client     │    REST API    │   Server     │
│   (Port 3000)│──────────────►│   (Port 3001)│
└──────────────┘                └──────┬───────┘
                                       │
                          ┌────────────┼────────────┐
                          │            │            │
                     ┌────▼────┐  ┌───▼────┐  ┌───▼──────┐
                     │ MongoDB │  │ Redis  │  │Cloudinary│
                     │  (DB)   │  │(Pub/Sub│  │ (Media)  │
                     └─────────┘  │ Cache) │  └──────────┘
                                  └────────┘
```

---

## 🚀 Quick Start

### Prerequisites
- **Node.js 20+**
- **MongoDB** (local or Atlas)
- **Redis** (local or cloud)

### 1. Clone & Install

```bash
cd "real time chat application"

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### 2. Configure Environment

Copy and fill in the `.env` files:

**Server** (`server/.env`):
```env
MONGODB_URI=mongodb://localhost:27017/flashchat
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_ACCESS_SECRET=your-secret-here
JWT_REFRESH_SECRET=your-secret-here
CLIENT_URL=http://localhost:3000
```

**Client** (`client/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Run Development

```bash
# Terminal 1 — Backend
cd server
npm run start:dev

# Terminal 2 — Frontend
cd client
npm run dev
```

Open **http://localhost:3000** in your browser.

### Docker (Alternative)

```bash
docker compose up -d
```

---

## 📁 Project Structure

```
├── client/                    # Next.js 16 frontend
│   ├── src/
│   │   ├── app/               # App Router pages
│   │   │   ├── chat/          # Main chat interface
│   │   │   ├── login/         # Login page
│   │   │   ├── register/      # Registration page
│   │   │   └── settings/      # User settings
│   │   ├── components/
│   │   │   ├── ui/            # Design system (Button, Input, Avatar, etc.)
│   │   │   └── chat/          # Chat components (Sidebar, MessageList, etc.)
│   │   ├── store/             # Zustand state management
│   │   ├── services/          # API client (Axios + interceptors)
│   │   └── lib/               # Utilities, socket client
│   └── package.json
│
├── server/                    # NestJS 11 backend
│   ├── src/
│   │   ├── common/            # Guards, decorators, filters, utils
│   │   ├── config/            # Environment configuration
│   │   ├── gateway/           # Socket.IO gateways (Chat, Presence, Notification)
│   │   └── modules/
│   │       ├── auth/          # Authentication (JWT, Google OAuth)
│   │       ├── users/         # User profiles
│   │       ├── conversations/ # Conversations (direct + group)
│   │       ├── messages/      # Message CRUD
│   │       ├── notifications/ # Push notifications
│   │       ├── attachments/   # Cloudinary file uploads
│   │       ├── search/        # Full-text search
│   │       └── ai/            # AI service placeholder
│   └── package.json
│
├── docker-compose.yml         # Full-stack Docker setup
└── README.md
```

---

## 🛡️ API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/register` | Register new user |
| POST | `/auth/login` | Login with email/password |
| GET | `/auth/google` | Google OAuth flow |
| POST | `/auth/refresh` | Refresh access token |
| GET | `/users/profile` | Get own profile |
| PATCH | `/users/profile` | Update profile |
| GET | `/conversations` | List conversations |
| POST | `/conversations` | Create direct conversation |
| POST | `/conversations/group` | Create group |
| GET | `/messages/:conversationId` | Get messages (paginated) |
| POST | `/messages/:conversationId` | Send message |
| GET | `/search/messages?q=` | Search messages |
| GET | `/search/users?q=` | Search users |
| POST | `/attachments/image` | Upload image |

---

## 🔌 Socket Events

| Client → Server | Description |
|-----------------|-------------|
| `MESSAGE_SEND` | Send a new message |
| `MESSAGE_EDIT` | Edit a message |
| `MESSAGE_DELETE` | Delete a message |
| `MESSAGE_REACT` | Add reaction |
| `MESSAGE_READ` | Mark as read |
| `TYPING_START` | Start typing indicator |
| `TYPING_STOP` | Stop typing indicator |
| `PRESENCE_PING` | Heartbeat |

| Server → Client | Description |
|-----------------|-------------|
| `MESSAGE_NEW` | New message received |
| `MESSAGE_EDITED` | Message was edited |
| `MESSAGE_DELETED` | Message was deleted |
| `MESSAGE_REACTION` | Reaction updated |
| `MESSAGE_SEEN` | Read receipt |
| `TYPING_ACTIVE` | User is typing |
| `PRESENCE_UPDATE` | Online status changed |
| `NOTIFICATION_NEW` | New notification |

---

## 📜 License

MIT © FlashChat
