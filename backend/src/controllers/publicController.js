import { query } from '../db/pool.js';
import { asyncHandler, validationError } from '../middleware/errorHandler.js';
import { scoreLead } from '../utils/scoring.js';
import { recordScore, logActivity } from './leadsController.js';

const DEFAULT_FOLLOW_UP_DAYS = 2;

async function createFollowUpTask(leadId, reason) {
  await query(
    `INSERT INTO tasks (lead_id, reason, due_date)
     VALUES ($1, $2, CURRENT_DATE + $3::int)`,
    [leadId, reason, DEFAULT_FOLLOW_UP_DAYS]
  );
}

// POST /api/public/leads — simple "Start a Project" style capture from the public site
export const createPublicLead = asyncHandler(async (req, res) => {
  const { name, email, phone, company, project_type, description } = req.body;

  if (!name || !email) {
    throw validationError('Please share your name and email so we can get back to you.');
  }

  const { rows } = await query(
    `INSERT INTO leads (name, email, phone, business_type, main_problem, source, status)
     VALUES ($1, $2, $3, $4, $5, 'Website', 'New')
     RETURNING *`,
    [name, email, phone || null, project_type || company || null, description || null]
  );
  const lead = rows[0];

  await recordScore(lead.id, lead);
  await logActivity(lead.id, 'Note', 'Lead submitted via public "Start a Project" form.');
  await createFollowUpTask(lead.id, 'Respond to new website inquiry');

  res.status(201).json({
    message: "Thanks — your message is in. We'll review it and get back to you.",
  });
});

// POST /api/public/assessment — the full Business Assessment
export const submitAssessment = asyncHandler(async (req, res) => {
  const {
    name, email, phone, company, website,
    industry, company_size,
    current_situation, biggest_challenge, desired_solution,
    timeline, budget_range, problem_description,
  } = req.body;

  if (!name || !email) {
    throw validationError('Please share your name and email so we can follow up.');
  }

  const leadPayload = {
    name,
    email,
    phone: phone || null,
    website: website || null,
    industry: industry || null,
    company_size: company_size || null,
    business_type: desired_solution || null,
    main_problem: problem_description || null,
    timeline: timeline || null,
    budget_range: budget_range || null,
  };

  const { rows: leadRows } = await query(
    `INSERT INTO leads
       (name, email, phone, website, industry, company_size, business_type,
        main_problem, timeline, budget_range, source, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'Website Assessment','New')
     RETURNING *`,
    [
      leadPayload.name, leadPayload.email, leadPayload.phone, leadPayload.website,
      leadPayload.industry, leadPayload.company_size, leadPayload.business_type,
      leadPayload.main_problem, leadPayload.timeline, leadPayload.budget_range,
    ]
  );
  const lead = leadRows[0];

  await query(
    `INSERT INTO lead_assessments (lead_id, current_situation, biggest_challenge, desired_solution, raw_answers)
     VALUES ($1, $2, $3, $4, $5)`,
    [lead.id, current_situation || null, biggest_challenge || null, desired_solution || null, req.body]
  );

  await recordScore(lead.id, lead);
  await logActivity(lead.id, 'Note', 'Business Assessment submitted.');
  await createFollowUpTask(lead.id, 'Review Business Assessment submission');

  res.status(201).json({
    message: "Thanks for sharing your business challenge. We'll review your requirements and get back to you.",
  });
});
