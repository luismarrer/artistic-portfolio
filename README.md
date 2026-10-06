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
| `pnpm test` | Tests de contenido y compilación renderizada; requiere Node 24 o superior |
| `pnpm build` | Comprobación de Astro/TypeScript y compilación de producción |
| `pnpm preview` | Vista previa local de la compilación |
| `pnpm astro check` | Comprobación de Astro/TypeScript sin compilar |

## Antes de usar la plantilla

Sustituye identidad, biografía, redes, imágenes y proyectos siguiendo [CUSTOMIZATION.md](CUSTOMIZATION.md). La biografía y las colecciones de Musea Art son ejemplos explícitamente curados; no incluyen métricas o clientes inventados. El inicio presenta una colección seleccionada antes de la biografía; el portfolio reúne el catálogo completo con portadas propias. Cada ficha tiene su propia galería, portada, captions y créditos visibles, además de notas de selección y navegación entre colecciones.

**El contacto está en modo demo, deshabilitado y sin destino de envío.** Activa `contact.mode: 'live'` con tu propio endpoint de Formspree en `src/data/site.ts`. El modo live mantiene el envío nativo sin JavaScript y añade estados accesibles, bloqueo de duplicados y reintentos con JavaScript. La validación no demuestra propiedad ni entrega: verifica ambas con tu propia cuenta antes de aceptar mensajes. Revisa también los derechos y créditos de las imágenes que publiques.

## Publicación en Vercel

1. Sube tu copia a GitHub e importa el repositorio en Vercel.
2. Selecciona el preset **Astro**, una versión de Node compatible y el comando de compilación `pnpm build`. Mantén la salida que determine el preset: el proyecto ya utiliza `@astrojs/vercel`.
3. Añade tu URL pública como `site` en [astro.config.mjs](astro.config.mjs) para generar el sitemap. Conserva el resto de la configuración.
4. Despliega y comprueba las rutas `/`, `/portfolio`, `/contact` y `/projects/1`, además de un envío a tu propio formulario.

Para otro proveedor, adapta primero el adaptador y la configuración de Astro. No basta con asumir que la salida de esta configuración de Vercel es una carpeta estática intercambiable.

## Estructura

- `src/pages/`: rutas y metadatos de cada página.
- `src/components/sections/`: cabecera, Hero, biografía, listado de proyectos y pie.
- `src/components/Collage.astro`: galería explícita por proyecto, sin colección de sustitución.
- `src/components/ContactForm.astro`: modo demo sin envío y formulario live con POST nativo.
- `src/scripts/contact-form.ts`: validación nativa, estados accesibles y ciclo de vida del envío entre páginas.
- `src/data/site.ts`: identidad, textos, navegación, redes y modo de contacto.
- `src/data/projects.ts`: proyectos tipados, galerías acreditadas y contenido editorial que generan `/projects/[id]`.
- `src/data/validation.ts`: comprobaciones de contenido y recursos locales antes de renderizar.
- `src/scripts/artistic-motion.ts`: animaciones GSAP y su ciclo de vida entre páginas.
- `src/components/svgs/Signature.astro` e `InkTrail.astro`: firma y trazo de tinta.
- `src/global.css` y `public/`: estilos compartidos, fuentes, imágenes e iconos.

## Evolución y contribuciones

El [roadmap](ROADMAP.md) ordena las siguientes iteraciones y el [documento de diseño](docs/DESIGN.md) define la dirección del producto. El [diseño original en Figma](https://www.figma.com/design/QRa4rBb9uLO4gufnYdf8ip/Musea-Art?node-id=0-1) sirve como referencia visual.

Para contribuir, describe el problema en una [issue](https://github.com/luismarrer/artistic-portfolio/issues) y valida los cambios con `pnpm build`. Si afectan al diseño, revisa móvil y escritorio, navegación con teclado y movimiento reducido.

Código bajo [licencia MIT](LICENSE). Las imágenes y otros recursos de terceros conservan sus propias condiciones de uso.
