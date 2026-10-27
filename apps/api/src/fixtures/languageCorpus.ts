export type LanguageCorpusEntry = {
  code: string
  name: string
  text: string
}

export const languageCorpus: LanguageCorpusEntry[] = [
  {
    code: 'bul',
    name: 'Bulgarian',
    text: 'Това е примерен текст на български език. България има богата история и култура.',
  },
  {
    code: 'bul',
    name: 'Bulgarian',
    text: 'Времето днес е приятно и слънчево, затова много хора се разхождат в парка след работа.',
  },
  {
    code: 'bul',
    name: 'Bulgarian',
    text: 'Когато четем внимателно, забелязваме малките подробности, които правят един разказ интересен и запомнящ се.',
  },
  {
    code: 'rus',
    name: 'Russian',
    text: 'Это пример текста на русском языке. Россия имеет богатую историю и культуру.',
  },
  {
    code: 'rus',
    name: 'Russian',
    text: 'Сегодня стоит хорошая погода, поэтому многие люди гуляют в парке после работы.',
  },
  {
    code: 'rus',
    name: 'Russian',
    text: 'Внимательное чтение помогает заметить детали, которые делают рассказ интересным и запоминающимся.',
  },
  {
    code: 'ukr',
    name: 'Ukrainian',
    text: 'Це приклад тексту українською мовою. Україна має багату історію та культуру.',
  },
  {
    code: 'ukr',
    name: 'Ukrainian',
    text: 'Сьогодні чудова погода, тому багато людей гуляють у парку після роботи.',
  },
  {
    code: 'ukr',
    name: 'Ukrainian',
    text: 'Уважне читання допомагає помітити деталі, які роблять розповідь цікавою та незабутньою.',
  },
  {
    code: 'srp',
    name: 'Serbian',
    text: 'Ово је пример текста на српском језику. Србија има богату историју и културу.',
  },
  {
    code: 'srp',
    name: 'Serbian',
    text: 'Данас је време лепо, па многи људи после посла шетају у парку.',
  },
  {
    code: 'mkd',
    name: 'Macedonian',
    text: 'Ова е пример на текст на македонски јазик. Македонија има богата историја и култура. ќе продолжим со нови примери.',
  },
  {
    code: 'mkd',
    name: 'Macedonian',
    text: 'Денес времето е убаво, па многу луѓе се прошетуваат во паркот по работа.',
  },
  {
    code: 'eng',
    name: 'English',
    text: 'The quick brown fox jumps over the lazy dog. This sentence is written in English and contains common words used in everyday communication.',
  },
  {
    code: 'eng',
    name: 'English',
    text: 'The weather is pleasant today, so many people are walking through the park after work.',
  },
  {
    code: 'eng',
    name: 'English',
    text: 'Careful reading helps us notice the details that make a story interesting and memorable.',
  },
  {
    code: 'deu',
    name: 'German',
    text: 'Dies ist ein Beispieltext in deutscher Sprache. Deutschland hat eine lange Geschichte und vielfältige Kultur.',
  },
  {
    code: 'deu',
    name: 'German',
    text: 'Heute ist das Wetter angenehm, deshalb gehen viele Menschen nach der Arbeit im Park spazieren.',
  },
  {
    code: 'deu',
    name: 'German',
    text: 'Aufmerksames Lesen hilft uns, die Einzelheiten zu erkennen, die eine Geschichte interessant machen.',
  },
  {
    code: 'fra',
    name: 'French',
    text: 'Ceci est un paragraphe représentatif en français. Le détecteur doit identifier cette langue.',
  },
  {
    code: 'fra',
    name: 'French',
    text: 'Le temps est agréable aujourd’hui, alors beaucoup de personnes se promènent dans le parc après le travail.',
  },
  {
    code: 'fra',
    name: 'French',
    text: 'Une lecture attentive permet de remarquer les détails qui rendent une histoire intéressante et mémorable.',
  },
  {
    code: 'spa',
    name: 'Spanish',
    text: 'Este es un texto de ejemplo en español. España tiene una historia rica y una cultura diversa.',
  },
  {
    code: 'spa',
    name: 'Spanish',
    text: 'Hoy hace buen tiempo, por eso muchas personas pasean por el parque después del trabajo.',
  },
  {
    code: 'spa',
    name: 'Spanish',
    text: 'La lectura atenta nos ayuda a notar los detalles que hacen que una historia sea interesante y memorable.',
  },
]

export const languageEdgeCases = [
  { name: 'punctuation only', text: '!?.;,::---***' },
  { name: 'numbers only', text: '1234567890 2026 10 27' },
  { name: 'emoji only', text: '😀🧩🚀🌈🎉🪐🎵🍂🧠🫶' },
  { name: 'whitespace only', text: ' \t\r\n\u00a0\u2003 ' },
  {
    name: 'mixed Latin and Cyrillic',
    text: 'This is a sufficiently long English sentence for testing. Това е достатъчно дълъг български текст за проверка.',
  },
]
