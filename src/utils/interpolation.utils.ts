function escapeValue(value: string): string {
  return `"${value.replace(/"/g, '\\""')}"`;
}

export function interpolateVariable(val: string | string[]) {
  if (Array.isArray(val) && val.length) {
    if (val.length > 1) {
      return `(${val.map(escapeValue).join(',')})`;
    } else {
      return escapeValue(val[0]);
    }
  }

  if (typeof val === 'string') {
    return escapeValue(val);
  }

  return `""`;
}
