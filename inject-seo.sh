#!/bin/sh
# Inject SEO meta tags into dist/index.html after Expo build
FILE="dist/index.html"

# Create the SEO head content
cat > /tmp/seo-head.html << 'SEOEOF'
    <title>LeafScan — KI-Pflanzendiagnose fuer Cannabis</title>
    <meta name="title" content="LeafScan — KI-Pflanzendiagnose fuer Cannabis" />
    <meta name="description" content="Scanne dein Blatt per Foto und erhalte in Sekunden eine KI-Diagnose: Naehrstoffmangel, Schaedlinge, Schimmel und mehr. Kostenlos im Browser." />
    <meta name="keywords" content="Cannabis Diagnose, Pflanzendiagnose, KI Pflanzenanalyse, Naehrstoffmangel erkennen, Cannabis Blaetter, Grow Hilfe, LeafScan, Pflanzenkrankheit, Cannabis Schaedlinge, Homegrow Tool" />
    <meta name="author" content="LeafScan" />
    <meta name="robots" content="index, follow" />
    <meta name="language" content="de" />
    <meta name="revisit-after" content="7 days" />
    <meta name="color-scheme" content="dark" />
    <meta name="msapplication-TileColor" content="#0A0E0D" />
    <link rel="canonical" href="https://leafscan.de/" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="https://leafscan.de/" />
    <meta property="og:title" content="LeafScan — KI-Pflanzendiagnose fuer Cannabis" />
    <meta property="og:description" content="Foto machen, Diagnose erhalten, Pflanze retten. KI-gestuetzte Analyse erkennt Naehrstoffmangel, Schaedlinge und Krankheiten in Sekunden." />
    <meta property="og:image" content="https://leafscan.de/icon-512.png" />
    <meta property="og:image:width" content="512" />
    <meta property="og:image:height" content="512" />
    <meta property="og:image:alt" content="LeafScan Logo" />
    <meta property="og:locale" content="de_DE" />
    <meta property="og:site_name" content="LeafScan" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="https://leafscan.de/" />
    <meta name="twitter:title" content="LeafScan — KI-Pflanzendiagnose fuer Cannabis" />
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
    {"@context":"https://schema.org","@type":"WebApplication","name":"LeafScan","url":"https://leafscan.de","description":"KI-gestuetzte Pflanzendiagnose fuer Cannabis. Foto hochladen und in Sekunden erfahren was deiner Pflanze fehlt.","applicationCategory":"UtilitiesApplication","operatingSystem":"Web","offers":{"@type":"Offer","price":"0","priceCurrency":"EUR"},"creator":{"@type":"Organization","name":"LeafScan","url":"https://leafscan.de"},"featureList":["KI-Blattanalyse per Foto","Naehrstoffmangel-Erkennung","Schaedlings-Erkennung","Schimmel-Erkennung","Behandlungsempfehlungen"],"inLanguage":"de"}
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

# Fix noscript text
sed -i 's/You need to enable JavaScript to run this app./Du brauchst JavaScript um LeafScan zu nutzen. Bitte aktiviere JavaScript in deinem Browser./' "$FILE"

# Fix viewport to prevent auto-zoom on input focus (PWA scaling bug)
sed -i 's/width=device-width, initial-scale=1, shrink-to-fit=no/width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, shrink-to-fit=no/' "$FILE"

echo "SEO meta tags injected into $FILE"
