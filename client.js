/**
 * Created by johndunne on 29/07/15.
 */
var hostname = null;
var user_id = null;
var api_key = null;
var debug = true;
var scheme = "https";
var currentRecipe = {};
var alternativeFoods = {};
var apiOptions = false;
var xhrFields = {withCredentials: true};
var auth_request_header = {};

var noLongerValidGuestIDHook = null;

function attachNoLongValidGuestIDHook(hook){
    if( typeof hook === 'function') {
        noLongerValidGuestIDHook=hook;
    }else{
        console.error("Not a function");
    }
}

if (!window.jQuery) {
    console.error("jQuery (or Zepto) isn't yet imported.");
}

var _internalLastRequestTime= 0,_internalMSDelayBeforeRequestTriggered=2000;
var _internalTimeInMS = function (){
    return Date.now();
}

var initRecipeCalCalc = function (host, api_options, init_complete) {
    hostname = host;
    if( api_options.debug ){
        debug = api_options.debug;
    }
    if( api_options.api_key ) {
        api_key = api_options.api_key;
        if (init_complete){
            init_complete(true,{apiKey:api_key});
        }
    } else if( api_options.enable_persistent_visitor ) {
        if(!api_options.application_name){
            var msg = "I need an application name for persistent vistors.";
            console.error(msg);
            if (init_complete){
                init_complete(false,msg);
            }
            return;
        }

        if(api_options.userId){
            setRecipeCalCalLocalUserId(api_options.userId);
            if (init_complete){
                init_complete(true,{userId:api_options.userId});
            }
        }
        else if( _getLocalApiId()){
            api_key = _getLocalApiId();
            if (init_complete){
                init_complete(true,{apiKey:api_key});
            }
        }else if( _getLocalUserId()){
            user_id = _getLocalUserId();
            if (init_complete){
                init_complete(true,{userId:user_id});
            }
        }else {
            getPersistentVisitorId(api_options.application_name, function (id) {
                if (id) {
                    api_options.user_id = id;

                    if (init_complete){
                        init_complete(true,{userId:id});
                    }
                }else{
                    if (init_complete){
                        init_complete(false,"Unknown error");
                    }
                }
            });
        }
    } else if( api_options.user_id ){
        user_id = api_options.user_id;
        if (init_complete){
            init_complete(true,{userId:user_id});
        }
    }else{
        if (init_complete){
            init_complete(true,"");
        }
    }
    if( api_options.withCredentials ){
        xhrFields = {withCredentials: true};
    }
    if( api_options.includeCaloriesInAlternatives === undefined ){
        api_options.includeCaloriesInAlternatives = true;
    }

    if( api_options.scheme && (api_options.scheme=="http"||api_options.scheme=="https") ){
        scheme = api_options.scheme;
    }
    if(debug){
        console.warn("Starting recipe parser:");
        console.warn(api_options);
    }
    apiOptions = api_options;

};

function _internalApplyRequestHeaders( request_header, request ){
    Object.keys(request_header).forEach(function(key){
        if(debug){
            console.info("Setting header = [" + request_header[key] + "]");
        }
        request.setRequestHeader(key, request_header[key]);
    })
}
var nutritionalNames={ "amount":"Amount", "common_name":"Common Name", "calories":"Calories", "carbs":"Carbs", "total_sugar":"Total Sugar", "sat_fat":"Sat Fat", "protein":"Protein", "poly_fat":"Poly Fat", "total_fat":"Total fat", "alpha_carot":"Alpha carot", "amount":"Amount", "beta_carot":"Beta Carot", "beta_crypt":"Beta Crypt", "calcium":"Calcium", "cholestrl":"Cholesteral", "choline_tot":"Choline", "copper":"Copper", "fiber_td":"Fiber (td)", "folate_dfe":"Folate (dfe)", "folate_tot":"Folate", "folic_acid":"Folic Acid", "food_folate":"Food Folate", "food_id":"Food ID", "food_weight":"Food Weight", "ingredient_line":"Ingredient line", "iron":"Iron", "lut_zea":"Lut", "lycopene":"Lycopene", "magnesium":"Magnesium", "manganese":"Manganese", "mono_fat":"Mono fat", "multiplier":"Multiplier", "nut_food_id":"Nut Food ID", "phosphorus":"Phosphorus", "potassium":"Potassium", "retinol":"Retinol", "selenium":"Selenium", "shrt_desc":"Shrt Desc", "sodium":"Sodium", "vit_a_iu":"Vit A (iu)", "vit_a_rae":"Vit A", "vit_b1":"Vit B1", "vit_b2":"Vit B2", "vit_b3":"Vit B3", "vit_b5":"Vit B5", "vit_b6":"Vit B6", "vit_b12":"Vit B12", "vit_c":"Vit C", "vit_d_iu":"Vit D (iu)", "vit_d_mcg":"Vit D", "vit_e":"Vit E", "vit_k":"Vit K", "water":"Water", "zinc":"Zinc" };
var fullNutritionalNames={ "carbs":"Carbohydrates", "sat_fat":"Saturated Fat","poly_fat":"Polyunsaturated Fat","mono_fat":"Monounsaturated fat", "vit_a_iu":"Vitamin A (iu)", "vit_a_rae":"Vitamin A", "vit_b1":"Vitamin B1", "vit_b2":"Vitamin B2", "vit_b3":"Vitamin B3", "vit_b5":"Vitamin B5", "vit_b6":"Vitamin B6", "vit_b12":"Vitamin B12", "vit_c":"Vitamin C", "vit_d_iu":"Vitamin D (iu)", "vit_d_mcg":"Vitamin D", "vit_e":"Vitamin E", "vit_k":"Vitamin K"};

function vitaminChangeNames() {
    $('[nutritional-name-me]').each(function () {
        $(this).text(nutritionalNames[$(this).text()]);
    });
    $('[full-nutritional-name-me]').each(function () {
        $(this).text(fullNutritionalNames[$(this).text()]!==undefined?fullNutritionalNames[$(this).text()]:nutritionalNames[$(this).text()]);
    });
}

function parseIngredients(ingredients,options,action) {
    if(options.throttleKeyPresses!==undefined&&options.throttleKeyPresses==false){
        if(options.connecting)
            options.connecting();
        recipeCalCalcParseIngredients(ingredients, options, action);
    }else {
        _internalThrottleKeyUps(function () {
            if(options.connecting)
                options.connecting();
            recipeCalCalcParseIngredients(ingredients, options, action);
        }, 2000)();
    }
}

/*function recipeCalCalcParseIngredients(ingredients, options, action) {
    if( typeof ingredients === 'string' ) {
        ingredients = [ ingredients ];
    }
    if( typeof options === 'function'){
        action = options
        options = {}
    }
    if( debug ){
        console.log("Parsing ingredients with options:");
        console.log(options);
    }
    if( Object.prototype.toString.call( ingredients ) === '[object Array]' ) {
        if(hostname) {
            var query_data =  {};
            if(options.limit){
                query_data.limit = options.limit;
            }
            if(options.offset){
                query_data.offset = options.offset;
            }
            var query = jQuery.param(query_data);
            if(query.length>0){
                query = "?" + query;
            }
            $.ajax({
                url: scheme + "://" + hostname + "/parse/ingredients" + query,
                type: 'POST',
                contentType: 'application/x-www-form-urlencoded',
                data: JSON.stringify(ingredients), //stringify is important
                headers:{userid:user_id},
                beforeSend: function (request) {
                    if(debug) console.log("Setting header + " + user_id);
                    request.setRequestHeader("userid", request_header.userid);
                },
                success: function (data_in) {
                    if( data_in ) {
                        var recipe = {nutrition:data_in};
                        recipe = parseRecipeCalCalcResponse(recipe, options);
                        action(recipe,false)
                        _internalScanDomForDynamicUIObjects();
                    }else{
                        console.error("Successful connection but no data! " + data_in);
                    }
                },
                error: function (xhr, type) {
                    console.error(xhr);
                    console.error(type);
                    action(false, "Server not responding.");
                    //ga('set', 'ingredients_parsed', 'error');
                    //alert('Ajax error!')
                }
            });
        }else {
            console.error("Missing hostname. Call initRecipeCalCalc and provide hostname.");
        }
    }else{
        action(false,"I need an array of ingredients or single string ingredient line.")
    }
}*/

function _verifyRecipeObject(recipe){
    if(recipe.portions){
        if( typeof recipe.portions !== "number" && !isNaN(parseInt(recipe.portions, 10))){
            recipe.portions = parseInt(recipe.portions, 10);
        }
    }
    return recipe;
}
function _verifyIngredientObject(ingredient){
    if(ingredient.amount){
        if( typeof ingredient.amount !== "number" && !isNaN(parseInt(ingredient.amount, 10))){
            ingredient.amount = parseInt(ingredient.amount, 10);
        }
    }
    return ingredient;
}

function CreateIngredient(new_ingredient, options, action) {
    if(!new_ingredient.recipe_id){
        console.error("Ingredient is missing a recipe_id field")
        return;
    } else if(!new_ingredient.multiplier || new_ingredient.multiplier<1){
        console.error("Multiplier must be at least 1")
        return;
    } else if(!new_ingredient.amount_unit){
        console.error("Missing amount unit")
        return;
    }
    if(new_ingredient.nut_food_id){
        new_ingredient.food_id = new_ingredient.nut_food_id;
    }
    new_ingredient.amount = parseInt(new_ingredient.amount);
    new_ingredient.recipe_id = parseInt(new_ingredient.recipe_id);
    new_ingredient.food_id = parseInt(new_ingredient.food_id);
    if(!new_ingredient.food_id || new_ingredient.food_id < 1 ){
        console.error("Missing food_id")
        return;
    }
    if( debug ){
        console.log("Creating ingredient:");
        console.log(new_ingredient);
    }
    PostObject(new_ingredient, "recipe/" + new_ingredient.recipe_id + "/ingredient" , options, function(success,data){
        var ingredient = JSON.parse(data);
        if(ingredient) {
            action(success, ingredient);
        }else{
            action(success, data);
        }
    });
}

function SaveIngredient(ingredient_id,ingredient, options, action) {
    if( debug ){
        console.log("Saving ingredient [" + ingredient_id + "]:");
        console.log(options);
    }
    if(!(ingredient_id>0)){
        console.error("Illegal value for ingredient id [" + ingredient_id + "]")
        return;
    }
    PutObject(_verifyIngredientObject(ingredient), "ingredient/" + ingredient_id , options, action);
}

