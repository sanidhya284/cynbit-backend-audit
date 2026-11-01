# Cutting the 1.1 MB Material Symbols download

Observed: `fonts.gstatic.com/.../materialsymbolsoutlined/v382/...woff2` = **1,138,856 bytes**
(the full variable icon font), loaded through a render-blocking Google Fonts stylesheet.

## Option A: request only the icons you use (smallest change)
Google Fonts supports an `icon_names` filter. List must be alphabetical.

```html
<link rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0&icon_names=arrow_forward,call,mail,menu,north_east,verified&display=block" />
```
A subset of ~20 icons is typically a few KB instead of ~1 MB.

## Option B: drop the icon font, ship inline SVG (best for performance + CSP)
```tsx
import { Mail, Phone, ArrowUpRight } from "lucide-react"; // tree-shaken, only used icons bundled
<Mail className="h-5 w-5" aria-hidden />
```
Removes two third-party origins (`fonts.googleapis.com`, `fonts.gstatic.com`) from the
critical path and from the CSP allowlist.
