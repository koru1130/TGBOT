var request = require('request');
var EventEmitter = require("events").EventEmitter;
var util = require("util");

/**
 * 物件TGBOT
 * 
 * @class TGBOT
 * @constructor
 * @param {Object} options 選項
 */
function TGBOT(options) {
    EventEmitter.call(this);

    this.token = options.token;
    this.pollingTimeout = options.pollingTimeout || 40;
    this.help = options.help;

    this.cmdList = {};
    this.onCBQList = [];
    this.onReplyList = [];

    this.lastOffset = null;
    this.username = null;
    this.cmdRegex = null;
}
util.inherits(TGBOT, EventEmitter);
/**
 * 啟動bot
 * @method start
 */
TGBOT.prototype.start = function() {
    var self = this;
    this.getUpdates(self.pollingTimeout, null);
    this.getMe(function(error, result) {
        if (error) console.log(error);
        self.username = result.username;
        self.cmdRegex = new RegExp("^\/(\\w+)(?:@" + self.username + ")?(?: (.*))?$", "i");
    });
    if (self.help) {
        self.addCmd('help', function(message, args) {
            if (args[1]&&self.cmdList[args[1]]) {
                message.replyMsg(self.cmdList[args[1]].helpMsg || (self.cmdList[args[1]].desc || "Command " + args[1] + " not found or nothing to display :("));
            }
            else {
                message.replyMsg(self.genHelp());
            }
        }, "Show help", "/help command\nShow how to use the command\nIf no argument,show the commnad list");
    }
};

TGBOT.prototype.getUpdates = function(timeout, offset) {
    var self = this;

    var params = {
        timeout: timeout
    };
    if (offset != null) {
        params.offset = offset;
    }

    self._invoke('getUpdates', params, function(error, result) {
        if (error != null) {
            self.lastOffset = null;
            console.log(error.toString());
        }
        else {
            result.forEach(function(update) {
                if (update.update_id >= self.lastOffset) {
                    self.lastOffset = update.update_id;
                }
                if (update.message) {
                    var message = self.addMethodToMessage(update.message);
                    self.emit('message', message);
                    if (message.text) self.execCmd(message);
                    if (message.reply_to_message) {
                        var onReply = self.onReplyList.find(function(element) {
                            return element.id == message.reply_to_message.message_id;
                        });
                        if (onReply) onReply.fn(message);
                    }
                    //console.log(update.message);
                }
                else if (update.inline_query) {
                    self.emit('inline_query', update.inline_query);
                }
                else if (update.chosen_inline_result) {
                    self.emit('chosen_inline_result', update.chosen_inline_result);
                }
                else if (update.edited_message) {
                    self.emit('edited_message', update.edited_message);
                }
                else if (update.callback_query) {
                    self.emit('callback_query', update.callback_query);
                    if (update.callback_query.message) {
                        var onCBQ = self.onCBQList.find(function(element) {
                            return element.id == update.callback_query.message.message_id;
                        });
                        if (onCBQ) onCBQ.fn(update.callback_query);
                    }
                }

            });
        }
        self.getUpdates(timeout, self.lastOffset + 1);
    }, timeout * 1000 + 15000);

};

TGBOT.prototype.addMethodToMessage = function(message, oldDatas) {
    if (!message) return;
    var self = this;
    message.sendToChat = function(text, datas, cb) {
        return self.sendMessage(message.chat.id, text, datas, cb);
    };
    message.replyMsg = function(text, datas, cb) {
        datas = typeof datas === "object" ? datas : {};
        datas.reply_to_message_id = message.message_id;
        return self.sendMessage(message.chat.id, text, datas, cb);
    };

    if (message.from.username == self.username) {
        message.editText = function(text, datas, cb) {
            datas = typeof datas === "object" ? datas : {};
            datas.chat_id = message.chat.id;
            datas.message_id = message.message_id;
            if (oldDatas && !datas.reply_markup) datas.reply_markup = oldDatas.reply_markup;
            return self.editMessageText(text, datas, cb);
        };
        message.editCaption = function(caption, datas, cb) {
            datas = typeof datas === "object" ? datas : {};
            datas.chat_id = message.chat.id;
            datas.message_id = message.message_id;
            if (oldDatas && !datas.reply_markup) datas.reply_markup = oldDatas.reply_markup;
            return self.editMessageCaption(caption, datas, cb);
        };
        message.editReplyMarkup = function(replyMarkup, datas, cb) {
            datas = typeof datas === "object" ? datas : {};
            datas.chat_id = message.chat.id;
            datas.message_id = message.message_id;
            return self.editMessageReplyMarkup(replyMarkup, datas, cb);
        };
    }
    else {
        message.sendToUser = function(text, datas, cb) {
            return self.sendMessage(message.from.id, text, datas, cb);
        };
    }
    return message;
};

TGBOT.prototype.answerCallbackQuery = function(callback_query_id, text, show_alert, cb) {
    var datas = {};
    datas.callback_query_id = callback_query_id;
    datas.text = text || "";
    datas.show_alert = show_alert || false;
    return this._invoke('answerCallbackQuery', datas, cb);
};

TGBOT.prototype._invoke = function(apiName, params, cb, timeout, multiPart) {
    cb = cb || function() {};
    timeout = timeout || 15000;
    console.log("[INVOKE]", apiName, params);
    var targetURL = 'https://api.telegram.org/bot' + this.token + '/' + apiName;

    var requestData = {
        url: targetURL,
        timeout: timeout // 15 sec
    };

    if (!multiPart || !params) {
        params = params || {};
        requestData.form = params;
    }
    else {
        params = params || {};
        requestData.formData = params;
    }
    //console.log(requestData);
    request.post(requestData, function(err, response, body) {
        // console.log(response);
        if (err || response.statusCode !== 200) {
            return cb(err || new Error(body));
        }
        try {
            body = JSON.parse(body);
        }
        catch (e) {
            return cb(e);
        }
        if (body.ok !== true) {
            return cb(new Error('response is not ok'));
        }
        cb(null, body.result);
    });
};
/**
 * 獲取bot資訊
 * @method getMe
 * @param {Function} cb callback
 */
