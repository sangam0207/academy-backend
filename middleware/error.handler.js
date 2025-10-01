import fs from "fs";
import path from "path";

const errorHandler = (error, req, res, next) => {
    const statusCode = error.status || 500;
    const message = error.message || 'Internal Server Error';

    // Create logs directory if it doesn't exist
    const logsDir = './logs';
    if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
    }

    const errorLogStream = fs.createWriteStream('./logs/error.log', { flags: 'a' });
    const log = `[${new Date().toISOString()}] ${statusCode} - ${message} - ${req.originalUrl} - ${req.method}`;
    
    errorLogStream.write(log + '\n');
    errorLogStream.end(); // Close the stream after writing

    const response = {
        success: false,
        message: message,
        data: []
    };

    res.status(statusCode).send(response);
};

export default errorHandler;
