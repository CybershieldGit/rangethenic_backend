import app from '../../app.js';

// Let the Express app handle body parsing (express.json / multer) and resolve
// the response itself, rather than Next.js's built-in body parser.
export const config = {
  api: {
    bodyParser: false,
    externalResolver: true,
  },
};

// The Express app is just a (req, res) request handler, so on Vercel we can pass
// Next.js's Node request/response straight through to it. Requests arrive with
// their original `/api/...` URL, which matches the routes mounted in app.js.
export default function handler(req, res) {
  return app(req, res);
}