function CreateRecipe(recipe, options, action) {
    if( debug ){
        console.log("Parsing ingredients with options:");
        console.log(options);
    }

    PostObject(_verifyRecipeObject(recipe), "recipe" , options, function(success,data){
        var recipe = JSON.parse(data);
        if(recipe) {
            var new_recipe = internalAttachRecipeObjectMethods(recipe);
            action(success, new_recipe);
        }else{
            action(success, data);
        }
    });
}

function DeleteRecipe(recipe_id, options, action) {
    if( debug ){
        console.log("Deleting recipe with options:");
        console.log(options);
    }

    DeleteObject("recipe/"+recipe_id , options, function(success,data){
        action(success, data);
    });
}

function DeleteIngredient(ingredient_id, options, action) {
    if( debug ){
        console.log("Deleting ingredient with options:");
        console.log(options);
    }

    DeleteObject("ingredient/"+ingredient_id , options, function(success,data){
        action(success, data);
    });
}

function FacebookSignup(access_token, options, action) {
    if( debug ){
        console.log("Signing up to facebook with an access token:");
        console.log(options);
    }
    var o = {access_token:access_token};
    if(options.password){
        o.password = options.password;
    }
    var copy_old_recipes = false;
    if(options.user_id){
        if(debug)console.info("I'll request the user's recipes.");
        copy_old_recipes=true;
    }
    _internalRemoveApiKey();
    PostObject(o, "fb_signup" , options, function(success,data){
        if ( success ){
            _internalRemoveGuestID();
            if(copy_old_recipes)
                TakeGuestRecipes(options.user_id,{},function(success,data){if(!success)console.error(data)})
        }
        action(success,data)
    });
}

function FacebookSigninAndRequestApiKey(access_token, options, action) {
    if( debug ){
        console.log("Signing up to facebook with an access token:");
        console.log(options);
    }
    var copy_old_recipes = false;
    if(options.user_id){
        copy_old_recipes=true;
    }
    var o = {access_token:access_token};
    options.ignore_user_id=true; // Signin should only be with an access token and not confused with a user_id
    _internalRemoveApiKey();
    PostObject(o, "fb_signin" , options, function (success,data) {
        if(success){
            _internalRemoveGuestID();
            RequestApiKey({},action);
            if(copy_old_recipes)
                TakeGuestRecipes(options.user_id,{},function(success,data){if(!success)console.error(data)})
        }else{
            action(success,data);
        }
    });
}

function RequestApiKey(options, action) {
    if( debug ){
        console.log("Requesting an API key:");
        console.log(options);
    }
    _internalRemoveGuestID();
    _internalRemoveApiKey();
    options.ignore_user_id=true; // Signin should only be with an access token and not confused with a user_id
    PostObject({},"request-apikey" , options, function(success,data){
        if(success){
            if(data.api_key){
                persistor.set("a:"+data.api_key);
                action(true,data.api_key);
            }else{
                action(false,data);
            }
        }else{
            action(success,data);
        }
    });
}

function RequestGuestKey(the_application_name, options, action) {
    if( debug ){
        console.log("Requesting a guest key:");
        console.log(options);
    }
    _internalRemoveGuestID();
    _internalRemoveApiKey();
    options.ignore_user_id=true; // Signin should only be with an access token and not confused with a user_id
    PostObject({source:the_application_name},"request-guestid" , options, function(success,data){
        if(success){
            user_id = data.handle;
            action(success,data.handle);
        }else{
            action(success,data);
        }
    });
}

function FacebookSignin(access_token, options, action) {
    if( debug ){
        console.log("Signing up to facebook with an access token:");
        console.log(options);
    }
    var copy_old_recipes = false;
    if(options.user_id){
        copy_old_recipes=true;
    }
    var o = {access_token:access_token};
    _internalRemoveApiKey();
    PostObject(o, "fb_signin" , {ignore_user_id:true}, function(success,data){
        if ( success ){
            _internalRemoveGuestID();
            if ( !_getLocalApiId() ){
                RequestApiKey({},action);
            }else{
                action(success, data)
            }
            if(copy_old_recipes)
                TakeGuestRecipes(options.user_id,{},function(success,data){if(!success)console.error(data)})
        }else {
            action(success, data)
        }
    });
}

function GetMe(options, action) {
    if( debug ){
        console.log("Getting /me :");
        console.log(options);
    }
    GetObject("me" , options, action);
}

function SearchForIngredient(ingredient_search_term,options, action) {
    if( debug ){
        console.log("Getting /me :");
        console.log(options);
    }
    GetObject("/search-ingredients/" + ingredient_search_term, options, action);
}

function SignOut(options, action) {
    if( debug ){
        console.log("Signing out:");
        console.log(options);
    }
    _internalRemoveGuestID();
    _internalRemoveApiKey();
    GetObject("signout" , options, action);
}

function TakeGuestRecipes(guest_id,options, action) {
    if( debug ){
        console.log("Taking guest recipes:");
        console.log(options);
    }
    PostObject({user_id:guest_id},"take-guest-recipes" , options, action);
}

var genericRecipeCalCalcError = function(action) {
    return function (xhr, type) {
        console.error(xhr);
        console.error(xhr.responseText|xhr.responseJSON);
        var json_object = false;
        try {
            json_object = JSON.parse(xhr.responseText);
        }catch(e){
            if(debug)console.log("Not JSON:");
            if(debug)console.log(xhr.responseText);
        }
        if(xhr.status==401){
            if(json_object.error && json_object.error.indexOf("only be used for guest account")>0){
                console.log("Deleting invalid guest id.");
                persistor.del();
                if(noLongerValidGuestIDHook)noLongerValidGuestIDHook();
            }
        }
        if (xhr.responseJSON && xhr.responseJSON) {
            action(false, xhr.responseJSON);
        } else if (json_object.error) {
            action(false, json_object.error);
        }else{
            action(false, xhr.statusText);
        }
    }
};

function PostObject(recipe, command , options, action) {
    if( typeof options === 'function'){
        action = options
        options = {}
    }
    if( debug ){
        console.log("Posting object:");
        console.log(options);
    }

    if(hostname) {
        var request_header = {};
        if(options.ignore_user_id!==true&&user_id){
            request_header.userid=user_id;
        }
        if(api_key){
            request_header.apikey = api_key;
        }

        $.ajax({
            url: scheme + "://" + hostname + "/" + command,
            type: 'POST',
            contentType: 'application/x-www-form-urlencoded',
            data: JSON.stringify(recipe), //stringify is important
            headers:request_header,
            xhrFields:xhrFields,
            beforeSend: function (request) {
                _internalApplyRequestHeaders(request_header,request);
            },
            success: function (data_in) {
                if( data_in ) {
                    action(true,data_in);
                }else{
                    console.error("Successful connection but no data! " + data_in);
                    action(true,data_in);
                }
            },
            error: genericRecipeCalCalcError(action)
        });
    }else {
        console.error("Missing hostname. Call initRecipeCalCalc and provide hostname.");
    }
}

function DeleteObject(command , options, action) {
    if( typeof options === 'function'){
        action = options
        options = {}
    }
    if( debug ){
        console.log("Posting object:");
        console.log(options);
    }

    if(hostname) {
        var request_header = {};
        if(options.ignore_user_id!==true&&user_id){
            request_header.userid=user_id;
        }
        if(api_key){
            request_header.apikey = api_key;
        }
        $.ajax({
            url: scheme + "://" + hostname + "/" + command,
            type: 'DELETE',
            contentType: 'application/x-www-form-urlencoded',
            headers:request_header,
            xhrFields:xhrFields,
            beforeSend: function (request) {
                _internalApplyRequestHeaders(request_header,request);
            },
            success: function (data_in) {
                if( data_in ) {
                    action(true,data_in);
                }else{
                    console.error("Successful connection but no data! " + data_in);
                    action(true,data_in);
                }
            },
            error:  genericRecipeCalCalcError(action)
        });
    }else {
        console.error("Missing hostname. Call initRecipeCalCalc and provide hostname.");
    }
}

function PutObject(recipe, command , options, action) {
    if( typeof options === 'function'){
        action = options
        options = {}
    }
    if( debug ){
        console.log("Putting object:");
        console.log(options);
    }

    if(hostname) {
        var request_header = {};
        if(options.ignore_user_id!==true&&user_id){
            request_header.userid=user_id;
        }
        if(api_key){
            request_header.apikey = api_key;
        }
        $.ajax({
            url: scheme + "://" + hostname + "/" + command,
            type: 'PUT',
            contentType: 'application/x-www-form-urlencoded',
            data: JSON.stringify(recipe), //stringify is important
            xhrFields:xhrFields,
            headers:request_header,
            beforeSend: function (request) {
                _internalApplyRequestHeaders(request_header,request);
            },
            success: function (data_in) {
                if( data_in ) {
                    action(true,data_in);
                }else{
                    console.error("Successful connection but no data! " + data_in);
                    action(true,data_in);
                }
            },
            error:  genericRecipeCalCalcError(action)
        });
    }else {
        console.error("Missing hostname. Call initRecipeCalCalc and provide hostname.");
    }
}

function GetObject(command , options, action) {
    if( typeof options === 'function'){
        action = options
        options = {}
    }
    if( debug ){
        console.log("Sending get object:");
        console.log(options);
    }
    var request_header = {};
    if(options.ignore_user_id!==true&&user_id){
        request_header.userid=user_id;
    }
    if(api_key){
        request_header.apikey = api_key;
    }
    if(hostname) {
        $.ajax({
            url: scheme + "://" + hostname + "/" + command,
            type: 'Get',
            contentType: 'application/x-www-form-urlencoded',
            xhrFields:xhrFields,
            headers:request_header,
            beforeSend: function (request) {
                _internalApplyRequestHeaders(request_header,request);
            },
            success: function (data_in) {
                if( data_in ) {
                    action(true,data_in);
                }else{
                    console.error("Successful connection but no data! " + data_in);
                    action(true,data_in);
                }
            },
            error:  genericRecipeCalCalcError(action)
        });
    }else {
        console.error("Missing hostname. Call initRecipeCalCalc and provide hostname.");
    }
}

