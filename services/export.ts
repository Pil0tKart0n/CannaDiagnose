import { Platform } from 'react-native';
import { DiagnosisResult, Severity } from '../types';
import { readAsBase64 } from './fileSystemWeb';

// expo-print and expo-sharing are not available in Expo Go
// Use require() so the app doesn't crash on startup if unavailable
function getPrint(): typeof import('expo-print') {
  try {
    return require('expo-print');
  } catch {
    throw new Error('PDF-Export ist in Expo Go nicht verfügbar. Verwende einen Development Build.');
  }
}

function getSharing(): typeof import('expo-sharing') {
  try {
    return require('expo-sharing');
  } catch {
    throw new Error('Teilen ist in Expo Go nicht verfügbar. Verwende einen Development Build.');
  }
}

const severityColors: Record<Severity, string> = {
  niedrig: '#4ADE80',
  mittel: '#FBBF24',
  hoch: '#FB923C',
  kritisch: '#F87171',
};

const severityLabels: Record<Severity, string> = {
  niedrig: 'Niedrig',
  mittel: 'Mittel',
  hoch: 'Hoch',
  kritisch: 'Kritisch',
};

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function buildImageSection(imageBase64?: string): string {
  if (!imageBase64) return '';
  return `
    <div class="photo-section">
      <img src="${imageBase64}" alt="Pflanzenfoto" />
    </div>
  `;
}

function buildFactorsSection(factors: DiagnosisResult['contributingFactors']): string {
  if (!factors || factors.length === 0) return '';
  const items = factors
    .map(
      (f) => `
      <div class="factor-row">
        <div class="factor-dot"></div>
        <div class="factor-content">
          <strong>${escapeHtml(f.factor)}</strong>
          <span>${escapeHtml(f.impact)}</span>
        </div>
      </div>`,
    )
    .join('');

  return `
    <div class="section">
      <h2>Beitragende Faktoren</h2>
      ${items}
    </div>
  `;
}

function buildActionPlanSection(steps: DiagnosisResult['actionPlan']): string {
  if (!steps || steps.length === 0) return '';
  const items = steps
    .map(
      (s) => `
      <div class="step-row">
        <div class="step-number">${s.priority}</div>
        <div class="step-content">
          <strong>${escapeHtml(s.action)}</strong>
          <span>${escapeHtml(s.details)}</span>
        </div>
      </div>`,
    )
    .join('');

  return `
    <div class="section">
      <h2>Aktionsplan</h2>
      ${items}
    </div>
  `;
}

function buildTipsSection(tips: DiagnosisResult['preventiveTips']): string {
  if (!tips || tips.length === 0) return '';
  const items = tips
    .map(
      (t) => `
      <div class="tip-row">
        <div class="tip-dot"></div>
        <span>${escapeHtml(t)}</span>
      </div>`,
    )
    .join('');

  return `
    <div class="section">
      <h2>Präventionstipps</h2>
      ${items}
    </div>
  `;
}

function generateHTML(result: DiagnosisResult, imageBase64?: string): string {
  const sevColor = severityColors[result.severity] || '#999';
  const sevLabel = severityLabels[result.severity] || result.severity;
  const date = new Date().toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const confidence = Math.round(result.confidence * 100);

  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>LeafScan Bericht</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #fff;
      color: #1a1a1a;
      padding: 32px;
      max-width: 680px;
      margin: 0 auto;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 28px;
      padding-bottom: 16px;
      border-bottom: 2px solid #4ADE80;
    }
    .header h1 {
      font-size: 22px;
      font-weight: 700;
      color: #1a1a1a;
    }
    .header h1 span { color: #4ADE80; }
    .header .date {
      font-size: 13px;
      color: #666;
    }
    .photo-section {
      margin-bottom: 24px;
      text-align: center;
    }
    .photo-section img {
      max-width: 100%;
      max-height: 280px;
      border-radius: 12px;
      object-fit: cover;
      border: 1px solid #e0e0e0;
    }
    .severity-badge {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 8px;
      color: #fff;
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.5px;
      margin-bottom: 16px;
      background: ${sevColor};
    }
    .diagnosis-text {
      font-size: 18px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 16px;
      line-height: 1.5;
    }
    .confidence-row {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 20px;
    }
    .confidence-label {
      font-size: 13px;
      color: #888;
      white-space: nowrap;
    }
    .confidence-bar {
      flex: 1;
      height: 8px;
      background: #eee;
      border-radius: 4px;
      overflow: hidden;
    }
    .confidence-fill {
      height: 100%;
      border-radius: 4px;
      background: ${sevColor};
      width: ${confidence}%;
    }
    .confidence-value {
      font-size: 14px;
      font-weight: 600;
      color: ${sevColor};
      min-width: 40px;
      text-align: right;
    }
    .section {
      margin-bottom: 24px;
      padding: 16px 20px;
      background: #f8faf9;
      border-radius: 12px;
      border: 1px solid #e8ede9;
    }
    .section h2 {
      font-size: 11px;
      font-weight: 600;
      color: #888;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      margin-bottom: 12px;
    }
    .section p {
      font-size: 14px;
      color: #444;
      line-height: 1.7;
    }
    .factor-row {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 10px;
    }
    .factor-dot {
      width: 8px;
      height: 8px;
      border-radius: 4px;
      background: #FBBF24;
      margin-top: 6px;
      flex-shrink: 0;
    }
    .factor-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .factor-content strong {
      font-size: 14px;
      color: #1a1a1a;
    }
    .factor-content span {
      font-size: 13px;
      color: #666;
      line-height: 1.5;
    }
    .step-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 14px;
    }
    .step-number {
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: #e6f9ed;
      border: 1px solid #c8ecd4;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 600;
      color: #4ADE80;
      flex-shrink: 0;
      text-align: center;
      line-height: 28px;
    }
    .step-content {
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .step-content strong {
      font-size: 14px;
      color: #1a1a1a;
    }
    .step-content span {
      font-size: 13px;
      color: #666;
      line-height: 1.5;
    }
    .tip-row {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin-bottom: 8px;
    }
    .tip-dot {
      width: 6px;
      height: 6px;
      border-radius: 3px;
      background: #4ADE80;
      margin-top: 7px;
      flex-shrink: 0;
    }
    .tip-row span {
      font-size: 13px;
      color: #666;
      line-height: 1.6;
    }
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
      text-align: center;
      font-size: 12px;
      color: #aaa;
    }
  </style>
