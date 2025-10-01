// signup.handler.js
import { check } from 'express-validator';

/**
 * Validation rules for the sign-up process.
 * Ensures that the email and password fields meet the specified requirements.
 */
export const signUpValidation = [
    check('email', 'email is required').not().isEmpty(),
    check('email', 'email format is required').isEmail(),
    check('password', 'password is required').not().isEmpty(),
    check('password', 'password length should be >8').isLength({ min: 8 }).custom((value) => {
        if (!/[!@#]/.test(value)) {
            throw new Error('password must contain at least one special character');
        }
        if (!/[A-Z]/.test(value)) {
            throw new Error('password must contain at least one uppercase letter');
        }
        return true;
    })
];

/**
 * Validation rules for the reset password process.
 * Ensures that the new password field meets the specified requirements.
 */
export const resetPasswordValidation = [
    check('newPassword', 'new password is required').not().isEmpty(),
    check('newPassword', 'new password length should be >= 8').isLength({ min: 8 }).custom((value) => {
        if (!/[!@#]/.test(value)) {
            throw new Error('new password must contain at least one special character');
        }
        if (!/[A-Z]/.test(value)) {
            throw new Error('new password must contain at least one uppercase letter');
        }
        return true;
    })
];

