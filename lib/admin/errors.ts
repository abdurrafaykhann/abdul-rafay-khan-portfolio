/** Turns database / validation errors into messages the admin can act on. */
export function friendlyDbError(message: string): string {
  if (/client approval is required/i.test(message)) {
    return 'Client approval is required: tick "Client approved showing this" before publishing.';
  }
  if (/needs a type and a primary category/i.test(message)) {
    return "Choose a project type and a primary category before publishing.";
  }
  if (/duplicate key.*slug/i.test(message)) {
    return "Another item already uses this slug. Choose a different one.";
  }
  if (/violates foreign key constraint/i.test(message)) {
    return "This is still used by one or more projects. Reassign them first.";
  }
  if (/row-level security|permission denied/i.test(message)) {
    return "You are not signed in as the admin.";
  }
  return "Something went wrong while saving. Please try again.";
}
