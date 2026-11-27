# Precios, catálogo y elección del Maki (iteración 2)

## 1. ¿Por qué estos servicios en el primer escalón?

El catálogo inicial busca **construir confianza** en el segmento de personas que se mudan o equipan su hogar, antes de pasar a servicios que exigen más (gasfitería, electricidad, reparación de laptops). Cada servicio del escalón 1 cumple los cuatro criterios del informe (Tabla 17) y uno adicional:

1. Lo presta una persona ajena dentro del hogar.
2. El cliente no puede verificar fácilmente su precio o su calidad **antes** de contratarlo.
3. Se estandariza con un alcance «incluye / no incluye» y una **prueba de cierre** visible.
4. Su riesgo es manejable sin una regulación especial.
5. **Nuevo:** el resultado lo comprueba el propio cliente en minutos (está nivelado, no tiene juego, la cortina corre bien).

El quinto criterio es la razón de fondo: si el cliente **ve** que el trabajo quedó bien y que pagó lo justo, gana confianza para volver con algo más complejo. En una laptop, en cambio, el cliente no puede comprobar el diagnóstico ni las piezas (bien de confianza puro, Darby y Karni, 1973), así que ese servicio queda para el último escalón.

| Servicio | Por qué genera confianza en el segmento |
|---|---|
| Armado de cama | Es lo primero que se arma al mudarse; resultado visible |
| Armado de escritorio | Clave para el profesional joven que trabaja desde casa |
| Armado de ropero (hasta 3 puertas) | El anclaje antivuelco y la prueba de puertas hacen visible la calidad |
| Armado de ropero grande (4–6 puertas) | Mueble caro y pesado: se valora que lo haga alguien probado |
| Armado de mueble pequeño | Servicio de entrada económico, permite probar MakiYa con poco riesgo |
| **Armado de juego de comedor** (nuevo) | Parte del equipamiento típico del primer depa |
| Instalación de soporte de TV | El temor «se cae la TV» se resuelve con la prueba de tracción frente al cliente |
| Instalación de repisa | Trabajo rápido y frecuente al mudarse |
| **Instalación de barra o riel de cortina** (nuevo) | Privacidad desde el primer día: necesidad inmediata del segmento |
| Instalación de accesorio de baño | Perforar mayólica sin romperla requiere herramienta y oficio |
| Colgado de cuadro, espejo o perchero | Complemento barato que se suma en la misma visita |

**Paquetes para el nuevo depa** (sin descuento, suman el tarifario): *Mudanza esencial*, *Home office* y *Baño y ventanas*. Bajan la carga de explicar varias necesidades y reflejan cómo compra el segmento.

### Escalera de confianza (visible en la landing, en Servicios y en Admin)

| Escalón | Servicios | Qué cambia | Para habilitarlo (propuesta configurable) |
|---|---|---|---|
| 1 | Armado + instalaciones sencillas | Bajo riesgo, precio cerrado, prueba de cierre | Disponible |
| 2 | Orden y limpieza (Reset) | Más tiempo dentro del hogar y cerca de objetos personales | ≥ 30 servicios sin retrabajo, retrabajo ≤ 10 %, seguridad ≥ 4, precio justo ≥ 4, Makis activos ≥ 75 %, ≥ 3 Makis evaluados en la especialidad |
| 3 | Gasfitería menor | El cliente ya no puede juzgar el diagnóstico | Lo anterior con ≥ 80 servicios |
| 4 | Electricidad menor | Riesgo de seguridad | Lo anterior con ≥ 150 servicios y Makis certificados |
| 5 | Reparación de laptops, TV, consolas y nuevas soluciones Daily | Diagnóstico técnico, piezas y datos personales | Lo anterior con ≥ 300 servicios y un protocolo de custodia |

Las metas de calidad salen del informe (C8, H2, H3, H4). **Los volúmenes (30, 80, 150, 300) son una propuesta del prototipo**, no una decisión validada: se editan en Admin › Comisiones y reglas.

## 2. Precios alineados al mercado

Investigación de escritorio hecha el **27-11-2026** con fuentes públicas en Lima. Regla del informe: el precio no puede superar en más de **+10 %** la referencia alta de mercado (Admin › Servicios bloquea precios por encima del tope).

