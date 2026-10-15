package io.github.vontk.campuslookup;

import org.junit.Test;
import static org.junit.Assert.*;
import java.io.ByteArrayInputStream;
import java.io.IOException;

public class PlanningBoundaryTest {
    @Test public void acceptsOnlyPublicReportPaths() {
        assertTrue(MainActivity.allowedPath("day.php?year=2026&month=10&day=15"));
        assertTrue(MainActivity.allowedPath("report.php?areamatch=Bs.%20As."));
        for (String path : new String[]{null, "", "https://evil.example/day.php", "//evil.example/day.php", "/day.php", "../day.php", "day.php#x", "day.php\\x", "admin.php", "day%2ephp", "day.php\r\nX: injected"}) assertFalse(String.valueOf(path), MainActivity.allowedPath(path));
    }
    @Test public void rejectsOversizedPaths() { assertFalse(MainActivity.allowedPath("day.php?" + "a".repeat(4096))); }
    @Test public void readsCompleteResponse() throws Exception {
        byte[] body = "áula\nreserva".getBytes(java.nio.charset.StandardCharsets.UTF_8);
        assertArrayEquals(body, MainActivity.readBounded(new ByteArrayInputStream(body)));
    }
    @Test(expected=IOException.class) public void rejectsOversizedResponse() throws Exception {
        MainActivity.readBounded(new ByteArrayInputStream(new byte[10_000_001]));
    }
}
