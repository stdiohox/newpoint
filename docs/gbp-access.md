# Google Business Profile: getting access (owner steps)

Written for Samuel and Dr. Whitaker. Three things have to happen before the review
automation can run, and only the practice and Google can do the first two. Each is a
one-time step.

## 1. Add the practice's front-desk Google account as a Manager

Done by whoever owns the Newpoint listing on Google (usually Dr. Whitaker).

1. Sign in at https://business.google.com with the account that owns the listing.
2. Open the Newpoint Healthcare profile.
3. Go to **People and access** (in some layouts: the three-dot menu → **Business Profile
   settings** → **People and access**).
4. Click **Add**, enter `omanager167@gmail.com`, choose the role **Manager**, and send.
5. Open the omanager167 Gmail and accept the invitation.

Why Manager: Managers can read and reply to reviews, which is all the automation does.
It does not need Owner.

## 2. Ask Google to switch on the Business Profile API

Google keeps this API off until a business asks. Done by Samuel, from the Google account
that owns the **newpoint-marketing** Google Cloud project (the one used for Search Console).

1. Open https://console.cloud.google.com, select the project **newpoint-marketing**.
2. **APIs & Services → Library**: enable **My Business Account Management API**,
   **My Business Business Information API** and **Google My Business API**.
3. Fill in Google's access request form (search "Business Profile APIs access request" or
   go to https://developers.google.com/my-business/content/prereqs and follow "Request
   access"). Use these answers:
   - Business name: Newpoint Healthcare Services, LLC
   - Website: https://www.newpointnp.com
   - Google Cloud project: newpoint-marketing (the project id shown in the console)
   - Contact email: omanager167@gmail.com
   - Use case: "Single-location healthcare practice. We will read our own Google reviews
     into our staff CRM and post replies that a staff member has approved. One location,
     a few reviews a month, no resale, no third parties."
4. Google answers by email, usually within one to two weeks. Forward the answer to Koret.

## 3. One-time sign-in (Koret does this, after 1 and 2)

Koret creates an OAuth client in the same cloud project, signs in once as
omanager167@gmail.com to grant the practice's own project access to the listing, and
stores the resulting key in Trigger.dev. Google shows an "unverified app" warning during
that sign-in; that is expected for a private, single-business app and is clicked through.

After that: `GBP_OAUTH_CLIENT_ID`, `GBP_OAUTH_CLIENT_SECRET`, `GBP_OAUTH_REFRESH_TOKEN`,
`GBP_ACCOUNT_ID`, `GBP_LOCATION_ID` go into Trigger.dev production; `**/gbp/**` comes out
of `NOT_YET_LIVE` in `automation/trigger.marketing.config.ts`; deploy.

## What runs once it is live

- Every hour: new reviews are read in. Each unanswered one gets a drafted reply that
  passes the practice's reply rules (never implies the reviewer is a patient, names no
  one, repeats nothing from the review, no clinical words).
- Staff get an email and approve, edit or skip the reply at https://www.newpointnp.com/crm/reviews.
- Every 15 minutes: approved replies are posted. The rules are checked again first, and
  a reply someone already posted in Google is never overwritten.
- Nothing is ever posted without a staff decision.
