// ---------- Lead origins ----------
const ORIGINS = {
  instagram: { label: "Instagram orgánico", color: "var(--ig)", raw: "#c2255c" },
  youtube:   { label: "YouTube",            color: "var(--yt)", raw: "#e03131" },
  adsA:      { label: "Anuncio · Variante A", color: "var(--adsA)", raw: "#1c6fd6" },
  adsB:      { label: "Anuncio · Variante B", color: "var(--adsB)", raw: "#0c8599" },
  neutral:   { label: "Conversión",         color: "var(--neutral)", raw: "#51637a" },
};

// ---------- Stage columns (reading guide) ----------
const STAGES = [
  { k: "01", t: "Fuentes",       x: 140 },
  { k: "02", t: "Captación",     x: 460 },
  { k: "03", t: "Comunicación",  x: 780 },
  { k: "04", t: "Sesiones",      x: 1100 },
  { k: "05", t: "Cierre",        x: 1410 },
];

// ---------- Swimlanes (soft background bands) ----------
const LANES = [
  { id: "youtube",   y: 56,  h: 150, origin: "youtube" },
  { id: "instagram", y: 220, h: 150, origin: "instagram" },
  { id: "adsA",      y: 440, h: 150, origin: "adsA" },
  { id: "adsB",      y: 624, h: 290, origin: "adsB" },
];

// ---------- Nodes ----------
// x,y = default top-left position on the canvas
const NODES = [
  { id: "yt",        origin: "youtube",   icon: "youtube",        tag: "Vídeo",      title: "Contenido YouTube",            cta: "Aporta valor y nutre a la audiencia", x: 140,   y: 88 },
  { id: "ig",        origin: "instagram", icon: "instagram",      tag: "Orgánico",   title: "Contenido Instagram orgánico", cta: "Atrae y educa a la audiencia",        x: 140,   y: 252 },
  { id: "ad_a",      origin: "adsA",      icon: "ad",             tag: "Anuncio",    title: "Anuncio pagado · Variante A",  cta: "Tráfico frío → landing de vídeo",     x: 140,   y: 472 },
  { id: "ad_b",      origin: "adsB",      icon: "ad",             tag: "Anuncio",    title: "Anuncio pagado · Variante B",  cta: "Tráfico frío → cualificar lead",      x: 140,   y: 700 },

  { id: "test",            origin: "instagram", icon: "test",          tag: "Test",       title: "Test de diagnóstico gratuito", cta: "Diagnóstico inicial sin coste",     x: 460, y: 252 },
  { id: "landing_video",   origin: "adsA",      icon: "landing-video", tag: "Landing",    title: "Landing con vídeo de ventas",  cta: "Convierte con VSL → reservar",      x: 460, y: 472 },
  { id: "form",            origin: "adsB",      icon: "form",          tag: "Formulario", title: "Formulario de cualificación",  cta: "Filtra leads cualificados",         x: 460, y: 700 },

  { id: "email_diag",        origin: "instagram", icon: "email",       tag: "Email",   title: "Email de diagnóstico personalizado", cta: "Envía PDF + invita a sesión",   x: 780, y: 252 },
  { id: "landing_propuesta", origin: "adsB",      icon: "landing-doc", tag: "Landing", title: "Landing con propuesta personalizada", cta: "Propuesta a medida del lead",  x: 780, y: 700 },

  { id: "sesion_paid", origin: "neutral", icon: "session-paid", tag: "Sesión",  title: "Sesión de diagnóstico de pago",  cta: "Diagnóstico 1:1 de alto valor", x: 1100, y: 300 },
  { id: "sesion_free", origin: "neutral", icon: "session",      tag: "Sesión",  title: "Sesión de diagnóstico gratuita", cta: "Diagnóstico 1:1 sin coste",     x: 1100, y: 560 },
  { id: "email_nurt",  origin: "neutral", icon: "email",        tag: "Automático", title: "Email de nurturing automático", cta: "Nutre a no compradores hasta convertir", x: 1100, y: 832 },

  { id: "reunion2", origin: "neutral", icon: "meeting", tag: "Reunión", title: "2ª reunión · propuesta de consultoría", cta: "Cierra la consultoría Nexus Plan", x: 1410, y: 430 },
];

// ---------- Edges ----------
// via = color origin · kind solid/dashed · label optional
const EDGES = [
  { from: "yt", to: "ig",          via: "youtube",   kind: "dashed", label: "Refuerza marca" },
  { from: "yt", to: "sesion_paid", via: "youtube",   kind: "solid",  label: "CTA directo" },
  { from: "yt", to: "email_nurt",  via: "youtube",   kind: "dashed", label: "Contenido diario" },

  { from: "ig", to: "test",            via: "instagram", kind: "solid", label: "Test gratuito" },
  { from: "test", to: "email_diag",    via: "instagram", kind: "solid", label: "Genera PDF" },
  { from: "email_diag", to: "sesion_paid", via: "instagram", kind: "solid", label: "CTA pago" },

  { from: "ad_a", to: "landing_video",     via: "adsA", kind: "solid", label: "" },
  { from: "landing_video", to: "sesion_paid", via: "adsA", kind: "solid", label: "CTA directo" },

  { from: "ad_b", to: "form",                  via: "adsB", kind: "solid",  label: "" },
  { from: "form", to: "landing_propuesta",     via: "adsB", kind: "solid",  label: "Cualificados" },
  { from: "landing_propuesta", to: "sesion_free", via: "adsB", kind: "solid", label: "Sesión gratuita" },
  { from: "form", to: "test",                  via: "adsB", kind: "dashed", label: "No cualificados" },

  { from: "sesion_paid", to: "reunion2", via: "neutral", kind: "solid",  label: "Avanza" },
  { from: "sesion_free", to: "reunion2", via: "neutral", kind: "solid",  label: "Avanza" },

  { from: "sesion_paid", to: "email_nurt", via: "neutral", kind: "dashed", label: "No compra" },
  { from: "sesion_free", to: "email_nurt", via: "neutral", kind: "dashed", label: "No compra" },
  { from: "email_nurt",  to: "sesion_paid", via: "neutral", kind: "dashed", label: "Reactiva" },
];

const CANVAS = { w: 2600, h: 1400 };

Object.assign(window, { ORIGINS, STAGES, LANES, NODES, EDGES, CANVAS });
