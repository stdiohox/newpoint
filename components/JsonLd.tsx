/**
 * Renders schema.org blocks. Server component: the JSON is serialised at build
 * time and ships in the static HTML, which is the only form crawlers reliably read.
 */
export function JsonLd({ schemas }: { schemas: object[] }) {
  return (
    <>
      {schemas.map((schema, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serialize(schema) }}
        />
      ))}
    </>
  );
}

/**
 * JSON.stringify does not escape `<`, so a literal `</script>` anywhere in the
 * copy would close this tag early. Nothing in lib/content.ts contains one
 * today, but that is an invariant a future editor cannot be expected to know
 * they are holding — especially given how much of the content layer is
 * scaffolded for client hand-off. Escaping it costs one pass.
 */
function serialize(schema: object) {
  return JSON.stringify(schema).replace(/</g, '\\u003c');
}
