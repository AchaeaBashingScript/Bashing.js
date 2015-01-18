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

var kecho = function(text){
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
      kecho("Couldn't save settings!");
   }else{
      //make sure the changes get uploaded to IRE...
      set_system_vals();
      system_changed = false;
      client.system_changed = false;
      client.gmcp_save_system();
   }
};

var getPrio = function(item){
   var prios = config.prios[gmcpArea];
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
   kecho("new target list:");
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

return module;

}());
return keneanung;
}(keneanung || {}));

keneanung.bashing.load();
