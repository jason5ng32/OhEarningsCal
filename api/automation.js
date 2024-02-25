import { getdata, getlist } from './getlist.js';
import { processData } from './processdata.js';
import { generateEarningsICSCalendar } from './genics.js';
import dotenv from 'dotenv';
dotenv.config();

const today = new Date().toISOString().split('T')[0];
let selected = [];
let shouldGenSelected = process.env.SHOULD_GEN_SELECTED === 'true' || false;
let shouldGenAll = process.env.SHOULD_GEN_ALL === 'true' || false;

async function genAllIcs() {
    const stocklist = await getdata() || {};
    const names = await getlist() || [];
    const total = names.length || 0;

    for (let i = 0; i < total; i++) {
        let stockArray = Object.values(stocklist[names[i]]);
        selected = [...selected, ...stockArray];

        console.log('Processing', names[i], '...');
        let finnalData = await processData(today, stockArray);
        generateEarningsICSCalendar(today, finnalData, names[i]);
    }

    if (shouldGenSelected) {
        generateEarningsICSCalendar(today, selected, 'selected');
    }

    if (shouldGenAll) {
        generateEarningsICSCalendar(today, null, 'all');
    }

    console.log('All done.');
}

export { genAllIcs };