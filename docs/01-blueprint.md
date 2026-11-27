# Fase 1 — Product Blueprint

## Actores

| Actor | Necesidad | Propuesta de valor |
|---|---|---|
| **Cliente** (persona que se muda o equipa su hogar) | Resolver una necesidad del hogar sin saber de términos técnicos, con alguien de confianza y sin sobrecostos | «Siempre sabrás quién llega, cuánto cuesta y que quedó bien.» |
| **Maki** (prestador independiente) | Trabajo con alcance y precio claros y pago asegurado | Oportunidades calificadas, condiciones transparentes, evidencia que lo protege de reclamos injustos, reputación propia, autonomía para aceptar o rechazar y una comisión menor con Mi Maki |
| **Administrador / evaluador** (equipo MakiYa) | Operar la red, garantizar la promesa y medir el modelo | Una sola fuente de verdad: solicitudes, Makis, presupuestos, incidencias, liquidaciones y métricas |
| **Asistente (IA)** — no es un actor humano ni se llama «Maki» | — | Interpreta, clasifica, pregunta lo que falta y resume. **No decide ni diagnostica.** |

## Módulos

| Módulo | Responsabilidad | Código |
|---|---|---|
| Catálogo y tarifario | Categorías (activas y futuras), servicios con unidad, precio de demo, duración, incluye/no incluye y prueba de cierre | `config/catalog.ts`, admin › Servicios |
| Solicitudes y orientación | Captura (texto, fotos y consentimiento), interpretación, preguntas y confirmación | `ai/`, `services/requestService.ts` |
| Presupuestos | Vía 1 (tarifario) y vía 2 (evaluador); aprobación escrita; adicionales | `domain/pricing.ts`, `services/requestService.ts` |
| Red de Makis | Registro, perfil, verificación en 4 capas, habilitación y suspensión | `services/makiService.ts`, admin › Makis |
| Motor de asignación | Filtros, puntaje, razones, 1–3 opciones y cupo para Makis nuevos | `matching/engine.ts` |
| Agenda y Visita Segura | Fecha y franja, código de 4 dígitos, inicio con código | `services/requestService.ts` |
| Ejecución y evidencia | Adicionales, materiales, checklist de prueba de cierre y fotos | Maki › Trabajo |
| Conformidad y pago | Firma, evaluaciones, pago simulado y reparto de la comisión | `domain/economics.ts` |
| Garantía e incidencias | Ventana de 30 días, reclamos, corrección ≤ 72 h y resolución | admin › Incidencias / Garantías |
| Liquidaciones | Lote de pagos pendientes → liquidación al Maki | admin › Liquidaciones, Maki › Ingresos |
| Reputación | Promedio bayesiano, retrabajo y puntualidad | `matching/engine.ts`, Maki › Reputación |
| Perfil del Hogar y Mi Maki | Datos del hogar, Makis favoritos y repetición | Cliente › Perfil |
| Analítica | North Star y métricas de cliente, Maki y negocio | `analytics/metrics.ts` |
| Configuración | Comisiones, pesos del motor, supuestos económicos y umbral de IA | admin › Configuración |

## Entidades y relaciones

```
User (id, role: client|maki|admin, name, email, phone, district)
 ├─1:1─ HomeProfile (clientId, district, addressRef, homeType, notes, favoriteMakiIds[])   ← rol client
 └─1:1─ MakiProfile (userId, bio, specialties[], experienceYears, districts[],
                     availability{day→franjas}, status, verification{4 capas}, tradeTestScore) ← rol maki

ServiceCategory (id, name, line: arreglos|reset|daily, status: activo|futuro)
 └─1:N─ ServiceItem (id, categoryId, name, unit, price, durationMin, includes[], excludes[],
                     closingTest{prueba, criterio, checklist[]}, active)

ServiceRequest (id, code, clientId, status, description, photos[], district, preferredDate, window,
                interpretation{AI}, lines[]{itemId, qty, unitPrice}, route: tarifario|evaluador,
                quote{lines, total, verifiedBy, verifiedAt}, candidates[]{makiId, score, reasons},
                selectedMakiId, offers[]{makiId, status, reason}, visitCode, approvals{scopeApprovedAt},
                extras[]{desc, amount, status}, materials[], evidence{photos, checklist, notes},
                conformity{ratings}, payment{…}, warrantyUntil, incidentIds[], timeline[])
 ├─N:1─ User (client)
 ├─N:1─ User (maki asignado)
 ├─1:N─ Incident (id, requestId, type, description, status, resolution, slaDue)
 └─1:1─ Payment (id, requestId, amount, commissionRate, commission, makiNet, isRepeat, settlementId?)
Settlement (id, makiId, paymentIds[], total, createdAt)  ← lote de liquidación
Settings (commissionFirst, commissionRepeat, matchingWeights, costAssumptions, aiConfidenceThreshold, …)
AnalyticsEvent (type: request_started|request_abandoned|request_submitted|…, at, userId, requestId)
```

## Máquina de estados de la solicitud

