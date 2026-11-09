/**
 * 主视口优化 (Viewport) — Host half of the `dsh-multimotion/viewport`
 * subpath plugin, mounted as the `multimotion-viewport` row.
 *
 * The browser half is the package's single shared Client bundle (`client.js`):
 * it contributes the "视口优化" Settings page and adds the offscreen-rendering
 * CSS to the same scoped stylesheet. This row gives the subpackage its own
 * Loader entry and its own display metadata under `./locale/*.json` and
 * `./icon`.
 */
export function apply() {}
