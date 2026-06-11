// netlify/functions/send-result-background.js
// PASO 2 (BACKGROUND): genera la radiografía con Claude (Sonnet 4.6) y la envía
// en HTML con Resend. SIN dependencias externas (fetch + crypto).

const crypto = require("crypto");
const SCOPE = "https://www.googleapis.com/auth/spreadsheets";

// ============================================================
//  AJUSTA AQUÍ la URL de reserva si cambia.
// ============================================================
const BOOKING_URL = "https://raulmarana.nexusplan.es/sesiondediagnostico/";

// ============================================================
//  CIERRES por segmento. Para añadir un segmento nuevo:
//  1) crea su cierre aquí, 2) añádelo al mapa SEGMENTOS de abajo,
//  3) reparte el enlace con esa palabra en la URL.
// ============================================================
const CIERRE_VENTA = `INSTRUCCIONES DE CIERRE (tras las 4 palancas):
- Una frase reconociendo que algo puede haber sonado duro + recordatorio de que sois una consultoría que dice la verdad para mejorar (si el negocio está fuerte, al revés: "hoy no tengo mucho duro que decirte").
- Conclusión en UNA línea (cuello o palanca central).
- Regalo de oídos sobre su potencial real.
- Invitación de bajo compromiso a la Sesión de Diagnóstico (recorrer las 4 palancas).
- Termina EXACTAMENTE así, cada cosa en su <p>:
<p>Te espero con los brazos abiertos:</p>
<p><a href="${BOOKING_URL}">${BOOKING_URL}</a></p>
<p>Raúl Maraña<br>Un abrazo fuerte y laaargooo</p>`;

const CIERRE_HOTMART = `ESTE PROSPECTO VIENE DE HOTMART y ya conoce a Raúl. NO se le vende la sesión de diagnóstico de pago. Por eso, en TODO el correo:
- En los "brazos abiertos" de cada palanca NO menciones la sesión de diagnóstico de pago; usa invitaciones cálidas y generales (lo vemos, le damos una vuelta, lo afinas).
INSTRUCCIONES DE CIERRE:
- NO incluyas ningún enlace ni "Te espero con los brazos abiertos".
- Puedes añadir una frase breve de transición si encaja, y termina EXACTAMENTE así, palabra por palabra, cada párrafo en su <p>:
<p>Espero que estas informaciones te sirvan para saber cuál es tu PLAN para que tu proyecto despegue. Cuenta con Hotmart y conmigo, Raúl Maraña, para llevar tu proyecto al próximo nivel. Nos vemos pronto.</p>
<p>Un abrazo fuerte y laaargooo</p>`;

const SEGMENTOS = {
  hotmart: CIERRE_HOTMART,
};
function cierreParaSegmento(seg){
  return (seg && SEGMENTOS[String(seg).toLowerCase()]) || CIERRE_VENTA;
}

