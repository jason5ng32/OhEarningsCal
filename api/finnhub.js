import { get } from 'https';
import dotenv from 'dotenv';
dotenv.config();

const sp500 = await import('./sp500.json', { assert: { type: 'json' } });
const customstock = await import('./customstock.json', { assert: { type: 'json' } });
const combinelist = [...sp500.default, ...customstock.default];

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 获取财报日历，Finnhub 限制每次只返回最多 14 天的数据，所以需要分 4 次获取
async function fetchEarningsCalendarData() {
    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);

    // 周期 1
    const firstPeriodStart = new Date(today.setDate(today.getDate() - 7)).toISOString().split('T')[0];
    const firstPeriodEnd = new Date(today.setDate(today.getDate() + 14)).toISOString().split('T')[0];

    // 周期 2
    const secondPeriodStart = new Date(new Date().setDate(new Date(todayStr).getDate() + 7)).toISOString().split('T')[0];
    const secondPeriodEnd = new Date(new Date().setDate(new Date(todayStr).getDate() + 21)).toISOString().split('T')[0];

    // 周期 3
    const thirdPeriodStart = new Date(new Date().setDate(new Date(todayStr).getDate() + 21)).toISOString().split('T')[0];
    const thirdPeriodEnd = new Date(new Date().setDate(new Date(todayStr).getDate() + 35)).toISOString().split('T')[0];

    // 周期 4
    const fourthPeriodStart = new Date(new Date().setDate(new Date(todayStr).getDate() + 35)).toISOString().split('T')[0];
    const fourthPeriodEnd = new Date(new Date().setDate(new Date(todayStr).getDate() + 49)).toISOString().split('T')[0];

    try {

        const dataPeriod1 = await fetchEarningsData(firstPeriodStart, firstPeriodEnd, combinelist);
        await sleep(1000);
        const dataPeriod2 = await fetchEarningsData(secondPeriodStart, secondPeriodEnd, combinelist);
        await sleep(1000);
        const dataPeriod3 = await fetchEarningsData(thirdPeriodStart, thirdPeriodEnd, combinelist);
        await sleep(1000);
        const dataPeriod4 = await fetchEarningsData(fourthPeriodStart, fourthPeriodEnd, combinelist);

        // 合并两个时间段的数据并去重
        const combinedData = [...dataPeriod1, ...dataPeriod2, ...dataPeriod3, ...dataPeriod4];

        // 去重，并保留每个symbol最后一次出现的条目
        const uniqueData = Array.from(new Map(combinedData.map(item => [item.symbol, item])).values());

        // 按日期排序，最早的日期在前
        const sortedData = uniqueData.sort((a, b) => new Date(a.date) - new Date(b.date));

        return sortedData;
    } catch (error) {
        console.error('Failed to fetch earnings calendar:', error);
        throw error; // 抛出错误让调用者处理
    }
};

async function getEarningCalendar(req, res) {
    try {
        const data = await fetchEarningsCalendarData();
        res.status(200).json(data);
    } catch (error) {
        console.error('Failed to fetch earnings calendar:', error);
        res.status(500).json({ error: error.message });
    }
}

async function fetchEarningsData(startDate, endDate, stocklist) {
    return new Promise((resolve, reject) => {
        const url = `https://finnhub.io/api/v1/calendar/earnings?from=${startDate}&to=${endDate}&token=${process.env.FINNHUB_API_KEY}`;
        console.log('Fetching data for:', startDate, 'to', endDate);
        get(url, (resp) => {
            let data = '';
            resp.on('data', (chunk) => {
                data += chunk;
            });
            resp.on('end', () => {
                const earningsData = JSON.parse(data);
                const filteredData = filterEarningsData(earningsData.earningsCalendar, stocklist);
                resolve(filteredData);
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
};


// 添加的格式化数据子函数
function filterEarningsData(earningsCalendar, stocklist) {
    const stocks = stocklist.reduce((acc, item) => {
        acc[item.symbol] = item;
        return acc;
    }, {});

    return earningsCalendar
        .filter(item => stocks.hasOwnProperty(item.symbol))
        .map(item => {

            const { date, epsActual, epsEstimate, revenueEstimate, revenueActual, symbol, quarter, year } = item;
            const { companyName, industry, industryDetail, establishDate } = stocks[item.symbol];

            return {
                symbol, // 股票代码
                date, // 财报日期
                epsActual: epsActual === null ? "N/A" : epsActual, // 实际每股收益
                epsEstimate: epsEstimate === null ? "N/A" : epsEstimate, // 预期每股收益
                revenueEstimate: revenueEstimate === null ? "N/A" : revenueEstimate.toLocaleString(), // 预期营收
                revenueActual: revenueActual === null ? "N/A" : revenueActual.toLocaleString(), // 实际营收
                companyName, // 公司名称
                industry: industry + '-' + industryDetail, // 行业
                establishDate, // 成立日期
                quarter: quarter === 1 ? 'Q1' : quarter === 2 ? 'Q2' : quarter === 3 ? 'Q3' : quarter === 4 ? 'Q4' : 'N/A', // 季度
                year // 年份
            };
        });
}


export { getEarningCalendar,fetchEarningsCalendarData };