package com.lokij.lokishare;

import org.junit.Test;
import static org.junit.Assert.*;
import java.io.IOException;

public class TransferCancellationTest {
    @Test public void cancellationInterruptsFurtherChunks() throws Exception {
        TransferCancellation token=new TransferCancellation();
        assertFalse(token.isCancelled());
        token.check();
        token.cancel();
        assertTrue(token.isCancelled());
        try {token.check();fail("Expected upload/download chunk to be rejected after cancellation");}
        catch(IOException expected) {assertEquals("Transfer cancelled.",expected.getMessage());}
    }
}
