# Roadmap de Artistic Portfolio

Estado: base T1–T5 implementada localmente; entrega completa de plantilla pendiente. Actualizado el 6 de octubre de 2026.

## Objetivo

Convertir Musea Art en una plantilla artística reutilizable: una persona debe poder mostrar una obra convincente, explicar su proceso y recibir consultas; quien clone el repositorio debe poder sustituir la identidad y el contenido sin perseguir valores repartidos por los componentes.

La dirección visual y los contratos de contenido están en [docs/DESIGN.md](docs/DESIGN.md). Este roadmap distingue la base implementada de los criterios de la plantilla completa: ningún hito se cierra solo por cubrir una parte de su alcance.

## Punto de partida

El código inspeccionado utiliza Astro 7, Tailwind CSS 4 y GSAP 3.15. Ya incluye:

- Identidad y publicación centralizadas en `src/data/site.ts`; inicio, portfolio, contacto y tres fichas generadas desde proyectos tipados en `src/data/projects.ts`.
- Fuentes locales Mansalva y Josefin Sans; márgenes fluidos, rejillas adaptables y objetivos táctiles en la navegación.
- Animaciones GSAP centralizadas: entrada del hero, firma, trazo de tinta ligado al scroll, apariciones de secciones, desplazamiento al portfolio y alternativa de movimiento reducido.
- Inicio con una colección seleccionada antes de la biografía; catálogo completo con portadas propias y textos legibles sin esperar animaciones.
- Contacto demo deshabilitado y sin envío por defecto; modo live explícito con POST nativo, estados accesibles, bloqueo de duplicados, errores y reintento.
- Tres galerías distintas sin collage de sustitución, créditos visibles y una referencia editorial identificada como colección curada, no como un encargo propio.
- Canonical y metadatos sociales por página, imagen social local, sitemap y robots derivados de la URL pública configurada.
- Pruebas de configuración, HTML de producción y controladores; workflow de GitHub Actions con Node 24, pnpm fijado e instalación con lockfile congelado.

La implementación y su evidencia local por unidad se registran en [odd/tasks/portfolio-foundations.md](odd/tasks/portfolio-foundations.md). Esta lista no sustituye los resultados de pruebas, compilación o navegador. La configuración de CI no demuestra una ejecución remota; tampoco se ha publicado una release, desplegado esta base ni comprobado entrega real de Formspree.

Persisten diferencias entre una demo funcional y una plantilla terminada: falta verificar la matriz completa responsive y de accesibilidad con contenido final, medir los presupuestos de carga, optimizar imágenes, añadir una vía alternativa de contacto y validar la entrega real en una cuenta propia. Los créditos heredados no demuestran las licencias; la demo no acredita autoría, clientes ni resultados reales.

## Orden de trabajo

| Hito | Prioridad | Depende de | Resultado |
| --- | --- | --- | --- |
| 1. Configuración y contenido | P0 | Publicación de la base | Una fuente de identidad y un modelo de caso validado |
| 2. Un caso de referencia | P0 | 1 | Una ficha completa que establezca el nivel del resto |
| 3. Recorrido y dirección visual | P1 | 2 | Inicio, índice y fichas con funciones distintas |
| 4. Contacto y calidad técnica | P1 | 1; verificar de nuevo después de 3 | Contacto fiable, acceso, carga y enlaces comprobados |
| 5. Entrega de plantilla | P1 | 2, 3 y 4 | Instalación reproducible y una release documentada |

No se asignan fechas sin conocer la disponibilidad de contenido. Los hitos se cierran por sus criterios de aceptación, no por haber creado sus archivos.

## 1. Configuración y contenido

**Base actual:** configuración tipada y validada, sin endpoint ajeno; guía de personalización sobre `site.ts` y `projects.ts`. Se conserva la identidad numérica de las rutas; la migración a slugs no forma parte de T1–T5.

**Entregables de la plantilla completa:** configuración de identidad, idioma, navegación, redes, contacto y SEO; colección validada de proyectos. El documento de diseño conserva propuestas adicionales que deben aceptarse antes de implementarlas.

**Aceptación:**

- Cambiar nombre, biografía, redes, idioma, correo, URL pública y endpoint no exige editar componentes.
- Un proyecto inválido falla en la comprobación previa a publicar con un mensaje que identifique el campo; se detectan IDs repetidos, archivos inexistentes y galerías vacías. Si se adoptan slugs, también deberán validarse.
- No se reutiliza un endpoint del autor por defecto en una instalación sin configurar.
- Los datos de demostración están identificados como tales; métricas, clientes y testimonios son opcionales y solo se muestran con contenido sustentado.
- Las URLs actuales `/projects/1`, `/projects/2` y `/projects/3` conservan acceso mediante redirecciones si se adoptan slugs legibles.

## 2. Un caso de referencia

**Base actual:** tres colecciones con galerías propias de 3, 1 y 2 imágenes; la primera tiene notas editoriales de selección. Sustituirlas por obra propia y verificar permisos sigue pendiente para una plantilla personalizada.

**Entregables:** una ficha editorial completa con portada, contexto, responsabilidad, proceso, resultado observable y galería propia; créditos y procedencia de sus recursos. Después se adapta el mismo contrato a los otros dos ejemplos.

**Aceptación:**

