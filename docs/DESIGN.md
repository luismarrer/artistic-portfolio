# Diseño de Musea Art

Estado: especificación propuesta para las próximas iteraciones. Actualizado el 13 de septiembre de 2026. Prioridades y dependencias: [ROADMAP.md](../ROADMAP.md).

## 1. Producto y criterio de éxito

Musea Art es una plantilla para artistas visuales, ilustradores y diseñadores que necesitan presentar su trabajo y recibir consultas. Tiene dos públicos: quien explora la obra y quien clona la plantilla para publicar la suya.

El visitante debe entender qué crea la persona, encontrar un proyecto pertinente, ver evidencia de su proceso y saber cómo contactar. La persona que instala la plantilla debe poder cambiar identidad, contenido y conexiones desde lugares documentados. El éxito se verifica con los recorridos y criterios del roadmap; no se presupone una tasa de conversión ni un número de clientes.

## 2. Base actual y decisiones propuestas

La base inspeccionada contiene seis páginas generadas, Astro 7, Tailwind CSS 4, GSAP 3.15, fuentes locales, `ClientRouter`, tarjetas SVG y un formulario Formspree. Las rutas numéricas proceden de `src/data/projects.json`. `Collage.astro` acepta `images`, pero tanto el índice como todas las fichas lo usan sin imágenes propias. La identidad vive en varios componentes.

| Decisión | Estado actual | Propuesta |
| --- | --- | --- |
| Identidad | Mansalva, Josefin Sans, cuadrícula y colores cálidos | Conservarlos y asignarles funciones estables |
| Inicio | Hero de altura mínima de pantalla, biografía y proyectos | Presentación breve, obra seleccionada, biografía y contacto |
| Portfolio | Introducción ilustrada, mismas tarjetas y collage genérico | Índice visual de proyectos con su propia portada |
| Fichas | SVG, descripción y collage compartido | Caso con contexto, proceso, resultado y galería propia |
| Movimiento | GSAP centralizado: entrada por palabras, firma, trazo ligado al scroll y apariciones de secciones; limpieza entre rutas | Conservar firma y trazo, ajustar su intensidad y garantizar navegación sin animación |
| Personalización | JSON y valores repartidos por componentes | Configuración tipada y proyectos validados |

Las propuestas siguientes requieren implementación. La existencia de una regla aquí no acredita que la web ya la cumpla.

## 3. Dirección visual

**Concepto: un cuaderno de trabajo abierto.** La cuadrícula introduce el espacio de experimentación; la tipografía manuscrita aporta la voz; las obras demuestran el oficio. La firma y el trazo de tinta existentes refuerzan ese carácter. La composición de obra y anotación breve sobre la cuadrícula les da contexto; el trazo debe recorrer espacios libres y no competir con las imágenes, atravesar texto ni interceptar controles.

Las obras conservan sus colores originales. Las ilustraciones de interfaz pertenecen a una misma familia de trazo y sirven de apoyo; una ilustración genérica no sustituye la portada de un proyecto. Se evita mezclar fotografías de naturaleza, dibujos y discursos sociales si no pertenecen al mismo caso. No se añade un rediseño de marca ni una estética corporativa.

### Color

Estos valores proceden de la implementación actual; los nombres de token son propuestos:

| Token propuesto | Valor actual | Uso previsto |
| --- | --- | --- |
| `--color-paper` | `#FEEACA` | Fondo cálido de secciones y contacto |
| `--color-peach` | `#F3AC9E` | Inicio del fondo del hero |
| `--color-accent` | `#B22222` | Acción principal, foco y pequeños trazos |
| `--color-accent-hover` | `#A52A2A` | Estado hover de la acción principal |
| `--color-on-accent` | `#FFFDD0` | Texto sobre el botón rojo |
| `--color-surface` | `#FFFFFF` | Superficie neutra y descanso entre obras |

El hero termina actualmente en `#FFEACA`, muy próximo al papel `#FEEACA`; se propone unificar ese extremo con el papel. Los grises actuales de Tailwind se asignarán a `--color-ink` y `--color-muted` tras comprobar contraste. `#6A4C93`, presente en varios SVG, queda como color de ilustración; no introduce otro color de acción.

El texto claro del hero actual sobre el fondo pastel requiere revisión. La propuesta usa tinta oscura sobre el fondo cálido y reserva el texto crema para el botón rojo. Se comprobarán los pares reales, incluidos estados de foco y error; ningún color se considera accesible por su nombre.

