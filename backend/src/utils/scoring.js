// Transparent lead scoring — no black-box AI. Rules live here so they're easy to find and
// tune later (Settings module, Phase 3+, can eventually make this data-driven instead of code).

const SCORING_RULES = {
  budgetClarity: 10,   // gave a real budget range, not "Not sure"
  urgency: 15,         // timeline is "Immediately" or "Within 1 month"
  decisionMaker: 15,   // confirmed they are the decision maker
  clearProblem: 15,    // main_problem field has meaningful content
  definedTimeline: 10, // any timeline given at all (even if not urgent)
  suitableProject: 15, // desired solution matches an SBC service
  businessImpact: 20,  // manual/founder judgment — starts at 0, set later on review
};

const URGENT_TIMELINES = new Set(['immediately', 'within 1 month']);
const SUITABLE_PROJECTS = new Set([
  'website', 'web application', 'mobile application', 'automation', 'mvp',
  'product consulting', 'product management',
]);

function normalize(str) {
  return (str || '').trim().toLowerCase();
}

/**
 * Computes a lead score from 0-100 and returns the breakdown alongside it,
 * so both can be stored in lead_scores without losing how the number was reached.
 */
export function scoreLead(lead) {
  const breakdown = {};

  const budget = normalize(lead.budget_range);
  breakdown.budgetClarity = budget && budget !== 'not sure' ? SCORING_RULES.budgetClarity : 0;

  const timeline = normalize(lead.timeline);
  breakdown.urgency = URGENT_TIMELINES.has(timeline) ? SCORING_RULES.urgency : 0;
  breakdown.definedTimeline = timeline ? SCORING_RULES.definedTimeline : 0;

  breakdown.decisionMaker = lead.decision_maker === true ? SCORING_RULES.decisionMaker : 0;

  const problem = (lead.main_problem || '').trim();
  breakdown.clearProblem = problem.length >= 15 ? SCORING_RULES.clearProblem : 0;

  const desiredSolution = normalize(lead.desired_solution || lead.business_type);
  breakdown.suitableProject = SUITABLE_PROJECTS.has(desiredSolution) ? SCORING_RULES.suitableProject : 0;

  // Business impact is a founder judgment call — 0 until manually set on review via PATCH.
  breakdown.businessImpact = lead.business_impact_override ?? 0;

  const score = Object.values(breakdown).reduce((sum, v) => sum + v, 0);

  let priority;
  if (score >= 80) priority = 'HOT';
  else if (score >= 60) priority = 'WARM';
  else if (score >= 40) priority = 'NURTURE';
  else priority = 'LOW';

  return { score, priority, breakdown };
}
