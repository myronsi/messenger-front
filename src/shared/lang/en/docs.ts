export const docs = {
  docsLink: "Help & docs",
  docs: {
    title: "Messenger help",
    subtitle: "Short instructions for everyday tasks, recent updates and what is coming next.",
    backToApp: "Back to the app",
    stepsCount: "{count} steps",
    contents: "Contents",
    sections: [
      {
        id: "getting-started",
        title: "Create an account",
        steps: [
          "Open the app and choose Register.",
          "Pick a username of 3-32 characters (letters, digits and underscores) and a password of at least 8 characters.",
          "After registration, download or copy the QR recovery part and keep it somewhere safe. Together with this device it is the only way to reset a forgotten password.",
        ],
      },
      {
        id: "chats",
        title: "Start a chat",
        steps: [
          "Use the search at the top of the chat list to find a person by username.",
          "Open their profile and press Message to start a direct chat.",
          "If the person only accepts messages after approval, your first message waits in their request inbox until they approve it.",
        ],
      },
      {
        id: "messages",
        title: "Work with messages",
        steps: [
          "Attach photos, voice messages and files (up to 10 MB) next to the message field.",
          "Right-click a message (or long-press on a phone) to reply, edit, copy, forward, react or delete it.",
          "Delete a message for yourself only or for everyone in the chat.",
          "Unsent text is kept as a draft for each chat while the tab is open.",
          "Use Search in chat from the chat header to find older messages.",
        ],
      },
      {
        id: "groups",
        title: "Groups",
        steps: [
          "Open your profile and choose Create Group, then add participants.",
          "Owners and admins can rename the group, change its avatar and description, and add or remove participants.",
          "Open a message's read status to see who has already read it.",
          "To leave a group you own, transfer ownership to another participant first.",
        ],
      },
      {
        id: "profile",
        title: "Profile and privacy",
        steps: [
          "Open your profile from the chat list to change your photo, display name and bio.",
          "In Privacy choose who can message you, invite you to groups, see your avatar, bio and online status, and find you in search.",
          "Block a user from their profile. Blocked users cannot message you or invite you to groups.",
          "Switch the app language in your profile settings.",
        ],
      },
      {
        id: "recovery",
        title: "Forgot your password",
        steps: [
          "On the sign-in screen choose Forgot Password? and select your username.",
          "Enter the recovery part saved on this device, or scan or upload the QR code you saved at registration.",
          "Set a new password and sign in again.",
        ],
      },
      {
        id: "install",
        title: "Install the app",
        steps: [
          "On a computer or Android phone use the browser's Install app option.",
          "On iPhone or iPad open the site in Safari, tap Share and then Add to Home Screen.",
          "When a new version is available the app tells you; press Reload to update.",
        ],
      },
    ],
    upcomingTitle: "Upcoming features",
    upcomingIntro: "We are working on these. Plans can change, so there are no dates yet.",
    upcoming: [
      { id: "notifications", title: "Notifications", description: "Push notifications and per-chat notification settings, including mute." },
      { id: "email-recovery", title: "Password reset by email", description: "An optional way to recover your account without the QR code." },
      { id: "mobile-apps", title: "Mobile apps", description: "Android and iOS apps in the app stores." },
    ],
    whatsNewTitle: "What's new",
    whatsNewIntro: "Changes in the latest versions of the app.",
    version: "Version {version}",
    changeKinds: { features: "New", fixes: "Fixed", performance: "Faster" },
  },
};
