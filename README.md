# hermes-kanban-attachment-preview

Adds a Preview button to each kanban attachment. The modal shows images, PDF, audio, video and text, with prev/next across the task's attachments, Download, and Esc closing only the preview. Text is capped at 512 KB; unknown types fall back to Download.

A dashboard-only plugin for the Hermes kanban board. It does not modify Hermes core. The kanban drawer exposes no plugin slots, so this finds its targets by `.hermes-kanban-*` class names; **a Hermes update that renames them will break it silently**. Rerun the E2E after upgrading Hermes.

Tested against Hermes v0.21.7 (canary).

## Install

User dashboard plugins must be present in `~/.hermes/plugins/` and listed in `plugins.enabled`.

```bash
git clone git@github.com:zachristmas/hermes-kanban-attachment-preview.git ~/.hermes/plugins/kanban-attachment-preview
hermes plugins enable kanban-attachment-preview
curl http://127.0.0.1:9119/api/dashboard/plugins/rescan   # or restart `hermes dashboard`, then hard-refresh
```

`hermes plugins enable` prints "restart the gateway"; that only applies to the agent side, which is a no-op here. Disable with `hermes plugins disable kanban-attachment-preview`.

## Test

Run against a **sandbox** dashboard (throwaway `HERMES_HOME` with this plugin enabled and a seeded task), never a live board.

```bash
cd e2e && npm i
KANBAN_E2E_URL=http://127.0.0.1:9229 KANBAN_E2E_TASK=<seeded task id> npx playwright test
# optional: CHROMIUM_PATH=<existing chrome-headless-shell> to skip the browser download
```

Seed: a task with comments "first comment", "second comment", "third comment" and attachments `red.png` (64x64 PNG), `notes.txt` ("hello preview"), `doc.pdf`, `data.bin`.
