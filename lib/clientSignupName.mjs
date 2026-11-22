// Ver-0.063A: validate customer identity on the server, not only in the popup.
function namePart(value, label) {
  if (typeof value !== 'string') throw new Error(`Enter your ${label}.`);
  const name = value.trim().replace(/\s+/g, ' ');
  if (name.length < 1 || name.length > 70 || !/^[\p{L}\p{M}][\p{L}\p{M}\p{Zs}'’.-]*$/u.test(name)) {
    throw new Error(`Enter a valid ${label} (up to 70 characters).`);
  }
  return name;
}
export function normaliseSignupName(firstName, surname) {
  const first = namePart(firstName, 'first name');
  const last = namePart(surname, 'surname');
  return `${first} ${last}`;
}
