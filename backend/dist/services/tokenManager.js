import jwt from 'jsonwebtoken';
export class TokenManager {
    secret;
    defaultExpiration;
    constructor(secret, expirationHours = 24) {
        this.secret = secret;
        this.defaultExpiration = `${expirationHours}h`;
    }
    generateToken(payload) {
        return jwt.sign(payload, this.secret, {
            expiresIn: this.defaultExpiration
        });
    }
    verifyToken(token) {
        try {
            const decoded = jwt.verify(token, this.secret);
            return decoded;
        }
        catch (error) {
            throw new Error('Invalid or expired token');
        }
    }
}
