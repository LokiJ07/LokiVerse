package com.lokij.lokishare;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.content.Context;
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
import android.widget.ProgressBar;
import android.content.res.ColorStateList;

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
    private LinearLayout base, section, fileList, recentList;
    private ProgressBar transferProgress;
    private Button cancelTransfer;
    private TransferCancellation currentTransfer;
    private boolean transferBusy=false;
    private long transferStartedAt=0;
    private EditText inviteInput;
    private TextView nearbyResults;
    private Button nearbyButton, notificationButton;
    private int notificationIndex=100;
    private int missedHealthChecks=0;
    private TextView status, detail, match;
    private Button pairButton,sendButton,refreshButton;
    private final Runnable connectionHealth=new Runnable(){
        @Override public void run(){
            if(!active || client==null || isFinishing())return;
            if(transferBusy || waiting){handler.postDelayed(this,20000);return;}
            final PinnedClient checkedClient=client;
            runAsync(()->checkedClient.status(),reply->{
                if(checkedClient!=client || !active)return;
                missedHealthChecks=0;
                handler.postDelayed(this,20000);
            },error->{
                if(checkedClient!=client || !active)return;
                missedHealthChecks++;
                if(missedHealthChecks<2){
                    status.setText("● Connection check delayed — checking again…");
                    handler.postDelayed(this,5000);
                    return;
                }
                active=false;waiting=false;
                sendButton.setEnabled(false);refreshButton.setEnabled(false);
                status.setText("● Connection lost — rescan the PC QR or request new approval.");
                pairButton.setEnabled(client!=null);
                match.setText("Your PC may have restarted or the session expired. Secure verification is required again.");
            });
        }
    };
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
    private final ActivityResultLauncher<String> nearbyPermission =
        registerForActivityResult(new ActivityResultContracts.RequestPermission(), granted -> {
            if(granted)findNearby();
            else if(nearbyResults!=null)nearbyResults.setText("Nearby-device permission denied. Scan your PC's QR instead; secure transfers remain available where network access is permitted.");
        });
    private final ActivityResultLauncher<String> notificationPermission =
        registerForActivityResult(new ActivityResultContracts.RequestPermission(), granted -> {
            if(notificationButton!=null) notificationButton.setText(granted ? "✓ Transfer notifications enabled" : "Enable transfer notifications");
            if(!granted)Toast.makeText(this,"Notifications are optional. Transfer works normally.",Toast.LENGTH_SHORT).show();
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
                if("approved".equals(value)){waiting=false;active=true;missedHealthChecks=0;status.setText("● Securely connected");match.setText("Approved by Windows. TLS certificate verified.");handler.removeCallbacks(connectionHealth);handler.postDelayed(connectionHealth,20000);refresh();}
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
    @Override public void onCreate(Bundle state){super.onCreate(state);createTransferChannel();render();handleInvite(getIntent());}
    @Override protected void onNewIntent(Intent intent){super.onNewIntent(intent);setIntent(intent);handleInvite(intent);}
    private void handleInvite(Intent intent){
        if(intent!=null&&Intent.ACTION_VIEW.equals(intent.getAction())&&intent.getData()!=null){
            inviteInput.setText(intent.getDataString());loadInvitation();
        }
    }
    private GradientDrawable background(int color){GradientDrawable d=new GradientDrawable();d.setColor(color);d.setCornerRadius(dp(15));return d;}
    private TextView text(String value,int size,int color){TextView t=new TextView(this);t.setText(value);t.setTextSize(size);t.setTextColor(color);t.setPadding(0,dp(6),0,dp(6));return t;}
    private void block(View view){
        LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,-2);p.bottomMargin=dp(12);
        (section==null?base:section).addView(view,p);
    }
    private void beginCard(String eyebrow,String title){
        section=new LinearLayout(this);section.setOrientation(LinearLayout.VERTICAL);
        section.setPadding(dp(18),dp(16),dp(18),dp(14));
        GradientDrawable card=new GradientDrawable(GradientDrawable.Orientation.TL_BR,
            new int[]{Color.rgb(30,31,59),Color.rgb(19,22,43)});
        card.setCornerRadius(dp(20));card.setStroke(dp(1),Color.rgb(66,63,111));
        section.setBackground(card);
        LinearLayout.LayoutParams container=new LinearLayout.LayoutParams(-1,-2);container.bottomMargin=dp(18);
        base.addView(section,container);
        block(text(eyebrow.toUpperCase(java.util.Locale.ROOT),11,Color.rgb(144,232,217)));
        TextView head=text(title,20,Color.WHITE);head.setTypeface(null,Typeface.BOLD);block(head);
    }
    private void endCard(){section=null;}
    private Button button(String label){
        Button b=new Button(this);b.setText(label);b.setAllCaps(false);b.setTextColor(Color.WHITE);
        GradientDrawable gradient=new GradientDrawable(GradientDrawable.Orientation.LEFT_RIGHT,
            new int[]{Color.rgb(105,60,198),Color.rgb(67,107,180)});
        gradient.setCornerRadius(dp(13));b.setBackground(gradient);b.setMinHeight(dp(48));return b;
    }
    private void render(){
        getWindow().setStatusBarColor(Color.rgb(10,11,24));getWindow().setNavigationBarColor(Color.rgb(10,11,24));
        ScrollView scroll=new ScrollView(this);scroll.setFillViewport(true);scroll.setBackgroundColor(Color.rgb(11,12,26));
        base=new LinearLayout(this);base.setOrientation(LinearLayout.VERTICAL);base.setPadding(dp(20),dp(26),dp(20),dp(40));scroll.addView(base);setContentView(scroll);
        TextView logo=text("✦ LOKISHARE",28,Color.rgb(207,185,255));logo.setTypeface(null,Typeface.BOLD);block(logo);
        block(text("Your private, encrypted local transfer hub. Pair by QR, send files and track progress.",15,Color.rgb(184,185,214)));
        TextView securityHint=text("● LOCAL WI-FI  ·  HTTPS PINNING  ·  PC APPROVAL",12,Color.rgb(132,226,204));
        securityHint.setBackground(background(Color.rgb(27,44,53)));
        securityHint.setPadding(dp(12),dp(9),dp(12),dp(9));block(securityHint);
        beginCard("01 · Trusted connection","Connect to your PC");
        nearbyButton=button("⌁ Find nearby LokiVerse PCs");block(nearbyButton);
        nearbyResults=text("Optional discovery: find PCs on the same Wi-Fi. Scan the PC's QR to verify its identity.",13,Color.rgb(172,167,213));
        nearbyResults.setBackground(background(Color.rgb(28,30,52)));
        nearbyResults.setPadding(dp(13),dp(10),dp(13),dp(10));block(nearbyResults);
        nearbyButton.setOnClickListener(v->startNearbyScan());
        Button scan=button("📷 Scan pairing QR");block(scan);
        scan.setOnClickListener(v->startScanner());
        inviteInput=new EditText(this);inviteInput.setTextColor(Color.WHITE);inviteInput.setHintTextColor(Color.GRAY);inviteInput.setTextSize(13);inviteInput.setSingleLine(false);inviteInput.setMinLines(2);inviteInput.setHint("Or paste full lokiverse://pair invitation");inviteInput.setBackground(background(Color.rgb(31,32,55)));inviteInput.setPadding(dp(14),dp(10),dp(14),dp(10));block(inviteInput);
        Button use=button("Verify invitation");block(use);use.setOnClickListener(v->loadInvitation());
        pairButton=button("Request secure pairing");block(pairButton);pairButton.setEnabled(false);pairButton.setOnClickListener(v->requestPair());
        status=text("○ Not connected",18,Color.rgb(161,233,222));block(status);
        match=text("The Windows host must approve the matching six-digit code.",15,Color.rgb(214,210,230));block(match);
        detail=text("No cloud account · HTTPS + SHA-256 certificate pinning",12,Color.rgb(150,150,170));block(detail);
        notificationButton=button("Enable transfer notifications");block(notificationButton);
        notificationButton.setOnClickListener(v->askNotifications());
        if(canNotify())notificationButton.setText("✓ Transfer notifications enabled");
        endCard();
        beginCard("02 · Send","Phone → Windows");
        sendButton=button("Select files to send");block(sendButton);sendButton.setEnabled(false);
        sendButton.setOnClickListener(v->{if(transferBusy)return;Intent pick=new Intent(Intent.ACTION_OPEN_DOCUMENT);pick.setType("*/*");pick.addCategory(Intent.CATEGORY_OPENABLE);pick.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,true);startActivityForResult(pick,REQUEST_SEND);});
        endCard();
        beginCard("03 · Receive","Windows → Phone");
        refreshButton=button("Refresh shared files");block(refreshButton);refreshButton.setEnabled(false);refreshButton.setOnClickListener(v->refresh());
        fileList=new LinearLayout(this);fileList.setOrientation(LinearLayout.VERTICAL);block(fileList);
        block(text("Interrupted downloads automatically resume twice while LokiShare stays open.",12,Color.rgb(166,197,228)));
        endCard();
        beginCard("04 · Live activity","Transfer progress");
        transferProgress=new ProgressBar(this,null,android.R.attr.progressBarStyleHorizontal);
        transferProgress.setMax(100);transferProgress.setProgressTintList(ColorStateList.valueOf(Color.rgb(129,99,243)));
        block(transferProgress);
        cancelTransfer=button("Cancel active transfer");cancelTransfer.setEnabled(false);block(cancelTransfer);
        cancelTransfer.setOnClickListener(v->{if(currentTransfer!=null){currentTransfer.cancel();detail.setText("Cancelling transfer…");cancelTransfer.setEnabled(false);}});
        endCard();
        beginCard("05 · On-device history","Recent activity");
        Button clear=button("Clear phone activity");block(clear);
        recentList=new LinearLayout(this);recentList.setOrientation(LinearLayout.VERTICAL);block(recentList);
        clear.setOnClickListener(v->{getPreferences(MODE_PRIVATE).edit().remove("transfer_history_v1").apply();renderRecent();});
        renderRecent();
        endCard();
        block(text("PRIVATE BY DESIGN  ·  Use a trusted Wi-Fi network. Each PC session requires QR fingerprint verification and approval.",12,Color.rgb(157,156,182)));
    }
    private void startNearbyScan(){
        if(Build.VERSION.SDK_INT>=33 && checkSelfPermission(Manifest.permission.NEARBY_WIFI_DEVICES)!=PackageManager.PERMISSION_GRANTED){
            nearbyPermission.launch(Manifest.permission.NEARBY_WIFI_DEVICES);
            return;
        }
        findNearby();
    }
    /** Never trust an unauthenticated LAN beacon as a connection invitation. */
    private void findNearby(){
        nearbyButton.setEnabled(false);nearbyResults.setText("Searching this Wi-Fi for nearby LokiVerse hosts…");
        runAsync(()->NearbyDiscovery.scan(this,6500), results->{
            nearbyButton.setEnabled(true);
            if(results.isEmpty()){
                nearbyResults.setText("No hosts discovered. Check the same Wi-Fi, Windows firewall and Start sharing on the PC. QR pairing still works.");
            }else{
                StringBuilder message=new StringBuilder("Nearby PCs (UNVERIFIED):\n");
                for(String result:results)message.append("• ").append(result).append("\n");
                message.append("\nFor security, SCAN THAT PC'S QR. Discovery never bypasses verification.");
                nearbyResults.setText(message.toString());
            }
        },error->{nearbyButton.setEnabled(true);nearbyResults.setText("Discovery unavailable: "+error.getMessage()+". Use QR scanning instead.");});
    }
    private void createTransferChannel(){
        NotificationManager manager=(NotificationManager)getSystemService(Context.NOTIFICATION_SERVICE);
        if(manager!=null) manager.createNotificationChannel(new NotificationChannel("lokishare_transfers","LokiShare transfers",NotificationManager.IMPORTANCE_DEFAULT));
    }
    private boolean canNotify(){return Build.VERSION.SDK_INT<33 || checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED;}
    private void askNotifications(){
        if(Build.VERSION.SDK_INT>=33&&!canNotify())notificationPermission.launch(Manifest.permission.POST_NOTIFICATIONS);
        else{notificationButton.setText("✓ Transfer notifications enabled");Toast.makeText(this,"Transfer alerts are enabled.",Toast.LENGTH_SHORT).show();}
    }
    private void notifyDone(String title,String description){
        if(!canNotify())return;
        NotificationManager manager=(NotificationManager)getSystemService(Context.NOTIFICATION_SERVICE);
        if(manager==null)return;
        try {
            Notification n=new Notification.Builder(this,"lokishare_transfers")
                .setSmallIcon(android.R.drawable.ic_dialog_info)
                .setContentTitle(title).setContentText(description).setAutoCancel(true).build();
            manager.notify(notificationIndex++,n);
        }catch(SecurityException ignored) { /* Optional system permission can change while app runs. */ }
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
            handler.removeCallbacks(connectionHealth);missedHealthChecks=0;
            status.setText("✓ QR validated — ready to request pairing");
            match.setText("PC: "+client.address()+"\nCertificate fingerprint pinned from QR.");
        } catch(Exception e){showError(e);pairButton.setEnabled(false);client=null;}
    }
    private void requestPair(){if(client==null)return;handler.removeCallbacks(connectionHealth);pairButton.setEnabled(false);status.setText("Requesting approval…");
        runAsync(()->client.requestPair(),code->{waiting=true;match.setText("MATCH ON WINDOWS: "+code);status.setText("Waiting for Windows approval…");handler.postDelayed(pollTask,1500);},error->{pairButton.setEnabled(true);showError(error);});
    }
    private void beginTransfer() {
        transferBusy=true;transferStartedAt=android.os.SystemClock.elapsedRealtime();currentTransfer=new TransferCancellation();transferProgress.setProgress(0);
        cancelTransfer.setEnabled(true);sendButton.setEnabled(false);refreshButton.setEnabled(false);
    }
    private void transferUpdate(String label,long done,long total){
        handler.post(()->{if(!isFinishing() && transferBusy){
            transferProgress.setProgress(total>0?(int)Math.min(100,done*100/total):0);
            long elapsed=Math.max(1,android.os.SystemClock.elapsedRealtime()-transferStartedAt);
            double speed=(done*1000.0/elapsed)/(1024*1024);
            detail.setText(label+" · "+(total>0?(done*100/total)+"%":"working…")+String.format(java.util.Locale.US," · %.1f MB/s",speed));
        }});
    }
    private void endTransfer(){
        transferBusy=false;currentTransfer=null;cancelTransfer.setEnabled(false);
        sendButton.setEnabled(active);refreshButton.setEnabled(active);
    }
    private void rememberTransfer(String description){
        try {
            JSONArray old=new JSONArray(getPreferences(MODE_PRIVATE).getString("transfer_history_v1","[]"));
            JSONArray newer=new JSONArray();newer.put(new JSONObject().put("at",System.currentTimeMillis()).put("label",description));
            for(int i=0;i<Math.min(29,old.length());i++)newer.put(old.getJSONObject(i));
            getPreferences(MODE_PRIVATE).edit().putString("transfer_history_v1",newer.toString()).apply();
        }catch(Exception ignored){}renderRecent();
    }
    private void renderRecent(){
        if(recentList==null)return;recentList.removeAllViews();
        try{
            JSONArray items=new JSONArray(getPreferences(MODE_PRIVATE).getString("transfer_history_v1","[]"));
            if(items.length()==0){recentList.addView(text("No transfers yet.",13,Color.GRAY));return;}
            for(int i=0;i<Math.min(items.length(),8);i++){
                JSONObject item=items.getJSONObject(i);
                String when=android.text.format.DateFormat.format("MMM d, h:mm a",item.optLong("at")).toString();
                recentList.addView(text("• "+item.optString("label")+"  ·  "+when,12,Color.rgb(195,190,221)));
            }
        }catch(Exception ignored){recentList.addView(text("Activity unavailable.",12,Color.GRAY));}
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
                save.setOnClickListener(v->{if(transferBusy)return;downloadID=id;downloadName=name;Intent dest=new Intent(Intent.ACTION_CREATE_DOCUMENT);dest.addCategory(Intent.CATEGORY_OPENABLE);dest.setType("application/octet-stream");dest.putExtra(Intent.EXTRA_TITLE,name);startActivityForResult(dest,REQUEST_SAVE);});
            }
        },this::showError);
    }
    @Override protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);
        if(result!=RESULT_OK||data==null||client==null||!active||transferBusy)return;
        if(request==REQUEST_SEND){
            java.util.ArrayList<Uri> uris=new java.util.ArrayList<>();
            if(data.getClipData()!=null){for(int i=0;i<data.getClipData().getItemCount();i++)uris.add(data.getClipData().getItemAt(i).getUri());}
            else if(data.getData()!=null)uris.add(data.getData());
            if(uris.size()>20){showError(new Exception("Select no more than 20 files."));return;}
            if(uris.isEmpty())return;
            beginTransfer();final TransferCancellation token=currentTransfer;
            runAsync(()->{
                int completed=0;
                for(Uri uri:uris){
                    token.check();final int fileNumber=completed+1;
                    client.upload(this,uri,(done,total)->transferUpdate("Uploading file "+fileNumber+" of "+uris.size(),done,total),token);
                    completed++;
                }
                return completed;
            },count->{endTransfer();detail.setText("✓ Uploaded "+count+" file(s)");rememberTransfer("Sent "+count+" file(s) to Windows");notifyDone("Upload complete","Sent "+count+" file(s) to LokiVerse Windows");},
            error->{boolean cancelled=token.isCancelled();endTransfer();if(cancelled){detail.setText("Transfer cancelled");rememberTransfer("Cancelled phone → PC upload");}else showError(error);});
        }else if(request==REQUEST_SAVE&&data.getData()!=null){
            Uri dest=data.getData();String id=downloadID,name=downloadName;
            beginTransfer();final TransferCancellation token=currentTransfer;
            runAsync(()->{client.download(this,id,dest,(done,total)->transferUpdate("Downloading "+name,done,total),token);return name;},
            title->{endTransfer();transferProgress.setProgress(100);detail.setText("✓ Saved "+title);rememberTransfer("Downloaded "+title);notifyDone("Download complete",title);},
            error->{boolean cancelled=token.isCancelled();endTransfer();if(cancelled){detail.setText("Download cancelled. The selected destination may contain a partial file.");rememberTransfer("Cancelled download of "+name);}else showError(error);});
        }
    }
    private void showError(Exception e){status.setText("⚠ " + e.getMessage());Toast.makeText(this,e.getMessage(),Toast.LENGTH_LONG).show();}
    @Override protected void onDestroy(){if(currentTransfer!=null)currentTransfer.cancel();waiting=false;handler.removeCallbacksAndMessages(null);io.shutdownNow();super.onDestroy();}
}
