import router from './routes/index';
const express = require('express')
const app = express();

const port = process.env.PORT || 5000;
app.listen(port)
app.use(express.json({limit: '50mb'}))
app.use('/', router);

export default app;
