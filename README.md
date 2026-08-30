# Skynet

Chrome extension that replaces your new tab page with a customizable dashboard: link columns, dropdown menus, navbar shortcuts, a quick search bar, a Cmd+K command palette that searches your bookmarks, history, and external sources (GitHub repos, JSON APIs, RSS feeds), per-profile todo lists, tab sets, and optional config backup to a GitHub Gist.

![Default page](https://github.com/user-attachments/assets/86d204fc-6991-4d9b-8d03-ae798ed8afed)

## Installing from source

1. Clone the repo locally
2. Install [Node.js](https://nodejs.org/) if you don't have it (`brew install node`)
3. Install dependencies:
   ```
   npm install
   ```
4. Build the extension:
   ```
   npm run build
   ```
5. Open Chrome and go to `chrome://extensions`
6. Enable **Developer mode** (toggle in the top right)
7. Click **Load unpacked** and select the repo directory

## Getting latest updates

1. `git pull` to get the latest changes
2. `npm install && npm run build`
3. Go to `chrome://extensions` and click the reload button on the extension

## Quick search bar

The search bar in the middle of the navbar searches your configured links, Chrome bookmarks, browser history, and recently closed tabs.

- Press **`.`** (period) to focus it from anywhere on the page
- Type to search. Results are grouped into three tabs: **Links** (your columns, dropdowns, navbar, tab sets, and bookmarks), **History**, and **Closed**
- **Tab** / **Shift+Tab** switches between result tabs, **↑ ↓** navigates, **Enter** opens, **Esc** clears and closes
- Link results match on name, URL, and any search tags you've added

## Command Palette (Cmd+K)

Press **Cmd+K** (or **Ctrl+K**) to open the command palette. It searches everything the quick search does, plus items synced from external sources. Filter pills across the top narrow results to a category: **All**, **GitHub**, **API**, **Links**, **Feeds**, **History**, **Closed**. Use **Tab** to cycle filters, **↑ ↓** and **Enter** to open a result, **Esc** to close.

Click the gear icon in the palette to configure sources. Sources are per profile, and each shows its sync status, item count, and a manual sync button. Three source types are supported:

- **GitHub** provides repos from an org and/or your personal repos. Requires a fine-grained personal access token with read-only repo access (one token per source, scoped to that org). Supports GitHub Enterprise via a custom API base URL (e.g. `https://github.yourcompany.com/api/v3`).
- **API** provides items from any JSON endpoint. Configure the fetch URL, optional headers, a dot-notation path to the results array, name/description fields, a URL template with `{fieldName}` placeholders, and pagination style (none, Link header, or offset/limit).
- **RSS Feed** provides items from an RSS 2.0 or Atom feed, refreshed on a configurable interval (15 minutes up to once a week).

Sources sync automatically in the background when stale (24 hours for GitHub and API sources; RSS uses its own interval), or on demand with **Sync now** / **Sync all**. Results are cached in extension storage; a meter in the palette footer shows how much of the storage budget the cache is using.

Note: custom API and RSS sources fetch arbitrary origins, so they depend on the target server allowing CORS. If a feed won't sync, that is the first thing to check.

## Profiles

A profile is a complete, independent dashboard: its own columns, navbar, dropdowns, tab sets, todos, dark mode preference, and palette sources. Profile pills live in the footer.

- **Switch** by clicking a pill, or press **1** through **9** to switch by position
- In edit mode, click **manage** to add, rename, or delete profiles (the last remaining profile can't be deleted)

## Tab sets

A tab set is a named group of URLs that opens all at once, useful for a "start my workday" bundle. When a profile has tab sets, a **tabset** button appears in the footer: click it (or pick a set from the popover if you have several) to open every URL in new tabs and close the new tab page. Manage tab sets in edit mode with the **+ Add Tab Set** button.

## Todos

Each profile has a todo list. Click **todo** in the footer to show it.

- Add a task with the input field (Enter or **+**)
- **Double-click** a task to edit it in place
- Click the circle to complete a task (completing removes it permanently)
- Any `http(s)://` URL in a task's text becomes a clickable link

## Editing your page

Click **update** in the footer to enter edit mode. From there you can:

- **Add a link**: fill in the Name and URL fields at the bottom of any column and click **+ Add** (or press Enter)
- **Remove a link**: click the **×** button next to any link
- **Reorder and move links**: drag the **⠿** handle. Drop within a column to reorder, or drop onto another column to move the link there. Links can also be dragged between columns and dropdowns in either direction
- **Rename a column**: edit the text field at the top of the column
- **Add / remove / reorder columns**: use **+ Add Column**, the **×** in the column heading, and the **⠿** handle on the heading
- **Search tags**: click the **#** button next to any link, navbar button, dropdown item, or tab set link to add comma-separated tags. Tags aren't displayed, but make the item findable in the search bar and command palette
- **Edit navbar buttons**: the two navbar buttons become editable label and URL fields
- **Edit dropdowns**: add/remove/reorder items, change headings, and modify URL templates (see **Dropdowns** below)
- **Edit the title image**: set an image URL for the logo below the navbar, or leave it empty to hide it
- **Link behavior**: the **new tab** / **current tab** toggle controls whether column links, navbar buttons, dropdown selections, and search bar results open in a new tab or replace the current one. Saved when you click Save
- **Dark mode**: the **dark mode** / **light mode** toggle sets the theme per profile (takes effect immediately). Profiles that never set it follow your OS theme
- **Save** / **Cancel**: commit or discard your changes (Esc also cancels)

![Customize your page](https://github.com/user-attachments/assets/3508707d-495c-4f62-beaa-72025215dcbd)

## Dropdowns

Dropdowns are link menus built from a **URL template** and a list of **items**. Each item has a **value** (used in the URL) and an optional **label** (shown in the menu).

- **URL template**: use placeholders `{part}`, `{part1}`, `{part2}`, `{part3}`, etc. The value for each item can be a single value or comma-separated parts that map to part1, part2, part3, and so on. Ignored for items whose value is a full URL (see Value)
- **Value**: the string substituted into the template: a single value (e.g. `ec2`), comma-separated parts (e.g. `github,chrometab,main`), or a full URL. If the value starts with `https://`, it is used as the link directly and the URL template is not applied. Use this to mix template-based entries with fixed links in the same dropdown
- **Label**: optional. If set, this is the text shown in the dropdown; if empty, the value is shown. Handy when the value is something like `github,chrometab,main` and you want the menu to show "chrometab (main)" instead

**Example (template):** set the URL template to `https://github.com/{part1}/{part2}/tree/{part3}` and add an item with value `your-org,repo-name,main` and label `repo-name (main)`.

**Example (direct URL):** add an item with value `https://example.com/special-page` and label `Special page`; the template is ignored and that URL is used as the link.

## Backups and sharing

### Export / Import

In edit mode:

1. Click **Export** to download your full config (all profiles) as `skynet-config.json`
2. Share the file with a teammate
3. They click **update** > **Import** and select the file (this replaces all of their profiles)

Exports strip secrets: GitHub tokens and Authorization headers on palette sources are blanked, so they must be re-entered after an import.

### Gist sync

Your config can also be backed up to a secret GitHub Gist. In edit mode:

- **Set GitHub Token**: store a personal access token with the `gist` scope. Once set, every **Save** auto-pushes your config to the gist. **Clear GitHub Token** turns this off
- **GitHub Export**: one-off manual backup (prompts for a token)
- **GitHub Import**: restore from your backup gist, replacing all profiles

The first backup creates the gist and remembers its ID; later backups update the same gist. As with file exports, source tokens are stripped before upload. Note that the stored auto-sync token lives in extension storage in plain text.

## Keyboard shortcuts

| Key | Action |
|---|---|
| `⌘K` / `Ctrl+K` | Open command palette |
| `.` | Focus quick search bar |
| `Esc` | Close search / cancel edit mode |
| `1` to `9` | Switch to profile by position |
| `Tab` | Cycle filter / view in search |
| `↑ ↓` | Navigate search results |
| `Enter` | Open selected search result |

A shortcuts reference is also available from the keyboard icon at the right end of the edit-mode footer (hover to open).

## Permissions

The extension requests only what its features use:

| Permission | Used for |
|---|---|
| `storage` | Config, profiles, todos, and the palette's resource cache |
| `tabs` | Tab sets (opening the group and closing the new tab page) |
| `bookmarks` | Including your bookmarks in search results |
| `history` | The History search tab (per-query lookups only) |
| `sessions` | The recently closed tabs search tab |
| `api.github.com` / `*.github.com` | Gist backup and GitHub repo sources (including Enterprise) |

## Development

```
npm run dev      # Start webpack dev server on localhost:3000
npm run build    # Production build to dist/
npm run watch    # Rebuild on file changes
```

Or via the Makefile: `make build` (install + build), `make release` (build and zip a release), `make clean`.

Outside the extension context (e.g. `npm run dev`), storage falls back to `localStorage` so the app still runs in a plain browser tab.
