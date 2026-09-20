// Renders one or more JSON-LD objects as <script type="application/
// ld+json"> tags, server-side, with no client JS involved. "<" is
// escaped so a car name or description containing "</script>" (or
// anything else that looks like a tag) can't break out of the script
// element — the JSON itself is unaffected, since < is just "<"
// to a JSON parser.
export default function JsonLd({
  data,
}: {
  data: Record<string, unknown> | Record<string, unknown>[];
}) {
  const items = Array.isArray(data) ? data : [data];

  return (
    <>
      {items.map((item, index) => (
        <script
          key={index}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(item).replace(/</g, "\\u003c"),
          }}
        />
      ))}
    </>
  );
}
