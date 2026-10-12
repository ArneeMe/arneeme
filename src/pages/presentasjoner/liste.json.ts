// Metadata for alle presentasjoner, brukt av skrivebordsappen. Bygges
// statisk sammen med resten av siden.
import { presentasjoner } from '../../presentasjoner/registry';

export function GET() {
  return new Response(JSON.stringify(presentasjoner), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
