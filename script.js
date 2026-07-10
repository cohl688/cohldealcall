let globalExcelData = [];
let config = {};

// 初始化時加載配置
fetch('config.json')
    .then(response => response.json())
    .then(data => {
        config = data;
        console.log("Configuration loaded.");
    });

const fmtMoney = (num) => Number(num).toLocaleString('en-US');

function formatTower(rawName) {
    if (!rawName) return '';
    let t = String(rawName).trim();
    t = t.replace(/Tower 1A of Tower 1/g, 'T1A');
    t = t.replace(/Tower 1B of Tower 1/g, 'T1B');
    t = t.replace(/Tower 2A of Tower 2/g, 'T2A');
    t = t.replace(/Tower 2B of Tower 2/g, 'T2B');
    return t;
}

function formatCommission(comm) {
    let s = String(comm).trim();
    if (!s || s === 'undefined') return '';
    if (s.includes('%')) return s;
    let v = parseFloat(s);
    if (isNaN(v)) return s;
    if (v < 1) return (v * 100).toFixed(1).replace(/\.0$/, '') + '%';
    return v + '%';
}

function parseExcelDate(dateVal) {
    if (!dateVal) return null;
    if (typeof dateVal === 'number') {
        const date = new Date(Math.round((dateVal - 25569) * 86400 * 1000));
        return date.toISOString().split('T')[0];
    }
    if (typeof dateVal === 'string') {
        let parts = dateVal.split(/[-/]/);
        if (parts.length === 3) {
            if (parts[2].length === 4) return `${parts[2]}-${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
            if (parts[0].length === 4) return `${parts[0]}-${parts[1].padStart(2,'0')}-${parts[2].padStart(2,'0')}`;
        }
    }
    return dateVal;
}

function formatOutputDate(dateStr) {
    if(!dateStr) return "";
    let d = new Date(dateStr);
    let days = ['日','一','二','三','四','五','六'];
    return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()} (${days[d.getDay()]})`;
}

function formatShortDate(dateStr) {
    if(!dateStr) return "";
    let d = new Date(dateStr);
    let days = ['日','1','2','3','4','5','6']; // Adjusted for logic
    let dayName = ['日','一','二','三','四','五','六'];
    return `${d.getDate()}/${d.getMonth()+1}（${dayName[d.getDay()]}）`;
}

document.getElementById('excelFile').addEventListener('change', function(e) {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = function(e) {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, {type: 'array'});
        globalExcelData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {header: 1, raw: false});
        loadDailySales();
    };
    reader.readAsArrayBuffer(file);
});

function loadDailySales() {
    const dateStr = document.getElementById('reportDate').value;
    if (!dateStr || globalExcelData.length === 0) return;

    const container = document.getElementById('unitCardsContainer');
    container.innerHTML = '';
    let count = 0;

    for (let i = 1; i < globalExcelData.length;; i++) { // Fixed logic for looping
        let row = globalExcelData[i];
        if (!row || row.length < 2) continue;
        let isoDate = parseExcelDate(row[1]);
        
        if (isoDate === dateStr) {
            count++;
            let tower = formatTower(row[5]);
            let unitName = `${tower}-${row[6]||''}${row[7]||''}`;
            let rawComm = row[15] || '';
            let fmtComm = formatCommission(rawComm);

            let card = document.createElement('div');
            card.className = 'unit-card';
            card.dataset.index = i;
            card.innerHTML = `
                <div class="unit-info">${unitName} | 實呎 ${row[10]}’ | ${row[8]}</div>
                <div>
                    <select class="method-select" style="width:100%" onchange="generateReports()">
                        <option value="（招標售出）" selected>招標續選</option>
                        <option value="（價單售出）">價單售出</option>
                    </select>
                </div>
                <div>
                    <select class="purpose-select" style="width:100%" onchange="generateReports()">
                        <option value="(自住)" selected>自住</option>
                        <option value="(投資)">投資</option>
                    </select>
                </div>
                <div>
                    <input type="text" class="comm-input" value="${fmtComm}" placeholder="佣金" style="width:90%" oninput="generateReports()">
                </div>
            `;
            container.appendChild(card);
        }
    }
    document.getElementById('dailyCount').innerText = count;
    document.getElementById('tuningPanel').style.display = count > 0 ? 'block' : 'none';
    if (count > 0) generateReports();
}

