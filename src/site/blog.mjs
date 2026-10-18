// The blog's build-time part: the two page shells (blog/index.html, international/blog/index.html) get the site's
// header, footer, dialogs, CSS and JS from the partials like every page; the server fills <!--blog:head--> and
// <!--blog:main--> with the index or a post (server/lib/blog-render.js). Partial:
//   <!--@blog-head-->  the head tags every page shares (icons, font preloads, the organisation JSON-LD), without the
//                      page's own title and meta (the server writes those per page).
// Plain module: Node runs it at build, never the browser.
import { ORG_LD, jsonLd, iconTags } from './partials.mjs';

function blogHead(site) {
  return `${iconTags(site === 'intl' ? 'intl' : 'np')}
  <link rel="preload" href="/site/fonts/instrument-serif-latin.woff2" as="font" type="font/woff2" crossorigin />
  <link rel="preload" href="/site/fonts/geist-latin.woff2" as="font" type="font/woff2" crossorigin />
  ${jsonLd(ORG_LD)}`;
}

export const BLOG_PARTIALS = { 'blog-head': blogHead };
