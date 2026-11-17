# Weather and place-search API research

Research for [Research free weather and place-search APIs](https://github.com/grumm1728/weather-vid/issues/2). Reviewed 2026-11-17. Provider terms and prices can change; confirm them before release. This is a comparison, not a provider decision.

## Candidates

### Open-Meteo: weather and geocoding

- The forecast API supports coordinates, current WMO weather codes, day/night, precipitation, cloud cover and wind. Its current conditions come from 15-minute weather model data, not necessarily direct local observations. [Forecast API](https://open-meteo.com/en/docs)
- Its global GeoNames-based search accepts place names and postal codes, returns coordinates and administrative context, and supports prefix matching from three characters. Its documentation credits GeoNames. Dedicated landmark coordinates can be configured separately; verify search coverage and attribution for the intended UI. [Geocoding API](https://open-meteo.com/en/docs/geocoding-api)
- The free hosted service requires no key for non-commercial use. The published terms specify fewer than 10,000 calls/day, 5,000/hour and 600/minute, with limits applied by IP and application; shared hosting including Vercel can be limited sooner. Sites with advertisements, subscriptions or promotional activity are examples of commercial use. Weather data is CC BY 4.0 and requires attribution. [Terms](https://open-meteo.com/en/terms), [service overview](https://open-meteo.com/)
- This is a strong low-friction candidate if the intended website qualifies as non-commercial. Confirm the status of sfxmath.com, attribution placement and actual request patterns before choosing it. The distinction between the data license and hosted service terms matters.

### OpenWeather: weather and geocoding

- OpenWeather's current weather endpoint accepts coordinates, reports conditions, clouds, wind, and day-related timestamps where available, and requires an account API key. Its separate geocoding API covers city names and administrative areas. [Current weather](https://openweathermap.org/api/current), [API overview](https://openweathermap.org/api)
- The published free tier lists current weather and geocoding with 60 calls/minute and 1,000,000 calls/month; limits aggregate account usage. [Pricing](https://openweathermap.org/price), [API key guidance](https://openweathermap.org/appid)
- The provider's [license explainer](https://openweathermap.org/storage/app/media/documents/License_explainer_25_Feb_25.pdf) describes attribution and share-alike obligations for its open license, including derivative applications. Review the applicable current license carefully for this project's intended distribution; the free tier should not be treated as obligation-free.
- This is a candidate when its account, key and license fit the project. The provider recommends no more than one weather call per location every 10 minutes. [API guidance](https://openweathermap.org/appid)

### Public OpenStreetMap Nominatim: place search only

- The public Nominatim service has an absolute application-wide limit of one request per second, requires identifying requests and attribution, and **forbids autocomplete**. Its policy also requires applications to be able to switch services and describes caching/proxy expectations. It is not suitable as a drop-in keystroke autocomplete service. [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/)
- The policy specifically requires LLMs suggesting this service to prominently state its restrictions and requires a deliberate, informed developer decision. The policy applies to the public OSMF endpoint, not every hosted or self-hosted Nominatim instance.

## Browser and deployment checks

- All options need an HTTPS and browser cross-origin test against the exact endpoints and intended sfxmath.com origin; API documentation reviewed here does not establish a durable CORS guarantee for every endpoint. Do not assume a proxy is necessary or unnecessary until verified.
- A browser-visible API key is not secret. If an account key is used, evaluate provider-supported restrictions and a server-side proxy/cache, quotas, and abuse controls. A proxy can concentrate traffic behind shared IP addresses, which Open-Meteo explicitly warns may affect its free limits.
- Estimate load across all visitors, not a single device. At a 15-minute refresh, one continuously open page makes 96 weather calls/day, excluding searches and retries. Define caching, backoff, stale-data behavior and attribution visibility before release.
- Search queries and weather coordinates are sent to the selected provider. Avoid silently requesting browser geolocation; the proposed typed search does not require it.

## Follow-up decision

Compare non-commercial eligibility, license obligations, searchable location coverage and the real browser test. Choose the provider and fallback in [Choose the weather and location data approach](https://github.com/grumm1728/weather-vid/issues/6); preserve attribution even when weather details are collapsed.
