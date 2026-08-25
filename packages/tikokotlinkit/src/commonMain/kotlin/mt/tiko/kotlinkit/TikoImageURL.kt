package mt.tiko.kotlinkit

/**
 * CDN-resized image URLs.
 *
 * Port of `TikoImageURL.swift` in packages/tikokit-ios. Behaviour is pinned to
 * the Swift original by parity tests, including its quirks — a URL that is not a
 * Tiko CDN upload comes back untouched rather than raising.
 *
 * Kotlin common has no URL type, so this parses the string directly. That is
 * closer to the truth anyway: the Swift version only ever looks at the host and
 * the path, and deliberately drops any query string when rewriting.
 */
public enum class TikoImageSize(public val width: Int) {
    SMALL(200),
    MEDIUM(800),
    LARGE(1200),
    ORIGINAL(0),
}

public object TikoImageURL {
    private const val CDN_HOST: String = "data.tikocdn.org"
    private const val UPLOAD_PREFIX: String = "/uploads/"

    /** scheme, authority, path — the path group stops at `?` or `#`, matching
     *  Foundation's `URL.path`. */
    private val URL_PARTS: Regex = Regex("""^([A-Za-z][A-Za-z0-9+.\-]*)://([^/?#]*)([^?#]*)""")

    /**
     * Returns a CDN-resized URL, or the input unchanged when it is not a Tiko
     * CDN upload or when [size] is [TikoImageSize.ORIGINAL].
     */
    public fun resized(url: String, size: TikoImageSize = TikoImageSize.SMALL): String {
        if (size == TikoImageSize.ORIGINAL) return url
        val path = cdnUploadPath(url) ?: return url
        // The Swift original uses quality 80 for `small` and 85 for everything
        // else. Preserved rather than tidied.
        val quality = if (size == TikoImageSize.SMALL) 80 else 85
        return rewrite(path, size.width, quality)
    }

    /**
     * Returns a CDN-resized URL at an explicit pixel width, or the input
     * unchanged when it is not a Tiko CDN upload.
     *
     * Named distinctly from [resized] rather than overloading it: Kotlin/Native
     * mangles same-named functions across the Objective-C bridge, and this API
     * is meant to read cleanly from Swift.
     */
    public fun resizedToWidth(url: String, width: Int, quality: Int = 80): String {
        val path = cdnUploadPath(url) ?: return url
        return rewrite(path, width, quality)
    }

    /** The path component when [url] is a Tiko CDN upload, else null. */
    private fun cdnUploadPath(url: String): String? {
        // The regex is anchored with ^, so `find` is the right call — the URL is
        // not expected to match end-to-end.
        val match = URL_PARTS.find(url) ?: return null
        val authority = match.groupValues[2]
        val path = match.groupValues[3]
        // Foundation's `URL.host` excludes any userinfo and port.
        val host = authority.substringAfterLast('@').substringBefore(':')
        if (host != CDN_HOST) return null
        if (!path.startsWith(UPLOAD_PREFIX)) return null
        return path
    }

    private fun rewrite(path: String, width: Int, quality: Int): String =
        "https://$CDN_HOST/cdn-cgi/image/width=$width,quality=$quality,f=auto$path"
}