TGBOT.prototype.getMe = function getMe(cb) {
    return this._invoke('getMe', null, cb);
};
/**
 * 發送訊息
 * @method sendMessage
 * @param chat_id 要送到哪
 * @param {String} text 要發送的文字
 * @param {Object} [datas] 其他資料
 * @cb {Function} [cb] callback
 */
TGBOT.prototype.sendMessage = function sendMessage(chat_id, text, datas, cb) {
    var self = this;
    datas = typeof datas === "object" ? datas : {};
    datas.chat_id = chat_id;
    datas.text = text;
    var onCBQ, message, onReply;
    this._invoke('sendMessage', datas, function(err, result) {
        if (err) console.log(err);
        message = self.addMethodToMessage(result, datas);
        if (message) {
            if (onCBQ) {
                self.onCBQList.push({
                    id: message.message_id,
                    fn: onCBQ
                });
            }
            if (onReply) {
                self.onReplyList.push({
                    id: message.message_id,
                    fn: onReply
                });
            }
        }
        if (cb) cb(err, message);
    });

    var returnValue = {
        onCallbackQuery: function(fn) {
            onCBQ = function(cbq) {
                if (message) cbq.message = message;
                if (cbq) {
                    cbq.answer = function(text, show_alert, cb) {
                        self.answerCallbackQuery(cbq.id, text, show_alert, cb);
                    };
                }
                fn(cbq);
            };
            return returnValue;
        },
        onReply: function(fn) {
            onReply = function(newMsg) {
                fn(newMsg, message);
            };
            return returnValue;
        }
    };
    return returnValue;
};
/**
 * 回復訊息
 * @method replyMessage
 * @param chat_id 要送到哪
 * @param reply_to_message_id 回復的訊息id
 * @param {String} text 要發送的文字
 * @param {Object} [datas] 其他資料
 * @cb {Function} [cb] callback
 */
TGBOT.prototype.replyMessage = function replyMessage(chat_id, reply_to_message_id, text, datas, cb) {
    datas = typeof datas === "object" ? datas : {};
    datas.reply_to_message_id = reply_to_message_id;
    this.sendMessage(chat_id, text, datas, cb)
};
/**
 * 轉傳訊息
 * @method forwardMessage
 * @param chat_id 要送到哪
 * @param from_chat_id 來源id
 * @param message_id 要轉傳的訊息id
 * @param {String} text 要發送的文字
 * @param {Object} [datas] 其他資料
 * @cb {Function} [cb] callback
 */
TGBOT.prototype.forwardMessage = function forwardMessage(chat_id, from_chat_id, message_id, datas, cb) {
    datas = typeof datas === "object" ? datas : {};
    datas.chat_id = chat_id;
    datas.from_chat_id = from_chat_id;
    datas.message_id = message_id;
    return this._invoke('forwardMessage', datas, cb);
};
/**
 * 添加指令
 * @method addCmd
 * @param {String} cmd 指令名稱
 * @param {Function} script 指令的內容
 * @param {String} desc 簡短描述
 * @param {String} helpMsg 說明文字
 */
TGBOT.prototype.addCmd = function(cmd, script, desc, helpMsg) {
    this.cmdList[cmd] = {
        cmd: cmd,
        script: script,
        desc: desc,
        helpMsg: helpMsg
    };
    console.log("Added Command : " + cmd);
};

TGBOT.prototype.execCmd = function(message) {
    var self = this;
    var result = message.text.match(this.cmdRegex);
    var cmd;
    var args = [];
    if (result) {
        cmd = result[1];
        args[0] = result[2];
        args = args.concat(result[2] ? result[2].split(' ') : []);
        if (this.cmdList[cmd]) {
            this.cmdList[cmd].script(message, args);
            console.log("[COMMAND]", cmd, args);
        }
    }
};

TGBOT.prototype.editMessageText = function(text, datas, cb) {
    datas = typeof datas === "object" ? datas : {};
    if (!(datas.inline_message_id || (datas.chat_id && datas.message_id))) {
        return false;
    }
    datas.text = text;
    return this._invoke('editMessageText', datas, cb);
};

TGBOT.prototype.editMessageCaption = function(caption, datas, cb) {
    datas = typeof datas === "object" ? datas : {};
    if (!(datas.inline_message_id || (datas.chat_id && datas.message_id))) {
        return false;
    }
    datas.caption = caption;
    return this._invoke('editMessageCaption', datas, cb);
};

TGBOT.prototype.editMessageReplyMarkup = function(replyMarkup, datas, cb) {
    datas = typeof datas === "object" ? datas : {};
    if (!(datas.inline_message_id || (datas.chat_id && datas.message_id))) {
        return false;
    }
    datas.reply_markup = replyMarkup;
    return this._invoke('editMessageReplyMarkup', datas, cb);
};
/**
 * 產生Help
 * @method genHelp
 * @param {Function} Help的格式
 * @return {String} help help
 */
TGBOT.prototype.genHelp = function(format) {
    var self = this;
    var help = "";
    format = format || (command => "/" + command.cmd + " : " + command.desc + "\n");
    for (var command in self.cmdList) {
        help += format(self.cmdList[command]);
    }
    return help;
};

module.exports = TGBOT;
