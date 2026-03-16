import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';

export default function TermsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Nutzungsbedingungen</Text>
        <Text style={styles.updated}>Stand: März 2026</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Geltungsbereich</Text>
          <Text style={styles.sectionText}>
            Diese Nutzungsbedingungen gelten für die Nutzung der App „LeafScan" (nachfolgend „App")
            von <Text style={styles.tinyText}>Klyro Labs</Text> (nachfolgend „Anbieter"). Mit der Nutzung der App akzeptierst du
            diese Bedingungen.
          </Text>
        </View>

        <Section title="2. Leistungsbeschreibung">
          Die App bietet eine KI-gestützte Pflanzendiagnose für Cannabis an. Nutzer können
          Fotos ihrer Pflanzen hochladen und erhalten eine automatisierte Analyse möglicher
          Probleme mit Handlungsempfehlungen.{'\n\n'}
          Die kostenlose Version umfasst 1 Diagnose pro Tag. Erweiterte Funktionen sind über
          ein kostenpflichtiges Abonnement verfügbar.
        </Section>

        <Section title="3. Keine professionelle Beratung">
          Die Diagnosen werden durch künstliche Intelligenz erstellt und können fehlerhaft sein.
          Die App ersetzt KEINE professionelle Beratung durch Agrarwissenschaftler, Botaniker
          oder andere Fachleute.{'\n\n'}
          Der Nutzer handelt auf eigene Verantwortung, wenn er Empfehlungen der App umsetzt.
        </Section>

        <Section title="4. Abonnements und Bezahlung">
          Premium-Abonnements werden über den jeweiligen App Store (Google Play / Apple App Store)
          abgerechnet. Es gelten die Zahlungsbedingungen des jeweiligen Stores.{'\n\n'}
          Abonnements verlängern sich automatisch, sofern sie nicht mindestens 24 Stunden vor
          Ablauf des aktuellen Zeitraums gekündigt werden.{'\n\n'}
          Die Kündigung erfolgt über die Abo-Verwaltung des jeweiligen App Stores. Eine Kündigung
          über die App selbst ist nicht möglich.
        </Section>

        <Section title="5. Nutzerpflichten">
          Der Nutzer verpflichtet sich:{'\n\n'}
          • Die App nur für legale Zwecke zu nutzen{'\n'}
          • Keine missbräuchliche oder übermäßige Nutzung der API-Dienste{'\n'}
          • Keine Manipulation der App oder Umgehung von Nutzungsbeschränkungen{'\n'}
          • Die geltenden Gesetze bezüglich des Anbaus von Cannabis in seiner
          Rechtsordnung einzuhalten
        </Section>

        <Section title="6. Geistiges Eigentum">
          Alle Inhalte der App (Design, Texte, Code, Bibliothekseinträge) sind urheberrechtlich
          geschützt. Die vom Nutzer erstellten Diagnosen und hochgeladenen Fotos verbleiben im
          Eigentum des Nutzers.
        </Section>

        <Section title="7. Haftungsbeschränkung">
          Der Anbieter haftet nicht für:{'\n\n'}
          • Schäden durch fehlerhafte KI-Diagnosen{'\n'}
          • Ernteverluste oder Pflanzenschäden durch Befolgung der Empfehlungen{'\n'}
          • Datenverlust auf dem Gerät des Nutzers{'\n'}
          • Ausfälle oder Nichtverfügbarkeit der API-Dienste{'\n\n'}
          Dies gilt nicht bei Vorsatz oder grober Fahrlässigkeit.
        </Section>

        <Section title="8. Verfügbarkeit">
          Der Anbieter bemüht sich um eine hohe Verfügbarkeit der App, kann aber keine
          ununterbrochene Verfügbarkeit garantieren. Wartungsarbeiten und Updates können
          zu vorübergehenden Einschränkungen führen.
        </Section>

        <Section title="9. Änderungen der Nutzungsbedingungen">
          Der Anbieter behält sich vor, diese Nutzungsbedingungen jederzeit zu ändern.
          Über wesentliche Änderungen wird in der App informiert. Die fortgesetzte Nutzung
          nach Änderung gilt als Zustimmung.
        </Section>

        <Section title="10. Anwendbares Recht">
          Es gilt das Recht der Bundesrepublik Deutschland. Gerichtsstand ist, soweit
          gesetzlich zulässig, der Sitz des Anbieters.
        </Section>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Kontakt</Text>
          <Text style={styles.tinyText}>Bei Fragen zu diesen Nutzungsbedingungen:</Text>
          <Text style={styles.tinyText}>leafscan@proton.me</Text>
        </View>

        <View style={styles.spacer} />
      </ScrollView>
    </SafeAreaView>
  );
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
  tinyText: {
    fontSize: 9,
    color: colors.textMuted,
    lineHeight: 14,
  },
  spacer: { height: 40 },
});
