var TGBOT = require("./tg");
var bot = new TGBOT({token:''});

bot.addCmd('reply',function(args,toolBox){
    var text = args[0] || "Hello";
    toolBox.replyMsg(text);
});
bot.start();