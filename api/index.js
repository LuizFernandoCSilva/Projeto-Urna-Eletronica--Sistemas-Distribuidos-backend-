// api/index.js
import serverless from 'serverless-http';
import app from '../app.js'; // Certifique-se de que o caminho está correto

const handler = serverless(app);

export default handler;