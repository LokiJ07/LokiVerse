package com.lokij.lokishare;

import org.junit.Test;
import static org.junit.Assert.*;

public final class PairingInputTest {
    @Test public void validQrIsTrimmed() {
        String value="lokiverse://pair?url=https%3A%2F%2F192.168.1.10%3A3488&join=secret&fp=abcd";
        assertEquals(value,PairingInput.validate("  "+value+"  "));
    }
    @Test public void rejectsOtherQrCodes() {
        assertRejected("https://example.com/qr?join=secret");
        assertRejected("javascript://pair?url=abc");
        assertRejected("");
    }
    @Test public void rejectsControlCharacters() {
        assertRejected("lokiverse://pair?url=secret"+(char)0+"bad&join=secret");
    }
    @Test public void rejectsOversizedInvites() {
        assertRejected("lokiverse://pair?"+"x".repeat(4096));
    }
    private static void assertRejected(String input) {
        try { PairingInput.validate(input); fail("Expected invalid input"); }
        catch (IllegalArgumentException expected) { /* expected */ }
    }
}
