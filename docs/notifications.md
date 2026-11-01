# Notifications

Profile → Notifications controls new-message alerts, optional sound, private previews, device push and per-chat
mutes (one hour, eight hours or until unmuted). Account settings are saved by the Go backend. System permission is
requested only after pressing **Enable on this device**. Live alerts work without granting system permission.
Push requires the backend notification migration, API, worker and provider configuration; deploy those first.

Web production builds keep the existing PWA worker and import `public/notification-worker.js`. Deploy both files
over HTTPS. The notification worker stores the current enabled account independently of the asset cache, rejects
pushes for other accounts, checks expiry, groups by conversation and focuses an existing app window on click.
The destination route resolves the conversation through the authenticated API before showing it. Logout clears
the worker account and removes the subscription and visible alerts. API session checks protect delivery if the
client is offline during cleanup. Browser permission denial must be reversed through browser/OS settings.

Visible, focused clients report a healthy live connection periodically, suppressing push on that device. In-app
alerts skip own messages, stale messages, muted chats and the focused conversation. Web Locks and a bounded replay
marker prevent duplicate live alerts across tabs. Separate devices receive independent alerts. Notification
delivery is best effort at the OS/provider boundary; a worker crash just after provider acceptance can repeat an
alert, although notification tags/collapse identifiers replace the previous conversation alert.

## Native setup

The client includes `@capacitor/push-notifications` for Capacitor 8. Native project creation/signing remains a
separate setup step, as described in `mobile.md`; no generated Android/iOS projects are checked in currently.

1. Generate the native project, build with the real Go API URL (`https://…/api/v2`), and run `npm run cap:sync`.
2. Android: register the exact application id in Firebase and place `google-services.json` in `android/app/`.
   Do not commit credentials. The plugin supplies the FCM integration and Android permission handling. The app
   creates separate sound and silent message channels; users retain control of their OS channel settings.
3. iOS: enable the Push Notifications capability in Xcode with the correct development/production entitlement.
   Add these callbacks to `ios/App/App/AppDelegate.swift`:

```swift
func application(_ application: UIApplication,
                 didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
}

func application(_ application: UIApplication,
                 didFailToRegisterForRemoteNotificationsWithError error: Error) {
    NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
}
```

4. Configure FCM/APNs credentials on API and worker using the backend's `docs/notifications.md`. Match APNs topic
   to the actual bundle id and sandbox mode to the signed build. Never put server signing keys in the frontend.
5. Run on physical devices and test permission denial, foreground/background delivery, cold-start taps, login,
   direct/group navigation, token refresh, silent/sound channels and logout. The Capacitor build intentionally
   disables the web service worker and uses native registration instead.

Reference: [Capacitor push plugin setup](https://capacitorjs.com/docs/apis/push-notifications).

## Local checks and release

Run lint, typecheck, Vitest, contract pin validation and the production build. Notification tests cover live
privacy/suppression, replay, account changes and background worker actions. Real delivery needs configured
providers and a deployed HTTPS origin; these unit tests do not exercise Google or Apple delivery.

The backend OpenAPI document includes the new routes. Notification DTOs are currently isolated in the notification
module; publish the backend contract and pin/regenerate frontend contract types during the coordinated release.
The existing generated schema remains unchanged so ordinary contract regeneration continues to match its pin.
