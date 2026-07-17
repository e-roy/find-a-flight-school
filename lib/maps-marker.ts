/**
 * DOM content builders for google.maps.marker.AdvancedMarkerElement (the
 * replacement for the deprecated google.maps.Marker + Symbol icons).
 */

/**
 * Filled circle equivalent to the legacy SymbolPath.CIRCLE icon. Advanced
 * markers anchor their content at bottom-center, so shift down half the height
 * to center the circle on the coordinate like the legacy Symbol did.
 */
export function circleMarkerElement(
  color: string,
  diameter: number
): HTMLDivElement {
  const el = document.createElement("div");
  el.style.width = `${diameter}px`;
  el.style.height = `${diameter}px`;
  el.style.borderRadius = "50%";
  el.style.background = color;
  el.style.border = "2px solid #ffffff";
  el.style.boxSizing = "border-box";
  el.style.transform = "translateY(50%)";
  return el;
}
