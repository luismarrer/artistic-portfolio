# Personalizar Musea Art

Edita **`src/data/site.ts`** para la identidad y **`src/data/projects.ts`** para los proyectos. Ambos archivos usan los tipos de `src/data/types.ts` y se validan antes de renderizar: una configuración inválida detiene la compilación.

## Ruta rápida

1. Cambia nombre, idioma, textos, biografía, navegación, redes y `publicUrl` en `site.ts`.
2. Sustituye las imágenes y los proyectos de demostración con contenido propio y permisos comprobados.
3. Conserva `contact.mode: 'demo'` hasta tener un destino de contacto propio.
4. Ejecuta `pnpm test` y `pnpm build`; revisa después móvil, escritorio y navegación sin JavaScript.

## 1. Identidad y metadatos

| Contenido | Campo de `site.ts` |
| --- | --- |
| Nombre, idioma y descripción general | `name`, `lang`, `description` |
| Origen HTTPS de publicación | `publicUrl` |
| Imagen social predeterminada | `socialImage` |
| Logo y firma | `logo`, `signature` |
| Título y botón inicial | `hero` |
| Selección de inicio, catálogo y textos de sus enlaces | `portfolio` |
| Navegación y redes | `navigation`, `socials` |
| Biografía, imagen, áreas de práctica y estadísticas opcionales | `about` |
| Título y descripción de cada página | `pages.home`, `pages.portfolio`, `pages.contact` |
| Textos del pie | `footer` |
| Modo, destino y textos de contacto | `contact` |

La cabecera, el inicio, la biografía, el pie y el layout consumen esta configuración. `Layout.astro` mantiene sus props `title`, `description` y `class`, y acepta `image: LocalImage` para sustituir la imagen social en una página. `lang` debe ser una etiqueta como `en` o `es`; cambiarla no traduce automáticamente los textos.

La firma animada original corresponde a «Musea». Con otra identidad se utiliza texto manuscrito adaptable: cambia `signature.label` si quieres un nombre corto y usa `useDemoArtwork: false`. Si solo cambias `name`, la etiqueta original también se sustituye por el nuevo nombre. La firma sigue visible sin JavaScript.

Actualiza además los archivos de iconos de `public/` y el nombre y los iconos de `public/site.webmanifest`; estos recursos estáticos no se generan desde la configuración.

## 2. Inicio y biografía

Los textos iniciales viven en `site.hero`. La introducción tiene altura determinada por su contenido, texto oscuro sobre la cuadrícula cálida y una firma compacta; no reserva una pantalla completa antes de mostrar obra. Conserva `data-hero`, `.js-hero-title`, `.js-scroll-hint`, `data-magnetic` y `start` al modificar los componentes: las animaciones de `src/scripts/artistic-motion.ts` usan esos selectores. El botón inicial apunta a `#projects`; si configuras una ruta en lugar de un ancla, mantiene la navegación HTML normal.

El inicio muestra una sola colección antes de la biografía: la primera con `featured: true`, o la primera del archivo si ninguna está destacada. `/portfolio` muestra el catálogo completo. Los títulos, descripciones y etiquetas de estos dos recorridos se editan en `site.portfolio`; cambia el orden de los registros para elegir la primera selección.

Las tarjetas muestran la primera imagen de su propia galería como una impresión montada, con portada estable 4:3 (recorte centrado o el que fije `focalPoint`; la ficha conserva las proporciones originales) y créditos siempre visibles fuera del enlace a la ficha. La portada seleccionada, los enlaces y el botón inicial no esperan una aparición de GSAP para ser utilizables. Mantén cada sección y el pie como hijos directos de `main`, y `data-trail-content` en la rejilla: el trazo mide la siguiente sección real para recorrer sus márgenes. La cuadrícula, la firma y las entradas decorativas restantes conservan el sistema de movimiento existente; comprueba navegación interna, teclado y movimiento reducido después de cambiar el layout.

