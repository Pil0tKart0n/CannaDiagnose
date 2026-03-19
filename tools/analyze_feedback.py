"""
LeafScan Feedback Analyzer
===========================
Zieht negative Feedbacks vom Server, lädt Bilder runter und
erstellt eine Analyse für Prompt-Verbesserungen.

Nutzung:
    python analyze_feedback.py                    # Alle negativen
    python analyze_feedback.py --all              # Auch positive
    python analyze_feedback.py --limit 20         # Max 20 Einträge
    python analyze_feedback.py --since 2026-03-01 # Ab Datum
"""

import json
import sys
import os
import argparse
from datetime import datetime
from pathlib import Path

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

try:
    import requests
except ImportError:
    print("requests fehlt: pip install requests")
    sys.exit(1)

SERVER = "https://leafscan.de"
ADMIN_KEY = "ls-admin-2026-Rz7vP3kW"
OUTPUT_DIR = Path(__file__).parent.parent / "feedback_analysis"


def fetch_feedback(negative_only=True, limit=100):
    """Holt Feedback-Daten vom Server."""
    url = f"{SERVER}/api/admin/feedback-detailed"
    params = {"key": ADMIN_KEY, "limit": limit}
    if negative_only:
        params["negative"] = "true"

    print(f"Lade Feedback von {url}...")
    r = requests.get(url, params=params, timeout=30)
    if r.status_code != 200:
        print(f"Fehler {r.status_code}: {r.text[:200]}")
        return []

    data = r.json()
    print(f"  {data['count']} Einträge geladen")
    return data.get("entries", [])


def download_images(entries, output_dir):
    """Lädt Feedback-Bilder herunter."""
    img_dir = output_dir / "images"
    img_dir.mkdir(parents=True, exist_ok=True)
    total = 0

    for entry in entries:
        for img_name in entry.get("images", []):
            img_path = img_dir / img_name
            if img_path.exists():
                continue
            url = f"{SERVER}/api/admin/feedback-image/{img_name}?key={ADMIN_KEY}"
            try:
                r = requests.get(url, timeout=15)
                if r.status_code == 200:
                    img_path.write_bytes(r.content)
                    total += 1
            except Exception:
                pass

    print(f"  {total} neue Bilder heruntergeladen")
    return img_dir


def analyze(entries):
    """Analysiert Feedback-Muster."""
    analysis = {
        "total": len(entries),
        "negative": sum(1 for e in entries if e["rating"] == "negative"),
        "positive": sum(1 for e in entries if e["rating"] == "positive"),
        "diagnoses": {},
        "severity_distribution": {},
        "substrate_distribution": {},
        "fertilizer_distribution": {},
        "common_issues": [],
    }

    for entry in entries:
        diag = entry.get("diagnosis") or {}
        q = entry.get("questionnaire") or {}

        # Diagnose-Häufigkeit
        primary = diag.get("primaryDiagnosis", "unbekannt")
        analysis["diagnoses"][primary] = analysis["diagnoses"].get(primary, 0) + 1

        # Severity
        sev = diag.get("severity", "unbekannt")
        analysis["severity_distribution"][sev] = analysis["severity_distribution"].get(sev, 0) + 1

        # Substrat
        sub = q.get("substrateType", "unbekannt")
        analysis["substrate_distribution"][sub] = analysis["substrate_distribution"].get(sub, 0) + 1

        # Dünger
        fert = q.get("fertilizerType", "unbekannt")
        analysis["fertilizer_distribution"][fert] = analysis["fertilizer_distribution"].get(fert, 0) + 1

    # Top issues (negative feedback)
    neg_entries = [e for e in entries if e["rating"] == "negative"]
    for entry in neg_entries:
        diag = entry.get("diagnosis") or {}
        q = entry.get("questionnaire") or {}
        analysis["common_issues"].append({
            "diagnosis": diag.get("primaryDiagnosis", "?"),
            "confidence": diag.get("confidence", 0),
            "severity": diag.get("severity", "?"),
            "substrate": q.get("substrateType", "?"),
            "fertilizer": q.get("fertilizerType", "?"),
            "growPhase": q.get("growPhase", "?"),
            "images": entry.get("images", []),
            "date": entry.get("created_at", "?"),
        })

    return analysis


