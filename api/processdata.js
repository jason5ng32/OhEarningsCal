import { existsSync, readFileSync } from 'fs';

// 重复次数
const beforeDays = 30;
const afterDays = 30;
const repeatTimes = beforeDays + afterDays;

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


// 过滤数据
function filterData(earnings, stocklist) {

    if (earnings) {
        earnings = JSON.parse(earnings);
    } else {
        return [];
    }

    if (!earnings.data) {
        console.error('Filtering date', earnings.date, ' error: Looks like it is weekend, no earnings data available.');
        return [];
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
};

// 过滤数据(全部数据)
function filterData_all(earnings) {

    if (earnings) {
        earnings = JSON.parse(earnings);
    } else {
        return [];
    }

    if (!earnings.data) {
        console.error('Filtering date', earnings.date, ' error: Looks like it is weekend, no earnings data available.');
        return [];
    }

    const originalDate = earnings.date;
    const filteredEarnings = earnings.data;

    // 自定义返回的字段
    return filteredEarnings.map(earning => ({

        symbol: earning.symbol,
        date: originalDate,
        marketCap: earning.marketCap ? earning.marketCap : 'N/A',
        fiscalQuarterEnding: earning.fiscalQuarterEnding ? earning.fiscalQuarterEnding : '',
        time: earning.time ? earning.time === 'time-pre-market' ? '盘前' : earning.time === 'time-after-hours' ? '盘后' : '' : '',
        epsForecast: earning.epsForecast ? earning.epsForecast : '',
        noOfEsts: earning.noOfEsts ? earning.noOfEsts : '',
        companyName: earning.name ? earning.name : 'N/A',
        industry: 'N/A'
    }));
};

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
};

// 读取数据并做过滤处理
async function readData(date, list) {
    let newDate = resetDate(date);
    let days = repeatTimes;
    let datas = [];
    for (let i = 0; i < days; i++) {
        let data = await fetchLocalDatas(newDate);

        if (list === null) {
            data = filterData_all(data, list);
        }
        else {
            data = filterData(data, list);
        }

        await sleep(50);
        if (data.data !== null) {
            datas.push(data);
            console.log('Reading date', newDate, 'done');
        }
        newDate = addOneDay(newDate);
    }
    return datas;
};

// 重置请求日期
function resetDate(date) {
    let newDate = date;
    newDate = minusOneDay(date, beforeDays);
    return newDate;
};

// 拆分从本地获取数据
async function fetchLocalDatas(date) {

    //从 date 里面提取年月日
    const dateParts = date.split('-').map(Number);
    const year = dateParts[0];
    const month = dateParts[1].toString().padStart(2, '0');

    // 本地文件路径
    const filePath = `./storedData/${year}/${month}/${date}.json`;

    // 如果文件存在，直接读取

    if (existsSync(filePath)) {
        return readFileSync(filePath, 'utf8');
    } else {
        console.log('No data found for', date, ',skipped');
        return;
    }
};

// 主程序
async function processData(date, list) {
    try {
        let datas = await readData(date, list);
        let finalData = formatData(datas);
        return finalData;
    } catch (error) {
        console.error('Failed to process data:', error);
        throw error;
    }
};

export { processData };