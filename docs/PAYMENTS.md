# Payments: PayPal (built, off by default) and the options for Nepal

Status, October 2026. Payment rules change often, so check the linked pages before you sign anything.

## 1. Short answer

- **A business registered in Nepal cannot receive PayPal payments today.** Nepal is a send-only PayPal market:
  a Nepali account can pay for things, but it cannot receive money, and it cannot withdraw to a Nepali bank. Nepal
  Rastra Bank (NRB) has been working on PayPal access through a licensed local partner (talks include Fonepay). That
  work started in April 2026 and was still not live in October 2026, and no launch date has been announced.
- **PayPal Checkout has no setup fee and no monthly fee.** You pay only per sale (see section 3). It takes no Nepali
  rupees, so the site charges online payments in **US dollars**.
- **Recommendation:** most couples pay in Nepal. Use **Khalti or eSewa** (or a Fonepay QR) as the main way to pay,
  once Nimtto has a PAN and a business registration. Keep this PayPal integration for **family abroad**. Switch it on
  only if you have a legitimate PayPal business account in a country where PayPal can receive money (section 2). Until
  then, the site works exactly as before: people send a request, and you collect the money by hand.

## 2. Nepal: what is legitimate

| Option | What it takes | Notes |
|---|---|---|
| Nepali PayPal account | — | Send-only. It can't receive money, so it can't be used here. |
| PayPal Business in a supported country (for example a US LLC or a UK Ltd) | A real company there, with its tax ID, address, bank account and the owner's KYC | PayPal accepts this when the company really exists and the details are true. **Nepali law:** the Act Restricting Investment Abroad (1964) bars Nepali citizens and companies from investing abroad without approval. A 2025 amendment opened this only partly, mainly for IT companies, with NRB approval. Get a Nepali lawyer's or CA's opinion **before** you form a foreign company. |
| A relative or partner abroad who has a PayPal Business account | Their account, their tax filing | Legal only if it is truly their business, or they sell for you under a written agreement. Never borrow an account. |
| PayPal Payouts / Hyperwallet | — | These **send** money out of a business account. They don't help a Nepal merchant receive money. |
| Khalti + Stripe payment links (new, 2026) | A KYC-verified Khalti account. No company is needed. | International clients pay a link by card. You receive NPR in Khalti, minus a 2% fee and 5% TDS. You send the links by hand, so this isn't a checkout on the website. It is the easiest legal way to take money from abroad today. |
| Stripe | — | Stripe doesn't support businesses in Nepal (India is only in preview). |

Never: use a fake foreign address, use a VPN to sign up, or use someone else's identity. PayPal freezes the money and closes the account.

## 3. PayPal costs (US merchant account, PayPal's fee page updated 1 Oct 2026)

- No setup fee and no monthly fee. The sandbox is free.
- Per PayPal Checkout sale: **3.49% + USD 0.49**.
- Buyer in another country: **+1.50%**.
- Currency conversion, if you hold or withdraw in another currency: **3–4%** above the base rate.
- Example: a USD 49 sale from a buyer abroad pays about 4.99% + 0.49, so roughly **USD 2.94**, and you keep about USD 46.06.
- The currency list has no NPR, so prices are in USD. The Website module has an "Online price (USD)" for each plan.

## 4. Local alternatives

| | Merchant needs | Fees (indicative; ask for a quote) | API style |
|---|---|---|---|
| **Khalti** (web checkout, KPG-2) | Company or firm registration, PAN (VAT if required), a business bank account, KYC | Agreed per merchant, often around 2–3.5% | Server posts `/epayment/initiate/` with an `Authorization: Key …` secret, then redirects to `payment_url`. On return, verify with `/epayment/lookup/` (amount in paisa). A sandbox is at test-admin.khalti.com. |
| **eSewa** (ePay v2) | Company registration, PAN/VAT, tax clearance, KYM form | Agreed per merchant (about 1.75–3.5% reported) | A form POST signed with HMAC-SHA256, then a status-check API. There's a UAT environment. |
| **Fonepay** | Through your bank: a business account and KYC | Set by the bank | Mostly a dynamic QR. It works with almost every Nepali bank app and wallet. |
| **connectIPS** (NCHL) | Signed up through your bank | Fixed slabs: Rs 2 up to Rs 500, Rs 4 up to Rs 5,000, Rs 8 above (May 2025 schedule) | Bank account to bank account, using a token or signature API |

**Recommendation:** register Nimtto (sole proprietorship plus PAN) and apply to **Khalti** first. It has the best docs and
a sandbox, and its API is shaped like the PayPal code here, so a `server/lib/payments/khalti.js` can reuse
`checkout.js`. Add an eSewa or Fonepay QR next. Use PayPal only for buyers abroad, and only once section 2 is settled.

## 5. How the PayPal integration works

- **Off until four values are set:** `PAYPAL_ENV` (`sandbox` or `live`; unset means sandbox), `PAYPAL_CLIENT_ID`,
  `PAYPAL_CLIENT_SECRET` and `PAYPAL_WEBHOOK_ID`. They go in the server environment only. `server/.env.example`
  lists them with empty values. With any value missing, `/api/pay/config` says off: the website shows nothing new,
  and the pay routes answer 503 (the webhook answers 404).
