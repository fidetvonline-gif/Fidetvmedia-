# Enterprise Space - Database Schema

Using PostgreSQL (via Supabase).

## Tables

### `spaces`
- `id` (UUID, Primary Key)
- `name` (String, Required)
- `description` (Text, Optional)
- `host_id` (UUID, Foreign Key -> users.id, Optional for guest-first)
- `slug` (String, Unique)
- `is_active` (Boolean, Default true)
- `max_participants` (Integer, Default 100)
- `settings` (JSONB) - e.g., { chatEnabled: true, reactionsEnabled: true }
- `created_at` (Timestamp)
- `updated_at` (Timestamp)

### `space_participants`
- `id` (UUID, Primary Key)
- `space_id` (UUID, Foreign Key -> spaces.id)
- `user_id` (UUID, Optional)
- `display_name` (String, Required)
- `role` (Enum: 'host', 'moderator', 'speaker', 'listener')
- `joined_at` (Timestamp)
- `left_at` (Timestamp, Nullable)

### `space_events` (Audit & Analytics)
- `id` (UUID, Primary Key)
- `space_id` (UUID, Foreign Key -> spaces.id)
- `participant_id` (UUID, Foreign Key -> space_participants.id)
- `event_type` (String) - e.g., 'joined', 'left', 'raised_hand', 'screen_share_started'
- `payload` (JSONB)
- `created_at` (Timestamp)
