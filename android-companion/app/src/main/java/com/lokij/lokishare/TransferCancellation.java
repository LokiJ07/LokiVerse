package com.lokij.lokishare;

import java.io.IOException;
import javax.net.ssl.HttpsURLConnection;

/** Cooperative cancellation of one HTTPS transfer or a selected upload batch. */
final class TransferCancellation {
    private volatile boolean cancelled;
    private volatile HttpsURLConnection connection;
    void attach(HttpsURLConnection current) throws IOException {
        connection=current;
        check();
    }
    void detach(HttpsURLConnection current) {
        if (connection==current) connection=null;
    }
    void cancel() {
        cancelled=true;
        HttpsURLConnection current=connection;
        if (current!=null)current.disconnect();
    }
    boolean isCancelled(){return cancelled;}
    void check() throws IOException {if(cancelled) throw new IOException("Transfer cancelled.");}
}
