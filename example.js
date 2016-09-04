var TGBOT = require("./TGBOT/tg");
var bot = new TGBOT({
    token: '',
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
    });
},'owo');

bot.start();