`site.about` contiene una biografía explícitamente demostrativa. Reemplázala por una historia verificable, no por supuestos clientes o resultados. `stats` es opcional y está vacío por defecto; añade únicamente cifras comprobables. Cada estadística tiene `value`, `suffix` y `label`.

La imagen de biografía y el logo requieren ruta local, texto alternativo y dimensiones reales. El orden de secciones sigue definido en `src/pages/index.astro`. La cabecera ya forma parte de `Layout`; el pie se incluye desde cada página.

La cabecera marca con `aria-current="page"` el destino de `navigation` que coincide con la página que se está viendo; un ancla como `/#about` nunca cuenta como página actual (la regla está en `src/data/navigation.ts`). La marca es un `<span>` con la tipografía de los títulos, no un encabezado, para que el esquema de cada página empiece en su `h1`. `Layout.astro` abre el `body` con un enlace de salto («Skip to content») hacia `<main id="main" tabindex="-1">`: conserva ese `id` y ese `tabindex`, y traduce la etiqueta si cambias el idioma.

## 3. Proyectos e ilustraciones

Cada registro de `src/data/projects.ts` usa `Project`:

```ts
{
  id: 4,
  title: 'Cuaderno de campo',
  category: 'Ilustración personal',
  description: 'Estudios botánicos a partir de observaciones propias.',
  featured: true,
  disclosure: 'Trabajo personal del propietario del portfolio, no una colección de ejemplo.',
  gallery: [/* Imágenes locales con dimensiones y créditos */],
  editorial: {
    context: 'El punto de partida del proyecto.',
    process: 'Lo que realmente hiciste y las decisiones tomadas.',
    outcome: 'El resultado comprobable, sin métricas inventadas.',
  },
}
```

Un `id` entero positivo y único genera `/projects/ID`. Las rutas existentes `/projects/1`, `/projects/2` y `/projects/3` se mantienen. Las tarjetas y las fichas utilizan como portada la primera imagen de la galería: no existe una clave de ilustración SVG obligatoria ni un mapa de componentes que actualizar al añadir un proyecto.

Como esa portada también es la imagen social de la ficha, `gallery[0]` debe ser PNG, JPEG o WebP con dimensiones correctas. SVG sigue permitido para otras imágenes locales de la galería, el logo y la biografía, pero no para las imágenes sociales.

`PortfolioComponent.astro` acepta `items: Project[]` y `variant: 'selection' | 'catalogue'`; pasar `items` solo cambia el listado, no genera rutas adicionales. `selection` muestra la introducción de obra seleccionada y el enlace al catálogo; `catalogue` usa todas las columnas disponibles sin repetir esa introducción. `featured` permite elegir la selección del inicio sin duplicar registros. `disclosure` es obligatorio: explica la autoría o la condición de demo sin afirmaciones falsas. Cambia también este texto cuando sustituyas los ejemplos por obra propia.

## 4. Imágenes y atribución

La galería de cada proyecto es obligatoria y no puede estar vacía. Cada imagen declara:

```ts
{
  src: '/images/estudio.webp',
  alt: 'Estudio botánico a tinta de una rama con tres hojas',
  width: 1200,
  height: 800,
  caption: 'Estudio inicial a partir de observación directa.',
  size: 'large', // small, medium o large
  focalPoint: '50% 20%', // opcional: "x% y%" (0-100) que se conserva al recortar la portada a 4:3
  authorName: 'Nombre del creador',
  authorLink: 'https://tu-sitio.com',
  sourceName: 'Portfolio del creador',
  sourceLink: 'https://tu-sitio.com/estudio',
}
```

La validación comprueba archivos dentro de `public/`, dimensiones intrínsecas de PNG/JPEG/WebP o `viewBox` SVG, textos alternativos descriptivos, captions y créditos. Rechaza archivos ausentes, rutas que salen de `public/`, tamaños incorrectos, un `focalPoint` que no sean dos porcentajes entre 0 y 100 y enlaces que no usan HTTPS. Un validador no puede comprobar por sí mismo que el texto alternativo sea adecuado ni que tengas derechos de publicación.

