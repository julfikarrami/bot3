const { Client, LocalAuth } = require("whatsapp-web.js");
const fs = require("fs-extra");
const cron = require("node-cron");
const axios = require("axios");
const moment = require("moment-timezone");

const DB = "./data.json";

if (!fs.existsSync(DB))
    fs.writeJsonSync(DB, { users: {}, weekly:{} });

const client = new Client({
    authStrategy: new LocalAuth({ clientId: "islamic-bot" }),
    puppeteer: {
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        headless: true,
        args: ["--no-sandbox","--disable-setuid-sandbox"]
    }
});

const sessions = {};

client.on("ready", ()=>console.log("🕌 Namaz Pro Bot Ready"));

client.on("message", async msg => {
    const chat = await msg.getChat();
    if(!chat.isGroup) return;

    if(msg.body === "/namaz"){
        sessions[msg.author]={step:1};
        return msg.reply("📝 আপনার নাম লিখুন");
    }

    if(sessions[msg.author]?.step===1){
        sessions[msg.author].name=msg.body;
        sessions[msg.author].step=2;
        return msg.reply("কোন কোন ওয়াক্ত পড়েছেন?\nফজর জোহর আসর মাগরিব এশা");
    }

    if(sessions[msg.author]?.step===2){
        const wakt=msg.body.split(" ");
        const data=fs.readJsonSync(DB);

        if(!data.users[sessions[msg.author].name])
            data.users[sessions[msg.author].name]=0;

        if(!data.weekly[sessions[msg.author].name])
            data.weekly[sessions[msg.author].name]=0;

        data.users[sessions[msg.author].name]+=wakt.length;
        data.weekly[sessions[msg.author].name]+=wakt.length;

        fs.writeJsonSync(DB,data);

        chat.sendMessage(
`╔══🕌 *নামাজ রিপোর্ট* 🕌══╗
👤 *${sessions[msg.author].name}*
📿 *${wakt.join(", ")}*

⭐ আজকের পয়েন্ট: +${wakt.length}

🤲 _আল্লাহ কবুল করুন_`
        );

        delete sessions[msg.author];
    }

    if(msg.body==="/points"){
        const data=fs.readJsonSync(DB);
        let t="🏆 *আজকের লিডারবোর্ড*\n\n";
        Object.entries(data.users).sort((a,b)=>b[1]-a[1])
        .forEach(([n,p],i)=>t+=`${i+1}. ${n} — ${p}⭐\n`);
        msg.reply(t);
    }

    if(msg.body==="/weekly"){
        const data=fs.readJsonSync(DB);
        let t="📊 *সাপ্তাহিক লিডারবোর্ড*\n\n";
        Object.entries(data.weekly).sort((a,b)=>b[1]-a[1])
        .forEach(([n,p],i)=>t+=`${i+1}. ${n} — ${p}⭐\n`);
        msg.reply(t);
    }
});

// Auto reset 12AM
cron.schedule("0 0 * * *", ()=>{
    const data=fs.readJsonSync(DB);
    data.users={};
    fs.writeJsonSync(DB,data);
    client.chats.cache.filter(c=>c.isGroup).forEach(c=>{
        c.sendMessage("🌙 নতুন দিন শুরু — আজকের আমল শুরু করুন");
    });
},{timezone:"Asia/Dhaka"});

// Azan reminder
cron.schedule("*/30 * * * *", async ()=>{
    try{
        const res=await axios.get("https://api.aladhan.com/v1/timingsByCity?city=Rajshahi&country=Bangladesh&method=1");
        const t=res.data.data.timings;
        const now=moment().tz("Asia/Dhaka").format("HH:mm");
        for(const [name,time] of Object.entries(t)){
            if(time===now)
                client.chats.cache.filter(c=>c.isGroup).forEach(c=>{
                    c.sendMessage(`🕋 ${name} এর সময় হয়েছে — নামাজ আদায় করুন`);
                });
        }
    }catch{}
});

client.initialize();
