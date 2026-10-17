/**
 * Converts MySQL driver errors into safe ApiError instances.
 *
 * Raw SQL / driver messages are never forwarded to clients: callers receive a
 * stable, user-facing message while the original error is preserved for logging.
 */
import { ApiError } from "../utils/ApiError.js";

export const isDuplicateKeyError = (error) =>
  error?.code === "ER_DUP_ENTRY" || error?.errno === 1062;

export const isForeignKeyError = (error) =>
  error?.code === "ER_NO_REFERENCED_ROW_2" || error?.errno === 1452;

export const isRestrictedDeleteError = (error) =>
  error?.code === "ER_ROW_IS_REFERENCED_2" || error?.errno === 1451;

export const isCheckConstraintError = (error) =>
  error?.code === "ER_CHECK_CONSTRAINT_VIOLATED" || error?.errno === 3819;

export const isDataError = (error) =>
  error?.code === "ER_DATA_TOO_LONG" ||
  error?.code === "ER_WARN_DATA_OUT_OF_RANGE" ||
  error?.code === "WARN_DATA_TRUNCATED" ||
  error?.errno === 1406 ||
  error?.errno === 1264;

/**
 * Translate a database error to an ApiError when recognized, otherwise return
 * the original error so the central error handler can render a 500.
 */
export function translateDbError(error, { conflictMessage, referenceMessage } = {}) {
  if (isDuplicateKeyError(error)) {
    return new ApiError(409, conflictMessage || "Resource already exists");
  }
  if (isForeignKeyError(error)) {
    return new ApiError(400, referenceMessage || "Referenced record does not exist");
  }
  if (isRestrictedDeleteError(error)) {
    return new ApiError(409, "Record is still referenced and cannot be deleted");
  }
  if (isCheckConstraintError(error) || isDataError(error)) {
    return new ApiError(400, "Invalid data supplied");
  }
  return error;
}