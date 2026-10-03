# Mobile app (PWA and Capacitor)

The same React build can be used in two ways on a phone.

## 1. PWA (install from the browser)

`npm run build` generates `manifest.webmanifest`, `sw.js` and the app icons in `dist/` via
[`vite-plugin-pwa`](https://vite-pwa-org.netlify.app/). Nothing else is needed for deployment.

- Open the deployed site in Chrome (Android) or Safari (iOS) and choose **Install app** / **Add to Home Screen**.
- The site must be served over HTTPS (localhost is allowed for testing with `npm run build && npm run preview`).
- The service worker only precaches the app shell (JS, CSS, HTML, icons). API calls, WebSockets and
  `/static/` media always go to the network. Requests under `/api` are never answered with `index.html`.
- New versions are activated automatically on the next load (`registerType: "autoUpdate"`).

Icons live in `public/` (`pwa-*.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`) and were generated from the
original app icon, `public/favicon.ico`. To change the icon, replace those files with a new source image, for example:

```sh
npx @vite-pwa/assets-generator --preset minimal-2023 path/to/new-icon.svg
git checkout public/favicon.ico   # the generator overwrites the existing favicon
```

## 2. Native app with Capacitor

[Capacitor](https://capacitorjs.com/) wraps the built `dist/` folder in a native Android/iOS shell
(`capacitor.config.ts`). The service worker is disabled in this build because the assets are already bundled in the app.

### Requirements

- Android: Android Studio (with an Android SDK) and JDK 21.
- iOS: macOS with Xcode. An Apple Developer account is required to publish.

### Environment

The native app is served from `https://localhost` (Android) or `capacitor://localhost` (iOS), so relative URLs don't reach the
backend. Copy the example file and set absolute URLs:

```sh
cp .env.mobile.example .env.mobile
```

```env
VITE_BASE_URL=https://chat.example.com/api
VITE_WS_URL=wss://chat.example.com/api   # optional
```

`npm run build:mobile` (`vite build --mode mobile`) fails early if `VITE_BASE_URL` is not an absolute `http(s)` URL.
`.env.mobile` is git-ignored. Variables set in the shell (for example in CI) override the file.

Set `CAPACITOR_APP_ID` to override the default bundle id `com.messenger.app` (it can't be changed after publishing).

### First-time setup

Create the native projects once and commit them:

```sh
npm run build:mobile
npx cap add android
npx cap add ios
```

Then add the microphone permission (needed for voice messages):

- Android `android/app/src/main/AndroidManifest.xml`:
  `<uses-permission android:name="android.permission.RECORD_AUDIO" />` and
  `<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />`
- iOS `ios/App/App/Info.plist`: `NSMicrophoneUsageDescription` with a short reason, for example "Record voice messages".

App icons and splash screens for the native projects can be generated with
[`@capacitor/assets`](https://github.com/ionic-team/capacitor-assets) from `public/pwa-512x512.png`.

### Daily workflow

| Script | What it does |
| --- | --- |
| `npm run build:mobile` | Builds `dist/` for the native app |
| `npm run cap:sync` | Builds and copies `dist/` + plugins into `android/` and `ios/` |
| `npm run cap:android` / `npm run cap:ios` | Syncs and opens Android Studio / Xcode (build, sign, publish from there) |
| `npm run cap:run:android` / `npm run cap:run:ios` | Syncs and runs on a connected device or emulator |

### Backend requirements

Authentication uses an HTTP-only refresh cookie (`credentials: 'include'`). For the native app the backend must:

- Allow the origins `https://localhost` and `capacitor://localhost` in CORS, with `Access-Control-Allow-Credentials: true`.
- Issue the refresh cookie with `SameSite=None; Secure`.

iOS WKWebView may still block third-party cookies. If refreshing the session fails on iOS, enable the native HTTP layer
(`plugins: { CapacitorHttp: { enabled: true }, CapacitorCookies: { enabled: true } }` in `capacitor.config.ts`)
or serve the API from the same domain as the app.
