# Proxima Nova font files

Proxima Nova is a commercial font. Do not commit files from random npm packages or web mirrors here unless they are covered by the project license.

Put the licensed `woff2` files into this folder using these exact names:

- `ProximaNova-Regular.woff2` - weight 400
- `ProximaNova-Medium.woff2` - weight 500
- `ProximaNova-Semibold.woff2` - weight 600
- `ProximaNova-Bold.woff2` - weight 700

Current project usage expects:

- `font-family: 'Proxima Nova'`
- normal style
- weights 400, 500, 600, 700

After the licensed files are added, declare `@font-face` in `apps/frontend/src/index.css` before the Druk declarations.
