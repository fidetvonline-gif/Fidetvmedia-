# FideTV Space - Architecture

## Frontend
- Framework: React (Vite)
- State Management: React Context + Hooks (for socket events/WebRTC state)
- UI/Styling: Tailwind CSS

## Backend
- Server: Express.js (Node)
- Real-time: Socket.io (Signaling & Events)
- WebRTC: Peer-to-Peer media streaming

## Database
- PostgreSQL (via Cloud SQL)

## Signaling Flow
1. Client joins room via Socket.io.
2. Socket.io orchestrates WebRTC Peer-to-Peer connection between participants.
3. STUN/TURN servers facilitate NAT traversal.
