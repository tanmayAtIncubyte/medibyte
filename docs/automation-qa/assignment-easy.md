# MediByte — Automation QA Assignment (1–3 years experience)

> For assessment use only — MediByte is a sample online pharmacy, not a real
> service. No real orders are placed and no real data is involved.

## About the app

MediByte is an online pharmacy storefront. Customers can browse a catalog of
over-the-counter (OTC) and prescription (Rx) products, search and filter the
catalog, add items to a cart, apply promo codes, check out with a shipping
address, and review their past orders and account details.

### Over-the-counter (OTC) vs prescription (Rx)

Pharmacies sell two kinds of product, and the distinction may come up as you
explore the app:

- **Over-the-counter (OTC)** — everyday medicines and health products anyone
  can buy without a doctor's authorization: pain relievers, vitamins,
  antacids, allergy tablets, first-aid supplies, and the like. In a store like
  this they behave like ordinary retail items — you pick them and buy them.
- **Prescription (Rx)** — medicines that legally require a valid prescription
  from a licensed prescriber before they can be dispensed. A pharmacy is
  expected to treat them differently from OTC items: it should establish that
  a prescription exists, and it handles the associated patient/health
  information as sensitive data.

Every product in the catalog is labelled as either OTC or Rx.

## Your task

Automate the following user journey through the storefront:

1. Log in.
2. On the products page, search for a product by name and confirm the
   results match the search term.
3. Narrow the results using the category filter.
4. Sort the product list by price and confirm the order changes accordingly.
5. Open a product's detail page and add it to the cart.
6. Go to the cart page and verify the cart's contents and total are correct
   (the line price times its quantity matches the line total, and the
   subtotal matches the sum of all line totals).

You do not need to touch any other part of the app — this journey is your
complete scope.

### Requirements

- **BDD is required.** Write your scenarios in Given/When/Then form (e.g.
  Cucumber, SpecFlow, Behave, or an equivalent for your language/tool of
  choice) before or alongside the automation code.
- **Tool choice is free**, but Selenium, Playwright, or Cypress are
  preferred.
- **Test reporting is required.** Your suite must produce a report artifact
  (HTML report, Allure report, or similar) that a reviewer can open after a
  run to see which scenarios passed or failed.
- **The suite must run on any machine.** Provide explicit setup and run
  instructions (e.g. a `README`) that let a reviewer clone your repository,
  install dependencies, and run the suite without editing any file paths,
  URLs, or credentials in your code. Any environment-specific value (base
  URL, login credentials) must be supplied via a config file, environment
  variable, or command-line argument documented in your instructions — never
  hardcoded to one machine's file system.

### The DevTools Network tab is fair game

The app makes real API calls. You're welcome to open your browser's
developer tools and inspect the **Network** tab (and the **Application** /
storage tabs, and the **Console**) while you build your automation, if that
helps you understand the app's behavior.

## Test data

Sign in with this account. It comes with saved account data and order
history so the app has content to work with.

| Email                 | Password    |
| ---------------------- | ----------- |
| `steve@example.test`  | `steve1234` |

There is no self-registration for this assessment — always use this account.

Submit your automation project (source code, BDD feature files, and a
generated test report from a run) along with a short note on any assumptions
you made or issues you noticed along the way. The clarity and structure of
your project is part of what we assess, alongside whether the suite runs
successfully on our end.
