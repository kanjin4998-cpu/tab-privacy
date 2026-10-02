# Tab Privacy

A personal Chrome/Edge extension with per-site control of Page Visibility API and window focus signals. No build tools, dependencies, telemetry, or external requests.

## Install
1. Keep this repository in a permanent folder.
2. Open `chrome://extensions` (Edge: `edge://extensions`).
3. Enable **Developer mode**, click **Load unpacked**, select the `extension` folder containing `manifest.json`.
4. Pin Tab Privacy from the browser's Extensions menu.
5. Visit a website, click Tab Privacy, choose **Turn on for this site**, and approve site access.
6. Save unfinished work, then click **Reload this tab to apply**.

Protection starts OFF. Choices persist across browser restarts. Turning protection off also requires reloading affected tabs. Settings apply to the exact hostname and scheme, all ports; subdomains and HTTP/HTTPS are separate. Only frames matching an enabled site receive protection. Browser internal pages and the Chrome Web Store cannot be modified.

## What it does
At document start, a MAIN-world script reports `document.hidden = false`, `document.visibilityState = "visible"`, and `document.hasFocus() = true`, with legacy WebKit equivalents. Capture listeners suppress visibility events and window/document blur/focus events. Input and button focus events remain intact.

This is best-effort signal masking, not invisibility. Sites can detect overrides or infer activity through timing, interactions, server events, and other APIs. It does not prevent timer throttling, tab suspension, or OS-level detection. Some websites may behave differently or consume more resources.

## Privacy and permissions
- `activeTab`: identify the site when you open the popup.
- `scripting`: register the protection script.
- Optional HTTP/HTTPS host access: requested only when you enable a site.
- No analytics, network calls, remote code, cookies, or content collection.
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

Automated tests cover property overrides, event suppression, and preserving form focus. Browser installation and end-to-end behavior must still be verified in Chrome.

## Origins
Inspired by the idea of [ThomasNHoang/disable-page-visibility](https://github.com/ThomasNHoang/disable-page-visibility), which is AGPL-3.0 licensed and credits Marvin Schopf and Thomas Hoang. This package is an independent implementation; no upstream code or assets were copied. It is not affiliated with that project.
