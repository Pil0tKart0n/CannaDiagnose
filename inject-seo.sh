#!/bin/sh
# Inject SEO meta tags into dist/index.html after Expo build

FILE="dist/index.html"

# Replace minimal <title> with full SEO head
sed -i 's|<title>LeafScan</title>|<title>LeafScan — KI-Pflanzendiagnose fuer Cannabis</title>|' "$FILE"

# Build the meta tags block
META_BLOCK='
    <!-- SEO Meta Tags -->
    <meta name="title" content="LeafScan — KI-Pflanzendiagnose fuer Cannabis" />
    <meta name="keywords" content="Cannabis Diagnose, Pflanzendiagnose, KI Pflanzenanalyse, Naehrstoffmangel erkennen, Cannabis Blaetter, Grow Hilfe, LeafScan, Pflanzenkrankheit, Cannabis Schaedlinge, Homegrow Tool" />
    <meta name="author" content="LeafScan" />
    <meta name="robots" content="index, follow" />
    <meta name="language" content="de" />
    <meta name="revisit-after" content="7 days" />
    <meta name="color-scheme" content="dark" />
    <meta name="msapplication-TileColor" content="#0A0E0D" />
    <!-- Canonical -->
    <link rel="canonical" href="https://leafscan.de/" />
    <!-- Open Graph -->
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
    <!-- Twitter Card -->
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content="https://leafscan.de/" />
    <meta name="twitter:title" content="LeafScan — KI-Pflanzendiagnose fuer Cannabis" />
    <meta name="twitter:description" content="Scanne dein Blatt per Foto und erhalte in Sekunden eine KI-Diagnose. Kostenlos, direkt im Browser." />
    <meta name="twitter:image" content="https://leafscan.de/icon-512.png" />
    <!-- Apple PWA -->
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
    <meta name="apple-mobile-web-app-title" content="LeafScan" />
    <link rel="apple-touch-icon" href="/icon-192.png" />
    <!-- Icons -->
    <link rel="manifest" href="/manifest.json" />
    <link rel="icon" type="image/png" sizes="512x512" href="/icon-512.png" />
    <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
    <!-- Structured Data -->
    <script type="application/ld+json">
    {"@context":"https://schema.org","@type":"WebApplication","name":"LeafScan","url":"https://leafscan.de","description":"KI-gestuetzte Pflanzendiagnose fuer Cannabis. Foto hochladen und in Sekunden erfahren was deiner Pflanze fehlt.","applicationCategory":"UtilitiesApplication","operatingSystem":"Web","browserRequirements":"Requires JavaScript","offers":{"@type":"Offer","price":"0","priceCurrency":"EUR","description":"1 kostenloser Scan pro Tag"},"creator":{"@type":"Organization","name":"LeafScan","url":"https://leafscan.de"},"featureList":["KI-Blattanalyse per Foto","Naehrstoffmangel-Erkennung","Schaedlings-Erkennung","Schimmel-Erkennung","Lichtbrand-Erkennung","Behandlungsempfehlungen"],"inLanguage":"de"}
    </script>'

# Inject after </title> line
sed -i "/<\/title>/a\\${META_BLOCK}" "$FILE"

# Update description to be more keyword-rich
sed -i 's|content="KI-gestützte Pflanzendiagnose – Foto machen, Probleme erkennen"|content="Scanne dein Blatt per Foto und erhalte in Sekunden eine KI-Diagnose: Naehrstoffmangel, Schaedlinge, Schimmel und mehr. Kostenlos im Browser."|' "$FILE"

# Update noscript to German
sed -i 's|You need to enable JavaScript to run this app.|Du brauchst JavaScript um LeafScan zu nutzen. Bitte aktiviere JavaScript in deinem Browser.|' "$FILE"

echo "SEO meta tags injected into $FILE"
