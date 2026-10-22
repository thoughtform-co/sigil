/**
 * The pigeon's first task (2026-10-22): in Expo City's first run the keeper hands each student a parcel
 * with their assignment, Module 2 Worldbuilding (from the mood board, establish the world). Its words are
 * the course's own, copied from expo-city's src/data/course.json (modules[1], written by tools/course.mjs
 * from the plugin's module sheets): the module, its title and line, its steps and what done means.
 * The game reads it from GET /api/expo/me as `assignment`; once that module is posted it is null.
 */

export interface ExpoAssignment {
  module: number;
  title: string;
  line: string;
  steps: string[];
  done: string[];
}

/** The modules the pigeon hands out, in order; the first one not yet posted is the student's. */
export const ASSIGNMENTS: ExpoAssignment[] = [
  {
    "module": 2,
    "title": "Worldbuilding",
    "line": "Your world on one page.",
    "steps": [
      "Kies zelf twaalf tot twintig referenties (foto’s, films, plekken, voorwerpen, geen AI-beelden), bewaar ze in 01_Source en laat Claude er een bord van maken als artifact",
      "Vraag Claude wat je beelden gemeen hebben en welk beeld er niet tussen past, en pas je bord aan",
      "Schrijf je wereldbijbel: één pagina met wat in je wereld altijd klopt, wat er nooit in voorkomt, en welk licht, welke materialen, kleuren en stem erbij horen. Beschrijf wat je ziet (welk licht, van waar, op welk oppervlak) en gebruik geen stemmingswoorden zoals ‘dromerig’",
      "Geef je wereld een naam en controleer dat niemand anders ze al gebruikt",
      "Laat Claude van je wereldbijbel een skill maken (een set regels die Claude bij elke opdracht volgt), met minstens vijf checks. Elke check noemt iets wat in een beeld zichtbaar is",
      "Toon je bord zonder uitleg aan een medestudent en noteer woord voor woord hoe die je wereld beschrijft"
    ],
    "done": [
      "het bord twaalf tot twintig referenties telt, zonder AI-beelden",
      "de wereldbijbel één pagina is en de zes onderdelen bevat (altijd, nooit, licht, materialen, kleuren, stem)",
      "de skill minstens vijf checks telt die elk iets zichtbaars noemen",
      "de beschrijving van je medestudent genoteerd is"
    ]
  },
];

/** The assignment for a student whose posted modules are these. */
export function assignmentFor(posted: number[]): ExpoAssignment | null {
  return ASSIGNMENTS.find((a) => !posted.includes(a.module)) ?? null;
}
