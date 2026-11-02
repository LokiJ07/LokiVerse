# LokiShare v0.4.0 — Security and protocol

## Trust model

The Windows app starts an on-demand Node HTTPS server bound only to the selected private IPv4 interface. The server generates a unique **RSA 3072-bit, SHA-256-signed X.509 certificate** using Node's native cryptographic APIs, retains its key under the app's private per-user data directory and never embeds any universal private key in source code. No external OpenSSL process is needed. Android receives the SHA-256 fingerprint via a physically scanned QR code and pins the exact DER-encoded leaf certificate in a per-connection `X509TrustManager`. The Android application **does not disable TLS checks globally**, accept arbitrary certificates or fall back to cleartext HTTP. Network protocol is TLS 1.2 or later. A different certificate is rejected even if the remote presents the right HTTP pairing code.

A QR is an out-of-band trusted step: **an attacker controlling the QR displayed to the phone can direct it to an attacker-controlled local endpoint**. Keep the QR private, confirm the Windows pairing number, use a trusted network and do not accept unexpected requests. The user's Windows PC remains the transfer endpoint and can read plaintext; this is **transport encryption, not end-to-end encryption** independent from the host.

## Pairing and authorization

- Windows generates a fresh random join secret and short manual code on each Start. The native QR stores the URL, secret and TLS fingerprint; no permanent network account.
- A valid request creates a pending pairing with two-minute expiry and a six-digit number. Windows user must explicitly accept after comparing the same number on Android.
- Approval grants a random 256-bit session cookie with `HttpOnly`, `Secure`, `SameSite=Strict`; tokens are bound to the device IP and time out after 30 idle minutes. Stop sharing or PC revocation drops authorization.
- POST requests enforce exact `Origin` matching the HTTPS host; reverse proxy and cross-origin access are not supported.
- Rate-limits repeated incorrect pairing requests and caps pending requests.

## File restrictions

- Uploads only into a folder explicitly chosen in Windows; safe basename validation rejects traversal and reserved Windows names; bounded to 512 MiB and requires known Content-Length; new filenames use no-overwrite copy mode; partial files are removed after failed transfers.
- Downloads expose only individually picked PC files; manifests contain no filesystem paths. No arbitrary browse, deletion, or remote renaming.
- Android accesses phone files through the Storage Access Framework (`ACTION_OPEN_DOCUMENT`) and saves to user-chosen destinations with `ACTION_CREATE_DOCUMENT`—no broad storage permissions.
- Android session cookie exists only in memory for this test companion; the app must pair again after being closed.

## Known limitations and planned hardening

- Test APK debug signing is not stable between GitHub runner jobs; protected permanent release signing must be configured before public in-place Android upgrades. No keystore is committed.
- Browser HTTPS fallback shows certificate warnings because the self-signed cert is not in the platform trust store. Prefer the pinned native app.
- No public/internet sharing, NFC, relay server, full E2E encryption independent of endpoints, transfer resume, background sync, folder batch transfer, or automatic discovery.
- Large uploads require a known file size. Client HTTPS timeouts and Wi-Fi interruptions may require re-sending.
- Certificate rotation requires scanning a fresh QR. An unreadable TLS identity file causes an explicit error instead of silently changing fingerprints.
- Before production deployment, a dedicated security review is recommended, including Windows junction/symlink race considerations, APK signing, traffic logs, firewall policy and physical mobile tests.
