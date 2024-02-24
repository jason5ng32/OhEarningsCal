import { createEvents } from 'ics';
import { writeFileSync } from 'fs';
import { fetchEarningsCalendarData } from './nasdaq.js';

async function generateEarningsICSCalendar() {
    try {
        const date = `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${new Date().getDate().toString().padStart(2, '0')}`;
        console.log('Generating earnings calendar for', date);
        const earningsData = await fetchEarningsCalendarData(date); // 获取财报数据

        const events = earningsData.map(entry => {
            const dateParts = entry.date.split('-').map(Number);
            const start = [dateParts[0], dateParts[1], dateParts[2]];
            return {
                title: `${entry.companyName} 财报发布`,
                description: `财务季度：${entry.fiscalQuarterEnding}。\n代码：${entry.symbol}，公司：${entry.companyName}，行业: ${entry.industry}，成立日期: ${entry.establishDate}。\n预计每股收益: ${entry.epsForecast}，当前市值: ${entry.marketCap}。\n ~~~~~~~~~~~~ \n在 📱 上打开： stocks://?symbol=${entry.symbol} \n在富途查看：https://www.futunn.com/hk/stock/${entry.symbol}-US `,
                start: start,
                startInputType: 'utc', // 时区会有误差，但可以接受
                status: 'CONFIRMED',
                busyStatus: 'FREE',
                alarms: [
                    { action: 'display', description: 'Reminder', trigger: { hours: 2, minutes: 0, before: true } }
                ]
            };
        });

        const headerAttributes = {
            productId: 'Jason\'s Earnings Calendar',
            calName: 'Earnings Calendar 财报日历',
            method: 'PUBLISH',
        };

        createEvents(events,headerAttributes, (error, value) => {
            if (error) {
                console.error(error);
                return;
            }
            writeFileSync('./ics/selected.ics', value);
            console.log('Earnings calendar .ics file has been saved to ./ics/selected.ics.');
        });
    } catch (error) {
        console.error('Error generating earnings ICS calendar:', error);
    }
}

export { generateEarningsICSCalendar };
