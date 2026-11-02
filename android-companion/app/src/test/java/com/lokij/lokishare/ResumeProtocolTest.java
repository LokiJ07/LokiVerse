package com.lokij.lokishare;
import org.junit.Test;
import static org.junit.Assert.*;
public class ResumeProtocolTest {
 @Test public void firstDownload(){ResumeProtocol.Plan p=ResumeProtocol.inspect(200,null,"\"a\"",null,0,100,512);assertEquals(0,p.start);assertEquals(100,p.total);}
 @Test public void validResume(){ResumeProtocol.Plan p=ResumeProtocol.inspect(206,"bytes 25-99/100","\"a\"","\"a\"",25,75,512);assertEquals(25,p.start);assertEquals(100,p.total);}
 @Test(expected=IllegalArgumentException.class) public void fingerprintMismatch(){ResumeProtocol.inspect(206,"bytes 25-99/100","\"b\"","\"a\"",25,75,512);}
 @Test(expected=IllegalArgumentException.class) public void malformedRange(){ResumeProtocol.inspect(206,"bytes 24-99/100","\"a\"","\"a\"",25,76,512);}
 @Test(expected=IllegalArgumentException.class) public void oversized(){ResumeProtocol.inspect(200,null,"\"a\"",null,0,600,512);}
 @Test public void staleValidatorStartsFromZero(){ResumeProtocol.Plan p=ResumeProtocol.inspect(200,null,"\"new\"","\"old\"",25,100,512);assertEquals(0,p.start);}
}
