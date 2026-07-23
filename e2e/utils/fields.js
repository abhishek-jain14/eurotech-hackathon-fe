/**
 * Every form field in this app is `<div class="fld"><label>Text</label><input/></div>`
 * with the label as a plain sibling (no htmlFor/id, no wrapping) - so Playwright's
 * getByLabel() can't resolve them. This locates the field's ".fld" container by its
 * label text and returns the control inside it.
 */
export function fieldByLabel(page, labelText, tag = 'input') {
  return page.locator('div.fld').filter({ hasText: labelText }).locator(tag);
}

export function cardByTitle(page, titleText) {
  return page.locator('.card').filter({ has: page.locator('.card-title', { hasText: titleText }) });
}
