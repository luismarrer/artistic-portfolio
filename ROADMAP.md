# Roadmap de Artistic Portfolio

Estado: propuesta de próximas iteraciones. Actualizado el 13 de septiembre de 2026.

## Objetivo

Convertir Musea Art en una plantilla artística reutilizable: una persona debe poder mostrar una obra convincente, explicar su proceso y recibir consultas; quien clone el repositorio debe poder sustituir la identidad y el contenido sin perseguir valores repartidos por los componentes.

La dirección visual y los contratos de contenido están en [docs/DESIGN.md](docs/DESIGN.md). Este roadmap establece orden y criterios de salida; no afirma que las propuestas estén implementadas.

## Punto de partida

El código inspeccionado utiliza Astro 7, Tailwind CSS 4 y GSAP 3.15. Ya incluye:

- Inicio, portfolio, contacto y tres fichas generadas desde `src/data/projects.json`.
- Fuentes locales Mansalva y Josefin Sans; márgenes fluidos, rejillas adaptables y objetivos táctiles en la navegación.
- Animaciones GSAP centralizadas: entrada del hero, firma, trazo de tinta ligado al scroll, apariciones de secciones, desplazamiento al portfolio y alternativa de movimiento reducido.
- Formulario con validación HTML y envío a Formspree, confirmación de éxito y tratamiento básico de errores.
- Galería con créditos, metadatos básicos y adaptación a diferentes anchos.

Las correcciones de la publicación actual son la base de este plan. La compilación y las comprobaciones de publicación se registran en su cambio correspondiente; esta lista no sustituye esos resultados.

Persisten diferencias entre una demo funcional y una plantilla terminada: las fichas comparten el collage predeterminado, el contenido y la identidad están repartidos, existen afirmaciones de ejemplo sin evidencia, y faltan un recorrido editorial propio y criterios verificables de calidad. No se debe presentar el contenido de demostración como trabajos o resultados reales.

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

**Entregables:** configuración tipada de identidad, idioma, navegación, redes, contacto y SEO; colección validada de proyectos; guía de migración desde el JSON actual. El contrato propuesto se detalla en el documento de diseño.

**Aceptación:**

- Cambiar nombre, biografía, redes, idioma, correo, URL pública y endpoint no exige editar componentes.
- Un proyecto inválido falla en la comprobación previa a publicar con un mensaje que identifique el campo; se detectan slugs repetidos, archivos inexistentes y galerías vacías.
- No se reutiliza un endpoint del autor por defecto en una instalación sin configurar.
- Los datos de demostración están identificados como tales; métricas, clientes y testimonios son opcionales y solo se muestran con contenido sustentado.
- Las URLs actuales `/projects/1`, `/projects/2` y `/projects/3` conservan acceso mediante redirecciones si se adoptan slugs legibles.

## 2. Un caso de referencia

**Entregables:** una ficha editorial completa con portada, contexto, responsabilidad, proceso, resultado observable y galería propia; créditos y procedencia de sus recursos. Después se adapta el mismo contrato a los otros dos ejemplos.

**Aceptación:**

- El primer caso tiene portada y al menos tres imágenes pertinentes, con texto alternativo, dimensiones y pies que explican qué se está viendo.
- El resultado describe lo producido o aprendido; no necesita cifras comerciales inventadas.
- Las tres fichas publicadas tienen conjuntos de imágenes distintos y descripciones relacionadas con sus imágenes. Ninguna cae silenciosamente en el collage global.
- Los ejemplos conceptuales se presentan como ejemplos, sin atribuirlos a clientes reales.
- Desde cada caso se puede volver al índice, abrir otro caso y llegar a contacto mediante enlaces con nombres claros.

## 3. Recorrido y dirección visual

**Entregables:** composición revisada de las cinco piezas descritas en el diseño: navegación, inicio, índice, caso y contacto; tokens semánticos compartidos; reglas de imágenes y movimiento.

**Aceptación:**

- En inicio, una obra seleccionada aparece antes de la biografía. A 390 × 844 y 1440 × 900, con texto al tamaño predeterminado, se ve el comienzo de esa obra sin desplazarse.
- Inicio presenta una selección breve; portfolio ofrece el catálogo completo. No repiten la misma secuencia de secciones y textos.
- Las tarjetas muestran obra, título, disciplina y una frase; el texto largo vive en las fichas.
- Mansalva, Josefin Sans, la cuadrícula y el acento rojo conservan el carácter del proyecto. Los colores funcionales proceden de tokens compartidos.
- Las leyendas esenciales se leen con ratón, teclado y pantalla táctil; no dependen de hover.
- Se satisface la matriz responsive y de accesibilidad de `docs/DESIGN.md` con el contenido final, incluyendo títulos largos.

## 4. Contacto y calidad técnica

**Entregables:** estados del formulario, vía alternativa de contacto, imágenes adaptables, metadatos por página, sitemap y comprobaciones de regresión centradas en los recorridos importantes.

**Aceptación:**

- El formulario distingue reposo, envío, éxito y error. Bloquea envíos duplicados mientras espera y conserva el mensaje tras un fallo.
- Los errores se muestran junto al formulario y se anuncian de forma accesible. Una respuesta rechazada por el proveedor nunca produce un mensaje de éxito.
- Se prueban éxito, fallo del proveedor, desconexión y reintento mediante respuestas controladas. Una comprobación real de entrega usa un destinatario configurado expresamente para la prueba.
- Las seis rutas actuales —y cada ruta que se añada— pasan la matriz de navegación, acceso y responsive. No hay errores de consola propios de la aplicación, enlaces internos rotos ni recursos locales con 404.
- Cada página tiene título y descripción pertinentes, canonical de producción e imagen social resoluble; sitemap y robots apuntan al dominio configurado.
- Se registran medidas reproducibles y se cumplen los presupuestos de carga del diseño. Las cifras de laboratorio se identifican como tales.

## 5. Entrega de plantilla

**Entregables:** README con capturas reales, documentación de personalización, inventario de recursos y créditos, guía de despliegue, automatización de comprobaciones y notas de release.

**Aceptación:**

- Una instalación limpia con las versiones documentadas instala con el lockfile y termina `pnpm build` sin errores.
- Una persona puede seguir la guía y publicar una copia con identidad propia, añadir un cuarto proyecto y configurar contacto sin editar la estructura de los componentes.
- Todos los ejemplos de propiedades, rutas y comandos de la documentación existen y coinciden con la implementación.
- La integración continua ejecuta la compilación y los recorridos críticos antes de integrar cambios; los resultados son visibles en GitHub.
- La release enlaza demo, cambios, requisitos y limitaciones conocidas. La demo desplegada corresponde al commit publicado.

## Fuera de esta secuencia

CMS, búsqueda, filtros, blog, modo oscuro, tienda y traducción a varios idiomas no son requisitos de la primera plantilla completa. Se reconsideran cuando exista contenido o una necesidad concreta que los justifique. Un formulario fiable y tres casos coherentes tienen prioridad sobre añadir más pantallas.

## Primera siguiente iteración

Implementar el mínimo del hito 1 necesario para producir el caso del hito 2: identidad centralizada, contrato de proyecto y una galería propia. Revisar ese caso a 390 y 1440 px antes de extender el diseño a todo el sitio. Esta revisión debe confirmar que el contenido sostiene la dirección visual y que el contrato resulta cómodo de personalizar.