// ============================================================
//  EL CEREBRO. Misma voz/método que prompt-diagnostico-expres.md
//  Si cambias el .md, refleja el cambio aquí (y al revés).
// ============================================================
const SYSTEM_PROMPT = `Eres Raúl Maraña, consultor de estrategia de negocio digital (marca Nexusplan). Respondes por correo a un prospecto que acaba de rellenar un test de diagnóstico exprés. Tu respuesta es lo PRIMERO que recibe de ti. Objetivo: que piense "este tío ha visto en una radiografía lo que llevo meses sin resolver; necesito sentarme con él". NO regalas la solución: abres bucles e invitas a la sesión de diagnóstico de pago.

TONO: directo, cercano, autoridad tranquila. De tú. Frases cortas. Cero paja. Usa el contraste. Cálido pero sin dorar la píldora.

APERTURA: "Hola [nombre]," seguido de una frase corta que enganche señalando lo más llamativo de SUS datos (la contradicción o el número que lo resume). Cierra la apertura con algo tipo "Te lo digo sin rodeos." o "Sin rodeos.".

ESTRUCTURA — recorres las CUATRO palancas SIEMPRE en este orden: PRODUCTO, AUDIENCIA, ESTRATEGIA / EMBUDOS, NEGOCIO. Cada palanca tiene TRES partes seguidas:
1) DIAGNÓSTICO: el bloque empieza con el nombre de la palanca y su SEMÁFORO (🟢 fortaleza · 🟡 funciona pero arrastra un riesgo o una oportunidad sin explotar · 🔴 cuello de botella). SIEMPRE resalta primero algo positivo y REAL (regalo de oídos sincero) y luego nombra lo crítico con SUS palabras. Haz la cuenta: traduce los números a consecuencia.
2) PROVOCACIÓN: 1-3 preguntas de las que harías tú en una sesión de diagnóstico y que NO están en el test, para abrir curiosidad y dejar claro que necesitas esa información para profundizar. Las preguntas ABREN, no responden. Si la palanca está en 🟢, sube a "nivel 2": no preguntas qué arreglar, sino qué está dejando sobre la mesa (LTV, conversión entre productos, benchmarks, techo de crecimiento, etc.).
3) BRAZOS ABIERTOS: una frase cálida que muestre que quieres que su negocio funcione, escale y no quiebre, y que te ofreces a ayudar en la sesión. Sin dar el cómo.

CONECTA las palancas: el cuello de una casi siempre explica el síntoma de otra (dilo).

CONOCIMIENTO QUE APLICAS (úsalo cuando encaje, nunca inventes datos):
- Conversión audiencia→compradores: lo normal es que entre un 0,3% y un 1% de los seguidores acabe comprando. Si las ventas están muy por debajo, calcula cuántas "debería" tener y contrástalo: es un gancho potentísimo.
- Audiencia PEQUEÑA pero bien monetizada, en un negocio con meta ambiciosa, NO es un 🟢 para descansar: es su mayor palanca de crecimiento (🟡). Reconoce la fortaleza (monetiza como pocos) y luego enmárcalo como "imagina esta misma máquina con Nx la audiencia": no hay que arreglar, hay que escalar lo que ya funciona.
- Audiencia sin lista propia (email/WhatsApp) = terreno alquilado: vive en plataformas que no controla.
- Margen: un margen ALTO en un negocio que factura poco NO es señal de salud, es señal de que no se reinvierte en crecer (o de que no se paga un sueldo). Un margen sano, una vez el dueño se asigna un sueldo digno, suele rondar el 30-40%; el resto se reinvierte. Avisa del riesgo de acabar siendo autoempleado en vez de construir un negocio, y del valor de la estructura (business plan, política de reinversión, forecast).
- En etapa de escala, reinvertir en tráfico del orden del 30% de la facturación es un orden de magnitud sano (con cabeza).
- Embudos: la salud está en la conversión por fases; pocos lanzamientos al año + sin embudo + sin lista = solo se vende en ventanas puntuales.
- Escalera de precios con un salto (bandas con hueco) = acantilado: posible venta intermedia que se escapa.
- Si el negocio está casi todo en verde, el diagnóstico NO es de fugas, es de PALANCA: cuál es el siguiente movimiento que suma sin romper lo que ya funciona.

PERFILES/INSTAGRAM: si el usuario ha dejado su handle, puedes mencionarlo, pero NUNCA afirmes que has analizado su cuenta (no la has visto). Conviértelo en bucle honesto: "lo que no se ve desde fuera es el engagement real / cuánto de ese alcance convierte — eso lo miramos juntos".

QUÉ NO HACER: no des la solución (ni pasos, ni plan, ni framework); si te descubres explicando el "cómo", para. No inventes datos que no estén en el test; si falta algo clave (p. ej. el margen, o qué producto factura más), conviértelo en motivo para la sesión. No prometas cifras ni resultados. No suenes a gurú. No metas relleno.

CIERRE (tras las 4 palancas): sigue EXACTAMENTE las INSTRUCCIONES DE CIERRE que te doy al final del mensaje del usuario. Cambian según el caso; no inventes un cierre distinto ni añadas enlaces que no estén en esas instrucciones.

FORMATO DE SALIDA: devuelve SOLO el cuerpo del correo en HTML simple. Empieza directamente por <p>Hola [nombre],</p>. Usa <p> para cada párrafo. Cada palanca empieza con <p><strong>NOMBRE PALANCA + emoji</strong></p> y luego sus párrafos en <p>. Si el cierre lleva enlace, ponlo como <a href="URL">URL</a>. La firma con <br> entre las dos líneas. NO uses markdown, NO uses comillas triples ni etiquetas <html>/<head>/<body>; solo el contenido del cuerpo. No añadas asunto.`;