</head>
<body>

  <div class="header">
    <h1>Leaf<span>Scan</span></h1>
    <div class="date">${date}</div>
  </div>

  ${buildImageSection(imageBase64)}

  <div class="severity-badge">Schweregrad: ${sevLabel}</div>

  <div class="diagnosis-text">${escapeHtml(result.primaryDiagnosis)}</div>

  <div class="confidence-row">
    <span class="confidence-label">Konfidenz</span>
    <div class="confidence-bar"><div class="confidence-fill"></div></div>
    <span class="confidence-value">${confidence}%</span>
  </div>

  <div class="section">
    <h2>Ursachenanalyse</h2>
    <p>${escapeHtml(result.rootCauseAnalysis)}</p>
  </div>

  ${buildFactorsSection(result.contributingFactors)}
  ${buildActionPlanSection(result.actionPlan)}
  ${buildTipsSection(result.preventiveTips)}

  <div class="footer">Erstellt mit LeafScan</div>

</body>
</html>`;
}

async function imageToBase64(uri: string): Promise<string | undefined> {
  try {
    if (!uri || uri.startsWith('http')) return undefined;
    const base64 = await readAsBase64(uri);
    const ext = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
    return `data:${mime};base64,${base64}`;
  } catch {
    return undefined;
  }
}

export async function generateDiagnosisPDF(result: DiagnosisResult, imageUri?: string): Promise<string> {
  let imageBase64: string | undefined;
  if (imageUri) {
    imageBase64 = await imageToBase64(imageUri);
  }

  const html = generateHTML(result, imageBase64);
  const Print = getPrint();
  const { uri } = await Print.printToFileAsync({ html });
  return uri;
}

function buildShareText(result: DiagnosisResult): string {
  const sevLabel = severityLabels[result.severity] || result.severity;
  const confidence = Math.round(result.confidence * 100);
  const lines: string[] = [
    `LeafScan - Ergebnis`,
    ``,
    `Diagnose: ${result.primaryDiagnosis}`,
    `Schweregrad: ${sevLabel} | Konfidenz: ${confidence}%`,
    ``,
    `Ursache: ${result.rootCauseAnalysis}`,
  ];

  if (result.actionPlan?.length) {
    lines.push(``, `Aktionsplan:`);
    result.actionPlan.forEach((s) => {
      lines.push(`${s.priority}. ${s.action} - ${s.details}`);
    });
  }

  if (result.preventiveTips?.length) {
    lines.push(``, `Tipps:`);
    result.preventiveTips.forEach((t) => {
      lines.push(`- ${t}`);
    });
  }

  lines.push(``, `Erstellt mit LeafScan`);
  return lines.join('\n');
}

async function shareOnWeb(result: DiagnosisResult, imageBase64?: string): Promise<void> {
  const nav = navigator as any;

  // Try file sharing first (HTML report + text)
  if (nav.share && nav.canShare) {
    try {
      const html = generateHTML(result, imageBase64);
      const blob = new Blob([html], { type: 'text/html' });
      const file = new File([blob], 'LeafScan-Diagnose.html', { type: 'text/html' });

      if (nav.canShare({ files: [file] })) {
        await nav.share({
          title: 'LeafScan Ergebnis',
          text: buildShareText(result),
          files: [file],
        });
        return;
      }
    } catch (e: any) {
      if (e.name === 'AbortError') throw new Error('abgebrochen');
    }
  }

  // Fallback: share text only (WhatsApp, Telegram, etc.)
  if (nav.share) {
    try {
      await nav.share({
        title: 'LeafScan Ergebnis',
        text: buildShareText(result),
      });
      return;
    } catch (e: any) {
      if (e.name === 'AbortError') throw new Error('abgebrochen');
    }
  }

  // Last resort: copy to clipboard
  try {
    await navigator.clipboard.writeText(buildShareText(result));
    throw new Error('Share nicht verfügbar \u2013 Diagnose wurde in die Zwischenablage kopiert!');
  } catch (e: any) {
    if (e.message?.includes('Zwischenablage')) throw e;
    throw new Error('Teilen ist auf diesem Ger\u00e4t nicht verf\u00fcgbar.');
  }
}

export async function shareDiagnosis(result: DiagnosisResult, imageUri?: string): Promise<void> {
  // Web/PWA: use Web Share API for native share sheet (WhatsApp, Telegram, etc.)
  if (Platform.OS === 'web') {
    let imageBase64: string | undefined;
    if (imageUri) {
      try {
        imageBase64 = await imageToBase64(imageUri);
      } catch {}
    }
    return shareOnWeb(result, imageBase64);
  }

  // Native: use expo-print + expo-sharing
  const fileUri = await generateDiagnosisPDF(result, imageUri);

  const SharingModule = getSharing();
  const isAvailable = await SharingModule.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Teilen ist auf diesem Ger\u00e4t nicht verf\u00fcgbar.');
  }

  await SharingModule.shareAsync(fileUri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Diagnose teilen',
    UTI: 'com.adobe.pdf',
  });
}
