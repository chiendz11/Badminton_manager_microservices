// services/auth_service/src/middlewares/validationMiddleware.js

export const validate = (schema) => (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
    });

    if (error) {
        const errorMessage = error.details.map(detail => 
            detail.message.replace(/['"]+/g, '')
        ).join(', ');
        
        return res.status(400).json({ message: errorMessage });
    }

    req.body = value;
    next();
};