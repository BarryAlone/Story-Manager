const RELATION_TYPES = ['Przyjaciel', 'Mentor', 'Rywal', 'Rodzina', 'Sojusznik'];
const FIRST_NAMES = [
  'Ada', 'Borys', 'Celina', 'Dorian', 'Eliza', 'Feliks', 'Gaja', 'Hubert', 'Irena', 'Jan',
];
const LAST_NAMES = [
  'Arden', 'Brzoza', 'Cichy', 'Dębski', 'Eland', 'Frost', 'Górski', 'Heller', 'Iskra', 'Jasny',
  'Kruk', 'Lis', 'Morski', 'Nocny', 'Orlik', 'Polny', 'Rudy', 'Sarna', 'Turner', 'Wrona',
];
const GROUPS = ['Bohaterowie', 'Antagoniści', 'Sojusznicy', 'Niezależni'];

const SCENARIOS = {
  '100-sparse': { nodeCount: 100, offsets: [1] },
  '100-dense': { nodeCount: 100, offsets: [1, 3, 7, 13, 29] },
  '200-sparse': { nodeCount: 200, offsets: [1] },
  '200-dense': { nodeCount: 200, offsets: [1, 3, 7, 13, 29] },
};

export function createRelationshipGraphScenario(key) {
  const scenario = SCENARIOS[key];
  if (!scenario) return null;

  const characters = Array.from({ length: scenario.nodeCount }, (_, index) => ({
    id: index + 1,
    name: `${FIRST_NAMES[index % FIRST_NAMES.length]} ${LAST_NAMES[index % LAST_NAMES.length]} ${index + 1}`,
    group_name: index % 9 === 0 ? null : GROUPS[index % GROUPS.length],
    description: `Deterministyczna postać testowa ${index + 1}.`,
    character_image: null,
  }));
  let relationshipId = 1;
  const relationships = scenario.offsets.flatMap((offset, offsetIndex) => characters.map((character, index) => ({
    id: `test-${key}-${relationshipId++}`,
    character_1_id: character.id,
    character_2_id: characters[(index + offset) % scenario.nodeCount].id,
    relation_name: RELATION_TYPES[(index + offsetIndex) % RELATION_TYPES.length],
  })));

  return { characters, relationships };
}
