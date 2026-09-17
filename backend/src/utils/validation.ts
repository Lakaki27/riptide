// Shared length limits, kept in sync with the corresponding maxlength
// attributes on the frontend. These are the values that actually matter —
// anything client-side is just UX, this is what stops an oversized payload
// from reaching the database or a downstream service (e.g. yt-dlp, bcrypt).

export const MAX_EMAIL_LENGTH = 254; // RFC 5321 mailbox length limit
export const MAX_PASSWORD_LENGTH = 254;
export const MAX_QUERY_LENGTH = 100;
export const MAX_NAME_LENGTH = 100;
export const MAX_URL_LENGTH = 2048;
export const MAX_TITLE_LENGTH = 200;
export const MAX_ARTIST_NAME_LENGTH = 200;
export const MAX_FILENAME_LENGTH = 255;

/**
 * Returns true if `value` is a string longer than `max`. Non-strings are
 * never considered "too long" here — callers should validate type/presence
 * separately before calling this.
 */
export function isTooLong(value: unknown, max: number): boolean {
    return typeof value === "string" && value.length > max;
}

/**
 * Convenience helper for route handlers: returns an error message if `value`
 * is a string exceeding `max`, otherwise null. Use as:
 *
 *   const err = tooLongError(email, MAX_EMAIL_LENGTH, "email");
 *   if (err) return res.status(400).json({ error: err });
 */
export function tooLongError(
    value: unknown,
    max: number,
    fieldName: string,
): string | null {
    if (isTooLong(value, max)) {
        return `${fieldName} must be at most ${max} characters`;
    }
    return null;
}
