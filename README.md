# Artistic Portfolio · Musea Art

Plantilla de portfolio artístico con Astro, Tailwind CSS y GSAP. Incluye inicio, portfolio, fichas de proyecto y contacto, con ilustraciones SVG, fuentes locales y diseño adaptable a móvil, tablet y escritorio.

[Ver demo](https://artistic-portfolio-nine.vercel.app) · [Personalización](CUSTOMIZATION.md) · [Roadmap](ROADMAP.md) · [Diseño](docs/DESIGN.md)

## Desarrollo

Requiere **Node.js 22.12.0 o superior** y pnpm. El proyecto utiliza Astro 7.3.2, Tailwind CSS 4.3.3 y GSAP 3.15.0; las versiones exactas están en [package.json](package.json) y [pnpm-lock.yaml](pnpm-lock.yaml).

Usa **Use this template** en GitHub o clona el repositorio:

```sh
git clone https://github.com/luismarrer/artistic-portfolio.git
cd artistic-portfolio
pnpm install --frozen-lockfile
pnpm dev
```

Abre la dirección que indique la terminal; normalmente es `http://localhost:4321`.

| Comando | Función |
| --- | --- |
| `pnpm dev` | Servidor de desarrollo |
| `pnpm build` | Comprobación de Astro/TypeScript y compilación de producción |
| `pnpm preview` | Vista previa local de la compilación |
| `pnpm astro check` | Comprobación de Astro/TypeScript sin compilar |

## Antes de usar la plantilla

Sustituye identidad, biografía, redes, imágenes y proyectos siguiendo [CUSTOMIZATION.md](CUSTOMIZATION.md). El contenido y las métricas de Musea Art son ejemplos. Las fichas comparten actualmente la galería de demostración de `Collage.astro`.

**Configura tu propio endpoint de Formspree antes de aceptar mensajes.** El formulario incluye un destino de la demo; no se configura automáticamente al clonar. Revisa también los derechos y créditos de las imágenes que publiques.

## Publicación en Vercel

1. Sube tu copia a GitHub e importa el repositorio en Vercel.
2. Selecciona el preset **Astro**, una versión de Node compatible y el comando de compilación `pnpm build`. Mantén la salida que determine el preset: el proyecto ya utiliza `@astrojs/vercel`.
3. Añade tu URL pública como `site` en [astro.config.mjs](astro.config.mjs) para generar el sitemap. Conserva el resto de la configuración.
4. Despliega y comprueba las rutas `/`, `/portfolio`, `/contact` y `/projects/1`, además de un envío a tu propio formulario.

Para otro proveedor, adapta primero el adaptador y la configuración de Astro. No basta con asumir que la salida de esta configuración de Vercel es una carpeta estática intercambiable.

## Estructura

- `src/pages/`: rutas y metadatos de cada página.
- `src/components/sections/`: cabecera, Hero, biografía, listado de proyectos y pie.
- `src/components/Collage.astro`: galería y fotografías de ejemplo.
- `src/components/ContactForm.astro`: formulario conectado a Formspree.
- `src/data/projects.json`: contenido que genera las fichas `/projects/[id]`.
- `src/scripts/artistic-motion.ts`: animaciones GSAP y su ciclo de vida entre páginas.
- `src/components/svgs/Signature.astro` e `InkTrail.astro`: firma y trazo de tinta.
- `src/global.css` y `public/`: estilos compartidos, fuentes, imágenes e iconos.

## Evolución y contribuciones

El [roadmap](ROADMAP.md) ordena las siguientes iteraciones y el [documento de diseño](docs/DESIGN.md) define la dirección del producto. El [diseño original en Figma](https://www.figma.com/design/QRa4rBb9uLO4gufnYdf8ip/Musea-Art?node-id=0-1) sirve como referencia visual.

Para contribuir, describe el problema en una [issue](https://github.com/luismarrer/artistic-portfolio/issues) y valida los cambios con `pnpm build`. Si afectan al diseño, revisa móvil y escritorio, navegación con teclado y movimiento reducido.

Código bajo [licencia MIT](LICENSE). Las imágenes y otros recursos de terceros conservan sus propias condiciones de uso.
