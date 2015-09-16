/**
 * Created by johndunne on 29/07/15.
 */
var hostname = null;
var user_id = null;
var debug = false;
var scheme = "https";
var currentRecipe = {};
var alternativeFoods = {};
var apiOptions = false;

var initRecipeCalCalc = function (host, api_options) {
    hostname = host;
    if( api_options.user_id ){
        user_id = api_options.user_id;
    }
    if( api_options.debug ){
        debug = api_options.debug;
    }
    if( api_options.includeCaloriesInAlternatives === undefined ){
        api_options.includeCaloriesInAlternatives = true;
    }

    if( api_options.scheme && (api_options.scheme=="http"||api_options.scheme=="https") ){
        scheme = api_options.scheme;
    }
    apiOptions = api_options;
};

function getAllNutritionColumnNames(){
    return ["calories", "amount", "total_fat", "total_sugar", "protein", "water", "ash", "carbs", "fiber_td", "calcium", "iron", "magnesium", "phosphorus", "potassium", "sodium", "zinc", "copper", "manganese", "selenium", "vit_c", "vit_b1", "vit_b2", "vit_b3", "vit_b5", "vit_b6", "folate_tot", "folic_acid", "food_folate", "folate_dfe", "choline_tot", "vit_b12", "vit_a_iu", "vit_a_rae", "retinol", "alpha_carot", "beta_carot", "beta_crypt", "lycopene", "lut_zea", "vit_e", "vit_d_mcg", "vit_d_iu", "vit_k", "sat_fat", "mono_fat", "poly_fat", "cholestrl"];
}

