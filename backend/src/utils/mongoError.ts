import type { Request, Response, NextFunction } from 'express';

type ParsedMongoError = {
  status: number;
  body: Record<string, unknown>;
};


export function parseMongoError(error: any): ParsedMongoError | null {
  if (!error || typeof error !== 'object') return null;

  if (error.name === 'MongoServerError' && (error as any).code === 11000) {
    const keyValue = (error as any).keyValue || {};
    return {
      status: 409,
      body: {
        message: 'Duplicate value',
        fields: keyValue,
      },
    };
  }

  if (error.name === 'ValidationError') {
    const fields: Record<string, string> = {};
    for (const key of Object.keys(error.errors || {})) {
      try {
        fields[key] = error.errors[key].message || String(error.errors[key]);
      } catch {
        fields[key] = 'Invalid value';
      }
    }
    return {
      status: 400,
      body: {
        message: 'Validation failed',
        fields,
      },
    };
  }

  if (error.name === 'DocumentNotFoundError') {
    return {
      status: 404,
      body: { message: 'Document not found', details: error.message },
    };
  }

  if (error.name === 'VersionError') {
    return {
      status: 409,
      body: { message: 'Version conflict', details: error.message },
    };
  }

  if (error.name === 'CastError' || error.name === 'BSONTypeError') {
    return {
      status: 400,
      body: { message: 'Invalid value for field', details: error.message },
    };
  }

  if (error.name === 'MongoNetworkError' || error.name === 'MongooseServerSelectionError') {
    return {
      status: 503,
      body: { message: 'Database connection error', details: error.message },
    };
  }

  if (error.name === 'MongoServerError') {
    const code = (error as any).code;
    if (code === 121) {
      return {
        status: 400,
        body: { message: 'Document validation failed (server)', details: error.message },
      };
    }

    if (typeof code === 'number') {
      return {
        status: 400,
        body: { message: 'Database write error', code, details: error.message },
      };
    }
  }

  if (error.name === 'BulkWriteError') {
    const code = (error as any).code;
    return {
      status: code === 11000 ? 409 : 400,
      body: { message: 'Bulk write error', code, details: error.message },
    };
  }

  return null;
}

export function mongoErrorHandler(
  err: any,
  _req: Request,
  res: Response,
  next: NextFunction
) {
  const parsed = parseMongoError(err);
  if (parsed) {
    return res.status(parsed.status).json(parsed.body);
  }
  return next(err);
}

export default parseMongoError;
