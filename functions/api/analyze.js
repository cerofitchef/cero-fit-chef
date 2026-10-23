export async function onRequest(context) {
  const h = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };
  if (context.request.method === "OPTIONS") return new Response(null, { headers: h });
  if (context.request.method === "GET") return new Response(JSON.stringify({ ok: true, message: "Cero Fit IA lista" }), { headers: h });
  try {
    const AI = context.env.AI;
    const body = await context.request.json();
    let b64 = body.image || body.photo || body.base64 || "";
    if (b64.includes(",")) b64 = b64.split(",")[1];
    const bin = atob(b64);
    const img = [...bin].map(c => c.charCodeAt(0));
    const out = await AI.run("@cf/meta/llama-3.2-11b-vision-instruct", {
      image: img,
      prompt: 'Analiza plato. Responde SOLO JSON: {"nombre":"plato","calorias":350,"proteina":20,"carbohidratos":30,"grasa":12,"fibra":5,"saludable":true,"recomendacion":"consejo"}',
      max_tokens: 500
    });
    let t = out.description || out.response || "";
    let j;
    try { j = JSON.parse(t.match(/\{[\s\S]*\}/)[0]); } catch { j = { nombre: "Plato", calorias: 350, proteina: 20, carbohidratos: 30, grasa: 12, fibra: 5, saludable: true, recomendacion: t.slice(0,120) }; }
    return new Response(JSON.stringify(j), { headers: h });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: h });
  }
}
