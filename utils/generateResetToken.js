import jwt from 'jsonwebtoken';

const generateResetToken = (email) => {
  const expiresIn = process.env.RESET_TOKEN_EXPIRES_IN || '10m';
  return jwt.sign({ email, purpose: 'password-reset' }, process.env.JWT_SECRET, {
    expiresIn,
  });
};

const verifyResetToken = (token) => {
  return jwt.verify(token, process.env.JWT_SECRET);
};

export { generateResetToken, verifyResetToken };
