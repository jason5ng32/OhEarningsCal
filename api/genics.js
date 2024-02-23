import { createEvents } from 'ics';
import { writeFileSync } from 'fs';
import { fetchEarningsCalendarData } from './finnhub.js'; // 假设这是从 finnhub.js 导入的 getEarningsData 函数

// 假设 getEarningsData 已经修改为返回 Promise，以便使用 async/await
async function generateEarningsICSCalendar() {
    try {
        const earningsData = await fetchEarningsCalendarData(); // 获取财报数据

        const events = earningsData.map(entry => {
            const dateParts = entry.date.split('-').map(Number);
            const start = [dateParts[0], dateParts[1], dateParts[2]];
            return {
                title: `${entry.companyName} ${entry.year} ${entry.quarter} 财报发布`,
                description: `代码：${entry.symbol}，公司：${entry.companyName}，行业: ${entry.industry}，成立日期: ${entry.establishDate}，预计每股收益: ${entry.epsEstimate}，实际每股收益: ${entry.epsActual}，预计营收: ${entry.revenueEstimate}，实际营收: ${entry.revenueActual}。`,
                start: start,
                startInputType: 'utc', // 时区会有误差，但可以接受
                duration: { hours: 1 }, // 假设每个事件持续1小时
                status: 'CONFIRMED',
                busyStatus: 'FREE',
                alarms: [
                    { action: 'display', description: 'Reminder', trigger: { hours: 2, minutes: 0, before: true } }
                ]
            };
        });

        const headerAttributes = {
            productId: 'Jason\'s Earnings Calendar',
            calName: 'Earnings Calendar for S&P 500 Companies',
            method: 'PUBLISH',
        };

        createEvents(events,headerAttributes, (error, value) => {
            if (error) {
                console.error(error);
                return;
            }
            writeFileSync('./ics/sp500.ics', value);
            console.log('Earnings calendar .ics file has been saved to ./ics/sp500.ics.');
        });
    } catch (error) {
        console.error('Error generating earnings ICS calendar:', error);
    }
}

// generateEarningsICSCalendar();

export { generateEarningsICSCalendar };
