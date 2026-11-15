/**
 * Pure, in-memory fixtures for the S132 SillyTavern card/lorebook tests.
 *
 * Deliberately dependency-free: no shared types, no domain entities and no
 * filesystem. Tests import these builders and keep the payloads small.
 */

export type FixtureRecord = Record<string, unknown>

export const buildCard = (
  spec: "chara_card_v2" | "chara_card_v3",
  data: FixtureRecord = {},
  root: FixtureRecord = {}
): FixtureRecord => ({
  spec,
  spec_version: spec === "chara_card_v2" ? "2.0" : "3.0",
  data: {
    name: "Lyra",
    description: "A guardian of the forest.",
    personality: "Brave and kind.",
    scenario: "An ancient forest.",
    first_mes: "Hello, traveler.",
    mes_example: "<START>\n{{char}}: Welcome.",
    system_prompt: "You are Lyra.",
    post_history_instructions: "Stay in character.",
    alternate_greetings: ["Greetings, traveler."],
    creator_notes: "Never sent to the model.",
    tags: ["fantasy", "guardian"],
    creator: "Card Author",
    character_version: "1.2.0",
    extensions: { rm: { tagline: "The forest's guardian" } },
    ...data,
  },
  ...root,
})

export const buildV2Card = (
  data: FixtureRecord = {},
  root: FixtureRecord = {}
): FixtureRecord => buildCard("chara_card_v2", data, root)

export const buildV3Card = (
  data: FixtureRecord = {},
  root: FixtureRecord = {}
): FixtureRecord =>
  buildCard(
    "chara_card_v3",
    { character_book: buildLorebookCCv3().data, ...data },
    root
  )

export const buildV1Card = (overrides: FixtureRecord = {}): FixtureRecord => ({
  name: "Lyra",
  description: "A guardian of the forest.",
  personality: "Brave and kind.",
  scenario: "An ancient forest.",
  first_mes: "Hello, traveler.",
  mes_example: "<START>\n{{char}}: Welcome.",
  ...overrides,
})

export const buildCCv3Entry = (overrides: FixtureRecord = {}): FixtureRecord => ({
  keys: ["dragon"],
  secondary_keys: [],
  content: "Dragons dwell in the northern mountains.",
  comment: "Dragon lore",
  constant: false,
  selective: false,
  selectiveLogic: 0,
  insertion_order: 100,
  position: "after_char",
  priority: 0,
  enabled: true,
  case_sensitive: false,
  whole_words: false,
  extensions: {},
  ...overrides,
})

export const buildStNativeEntry = (overrides: FixtureRecord = {}): FixtureRecord => ({
  uid: 1,
  key: ["dragon"],
  keysecondary: [],
  comment: "Dragon lore",
  content: "Dragons dwell in the northern mountains.",
  constant: false,
  selective: false,
  selectiveLogic: 0,
  order: 100,
  position: 1,
  disable: false,
  caseSensitive: false,
  matchWholeWords: false,
  ...overrides,
})

export const buildLorebookCCv3 = (
  entries: FixtureRecord[] = [buildCCv3Entry()],
  data: FixtureRecord = {}
): FixtureRecord => ({
  spec: "lorebook_v3",
  data: {
    name: "Forest lore",
    description: "Facts about the forest",
    scan_depth: 4,
    token_budget: 400,
    recursive_scanning: false,
    extensions: {},
    ...data,
    entries,
  },
})

export const buildLorebookStNativeObject = (
  entries: FixtureRecord[] = [buildStNativeEntry()]
): FixtureRecord => ({
  entries: Object.fromEntries(
    entries.map((entry, index) => [String(entry.uid ?? index), entry])
  ),
})

export const buildLorebookStNativeArray = (
  entries: FixtureRecord[] = [buildStNativeEntry()]
): FixtureRecord => ({ entries })

/**
 * A V3 card with one unknown key in every bucket plus ST-only entry fields.
 * Used to prove the import → export round-trip keeps them in the right place.
 */
