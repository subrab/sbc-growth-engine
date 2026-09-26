import { query } from '../db/pool.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const PIPELINE_STATUSES = [
  'New', 'Contacted', 'Qualified', 'Discovery Scheduled', 'Discovery Completed',
  'Negotiation', 'Won', 'Lost', 'Nurture',
];

export const getDashboard = asyncHandler(async (req, res) => {
  const [
    { rows: todayTasks },
    { rows: statusCounts },
    { rows: pipelineValueRows },
    { rows: totalsRows },
    { rows: qualifiedRows },
    { rows: wonRows },
  ] = await Promise.all([
    query(
      // Pending follow-ups due today or earlier (overdue), judged by the date in India,
      // not the database server's UTC date. due_date is returned as plain 'YYYY-MM-DD'.
      `SELECT t.*, t.due_date::text AS due_date, l.name AS lead_name, l.company_id
       FROM tasks t JOIN leads l ON l.id = t.lead_id
       WHERE t.status = 'pending' AND l.deleted_at IS NULL
         AND t.due_date <= (now() AT TIME ZONE 'Asia/Kolkata')::date
       ORDER BY t.due_date ASC`
    ),
    query(
      `SELECT status, COUNT(*)::int AS count FROM leads
       WHERE deleted_at IS NULL GROUP BY status`
    ),
    query(
      `SELECT COALESCE(SUM(estimated_project_value), 0) AS total FROM leads
       WHERE deleted_at IS NULL AND status NOT IN ('Won', 'Lost')`
    ),
    query(
      `SELECT
         COUNT(*)::int AS all_time,
         COUNT(*) FILTER (WHERE created_at >= date_trunc('month', now()))::int AS this_month
       FROM leads WHERE deleted_at IS NULL`
    ),
    query(
      `SELECT COUNT(*)::int AS count FROM leads
       WHERE deleted_at IS NULL AND status IN
         ('Qualified','Discovery Scheduled','Discovery Completed','Negotiation','Won')`
    ),
    query(`SELECT COUNT(*)::int AS count FROM leads WHERE deleted_at IS NULL AND status = 'Won'`),
  ]);

  const statusMap = Object.fromEntries(PIPELINE_STATUSES.map((s) => [s, 0]));
  for (const row of statusCounts) statusMap[row.status] = row.count;

  const totalLeads = totalsRows[0].all_time;
  const qualifiedCount = qualifiedRows[0].count;
  const wonCount = wonRows[0].count;

  res.json({
    today: {
      follow_ups_due: todayTasks,
    },
    pipeline: {
      by_status: statusMap,
      total_pipeline_value: Number(pipelineValueRows[0].total),
    },
    business: {
      total_leads_all_time: totalLeads,
      total_leads_this_month: totalsRows[0].this_month,
      lead_to_qualified_rate: totalLeads ? Number((qualifiedCount / totalLeads).toFixed(2)) : 0,
      qualified_to_won_rate: qualifiedCount ? Number((wonCount / qualifiedCount).toFixed(2)) : 0,
    },
  });
});
