import schedule from 'node-schedule';
import dotenv from 'dotenv';
import express from 'express';
import { getEarningCal } from './api/nasdaq.js';
import { generateEarningsICSCalendar } from './api/genics.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 18302;

// 使用 nasdaq API 获取财报日历
app.use('/api/nasdaq', getEarningCal);
// 静态文件服务器
app.use('/ics', express.static('ics'));

// 每天 21:58 生成财报日历
schedule.scheduleJob('58 21 * * *', function () {
    console.log("Generating earnings calendar...");
    generateEarningsICSCalendar();
});

// 启动服务器
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
