# Scrolls

> A scroll is a spell you _cast_ (RAY-cast), a paper covered in _notes_, and the thing you do to a long list (of notes). Get it? ...You get it.

Raycast extension that turns a folder of notes into a searchable launcher.

## What it does

- **Search** every note by name, sorted by most recently opened
- **Preview** note contents and metadata (created, modified, last opened, size) inline
- **Browse** top-level folders
- **Create** a note by typing its name and hitting Enter
- **Open** in TextEdit or any app, reveal in Finder, copy the path
- **Delete** notes and folders to Trash (with confirmation)
- **Configure** the notes folder in Raycast Settings (default: `~/Documents/notes`)

## Getting started

```bash
pnpm install
pnpm dev
```

Notes live in `~/Documents/notes` by default — change the **Notes Directory** preference under Raycast Settings → Extensions → Scrolls.

## Command

| Command   | Description                                              |
| --------- | -------------------------------------------------------- |
| `scrolls` | Search, browse, and create notes in your notes directory |
