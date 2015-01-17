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

var roomContent = {};

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
   //TODO
};

var addTarget = function(item){
   //TODO
};

var emitEventsIfChanged = function(before, after){
   //TODO
   console.log("event");
};

var module = {};

module.setArea = function(areaName){
   gmcpArea = areaName;
};

module.addPossibleTarget = function(targetName){
   var prios = config.prios;

   if(!prios[gmcpArea]){
      prios[gmcpArea] = [];
      kecho("Added '" + gmcpArea + "' as new area.");
   }

   if(!$.inArray(targetName, prios[gmcpArea])){
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

return module;

}());
return keneanung;
}(keneanung || {}));
