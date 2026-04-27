const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fetch = require("node-fetch");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const API_BASE = "https://draw.ar-lottery01.com/WinGo/WinGo_";

app.use(express.static(path.join(__dirname, "public")));

let store = {};

function size(n){ return n>=5 ? "Big" : "Small"; }

async function getData(game){
  try{
    const res = await fetch(API_BASE+game+"/GetHistoryIssuePage.json?t="+Date.now());
    const j = await res.json();
    const list = j?.data?.list || [];
    return {
      numbers: list.map(x=>parseInt(x.number)).filter(Boolean),
      period: list[0]?.issueNumber
    };
  }catch(e){
    return {numbers:[], period:null};
  }
}

function predict(nums){
  let big=0, small=0;
  nums.slice(0,20).forEach(n=>n>=5?big++:small++);

  let primary = big>=small ? "Big" : "Small";
  let backup = primary==="Big" ? "Small" : "Big";
  let tertiary = Math.random()>0.5?"Big":"Small";

  return {primary,backup,tertiary,active:primary};
}

async function loop(game){
  if(!store[game]) store[game]={logs:[],lastPeriod:null};

  const s = store[game];
  const {numbers,period} = await getData(game);

  if(!numbers.length) return;

  if(period !== s.lastPeriod){

    let pred = predict(numbers);
    let actual = size(numbers[0]);
    let result = pred.active===actual ? "Win" : "Loss";

    s.logs.push({
      period,
      primary:pred.primary,
      backup:pred.backup,
      tertiary:pred.tertiary,
      actual,
      result,
      time:new Date().toLocaleTimeString()
    });

    if(s.logs.length>50) s.logs.shift();

    s.lastPeriod = period;

    io.to(game).emit("update",{
      ...pred,
      logs:s.logs
    });
  }
}

io.on("connection",(socket)=>{
  let game="30S";
  socket.join(game);

  socket.on("changeGame",(g)=>{
    socket.leave(game);
    game=g;
    socket.join(game);
  });
});

setInterval(()=>{
  ["30S","1M","3M","5M"].forEach(loop);
},3000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, ()=>console.log("Running on "+PORT));