`focalPoint` es opcional y solo afecta a las portadas recortadas: las tarjetas del catálogo y la portada seleccionada del inicio, que se muestran en 4:3 y lo usan como `object-position` (por defecto, el centro). Escribe dos porcentajes, `'x% y%'`, cada uno entre 0 y 100; no se aceptan palabras clave, otras unidades ni valores adicionales, y un formato incorrecto detiene la compilación. Las galerías de las fichas nunca se recortan, así que lo ignoran. Por ejemplo, en una ilustración vertical cuyo personaje empieza casi en el borde superior, `'50% 0%'` evita que el recorte 4:3 le corte la cabeza, como ocurre con la tercera colección de la demo.

Los ejemplos son colecciones curadas de obras de distintos creadores, no encargos de Musea Art. Las atribuciones heredadas apuntan a perfiles y enlaces genéricos de Pixabay; **no demuestran la licencia de cada archivo**. Verifica los permisos antes de reutilizarlos. No atribuyas a la plantilla el proceso de creación de esas imágenes.

Cada ficha muestra únicamente `project.gallery`, con su primera imagen como portada y todas las proporciones originales, captions y enlaces de creador/fuente visibles sin hover. Las notas presentan contexto, proceso de selección y resultado de presentación; en la demo no describen la creación de las obras ajenas. Al final hay enlaces al inicio, catálogo, siguiente colección y contacto.

`Collage.astro` requiere `images: GalleryImage[]` y acepta `label` para el nombre accesible de la galería y `coverTransitionName` para la transición de la portada (véase abajo). No tiene imágenes por defecto ni prop `columns`: una galería ausente o vacía falla, no se sustituye silenciosamente. La portada ocupa el ancho completo; las imágenes restantes usan dos columnas en escritorio y una en móvil. `size: 'large'` permite extender otra imagen a ambas columnas; `small` y `medium` conservan una columna. El catálogo ya no añade el antiguo collage genérico.

```astro
<Collage
  images={project.gallery}
  label={`${project.title} — galería acreditada`}
  coverTransitionName={`project-cover-${project.id}`}
/>
```

La portada usa carga inmediata; las imágenes restantes se cargan de forma diferida. No hay `srcset` ni optimización automática de los archivos: comprime las imágenes antes de publicarlas.

Al abrir una colección, su portada se transforma de la tarjeta (inicio y catálogo) a la ficha. Lo hace el `ClientRouter` de Astro: la impresión montada de la tarjeta y la de la portada comparten el mismo `transition:name`, `project-cover-<id>`, que sale del `id` del proyecto, así que una colección nueva lo hereda sin registrar nada. Las dos mitades están en `PortfolioComponent.astro` y en `pages/projects/[id].astro`, que pasa el nombre a `Collage`; sin `coverTransitionName` la portada no se anima entre páginas. Cada nombre debe aparecer una sola vez por página: si repites una colección dentro de la misma página, el navegador omite la transición. La portada de la ficha no lleva `data-reveal`, porque llega desde su tarjeta; el resto de las imágenes sí. Los tiempos, la curva y el recorte compartido de la transición están en `global.css` (`::view-transition-*(*.project-cover)`). Con `prefers-reduced-motion` la página cambia sin animación.

## 5. Contacto seguro

La configuración inicial es `contact.mode: 'demo'`, **sin endpoint**. El formulario muestra el aviso de demo, deshabilita los campos y no envía mensajes con ni sin JavaScript. No se conserva el destino del autor de la plantilla.

Para un formulario propio de Formspree, configura explícitamente:

```ts
contact: {
  mode: 'live',
  endpoint: 'https://formspree.io/f/TUIDREAL',
  title: 'Hablemos de tu proyecto',
  subtitle: 'Cuéntame qué necesitas.',
  demoMessage: 'Modo de demostración: no se envían mensajes.',
}
```