function recipeCalCalcParseIngredients(ingredients, options, action) {
    if( typeof ingredients === 'string' ) {
        ingredients = [ ingredients ];
    }
    if( typeof options === 'function'){
        action = options;
        options = {};
    }
    if( debug ){
        console.log("Parsing ingredients with options:");
        console.log(options);
    }
    if( Object.prototype.toString.call( ingredients ) === '[object Array]' ) {
        if(hostname) {
            var query_data =  {};
            if(options.limit){
                query_data.limit = options.limit;
            }
            if(options.offset){
                query_data.offset = options.offset;
            }
            var query = jQuery.param(query_data);
            if(query.length>0){
                query = "?" + query;
            }
            var json_ingredients= JSON.stringify(ingredients);
            if( debug ){
                console.log("Sending ingredients:");
                console.log(ingredients);
                console.log(json_ingredients);
            }
            var request_header = {};
            if(options.ignore_user_id!==true&&user_id){
                request_header.userid=user_id;
            }
            if(api_key){
                request_header.apikey = api_key;
            }

            $.ajax({
                url: scheme + "://" + hostname + "/parse/ingredients" + query,
                type: 'POST',
                contentType: 'application/x-www-form-urlencoded',
                data: json_ingredients, //stringify is important
                headers:request_header,
                beforeSend: function (request) {
                    _internalApplyRequestHeaders(request_header,request);
                },
                success: function (recipe_object) {
                    if(debug) console.log(recipe_object);
                    if( recipe_object ) {
                        recipe_object = internalAttachRecipeObjectMethods(recipe_object);
                        recipe_object = _internalApplyParseIngredientOptionsToRecipe(recipe_object,options);
                        currentRecipe = _internalBuildNutritionLabelData(recipe_object, options);
                        action(true, currentRecipe);
                        _internalScanDomForDynamicUIObjects();
                    } else {
                        console.error("Successful connection but no data! " + ingredients_array);
                        action(false, "Unknown error while contacting the server.");
                    }
                    applyCSS();
                },
                error:  genericRecipeCalCalcError(action)
            });
        }else {
            console.error("Missing hostname. Call initRecipeCalCalc and provide hostname.");
        }
    }else{
        action(false,"I need an array of ingredients or single string ingredient line.")
    }
}

function recipeCalCalcParseRecipeUrl(recipe_url, options, action) {
    _internal_recipeCalCalcParseRecipe([ recipe_url ], "via-url", options, action);
}

function recipeCalCalcParseRecipePage(recipe_url, source_code, options, action) {
    _internal_recipeCalCalcParseRecipe({page_source:source_code,url:recipe_url}, "via-page-content", options, action);
}

function recipeCalCalcParseRecipePageBase64(recipe_url, base64_source_code, options, action) {
    _internal_recipeCalCalcParseRecipe({page_source_b:base64_source_code,url:recipe_url, }, "via-page-content", options, action);
}

function _internal_recipeCalCalcParseRecipe(recipe_data, command, options, action) {
    if( typeof options === 'function'){
        action = options;
        options = {};
    }
    if( debug ){
        console.log("Parsing ingredients with options:");
        console.log(options);
    }
    //if( Object.prototype.toString.call( ingredients ) === '[object Array]' ) {
        if(hostname) {
            var request_header = {};
            if(options.ignore_user_id!==true&&user_id){
                request_header.userid=user_id;
            }
            if(api_key){
                request_header.apikey = api_key;
            }
            // Which parser are we to use?
            if(debug){
                console.log("Sending data to : " + scheme + "://" + hostname + "/parse/" + command + "/recipe")
                console.log(recipe_data)
            }
            $.ajax({
                url: scheme + "://" + hostname + "/parse/" + command + "/recipe",
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(recipe_data), //stringify is important
                headers:request_header,
                beforeSend: function (request) {
                    _internalApplyRequestHeaders(request_header,request);
                },
                success: function (recipe_object) {
                    if(debug) console.log(recipe_object);
                    if( recipe_object ) {
                        recipe_object = internalAttachRecipeObjectMethods(recipe_object);
                        recipe_object = _internalApplyParseIngredientOptionsToRecipe(recipe_object,options);
                        currentRecipe = _internalBuildNutritionLabelData(recipe_object, options);
                        action(true,currentRecipe);
                        _internalScanDomForDynamicUIObjects();
                    } else {
                        console.error("Successful connection but no data! " + ingredients_array);
                        action(false, "Unknown error while contacting the server.");
                    }
                    applyCSS();
                },
                error:  genericRecipeCalCalcError(action)
            });
        }else {
            console.error("Missing hostname. Call initRecipeCalCalc and provide hostname.");
        }
    /*}else{
        action(false,"I need an array of ingredients or single string ingredient line.")
    }*/
}

function _internalApplyParseIngredientOptionsToRecipe(recipe_object,options) {
    if( !isNaN(options.portions) && options.portions>0){
        if(debug)console.log("Set portions to [" + options.portions + "]");
        recipe_object.portions = options.portions;
        if(recipe_object.nutrition_per_portion){
            if(debug)console.log("Set nutrition per portion portions to [" + options.portions + "]");
            recipe_object.nutrition_per_portion.portions = options.portions;
            recipe_object.DivideNutritionPerPortion(options.portions);
        }
    }
    return recipe_object;
}

function FetchMyRecipesAPI(options, action) {
    if( typeof options === 'function'){
        action = options
        options = {}
    }
    if( debug ){
        console.log("Fetching my recipes");
        console.log(options);
    }
    var path = "recipe";

    if(hostname) {
        var query_data =  {};
        if(options.limit){
            query_data.limit = options.limit;
        }
        if(options.offset){
            query_data.offset = options.offset;
        }
        var query = jQuery.param(query_data);
        if(query.length>0){
            query = "?" + query;
        }
        var request_header = {};
        if(options.ignore_user_id!==true&&user_id){
            request_header.userid=user_id;
        }
        if(api_key){
            request_header.apikey = api_key;
        }

        $.ajax({
            url: scheme + "://" + hostname + "/" + path  + query,
            type: 'GET',
            headers:request_header,
            beforeSend: function (request) {
                _internalApplyRequestHeaders(request_header,request);
            },
            success: function (data_in) {
                if( data_in ) {
                    data_in.forEach(function(obj){
                        _internalAttachRecipeNutritionObjectMethods(obj);
                        //formatNumbers(obj);
                    });
                    action(true, data_in);
                }else{
                    console.error("Successful connection but no data! " + data_in);
                }
                applyCSS();
            },
            error:  genericRecipeCalCalcError(action)
        });
    }else {
        console.error("Missing hostname. Call initRecipeCalCalc and provide hostname.");
    }
}

function FetchSingleRecipeAPI(recipe_id, options, action) {
    if( typeof options === 'function'){
        action = options
        options = {}
    }
    if( debug ){
        console.log("Fetching 1 recipe [id=" + recipe_id + "]");
        console.log(options);
    }
    if(!(parseInt(recipe_id)>0)){
        console.error("Invalid recipe_id reciped [" + recipe_id+ "]")
        action(false,"Invalid recipe_id reciped [" + recipe_id+ "]")
        return;
    }
    var path = "recipe/" + recipe_id;

    if(hostname) {
        var query_data =  {};
        if(options.limit){
            query_data.limit = options.limit;
        }
        if(options.offset){
            query_data.offset = options.offset;
        }
        var query = jQuery.param(query_data);
        if(query.length>0){
            query = "?" + query;
        }
        var request_header = {};
        if(options.ignore_user_id!==true&&user_id){
            request_header.userid=user_id;
        }
        if(api_key){
            request_header.apikey = api_key;
        }

        $.ajax({
            url: scheme + "://" + hostname + "/" + path  + query,
            type: 'GET',
            headers:request_header,
            beforeSend: function (request) {
                _internalApplyRequestHeaders(request_header,request);
            },
            success: function (data_in) {
                console.log(data_in);
                if( data_in ) {
                    parseRecipeCalCalcResponse();
                    _internalAttachRecipeNutritionObjectMethods(data_in);
                    //formatNumbers(data_in);
                    action(true, data_in);
                }else{
                    console.error("Successful connection but no data! " + data_in);
                }
                applyCSS();
            },
            error:  genericRecipeCalCalcError(action)
        });
    }else {
        console.error("Missing hostname. Call initRecipeCalCalc and provide hostname.");
    }
}

function FetchRecipeSuperObjectAPI(recipe_id, options, action) {
    if( typeof options === 'function'){
        action = options
        options = {}
    }
    if( debug ){
        console.log("Fetching 1 recipe [id=" + recipe_id + "]");
        console.log(options);
    }
    if(!(parseInt(recipe_id)>0)){
        console.error("Invalid recipe_id reciped [" + recipe_id+ "]")
        action(false,"Invalid recipe_id reciped [" + recipe_id+ "]")
        return;
    }
    var path = "super-recipe/" + recipe_id;

    if(hostname) {
        var query_data =  {};
        if(options.limit){
            query_data.limit = options.limit;
        }
        if(options.offset){
            query_data.offset = options.offset;
        }
        var query = jQuery.param(query_data);
        if(query.length>0){
            query = "?" + query;
        }
        var request_header = {};
        if(options.ignore_user_id!==true&&user_id){
            request_header.userid=user_id;
        }
        if(api_key){
            request_header.apikey = api_key;
        }

        $.ajax({
            url: scheme + "://" + hostname + "/" + path  + query,
            type: 'GET',
            headers:request_header,
            beforeSend: function (request) {
                _internalApplyRequestHeaders(request_header,request);
            },
            success: function (recipe_object) {
                if(debug) console.log(recipe_object);
                if( recipe_object ) {
                    recipe_object = internalAttachRecipeObjectMethods(recipe_object);
                    recipe_object = _internalBuildNutritionLabelData(recipe_object);
                    //recipe_object = ConfigureRemoteRecipeForLocalUse(recipe_object, options);
                    action(true, recipe_object);
                    _internalScanDomForDynamicUIObjects();
                    applyCSS();
                }else{
                    console.error("Successful connection but no data! " + recipe_object);
                }
            },
            error:  genericRecipeCalCalcError(action)
        });
    }else {
        console.error("Missing hostname. Call initRecipeCalCalc and provide hostname.");
    }
}

function refreshIngredients(options,action) {
    console.log(currentRecipe);
    currentRecipe = _internalApplyParseIngredientOptionsToRecipe(currentRecipe,options);
    action( currentRecipe, false );
    _internalScanDomForDynamicUIObjects();
}


