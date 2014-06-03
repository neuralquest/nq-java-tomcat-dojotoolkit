define(["dojo/_base/declare", "nq/nqWidgetBase", "dijit/Tree", "dijit/registry",/* 'nq/nqObjectStoreModel',*/"dijit/tree/ObjectStoreModel", "dojo/hash","dojo/when", "dojo/promise/all",  
        'dojo/dom-construct', 'dijit/tree/dndSource', 'dijit/Menu', 'dijit/MenuItem', 'dijit/PopupMenuItem', 'dojo/query!css2'],
	function(declare, nqWidgetBase, Tree, registry, ObjectStoreModel, hash, when, all,
			domConstruct, dndSource, Menu, MenuItem, PopupMenuItem){

	return declare("nqTreeWidget", [nqWidgetBase], {
		allowedClassesObj: {},//Check Item Acceptance needs this
		labelAttrIdArr: [], //get Label needs this
		
		postCreate: function(){
			this.inherited(arguments);
			var self = this;
			when(this.getTheParentAttr(), function(parentId){
				self.selectedObjIdPreviousLevel = parentId;
				if(parentId){
					when(self.findTheLabels(), function(attrRefs){
						self.createTree();
						self.createMenus();
					}, nq.errorDialog);
				}
				else self.createDeferred.resolve(self);
			}, nq.errorDialog);
		},
		setSelectedObjIdPreviousLevel: function(value){
			var self = this;
			//var value = this.parentId;
			//load the data
			if(!value || value == this.selectedObjIdPreviousLevel) return this;
			this.selectedObjIdPreviousLevel = value;
			when(self.findTheLabels(), function(attrRefs){
				if(self.tree) self.tree.destroy(); 
				self.createTree();
				self.treeModel.query = {cellId: self.selectedObjIdPreviousLevel, viewId: self.viewIdsArr[0]};
//				self.tree.refreshModel();
				self.setSelectedObjIdPreviousLevelDeferred.resolve(self);
				self.createMenus();
			}, nq.errorDialog);
			return this.setSelectedObjIdPreviousLevelDeferred.promise;
		},
		setSelectedObjIdThisLevel: function(value){
			//select the node
			//TODO expand tree
			if(this.selectedObjIdThisLevel == value) return this;
			this.selectedObjIdThisLevel = value;
			//if(value == 824) this.tree.set('path', [810,2016,2020,824]);
			//this.tree.set('path', [810,2016,2020,824]);
			//this.tree.set('selectedItem', value);
			//this.tree._selectNode(value);
		},

		getTheParentAttr: function(){
			var PARENTID = 100;
			var self = this;
			//get the parentId that this widget has as an attribute
			return when(this.store.getOneByAssocTypeAndDestClass(this.widgetId, ATTRIBUTE_ASSOC, PARENTID), function(parentObjId){
				if(!parentObjId) return undefined;
				return when(self.store.getCell(parentObjId), function(parentCell){
					if(parentCell && parentCell.name!='') return parentCell.name;
					return undefined;
				});
			});
		},
		findTheLabels: function(){
			var OBJECT_TYPE = 1;
			
			var self = this;
			//recursivily get all of the views that belong to this widget
			return when(self.store.getManyByAssocType(self.widgetId, MANYTOMANY_ASSOC, OBJECT_TYPE, true), function(viewIdsArr){
				self.viewIdsArr = viewIdsArr;
				var attrRefPropertiesPromisses = [];
				for(var i=0;i<viewIdsArr.length;i++){
					var viewId = viewIdsArr[i];
					attrRefPropertiesPromisses.push(self.viewLabelPairs(viewId));
				}
				return all(attrRefPropertiesPromisses);
			});
		},
		viewLabelPairs: function(viewId){
			var ATTRREF_CLASS_TYPE = 63;
			var self = this;
			return when(this.store.getManyByAssocTypeAndDestClass(viewId, ORDERED_ASSOC, ATTRREF_CLASS_TYPE), function(attrRefsArr){
				self.labelAttrIdArr[viewId] = attrRefsArr[0];//assume the first attrRef is the label
			});
		},
		createTree: function(){
			var self = this;
			this.treeModel = new ObjectStoreModel({
				childrenAttr: this.viewIdsArr,
				store : this.store,
				query : {cellId: this.selectedObjIdPreviousLevel, viewId: this.viewIdsArr[0]}
			});
			this.tree = new Tree({
				id: 'tree'+this.widgetId,
				store: this.store,
				model: this.treeModel,
				dndController: dndSource,
				betweenThreshold: 5, 
				persist: 'true',
				getIconClass: function(item, opened){
					if(!item) return 'icondefault';
					return 'icon'+item.classId;
				},
				getRowClass: function(item, opened){
					if(!item) return '';
					return 'css'+item.viewId;//used by tree menu to determin which menu to show
				},
				getTooltip: function(item, opened){
					if(!item) return '';
					if(location.href.indexOf('localhost') >= 0) return item.id;
				},
				onClick: function(item, node, evt){
					self.inherited('onClick',arguments);
					nq.setHashViewId(self.level, item.viewId, self.tabId, item.id);
				},
				checkItemAcceptance: function(target, source, position){
					return true;
					var targetItem = dijit.getEnclosingWidget(target).item;
					var subClassArr = self.allowedClassesObj[targetItem.viewId];
					var sourceItemClassId = source.current.item.classId;
					//console.log('sourceItemClassId', sourceItemClassId);
					for(var i = 0;i<subClassArr.length;i++){
						var mapsToClassId = subClassArr[i].id;
						//console.log('mapsToClassId', mapsToClassId);
						if(mapsToClassId === sourceItemClassId) return true;
					}
					return false;
				},
				getLabel: function(item){
					if(!item) return 'no item';
					var labelAttrId = self.labelAttrIdArr[item.viewId];
					return item[labelAttrId];
				},
				onLoad: function(){
					fullPage.resize();//need this for lazy loaded trees, some how the first tree lags behind
					console.dir(self.createDeferred.resolve(self));
					self.createDeferred.resolve(self);//ready to be loaded with data/
//					self.setSelectedObjIdPreviousLevelDeferred.resolve(self);
				},
				refreshModel: function () {
					// reset the itemNodes Map
					this._itemNodesMap = {};
					// reset the state of the rootNode
//					this.rootNode.state = "UNCHECKED";
					// Nullify the tree.model's root-children
					this.model.root.children = null;
					// remove the rootNode
					if (this.rootNode) {
						this.rootNode.destroyRecursive();
					}
					// reload the tree
					this._load();
				}
			}, domConstruct.create('div'));
			this.pane.containerNode.appendChild(this.tree.domNode);
			this.tree.startup();
			this.createDeferred.resolve(this);//ready to be loaded with data

		},
		
		createMenus: function(){
			var OBJECT_TYPE = 1;
			var ASSOCS_ATTR_ID = 1613;
			var SUBCLASSES_PASSOC = 15;
			var ASSOCS_CLASS_TYPE = 94;
			var CLASS_TYPE = 0;
			var CELNAME_ATTR = 852;
			
			var self = this;
			when(self.store.getManyByAssocType(this.widgetObjId, MANYTOMANY_ASSOC, OBJECT_TYPE, true), function(viewObjArr){
				//console.log('getManyByAssocType', viewObjArr);					
				for(var i=0;i<viewObjArr.length;i++){
					viewObj = viewObjArr[i];
					var parentMenu = new Menu({targetNodeIds: [self.tree.domNode], selector: ".css"+viewObj});					
					var destClassId = viewObj[ASSOCS_ATTR_ID][MAPSTO_ASSOC][0];
					//get the assocication type that this view has as an attribute
					when(self.store.getOneByAssocTypeAndDestClass(viewObj, ATTRIBUTE_ASSOC, ASSOCS_CLASS_TYPE), function(assocTypeObj){
						//get the subclasses as seen from the destClass
						when(self.store.getManyByAssocType(destClassId, SUBCLASSES_PASSOC, CLASS_TYPE, true), function(subClassArr){
							self.allowedClassesObj[viewObj] = subClassArr;//Check Item Acceptance needs this
							var classMenu = new Menu({parentMenu: parentMenu});
							for(var j=0;j<subClassArr.length;j++){
								var subClass = subClassArr[j];
								//console.log(subClass);

								var tree = this.tree;
								var menuItem = new MenuItem({
									label: "A New <b>"+subClass[CELNAME_ATTR]+"</b> Object",
									iconClass: "icon"+subClass.id,
									subClass: subClass,
									viewObj: viewObj
								});
								menuItem.on("click", function(evt){
									console.log('menu item on', this.subClass);
									var viewId = this.viewObj.id.split('/')[1];
									var classId = this.subClass.id.split('/')[1];
									var addObj = {
										'id': '',//cid will be added by our restStore exstension, we need a dummy id
										'viewId': viewId, 
										'classId': classId
									};
	//								addObj[viewDefToCreate.label] = '[new '+subClass+']';;
									var newItem = self.store.add(addObj);
									
									var selectedItem = self.tree.get("selectedItem");
									if(!selectedItem[viewId]) selectedItem[viewId] = [];
									selectedItem[viewId].push(newItem.id);
									_nqDataStore.put(selectedItem);

									//TODO this should be done automaticly some where
									var x = self.tree.model.getChildren(selectedItem, viewsArr);//we need this to create an observer on the newly created item
									
									var selectedNodes = self.tree.getNodesByItem(selectedItem);
									if(!selectedNodes[0].isExpanded){
										self.tree._expandNode(selectedNodes[0]);
									}
									self.tree.set('selectedItem', newItem.id);
								});
								classMenu.addChild(menuItem);	
							}
							classMenu.startup();
							parentMenu.addChild(new PopupMenuItem({
								label:"Add <span style='color:blue'>"+viewObj+"</span> Relationship To",
								iconClass:"icon"+destClassId,
								popup: classMenu
							}));
						}, nq.errorDialog);
						parentMenu.addChild(new MenuItem({
							label:"Delete",
							iconClass:"removeIcon",
							onClick: function(){
								//TODO
								var selectedItem = self.tree.get("selectedItem");
								self.store.remove(selectedItem.id);
								
								var parentItem = self.store.get(this.parentId);
								var viewId = self.viewDefToCreate.id;
								index = array.indexOf(parentItem[viewId], selectedItem.id);
								parentItem[viewId].splice(index, 1);
								self.store.put(parentItem);
							}
						}));
						parentMenu.startup();
					}, nq.errorDialog);
				}
			}, nq.errorDialog);		
		}
	});
});
