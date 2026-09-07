# Slow TV

Slow TV is a tactile 1990s television interface for watching your own local media library. It opens with a set of demo channels, then lets you turn folders of video and audio files into a personal channel lineup.

## Features

- Retro television player with power, mute, play/pause, previous, and next controls
- Demo channels for trying the interface without importing media
- Folder-backed channels for local video and audio files
- Support for common video formats (`mp4`, `m4v`, `webm`, `mov`, `ogv`, `avi`, `mkv`)
- Support for common audio formats (`mp3`, `wav`, `m4a`, `aac`, `flac`, `ogg`)
- Random next-episode playback that avoids repeating the last episode in a row
- Channel search, drag-and-drop reordering, editing, and removal
- Channel numbers, colours, descriptions, and portable JSON import/export
- Optional TVmaze metadata lookup based on the selected folder name
- Browser-local channel persistence and folder permission recovery where supported
- Responsive layout for desktop and smaller screens

## Quick start

### Requirements

- Node.js 22.13 or newer
- npm
- A modern browser; Chromium-based browsers provide the best folder-picker experience

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npm run dev
```

Open the local URL printed by Vite. The app can be used immediately with the built-in demo channels.

## Using Slow TV

1. Select a demo channel from the channel guide.
2. Use the television controls or the transport controls below the screen to change channels and episodes.
3. Open **Manage channels** and choose **Add channel** to create a channel from a local folder.
4. Select a folder containing supported audio or video files. Nested folders are scanned as well.
5. Edit the channel name, number, colour, and description from **Manage channels**.

If a saved folder is no longer available, the channel remains in the lineup and can be reconnected from **Manage channels**. Use **Export** to save channel metadata as JSON, or **Import** to restore it in another browser profile.

## Local media and privacy

Slow TV reads selected media directly in the browser and creates temporary object URLs for playback. It does not upload, copy, delete, or move your media files, and media files are not included in a deployment.

Channel metadata is stored locally using browser storage and a cookie. Where the browser supports it, a folder permission handle is stored in IndexedDB so the folder can be reconnected later. Exported JSON contains channel metadata and folder references, not media files.

When a new folder-backed channel is created, the app may query TVmaze using the folder name to find matching show metadata. The media files themselves are not sent to TVmaze.

## Project structure

```text
app/
  page.tsx       Main client-side player, channel guide, and channel manager
  layout.tsx     Document metadata and root layout
  globals.css    Visual theme, television styling, and responsive layout
components/ui/   Reusable UI primitives
hooks/            Shared React hooks
lib/              Shared utilities
public/           Static assets
.openai/          Sites hosting configuration
vite.config.ts    Vinext, Vite, Cloudflare, and Sites configuration
```

## Available scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run build` | Create a production build |
| `npm run start` | Run the built Cloudflare-compatible server locally |
| `npm run lint` | Run Oxlint |
| `npm run format` | Format the project with Oxfmt |

## Deployment

The project is configured for the OpenAI Sites hosting workflow. Build and test changes locally first:

```bash
npm run build
```

Deployment is separate from local development and does not upload any media selected through the browser. See [Slow_TV_ChatGPT_Deployment_Guide.md](Slow_TV_ChatGPT_Deployment_Guide.md) for the repository’s private deployment workflow.

## Technical notes

- The app is a React 19 client experience built with Vinext and Vite.
- Styling uses Tailwind CSS 4, custom CSS, and the installed Shadcn UI primitives.
- Folder selection uses the File System Access API when available, with a directory-upload fallback for browsers that do not support it.
- Media is played with native HTML `<video>` and `<audio>` elements.
- There is no application database or server-side media storage; `.openai/hosting.json` currently has no D1 or R2 bindings.