function _internalGetAllNutritionColumnNames(){
    return ["calories", "amount", "total_fat", "total_sugar", "protein", "water", "ash", "carbs", "fiber_td", "calcium", "iron", "magnesium", "phosphorus", "potassium", "sodium", "zinc", "copper", "manganese", "selenium", "vit_c", "vit_b1", "vit_b2", "vit_b3", "vit_b5", "vit_b6", "folate_tot", "folic_acid", "food_folate", "folate_dfe", "choline_tot", "vit_b12", "vit_a_iu", "vit_a_rae", "retinol", "alpha_carot", "beta_carot", "beta_crypt", "lycopene", "lut_zea", "vit_e", "vit_d_mcg", "vit_d_iu", "vit_k", "sat_fat", "mono_fat", "poly_fat", "cholestrl"];
}

var _internal_keyup_timer = null;
function _internalThrottleKeyUps(f, delay){
    return function(){
        var context = this, args = arguments;
        clearTimeout(_internal_keyup_timer);
        _internal_keyup_timer = window.setTimeout(function(){
                f.apply(context, args);
            },
            delay || 500);
    };
}

function internalAttachRecipeObjectMethods(recipe){
    if(recipe.recipe_id===undefined){
        console.error("internalAttachRecipeObjectMethods is expecting a recipe object");
        console.error(recipe);
    }

    recipe.RecipeID = function(){ return recipe.recipe_id; }
    recipe.Added = function(){ return recipe.added; }
    recipe.Oid = function(){ return recipe.oid; }
    recipe.Owner_id = function(){ return recipe.owner_id; }
    recipe.Name = function(){ return recipe.name; }
    recipe.Ingredients = function(){ return recipe.ingredients; }
    recipe.Num_ingredients = function(){ return recipe.num_ingredients; }
    recipe.Url = function(){ return recipe.url; }
    recipe.Image_url = function(){ return recipe.image_url; }
    recipe.Cook_time = function(){ return recipe.cook_time; }
    recipe.Prep_time = function(){ return recipe.prep_time; }
    recipe.Creator = function(){ return recipe.creator; }
    recipe.Source = function(){ return recipe.source; }
    recipe.Info = function(){ return recipe.info; }
    recipe.Instructions = function(){ return recipe.instructions; }
    recipe.RecipeYield = function(){ return recipe.recipe_yield; }
    recipe.Portions = function(){ return recipe.portions; }
    recipe.Category = function(){ return recipe.category; }
    recipe.Parsed = function(){ return recipe.parsed; }
    recipe.Public = function(){ return recipe.public; }
    recipe.Scratch = function(){ return recipe.scratch; }
    recipe.DivideNutritionPerPortion = function(divide){
        if(typeof recipe.original_nutrition_per_portion === "undefined" ) {
            console.error("Reseting recipe.original_nutrition_per_portion");
            var copy = {};
            Object.keys(recipe.nutrition_per_portion).forEach(function (column_name) {
                copy[column_name] = recipe.nutrition_per_portion[column_name];
            });
            recipe.original_nutrition_per_portion = copy;
        }

        _internalGetAllNutritionColumnNames().forEach(function(column_name){
            if( typeof recipe.original_nutrition_per_portion[column_name] !== "undefined")
                recipe.nutrition_per_portion[column_name] = recipe.original_nutrition_per_portion[column_name] / divide;
        });
    };
    recipe.NutritionSortBy = function(vitamin_key){
        return recipe.nutrition.sort(function(a, b) {
            return parseFloat(b[vitamin_key]) - parseFloat(a[vitamin_key]);
        });
    }

    if( recipe.total_portions) {
        recipe.TotalPortions = function () {
            return recipe.total_portions;
        }
        recipe.FoodWeight = function () {
            return recipe.food_weight;
        }
        recipe.Water = function () {
            recipe.water;
        }
        recipe.Calories = function () {
            recipe.calories;
        }
        recipe.Protein = function () {
            recipe.protein;
        }
        recipe.TotalFat = function () {
            recipe.total_fat;
        }
        recipe.Ash = function () {
            recipe.ash;
        }
        recipe.Carbs = function () {
            recipe.carbs;
        }
        recipe.FiberTotalDietry = function () {
            recipe.fiber_td;
        }
        recipe.TotalSugar = function () {
            recipe.total_sugar;
        }
        recipe.Calcium = function () {
            recipe.calcium;
        }
        recipe.Iron = function () {
            recipe.iron;
        }
        recipe.Magnesium = function () {
            recipe.magnesium;
        }
        recipe.Phosphorus = function () {
            recipe.phosphorus;
        }
        recipe.Potassium = function () {
            recipe.potassium;
        }
        recipe.Sodium = function () {
            recipe.sodium;
        }
        recipe.Zinc = function () {
            recipe.zinc;
        }
        recipe.Copper = function () {
            recipe.copper;
        }
        recipe.Manganese = function () {
            recipe.manganese;
        }
        recipe.Selenium = function () {
            recipe.selenium;
        }
        recipe.VitaminC = function () {
            recipe.vit_c;
        }
        recipe.Thiamin = function () {
            recipe.vit_b1;
        }
        recipe.Riboflavin = function () {
            recipe.vit_b2;
        }
        recipe.Niacin = function () {
            recipe.vit_b3;
        }
        recipe.Panto_acid = function () {
            recipe.vit_b5;
        }
        recipe.VitaminB6 = function () {
            recipe.vit_b6;
        }
        recipe.Folate_tot = function () {
            recipe.folate_tot;
        }
        recipe.Folic_acid = function () {
            recipe.folic_acid;
        }
        recipe.Food_folate = function () {
            recipe.food_folate;
        }
        recipe.Folate_dfe = function () {
            recipe.folate_dfe;
        }
        recipe.Choline_tot = function () {
            recipe.choline_tot;
        }
        recipe.VitaminB12 = function () {
            recipe.vit_b12;
        }
        recipe.VitaminA_iu = function () {
            recipe.vit_a_iu;
        }
        recipe.VitaminA_rae = function () {
            recipe.vit_a_rae;
        }
        recipe.Retinol = function () {
            recipe.retinol;
        }
        recipe.Alpha_carot = function () {
            recipe.alpha_carot;
        }
        recipe.Beta_carot = function () {
            recipe.beta_carot;
        }
        recipe.Beta_crypt = function () {
            recipe.beta_crypt;
        }
        recipe.Lycopene = function () {
            recipe.lycopene;
        }
        recipe.Lut_zea = function () {
            recipe.lut_zea;
        }
        recipe.VitaminE = function () {
            recipe.vit_e;
        }
        recipe.VitaminD_mcg = function () {
            recipe.vit_d_mcg;
        }
        recipe.VitaminD_iu = function () {
            recipe.vit_d_iu;
        }
        recipe.VitaminK = function () {
            recipe.vit_k;
        }
        recipe.SaturatedFat = function () {
            recipe.sat_fat;
        }
        recipe.MonoFat = function () {
            recipe.mono_fat;
        }
        recipe.PolyFat = function () {
            recipe.poly_fat;
        }
        recipe.Cholestral = function () {
            recipe.cholestrl;
        }
        recipe.Bioton = function () {
            recipe.bioton;
        }
        recipe.Chloride = function () {
            recipe.chloride;
        }
        recipe.Chromium = function () {
            recipe.chromium;
        }
        recipe.Choline = function () {
            recipe.choline;
        }
        recipe.Fluoride = function () {
            recipe.fluoride;
        }
        recipe.Iodine = function () {
            recipe.iodine;
        }
        recipe.Molybdenum = function () {
            recipe.molybdenum;
        }
    }
    if (recipe.carbs_unit){
        recipe.WaterUnit = function () {
            recipe.water_unit;
        }
        recipe.CaloriesUnit = function () {
            recipe.calories_unit;
        }
        recipe.ProteinUnit = function () {
            recipe.protein_unit;
        }
        recipe.TotalFatUnit = function () {
            recipe.total_fat_unit;
        }
        recipe.AshUnit = function () {
            recipe.ash_unit;
        }
        recipe.CarbsUnit = function () {
            recipe.carbs_unit;
        }
        recipe.FiberTotalDietryUnit = function () {
            recipe.fiber_td_unit;
        }
        recipe.TotalSugarUnit = function () {
            recipe.total_sugar_unit;
        }
        recipe.CalciumUnit = function () {
            recipe.calcium_unit;
        }
        recipe.IronUnit = function () {
            recipe.iron_unit;
        }
        recipe.MagnesiumUnit = function () {
            recipe.magnesium_unit;
        }
        recipe.PhosphorusUnit = function () {
            recipe.phosphorus_unit;
        }
        recipe.PotassiumUnit = function () {
            recipe.potassium_unit;
        }
        recipe.SodiumUnit = function () {
            recipe.sodium_unit;
        }
        recipe.ZincUnit = function () {
            recipe.zinc_unit;
        }
        recipe.CopperUnit = function () {
            recipe.copper_unit;
        }
        recipe.ManganeseUnit = function () {
            recipe.manganese_unit;
        }
        recipe.SeleniumUnit = function () {
            recipe.selenium_unit;
        }
        recipe.VitaminCUnit = function () {
            recipe.vit_c_unit;
        }
        recipe.ThiaminUnit = function () {
            recipe.vit_b1_unit;
        }
        recipe.RiboflavinUnit = function () {
            recipe.vit_b2_unit;
        }
        recipe.NiacinUnit = function () {
            recipe.vit_b3_unit;
        }
        recipe.Panto_acidUnit = function () {
            recipe.vit_b5_unit;
        }
        recipe.VitaminB6Unit = function () {
            recipe.vit_b6_unit;
        }
        recipe.Folate_totUnit = function () {
            recipe.folate_tot_unit;
        }
        recipe.Folic_acidUnit = function () {
            recipe.folic_acid_unit;
        }
        recipe.Food_folateUnit = function () {
            recipe.food_folate_unit;
        }
        recipe.Folate_dfeUnit = function () {
            recipe.folate_dfe_unit;
        }
        recipe.Choline_totUnit = function () {
            recipe.choline_tot_unit;
        }
        recipe.VitaminB12Unit = function () {
            recipe.vit_b12_unit;
        }
        recipe.VitaminA_iuUnit = function () {
            recipe.vit_a_iu_unit;
        }
        recipe.VitaminA_raeUnit = function () {
            recipe.vit_a_rae_unit;
        }
        recipe.RetinolUnit = function () {
            recipe.retinol_unit;
        }
        recipe.Alpha_carotUnit = function () {
            recipe.alpha_carot_unit;
        }
        recipe.Beta_carotUnit = function () {
            recipe.beta_carot_unit;
        }
        recipe.Beta_cryptUnit = function () {
            recipe.beta_crypt_unit;
        }
        recipe.LycopeneUnit = function () {
            recipe.lycopene_unit;
        }
        recipe.Lut_zeaUnit = function () {
            recipe.lut_zea_unit;
        }
        recipe.VitaminEUnit = function () {
            recipe.vit_e_unit;
        }
        recipe.VitaminD_mcgUnit = function () {
            recipe.vit_d_mcg_unit;
        }
        recipe.VitaminD_iuUnit = function () {
            recipe.vit_d_iu_unit;
        }
        recipe.VitaminKUnit = function () {
            recipe.vit_k_unit;
        }
        recipe.SaturatedFatUnit = function () {
            recipe.sat_fat_unit;
        }
        recipe.MonoFatUnit = function () {
            recipe.mono_fat_unit;
        }
        recipe.PolyFatUnit = function () {
            recipe.poly_fat_unit;
        }
        recipe.CholestralUnit = function () {
            recipe.cholestrl_unit;
        }
        recipe.BiotonUnit = function () {
            recipe.bioton_unit;
        }
        recipe.ChlorideUnit = function () {
            recipe.chloride_unit;
        }
        recipe.ChromiumUnit = function () {
            recipe.chromium_unit;
        }
        recipe.CholineUnit = function () {
            recipe.choline_unit;
        }
        recipe.FluorideUnit = function () {
            recipe.fluoride_unit;
        }
        recipe.IodineUnit = function () {
            recipe.iodine_unit;
        }
        recipe.MolybdenumUnit = function () {
            recipe.molybdenum_unit;
        }
    }

    recipe.Ingredients = function(){return recipe.nutrition;}
    recipe.NumIngredients = function(){return recipe.nutrition.length;}
    recipe.Ingredient = function(row){return recipe.nutrition[row];}
    recipe.NutritionLabel = function(){return recipe.nutritionLabel;}
    recipe.TallyIngredientNutrition = function(column){
        var total = 0;
        var index = 0;
        recipe.nutrition.forEach(function(ingredient){
            if ( recipe.tempIngredientsStorage[index]!==undefined){
                total += recipe.tempIngredientsStorage[index][column];
            }else {
                total += parseFloat(ingredient[column]);
            }
        });
        return total;
    };
    recipe.tempIngredientsStorage={};
    recipe.TempSwapIngredient = function(seq,ingredient){
        if(ingredient['calories']===undefined){
            console.error("Not an ingredient");
        }
        recipe.tempIngredientsStorage[seq]=ingredient;
    };
    recipe.SwapIngredient = function(seq,ingredient){
        if(ingredient['calories']===undefined){
            console.error("Not an ingredient");
        }
        recipe.tempIngredientsStorage[seq]=ingredient;
    };

    if(recipe.recipe_nutrition_abbrev_id!==undefined){
        _internalAttachFoodNutritionObjectMethods(recipe);
    }
    return recipe;
}

