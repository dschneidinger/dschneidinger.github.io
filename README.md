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

## Everything you edit is Markdown

All text on the site lives in `src/content/`. You should never need to open an
`.astro`, `.ts`, or `.css` file to change wording, navigation, or page content.

```
src/content/
  site.md              site title, description, author, nav, footer links
  pages/
    home.md            the homepage intro paragraph
    writing.md         heading + intro for /writing
    notes.md           heading + intro for /notes
    reading.md         heading + intro for /reading
    about.md           the whole /about page
    projects.md        the whole /projects page
    not-found.md       the 404 page
  essays/              -> /writing/:slug
  notes/               -> /notes/:slug
  reading/             -> /reading/:slug
```

Navigation and footer links are the `nav:` and `links:` lists in
`src/content/site.md` — add, remove, or reorder the lines.

## Posts

| Directory | URL | Frontmatter |
| --- | --- | --- |
| `essays/` | `/writing/:slug` | `title`, `description`, `pubDate`, `updatedDate?`, `tags`, `draft` |
| `notes/` | `/notes/:slug` | `title`, `description?`, `started`, `updated`, `maturity`, `tags`, `draft` |
| `reading/` | `/reading/:slug` | `title`, `author`, `year?`, `dateRead`, `rating?`, `link?`, `tags`, `draft` |

The slug is the filename. Schemas are enforced at build time in
`src/content.config.ts` — a missing or malformed field fails the build with the
offending file named.

`draft: true` hides an entry from the built site but keeps it visible in
`npm run dev`.

### Markdown features

Sätteri (Astro 7's Markdown engine) with GitHub-Flavored Markdown, so tables,
footnotes, and strikethrough work without configuration. On top of that:

- **Math** — `$inline$` and `$$display$$` via `satteri-katex`. Shorthands for
  `\ket`, `\bra`, `\braket`, and `\dd` are defined in `astro.config.mjs`.
- **Code** — Shiki, themed for light and dark.
- **Diagrams** — ```` ```mermaid ```` fences, rendered client-side and
  re-rendered on theme change.
- **Headings** — automatic ids and anchor links.

Use `.mdx` instead of `.md` when a page needs components (`Figure.astro` gives
you captioned images).

## The few things that are not Markdown

- **Design** — colours, type, and spacing are custom properties in
  `src/styles/tokens.css`.
- **Math macros** — the `macros` block in `astro.config.mjs`.
- **Page structure** — layouts and components in `src/layouts/`, `src/components/`.

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
