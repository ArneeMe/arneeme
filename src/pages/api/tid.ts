// Nåtid for lesebrettets klokke: sekunder siden 1970 (UTC) som ren tekst.
// WaddleOS har ikke automatisk NTP og stiller klokka herfra når Hjem henter vær og nyheter.
export const prerender = false;

export const GET = () =>
  new Response(String(Math.floor(Date.now() / 1000)), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
  });
