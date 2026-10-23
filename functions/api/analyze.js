export async function onRequestGet(context) {
  return new Response(JSON.stringify({ ok: true, message: "Cero Fit IA lista" }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}
export async function onRequestOptions() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
export async function onRequestPost(context) {
  const h = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*"
  };
  try {
    const AI = context.env.AI;
    if (!AI) return new Response(JSON.stringify({ error: "AI no configurado - activa binding AI en Cloudflare" }), { status: 500, headers: h });
    const body = await context.request.json();
    let b64 = body.image || body.photo || "";
    if (b64.includes(",")) b64 = b64.split(",")[1];
    const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    const out = await AI.run("@cf/meta/llama-3.2-11b-vision-instruct", {
      image: [...bin],
      prompt: 'Analiza comida peruana. Responde SOLO JSON: {"nombre":"plato","calorias":350,"proteina":20,"carbohidratos":30,"grasa":12,"saludable":true,"recomendacion":"consejo"}',
      max_tokens: 500
    });
    let txt = out.description || "";
    let m = txt.match(/\{[\s\S]*\}/);
    let json = m ? JSON.parse(m[0]) : { nombre: "Plato", calorias: 350, proteina: 20, carbohidratos: 30, grasa: 12, saludable: true, recomendacion: txt };
    return new Response(JSON.stringify(json), { headers: h });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: h });
  }
}
