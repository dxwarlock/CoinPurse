on('chat:message', function (msg) {
    if (msg.type === "api" && msg.content.indexOf("!coins") !== -1) {
        var cWho = findObjs({ type: 'character', name: msg.who })[0];
        if (cWho === undefined) {
            cWho = RollRight(msg.playerid); //GET CHARACTER NAME FROM PLAYER IF NOT PICKED IN DROPDOWN
        }
        msg.who = cWho.get("name");
        //FIND CHARACTER COIN ATTRIBUTES
        var oPP = findObjs({ name: "PP", type: "attribute", characterid: cWho.id }, { caseInsensitive: true })[0];
        var oGP = findObjs({ name: "GP", type: "attribute", characterid: cWho.id }, { caseInsensitive: true })[0];
        var oSP = findObjs({ name: "SP", type: "attribute", characterid: cWho.id }, { caseInsensitive: true })[0];
        var oCP = findObjs({ name: "CP", type: "attribute", characterid: cWho.id }, { caseInsensitive: true })[0];
        if (oPP === undefined || oGP === undefined || oSP === undefined || oCP === undefined) {
            sendChat('Coin Purse', "Not All Coins Set");
            return;
        }
        var remaining;
        var amountSpent = '';
        var transactiontype = '';
        var msgFormula = msg.content.split(/\s+/);
        var SpendValue = msgFormula.slice(Math.max(msgFormula.length - 4, 1));
        //SET PURSE AND SPENT VALUES FOR MATH
        var purse = GetMoney(oCP, oSP, oGP, oPP);
        var spend = eval("(" + '{' + SpendValue + '}' + ")");
        //SPEND MONEY
        if (msgFormula[1] == "Spend") {
            transactiontype = "Spent:"
            remaining = spendMoney(spend, purse);
            if (remaining == undefined) {
                sendChat('Coin Purse', "You do not have that much....");
                return;
            }
            _.each(remaining, function (value, key) {
                var oC = findObjs({ name: key, _type: "attribute", characterid: cWho.id }, { caseInsensitive: true })[0];
                oC.setWithWorker('current', value);
            });
        }
        else {
            return;
        }
        //SET CHAT SPENT VARIABLE (REVERSE COIN ORDER TO DESCENDING VALUES)
        var reverseSpent = SpendValue.reverse();
        var displaySpent = eval("(" + '{' + reverseSpent + '}' + ")");
        //REMOVE ZERO SPENT VALUES
        for (var key in displaySpent) {
            if (displaySpent[key] != 0) amountSpent = amountSpent + " " + displaySpent[key] + "" + key;
        }
        /*TO DO---FIGURE OUT COINS ACTUALLY SPENT VS AMOUNT SPENT
        var coinsTaken = CoinsSpent(purse, remaining);
        ------------*/
        var coinSum = "Purse: " + remaining.pp + "PP " + remaining.gp + "GP " + remaining.sp + "SP " + remaining.cp + "CP";
        var chatmsg = "&{template:pf_block}{{color=darkgrey}}{{name=" + coinSum + "}}{{description=" + transactiontype + " " + amountSpent.toUpperCase() + "}}";
        sendChat('Coin Purse', "/w " + msg.who + " " + chatmsg);
        if (msg.who !== "GM") {
            sendChat('Coin Purse', "/w GM " + chatmsg);
        }
    }
});
/*---ROLL AS CHARACTER NAME FUNCTION---*/
function RollRight(whoPC) {
    var character = findObjs({ type: 'character', controlledby: whoPC })[0];
    if (character == undefined) {
        sendChat("system", "/direct No character found for: " + whoPC + ", please set!");
    }
    else {
        return character;
    }
}
/*---GET CHARACTER MONEY FUNCTION---*/
function GetMoney(oPP, oGP, oSP, oCP) {
    let coins = {};
    coins.cp = parseInt(oPP.get("current"), 10);
    coins.sp = parseInt(oGP.get("current"), 10);
    coins.gp = parseInt(oSP.get("current"), 10);
    coins.pp = parseInt(oCP.get("current"), 10);
    return coins;
}
/*---SPEND FUNCTION---*/
const valueOrder = ['cp', 'sp', 'gp', 'pp'];
const coinConversion = {
    pp: { pp: (n) => n, gp: (n) => 10 * n, sp: (n) => 100 * n, cp: (n) => 1000 * n },
    gp: { pp: (n) => n / 10, gp: (n) => n, sp: (n) => 10 * n, cp: (n) => 100 * n },
    sp: { pp: (n) => n / 100, gp: (n) => n / 10, sp: (n) => n, cp: (n) => 10 * n },
    cp: { pp: (n) => n / 1000, gp: (n) => n / 100, sp: (n) => n / 10, cp: (n) => n }
};
const copyMoney = (money) => valueOrder.reduce((newMoney, coin) => Object.assign(newMoney, { [coin]: money[coin] || 0 }), {});
const cpValue = (money) => Object.keys(money).reduce((amount, type) => (amount + (coinConversion.hasOwnProperty(type) ? coinConversion[type].cp(money[type]) : 0)), 0);
const spendMoney = (spend, purse) => {
    let purseInCP = cpValue(purse);
    let spendInCP = cpValue(spend);
    if (purseInCP >= spendInCP) {
        let remainPurse = copyMoney(purse);
        const spendWithBorrow = (index, amount) => {
            let type = valueOrder[index];
            remainPurse[type] -= amount;
            if (remainPurse[type] < 0) {
                let type2 = valueOrder[index + 1];
                let ask = Math.ceil(coinConversion[type][type2](Math.abs(remainPurse[type])));
                spendWithBorrow(index + 1, ask);
                remainPurse[type] += coinConversion[type2][type](ask);
            }
        };
        spendWithBorrow(0, spendInCP);
        return remainPurse;
    }
};
/*---ADD MONEY FUNCTION---*/
function AddMoney(cWho, type, amount) {
    var oC = findObjs({ name: type, _type: "attribute", characterid: cWho.id }, { caseInsensitive: true })[0];
    var currentCoins = parseInt(oC.get("current"), 10);
    var newCoins = parseInt(amount, 10);
    var total = parseInt(currentCoins + newCoins, 10);
    oC.setWithWorker('current', total);
}
/*TO DO----
function CoinsSpent(a, b) {
    var diff = {"cp":0,"sp":0,"gp":0,"pp":0};
    for(var key in a) {
        if(a[key] !== b[key]) {
            diff[key] = a[key]-b[key];
        }
    }
    return diff;
}
*/
