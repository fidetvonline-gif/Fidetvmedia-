# Enterprise Space - Frontend Architecture

## Tech Stack
- **Framework:** React 18 + Next.js (or Vite for current environment)
- **State Management:** React Context (for local UI state like sidebar open/close) + LiveKit hooks (for WebRTC state)
- **Styling:** Tailwind CSS + Framer Motion (for fluid animations)

## Component Hierarchy
```text
SpaceRoom
├── Stage
│   ├── ActiveSpeakerView
│   └── ScreenShareView
├── FloatingAvatars (Non-active speakers)
│   └── ParticipantCard
│       ├── AudioIndicator
│       ├── NetworkQualityIndicator
│       └── ReactionsOverlay
├── ControlBar
│   ├── MicToggle
│   ├── CameraToggle
│   ├── ScreenShareToggle
│   ├── RaiseHand
│   ├── ReactionsMenu
│   └── SettingsMenu
├── Sidebar
│   ├── Tabs (Chat, Participants, AI Assistant)
│   ├── ChatPanel
│   ├── ParticipantList
│   └── AIPanel (Summaries, Transcripts)
└── Notifications
    └── ToastManager
```

## Features
- **Dynamic Stage:** The active speaker takes up the majority of the screen, with smooth transitions when the speaker changes.
- **Floating Avatars:** Other participants appear as floating, rounded cards with soft shadows and animated audio visualizers.
- **AI Placeholder:** A sidebar tab dedicated to "AI Assistant" providing mock realtime summaries and action items.
