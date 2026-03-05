# Skynet

Chrome extension that replaces your new tab page with a customizable dashboard of link groups, dropdowns, and navbar shortcuts.

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

## Editing links

Click the **edit** text in the footer to enter edit mode. From there you can:

- **Add a link** — Fill in the Name and URL fields at the bottom of any column and click "+ Add" (or press Enter)
- **Remove a link** — Click the **x** button next to any link
- **Reorder links** — Use the up/down arrow buttons next to each link
- **Rename a column header** — Edit the text field at the top of any column
- **Remove a column** — Click the **x** button next to the column header
- **Add a column** — Click the "+ Add Column" button
- **Edit navbar buttons** — In edit mode, the navbar buttons become editable text fields for label and URL
- **Edit dropdowns** — Add/remove items, change headings, and modify URL templates (see **Dropdowns** below)
- **Add a dropdown** — Click the "+ Add Dropdown" button
- **Save** — Persist your changes
- **Cancel** — Discard changes and return to the saved state
- **Update to New Default** — Reset all links to the built-in defaults from `defaultLinks.js`
- **Export** — Download your current config as `skynet-config.json`
- **Import** — Load a config from a JSON file

## Dropdowns

Dropdowns are link menus built from a **URL template** and a list of **items**. Each item has a **value** (used in the URL) and an optional **label** (shown in the menu).

- **URL template** — Use placeholders `{part}`, `{part1}`, `{part2}`, `{part3}`, etc. The value for each item can be a single value or comma-separated parts that map to part1, part2, part3, and so on. *Ignored for items whose value is a full URL (see Value).*
- **Value** — The string substituted into the template: a single value (e.g. `ec2`), comma-separated parts (e.g. `github,chrometab,main`), or a **full URL**. If the value starts with `https://`, it is used as the link directly and the URL template is not applied. Use this to mix template-based entries with fixed links in the same dropdown.
- **Label** — Optional. If set, this is the text shown in the dropdown; if empty, the value is shown. Handy when the value is something like `github,chrometab,main` and you want the menu to show “chrometab (main)” instead.

**Example (template):** Set the URL template to `https://github.com/{part1}/{part2}/tree/{part3}` and add an item with value `your-org,repo-name,main` and label `repo-name (main)`.

**Example (direct URL):** Add an item with value `https://example.com/special-page` and label `Special page`; the template is ignored and that URL is used as the link.

## Sharing your config

1. Click **edit** in the footer
2. Click **Export** to download your config as a JSON file
3. Share the file with a teammate
4. They click **edit** > **Import** and select the file

## Development

```
npm run dev      # Start webpack dev server on localhost:3000
npm run build    # Production build to dist/
npm run watch    # Rebuild on file changes
```

## Tech stack

- React 18
- Webpack 5
- Chrome Extension Manifest V3
- `chrome.storage.local` for persistence

## Preview

![alt tag](https://cloud.githubusercontent.com/assets/1512282/24662930/6b61bbc4-190b-11e7-84d8-5245c65abc60.png)