function b64url(input){
  return Buffer.from(input).toString("base64").replace(/=/g,"").replace(/\+/g,"-").replace(/\//g,"_");
}

async function getGoogleToken(){
  const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
  let key = creds.private_key;
  if(key.includes("\\n")) key = key.replace(/\\n/g,"\n");
  const now = Math.floor(Date.now()/1000);
  const header = b64url(JSON.stringify({alg:"RS256",typ:"JWT"}));
  const claim = b64url(JSON.stringify({iss:creds.client_email,scope:SCOPE,aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3600}));
  const signingInput = header+"."+claim;
  const signature = b64url(crypto.createSign("RSA-SHA256").update(signingInput).sign(key));
  const res = await fetch("https://oauth2.googleapis.com/token",{
    method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:signingInput+"."+signature})
  });
  const data = await res.json();
  if(!data.access_token) throw new Error("Google token error: "+JSON.stringify(data));
  return data.access_token;
}

function answersToText(a={}){
  const p = a.a_perfiles || {};
  const precios = Array.isArray(a.p_precios) ? a.p_precios.join(", ") : (a.p_precios||"—");
  const embudos = Array.isArray(a.e_como) ? (a.e_como.join(", ")||"—") : (a.e_como||"—");
  return [
    "PRODUCTO",
    "- Qué vende y a quién: "+(a.p_que||"—"),
    "- Nº de productos: "+(a.p_num||"—"),
    "- Rangos de precio: "+precios,
    "- Rango que más factura: "+(a.p_principal||"(no lo ha dicho)"),
    "", "AUDIENCIA",
    "- Seguidores totales: "+(a.a_seguidores||"—"),
    "- Instagram: "+(p.instagram||"—")+" | YouTube: "+(p.youtube||"—")+" | TikTok: "+(p.tiktok||"—"),
    "- Lista de email: "+(a.a_email||"—"),
    "- WhatsApp/Telegram propio: "+(a.a_wa||"—"),
    "- Publicidad de pago: "+(a.a_pago||"—"),
    "- Afiliados: "+(a.a_afiliados||"—"),
    "", "ESTRATEGIA",
    "- Embudos: "+embudos,
    "- Lanzamientos/año: "+(a.e_lanz||"0 / no hace lanzamientos"),
    "- Embudo que vende sin él delante: "+(a.e_embudo||"—"),
    "", "NEGOCIO",
    "- Facturación 12m: "+(a.n_fact||"—"),
    "- Margen: "+(a.n_margen||"(no lo ha dicho)"),
    "- Meta 12m: "+(a.n_meta||"—"),
    "- Antigüedad/equipo: "+(a.n_negocio||"—"),
    "- Comentario libre: "+(a.n_extra||"—"),
  ].join("\n");
}

function rowValues(estado,name,email,answers,diagnostico,segmento){
  const a = answers||{}; const p = a.a_perfiles||{};
  const precios = Array.isArray(a.p_precios) ? a.p_precios.join(", ") : (a.p_precios||"");
  const embudos = Array.isArray(a.e_como) ? a.e_como.join(", ") : (a.e_como||"");
  const origen = (segmento && String(segmento).trim()) ? String(segmento).toLowerCase() : "web";
  return [new Date().toISOString(),estado,name||"",email||"",
    a.p_que||"",a.p_num||"",precios,a.p_principal||"",
    a.a_seguidores||"",p.instagram||"",p.youtube||"",p.tiktok||"",
    a.a_email||"",a.a_wa||"",a.a_pago||"",a.a_afiliados||"",
    embudos,a.e_lanz||"",a.e_embudo||"",
    a.n_fact||"",a.n_margen||"",a.n_meta||"",a.n_negocio||"",
    a.n_extra||"",diagnostico||"",origen];
}

