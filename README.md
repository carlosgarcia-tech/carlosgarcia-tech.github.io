# Carlos Garcia - Portfolio

Personal portfolio and developer showcase, live at https://carlosgarcia-tech.github.io.

Built as a fast, static-first site with Astro and Tailwind CSS v4, written in strict TypeScript, tested end to end with Playwright, and shipped automatically to GitHub Pages through GitHub Actions.

## Highlights

- **Static-first architecture.** Built with Astro 7, the site compiles to plain static HTML and ships only the JavaScript it actually needs, which keeps load times low and hosting simple.
- **Modern styling pipeline.** Tailwind CSS v4 is wired in through its native Vite plugin, so there is no PostCSS setup and no separate Tailwind config file to maintain.
- **Strict TypeScript.** The project extends Astro's `strict` TypeScript preset, catching type errors at build time instead of in production.
- **Self-hosted typography.** Inter, Space Grotesk, and JetBrains Mono are bundled through Fontsource, so the site makes no third-party font requests and renders consistently, with a clear hierarchy between body text, headings, and code.
- **Built-in SEO.** A sitemap is generated automatically at build time with `@astrojs/sitemap`, and the canonical site URL is configured at the framework level.
- **Syntax-highlighted content.** Code blocks in Markdown content are highlighted with Shiki using the `github-dark` theme.
- **End-to-end test coverage.** A dedicated `tests/` suite runs on Playwright to verify the site behaves correctly in real browsers.
- **Automated delivery.** GitHub Actions workflows handle build and deployment, so publishing is a push to `main`.

## Tech Stack

| Area | Technology |
| --- | --- |
| Framework | Astro 7 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) |
| Fonts | Inter, Space Grotesk, JetBrains Mono (Fontsource) |
| SEO | `@astrojs/sitemap` |
| Code highlighting | Shiki, `github-dark` theme |
| Testing | Playwright |
| CI/CD | GitHub Actions |
| Hosting | GitHub Pages |

## Project Structure

```
.
|-- .github/workflows/   CI/CD pipelines
|-- public/              Static assets served as-is
|-- src/                 Pages, components, layouts, and styles
|-- tests/               Playwright end-to-end tests
|-- astro.config.mjs     Astro, Vite, sitemap, and Shiki configuration
|-- tsconfig.json        Strict TypeScript configuration
`-- package.json         Dependencies and scripts
```

## Design Decisions

- **Why Astro:** a portfolio is mostly content, so rendering to static HTML at build time gives the best performance with the least runtime complexity.
- **Why Tailwind v4 with Vite:** the native plugin removes configuration overhead and keeps styling colocated with the markup.
- **Why self-hosted fonts:** it removes an external dependency, avoids layout shifts from late-loading fonts, and improves privacy for visitors.
- **Why Playwright:** testing in real browsers catches regressions that unit tests would miss in a content-and-layout-driven site.

## Development

```bash
npm install
npm run dev        # local dev server at http://localhost:4321
npm run build      # static build into dist/
npm run preview    # preview the production build
npx playwright test
```

## Deployment

The repository is named `carlosgarcia-tech.github.io`, so GitHub Pages serves it from the root of the user domain. Pushes to `main` trigger the workflows in `.github/workflows`, which build the site and publish the static output.

## Author

Carlos Garcia

- GitHub: https://github.com/carlosgarcia-tech
- Website: https://carlosgarcia-tech.github.io
