import { get } from 'https';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import dotenv from 'dotenv';
import { json } from 'express';
dotenv.config();

const sp500 = await import('./datas/sp500.json', { assert: { type: 'json' } });
const customstock = await import('./datas/customstock.json', { assert: { type: 'json' } });
const dow30 = await import('./datas/dow30.json', { assert: { type: 'json' } })
const nasdaq100 = await import('./datas/nasdaq100.json', { assert: { type: 'json' } })
const combinelist = [...sp500.default, ...customstock.default, ...dow30.default, ...nasdaq100.default];

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// 日期 + 1 天
function addOneDay(date, days = 1) {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + days);
    return newDate.toISOString().split('T')[0];
}

// 日期 -1 天
function minusOneDay(date, days = 1) {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() - days);
    return newDate.toISOString().split('T')[0];
}

// 获取今天的日期
const today = new Date().toISOString().split('T')[0];

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

    return {
        date: _date,
        data: _data
    }
};

// 过滤数据
function filterData(earnings, stocklist) {

    if (!earnings.data) {
        console.error(earnings.date, ': No earnings data found.');
        return []; // 返回一个空数组避免后续处理出错
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
        time: earning.time ? earning.time === 'time-pre-market' ? '盘前' : earning.time === 'time-after-hours' ? '盘后' : '' : '',
        // 预期每股收益
        epsForecast: earning.epsForecast ? earning.epsForecast : '',
        // 预期分析师数量
        noOfEsts: earning.noOfEsts ? earning.noOfEsts : '',

        // 选择从 stockMap 中来的字段
        companyName: stockMap[earning.symbol].companyName ? stockMap[earning.symbol].companyName : earning.name ? earning.name : 'N/A',
        industry: stockMap[earning.symbol].industry ? stockMap[earning.symbol].industry : 'N/A'
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


// 获取财报日历数据
async function fetchEarningsCalendarData(date) {
    try {
        let beforeDays = 8;
        let alfterDays = 30;
        let newDate = date;
        let datas = [];

        // 将日期重置为 beforeDays 天前
        newDate = minusOneDay(date, beforeDays);

        // 后续数据
        const afterDatas = await getAfterDatas(newDate, alfterDays);
        datas = datas.concat(afterDatas);

        datas = formatData(datas);
        return datas;
    } catch (error) {
        console.error('Failed to fetch earnings calendar:', error);
        throw error;
    }
}

// 获取数据并合并
async function getAfterDatas(plusDate, days) {
    let datas = [];
    for (let i = 0; i < days; i++) {
        let data = await fetchEarningsData(plusDate);
        saveData(plusDate, data);
        data = filterData(data, combinelist);
        await sleep(100);
        if (data.data !== null) {
            datas.push(data);
            console.log('fetching date', plusDate, 'done');
        }
        plusDate = addOneDay(plusDate);
    }
    return datas;
};

// 保存数据到本地

function saveData(date, data) {

    //从 date 里面提取年月日
    const dateParts = date.split('-').map(Number);
    const year = dateParts[0];
    const month = dateParts[1].toString().padStart(2, '0');

    //确定保存路径，以年作为父目录，月作为子目录，如果不存在目录则创建
    const dir = `./storedData/${year}/${month}`;
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }

    // 只保存今天及以后的数据
    if (date >= today) {
        writeFileSync(`./storedData/${year}/${month}/${date}.json`, JSON.stringify(data, null, 2));
    }
}

// 创建 HTTP 请求处理函数
async function getEarningCal(req, res) {
    try {
        let date = req.query.date;
        console.log(combinelist);
        const data = await fetchEarningsCalendarData(date);
        res.status(200).json(data);
    } catch (error) {
        console.error('Failed to fetch earnings calendar:', error);
        res.status(500).json({ error: error.message });
    }
}

// 导出一个 HTTP 请求处理函数和一个数据获取函数
export { getEarningCal, fetchEarningsCalendarData };