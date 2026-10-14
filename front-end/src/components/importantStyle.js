const cache = new Map();
const kebab = (prop) => prop.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
const unit = (prop, value) => (typeof value === 'number' && !/^(opacity|zIndex|fontWeight|lineHeight|flex)$/.test(prop) ? `${value}px` : String(value));

/**
 * Some original markup used inline `!important` declarations (e.g. `background: … !important`)
 * to win over the shared stylesheets. React's `style` prop cannot express `!important`, so this
 * returns a ref callback that applies the declarations with "important" priority.
 *
 *   <div ref={important({ background: 'linear-gradient(...)', padding: '24px' })}>
 */
export function important(styles) {
    const key = JSON.stringify(styles);
    if (!cache.has(key)) {
        cache.set(key, (el) => {
            if (!el) return;
            Object.entries(styles).forEach(([prop, value]) => el.style.setProperty(kebab(prop), unit(prop, value), 'important'));
        });
    }
    return cache.get(key);
}
