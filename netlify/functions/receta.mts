import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai'

const ai = new GoogleGenAI({})

const CATEGORIAS = ['proteinas', 'verduras', 'abarrotes']

// Debe coincidir con COUNTRIES en index.html. d = decimales de la moneda.
const PAISES: Record<string, { n: string; city: string; cur: string; d: number }> = {
  PE: { n: 'Perú', city: 'Lima', cur: 'soles peruanos (PEN)', d: 2 },
  MX: { n: 'México', city: 'Ciudad de México', cur: 'pesos mexicanos (MXN)', d: 2 },
  CO: { n: 'Colombia', city: 'Bogotá', cur: 'pesos colombianos (COP)', d: 0 },
  AR: { n: 'Argentina', city: 'Buenos Aires', cur: 'pesos argentinos (ARS)', d: 0 },
  CL: { n: 'Chile', city: 'Santiago', cur: 'pesos chilenos (CLP)', d: 0 },
  EC: { n: 'Ecuador', city: 'Quito', cur: 'dólares estadounidenses (USD)', d: 2 },
  BO: { n: 'Bolivia', city: 'La Paz', cur: 'bolivianos (BOB)', d: 2 },
  VE: { n: 'Venezuela', city: 'Caracas', cur: 'dólares estadounidenses (USD)', d: 2 },
  UY: { n: 'Uruguay', city: 'Montevideo', cur: 'pesos uruguayos (UYU)', d: 0 },
  PY: { n: 'Paraguay', city: 'Asunción', cur: 'guaraníes (PYG)', d: 0 },
  GT: { n: 'Guatemala', city: 'Ciudad de Guatemala', cur: 'quetzales (GTQ)', d: 2 },
  HN: { n: 'Honduras', city: 'Tegucigalpa', cur: 'lempiras (HNL)', d: 2 },
  SV: { n: 'El Salvador', city: 'San Salvador', cur: 'dólares estadounidenses (USD)', d: 2 },
  NI: { n: 'Nicaragua', city: 'Managua', cur: 'córdobas (NIO)', d: 2 },
  CR: { n: 'Costa Rica', city: 'San José', cur: 'colones (CRC)', d: 0 },
  PA: { n: 'Panamá', city: 'Ciudad de Panamá', cur: 'dólares estadounidenses (USD)', d: 2 },
  DO: { n: 'República Dominicana', city: 'Santo Domingo', cur: 'pesos dominicanos (DOP)', d: 2 },
  CU: { n: 'Cuba', city: 'La Habana', cur: 'pesos cubanos (CUP)', d: 0 },
  PR: { n: 'Puerto Rico', city: 'San Juan', cur: 'dólares estadounidenses (USD)', d: 2 },
  ES: { n: 'España', city: 'Madrid', cur: 'euros (EUR)', d: 2 },
  US: { n: 'Estados Unidos', city: 'Miami', cur: 'dólares estadounidenses (USD)', d: 2 },
}

const schema = {
  type: Type.OBJECT,
  properties: {
    nombre: { type: Type.STRING },
    descripcion: { type: Type.STRING },
    porciones: { type: Type.INTEGER },
    kcal: { type: Type.NUMBER },
    proteina: { type: Type.NUMBER },
    carbos: { type: Type.NUMBER },
    grasa: { type: Type.NUMBER },
    ingredientes: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          nombre: { type: Type.STRING },
          cantidad: { type: Type.NUMBER },
          unidad: { type: Type.STRING, enum: ['g', 'ml'] },
          precio: { type: Type.NUMBER },
          categoria: { type: Type.STRING, enum: CATEGORIAS },
        },
        required: ['nombre', 'cantidad', 'unidad', 'precio', 'categoria'],
      },
    },
    pasos: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ['nombre', 'descripcion', 'porciones', 'kcal', 'proteina', 'carbos', 'grasa', 'ingredientes', 'pasos'],
}

const num = (v: unknown, max: number) => Math.min(max, Math.max(0, Number(v) || 0))
const txt = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max)

export default async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const body = await req.json().catch(() => ({}))
  const pedido = txt(body.pedido, 160)
  if (!pedido) return Response.json({ error: 'Escribe qué receta quieres.' }, { status: 400 })
  const objetivo = txt(body.objetivo, 40)
  const kcal = num(body.kcal, 6000)
  const paisId = Object.hasOwn(PAISES, String(body.pais)) ? String(body.pais) : 'PE'
  const pais = PAISES[paisId]
  const factor = 10 ** pais.d

  const prompt = `Eres el chef nutricionista de la app CERO FIT CHEFF.
Crea una receta saludable para: "${pedido}", pensada para una persona que vive en ${pais.n}.
${objetivo ? `Objetivo de la usuaria: ${objetivo}.` : ''}${kcal ? ` Meta diaria: ${Math.round(kcal)} kcal.` : ''}
Reglas:
- Todo en español, usando los nombres locales de los ingredientes en ${pais.n}. Ingredientes que se consiguen en mercados o supermercados de ${pais.city}.
- Ingredientes con cantidad EXACTA en gramos (g) o mililitros (ml) para la receta completa, incluidos aceite, sal y especias.
- "precio": costo estimado en ${pais.cur} de ESA cantidad, con precios actuales y realistas de ${pais.city}. Solo el número, sin símbolo.
- "categoria": "proteinas" (carnes, pescado, huevo, lácteos, menestras proteicas), "verduras" (verduras, frutas, hierbas) o "abarrotes" (granos, aceites, condimentos, enlatados y todo lo demás).
- Macros (kcal, proteína, carbos, grasa en gramos) por porción.
- Entre 3 y 7 pasos cortos.`

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: schema,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      },
    })
    const r = JSON.parse(response.text ?? '{}')
    const ingredientes = (Array.isArray(r.ingredientes) ? r.ingredientes : [])
      .slice(0, 25)
      .map((i: Record<string, unknown>) => ({
        nombre: txt(i.nombre, 60),
        cantidad: Math.round(num(i.cantidad, 10000)),
        unidad: i.unidad === 'ml' ? 'ml' : 'g',
        precio: Math.round(num(i.precio, 100000000) * factor) / factor,
        categoria: CATEGORIAS.includes(String(i.categoria)) ? i.categoria : 'abarrotes',
      }))
      .filter((i: { nombre: string; cantidad: number }) => i.nombre && i.cantidad > 0)
    if (!ingredientes.length) throw new Error('Receta sin ingredientes')

    return Response.json({
      pais: paisId,
      nombre: txt(r.nombre, 80) || pedido,
      descripcion: txt(r.descripcion, 300),
      porciones: Math.max(1, Math.round(num(r.porciones, 12))),
      kcal: Math.round(num(r.kcal, 5000)),
      proteina: Math.round(num(r.proteina, 500)),
      carbos: Math.round(num(r.carbos, 800)),
      grasa: Math.round(num(r.grasa, 500)),
      ingredientes,
      pasos: (Array.isArray(r.pasos) ? r.pasos : []).slice(0, 10).map((p: unknown) => txt(p, 300)).filter(Boolean),
    })
  } catch (e) {
    console.error('receta error', e)
    return Response.json({ error: 'No se pudo generar la receta. Intenta de nuevo.' }, { status: 502 })
  }
}

export const config = { path: '/api/receta' }