### Tipografía, espacio e imágenes

- **Mansalva:** títulos principales, títulos de sección y anotaciones breves. El archivo disponible es regular; no depender de negrita sintética para establecer jerarquía.
- **Josefin Sans:** cuerpo, navegación, tarjetas, formularios y pies. Mantener los pesos locales 400, 600 y 700; no precargar variantes que una ruta no necesita.
- **Escala propuesta:** cuerpo 1.125 rem con interlineado 1.6; pies y etiquetas al menos 0.875 rem; texto largo limitado a 60–68 caracteres por línea. Conservar como punto de partida el h1 fluido actual `clamp(2.75rem, 7.5vw, 4.5rem)` y comprobarlo con títulos reales.
- **Márgenes:** conservar `--page-gutter: clamp(1.25rem, 4vw, 3rem)`. Consolidar anchos para lectura (68 caracteres), contenido (72 rem) y galería (80 rem). Separación entre secciones de 3 rem en móvil y hasta 6 rem en escritorio.
- **Imagen:** portada estable de proporción 4:3 por defecto, con punto focal opcional. La galería respeta la proporción de la obra y admite imágenes de ancho completo. No recortar detalles importantes para rellenar una rejilla.
- **Leyendas:** debajo de la obra cuando explican contenido o créditos; siempre disponibles. Hover puede realzar una imagen, pero no revelar información indispensable.

## 4. Arquitectura de las páginas

### Navegación y pie

Mantener tres destinos: About, Portfolio y Contact, con vocabulario coherente en el idioma elegido. La marca lleva a inicio y no introduce un encabezado h2. En páginas interiores, About sigue enlazando a la sección de inicio.

Se propone que la cabecera ocupe espacio en el flujo para que los títulos no dependan de compensaciones manuales de altura. En móvil, marca arriba y navegación debajo; no hace falta un menú desplegable para tres enlaces. La página actual se identifica con `aria-current`. Añadir enlace de salto a contenido y foco visible.

El pie muestra nombre, una frase corta, enlace a contacto, redes configuradas y créditos pertinentes. Si no hay una red configurada, su enlace desaparece. Los enlaces del autor de la plantilla no se presentan como redes de quien la instala.

### Inicio: mostrar el trabajo pronto

Reordenar a presentación → obra seleccionada → más proyectos → biografía breve → contacto. El título explica la práctica artística en una frase específica. Sustituir la promesa genérica por contenido configurable; no escribir afirmaciones nuevas en nombre de una persona real.

La altura del hero la decide su contenido. La cuadrícula puede extenderse detrás de la primera obra, uniendo presentación y trabajo. El primer CTA, “Ver proyectos” en una instalación en español, enlaza al índice o a la selección con un destino estable.

```text
Escritorio
+---------------------------------------------------------+
| Marca                         About  Portfolio  Contact |
| Práctica artística en una frase                         |
| Contexto breve + Ver proyectos                          |
| [ Obra seleccionada, protagonista ]  Título / disciplina |
| [ Proyecto ]             [ Proyecto ]                   |
| Retrato         Biografía breve / práctica / contacto   |
| Contacto y redes                                        |
+---------------------------------------------------------+

Móvil: el mismo orden de lectura
+---------------------------+
| Marca                     |
| About  Portfolio  Contact |
| Práctica artística        |
| Ver proyectos             |
| [ Primera obra visible ]  |
| Título / disciplina       |
| [ Siguiente proyecto ]    |
| Biografía / Contacto      |
+---------------------------+
```

La biografía prioriza especialidad, enfoque y disponibilidad verificable. Las estadísticas actuales son datos de demostración y no son obligatorias. Se omiten cuando no existe información propia que las respalde.

### Portfolio: elegir un caso

Mostrar una introducción de una o dos frases seguida del catálogo. Cada tarjeta contiene portada propia, título, disciplina y una frase de contexto. Una tarjeta tiene un único destino a la ficha, sin controles interactivos anidados.

Con tres proyectos, mostrar el catálogo completo sin búsqueda, filtros ni paginación. En móvil se apila; en tablet se permite imagen junto al texto; en escritorio se usan columnas solo si las obras y los títulos conservan espacio. El collage genérico deja de ser un segundo catálogo sin relación con los casos.

### Ficha: comprender una obra

