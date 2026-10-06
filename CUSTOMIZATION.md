# Personalizar Musea Art

Edita **`src/data/site.ts`** para la identidad y **`src/data/projects.ts`** para los proyectos. Ambos archivos usan los tipos de `src/data/types.ts` y se validan antes de renderizar: una configuración inválida detiene la compilación.

## Ruta rápida

1. Cambia nombre, idioma, textos, biografía, navegación y redes en `site.ts`.
2. Sustituye las imágenes y los proyectos de demostración con contenido propio y permisos comprobados.
3. Conserva `contact.mode: 'demo'` hasta tener un destino de contacto propio.
4. Ejecuta `pnpm test` y `pnpm build`; revisa después móvil, escritorio y navegación sin JavaScript.

## 1. Identidad y metadatos

| Contenido | Campo de `site.ts` |
| --- | --- |
| Nombre, idioma y descripción general | `name`, `lang`, `description` |
| URL pública de referencia | `publicUrl` |
| Logo y firma | `logo`, `signature` |
| Título y botón inicial | `hero` |
| Navegación y redes | `navigation`, `socials` |
| Biografía, imagen, áreas de práctica y estadísticas opcionales | `about` |
| Título y descripción de cada página | `pages.home`, `pages.portfolio`, `pages.contact` |
| Textos del pie | `footer` |
| Modo, destino y textos de contacto | `contact` |

La cabecera, el inicio, la biografía, el pie y el layout consumen esta configuración. `Layout.astro` mantiene sus props `title`, `description` y `class` para páginas adicionales. `lang` debe ser una etiqueta como `en` o `es`; cambiarla no traduce automáticamente los textos.

La firma animada original corresponde a «Musea». Con otra identidad se utiliza texto manuscrito adaptable: cambia `signature.label` si quieres un nombre corto y usa `useDemoArtwork: false`. Si solo cambias `name`, la etiqueta original también se sustituye por el nuevo nombre. La firma sigue visible sin JavaScript.

Actualiza además los archivos de iconos de `public/` y el nombre y los iconos de `public/site.webmanifest`; estos recursos estáticos no se generan desde la configuración.

## 2. Inicio y biografía

Los textos iniciales viven en `site.hero`. Conserva `data-hero`, `.js-hero-title`, `.js-scroll-hint`, `data-magnetic` y `start` al modificar los componentes: las animaciones de `src/scripts/artistic-motion.ts` usan esos selectores. El botón inicial apunta a `#projects`.

`site.about` contiene una biografía explícitamente demostrativa. Reemplázala por una historia verificable, no por supuestos clientes o resultados. `stats` es opcional y está vacío por defecto; añade únicamente cifras comprobables. Cada estadística tiene `value`, `suffix` y `label`.

La imagen de biografía y el logo requieren ruta local, texto alternativo y dimensiones reales. El orden de secciones sigue definido en `src/pages/index.astro`. La cabecera ya forma parte de `Layout`; el pie se incluye desde cada página.

## 3. Proyectos e ilustraciones

Cada registro de `src/data/projects.ts` usa `Project`:

```ts
{
  id: 4,
  title: 'Cuaderno de campo',
  category: 'Ilustración personal',
  image: 'Grown',
  description: 'Estudios botánicos a partir de observaciones propias.',
  featured: true,
  gallery: [/* Imágenes locales con dimensiones y créditos */],
  editorial: {
    context: 'El punto de partida del proyecto.',
    process: 'Lo que realmente hiciste y las decisiones tomadas.',
    outcome: 'El resultado comprobable, sin métricas inventadas.',
  },
}
```

Un `id` entero positivo y único genera `/projects/ID`. Las rutas existentes `/projects/1`, `/projects/2` y `/projects/3` se mantienen. `image` identifica un componente SVG: `Reportage`, `Connected` o `Grown`, no una URL. Para añadir otra ilustración, amplía el tipo y el validador, crea el componente y actualiza ambos mapas en `PortfolioComponent.astro` y `[id].astro`.

