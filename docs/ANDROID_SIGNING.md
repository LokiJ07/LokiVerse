# Android stable release signing — future milestone, NOT configured in v0.6.0

GitHub Actions currently generates a debug-signed `Android-TEST.apk`. The debug keystore on ephemeral GitHub runners may change across runs, causing Android's `INSTALL_FAILED_UPDATE_INCOMPATIBLE`. A no-uninstall upgrade requires the **same applicationId, compatible signing key, and increasing versionCode**.

Before public Android releases: create a dedicated strong release keystore **offline**, retain multiple encrypted backups, and configure a protected release build using encrypted GitHub Actions secrets or an appropriate signing service. Upload only a *signed release artifact* after verifying the signing certificate SHA-256 matches prior releases. Do not print secrets, store private keystores in git, or publish debug-signed APKs as production releases. Configure signing in a separate workflow with explicit approval and verify both clean install and in-place update on a physical Android device.

No signing key, fake secret, certificate bypass or automatic signing has been added in v0.6.0.