function generateReports() {
    const reportDateStr = document.getElementById('reportDate').value;
    if (!reportDateStr || globalExcelData.length === 0) return;

    let tunedData = {};
    document.querySelectorAll('.unit-card').forEach(card => {
        let idx = card.dataset.index;
        tunedData[idx] = {
            method: card.querySelector('.method-select').value,
            purpose: card.querySelector('.purpose-select').value,
            comm: card.querySelector('.comm-input').value
        };
    });

    let dailySales = [];
    let stats = {
        '2021': 0, '2022': 0, '2023': 0, '2024': 0, '2025': 0, '2026': 0,
        y2026Amt: 0, y2026Area: 0, postNov23Count: 0, postNov23Amt: 0, postNov23Area: 0,
        postFeb24Count: 0, postFeb24Amt: 0, postFeb24Area: 0, totalCount: 0, totalAmt: 0, totalArea: 0
    };

    for (let i = 1; i < globalExcelData.length; i++) {
        let row = globalExcelData[i];
        if (!row || row.length < 2) continue;
        let isoDate = parseExcelDate(row[1]);
        if (!isoDate) continue;

        let year = isoDate.substring(0, 4);
        let contractAmt = parseFloat(String(row[9]).replace(/,/g, '')) || 0;
        let area = parseFloat(String(row[10]).replace(/,/g, '')) || 0;

        stats.totalCount++; stats.totalAmt += contractAmt; stats.totalArea += area;
        if (stats[year] !== undefined) stats[year]++;
        if (year === '2026') { stats.y2026Amt += contractAmt; stats.y2026Area += area; }
        if (isoDate >= '2023-11-11') { stats.postNov23Count++; stats.postNov23Amt += contractAmt; stats.postNov23Area += area; }
        if (isoDate >= '2024-02-28') { stats.postFeb24Count++; stats.postFeb24Amt += contractAmt; stats.postFeb24Area += area; }

        if (isoDate === reportDateStr) {
            let tData = tunedData[i] || { method: '（招標售出）', purpose: '(自住)', comm: formatCommission(row[15]) };
            dailySales.push({
                unit: `${formatTower(row[5])}-${row[6]||''}${row[7]||''}`,
                area: area, psf: parseFloat(String(row[11]).replace(/,/g, '')) || 0,
                layout: row[8] || '', idType: config.id_mapping[row[2]] || `(${row[2]})`,
                amt: contractAmt, payment: row[12] || '',
                agency: row[13] || '', branch: row[14] || '',
                method: tData.method, purpose: tData.purpose, comm: tData.comm
            });
        }
    }

    // Report 1
    let out1 = `維港1號 開單 ${formatOutputDate(reportDateStr)}\n\n`;
    dailySales.forEach((sale, index) => {
        let numEmoji = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'][index] || `(${index+1})`;
        out1 += `${numEmoji} ${sale.unit} ${sale.method}\n`;
        out1 += `實呎 ${sale.area}’ @$${fmtMoney(sale.psf)}\n`;
        out1 += `戶型: ${sale.layout} ${sale.idType} ${sale.purpose}\n`;
        out1 += `合額：$${fmtMoney(sale.amt)}\n`;
        out1 += `付款：${sale.payment}\n`;
        out1 += `代理：${sale.agency}-${sale.branch}\n`;
        out1 += `佣金：${sale.comm}\n\n`;
    });
    if(dailySales.length === 0) out1 += "本日無成交記錄。\n";

    // Report 2
    let percent = ((stats.totalCount / config.total_units) * 100).toFixed(1);
    let out2 = `是日累售：${dailySales.length}伙\n\n`;
    ['2021','2022','2023','2024','2025'].forEach(y => out2 += `${y}年累售：${stats[y]}伙\n`);
    out2 += `2026年累售：${stats['2026']}伙 (合約金額$${(stats.y2026Amt/100000000).toFixed(2)}億) (平均呎價$${fmtMoney((stats.y2026Amt/stats.y2026Area).toFixed(0))})\n\n`;
    out2 += `(2023年11月11日推出優惠後售出${stats.postNov23Count}伙，合約金額$${(stats.postNov23Amt/100000000).toFixed(2)}億) (平均呎價$${fmtMoney((stats.postNov23Amt/stats.postNov23Area).toFixed(0))})\n`;
    out2 += `(2024年2月28日撤辣後售出${stats.postFeb24Count}伙，合約金額$${(stats.postFeb24Amt/100000000).toFixed(2)}億) [平均呎價$${fmtMoney((stats.postFeb24Amt/stats.postFeb24Area).toFixed(0))}]\n\n`;
    out2 += `總累售：${fmtMoney(stats.totalCount)}伙 (合約金額$${(stats.totalAmt/100000000).toFixed(2)}億) (平均呎價$${fmtMoney((stats.totalAmt/stats.totalArea).toFixed(0))})\n`;
    out2 += `總累售（佔總伙數％）：${fmtMoney(stats.totalCount)}伙（${percent}％）\n`;
    out2 += `總單位數：${fmtMoney(config.total_units)}伙\n`;
    out2 += `現之可供出售單位數: ${document.getElementById('availUnits').value}伙\n`;

    // Report 3
    let out3 = `🛥維港1號🛥\n🔥高佣💰，即食🉐，再錄成交💥\n\n`;
    out3 += `${formatShortDate(reportDateStr)}：成交 ${['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'][dailySales.length-1] || dailySales.length} 粒\n\n`;

    let agencyStats = {};
    dailySales.forEach(sale => {
        let matchedConfig = config.agency_config.find(c => c.keys.some(k => sale.agency.includes(k)));
        let agencyName = matchedConfig ? matchedConfig.name : sale.agency;
        let emoji = matchedConfig ? matchedConfig.emojis : '⚪';
        if (!agencyStats[agencyName]) agencyStats[agencyName] = { emoji: emoji, count: 0, details: [] };
        agencyStats[agencyName].count++;
        agencyStats[agencyName].details.push(`${sale.branch}：1 (${sale.unit} ${sale.area}’ ${sale.layout})`);
    });

    config.agency_config.forEach(conf => {
        if (agencyStats[conf.name]) {
            out3 += `${agencyStats[conf.name].emoji} ${conf.name}：${agencyStats[conf.name].count}\n`;
            agencyStats[conf.name].details.forEach(d => out3 += `${d}\n`);
            out3 += `\n`;
        }
    });

    Object.keys(agencyStats).forEach(key => {
        if (!config.agency_config.find(c => c.name === key)) {
            out3 += `${agencyStats[key].emoji || '⚪'} ${key}：${agencyStats[key].count}\n`;
            agencyStats[key].details.forEach(d => out3 += `${d}\n`);
            out3 += `\n`;
        }
    });

    document.getElementById('out1').innerText = out1;
    document.getElementById('out2').innerText = out2;
    document.getElementById('out3').innerText = out3;
    document.getElementById('outputArea').style.display = 'block';
}

function copyText(id) {
    navigator.clipboard.writeText(document.getElementById(id).innerText).then(() => {
        alert('已複製到剪貼簿！');
    });
}