```text
+---------------------------------------------------------+
| Navegación                                              |
| Volver al portfolio                                     |
| Título / disciplina / año / Ejemplo conceptual, si aplica|
| Resumen breve                                           |
| [ Portada de ESTE proyecto ]                            |
| Contexto                 Responsabilidad / medio        |
| Proceso                  [ Boceto + pie explicativo ]   |
| [ Obra final a ancho amplio ]                           |
| Resultado observable / aprendizaje                      |
| [ Detalle ]              [ Detalle ]                    |
| Créditos                                                |
| Siguiente proyecto                 Consultar un proyecto|
+---------------------------------------------------------+
```

En móvil, todos los bloques mantienen este orden en una columna. Contexto explica el problema o intención; proceso muestra decisiones, pruebas o bocetos; resultado describe lo producido. No se fuerza una estructura de caso comercial a una obra personal. Datos como cliente, año o colaboración se omiten si no se conocen.

La galería recibe los medios del proyecto explícitamente. Una ficha sin imágenes válidas debe fallar en la validación editorial previa a publicar; no mostrar otra colección por defecto. Los créditos y las leyendas permanecen ligados a la imagen al cambiar el orden. La primera iteración no requiere lightbox; si se añade, deberá tener cierre por Escape, gestión de foco y alternativa accesible.

### Contacto: una acción clara

Conservar nombre, email, asunto y mensaje. Etiquetas visibles, autocompletado apropiado, ancho de lectura cómodo y texto que aclare qué consulta se puede enviar. No prometer un plazo de respuesta sin que lo configure la persona responsable.

| Estado | Comportamiento propuesto |
| --- | --- |
| Sin configurar / demo | Explicar que el formulario es una demostración; no enviar al endpoint del autor |
| Reposo | Campos y botón “Enviar mensaje”; alternativa de correo si está configurada |
| Datos inválidos | Señalar campos concretos y llevar el foco al primero; conservar los demás datos |
| Enviando | Mostrar “Enviando…” y evitar otro envío mientras la solicitud está pendiente |
| Éxito confirmado | Anunciar la confirmación con `role="status"` y limpiar solo después de respuesta válida |
| Error de red o proveedor | Explicar que no se pudo confirmar el envío, conservar datos y ofrecer reintento |

Un error no se comunica únicamente con `alert()` ni mediante color. Sin JavaScript, un formulario configurado conserva su envío HTML al proveedor. Con JavaScript, los listeners y estados deben seguir funcionando al entrar y salir mediante `ClientRouter`.

## 5. Modelo de contenido propuesto

Centralizar los datos de identidad en `src/config/site.ts` y sustituir progresivamente el JSON por una colección de proyectos validada de Astro. Estos archivos y campos son una propuesta, no una API existente.

| Entidad | Campos y reglas |
| --- | --- |
| Sitio | `name`, `language`, `url`, `description`, `logo`, `socialImage`, `navigation`, `socialLinks`; URL pública absoluta y un idioma coherente con el contenido |
| Artista | `displayName`, `headline`, `intro`, `bio`, `portrait`, `disciplines`; estadísticas opcionales con contenido acreditable |
| Contacto | `mode: demo \| live`, `email?`, `formEndpoint?`, `intro`, `responseExpectation?`; modo live requiere un destino configurado |
| Proyecto | `slug`, `legacyId?`, `title`, `discipline`, `summary`, `kind: personal \| commissioned \| demo`, `year?`, `role?`, `client?`, `featured`, `order`, `cover`, `gallery`, cuerpo del caso |
| Medio | `src`, `width`, `height`, `alt`, `caption?`, `credit?`, `sourceUrl?`, `focalPoint?`; dimensiones positivas, recurso existente, alternativa significativa cuando informa |

El cuerpo del caso puede ser Markdown con contexto, proceso y resultado, permitiendo omitir secciones que no correspondan. `gallery` debe contener al menos una imagen válida; el caso de referencia tendrá al menos tres para demostrar el patrón. `cover` y `gallery` pertenecen al caso aunque una misma obra aparezca también en su tarjeta de inicio.

La colección valida campos, referencias y slugs únicos durante la compilación. Las rutas actuales se preservan o redirigen antes de cambiar URLs. Se mantiene un inventario de procedencia de todos los recursos de demostración y se conservan créditos cuando correspondan. No publicar como propio un recurso de ejemplo ajeno.

## 6. Responsive, movimiento y acceso

Los puntos actuales de 40, 48 y 64 rem son una base razonable; las composiciones cambian cuando el contenido lo necesita. No se oculta un desbordamiento global para aparentar que el layout encaja.

