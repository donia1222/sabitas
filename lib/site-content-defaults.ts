// Single source of truth for editable site content (footer legal modals + hero).
// The live components use these as defaults and overlay any values saved in the DB
// (via /api/site-settings). The admin "Inhalte" tab pre-fills its form with these.

export type LegalEntry = { title: string; content: string }

export const FOOTER_MODAL_KEYS = [
  "rueckgabe",
  "zahlungsarten",
  "cookies",
  "ueberuns",
  "impressum",
  "datenschutz",
  "agb",
] as const

export type FooterModalKey = (typeof FOOTER_MODAL_KEYS)[number]

export const FOOTER_LEGAL_DEFAULTS: Record<FooterModalKey, LegalEntry> = {
  rueckgabe: {
    title: "Versand & Rückgabe",
    content: `Sabitas | [Adresse ergänzen] | hallo@sabitas.ch | WhatsApp 078 613 80 84

1. BESTELLUNG
Bestellt wird über WhatsApp. Leg dir im Shop zusammen, was dir gefällt, und schick mir den Warenkorb – ich melde mich mit Verfügbarkeit, Versandkosten und allem Weiteren.

2. VERSAND
Ich verschicke innerhalb der Schweiz. Da jedes Stück von Hand genäht wird, sage ich dir bei der Bestätigung, wann dein Stück fertig ist. Lagerware geht meist innerhalb von 1–3 Werktagen raus.

3. RÜCKGABE
Gefällt dir etwas nicht, melde dich einfach innerhalb von 14 Tagen nach Erhalt. Die Ware sollte ungetragen und unbenutzt sein.

4. AUSNAHMEN
Von der Rückgabe ausgenommen sind Stücke, die ich auf deinen Wunsch hin angefertigt habe – Sonderanfertigungen, Wunschstoffe oder personalisierte Arbeiten.

5. RÜCKSENDUNG
Bitte schreib mir vorher kurz, dann kläre ich mit dir die Adresse. Die Rücksendekosten trägst du; schick das Paket am besten versichert.

6. ERSTATTUNG
Nach Erhalt und Prüfung erstatte ich dir den Betrag auf demselben Weg zurück, auf dem du bezahlt hast.

7. BESCHÄDIGTE LIEFERUNG
Sollte etwas beschädigt ankommen, melde dich sofort bei mir. Dann übernehme ich die Rücksendekosten und wir finden eine Lösung.`,
  },
  zahlungsarten: {
    title: "Bezahlen",
    content: `Sabitas | [Adresse ergänzen] | hallo@sabitas.ch | WhatsApp 078 613 80 84

Aktuell läuft alles persönlich über WhatsApp.

So funktioniert es
Du legst dir im Shop zusammen, was dir gefällt, und schickst mir den Warenkorb per WhatsApp. Ich bestätige dir Verfügbarkeit und Gesamtpreis inklusive Versand, und wir vereinbaren direkt, wie du bezahlen möchtest – zum Beispiel per TWINT oder Banküberweisung.

Warum nicht direkt im Shop bezahlen?
Weil jedes Stück ein Unikat ist und ich lieber kurz mit dir spreche, bevor ich etwas verschicke. So weisst du genau, was du bekommst, und ich kann auf Wünsche eingehen.

Hinweise
— Alle Preise verstehen sich in Schweizer Franken (CHF).
— Bei Fragen schreib mir einfach: hallo@sabitas.ch oder WhatsApp 078 613 80 84.`,
  },
  cookies: {
    title: "Cookies",
    content: `Sabitas | [Adresse ergänzen] | hallo@sabitas.ch | WhatsApp 078 613 80 84

Was sind Cookies?
Cookies sind kleine Textdateien, die beim Besuch dieser Website auf deinem Gerät gespeichert werden.

Technisch notwendige Cookies
Diese sind für den Betrieb der Seite nötig – zum Beispiel, damit dein Warenkorb beim Weiterklicken erhalten bleibt. Sie lassen sich nicht abschalten.

Funktionale Cookies
Merken sich Kleinigkeiten wie zuletzt angesehene Stücke. Du kannst sie abschalten; dann ist die Seite etwas weniger bequem.

Analyse-Cookies
Ich setze keine Analyse-Dienste wie Google Analytics ohne deine ausdrückliche Einwilligung ein.

Deine Rechte
Nach Schweizer DSG und EU-DSGVO kannst du Cookies jederzeit ablehnen oder löschen – über die Einstellungen deines Browsers:
— Chrome: Einstellungen → Datenschutz → Cookies
— Firefox: Einstellungen → Datenschutz → Cookies
— Safari: Einstellungen → Datenschutz → Cookies verwalten

Fragen? hallo@sabitas.ch`,
  },
  ueberuns: {
    title: "Über mich",
    content: `Sabitas
Handgemachte Unikate aus der Schweiz

Hallo, ich bin Sabitas
Mit Nadel, Faden und einer grossen Portion Fantasie verwandle ich Stoffe und Ideen in kleine Kunstwerke. Was als Hobby begann, ist heute meine grösste Leidenschaft.

Was ich mache
Jede Tasche, jeder Hoodie und jedes Deko-Stück entsteht bei mir zu Hause in der Schweiz – in Handarbeit, mit Liebe zum Detail und dem Wunsch, dir ein Lächeln zu schenken.

Woraus
Am liebsten aus geliebtem Jeansstoff, der ein zweites Leben bekommt, kombiniert mit Blumenstoffen und warmen Farben. Aus Alt wird Neu, und kein Stück gleicht dem anderen.

Du hast einen besonderen Wunsch?
Schreib mir – ich fertige auch gerne ganz nach deinen Vorstellungen.

~ alles handgemacht, alles mit Herz ♡

Sabitas | [Adresse ergänzen] | hallo@sabitas.ch | WhatsApp 078 613 80 84`,
  },
  impressum: {
    title: "Impressum",
    content: `Angaben gemäss Schweizer Recht (OR Art. 944)

BETREIBERIN
Sabitas
[Adresse ergänzen]
Schweiz

INHABERIN
[Vor- und Nachname ergänzen]

KONTAKT
WhatsApp: 078 613 80 84
E-Mail: hallo@sabitas.ch
Website: www.sabitas.ch

UNTERNEHMENSFORM
Einzelunternehmen / Kleinunternehmen nach Schweizer Recht

MEHRWERTSTEUER
Alle Preise verstehen sich in CHF. [Angabe zur MwSt. ergänzen, falls mehrwertsteuerpflichtig.]

VERANTWORTLICH FÜR DEN INHALT
Sabitas, [Adresse ergänzen]

WEBDESIGN & UMSETZUNG
lweb.ch – Webdesign & Digitalagentur
Website: https://lweb.ch

HAFTUNGSAUSSCHLUSS
Trotz sorgfältiger inhaltlicher Kontrolle übernehme ich keine Haftung für die Inhalte externer Links. Für den Inhalt verlinkter Seiten sind ausschliesslich deren Betreiber verantwortlich. Alle Inhalte dieser Website sind urheberrechtlich geschützt.

ANWENDBARES RECHT
Es gilt ausschliesslich Schweizer Recht.`,
  },
  datenschutz: {
    title: "Datenschutzerklärung",
    content: `Sabitas | [Adresse ergänzen] | hallo@sabitas.ch | WhatsApp 078 613 80 84

Diese Erklärung informiert dich nach dem Schweizer Datenschutzgesetz (DSG) und der EU-DSGVO darüber, was mit deinen Daten passiert.

1. VERANTWORTLICHE STELLE
Sabitas, [Adresse ergänzen], Schweiz
E-Mail: hallo@sabitas.ch

2. WELCHE DATEN
Wenn du mir über WhatsApp oder E-Mail schreibst, erhalte ich die Angaben, die du mir selbst schickst – zum Beispiel Name, Telefonnummer und Lieferadresse. Beim Besuch der Website werden technische Daten wie IP-Adresse und Browsertyp automatisch erfasst.

3. WOZU
Ausschliesslich, um deine Anfrage zu beantworten, deine Bestellung abzuwickeln und dir dein Stück zu schicken.

4. RECHTSGRUNDLAGE
Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO) und berechtigtes Interesse an einem sicheren Betrieb der Website (lit. f).

5. WEITERGABE
Deine Daten gebe ich nur weiter, soweit es für die Lieferung nötig ist – etwa an die Post. Weitergabe zu Werbezwecken findet nicht statt.

6. SICHERHEIT
Die Website ist mit SSL/TLS verschlüsselt.

7. SPEICHERDAUER
Nur so lange wie nötig oder wie gesetzlich vorgeschrieben.

8. DEINE RECHTE
Auskunft, Berichtigung, Löschung, Einschränkung und Datenübertragbarkeit. Schreib mir an hallo@sabitas.ch.

9. COOKIES
Nur technisch notwendige Cookies. Analyse- oder Marketing-Cookies nur mit deiner Einwilligung.`,
  },
  agb: {
    title: "Allgemeine Geschäftsbedingungen (AGB)",
    content: `Sabitas | [Adresse ergänzen] | hallo@sabitas.ch | WhatsApp 078 613 80 84

1. GELTUNGSBEREICH
Diese Bedingungen gelten für alle Bestellungen, die über sabitas.ch angefragt und per WhatsApp abgeschlossen werden.

2. VERTRAGSSCHLUSS
Die Darstellung der Stücke im Shop ist eine unverbindliche Einladung zur Anfrage. Der Vertrag kommt erst zustande, wenn ich dir die Bestellung per WhatsApp oder E-Mail bestätige. Da jedes Stück ein Unikat ist, kann es sein, dass ein Stück bereits vergeben ist.

3. UNIKATE
Alle Stücke sind handgemacht. Kleine Abweichungen in Farbe, Stoffmuster und Grösse gegenüber den Fotos sind keine Mängel, sondern gehören zur Handarbeit dazu.

4. PREISE UND ZAHLUNG
Alle Preise in Schweizer Franken (CHF). Versandkosten werden bei der Bestätigung genannt. Die Zahlungsart vereinbaren wir direkt.

5. LIEFERUNG
Innerhalb der Schweiz. Die Lieferzeit nenne ich dir bei der Bestätigung, da manche Stücke erst genäht werden.

6. RÜCKGABE
14 Tage ab Erhalt, in ungetragenem Zustand. Ausgenommen sind Sonderanfertigungen nach deinen Wünschen.

7. GEWÄHRLEISTUNG
Es gelten die gesetzlichen Rechte nach Schweizer OR.

8. ANWENDBARES RECHT
Schweizer Recht. Gerichtsstand ist [Ort ergänzen].`,
  },
}

export const HERO_IMAGE_DEFAULTS = [
  "/sabitas/bolso-vaquero.jpg",
  "/sabitas/sudadera-rosa.jpg",
  "/sabitas/cojin-corazon.jpg",
]

export const HERO_DEFAULTS = {
  badges: [
    "Handgemacht",
    "Jedes Stück ein Unikat",
    "Aus der Schweiz",
    "Mit Liebe genäht",
  ],
  titleLine1: "Einzigartige Stücke,",
  titleLine2: "von Hand gemacht",
  subtitle: "Taschen aus geliebtem Jeansstoff, kuschelige Hoodies und liebevolle Deko –\njedes Stück ein Unikat, mit viel Herz für dich gefertigt.",
  stats: [
    { val: "100 %", label: "Handarbeit" },
    { val: "Unikate", label: "Kein Stück gleicht dem anderen" },
    { val: "Schweiz", label: "Hier entworfen und genäht" },
  ],
}
