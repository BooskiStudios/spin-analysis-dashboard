export class RequestValidationError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.statusCode = statusCode
  }
}

export function parseIdParam(value: unknown, fieldName: string) {
  if (typeof value !== 'string') {
    throw new RequestValidationError(`Invalid ${fieldName}`)
  }

  const parsedValue = Number(value)

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new RequestValidationError(`Invalid ${fieldName}`)
  }

  return parsedValue
}

export function parseRequiredString(value: unknown, fieldName: string) {
  if (typeof value !== 'string' || !value.trim()) {
    throw new RequestValidationError(`${fieldName} is required`)
  }

  return value.trim()
}

export function parseRequiredNumber(value: unknown, fieldName: string) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new RequestValidationError(`${fieldName} must be a number`)
  }

  return value
}

export function parseOptionalNumber(value: unknown, fieldName: string, fallback: number) {
  if (value === undefined) {
    return fallback
  }

  return parseRequiredNumber(value, fieldName)
}

export function parseRequiredBoolean(value: unknown, fieldName: string) {
  if (typeof value !== 'boolean') {
    throw new RequestValidationError(`${fieldName} must be a boolean`)
  }

  return value
}

export type ValidatedEvent = {
  type: string
  time: number
}

export function parseEvents(value: unknown): ValidatedEvent[] {
  if (value === undefined) {
    return []
  }

  if (!Array.isArray(value)) {
    throw new RequestValidationError('events must be an array')
  }

  return value.map((event, index) => {
    if (!event || typeof event !== 'object') {
      throw new RequestValidationError(`events[${index}] must be an object`)
    }

    const eventRecord = event as Record<string, unknown>

    return {
      type: parseRequiredString(eventRecord.type, `events[${index}].type`),
      time: parseRequiredNumber(eventRecord.time, `events[${index}].time`),
    }
  })
}