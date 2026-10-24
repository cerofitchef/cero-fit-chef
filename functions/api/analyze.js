export async function onRequest(context) {
  const { request, env } = context;

  // Para que no de error 405
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }

  try {
    const body = await request.json();
    const { action, image, code, prompt, country, userData } = body;

    let model = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
    let aiInput;

    // 1. FOTO DE COMIDA - IA VISION
    if (action === 'analyze_food' || image) {
      model = '@cf/meta/llama-3.2-11b-vision-instruct';
      aiInput = {
        image: (image || '').split(',')[1] || image,
        prompt: `Eres Cero Fit Chef. Analiza esta comida. Usuario: ${JSON.stringify(userData || {})}. Pais: ${country || 'Peru'}. Responde SOLO JSON valido: {"name":"nombre plato","calories":0,"protein":0,"carbs":0,"fat":0,"healthScore":5,"waterNeeded":"500ml extra","fastingAdvice":"consejo","ingredients":["ing1"]}`
      };
    }
    // 2. AGUA
    else if (action === 'water') {
      aiInput = { prompt: `Usuario Cero Fit Chef: ${JSON.stringify(userData)}. Clima Arequipa, Peru. Cuanta agua necesita hoy? Responde SOLO JSON: {"waterGoal":2500,"message":"consejo motivador corto"}` };
    }
    // 3. REGISTRO / BIENVENIDA
    else if (action === 'register' || action === 'welcome') {
      aiInput = { prompt: `Nuevo usuario Cero Fit Chef: ${JSON.stringify(userData)}. Pais: ${country || 'Peru'}. Crea plan inicial. Responde SOLO JSON: {"welcome":"Hola nombre!","dailyCalories":1800,"dailyWater":2500,"fastingHours":"16:8","firstRecipe":{"name":"Receta","country":"${country}"}}` };
    }
    // 4. CODIGO DE BARRAS
    else if (action === 'barcode') {
      aiInput = { prompt: `Codigo de barras ${code}. Da info nutricional estimada. Responde SOLO JSON: {"name":"producto","calories":0,"protein":0,"carbs":0,"fat":0,"healthScore":5,"advice":"consejo fit"}` };
    }
    // 5. RECETAS DE PAISES
    else if (action === 'recipe' || action === 'recipes_country') {
      aiInput = { prompt: `Receta fit de ${country || 'Peru'} sobre ${prompt || 'comida saludable'}. Usuario: ${JSON.stringify(userData)}. Responde SOLO JSON: {"name":"plato","country":"${country}","ingredients":[],"steps":[],"calories":0,"protein":0}` };
    }
    // 6. PROGRESO Y AYUNO
    else if (action === 'progress' || action === 'fasting') {
      aiInput = { prompt: `Analiza datos: ${JSON.stringify(userData)}. Da consejo. Responde SOLO JSON: {"analysis":"resumen","tip":"consejo","nextGoal":"meta"}` };
    }
    // 7. CUALQUIER OTRA PREGUNTA
    else {
      aiInput = { prompt: `${prompt || 'Consejo fit'} Usuario: ${JSON.stringify(userData)}. Pais ${country}. Responde SOLO JSON: {"answer":"respuesta"}` };
    }

    const result = await env.AI.run(model, aiInput);
    return jsonResponse(result);

  } catch (e) {
    return jsonResponse({ error: e.message, tip: "Verifica que en Cloudflare > Settings > Bindings exista AI con nombre AI" }, 500);
  }
}

function jsonResponse(data, status = 200) {
  let finalData = data;
  if (data && data.response) {
    try {
      const match = data.response.match(/\{[\s\S]*\}/);
      finalData = match ? JSON.parse(match[0]) : { raw: data.response };
    } catch {
      finalData = { raw: data.response };
    }
  }
  return new Response(JSON.stringify(finalData), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
