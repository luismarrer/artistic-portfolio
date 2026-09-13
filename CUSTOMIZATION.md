# Personalizar Musea Art

Esta guía describe las interfaces que existen hoy. La identidad y parte del contenido se editan directamente en los componentes; todavía no hay un archivo único de configuración. Consulta [ROADMAP.md](ROADMAP.md) y [docs/DESIGN.md](docs/DESIGN.md) para las mejoras previstas.

## 1. Identidad y metadatos

| Qué cambiar | Dónde |
| --- | --- |
| Nombre, logo, enlaces y etiquetas de navegación | `src/components/sections/Header.astro` |
| Título y descripción del inicio | `src/pages/index.astro`, en `<Layout>` |
| Metadatos de portfolio y contacto | `src/pages/portfolio.astro` y `src/pages/contact.astro` |
| Valores por defecto de metadatos, idioma y título móvil | `src/layouts/Layout.astro` |
| Nombre, descripción y redes del pie | `src/components/sections/Footer.astro` |
| Texto, título y etiqueta accesible de la firma | `src/components/svgs/Signature.astro` |
| Iconos y nombre de la aplicación | `public/` y `public/site.webmanifest` |

`Layout.astro` acepta `title`, `description` y `class`. Los metadatos de cada proyecto se obtienen de su título y descripción en el JSON de proyectos.

```astro
<Layout title="Ana · Ilustración" description="Ilustración editorial y proyectos personales de Ana.">
  <!-- Contenido de la página -->
</Layout>
```

Si traduces el contenido al español, cambia también `<html lang="en">` a `lang="es"` y las etiquetas accesibles. El logo de cabecera está en `public/logo.png`; los iconos utilizados por el layout incluyen `favicon.svg`, `favicon-96x96.png` y `apple-touch-icon.png`. Actualiza además los dos iconos y nombres referenciados en `site.webmanifest`.

## 2. Inicio y biografía

`Hero.astro` **no acepta props de contenido**. Edita el título, texto del botón y destino del enlace en `src/components/sections/Hero.astro`. El botón apunta a `#projects`, el identificador del listado de proyectos. El título se define en `heroTitle` y se renderiza por palabras. Conserva `data-hero`, `.js-hero-title`, `.js-scroll-hint`, `data-magnetic` y el identificador `start` si quieres mantener las animaciones que los utilizan.

Las animaciones están centralizadas en `src/scripts/artistic-motion.ts`, que se inicia desde `Layout.astro`. Gestiona la entrada del título, la firma, el trazo de tinta ligado al scroll, las apariciones de secciones, el dibujo de portfolio y el botón. `Signature.astro` dibuja la firma del hero y del pie; `InkTrail.astro` contiene el SVG del trazo como hijo directo del body. Conserva esa ubicación para que su altura abarque la página. Comprueba las animaciones después de cambiar textos, fuentes o espaciados, incluido el regreso al inicio mediante navegación interna y movimiento reducido.

En `src/components/sections/About.astro`, edita el objeto `aboutData`: título de sección, retrato, biografía, habilidades y estadísticas. Sustituye `public/images/profile.png` o cambia su ruta y texto alternativo. Los valores de proyectos, clientes y años son ejemplos: reemplázalos por datos comprobables o elimina ese bloque.

El orden de las secciones se define en `src/pages/index.astro`. Para añadir una, importa tu componente y colócalo dentro de `Layout`; este ya incorpora la cabecera. El pie se incluye explícitamente en las páginas.

## 3. Proyectos y sus ilustraciones

Edita `src/data/projects.json`. Cada registro tiene esta forma:

```json
{
  "title": "Cuaderno de campo",
  "category": "Ilustración",
  "image": "Grown",
  "description": "Una serie de ilustraciones botánicas a partir de observaciones de campo.",
  "id": 4
}
```

Usa un `id` numérico único. La ruta `src/pages/projects/[id].astro` genera una página por registro al compilar; este ejemplo produciría `/projects/4`.

**`image` es una clave de componente SVG**, no una URL de imagen. Los valores disponibles son `Reportage`, `Connected` y `Grown`. Para añadir una ilustración nueva:

1. Crea un componente SVG en `src/components/svgs/` con un `viewBox` adecuado.
2. Impórtalo y añádelo al `componentMap` tanto de `src/components/sections/PortfolioComponent.astro` como de `src/pages/projects/[id].astro`.
3. Usa la misma clave en el campo `image` del JSON.

`PortfolioComponent.astro` acepta una prop `items` con la misma estructura y utiliza el JSON por defecto. Pasar `items` solo cambia ese listado; para generar también las rutas, añade los registros al JSON.

## 4. Fotografías y galerías

La galería está en `src/components/Collage.astro`. Actualmente `/portfolio` y todas las fichas de proyecto invocan `<Collage />` sin imágenes propias, por lo que muestran el mismo conjunto de ejemplo. Cambiar las fotografías por defecto afecta a todas esas páginas.

Puedes colocar archivos en `public/images/` y pasar una galería explícita:

```astro
<Collage images={[
  {
    src: "/images/cuaderno-portada.webp",
    alt: "Doble página con estudios de hojas dibujadas a tinta",
    caption: "Estudios iniciales",
    size: "large",
  },
  {
    src: "/images/cuaderno-detalle.webp",
    alt: "Detalle de las nervaduras de una hoja ilustrada",
    size: "small",
  },
]} />
```

`src` y `alt` son obligatorios. `size` admite `small`, `medium` o `large`; modifica el espacio ocupado a partir del diseño de tablet. También admite `caption`, `authorName`, `authorLink` y `sourceLink`. Los enlaces de autor y fuente solo se muestran si existe `authorName`. La etiqueta del enlace de fuente está escrita como «Pixabay» en el componente: ajústala si atribuyes otra procedencia.

Para una galería por proyecto, debes definir las imágenes de cada proyecto y pasarlas desde `[id].astro`; ese enlace entre contenido y galería aún no está implementado. La prop `columns` está declarada pero **no se utiliza**: las columnas actuales se controlan con las clases de la cuadrícula de `Collage.astro`.

Las fotografías se renderizan con `<img loading="lazy">`. No hay generación automática de `srcset` ni optimización de esas imágenes: comprímelas y dimensiona los archivos antes de añadirlos. Revisa el recorte producido por `object-cover`, los textos alternativos y los permisos de uso de cada recurso.

## 5. Formulario de contacto

El formulario real está en `src/components/ContactForm.astro`. Crea un formulario en tu cuenta de Formspree y sustituye el valor de `action` por tu propio endpoint:

```html
<form
  id="contact-form"
  action="https://formspree.io/f/TU_ID"
  method="POST"
>
```

El destino incluido corresponde a la demo: **cámbialo antes de recibir mensajes en tu web**. Conserva los atributos `name` de los campos. El script envía `FormData` a `form.action`; no necesitas crear una ruta `/api/contact` para la integración actual. No hay una variable de entorno que sustituya automáticamente ese endpoint.

Desde `src/pages/contact.astro` puedes personalizar los dos textos que sí acepta el componente:

```astro
<ContactForm
  title="Hablemos de tu proyecto"
  subtitle="Cuéntame qué necesitas y cuándo te gustaría empezar."
/>
```

Traduce también las etiquetas, marcadores de posición, botón y mensajes dentro del componente. Comprueba validación, envío correcto, error de red y recepción con tu propio formulario. Un mensaje visual de éxito no demuestra por sí solo que el correo llegó al destinatario.

## 6. Pie y redes sociales

`Footer.astro` acepta `siteName` y `socialLinks`. Para actualizar todas las páginas, edita sus valores por defecto: `siteName`, `defaultSocialLinks` y `paragraph`. La firma tiene su propio texto «Musea», título y etiqueta accesible en `src/components/svgs/Signature.astro`: cámbialos también, ya que no hereda `siteName`. Si el nombre nuevo no cabe, ajusta el `viewBox`, la máscara y la rúbrica de la firma, y revisa sus dos tamaños. Para una página concreta, pasa props en su `<Footer>`.

Cada red necesita `name`, `url` e `icon`; este último es el atributo `d` de un `<path>` SVG con `viewBox="0 0 24 24"`, no una URL de imagen. `name` se utiliza como etiqueta accesible. Puedes ocultar las redes mediante `<Footer siteName="Ana" socialLinks={[]} />`.

## 7. Fuentes, colores y responsive

Las fuentes son locales. `src/global.css` declara Mansalva para los títulos `h1`/`h2` y Josefin Sans para el texto general mediante `@font-face` y `@theme`. Los archivos están en `public/fonts/` y sus precargas en `src/layouts/Layout.astro`. Si cambias una fuente, actualiza las declaraciones, pesos, familias y precargas correspondientes.

Tailwind CSS 4 se integra mediante `@tailwindcss/vite` en `astro.config.mjs`; no hay un `tailwind.config.mjs`. Los colores todavía están repartidos entre utilidades y estilos de componentes: rojo `#B22222`, crema `#FEEACA` y el degradado del Hero son buenos puntos de partida para localizar la paleta actual.

Los márgenes laterales y la reserva para la cabecera se comparten mediante `--page-gutter` y `--header-space` en `src/global.css`. Las cuadrículas y los tamaños cambian con las clases `sm:`, `md:` y `lg:`. Verifica títulos largos, enlaces, recortes y formulario en móvil estrecho y escritorio después de personalizar. Mantén el foco visible y las reglas de `prefers-reduced-motion`.

## 8. Preparar la publicación

Añade `site: "https://tu-dominio.com"` dentro del objeto de `defineConfig` en `astro.config.mjs`, sin sustituir las integraciones existentes. La integración de sitemap ya está instalada, pero necesita esa URL pública. El layout contiene título y descripción; las etiquetas Open Graph y canonical aún requieren implementación.

Vercel Analytics ya se monta desde `src/layouts/Layout.astro`; configura el servicio en tu proyecto si quieres usarlo, o elimina su importación y `<Analytics />` si no lo necesitas.

Ejecuta `pnpm build` y sigue los pasos de [publicación del README](README.md#publicación-en-vercel). Revisa el resultado desplegado, las rutas de cada proyecto, los recursos locales y tu formulario. El [roadmap](ROADMAP.md) diferencia estas posibilidades actuales de las mejoras pendientes.