export const buildCardWithUnknownFields = (): FixtureRecord =>
  buildV3Card(
    {
      assets: [{ type: "icon", uri: "ccdefault:", name: "main", ext: "png" }],
      nickname: "The Guardian",
      group_only_greetings: ["Group hello"],
      creator_notes_multilingual: { es: "Notas del creador" },
      source: ["https://example.test/card"],
      creation_date: 1_700_000_000,
      modification_date: 1_700_000_001,
      character_book: buildLorebookCCv3([
        buildCCv3Entry({
          extensions: { probability: 100, group: "lore" },
          use_regex: true,
          probability: 100,
          group: "lore",
          group_override: false,
          group_weight: 100,
          vectorized: false,
          cooldown: 3,
          delay: 1,
          sticky: 2,
          delay_until_recursion: true,
          content: "@@depth 4\nDragons dwell in the northern mountains.",
        }),
      ]).data,
    },
    { custom_root_key: { nested: true } }
  )

/**
 * A V3 card with the full `extensions.rm` payload, an unknown key inside
 * `extensions.rm`, unknown buckets, and assets/nickname in `data`. Used to
 * prove the S133 RM merge keeps unknown data (field loss = 0).
 */
export const buildCardWithRmExtensions = (): FixtureRecord =>
  buildV3Card(
    {
      assets: [{ type: "icon", uri: "ccdefault:", name: "main", ext: "png" }],
      nickname: "The Guardian",
      group_only_greetings: ["Group hello"],
      creator_notes_multilingual: { es: "Notas del creador" },
      source: ["https://example.test/card"],
      creation_date: 1_700_000_000,
      modification_date: 1_700_000_001,
      character_book: buildLorebookCCv3([
        buildCCv3Entry({
          content: "@@depth 4\nDragons dwell in the northern mountains.",
        }),
      ]).data,
      extensions: {
        other: { keep: true },
        rm: {
          version: 1,
          subtitle: "Guardian of the grove",
          instructions: "Speak in riddles.",
          knowledgeCards: [
            {
              title: "Oath",
              content: "Protect the forest.",
              position: 0,
              active: true,
            },
          ],
          versionNumber: 3,
          tagline: "The forest's guardian",
          lorebook: {
            lorebookId: "imported-book",
            lorebookVersionId: "imported-version",
            versionNumber: 2,
            sourceKey: "imported-source-key",
            originId: "imported-origin",
          },
          futureRmKey: { keep: true },
        },
      },
    },
    { custom_root_key: { nested: true } }
  )

/** A V3 card whose imported lorebook footprint points at another install. */
export const buildCardWithImportedLorebookIds = (): FixtureRecord =>
  buildV3Card({
    character_book: buildLorebookCCv3([
      buildCCv3Entry({ content: "Imported dragon lore." }),
    ]).data,
    extensions: {
      rm: {
        version: 1,
        tagline: "Imported guardian",
        lorebook: {
          lorebookId: "imported-book",
          lorebookVersionId: "imported-version",
          versionNumber: 9,
          sourceKey: "imported-source-key",
          originId: "imported-origin",
        },
      },
    },
  })

/** A → B → C → D chain: each entry's content matches the next entry's key. */
export const buildRecursionFixture = (): FixtureRecord[] => [
  buildCCv3Entry({
    keys: ["alpha"],
    content: "beta appears here",
    insertion_order: 10,
  }),
  buildCCv3Entry({
    keys: ["beta"],
    content: "gamma appears here",
    insertion_order: 20,
  }),
  buildCCv3Entry({
    keys: ["gamma"],
    content: "delta appears here",
    insertion_order: 30,
  }),
  buildCCv3Entry({
    keys: ["delta"],
    content: "epsilon appears here",
    insertion_order: 40,
  }),
  buildCCv3Entry({
    keys: ["epsilon"],
    content: "zeta appears here",
    insertion_order: 50,
  }),
  buildCCv3Entry({
    keys: ["zeta"],
    content: "alpha appears here",
    insertion_order: 60,
  }),
]
