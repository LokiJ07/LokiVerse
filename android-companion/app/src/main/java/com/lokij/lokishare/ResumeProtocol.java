package com.lokij.lokishare;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Pure-Java validator for HTTP Range responses; no unverified append ever occurs. */
final class ResumeProtocol {
    private static final Pattern RANGE=Pattern.compile("^bytes (\\d+)-(\\d+)/(\\d+)$");
    private ResumeProtocol() {}
    static final class Plan {
        final long start,total;
        Plan(long start,long total){this.start=start;this.total=total;}
    }
    static Plan inspect(int http,String range,String etag,String expected,long previous,long length,long max) {
        if(http==200) {
            if(length<0 || length>max)throw new IllegalArgumentException("Missing or invalid file length.");
            return new Plan(0,length);
        }
        if(http!=206 || previous<=0 || expected==null || !expected.equals(etag))
            throw new IllegalArgumentException("Unexpected resume response or changed file.");
        Matcher matcher=RANGE.matcher(range==null?"":range);
        if(!matcher.matches())throw new IllegalArgumentException("Invalid Content-Range.");
        try {
            long start=Long.parseLong(matcher.group(1));
            long end=Long.parseLong(matcher.group(2));
            long total=Long.parseLong(matcher.group(3));
            if(start!=previous || total<=0 || total>max || end<start || end!=total-1 || length!=total-start)
                throw new IllegalArgumentException("Unexpected resume offsets.");
            return new Plan(start,total);
        }catch(NumberFormatException error){throw new IllegalArgumentException("Invalid resume offsets.",error);}
    }
}
