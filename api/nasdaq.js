import { writeFileSync, existsSync, mkdirSync } from 'fs';
import dotenv from 'dotenv';
dotenv.config();

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


// 获取财报日历数据
async function fetchEarningsCalendarData(date = today) {
    try {
        let beforeDays = 1;
        let alfterDays = 31;
        let newDate = date;

        // 将日期重置为 beforeDays 天前，默认重新获取前一天的数据
        newDate = minusOneDay(date, beforeDays);

        // 获取数据，默认获取后 30 天的数据
        await getAfterDatas(newDate, alfterDays);
        return;

    } catch (error) {
        console.error('Failed to fetch earnings calendar:', error);
        throw error;
    }
}

// 获取并保存
async function getAfterDatas(plusDate, days) {
    for (let i = 0; i < days; i++) {
        let data = await fetchEarningsData(plusDate);
        saveData(plusDate, data);
        await sleep(100);
        plusDate = addOneDay(plusDate);
    }
    console.log(days + ' days data has been fetched and saved.');
};

// 保存数据到本地
function saveData(date, data) {

    //从 date 里面提取年月日
    const dateParts = date.split('-').map(Number);
    const year = dateParts[0];
    const month = dateParts[1].toString().padStart(2, '0');

    //保存文件
    const dir = `./storedData/${year}/${month}`;
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }

    // 保存数据
    if (date) {
        writeFileSync(`./storedData/${year}/${month}/${date}.json`, JSON.stringify(data, null, 2));
        console.log('Data saved to', `./storedData/${year}/${month}/${date}.json`);
    }

    return;
};

export { fetchEarningsCalendarData };