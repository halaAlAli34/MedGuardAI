// Bootstraps the app: connects to MongoDB, then starts listening.
// The Express app itself lives in src/app.js so tests can import it
// directly (see tests/) without needing a live database connection.
require("dotenv").config();
const app = require("./src/app");
const connectDB = require("./src/utils/db");

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`MedGuard AI API listening on port ${PORT}`));
});
