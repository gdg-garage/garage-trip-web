# Port Plan: garage-trip-web — Jekyll → Astro.js

## TL;DR

Convert the Jekyll-based Garage Trip site to Astro.js while preserving the existing design,
dark theme, and functionality. Bootstrap CSS moves from a vendored SCSS copy to an npm import.
Interactive pages (register, payment) become React islands via Astro's island architecture.
Images switch from a Gulp pipeline to Astro's built-in `<Image />` optimization.
Static MHTML/HTML archive files move to `public/`. Deploy target remains GitHub Pages (static output).

---

## Decisions

- **Deployment**: GitHub Pages with `@astrojs/sitemap` (static adapter, SSG mode)
- **CSS**: Bootstrap 5.3.3 via npm (`bootstrap/scss/bootstrap`), no vendored `_sass/bootstrap/`
- **Interactive JS**: React islands (`@astrojs/react`) for register form, payment, logo playground
- **MHTML files**: Kept as-is in `public/` for static serving
- **Images**: Astro `<Image />` / `<Picture />` components replace the Gulp 400/2000 pipeline
- **Package manager**: yarn

---

## New Project Structure

```
garage-trip-web/
├── astro.config.mjs
├── package.json
├── tsconfig.json
├── public/
│   ├── favicon.ico
│   ├── assets/
│   │   ├── svg/                  # all SVGs (icons, illustrations, pattern)
│   │   └── pdf/                  # PDFs
│   ├── history/                  # .html and .mhtml archive files
│   ├── invite-cipher3.html       # static saved pages
│   ├── invite-cipher3.mhtml
│   ├── invite-cipher5.html
│   └── invite-cipher5.mhtml
├── src/
│   ├── assets/
│   │   └── images/               # source JPGs (from _images/), processed by Astro
│   ├── layouts/
│   │   └── Default.astro         # replaces _layouts/default.html
│   ├── components/
│   │   ├── Header.astro          # replaces _includes/header.html
│   │   ├── Footer.astro          # replaces _includes/footer.html
│   │   ├── ButtonLink.astro      # replaces _includes/button-link.html
│   │   ├── Icon.astro            # replaces _includes/icon.html
│   │   ├── TextScramble.astro    # extract inline JS from index.html
│   │   ├── RegisterForm.tsx      # React island (from register.html inline JS)
│   │   └── LogoPlayground.tsx    # React island (from design.html contenteditable)
│   ├── styles/
│   │   ├── main.scss             # replaces _sass/_main.scss (entry point)
│   │   ├── variables.scss        # replaces _sass/variables.scss
│   │   ├── header.scss           # replaces _sass/header.scss
│   │   ├── home-header.scss      # replaces _sass/home-header.scss
│   │   └── menu.scss             # replaces _sass/menu.scss
│   └── pages/
│       ├── index.astro           # replaces index.html
│       ├── register.astro        # replaces register.html
│       ├── payment.astro         # replaces payment.html
│       ├── design.astro          # replaces design.html
│       ├── brickalley.astro      # replaces brickalley.html
│       └── history.astro         # replaces history.html
└── .github/
    └── workflows/
        └── deploy.yml            # new Astro GH Pages workflow
```

---

## Steps

### Phase 1 — Scaffold & Configure

1. **Initialize Astro project** in this directory using `yarn create astro` (or manually).
   Install dependencies: `astro`, `@astrojs/react`, `@astrojs/sitemap`, `sass`, `bootstrap`, `react`, `react-dom`.

2. **Create `astro.config.mjs`** with:
   - `output: 'static'` (SSG for GitHub Pages)
   - `integrations: [react(), sitemap()]`
   - `site: 'https://<your-gh-pages-url>'`
   - `vite.css.preprocessorOptions.scss.additionalData` for shared variables (optional)

3. **Create `tsconfig.json`** — Astro's default strict config, add path alias `@/*` → `src/*`.

4. **Update `package.json`** — replace Jekyll scripts with:
   - `"dev": "astro dev"`
   - `"build": "astro build"`
   - `"preview": "astro preview"`
   Remove gulp, mhtml2html, and image-processing devDeps (no longer needed).

### Phase 2 — Styles

