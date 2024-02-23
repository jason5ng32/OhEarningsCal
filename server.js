import schedule from 'node-schedule';
import dotenv from 'dotenv';
import express from 'express';
import { getEarningCalendar } from './api/finnhub.js';
import { generateEarningsICSCalendar } from './api/genics.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 18302;

const staticApp = express.static('ics');

app.get('/api/cal', getEarningCalendar);
app.use('/ics', express.static('ics'));

schedule.scheduleJob('11 21 * * *', function () {
    console.log("Generating earnings calendar...");
    generateEarningsICSCalendar();
});

// 启动服务器
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
