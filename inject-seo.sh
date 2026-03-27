#!/bin/sh
# Inject SEO meta tags into dist/index.html after Expo build
FILE="dist/index.html"

# Create the SEO head content
cat > /tmp/seo-head.html << 'SEOEOF'
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800&family=DM+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
    <title>LeafScan — Pflanzendiagnose fuer Cannabis</title>
    <meta name="title" content="LeafScan — Pflanzendiagnose fuer Cannabis" />
    <meta name="description" content="Scanne dein Blatt per Foto und erhalte in Sekunden eine Diagnose: Naehrstoffmangel, Schaedlinge, Schimmel und mehr. Kostenlos, direkt im Browser." />
    <meta name="keywords" content="Cannabis Diagnose, Pflanzendiagnose, Naehrstoffmangel erkennen, Cannabis Blaetter, Grow Hilfe, LeafScan, Pflanzenkrankheit, Cannabis Schaedlinge, Homegrow Tool" />
    <meta name="author" content="LeafScan" />
    <meta name="robots" content="index, follow" />
    <meta name="language" content="de" />
    <meta name="revisit-after" content="7 days" />
    <meta name="color-scheme" content="dark" />
    <meta name="msapplication-TileColor" content="#0A0E0D" />
    <link rel="canonical" href="https://leafscan.de/" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://leafscan.de/" />
    <meta property="og:title" content="LeafScan — Pflanzendiagnose fuer Cannabis" />
    <meta property="og:description" content="Foto machen, Diagnose erhalten, Pflanze retten. Erkennt Naehrstoffmangel, Schaedlinge und Krankheiten in Sekunden." />
    <meta property="og:image" content="https://leafscan.de/icon-512.png" />
    <meta property="og:image:width" content="512" />
    <meta property="og:image:height" content="512" />
    <meta property="og:image:alt" content="LeafScan Logo" />
    <meta property="og:locale" content="de_DE" />
    <meta property="og:site_name" content="LeafScan" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="https://leafscan.de/" />
    <meta name="twitter:title" content="LeafScan — Pflanzendiagnose fuer Cannabis" />
    <meta name="twitter:description" content="Scanne dein Blatt per Foto und erhalte in Sekunden eine KI-Diagnose. Kostenlos, direkt im Browser." />
    <meta name="twitter:image" content="https://leafscan.de/icon-512.png" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="LeafScan" />
    <link rel="apple-touch-icon" href="/icon-192.png" />
    <link rel="manifest" href="/manifest.json" />
    <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
    <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
    <script type="application/ld+json">
    {"@context":"https://schema.org","@type":"WebApplication","name":"LeafScan","url":"https://leafscan.de","description":"KI-Diagnose fuer Cannabis. Foto machen, Naehrstoffmangel erkennen, Aktionsplan erhalten. 500+ Diagnosen erstellt, 100+ Referenzen.","applicationCategory":"UtilitiesApplication","operatingSystem":"Web","offers":{"@type":"Offer","price":"0","priceCurrency":"EUR"},"creator":{"@type":"Organization","name":"LeafScan","url":"https://leafscan.de"},"featureList":["KI-Blattanalyse per Foto","Naehrstoffmangel-Erkennung","Schaedlings-Erkennung","Schimmel- und Pilz-Erkennung","Behandlungsempfehlungen mit Aktionsplan","pH/EC-basierte Diagnose-Verfeinerung","100+ Referenzbibliothek-Eintraege"],"inLanguage":"de"}
    </script>
SEOEOF

# Replace the <title> line and old description with the full SEO block
# Strategy: read file, replace <title>...</title> line with SEO block, write back
awk '
/<title>LeafScan<\/title>/{
  while((getline line < "/tmp/seo-head.html") > 0) print line
  next
}
/content="KI-gest/{next}
/content="KI-gest\xC3\xBCtzte/{next}
{print}
' "$FILE" > /tmp/index-seo.html

cp /tmp/index-seo.html "$FILE"

# Replace noscript with SEO-rich marketing content
sed -i 's|<noscript>You need to enable JavaScript to run this app.</noscript>|<noscript><div style="background:#080C0A;color:#E4EBE6;font-family:system-ui,sans-serif;padding:40px 24px;max-width:600px;margin:0 auto;text-align:center"><h1 style="color:#5CE892;font-size:32px">LeafScan</h1><p style="font-size:16px;line-height:1.6;color:#8A9B90">KI-Diagnose fuer deine Cannabispflanze. Foto machen, Fragebogen beantworten, Diagnose mit Aktionsplan erhalten.</p><ul style="text-align:left;color:#8A9B90;line-height:2"><li>500+ Diagnosen erstellt</li><li>40+ erkannte Probleme (Naehrstoffmangel, Schaedlinge, Krankheiten)</li><li>100+ Eintraege in der Referenzbibliothek</li><li>Kostenlose Diagnose taeglich</li></ul><p style="color:#647069;font-size:14px">Bitte aktiviere JavaScript um LeafScan zu nutzen.</p></div></noscript>|' "$FILE"

# Fix viewport to prevent auto-zoom on input focus (PWA scaling bug)
sed -i 's/width=device-width, initial-scale=1, shrink-to-fit=no/width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, shrink-to-fit=no/' "$FILE"

echo "SEO meta tags injected into $FILE"
