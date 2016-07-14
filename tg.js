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
function TGBOT (options) {
    EventEmitter.call(this);
    
    this.token = options.token; 
    this.pollingTimeout = options.pollingTimeout || 40;
    this.help = options.help;
    
    this.cmdList = {};
    
    this.lastOffset = null;
    this.username = null;
    this.cmdRegex = null;
}
util.inherits(TGBOT, EventEmitter);
/**
 * 啟動bot
 * @method start
 */
TGBOT.prototype.start = function(){
    var self=this;
    this.getUpdates(self.pollingTimeout,null);
    this.getMe(function(error,result){
        if(error){console.log(error)}
        self.username = result.username;
        self.cmdRegex = new RegExp("^\/(\\w+)(?:@"+self.username+")?(?: (.*))?$","i");
    });
    if(self.help){
        self.addCmd('help',function(toolBox,args){
            if(args[0]){
                toolBox.replyMsg(self.cmdList[args[0]].helpMsg || (self.cmdList[args[0]].desc || "Command " + args[0] + " not found or nothing to display :("));
            }else{
                toolBox.replyMsg(self.genHelp());
            }
        },"Show help","/help command\nShow how to use the command\nIf no argument,show the commnad list");
    }
};

TGBOT.prototype.getUpdates = function(timeout,offset){
    var self = this;
    
    var params = {
        timeout: timeout
    };
    if (offset != null) {
        params.offset = offset;
    }
    
    self._invoke('getUpdates',params,function(error,result){
        if(error!=null){
            self.lastOffset = null;
            console.log(error.toString());
        }else{
            result.forEach(function(update){
                if (update.update_id >= self.lastOffset) {
                        self.lastOffset = update.update_id;
                    }
                if (update.message) {
                    self.emit('message', update.message);
                    if(update.message.text){self.execCmd(update.message)}
                    //console.log(update.message);
                } else if (update.inline_query) {
                    self.emit('inline_query', update.inline_query);
                } else if (update.chosen_inline_result) {
                    self.emit('chosen_inline_result', update.chosen_inline_result);
                }
                
            });
        }
        self.getUpdates(timeout,self.lastOffset+1);
    },timeout*1000+15000);
    
};

TGBOT.prototype._invoke = function(apiName,params,cb,timeout,multiPart){
    cb = cb || function(){};
    timeout = timeout || 15000;
    console.log("[INVOKE]",apiName,params);
    var targetURL = 'https://api.telegram.org/bot' + this.token + '/' + apiName;

    var requestData = {
        url: targetURL,
        timeout: timeout // 15 sec
    };
    
    if (!multiPart || !params) {
        params = params || {};
        requestData.form = params;
    } else {
        params = params || {};
        requestData.formData = params;
    }
    //console.log(requestData);
    request.post(requestData, function (err, response, body) {
        // console.log(response);
        if (err || response.statusCode !== 200) {
            return cb(err || new Error('unexpect response code: ' + response.statusCode + ' ' + body));
        }
        try {
            body = JSON.parse(body);
        } catch (e) {
            return cb(e);
        }
        if (body.ok !== true) {
            return cb (new Error('response is not ok'));
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
    return this._invoke('getMe', null , cb);
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
    datas = typeof datas === "object" ? datas : {};
    datas.chat_id = chat_id;
    datas.text = text;
    return this._invoke('sendMessage', datas , cb);
};
/**
 * 添加指令
 * @method addCmd
 * @param {String} cmd 指令名稱
 * @param {Function} script 指令的內容
 * @param {String} desc 簡短描述
 * @param {String} helpMsg 說明文字
 */
TGBOT.prototype.addCmd = function(cmd,script,desc,helpMsg){
    this.cmdList[cmd] = {cmd:cmd,script:script,desc:desc,helpMsg:helpMsg};
    console.log("Added Command : "+cmd);
};

TGBOT.prototype.execCmd = function(message){
    var self= this;
    var result = message.text.match(this.cmdRegex);
    var cmd,args;
    if(result){
        cmd=result[1];
        args = result[2] ? result[2].split(' ') : [];
        if (this.cmdList[cmd]) {
            this.cmdList[cmd].script(self.createToolBox(message),args,message);
            console.log("[COMMAND]",cmd,args);
        }
    }
};
/**
 * 建構toolBox物件
 * @method createToolBox
 * @param {Object} message 訊息
 * @return {Object} toolBox 工具盒
 *  sendToChat(text) 發送文字到訊息的來源
 *  replyMsg(text) 以文字回復訊息
 *  sendToUser(text) 發送文字給發送訊息的使用者
     
 */
TGBOT.prototype.createToolBox = function(message) {
    var self = this;

    var toolBox = {};
    toolBox.sendToChat = text => self.sendMessage(message.chat.id,text);
    toolBox.replyMsg = text => self.sendMessage(message.chat.id,text,{reply_to_message_id:message.message_id});
    toolBox.sendToUser = text => self.sendMessage(message.from.id,text);
    return toolBox;
};
/**
 * 產生Help
 * @method genHelp
 * @param {Function} Help的格式
 * @return {String} help help
 */
TGBOT.prototype.genHelp = function(format){
    var self = this;
    var help = "";
    format = format || (command => "/" + command.cmd + " : " + command.desc + "\n");
    for(var command in self.cmdList){
        help+=format(self.cmdList[command]);
    }
    return help;
};

module.exports = TGBOT;