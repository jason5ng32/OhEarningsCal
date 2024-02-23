import { get } from 'https';
import dotenv from 'dotenv';
dotenv.config();

const sp500 = await import('./sp500.json', { assert: { type: 'json' } });
const customstock = await import('./customstock.json', { assert: { type: 'json' } });
const combinelist = [...sp500.default, ...customstock.default];

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 日期 + 1 天
function addOneDay(date) {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + 1);
    return newDate.toISOString().split('T')[0];
}

// 日期 -1 天
function minusOneDay(date) {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() - 1);
    return newDate.toISOString().split('T')[0];
}

// 日期转换
function extractDateSimple(dateString) {
    // 使用正则表达式提取日期部分
    const [, month, day, year] = dateString.match(/(\w+) (\d+), (\d+)/);

    // 使用月份简写到月份数字的映射表
    const monthMapping = {
        Jan: "01",
        Feb: "02",
        Mar: "03",
        Apr: "04",
        May: "05",
        Jun: "06",
        Jul: "07",
        Aug: "08",
        Sep: "09",
        Oct: "10",
        Nov: "11",
        Dec: "12",
    };

    // 补全一位数日期和月份
    const paddedDay = day.length === 1 ? `0${day}` : day;
    const paddedMonth = monthMapping[month].length === 1 ? `0${monthMapping[month]}` : monthMapping[month];

    // 返回 YYYY-MM-DD 格式的日期字符串
    return `${year}-${paddedMonth}-${paddedDay}`;
}


// 从纳斯达克获取某一天的财报日历
async function fetchEarningsData(date) {
    const url = `https://api.nasdaq.com/api/calendar/earnings?date=${date}`;
    const options = {
        headers: {
            'accept': 'application/json, text/plain, */*',
            'accept-encoding': 'gzip, deflate, br',
            'accept-language': 'en-US,en;q=0.9',
            'origin': 'https://www.nasdaq.com',
            'referer': 'https://www.nasdaq.com/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/98.0.4758.102 Safari/537.36 Edg/98.0.1108.56'
        },
        method: 'GET',
        mode: 'cors'
    };
    console.log('fetching date', date);
    const res = await fetch(url, options);
    const data = await res.json();
    let _date = data.data.asOf;
    let _data = data.data.rows;

    // 转换日期格式
    _date = extractDateSimple(_date);
    console.log('fetched date', _date);

    return {
        date: _date,
        data: _data
    }
};

// 过滤数据

function filterData(earnings, stocklist) {
    // 首先检查 earnings 和 earnings.data 是否存在
    if (!earnings.data) {
        console.error(earnings.date, 'earnings.data is null or undefined');
        return []; // 返回一个空数组或根据需要进行其他处理
    }

    // 将 stocklist 转换为以 symbol 为键的对象，便于查找
    const stockMap = stocklist.reduce((acc, item) => {
        acc[item.symbol] = item;
        return acc;
    }, {});

    const originalDate = earnings.date;

    // 过滤 earnings.data，只保留在 stockMap 中存在的项目
    const filteredEarnings = earnings.data.filter(item => stockMap.hasOwnProperty(item.symbol));

    // 自定义返回的字段
    return filteredEarnings.map(earning => ({

        // 选择从 earnings 中来的字段

        symbol: earning.symbol,
        // 财报日期
        date: originalDate,
        // 市值
        marketCap: earning.marketCap ? earning.marketCap : 'N/A',
        // 财报季度
        fiscalQuarterEnding: earning.fiscalQuarterEnding ? earning.fiscalQuarterEnding : '',
        // 财报发布时间，盘前或盘后
        time: earning.time ? earning.time === 'time-pre-market' ? '盘前' : earning.time === 'time-after-hours' ? '盘后' : 'N/A' : 'N/A',
        // 预期每股收益
        epsForecast: earning.epsForecast ? earning.epsForecast : '',
        // 预期分析师数量
        noOfEsts: earning.noOfEsts ? earning.noOfEsts : '',

        // 选择从 stockMap 中来的字段
        companyName: stockMap[earning.symbol].companyName,
        industry: stockMap[earning.symbol].industry,
        establishDate: stockMap[earning.symbol].establishDate
    }));
}

// 最终数据格式化
function formatData(datas) {
    const result = [];
    datas.forEach(subArray => {
        if (subArray.length > 0) {
            result.push(...subArray);
        }
    });
    const uniqueData = Array.from(new Map(result.map(item => [item.symbol, item])).values());
    const sortedData = uniqueData.sort((a, b) => new Date(a.date) - new Date(b.date));
    return sortedData;
}


// 创建 HTTP 请求处理函数
async function fetchEarningsCalendarData(date) {
    try {
        let beforeDays = 8;
        let days = 25;
        let plusDate = addOneDay(date);
        let minusDate = date;
        let datas = [];

        // 前 8 天数据(包括当天)
        const beforeDatas = await getBeforeDatas(minusDate, beforeDays);
        datas = datas.concat(beforeDatas);

        // 后续数据
        const afterDatas = await getAfterDatas(plusDate, days);
        datas = datas.concat(afterDatas);

        datas = formatData(datas);
        return datas;
    } catch (error) {
        console.error('Failed to fetch earnings calendar:', error);
        throw error;
    }
}

async function getBeforeDatas(minusDate, beforeDays) {
    let datas = [];
    for (let i = 0; i < beforeDays; i++) {
        let data = await fetchEarningsData(minusDate);
        data = filterData(data, combinelist);
        await sleep(50);
        if (data.data !== null) {
            datas.push(data);
        }
        minusDate = minusOneDay(minusDate);
    }
    return datas;
}

async function getAfterDatas(plusDate, days) {
    let datas = [];
    for (let i = 0; i < days; i++) {
        let data = await fetchEarningsData(plusDate);
        data = filterData(data, combinelist);
        await sleep(50);
        if (data.data !== null) {
            datas.push(data);
        }
        plusDate = addOneDay(plusDate);
    }
    return datas;
};

async function getEarningCal(req, res) {
    try {
        let date = req.query.date;
        const data = await fetchEarningsCalendarData(date);
        res.status(200).json(data);
    } catch (error) {
        console.error('Failed to fetch earnings calendar:', error);
        res.status(500).json({ error: error.message });
    }
}


export { getEarningCal,fetchEarningsCalendarData };