- **Website:** the "Pay now · USD 49" choice appears only when PayPal is on, the visitor picked **Order a design**, and
  the plan has a USD price. "Send request, pay later" stays the default.
  1. **Continue to payment** first saves the request as usual (`POST /api/orders`). The response now includes `ref`.
     If the visitor leaves now, the request is still there.
  2. The PayPal JS SDK loads only at this point, then shows "Pay with PayPal" and "Debit or Credit Card".
  3. `createOrder` calls `POST /api/pay/paypal/order { ref }`. The server reads the plan's `usdPrice` from
     `site.json` (the browser never sends a price) and creates the PayPal order (intent CAPTURE, `custom_id = ref`).
  4. `onApprove` calls `POST /api/pay/paypal/capture { ref, orderID }`. The server captures and checks that the
     currency is USD, the amount matches what it asked for, the reference matches, and the status is COMPLETED. Then
     it records `payment` on the order (status `paid`, PayPal order and capture IDs, amount, payer email, time).
     A capture is never repeated for the same request, and a repeated call returns the saved result.
  5. The visitor sees a receipt with the reference, the amount and the PayPal transaction ID. If they cancel or
     something fails, they see a calm message, and "Pay later instead" stays available.
- **Webhook:** `POST /api/pay/paypal/webhook`.
  - Every event is checked with PayPal's `verify-webhook-signature`, using the exact received bytes.
  - Event IDs are remembered, so replays do nothing.
  - COMPLETED sets `paid`, and checks the amount again.
  - DENIED or DECLINED sets `denied`, but only if the payment wasn't paid yet.
  - REFUNDED or REVERSED sets `refunded` or `partially_refunded`. Duplicate refund IDs are ignored, and a late
    COMPLETED never flips a refund back.
  - PENDING sets `pending`.
  - CHECKOUT.ORDER.APPROVED: if the buyer approved and closed the tab, the server captures by itself.
- **Security:**
  - The public POSTs use the same Origin check as `/api/orders`, plus a honeypot, input validation and rate limits:
    20 creates and 30 captures per IP per 10 minutes. The webhook allows 120 per minute.
  - Logs never contain the secret, tokens or payer emails.
  - Only on `/` and only when PayPal is on, the CSP adds `https://*.paypal.com https://*.paypalobjects.com` to
    `script-src`, `connect-src`, `frame-src`, `img-src` and `style-src`. COOP becomes `same-origin-allow-popups`,
    which PayPal requires for its popup. The studio and the themes keep the strict policy.
- **Studio:**
  - Orders shows a badge on each order: Paid, Unpaid, Refunded, Part refunded, Pending at PayPal, Check payment or
    Declined. It also shows the PayPal details and links to the PayPal dashboard.
  - Website has an "Online price (USD)" field for each plan.
  - Settings has a Payments card: on or off, sandbox or live, which keys are set (never their values), and the
    webhook URL.
- **Code:** `server/lib/payments/paypal.js` (REST client, token cache), `checkout.js` (rules and idempotency),
  `routes.js` (Express and CSP); `server/test/paypal.test.js` (`npm test`, mocked PayPal);
  `server/scripts/paypal-sandbox-check.js` (real sandbox).

## 6. Setup, step by step (owner)

### 1. A PayPal developer account and sandbox test accounts

1. Go to https://developer.paypal.com and log in with the PayPal **business** account that will receive the money.
   That has to be an account from a supported country (section 2). For sandbox testing alone, any PayPal login works.
2. Open **Testing Tools → Sandbox Accounts**. PayPal creates two accounts automatically: a **Business** one
   (the seller) and a **Personal** one (the buyer). If they're missing, click **Create account** for each, with the
   country set to United States.
3. On the Personal account, click **⋯ → View/Edit account** and note its email and password. You'll use them to
   "pay" in the sandbox.

### 2. Sandbox client ID and secret

1. Go to **Apps & Credentials**, and make sure the toggle at the top says **Sandbox**.
2. Click **Create App**. Name it `Nimtto`, choose type **Merchant**, and pick the sandbox Business account.
3. Copy the **Client ID** and the **Secret** (click **Show**). Keep the secret private, and never put it in Git
   or in a chat.

### 3. The webhook

1. In the same app, under **Webhooks**, click **Add Webhook**.
2. Webhook URL: `https://nimtto.com/api/pay/paypal/webhook`
3. Events: tick `Payment capture completed`, `Payment capture denied`, `Payment capture pending`,
   `Payment capture refunded`, `Payment capture reversed` and `Checkout order approved`. Then **Save**.
4. Copy the **Webhook ID** shown next to the URL (letters and digits, like `8PT597110X687430LKGECATA`).
5. Cloudflare sits in front of nimtto.com. If PayPal's webhook log later shows 403s, add a Cloudflare WAF rule that
   skips the bot checks for the path `/api/pay/paypal/webhook`. The signature check protects it.

