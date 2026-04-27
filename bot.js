
const express = require('express');
const fetch = require('node-fetch');

const app = express();
const PORT = 3000;

// data store
let latestData = {
  primary: "-",
  backup: "-",
  tertiary: "-",
  win: 0,
  loss: 0,
  period: 0
};

// APIs
const APIs = [
  "https://draw.ar-lottery01.com/WinGo/WinGo_30S/GetHistoryIssuePage.json",
  "https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json"
];

// helper
function sizeOf(n){
  return n >= 5 ? "Big" : "Small";
}

function trendMajority(arr){
  let big=0, small=0;
  arr.forEach(n => n>=5 ? big++ : small++);
  return big >= small ? "Big" : "Small";
}

// fetch data
async function getData(){
  for(let api of APIs){
    try{
      const res = await fetch(api + "?t=" + Date.now());
      const text = await res.text();

      if(text.includes("<html")) continue;

      const data = JSON.parse(text);

      if(data?.data?.list){
        return data;
      }

    }catch(e){}
  }
  return null;
}

// main loop
async function tick(){
  const data = await getData();
  if(!data) return;

  const list = data.data.list;
  const results = list.map(x => parseInt(x.number));

  let trend = trendMajority(results);

  let primary = trend;
  let backup = trend === "Big" ? "Small" : "Big";

  latestData = {
    primary,
    backup,
    tertiary: trend,
    win: latestData.win,
    loss: latestData.loss,
    period: Date.now()
  };
}

// loop run
setInterval(tick, 3000);

// serve html
app.use(express.static(__dirname));

// API route
app.get('/data', (req, res) => {
  res.json(latestData);
});

// start server
app.listen(PORT, () => console.log("🚀 Server running"));