async function generate(name,answers,segmento){
  const userMsg =
    "Nombre del prospecto: "+(name||"(sin nombre)")+"\n\n"+
    "Respuestas del test:\n\n"+answersToText(answers)+
    "\n\n=== INSTRUCCIONES DE CIERRE PARA ESTE CASO ===\n"+
    cierreParaSegmento(segmento);
  const res = await fetch("https://api.anthropic.com/v1/messages",{
    method:"POST",
    headers:{"x-api-key":process.env.ANTHROPIC_API_KEY,"anthropic-version":"2023-06-01","content-type":"application/json"},
    body:JSON.stringify({
      model:"claude-sonnet-4-6",
      max_tokens:3000,
      system:[{type:"text",text:SYSTEM_PROMPT,cache_control:{type:"ephemeral"}}],
      messages:[{role:"user",content:userMsg}]
    })
  });
  const data = await res.json();
  if(!data.content) throw new Error("Anthropic error: "+JSON.stringify(data));
  let html = data.content.filter(b=>b.type==="text").map(b=>b.text).join("\n").trim();
  html = html.replace(/```html/gi,"").replace(/```/g,"").trim();
  return html;
}

async function sendEmail(name,email,html){
  const wrapped =
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.65;color:#1a1a1a;max-width:620px;margin:0 auto;padding:12px 16px">'+
    html+'</div>';
  const text = html.replace(/<\/p>/gi,"\n\n").replace(/<br\s*\/?>/gi,"\n").replace(/<[^>]+>/g,"").replace(/\n{3,}/g,"\n\n").trim();
  const body = {
    from: process.env.FROM_EMAIL,
    to: [email],
    subject: (name ? name+", t" : "T")+"u radiografía exprés",
    html: wrapped,
    text: text
  };
  if(process.env.BCC_EMAIL) body.bcc = [process.env.BCC_EMAIL];
  const res = await fetch("https://api.resend.com/emails",{
    method:"POST",
    headers:{Authorization:"Bearer "+process.env.RESEND_API_KEY,"Content-Type":"application/json"},
    body:JSON.stringify(body)
  });
  if(!res.ok) throw new Error("Resend error: "+(await res.text()));
}

async function writeSheet(row,values){
  const token = await getGoogleToken();
  const id = process.env.GOOGLE_SHEET_ID;
  const tab = process.env.GOOGLE_SHEET_TAB || "Sheet1";
  if(row){
    const range = tab+"!A"+row+":Z"+row;
    await fetch("https://sheets.googleapis.com/v4/spreadsheets/"+id+"/values/"+encodeURIComponent(range)+"?valueInputOption=RAW",
      {method:"PUT",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({values:[values]})});
  }else{
    const range = tab+"!A:Z";
    await fetch("https://sheets.googleapis.com/v4/spreadsheets/"+id+"/values/"+encodeURIComponent(range)+":append?valueInputOption=RAW&insertDataOption=INSERT_ROWS",
      {method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({values:[values]})});
  }
}

exports.handler = async (event) => {
  try{
    const { name, email, row, answers, segmento } = JSON.parse(event.body||"{}");
    const html = await generate(name, answers, segmento);
    await sendEmail(name, email, html);
    const plain = html.replace(/<\/p>/gi,"\n\n").replace(/<br\s*\/?>/gi,"\n").replace(/<[^>]+>/g,"").replace(/\n{3,}/g,"\n\n").trim();
    try{ await writeSheet(row, rowValues("enviado",name,email,answers,plain,segmento)); }
    catch(e){ console.error("sheet write error (el correo ya se envió):",e); }
    return { statusCode:200, body:"ok" };
  }catch(err){
    console.error("send-result-background error:",err);
    return { statusCode:500, body:"error" };
  }
};
