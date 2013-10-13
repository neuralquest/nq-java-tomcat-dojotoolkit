define(["dojo/_base/array"], function(arrayUtil) {
  //  module:
  //    dojo/store/util/SimpleQueryEngine
  //  summary:
  //    The module defines a simple filtering query engine for object stores. 

return function(query, options){
	// summary:
	//		Simple query engine that matches using filter functions, named filter
	//		functions or objects by name-value on a query object hash
	//
	// description:
	//		The SimpleQueryEngine provides a way of getting a QueryResults through
	//		the use of a simple object hash as a filter.  The hash will be used to
	//		match properties on data objects with the corresponding value given. In
	//		other words, only exact matches will be returned.
	//
	//		This function can be used as a template for more complex query engines;
	//		for example, an engine can be created that accepts an object hash that
	//		contains filtering functions, or a string that gets evaluated, etc.
	//
	//		When creating a new dojo.store, simply set the store's queryEngine
	//		field as a reference to this function.
	//
	// query: Object
	//		An object hash with fields that may match fields of items in the store.
	//		Values in the hash will be compared by normal == operator, but regular expressions
	//		or any object that provides a test() method are also supported and can be
	// 		used to match strings by more complex expressions
	// 		(and then the regex's or object's test() method will be used to match values).
	//
	// options: dojo.store.util.SimpleQueryEngine.__queryOptions?
	//		An object that contains optional information such as sort, start, and count.
	//
	// returns: Function
	//		A function that caches the passed query under the field "matches".  See any
	//		of the "query" methods on dojo.stores.
	//
	// example:
	//		Define a store with a reference to this engine, and set up a query method.
	//
	//	|	var myStore = function(options){
	//	|		//	...more properties here
	//	|		this.queryEngine = dojo.store.util.SimpleQueryEngine;
	//	|		//	define our query method
	//	|		this.query = function(query, options){
	//	|			return dojo.store.util.QueryResults(this.queryEngine(query, options)(this.data));
	//	|		};
	//	|	};

	// create our matching query function
	switch(typeof query){
		default:
			throw new Error("Can not query with a " + typeof query);
		case "object": case "undefined":
			var queryObject = query;
			query = function(object){
				for(var key in queryObject){
					var required = queryObject[key];
					if(required && required.test){
						if(!required.test(object[key])){
							return false;
						}
					}else if(required != object[key]){
						return false;
					}
				}
				return true;
			};
			break;
		case "string":
			// named query
			if(!this[query]){
				throw new Error("No filter function " + query + " was found in store");
			}
			query = this[query];
			// fall through
		case "function":
			// fall through
	}
	function execute(array){
		// execute the whole query, first we filter
		var results = arrayUtil.filter(array, query);
		//EXTENSION
		//Presort by view name
		results.sort(function(a, b){
			var titleA = _nqSchemaMemoryStore.get(a.viewId).title;
			var titleB = _nqSchemaMemoryStore.get(b.viewId).title;
			if(titleA > titleB) return 1;
			if(titleA < titleB) return -1;
		});
		var viewProps = _nqSchemaMemoryStore.get(array[0].viewId);//FIXME for now we assume the array contains only one view type
		//var viewProps = _viewPropsStore.get(array[0].viewId);
		if(viewProps.relationship = 'ordered'){//we're dealing with an ordered view (ie linkedList)
			var map = []; //create a map of ids to next ids
			for(var i=0;i<results.length;i++){
				map[results[i].id] = results[i].insertBefore;
			}
			results.sort(function(a, b){
				nextId = a.id;
				//follow the linkedList to the end
				for(var i=0;i<results.length;i++){//we use a for next loop here instead of a while, to prevent infinte loops incase there's an error in the linked list 
					nextId = map[nextId];
					if(!nextId) return 1; //b not found, so a index is higher than b index
					if(nextId == b.id) return -1; //b found, so a index is lower than b index
				}
				return 0;//this is an error situation, the loop should have returned by now
			});
		}
		else {
			if(options && options.sortByLabel){
				results.sort(function(a, b){
					var aLabel = toLowerCase(a[viewProps.label]);
					var bLabel = toLowerCase(b[viewProps.label]);
					if(aLabel > bLabel) return 1;
					if(aLabel < bLabel) return -1;
					return 0;
				});
			}
			//END OF  EXTENSION
			// next we sort
			if(options && options.sort){
				results.sort(function(a, b){
					for(var sort, i=0; sort = options.sort[i]; i++){
						var aValue = a[sort.attribute];
						var bValue = b[sort.attribute];
						if (aValue != bValue) {
							return !!sort.descending == aValue > bValue ? -1 : 1;
						}
					}
					return 0;
				});
			}
			// now we paginate
			if(options && (options.start || options.count)){
				var total = results.length;
				results = results.slice(options.start || 0, (options.start || 0) + (options.count || Infinity));
				results.total = total;
			}
		}
		return results;
	}
	execute.matches = query;
	return execute;
};
});
