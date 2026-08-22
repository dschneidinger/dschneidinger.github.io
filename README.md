# dschneidinger.github.io

Personal site — essays, notes, and reading notes. Built with
[Astro](https://astro.build) and deployed to GitHub Pages.

## Running it

```sh
npm install
npm run dev        # http://localhost:4321
npm run build      # -> dist/
npm run preview    # serve the built site
npx astro check    # typecheck
```

## Writing

Content lives in `src/content/`, one directory per collection:

| Directory | URL | Frontmatter |
| --- | --- | --- |
| `essays/` | `/writing/:slug` | `title`, `description`, `pubDate`, `updatedDate?`, `tags`, `draft` |
| `notes/` | `/notes/:slug` | `title`, `description?`, `started`, `updated`, `maturity`, `tags`, `draft` |
| `reading/` | `/reading/:slug` | `title`, `author`, `year?`, `dateRead`, `rating?`, `link?`, `tags`, `draft` |

The slug is the filename. Schemas are enforced at build time in
`src/content.config.ts` — a missing or malformed field fails the build.

`draft: true` hides an entry from the built site but keeps it visible in
`npm run dev`.

### Markdown

Sätteri (Astro 7's Markdown engine) with GitHub-Flavored Markdown, so tables,
footnotes, and strikethrough work without configuration. On top of that:

- **Math** — `$inline$` and `$$display$$` via `satteri-katex`. Shorthands for
  `\ket`, `\bra`, `\braket`, and `\dd` are defined in `astro.config.mjs`.
- **Code** — Shiki, themed for light and dark.
- **Diagrams** — ```` ```mermaid ```` fences, rendered client-side and
  re-rendered on theme change.
- **Headings** — automatic ids and anchor links.

Use `.mdx` instead of `.md` when a post needs components (`Figure.astro`).

## Design

All typography, spacing, and colour live as custom properties in
`src/styles/tokens.css`; element and prose styles in `src/styles/global.css`.
Retuning the site means editing the tokens, not hunting through components.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and
publishes to GitHub Pages. The repo's **Settings → Pages → Source** must be set
to **GitHub Actions**.

To move to a custom domain: set `site` in `astro.config.mjs` and add
`public/CNAME` containing the domain.