function _internalAttachFoodNutritionObjectMethods(nutrition_object){
    if(nutrition_object.recipe_nutrition_abbrev_id===undefined){
        console.error("_internalAttachFoodNutritionObjectMethods is expecting a recipe nutrition object");
        console.error(nutrition_object);
    }
    nutrition_object.RecipeID = function(){ return nutrition_object["recipe_id"] };
    nutrition_object.FoodID = function(){ return nutrition_object["nut_food_id"] };
    nutrition_object.Name = function(){ return nutrition_object["name"] };
    nutrition_object.IngredientLine = function(){ return nutrition_object["ingredient_line"] };
    nutrition_object.Multiple = function(){ return nutrition_object["multiple"] };
    return _internalAttachNutritionObjectMethods(nutrition_object);
}

function _internalAttachRecipeNutritionObjectMethods(nutrition_object){
    if(nutrition_object.nutrition_per_portion===undefined){
        console.error("attachRecipeNutrition is expecting a recipe nutrition object");
        return nutrition_object;
    }else {
        nutrition_object.nutrition_per_portion.RecipeNutritionAbbrevID = function () {
            return nutrition_object.nutrition_per_portion["recipe_nutrition_abbrev_id"]
        };
        nutrition_object.nutrition_per_portion.NutritionSortBy = function (vitamin_key) {
            return nutrition_object.nutrition.sort(function (a, b) {
                return parseFloat(a[vitamin_key]) - parseFloat(b[vitamin_key]);
            });
        }
        nutrition_object.nutrition_per_portion = _internalAttachNutritionObjectMethods(nutrition_object.nutrition_per_portion);
        return nutrition_object;
    }
}

function _internalAttachPossibleRecipeResultObjectMethods(nutrition_object){
    if(nutrition_object.num_missing_ingredients===undefined){
        console.error("attachRecipeNutrition is expecting a possible recipe object");
        console.error(nutrition_object);
    }
    nutrition_object.NumberOfMissingIngredients = function(){ return nutrition_object["num_missing_ingredients"] };
    nutrition_object.NumberOfMatchingIngredients = function(){ return nutrition_object["num_matching_ingredients"] };
    return nutrition_object;
}

function _internalAttachNutritionObjectMethods(nutrition_object){
    nutrition_object.Calories = function(){ return nutrition_object["calories"].toFixed(0); };
    nutrition_object.Amount = function(){ return nutrition_object["amount"] !== undefined ? nutrition_object["amount"].toFixed(1) : nutrition_object["food_weight"].toFixed(1); };
    nutrition_object.TotalFat = function(){ return nutrition_object["total_fat"].toFixed(1); };
    nutrition_object.TotalSugar = function(){ return nutrition_object["total_sugar"].toFixed(1); };
    nutrition_object.Protein = function(){ return nutrition_object["protein"].toFixed(1); };
    nutrition_object.Water = function(){ return nutrition_object["water"].toFixed(1); };
    nutrition_object.Ash = function(){ return nutrition_object["ash"].toFixed(3); };
    nutrition_object.Carbs = function(){ return nutrition_object["carbs"].toFixed(1) };
    nutrition_object.Fiber_td = function(){ return nutrition_object["fiber_td"] };
    nutrition_object.Calcium = function(){ return nutrition_object["calcium"].toFixed(3) };
    nutrition_object.Iron = function(){ return nutrition_object["iron"].toFixed(3) };
    nutrition_object.Magnesium = function(){ return nutrition_object["magnesium"].toFixed(3) };
    nutrition_object.Phosphorus = function(){ return nutrition_object["phosphorus"].toFixed(3) };
    nutrition_object.Potassium = function(){ return nutrition_object["potassium"].toFixed(3) };
    nutrition_object.Sodium = function(){ return nutrition_object["sodium"].toFixed(3) };
    nutrition_object.Zinc = function(){ return nutrition_object["zinc"].toFixed(3) };
    nutrition_object.Copper = function(){ return nutrition_object["copper"].toFixed(3) };
    nutrition_object.Manganese = function(){ return nutrition_object["manganese"].toFixed(3) };
    nutrition_object.Selenium = function(){ return nutrition_object["selenium"].toFixed(3) };
    nutrition_object.VitaminC = function(){ return nutrition_object["vit_c"].toFixed(3) };
    nutrition_object.VitaminB1 = function(){ return nutrition_object["vit_b1"].toFixed(3) };
    nutrition_object.VitaminB2 = function(){ return nutrition_object["vit_b2"].toFixed(3) };
    nutrition_object.VitaminB3 = function(){ return nutrition_object["vit_b3"].toFixed(3) };
    nutrition_object.VitaminB5 = function(){ return nutrition_object["vit_b5"].toFixed(3) };
    nutrition_object.VitaminB6 = function(){ return nutrition_object["vit_b6"].toFixed(3) };
    nutrition_object.FolateTotal = function(){ return nutrition_object["folate_tot"].toFixed(3) };
    nutrition_object.FolicAcid = function(){ return nutrition_object["folic_acid"].toFixed(3) };
    nutrition_object.FoodFolate = function(){ return nutrition_object["food_folate"].toFixed(3) };
    nutrition_object.Folate_dfe = function(){ return nutrition_object["folate_dfe"].toFixed(3) };
    nutrition_object.CholineTotal = function(){ return nutrition_object["choline_tot"].toFixed(3) };
    nutrition_object.VitaminB12 = function(){ return nutrition_object["vit_b12"].toFixed(3) };
    nutrition_object.VitaminA_iu = function(){ return nutrition_object["vit_a_iu"].toFixed(3) };
    nutrition_object.VitaminA_rae = function(){ return nutrition_object["vit_a_rae"].toFixed(3) };
    nutrition_object.Retinol = function(){ return nutrition_object["retinol"].toFixed(3) };
    nutrition_object.AlphaCarot = function(){ return nutrition_object["alpha_carot"].toFixed(3) };
    nutrition_object.BetaCarot = function(){ return nutrition_object["beta_carot"].toFixed(3) };
    nutrition_object.BetaCrypt = function(){ return nutrition_object["beta_crypt"].toFixed(3) };
    nutrition_object.Lycopene = function(){ return nutrition_object["lycopene"].toFixed(3) };
    nutrition_object.LutZea = function(){ return nutrition_object["lut_zea"].toFixed(3) };
    nutrition_object.VitaminE = function(){ return nutrition_object["vit_e"].toFixed(3) };
    nutrition_object.VitaminD_mcg = function(){ return nutrition_object["vit_d_mcg"].toFixed(3) };
    nutrition_object.VitaminD_iu = function(){ return nutrition_object["vit_d_iu"].toFixed(3) };
    nutrition_object.VitaminK = function(){ return nutrition_object["vit_k"].toFixed(3) };
    nutrition_object.SaturatedFat = function(){ return nutrition_object["sat_fat"].toFixed(3) };
    nutrition_object.MonosaturatedFat = function(){ return nutrition_object["mono_fat"].toFixed(3) };
    nutrition_object.PolyunsaturatedFat = function(){ return nutrition_object["poly_fat"].toFixed(3) };
    nutrition_object.Cholesterol = function(){ return nutrition_object["cholestrl"].toFixed(3) };
    nutrition_object.SetAmount = function(new_amount){_adjustNutritionAmount(new_amount,nutrition_object);}
    if(nutrition_object["food_weight"]!==undefined){// This isn't an ingredient, it's food. So, prep it as an ingredient
        nutrition_object['amount'] = nutrition_object['food_weight'];
    }
    return nutrition_object;
}