5. **Move SCSS files** from `_sass/` to `src/styles/`:
   - `_main.scss` → `src/styles/main.scss`
   - `variables.scss` → `src/styles/variables.scss`
   - `header.scss` → `src/styles/header.scss`
   - `home-header.scss` → `src/styles/home-header.scss`
   - `menu.scss` → `src/styles/menu.scss`

6. **Update SCSS imports** in `main.scss`:
   - Replace `@import "bootstrap/bootstrap"` with `@use "bootstrap/scss/bootstrap"`
     (or `@import "~bootstrap/scss/bootstrap"` — Vite resolves `node_modules` automatically).
   - Replace all `@import` calls with `@use` / `@forward` for modern SASS.
   - Remove the Jekyll `---` front matter from the old `assets/css/main.scss`.
   - Import Bootstrap Icons CSS from CDN in the layout `<head>` instead of `@import url(...)` in SCSS.

7. **Delete vendored Bootstrap** — remove `_sass/bootstrap/` directory entirely; npm provides it.

### Phase 3 — Layout & Components

8. **Port `_layouts/default.html`** → `src/layouts/Default.astro`:
   - Convert Liquid `{{ content }}` to Astro `<slot />`.
   - `{{ page.title }}` → accept `title` prop via `Astro.props`.
   - Google Analytics snippet: keep as inline `<script is:inline>`.
   - Bootstrap JS CDN: keep `<script>` in `<head>` (or import as `<script>` tag).
   - Google Fonts link: keep in `<head>`.
   - Import `main.scss` via `import '../styles/main.scss'` in the component script.

9. **Port `_includes/header.html`** → `src/components/Header.astro`:
   - Replace `{% if page.id == 'home' %}active{% endif %}`
     with Astro: accept `activeId` prop, compare with `Astro.url.pathname` or a passed prop.
   - Replace `{% include button-link.html url=... %}` with `<ButtonLink url=... />`.

10. **Port `_includes/footer.html`** → `src/components/Footer.astro`:
    - Update copyright year to dynamic: `new Date().getFullYear()`.

11. **Port `_includes/button-link.html`** → `src/components/ButtonLink.astro`:
    - Convert Liquid `{% assign %}` / `{% if include.icon %}` to Astro props with defaults:
      ```
      interface Props { url: string; text: string; variant?: string; size?: string; icon?: string; target?: string; }
      ```
    - Render `<Icon />` child conditionally.

12. **Port `_includes/icon.html`** → `src/components/Icon.astro`:
    - Accept `icon` prop, render `<img src={`/assets/svg/icon/icon-${icon}.svg`} />`.

### Phase 4 — Pages

13. **Port `index.html`** → `src/pages/index.astro`:
    - Front matter props → set `title` in layout.
    - Move the `TextScramble` class to `src/components/TextScramble.astro`
      (a `<script>` block with client-side JS, using `<script>` tag or `is:inline`).
    - Convert all Liquid syntax to Astro template syntax.
    - Replace image references with Astro `<Image />` component for the
      commented-out gallery section (when re-enabled).

14. **Port `register.html`** → `src/pages/register.astro`:
    - Extract the inline form logic into `src/components/RegisterForm.tsx` (React island).
    - Use `client:load` directive for hydration (form needs to be interactive immediately).
    - Move API_BASE_URL to an environment variable: `PUBLIC_API_BASE_URL` in `.env`.
    - The React component handles: Discord OAuth redirect, form state, API calls, loading/error states.

15. **Port `payment.html`** → `src/pages/payment.astro`:
    - Straightforward static content, just convert Liquid to Astro templates.

16. **Port `design.html`** → `src/pages/design.astro`:
    - The `contenteditable` logo playground → extract to `src/components/LogoPlayground.tsx`
      React island with `client:visible` (only hydrate when scrolled into view).

17. **Port `history.html`** → `src/pages/history.astro`:
    - Large static content page. Direct HTML-to-Astro conversion.
    - Update links to `/history/*.html` and `/history/*.mhtml`
      (these will be served from `public/history/`).

18. **Port `brickalley.html`** → `src/pages/brickalley.astro`:
    - Simple static page, direct conversion.

### Phase 5 — Static Assets

19. **Move static files to `public/`**:
    - `assets/svg/` → `public/assets/svg/` (icons, illustrations, patterns)
    - `assets/pdf/` → `public/assets/pdf/`
    - `assets/images/favicon.ico` → `public/favicon.ico`
    - `assets/images/coffee-69.jpg` → `public/assets/images/coffee-69.jpg`
    - `history/*.html`, `history/*.mhtml` → `public/history/`
    - `invite-cipher3.html`, `invite-cipher3.mhtml` → `public/`
    - `invite-cipher5.html`, `invite-cipher5.mhtml` → `public/`

