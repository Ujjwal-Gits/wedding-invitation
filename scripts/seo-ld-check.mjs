// A small JSON-LD checker for the types this site uses: every node's @type must be a schema.org type we know, the
// properties Google's rich results need must be there, and URLs must be absolute https on nimtto.com (or a known
// external profile). Used by scripts/seo-crawl.mjs; plain module, no dependencies.
// Google's rules: https://developers.google.com/search/docs/appearance/structured-data/search-gallery

/** Required (error) and recommended (warn) properties per type. A '|' means "one of". */
const RULES = {
  Organization: { req: ['name', 'url'], rec: ['logo', 'contactPoint|email'] },
  WebSite: { req: ['name', 'url'], rec: ['publisher'] },
  WebPage: { req: ['name', 'url'], rec: ['description', 'inLanguage', 'isPartOf'] },
  CollectionPage: { req: ['name', 'url'], rec: ['description', 'inLanguage'] },
  ItemPage: { req: ['name', 'url'], rec: ['description', 'inLanguage'] },
  ContactPage: { req: ['name', 'url'], rec: ['description'] },
  AboutPage: { req: ['name', 'url'], rec: ['description', 'about|mainEntity'] },
  ProfilePage: { req: ['name', 'url', 'mainEntity'] },
  FAQPage: { req: ['mainEntity'] },
  Question: { req: ['name', 'acceptedAnswer'] },
  Answer: { req: ['text'] },
  BreadcrumbList: { req: ['itemListElement'] },
  ListItem: { req: ['position'], rec: ['name|item'] },
  ItemList: { req: ['itemListElement'] },
  ImageObject: { req: ['url|contentUrl'] },
  Product: { req: ['name', 'offers|review|aggregateRating'], rec: ['image', 'description', 'brand'] },
  Offer: { req: ['price|priceSpecification', 'priceCurrency|priceSpecification'], rec: ['availability', 'url'] },
  AggregateOffer: { req: ['lowPrice', 'priceCurrency'] },
  PriceSpecification: { req: ['priceCurrency'] },
  UnitPriceSpecification: { req: ['priceCurrency'] },
  MonetaryAmount: { req: ['currency'] },
  OfferCatalog: { req: ['itemListElement'] },
  Service: { req: ['name|serviceType'], rec: ['provider', 'areaServed'] },
  HowTo: { req: ['name', 'step'] },
  HowToStep: { req: ['text|itemListElement'] },
  HowToSupply: { req: ['name'] },
  Brand: { req: ['name'] },
  ContactPoint: { req: ['contactType'], rec: ['email|telephone|url'] },
  PostalAddress: { req: ['addressCountry'] },
  Country: { req: ['name'] },
  SpeakableSpecification: { req: ['cssSelector|xpath'] },
  Person: { req: ['name'] },
  Article: { req: ['headline'], rec: ['author', 'datePublished', 'image'] },
  BlogPosting: { req: ['headline'], rec: ['author', 'datePublished', 'image'] },
  Blog: { req: ['name|headline'] },
  VideoObject: { req: ['name', 'thumbnailUrl', 'uploadDate'] },
  Event: { req: ['name', 'startDate', 'location'] },
  Place: { req: ['name|address'] },
  MerchantReturnPolicy: { req: ['applicableCountry', 'returnPolicyCategory'] },
};
const URL_KEYS = new Set(['url', 'item', 'logo', 'image', 'contentUrl', 'thumbnailUrl', '@id', 'sameAs', 'mainEntityOfPage', 'merchantReturnLink']);
const SITE = 'https://nimtto.com';

const has = (node, key) => key.split('|').some((k) => node[k] != null && node[k] !== '' && !(Array.isArray(node[k]) && !node[k].length));

/** Problems in one parsed JSON-LD block: [{ level: 'error'|'warn', code, msg }]. */
export function validateLd(doc) {
  const out = [];
  if (!doc || typeof doc !== 'object') return [{ level: 'error', code: 'shape', msg: 'not an object' }];
  const ctx = doc['@context'];
  if (!ctx || !/^https?:\/\/schema\.org\/?$/.test(typeof ctx === 'string' ? ctx : '')) out.push({ level: 'error', code: 'context', msg: `@context ${JSON.stringify(ctx)}` });
  const roots = Array.isArray(doc['@graph']) ? doc['@graph'] : [doc];
  const walk = (node, at) => {
    if (Array.isArray(node)) { node.forEach((n, i) => walk(n, `${at}[${i}]`)); return; }
    if (!node || typeof node !== 'object') return;
    const types = [].concat(node['@type'] || []);
    const isRef = !types.length && Object.keys(node).every((k) => k === '@id');
    if (!types.length && !isRef && at !== '') out.push({ level: 'warn', code: 'no-type', msg: `${at}: object without @type` });
    for (const t of types) {
      const r = RULES[t];
      if (!r) { out.push({ level: 'warn', code: 'unknown-type', msg: `${at}: @type ${t} not in the checker's list` }); continue; }
      for (const k of r.req || []) if (!has(node, k)) out.push({ level: 'error', code: 'required', msg: `${t} at ${at || 'root'}: missing ${k}` });
      for (const k of r.rec || []) if (!has(node, k)) out.push({ level: 'warn', code: 'recommended', msg: `${t} at ${at || 'root'}: no ${k}` });
      if (t === 'ListItem' && node.position != null && !Number.isInteger(Number(node.position))) out.push({ level: 'error', code: 'position', msg: `${at}: position ${node.position}` });
      if ((t === 'Offer' || t === 'PriceSpecification') && node.price != null && !/^\d+(\.\d+)?$/.test(String(node.price))) out.push({ level: 'error', code: 'price', msg: `${at}: price "${node.price}" is not a number` });
      if (node.priceCurrency && !/^[A-Z]{3}$/.test(node.priceCurrency)) out.push({ level: 'error', code: 'currency', msg: `${at}: priceCurrency ${node.priceCurrency}` });
    }
    for (const [k, v] of Object.entries(node)) {
      if (URL_KEYS.has(k)) {
        for (const u of [].concat(v)) {
          if (typeof u !== 'string') continue;
          if (!/^https:\/\//.test(u)) out.push({ level: 'error', code: 'url', msg: `${at}.${k}: not an absolute https URL: ${u}` });
          else if (k !== 'sameAs' && u.startsWith('https://') && !u.startsWith(SITE) && !/^https:\/\/(schema\.org|www\.youtube\.com)/.test(u)) out.push({ level: 'warn', code: 'url-foreign', msg: `${at}.${k}: ${u}` });
        }
      }
      if (v && typeof v === 'object' && k !== '@context') walk(v, at ? `${at}.${k}` : k);
    }
  };
  roots.forEach((n, i) => walk(n, roots.length > 1 ? `@graph[${i}]` : ''));
  return out;
}
