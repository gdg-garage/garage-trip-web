# garage-trip-web

Website for the Garage Trip event — built with [Astro](https://astro.build/).

## Technologies

- Astro (SSG)
- React (interactive islands)
- Bootstrap 5.3 (SCSS, via npm)
- GitHub Pages (deployment)

## Development

```bash
yarn install          # install dependencies
yarn dev              # start local dev server
yarn build            # production build → dist/
yarn preview          # preview the production build locally
```

## Project Structure

```
src/
  components/     # Astro & React components
  layouts/        # Page layouts
  pages/          # File-based routing
  styles/         # SCSS (variables, main entry, partials)
  assets/images/  # Source images (optimized at build)
public/           # Static files served as-is (SVGs, PDFs, archives)
```