20. **Move source images to `src/assets/images/`**:
    - Copy original JPGs from `_images/` to `src/assets/images/`.
    - Use Astro's `<Image />` or `<Picture />` component to handle resizing/format
      conversion at build time (replaces the Gulp 400px/2000px WebP pipeline).
    - Delete `assets/images/400/` and `assets/images/2000/` (generated output).

### Phase 6 — Environment & Config

21. **Create `.env` file** (and `.env.example`):
    ```
    PUBLIC_API_BASE_URL=https://api.garage-trip.cz
    PUBLIC_GA_ID=G-TF98L99080
    ```
    Reference in components via `import.meta.env.PUBLIC_API_BASE_URL`.

22. **Update `.gitignore`** — add:
    - `dist/` (Astro build output)
    - `node_modules/`
    - `.astro/`
    - `.env`

### Phase 7 — CI/CD

23. **Replace GitHub Actions workflow** (`.github/workflows/jekyll-gh-pages.yml`) with Astro's
    official GitHub Pages deploy action:
    - Use `withastro/action@v3` to build.
    - Use `actions/deploy-pages@v4` to deploy.
    - Set `ASTRO_SITE` env var for the correct base URL.
    - Remove the old Jekyll workflow file.

### Phase 8 — Cleanup

24. **Delete Jekyll artifacts**:
    - `_config.yml`
    - `_layouts/` directory
    - `_includes/` directory
    - `_sass/` directory (already moved to `src/styles/`)
    - `_site/` directory (Jekyll build output)
    - `_images/` directory (moved to `src/assets/images/`)
    - `assets/css/main.scss` (Jekyll entry point with front matter)
    - `assets/css/boostrap/` (typo copy from gulp)
    - `gulpfile.js`
    - Old HTML pages at root (`index.html`, `register.html`, etc.)
    - `Gemfile` / `Gemfile.lock` if they exist

25. **Update `README.md`** with new dev instructions:
    - `yarn install`
    - `yarn dev` (local development)
    - `yarn build` (production build)
    - `yarn preview` (preview build locally)

---

## Verification

1. **Visual comparison**: Run `yarn dev`, compare every page side-by-side with the current
   Jekyll build. Check dark theme, responsive layout, frosted glass header, SVG backgrounds.
2. **Navigation**: Verify all internal links work (`/`, `/history`, `/register`, `/payment`,
   `/design`, `/brickalley`). Verify active nav state highlighting.
3. **Static archives**: Confirm `/history/*.html`, `/history/*.mhtml`,
   `/invite-cipher3.html`, etc. serve correctly from `public/`.
4. **Register form**: Test Discord OAuth flow, form submission, loading/error states
   against the API (`PUBLIC_API_BASE_URL`).
5. **TextScramble animation**: Confirm the rotating tagline animation works on the homepage.
6. **Images**: Verify Astro generates optimized WebP/AVIF versions, confirm the
   gallery modal swap pattern works (if re-enabled).
7. **Bootstrap**: Confirm all Bootstrap components work (navbar collapse, modals, grid, cards).
8. **Google Analytics**: Verify gtag fires in production build.
9. **Mobile responsive**: Test hamburger menu, layout at 375px, 768px, 1024px, 1440px.
10. **Lighthouse audit**: Run Lighthouse on the built site; target ≥ 90 in all categories.
11. **GitHub Pages deploy**: Push to `main`, confirm the Actions workflow builds and deploys
    successfully.

---

## Risk Notes

- **Bootstrap JS from CDN**: Currently loaded via CDN `<script>`. If you later want to
  tree-shake Bootstrap JS, consider importing only needed modules via npm.
- **MHTML files**: These are browser-specific saved pages. They serve fine as static files
  but may not render correctly in all browsers.
- **API hardcoded to localhost**: The register page currently has the prod URL commented out.
  The `.env` approach fixes this, but ensure the environment variable is set in CI secrets.
- **Commented-out sections**: The image gallery and schedule in `index.html` are commented out.
  Port them as commented Astro components so they're ready to enable for event 7.0.0.
