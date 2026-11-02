package com.lokij.lokishare;

import android.content.Context;
import android.net.wifi.WifiManager;
import org.json.JSONObject;
import java.io.IOException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetSocketAddress;
import java.net.SocketTimeoutException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;

/** Optional, time-bounded LAN broadcast listening. UDP is NOT authenticated.
 * This returns display hints only: it NEVER supplies an invitation, pin, or credentials.
 */
final class NearbyDiscovery {
    static final int PORT=43961;
    private static final String MAGIC="lokishare-discovery-v1";
    static List<String> scan(Context context, long durationMs) throws Exception {
        LinkedHashSet<String> found=new LinkedHashSet<>();
        WifiManager.MulticastLock lock=null;
        try {
            WifiManager wifi=(WifiManager)context.getApplicationContext().getSystemService(Context.WIFI_SERVICE);
            if(wifi!=null){
                try {
                    lock=wifi.createMulticastLock("LokiShareNearbyScan");
                    lock.setReferenceCounted(false);
                    lock.acquire();
                } catch (RuntimeException error) {lock=null;}
            }
            try(DatagramSocket socket=new DatagramSocket(null)) {
                socket.setReuseAddress(true);
                socket.bind(new InetSocketAddress(PORT));
                socket.setSoTimeout(850);
                byte[] data=new byte[1024];
                long end=System.nanoTime()+Math.min(Math.max(durationMs,1000),12000)*1000000L;
                while(System.nanoTime()<end && !Thread.currentThread().isInterrupted()){
                    DatagramPacket packet=new DatagramPacket(data,data.length);
                    try {socket.receive(packet);} catch(SocketTimeoutException timeout){continue;}
                    try {
                        if(packet.getLength()>512) continue;
                        JSONObject json=new JSONObject(new String(packet.getData(),packet.getOffset(),packet.getLength(),StandardCharsets.UTF_8));
                        if(!MAGIC.equals(json.optString("magic")))continue;
                        String host=json.optString("address"), actual=packet.getAddress().getHostAddress();
                        int port=json.optInt("port",0);
                        if(!host.equals(actual) || !PinnedClient.privateIPv4(host) || port<1 || port>65535)continue;
                        String name=json.optString("name","LokiVerse PC").replaceAll("[\\p{Cntrl}<>]","");
                        if(name.length()>48)name=name.substring(0,48);
                        found.add((name.isEmpty()?"LokiVerse PC":name)+" · "+host+":"+port);
                        if(found.size()>=12)break;
                    }catch(Exception ignored){/* Other LAN devices may broadcast arbitrary packets. */}
                }
            }
        } finally {if(lock!=null&&lock.isHeld())lock.release();}
        return new ArrayList<>(found);
    }
}
