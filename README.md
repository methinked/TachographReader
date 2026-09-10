# TachographReader (tachographreader.com)

A lightweight, secure, and privacy-first web application for transport managers, fleet operators, and drivers to review digital tachograph (`.DDD`) driver card files and generate audit-ready compliance acknowledgement sign-off sheets.

Live deployment: [https://tachographreader.com](https://tachographreader.com)

---

## 🔒 100% GDPR & Privacy Compliant

Handling driver tachograph files involves sensitive personal data under UK & EU GDPR. TachographReader is designed from first principles around zero telemetry and zero server storage:

* **100% Client-Side Processing**: All parsing happens in browser memory via ES6 binary `ArrayBuffer` and `DataView` operations. No card data is ever sent to a remote server.
* **Zero Data Retention**: No files, driver records, or infringements are stored in databases, on disk, in `LocalStorage`, or in cookies.
* **Instant Volatile Memory Purge**: Closing the browser tab or reloading immediately wipes all loaded data and state.
* **Zero Telemetry**: No tracking scripts, analytics, or third-party data collection.

---

## 🛠️ Key Capabilities

1. **Direct `.DDD` File Parsing**:
   - Drag & drop or browse any raw digital tachograph binary (`.DDD`) export.
   - Extracts driver identity, card number, issuing member state, vehicle registrations, and activity logs.
2. **Company Fleet Filtering**:
   - Filter out sub-contracted or third-party vehicle registrations not belonging to your company fleet.
   - Dynamically recalculates infringements and compliance scores in real time.
3. **Manager Compliance Review**:
   - Record manager review notes, planned corrective actions, and driver comments.
4. **Printable Audit Acknowledgement (A4)**:
   - Formatted for clean printing (`Ctrl+P` / `Cmd+P` or via the Print button) into an official single-page compliance audit acknowledgement sheet with signature blocks.

---

## 🚀 Deployment & Local Running

### Option A: Docker Compose (Production / Staging)

```bash
docker compose up -d --build
```
The site will be available locally on `http://localhost:8098` (or reverse-proxied via Caddy/Nginx).

### Option B: Standalone / Offline Use

Because TachographReader runs entirely client-side in the browser:
1. Open [tachographreader.com](https://tachographreader.com) or run locally in any modern browser.
2. All processing happens in-memory with zero server-side storage.

---

## Disclaimer

This tool is provided "as is" without warranty of any kind, express or implied. It is designed to assist transport managers with preliminary operational reviews of digital tachograph card records and is not a substitute for certified statutory tachograph analysis software or official DVSA / EU regulatory compliance checks. Neither the authors nor contributors accept liability for any compliance decisions, penalties, or audit outcomes resulting from the use of this software.

---

## 📄 License

This program is free software: you can redistribute it and/or modify it under the terms of the **GNU General Public License as published by the Free Software Foundation, either version 3 of the License**, or (at your option) any later version.

See the [LICENSE](LICENSE) file for details.
