# Fase 3 — UX/UI

## Principios
1. **Confianza visible, no declarada:** cada pantalla muestra un mecanismo concreto (quién llega, cuánto cuesta y qué incluye, evidencia) en lugar de sellos genéricos de «verificado».
2. **Estructura fija de respuesta:** *qué es → qué incluye → qué no incluye → cuánto cuesta → garantía* (I7.8).
3. **Lenguaje de buen vecino:** cercano, claro, sin tecnicismos y admitiendo límites.
4. **Blanco dominante:** el color se usa para dar significado, no para decorar.
5. **Mobile-first:** navegación inferior en el cliente y el Maki; barra lateral en el admin desde `lg`.

## Design tokens (`tailwind.config.ts`)

| Token | Valor | Uso | Contraste sobre blanco |
|---|---|---|---|
| `petrol-700` | **#075B55** | Identidad, navegación, títulos, botón primario | 8,0 : 1 ✔ |
| `petrol-800` | #05473F | Hover del primario | — |
| `turq-500` | **#17AAA0** (exacto del logo) | Interacciones secundarias, foco, progreso e iconos | 2,9 : 1 → **no se usa para texto pequeño** |
| `turq-700` | #0E7D75 | Texto o enlace secundario cuando hace falta el tono turquesa | 5,0 : 1 ✔ |
| `mint-100` | **#D9F1EB** | Superficies suaves y estados informativos | — |
| `mint-50` | #EEF8F5 | Fondo de bloques destacados | — |
| `accent-500` | **#EA1B6B** (exacto del logo) | Acentos puntuales no textuales: puntos de notificación, contadores, detalle del hero | 4,3 : 1 → **no se usa para texto pequeño** |
| `accent-700` | #C2185B | Texto de alertas, errores y badges de atención | 5,9 : 1 ✔ |
| `accent-50` | #FDECF2 | Fondo de alertas de atención | — |
| `ink-900` | **#263B39** (grafito verdoso) | Texto principal | 11,9 : 1 ✔ |
| `ink-600` | #566866 | Texto secundario | 5,9 : 1 ✔ |
| `ink-400` | #8A9897 | Placeholders y texto deshabilitado | — |
| `line` | #E3EAE9 | Bordes y separadores | — |
| `surface` | #F5F8F7 | Fondos secundarios (gris muy claro) | — |
| `warn` | #B45309 / #FEF3C7 | Advertencias (SLA o rango de comisión) | 5,0 : 1 ✔ |

Reglas: no hay grandes superficies turquesa ni rosa; las tarjetas son blancas con borde `line`; el verde petróleo solo aparece como fondo en el hero de la landing, la barra del admin y el botón primario.

## Tipografía
**Plus Jakarta Sans Variable** (empaquetada con `@fontsource-variable`, funciona sin conexión).

| Estilo | Tamaño y peso |
|---|---|
| Display | 36–48 / 800, interlineado 1,1 |
| H1 | 24–28 / 750 |
| H2 | 18–20 / 700 |
| Cuerpo | 15–16 / 450 |
| Etiqueta | 13 / 600 |
| Microcopy | 12 / 500 |

Las cifras usan `tabular-nums`.

## Iconografía
`lucide-react` con trazo de 1,75 px y tamaños 16, 20 y 24. Un icono por concepto: `ShieldCheck` (Maki Probado), `ReceiptText` (Presupuesto Verificado), `BadgeCheck` (Pago tras Conformidad), `KeyRound` (Visita Segura) y `Hand` no se usa, para no competir con el isotipo.

## Componentes (`src/components/ui`)
`Button` (primary, secondary, ghost, danger; sm, md, lg; loading), `Card`, `Badge` (tonos), `StatusBadge` (por estado de solicitud), `Input`, `Textarea`, `Select`, `Checkbox`, `Field` (etiqueta + ayuda + error), `Modal`, `EmptyState`, `Stat`, `Timeline`, `Stepper`, `Tabs`, `Toast`, `Money`, `Rating`, `PhotoPicker`, `DemoBanner`, `SimulatedTag`, `PageHeader`, `Skeleton`.

## Navegación
- **Público:** top bar (logo, Cómo funciona, Servicios, Para Makis, Ingresar).
- **Cliente:** en móvil, barra inferior (Inicio · Pedir · Servicios · Historial · Perfil); en escritorio, top bar con las mismas secciones.
- **Maki:** en móvil, barra inferior (Solicitudes · Trabajos · Ingresos · Perfil); en escritorio, top bar.
- **Admin:** barra lateral petróleo colapsable (Dashboard, Solicitudes, Makis, Clientes, Incidencias, Garantías, Liquidaciones, Servicios, Configuración, Analítica).
- **Selector de rol demo** visible en el banner de demostración para cambiar rápido de usuario durante una presentación.

## Wireframes (texto)

**Cliente › Propuesta (móvil)**
```
┌──────────────────────────────┐
│ ← Solicitud MK-1042  [Propuesta lista]
│ «Armar una cama de 2 plazas» │
│ ┌ Qué incluye ─────────────┐ │
│ │ ✓ Armado con tus herram.. │ │
│ │ ✕ No incluye: cortes…     │ │
│ └───────────────────────────┘ │
│ Precio cerrado     S/ 70,00  │
│ Garantía 30 días · Prueba de │
│ cierre: nivel y sin juego    │
│ ── Elige a tu Maki ───────── │
│ (●) Rosa Q. 4,9★ 31 trabajos │
│     «Armó 14 camas en MakiYa»│
│ ( ) Luis P. 4,7★ …           │
│ [✓] Apruebo alcance y precio │
│ [ Enviar a Rosa ]            │
└──────────────────────────────┘
```

**Maki › Oferta**
```
┌ MK-1042 · Armado de cama · San Miguel · sáb 9–12 ┐
│ Resumen del asistente…                             │
│ Precio S/ 70 · Comisión 25 % S/ 17,50 · Tú recibes S/ 52,50 │
│ [Rechazar]                     [Aceptar trabajo]  │
└────────────────────────────────────────────────────┘
```

## Estados de la UI
- **Carga:** `Skeleton` en las listas; `Button loading` en las acciones (el proveedor de IA simula latencia).
- **Vacío:** `EmptyState` con ilustración del isotipo en baja opacidad, texto útil y una acción.
- **Error:** mensaje en línea en los campos; `Toast` de error en las acciones rechazadas por reglas (por ejemplo, «El código no coincide»).
- **Éxito:** `Toast` + avance visible en la línea de tiempo.

## Responsive
Breakpoints de Tailwind: `sm` 640, `md` 768, `lg` 1024. Contenedor máximo de 1120 px. En el cliente y el Maki, columna única hasta `md` y dos columnas (detalle + resumen fijo) desde `lg`. Las tablas del admin se convierten en tarjetas en móvil.

## Accesibilidad
Contraste AA en texto, foco visible (`ring-turq-500`), etiquetas reales en los formularios, `aria-live` en los toasts y objetivos táctiles ≥ 44 px.
