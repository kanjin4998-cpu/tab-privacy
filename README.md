# Tab Privacy

A personal Chrome/Brave/Edge extension with per-site control of Page Visibility API and window focus signals, plus a small on-page tool to screenshot, copy, and ask an AI about what's on your screen. No build tools, dependencies, telemetry, or external requests.

## Install
1. Keep this repository in a permanent folder.
2. Open `chrome://extensions` (Edge: `edge://extensions`).
3. Enable **Developer mode**, click **Load unpacked**, select the `extension` folder containing `manifest.json`.
4. Pin Tab Privacy from the browser's Extensions menu.
5. Visit a website and click Tab Privacy. Under **Hide tab switching**, choose **This site** or **All sites** and approve site access.
6. Save unfinished work, then click **Reload this tab to apply**.

Protection starts OFF. Choices persist across browser restarts. Turning protection off also requires reloading affected tabs. Settings apply to the exact hostname and scheme, all ports; subdomains and HTTP/HTTPS are separate. Only frames matching an enabled site receive protection. Browser internal pages and the Chrome Web Store cannot be modified.

## Screenshot and copy button
Under **Screenshot & copy button** choose **This site** or **All sites**. A small round button appears in the bottom-right corner of the page, with these options:
- **Screenshot an area**: drag a rectangle (Esc cancels) and the image goes straight to your clipboard, ready to paste.
- **Screenshot visible screen**: the whole visible part of the tab, to the clipboard.
- **Copy page text**: copies the page's text, or just your selection if you have text selected.
- **Hide until reload**: removes the button from that page.

Chrome only allows extensions to take screenshots with access to all sites, so turning this on asks for that permission even if you pick "This site". The button still only appears where you chose. Screenshots capture only what is visible in the tab, not the browser toolbar or other windows.

## Ask AI
The on-page button also has an **ASK AI** section:
- **Ask AI about an area**: drag a rectangle (Esc cancels) and a small chat panel opens with that screenshot. Press Send for an explanation, or type your own question. Follow-up questions keep the conversation going.
- **Ask AI about visible screen**: the same, for the whole visible tab.
- **Ask AI about selected text**: appears when you have text selected.
- Tick **Also send the page text** to include the page's text (first 20,000 characters) with your first question.

### One-time setup
1. Click **AI settings** (in the popup, the button's menu, or the chat panel).
2. Choose **Claude (Anthropic)** or **Gemini (Google)** and paste your own API key. Create one at console.anthropic.com/settings/keys or aistudio.google.com/apikey.
3. Click **Save and test**.

Claude API use is billed per question to your Anthropic account (separate from a claude.ai subscription), so set a low monthly spend limit there. Gemini has a free tier with usage limits; Google may use free-tier data to improve its products, so avoid sensitive content. The default models are `claude-haiku-4-5-20251001` and `gemini-2.5-flash`; you can type a different model name in the settings. The Gemini path has not been tested against the live service.

## What it does
At document start, a MAIN-world script reports `document.hidden = false`, `document.visibilityState = "visible"`, and `document.hasFocus() = true`, with legacy WebKit equivalents. Capture listeners suppress visibility events and window/document blur/focus events. Input and button focus events remain intact.

This is best-effort signal masking, not invisibility. Sites can detect overrides or infer activity through timing, interactions, server events, and other APIs. It does not prevent timer throttling, tab suspension, or OS-level detection. Some websites may behave differently or consume more resources.

## Privacy and permissions
- `activeTab`: identify the site when you open the popup.
- `scripting`: register the protection and tools scripts.
- `storage`: keep your AI settings and API key on this device only.
- Access to `api.anthropic.com` and `generativelanguage.googleapis.com`: used only when you press Send in the Ask AI panel.
- Optional host access: requested only when you turn something on. Tab hiding asks for just the site (or all sites); the screenshot button asks for all sites because Chrome requires it for screenshots.
- No analytics, remote code, cookies, or content collection. Copy features only touch your clipboard. The only network requests are the Ask AI questions you send, which go straight from your browser to the AI service you chose, with your own key. Nothing goes to the extension's author or any other server.
- Turning a site off removes its script registration. Chrome retains previously granted site permission; revoke it in the extension's browser settings if desired.

## Updates
Replace files in your permanent folder, then click **Reload** on the extension card and reload affected web pages. An unpacked extension does not auto-update from GitHub. This package has not been published in a browser store.

## Install from GitHub
Clone or download this repository, then in `chrome://extensions` choose **Load unpacked** and select the `extension` folder.

## Use responsibly
This tool exists to stop sites from tracking when you switch tabs or windows. It can also hide that signal from proctored or monitored assessments, which may breach your school's academic integrity rules. Don't use it to get around exam or quiz monitoring.

## Validate
Requires Node.js 18+: run `npm test`.
Manual browser checks: enable a site and reload; in the page console inspect `document.hidden`, `document.visibilityState`, and `document.hasFocus()` while switching windows. Check forms still focus normally. Disable, reload, and confirm native behavior returns. Restart the browser and verify an enabled site remains registered.

Automated tests (`npm test`) cover property overrides, event suppression, and preserving form focus. The popup, screenshot area copy, visible-screen copy, text copy and the Ask AI chat (against a mocked API) were also checked in Chromium. The request format was confirmed against the live Anthropic endpoint with a dummy key, but no real AI answer was tested. Browser installation and end-to-end behavior must still be verified in Chrome.

## Origins
Inspired by the idea of [ThomasNHoang/disable-page-visibility](https://github.com/ThomasNHoang/disable-page-visibility), which is AGPL-3.0 licensed and credits Marvin Schopf and Thomas Hoang. This package is an independent implementation; no upstream code or assets were copied. It is not affiliated with that project.