`PortfolioComponent.astro` acepta `items: Project[]`; pasar esa prop solo cambia el listado, no genera rutas adicionales. `featured` permite identificar la selección del inicio sin duplicar registros.

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
  authorName: 'Nombre del creador',
  authorLink: 'https://tu-sitio.com',
  sourceName: 'Portfolio del creador',
  sourceLink: 'https://tu-sitio.com/estudio',
}
```

La validación comprueba archivos dentro de `public/`, dimensiones intrínsecas de PNG/JPEG/WebP o `viewBox` SVG, textos alternativos descriptivos, captions y créditos. Rechaza archivos ausentes, rutas que salen de `public/`, tamaños incorrectos y enlaces que no usan HTTPS. Un validador no puede comprobar por sí mismo que el texto alternativo sea adecuado ni que tengas derechos de publicación.

Los ejemplos son colecciones curadas de obras de distintos creadores, no encargos de Musea Art. Las atribuciones heredadas apuntan a perfiles y enlaces genéricos de Pixabay; **no demuestran la licencia de cada archivo**. Verifica los permisos antes de reutilizarlos. No atribuyas a la plantilla el proceso de creación de esas imágenes.

La fuente de proyectos ya contiene galerías diferenciadas y texto editorial; la representación de galerías todavía conserva `Collage.astro` durante esta primera unidad de cambios. La siguiente unidad conecta las fichas a sus imágenes propias, sin sustituir galerías ausentes por una colección de ejemplo.

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

`ContactForm.astro` mantiene props opcionales `title` y `subtitle` para una página concreta. Los atributos `name` deben conservarse para Formspree. La gestión completa de envíos pendientes, errores accesibles y reintentos pertenece a la unidad de contacto posterior; no está implementada en esta primera unidad.

## 6. Pie y redes

Edita `site.footer` y `site.socials` para todas las páginas. La demo enlaza solamente al repositorio de la plantilla, no presenta perfiles personales como redes de un artista ficticio. Puedes ocultar enlaces con `socials: []`.

Cada enlace necesita `name`, `url` e `icon`. `icon` es el atributo `d` de un `<path>` con `viewBox="0 0 24 24"`; `name` se utiliza como etiqueta accesible. `Footer.astro` conserva `siteName` y `socialLinks` para sustituciones locales.

## 7. Fuentes, colores y responsive

Las fuentes son locales. `src/global.css` declara Mansalva para los títulos `h1`/`h2` y Josefin Sans para el texto general mediante `@font-face` y `@theme`. Los archivos están en `public/fonts/` y sus precargas en `src/layouts/Layout.astro`. Si cambias una fuente, actualiza las declaraciones, pesos, familias y precargas correspondientes.

Tailwind CSS 4 se integra mediante `@tailwindcss/vite` en `astro.config.mjs`; no hay un `tailwind.config.mjs`. Los colores todavía están repartidos entre utilidades y estilos de componentes: rojo `#B22222`, crema `#FEEACA` y el degradado del Hero son buenos puntos de partida para localizar la paleta actual.

Los márgenes laterales y la reserva para la cabecera se comparten mediante `--page-gutter` y `--header-space` en `src/global.css`. Las cuadrículas y los tamaños cambian con las clases `sm:`, `md:` y `lg:`. Verifica títulos largos, enlaces, recortes y formulario en móvil estrecho y escritorio después de personalizar. Mantén el foco visible y las reglas de `prefers-reduced-motion`.

## 8. Preparar la publicación

La URL de referencia está en `site.publicUrl`, como origen HTTPS sin ruta, consulta ni fragmento. En esta primera unidad todavía no se conecta a `astro.config.mjs`: el sitemap continúa pendiente, al igual que canonical y Open Graph. La unidad de publicación utilizará esta misma fuente, sin duplicar la URL.

Vercel Analytics ya se monta desde `src/layouts/Layout.astro`; configura el servicio en tu proyecto si quieres usarlo, o elimina su importación y `<Analytics />` si no lo necesitas.

Ejecuta `pnpm build` y sigue los pasos de [publicación del README](README.md#publicación-en-vercel). Revisa el resultado desplegado, las rutas de cada proyecto, los recursos locales y tu formulario. El [roadmap](ROADMAP.md) diferencia estas posibilidades actuales de las mejoras pendientes.
