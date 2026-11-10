export const docs = {
  docsLink: "Hilfe und Doku",
  docs: {
    title: "Hilfe zum Messenger",
    subtitle: "Kurze Anleitungen für alltägliche Aufgaben, aktuelle Updates und was als Nächstes kommt.",
    backToApp: "Zurück zur App",
    stepsCount: "{count} Schritte",
    contents: "Inhalt",
    sections: [
      {
        id: "getting-started",
        title: "Konto erstellen",
        steps: [
          "Öffne die App und wähle Registrieren.",
          "Wähle einen Benutzernamen mit 3–32 Zeichen (Buchstaben, Ziffern und Unterstriche) und ein Passwort mit mindestens 8 Zeichen.",
          "Speichere den Wiederherstellungsschlüssel, der nach der Registrierung angezeigt wird, an einem sicheren Ort und bestätige dann, dass du ihn gespeichert hast. Du brauchst ihn, wenn du dein Passwort vergisst.",
        ],
      },
      {
        id: "chats",
        title: "Einen Chat starten",
        steps: [
          "Nutze die Suche oben in der Chatliste, um eine Person über ihren Benutzernamen zu finden.",
          "Öffne ihr Profil und tippe auf Nachricht, um einen Direktchat zu starten.",
          "Nimmt die Person Nachrichten erst nach Bestätigung an, wartet deine erste Nachricht in ihren Anfragen, bis sie sie annimmt.",
        ],
      },
      {
        id: "messages",
        title: "Mit Nachrichten arbeiten",
        steps: [
          "Hänge Fotos, Sprachnachrichten und Dateien neben dem Nachrichtenfeld an.",
          "Klicke mit der rechten Maustaste auf eine Nachricht (oder halte sie auf dem Handy gedrückt), um zu antworten, sie zu bearbeiten, zu kopieren, weiterzuleiten, darauf zu reagieren oder sie zu löschen.",
          "Lösche eine Nachricht nur für dich oder für alle im Chat.",
          "Nicht gesendeter Text bleibt für jeden Chat als Entwurf erhalten, solange der Tab geöffnet ist.",
          "Nutze Im Chat suchen in der Kopfzeile des Chats, um ältere Nachrichten zu finden.",
        ],
      },
      {
        id: "groups",
        title: "Gruppen",
        steps: [
          "Öffne dein Profil, wähle Gruppe erstellen und füge dann Teilnehmer hinzu.",
          "Inhaber und Admins können die Gruppe umbenennen, Avatar und Beschreibung ändern sowie Teilnehmer hinzufügen oder entfernen.",
          "Öffne den Lesestatus einer Nachricht, um zu sehen, wer sie schon gelesen hat.",
          "Um eine Gruppe zu verlassen, die dir gehört, übertrage zuerst die Inhaberschaft an einen anderen Teilnehmer.",
        ],
      },
      {
        id: "profile",
        title: "Profil und Datenschutz",
        steps: [
          "Öffne dein Profil über die Chatliste, um Foto, Anzeigenamen und Bio zu ändern.",
          "Lege unter Datenschutz fest, wer dir schreiben, dich zu Gruppen einladen, deinen Avatar, deine Bio und deinen Online-Status sehen und dich in der Suche finden kann.",
          "Blockiere einen Benutzer über sein Profil. Blockierte Benutzer können dir nicht schreiben und dich nicht zu Gruppen einladen.",
          "Ändere die Sprache der App in deinen Profileinstellungen.",
        ],
      },
      {
        id: "recovery",
        title: "Passwort vergessen",
        steps: [
          "Wähle auf dem Anmeldebildschirm Passwort vergessen? und dann deinen Benutzernamen.",
          "Gib deinen gespeicherten Wiederherstellungsschlüssel und ein neues Passwort ein. Ist die Zwei-Faktor-Authentifizierung aktiviert, gib auch einen Code aus der Authenticator-App oder einen Backup-Code ein.",
          "Speichere den neuen Wiederherstellungsschlüssel, bevor du weitermachst. Der alte Schlüssel funktioniert dann nicht mehr, und deine anderen Sitzungen werden abgemeldet.",
          "Änderungen an Sicherheitsmethoden sind nach einer Wiederherstellung 24 Stunden lang eingeschränkt. Alte Wiederherstellungsteile und QR-Teile können den Wiederherstellungsschlüssel nicht ersetzen.",
        ],
      },
      {
        id: "security",
        title: "Konto schützen",
        steps: [
          "Öffne Sicherheit und Geräte in deinem Profil, um die Zwei-Faktor-Authentifizierung zu verwalten und angemeldete Sitzungen zu prüfen.",
          "Hat dein Konto noch keinen Wiederherstellungsschlüssel, erstelle einen, solange du dein Passwort noch kennst. Gib bei Bedarf einen Code aus der Authenticator-App oder einen Backup-Code ein.",
          "Speichere jeden neuen Wiederherstellungsschlüssel sofort. Ein neuer Schlüssel macht den vorherigen ungültig.",
          "Melde Sitzungen ab, die du nicht mehr nutzt. Bewahre die Backup-Codes der Authenticator-App getrennt von deinem Wiederherstellungsschlüssel auf.",
        ],
      },
      {
        id: "notifications",
        title: "Benachrichtigungen zu Nachrichten",
        steps: [
          "Öffne Benachrichtigungen in deinem Profil, um Hinweise, Ton und Nachrichtenvorschau zu verwalten.",
          "Aktiviere dort Browser-Benachrichtigungen und erlaube die Abfrage des Browsers, wenn du Hinweise im Hintergrund möchtest.",
          "Schalte einzelne Chats stumm, wenn du keine Hinweise möchtest. Auch Browser- oder Geräteeinstellungen können Benachrichtigungen blockieren.",
        ],
      },
      {
        id: "install",
        title: "App installieren",
        steps: [
          "Nutze auf einem Computer oder Android-Handy die Option App installieren im Browser.",
          "Öffne die Seite auf dem iPhone oder iPad in Safari, tippe auf Teilen und dann auf Zum Home-Bildschirm.",
          "Wenn eine neue Version verfügbar ist, sagt dir die App Bescheid; tippe auf Neu laden, um zu aktualisieren.",
        ],
      },
    ],
    upcomingTitle: "Geplante Funktionen",
    upcomingIntro: "Daran arbeiten wir gerade. Pläne können sich ändern, deshalb gibt es noch keine Termine.",
    upcoming: [
      { id: "search", title: "Suche", description: "Finde Nachrichten in allen Chats und Personen über ihren Namen, mit hervorgehobenen Treffern." },
      { id: "attachments", title: "Bessere Upload-Steuerung", description: "Mehr Möglichkeiten, Datei-Uploads abzubrechen und erneut zu versuchen." },
      { id: "passkeys", title: "Mit Passkey anmelden", description: "Nutze Face ID, einen Fingerabdruck, Windows Hello oder einen Sicherheitsschlüssel statt eines Passworts." },
      { id: "device-approval", title: "Wiederherstellung auf einem anderen Gerät bestätigen", description: "Setze dein Passwort zurück, indem du die Anfrage auf einem Gerät bestätigst, auf dem du noch angemeldet bist." },
      { id: "email-recovery", title: "Wiederherstellungs-E-Mail", description: "Füge optional eine E-Mail-Adresse hinzu, die nur zur Wiederherstellung deines Kontos und für Warnungen zu Sicherheitsänderungen genutzt wird." },
      { id: "security-settings", title: "Verlauf der Sicherheitsaktivitäten", description: "Sieh dir aktuelle Anmeldungen und Sicherheitsänderungen an einem Ort an." },
    ],
    whatsNewTitle: "Neuigkeiten",
    whatsNewIntro: "Änderungen in den neuesten Versionen der App.",
    version: "Version {version}",
    changeKinds: { features: "Neu", fixes: "Behoben", performance: "Schneller" },
  },
};
