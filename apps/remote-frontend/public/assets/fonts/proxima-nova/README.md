# Proxima Nova font files

Proxima Nova is a commercial font. Do not commit files from random npm packages or web mirrors here unless they are covered by the project license.

Temporary note: until the licensed files arrive from design, the current `ProximaNova-*.woff2` files are safe placeholder aliases copied from the project dependency `@fontsource/oswald`. Replace them in-place with the licensed Proxima Nova files using the same filenames below.

Put the licensed `woff2` files into this folder using these exact names:

- `ProximaNova-Regular.woff2` - weight 400
- `ProximaNova-Medium.woff2` - weight 500
- `ProximaNova-Semibold.woff2` - weight 600
- `ProximaNova-Bold.woff2` - weight 700

Current project usage expects:

- `font-family: 'Proxima Nova'`
- normal style
- weights 400, 500, 600, 700

The `@font-face` declarations live in `apps/remote-frontend/src/pages/RemoteLeaderboardLandingPage.css` before the `:root` block:

```css
@font-face {
  font-family: 'Proxima Nova';
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url('/assets/fonts/proxima-nova/ProximaNova-Regular.woff2') format('woff2');
}

@font-face {
  font-family: 'Proxima Nova';
  font-style: normal;
  font-weight: 500;
  font-display: swap;
  src: url('/assets/fonts/proxima-nova/ProximaNova-Medium.woff2') format('woff2');
}

@font-face {
  font-family: 'Proxima Nova';
  font-style: normal;
  font-weight: 600;
  font-display: swap;
  src: url('/assets/fonts/proxima-nova/ProximaNova-Semibold.woff2') format('woff2');
}

@font-face {
  font-family: 'Proxima Nova';
  font-style: normal;
  font-weight: 700;
  font-display: swap;
  src: url('/assets/fonts/proxima-nova/ProximaNova-Bold.woff2') format('woff2');
}
```

The CSS variable is already set to use this family:

```css
--lb2-proxima: 'Proxima Nova', Arial, system-ui, sans-serif;
```
