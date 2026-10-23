---
title: Troubleshooting
description: Fix the most common installation, connection and launch problems.
---

## The app does not open

- Check the console or terminal window for an error.
- Open `http://localhost:3001` manually.
- If port 3001 is busy, close the other app or start Roleplay Manager with a
  different `PORT`.

## Windows SmartScreen

The launcher is not signed. If you downloaded it from the official GitHub
release, choose **More info → Run anyway**. This is a one-time step.

## macOS Gatekeeper

Allow the app in **System Settings → Privacy & Security**, or run inside the app
folder:

```bash
xattr -dr com.apple.quarantine .
```

## Linux launcher

If `./start.sh` is not executable:

```bash
chmod +x start.sh
```

## The provider connection fails

- **Ollama:** make sure Ollama is running and the URL is
  `http://localhost:11434`.
- **OpenAI-compatible:** check the base URL, the API key and whether the model
  is available for that key.
- Use **Test connection** in **System → Providers** before starting a chat.

## A reply ignores something

Open the context preview for the conversation. It shows the character prompt,
memories, summaries and recent messages that will be sent to the model. If the
detail is missing, add it to the character description, a memory or the current
instruction.

## Where are the logs?

Open **System → Logs**. You can copy the log or download it and attach it to a
GitHub issue.

## Still stuck?

Open an issue with your operating system, the app version, what you expected and
what happened. Include the relevant log lines and, if possible, the steps to
reproduce it.
