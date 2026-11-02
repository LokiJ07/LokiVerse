'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
test('v1.0 release identities stay compatible with previous installation',()=>{
 const pkg=JSON.parse(read('package.json'));
 assert.equal(pkg.version,'1.0.0');
 assert.equal(pkg.name,'lokiverse');
 assert.equal(pkg.build.appId,'com.lokij.lokiverse');
 assert.equal(pkg.build.productName,'LokiVerse');
 assert.equal(pkg.build.nsis.deleteAppDataOnUninstall,false);
 assert.match(pkg.build.win.artifactName,/LokiVerse-/);
 const gradle=read('android-companion/app/build.gradle');
 assert.match(gradle,/applicationId\s+'com\.lokij\.lokishare'/);
 assert.match(gradle,/versionName\s+'1\.0\.0'/);
 assert.match(gradle,/versionCode\s+12/);
});
test('v1.0 signing workflow retains protected-keystore and test APK fallback',()=>{
 const release=read('.github/workflows/release.yml');
 assert.match(release,/LOKISHARE_KEYSTORE_BASE64:.*secrets\.LOKISHARE_KEYSTORE_BASE64/);
 assert.match(release,/Android-TEST\.apk/);
 assert.match(release,/ANDROID-SIGNED\.apk|Android-SIGNED\.apk/);
 assert.match(release,/SHA256SUMS/);
});
test('v1.0 renderer maintains sandbox and no Node integration',()=>{
 const main=read('src/main.cjs');
 assert.match(main,/contextIsolation:\s*true,\s*sandbox:\s*true,\s*nodeIntegration:\s*false/);
 assert.match(main,/requestSingleInstanceLock/);
 assert.match(main,/event\.sender\s*!==\s*mainWindow\.webContents/);
});