function _adjustNutritionAmount(new_amount, nutrition_object){
    if(nutrition_object["amount"]=== undefined){
        console.error("The nutrition object is missing an amount field.")
        console.error(nutrition_object)
        return;
    } else if(new_amount<=0){
        console.error("Illegal amount value")
        return;
    }
    var ratio = new_amount/ nutrition_object['amount'];
    nutrition_object['amount'] = new_amount;
    _internalGetAllNutritionColumnNames().forEach(function(column_name){
        if( nutrition_object[column_name]!== undefined && typeof nutrition_object[column_name] === "number" && !isNaN(nutrition_object[column_name]) && column_name!="amount"  ){
            nutrition_object[column_name]*=ratio;
        }
    });
    if(nutrition_object['food_weight']){
        nutrition_object['food_weight'] = new_amount;
    }
}
/*var ConfigureRemoteRecipeForLocalUse = function (recipe_object, options) {
    var local_recipe = parseRecipeCalCalcResponse(recipe_object,options);
    //local_recipe = _internalRefreshRecipeOptions(local_recipe,options);
    //formatNumbers(local_recipe);
    //console.log(local_recipe);
    if(recipe_object.nutrition){
        recipe_object.nutrition.forEach(function(e){
            //e=formatNumbers(e);
            console.log(e);
        })
    }
    return local_recipe;
}*/

var _internalBuildNutritionLabelData = function (recipe_object, options) {
    if(!recipe_object){
        console.error("I can't refresh the missing recipe object");
        return;
    }
    if(!options){
        options={};
    }
    /*if( options.portions ){
        if ( recipe_object.total_nutrition ){
            recipe_object.portions = options.portions;
            if(!isNaN(parseInt(options.portions, 10))) {
                var perPortion = {};
                _internalGetAllNutritionColumnNames().forEach(function(column_name){
                    if(recipe_object.total_nutrition[column_name])
                        perPortion[column_name] = recipe_object.total_nutrition[column_name] / options.portions;
                });
                recipe_object.perPortion = perPortion;
            }else{
                console.error("Ignoring portions [" + options.portions + "] as it's not numeric");
            }
        }else{
            if( debug ) console.warn("Portions were provided but no total nutrition object was found.");
        }
    }else{
        if( debug ) console.warn("No portions");
    }*/

    var nutritionLabel = options.nutritionLabel ? options.nutritionLabel : {};
    if(nutritionLabel){
        // Check that the response object has everything needed to proceed:
        if(!recipe_object.nutrition_per_portion){
            console.error("Refusing to process nutritionLabel due to missing nutrition_per_portion field in recipe response.")
            return recipe_object;
        }
    }
    if(options.recipeName){
        if( nutritionLabel ){
            nutritionLabel.itemName = options.recipeName;
        }
    }
    if(nutritionLabel)
    {
        nutritionLabel['ingredientList'] = recipe_object.ingredientsList;
        nutritionLabel.showCalories = true;
        nutritionLabel.showFatCalories = true;
        nutritionLabel.showTotalFat = true;
        nutritionLabel.showSatFat = true;
        nutritionLabel.showTransFat = true;
        nutritionLabel.showPolyFat = true;
        nutritionLabel.showMonoFat = true;
        nutritionLabel.showCholesterol = true;
        nutritionLabel.showSodium = true;
        nutritionLabel.showTotalCarb = true;
        nutritionLabel.showFibers = true;
        nutritionLabel.showSugars = true;
        nutritionLabel.showProteins = true;
        nutritionLabel.showVitaminA = true;
        nutritionLabel.showVitaminC = true;
        nutritionLabel.showCalcium = true;
        nutritionLabel.showIron = true;

        //'itemName'
        /*'showItemName' : false,
        'showServingsPerContainer' : true,
        'ingredientList' : 'Enriched Bleached Wheat Flour (Bleached Flour, Malted Barley Flour, Niacin, Iron, Thiamin Mononitrate, Riboflavin, Folic Acid), Sugar, Vegetable Oil (contains one or more of the following oils: Cottonseed Oil, Palm Oil, Soybean Oil), Water, Hydrogenated Vegetable Oil (Palm Kernel Oil, Palm Oil), High Fructose Corn Syrup, Cocoa Powder (Processed With Alkali), contains 2% or less of the following: Eggs, Nonfat Milk, Glycerin, Soy Flour, Corn Syrup Solids, Leavening (Sodium Acid Pyrophosphate, Baking Soda, Sodium Aluminum Phosphate), Preservatives (Potassium Sorbate, Sodium Propionate, Calcium Propionate), Salt, Distilled Monoglycerides, Dextrose, Food Starch-Modified (Corn and/or Wheat), Soy, Lecithin, Natural and Artificial Flavor, Mono- and Diglycerides, Spices, Tapioca Starch, Wheat Starch, Cellulose Gum, Guar Gum, Karaya Gum, colored with Extracts of Annatto and Turmeric, Artificial Color.',

        'showPolyFat' : false,
        'showMonoFat' : false,
        'showTransFat' : false,
        'showFibers' : false,
        'showVitaminA' : false,
        'showVitaminC' : false,
        'showCalcium' : false,
        'showIron' : false,
        'valueServingUnitQuantity' : 2.3,
        'valueServingSize' : 6,
        'valueServingSizeUnit' : 'DONUTS',*/

        var portion_amount = recipe_object.nutrition_per_portion;
        nutritionLabel['valueCalories'] = portion_amount["calories"];
        nutritionLabel['valueFatCalories'] = portion_amount[""];
        nutritionLabel['valueTotalFat'] = portion_amount["total_fat"];
        nutritionLabel['valueSatFat'] = portion_amount["sat_fat"];
        nutritionLabel['valuePolyFat'] = portion_amount["poly_fat"];
        nutritionLabel['valueMonoFat'] = portion_amount["mono_fat"];
        nutritionLabel['valueCholesterol'] = portion_amount["cholestrl"];
        nutritionLabel['valueSodium'] = portion_amount["sodium"];
        nutritionLabel['valueTotalCarb'] = portion_amount["carbs"];
        nutritionLabel['valueSugars'] = portion_amount["total_sugar"];
        nutritionLabel['valueProteins'] = portion_amount["protein"];
        nutritionLabel['valueVitaminA'] = portion_amount["vit_a_rae"];
        nutritionLabel['valueVitaminC'] = portion_amount["vit_c"];
        nutritionLabel['valueCalcium'] = portion_amount["calcium"];
        nutritionLabel['valueIron'] = portion_amount["iron"];
        nutritionLabel['valueFibers'] = portion_amount["fiber_td"];
        nutritionLabel['valueAlphaCarot'] = portion_amount['alpha_carot'];
        nutritionLabel['valueBetaCarot'] = portion_amount['beta_carot'];
        nutritionLabel['valueBetaCrypt'] = portion_amount['beta_crypt'];
        nutritionLabel['valueCalcium'] = portion_amount['calcium'];
        nutritionLabel['valueCholine'] = portion_amount['choline_tot'];
        nutritionLabel['valueCopper'] = portion_amount['copper'];
        nutritionLabel['valueFiber'] = portion_amount['fiber_td'];
        nutritionLabel['valueFolate'] = portion_amount['folate_tot'];
        nutritionLabel['valueFolicAcid'] = portion_amount['folic_acid'];
        nutritionLabel['valueLycopene'] = portion_amount['lycopene'];
        nutritionLabel['valueMagnesium'] = portion_amount['magnesium'];
        nutritionLabel['valueManganese'] = portion_amount['manganese'];
        nutritionLabel['valuePhosphorus'] = portion_amount['phosphorus'];
        nutritionLabel['valuePotassium'] = portion_amount['potassium'];
        nutritionLabel['valueRetinol'] = portion_amount['retinol'];
        nutritionLabel['valueSelenium'] = portion_amount['selenium'];
        nutritionLabel['valueVitaminB1'] = portion_amount['vit_b1'];
        nutritionLabel['valueVitaminB2'] = portion_amount['vit_b2'];
        nutritionLabel['valueVitaminB3'] = portion_amount['vit_b3'];
        nutritionLabel['valueVitaminB5'] = portion_amount['vit_b5'];
        nutritionLabel['valueVitaminB6'] = portion_amount['vit_b6'];
        nutritionLabel['valueVitaminB12'] = portion_amount['vit_b12'];
        nutritionLabel['valueVitaminD'] = portion_amount['vit_d_mcg'];
        nutritionLabel['valueVitaminE'] = portion_amount['vit_e'];
        nutritionLabel['valueVitaminK'] = portion_amount['vit_k'];
        nutritionLabel['valueZinc'] = portion_amount['zinc'];
        recipe_object.nutritionLabel = nutritionLabel;
    }

    return recipe_object;
}

//var parseRecipeCalCalcResponse = function (ingredients_array, options, action ) {
var parseRecipeCalCalcResponse = function (recipe, options ) {
    if (debug) {
        console.log("Received a response and parsing changes...");
        console.log(recipe);
    }

    var ingredients_array = recipe.nutrition; // The nutrition field is a remote server parsed field.
    var total = {};
    _internalGetAllNutritionColumnNames().forEach(function (column_name) {
        total[column_name] = 0;
    });

    var ingredients = [];
    var ingredients_list = "";
    ingredients_array.forEach(function (ing) {
        if (ingredients_list.length > 0) {
            ingredients_list += ", ";
        }
        ingredients_list += ing.common_name;
        _internalGetAllNutritionColumnNames().forEach(function (column_name) {
            total[column_name] += parseFloat(ing[column_name]);
        });

        //ing = formatNumbers(ing);
        ing.seq = ingredients.length;

        //
        // Watch for headers or useless ingredient rows
        if (ing.common_name == "" && ing.food_id == 0) {
            ing.header = "true";
        }
        ingredients.push(ing);
    });

    recipe.ingredientsList = ingredients_list;
    //recipe.total_nutrition = total;
    //recipe.ingMap = ingredients;
    //if(recipe.recipe_id) {
        recipe = internalAttachRecipeObjectMethods(recipe);
    //}

    if (debug) {
        console.log("Recipe");
        console.log("Calories: " + recipe.nutrition_per_portion['calories']);
        console.log(recipe);
    }

    return recipe;
}

