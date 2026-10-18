<?xml version="1.0" encoding="UTF-8"?>
<!-- A readable view of Nimtto's sitemaps in a browser. Search engines read the XML and ignore this. -->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
  xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>
  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="utf-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <meta name="robots" content="noindex"/>
        <title>Sitemap · Nimtto</title>
        <style>
          :root { --ink: #1e1216; --ink-2: #5b4a50; --line: #eadfe2; --accent: #A8123A; --soft: #fff6f7; }
          * { box-sizing: border-box; }
          body { margin: 0; background: #fff; color: var(--ink); font: 15px/1.55 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; }
          .wrap { max-width: 1100px; margin: 0 auto; padding: 40px 20px 64px; }
          .brand { font-weight: 700; font-size: 20px; color: var(--accent); letter-spacing: -0.01em; }
          h1 { font-size: 28px; margin: 18px 0 6px; letter-spacing: -0.02em; }
          p.lede { color: var(--ink-2); margin: 0 0 22px; }
          .count { display: inline-block; background: var(--soft); border: 1px solid var(--line); border-radius: 999px; padding: 3px 12px; font-size: 13px; color: var(--ink-2); margin-bottom: 18px; }
          table { width: 100%; border-collapse: collapse; border: 1px solid var(--line); border-radius: 14px; overflow: hidden; }
          th, td { text-align: left; padding: 11px 14px; border-bottom: 1px solid var(--line); vertical-align: top; }
          th { background: var(--soft); font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: var(--ink-2); }
          tr:last-child td { border-bottom: 0; }
          td.n { width: 48px; color: var(--ink-2); font-variant-numeric: tabular-nums; }
          td.d { width: 130px; color: var(--ink-2); white-space: nowrap; font-variant-numeric: tabular-nums; }
          td.i { width: 90px; color: var(--ink-2); text-align: right; }
          a { color: var(--ink); text-decoration: none; word-break: break-all; }
          a:hover { color: var(--accent); text-decoration: underline; }
          .foot { margin-top: 18px; font-size: 13px; color: var(--ink-2); }
          @media (max-width: 640px) { td.n, th.n, td.i, th.i { display: none; } h1 { font-size: 22px; } }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="brand">Nimtto</div>
          <xsl:choose>
            <xsl:when test="s:sitemapindex">
              <h1>Sitemap index</h1>
              <p class="lede">The sitemaps of nimtto.com. Open one to see its pages.</p>
              <span class="count"><xsl:value-of select="count(s:sitemapindex/s:sitemap)"/> sitemaps</span>
              <table>
                <tr><th class="n">#</th><th>Sitemap</th><th>Last changed</th></tr>
                <xsl:for-each select="s:sitemapindex/s:sitemap">
                  <tr>
                    <td class="n"><xsl:value-of select="position()"/></td>
                    <td><a href="{s:loc}"><xsl:value-of select="s:loc"/></a></td>
                    <td class="d"><xsl:value-of select="substring(s:lastmod, 1, 10)"/></td>
                  </tr>
                </xsl:for-each>
              </table>
            </xsl:when>
            <xsl:otherwise>
              <h1>Sitemap</h1>
              <p class="lede">Pages on nimtto.com that search engines may list. <a href="/sitemap.xml">Back to all sitemaps</a></p>
              <span class="count"><xsl:value-of select="count(s:urlset/s:url)"/> pages</span>
              <table>
                <tr><th class="n">#</th><th>Page</th><th class="i">Images</th><th>Last changed</th></tr>
                <xsl:for-each select="s:urlset/s:url">
                  <tr>
                    <td class="n"><xsl:value-of select="position()"/></td>
                    <td><a href="{s:loc}"><xsl:value-of select="s:loc"/></a></td>
                    <td class="i"><xsl:value-of select="count(image:image)"/></td>
                    <td class="d"><xsl:value-of select="substring(s:lastmod, 1, 10)"/></td>
                  </tr>
                </xsl:for-each>
              </table>
            </xsl:otherwise>
          </xsl:choose>
          <p class="foot">nimtto.com · Online invitations for Nepal and the world</p>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
