var TGBOT = require("./TGBOT/tg");
var bot = new TGBOT({
    token: 'C8763',
    help: true
});

bot.addCmd('test', function(message, args) {
    message.replyMsg('owo', {
        reply_markup: JSON.stringify({
            inline_keyboard : [
                [{
                    text: "owo",
                    callback_data: "owo"
                },
                {
                    text: "ouo",
                    callback_data: "ouo"
                }]
            ]
        })
    }).onCallbackQuery(function(cbq){
        cbq.message.editText(cbq.from.username + " " + cbq.data);
    }).onReply(function(newMsg,myMsg){
        myMsg.editText(newMsg.from.username + " " + newMsg.text);
    });
},'owo');

bot.start();
