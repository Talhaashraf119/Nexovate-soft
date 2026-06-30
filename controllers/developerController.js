import pool from '../config/database.js'

export const createDeveloper = async (req, res) => {
    const { name, bio, tech_stack, hourly_rate, ratings, portfolio_link, status } = req.body;

    if (!name || !tech_stack || !hourly_rate) {
        return res.status(400).json({ 
            success: false,
            message: "Name, tech_stack, and hourly_rate are required fields." 
        });
    }
    try {
        const queryText = `
            INSERT INTO developers (name, bio, tech_stack, hourly_rate, ratings, portfolio_link, status) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) 
            RETURNING *
        `;
        
        const values = [
            name.trim(), 
            bio || null, 
            tech_stack, 
            Number(hourly_rate), 
            ratings ? Number(ratings) : 0, 
            portfolio_link || null, 
            status || 'Pending'
        ];

        const result = await pool.query(queryText, values);

        return res.status(201).json({
            success: true,
            message: "New Developer Created Successfully",
            developer: result.rows[0] 
        });

    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({ 
                success: false,
                message: "Portfolio Link already exists." 
            });
        }
        if (error.code === '22P02') {
            return res.status(400).json({ 
                success: false,
                message: "Invalid data format." 
            });
        }

        return res.status(500).json({ 
            success: false,
            message: 'Internal Server Error. Please try again later.' 
        });
    }
};

export const getAllDeveloper = async (req, res) => {
    try {
        const queryText = `
            SELECT id, name, bio, tech_stack, hourly_rate, ratings, portfolio_link, status 
            FROM developers 
            ORDER BY id DESC
        `;
        
        const result = await pool.query(queryText);

        return res.status(200).json({
            success: true,
            count: result.rows.length,
            data: result.rows
        });

    } catch (error) {
        return res.status(500).json({ 
            success: false,
            message: 'Internal server error. Unable to fetch developers.' 
        });
    }
};

export const getDeveloperById = async (req, res) => {
    const developerId = req.params.id;

    if (isNaN(Number(developerId))) {
        return res.status(400).json({
            success: false,
            message: "Bad Request: Invalid ID format. ID must be a number."
        });
    }

    try {
        const queryText = `
            SELECT id, name, bio, tech_stack, hourly_rate, ratings, portfolio_link, status 
            FROM developers 
            WHERE id = $1
        `;
        
        const result = await pool.query(queryText, [developerId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ 
                success: false,
                message: `Developer with ID ${developerId} not found.` 
            });
        }
        return res.status(200).json({
            success: true,
            data: result.rows[0]
        });

    } catch (error) {
        return res.status(500).json({ 
            success: false,
            message: 'Internal server error. Unable to update developer profile.' 
        });
    }
};

export const updateDeveloper=async(req,res)=>{
    const developerId=req.params.id
    if(isNaN(Number(developerId))){
        return res.status(400).json({
            success: false,
            message: "Invalid ID format."
        })
    }
    const { name, bio, tech_stack, hourly_rate, ratings, portfolio_link, status } = req.body;

    if(Object.keys(req.body).length==0){
           return res.status(400).json({
            success: false,
            message: "No fields provided for update."
        });
    }
     const queryParts = [];
    const values = [];
    let placeholderIndex = 1;

    const fieldsToUpdate = { name, bio, tech_stack, hourly_rate, ratings, portfolio_link, status };

    for (const [key, value] of Object.entries(fieldsToUpdate)) {
        if (value !== undefined) {
            queryParts.push(`${key} = $${placeholderIndex}`);
            values.push(value);
            placeholderIndex++;
        }
    }
    values.push(developerId);
    const idPlaceholder = `$${placeholderIndex}`;

    const queryText = `
        UPDATE developers 
        SET ${queryParts.join(', ')} 
        WHERE id = ${idPlaceholder} 
        RETURNING *
    `;
    try{
        const result=await pool.query(queryText,values)
        if(result.rows.length==0){
            return res.status(404).json({
                success: false,
                message: `Developer with ID ${developerId} not found.`
            })
        }
        return res.status(200).json({
            success: true,
            message: "Developer updated successfully",
            developer: result.rows
        });

    } catch (error) {
        if (error.code === '23505') {
            return res.status(409).json({
                success: false,
                message: "Conflict: This Portfolio Link is already Existed."
            });
        }

        if (error.code === '22P02') {
            return res.status(400).json({
                success: false,
                message: "Invalid data format provided for numeric fields."
            });
        }
        return res.status(500).json({
            success: false,
            message: 'Internal server error. Unable to update developer profile.'
        });
    }
};
