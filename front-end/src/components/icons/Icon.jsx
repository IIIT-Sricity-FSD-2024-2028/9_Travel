import { createElement } from 'react';
import ICONS from './iconData';

// Same key resolution the original icons.js Proxy performed:
// exact key → lower-cased key without "-" / "_" → empty.
export function resolveIcon(name) {
  if (!name) return null;
  if (ICONS[name]) return ICONS[name];
  const normalized = String(name).toLowerCase().replace(/[-_]/g, '');
  return ICONS[normalized] || null;
}

function renderNode(node, key) {
  const [tag, attrs, children] = node;
  return createElement(tag, { ...attrs, key }, children.map((child, i) => renderNode(child, i)));
}

/**
 * Renders the original `<i data-icon="name">` markup with the SVG inside,
 * so all existing CSS selectors (`[data-icon]`, `i svg`, …) keep working.
 */
export default function Icon({ name, className, style, title }) {
  const data = resolveIcon(name);
  return (
    <i data-icon={name} className={className} style={style} title={title}>
      {data ? renderNode(data, 0) : null}
    </i>
  );
}