El validador exige un endpoint HTTPS de `formspree.io/f/ID` sin consultas, credenciales ni fragmentos. No comprueba propiedad ni entrega: verifica ambos con tu propia cuenta antes de publicar. Para volver a demo, elimina `endpoint` y cambia `mode`; mezclar demo y endpoint detiene la compilación.

`ContactForm.astro` mantiene props opcionales `title` y `subtitle` para una página concreta. Conserva los atributos `name` para Formspree. En modo live, el formulario usa el `action` configurado y `method="POST"`: sin JavaScript, mantiene la validación y el envío nativos del navegador.

Con JavaScript, `src/scripts/contact-form.ts` añade estos estados sin sustituir las restricciones nativas de los campos:

- **Pendiente:** bloquea envíos duplicados, deshabilita el botón y marca el formulario con `aria-busy`.
- **Éxito:** comunica la confirmación en un estado accesible junto al formulario y solo entonces limpia los campos.
- **Error del proveedor o de red:** conserva los datos, vuelve a habilitar el envío y permite reintentar. Los mensajes de estado se anuncian con `aria-live="polite"`.

La inicialización en `astro:page-load` no duplica listeners. `astro:before-swap` cancela la petición pendiente y el controlador ignora respuestas tardías de la página anterior. Mantén este ciclo de vida al modificar el formulario; un estado de éxito local no sustituye la comprobación de entrega en tu propia cuenta de Formspree.

## 6. Pie y redes

Edita `site.footer` y `site.socials` para todas las páginas. La demo enlaza solamente al repositorio de la plantilla, no presenta perfiles personales como redes de un artista ficticio. Puedes ocultar enlaces con `socials: []`.

Cada enlace necesita `name`, `url` e `icon`. `icon` es el atributo `d` de un `<path>` con `viewBox="0 0 24 24"`; `name` se utiliza como etiqueta accesible. `Footer.astro` conserva `siteName` y `socialLinks` para sustituciones locales.

## 7. Fuentes, colores y responsive

Las fuentes son locales. `src/global.css` declara Mansalva para los títulos `h1`/`h2` y Josefin Sans para el texto general mediante `@font-face` y `@theme`. Los archivos están en `public/fonts/` y sus precargas en `src/layouts/Layout.astro`. Si cambias una fuente, actualiza las declaraciones, pesos, familias y precargas correspondientes.

Tailwind CSS 4 se integra mediante `@tailwindcss/vite` en `astro.config.mjs`; no hay un `tailwind.config.mjs`. Todas las rutas comparten los tokens de `src/global.css` y se apoyan en el mismo papel (`--color-paper` en `body`): las secciones y el pie no pintan fondo propio, y solo el hero conserva su degradado melocotón. Colores: `--color-paper`, `--color-peach`, `--color-ink`, `--color-muted`, `--color-accent`, `--color-accent-hover`, `--color-on-accent`, `--color-surface` (montura de las impresiones y campos) y `--color-rule` (borde de campos, con al menos 3:1 de contraste). La cuadrícula del hero usa `--color-grid-line` y `--grid-size`; `--color-grid-line` es el acento al 20 % escrito como literal, así que actualízalo si cambias `--color-accent`. Las obras se montan con `--print-mount`, `--radius-print` y `--shadow-print`; el texto sigue `--text-body`, `--leading-body`, `--text-small`, `--text-label` y `--measure`. Esos tokens alimentan las clases `.print`, `.copy`, `.copy-small`, `.caption`, `.label`, `.field` y `.annotate`, definidas en la capa de componentes de `global.css` para que una utilidad de Tailwind pueda sobrescribirlas. Cambiar los tokens no recolorea automáticamente las ilustraciones SVG.

