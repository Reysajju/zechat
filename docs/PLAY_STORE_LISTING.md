# Google Play Store listing kit

All copy below is ready to paste into the Play Console. Placeholders you must replace are
marked `{...}`.

## Store identity

| Field | Value |
|---|---|
| App name (30 max) | `Zed Chat — AI Chat Client` |
| Package | `com.zedchat.app` |
| Category | Productivity |
| Tags | AI chat, assistant, GLM, chatbot |
| App icon | `docs/store/play-icon-512.png` (512×512, 32-bit PNG) |
| Feature graphic | `docs/store/feature-graphic-1024x500.png` (1024×500) |
| Screenshots | min 2 phone PNGs (see shot list) |

## Short description (80 max)

```
Native mobile client for chat.z.ai — chat, agents, uploads, downloads & app lock.
```

## Full description

```
Zed Chat puts the full chat.z.ai experience into a fast, native Android app — not a
browser tab, not a broken desktop page.

REAL APP FEATURES
• Full-screen chat with your existing Z.ai account — sign in with Google or email, and
  your session stays signed in across restarts
• Built for phones: the layout is always mobile, the composer stays above the keyboard,
  and code blocks and tables scroll cleanly on any screen down to 360px
• Share to Zed Chat from any app — send text, images or PDFs straight into a new chat
• Save AI-generated files with the native download dialog, or open them instantly
• Get a notification when long agent tasks finish, even while you're doing something else
• Optional Face ID / fingerprint app lock, dark mode that follows your system, offline
  detection with instant retry

BUILT FOR SPEED
• Instant resume — your conversation is exactly where you left it
• Haptic feedback on send, pull-free chat view, one-tap scroll to latest message
• Lightweight shell (~4 MB over the wire) with over-the-air fixes

TRANSPARENT & SAFE
• Zed Chat is an independent, unofficial client that hosts the public chat.z.ai web app.
  It is not affiliated with or endorsed by Z.ai. All AI services, accounts and content
  are provided by Z.ai under their own terms and privacy policy.
• The app only talks to chat.z.ai and the domains that site needs. Links to other sites
  open in your normal browser.
• No ads, no trackers added by us, no data sold.

Bring your chats with you — install Zed Chat.
```

## Screenshot shot list (1080×1920 or 1170×2532)

1. Chat conversation with a code answer (dark mode) — shows clean mobile layout
2. Model picker / agent mode visible
3. Share-sheet sending a PDF into Zed Chat
4. File download dialog with generated artifact
5. Settings sheet (app lock, theme)
6. Notification "Task finished" over the home screen

## Data safety form (how to answer)

| Question | Answer | Why |
|---|---|---|
| Does your app collect or share user data? | **No** (if Sentry disabled) / **Yes → Crash logs, not shared** (if Sentry enabled) | The shell adds no analytics; Sentry collects crash traces only, and only when you configure a DSN |
| Is data encrypted in transit? | Yes | All traffic is HTTPS |
| Can users request deletion? | Yes | Data lives with Z.ai (their account system) and device-local cookies; clearing app storage removes the local part |
| Login/authentication | Account exists at chat.z.ai — handled by the site | The app hosts the site's own login |

⚠️ Also complete the **Media/Content questionnaire**, and be ready to justify the
"unofficial client" positioning under the **Impersonation & Intellectual Property** policy
(see `docs/DECISIONS.md` #1). A visible disclaimer exists both in the listing and inside
the app's Settings → About.

## Content rating

Questionnaire → "Utilities/Productivity"; no user-generated content *hosted by the app*
(content is served by chat.z.ai's existing service). Expected rating: Everyone.

## Pre-launch checklist

- [ ] Internal testing track: upload AAB, install on 2+ devices
- [ ] Complete Data safety + Content rating + Privacy policy URL (`{your-privacy-url}`)
- [ ] App access: "All functionality available without special access" (login is public)
- [ ] Screenshots + feature graphic uploaded; store listing text final
- [ ] Pre-launch report reviewed (crashes, accessibility, performance)