def generate_report(analysis, output_dir):
    """Erstellt einen lesbaren Report."""
    report = []
    report.append("=" * 60)
    report.append("  LEAFSCAN FEEDBACK ANALYSE")
    report.append(f"  Erstellt: {datetime.now().strftime('%d.%m.%Y %H:%M')}")
    report.append("=" * 60)
    report.append("")
    report.append(f"  Gesamt: {analysis['total']} Feedbacks")
    report.append(f"  Positiv: {analysis['positive']}")
    report.append(f"  Negativ: {analysis['negative']}")
    if analysis['total'] > 0:
        rate = round(analysis['positive'] / analysis['total'] * 100)
        report.append(f"  Zufriedenheit: {rate}%")
    report.append("")

    report.append("--- Häufigste Diagnosen (bei negativem Feedback) ---")
    sorted_diag = sorted(analysis["diagnoses"].items(), key=lambda x: -x[1])
    for diag, count in sorted_diag[:15]:
        report.append(f"  {count}x  {diag}")
    report.append("")

    report.append("--- Substrat-Verteilung ---")
    for sub, count in sorted(analysis["substrate_distribution"].items(), key=lambda x: -x[1]):
        report.append(f"  {count}x  {sub}")
    report.append("")

    report.append("--- Dünger-Verteilung ---")
    for fert, count in sorted(analysis["fertilizer_distribution"].items(), key=lambda x: -x[1])[:10]:
        report.append(f"  {count}x  {fert}")
    report.append("")

    if analysis["common_issues"]:
        report.append("--- Negative Cases (für Prompt-Verbesserung) ---")
        for i, issue in enumerate(analysis["common_issues"][:20], 1):
            report.append(f"\n  Case {i}: {issue['diagnosis']}")
            report.append(f"    Confidence: {issue['confidence']}, Severity: {issue['severity']}")
            report.append(f"    Setup: {issue['substrate']}, {issue['fertilizer']}, {issue['growPhase']}")
            report.append(f"    Bilder: {', '.join(issue['images']) if issue['images'] else 'keine'}")
            report.append(f"    Datum: {issue['date']}")

    report_text = "\n".join(report)
    report_path = output_dir / "report.txt"
    report_path.write_text(report_text, encoding="utf-8")
    print(f"\n{report_text}")
    print(f"\nReport gespeichert: {report_path}")
    return report_path


def save_raw(entries, output_dir):
    """Speichert Rohdaten als JSON."""
    raw_path = output_dir / "feedback_raw.json"
    with open(raw_path, "w", encoding="utf-8") as f:
        json.dump(entries, f, ensure_ascii=False, indent=2)
    print(f"Rohdaten gespeichert: {raw_path}")


def main():
    parser = argparse.ArgumentParser(description="LeafScan Feedback Analyzer")
    parser.add_argument("--all", action="store_true", help="Auch positive Feedbacks")
    parser.add_argument("--limit", type=int, default=100, help="Max Einträge")
    args = parser.parse_args()

    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    output_dir = OUTPUT_DIR / ts
    output_dir.mkdir(parents=True, exist_ok=True)

    entries = fetch_feedback(negative_only=not args.all, limit=args.limit)
    if not entries:
        print("Keine Feedbacks vorhanden.")
        return

    download_images(entries, output_dir)
    analysis = analyze(entries)
    save_raw(entries, output_dir)
    generate_report(analysis, output_dir)

    print(f"\nAlles unter: {output_dir.resolve()}")
    print("Bilder unter: images/")
    print("\nNächster Schritt: Diese Daten an Claude geben zur Prompt-Verfeinerung.")


if __name__ == "__main__":
    main()
