import { readFileSync, readdirSync } from 'fs';

// 从 ./datas/ 目录下检索所有 json 文件名称，并导入为变量
async function getlist() {
    const files = readdirSync('./api/datas');
    const list = files.filter(item => item.endsWith('.json'));
    list.forEach((item, index) => {
        list[index] = item.replace('.json', '');
    });
    return list;
};

// 以文件名为参数，返回对应的 json 数据
async function getdata() {
    const filenames = await getlist();
    const data = {};
    for (const filename of filenames) {
        data[filename] = readFileSync(`./api/datas/${filename}.json`, 'utf8');
        data[filename] = JSON.parse(data[filename]);
    }
    return data;
    
};

getdata();

export { getlist,getdata };



