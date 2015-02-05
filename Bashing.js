var keneanung = (function (keneanung) {
    keneanung.bashing = (function () {

        var config = {
            enabled: true,
            warning: 500,
            fleeing: 300,
            autoflee: true,
            autoraze: false,
            razecommand: "none",
            attackcommand: "kill",
            prios: {}
        };

        var gmcpArea = "";
        var gmcpTarget = "";

        var damage = 0;
        var healing = 0;
        var lastHealth = 0;

        var targetList = [];

        var roomContent = [];

        var attacking = -1;

        var attacks = 0;

        var fleeDirection = "n";

        var colorify = function (str) {
            var pattern = /##(\w+)##/;
            var first = true;
            var match;
            while (match = pattern.exec(str)) {
                var repl;
                if (first && match[1] == "reset") {
                    //skip a reset as the first tag...
                } else if (match[1] == "reset") {
                    repl = "</span>";
                    first = true;
                } else if (first) {
                    repl = '<span style="color: ' + match[1] + '">';
                    first = false;
                } else {
                    repl = '</span><span style="color: ' + match[1] + '">';
                }
                str = str.replace(pattern, repl);
            }
            if (!first) {
                str += "</span>";
            }
            return str;
        };

        var linkify = function (text, codeToRun, alt) {
            var a = $('<a ></a>');
            a.attr('href', "javascript:void(0);");
            a.text(text);
            a.attr('onclick', codeToRun + ";return false;");
            a.attr('title', alt);
            return a.prop("outerHTML");
        };

        var kecho = function (text) {
            var toEcho = "<p>##forestgreen##keneanung##reset##: " + text + "</p>";
            var colouredEcho = colorify(toEcho);
            client.ow_Write("#output_main", colouredEcho);
            console.log(text);
        };

        var idOnly = function (list) {
            var ids = [];
            for (var i = 0; i < list.length; i++) {
                ids.push(list[i].id);
            }
            return ids;
        };

        var save = function () {
            //var configString = JSON.stringify(config);
            if (!client.set_variable("keneanung.bashing.config", config)) {
                kecho("##red##Couldn't save settings!");
            } else {
                //make sure the changes get uploaded to IRE...
                if (client.settings_window && client.settings_window.set_system_vals) {
                    client.settings_window.set_system_vals();
                    client.settings_window.system_changed = false;
                    client.system_changed = false;
                    client.gmcp_save_system();
                } else {
                    kecho("##yellow##No settings window open. Please open it " +
                    "(cogwheels lower right side) and click on 'Save " +
                    "Client Settings' to keep your config.");
                }
            }
        };

        var load = function () {
            var loadedConfig = client.get_variable("keneanung.bashing.config");
            for (var key in loadedConfig) {
                if (loadedConfig.hasOwnProperty(key))
                    config[key] = loadedConfig[key];
            }
        };

        var getPrio = function (item) {
            var prios = config.prios[gmcpArea] || [];
            for (var i = 0; i < prios.length; i++) {
                if (item == prios[i]) {
                    return i;
                }
            }
            return -1;
        };

        var addTarget = function (item) {
            var insertAt;

            var targetPrio = getPrio(item.name);

            if (targetPrio == -1) {
                return;
            }

            if (targetList.length == 0) {
                targetList[0] = {
                    id: item.id,
                    name: item.name
                }
            } else {
                //don't add stuff twice
                for (var i2 = 0; i2 < targetList.length; i2++) {
                    if (targetList[i2].id == item.id) {
                        return
                    }
                }

                var iStart = 0, iEnd = targetList.length - 1, iMid = 0;
                var found = false;

                while (iStart <= iEnd) {
                    iMid = Math.floor((iStart + iEnd) / 2);
                    var existingPrio = getPrio(targetList[iMid].name);

                    if (targetPrio == existingPrio) {
                        insertAt = iMid;
                        found = true;
                        break;
                    } else if (existingPrio == -1 || targetPrio < existingPrio) {
                        iEnd = iMid - 1;
                    } else {
                        iStart = iMid + 1;
                    }
                }

                if (!found) {
                    insertAt = iStart;
                }

                if (insertAt <= attacking && targetList.length >= attacking) {
                    insertAt = attacking + 1;
                }

                targetList.splice(insertAt, 0, {id: item.id, name: item.name});

            }
        };

        var removeTarget = function (item) {
            var number = -1;
            for (var i = 0; i < targetList.length; i++) {
                if (targetList[i].id == item.id) {
                    number = i;
                    break;
                }
            }

            if (number > -1) {
                targetList.splice(number, 1);
                if (number <= attacking) {
                    attacking--;
                    setTarget();
                }
            }
        };

        var difference = function (list1, list2) {
            if (list1.length != list2.length) {
                return true;
            }

            for (var i = 0; i < list1.length; i++) {
                if (list1[i] != list2[i]) {
                    return true;
                }
            }

            return false;
        };

        var displayTargetList = function () {
            kecho("Current target list:");
            for (var i = 0; i < targetList.length; i++) {
                client.ow_Write("#output_main",
                    "<span style='color: orange; white-space: pre-wrap'>     "
                    + targetList[i].name + "</span>");
            }
            console.log(targetList);
        };

        var emitEventsIfChanged = function (before, after) {
            console.log("event");
            if (difference(before, after)) {
                run_function("keneanungBashingTargetListChanged", after, "ALL");
                displayTargetList();
                if (before[0] != after[0]) {
                    run_function("keneanungBashingTargetListFirstChanged", after[0], "ALL");
                }
            }
        };

        var setTarget = function () {
            if (targetList.length == 0) {
                if (gmcpTarget == "") {
                    stopAttack();
                }
                if (attacking == -1) {
                    attacking++;
                }
            } else {
                if (attacking == -1 || targetList[attacking].id != gmcpTarget) {
                    attacking++;
                }
                client.send_GMCP("IRE.Target.Set", targetList[attacking].id + "");
            }
        };

        var clearTarget = function() {
            client.send_GMCP('IRE.Target.Set "0"');
            attacking = -1;
        };

        var startAttack = function () {
            if (attacking >= 0) {
                var trigger = client.reflex_find_by_name("trigger", "keneanung.bashing.queueTrigger");
                client.reflex_enable(trigger);
                client.send_direct("queue add eqbal keneanungki", false);
            }
        };

        var stopAttack = function () {
            var trigger = client.reflex_find_by_name("trigger", "keneanung.bashing.queueTrigger");
            client.reflex_disable(trigger);
            client.send_direct("cq all")
        };

        var warnFlee = function () {
            kecho("Better run or get ready to die!");
        };

        var notifyFlee = function () {
            kecho("Running as you have not enough health left.");
        };

        var module = {};

        module.setArea = function (areaName) {
            gmcpArea = areaName;
        };

        module.setGmcpTarget = function (target) {
            gmcpTarget = target;
        };

        module.setHealth = function (health) {
            if (attacking == -1) return;
            var difference = lastHealth - health;
            if (difference > 0) {
                damage += health;
            } else {
                healing += Math.abs(difference);
            }

            lastHealth = health;
        };

        module.attackButton = function (){
            if (attacking == -1) {
                setTarget();
                startAttack();
                kecho("Nothing will stand in our way.\n");
            } else{
                clearTarget();
                stopAttack();
                kecho("Lets save them for later.\n");
            }
         };

        module.flee = function() {
            stopAttack();
            client.send_direct("queue prepend eqbal " + fleeDirection)
        };

        module.handleShield = function() {
            if(config.autoraze){
                client.send_direct("queue prepend eqbal keneanungra", false);
            }
        };

        module.attack = function(){
            attacks++;
            var avgDmg = damage / attacks;
            var avgHeal = healing / attacks;

            var estimatedDmg = avgDmg * 2 - avgHeal;

            var fleeat = config.fleeing; //TODO should be keneanung.bashing.calcFleeValue(keneanung.bashing.configuration.fleeing)
            var warnat = config.warning; //TODO should be keneanung.bashing.calcFleeValue(keneanung.bashing.configuration.warning)

            if(config.autoflee && estimatedDmg > lastHealth - fleeat){
                notifyFlee();
                flee();
                return;
            }else if(estimatedDmg > lastHealth - warnat){
                warnFlee();
            }
            client.send_direct("queue add eqbal keneanungki", false);
        };

        module.addPossibleTarget = function (targetName) {
            var prios = config.prios;

            if (!prios[gmcpArea]) {
                prios[gmcpArea] = [];
                kecho("Added '" + gmcpArea + "' as new area.");
            }

            if ($.inArray(targetName, prios[gmcpArea]) == -1) {
                var before = idOnly(targetList);

                prios[gmcpArea].push(targetName);
                kecho("Added the new possible target '" + targetName + "' to the end of "
                + "the priority list.");

                save();

                for (var i = 0; i < roomContent.length; i++) {
                    addTarget(roomContent[i]);
                }

                var after = idOnly(targetList);

                emitEventsIfChanged(before, after);
            }
        };

        module.ItemAddCallback = function (arg) {
            if (arg.location != "room" || !config.enabled) {
                return;
            }

            var before = idOnly(targetList);

            roomContent.push(arg.item);
            addTarget(arg.item);

            var after = idOnly(targetList);

            emitEventsIfChanged(before, after);
        };

        module.ItemRemoveCallback = function (arg) {
            if (arg.location != "room" || !config.enabled) {
                return;
            }

            var before = idOnly(targetList);
            var id = arg.item.id;
            for (var i = 0; i < roomContent.length; i++) {
                if (roomContent[i].id == id) {
                    roomContent.splice(i, 1);
                    break;
                }
            }
            removeTarget(arg.item);

            var after = idOnly(targetList);

            emitEventsIfChanged(before, after);
        };

        module.ItemListCallback = function (arg) {
            if (arg.location != "room" || !config.enabled) {
                return;
            }

            var backup = targetList;
            var before = idOnly(targetList);
            targetList = [];
            roomContent = [];

            var items = arg.items;

            for (var i = 0; i < items.length; i++) {
                roomContent[roomContent.length] = items[i];
                addTarget(items[i]);
            }

            var after = idOnly(targetList);

            if (before.length == after.length && $(before).not(after).length == 0) {
                targetList = backup;
                return
            }

            emitEventsIfChanged(before, after);
        };

        module.showConfig = function () {
            var content = $("<div ></div>");
            var selectEnabled = $("<select ></select>", {
                name: "enabled",
                class: "bashingSelect ui-state-default ui-corner-all ui-widget",
                style: "padding-top: 0px; padding-bottom: 0px;"
            });
            var vals = ["on", "off"];
            for (var i = 0; i < vals.length; i++) {
                var opt = $("<option ></option>", {value: vals[i], text: vals[i]});
                if ((vals[i] == "on") == config.enabled) {
                    opt.attr("selected", "selected");
                }
                selectEnabled.append(opt);
            }
            $("<span ></span>").text("The basher is currently ").append(selectEnabled).appendTo(content);
            $("<br />").appendTo(content);

            var selectFlee = $("<select ></select>", {
                name: "autoflee",
                class: "bashingSelect ui-state-default ui-corner-all ui-widget",
                style: "padding-top: 0px; padding-bottom: 0px;"
            });
            for (var i = 0; i < vals.length; i++) {
                var opt = $("<option ></option>", {value: vals[i], text: vals[i]});
                if ((vals[i] == "on") == config.autoflee) {
                    opt.attr("selected", "selected");
                }
                selectFlee.append(opt);
            }
            $("<span ></span>").text("Autofleeing is currently ").append(selectFlee).appendTo(content);
            $("<br />").appendTo(content);

            $("<span ></span>").text("Issueing a warning at ").append($("<input />", {
                value: config.warning,
                name: "warning",
                class: "bashingInput ui-state-default ui-corner-all ui-widget"
            })).appendTo(content);
            $("<br />").appendTo(content);
            $("<span ></span>").text("Fleeing at ").append($("<input />", {
                value: config.fleeing,
                name: "fleeing",
                class: "bashingInput ui-state-default ui-corner-all ui-widget"
            })).appendTo(content);
            $("<br />").appendTo(content);

            var selectRaze = $("<select ></select>", {
                name: "autoraze",
                class: "bashingSelect ui-state-default ui-corner-all ui-widget",
                style: "padding-top: 0px; padding-bottom: 0px;"
            });
            for (var i = 0; i < vals.length; i++) {
                var opt = $("<option ></option>", {value: vals[i], text: vals[i]});
                if ((vals[i] == "on") == config.autoraze) {
                    opt.attr("selected", "selected");
                }
                selectRaze.append(opt);
            }
            $("<span ></span>").text("Autoraze is currently ").append(selectRaze).appendTo(content);
            $("<br />").appendTo(content);
            $("<span ></span>").text("Using this command for razing: ").append($("<input />", {
                value: config.razecommand,
                name: "razecommand",
                class: "bashingInput ui-state-default ui-corner-all ui-widget"
            })).appendTo(content);
            $("<br />").appendTo(content);
            $("<span ></span>").text("Using this command for attacking: ").append($("<input />", {
                value: config.attackcommand,
                name: "attackcommand",
                class: "bashingInput ui-state-default ui-corner-all ui-widget"
            })).appendTo(content);
            $("<br />").appendTo(content);
            $("<br />").appendTo(content);
            $("<button ></button>", {
                text: "save",
                class: "ui-state-default ui-corner-all",
                id: "keneanung-bashing-save"
            }).on("click", function () {
                var conf = {};
                $(".bashingInput").each(function (_, elem) {
                    conf[elem.name] = elem.value;
                });
                $(".bashingSelect").each(function (_, elem) {
                    conf[elem.name] = elem[elem.selectedIndex].value == "on";
                });
                for (var key in conf) {
                    if (!conf.hasOwnProperty(key)) continue;
                    config[key] = conf[key];
                }
                save();
                content.dialog("close");
            }).appendTo(content);

            content.dialog({
                close: function(){
                    content.empty();
                },
                title: "Bashing Settings"
            });
        };

        module.showPrios = function(){

            var body = $("<div ></div>");
            var select = $('<select id="keneanung-bashing-prio-areas" class="ui-widget ui-state-default ui-corner-all" style= "padding-top: 0; padding-bottom: 0;"></select>');
            var fillList = function () {
                var selectDOM = select[0];
                var area = selectDOM[selectDOM.selectedIndex].text;
                var targets = config.prios[area];
                var list = $("#keneanung-bashing-sort");
                list.empty();
                for (var i = 0; i < targets.length; i++) {
                    list.append("<li> " + targets[i] + "</li>");
                }
            };
            select.on("change", fillList);
            body.append(select);

            var updatePrios = function () {
                var newPrios = [];
                $("#keneanung-bashing-sort").children().each(function (index) {
                    newPrios[index] = $.trim($(this).text());
                });
                var selectDOM = select[0];
                var area = selectDOM[selectDOM.selectedIndex].text;
                config.prios[area] = newPrios;
            };

            for (var area in config.prios) {
                if (config.prios.hasOwnProperty(area)) {
                    select.append("<option>" + area + "</option>");
                }
            }

            var prioList = $('<fieldset class="ui-widget ui-state-default ui-corner-all">');
            prioList.append($("<legend>Priority list</legend>"));
            prioList.append($('<ul id="keneanung-bashing-sort" class="ui-widget ui-state-default ui-corner-all" style="list-style-type: none; padding:0; margin:0;"></ul>')
                .sortable({
                    stop: updatePrios,
                    connectWith: "#keneanung-bashing-trash"
                }).disableSelection()
            );
            body.append(prioList);

            var trash = $('<fieldset class="ui-widget ui-state-default ui-corner-all">');
            trash.append($("<legend>Trash</legend>"));
            trash.append($('<ul id="keneanung-bashing-trash" class="ui-widget ui-state-default ui-corner-all" style="list-style-type: none; padding:0; margin:0;"></ul>')
                .sortable({
                    stop: updatePrios,
                    connectWith: "#keneanung-bashing-sort"
                }).disableSelection()
            );
            body.append(trash);

            var saveButton = $("<button ></button>", {
                text: "save",
                class: "ui-state-default ui-corner-all",
                id: "keneanung-bashing-prios-save"
            });
            saveButton.on("click", function () {
                save();
                body.dialog("close");
            });
            body.append(saveButton);

            body.dialog({
                close: function(){
                    body.empty();
                },
                title: "Bashing Priorities"
            });

            fillList();
        };

        load();
        client.send_direct("setalias keneanungki " + config.attackcommand);
        client.send_direct("setalias keneanungra " + config.razecommand);

        return module;

    }());
    return keneanung;
}(keneanung || {}));
