# MediByte — QA Assessment Brief

> For assessment use only — MediByte is a sample online pharmacy, not a real
> service. No real orders are placed and no real data is involved.

## About the app

MediByte is an online pharmacy storefront. Customers can browse a catalog of
over-the-counter (OTC) and prescription (Rx) products, search and filter the
catalog, add items to a cart, apply promo codes, check out with a shipping
address, and review their past orders and account details.

You will explore the running app at the URL provided to you by your reviewer.

## Your task

Explore MediByte as a customer and **find and report as many defects as you
can**. Treat it like a real product you've been asked to sign off on. Defects
can fall into any of these areas — look across all of them:

- **Functional** — features that produce wrong results or behave incorrectly
  (calculations, totals, search, filtering, sorting, pagination, cart, checkout,
  stock/availability, validation).
- **Accessibility** — issues for keyboard and screen-reader users, color
  contrast, missing labels, focus handling. (Running an automated a11y checker
  such as axe or Lighthouse alongside manual testing is encouraged.)
- **Performance** — slow responses, missing loading feedback, redundant or
  oversized network requests, caching behavior.
- **Security** — anything that exposes data you shouldn't see, trusts the client
  where it shouldn't, or weakens how the app protects accounts and data.
- **UI** — visual and interaction problems (misleading controls, missing
  feedback, destructive actions without safeguards).
- **UX** — confusing or frustrating flows, surprise behavior, lost work, unclear
  errors or confirmations.

Write up **test cases** for the areas you cover and clear **bug reports** for the
defects you find.

### The DevTools Network tab is fair game

The app makes real API calls. You are expected and encouraged to open your
browser's developer tools and inspect the **Network** tab (and the
**Application** / storage tabs, and the **Console**) while you test. Request and
response payloads, status codes, headers, timings, and what gets stored in the
browser are all legitimate things to examine and report on.

## Test data

### Customer accounts

Sign in at `/login` with either of these customer accounts. Both come with some
saved account data (addresses, insurance) and order history so the relevant
flows have content to work with.

| Email              | Password   |
| ------------------ | ---------- |
| `dana@example.test`  | `dana1234` |
| `omar@example.test`  | `omar1234` |

You may also **register a brand-new account** at `/register` and test as a fresh
customer if you prefer.

### Promo codes

These promo codes can be applied in the cart while you test. They are provided as
test data — use them to exercise the discount and checkout flows.

| Code         | What it offers          | Minimum order | Notes                       |
| ------------ | ----------------------- | ------------- | --------------------------- |
| `SAVE10`     | 10% off your order      | none          |                             |
| `WELCOME5`   | $5 off your order       | $25           | only applies at $25+        |
| `WELLNESS15` | 15% off your order      | $40           | only applies at $40+        |
| `MEGA50`     | $50 off your order      | none          |                             |
| `SPRING2023` | 20% off (spring promo)  | none          | expired on 2023-05-31       |

## How to report a defect

A good bug report lets your reviewer reproduce the issue without guessing. For
each defect, include:

- **Title** — a short, specific summary.
- **Area** — functional / accessibility / performance / security / UI / UX.
- **Steps to reproduce** — numbered, starting from a known state (e.g. "signed in
  as `dana@example.test`, on `/cart` with 2 items").
- **Expected result** — what a correct app should do.
- **Actual result** — what actually happens (include the on-screen value, the
  Network request/response, the console error, or the a11y finding that shows
  it).
- **Evidence** — a screenshot, a copied value, or the relevant Network entry
  where it helps.

Quality and clarity matter more than raw count. A few well-documented,
reproducible reports are worth more than a long list of vague ones.
