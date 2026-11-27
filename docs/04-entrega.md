# Fase 10 — Entrega

La instalación, ejecución, usuarios de demostración, arquitectura, alcance real vs. simulado, limitaciones y próximos pasos están en el [README](../README.md). Este documento registra la verificación por fase y los resultados de las pruebas.

## Cumplimiento por fase

| Fase | Entregable | Estado |
|---|---|---|
| 0 Auditoría | `docs/00-auditoria.md`: resumen, matriz de 40 requisitos, decisiones, hipótesis, 10 contradicciones resueltas, arquitectura y plan | ✔ |
| 1 Blueprint | `docs/01-blueprint.md`: actores, módulos, entidades, máquina de estados, reglas y motor | ✔ |
| 2 Flujos | `docs/02-user-flows.md`: flujos normales y alternativos de los 3 roles | ✔ |
| 3 UX/UI | `docs/03-ux-ui.md`, `tailwind.config.ts`, `src/components/ui.tsx`, `src/brand/Brand.tsx` | ✔ |
| 4 Cliente | Landing, registro e ingreso, catálogo, asistente, orientación, propuesta, elección del Maki, seguimiento, código de visita, adicionales, evidencia, conformidad, pago simulado, garantía e incidencias, historial, Perfil del Hogar y Mi Maki | ✔ |
| 5 Maki | Registro, perfil, especialidades, experiencia, zona, disponibilidad, evaluación en 4 capas, ofertas (aceptar o rechazar), trabajos, código, adicionales, evidencia, ingresos y comisiones, liquidaciones, reputación, historial y pausa | ✔ |
| 6 Admin | Dashboard, solicitudes, revisión de presupuestos, asignación (reenvío con consentimiento), Makis y evaluación, clientes, incidencias, garantías, liquidaciones, servicios, comisiones y reglas, y analítica | ✔ |
| 7 IA y asignación | `src/ai`, `src/matching` con pruebas | ✔ |
| 8 Integración | Recorrido obligatorio automatizado y verificado manualmente en el navegador | ✔ |
| 9 Testing | 33 pruebas, chequeo de tipos y build sin errores; revisión responsive | ✔ |
| 10 Entrega | README + este documento | ✔ |

## Identidad de marca
- Isotipo vectorizado desde el archivo oficial con *potrace* (sin redibujar): `public/brand/isotipo.svg`. El original está en `docs/logo-referencia-original.png`.
- Colores del logo extraídos del archivo: `#17AAA0` y `#EA1B6B`. El isotipo nunca se recolorea ni se deforma.
- Isotipo, logotipo y slogan son componentes separados; el icono de app está en `public/brand/app-icon.svg` (también es el favicon).

## Resultados de pruebas automatizadas

```
✓ src/test/flujo-obligatorio.test.ts (1 test)
✓ src/test/reglas.test.ts (27 tests)
✓ src/test/ui.test.tsx (5 tests)
Test Files  3 passed (3)
     Tests  33 passed (33)
```

Cobertura funcional destacada:
- **Recorrido de 12 pasos:** solicitud → registro → visible para el admin (y no para otro cliente) → candidatos (Rosa como Mi Maki; el postulante excluido) → oferta tras la aprobación escrita → aceptación → código → inicio (rechaza el código incorrecto) → evidencia → conformidad → pago simulado al 20 % (repetición) → North Star, ingresos e historial actualizados → liquidación.
- **Cero Sorpresas:** no hay oferta sin aprobación; un adicional rechazado no se cobra; los materiales requieren boleta y no generan comisión; la evidencia exige fotos y el checklist completo; no hay pago sin conformidad; se exige anticipación de 24 h y consentimiento para las fotos.
- **IA:** clasificación con cantidades, máximo 2 preguntas, categorías futuras no contratables, pedidos prohibidos, trabajo a medida enviado a revisión humana, autoservicio, fallo del proveedor derivado a una persona, sugerencias inválidas filtradas.
- **Motor:** filtros de especialidad (todas las categorías del pedido), zona, habilitación, disponibilidad y agenda; cupo para Makis nuevos; el rechazo excluye al Maki.
- **Admin:** verificación de presupuestos solo por el admin, habilitación con 4 capas y prueba ≥ 14/20, bloqueo de activar servicios de categorías futuras, validación de la comisión y reenvío solo con aprobación previa del cliente.

## Verificación manual en el navegador
| Caso | Resultado |
|---|---|
| Recorrido completo cliente ↔ Maki con la UI real (texto → 2 preguntas → propuesta S/ 135 → aceptación → código incorrecto rechazado → código correcto → foto real comprimida + checklist → conformidad → comprobante) | ✔ |
| El Maki intenta aceptar dos trabajos en la misma franja | Bloqueado: «Ya tienes un trabajo confirmado en esa franja» ✔ |
| Todas las rutas del cliente, el Maki y el admin a 375 px | Sin desborde horizontal ✔ |
| Admin a 1366 px (barra lateral, dashboard, analítica) | ✔ |
| Consola tras una recarga | Sin errores ✔ |

## Errores encontrados y corregidos durante las pruebas
1. Fechas de demostración que caían en domingo (no laborable): ahora se mueven al lunes.
2. La palabra «colgar» sumaba un accesorio inexistente: se eliminó la palabra clave genérica.
3. Un pedido mixto (armado + instalación) podía asignarse a un Maki con una sola especialidad: el motor ahora exige todas las categorías.
4. El formulario de conformidad perdía valores con clics rápidos: ahora usa actualizaciones funcionales del estado.
5. El paquete pesaba 1,18 MB por importar todos los iconos: se redujo a 432 kB.

## Datos y métricas
Todas las métricas de la aplicación se marcan como **«Datos de demostración — no son resultados experimentales»**. Las hipótesis H1–H5 del informe siguen siendo hipótesis.
