import { Readable } from "stream";
import cloudinary from "../config/cloudinary.js";
import PDFDocument from 'pdfkit';
import pool from '../config/database.js';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({});

export const createProjectAndQuestionnaire = async (userId, projectName, purpose, projectOverview) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Insert Atomic Project Record
        const projectQuery = `
            INSERT INTO projects (client_id, projectName, purpose, projectOverview, status)
            VALUES ($1, $2, $3, $4, 'draft') 
            RETURNING id;
        `;
        const projectResult = await client.query(projectQuery, [userId, projectName, purpose, projectOverview]);
        const projectId = projectResult.rows[0].id;

        // 2. Insert Linked Questionnaire Record
        const questionnaireQuery = `
            INSERT INTO questionnaires (user_id, project_id, project_overview, mcq_answers)
            VALUES ($1, $2, $3, $4) 
            RETURNING id;
        `;
        const questionnaireResult = await client.query(questionnaireQuery, [
            userId, 
            projectId, 
            projectOverview, 
            JSON.stringify({ purpose }) // Store purpose inside metadata safely
        ]);
        const questionnaireId = questionnaireResult.rows[0].id;

        await client.query('COMMIT');

        return { projectId, questionnaireId };
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const callLLM = async (overview, purpose, feedback = "") => {
    try {
        let feedbackPrompt = "";
        if (feedback && feedback.trim() !== "") {
            feedbackPrompt = `
\nCRITICAL: The client wants to regenerate this scope with the following structural feedback/modifications:
"${feedback}"
Modify the output payload layout, features, or stack explicitly to address this input request.`;
        }

        const prompt = `
You are a Senior Software Architect and Project Manager.
Based on the following project details, return ONLY valid JSON.${feedbackPrompt}

Project Purpose: ${purpose}
Project Overview/Description:
${overview}

Return the response in this exact format:
{
  "executiveSummary": "",
  "deliverables": [ "" ],
  "techStack": {
    "frontend": "",
    "backend": "",
    "database": ""
  },
  "timeline": "",
  "milestones": [ "" ]
}

Rules:
1. Return ONLY JSON. Do NOT use Markdown or \`\`\`json blocks.
2. Recommend the most suitable modern technology stack based on the purpose.
3. Keep the executive summary under 150 words.
4. Deliverables and milestones must be structured cleanly.
`;

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        let text = response.text.trim();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            text = jsonMatch[0].trim();
        } else {
            throw new Error("AI response did not contain a valid JSON object structure.");
        }

        return JSON.parse(text);
    } catch (error) {
        console.error("Gemini AI Generation Error:", error);
        throw new Error("Failed to generate scope document via AI.");
    }
};

export const processScopeGeneration = async (userId, questionnaireId) => {
    const qCheck = await pool.query(
        `SELECT * FROM questionnaires WHERE id = $1 AND user_id = $2`,
        [questionnaireId, userId]
    );

    if (!qCheck.rows.length) {
        throw new Error("Questionnaire not found or access denied.");
    }

    const questionnaire = qCheck.rows[0];
    const mcqParsed = typeof questionnaire.mcq_answers === 'string' ? JSON.parse(questionnaire.mcq_answers) : questionnaire.mcq_answers;
    
    return await callLLM(questionnaire.project_overview, mcqParsed?.purpose || "General Application");
};

export const processScopeRegeneration = async (userId, questionnaireId, feedbackText) => {
    const qCheck = await pool.query(
        `SELECT * FROM questionnaires WHERE id = $1 AND user_id = $2`,
        [questionnaireId, userId]
    );

    if (!qCheck.rows.length) {
        throw new Error("Questionnaire not found or access denied.");
    }

    const questionnaire = qCheck.rows[0];
    const mcqParsed = typeof questionnaire.mcq_answers === 'string' ? JSON.parse(questionnaire.mcq_answers) : questionnaire.mcq_answers;
    
    return await callLLM(questionnaire.project_overview, mcqParsed?.purpose || "General Application", feedbackText);
};

export const generatePdfBuffer = (scope) => {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument();
        const chunks = [];

        doc.on("data", (chunk) => chunks.push(chunk));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        doc.fontSize(20).text("PROJECT SCOPE DOCUMENT", { align: "center" });
        doc.moveDown();
        doc.fontSize(16).text("Executive Summary");
        doc.fontSize(12).text(scope.executiveSummary || "");
        doc.moveDown();

        doc.fontSize(16).text("Deliverables");
        (scope.deliverables || []).forEach(item => doc.text("• " + item));
        doc.moveDown();

        doc.fontSize(16).text("Recommended Tech Stack");
        doc.text(`Frontend: ${scope.techStack?.frontend || "N/A"}`);
        doc.text(`Backend: ${scope.techStack?.backend || "N/A"}`);
        doc.text(`Database: ${scope.techStack?.database || "N/A"}`);
        doc.moveDown();

        doc.fontSize(16).text("Timeline");
        doc.text(scope.timeline || "N/A");
        doc.moveDown();

        doc.fontSize(16).text("Milestones");
        (scope.milestones || []).forEach(item => doc.text("• " + item));

        doc.end();
    });
};

const uploadPdfToCloudinary = (pdfBuffer, fileName) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            { resource_type: "raw", folder: "scope-pdfs", public_id: fileName, overwrite: true },
            (error, result) => {
                if (error) reject(error);
                else resolve(result);
            }
        );
        Readable.from(pdfBuffer).pipe(uploadStream);
    });
};

export const saveScope = async (userId, questionnaireId, generatedScope) => {
    const pdfBuffer = await generatePdfBuffer(generatedScope);
    const cloudinaryResult = await uploadPdfToCloudinary(pdfBuffer, `scope_${userId}_${Date.now()}`);

    const insertQuery = `
        INSERT INTO scopes (user_id, questionnaire_id, scope_text, pdf_public_id, pdf_url)
        VALUES ($1, $2, $3, $4, $5) RETURNING *;
    `;
    const { rows } = await pool.query(insertQuery, [
        userId,
        questionnaireId,
        JSON.stringify(generatedScope),
        cloudinaryResult.public_id,
        cloudinaryResult.secure_url
    ]);

    rows[0].scope_text = JSON.parse(rows[0].scope_text);
    return rows[0];
};

export const fetchScopeForUser = async (userId, scopeId) => {
    const query = "SELECT * FROM scopes WHERE id=$1 AND user_id=$2";
    const { rows } = await pool.query(query, [scopeId, userId]);
    if (!rows.length) return null;
    rows[0].scope_text = typeof rows[0].scope_text === 'string' ? JSON.parse(rows[0].scope_text) : rows[0].scope_text;
    return rows[0];
};

export const transmitToDeveloper = async (userId, scopeId, developerDetails) => {
    const query = "SELECT * FROM scopes WHERE id=$1 AND user_id=$2";
    const { rows } = await pool.query(query, [scopeId, userId]);
    if (!rows.length) throw new Error("Scope profile not found or unauthorized access.");
    return { sent: true, developerDetails, pdf_url: rows[0].pdf_url };
};

const scopeService = {
    createProjectAndQuestionnaire,
    processScopeGeneration,
    processScopeRegeneration,
    saveScope,
    fetchScopeForUser,
    generatePdfBuffer,
    transmitToDeveloper
};
export default scopeService;