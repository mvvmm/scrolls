import {
  existsSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { parse, relative, resolve } from "node:path";
import {
  Action,
  ActionPanel,
  Alert,
  closeMainWindow,
  confirmAlert,
  getPreferenceValues,
  Icon,
  Keyboard,
  List,
  open,
  popToRoot,
  showToast,
  Toast,
  trash,
} from "@raycast/api";
import { useEffect, useState } from "react";

interface ScrollsPreferences {
  notesDirectory: string;
}

const HOME = process.env.HOME || "";

function expandTilde(path: string): string {
  if (path === "~") return HOME;
  if (path.startsWith("~/")) return resolve(HOME, path.slice(2));
  return path;
}

const NOTES_DIRECTORY = expandTilde(
  getPreferenceValues<ScrollsPreferences>().notesDirectory.trim() ||
    "~/Documents/notes",
);

interface NoteFile {
  kind: "file";
  name: string;
  ext: string;
  path: string;
  relativePath: string;
  folder: string;
}

interface NoteFolder {
  kind: "folder";
  name: string;
  path: string;
  relativePath: string;
}

type ListEntry = NoteFile | NoteFolder;

function getFilesRecursive(dir: string): NoteFile[] {
  const results: NoteFile[] = [];
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (entry.startsWith(".")) continue;
      const fullPath = resolve(dir, entry);
      try {
        const stats = statSync(fullPath);
        if (stats.isFile()) {
          const parsed = parse(entry);
          const rel = relative(NOTES_DIRECTORY, fullPath);
          const folder = relative(NOTES_DIRECTORY, dir);
          results.push({
            kind: "file",
            name: parsed.name,
            ext: parsed.ext,
            path: fullPath,
            relativePath: rel,
            folder,
          });
        } else if (stats.isDirectory()) {
          results.push(...getFilesRecursive(fullPath));
        }
      } catch {
        // skip inaccessible entries
      }
    }
  } catch {
    // skip inaccessible directories
  }
  return results;
}

function getTopLevelFolders(): NoteFolder[] {
  try {
    const entries = readdirSync(NOTES_DIRECTORY);
    return entries
      .filter((entry) => {
        if (entry.startsWith(".")) return false;
        const fullPath = resolve(NOTES_DIRECTORY, entry);
        try {
          return statSync(fullPath).isDirectory();
        } catch {
          return false;
        }
      })
      .map((entry) => ({
        kind: "folder" as const,
        name: entry,
        path: resolve(NOTES_DIRECTORY, entry),
        relativePath: entry,
      }));
  } catch {
    return [];
  }
}

function getAccessTime(path: string): number {
  try {
    return statSync(path).atimeMs;
  } catch {
    return 0;
  }
}

function getAllEntries(): ListEntry[] {
  const files = getFilesRecursive(NOTES_DIRECTORY);
  const folders = getTopLevelFolders();
  const all: ListEntry[] = [...folders, ...files];
  return all.sort((a, b) => getAccessTime(b.path) - getAccessTime(a.path));
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function NoteDetail({ note }: { note: NoteFile }) {
  let content = "";
  let size = "";
  let created = "";
  let modified = "";
  let lastOpened = "";

  try {
    const stats = statSync(note.path);
    size = formatFileSize(stats.size);
    created = formatDate(stats.birthtime);
    modified = formatDate(stats.mtime);
    lastOpened = formatDate(stats.atime);
    content = readFileSync(note.path, "utf-8");
  } catch {
    content = "*Unable to read file*";
  }

  return (
    <List.Item.Detail
      markdown={`\`\`\`\n${content}\n\`\`\``}
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Where"
            text={note.relativePath}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Created" text={created} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Modified" text={modified} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Last Opened"
            text={lastOpened}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Size" text={size} />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function FolderDetail({ folder }: { folder: NoteFolder }) {
  let itemCount = 0;
  let created = "";
  let modified = "";
  let lastOpened = "";

  try {
    const stats = statSync(folder.path);
    created = formatDate(stats.birthtime);
    modified = formatDate(stats.mtime);
    lastOpened = formatDate(stats.atime);
    itemCount = getFilesRecursive(folder.path).length;
  } catch {
    // ignore
  }

  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label
            title="Where"
            text={folder.relativePath}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Created" text={created} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Modified" text={modified} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Last Opened"
            text={lastOpened}
          />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Items"
            text={`${itemCount}`}
          />
        </List.Item.Detail.Metadata>
      }
    />
  );
}

