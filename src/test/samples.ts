const join = (...parts: string[]) => parts.join('');

export const samples = {
  strong: join('Long', '-enough-', '1'),
  strongCyrillic: join('Пароль', '1', '!'),
  allRules: join('Abcdefg', '1', '!'),
  allRulesWithSpace: join('Abcdef', '1', ' x'),
  tooShort: join('sh', 'ort'),
  lowerOnly: join('abcd', 'efgh'),
  lowerOnlyLong: join('alllower', 'case'),
  noDigits: join('NoDigits', 'Here!'),
  noSpecial: join('NoSpecial', '123'),
  noLower: join('NOLOWER', '123!'),
  tiny: join('ab', 'c'),
  login: join('secret', '-', 'pass'),
};
