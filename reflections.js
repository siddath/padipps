/** Public, source-grounded reflection cards. This module has no storage or UI side effects. */

export const REFLECTION_TOPICS = Object.freeze([
  Object.freeze({ id: 'philosophy', label: 'Philosophy' }),
  Object.freeze({ id: 'art', label: 'Art' }),
  Object.freeze({ id: 'spirituality', label: 'Spirituality' }),
]);

const FRAMING = 'Editorial interpretation; source paraphrased in original words, not quoted.';

function card(value) {
  return Object.freeze({
    ...value,
    source: Object.freeze({ ...value.source }),
    framing: FRAMING,
  });
}

export const REFLECTIONS = Object.freeze([
  card({
    id: 'philosophy-own-next-move',
    topic: 'philosophy',
    title: 'Own the Next Move',
    idea: 'Epictetus separates what depends on our judgment and choice from what does not. Read as a practice, the distinction does not promise control over events; it asks us to place effort where agency is real and release claims over the rest.',
    prompt: 'Which part of your next challenge belongs to your choice?',
    source: {
      label: 'Epictetus — Enchiridion',
      url: 'https://www.gutenberg.org/cache/epub/45109/pg45109-images.html',
      locator: 'Section I',
    },
  }),
  card({
    id: 'philosophy-turn-toward-light',
    topic: 'philosophy',
    title: 'Turn Toward the Light',
    idea: 'Plato’s cave presents education as a reorientation of attention, not the passive receipt of facts. The movement from familiar shadows toward clearer understanding can feel disorienting, so discomfort may accompany learning without proving that every difficult claim is true.',
    prompt: 'What familiar assumption deserves to be viewed from another angle?',
    source: {
      label: 'Plato — Republic',
      url: 'https://www.perseus.tufts.edu/hopper/text?doc=plat.+rep.+7.514a',
      locator: 'Book VII, 514a–517a',
    },
  }),
  card({
    id: 'philosophy-character-repetition',
    topic: 'philosophy',
    title: 'Character Takes Repetition',
    idea: 'Aristotle argues that capacities mature into character through repeated action. One isolated good choice matters, yet a pattern of choices is what trains perception, pleasure, and response. Practice is therefore part of becoming, not merely proof of what is already present.',
    prompt: 'What small action would make a desired quality more habitual?',
    source: {
      label: 'Aristotle — Nicomachean Ethics',
      url: 'https://www.perseus.tufts.edu/hopper/text?doc=Perseus%3Atext%3A1999.01.0054%3Abekker+page%3D1103a%3Abekker+line%3D20',
      locator: 'Book II, 1103a20–1103b2',
    },
  }),
  card({
    id: 'philosophy-obstacles-material',
    topic: 'philosophy',
    title: 'Make Obstacles Material',
    idea: 'Marcus Aurelius describes a directing mind that adapts to what arrives and uses resistance as material for purposeful action. This is not a claim that harm is good; it is an invitation to ask what constructive response remains possible inside real constraints.',
    prompt: 'How could one present constraint become material for useful work?',
    source: {
      label: 'Marcus Aurelius — Meditations',
      url: 'https://classics.mit.edu/Antoninus/meditations.4.four.html',
      locator: 'Book IV, opening meditation',
    },
  }),
  card({
    id: 'philosophy-budget-finite-life',
    topic: 'philosophy',
    title: 'Budget a Finite Life',
    idea: 'Seneca’s complaint is less that life has a fixed limit than that attention leaks into pursuits we did not choose. His argument makes time an ethical budget: noticing where it goes is a first step toward giving it deliberately.',
    prompt: 'What recurring use of time would you choose again on purpose?',
    source: {
      label: 'Seneca — On the Shortness of Life',
      url: 'https://www.gutenberg.org/files/64576/64576-h/64576-h.htm',
      locator: 'Dialogue X, section I',
    },
  }),

  card({
    id: 'art-look-longer',
    topic: 'art',
    title: 'Look Longer',
    idea: 'Van Gogh links sustained looking with deeper understanding. The practical insight is that observation can ripen: first impressions name the subject, while patient attention notices relationships among color, proportion, rhythm, and mood.',
    prompt: 'What detail appeared only after you stayed with the work?',
    source: {
      label: 'Vincent van Gogh — Letter to Theo van Gogh',
      url: 'https://vangoghletters.org/vg/letters/let686/letter.html',
      locator: 'Letter 686, 2r:5, September 1888',
    },
  }),
  card({
    id: 'art-study-soft-edge',
    topic: 'art',
    title: 'Study the Soft Edge',
    idea: 'Leonardo’s notes treat the edge between light and shadow as varied rather than mechanically sharp. His method joins art and inquiry: inspect a transition, test it against the world, and let a precise observation revise the mark.',
    prompt: 'Where does this work use a transition instead of a hard boundary?',
    source: {
      label: 'Leonardo da Vinci — The Notebooks',
      url: 'https://www.gutenberg.org/cache/epub/5000/pg5000.html',
      locator: 'On Painting, section 552',
    },
  }),
  card({
    id: 'art-carries-feeling',
    topic: 'art',
    title: 'Art Carries Feeling',
    idea: 'Tolstoy offers a contested but useful account of art as the communication of felt experience. It shifts evaluation away from prestige alone and toward relation: what inner state does a work make shareable between maker and audience?',
    prompt: 'What feeling or stance did this work make available to you?',
    source: {
      label: 'Leo Tolstoy — What Is Art?',
      url: 'https://www.gutenberg.org/files/64908/64908-h/64908-h.htm',
      locator: 'Chapters V and XV',
    },
  }),
  card({
    id: 'art-think-through-materials',
    topic: 'art',
    title: 'Think Through Materials',
    idea: 'A drawing from the Bauhaus preliminary course survives as an exercise in color, composition, and materials rather than as a self-contained masterpiece. Exercises can be valuable because they isolate a relationship and let the hand discover what explanation alone cannot.',
    prompt: 'What could you learn by changing only the material or tool?',
    source: {
      label: 'Museum of Modern Art — Arieh Sharon course drawing',
      url: 'https://www.moma.org/collection/works/419299',
      locator: 'Object description, drawing from Kandinsky’s course, c. 1929',
    },
  }),
  card({
    id: 'art-let-emptiness-speak',
    topic: 'art',
    title: 'Let Emptiness Speak',
    idea: 'The Met’s account of Kano Sansetsu’s snowy landscape notes that empty space contributes as much atmosphere as the pictured forms. Absence can be active composition: it sets scale, pace, distance, and room for the viewer’s attention.',
    prompt: 'What does the unfilled space ask you to notice or feel?',
    source: {
      label: 'Kano Sansetsu — Wang Ziyou Visiting Dai Andao',
      url: 'https://www.metmuseum.org/art/collection/search/829392',
      locator: 'Metropolitan Museum of Art object description',
    },
  }),

  card({
    id: 'spirituality-act-without-owning',
    topic: 'spirituality',
    title: 'Act Without Owning Results',
    idea: 'Bhagavad Gita 2.47 distinguishes committed action from ownership of its results, while also refusing inaction. One practical reading is to give full care to the work and hold outcomes with humility, since consequences exceed any single person’s control.',
    prompt: 'What would careful action look like if praise or reward were uncertain?',
    source: {
      label: 'Bhagavad Gita — traditionally attributed to Vyasa',
      url: 'https://www.gitasupersite.iitk.ac.in/srimad?field_chapter_value=2&field_nsutra_value=47&language=dv',
      locator: 'Chapter 2, verse 47',
    },
  }),
  card({
    id: 'spirituality-return-wandering-mind',
    topic: 'spirituality',
    title: 'Return the Wandering Mind',
    idea: 'Bhagavad Gita 6.26 describes attention wandering and being brought back. The verse can support a modest practice of return: distraction need not become a verdict on the practitioner; noticing and redirecting are themselves part of the discipline.',
    prompt: 'What helps you return gently when attention has wandered?',
    source: {
      label: 'Bhagavad Gita — traditionally attributed to Vyasa',
      url: 'https://www.gitasupersite.iitk.ac.in/srimad?field_chapter_value=6&field_nsutra_value=26&language=dv',
      locator: 'Chapter 6, verse 26',
    },
  }),
  card({
    id: 'spirituality-learning-shapes-conduct',
    topic: 'spirituality',
    title: 'Let Learning Shape Conduct',
    idea: 'Tiruvalluvar pairs thorough learning with living in a manner worthy of what was learned. In this Tamil ethical tradition, knowledge is unfinished when it remains display; study asks for conduct that can bear its weight.',
    prompt: 'Which lesson from this book could become visible in your conduct?',
    source: {
      label: 'Tiruvalluvar — Tirukkural',
      url: 'https://www.projectmadurai.org/pm_etexts/utf8/pmuni0001.html',
      locator: 'Kural 391, chapter on Learning',
    },
  }),
  card({
    id: 'spirituality-serve-without-measuring',
    topic: 'spirituality',
    title: 'Serve Without Measuring Return',
    idea: 'Tirukkural 103 honors help offered without first calculating repayment. This ethical lens treats service as attention to another’s need rather than a hidden exchange, while leaving the form and limits of responsible help open to judgment.',
    prompt: 'Where could you help without turning the act into an account?',
    source: {
      label: 'Tiruvalluvar — Tirukkural',
      url: 'https://www.projectmadurai.org/pm_etexts/utf8/pmuni0450_01.html',
      locator: 'Kural 103, chapter on Gratitude',
    },
  }),
  card({
    id: 'spirituality-answer-hostility-differently',
    topic: 'spirituality',
    title: 'Answer Hostility Differently',
    idea: 'Dhammapada 5 teaches that hostility is not pacified by more hostility. Within this Buddhist text, non-hostility is a disciplined alternative to retaliation; it does not require pretending that injury did not occur or abandoning wise boundaries.',
    prompt: 'What response could interrupt hostility without denying the harm?',
    source: {
      label: 'Dhammapada — early Buddhist verse collection',
      url: 'https://suttacentral.net/dhp5/en/suddhaso',
      locator: 'Chapter of Pairs, verse 5',
    },
  }),
]);

const TOPIC_IDS = new Set(REFLECTION_TOPICS.map((topic) => topic.id));
const REFLECTION_BY_ID = new Map(REFLECTIONS.map((reflection) => [reflection.id, reflection]));

export function chooseReflection(index, topics) {
  if (!Number.isSafeInteger(index) || index < 0) {
    throw new TypeError('Reflection index must be a non-negative safe integer.');
  }
  const selectedTopics = topics === undefined
    ? TOPIC_IDS
    : new Set(Array.isArray(topics) ? topics.filter((topic) => TOPIC_IDS.has(topic)) : []);
  const eligible = REFLECTIONS.filter((reflection) => selectedTopics.has(reflection.topic));
  return eligible.length ? eligible[index % eligible.length] : null;
}

export function getReflection(id) {
  return typeof id === 'string' ? REFLECTION_BY_ID.get(id) || null : null;
}
