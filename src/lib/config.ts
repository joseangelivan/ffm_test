// Using a dedicated config file ensures that the exact same secret object
// is used for both signing and verifying the JWT.
export const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-super-secret-key-that-is-at-least-32-bytes-long');
