var TGBOT = require("./tg");
var bot = new TGBOT({token:''});

bot.addCmd('reply',function(toolBox,args){
    var text = args[0] || "Hello";
    toolBox.replyMsg(text);
},"reply a message","test");
bot.start();