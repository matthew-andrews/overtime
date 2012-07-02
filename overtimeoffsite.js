// @andrewsmatt
self.onmessage=function(e){
	eval(e.data);
	self.onmessage=null;
};