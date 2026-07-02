import pool from "../config/database.js";

export const createProjectWizard = async (
  client_id,
  title,
  basics,
  description,
  budget,
  timeline,
) => {
  const query = `
        INSERT INTO projects (
    client_id,
    title,
    basics,
    description,
    budget,
    timeline
)
        VALUES ($1, $2, $3, $4, $5,$6) 
        RETURNING id;
    `;
  const values = [
    userId,
    title,
    JSON.stringify(basics),
    description,
    budget,
    timeline,
  ];
  const { rows } = await pool.query(query, values);
  return rows[0];
};

export const createProjectQuestionnaire = async (userId, projectId, mcqAnswers, projectOverview) => {
  const projectCheck = await pool.query(
    "SELECT id FROM projects WHERE id = $1 AND client_id = $2",
    [projectId, userId]
  );

  if (projectCheck.rows.length === 0) {
    throw new Error("Project not found or unauthorized access.");
  }

  const query = `
        INSERT INTO questionnaires (user_id, project_id, mcq_answers, project_overview)
        VALUES ($1, $2, $3, $4) 
        RETURNING id;
    `;
  const values = [
    userId,
    projectId,
    JSON.stringify(mcqAnswers),
    projectOverview,
  ];
  const { rows } = await pool.query(query, values);
  return rows[0];
};

