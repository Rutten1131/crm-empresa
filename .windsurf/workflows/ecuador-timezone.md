---
description: Skill para obtener la hora y ubicación correctas de Ecuador (Guayaquil/Loja UTC-5)
---

# Skill: Ecuador Timezone

Esta skill debe ser usada SIEMPRE que el bot necesite calcular fechas, horas o interpretar expresiones temporales.

## Ubicación y Zona Horaria

- **País**: Ecuador
- **Ciudades principales**: Guayaquil, Loja, Quito
- **Zona horaria**: UTC-5 (America/Guayaquil)
- **No tiene horario de verano**

## Cómo usar esta skill

Cuando el bot necesite calcular fechas u horas, debe:

1. **Obtener la hora actual en Ecuador UTC-5**
2. **Usar esa hora como referencia para cálculos relativos** (mañana, el próximo lunes, etc.)
3. **Nunca usar la hora del servidor** (que puede estar en UTC u otra zona)

## Ejemplos de cálculos

- Si hoy es 23/5/2026 a las 20:43 en Ecuador
- "Mañana a las 3 am" = 24/5/2026 a las 03:00
- "El próximo lunes" = calcular desde la fecha actual de Ecuador

## Importante

- **SIEMPRE** usar la hora de Ecuador como referencia
- **NUNCA** usar la hora del servidor Vercel
- **NUNCA** asumir otra zona horaria
