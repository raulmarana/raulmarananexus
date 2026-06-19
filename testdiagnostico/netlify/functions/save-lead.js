// netlify/functions/save-lead.js
// PASO 1 del formulario: guarda las respuestas del test en el Google Sheet.
// Se llama al pasar del Paso 1 al Paso 2, para capturar también a quien abandone
// antes de dar el email. Devuelve el nº de fila. SIN dependencias externas.

const crypto = require("crypto");
const SCOPE = "https://www.googleapis.com/auth/spreadsheets";

function b64url(input) {
  return Buffer.from(input).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

// Obtiene un token de acceso de Google a partir de la cuenta de servicio (JWT RS256).
async function getGoogleToken() {
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
  let key = creds.private_key;
  if (key.includes("\\n")) key = key.replace(/\\n/g, "\n");
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = b64url(JSON.stringify({
    iss: creds.client_email, scope: SCOPE,
    aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600,
  }));
  const signingInput = `${header}.${claim}`;
  const signature = b64url(crypto.createSign("RSA-SHA256").update(signingInput).sign(key));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${signingInput}.${signature}`,
    }),
  });
  const data = await res.json();
  if (!data.access_token) throw new Error("Google token error: " + JSON.stringify(data));
  return data.access_token;
}

// Celdas E..X (respuestas del test) en orden.
function answerCells(a = {}) {
  const p = a.a_perfiles || {};
  const precios = Array.isArray(a.p_precios) ? a.p_precios.join(", ") : (a.p_precios || "");
  return [
    a.p_que || "", a.p_num || "", precios, a.p_principal || "",
    a.a_seguidores || "", p.instagram || "", p.youtube || "", p.tiktok || "",
    a.a_email || "", a.a_wa || "", a.a_pago || "", a.a_afiliados || "",
    a.e_como || "", a.e_lanz || "", a.e_embudo || "",
    a.n_fact || "", a.n_margen || "", a.n_meta || "", a.n_negocio || "", a.n_extra || "",
  ];
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
  try {
    const { answers } = JSON.parse(event.body || "{}");
    const tab = process.env.GOOGLE_SHEET_TAB || "Sheet1";
    // Origen del lead, deducido del Referer con la misma regla que el frontend (/hotmart/i).
    // Decide en qué hoja se escribe; la pestaña y las columnas son iguales para ambas.
    const origen = /hotmart/i.test(event.headers.referer || "") ? "hotmart" : "web";
    const id = origen === "hotmart" ? process.env.SHEET_ID_HOTMART : process.env.GOOGLE_SHEET_ID;
    const row = [new Date().toISOString(), "lead", "", "", ...answerCells(answers)];

    const token = await getGoogleToken();
    const range = `${tab}!A:Y`;
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ values: [row] }),
    });
    const data = await res.json();
    const updated = data.updates && data.updates.updatedRange;
    const m = updated && updated.match(/![A-Z]+(\d+):/);
    const rowNumber = m ? parseInt(m[1], 10) : null;

    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: true, row: rowNumber }) };
  } catch (err) {
    console.error("save-lead error:", err);
    // No rompemos la experiencia del usuario aunque falle el guardado.
    return { statusCode: 200, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ok: false, row: null }) };
  }
};