- El primer caso tiene portada y al menos tres imágenes pertinentes, con texto alternativo, dimensiones y pies que explican qué se está viendo.
- El resultado describe lo producido o aprendido; no necesita cifras comerciales inventadas.
- Las tres fichas publicadas tienen conjuntos de imágenes distintos y descripciones relacionadas con sus imágenes. Ninguna cae silenciosamente en el collage global.
- Los ejemplos conceptuales se presentan como ejemplos, sin atribuirlos a clientes reales.
- Desde cada caso se puede volver al índice, abrir otro caso y llegar a contacto mediante enlaces con nombres claros.

## 3. Recorrido y dirección visual

**Base actual:** obra antes de biografía, selección y catálogo distintos, contraste funcional y créditos visibles; comprobaciones locales puntuales a 390 y 1440 px. La matriz completa de `docs/DESIGN.md`, con contenido final y títulos largos, no está cerrada.

**Entregables:** composición revisada de las cinco piezas descritas en el diseño: navegación, inicio, índice, caso y contacto; tokens semánticos compartidos; reglas de imágenes y movimiento.

**Aceptación:**

- En inicio, una obra seleccionada aparece antes de la biografía. A 390 × 844 y 1440 × 900, con texto al tamaño predeterminado, se ve el comienzo de esa obra sin desplazarse.
- Inicio presenta una selección breve; portfolio ofrece el catálogo completo. No repiten la misma secuencia de secciones y textos.
- Las tarjetas muestran obra, título, disciplina y una frase; el texto largo vive en las fichas.
- Mansalva, Josefin Sans, la cuadrícula y el acento rojo conservan el carácter del proyecto. Los colores funcionales proceden de tokens compartidos.
- Las leyendas esenciales se leen con ratón, teclado y pantalla táctil; no dependen de hover.
- Se satisface la matriz responsive y de accesibilidad de `docs/DESIGN.md` con el contenido final, incluyendo títulos largos.

## 4. Contacto y calidad técnica

**Base actual:** contacto y ciclo de vida comprobados con respuestas controladas, metadatos por página y generación de sitemap/robots. Permanecen pendientes la entrega real de Formspree, la vía alternativa de contacto, la matriz completa de acceso/navegación y los presupuestos de carga con imágenes optimizadas.

**Entregables:** estados del formulario, vía alternativa de contacto, imágenes adaptables, metadatos por página, sitemap y comprobaciones de regresión centradas en los recorridos importantes.

**Aceptación:**

- El formulario distingue reposo, envío, éxito y error. Bloquea envíos duplicados mientras espera y conserva el mensaje tras un fallo.
- Los errores se muestran junto al formulario y se anuncian de forma accesible. Una respuesta rechazada por el proveedor nunca produce un mensaje de éxito.
- Se prueban éxito, fallo del proveedor, desconexión y reintento mediante respuestas controladas. Una comprobación real de entrega usa un destinatario configurado expresamente para la prueba.
- Las seis rutas actuales —y cada ruta que se añada— pasan la matriz de navegación, acceso y responsive. No hay errores de consola propios de la aplicación, enlaces internos rotos ni recursos locales con 404.
- Cada página tiene título y descripción pertinentes, canonical de producción e imagen social resoluble; sitemap y robots apuntan al dominio configurado.
- Se registran medidas reproducibles y se cumplen los presupuestos de carga del diseño. Las cifras de laboratorio se identifican como tales.

## 5. Entrega de plantilla

**Base actual:** requisitos fijados, instalación congelada, pruebas que compilan la fuente actual, CI configurada y documentación alineada. La ejecución remota de CI, prueba de una copia personalizada, capturas finales, release y correspondencia del despliegue con el commit publicado siguen pendientes.

**Entregables:** README con capturas reales, documentación de personalización, inventario de recursos y créditos, guía de despliegue, automatización de comprobaciones y notas de release.

**Aceptación:**

- Una instalación limpia con las versiones documentadas instala con el lockfile y termina `pnpm build` sin errores.
- Una persona puede seguir la guía y publicar una copia con identidad propia, añadir un cuarto proyecto y configurar contacto sin editar la estructura de los componentes.
- Todos los ejemplos de propiedades, rutas y comandos de la documentación existen y coinciden con la implementación.
- La integración continua ejecuta la compilación y los recorridos críticos antes de integrar cambios; los resultados son visibles en GitHub.
- La release enlaza demo, cambios, requisitos y limitaciones conocidas. La demo desplegada corresponde al commit publicado.

## Fuera de esta secuencia

CMS, búsqueda, filtros, blog, modo oscuro, tienda y traducción a varios idiomas no son requisitos de la primera plantilla completa. El lightbox tampoco está implementado ni forma parte de T1–T5. Se reconsideran cuando exista contenido o una necesidad concreta que los justifique. Un formulario fiable y tres casos coherentes tienen prioridad sobre añadir más pantallas.

## Primera siguiente iteración

Completar la matriz responsive y de accesibilidad de las seis rutas con contenido final, y medir la carga antes de fijar la optimización de imágenes. Después, verificar permisos de recursos, una copia personalizada y contacto en una cuenta propia. La publicación de CI, despliegue y release requieren sus comprobaciones separadas; no se deducen de una compilación local correcta.
