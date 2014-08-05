
tiddlyclip={hello:"hello"};

(function(){
tiddlyclip.modules={};
tiddlyclip.log= function(x) {};
var log = function (x) {
	alert(x);
}
	function status (param) {
		//alert(param);
		}
var vers2=false;
if (typeof version == 'undefined') vers2=false;
else
 vers2=(version.major ==2) ?true:false;
if (vers2||$tw.browser) {

tiddlyclip.modules.tPaste = (function () {

	var api = 
	{
		onLoad:onLoad,				paste:paste,				
		hasMode:hasMode,			
		getTidContents:getTidContents,
		hasModeBegining:hasModeBegining
	};
	var   tiddlerObj, twobj,   defaults;

	function onLoad() {
		tiddlerAPI 	= tiddlyclip.modules.tiddlerObj;
		twobj		= tiddlyclip.modules.twobj;
		defaults	= tiddlyclip.modules.defaults;
	}
	api.BeforeSave = {};
	api.AfterSub = {};


/////////////////////////////////////////////////////////////////////////////
	function findDefaultRule(rule) {
		return (rule.substring(0,7)==='default') ? defaults.getDefaultRule(rule):null;
	}

	function findCategory (tableOfCats, category) {	
		var categoryRows = tableOfCats.split("\n");
		var cat = {}, tagsAndModes, pieces, catFound=false;
		var hasExt = false;
		
		for (var i=0; i<categoryRows.length; i++) { 
			pieces = categoryRows[i].split("|");// row is = |Category|Tip|Tags|Rules Tid|Modes|
			if (pieces.length==1) continue; 	//ingore blanklines
			if (pieces.length < 7) {
				alert('config table format error no of row incorrect '+categoryRows[i]);
				 return {valid:false};
			}
			if (pieces[1].substring(0,1)==='!') continue; //first row is column headings
			if (category == pieces[1]) {
				catFound = true;
				break;
			}
		} //loop end
		
		if (!catFound) {status ("not found cat: "+category);return {valid:false};}
		
		var ruleDefs =  getTidContents(pieces[4]);
		//if rule is not found use the default rules
		if (!ruleDefs) {ruleDefs = findDefaultRule(pieces[4]);}
		if (!!ruleDefs)  {	
			try {
				cat = {rules:null,valid:false};		
				cat.rules=addSequenceOfRules(ruleDefs,category);//one or more
				cat.modes= extractModes(pieces[5]);
				cat.tags = pieces[3];
				cat.tip  = pieces[2];
				cat.valid= true;
				//status("found cat: "+category)
				return cat;
			} catch(e) {
				status("caught error while adding rules for cat: " + category);
				return {valid:false};
			}
		}
		status ("rules not found for cat: "+category);
		return {valid:false}; 
	}

	function findSection(activeSection,configTable) {
        var sectionStrgs;
		var content = configTable;
		if (content != null) {
			sectionStrgs = content.split(defaults.getMacros().FOLDSTART+'['); //sections begin with a title, , followed by a table of categories
			if(sectionStrgs.length>1) {
				//status("found clip list format config")		 
				sectionStrgs.shift();	
				//only load active categories 
				return (sectionStrgs[activeSection].split('!/%%/\n')[1]);//strip of section name from first line
			} else { 
				//status("found straight config format");
				sectionStrgs = content.split('\n!'); //sections begin with a title, eg !mysection, followed by a table of categories
				//only load active categories
				return (sectionStrgs[activeSection].replace(/(^\|)*\n/,''));//strip of section name from first line
			}

		}else {
			//status("config tiddler not found try with default values");
			return defaults.getDefaultCategories().join("\n");
		}
	}
//////////////////////////////////////////////////////////
	function extractModes(tagString) {
		var modes =[], tList = tagString.split(' ');
		for (var i=0; i< tList.length; i++) {
			modes[i] = tList[i].trim();
		}
		return modes;
	}

	function hasMode (cat,mode) {
			if (!cat.modes) return false;
		for (var i=0; i< cat.modes.length;i++)
			if (mode === cat.modes[i]) return true;
		return false;
	}
	function hasModeBegining (cat,mode) {
			if (!cat.modes) return false;
		for (var i=0; i< cat.modes.length;i++)
			if (mode === cat.modes[i].substr(0,mode.length)) return true;
		return false;
	}
//////////////////////////////////////		
	function addSequenceOfRules(tiddler,cat) { 		
		var ruleDefs = tiddler.trim().split("\n");
		var arrayOfRules =[];
		var firstRow=0,firstrule=0;;
		if (ruleDefs[firstRow].substring(0,2)==='$:') {
			arrayOfRules[0]= {valid:true};
			try {
					if (!vers2) {
						arrayOfRules[0].run=require(ruleDefs[firstRow]).run;
						firstrule=1;
					}
			} catch(e) {error("no extmodule found")};
			firstRow=2;
			if (ruleDefs.length<2) return arrayOfRules;
		}
        if (ruleDefs[firstRow].substring(0,2)==='|!') firstRow += 1;// row  maybe column titles, ie the string |!Title|!Body|!Tags|!Modes|
		for (var i=firstrule,j=firstRow; j<ruleDefs.length; i++,j++) {
			arrayOfRules[i]=new  Rule(ruleDefs[j]);
		}
		return arrayOfRules;
	}

	function Rule(defRule, modes) {
		//INPUT DEF:
		//defRule is a string of the form '|Title|Body|Tags|Fields|Init values|Modes|' or a struture {	title:'..', body:'..', tags:'..'}
		//extracts subst patterns for title, body, tags. Also extracts modes
		var Tid;
		var whiteSpace = /^\s+|\s+$/g;//use trim
		
		if ((typeof defRule) =='string' ) { //we has a row definition
			//remove triple quotes around any | - these were needed to stop TW thinking they were table elements
			var pieces = defRule.replace(/\"\"\"\|\"\"\"/g,"&bar;").split("|");
			if  (pieces.length <7) {error('short:'+defRule);throw new Error('Invalid Rule');} //error malformeed TODO: inform the user
			for (var i=1;i<7;i++) {
				pieces[i]= pieces[i].replace(whiteSpace,"").replace("&bar;","|"); 
				if (pieces[i] == null) {
					if (i==1) throw new Error('Invlid Rule');//must define a name for the tid
				} else 	if (pieces[i].substring(0,2)==='[[') { // -there is a definition in a seperated tiddler - go get it
				    var temp=pieces[i].replace (/\[\[([\s|\S]*)\]\]/,"$1"); //remove  brackets
					if (temp.substring(0,2) !== '[[') {
						 temp =getTidContents(temp); //this.body contains the name of the tiddler
						 if (temp != null) pieces[i] = temp;
					}						
				} else{
					if (i==6)  			pieces[i] = '[{"#newdata":"'+pieces[i]+'"}]';	
					else if (i==4||i==5)pieces[i] = '['+pieces[i]+']';	
					else if (i==3)  	pieces[i] = '[{"$tags":"'+pieces[i]+'"}]';
					else if (i==2)  	pieces[i] = '[{"#newdata":"'+pieces[i]+'"}]';					
					else if (i==1)  	pieces[i] = '[{"$title":"'+pieces[i]+'"}]';
				}
			}
			this.title =pieces[1];
			this.body  =pieces[2];
			this.tags = pieces[3];
			this.fields =pieces[4]; 
			this.InitVals=pieces[5];	
			this.modes =pieces[6];
		}	
		else { // we are passed a structure
			this.title =defRule.title;
			this.body  =defRule.body;
			this.tags  =defRule.tags;
			this.fields ='';
			this.InitVals="";	
			this.modes = modes;	
		}	
	}

	function userInput(source){ //replace  % delimited strings with user input

		return source.replace(/%\[\$(.*?)\]%/g,function(m,key,offset,str){
			
			var parts=key.split("::");
			var userString={value:" "};
			//alert(parts[0]+"::"+parts[1]);
			if (parts.length !==2) {
				//use as a single field
				return  m;
			}
			//tcBrowser.UserInputDialog(parts[1],userString);
			
			return (userString.value);
		}
	)};
	 function decodeutf8(source) {

		 var chr1,chr2,chr3,result="",i=0;
		 while (i <source.length){
			 chr1= source.charCodeAt(i);
			 if (chr1<128) {result+= String.fromCharCode(chr1);i++;}
			 else {
				 chr2=source.charCodeAt(i+1);
				 if ((chr1 > 191) && (chr1 < 224)){result+= String.fromCharCode(((chr1 & 31) << 6) | (chr2 & 63));i+=2;}
				 else {
					 chr3=source.charCodeAt(i+2);
					 result+= String.fromCharCode(((chr1 & 15) << 12) | ((chr2 & 63) << 6) | (chr3 & 63));
					 i+=3;
				 }
			 }
		 }
		 return result;
	}
	function loadTiddlerVarsFrom(pageData,tid) {
		//alert(twobj.title + 'title');
		//BJ FIXME this need to be changed so that it acts like 'append mode'
		// and the tiddler is got from the retrieve procedure
		tidObj=new tiddlerAPI.Tiddler(tid);
		pageData.data.remoteTidText= decodeutf8(tidObj.text);
		pageData.data.remoteTidTags= decodeutf8(tidObj.tags||" ");
		pageData.data.remoteTidTitle=decodeutf8(tidObj.title);		
	}
	function firstRemoteTid(pageData) {
		pageData.remoteTidIndex = 0;
		return pageData.remoteTidArr[0];
	}
	
	function hasNextRemoteTid(pageData) {//alert(api.remoteTidArr.length + " len "+api.remoteTidIndex );
		return (pageData.remoteTidIndex < pageData.remoteTidArr.length);
	}
	
	function nextRemoteTid(pageData) {
		pageData.remoteTidIndex += 1;
		if (pageData.remoteTidIndex === pageData.remoteTidArr.length) return null;
		return pageData.remoteTidArr[pageData.remoteTidIndex];	
	}	
//  BJ! TODO ADD A LOG THAT IS ONLY WRITTEN WHEN SAVING THE TW
    function performAction(cat,pageData) {
		defaults.defaultCommands[cat].command(pageData);
	}
	// This is the function called when clicking the context menu item.
	function paste(catName,pageData, section, atHome, substitutionTiddler)
	{  
		//BJ: if atHome exists, then catName should be the name of a tiddler containing the cat, if this is ""
		//then use build in 'dummy' rule and use substitutionTiddler as input to the substitution engine
		
		//status ("paste enter");
		var cat = findCategory (findSection(section,getTidContents("TiddlyClipConfig")), catName);
		if (!cat.valid) {
				cat = findCategory (findSection(section), catName);//look for default rule
		}
		if (!cat.valid) {			
			status("not valid category");
			return;
		}
		//status ("valid category");
		//could check for type of cat.rules if function then run -- allows module plugin with Tw5
		var cancelled = {val:false};
		var tiddlers = [],tideditMode=[];//list of tids to store
		var catTags = cat.tags;//main config tags 
		var patterns = cat.rules;
		var startrule=0;
		if (!!patterns[0].run) {
			patterns[0].run(catName,pageData, section);
			startrule=1;
		}
		if(hasMode(cat,"nosub")) return;
		//now loop over each tiddler to be created(defined in the category's extension entry)
		//if a list of tiddlers are to be copied from a page then we will have to loop over them as well

		//status ("before subst loop");
		if (!hasModeBegining(cat,"tiddler"))  { //user has not selected  tiddler mode
			for(var i=startrule; i<patterns.length; i++)  {	
				var tiddlerObj, writeMode;
				if (patterns[i].title == null) {
					//status ("title null - looking for macro in tble");
					tiddlyclip[patterns[i].body](catName,pageData,section,tiddlers,tideditMode);
					continue;
				}
				tiddlerObj = new tiddlerAPI.Tiddler();
				//status ("before subst");
				
				tiddlerObj.setPageVars(pageData);
				tiddlerObj.setNormal(patterns[i],pageData);
				tiddlerObj.subst(patterns[i],pageData);

				//status ("after subst");	
				//tiddlerObj.text=userInput(tiddlerObj.text); //not used at present
				tiddlerObj.addTags(catTags);
				//status ("after addTags");
				//user extensions
				for (var userExtends in api.AfterSub) {
						api.AfterSub[userExtends](tiddlerObj);
				}
				if (cancelled.val==true) {return;}
				//if (pageData.data.WriteMode !="none") writeMode=pageData.data.WriteMode;
				//add tiddlers one by one to our list of edits
				tiddlers.push(tiddlerObj);
				tideditMode.push(tiddlerObj.getWriteMode());
				//status ("after push to list");
			}
		} else { 
			var tid;
			for (tid=firstRemoteTid(pageData); hasNextRemoteTid(pageData);tid=nextRemoteTid(pageData)){
				if (!hasMode(cat,"tiddlerscopy")) {
					for(var i=startrule; i<patterns.length; i++)  {	
						var tiddlerObj, writeMode;
						if (patterns[i].title == null) {
							//status ("title null - looking for macro in tble");
							tiddlyclip[patterns[i].body](catName,pageData,section,tiddlers,tideditMode);
							continue;
						}
						tiddlerObj = new tiddlerAPI.Tiddler(tid);
						//status ("before subst");
						
						tiddlerObj.setPageVars(pageData);
						tiddlerObj.setTids(patterns[i],pageData);
						tiddlerObj.subst(patterns[i],pageData);
						//status ("after subst");	
						//tiddlerObj.text=userInput(tiddlerObj.text); //not used at present
						tiddlerObj.addTags(catTags);
						//status ("after addTags");
						//user extensions
						for (var userExtends in api.AfterSub) {
								api.AfterSub[userExtends](tiddlerObj);
						}
						if (cancelled.val==true) {return;}
						//if (pageData.data.WriteMode !="none") writeMode=pageData.data.WriteMode;
						//add tiddlers one by one to our list of edits
						tiddlers.push(tiddlerObj);
						tideditMode.push(tiddlerObj.getWriteMode());
						//status ("after push to list");
					}
				}
				else {
					tiddlerObj=new tiddlerAPI.Tiddler(tid);
					var editMode;//no editmode
					tiddlerObj.addTags(catTags);
					if (!vers2 && pageData.data.classic =='true') tiddlerObj.addMimeType('text/x-tiddlywiki');
					tiddlers.push(tiddlerObj);
					tideditMode.push(editMode);
				}
			}

		}
		for (var userExtends in api.BeforeSave) {
			api.BeforeSave[userExtends]();
		}
		if(hasMode(cat,"nosave")) return;
		//status ("before adding to tw");
		for (var i =0; i< tiddlers.length; i++) {
			if (!tiddlers[i].isNull())
				addTiddlerToTW(tiddlers[i], tideditMode[i]);
		}
	}  

	function getTidContents(tidname) {
		if (vers2) 
			return store.getTiddlerText(tidname);
		else
			return $tw.wiki.getTiddlerText(tidname);
	}
		
	function addTiddlerToTW( tiddlerObj, writeMode) { 
		
		if (!twobj.tiddlerExists(tiddlerObj.fields.title))  twobj.modifyTW(tiddlerObj);
		else {
			//status ("writemode is "+writeMode);
			switch (writeMode) {
				case 'once':
					var oldtid = twobj.getTiddler(tiddlerObj.fields.title);//retrieve existing version
					if (!!oldtid) break;
					twobj.modifyTW(tiddlerObj);
					break;
				case 'move':
					var oldtid = twobj.getTiddler(tiddlerObj.fields.title);//retrieve existing version
					if (!!oldtid)  {
						oldtid.title =oldtid.title + new Date();//move old tid by appending the date to its title
						twobj.modifyTW(oldtid);//move out the way
					}
					twobj.modifyTW(tiddlerObj);
					break;
				default: //overwrite
				twobj.modifyTW(tiddlerObj);
			}
		}
	}

	return api;
}());
///end tPaste ///
tiddlyclip.modules.twobj = (function () {

	var api = 
	{
		onLoad:onLoad, 			tiddlerExists:tiddlerExists,
		modifyTW:modifyTW,		getTiddler:getTiddler		
	}
	var   tiddlerAPI,tPaste;
	function onLoad () {
				tiddlerAPI 	= tiddlyclip.modules.tiddlerObj;
				tPaste=tiddlyclip.modules.tPaste;
		}
	var tw =null,oldTW=null;
	var storeStart;		

	function getTiddler(tidname) {	
		if (vers2) 
			var storedTid=store.getTiddler(tidname);
		else
			var storedTid=$tw.wiki.getTiddler(tidname);
		if (storedTid) {
			return (new tiddlerAPI.Tiddler(storedTid,true));
		}
		else return null;
	}		
	function modifyTW(t)
	{
	    var fields={}; 
	    if (vers2) {
			var exclude = ["title","modifier","modified","created","creator","tags","text"];
			exclude = exclude.concat(t.toRemove);
			t.attribs = t.attribs.filter(function(i) {return exclude.indexOf(i) < 0;});
			for (var i = 0; i < t.attribs.length;i++) {
				fields[t.attribs[i]]=t.fields[t.attribs[i]];//put extended fields into a group
			}
					
			var tiddler = store.saveTiddler(t.fields.title,t.fields.title,t.fields.text,t.fields.modifier,t.fields.modified,
											t.fields.tags,fields,false,t.fields.created,t.fields.creator);
			autoSaveChanges(null,[tiddler]);
		} else {
			t.attribs = t.attribs.filter(function(i) {return t.toRemove.indexOf(i) < 0;});
			$tw.utils.each(t.fields, function(value, name ) {	
			   fields[name]=	t.fields[name];//put fields into a group
				//alert("mod"+name+' '+fields[name]);
				//status  ("name "+name+"val "+value);
				});
			$tw.wiki.addTiddler(new $tw.Tiddler(fields));
		}
	}		
			   			   
	function tiddlerExists(title) {
	    if (vers2) 
			return(store.tiddlerExists(title));
		else
			return($tw.wiki.tiddlerExists(title));
	}			   			   
	return api;
}());
///end twobj///

tiddlyclip.modules.tiddlerObj = (function () {

	var api = 
	{
		onLoad:onLoad, Tiddler:Tiddler
	}
	var tcBrowser, twobj,pref, util, table;
	
	function onLoad(doc) {
		tcBrowser	= tiddlyclip.modules.tcBrowser;
		twobj		= tiddlyclip.modules.twobj;	
		defaults	= tiddlyclip.modules.defaults;
	}
	function createDiv(){
		return document.createElement("div");
	}
	
	function removeDuplicates(names) {
		var i,j,dup,nams = '', nlist = names.split(' ');
		for ( i=0; i < nlist.length; i++)
			nlist[i] = nlist[i].trim();
		for ( i=0; i < nlist.length; i++){
			dup = false;
			for ( j = i ; j > 0; j--) {
				if (nlist[i] === nlist[j-1]){
					dup = true;// alert("dup");
					break;
				}
			}
			if (!dup) nams = nams+' '+nlist[i];
		}
		return nams;
	}
Tiddler.prototype.addCreationFields=function() {
			this.fields.created=new Date();
			this.fields.creator=config.options.txtUserName;
	}
	function Tiddler(el,truetid) {
		this.attribs = ["text"];
		this.toRemove =[];
		var current = this;
		current.fields = {};
		current.fields.text ="";
		//current.fields.title ="";	
		if (!el) { 
			if (vers2) {
				el = new window.Tiddler();
				store.forEachField(el,function(tiddler,fieldName,value){
							current.fields[fieldName]=value;
							current.attribs.push(fieldName);},false);	
				this.addCreationFields();
			} else {
				el =  new $tw.Tiddler($tw.wiki.getCreationFields(),$tw.wiki.getModificationFields());
				for (var atr in el.fields){ 
						current.fields[atr]=el.getFieldString(atr);
						current.attribs.push(atr);		
				}			
			}	
		    this.fields.tags="";		
		} else if (!truetid) {
			if((typeof el) ==="string"){ //convert html to dom ;
				var wrapper= createDiv();
				wrapper.innerHTML= el;
				el= wrapper.firstChild;
				wrapper = {};//release div
			}								 				
			this.fields.text = undoHtmlEncode(el.innerHTML.
					replace(/\n<pre xmlns="http:\/\/www.w3.org\/1999\/xhtml">([\s|\S]*)<\/pre>\n/mg,"$1").
					replace(/\n<pre>([\s|\S]*)<\/pre>\n/mg,"$1"));
			var  j = el.attributes, m, extraTags='';
			for (var i = j.length; i!== 0; i--) {
				m=j[i-1].nodeName; 
				v=j[i-1].value;
				this.attribs.push(m);
				this.fields[m] = undoHtmlEncode(v) ;
			}

		} else {
			if (vers2) {
				store.forEachField(el,function(tiddler,fieldName,value){
						current.fields[fieldName]=value;
						current.attribs.push(fieldName);},false);	
			} else {
				for (var atr in el.fields){ 
						current.fields[atr]=el.getFieldString(atr);
						current.attribs.push(atr);		
				}
			}		
			if (!!this.fields.tags) this.fields.tags = (this.fields.tags instanceof Array)?this.fields.tags.join(' '):this.fields.tags;
		    else this.fields.tags="";
			//this.body =   this.text;
		}	
		if (vers2) {
			if (!!this.fields.modified ) this.fields.modified=(this.fields.modified instanceof Date) ? this.fields.modified : Date.convertFromYYYYMMDDHHMM(this.fields.modified);
			this.fields.created=(this.fields.created instanceof Date) ? this.fields.created : Date.convertFromYYYYMMDDHHMM(this.fields.created);
		} else {
			if (!!this.fields.modified ) this.fields.modified=(this.fields.modified instanceof Date) ? this.fields.modified : $tw.utils.parseDate(this.fields.modified);
			this.fields.created=(this.fields.created instanceof Date) ? this.fields.created : $tw.utils.parseDate(this.fields.created);
		}				
		return this;
	}
	
	Tiddler.prototype.addMimeType=function(mime){
		this.attribs.push('type');
		this.fieldstype = mime;
	}
	
	Tiddler.prototype.exportFieldsTo=function(obj){
		if (!obj) return null;

		for (var i = 0; i<this.attribs.length; i++){ 
			var atr = this.attribs[i];

           // if (atr !== "tags"&&atr !== "text")  obj[atr]=this[atr]; //BJ meditation: what about title??
           obj[atr]=this.fields[atr]; 			
		};					 
		return obj;
	}
		
	Tiddler.prototype.exportModifierFieldsTo=function(obj){
		if (!obj) return null;
		obj.modified = this.fields.modified?this.fields.modified:new Date(); //BJ don't we need to convert to a string?
		obj.modifier = this.fields.modifier?this.fields.modifier:'unknown'; 			
		return obj;
	}	

	Tiddler.prototype.isNull=function(){
		return (!this.fields.title)
	}
		
	Tiddler.prototype.addTags=function(tag){
		if (!tag) return;
		if (!this.fields.tags) this.fields.tags = ' ';
		this.fields.tags = removeDuplicates(this.fields.tags + ' '+ tag);
	}

	Tiddler.prototype.applyEdits = function(fields) {//BJ: can probably just point this.fields to fields
		for (var i in fields){				
			if (!this.hasOwnProperty(i)) this.attribs.push(i);//add to list of fields to update
			this.fields[i] = fields[i];
		}
	}
	
	Tiddler.prototype.removeField = function(field) {//BJ: can just delete this.fields[field]
			this.toRemove.push(field);
	}

	Tiddler.prototype.hasMode=function(mode){
		if (!this.modes) return false;
		for (var i=0; i< this.modes.length;i++)
			if (mode === this.modes[i]) return true;
		return false;
	}
	
	Tiddler.prototype.getWriteMode=function(mode){
		var writeMode = 'overwrite';
		if (!this.modes) return writeMode;
		if (this.hasMode("move")) return "move";
		if (this.hasMode("once")) return "once";
		return writeMode;
	}
	
	function undoHtmlEncode( input ) {
		input =input
        .replace(/&bar;/g, '|')
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
        return (input);   
	}

	function extractModes(tagString) {
		var modes =[], tList = tagString.split(' ');
		for (var i=0; i< tList.length; i++) {
			modes[i] = tList[i].trim();
		}
		return modes;
	}
	Tiddler.prototype.setPageVars  =	function (pageData){
		var dateLong=    'DDD, MMM DDth, YYYY';
		var dateTimeLong='DDD, MMM DDth, YYYY at hh12:0mm:0ss am';	
		var dateShort=   'DD MMM YYYY';//journal form
		var dateTimeShort=   'YYYY/MM/DD 0hh:0mm:0ss';//journal form
		if (vers2) {		
			pageData.data.yearMonth=(new Date()).convertToYYYYMMDDHHMMSSMMM().replace(/(.*)\.(.*)/,"$1").substr(0,6);
			pageData.data.dateTimeLong=  new Date().formatString(dateTimeLong);	//replaces  %dateTimeLong%
			pageData.data.dateLong=      new Date().formatString(dateLong);		//replaces  %dateLong%
			pageData.data.dateShort=     new Date().formatString(dateShort);		//replaces  %dateShort%     
			pageData.data.dateTimeShort=     new Date().formatString(dateTimeShort);		//replaces  %dateShort%   
			pageData.data.dateComma=     pageData.data.dateShort.toString().replace(/ /g,':');
		}else {
			pageData.data.yearMonth=$tw.utils.stringifyDate(new Date()).replace(/(.*)\.(.*)/,"$1").substr(0,6);
			pageData.data.dateTimeLong=   $tw.utils.formatDateString(new Date(),dateTimeLong);	
			pageData.data.dateLong=       $tw.utils.formatDateString(new Date(),dateLong);		
			pageData.data.dateShort=      $tw.utils.formatDateString(new Date(),dateShort);	       
			pageData.data.dateComma=     pageData.data.dateShort.toString().replace(/ /g,':');
			pageData.data.dateTimeShort=  $tw.utils.formatDateString(new Date(),dateTimeShort);
		}
		pageData.data.category1stWord=pageData.data.category.replace(/(.*) (.*)/,"$1");

		var macrosx =defaults.getMacros();
		table={$:{}};table['#']={};table['@']={};
		for (var n in pageData.data) {table['@'][n]= pageData.data[n];}
		for (var n in macrosx) {table['@'][n]= macrosx[n];}
	}

	Tiddler.prototype.setTids  =	function (rule,pageData){

		//---first determine the title
		table['#']={};	
		this.exportFieldsTo(table['$'])
		this.parseStructure(rule.title);
		var title = table['$'].title;			 
		table['@']['newtiddler']= 'false';

		//xecute mode rule and obtain (possibly) modified modes
		this.parseStructure(rule.modes);			 
		this.modes=extractModes(table['#']['newdata']);
		//---modes are now determined 
	}
	
	Tiddler.prototype.setNormal  =	function (rule,pageData){

		//---first determine the title
		this.parseStructure(rule.title);
		var title = table['$'].title;			 
		table['#']={};		
		//---next we need to find the modes before we can decide how to update
		//-----1- does tiddler exist already?
		var storedTid=twobj.getTiddler(title);
		if (storedTid) {
			storedTid.exportFieldsTo(table['$']);
			table['@']['newtiddler']= 'false';
		} else {
			table['@']['newtiddler']= 'true';
			this.exportFieldsTo(table['$']);
		}
		//-----2- execute mode rule and obtain (possibly) modified modes
		this.parseStructure(rule.modes);			 
		this.modes=extractModes(table['#']['newdata']);
		//---modes are now determined 
		table['#']={};
		table['$']={};

		//---expose whether this is a new tiddler
		if (this.hasMode('append')||this.hasMode('prepend')||this.hasMode('modify')) {
			var storedTid=twobj.getTiddler(title);
			if (storedTid) {
				storedTid.exportFieldsTo(table['$']);
				this.exportModifierFieldsTo(table['$']);
				table['@']['newtiddler']= 'false';
			} else { 
				this.exportFieldsTo(table['$']);
				this.parseStructure(rule.InitVals);
				table['@']['newtiddler']= 'true';
			}
		}
		else 
		{
			this.exportFieldsTo(table['$']);
			this.parseStructure(rule.InitVals);
			table['@']['newtiddler']= 'true';
		}
		table['$'].title=title;
	}
	Tiddler.prototype.subst  =	function (rule,pageData){


		//BJ FIXME here we can test for 'tiddler mode' and retreive the tiddler from the list of clipped tids
		//else if	rule.hasModeBeginng('tiddler')) {
		//	var Tid = getclippedtid();//increment handle in outer loop
		//	Tid.exportFieldsTo(table['$']);
		//	table['@']['newtiddler']= 'false';	
		//}	
		
		//---apply rules
		table['#']={};
		this.parseStructure(rule.body);	
		//---check to see if user will handle insertion of new text		 
		if (!this.hasMode('no-textsaver')) {
			var data = table['#']['newdata'], prepend =this.hasMode('prepend');
			//status ("not textsaver with data "+ data+" olddata "+	table['$']['text']);
			//BJ does this.fields.text exist with a new tiddler? 
			table['$']['text'] = (!!prepend)?data + table['$']['text'] :table['$']['text'] + data;
		}
		table['#']={};
		this.parseStructure(rule.tags);	

		table['#']={};
		this.parseStructure(rule.fields);
		//---move data from parser table into tiddler
		this.applyEdits(table['$']);
		return this;
	}
	///////////////// parser implementation /////////////////
	var error=function (message) {
		 alert(message);
	}

	function getSimpleVarFrom (n ) {
		n = n.trim();
		var type = n.substring(0,1);
		if (type !== '#' &&type !=='$' && type !=='@') error("variable: invalid name "+n);
        else return {type:type, leftSide:n.substring(1)};
	}
	function valOf(n, test) {
		var val, type = n.substring(0,1);
		if (type !== '#' &&type !=='$'&&type !=='@'){
			error("source: invalid name"+n);
			return null;
		}
		else {
			val=table[type][n.substring(1)];
			if (val == undefined) { 
				if (!test)  error("source: invalid val "+n);
				return null;
			}
			return val;
		}
	 }
	function toValues(sources) {
		var values = [], returned;
		for (var i = 0 ; i < sources.length ;i++) {
			if ((values[i]= valOf(sources[i]))==null) return null;
		}
		return  values;
	}
	function makeInt (value) {
		if(/^(\-|\+)?([0-9]+)$/.test(value)) {
			return Number(value);
		}
		return NaN;
	}

	Tiddler.prototype.parseStructure=function(cb,localonly) {
		//updates the global 'table'
		var target, b;
		try {
		b=JSON.parse(cb);
		} catch(e) {
			error(cb+" is not a json");
			return;
		}
		for (var i=0; i < b.length; i++) {
			var moreThanOne = 0;
			for (var n in b[i]) {//n is our nodes combined target/operator string - eg #x#EQ
				if (moreThanOne) error ("general:more than one subterm in node");
				var rightSide =b[i][n];
				if (typeof rightSide === "object") error("source: invalid type object");
				else if (typeof rightSide === "string") {
					rightSide = this.replaceALL(rightSide);
				}
				else error("source: invalid type");
				var returedVals =  getSimpleVarFrom (n);
				var leftSide =  returedVals.leftSide;
				var type 	 =  returedVals.type;
				if (type !== '#' &&type !=='$') error("target: invalid name "+n);			
				if (!localonly)  table[type][leftSide] = rightSide;
				else {
					if (type=='#') table[type][leftSide] = rightSide;
					else error("target: invalid assignment");
				}
				moreThanOne++;		
			}
		}
	}

	function handleBinaryForm(leftSide,operator,rightSide) {
		switch (operator) {
			case 'PS':
			case 'MS':
				rightSide = makeInt(rightSide);
				if ( isNaN(rightSide)) {error("rightside: can only add integers"); return null;}
				leftSide = makeInt(leftSide);
				if (isNaN(leftSide)) {error("leftside: can only add integers"); return null;}
				return ((operator==='PS')?leftSide+rightSide:leftSide-rightSide);			
				break;
			case 'EQ':
			case 'NQ':
			//alert(leftSide+" cmp "+rightSide);
				return ((operator==='EQ')?leftSide==rightSide:leftSide!=rightSide);			
				break;
			default: error("operator not found");
					 return null;
		}	
	}

	 Tiddler.prototype.handleFunction=function(source) {
		var self = this;
		if (!/@(.*)\(([\S\s]*?)\)/.test(source) )return null;
		return source.replace(/@(.*)\(([\S\s]*?)\)/g,function(m,key1,key2,offset,str){
			if (key1=="delete") {
				self.removeField(key2.substring(1));
				return "deleted "+key2;
			}
			if (key1=="exists") {
				if (valOf(key2, true) != null)
					return "true";
				else
					return "false"
			}
			if (key1=="alert") {
				if (valOf(key2) == null)
					alert(key2+" null");
				else
					alert(valOf(key2));
				return "alerted";
			}
			//handle normal functions
			var val;
			if (!!key2) val = valOf(key2);
			else val = ""
return tiddlyclip[key1](val);
/*
			try {
				return tiddlyclip[key1](val);
			} catch (e) {
				error ("macro "+key1 +" not found");
				return "macro " + key1 + " not found";
			} 
*/				
			return m;
		});
	}
	
	Tiddler.prototype.replaceALL=function(source, data){ //replace all ((* *)) delimited strings
		var self = this;
		return source.replace(/\(\(\*([\S\s]*?)\*\)\)/g,function(m,key,offset,str){ 
			var parts, vals, res, firstterm, firstparts, testedTrue = true;
			// check for  ((*conditional*??*Use this variable*??*or use this variable*))
			firstparts= key.split("*??*");
			//handle conditional string
			if (firstparts.length >1) {	
				var negate=(firstparts[0].substring(0,1)== '!');
				if (negate) {
					firstterm = firstparts[0].substring(1);
				} else {
					firstterm = firstparts[0];
				}
				// regex condition
				if ((parts= firstterm.split("/")).length ==3) {
					if ((vals = toValues(parts)) == null) return m;
					var regParts = (valOf(parts[1])).split("/");
					var pattern=new RegExp(regParts[1],regParts[2]);
					
					if (negate&&pattern.test(vals[0])) testedTrue = false;
					else if (!negate&&!pattern.test(vals[0]))testedTrue = false;
				}
				// comparision
				else if ((parts= firstterm.split("==")).length ==2) {
					if ((vals =toValues(parts))==null) return m;
					if ((res=handleBinaryForm(vals[0],negate?"NQ":"EQ",vals[1]))==null) return m;
					else if (!res) testedTrue = false; 
				} 
				// macro
				else if ((res = self.handleFunction(firstterm)) != null) { // a function
					if ( negate && res==="true") 	{testedTrue = false;}
					if (!negate && res==="false") {testedTrue = false;}

				}
				// boolean variable
				else {
					if ((vals =valOf(firstterm))==null)  return m;
					if ( negate && vals==="true") 	testedTrue = false;
					if (!negate && vals==="false") testedTrue = false;
				}

				if (testedTrue) {
					key = firstparts[1];
				} 
				else { 
					if (firstparts.length == 2) return '';//no 'else' defined
					key = firstparts[2];
				}
			}
			// end of handling conditional string part
			var parts;
			// regex ((*@PageRef/#rule/#term*)) or ((*.....*??*@PageRef/#rule/#term*))
			if ((parts = key.split("/")).length ==3) {
				if ((vals = toValues(parts)) == null) return m;
				var regParts = (valOf(parts[1])).split("/");
				var pattern=new RegExp(regParts[1],regParts[2]);
			return vals[0].replace(pattern, vals[2]);
			}
			// substitute
			if ((parts = key.split(":")).length ==3) {
				if ((vals = toValues(parts)) == null) return m;		
				return vals[0].replace(vals[1], vals[2]);
			}
			// add 
			if ((parts = key.split("+")).length == 2) {
				if ((vals = toValues(parts)) == null) return m;
				if ((res = handleBinaryForm(vals[0],"PS",vals[1])) == null) return m;
				return res.toString();
			}	
			// subtract	
			if ((parts= key.split("-")).length ==2) {
				if ((vals = toValues(parts)) == null) return m;
				if ((res = handleBinaryForm(vals[0],"PS",vals[1])) == null) return m;
				return res.toString();
			}
			// macro
			if ((res = self.handleFunction(key)) != null) return res;
			// vanilla variable
			if ((res = valOf(key)) != null) return res;
			// error
			return m;
		});
    }
	///////////////// parser implementation end/////////////////
	return api;
	
}());
///end tiddlerObj///
 tiddlyclip.modules.defaults = (function () {
	var defaultCommands = {
		search:{tip:'search selection in tw', command:function(){alert("mysearch")}}
	};
	var tPaste, twobj;
	function onLoad() {
		tPaste=tiddlyclip.modules.tPaste;
		twobj=tiddlyclip.modules.twobj;
	}
	var api = 
	{
		onLoad:onLoad, getDefaultRule:getDefaultRule, 
		getDefaultCategories:getDefaultCategories,
		getTWPrefs:getTWPrefs,
		getMacros:getMacros,
		defaultCommands:defaultCommands
	}	
	var defaultCategories = [
		"|tid|copy tids||defaultTid|tiddlerscopy|",
		"|text|save text||defaultText||",
		"|web|save html||defaultWeb||"
	];
	var defaultRules = {
		defaultTid:"|((*@remoteTidTitle*))|((*@remoteTidText*))|((*@remoteTidTags*))|||append|",
		defaultText:"|((*@pageTitle*))|((*@pageRef*)) <br>date='((*@dateTimeLong*))', <html>((*@text*))</html>||||append|",
		defaultWeb: "|((*@pageTitle*))|((*@pageRef*)) <br>date='((*@dateTimeLong*))', <html>((*@web*))</html>||||append|"
	}

	var defaultPrefs = {
		ConfigOptsTiddler:'ConfigOptions',
		filechoiceclip:1,
		txtUserName:'default'
	}
	var macros = {
	FOLDSTART:'ᏜᏜᏜᏜ*',
	FOLDCONTENT:'!/%%/'
	}
	
	function getMacros(){
		if (!twobj.tiddlerExists("TiddlyClipMacros"))  return macros;

		var content = tPaste.getTidContents("TiddlyClipMacros");//where all marcos are defined	
		try {
			if (content =="") return macros;
			var values =JSON.parse(content);
			if (!!values) {return values;}
		}catch(e){	
		}
		return macros; 
	}
	
	function getTWPrefs(){ return defaultPrefs;}
	

	function getDefaultCategories() {
		return defaultCategories;
	}		
 
	function getDefaultRule(ruleName) {
		return defaultRules[ruleName];
	}

 	return api;
}());
///end defaults///


var MODULES = tiddlyclip.modules;
for (var mod in MODULES) {
	MODULES[mod].onLoad();
}

} 

}());

