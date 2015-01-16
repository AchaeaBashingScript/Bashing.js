var keneanung = (function(keneanung){
keneanung.bashing = (function(){

var config = {
   enabled: false,
   warning: 500,
   fleeing: 300,
   autoflee: true,
   autoraze: false,
   razecommand: "none",
   attackcommand: "kill",
   prios: {}
};

var gmcpArea = "";

var targetList = {};

var kecho = function(text){
   client.display_notice("keneanung", "green", "black");
   client.display_notice(": " + text, "white", "black");
}

var idOnly = function(list){

   var ids = []
   for(var i = 0; i<list.length; i++){
      ids.push(list[i].id);
   }
   return ids;
}

var save = function(){
   //TODO
}

var addTarget = function(item){
   //TODO
}

var emitEventIfChanged = function(before, after){
   //TODO
   client.display_notice("event");
}

var module = {};

module.setArea = function(areaName){
   gmcpArea = areaName;
}

module.addPossibleTarget = function(targetName){
   if(!prios[gmcpArea]){
      prios[gmcpArea] = [];
      kecho("Added '" + targetName + "' as new area.");
   }

   if(!$.inArray(targetName, prios[targetName]){
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
}

return module;

}())
return root;
}(keneanung || {}));