function NoteActions({
  note,
  searchText,
  onRefresh,
}: {
  note: NoteFile;
  searchText: string;
  onRefresh: () => void;
}) {
  async function deleteNote() {
    const confirmed = await confirmAlert({
      title: "Delete Note",
      message: `Are you sure you want to delete "${note.name}${note.ext}"?`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });

    if (confirmed) {
      try {
        await trash(note.path);
        onRefresh();
        await showToast({
          style: Toast.Style.Success,
          title: "Note deleted",
          message: `${note.name}${note.ext}`,
        });
      } catch {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to delete note",
        });
      }
    }
  }

  return (
    <ActionPanel>
      <ActionPanel.Section title="Note">
        <Action.Open
          title="Open in TextEdit"
          target={note.path}
          application="TextEdit"
          onOpen={() => {
            closeMainWindow();
            popToRoot();
          }}
        />
        <Action.OpenWith path={note.path} />
        <Action.ShowInFinder path={note.path} />
        <Action.CopyToClipboard title="Copy Path" content={note.path} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Directory">
        <Action
          title="New Note"
          icon={Icon.NewDocument}
          shortcut={Keyboard.Shortcut.Common.New}
          onAction={() => createNote(searchText, onRefresh)}
        />
        <Action.Open
          title="Open Directory"
          target={NOTES_DIRECTORY}
          shortcut={Keyboard.Shortcut.Common.Open}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Danger">
        <Action
          title="Delete Note"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["cmd"], key: "backspace" }}
          onAction={deleteNote}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function FolderActions({
  folder,
  onSelect,
  onRefresh,
}: {
  folder: NoteFolder;
  onSelect: () => void;
  onRefresh: () => void;
}) {
  return (
    <ActionPanel>
      <ActionPanel.Section title="Folder">
        <Action
          title="Open Folder"
          icon={Icon.ArrowRight}
          onAction={onSelect}
        />
        <Action.ShowInFinder path={folder.path} />
        <Action.CopyToClipboard title="Copy Path" content={folder.path} />
      </ActionPanel.Section>
      <ActionPanel.Section title="Directory">
        <Action.Open
          title="Open Directory"
          target={NOTES_DIRECTORY}
          shortcut={Keyboard.Shortcut.Common.Open}
        />
      </ActionPanel.Section>
      <ActionPanel.Section title="Danger">
        <Action
          title="Delete Folder"
          icon={Icon.Trash}
          style={Action.Style.Destructive}
          shortcut={{ modifiers: ["cmd"], key: "backspace" }}
          onAction={async () => {
            const confirmed = await confirmAlert({
              title: "Delete Folder",
              message: `Are you sure you want to delete "${folder.name}" and all its contents?`,
              primaryAction: {
                title: "Delete",
                style: Alert.ActionStyle.Destructive,
              },
            });
            if (confirmed) {
              try {
                await trash(folder.path);
                onRefresh();
                await showToast({
                  style: Toast.Style.Success,
                  title: "Folder deleted",
                  message: folder.name,
                });
              } catch {
                await showToast({
                  style: Toast.Style.Failure,
                  title: "Failed to delete folder",
                });
              }
            }
          }}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

async function createNote(name: string, onRefresh: () => void) {
  const trimmed = name.trim();
  if (!trimmed) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Type a name for the new note",
    });
    return;
  }

  const filename = trimmed.endsWith(".txt") ? trimmed : `${trimmed}.txt`;
  const filePath = resolve(NOTES_DIRECTORY, filename);

  if (existsSync(filePath)) {
    await showToast({
      style: Toast.Style.Failure,
      title: "A note with that name already exists",
    });
    return;
  }

  try {
    writeFileSync(filePath, "", "utf-8");
    await open(filePath, "TextEdit");
    onRefresh();
    await closeMainWindow();
    await popToRoot();
    await showToast({
      style: Toast.Style.Success,
      title: "Note created",
      message: filename,
    });
  } catch {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to create note",
    });
  }
}

