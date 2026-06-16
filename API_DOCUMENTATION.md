# FideTV M3U Channel Service API Documentation

This service provides a real-time M3U playlist parser and channel delivery system. It fetches IPTV playlists from external sources, parses them into a structured JSON database, and exposes them via a RESTful API.

## Base URL
`/api`

## Endpoints

### 1. Get Channels
Returns a filtered list of channels from the local JSON database.

**URL:** `/api/channels`  
**Method:** `GET`  
**Description:** Fetches channels. If the database is empty, it automatically attempts to populate it from a default source.

**Query Parameters:**
| Parameter | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `category` | `string` | No | Filter channels by category name (e.g., `News`, `Sports`). |
| `country` | `string` | No | Filter by 2-letter ISO country code (e.g., `NG`, `UK`, `US`). |
| `sourceUrl` | `string` | No | Override the database and fetch/parse a specific M3U playlist URL on-demand. |

**Success Response:**
- **Code:** 200 OK
- **Content:**
```json
{
  "total_channels": 120,
  "channels": [
    {
      "id": "abc123xyz",
      "name": "CNN International",
      "url": "https://stream.example.com/cnn.m3u8",
      "category": "News",
      "logo": "https://logo.com/cnn.png",
      "country": "US"
    }
  ]
}
```

---

### 2. Refresh Channel Database
Triggers a manual ingestion of a playlist into the local storage.

**URL:** `/api/channels/refresh`  
**Method:** `POST`  
**Description:** Wipes the existing `channels.json` and repopulates it with data from the provided URL.

**Body (JSON):**
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `url` | `string` | Yes | The direct link to the `.m3u` or `.m3u8` playlist. |

**Success Response:**
- **Code:** 200 OK
- **Content:**
```json
{
  "success": true,
  "count": 1542,
  "message": "Channel database synchronized successfully"
}
```

---

## Technical Details
- **Parser:** Built with `@m3u8-parser/m3u8-parser` logic combined with advanced RegEx for IPTV attribute extraction.
- **Persistence:** Local JSON storage located at `/src/data/channels.json`.
- **Runtime:** Node.js / Express.
