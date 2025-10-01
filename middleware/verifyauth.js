import jwt, { decode } from 'jsonwebtoken';
import ErrorResponse from '../lib/error.res.js'
import { ENV } from '../configs/constant.js';


export const verifyAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      let token = authHeader.split(" ")[1];
      if (token) {

        // Check if the token is in the revoked tokens list
        if (revokedTokens.has(token)) {
          return next(ErrorResponse.forbidden());
        }

        let decoded;
        try {
          decoded = jwt.verify(token, ENV.JWT_SECRET);
        } catch (err) {
          return next(ErrorResponse.forbidden());
        }
        const { email, id, role} = decoded;
        req.email = email;
        req.id = id;
        req.role=role;
        return next();
      }
    }
    return next(ErrorResponse.unauthorized());
  } catch (error) {
    return next(ErrorResponse.internalServer());
  }
};