```
               ┌──────────── cancelada ◄─────────── (cliente antes de en_curso; admin siempre)
               │
 [crear] → en_revision ──(admin fija presupuesto / reclasifica)──┐
    │                                                           ▼
    └──(IA con confianza ≥ umbral y vía 1)──────────────► propuesta_lista
                                                               │ cliente aprueba alcance + precio y elige Maki
                                                               ▼
                                                        esperando_maki ──(Maki rechaza)──► propuesta_lista
                                                               │ Maki acepta (y la franja sigue libre)
                                                               ▼
                                                          confirmada  (código de 4 dígitos)
                                                               │ Maki ingresa el código correcto
                                                               ▼
                                                           en_curso  ⇄ adicional propuesto → cliente aprueba/rechaza
                                                               │ Maki envía evidencia + checklist
                                                               ▼
                                                      evidencia_enviada ──(cliente reporta problema)──► con_incidencia
                                                               │ cliente firma conformidad                  │
                                                               ▼                                           │ admin resuelve
                                                          completada ◄───────────────────────────────────┘
                                                (pago simulado + garantía 30 días; una incidencia en garantía
                                                 se registra sin cambiar el estado y cuenta como retrabajo)
```

Las transiciones válidas están en `src/domain/stateMachine.ts`. Cada transición verifica el **actor** (rol + propiedad) y las **precondiciones** (por ejemplo, no se puede pagar sin conformidad, ni empezar sin código, ni aprobar un adicional ajeno).

## Reglas de negocio (Cero Sorpresas)

1. **Alcance definido:** cada línea del presupuesto apunta a un servicio con «incluye / no incluye».
2. **Precio antes de confirmar:** no se puede ofrecer el trabajo a un Maki sin `scopeApprovedAt` del cliente.
3. **Vía 2 verificada:** una solicitud en `en_revision` no muestra precio hasta que el evaluador lo fija.
4. **Cero adicionales sin aprobación:** un adicional nace como `propuesto` y solo suma al total si el cliente lo `aprueba`. El pago usa el total aprobado y nada más.
5. **Materiales registrados:** los materiales adicionales se declaran con descripción y monto (al costo, con boleta) y siguen la misma regla de aprobación.
6. **Evidencia obligatoria:** sin fotos de después y sin checklist completo no se puede enviar a conformidad.
7. **Pago tras conformidad:** el pago simulado se registra en la misma operación en que el cliente firma la conformidad.
8. **Garantía delimitada:** 30 días de mano de obra sobre la misma falla. No cubre materiales del cliente, mal uso ni terceros. Se muestra en la propuesta y en la conformidad.
9. **Seguridad:** solo trabajos programados (≥ 24 h), sin gas, sin tablero eléctrico y sin emergencias. Fotos solo de la zona de trabajo.
10. **Consentimiento del Maki:** ninguna solicitud pasa a `confirmada` sin que el Maki acepte.
11. **Disponibilidad:** el motor excluye a los Makis sin la franja libre; al aceptar se vuelve a comprobar.
12. **Comisión:** 25 % en el primer servicio entre un cliente y un Maki y 20 % en las repeticiones (Mi Maki). Son valores configurables y no definitivos.

## Motor de asignación

**Filtros** (eliminan): estado `habilitado` · especialidad = categoría · el distrito del cliente está entre sus zonas · disponibilidad en el día y la franja · sin un trabajo confirmado en esa misma franja · no rechazó antes esta solicitud.

**Puntaje** = Σ peso × criterio normalizado (pesos configurables):

| Criterio | Normalización | Peso por defecto |
|---|---|---|
| Calidad y cumplimiento | 1 − (retrabajo + incidencias + cobros sin aprobación) / servicios | 0,35 |
| Evaluaciones | Promedio bayesiano: (C·m + Σ notas) / (C + n), con m = 4,0 y C = 5 | 0,25 |
| Experiencia | min(años / 10, 1) · 0,5 + min(trabajos de la categoría / 20, 1) · 0,5 | 0,20 |
| Prueba de oficio | puntaje / 20 | 0,10 |
| Afinidad (Mi Maki) | 1 si es favorito o trabajó antes con el cliente | 0,10 (bonus) |

**Presentación:** hasta 3 Makis. Si hay algún Maki nuevo (< 3 servicios) elegible y no está en el top 3, ocupa la tercera posición (cupo de oportunidades, I8.2). Cada opción muestra sus razones: «4,8 ★ en 23 trabajos», «Armó 12 muebles en MakiYa», «Es tu Maki», «Nuevo en MakiYa, prueba de oficio 17/20».

## IA (adaptador)

```ts
interface AIProvider {
  readonly id: string;          // "simulated-rules" | "remote-llm"
  readonly isSimulated: boolean;
  interpret(input: { text: string; photoCount: number; answers?: Record<string,string> }): Promise<Interpretation>;
}
Interpretation = { categoryId?, suggestedLines[], confidence (0–1), missingInfo[], questions[≤2],
                   summary, scope: "mvp" | "futuro" | "prohibido" | "autoservicio", needsHumanReview, providerId }
```

- `SimulatedRulesProvider`: diccionario de palabras clave en español, cantidades («2 repisas»), detección de alcance futuro o prohibido (gas, tablero, fuga…) y preguntas por falta de datos (tamaño del mueble, tipo de pared, pulgadas de la TV). Se etiqueta en la UI como **«Clasificación simulada por reglas — no es IA real»**.
- `RemoteLLMProvider`: hace POST a `/api/ai/interpret` (función de servidor con la clave). No viene activo; se activa con `VITE_AI_MODE=remote`.
- Guardrails comunes, aplicados después de cualquier proveedor: si la confianza es menor que el umbral, va a revisión humana; si el alcance es prohibido, se responde «esto no lo hacemos»; nunca se fija un precio definitivo fuera del tarifario.
