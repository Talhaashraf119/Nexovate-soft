import {
  createProjectWizard,
  createProjectQuestionnaire,
} from "../services/wizardService.js";

export const saveWizardData = async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, basics, description, budget, timeline } = req.body;

  if (
    !title?.trim() ||
    !description?.trim() ||
    budget == null ||
    !timeline ||
    !basics
) {
      return res.status(400).json({
        error:
          "Missing required wizard data. Provide basics, description, budget, and timeline.",
      });
    }

    const project = await createProjectWizard(
      userId,
      title,
      basics,
      description,
      budget,
      timeline,
    );

  return res.status(201).json({
    success:true,
    message:"Wizard saved successfully",
    projectId:project.id
});
  } catch (error) {
    return res.status(500).json({
    success:false,
    error:"Internal server error"
});
  }
};

export const saveQuestionnaireData = async (req, res) => {
  try {
    const userId = req.user.id;
    const { projectId, mcqAnswers, projectOverview } = req.body;

    if (
    !projectId ||
    !Array.isArray(mcqAnswers) ||
    mcqAnswers.length === 0
) {
      return res.status(400).json({
        error: "projectId, mcqAnswers, and projectOverview are required.",
      });
    }

    const questionnaire = await createProjectQuestionnaire(
      userId,
      projectId,
      mcqAnswers,
      projectOverview,
    );

    return res.status(201).json({
      message: "Questionnaire data saved and linked to project successfully",
      questionnaireId: questionnaire.id,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
