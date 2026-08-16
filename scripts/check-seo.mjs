#!/usr/bin/env node
// Structural SEO assertions (OSS_SPEC §11.3) over the built site in dist/.
// Errors exit 1 and block CI; run with `npm run check:seo` after a build.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const dist = join(process.cwd(), "dist");
const failures = [];

function assert(cond, message) {
  if (!cond) failures.push(message);
}

assert(existsSync(dist), "dist/ missing — run `npm run build` first");

const indexPath = join(dist, "index.html");
assert(existsSync(indexPath), "dist/index.html missing");
const html = existsSync(indexPath) ? readFileSync(indexPath, "utf8") : "";

// Head signals.
assert(/<title>[^<]{5,}<\/title>/.test(html), "missing or empty <title>");
assert(html.includes('name="description"'), "missing meta description");
assert(html.includes('rel="canonical"'), "missing canonical link");
assert(html.includes('property="og:title"'), "missing og:title");
assert(html.includes('property="og:image"'), "missing og:image");
assert(html.includes('name="twitter:card"'), "missing twitter:card");
assert(html.includes("application/ld+json"), "missing JSON-LD block");
assert(html.includes('rel="manifest"'), "missing manifest link (PWA)");
assert(html.includes('name="theme-color"'), "missing theme-color meta");
assert(html.includes('name="robots"'), "missing robots meta");

// The og:image the meta points at must actually ship.
const og = /property="og:image"\s+content="([^"]+)"/.exec(html)?.[1];
if (og) {
  const file = og.split("/").pop();
  assert(
    existsSync(join(dist, file)),
    `og:image points at ${file}, which is not in dist/`,
  );
}

// JSON-LD must parse and agree with the og:image.
const ld = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/.exec(
  html,
)?.[1];
if (ld) {
  try {
    const doc = JSON.parse(ld);
    assert(
      doc.image && og && doc.image.endsWith(og.split("/").pop()),
      "JSON-LD image drifted from og:image",
    );
  } catch {
    failures.push("JSON-LD does not parse");
  }
}

// Crawler files.
for (const f of [
  "robots.txt",
  "sitemap.xml",
  "llms.txt",
  "manifest.webmanifest",
]) {
  assert(existsSync(join(dist, f)), `missing dist/${f}`);
}

// The canonical URL, the sitemap, robots' sitemap pointer, and the CNAME that
// decides which domain actually answers all have to name the SAME host. They
// live in four files, so this is exactly the kind of drift that ships quietly
// and then splits the site's identity across two domains.
const canonical = /rel="canonical"\s+href="([^"]+)"/.exec(html)?.[1];
let canonicalHost;
if (canonical) {
  canonicalHost = new URL(canonical).host;
}

if (existsSync(join(dist, "robots.txt"))) {
  const robots = readFileSync(join(dist, "robots.txt"), "utf8");
  assert(
    robots.includes("sitemap.xml"),
    "robots.txt does not point at the sitemap",
  );
  const sitemapLine = /Sitemap:\s*(\S+)/i.exec(robots)?.[1];
  if (sitemapLine && canonicalHost) {
    assert(
      new URL(sitemapLine).host === canonicalHost,
      `robots.txt Sitemap host (${new URL(sitemapLine).host}) != canonical host (${canonicalHost})`,
    );
  }
}

if (existsSync(join(dist, "sitemap.xml")) && canonical) {
  const sitemap = readFileSync(join(dist, "sitemap.xml"), "utf8");
  assert(
    sitemap.includes(`<loc>${canonical}</loc>`),
    `sitemap.xml has no <loc> for the canonical URL ${canonical}`,
  );
}

// The custom domain is served off this file; without it Pages falls back to
// the github.io project path and every absolute URL above points elsewhere.
const cnamePath = join(dist, "CNAME");
assert(existsSync(cnamePath), "missing dist/CNAME (custom domain)");
if (existsSync(cnamePath) && canonicalHost) {
  const cname = readFileSync(cnamePath, "utf8").trim();
  assert(
    cname === canonicalHost,
    `CNAME (${cname}) does not match the canonical host (${canonicalHost})`,
  );
}

// PWA shape: the emitted worker + manifests usePwaUpdate reads.
for (const f of ["sw.js", "version.json", "precache-manifest.json"]) {
  assert(existsSync(join(dist, f)), `missing dist/${f} (PWA build output)`);
}

if (failures.length) {
  console.error(`check-seo: ${failures.length} failure(s):`);
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exit(1);
}
console.log("check-seo: all structural SEO/PWA assertions pass");