var _internal_parseRecipeCalCalcPossibleRecipesResponse = function (recipes, options, action ) {
    if (typeof action === 'function') {
        //ga('set', 'ingredients_parsed', 'len_' + ingredients.length);
        if(debug) {
            console.log("Received a response and parsing changes...");
            console.log(recipes);
        }
        var total = {};
        if(recipes.rows){
            recipes.rows.forEach(function(recipe){
                internalAttachRecipeObjectMethods(recipe);
                _internalAttachPossibleRecipeResultObjectMethods(recipe);
                _internalAttachRecipeNutritionObjectMethods(recipe);
                formatNumbers(recipe);
            });
        }
        action( recipes , false );
    }else{
        console.error("RecipeCalCalc: parseRecipeCalCalcResponse 3rd param should be a function");
    }
};

function formatNumbers(object){
    if(object["calories"]!== undefined && typeof object["calories"] === "number" && !isNaN(object["calories"]) ) {object["calories"] = object["calories"].toFixed(0)};
    if(object["amount"]!== undefined && typeof object["amount"] === "number" && !isNaN(object["amount"]) ) {object["amount"] = object["amount"].toFixed(1)};
    if(object["total_fat"]!== undefined && typeof object["total_fat"] === "number" && !isNaN(object["total_fat"]) ) {object["total_fat"] = object["total_fat"].toFixed(1)};
    if(object["carbs"]!== undefined && typeof object["carbs"] === "number" && !isNaN(object["carbs"]) ) {object["carbs"] = object["carbs"].toFixed(1)};
    if(object["total_sugar"]!== undefined && typeof object["total_sugar"] === "number" && !isNaN(object["total_sugar"])) {object["total_sugar"] = object["total_sugar"].toFixed(1)};
    if(object["protein"]!== undefined && typeof object["protein"] === "number" && !isNaN(object["protein"])) {object["protein"] = object["protein"].toFixed(1)};
    _internalGetAllNutritionColumnNames().forEach(function(column_name){
        if(typeof object[column_name] === "number" && !isNaN(object[column_name])) {
            if(object[column_name]!==undefined){object[column_name] = object[column_name].toFixed(3);}
        }
    });
    return object;
}

function uniqId() {
    return Math.round(new Date().getTime() + (Math.random() * 100));
}
function _parseNumber( s){
    var f = parseFloat(s);
    return isNaN(f)?0.0:f;
}

function applyPercentage() {
}
function applyCSS() {
    $("[class=\"rda\"]").each(function () {
        if($(this).attr("done")===undefined) {
            $(this).attr("done", 1);
            var per = $(this).text().length > 0 ? _parseNumber($(this).text()) : 0;
            if (per > 0) {
                per*=100;
                $(this).text(per.toFixed(1) + "%");
            } else {
                $(this).text("");
            }
        }
    });

    /*MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

    var observer = new MutationObserver(function(mutations, observer) {
        // fired when a mutation occurs
        console.log(mutations, observer);
        // ...
    });
    observer.observe(document, {
        subtree: true,
        attributes: false
    });*/
    $("[class=\"calorie-number\"]").each(function () {
        $(this).text(_parseNumber($(this).text()).toFixed(0));
    });
    $("[class=\"macro-nutrient-number\"]").each(function () {
        var unit = $(this).attr("unit");
        if( unit == undefined ) unit="";
        $(this).text(_parseNumber($(this).text()).toFixed(1)+unit);
    });
    $("[class=\"nutrient-number\"]").each(function () {
        var unit = $(this).attr("unit");
        if( unit == undefined ) unit="";
        $(this).text(_parseNumber($(this).text()).toFixed(3)+unit);
    });
}

function _internalScanDomForDynamicUIObjects(){
    var count = 0;
    //
    // Now cycle the dom and see if there's any actions to be applied
    $("*[changeable_food]").each(function() {
        count++;
        var id = $(this).attr("id");
        var seq = $(this).attr("seq");
        if(seq===undefined){
            console.error("A changeable_food node requires the 'seq' attribute to be set.")
        }

        var food_id = $(this).attr("food_id");
        if(food_id===undefined){
            console.error("A 'changeable_food' node requires the 'food_id' attribute to be set.")
        }
        var grams = $(this).attr("grams");
        if(grams===undefined){
            console.error("A changeable_food node requires the 'grams' attribute to be set.")
        }
        watchAlternativeFoodForClicks(seq,$(this));

        applyCSS();

    });
    if(debug && count == 0){
        console.warn("No span[changeable_food]'s found so no click events were attached to the outputted foods.")
    }
}

function watchAlternativeFoodForChanges(seq, food_id){
    $("#img_alternative_for_"+seq).click(function(){
        $("#name_"+seq).html(original_alternatives[seq]);
        original_alternatives[seq]=undefined;
    });
    $("#alternative_for_"+food_id).change(function(){
        var text = $("#alternative_for_" + food_id + " option:selected").html();
        var new_food_id = $(this).val();
        var grams = $("#name_" + seq ).attr("grams");
        $( "#name_" + seq ).attr( "food_id", new_food_id); //TODO Cycle through all of the changeable_foods and change the food id
        $( "#name_" + seq ).html( "<span>" + text + "</span>" );

        fetchFoodNutritionObject(new_food_id,grams,{},function(nutrition_object){
            if(debug){
                console.log("Changing food at seq: " + seq);
                console.log(nutrition_object);
            }
            if( Object.keys(nutrition_object).length > 0 ){
                $( "#calories_for_" + seq ).html(nutrition_object.Calories());
                $( "#total_fat_for_" + seq ).html(nutrition_object.TotalFat());
                $( "#total_sugar_for_" + seq ).html(nutrition_object.TotalSugar());
                $( "#protein_for_" + seq ).html(nutrition_object.Protein());
            }
        });
    });
}

var original_alternatives = {};

function watchAlternativeFoodForClicks(seq, food_box){
    food_box.dblclick(function(){

        if(debug)console.log("Received click");

        var food_id = $(this).attr("food_id");
        if( food_id == undefined){
            console.error("Ignoring click on [" + food_box + "] due to missing 'food_id' attribute.")
            return;
        }
        var grams = $(this).attr("grams");
        if( grams == undefined){
            console.error("Ignoring click on [" + food_box + "] due to missing 'grams' attribute.")
            return;
        }

        fetchAlternativeFoodsAndNutrients(food_id,grams ,{} , function(map){
            alternativeFoods[food_id] = map;
            if(debug)console.log(map);

            if( map.length > 1 ) {
                var select = "<select id='alternative_for_" + food_id + "' name='new_food_id'>";
                map.forEach(function (ingredient) {
                    var append_text = "";
                    if(apiOptions.includeCaloriesInAlternatives){
                        append_text = " (" + ingredient.Calories() + " calories)";
                    }
                    var selected = ingredient.FoodID() == food_id ? "selected" : "";
                    select += "<option value='" + ingredient.FoodID() + "' " + selected + ">" + ingredient.Name() + append_text + "</option>";
                });
                select += "</select>";
                if (original_alternatives[seq]==undefined)
                    original_alternatives[seq] = $("#name_" + seq).html();
                select += "<img id='img_alternative_for_" + seq + "' class='nutritionCross'>";
                $("#name_" + seq).html(select);

                watchAlternativeFoodForChanges(seq,food_id);
            }
        });
    });
}

function recipeCalCalcSearchRecipesWithIngredients(ingredients, options, action) {
    _internalThrottleKeyUps(function() {
        _internalRecipeCalCalcSearchRecipesWithIngredients(ingredients, options, action);
    }, 2000)();
}

function _internalRecipeCalCalcSearchRecipesWithIngredients(ingredients, options, action) {
    if( typeof ingredients === 'string' ) {
        ingredients = [ ingredients ];
    }
    if( typeof options === 'function'){
        action = options
        options = {}
    }
    if( debug ){
        console.log("Sending ingredients:");
        console.log(ingredients);
        console.log("Searching recipes with ingredients using options:");
        console.log(options);
    }
    if( Object.prototype.toString.call( ingredients ) === '[object Array]' ) {
        if(hostname) {
            var query_data =  {};
            if(options.limit){
                query_data.limit = options.limit;
            }
            if(options.offset){
                query_data.offset = options.offset;
            }
            var query = jQuery.param(query_data);
            if(query.length>0){
                query = "?" + query;
            }
            var json_ingredients= JSON.stringify(ingredients);
            if( debug ){
                console.log("Sending ingredients:");
                console.log(ingredients);
                console.log(json_ingredients);
            }
            var request_header = {};
            if(options.ignore_user_id!==true&&user_id){
                request_header.userid=user_id;
            }
            if(api_key){
                request_header.apikey = api_key;
            }

            $.ajax({
                url: scheme + "://" + hostname + "/recipe/natural-search" + query,
                type: 'POST',
                contentType: 'application/x-www-form-urlencoded',
                data: json_ingredients, //stringify is important
                headers:request_header,
                beforeSend: function (request) {
                    _internalApplyRequestHeaders(request_header,request);
                },
                success: function (data_in) {
                    if(debug) {
                        console.log("Received response from server:")
                        console.log(data_in)
                    }
                    if( data_in ) {
                        _internal_parseRecipeCalCalcPossibleRecipesResponse(data_in, options, action);
                    }else{
                        console.error("Successful connection but no data! " + data_in);
                    }
                },
                error:  genericRecipeCalCalcError(action)
            });
        }else {
            console.error("Missing hostname. Call initRecipeCalCalc and provide hostname.");
        }
    }else{
        action(false,"I need an array of ingredients or single string ingredient line.")
    }
}

