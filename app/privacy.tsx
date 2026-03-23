import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';

export default function PrivacyScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Datenschutzerklärung</Text>
        <Text style={styles.updated}>Stand: März 2026</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Verantwortlicher</Text>
          <Text style={styles.tinyText}>LeafScan App – Klyro Labs</Text>
          <Text style={styles.tinyText}>Kontakt: leafscan@proton.me</Text>
        </View>

        <Section title="2. Welche Daten werden verarbeitet?">
          <Bold>Fotos:</Bold> Die von dir aufgenommenen oder ausgewählten Pflanzenfotos werden zur Analyse an den
          API-Dienst OpenAI (USA) übermittelt. Zusätzlich wird das erste Foto jeder Diagnose auf unserem Server
          gespeichert, um die Diagnosequalität zu verbessern. Bei negativem Feedback werden alle zugehörigen Fotos
          serverseitig gespeichert.{'\n\n'}
          <Bold>Fragebogen-Daten:</Bold> Deine Angaben zu Anbaubedingungen (Substrat, pH, EC, Temperatur etc.) werden
          zusammen mit den Fotos an die API gesendet. Bei abgegebenem Feedback werden diese Daten zusammen mit dem
          Diagnoseergebnis auf unserem Server gespeichert.{'\n\n'}
          <Bold>Diagnoseergebnisse:</Bold> Das Ergebnis jeder Diagnose (Diagnosetext, Schweregrad, Konfidenz,
          Substrattyp) wird auf unserem Server gespeichert, um Statistiken und Qualitätssicherung zu ermöglichen.
          {'\n\n'}
          <Bold>IP-Adresse:</Bold> Deine IP-Adresse wird bei jeder Anfrage erfasst und für die Zugriffskontrolle
          (Tageslimit), Missbrauchsprävention und anonyme Nutzungsstatistiken verwendet.{'\n\n'}
          <Bold>Geräte-ID:</Bold> Bei der Einlösung von Promo-Codes wird eine anonyme Geräte-ID gespeichert, um
          Mehrfacheinlösungen zu verhindern.{'\n\n'}
          <Bold>Nutzungsstatistiken:</Bold> Anonyme Ereignisse (z.B. App-Start, Scan-Start, Feedback) werden zur
          Verbesserung der App erfasst. Dabei werden IP-Adresse, Plattform und Geräte-ID gespeichert.{'\n\n'}
          <Bold>API-Nutzung:</Bold> Pro Anfrage werden Token-Verbrauch, Modus, Plattform und Premium-Status zur
          Kostenkontrolle erfasst.{'\n\n'}
          <Bold>Lokale Speicherung:</Bold> Deine Diagnose-Historie, Pflanzenprofile und Einstellungen werden zusätzlich
          lokal auf deinem Gerät gespeichert (AsyncStorage).{'\n\n'}
          <Bold>Keine Registrierung:</Bold> Die App erfordert kein Nutzerkonto. Es werden keine E-Mail-Adressen, Namen
          oder persönlichen Daten erhoben.
        </Section>

        <Section title="3. Datenübermittlung an Dritte">
          Pflanzenfotos und Fragebogen-Daten werden zur Analyse an <Bold>OpenAI, L.L.C.</Bold> (San Francisco, USA)
          übermittelt. OpenAI verarbeitet die Daten gemäß ihrer eigenen Datenschutzrichtlinie. Die Übermittlung erfolgt
          verschlüsselt (TLS).{'\n\n'}
          Es werden keine Daten an Werbenetzwerke, Analysedienste oder sonstige Dritte übermittelt.
        </Section>

        <Section title="4. Zweck der Verarbeitung">
          Die Verarbeitung dient ausschließlich der KI-gestützten Pflanzendiagnose. Die Rechtsgrundlage ist Art. 6 Abs.
          1 lit. a DSGVO (Einwilligung durch Nutzung der App).
        </Section>

        <Section title="5. Speicherdauer">
          <Bold>IP-Adressen:</Bold> Werden nach 7 Tagen automatisch aus den Zugriffslogs gelöscht.{'\n\n'}
          <Bold>Diagnoseergebnisse:</Bold> Werden für maximal 90 Tage auf unserem Server gespeichert und danach
          automatisch gelöscht.{'\n\n'}
          <Bold>Feedback-Daten und Fotos:</Bold> Werden für maximal 90 Tage gespeichert, um die Diagnosequalität zu
          verbessern, und danach gelöscht.{'\n\n'}
          <Bold>API-Nutzungsdaten:</Bold> Werden für maximal 90 Tage zur Kostenkontrolle gespeichert.{'\n\n'}
          <Bold>OpenAI:</Bold> Speichert API-Anfragen gemäß ihrer Datenaufbewahrungsrichtlinie (derzeit max. 30 Tage).
          {'\n\n'}
          <Bold>Lokal:</Bold> Diagnose-Historie bleibt auf deinem Gerät bis du sie manuell löschst oder die App
          deinstallierst.
        </Section>

        <Section title="6. Deine Rechte">
          Du hast das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung deiner Daten (Art.
          15–18 DSGVO). Lokal gespeicherte Daten kannst du jederzeit durch Löschen der App-Daten oder Deinstallation der
          App entfernen.{'\n\n'}
          Für die Löschung serverseitig gespeicherter Daten (Diagnoseergebnisse, Feedback, Fotos) kontaktiere uns unter
          leafscan@proton.me. Wir werden deiner Anfrage innerhalb von 30 Tagen nachkommen.{'\n\n'}
          Du hast zudem das Recht, dich bei einer Aufsichtsbehörde zu beschweren (Art. 77 DSGVO). Die zuständige
          Aufsichtsbehörde findest du unter www.bfdi.bund.de.{'\n\n'}
          Bei Fragen: <Text style={styles.tinyText}>leafscan@proton.me</Text>
        </Section>

        <Section title="6a. Automatisierte Entscheidungsfindung">
          Die App verwendet künstliche Intelligenz (OpenAI) zur Analyse von Pflanzenfotos. Dies stellt eine
          automatisierte Verarbeitung dar. Die Ergebnisse sind rein informativ und haben keine rechtlichen oder ähnlich
          erheblichen Auswirkungen auf den Nutzer. Eine Überprüfung durch einen Menschen findet nicht statt – die
          Diagnosen dienen ausschließlich als Orientierungshilfe.
        </Section>

        <Section title="7. Zahlungsabwicklung">
          Premium-Abonnements werden über <Bold>Stripe, Inc.</Bold> (USA) abgewickelt. Zahlungsdaten (Kreditkartennummer
          etc.) werden ausschließlich von Stripe verarbeitet und sind für uns nicht einsehbar. Wir speichern lediglich
          eine anonyme Kunden-ID und Abonnement-ID zur Zuordnung deines Premium-Status. Stripes Datenschutzrichtlinie
          findest du unter stripe.com/privacy.
        </Section>

        <Section title="8. Internetverbindung">
          Die App benötigt eine aktive Internetverbindung für die Pflanzendiagnose. Ohne Internet können keine neuen
          Diagnosen erstellt werden. Die Bibliothek und gespeicherte Diagnosen sind offline verfügbar.
        </Section>

        <Section title="9. Kosten">
          Die App bietet eine kostenlose Diagnose pro Tag. Zusätzliche Diagnosen erfordern ein Premium-Upgrade. Es
          können Kosten für die mobile Datenverbindung durch deinen Mobilfunkanbieter anfallen.
        </Section>

        <Section title="10. Haftungsausschluss">
          LeafScan ist ein informatives Hilfsmittel und ersetzt KEINE professionelle Beratung durch Agrarwissenschaftler
          oder Pflanzenpathologien. Die Diagnosen werden durch künstliche Intelligenz erstellt und können fehlerhaft
          sein.{'\n\n'}
          Die Nutzung der App und die Umsetzung der Empfehlungen erfolgt auf eigene Verantwortung. Für Schäden, die
          durch fehlerhafte Diagnosen oder falsche Anwendung der Empfehlungen entstehen, wird keine Haftung übernommen.
          {'\n\n'}
          Der Nutzer ist selbst dafür verantwortlich, die geltenden Gesetze in seiner Rechtsordnung bezüglich des
          Pflanzenanbaus einzuhalten.
        </Section>

        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Bold({ children }: { children: string }) {
  return <Text style={styles.bold}>{children}</Text>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  updated: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 24,
  },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.accent,
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  bold: {
    fontWeight: '600',
    color: colors.text,
  },
  tinyText: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
  },
  spacer: { height: 40 },
});
