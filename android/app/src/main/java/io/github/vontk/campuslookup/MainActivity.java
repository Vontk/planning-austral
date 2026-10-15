package io.github.vontk.campuslookup;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Collections;

/** Bundled UI on a private HTTPS origin; only the public Planning reports reach the network. */
public class MainActivity extends Activity {
    static final String ORIGIN = "https://appassets.androidplatform.net";
    static final String PLANNING = "https://planning-campus.austral.edu.ar:44443/";
    private WebView web;

    @SuppressLint("SetJavaScriptEnabled")
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(30, 30, 30));
        web.setLayoutParams(new ViewGroup.LayoutParams(-1, -1));
        web.setOnApplyWindowInsetsListener((view, insets) -> {
            view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets.consumeSystemWindowInsets();
        });
        setContentView(web);
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setJavaScriptCanOpenWindowsAutomatically(false);
        settings.setSupportMultipleWindows(false);
        CookieManager.getInstance().setAcceptCookie(false);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                if (!"GET".equals(request.getMethod()) || !"https".equals(uri.getScheme())
                        || !"appassets.androidplatform.net".equals(uri.getAuthority())) return reply(403, "Forbidden", "text/plain", "Blocked".getBytes(StandardCharsets.UTF_8));
                if ("/api/planning".equals(uri.getPath())) return planning(uri.getQueryParameter("path"));
                if ("/logo.svg".equals(uri.getPath())) {
                    try (InputStream input = getAssets().open("logo.svg")) { return reply(200, "OK", "image/svg+xml", readBounded(input)); }
                    catch (Exception ignored) { return reply(404, "Not Found", "text/plain", new byte[0]); }
                }
                return reply(404, "Not Found", "text/plain", new byte[0]);
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                openExternal(request.getUrl());
                return true;
            }
        });
        web.setDownloadListener((url, userAgent, disposition, type, length) -> openExternal(Uri.parse(url)));
        try (InputStream input = getAssets().open("index.html")) {
            web.loadDataWithBaseURL(ORIGIN + "/", new String(readBounded(input), StandardCharsets.UTF_8), "text/html", "UTF-8", null);
        } catch (Exception error) { throw new IllegalStateException("Bundled interface missing", error); }
    }

    private void openExternal(Uri uri) {
        if (!"https".equals(uri.getScheme()) || !"planning-campus.austral.edu.ar".equals(uri.getHost())) return;
        try { startActivity(new Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE)); }
        catch (ActivityNotFoundException ignored) { android.widget.Toast.makeText(this, "No hay un navegador instalado", android.widget.Toast.LENGTH_SHORT).show(); }
    }

    static boolean allowedPath(String path) {
        if (path == null || path.length() > 4096 || path.indexOf('\\') >= 0) return false;
        try {
            URI uri = new URI(path);
            return !uri.isAbsolute() && uri.getRawAuthority() == null && uri.getRawFragment() == null
                && ("day.php".equals(uri.getRawPath()) || "report.php".equals(uri.getRawPath()));
        } catch (Exception ignored) { return false; }
    }

    static byte[] readBounded(InputStream input) throws java.io.IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[8192];
        int size;
        while ((size = input.read(buffer)) != -1) {
            if (output.size() + size > 10_000_000) throw new java.io.IOException("Response too large");
            output.write(buffer, 0, size);
        }
        return output.toByteArray();
    }

    private WebResourceResponse planning(String path) {
        if (!allowedPath(path)) return reply(400, "Bad Request", "text/plain", new byte[0]);
        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(PLANNING + path).openConnection();
            connection.setInstanceFollowRedirects(false);
            connection.setConnectTimeout(15000);
            connection.setReadTimeout(35000);
            connection.setRequestProperty("User-Agent", "CampusLookupAndroid/1.0");
            connection.setRequestProperty("Accept-Encoding", "identity");
            if (connection.getResponseCode() != 200) throw new java.io.IOException("Planning unavailable");
            String type = connection.getContentType();
            String mime = type != null && type.toLowerCase(java.util.Locale.ROOT).contains("text/html") ? "text/html" : "text/plain";
            String encoding = "UTF-8";
            if (type != null) {
                java.util.regex.Matcher charset = java.util.regex.Pattern.compile("charset=[\"']?([a-zA-Z0-9_-]+)", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(type);
                if (charset.find()) encoding = java.nio.charset.Charset.forName(charset.group(1)).name();
            }
            try (InputStream input = connection.getInputStream()) {
                return new WebResourceResponse(mime, encoding, 200, "OK", Collections.singletonMap("Cache-Control", "no-store"), new ByteArrayInputStream(readBounded(input)));
            }
        } catch (Exception error) { return reply(502, "Bad Gateway", "text/plain", "No se pudo conectar con Planning".getBytes(StandardCharsets.UTF_8)); }
        finally { if (connection != null) connection.disconnect(); }
    }

    private static WebResourceResponse reply(int status, String reason, String mime, byte[] data) {
        return new WebResourceResponse(mime, "UTF-8", status, reason, Collections.singletonMap("Cache-Control", "no-store"), new ByteArrayInputStream(data));
    }
    @Override protected void onPause() { super.onPause(); web.onPause(); web.evaluateJavascript("window.campusPause && campusPause()", null); }
    @Override protected void onResume() { super.onResume(); if (web != null) { web.onResume(); web.evaluateJavascript("window.campusResume && campusResume()", null); } }
    @Override protected void onDestroy() { web.destroy(); super.onDestroy(); }
}
