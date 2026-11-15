# Worship Flow website

A fast, responsive site with a built-in visual editor. No WordPress, no plugins, no monthly builder fee.

## Files

| File | What it is |
|---|---|
| `index.html` | The page shell |
| `styles.css` | The design |
| `app.js` | Renders the site and runs the editor |
| `content.js` | Starting content |
| `content.json` | Created the first time you publish. Holds your live text, links and settings |
| `media/` | Images you upload are saved here when you publish |

## Editing

1. Open your site and add `#edit` to the address (or click **Edit site** in the footer).
2. Click any text to retype it. Click a button to change its label and link. Click an image to replace it.
3. Each section has a bar: move up or down, Settings (menu name, background), Hide, Copy, Delete.
4. Cards (services, products, plans, testimonials) have small controls to reorder, duplicate or delete, and a **+ Add** button.
5. **Look and fonts** changes colors, light or dark style, fonts, corner roundness, logo, and the search title and description.
6. Changes autosave as a draft in your browser. Visitors only see them after you press **Publish**.
7. **Backup** downloads everything as one file, and restores from one.

Anyone can open edit mode, but they only change a private draft in their own browser. Publishing needs your GitHub token.

## Selling media

In the Media store section, each product has a title, type, description, price, image, a Preview link and a Buy button.
Create the product in a checkout service, then paste its link into the Buy button:

- **Stripe Payment Links** with a file delivery add-on, **Gumroad**, **Lemon Squeezy** or **Payhip** all handle payment and deliver the download.
- The type you enter on each product (Graphics, Motion, ProPresenter…) becomes a filter button automatically.

## Going live (about 20 minutes, free hosting)

1. Create a free account at github.com, then a new **public** repository, for example `worshipflow`.
2. Upload every file in this folder to the repository (Add file → Upload files).
3. In the repository: Settings → Pages → Source: **Deploy from a branch**, branch `main`, folder `/ (root)`. Your site appears at `https://USERNAME.github.io/worshipflow/` within a couple of minutes.
4. Create the token the editor publishes with: GitHub → Settings → Developer settings → Personal access tokens → **Fine-grained tokens** → Generate. Repository access: only this repository. Permissions: **Contents: Read and write**.
5. Open your site with `#edit`, press **Publish**, enter your username, repository name and token.
6. When you are happy, point the domain: in Settings → Pages enter `worshipflow.io` as the custom domain, then update the DNS records at your domain registrar as GitHub shows you.

**Before step 6:** switching the domain takes the WordPress site offline. Download your logo and client logos from WordPress first and upload them in the editor, because the old image addresses stop working.

## Before launch

- Replace the six sample products with real ones and paste real checkout links.
- Paste the full testimonials. The site currently shows only short excerpts.
- Check each plan button and the pricing wording ("per week").
- Upload your logo, client logos and a photo for the About section.
