import schedule from 'node-schedule';
import dotenv from 'dotenv';
import express from 'express';
import { fetchEarningsCalendarData } from './api/nasdaq.js';
import { genAllIcs } from './api/automation.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 18302;


// 计划任务
schedule.scheduleJob('17 18 * * *', function () {
    console.log("Getting earnings calendar");
    fetchEarningsCalendarData();
});

schedule.scheduleJob('20 18 * * *', function () {
    console.log("Generating ics...");
    genAllIcs();
});

// 启动服务器
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
