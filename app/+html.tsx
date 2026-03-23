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
        <meta name="description" content="Pflanzendiagnose – Foto machen, Diagnose erhalten, Pflanze retten." />
        {/* Open Graph */}
        <meta property="og:title" content="LeafScan – Pflanzendiagnose" />
        <meta
          property="og:description"
          content="Foto machen, Diagnose erhalten, Pflanze retten. Pflanzenanalyse in Sekunden."
        />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="/assets/icon.png" />
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="LeafScan – Pflanzendiagnose" />
        <meta name="twitter:description" content="Foto machen, Diagnose erhalten, Pflanze retten." />
        <link rel="apple-touch-icon" href="/assets/icon.png" />
        <ScrollViewStyleReset />
        {/* Service worker registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
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
      <body>{children}</body>
    </html>
  );
}