**Matriz de aceptación:** probar inicio, portfolio, contacto y todas las fichas en anchos 320, 390, 768, 1024, 1440 y 1920 px; incluir 844 × 390 horizontal y texto al 200 %. Revisar Chromium y WebKit, con teclado, puntero táctil y movimiento reducido.

- No hay scroll horizontal involuntario, texto cortado, imágenes deformadas ni solapamientos. Los títulos largos y las leyendas multilínea reordenan el layout.
- Los controles principales tienen un área de al menos 44 × 44 px. Foco, enlaces y errores se distinguen visualmente; los pies no precisan hover.
- Orden de encabezados coherente, un h1 por página, regiones con nombre, etiquetas asociadas y navegación completa por teclado. Las imágenes decorativas tienen alternativa vacía y los SVG decorativos no añaden ruido al lector.
- Contraste objetivo: 4.5:1 para texto normal y 3:1 para texto grande y límites visuales necesarios de controles. Verificar los colores computados y los fondos reales.
- Sin JavaScript, se puede leer el contenido, seguir enlaces y usar el envío HTML cuando está configurado. El texto animado no nace oculto en el HTML.

La entrada del hero, la firma y el trazo ligado al scroll forman el sistema de movimiento existente. Se propone moderar las apariciones secundarias y conservar los gestos que refuercen el carácter artístico sin dificultar lectura o navegación. Mantener GSAP como sistema existente, sin otra librería. La introducción completa debe terminar en aproximadamente 1,2 segundos; no usar bucles que reclamen atención continuamente. El foco de un botón nunca espera a que termine una animación.

Con `prefers-reduced-motion: reduce`, evitar división animada, desplazamientos y scroll animado; mostrar el estado final inmediatamente. Probar llegada directa, navegación interna, regreso desde otra ruta y cambios de tamaño. Limpiar timelines/listeners durante las transiciones y no iniciar animaciones tardías de una página que ya se abandonó al terminar de cargar las fuentes.

## 7. Carga, SEO y verificación

Los siguientes valores son objetivos propuestos, no resultados medidos de la web actual:

| Área | Criterio de aceptación |
| --- | --- |
| Imágenes | Tamaños adaptados con `srcset`/`sizes` o equivalente; dimensiones explícitas; imagen principal sin lazy loading; resto diferido cuando queda fuera de pantalla |
| Transferencia inicial | Hasta 1 MiB en la primera vista móvil, con hasta 450 KiB para la imagen principal y 100 KiB comprimidos de JavaScript propio y dependencias por ruta |
| Estabilidad | CLS de laboratorio ≤ 0.1; cargar fuentes o sustituir imágenes no desplaza controles de forma apreciable |
| Rendimiento de laboratorio | Mediana de tres ejecuciones Lighthouse móvil con mismo navegador, preset y servidor: rendimiento ≥ 90; registrar versión, fecha, ruta y parámetros |
| SEO | Título y descripción propios, canonical absoluto, Open Graph y tarjeta social; idioma configurado, dominio `site`, sitemap y robots coherentes |
| Regresión | Compilación, rutas y recursos locales válidos; navegación y estados del formulario comprobados; revisión manual de foco, movimiento y reflow |

Lighthouse no acredita por sí solo accesibilidad ni rendimiento real de visitantes. Si se recopilan datos reales en el futuro, se documentarán por separado. No se afirma una puntuación actual sin un informe reproducible.

Reducir cargas de GSAP a las páginas que usan animación y revisar las fuentes precargadas. Los recursos de la galería no deben descargarse todos a máxima resolución al entrar. Las imágenes sociales también usan material pertinente al caso. Analytics será una decisión explícita de configuración; la demo no impone la cuenta del autor a quien clone la plantilla.

## 8. Experiencia de personalización y entrega

La guía de instalación seguirá el recorrido real: instalar → configurar identidad y dominio → sustituir obras → revisar procedencia → configurar contacto → comprobar → desplegar. Documentar exactamente qué propiedades acepta cada componente y qué datos se cambian en configuración; evitar ejemplos de archivos inexistentes.

Antes de declarar la plantilla lista, usar una copia limpia y completar ese recorrido, incluyendo añadir un proyecto y omitir redes/estadísticas opcionales. Revisar la demo publicada con el mismo contenido y navegadores de la matriz, y enlazar desde la release las decisiones, las comprobaciones y cualquier límite conocido.

Este diseño preserva la personalidad actual. La mejora que ordena las demás es editorial: una obra reconocible, un caso que la explique y una ruta clara para continuar o contactar.
