# Growth Clarity Co. — GitHub-ready website

This package contains the updated 21-page static website, logo, resources, CSS, JavaScript and embedded Tally research form. No installation or framework build is required. Edit the HTML files in site/ directly, or edit the shared site/style.css and site/app.js assets.

## Deploy with GitHub Pages

1. Extract this ZIP. Create your GitHub repository and upload the contents of this folder, including the hidden .github folder. Do not upload only the ZIP itself.
2. In the repository, open Settings → Pages → Build and deployment. Select GitHub Actions.
3. When you are ready to publish, open Actions → Deploy Growth Clarity website → Run workflow.
4. Use the Pages URL returned by the deployment. The script handles both a normal /repository-name/ URL and a root/custom-domain URL.

The workflow is manual: uploading files does not automatically launch the site. GitHub hosting is separate from the private Sites preview. A GitHub Pages deployment can be publicly accessible; a private repository alone does not make the website private. No GitHub deployment or domain change was performed when preparing this package.

The private-preview banner, noindex metadata, robots.txt restrictions and empty sitemap are preserved from the approved private website. Before an approved public launch, remove the preview banner, review indexing settings, populate sitemap.xml and verify the page-specific canonical URLs, currently set to https://www.growthclarityco.com/. No custom domain or CNAME is assumed in this package.

## Other static hosting

Upload the contents of site/ to the hosting document root. Files use root-relative paths. No PHP, database or API server is required.

## Forms

- Research uses https://tally.so/r/2jXgEg. A labelled QA submission was accepted by Tally and confirmed by the embedded website flow.
- Consulting and Contact prepare an email draft addressed to growth@growthclarityco.com. They do not send or store submissions automatically.
- Platform Interest prepares a draft addressed to demo@growthclarityco.com, shown only on that page.
- Tally notifications, Google Sheets synchronisation and campaign hidden-field storage require verification in your Tally account. They are not configured by this ZIP.

Read VALIDATION.md before launch. To retain a simple workflow, use Tally → email notification + Google Sheets → Review → Qualify → Contact → Interview → Follow up.

## Analytics and resources

Google Analytics G-28TWC9G9TJ is installed once through the shared script. Consent is required for analytics; names, emails and form answers are not sent in the custom submission event. The resources and downloads are included in site/resources/ and site/downloads/.

GitHub documentation: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
