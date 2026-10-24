# Edgewater with Blake Lineberger

New construction community website for Edgewater in Lancaster, South Carolina.

Public website: https://edgewater-living.vercel.app/

Static HTML, CSS, JavaScript and images. Vercel framework preset: Other; output directory: `.`; no build command.

Deployment workflow: push website changes to `main`, then check the Edgewater project in Vercel for the production deployment.

## Pageview counter

Installed October 24, 2026 (UTC). The footer counts successfully recorded page loads,
not people or unique visitors; reloads and bots can count. No historical traffic is
imported. Fragment navigation and back/forward-cache restores do not add a view.
JavaScript-disabled or failed requests may not count. The public counter is not an
abuse-proof analytics/audit system.

`GET /api/pageviews` reads without incrementing; open `/?counter=read` for monitoring.
Only a normal page load on `https://edgewater-living.vercel.app` sends a single POST.
Preview/other hosts read only. Failed reads display **Unavailable**, never zero.
There are no retries, since a timed-out increment may have succeeded upstream.

Persistence uses the free, credential-free Hits service through a Vercel function.
Visitor headers, cookies and identifiers are not forwarded to Hits; its public
namespace is dedicated to this site and installation. The service has no uptime
or durability guarantee. [Terms](https://hits.sh/terms/) ·
[Privacy](https://hits.sh/privacy/) · [Free service](https://hits.sh/faq/).
Do not change the namespace or installation date during routine deployments.
Tests use a separate `pageviews-verification-...` namespace; never seed production
with historical estimates or reuse another site's totals.
