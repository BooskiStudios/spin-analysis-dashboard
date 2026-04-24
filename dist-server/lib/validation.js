export class RequestValidationError extends Error {
    statusCode;
    constructor(message, statusCode = 400) {
        super(message);
        this.statusCode = statusCode;
    }
}
export function parseIdParam(value, fieldName) {
    if (typeof value !== 'string') {
        throw new RequestValidationError(`Invalid ${fieldName}`);
    }
    const parsedValue = Number(value);
    if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
        throw new RequestValidationError(`Invalid ${fieldName}`);
    }
    return parsedValue;
}
export function parseRequiredString(value, fieldName) {
    if (typeof value !== 'string' || !value.trim()) {
        throw new RequestValidationError(`${fieldName} is required`);
    }
    return value.trim();
}
export function parseRequiredNumber(value, fieldName) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        throw new RequestValidationError(`${fieldName} must be a number`);
    }
    return value;
}
export function parseOptionalNumber(value, fieldName, fallback) {
    if (value === undefined) {
        return fallback;
    }
    return parseRequiredNumber(value, fieldName);
}
export function parseRequiredBoolean(value, fieldName) {
    if (typeof value !== 'boolean') {
        throw new RequestValidationError(`${fieldName} must be a boolean`);
    }
    return value;
}
export function parseEvents(value) {
    if (value === undefined) {
        return [];
    }
    if (!Array.isArray(value)) {
        throw new RequestValidationError('events must be an array');
    }
    return value.map((event, index) => {
        if (!event || typeof event !== 'object') {
            throw new RequestValidationError(`events[${index}] must be an object`);
        }
        const eventRecord = event;
        return {
            type: parseRequiredString(eventRecord.type, `events[${index}].type`),
            time: parseRequiredNumber(eventRecord.time, `events[${index}].time`),
        };
    });
}
