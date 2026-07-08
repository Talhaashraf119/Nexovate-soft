import scopeService from'../services/scopeService.js';

export const saveGeneratedScope = async (req, res) => {

    try {

        const userId = req.user.id;

        const {

            questionnaireId,

            scope

        } = req.body;

        const savedScope = await scopeService.saveScope(

            userId,

            questionnaireId,

            scope

        );

        return res.status(201).json({

            success: true,

            message: "Scope saved successfully.",

            scope: savedScope

        });

    }

    catch (err) {

        console.error(err);

        return res.status(500).json({

            success: false,

            error: err.message

        });

    }

};