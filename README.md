# MakiYa Daily — prototipo funcional

> **Una mano para tu día.** Plataforma de ayuda cotidiana de confianza para el hogar: Maki Probado, Presupuesto Verificado y Pago tras Conformidad (sistema **Cero Sorpresas**).

El prototipo tiene tres entornos conectados (**cliente**, **Maki** y **administrador**) que trabajan sobre los mismos datos y las mismas reglas de negocio. Funciona en **modo demostración**, sin servicios externos.

Prototipo académico — Innovación y Desarrollo de Productos, Universidad Científica del Sur (2026).

**Demo en línea:** https://juakinot.github.io/makiya-daily/. Se publica automáticamente con GitHub Actions en cada push a `main`. Los datos de demostración viven en el navegador de cada visitante.

---

## Instalación y ejecución

Requisitos: Node.js 20 o superior.

```bash
npm install
```

```bash
npm run dev
```

Se abre en http://localhost:5173.

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Chequeo de tipos y build de producción en `dist/` |
| `npm run preview` | Sirve el build |
| `npm test` | Pruebas (Vitest) |
| `npm run typecheck` | Solo TypeScript |

Variables opcionales: ver `.env.example`. **Nunca** pongas claves privadas en el frontend.

## Usuarios de demostración

Todos son ficticios y sus correos terminan en `@makiya.demo`. La contraseña común es `demo1234`. En la pantalla de ingreso hay accesos rápidos, y la barra **«Modo demostración»** permite cambiar de usuario o **restablecer** los datos.

| Rol | Correo | Qué muestra |
|---|---|---|
| Cliente | valeria@makiya.demo | Visita confirmada con código, Mi Maki (Rosa), garantías vigentes |
| Cliente | diego@makiya.demo | Evidencia por confirmar (conformidad + pago), oferta esperando al Maki |
| Cliente | camila@makiya.demo | Trabajo a medida en revisión del evaluador |
| Maki | rosa@makiya.demo | Ofertas pendientes con ingreso neto; cliente que repite (20 %) |
| Maki | carlos@makiya.demo | Trabajo por confirmar, historial con un retrabajo |
| Maki (postulante) | martin@makiya.demo | Evaluación en 4 capas pendiente; no recibe ofertas |
| Administrador | admin@makiya.demo | Dashboard, revisión de presupuestos, evaluación de Makis, incidencias, liquidaciones, configuración y analítica |

**Tip para presentar:** la sesión se guarda **por pestaña** y los datos se comparten entre pestañas. Abre el cliente, el Maki y el admin en tres pestañas y verás cómo cada acción se refleja en las demás al instante.

### Guion del recorrido obligatorio (≈ 3 minutos)
1. **Valeria** › Pedir: «Quiero instalar mi televisor en la pared y colgar dos repisas» → responde las 2 preguntas → confirma → elige fecha → **Ver mi propuesta**.
2. Revisa el alcance (incluye y no incluye), elige a **Rosa** (Mi Maki), marca la aprobación escrita → **Aprobar y enviar**.
3. **Admin** › Solicitudes: ve la solicitud, la interpretación del asistente y los candidatos del motor, con las razones de exclusión.
4. **Rosa** › Solicitudes: ve el precio, la comisión y su ingreso neto → **Aceptar**.
5. **Valeria** ve el **código de Visita Segura**. **Rosa** › Trabajo: ingresa el código (si es incorrecto, lo rechaza) → puede proponer un adicional → marca la prueba de cierre y sube una foto → **Enviar evidencia**.
6. **Valeria** revisa la evidencia, evalúa → **Firmar conformidad y pagar** → comprobante simulado y garantía de 30 días.
7. **Admin** › Dashboard o Analítica: la North Star, los ingresos y el historial se actualizan. Liquidaciones: **Liquidar** a Rosa.

---

## Arquitectura

```
Presentación      src/features/{public,client,maki,admin} · src/components (ui, layout, domain) · src/brand
Estado            src/store/AppStore.tsx        → ejecuta casos de uso sobre una copia de la BD y persiste
Casos de uso      src/services/*                → requestService, adminService, accountService (validan rol, propiedad y estado)
Dominio           src/domain/*                  → tipos, máquina de estados, economía (comisión, margen)
IA                src/ai/*                      → AIProvider · SimulatedRulesProvider · RemoteLLMProvider · guardrails
Asignación        src/matching/engine.ts        → filtros → puntaje ponderado → 1–3 opciones con razones
Analítica         src/analytics/metrics.ts      → North Star, cliente, Maki, negocio
Permisos          src/auth/permissions.ts       → acciones por rol + propiedad (espejo de RLS)
Persistencia      src/persistence/*             → Repository · LocalStorageRepository (demo) · MemoryRepository (tests) · seed
Base de datos     supabase/schema.sql           → modelo relacional + políticas RLS (preparado)
```

