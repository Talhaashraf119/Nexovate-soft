import jwt from 'jsonwebtoken';

 export const authenticateToken = (request, response, next) => {
    const authHeader = request.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return response.status(401).json({ message: 'Access token missing or invalid.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (error, decodedUser) => {
        if (error) {
            return response.status(403).json({ message: 'Token is expired or invalid.' });
        }
        request.user = decodedUser;
        next();
    });
};
