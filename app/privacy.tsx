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
          <Bold>Fotos:</Bold> Die von dir aufgenommenen oder ausgewählten Pflanzenfotos werden
          zur Analyse an den API-Dienst OpenAI (USA) übermittelt. Die Bilder werden ausschließlich
          für die Diagnose verwendet und NICHT dauerhaft auf unseren Servern gespeichert.{'\n\n'}
          <Bold>Fragebogen-Daten:</Bold> Deine Angaben zu Anbaubedingungen (Substrat, pH, EC,
          Temperatur etc.) werden zusammen mit den Fotos an die API gesendet und danach NICHT
          gespeichert.{'\n\n'}
          <Bold>Lokale Speicherung:</Bold> Deine Diagnose-Historie, Pflanzenprofile und Einstellungen
          werden ausschließlich lokal auf deinem Gerät gespeichert (AsyncStorage). Diese Daten
          verlassen dein Gerät nicht.{'\n\n'}
          <Bold>Keine Registrierung:</Bold> Die App erfordert kein Nutzerkonto. Es werden keine
          E-Mail-Adressen, Namen oder persönlichen Daten erhoben.
        </Section>

        <Section title="3. Datenübermittlung an Dritte">
          Pflanzenfotos und Fragebogen-Daten werden zur Analyse an <Bold>OpenAI, L.L.C.</Bold> (San Francisco, USA)
          übermittelt. OpenAI verarbeitet die Daten gemäß ihrer eigenen Datenschutzrichtlinie.
          Die Übermittlung erfolgt verschlüsselt (TLS).{'\n\n'}
          Es werden keine Daten an Werbenetzwerke, Analysedienste oder sonstige Dritte übermittelt.
        </Section>

        <Section title="4. Zweck der Verarbeitung">
          Die Verarbeitung dient ausschließlich der KI-gestützten Pflanzendiagnose.
          Die Rechtsgrundlage ist Art. 6 Abs. 1 lit. a DSGVO (Einwilligung durch Nutzung der App).
        </Section>

        <Section title="5. Speicherdauer">
          <Bold>API-seitig:</Bold> Fotos und Fragebogen-Daten werden nach der Analyse nicht
          auf unseren Systemen gespeichert. OpenAI speichert API-Anfragen gemäß ihrer
          Datenaufbewahrungsrichtlinie (derzeit max. 30 Tage).{'\n\n'}
          <Bold>Lokal:</Bold> Diagnose-Historie bleibt auf deinem Gerät bis du sie manuell
          löschst oder die App deinstallierst.
        </Section>

        <Section title="6. Deine Rechte">
          Du hast das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der
          Verarbeitung deiner Daten (Art. 15–18 DSGVO). Da alle personenbezogenen Daten
          lokal gespeichert werden, kannst du diese jederzeit durch Löschen der App-Daten
          oder Deinstallation der App vollständig entfernen.{'\n\n'}
          Du hast zudem das Recht, dich bei einer Aufsichtsbehörde zu beschweren
          (Art. 77 DSGVO). Die zuständige Aufsichtsbehörde findest du unter
          www.bfdi.bund.de.{'\n\n'}
          Bei Fragen: <Text style={styles.tinyText}>leafscan@proton.me</Text>
        </Section>

        <Section title="6a. Automatisierte Entscheidungsfindung">
          Die App verwendet künstliche Intelligenz (OpenAI) zur Analyse von Pflanzenfotos.
          Dies stellt eine automatisierte Verarbeitung dar. Die Ergebnisse sind rein
          informativ und haben keine rechtlichen oder ähnlich erheblichen Auswirkungen
          auf den Nutzer. Eine Überprüfung durch einen Menschen findet nicht statt –
          die Diagnosen dienen ausschließlich als Orientierungshilfe.
        </Section>

        <Section title="7. Internetverbindung">
          Die App benötigt eine aktive Internetverbindung für die Pflanzendiagnose.
          Ohne Internet können keine neuen Diagnosen erstellt werden. Die Bibliothek
          und gespeicherte Diagnosen sind offline verfügbar.
        </Section>

        <Section title="8. Kosten">
          Die App bietet eine kostenlose Diagnose pro Tag. Zusätzliche Diagnosen
          erfordern ein Premium-Upgrade. Es können Kosten für die mobile Datenverbindung
          durch deinen Mobilfunkanbieter anfallen.
        </Section>

        <Section title="9. Haftungsausschluss">
          LeafScan ist ein informatives Hilfsmittel und ersetzt KEINE professionelle
          Beratung durch Agrarwissenschaftler oder Pflanzenpathologien. Die Diagnosen
          werden durch künstliche Intelligenz erstellt und können fehlerhaft sein.{'\n\n'}
          Die Nutzung der App und die Umsetzung der Empfehlungen erfolgt auf eigene
          Verantwortung. Für Schäden, die durch fehlerhafte Diagnosen oder falsche
          Anwendung der Empfehlungen entstehen, wird keine Haftung übernommen.{'\n\n'}
          Der Nutzer ist selbst dafür verantwortlich, die geltenden Gesetze in seiner
          Rechtsordnung bezüglich des Pflanzenanbaus einzuhalten.
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
    fontSize: 9,
    color: colors.textMuted,
    lineHeight: 14,
  },
  spacer: { height: 40 },
});
