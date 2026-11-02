package com.lokij.lokishare;

import android.Manifest;
import android.content.pm.PackageManager;
import android.util.Log;
import androidx.activity.ComponentActivity;
import androidx.activity.result.ActivityResultLauncher;
import androidx.activity.result.contract.ActivityResultContracts;
import com.journeyapps.barcodescanner.ScanContract;
import com.journeyapps.barcodescanner.ScanOptions;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.content.Intent;
import android.net.Uri;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.view.View;
import android.view.ViewGroup;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Standalone Android companion. No WebView and no insecure HTTP fallback. */
public final class MainActivity extends ComponentActivity {
    private static final String SCAN_TAG="LokiShareScanner";
    private static final int REQUEST_SEND=31,REQUEST_SAVE=32;
    private final ExecutorService io=Executors.newSingleThreadExecutor();
    private final Handler handler=new Handler(Looper.getMainLooper());
    private PinnedClient client;
    private String downloadID,downloadName;
    private boolean active=false, waiting=false;
    private LinearLayout base, fileList;
    private EditText inviteInput;
    private TextView status, detail, match;
    private Button pairButton,sendButton,refreshButton;
    // Lifecycle-aware scanner result handling. No deprecated IntentIntegrator request code.
    private final ActivityResultLauncher<ScanOptions> scanLauncher =
        registerForActivityResult(new ScanContract(), result -> {
            if (result == null || result.getContents() == null) {
                if (status != null) status.setText("QR scan cancelled. You can retry or paste an invitation.");
                return;
            }
            final String scanned = result.getContents();
            try {
                String checked = PairingInput.validate(scanned);
                inviteInput.setText(checked);
                loadInvitation();
            } catch (IllegalArgumentException ex) {
                showError(new Exception(ex.getMessage()));
            }
        });
    private final ActivityResultLauncher<String> cameraPermission =
        registerForActivityResult(new ActivityResultContracts.RequestPermission(), granted -> {
            if (granted) launchScanner();
            else showError(new Exception("Camera permission denied. Enable it in Android Settings or paste the pairing invitation."));
        });
    private final Runnable pollTask=new Runnable(){
        @Override public void run(){
            if(!waiting||client==null)return;
            runAsync(()->client.poll(),value->{
                if("approved".equals(value)){waiting=false;active=true;status.setText("● Securely connected");match.setText("Approved by Windows. TLS certificate verified.");refresh();}
                else if("rejected".equals(value)){waiting=false;match.setText("Request declined by Windows.");pairButton.setEnabled(true);}
                else handler.postDelayed(this,1600);
            },error->{waiting=false;pairButton.setEnabled(true);showError(error);});
        }
    };
    interface Job<T>{T run() throws Exception;}
    interface Okay<T>{void done(T result);}
    interface Fail{void fail(Exception e);}
    private <T>void runAsync(Job<T> task,Okay<T> okay,Fail failed){
        io.submit(()->{try{T result=task.run();handler.post(()->{if(!isFinishing())okay.done(result);});}
            catch(Exception e){handler.post(()->{if(!isFinishing())failed.fail(e);});}});
    }
    private int dp(int value){return Math.round(getResources().getDisplayMetrics().density*value);}
    @Override public void onCreate(Bundle state){super.onCreate(state);render();handleInvite(getIntent());}
    @Override protected void onNewIntent(Intent intent){super.onNewIntent(intent);setIntent(intent);handleInvite(intent);}
    private void handleInvite(Intent intent){
        if(intent!=null&&Intent.ACTION_VIEW.equals(intent.getAction())&&intent.getData()!=null){
            inviteInput.setText(intent.getDataString());loadInvitation();
        }
    }
    private GradientDrawable background(int color){GradientDrawable d=new GradientDrawable();d.setColor(color);d.setCornerRadius(dp(15));return d;}
    private TextView text(String value,int size,int color){TextView t=new TextView(this);t.setText(value);t.setTextSize(size);t.setTextColor(color);t.setPadding(0,dp(6),0,dp(6));return t;}
    private void block(View view){LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,-2);p.bottomMargin=dp(13);base.addView(view,p);}
    private Button button(String label){Button b=new Button(this);b.setText(label);b.setAllCaps(false);b.setTextColor(Color.WHITE);b.setBackground(background(Color.rgb(79,52,169)));return b;}
    private void render(){
        getWindow().setStatusBarColor(Color.rgb(10,11,24));getWindow().setNavigationBarColor(Color.rgb(10,11,24));
        ScrollView scroll=new ScrollView(this);scroll.setFillViewport(true);scroll.setBackgroundColor(Color.rgb(11,12,26));
        base=new LinearLayout(this);base.setOrientation(LinearLayout.VERTICAL);base.setPadding(dp(20),dp(26),dp(20),dp(40));scroll.addView(base);setContentView(scroll);
        TextView logo=text("✦ LOKISHARE",28,Color.rgb(207,185,255));logo.setTypeface(null,Typeface.BOLD);block(logo);
        block(text("Secure transfers between your Android phone and LokiVerse on Windows.",15,Color.rgb(184,185,214)));
        block(text("① Pair with Windows",20,Color.WHITE));
        Button scan=button("📷 Scan pairing QR");block(scan);
        scan.setOnClickListener(v->startScanner());
        inviteInput=new EditText(this);inviteInput.setTextColor(Color.WHITE);inviteInput.setHintTextColor(Color.GRAY);inviteInput.setTextSize(13);inviteInput.setSingleLine(false);inviteInput.setMinLines(2);inviteInput.setHint("Or paste full lokiverse://pair invitation");inviteInput.setBackground(background(Color.rgb(31,32,55)));inviteInput.setPadding(dp(14),dp(10),dp(14),dp(10));block(inviteInput);
        Button use=button("Verify invitation");block(use);use.setOnClickListener(v->loadInvitation());
        pairButton=button("Request secure pairing");block(pairButton);pairButton.setEnabled(false);pairButton.setOnClickListener(v->requestPair());
        status=text("○ Not connected",18,Color.rgb(161,233,222));block(status);
        match=text("The Windows host must approve the matching six-digit code.",15,Color.rgb(214,210,230));block(match);
        detail=text("No cloud account · HTTPS + SHA-256 certificate pinning",12,Color.rgb(150,150,170));block(detail);
        block(text("② Send to Windows",20,Color.WHITE));
        sendButton=button("Select files to send");block(sendButton);sendButton.setEnabled(false);
        sendButton.setOnClickListener(v->{Intent pick=new Intent(Intent.ACTION_OPEN_DOCUMENT);pick.setType("*/*");pick.addCategory(Intent.CATEGORY_OPENABLE);pick.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,true);startActivityForResult(pick,REQUEST_SEND);});
        block(text("③ Download from Windows",20,Color.WHITE));
        refreshButton=button("Refresh shared files");block(refreshButton);refreshButton.setEnabled(false);refreshButton.setOnClickListener(v->refresh());
        fileList=new LinearLayout(this);fileList.setOrientation(LinearLayout.VERTICAL);block(fileList);
        block(text("Use private Wi-Fi. Every connection is approved by the PC. No files are shared unless you choose them.",12,Color.rgb(157,156,182)));
    }
    /** Fail gracefully on devices without a usable camera, or when launch is blocked. */
    private void startScanner() {
        if (!getPackageManager().hasSystemFeature(PackageManager.FEATURE_CAMERA_ANY)) {
            showError(new Exception("No camera detected. Paste the LokiVerse pairing invitation instead."));
            return;
        }
        if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            try { cameraPermission.launch(Manifest.permission.CAMERA); }
            catch (RuntimeException ex) { scannerLaunchError(ex); }
            return;
        }
        launchScanner();
    }
    private void launchScanner() {
        try {
            ScanOptions options = new ScanOptions();
            options.setDesiredBarcodeFormats(ScanOptions.QR_CODE);
            options.setPrompt("Scan the LokiVerse QR code on Windows");
            options.setBeepEnabled(false);
            // Avoid orientation lock that some camera/Android versions handle poorly.
            options.setOrientationLocked(false);
            scanLauncher.launch(options);
        } catch (RuntimeException | LinkageError ex) {
            scannerLaunchError(ex);
        }
    }
    private void scannerLaunchError(Throwable error) {
        Log.e(SCAN_TAG,"Unable to launch camera scanner",error);
        showError(new Exception("Could not open camera scanner. Paste the pairing invitation, or check camera permissions."));
    }
    private void loadInvitation(){
        try {
            client=new PinnedClient(PairingInput.validate(inviteInput.getText().toString()));active=false;waiting=false;
            pairButton.setEnabled(true);sendButton.setEnabled(false);refreshButton.setEnabled(false);
            status.setText("✓ QR validated — ready to request pairing");
            match.setText("PC: "+client.address()+"\nCertificate fingerprint pinned from QR.");
        } catch(Exception e){showError(e);pairButton.setEnabled(false);client=null;}
    }
    private void requestPair(){if(client==null)return;pairButton.setEnabled(false);status.setText("Requesting approval…");
        runAsync(()->client.requestPair(),code->{waiting=true;match.setText("MATCH ON WINDOWS: "+code);status.setText("Waiting for Windows approval…");handler.postDelayed(pollTask,1500);},error->{pairButton.setEnabled(true);showError(error);});
    }
    private void refresh(){if(!active||client==null)return;
        sendButton.setEnabled(true);refreshButton.setEnabled(true);
        runAsync(()->client.files(),files->{
            fileList.removeAllViews();
            if(files.length()==0){fileList.addView(text("No files shared by the PC yet.",14,Color.GRAY));return;}
            for(int i=0;i<files.length();i++) {
                JSONObject file=files.optJSONObject(i);if(file==null)continue;
                String id=file.optString("id"),name=file.optString("name","file");
                Button save=button("↓ "+name+"  ("+(file.optLong("size")/1024)+" KB)");
                LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,-2);p.bottomMargin=dp(10);fileList.addView(save,p);
                save.setOnClickListener(v->{downloadID=id;downloadName=name;Intent dest=new Intent(Intent.ACTION_CREATE_DOCUMENT);dest.addCategory(Intent.CATEGORY_OPENABLE);dest.setType("application/octet-stream");dest.putExtra(Intent.EXTRA_TITLE,name);startActivityForResult(dest,REQUEST_SAVE);});
            }
        },this::showError);
    }
    @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);
        if(result!=RESULT_OK||data==null||client==null||!active)return;
        if(request==REQUEST_SEND){
            java.util.ArrayList<Uri> uris=new java.util.ArrayList<>();
            if(data.getClipData()!=null){for(int i=0;i<data.getClipData().getItemCount();i++)uris.add(data.getClipData().getItemAt(i).getUri());}
            else if(data.getData()!=null)uris.add(data.getData());
            if(uris.size()>20){showError(new Exception("Select no more than 20 files."));return;}
            for(Uri uri:uris)runAsync(()->client.upload(this,uri,(bytes,total)->handler.post(()->detail.setText("Uploading… "+(total>0?bytes*100/total:0)+"%"))),
                reply->{detail.setText("✓ Sent: "+reply.optString("savedName"));},this::showError);
        } else if(request==REQUEST_SAVE&&data.getData()!=null){
            Uri dest=data.getData();String id=downloadID,name=downloadName;
            runAsync(()->{client.download(this,id,dest,(bytes,total)->handler.post(()->detail.setText("Downloading "+name+"… "+(total>0?bytes*100/total:0)+"%")));return name;},
                title->{detail.setText("✓ Saved "+title);},this::showError);
        }
    }
    private void showError(Exception e){status.setText("⚠ " + e.getMessage());Toast.makeText(this,e.getMessage(),Toast.LENGTH_LONG).show();}
    @Override protected void onDestroy(){waiting=false;handler.removeCallbacksAndMessages(null);io.shutdownNow();super.onDestroy();}
}