function attachRecipeObjectMethods(recipe){
    recipe.Ingredients = function(){return recipe.ingMap;}
    recipe.NumIngredients = function(){return recipe.ingMap.length;}
    recipe.Ingredient = function(row){return recipe.ingMap[row];}
    recipe.NutritionLabel = function(){return recipe.nutritionLabel;}
    recipe.TallyIngredientNutrition = function(column){
        var total = 0;
        var index = 0;
        recipe.ingMap.forEach(function(ingredient){
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
    ;}
    recipe.SwapIngredient = function(seq,ingredient){
        if(ingredient['calories']===undefined){
            console.error("Not an ingredient");
        }
        recipe.tempIngredientsStorage[seq]=ingredient;
    ;}
    return recipe;
}

function attachFoodNutritionObjectMethods(nutrition_object){
    nutrition_object.Calories = function(){ return nutrition_object["calories"].toFixed(0); };
    nutrition_object.Amount = function(){ return nutrition_object["amount"].toFixed(1); };
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
    nutrition_object.RecipeID = function(){ return nutrition_object["recipe_id"] };
    nutrition_object.FoodID = function(){ return nutrition_object["nut_food_id"] };
    nutrition_object.Name = function(){ return nutrition_object["name"] };
    nutrition_object.IngredientLine = function(){ return nutrition_object["ingredient_line"] };
    nutrition_object.Multiple = function(){ return nutrition_object["multiple"] };
    return nutrition_object;
}

var parseRecipeCalCalcResponse = function (data_in, options, action ) {
    if (typeof action === 'function') {
        //ga('set', 'ingredients_parsed', 'len_' + ingredients.length);
        if(debug) {
            console.log("Received a response and parsing changes...");
            console.log(data_in);
        }
        var total = {};
        var nutritionLabel = options.nutritionLabel;
        if(options.recipeName){
            if( nutritionLabel ){
                nutritionLabel.itemName = options.recipeName;
            }
        }
        getAllNutritionColumnNames().forEach(function(column_name){
            total[column_name] = 0;
        });

        var ingredients = [];
        var ingredients_list = "";
        data_in.forEach(function (ing) {
            if(ingredients_list.length>0){
                ingredients_list += ", ";
            }
            ingredients_list += ing.common_name;
            getAllNutritionColumnNames().forEach(function(column_name){
                total[column_name] += parseFloat(ing[column_name]);
            });

            ing = formatNumbers(ing);
            ing.seq = ingredients.length;
            ingredients.push(ing);

        });
        var recipe = {};
        if( options.portions ){
            recipe.portions = options.portions;
            if(!isNaN(parseInt(options.portions, 10))) {
                var perPortion = {};
                getAllNutritionColumnNames().forEach(function(column_name){
                    perPortion[column_name] = total[column_name] / options.portions;
                });
                recipe.perPortion = perPortion;
            }else{
                console.error("Ignoring portions [" + options.portions + "] as it's not numeric");
            }
        }else{
            console.warn("No portions");
        }

        if(nutritionLabel)
        {
            nutritionLabel['ingredientList'] =  ingredients_list;
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

            var portion_amount = recipe.perPortion ? recipe.perPortion : total;
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
            recipe.nutritionLabel = nutritionLabel;
        }

        if( recipe.perPortion ){
            recipe.perPortion = formatNumbers(recipe.perPortion);
        }
        recipe.total_nutrition = formatNumbers(total);
        recipe.ingMap = ingredients;

        currentRecipe=attachRecipeObjectMethods(recipe);
        if(debug){
            console.log("Recipe");
            console.log("Calories a: " + recipe.total_nutrition['calories']);
            console.log("Calories b: " + recipe.total_nutrition.calories);
            console.log("Calories c: " + recipe.TallyIngredientNutrition("calories") );
            console.log(currentRecipe);
        }
        action( recipe, false );
    }else{
        console.error("RecipeCalCalc: parseRecipeCalCalcResponse 3rd param should be a function");
    }
};

var parseRecipeCalCalcPossibleRecipesResponse = function (recipes, options, action ) {
    if (typeof action === 'function') {
        console.log(recipes);
        //ga('set', 'ingredients_parsed', 'len_' + ingredients.length);
        if(debug) {
            console.log("Received a response and parsing changes...");
            console.log(recipes);
        }
        var total = {};

        action( recipes , false );
    }else{
        console.error("RecipeCalCalc: parseRecipeCalCalcResponse 3rd param should be a function");
    }
};

function formatNumbers(object){
    object["calories"] = object["calories"].toFixed(0);
    object["amount"] = object["amount"].toFixed(1);
    object["total_fat"] = object["total_fat"].toFixed(1);
    object["total_sugar"] = object["total_sugar"].toFixed(1);
    object["protein"] = object["protein"].toFixed(1);
    getAllNutritionColumnNames().forEach(function(column_name){
        if(typeof object[column_name] === "number" && !isNaN(object[column_name])) {
            object[column_name] = object[column_name].toFixed(3);
        }
    });
    return object;
}

function parseIngredients(ingredients,options,action) {
    recipeCalCalcParseIngredients(ingredients, options, action);
}

function uniqId() {
    return Math.round(new Date().getTime() + (Math.random() * 100));
}

function recipeCalCalcParseIngredients(ingredients, options, action) {
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
                url: scheme + "://" + hostname + "/parse_ingredient_line" + query,
                type: 'POST',
                contentType: 'application/x-www-form-urlencoded',
                data: JSON.stringify(ingredients), //stringify is important
                headers:{userid:user_id},
                beforeSend: function (request) {
                    console.log("Setting header + " + user_id);
                    request.setRequestHeader("userid", user_id);
                },
                success: function (data_in) {
                    if( data_in ) {
                        parseRecipeCalCalcResponse(data_in, options, action);

                        var count = 0;
                        //
                        // Now cycle the dom and see if there's any actions to be applied
                        $("span[changeable_food]").each(function() {
                            count++;
                            var id = $(this).attr("id");
                            var seq = $(this).attr("seq");
                            watchAlternativeFoodForClicks(seq,$(this));
                        });
                        if(debug){
                            console.warn("No span[changeable_food]'s found so no click events were attached to the outputted foods.")
                        }
                    }else{
                        console.error("Successful connection but no data! " + data_in);
                    }
                },
                error: function (xhr, type) {
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
}

function watchAlternativeFoodForChanges(seq, food_id){
    $("#alternative_for_"+food_id).change(function(){
        var text = $("#alternative_for_" + food_id + " option:selected").html();
        var new_food_id = $(this).val();
        var grams = $("#name_" + seq ).attr("grams");
        $( "#name_" + seq ).attr( "food_id", new_food_id);
        $( "#name_" + seq ).html( "<span>" + text + "</span>" );

        fetchFoodNutritionObject(new_food_id,grams,{},function(nutrition_object){
            console.log(nutrition_object);
            if( Object.keys(nutrition_object).length > 0 ){
                $( "#calories_for_" + seq ).html(nutrition_object.Calories());
                $( "#total_fat_for_" + seq ).html(nutrition_object.TotalFat());
                $( "#total_sugar_for_" + seq ).html(nutrition_object.TotalSugar());
                $( "#protein_for_" + seq ).html(nutrition_object.Protein());
            }
        });
    });
}

function watchAlternativeFoodForClicks(seq, food_box){
    food_box.dblclick(function(){

        if(debug)console.log("Received click");

        var grams = $(this).attr("grams");
        var food_id = $(this).attr("food_id");
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
                $("#name_" + seq).html(select);

                watchAlternativeFoodForChanges(seq,food_id);
            }
        });
    });
}

