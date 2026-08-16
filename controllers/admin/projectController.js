import pool from "../../config/database.js";

export const getAdminProjectDetails = async (req, res) => {
    const { id } = req.params;

    if (!id || isNaN(Number(id))) {
        return res.status(400).json({
            success: false,
            message: "Invalid project ID."
        });
    }

    const projectId = Number(id);

    try {
        const query = `
            SELECT
                /* =========================
                   PROJECT
                ========================= */
                p.id AS project_id,
                p.projectname,
                p.projectoverview,
                p.scope_document,
                p.status AS project_status,
                p.client_id,
                p.developer_id,
                p.progress_percentage,
                p.milestones,
                p.purpose,
                p.budget,
                p.timeline,
                p.basics AS project_basics,
                p.created_at AS project_created_at,
                p.updated_at AS project_updated_at,

                /* =========================
                   CLIENT
                ========================= */
                c.id AS client_profile_id,
                c.user_id AS client_user_id,
                c.full_name AS client_name,
                c.email_address AS client_email,
                c.phone AS client_phone,
                c.account_title AS client_account_title,
                c.bank_name AS client_bank_name,
                c.account_number AS client_account_number,

                /* =========================
                   DEVELOPER
                ========================= */
                d.id AS developer_profile_id,
                d.full_name AS developer_name,
                d.email_address AS developer_email,
                d.your_domain AS developer_domain,
                d.tech_stack AS developer_tech_stack,
                d.is_verified AS developer_verified,
                d.is_enabled AS developer_enabled,

                /* =========================
                   QUESTIONNAIRE
                ========================= */
                q.id AS questionnaire_id,
                q.user_id AS questionnaire_user_id,
                q.mcq_answers,
                q.project_overview AS questionnaire_project_overview,
                q.created_at AS questionnaire_created_at,

                /* =========================
                   SCOPE
                ========================= */
                s.id AS scope_id,
                s.scope_text,
                s.pdf_path,
                s.pdf_public_id,
                s.pdf_url,
                s.created_at AS scope_created_at

            FROM projects p

            LEFT JOIN clients c
                ON c.id = p.client_id

            LEFT JOIN developers d
                ON d.id = p.developer_id

            LEFT JOIN questionnaires q
                ON q.project_id = p.id

            LEFT JOIN scopes s
                ON s.questionnaire_id = q.id

            WHERE p.id = $1
            LIMIT 1;
        `;

        const result = await pool.query(query, [projectId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Project not found."
            });
        }

        const row = result.rows[0];

        /*
        |--------------------------------------------------------------------------
        | Parse JSON fields safely
        |--------------------------------------------------------------------------
        */

        let mcqAnswers = row.mcq_answers;

        if (typeof mcqAnswers === "string") {
            try {
                mcqAnswers = JSON.parse(mcqAnswers);
            } catch {
                mcqAnswers = {};
            }
        }

        let scopeDetails = row.scope_text;

        if (typeof scopeDetails === "string") {
            try {
                scopeDetails = JSON.parse(scopeDetails);
            } catch {
                scopeDetails = row.scope_text;
            }
        }

        /*
        |--------------------------------------------------------------------------
        | Return clean admin response
        |--------------------------------------------------------------------------
        */

        return res.status(200).json({
            success: true,
            message: "Project details retrieved successfully.",

            project: {
                id: row.project_id,
                name: row.projectname,
                overview: row.projectoverview,
                purpose: row.purpose,
                budget: row.budget,
                timeline: row.timeline,
                status: row.project_status,
                progress_percentage: row.progress_percentage,
                milestones: row.milestones,
                basics: row.project_basics,
                scope_document: row.scope_document,
                created_at: row.project_created_at,
                updated_at: row.project_updated_at
            },

            client: row.client_profile_id
                ? {
                    id: row.client_profile_id,
                    user_id: row.client_user_id,
                    name: row.client_name,
                    email: row.client_email,
                    phone: row.client_phone
                }
                : null,

            developer: row.developer_profile_id
                ? {
                    id: row.developer_profile_id,
                    name: row.developer_name,
                    email: row.developer_email,
                    domain: row.developer_domain,
                    tech_stack: row.developer_tech_stack,
                    is_verified: row.developer_verified,
                    is_enabled: row.developer_enabled
                }
                : null,

            questionnaire: row.questionnaire_id
                ? {
                    id: row.questionnaire_id,
                    mcq_answers: mcqAnswers,
                    project_overview: row.questionnaire_project_overview,
                    created_at: row.questionnaire_created_at
                }
                : null,

            scope: row.scope_id
                ? {
                    id: row.scope_id,
                    details: scopeDetails,
                    pdf_path: row.pdf_path,
                    pdf_public_id: row.pdf_public_id,
                    pdf_url: row.pdf_url,
                    created_at: row.scope_created_at
                }
                : null
        });

    } catch (error) {
        console.error(
            "Admin Get Project Details Error:",
            error.message
        );

        return res.status(500).json({
            success: false,
            message: "Internal server error while retrieving project details."
        });
    }
};