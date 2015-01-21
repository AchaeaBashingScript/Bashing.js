var keneanung = (function(keneanung){
keneanung.bashing = (function(){

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

var targetList = [];

var roomContent = [];

var attacking = -1;

var colorify = function(str){
   var pattern = /##(\w+)##/;
   var first = true;
   var match;
   while (match = pattern.exec(str)) {
      var repl;
      if(first && match[1] == "reset"){
         //skip a reset as the first tag...
      }else if(match[1] == "reset"){
         repl = "</span>";
         first = true;
      }else if(first){
         repl = '<span style="color: ' + match[1] + '">';
         first = false;
      }else{
         repl = '</span><span style="color: ' + match[1] + '">';
      }
      str = str.replace(pattern, repl);
   }
   if(!first){
      str += "</span>";
   }
   return str;
};

var linkify = function(text, codeToRun, alt){
   var a = $('<a />');
   a.attr('href',"javascript:void(0);");
   a.text(text);
   a.attr('onclick', codeToRun + ";return false;");
   a.attr('title', alt);
   return a.prop("outerHTML");
};

var kecho = function(text){
   var toEcho = "<p>##forestgreen##keneanung##reset##: " + text + "</p>";
   var colouredEcho = colorify(toEcho);
   client.ow_Write("#output_main", colouredEcho);
   console.log(text);
};

var idOnly = function(list){
   var ids = [];
   for(var i = 0; i<list.length; i++){
      ids.push(list[i].id);
   }
   return ids;
};

var save = function(){
   //var configString = JSON.stringify(config);
   if(!client.set_variable("keneanung.bashing.config", config)){
      kecho("##red##Couldn't save settings!");
   }else{
      //make sure the changes get uploaded to IRE...
      if(client.settings_window) {
         client.settings_window.set_system_vals();
         client.settings_window.system_changed = false;
         client.system_changed = false;
         client.gmcp_save_system();
      }else{
         kecho("##yellow##No settings window open. Please open it " +
         "(cogwheels lower right side) and click on 'Save " +
         "Client Settings' to keep your config.");
      }
   }
};

var getPrio = function(item){
   var prios = config.prios[gmcpArea] || [];
   for(var i = 0; i < prios.length; i++){
      if(item == prios[i]){
         return i;
      }
   }
   return -1;
};

var addTarget = function(item){
   var insertAt;

   var targetPrio = getPrio(item.name);

   if(targetPrio == -1){
      return;
   }

   if(targetList.length == 0){
      targetList[0] = {
         id: item.id,
         name: item.name
      }
   }else{
      //don't add stuff twice
      for(var i2 = 0; i2 < targetList.length; i2++){
         if(targetList[i2].id == item.id){
            return
         }
      }

      var iStart = 0, iEnd = targetList.length - 1, iMid = 0;
      var found = false;

      while(iStart <= iEnd){
         iMid = Math.floor( (iStart + iEnd)/2 );
         var existingPrio = getPrio(targetList[iMid].name);

         if(targetPrio == existingPrio){
            insertAt = iMid;
            found = true;
            break;
         }else if(existingPrio == -1 || targetPrio < existingPrio){
            iEnd = iMid - 1;
         }else{
            iStart = iMid + 1;
         }
      }

      if(!found){
         insertAt = iStart;
      }

      if(insertAt <= attacking && targetList.length >= attacking){
         insertAt = attacking + 1;
      }

      targetList.splice(insertAt, 0, {id: item.id,  name: item.name});

   }
};

var removeTarget = function(item){
   var number = -1;
   for(var i = 0; i < targetList.length; i++){
      if(targetList[i].id == item.id){
         number = i;
         break;
      }
   }

   if(number > -1){
      targetList.splice(number, 1);
      if(number <= attacking){
         attacking--;
         setTarget();
      }
   }
};

var difference = function(list1, list2){
   if(list1.length != list2.length){
      return true;
   }

   for(var i = 0; i < list1.length; i++){
      if(list1[i] != list2[i]){
         return true;
      }
   }

   return false;
};

var displayTargetList = function(){
   kecho("Current target list:");
   for(var i = 0; i < targetList.length; i++) {
      client.ow_Write("#output_main",
          "<span style='color: orange; white-space: pre-wrap'>     "
          + targetList[i].name + "</span>");
   }
   console.log(targetList);
};

var emitEventsIfChanged = function(before, after){
   console.log("event");
   if(difference(before, after)){
      run_function("keneanungBashingTargetListChanged", after, "ALL");
      displayTargetList();
      if(before[0] != after[0]){
         run_function("keneanungBashingTargetListFirstChanged", after[0], "ALL");
      }
   }
};

var setTarget = function(){
   if(targetList.length == 0){
      if(gmcpTarget == ""){
         //TODO: stop attack
      }
      if(attacking == -1){
         attacking++;
      }
   }else{
      if(attacking == -1 || targetList[attacking].id != gmcpTarget){
         attacking++;
      }
      client.send_GMCP("IRE.Target.Set", targetList[attacking].id + "");
   }
};

var module = {};

module.setArea = function(areaName){
   gmcpArea = areaName;
};

module.setGmcpTarget = function(target){
   gmcpTarget = target;
};

module.load = function(){
   var loadedConfig = client.get_variable("keneanung.bashing.config");
   for(var key in loadedConfig){
      if(loadedConfig.hasOwnProperty(key))
         config[key] = loadedConfig[key];
   }
};

module.addPossibleTarget = function(targetName){
   var prios = config.prios;

   if(!prios[gmcpArea]){
      prios[gmcpArea] = [];
      kecho("Added '" + gmcpArea + "' as new area.");
   }

   if($.inArray(targetName, prios[gmcpArea]) == -1){
      var before = idOnly(targetList);

      prios[gmcpArea].push(targetName);
      kecho("Added the new possible target '" + targetName + "' to the end of "
         + "the priority list.");

      save();

      for(var i = 0; i < roomContent.length; i++){
         addTarget(roomContent[i]);
      }

      var after = idOnly(targetList);

      emitEventsIfChanged(before, after);
   }
};

module.ItemAddCallback = function(arg){
   if(arg.location != "room" || !config.enabled){
      return;
   }

   var before = idOnly(targetList);

   roomContent.push(arg.item);
   addTarget(arg.item);

   var after = idOnly(targetList);

   emitEventsIfChanged(before, after);
};

module.ItemRemoveCallback = function(arg){
   if(arg.location != "room" || !config.enabled){
      return;
   }

   var before = idOnly(targetList);
   var id = arg.item.id;
   for(var i = 0; i < roomContent.length; i++){
      if(roomContent[i].id == id){
         roomContent.splice(i, 1);
         break;
      }
   }
   removeTarget(arg.item);

   var after = idOnly(targetList);

   emitEventsIfChanged(before, after);
};

module.ItemListCallback = function(arg){
   if(arg.location != "room" || !config.enabled){
      return;
   }

   var backup = targetList;
   var before = idOnly(targetList);
   targetList = [];
   roomContent = [];

   var items = arg.items;

   for(var i = 0; i < items.length; i++){
      roomContent[roomContent.length] = items[i];
      addTarget(items[i]);
   }

   var after = idOnly(targetList);

   if(before.length == after.length && $(before).not(after).length == 0){
      targetList = backup;
      return
   }

   emitEventsIfChanged(before,  after);
};

module.showConfig = function(){
   var content = $("<div />");
   var selectEnabled = $("<select />", {name: "enabled", class: "bashingSelect"});
   var vals = ["on","off"];
   for(var i = 0; i < vals.length; i++){
      var opt = $("<option />", {value : vals[i], text : vals[i]});
      if((vals[i] == "on") == config.enabled){
         opt.attr("selected", "selected");
      }
      selectEnabled.append(opt);
   }
   $("<span />").text("The basher is currently ").append(selectEnabled).appendTo(content);
   $("<br />").appendTo(content);
   
   var selectFlee = $("<select />", {name: "autoflee", class: "bashingSelect"});
   for(var i = 0; i < vals.length; i++){
      var opt = $("<option />", {value : vals[i], text : vals[i]});
      if((vals[i] == "on") == config.autoflee){
         opt.attr("selected", "selected");
      }
      selectFlee.append(opt);
   }
   $("<span />").text("Autofleeing is currently ").append(selectFlee).appendTo(content);
   $("<br />").appendTo(content);
   
   $("<span />").text("Issueing a warning at ").append($("<input />", {value: config.warning, name: "warning", class: "bashingInput"})).appendTo(content);
   $("<br />").appendTo(content);
   $("<span />").text("Fleeing at ").append($("<input />", {value: config.fleeing, name: "fleeing", class: "bashingInput"})).appendTo(content);
   $("<br />").appendTo(content);

   var selectRaze = $("<select />", {name: "autoraze", class: "bashingSelect"});
   for(var i = 0; i < vals.length; i++){
      var opt = $("<option />", {value : vals[i], text : vals[i]});
      if((vals[i] == "on") == config.autoraze){
         opt.attr("selected", "selected");
      }
      selectRaze.append(opt);
   }
   $("<span />").text("Autoraze is currently ").append(selectRaze).appendTo(content);
   $("<br />").appendTo(content);
   $("<span />").text("Using this command for razing: ").append($("<input />", {value: config.razecommand, name: "razecommand", class: "bashingInput"})).appendTo(content);
   $("<br />").appendTo(content);
   $("<span />").text("Using this command for attacking: ").append($("<input />", {value: config.attackcommand, name: "attackcommand", class: "bashingInput"})).appendTo(content);
   $("<br />").appendTo(content);
   $("<br />").appendTo(content);
   $("<button />", {text: "save", class: "ui-state-default ui-corner-all", id: "keneanung-bashing-save"}).appendTo(content);

   $(document).on("click", "#keneanung-bashing-save", function(){
      var conf = {};
      $(".bashingInput").each(function(_, elem){
         conf[elem.name] = elem.value;
      });
      $(".bashingSelect").each(function(_, elem){
         conf[elem.name] = elem[elem.selectedIndex].value == "on";
      });
      for(var key in conf){
         if(conf.hasOwnProperty(key)) continue;
         config[key] = conf[key];
      }
      save();
      $(".ui-dialog-titlebar-close").trigger("click");
   });

   client.cm_dialog("#", {title: "Bashing configuration", content: content[0].outerHTML});
};

return module;

}());
return keneanung;
}(keneanung || {}));

keneanung.bashing.load();
