# ZTRADEZ Website

One-page site for ZTRADEZ private 1-on-1 futures mentorship. Plain HTML, CSS and JavaScript — no build step.

## Design
- Dark cinematic system: off-black base, warm off-white text, one red accent
- Type: Geist (sans), Instrument Serif italic (accent words), Geist Mono (labels) via Google Fonts
- Real Zander photography throughout, with a draggable gallery and full-screen photo viewer

## Sections
Hero (rotating headline word synced to an Instagram-story-style photo slideshow, decorative streaming candlestick chart, count-up proof numbers, cursor glow, live New York clock and CME Globex status) · Approach · Mentorship · What's included · Reported numbers · Fit check · How it works · Student story (click-to-load YouTube) · About · Gallery · Alpha Futures affiliate · Follow · Application · FAQ

## Pages
- `index.html` — main one-page site
- `thank-you.html` — shown after someone applies. Recaps their answers (kept only in that visitor's browser tab), explains next steps, and links to things to do while they wait. Opened directly, it shows a generic thank-you.
- `reviews.html` — student reviews: three real YouTube case studies, a written-reviews wall, and a form students can use to submit a review
- `404.html` — branded not-found page. Netlify serves it automatically for any missing URL.
- `privacy.html`, `terms.html` — Privacy Policy and Terms of Use, linked in every footer and next to both forms

## Publishing a student review
Submitted reviews arrive in Netlify Forms under **student-review**. Only publish ones where the student ticked the permission box. To add one, copy the template inside `<div class="review-wall">` in `reviews.html`, fill it in, and paste it inside that div. The "being collected" placeholder hides itself as soon as the first review is there.

## Files
- `styles.css`, `script.js` — shared by every page
- `favicon.svg`, `assets/og-image.jpg` — tab icon and social share image
- `assets/photos/` — web-optimized photos used by the site
- `assets/originals/` — full-size original photos

## Netlify
Deploy the folder directly to Netlify. Two forms are included: **mentorship-application** (home page) and **student-review** (reviews page). The application form is configured with `data-netlify="true"` and appears in Netlify Forms after deployment and a first successful submission. Form submissions only work on Netlify; a local preview will show a "could not be sent" message.

For link previews on Facebook/iMessage, change the `og:image` meta tag in `index.html` to the full URL once the domain is known (for example `https://yourdomain.com/assets/og-image.jpg`).

## Application questions
The application has 8 steps: name, experience, market, biggest challenge, why mentorship, investment range, how they found ZTRADEZ, and contact details. The investment ranges ($1,000 / $2,500 / $5,000 breakpoints) are general; adjust them in `index.html` to fit the real price.

## Legal pages
The Privacy Policy and Terms describe exactly what the site does today (Netlify Forms, Google Fonts, click-to-load YouTube, session storage for the thank-you recap, no analytics). If analytics, a Meta pixel, email marketing or payments are added, update `privacy.html` to match. Contact currently points to Instagram and Discord; add a business email if you have one. These are plain-language templates, not legal advice.

## Important
The 500+ payouts, $1M+ student profits and 200+ students figures are labeled as reported figures until supporting proof is collected. Replace or remove any claim that ZTRADEZ cannot substantiate before publishing. The Globex status in the hero follows the standard Sunday–Friday schedule and does not account for exchange holidays.

## Discord notifications
`netlify/functions/submission-created.js` posts every verified application and review to Discord. In Netlify, set the environment variable `DISCORD_WEBHOOK_URL` to a Discord channel webhook (Server Settings → Integrations → Webhooks). Optionally set `DISCORD_REVIEWS_WEBHOOK_URL` to send reviews to a different channel. Redeploy after changing environment variables.
