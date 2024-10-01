import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

// Função para criptografar
export function encryptVoterId(voterId) {
  const hash = crypto.createHash('sha1'); // SHA1 gera 40 caracteres hexadecimais
  hash.update(voterId + process.env.SECRET_KEY);
  return hash.digest('hex').substring(0, 24); // Trunca para 24 caracteres
}