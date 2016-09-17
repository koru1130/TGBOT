# TGBOT
A Node.js Telegram Bot Framework

## Installation
```sh
git clone https://github.com/koru1130/TGBOT.git
npm install
```

## Example
```js
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
```

## Method

### addCmd(cmd, script, desc, helpMsg)

| Param | Type | Description |
| --- | --- | --- |
| cmd | String | 指令 |
| script | Function | 指令的內容 |
| desc | String | 指令的描述(一行) |
| helpMsg | String | 指令的說明(一段話) |

#### script:
script會被這樣呼叫:
```js
script(message,args)
```
message是訊息
args是參數

例如使用者發了 /test 123 456
message.text會是/test 123 456
args[0] 是123 456
args[1] 是123
args[2] 是456

然後可以用
```js
message.replyMsg(text)
```
來回復
message除了原本的訊息外 還有好幾個方法
```js
message.sendToChat(text,[datas],[cb])
message.replyMsg(text,[datas],[cb])
message.sendToUser(text,[datas],[cb])
```


其他之後再補 寫README.md好難QwQ
