# GitHub Pages deployment

The site builds to static files and deploys through GitHub Actions.

## One-time setup

In the GitHub repository settings, open **Pages** and set the publishing source to **GitHub Actions**.

## Deploy

Every push to `main` runs `.github/workflows/deploy.yml`, builds the site, and publishes it to GitHub Pages. To deploy manually, open the repository’s **Actions** tab, select **Deploy to GitHub Pages**, then choose **Run workflow**.

The workflow publishes `dist/client`. The site only runs in the browser and does not upload the media folders selected by users.

## Local build

```bash
npm ci
npm run build
npm run preview
```
