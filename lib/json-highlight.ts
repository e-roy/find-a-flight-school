/**
 * Produce syntax-highlighted HTML for a JSON value, for the admin snapshot
 * inspector. Keys/strings/numbers/bools/null get distinct classes (pt-j*).
 * The input is escaped first, so the output is safe to inject.
 */
export function highlightJSON(obj: unknown): string {
  let s = JSON.stringify(obj, null, 2) ?? "null";
  s = s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  s = s.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g,
    (m) => {
      if (/^"/.test(m)) {
        if (/:$/.test(m)) {
          return (
            '<span class="pt-jkey">' +
            m.replace(/:$/, "") +
            '</span><span class="pt-jpunc">:</span>'
          );
        }
        return '<span class="pt-jstr">' + m + "</span>";
      }
      if (/true|false/.test(m)) return '<span class="pt-jbool">' + m + "</span>";
      if (/null/.test(m)) return '<span class="pt-jnull">' + m + "</span>";
      return '<span class="pt-jnum">' + m + "</span>";
    }
  );
  return s;
}
