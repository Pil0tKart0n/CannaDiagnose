# Deployment Diagram

> Zeigt die Production-Infrastruktur von LeafScan.

```mermaid
graph TB
    subgraph Internet
        User([Grower / Browser / App])
        Admin([Admin])
    end

    subgraph VPS["VPS (Linux)"]
        subgraph Docker["Docker Compose"]
            Nginx["Nginx<br/>(Port 80/443)<br/>SSL Termination<br/>Static Files<br/>Reverse Proxy"]
            Express["Express API<br/>(Port 4000, intern)<br/>Node.js 20 Alpine"]
            SQLite[("SQLite DB<br/>WAL Mode<br/>/data/leafscan.db")]
            Images["Scan Images<br/>/data/scan_images/<br/>/data/feedback_images/"]
        end
        Certbot["Let's Encrypt<br/>Auto-Renewal"]
    end

    subgraph External["Externe Services"]
        OpenAI["OpenAI API<br/>GPT-4o"]
        Stripe["Stripe API<br/>Payments"]
        RevenueCat["RevenueCat<br/>Mobile Payments"]
        GooglePlay["Google Play<br/>Store"]
    end

    User -->|HTTPS 443| Nginx
    Admin -->|HTTPS + Admin-Key| Nginx
    Nginx -->|Static Files| User
    Nginx -->|/api/*| Express
    Express --> SQLite
    Express --> Images
    Express -->|HTTPS| OpenAI
    Express -->|HTTPS| Stripe
    Certbot -->|Certs| Nginx
    User -.->|RevenueCat SDK| RevenueCat
    User -.->|Download| GooglePlay

    style Nginx fill:#2d5a27,stroke:#5CE892,color:#fff
    style Express fill:#1a3a4a,stroke:#4a9eff,color:#fff
    style SQLite fill:#3a2a1a,stroke:#d4a853,color:#fff
    style OpenAI fill:#1a1a2e,stroke:#74b9ff,color:#fff
    style Stripe fill:#2a1a3e,stroke:#a29bfe,color:#fff
```

## Ports & Services

| Service | Port | Extern | Beschreibung |
|---------|------|--------|-------------|
| Nginx | 80, 443 | Ja | HTTP→HTTPS Redirect, Static Files, API Proxy |
| Express API | 4000 | Nein (intern) | REST API, nur via Nginx erreichbar |
| SQLite | — | Nein | Embedded DB, kein Netzwerk-Port |

## Volumes

| Volume | Pfad | Inhalt |
|--------|------|--------|
| `leafscan-data` | `/app/server/data/` | SQLite DB, Scan-Images, Feedback-Images |
| SSL Certs | `/etc/letsencrypt/` | Let's Encrypt Zertifikate |

## DNS

| Record | Typ | Ziel |
|--------|-----|------|
| leafscan.de | A | VPS IP |
| www.leafscan.de | CNAME | leafscan.de |