### 4. The keys in Coolify, then redeploy

1. Coolify → project **Nimtto** → app **nimtto** → **Environment Variables**. Add these four, as runtime variables
   (not build variables):
   ```
   PAYPAL_ENV=sandbox
   PAYPAL_CLIENT_ID=<sandbox client id>
   PAYPAL_CLIENT_SECRET=<sandbox secret>
   PAYPAL_WEBHOOK_ID=<webhook id>
   ```
   (When you change a variable through Coolify's API, always send the value. A PATCH without a value blanks it.)
2. Click **Redeploy**. Pushing to GitHub alone does not deploy.
3. Check it: Studio → **Settings & help → Payments** should say "PayPal on · Sandbox (test money)", with Client ID,
   Secret and Webhook ID all **Set**.
4. Studio → **Website**: give at least one plan an **Online price (USD)**, then **Save changes**.

### 5. Test a sandbox payment

1. Open https://nimtto.com/#order. Choose **Order a design**, fill in a name and phone, and pick the plan with a USD
   price.
2. Choose **Pay now** → **Continue to payment** → **Pay with PayPal**. Log in with the sandbox **Personal** account,
   then pay.
3. You should see "Thank you. Your payment is received." with a reference and a PayPal transaction ID.
4. Studio → **Orders**: the request shows **Paid · USD 49.00**, with the payer and the PayPal IDs.
5. Refund test: https://www.sandbox.paypal.com → log in with the sandbox **Business** account → find the payment
   → **Refund**. Within a minute or so, the order shows **Refunded**, through the webhook.
6. A script can check it too. From `server/`, with the same sandbox values set in your local environment, run
   `npm run paypal:check` (PayPal directly, USD 1.00), or `npm run paypal:check -- --site https://nimtto.com --plan premium`
   (through the live site's API). It prints a sandbox link to approve, then captures, checks the result, and checks
   the webhook's URL and events.
7. Run the automated tests with `npm test`. They use a mocked PayPal, with no keys needed.

### 6. Switch to live (real money)

1. Only once the business account is in order (section 2). In developer.paypal.com, flip the toggle to **Live** →
   **Create App** → copy the **live** Client ID and Secret.
2. Add the same webhook in the **live** app, with the same URL and events, and copy its live Webhook ID.
3. In Coolify, set `PAYPAL_ENV=live` and the three live values, then **Redeploy**.
4. Settings → Payments should now say "PayPal on · Live (real money)", and the "Test mode" note disappears from
   the website.
5. Make one real USD 1 test: temporarily set a plan's online price to 1, pay it, then refund it from paypal.com,
   then set the price back.
6. Remind yourself: run `~/.claude/templates/SECURITY-CHECKLIST.md` before calling it done.

To switch PayPal off, remove `PAYPAL_CLIENT_ID` (or any of the four) and redeploy. Online payment disappears from the
site, and requests keep working.

## Sources

- PayPal merchant fees (US, updated 1 Oct 2026): https://www.paypal.com/us/business/paypal-business-fees
- PayPal currency codes (no NPR): https://developer.paypal.com/reference/currency-codes/
- PayPal JS SDK CSP and COOP: https://developer.paypal.com/sdk/js/csp/
- PayPal webhooks API (verify-webhook-signature): https://developer.paypal.com/docs/api/webhooks/v1/
- PayPal webhook event names: https://developer.paypal.com/api/rest/webhooks/event-names/
- Send-only countries (PayPal help): https://www.paypal.com/va/cshelp/article/why-does-my-paypal-account-have-only-send-capabilities-help1027
- NRB and PayPal integration status (Apr 2026, updated Oct 2026): https://hamrobichar.com/article/paypal-integration-in-nepal-nrb-moves-forward-to-enable-global-payments
- PayPal in Nepal 2026 (blogs, for context): https://bankratenepal.com/which-banks-support-paypal-in-nepal/ · https://merokalam.com/blog/paypal-account-in-nepal/
- Act Restricting Investment Abroad, 1964: https://lawcommission.gov.np/content/13402/restriction-act--2021/ · 2025 changes: https://lawbhandari.com/publication/nepal-opens-door-for-investment-in-abroad · https://pioneerlaw.com/?p=1470
- Stripe supported countries: https://stripe.com/global
- Khalti + Stripe international payments FAQ: https://blog.khalti.com/offers/frequently-asked-questions-receive-international-payments-directly-in-your-khalti-wallet-via-stripe/
- Khalti web checkout docs: https://docs.khalti.com/khalti-epayment/
- eSewa merchant onboarding: https://blog.esewa.com.np/esewa-merchant-api-payment-gateway-integration
- connectIPS fees (NCHL, May 2025): https://nepali.nchl.com.np/wp-content/uploads/2025/05/connectIPS-fee-and-charges_Updated_30-May-2025.pdf
- Nepali wallet comparisons (indicative fees): https://saauzi.com/blog/articles/esewa-vs-khalti-vs-fonepay-vs-ime-pay-the-2026-guide-to-choosing-a-digital-walle/ · https://paymentproviders.io/compare/ozow-vs-esewa
