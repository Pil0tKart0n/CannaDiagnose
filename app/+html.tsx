import { ScrollViewStyleReset } from 'expo-router/html';

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        {/* PWA meta tags */}
        <meta name="theme-color" content="#4ADE80" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="LeafScan" />
        <meta name="description" content="LeafScan – KI-Diagnose fuer Cannabis. Foto machen, Naehrstoffmangel erkennen, Aktionsplan erhalten. 100+ Referenzen, kostenlos testen." />
        {/* Open Graph */}
        <meta property="og:title" content="LeafScan – KI-Diagnose fuer Cannabis" />
        <meta
          property="og:description"
          content="Deine Cannabispflanze zeigt Symptome? Foto machen, KI-Diagnose erhalten, Pflanze retten. 500+ Diagnosen erstellt."
        />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/assets/icon.png" />
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="LeafScan – KI-Diagnose fuer Cannabis" />
        <meta name="twitter:description" content="Deine Cannabispflanze zeigt Symptome? Foto machen, KI-Diagnose erhalten, Pflanze retten." />
        <link rel="apple-touch-icon" href="/assets/icon.png" />
        <ScrollViewStyleReset />
        {/* Service worker registration — deferred until cookie consent */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  var consent = localStorage.getItem('leafscan_cookie_consent');
                  if (consent === 'accepted') {
                    navigator.serviceWorker.register('/sw.js').catch(function() {});
                  }
                });
                window.addEventListener('leafscan-consent-accepted', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function() {});
                });
              }
            `,
          }}
        />
        {/* Global styles + desktop responsive container */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body, #root {
                height: 100%;
                margin: 0;
                padding: 0;
                background: #0A0E0D;
                overflow-x: hidden;
              }
              /* Landing page uses full width. Inner screens constrain themselves via React Native styles. */
              /* Hide scrollbar but keep scrolling */
              ::-webkit-scrollbar { width: 0; height: 0; }
              * { -webkit-tap-highlight-color: transparent; }
            `,
          }}
        />
      </head>
      <body>
        <noscript>
          <div style={{ background: '#080C0A', color: '#E4EBE6', fontFamily: 'system-ui, sans-serif', padding: '40px 24px', maxWidth: 600, margin: '0 auto', textAlign: 'center' as const }}>
            <h1 style={{ color: '#5CE892', fontSize: 32 }}>LeafScan</h1>
            <p style={{ fontSize: 16, lineHeight: 1.6, color: '#8A9B90' }}>
              KI-Diagnose fuer deine Cannabispflanze. Foto machen, Fragebogen beantworten, Diagnose mit Aktionsplan erhalten.
            </p>
            <ul style={{ textAlign: 'left' as const, color: '#8A9B90', lineHeight: 2 }}>
              <li>500+ Diagnosen erstellt</li>
              <li>40+ erkannte Probleme (Naehrstoffmangel, Schaedlinge, Krankheiten)</li>
              <li>100+ Eintraege in der Referenzbibliothek</li>
              <li>Kostenlose Diagnose taeglich</li>
            </ul>
            <p style={{ color: '#647069', fontSize: 14 }}>
              Bitte aktiviere JavaScript um LeafScan zu nutzen.
            </p>
          </div>
        </noscript>
        {children}
      </body>
    </html>
  );
}
