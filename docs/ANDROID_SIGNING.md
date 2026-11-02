# LokiShare v0.8.0 — optional stable Android release signing

The **default GitHub Actions build remains a debug-signed `Android-TEST.apk`**. It requires no secrets; the runner's debug signing key can change between runs. Do not claim a debug TEST APK can always upgrade in place.

The release workflow also supports a separate, **optional `Android-SIGNED.apk`** when all four GitHub Actions repository secrets are configured. Never commit a private keystore, secret, or signing password. A signed Android release can update **future APKs signed with the same original key**, the same `applicationId`, and increasing `versionCode`. The **first switch from debug TEST to signed release usually requires uninstalling the TEST app once**, so back up any needed phone-only transfer-history data first.

## One-time setup — on your trusted development PC

1. Create a dedicated private signing keystore *offline* with Android Studio or JDK `keytool`. Example (choose your own strong passwords):

   ```bash
   keytool -genkeypair -v -keystore lokishare-release.jks -alias lokishare -keyalg RSA -keysize 3072 -validity 10000
   ```

2. Back up this keystore securely **outside GitHub**. Losing it may prevent future in-place updates to self-distributed APKs.
3. In the LokiVerse GitHub repository, open **Settings → Secrets and variables → Actions → New repository secret** and add the following exact names:

   | Secret | Meaning |
   | --- | --- |
   | `LOKISHARE_KEYSTORE_BASE64` | Base64 encoding of the keystore file *bytes* |
   | `LOKISHARE_STORE_PASSWORD` | Keystore password |
   | `LOKISHARE_KEY_ALIAS` | Keystore key alias (`lokishare` in example) |
   | `LOKISHARE_KEY_PASSWORD` | Private key password |

   To encode the file in **Windows PowerShell** (do not share the output publicly):

   ```powershell
   [Convert]::ToBase64String([System.IO.File]::ReadAllBytes('C:\secure\lokishare-release.jks'))
   ```

4. Push the source, confirm both CI jobs are green, and create a new version tag. During the **tagged release** only, GitHub Actions decodes the keystore into the runner's temp directory, builds a signed release APK, and removes the temp file. If **none** of the four secrets exist, it publishes the **TEST APK only**. If only **some** secrets are present, the signed-release step fails loudly rather than silently producing an untrusted build.
5. Confirm the Android signing certificate SHA-256 and versionCode remain consistent across subsequent signed releases (`apksigner verify --print-certs LokiShare-...-Android-SIGNED.apk`). Keep certificate fingerprints in your release notes for independent comparison.

**Important:** Windows SmartScreen is independent of Android signing. This workflow does *not* sign the Windows installer, and it does not remove the Windows Unknown Publisher warning.

Official documentation: https://developer.android.com/studio/publish/app-signing