function fetchAlternativeFoodsAndNutrients(food_id, amount_in_grams, options, action) {
    var request_header = {};
    if(options.ignore_user_id!==true&&user_id){
        request_header.userid=user_id;
    }
    if(api_key){
        request_header.apikey = api_key;
    }

    $.ajax({
        url: scheme + "://" + hostname + "/alternatives/nutrients/" + food_id + "/" + amount_in_grams,
        type: 'GET',
        contentType: 'application/x-www-form-urlencoded',
        headers:request_header,
        beforeSend: function (request) {
            _internalApplyRequestHeaders(request_header,request);
        },
        success: function (array) {
            array.forEach(function(ingredient){
                _internalAttachFoodNutritionObjectMethods(ingredient);
            });
            action(array);
        },
        error:  genericRecipeCalCalcError(action)
    });
}

function fetchAlternativeFoods(food_id, options, action) {
    var request_header = {};
    if(options.ignore_user_id!==true&&user_id){
        request_header.userid=user_id;
    }
    if(api_key){
        request_header.apikey = api_key;
    }

    $.ajax({
        url: scheme + "://" + hostname + "/alternatives/" + food_id,
        type: 'GET',
        contentType: 'application/x-www-form-urlencoded',
        headers:request_header,
        beforeSend: function (request) {
            _internalApplyRequestHeaders(request_header,request);
        },
        success: function (data_in) {
            if(debug)console.log(data_in);
            action(data_in);
        },
        error:  genericRecipeCalCalcError(action)
    });
}


function fetchFoodNutritionObject(food_id, amount, options, action) {
    if(!hostname){
        console.error("Missing hostname");
    }
    else if(!(amount>0)){
        console.error("Invalid amount [" + amount + "]");
    }else {
        var url = scheme + "://" + hostname + "/food-nutrition/by-food/" + food_id + "/" + amount;
        if( options.provides ){
            url += "/provides";
        }
        var request_header = {};
        if(options.ignore_user_id!==true&&user_id){
            request_header.userid=user_id;
        }
        if(api_key){
            request_header.apikey = api_key;
        }

        $.ajax({
            url: url,
            type: 'GET',
            contentType: 'application/x-www-form-urlencoded',
            headers:request_header,
            beforeSend: function (request) {
                _internalApplyRequestHeaders(request_header,request);
            },
            success: function (data_in) {
                _internalAttachFoodNutritionObjectMethods(data_in);
                action(data_in);
            },
            error:  genericRecipeCalCalcError(action)
        });
    }
}

function parseRecipeURL(postData, options, action) {
    if(hostname) {
        if( typeof options === 'function'){
            action = options
            options = {}
        }
        if( debug ){
            if( options.nutritionLabel ){
                console.log("Options require a nutritionLabel to be generated.")
            }
        }
        if(api_key){
            request_header.apikey = api_key;
        }

        $.ajax({
            url: scheme + "://" + hostname + "/parse/recipe"
            , type: 'POST'
            , contentType: 'application/json'
            //, headers: {UserID: user_id}
            , beforeSend: function (request) {
                _internalApplyRequestHeaders(request_header,request);
            }
            , data: JSON.stringify(postData) //stringify is important
            , success: function (data_in) {
                if( data_in) {

                    if (debug) {
                        console.log("Received a response from url");
                        console.log(data_in);
                    }
                    var recipe={};
                    Object.keys(data_in).forEach(function (key) {
                        recipe = data_in[key];//only one object is returned in this map
                    });
                    recipe = parseRecipeCalCalcResponse(recipe, options, action);
                    action(recipe, false);
                }else{
                    console.error("Successful connection but no data for recipe url! " + data_in);
                }
            },
            error:  genericRecipeCalCalcError(action)
        });
    }else {
        console.error("Missing hostname. Call initRecipeCalCalc and provide hostname.");
    }
}

function getNutritionTemplate(){
    return ""
}
function getNav(){
    getExternalTemplateDocument(function(doc){
        var container = doc.querySelector('nav');
        if(debug) {
            console.log(container);
        }
        $('body').prepend(container);
    });
}

function getTextTemplate(template_id, action ){
    var required_content = $("#" + template_id);
    if( required_content && required_content.html() ){
        action(required_content.html());
    }else {
        getExternalTemplateDocument(function (doc) {
            var container = doc.querySelector("#" + template_id);
            if(container) {
                if(container.innerHTML) {
                    if (debug) {
                        console.log(container.innerHTML);
                    }
                    action(container.innerHTML);
                }else{
                    console.error("Template with id [" + template_id + "] is an unexpected type. innerHTML not available");
                }
            }else{
                console.error("Missing template [" + template_id + "]");
            }
        });
    }
}

function getExternalTemplateDocument(extracted){
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'navbar.htm', true);
    xhr.responseType = 'document';
    xhr.onload = function (e) {
        var doc = e.target.response;
        extracted(doc);
    };
    xhr.send();
}

window.store = {
    localStoreSupport: function () {
        try {
            return 'localStorage' in window && window['localStorage'] !== null;
        } catch (e) {
            return false;
        }
    },
    set: function (name, value, days) {
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            var expires = "; expires=" + date.toGMTString();
        }
        else {
            var expires = "";
        }
        if (this.localStoreSupport()) {
            localStorage.setItem(name, value);
        }
        else {
            document.cookie = name + "=" + value + expires + "; path=/";
        }
    },
    get: function (name) {
        if (this.localStoreSupport()) {
            ret = localStorage.getItem(name);
            //console.log(typeof ret);
            switch (ret) {
                case 'true':
                    return true;
                case 'false':
                    return false;
                default:
                    return ret;
            }
        }
        else {
            var nameEQ = name + "=";
            var ca = document.cookie.split(';');
            for (var i = 0; i < ca.length; i++) {
                var c = ca[i];
                while (c.charAt(0) == ' ') c = c.substring(1, c.length);
                if (c.indexOf(nameEQ) == 0) {
                    ret = c.substring(nameEQ.length, c.length);
                    switch (ret) {
                        case 'true':
                            return true;
                        case 'false':
                            return false;
                        default:
                            return ret;
                    }
                }
            }
            return null;
        }
    },
    del: function (name) {
        if (this.localStoreSupport()) {
            localStorage.removeItem(name);
        }
        else {
            this.set(name, "", -1);
        }
    }
}

var key = '_caloriemash_id';
var method = allowsThirdPartyCookies() ? 'cookie' : 'localStorage';
var persistor = {
    localStorage: {
        set: function(id) { window.store.set(key, id); },
        get: function() { return window.store.get(key); },
        del: function() { return window.store.del(key); }
    },
    cookie: {
        set: function(id) { window.store.set(key, id, { expires: 7 }) },
        get: function() { return window.store.get(key); },
        del: function() { return window.store.del(key); }
    }
}[method];
function _internalRemoveGuestID(){
    user_id=null;
    persistor.del();
}
function _internalRemoveApiKey(){
    api_key=null;
    persistor.del();
}
var getPersistentVisitorId = (function() {
    return function(application_name,done) {
        if(typeof application_name !== "string"){
            console.error("Parameter 1 should be a string (application name). Found [" + (typeof application_name) + "]");
            return;
        }
        if(typeof done !== "function"){
            console.error("Parameter 2 should be a function. Found [" + (typeof done) + "]");
            return;
        }
        if(application_name.length==0){
            console.error("Application name is empty");
            return;
        }
        var id = _getLocalUserId();
        if(!id) {
            //
            // Am I a chrome extension, or am I a web page?
            if(chrome && chrome.extension){
                //console.error("I'm a chrome extension")
                //var port = chrome.extension.connect();
                //document.getElementById('recipeCalCalcCustomEventDiv').addEventListener('recipeCalCalcCustomEvent', function() {
                //    var eventData = document.getElementById('recipeCalCalcCustomEventDiv').innerText;
                //    port.postMessage({message: "recipeCalCalcCustomEvent", values: eventData});
                //});
                //chrome.tabs.sendMessage(tabs[0].id, {method: "getLocalAppIds"},
                //    function (response) {
                //        if(response) {
                //            console.error(response);
                //        }else{
                //            console.error("There's no onMessage listener attached to the tab!");
                //        }
                //    });
            }else {
                console.error("I'm the website")
                var customEvent = document.createEvent('Event');
                customEvent.initEvent('recipeCalCalcCustomEvent', true, true);
                function fireCustomEvent(data) {
                    hiddenDiv = document.getElementById('recipeCalCalcCustomEventDiv');
                    hiddenDiv.innerText = data
                    hiddenDiv.dispatchEvent(customEvent);
                }
                console.log();
            }
            user_id = guid();
            try {
                persistor.set("i:" + user_id); // Assume it will be accepted, it likely will.
            }catch(e){
                console.error("Failed to save the user id");
                console.error(e);
                return;
            }
            done(user_id);
            PostObject({handle:user_id,source:application_name},"request-guestid",{ignore_user_id:true},function(success,data){
                console.error(success);
                console.error(data);
                console.log(data);
                if(!data.handle){
                    user_id=false; // Wow, I really don't like this.
                    persistor.del();
                }
            });
        }else {
            done(id);
        }
    };
}());

function allowsThirdPartyCookies() {
    var re = /Version\/\d+\.\d+(\.\d+)?.*Safari/;
    return !re.test(navigator.userAgent);
}

function _getLocalUserId() {
    var parts1 = persistor.get();
    var id = false;
    if( parts1 ) {
        if(debug)console.error("Stored : " + parts1);
        var parts = parts1.split(":")
        if (parts.length == 2) {
            if (parts[0] == "i") {
                id = parts[1];
            }
        }
    }
    return id;
}

function getRecipeCalCalLocalUserId(){
    return _getLocalUserId();
}

function getRecipeCalCalLocalApikey(){
    return _getLocalApiId();
}

function setRecipeCalCalLocalUserId(new_value){
    persistor.set("i:"+new_value);
}

function setRecipeCalCalLocalApikey(new_value){
    persistor.set("a:"+new_value);
}

function _getLocalApiId() {
    var parts1 = persistor.get();
    var id = false;
    if(parts1) {
        if(debug)console.error("Stored : " + parts1);
        var parts = parts1.split(":")
        if (parts.length == 2) {
            if (parts[0] == "a") {
                id = parts[1];
            }
        }
    }
    return id;
}

function GetURLParameter(sParam) {
    var sPageURL = window.location.search.substring(1);
    var sURLVariables = sPageURL.split('&');
    for (var i = 0; i < sURLVariables.length; i++) {
        var sParameterName = sURLVariables[i].split('=');
        if (sParameterName[0] == sParam) {
            return sParameterName[1];
        }
    }
}
function guid() {
    function s4() { return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1); };
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}