| Servicio | Precio MakiYa | Referencia en Lima | Fuentes principales |
|---|---|---|---|
| Armado de cama | S/ 55 | S/ 35–70 | Sodimac rango 1 (S/ 34,90) y rango 2 (S/ 69,90); técnicos independientes S/ 30–75 |
| Armado de escritorio | S/ 45 | S/ 35–50 | Sodimac rango 1 (S/ 34,90); escritorio + silla (S/ 49,90) |
| Armado de ropero (hasta 3 puertas) | S/ 49 | S/ 35–70 | Sodimac rango 1 (S/ 34,90); independientes ~S/ 35 |
| Armado de ropero grande (4–6 puertas) | S/ 75 | S/ 45–100 | Sodimac rango 2 (S/ 69,90) y rango 3 (S/ 99,90); independientes ~S/ 45 |
| Armado de mueble pequeño | S/ 35 | S/ 30–40 | Sodimac rango 1 (S/ 34,90) |
| Armado de juego de comedor | S/ 65 | S/ 55–70 | Sodimac rango 2 (S/ 69,90, incluye comedores) |
| Instalación de soporte de TV | S/ 55 | S/ 50–60 | Sodimac (S/ 55 c/u) |
| Instalación de repisa | S/ 30 | S/ 30–35 | Sodimac (S/ 30 c/u) |
| Barra o riel de cortina | S/ 40 | S/ 40–50 | Sophie Store (S/ 45) · *referencia limitada* |
| Accesorio de baño | S/ 30 | S/ 30–45 | Sodimac instalación de accesorios (S/ 44,90) · *referencia limitada* |
| Cuadro, espejo o perchero | S/ 25 | S/ 25–35 | Técnicos independientes (desde S/ 30) · *referencia limitada* |

Enlaces completos en `src/config/catalog.ts` y en Admin › Servicios.

**Cómo leerlo frente al docente:**
- Los precios de MakiYa quedan **dentro** del rango de mercado; ninguno supera el tope.
- Son **más caros que el técnico independiente** más barato y parecidos al retail. La diferencia se justifica con la verificación en 4 capas, la prueba de cierre, el pago tras la conformidad y la garantía. Esa disposición a pagar es justamente la **hipótesis H3** del informe y todavía no está validada.
- **Honestidad competitiva:** Sodimac declara **1 año de garantía** en sus servicios de armado, mientras que el informe propone 30 días para MakiYa. Conviene revisarlo o explicar por qué 30 días basta (MakiYa garantiza la mano de obra con un Maki verificado; Sodimac exige que el servicio esté en el radio de sus tiendas).
- Limitaciones: fuentes públicas sin fecha de vigencia confirmada, algunas páginas con precios inconsistentes y anuncios de independientes sin verificar. Antes de cobrar, el informe propone validar con 5 a 10 cotizaciones de «cliente incógnito» por categoría.

## 3. Elección del Maki con más autonomía

Problema detectado: el cliente solo podía elegir entre 1 y 3 recomendados y tenía poca información para decidir.

Cambios:
- **Recomendados y «Todos los disponibles»:** el motor sigue sugiriendo de 1 a 3 (para no cargar al cliente con la búsqueda, informe 8.2), pero el cliente puede ver **a todos** los Makis compatibles y ordenarlos por recomendación, calificación, número de trabajos o años de experiencia.
- **Perfil completo del Maki:** presentación, verificación en 4 capas, prueba de oficio, trabajos realizados, porcentaje sin retrabajo, seguridad percibida, **fotos de trabajos anteriores** (evidencia de cierre) y **reseñas escritas** de clientes que pagaron el servicio.
- **Opciones de respaldo:** «Si mi Maki no puede, enviar a mi siguiente opción». Si el Maki rechaza, la oferta pasa sola a la siguiente opción del cliente, sin que tenga que empezar de nuevo. El Maki sigue decidiendo si acepta.
- Se mantiene el consentimiento: ninguna asignación se confirma sin que el Maki acepte.

## 4. Marca (Brand Kit)

- Isotipo con los colores finales: **coral #F0785A** + **turquesa #20A995** (antes rosa #EA1B6B + #17AAA0 del archivo preliminar). La silueta no cambia.
- Tipografía: **Manrope** (títulos, botones y logotipo) e **Inter** (textos e interfaz).
- Logotipo «MakiYa» en verde petróleo y slogan en cursiva, sin punto final: «Una mano para tu día».
- Isologo (cuadrado petróleo) como icono de app y favicon; versión negativa en la barra del administrador.
- Sub-marcas **MakiYa Arreglos** y **MakiYa Daily**, y sello **Cero Sorpresas**.
- Se eliminaron los usos incorrectos del logo: ya no se aplica opacidad ni escala de grises en los estados vacíos.
- Contraste: el coral y el turquesa no alcanzan AA en texto pequeño sobre blanco. Para texto se usan sus tonos oscuros (`accent-700` #B8472B, 5,3:1; `turq-700` #137366, 5,7:1).
