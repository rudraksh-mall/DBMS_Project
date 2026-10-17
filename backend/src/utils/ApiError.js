// Custom Error messages to use throughout the app for consistent logs

class ApiError extends Error {
    // Default message
    constructor(
        statusCode,
        message = "Something went wrong",
        errors = [],
        stack = ""
    ) {
        super(message);
        this.statusCode = statusCode;
        // no need to send data in error response
        this.data = null;
        this.message = message;
        // its an error, so success is false
        this.success = false;
        this.errors = errors;

        // Good practice to also return the stack trace (where the error originated from) for debugging
        if(stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export {ApiError}