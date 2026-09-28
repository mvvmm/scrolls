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

## Install

Requires [Raycast](https://www.raycast.com), Node LTS, and pnpm (`npm i -g pnpm`).

```bash
git clone https://github.com/mvvmm/scrolls.git
cd scrolls
pnpm install
pnpm dev
```

Raycast opens with the extension running in development mode — keep the terminal open while you use it. For a permanent install, run `pnpm build`, then run Raycast's **Import Extension** command and select this folder.

Point it at your notes under **Raycast Settings → Extensions → Scrolls → Notes Directory** (default: `~/Documents/notes`).

## Usage

Open Raycast, type `scrolls` (or just `n`), hit Enter.

- The list shows recent notes and folders, most recently opened first
- Type to filter — the right pane previews the highlighted note
- `Enter` opens a note in TextEdit, or drills into a folder (**Back to All Notes** returns)
- Type a new note's name, then `Enter` on the **Create** row to make it
- Shortcuts: `⌘N` new note · `⌘O` open directory · `⌘⌫` delete (confirm, then Trash)
