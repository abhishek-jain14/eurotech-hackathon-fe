// Tokenizes a scenario's real, backend-generated Gherkin text (scenario.description -
// the exact Scenario Outline the execution engine runs, see RuleBasedScenarioGenerator)
// for syntax-highlighted display. Pure, no side effects — consumed by the Steps tab.

const keyword = (text) => ({ cls: 'gk', text });
const value = (text) => ({ cls: 'gv', text });
const placeholder = (text) => ({ cls: 'gp', text });
const comment = (text) => ({ cls: 'gc', text });
const plain = (text) => ({ cls: '', text });

const STEP_KEYWORDS = ['Given', 'When', 'Then', 'And', 'But'];

/** Splits "...to <name>..." into plain/placeholder tokens, preserving the rest of the line as-is. */
function tokenizeRest(text) {
  const tokens = [];
  const regex = /<[^<>]+>/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) tokens.push(plain(text.slice(lastIndex, match.index)));
    tokens.push(placeholder(match[0]));
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) tokens.push(plain(text.slice(lastIndex)));
  return tokens;
}

function tokenizeLine(line) {
  const trimmed = line.trimStart();
  const indent = line.slice(0, line.length - trimmed.length);

  if (trimmed === '') return [plain('')];
  if (trimmed.startsWith('#')) return [comment(line)];
  if (trimmed.startsWith('@')) return [plain(indent), keyword(trimmed)];

  const scenarioMatch = trimmed.match(/^(Scenario Outline:|Scenario:)(.*)$/);
  if (scenarioMatch) {
    return [plain(indent), keyword(scenarioMatch[1]), ...tokenizeRest(scenarioMatch[2])];
  }

  const stepKeyword = STEP_KEYWORDS.find((kw) => trimmed === kw || trimmed.startsWith(kw + ' '));
  if (stepKeyword) {
    const rest = trimmed.slice(stepKeyword.length);
    return [plain(indent), keyword(stepKeyword), ...tokenizeRest(rest)];
  }

  return [plain(indent), ...tokenizeRest(trimmed)];
}

export function buildGherkinLines(scenario) {
  if (!scenario) return [];
  const description = scenario.description;
  if (!description || !description.trim()) {
    return [[comment('# No Gherkin steps captured for this scenario')]];
  }
  return description.replace(/\n$/, '').split('\n').map(tokenizeLine);
}
