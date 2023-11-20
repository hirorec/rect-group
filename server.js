const path = require('path');
const express = require('express');
const app = express();
const dir = path.join(__dirname, 'dist');
const port = 8082;

app.use(express.static(dir));

app.listen(port, () => {
  console.log(`Listening on http://localhost:${port}`);
});