Decisiones clave:
- **Lógica de negocio pura y testeable:** los servicios reciben `(db, actor, input)` y lanzan `DomainError` con mensajes en español. La UI nunca cambia el estado directamente.
- **Máquina de estados explícita** (`src/domain/stateMachine.ts`): cada transición valida el rol.
- **IA detrás de un adaptador:** el proveedor simulado y el remoto cumplen el mismo contrato, y los *guardrails* se aplican a ambos (máximo 2 preguntas, revisión humana con baja confianza, solo servicios activos y derivación a una persona si el proveedor falla).
- **Persistencia intercambiable:** la app solo conoce `Repository`.

Documentación de diseño: [docs/00-auditoria.md](docs/00-auditoria.md) · [docs/01-blueprint.md](docs/01-blueprint.md) · [docs/02-user-flows.md](docs/02-user-flows.md) · [docs/03-ux-ui.md](docs/03-ux-ui.md) · [docs/04-entrega.md](docs/04-entrega.md).

## Modelo de datos (resumen)

`User` (client | maki | admin) → `HomeProfile` / `MakiProfile` (verificación en 4 capas) · `ServiceCategory` (activo | futuro) → `ServiceItem` (precio demo, incluye/no incluye, prueba de cierre) · `ServiceRequest` (estado, interpretación, líneas, candidatos, ofertas, código de visita, adicionales, evidencia, conformidad) → `Payment` → `Settlement` · `Incident` · `FutureInterest` · `AnalyticsEvent` · `Settings`. Detalle en `src/domain/types.ts` y `supabase/schema.sql`.

## Qué es real y qué es simulado

| Funcionalidad | Estado |
|---|---|
| Flujos completos de cliente, Maki y admin, con validaciones y estados | **Real** (en el navegador) |
| Reglas Cero Sorpresas, máquina de estados y permisos por rol | **Real** (probadas) |
| Motor de asignación (filtros, puntaje, cupo para nuevos, razones) | **Real** (reglas deterministas) |
| Cálculo de comisión, ingreso del Maki, margen y punto de equilibrio | **Real** (con supuestos configurables) |
| Compresión y almacenamiento de fotos | **Real** (local, en el navegador) |
| Interpretación de solicitudes | **Simulada por reglas.** Se etiqueta «No es IA real». El adaptador para IA real está listo (`VITE_AI_MODE=remote` + endpoint de backend) |
| Pagos y liquidaciones | **Simulados.** No hay pasarela ni movimiento de dinero |
| Autenticación | **Demo local** (SHA-256 en el navegador). En producción: Supabase Auth |
| Persistencia | **localStorage** del navegador. El esquema de Supabase está preparado, pero el adaptador no está implementado |
| Precios del tarifario | **Valores de demostración** editables, no precios de mercado |
| Métricas | Calculadas sobre **datos ficticios**. No son resultados experimentales |
| Notificaciones (WhatsApp, correo) | No implementadas; el seguimiento se ve en la app |

## Limitaciones conocidas
- Los datos viven en el navegador: cada navegador o dispositivo tiene su propia copia, y el límite es de unos 5 MB (por eso las fotos se comprimen a 720 px).
- La autenticación demo no es segura para producción; cualquier persona con acceso al navegador puede usar los atajos de demostración.
- El clasificador por reglas solo entiende el catálogo del MVP y frases típicas en español; no analiza el contenido de las fotos.
- No hay recordatorios automáticos de SLA (24 h / 72 h): se muestran como alertas en el dashboard.
- El Libro de Reclamaciones virtual y la revisión legal del modelo de prestación independiente están pendientes.

## Resultados de pruebas
`npm test`: **33 pruebas en 3 archivos, todas en verde.**
- `src/test/flujo-obligatorio.test.ts`: los 12 pasos del recorrido obligatorio.
- `src/test/reglas.test.ts`: IA y guardrails, motor de asignación, Cero Sorpresas, incidencias y garantía, admin, cuentas y economía (reproduce los S/ 7,30 de margen de la vía 1 del informe).
- `src/test/ui.test.tsx`: renderizado de la landing, protección de rutas por rol y vistas del Maki habilitado y del postulante.

Además, se revisaron manualmente en el navegador el recorrido completo y todas las rutas en 375 px y 1366 px, sin desbordes horizontales ni errores de consola. Detalle en [docs/04-entrega.md](docs/04-entrega.md).

## Próximos pasos
1. Implementar `SupabaseRepository` + Supabase Auth, y mover las transiciones a RPC `security definer`.
2. Edge Function `/api/ai/interpret` con un modelo real, prompt acotado al catálogo y registro de confianza; calibrar con casos reales (indicador C11 ≥ 80 %).
3. Notificaciones por WhatsApp Business (ficha y código 24 h antes, adicionales, conformidad).
4. Ejecutar el experimento de 5 semanas (H1–H5) y reemplazar los supuestos económicos por datos medidos.
5. Pasarela de pagos (Yape/Plin/tarjeta) y liquidación automática, después de la revisión legal y tributaria.
