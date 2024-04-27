export function getTheme(userPreference) {
  if (userPreference === 'light') {
    return 'light';
  }
  if (userPreference === 'dark') {
    return 'dark';
  }
  // system
  if (matchMedia('(prefers-color-scheme: light)').matches) {
    return 'light';
  }
  return 'dark';
}

export class CustomStyles {
  #styles = [];

  constructor(styles) {
    const customStyles = [];
    if (styles?.height !== '400px') {
      customStyles.push(`height: ${styles?.height}`);
    }
    if (styles?.color) {
      customStyles.push(`--base: ${styles?.color}`);
    }

    this.#styles.push(customStyles);
  }

  get toCss() {
    return this.#styles.join('; ');
  }
}
