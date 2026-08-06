package mt.tiko.kotlinkit

import kotlin.test.Test
import kotlin.test.assertEquals

/**
 * Parity tests for [TikoImageURL] against `TikoImageURL.swift`.
 *
 * The CDN URL shape is asserted literally, character for character. It is a
 * public contract with Cloudflare Image Resizing, and the Swift original is
 * currently the only implementation in production — a rewritten URL that is
 * merely *plausible* would silently serve unresized images.
 */
class TikoImageURLTest {

    private val upload = "https://data.tikocdn.org/uploads/1756901709154-boy.png"

    @Test
    fun smallIsTheDefault_andUsesQuality80() {
        assertEquals(
            "https://data.tikocdn.org/cdn-cgi/image/width=200,quality=80,f=auto/uploads/1756901709154-boy.png",
            TikoImageURL.resized(upload),
        )
    }

    @Test
    fun largerSizesUseQuality85() {
        // Not a tidy-up target: the Swift original picks 80 for `small` and 85
        // for everything else, and the parity contract is that quirk included.
        assertEquals(
            "https://data.tikocdn.org/cdn-cgi/image/width=800,quality=85,f=auto/uploads/1756901709154-boy.png",
            TikoImageURL.resized(upload, TikoImageSize.MEDIUM),
        )
        assertEquals(
            "https://data.tikocdn.org/cdn-cgi/image/width=1200,quality=85,f=auto/uploads/1756901709154-boy.png",
            TikoImageURL.resized(upload, TikoImageSize.LARGE),
        )
    }

    @Test
    fun originalIsReturnedUntouched() {
        assertEquals(upload, TikoImageURL.resized(upload, TikoImageSize.ORIGINAL))
    }

    @Test
    fun explicitWidthMatchesTheMediaMatchersCall() {
        // TikoMediaMatcher.resizedCDNURL uses width 600, quality 80.
        assertEquals(
            "https://data.tikocdn.org/cdn-cgi/image/width=600,quality=80,f=auto/uploads/1756901709154-boy.png",
            TikoImageURL.resizedToWidth(upload, width = 600),
        )
    }

    @Test
    fun nonTikoHostsPassThrough() {
        val foreign = "https://example.com/uploads/photo.png"
        assertEquals(foreign, TikoImageURL.resized(foreign))
        assertEquals(foreign, TikoImageURL.resizedToWidth(foreign, width = 600))
    }

    @Test
    fun tikoHostOutsideUploadsPassesThrough() {
        // The Swift guard requires BOTH the CDN host and the /uploads/ prefix.
        val other = "https://data.tikocdn.org/static/logo.png"
        assertEquals(other, TikoImageURL.resized(other))
    }

    @Test
    fun queryStringsAreDropped() {
        // Foundation's `URL.path` excludes the query, and the Swift original
        // interpolates only the path — so the rewritten URL loses `?v=2`.
        assertEquals(
            "https://data.tikocdn.org/cdn-cgi/image/width=200,quality=80,f=auto/uploads/a.png",
            TikoImageURL.resized("https://data.tikocdn.org/uploads/a.png?v=2"),
        )
    }

    @Test
    fun fragmentsAreDropped() {
        assertEquals(
            "https://data.tikocdn.org/cdn-cgi/image/width=200,quality=80,f=auto/uploads/a.png",
            TikoImageURL.resized("https://data.tikocdn.org/uploads/a.png#top"),
        )
    }

    @Test
    fun portsAndUserinfoDoNotDefeatHostMatching() {
        // Foundation's `URL.host` excludes both, so these are still CDN uploads.
        assertEquals(
            "https://data.tikocdn.org/cdn-cgi/image/width=200,quality=80,f=auto/uploads/a.png",
            TikoImageURL.resized("https://data.tikocdn.org:443/uploads/a.png"),
        )
    }

    @Test
    fun unparseableInputPassesThrough() {
        assertEquals("not a url", TikoImageURL.resized("not a url"))
        assertEquals("", TikoImageURL.resized(""))
    }

    @Test
    fun httpIsRewrittenToHttps() {
        // The Swift original always rebuilds with an https scheme, whatever came
        // in — worth pinning, because it is a behaviour change on the caller's
        // input rather than a passthrough.
        assertEquals(
            "https://data.tikocdn.org/cdn-cgi/image/width=200,quality=80,f=auto/uploads/a.png",
            TikoImageURL.resized("http://data.tikocdn.org/uploads/a.png"),
        )
    }
}
