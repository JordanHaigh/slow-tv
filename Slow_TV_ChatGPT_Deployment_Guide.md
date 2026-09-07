# Slow TV deployment guide

This document explains how the Slow TV app moves from the local project to its private website when deployment is explicitly requested.

## The important distinction

Changing the files in this project and publishing those changes are separate actions. The app can be built and tested locally without changing the live site. The current work remains local because deployment has not been requested.

## Deployment flow

When you are ready to publish, ask ChatGPT:

> Deploy the current Slow TV changes to the existing private site.

ChatGPT will then:

1. Build the app locally with `npm run build`.
2. Check the build result for errors.
3. Upload the app source and hosting configuration to the existing Sites project.
4. Package the validated app as a new site version.
5. Publish that version to the existing private production URL.
6. Wait for the hosting service to report success or failure and provide the result.

If you only want a check, ask:

> Build the current changes but do not upload or deploy.

## What deployment uploads

Deployment uploads the files required to run the website:

- Slow TV source code
- Production build output
- The small Sites hosting configuration

It does not upload the media library you select later in the browser. Your videos, audio files, personal folders, and other local media stay on your computer.

## How local media works

When you add a channel, the browser asks you to choose a folder. Slow TV reads the playable files from that folder for the current browser session and creates temporary object URLs for playback. It does not copy the media into the app or into the deployment.

The app remembers channel metadata locally using browser storage and a cookie. Where the browser supports it, the folder permission handle is also kept in IndexedDB so the folder can be reconnected later. If the browser loses that permission, use **Manage channels** to reconnect the folder.

The **Manage channels** modal also provides:

- Channel number, name, colour, and description editing
- Channel removal
- Adding a new folder-backed channel
- Importing a channel metadata backup
- Exporting the current user channel metadata as JSON

The exported JSON contains channel metadata and folder references. It does not contain the media files themselves.

## Show and movie metadata lookup

When a folder is added, the app may use the folder name to request matching television information from TVmaze. Only the name used for the lookup and the returned show metadata are involved; the media files are not sent to TVmaze.

## Private publishing

The existing Site is private and owner-only. Publishing a new version updates that private site without making it public. Sharing the site with other people or changing its audience is a separate access decision.

## Current status

The current changes are local and have not been redeployed. The live site remains on its previously published version until you explicitly ask ChatGPT to deploy.
