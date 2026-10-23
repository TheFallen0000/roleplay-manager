---
title: Data and updates
description: Where your data lives, how backups work and what an update touches.
---

## Your folder

The portable package keeps everything inside one folder:

```text
RoleplayManager/
├── data/        ← SQLite database and images
├── backups/     ← safety copies
├── versions/    ← installed versions
├── current      ← active version
└── start.cmd | start.sh
```

`data/` and `backups/` are never replaced by an update. You can move the whole
folder, copy it to another disk or keep it in a sync folder if you understand
the risks of syncing a live database.

## Backups

The app can create a backup before an update. You can also copy `data/` while
the app is stopped. For a portable copy of a single character, use the export
dialog; it can include conversations, images and settings.

## Updates

Open **System → Updates**. The app checks the latest GitHub release, downloads
the package for your platform into `versions/<version>/`, changes the `current`
pointer and offers **Restart now**.

- Your `data/` and `backups/` are untouched.
- The previous version stays on disk, so you can go back.
- If something goes wrong, use the log in **System → Logs**.

## Moving to another computer

1. Stop the app.
2. Copy the whole folder, including `data/`.
3. Start the app on the new computer with the launcher.

If you only need one character, export it as JSON and import it on the other
machine.

## Uninstall

Stop the app and delete the folder. There is no system-wide installer and no
registry entry. If you want to keep your story, copy `data/` first.