export default function Command() {
  const [entries, setEntries] = useState<ListEntry[]>(getAllEntries());
  const [searchText, setSearchText] = useState("");
  const [selectedFolder, setSelectedFolder] = useState<NoteFolder | null>(null);

  const isEmpty = entries.length === 0 && !searchText;

  useEffect(() => {
    if (!isEmpty) return;
    showToast({
      style: Toast.Style.Failure,
      title: "No notes found",
      message: `Check that your notes directory exists: ${NOTES_DIRECTORY}`,
    });
  }, [isEmpty]);

  function refresh() {
    setEntries(getAllEntries());
  }

  // When a folder is selected, show only files inside it
  if (selectedFolder) {
    const folderFiles = entries.filter(
      (e): e is NoteFile =>
        e.kind === "file" &&
        (e.folder === selectedFolder.relativePath ||
          e.folder.startsWith(`${selectedFolder.relativePath}/`)),
    );
    const filtered = folderFiles.filter((note) =>
      note.name.toLowerCase().includes(searchText.toLowerCase()),
    );

    return (
      <List
        searchBarPlaceholder="Filter notes..."
        searchText={searchText}
        isShowingDetail
        filtering={false}
        onSearchTextChange={setSearchText}
      >
        <List.Section title={selectedFolder.name}>
          <List.Item
            key="__back__"
            icon={Icon.ArrowLeft}
            title="Back to All Notes"
            detail={
              <List.Item.Detail markdown="Go back to the top-level notes list." />
            }
            actions={
              <ActionPanel>
                <Action
                  title="Go Back"
                  icon={Icon.ArrowLeft}
                  onAction={() => {
                    setSelectedFolder(null);
                    setSearchText("");
                  }}
                />
              </ActionPanel>
            }
          />
          {filtered.map((note) => (
            <List.Item
              key={note.path}
              icon={{ fileIcon: note.path }}
              title={note.name}
              detail={<NoteDetail note={note} />}
              actions={
                <NoteActions
                  note={note}
                  searchText={searchText}
                  onRefresh={refresh}
                />
              }
            />
          ))}
        </List.Section>
      </List>
    );
  }

  // Default view: folders and files together, sorted by atime
  const visible = entries.filter((e) =>
    e.name.toLowerCase().includes(searchText.toLowerCase()),
  );

  const allFiles = entries.filter((e): e is NoteFile => e.kind === "file");
  const hasExactMatch = allFiles.some(
    (note) => note.name.toLowerCase() === searchText.trim().toLowerCase(),
  );
  const showCreateItem = searchText.trim().length > 0 && !hasExactMatch;

  return (
    <List
      searchBarPlaceholder="Filter or create notes..."
      searchText={searchText}
      isShowingDetail
      filtering={false}
      onSearchTextChange={setSearchText}
    >
      <List.Section title="Recent">
        {visible.map((entry) =>
          entry.kind === "folder" ? (
            <List.Item
              key={entry.path}
              icon={{ fileIcon: entry.path }}
              title={entry.name}
              detail={<FolderDetail folder={entry} />}
              actions={
                <FolderActions
                  folder={entry}
                  onSelect={() => {
                    setSelectedFolder(entry);
                    setSearchText("");
                  }}
                  onRefresh={refresh}
                />
              }
            />
          ) : (
            <List.Item
              key={entry.path}
              icon={{ fileIcon: entry.path }}
              title={entry.name}
              detail={<NoteDetail note={entry} />}
              actions={
                <NoteActions
                  note={entry}
                  searchText={searchText}
                  onRefresh={refresh}
                />
              }
            />
          ),
        )}
      </List.Section>
      {showCreateItem && (
        <List.Item
          key="__create__"
          title={`Create "${searchText.trim()}"`}
          icon={Icon.NewDocument}
          detail={
            <List.Item.Detail
              markdown={`Press **Enter** to create a new note named **${searchText.trim()}.txt**`}
            />
          }
          actions={
            <ActionPanel>
              <Action
                title="Create Note"
                icon={Icon.NewDocument}
                onAction={() => createNote(searchText, refresh)}
              />
              <Action.Open
                title="Open Directory"
                target={NOTES_DIRECTORY}
                shortcut={Keyboard.Shortcut.Common.Open}
              />
            </ActionPanel>
          }
        />
      )}
    </List>
  );
}
