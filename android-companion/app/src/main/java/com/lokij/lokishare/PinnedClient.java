package com.lokij.lokishare;

import android.net.Uri;
import android.content.Context;
import android.database.Cursor;
import android.provider.OpenableColumns;

import org.json.JSONObject;
import org.json.JSONArray;

import java.io.InputStream;
import java.io.OutputStream;
import java.io.ByteArrayOutputStream;
import java.net.URL;
import java.net.InetAddress;
import java.net.HttpURLConnection;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.cert.CertificateException;
import java.security.cert.X509Certificate;
import java.util.Locale;
import javax.net.ssl.HostnameVerifier;
import javax.net.ssl.HttpsURLConnection;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

/** Each network call verifies the server's leaf certificate against the QR-pinned SHA-256. */
final class PinnedClient {
    private static final long MAX_FILE=512L*1024*1024;
    private final String base, join, expectedFingerprint, expectedIP;
    private final SSLContext tls;
    private String sessionCookie;
    private String pendingID, pendingKey;

    PinnedClient(String qr) throws Exception {
        Uri data=Uri.parse(qr);
        if (!"lokiverse".equals(data.getScheme()) || !"pair".equals(data.getHost())) throw new Exception("Not a LokiShare pairing QR.");
        String target=data.getQueryParameter("url");
        String key=data.getQueryParameter("join");
        String fp=data.getQueryParameter("fp");
        if (target==null || key==null || fp==null) throw new Exception("Incomplete QR invitation.");
        URL u=new URL(target);
        if (!"https".equals(u.getProtocol()) || !u.getPath().isEmpty() && !"/".equals(u.getPath()) || u.getUserInfo()!=null || u.getQuery()!=null || u.getRef()!=null || u.getPort()<1) throw new Exception("Invalid secure local address.");
        String host=u.getHost();
        if (!privateIPv4(host)) throw new Exception("Pairing is limited to private IPv4 Wi-Fi addresses.");
        if (!key.matches("[a-f0-9]{64}") || !fp.matches("(?i)[a-f0-9]{64}")) throw new Exception("Invalid QR security values.");
        base=target.replaceAll("/+$", "");join=key;expectedFingerprint=fp.toLowerCase(Locale.ROOT);expectedIP=host;
        X509TrustManager pinned=new X509TrustManager() {
            @Override public void checkClientTrusted(X509Certificate[] chain,String authType) throws CertificateException { throw new CertificateException("Client certificates not supported"); }
            @Override public X509Certificate[] getAcceptedIssuers(){ return new X509Certificate[0]; }
            @Override public void checkServerTrusted(X509Certificate[] chain,String authType) throws CertificateException {
                if(chain==null || chain.length==0) throw new CertificateException("Missing PC certificate.");
                try {
                    byte[] sha=MessageDigest.getInstance("SHA-256").digest(chain[0].getEncoded());
                    StringBuilder hex=new StringBuilder();for(byte b:sha)hex.append(String.format(Locale.ROOT,"%02x",b & 255));
                    if (!MessageDigest.isEqual(hex.toString().getBytes(StandardCharsets.US_ASCII),expectedFingerprint.getBytes(StandardCharsets.US_ASCII))) throw new CertificateException("PC security fingerprint mismatch. Do not connect.");
                    chain[0].checkValidity();
                } catch (CertificateException e) {throw e;} catch (Exception e){throw new CertificateException(e);}
            }
        };
        tls=SSLContext.getInstance("TLS");tls.init(null,new TrustManager[]{pinned},null);
    }
    static boolean privateIPv4(String value) {
        if(value==null || !value.matches("(?:\\d{1,3}\\.){3}\\d{1,3}"))return false;
        String[] p=value.split("\\.");int[] n=new int[4];
        for(int i=0;i<4;i++){n[i]=Integer.parseInt(p[i]);if(n[i]>255)return false;}
        return n[0]==10 || (n[0]==172&&n[1]>=16&&n[1]<=31) || (n[0]==192&&n[1]==168);
    }
    String address(){return base;}
    private HttpsURLConnection open(String route,String method) throws Exception {
        HttpsURLConnection connection=(HttpsURLConnection)new URL(base+route).openConnection();
        connection.setSSLSocketFactory(tls.getSocketFactory());
        // The pin authenticates the certificate; this checks the request is still going to the scanned IP.
        connection.setHostnameVerifier((host,session)->host.equals(expectedIP));
        connection.setRequestMethod(method);connection.setConnectTimeout(10000);connection.setReadTimeout(60000);
        connection.setInstanceFollowRedirects(false);
        connection.setRequestProperty("Accept","application/json");
        if(sessionCookie!=null)connection.setRequestProperty("Cookie",sessionCookie);
        if(!"GET".equals(method))connection.setRequestProperty("Origin",base);
        return connection;
    }
    private String read(HttpsURLConnection c) throws Exception {
        int code=c.getResponseCode();
        InputStream stream=code>=400?c.getErrorStream():c.getInputStream();
        ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] buf=new byte[8192];int n;
        if(stream!=null)try(InputStream in=stream){while((n=in.read(buf))!=-1){if(out.size()+n>1024*1024)throw new Exception("Oversized response.");out.write(buf,0,n);}}
        String result=out.toString(StandardCharsets.UTF_8.name());
        if(code<200||code>=300) {
            try{throw new Exception(new JSONObject(result).optString("error","HTTP "+code));}
            catch(org.json.JSONException e){throw new Exception("HTTP "+code);}
        }
        return result;
    }
    private JSONObject get(String route) throws Exception {
        // One bounded retry for idempotent metadata GETs on a transient timeout.
        // NEVER retry uploads automatically: the server may have already saved them.
        for(int attempt=0;attempt<2;attempt++) {
            HttpsURLConnection c=open(route,"GET");
            try {return new JSONObject(read(c));}
            catch(java.net.SocketTimeoutException timeout) {
                if(attempt==1)throw timeout;
                Thread.sleep(350);
            } finally {c.disconnect();}
        }
        throw new Exception("Unable to load file list.");
    }
    private JSONObject post(String route,JSONObject body) throws Exception {
        HttpsURLConnection c=open(route,"POST");c.setDoOutput(true);c.setRequestProperty("Content-Type","application/json");
        byte[] data=body.toString().getBytes(StandardCharsets.UTF_8);c.setFixedLengthStreamingMode(data.length);
        try{try(OutputStream out=c.getOutputStream()){out.write(data);}return new JSONObject(read(c));}finally{c.disconnect();}
    }
    String requestPair() throws Exception {
        JSONObject reply=post("/api/pair/request",new JSONObject().put("join",join).put("device","LokiShare Android"));
        pendingID=reply.getString("id");pendingKey=reply.getString("key");
        return reply.getString("match");
    }
    String poll() throws Exception {
        if(pendingID==null)throw new Exception("No pairing request.");
        HttpsURLConnection c=open("/api/pair/status?id="+URLEncoder.encode(pendingID,"UTF-8")+"&key="+URLEncoder.encode(pendingKey,"UTF-8"),"GET");
        try{
            String status=new JSONObject(read(c)).getString("status");
            if("approved".equals(status)) {
                String cookie=c.getHeaderField("Set-Cookie");
                if(cookie==null || !cookie.startsWith("loki_session=") || !cookie.contains("Secure"))throw new Exception("Secure session cookie missing.");
                sessionCookie=cookie.split(";",2)[0];pendingID=null;pendingKey=null;
            }
            if("rejected".equals(status)){pendingID=null;pendingKey=null;}
            return status;
        }finally{c.disconnect();}
    }
    JSONObject status()throws Exception{return get("/api/status");}
    JSONArray files()throws Exception{return get("/api/manifest").getJSONArray("files");}
    JSONObject upload(Context context, Uri uri, TransferProgress progress, TransferCancellation cancellation) throws Exception {
        String name="file";long size=-1;
        try(Cursor c=context.getContentResolver().query(uri,null,null,null,null)) {
            if(c!=null && c.moveToFirst()){
                int ni=c.getColumnIndex(OpenableColumns.DISPLAY_NAME);if(ni>=0)name=c.getString(ni);
                int si=c.getColumnIndex(OpenableColumns.SIZE);if(si>=0 && !c.isNull(si))size=c.getLong(si);
            }
        }
        if(size<0||size>MAX_FILE)throw new Exception("File size unavailable or over 512 MiB.");
        String route="/api/upload?name="+URLEncoder.encode(name,"UTF-8");
        HttpsURLConnection c=open(route,"POST");cancellation.attach(c);c.setDoOutput(true);c.setRequestProperty("Content-Type","application/octet-stream");c.setFixedLengthStreamingMode(size);
        try(InputStream input=context.getContentResolver().openInputStream(uri)) {
            if(input==null)throw new Exception("Could not read selected file.");
            try(OutputStream output=c.getOutputStream()){
                byte[] buf=new byte[64*1024];int n;long sent=0;
                while((n=input.read(buf))!=-1){cancellation.check();sent+=n;if(sent>size)throw new Exception("File changed during transfer.");output.write(buf,0,n);progress.onProgress(sent,size);}
                if(sent!=size)throw new Exception("File length changed during transfer.");
            }
            cancellation.check();return new JSONObject(read(c));
        }finally{cancellation.detach(c);c.disconnect();}
    }
    /**
     * Recover from up to two transient Wi-Fi interruptions using HTTPS Range + If-Range.
     * Download bytes land in a private temporary file first, so an interrupted request
     * never corrupts the user's chosen SAF document. Resume is scoped to this call.
     */
    void download(Context context,String id, Uri destination, TransferProgress progress, TransferCancellation cancellation) throws Exception {
        java.io.File partial=java.io.File.createTempFile("lokishare-", ".partial", context.getCacheDir());
        String etag=null;
        final String route="/api/download?id="+URLEncoder.encode(id,"UTF-8");
        try {
            boolean finished=false;
            for (int attempt=0;attempt<3 && !finished;attempt++) {
                cancellation.check();
                long offset=partial.length();
                HttpsURLConnection c=open(route,"GET");
                if (offset>0 && etag!=null) {
                    c.setRequestProperty("Range","bytes="+offset+"-");
                    c.setRequestProperty("If-Range",etag);
                }
                cancellation.attach(c);
                try {
                    int http=c.getResponseCode();
                    if (http!=200 && http!=206) {
                        read(c);throw new Exception("Download rejected (HTTP "+http+").");
                    }
                    ResumeProtocol.Plan plan=ResumeProtocol.inspect(http,c.getHeaderField("Content-Range"),
                        c.getHeaderField("ETag"),etag,offset,c.getContentLengthLong(),MAX_FILE);
                    if (plan.start==0 && offset>0) {
                        // Server says file changed or ignored range: start fresh, don't combine versions.
                        try(java.io.RandomAccessFile reset=new java.io.RandomAccessFile(partial,"rw")){reset.setLength(0);}
                        offset=0;
                    }
                    etag=c.getHeaderField("ETag");
                    if (new android.os.StatFs(context.getCacheDir().getAbsolutePath()).getAvailableBytes()
                            < plan.total-offset+1024*1024) {
                        throw new Exception("Not enough free phone storage for secure download recovery.");
                    }
                    try(InputStream input=c.getInputStream();
                        java.io.RandomAccessFile output=new java.io.RandomAccessFile(partial,"rw")) {
                        output.seek(plan.start);
                        long done=plan.start;int n;byte[] buf=new byte[64*1024];
                        while((n=input.read(buf))!=-1) {
                            cancellation.check();output.write(buf,0,n);done+=n;
                            if(done>plan.total)throw new Exception("Download exceeded expected size.");
                            progress.onProgress(done,plan.total);
                        }
                        if(done!=plan.total)throw new java.io.EOFException("Wi-Fi connection ended before download finished.");
                        finished=true;
                    }
                } catch(java.io.IOException network) {
                    if(cancellation.isCancelled() || network instanceof javax.net.ssl.SSLException || attempt==2) throw network;
                    // The next attempt requests only remaining bytes with the ETag we verified.
                    cancellation.check();
                    Thread.sleep(400L*(attempt+1));
                } finally {
                    cancellation.detach(c);c.disconnect();
                }
            }
            if(!finished)throw new Exception("Download interrupted. Please retry.");
            cancellation.check();
            // Only publish to user-selected SAF location after the complete download is verified.
            try(InputStream source=new java.io.FileInputStream(partial);
                OutputStream out=context.getContentResolver().openOutputStream(destination,"wt")) {
                if(out==null)throw new Exception("Could not save the downloaded file.");
                byte[] buf=new byte[64*1024];int n;
                while((n=source.read(buf))!=-1){cancellation.check();out.write(buf,0,n);}
            }
        } finally {
            if(!partial.delete())partial.deleteOnExit();
        }
    }
    interface TransferProgress {void onProgress(long bytes,long total);}
}
