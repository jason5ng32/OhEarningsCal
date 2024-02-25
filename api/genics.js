import { createEvents } from 'ics';
import { writeFileSync } from 'fs';
import { processData } from './processdata.js';

async function generateEarningsICSCalendar(date,list,filename) {
    try {
        
        console.log('Generating earnings calendar for', date);
        const earningsData = await processData(date,list); // 获取财报数据

        const events = earningsData.map(entry => {
            const dateParts = entry.date.split('-').map(Number);
            const start = [dateParts[0], dateParts[1], dateParts[2]];
            return {
                title: `${entry.companyName} ${entry.time}发布财报`,
                description: `财务季度：${entry.fiscalQuarterEnding}。\n代码：${entry.symbol}，公司：${entry.companyName}，行业: ${entry.industry}。\n预计每股收益: ${entry.epsForecast}，当前市值: ${entry.marketCap}。\n ~~~~~~~~~~~~ \n在股票 app 打开： stocks://?symbol=${entry.symbol} \n在富途查看：https://www.futunn.com/hk/stock/${entry.symbol}-US `,
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
            productId: `${filename} Earnings Calendar`,
            calName: 'Earnings Calendar 财报日历',
            method: 'PUBLISH',
        };

        createEvents(events,headerAttributes, (error, value) => {
            if (error) {
                console.error(error);
                return;
            }
            writeFileSync(`./docs/ics/${filename}.ics`, value);
            console.log(`Earnings calendar .ics file has been saved to ./docs/ics/${filename}.ics.`);
        });
    } catch (error) {
        console.error('Error generating earnings ICS calendar:', error);
    }
}

export { generateEarningsICSCalendar };
