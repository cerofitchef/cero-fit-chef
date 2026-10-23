import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai'

// Clave de la app (variable GEMINI_API_KEY del sitio). Si la usuaria conecta su
// propia clave de Google AI Studio, se usa esa para fotos ilimitadas.
const appAi = new GoogleGenAI({})

const schema = {
  type: Type.OBJECT,
  properties: {
    nombre: { type: Type.STRING },
    calorias: { type: Type.NUMBER },
    proteina: { type: Type.NUMBER },
    carbos: { type: Type.NUMBER },
    grasa: { type: Type.NUMBER },
    recomendacion: { type: Type.STRING },
  },
  required: ['nombre', 'calorias', 'proteina', 'carbos', 'grasa', 'recomendacion'],
}

const num = (v: unknown, max: number) => Math.min(max, Math.max(0, Number(v) || 0))
const txt = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max)

export default async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const body = await req.json().catch(() => ({}))
  const image = String(body.image ?? '').replace(/^data:image\/\w+;base64,/, '')
  if (!image || image.length > 4_000_000) return Response.json({ error: 'Foto no válida.' }, { status: 400 })
  const name = txt(body.name, 40) || 'Janeth'
  const goal = txt(body.goal, 40) || 'bajar peso'
  const kcal = Math.round(num(body.kcal, 6000))
  const userKey = txt(body.key, 200)
  const ai = userKey ? new GoogleGenAI({ apiKey: userKey }) : appAi

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: [{
        role: 'user',
        parts: [
          { text: `Analiza la foto del plato. "nombre": nombre del plato en español. Calorías y macros (g) realistas de la porción. "recomendacion": frase corta y motivadora en español para ${name}, objetivo ${goal}${kcal ? `, meta diaria ${kcal} kcal` : ''}.` },
          { inlineData: { mimeType: 'image/jpeg', data: image } },
        ],
      }],
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    })
    const r = JSON.parse(response.text ?? '{}')
    return Response.json({
      nombre: txt(r.nombre, 80) || 'Plato',
      calorias: Math.round(num(r.calorias, 5000)),
      proteina: Math.round(num(r.proteina, 500)),
      carbos: Math.round(num(r.carbos, 800)),
      grasa: Math.round(num(r.grasa, 500)),
      recomendacion: txt(r.recomendacion, 200),
    })
  } catch (e) {
    console.error('foto error', e)
    const status = Number((e as { status?: number }).status)
    if (userKey && [400, 401, 403].includes(status)) {
      return Response.json({ error: 'Tu clave de Gemini no es válida.', badKey: true }, { status: 400 })
    }
    return Response.json({ error: 'No se pudo analizar la foto. Intenta de nuevo.' }, { status: 502 })
  }
}

export const config = { path: '/api/foto' }