Los enlaces de texto autónomos (la etiqueta `caseLinkLabel` de cada tarjeta, el enlace al catálogo, la navegación de las fichas y el menú principal) usan `.annotate` en un `<span>` con la etiqueta, dentro del enlace: así el enlace conserva su foco y su área táctil y nunca se anidan enlaces. En reposo es un subrayado recto y fino, para que el enlace se reconozca sin pasar el cursor; al pasar el cursor o con el foco de teclado se dibuja de izquierda a derecha un trazo hecho a mano con el color del texto, mientras el subrayado se desvanece. `.annotate-quiet`, que usa el menú principal, omite el subrayado en reposo, y `aria-current="page"` en el enlace mantiene el trazo dibujado para marcar la página actual. Los créditos pequeños (autor y fuente) siguen siendo subrayados normales, y las flechas solo quedan en «Back to all collections» y «Next collection», donde indican dirección y se ocultan a los lectores de pantalla. La forma del trazo es `--annotate-stroke`, una máscara SVG cuyo color nunca va dentro del SVG, y la deceleración de la transición de portadas y del trazo es `--ease-out-calm`. Con `prefers-reduced-motion` el trazo aparece y desaparece al instante.

Los márgenes laterales y la reserva para la cabecera se comparten mediante `--page-gutter` y `--header-space` en `src/global.css`. Las cuadrículas y los tamaños cambian con las clases `sm:`, `md:` y `lg:`. Verifica títulos largos, enlaces, recortes y formulario en móvil estrecho y escritorio después de personalizar. Mantén el foco visible y las reglas de `prefers-reduced-motion`.

## 8. Preparar la publicación

Edita el campo existente `site.publicUrl` con tu origen HTTPS, sin ruta, consulta ni fragmento. Esta única fuente configura `site` en Astro y las URLs absolutas de canonical, Open Graph, sitemap y robots. No dupliques el dominio en componentes o `astro.config.mjs` ni crees una variable de entorno. `pnpm build` genera `sitemap-index.xml`, su sitemap de páginas y `robots.txt` para ese dominio.

La política canonical elimina la barra final en las rutas, salvo en `/`; por ejemplo, usa `/portfolio` y `/projects/1`, no sus variantes con barra. El sitemap sigue la misma política y la navegación conserva las seis rutas existentes.

`site.socialImage` es una imagen local obligatoria con `src`, `alt`, `width` y `height`. Usa un PNG, JPEG o WebP existente en `public/`, con dimensiones intrínsecas correctas; no uses el logo SVG como imagen social. La demo reutiliza una portada horizontal acreditada de 1280 × 853, no una obra original de la plantilla. Al reemplazarla, verifica sus derechos y mantén los créditos correspondientes.

El layout utiliza esta imagen por defecto en Open Graph y Twitter, con URL absoluta, texto alternativo y dimensiones. Cada ficha de proyecto pasa `image={gallery[0]}` para compartir su propia portada. Para otra página, puedes pasar una imagen validada con la misma estructura mediante la prop `image`; no cambia la galería ni crea una copia del archivo.

Los títulos y descripciones provienen de `site.pages` o de los datos de cada proyecto. Después de personalizar, revisa el HTML generado y que las URLs públicas de las imágenes resuelvan en tu despliegue: la existencia local no demuestra que el dominio esté publicado.

Vercel Analytics ya se monta desde `src/layouts/Layout.astro`; configura el servicio en tu proyecto si quieres usarlo, o elimina su importación y `<Analytics />` si no lo necesitas.

Con Node 24 o superior y pnpm 11.5.2, ejecuta `pnpm test` y `pnpm build`, y sigue los pasos de [publicación del README](README.md#publicación-en-vercel). Las pruebas compilan la fuente actual y revisan el contrato local de publicación; no despliegan ni comprueban una entrega real de Formspree. Revisa el resultado desplegado, las rutas de cada proyecto, los recursos locales y tu formulario. El [roadmap](ROADMAP.md) diferencia estas posibilidades actuales de las mejoras pendientes.
