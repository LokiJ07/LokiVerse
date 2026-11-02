# LokiShare v0.3.0 — Architecture and Threat Model

- **Scope:** local private-LAN transfer Windows ↔ mobile browser. Not native Android and not E2E encrypted.
- **On-demand listener:** `src/shared/lokishare.cjs`, Node HTTP bound only to an explicitly selected RFC1918 IPv4 address, random OS-assigned port. Stop terminates listener/sockets.
- **Pairing:** on-demand 10-character code or 256-bit invite URL (QR), throttled pairing attempts, 2-minute pending request expiry, visible device name + matching 6-digit number, explicit desktop approval. QR invite is removed from phone history immediately after loading.
- **Authorization:** issued random 256-bit HttpOnly SameSite=Strict cookie, bound to the initiating IP, 30-minute inactivity timeout, explicit revocation and listener-stop revocation. POST requires matching Origin. The cookie is not flagged Secure because this release uses HTTP.
- **Files:** selected Windows files only; user-picked incoming directory only. No remote arbitrary path or folder enumeration. Filenames must be safe basenames; no traversal, Windows device names or invalid punctuation. Enforce 512-MiB max and Content-Length. Create unique names using `COPYFILE_EXCL` to avoid overwrites. Partial temp uploads are cleaned up.
- **Web:** static HTML, CSS and JS served with a restrictive CSP, no third-party script/CDN, HTML escaping or DOM `textContent` for dynamic strings. No account, analytics or relay.
- **Unsupported:** public network use, encryption, TLS, discovery, cross-internet sharing, transfer resume, automatic sync, Android APK, folder transfer, transfers >512 MiB/file.
- **Network threat:** plain local HTTP is vulnerable to passive interception by other parties who can observe network traffic and to active man-in-the-middle attacks. A code/approval dialog does not provide cryptographic data encryption or authenticate the network. Use a trusted private LAN only and avoid confidential files.
