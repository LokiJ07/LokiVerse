package com.lokij.lokishare;

/** Basic input sanitation only. PinnedClient performs authoritative URI, IP, secret and TLS checks. */
final class PairingInput {
    private PairingInput() {}
    static String validate(String raw) {
        if (raw == null) throw new IllegalArgumentException("QR code is empty.");
        String value = raw.trim();
        if (value.length() < 20 || value.length() > 4096)
            throw new IllegalArgumentException("QR invitation size is invalid.");
        if (!value.startsWith("lokiverse://pair?"))
            throw new IllegalArgumentException("This is not a LokiVerse pairing QR code.");
        for (int i=0; i<value.length(); i++) {
            char c=value.charAt(i);
            if (Character.isISOControl(c))
                throw new IllegalArgumentException("QR invitation contains invalid control characters.");
        }
        return value;
    }
}