function recipeCalCalcSearchRecipesWithIngredients(ingredients, options, action) {
    if( typeof ingredients === 'string' ) {
        ingredients = [ ingredients ];
    }
    if( typeof options === 'function'){
        action = options
        options = {}
    }
    if( debug ){
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
            $.ajax({
                url: scheme + "://" + hostname + "/possible_recipes" + query,
                type: 'POST',
                contentType: 'application/x-www-form-urlencoded',
                data: JSON.stringify(ingredients), //stringify is important
                headers:{userid:user_id},
                beforeSend: function (request) {
                    if(debug) console.log("Setting header + " + user_id);
                    request.setRequestHeader("userid", user_id);
                },
                success: function (data_in) {
                    if( data_in ) {
                        parseRecipeCalCalcPossibleRecipesResponse(data_in, options, action);

                        //
                        // Now cycle the dom and see if there's any actions to be applied
                        $("td").each(function() {
                            var id = $(this).attr("id");
                            if( id && id.indexOf("ingredient_td") >= 0 ){
                                $(this).dblclick(function(){
                                    var grams = $(this).attr("grams");
                                    fetchAlternativeFoods(id.replace("ingredient_td_",""),grams,{}, function(){

                                    });
                                });
                            }
                            // compare id to what you want
                        });

                    }else{
                        console.error("Successful connection but no data! " + data_in);
                    }
                },
                error: function (xhr, type) {
                    action(false, "ajax error");
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
}

function fetchAlternativeFoodsAndNutrients(food_id, amount_in_grams, options, action) {
    $.ajax({
        url: scheme + "://" + hostname + "/alternatives/nutrients/" + food_id + "/" + amount_in_grams,
        type: 'GET',
        contentType: 'application/x-www-form-urlencoded',
        headers:{userid:user_id},
        beforeSend: function (request) {
            request.setRequestHeader("userid", user_id);
        },
        success: function (array) {
            array.forEach(function(ingredient){
                attachFoodNutritionObjectMethods(ingredient);
            });
            action(array);
        },
        error: function (xhr, type) {
            action(false, "ajax error");
            //ga('set', 'ingredients_parsed', 'error');
        }
    });
}

function fetchAlternativeFoods(food_id, options, action) {
    $.ajax({
        url: scheme + "://" + hostname + "/alternatives/" + food_id,
        type: 'GET',
        contentType: 'application/x-www-form-urlencoded',
        headers:{userid:user_id},
        beforeSend: function (request) {
            request.setRequestHeader("userid", user_id);
        },
        success: function (data_in) {
            if(debug)console.log(data_in);
            action(data_in);
        },
        error: function (xhr, type) {
            action(false, "ajax error");
            //ga('set', 'ingredients_parsed', 'error');
        }
    });
}

function fetchFoodNutritionObject(food_id, amount, options, action) {
    if(!hostname){
        console.error("Missing hostname");
    }
    else if(!(amount>0)){
        console.error("Invalid amount [" + amount + "]");
    }else {
        $.ajax({
            url: scheme + "://" + hostname + "/nutrition/by-food/" + food_id + "/" + amount,
            type: 'GET',
            contentType: 'application/x-www-form-urlencoded',
            headers: {userid: user_id},
            beforeSend: function (request) {
                request.setRequestHeader("userid", user_id);
            },
            success: function (data_in) {
                attachFoodNutritionObjectMethods(data_in);
                action(data_in);
            },
            error: function (xhr, type) {
                action(false, "ajax error");
                //ga('set', 'ingredients_parsed', 'error');
            }
        });
    }
}

function parseRecipeURL(postData, options, action) {
    if(hostname) {
        if( typeof options === 'function'){
            action = options
            options = {}
        }
        $.ajax({
            url: scheme + "://" + hostname + "/parse_recipe"
            , type: 'POST'
            , contentType: 'application/json'
            //, headers: {UserID: user_id}
            , beforeSend: function (request) {
                request.setRequestHeader("userid", user_id);
            }
            , data: JSON.stringify(postData) //stringify is important
            , success: function (data_in) {
                if( data_in) {

                    if (debug) {
                        console.log("Received a response from url");
                        console.log(data_in);
                    }
                    var recipe;
                    Object.keys(data_in).forEach(function (key) {
                        recipe = data_in[key];//only one object is returned in this map
                    });
                    parseRecipeCalCalcResponse(recipe.parsed_ingredients, options, action);
                }else{
                    console.error("Successful connection but no data for recipe url! " + data_in);
                }
            },
            error: function (xhr, type) {
                //alert('Ajax error!')
                action(false, "ajax error");
            }
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

var getPersistentVisitorId = (function() {
    var key = 'silp_visitorid';
    var method = allowsThirdPartyCookies() ? 'cookie' : 'localStorage';
    var persistor = {
        localStorage: {
            set: function(id) { store.set(key, id); },
            get: function() { return store.get(key); }
        },
        cookie: {
            set: function(id) { cookie.set(key, id, { expires: 7 }) },
            get: function() { return cookie.get(key); }
        }
    }[method];

    return function() {
        var id = persistor.get();
        if(!id) {
            id = guid();
            persistor.set(id);
        }
        return id;
    };
    // Basically checks for Safari, which we know doesn't allow third-party
    // cookies. If we were thorough, we should perform an actual check of
    // generating and fetching a 3rd party cookie. But since, to my knowledge,
    // Safari is the only browser that disables these per default, this check
    // suffices for now.
    function allowsThirdPartyCookies() {
        var re = /Version\/\d+\.\d+(\.\d+)?.*Safari/;
        return !re.test(navigator.userAgent);
    }
}());

function guid() {
    function s4() { return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1); };
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

