# Enterprise Space - API Specification

## Endpoints

### `POST /api/spaces/create`
Creates a new space.
**Request:**
```json
{
  "name": "Team Standup",
  "settings": {
    "chatEnabled": true
  }
}
```
**Response:**
```json
{
  "spaceId": "uuid-1234",
  "slug": "team-standup-xyz"
}
```

### `POST /api/spaces/:slug/join`
Generates a LiveKit connection token for a participant.
**Request:**
```json
{
  "displayName": "John Doe",
  "role": "speaker"
}
```
**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1...",
  "livekitUrl": "wss://my-project.livekit.cloud",
  "participantId": "uuid-5678"
}
```

### `GET /api/spaces/:slug/status`
Returns current active participants and room state.
