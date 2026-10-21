const MIN_LENGTH = 1;
const MAX_LENGTH = 2000;

export function validateDescription(description) {
  if (typeof description !== "string") {
    return { valid: false, message: "Description is required" };
  }

  const value = description.trim();

  if (value.length < MIN_LENGTH) {
    return {
      valid: false,
      message: `Description must be at least ${MIN_LENGTH} characters long`,
    };
  }

  if (value.length > MAX_LENGTH) {
    return {
      valid: false,
      message: `Description must be at most ${MAX_LENGTH} characters long`,
    };
  }

  if (!/[a-zA-Z]/.test(value)) {
    return {
      valid: false,
      message: "Description must contain readable text",
    };
  }

  return { valid: true, value };
}

export default validateDescription;
