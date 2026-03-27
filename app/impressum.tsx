import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../constants/colors';

export default function ImpressumScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['bottom']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.title}>Impressum</Text>
        <Text style={styles.updated}>Angaben gemäß § 5 TMG</Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Verantwortlich</Text>
          <Text style={styles.tinyText}>Stefanie Bösche</Text>
          <Text style={styles.tinyText}>Klyro Labs</Text>
          <Text style={styles.tinyText}>Marris-Mühlenweg 2</Text>
          <Text style={styles.tinyText}>31303 Burgdorf</Text>
          <Text style={styles.tinyText}>{'\n'}E-Mail: leafscan@proton.me</Text>
        </View>

        <Section title="Haftung für Inhalte">
          Die Inhalte dieser App wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und
          Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen.{'\n\n'}
          Die über die App bereitgestellten Pflanzendiagnosen werden durch künstliche Intelligenz erstellt und dienen
          ausschließlich zu Informationszwecken. Sie stellen keine fachliche oder professionelle Beratung dar und
          ersetzen nicht die Einschätzung eines Fachmanns. Die Nutzung der bereitgestellten Informationen erfolgt
          auf eigene Verantwortung des Nutzers.
        </Section>

        <Section title="Haftung für Links">
          Diese App enthält keine Links zu externen Websites Dritter, auf deren Inhalte wir keinen Einfluss haben. Für
          die Inhalte der verlinkten Seiten ist stets der jeweilige Anbieter verantwortlich.
        </Section>

        <Section title="Urheberrecht">
          Die durch den Betreiber dieser App erstellten Inhalte und Werke unterliegen dem deutschen Urheberrecht. Die
          Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechts
          bedürfen der schriftlichen Zustimmung des Erstellers.
        </Section>

        <Section title="Streitbeilegung">
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:
          https://ec.europa.eu/consumers/odr{'\n\n'}
          Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
          teilzunehmen.
        </Section>

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
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 17,
  },
  spacer: { height: 40 },
});
