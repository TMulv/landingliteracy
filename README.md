# landingliteracy.com

The marketing site for Landing Literacy, LLC. Plain HTML, CSS and JavaScript, hosted on GitHub Pages. No build step for the site itself.

## What's where

| Path | What it is |
| --- | --- |
| `index.html` | The whole page |
| `assets/css/site.css` | Styles |
| `assets/js/site.js` | Hero tiles, fit check, forms, download gate. **Settings live at the top in `CONFIG`.** |
| `assets/fonts/` | Lexend and Kalam, self-hosted |
| `resources/` | The free PDFs people download |
| `src/resources/` | HTML sources for those PDFs |
| `scripts/build_pdfs.py` | Rebuilds the PDFs and their thumbnails from `src/resources/` |

## Before launch

1. **Connect the forms.** Make a free account at formspree.io with Carly's email, create a form, and paste its endpoint into `CONFIG.inquiryEndpoint` and `CONFIG.resourceEndpoint` in `assets/js/site.js`. The red preview banner disappears once both are set.
2. **Fill in the rest of `CONFIG`:** `email`, and optionally `bookingUrl`, `linkedinUrl`, `replyTime`.
3. **Photos.** Look for `<!-- PHOTO:` comments in `index.html`. Add images to `assets/img/` as `.webp`.
4. **Carly's words.** Replace the draft bio and the "why" placeholder (look for `DRAFT BIO` and `WHY STATEMENT`).
5. **Confirm items.** Search `index.html` for `CONFIRM` and `PENDING PERMISSION`.

## Custom domain

At Namecheap (Domain List > Manage > Advanced DNS), remove any parking records and add:

| Type | Host | Value |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | tmulv.github.io. |

Leave any MX or TXT records for email alone. Then add a `CNAME` file containing `landingliteracy.com`, and in the repo's Settings > Pages set the custom domain and tick **Enforce HTTPS** once it's available.

## Editing the PDFs

Edit the HTML in `src/resources/`, then run:

```
pip install playwright && python3 scripts/build_pdfs.py
```

Needs `qpdf` and `pdftoppm` (poppler) installed.
