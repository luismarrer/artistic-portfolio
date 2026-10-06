# Artistic Portfolio · Musea Art

Plantilla de portfolio artístico con Astro, Tailwind CSS y GSAP. Incluye inicio, portfolio, fichas de proyecto y contacto, con ilustraciones SVG, fuentes locales y diseño adaptable a móvil, tablet y escritorio.

[Ver demo](https://artistic-portfolio-nine.vercel.app) · [Personalización](CUSTOMIZATION.md) · [Roadmap](ROADMAP.md) · [Diseño](docs/DESIGN.md)

## Desarrollo

Requiere **Node.js 24 o superior** y **pnpm 11.5.2**, fijado en `packageManager` de [package.json](package.json). La CI usa Node 24. El proyecto utiliza Astro 7.3.2, Tailwind CSS 4.3.3 y GSAP 3.15.0; las versiones exactas están en [package.json](package.json) y [pnpm-lock.yaml](pnpm-lock.yaml).

Con Node instalado, prepara la versión de pnpm documentada:

```sh
npm install --global pnpm@11.5.2
```

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
| `pnpm test` | Tests de contenido, publicación y controladores; compila la fuente actual |
| `pnpm build` | Comprobación de Astro/TypeScript y compilación de producción |
| `pnpm preview` | Vista previa local de la compilación |
| `pnpm astro check` | Comprobación de Astro/TypeScript sin compilar |

## Comprobaciones

Ejecuta `pnpm test` antes de integrar cambios. Usa el runner nativo de Node y genera una compilación desde la fuente actual, no desde una salida antigua. Cubre validación de configuración y recursos, las seis rutas actuales, galerías propias, enlaces internos, canonical, Open Graph, sitemap y robots, además de contacto con transporte simulado y el ciclo de vida de las animaciones con movimiento reducido.

[`.github/workflows/quality.yml`](.github/workflows/quality.yml) ejecuta instalación con lockfile congelado y `pnpm test` en cada push y pull request, con Node 24 y la versión de pnpm del manifiesto. Tener el workflow configurado o pasar las pruebas localmente **no demuestra una ejecución remota de CI**: consulta el resultado de GitHub Actions después de publicar tus cambios.

Estas comprobaciones no sustituyen la matriz completa de accesibilidad y responsive, las medidas de carga, la revisión de licencias ni una entrega real a tu propia cuenta de Formspree. Revisa también navegación con teclado, móvil, escritorio, movimiento reducido y uso sin JavaScript.

## Antes de usar la plantilla

Sustituye identidad, biografía, redes, imágenes y proyectos siguiendo [CUSTOMIZATION.md](CUSTOMIZATION.md). La biografía y las colecciones de Musea Art son ejemplos explícitamente curados; no incluyen métricas o clientes inventados. El inicio presenta una colección seleccionada antes de la biografía; el portfolio reúne el catálogo completo con portadas propias. Cada ficha tiene su propia galería, portada, captions y créditos visibles, además de notas de selección y navegación entre colecciones.

**El contacto está en modo demo, deshabilitado y sin destino de envío.** Activa `contact.mode: 'live'` con tu propio endpoint de Formspree en `src/data/site.ts`. El modo live mantiene el envío nativo sin JavaScript y añade estados accesibles, bloqueo de duplicados y reintentos con JavaScript. La validación no demuestra propiedad ni entrega: verifica ambas con tu propia cuenta antes de aceptar mensajes. Revisa también los derechos y créditos de las imágenes que publiques.

## Publicación en Vercel

1. Sube tu copia a GitHub e importa el repositorio en Vercel.
2. Selecciona el preset **Astro**, Node 24 o superior, pnpm 11.5.2 y el comando de compilación `pnpm build`. Mantén la salida que determine el preset: el proyecto ya utiliza `@astrojs/vercel`.
3. Cambia `publicUrl` en [src/data/site.ts](src/data/site.ts) por tu origen HTTPS, sin ruta, consulta ni fragmento. Es la única fuente para `site` de Astro, canonical, URLs de Open Graph, sitemap y robots: no dupliques el dominio en `astro.config.mjs` ni añadas una variable de entorno. Sustituye también `socialImage` y verifica sus permisos.
4. Ejecuta `pnpm test` y `pnpm build` antes de desplegar. Después comprueba las seis rutas `/`, `/portfolio`, `/contact` y `/projects/1`, `/projects/2`, `/projects/3`, los metadatos y un envío a tu propio formulario.

Para otro proveedor, adapta primero el adaptador y la configuración de Astro. No basta con asumir que la salida de esta configuración de Vercel es una carpeta estática intercambiable.

## Estructura

- `src/pages/`: rutas y metadatos de cada página.
- `src/components/sections/`: cabecera, Hero, biografía, listado de proyectos y pie.
- `src/components/Collage.astro`: galería explícita por proyecto, sin colección de sustitución.
- `src/components/ContactForm.astro`: modo demo sin envío y formulario live con POST nativo.
- `src/scripts/contact-form.ts`: validación nativa, estados accesibles y ciclo de vida del envío entre páginas.
- `src/data/site.ts`: identidad, textos, navegación, redes, publicación y modo de contacto.
- `src/data/projects.ts`: proyectos tipados, galerías acreditadas y contenido editorial que generan `/projects/[id]`.
- `src/data/validation.ts`: comprobaciones de contenido y recursos locales antes de renderizar.
- `src/scripts/artistic-motion.ts`: animaciones GSAP y su ciclo de vida entre páginas.
- `src/components/svgs/Signature.astro` e `InkTrail.astro`: firma y trazo de tinta.
- `src/global.css` y `public/`: estilos compartidos, fuentes, imágenes e iconos.

## Evolución y contribuciones

El [roadmap](ROADMAP.md) ordena las siguientes iteraciones y el [documento de diseño](docs/DESIGN.md) define la dirección del producto. El [diseño original en Figma](https://www.figma.com/design/QRa4rBb9uLO4gufnYdf8ip/Musea-Art?node-id=0-1) sirve como referencia visual.

Para contribuir, describe el problema en una [issue](https://github.com/luismarrer/artistic-portfolio/issues) y valida los cambios con `pnpm test` y `pnpm build`. Si afectan al diseño, revisa móvil y escritorio, navegación con teclado y movimiento reducido.

Código bajo [licencia MIT](LICENSE). Las imágenes y otros recursos de terceros conservan sus propias condiciones de uso.
