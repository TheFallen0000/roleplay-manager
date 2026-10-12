import type { TutorialContent } from "./types"

/** Tutorial copy in English; mirrors `content.es.ts` (see that file's note). */
export const tutorialsEn: TutorialContent = {
  "phone-access": {
    title: "Connect your phone with Tailscale",
    description:
      "Use the app from your phone on any network, through your private Tailscale network.",
    steps: [
      {
        title: "Install Tailscale on both devices",
        body: "Download Tailscale on your computer from tailscale.com/download and sign in. On your phone, install the Tailscale app and sign in with the same account: both devices will join your private network.",
      },
      {
        title: "Turn the access on in the app",
        body: "Open the “Phone” menu in the top bar, switch to the “Tailscale” tab and flip the toggle. If it asks for a previous step, enable “Serve” with the link that appears (only needed once).",
      },
      {
        title: "Open the URL on your phone",
        body: "With the toggle on you will see a QR code and the app address. Scan it with your phone camera (with Tailscale connected there) and open it.",
      },
      {
        title: "Add it to your home screen",
        body: "With this Tailscale address open, save it from the phone browser: it will open with its own icon and no browser bar (HTTPS is required). The “Install the app on your phone” tutorial walks you through it.",
      },
    ],
    tips: [
      "The address only works inside your Tailscale network: nobody else can reach it.",
      "Turn the toggle off when you are done; closing the app also cuts the tunnel.",
      "If it does not load on the phone, check that Tailscale is connected on both devices.",
    ],
  },
  "pwa-install": {
    title: "Install the app on your phone",
    description:
      "Add it to your home screen and open it in its own window, without the browser bar.",
    steps: [
      {
        title: "Open the app with the Tailscale address",
        body: "Installation needs a secure connection (HTTPS), so use the Tailscale address and not the home-network one: over http:// the browser will not offer to install it.",
      },
      {
        title: "Android (Chrome)",
        body: "Open the ⋮ menu and pick “Install app” or “Add to Home screen”; the exact name varies between versions.",
      },
      {
        title: "iPhone (Safari)",
        body: "Tap Share and pick “Add to Home Screen”. On iPhone it has to be Safari; other browsers do not show the option.",
      },
      {
        title: "Open it from the new icon",
        body: "It will open full screen, like a standalone app, and you can switch between it and the browser without typing the address again.",
      },
    ],
    tips: [
      "The phone is a window into the app: characters and conversations still live on your computer.",
      "Over the home network the app only runs in the browser: to really install it, always use Tailscale.",
    ],
  },
  "lan-access": {
    title: "Connect over your home network",
    description:
      "Open it from another device in your house, without Tailscale and without going online.",
    steps: [
      {
        title: "Turn the access on",
        body: "“Phone” menu → “Home network” tab → flip the toggle.",
      },
      {
        title: "Connect from the other device",
        body: "Scan the QR code with the camera (it must be on the same WiFi) or type the address shown, similar to http://192.168.1.20:4322.",
      },
      {
        title: "If it does not open, check the firewall",
        body: "Allow incoming connections for the app in your computer firewall. If several addresses appear, pick the one from your WiFi network.",
      },
    ],
    tips: [
      "It only works inside your local network; use Tailscale when you are away from home.",
      "Closing the app cuts the access and the address stops responding.",
      "Here the app runs in the browser: installing it as an app only works with the Tailscale address (it needs HTTPS).",
    ],
  },
  providers: {
    title: "Set up an AI provider",
    description:
      "Connect the app to Ollama on your computer or to any service compatible with the OpenAI API.",
    steps: [
      {
        title: "Open “Providers”",
        body: "It lives in the sidebar. You will see the Ollama card and the one for OpenAI-compatible providers.",
      },
      {
        title: "Ollama (on your computer)",
        body: "Install Ollama from ollama.com and pull a model (for example: ollama pull llama3.1). Back in the app, press “Test connection” and, if it answers, pick the model and “Set as default”.",
      },
      {
        title: "OpenAI-compatible (LM Studio, OpenRouter…)",
        body: "Press “New instance” and fill in the name, the base URL (for example http://localhost:1234/v1) and the key if it asks for one. Then press “Test connection”.",
      },
      {
        title: "A different model per conversation",
        body: "Gear menu of a conversation → “Model” lets you use another model just for that chat, and tweak temperature and other inference parameters.",
      },
    ],
    tips: [
      "If the test fails, check that the service is running and that the base URL points at the root of its API (it usually ends in /v1).",
      "Your key is stored only on your computer, inside the app data folder.",
    ],
    action: { label: "Go to Providers", href: "/settings/providers" },
  },
  characters: {
    title: "Create, export and import characters",
    description:
      "Create characters, keep versions and move them between computers with a single file.",
    steps: [
      {
        title: "Create the character",
        body: "In “My characters”, press “New character”: the “General” tab holds name, image, greeting and description; “Cards” holds its traits.",
      },
      {
        title: "Go back to earlier versions",
        body: "Every saved change becomes a version. The vN selector in the header lets you open an earlier one and save from there.",
      },
      {
        title: "Export it",
        body: "Right-click its card → “Export…”. Pick what to include (definition, versions, conversations, memories…) and save the JSON file.",
      },
      {
        title: "Import it on another computer",
        body: "In “My characters”, press “Import” (or drop the JSON onto the window): the character arrives with everything you included.",
      },
    ],
    tips: [
      "The exported file is the safest way to share or move a full character.",
      "“Apply settings…” (right-click) applies an exported settings template to every conversation of the character.",
    ],
    action: { label: "Go to My characters", href: "/" },
  },
  branches: {
    title: "Conversation branches",
    description:
      "Explore a “what if…?” without touching the original conversation: clone it up to a point and continue from there.",
    steps: [
      {
        title: "Pick the starting point",
        body: "Right-click a message (the first one does not count) to open its menu.",
      },
      {
        title: "“Create branch”",
        body: "A new conversation opens with the whole history up to that message; the original stays untouched.",
      },
      {
        title: "Continue the scene",
        body: "You will find both conversations on the character page: follow the branch or go back to the original whenever you want.",
      },
    ],
    tips: [
      "Great for trying alternative endings without losing the main thread.",
      "If you only want to fix the last exchange, try “Regenerate” or “Rewind” in the message menu.",
    ],
    action: { label: "Go to My characters", href: "/" },
  },
  "memory-summaries": {
    title: "Memories and summaries",
    description:
      "How the AI remembers what matters in a long conversation, and who decides what gets stored.",
    steps: [
      {
        title: "Choose the memory mode",
        body: "Gear menu → “History” → “Memory management mode”. With “Auto” proposals are applied right away; with “Manual” they wait in “Pending proposals” for you to accept, edit or discard.",
      },
      {
        title: "Review what it knows",
        body: "“Dynamic memory” lists every memory grouped by actor; you can create, edit and delete entries by hand.",
      },
      {
        title: "Summaries that lighten the context",
        body: "Every so many messages an accumulating summary of the old part is regenerated. Tune the frequency in “Summaries” or press “Generate summary now”.",
      },
      {
        title: "Decay keeps the list healthy",
        body: "Under “Auto-decay”, memories that stop being used lose importance; the ones below the threshold leave the context and become deletion candidates.",
      },
    ],
    tips: [
      "The higher a memory's importance, the more weight it has when generating a reply.",
      "Create memories by hand to pin details the AI must not forget.",
    ],
  },
  "chat-customization": {
    title: "Customize the chat",
    description:
      "Change how a conversation reads: styles, colors for each voice, background and fullscreen.",
    steps: [
      {
        title: "Chat image and background",
        body: "In the gear menu → “Customization” you can give that conversation its own profile image and a scene background, with its fit and scrim.",
      },
      {
        title: "Message style",
        body: "Pick “Bubble” (the classic chat), “Document” (full-width prose, like a novel) or “Visual novel” (each voice with its own plate over the background).",
      },
      {
        title: "Dialogue colors",
        body: "Assign one color to the character and one to yourself; “Theme” uses the active world color.",
      },
      {
        title: "Fullscreen",
        body: "Gear menu → “Fullscreen” keeps only the conversation on screen. Leave it with the floating button or the Esc key.",
      },
    ],
    tips: [
      "Appearance is per conversation; branches inherit it.",
      "Theme and language are global and live in the top bar.",
    ],
  },
  "data-updates": {
    title: "Your data and updates",
    description:
      "Where everything is stored, how to update safely and what to check when something fails.",
    steps: [
      {
        title: "Everything stays on your computer",
        body: "Next to the app you will find the data/ folder with the database, the images and the log (data/logs). Nothing leaves your computer except what you send to your AI provider.",
      },
      {
        title: "Update with a safety net",
        body: "When a new version is out you will see the notice and the “Updates” page. The app creates a backup before applying the change; you can also press “Create backup now” at any time.",
      },
      {
        title: "Move or copy everything",
        body: "To take the app to another computer, close it and copy the whole data/ folder. Backups land in the backups folder, next to the app.",
      },
      {
        title: "When something fails, the log helps",
        body: "In “Log” you can filter by level, refresh, copy or download the latest messages and attach them when asking for help.",
      },
    ],
    tips: [
      "The log rotates on its own, so it never grows without limit.",
      "Taking care of the data/ folder is taking care of every character, conversation and memory.",
    ],
    action: { label: "Go to Updates", href: "/settings/updates" },
  },
}
