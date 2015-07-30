/**
 * Created by johndunne on 29/07/15.
 */

var parseRecipeCalCalcResponse = function (data_in, action ) {
    //ga('set', 'ingredients_parsed', 'len_' + ingredients.length);
    console.log("Received a response...");
    console.log(data_in);
    var total = {};
    total["calories"] = 0;
    total["amount"] = 0;
    total["total_fat"] = 0;
    total["total_sugar"] = 0;
    total["protein"] = 0;
    var ingredients = [];
    data_in.forEach(function (ing) {
        ing["calories"] = ing["calories"].toFixed(0);
        ing["amount"] = ing["amount"].toFixed(1);
        ing["total_fat"] = ing["total_fat"].toFixed(1);
        ing["total_sugar"] = ing["total_sugar"].toFixed(1);
        ing["protein"] = ing["protein"].toFixed(1);
        ingredients.push(ing);
        total["calories"] += parseFloat(ing["calories"]);
        total["amount"] += parseFloat(ing["amount"]);
        total["total_fat"] += parseFloat(ing["total_fat"]);
        total["total_sugar"] += parseFloat(ing["total_sugar"]);
        total["protein"] += parseFloat(ing["protein"]);
    });
    total["calories"] = total["calories"].toFixed(0);
    total["amount"] = total["amount"].toFixed(1);
    total["total_fat"] = total["total_fat"].toFixed(1);
    total["total_sugar"] = total["total_sugar"].toFixed(1);
    total["protein"] = total["protein"].toFixed(1);
    var recipe = {};
    recipe.total_nutrition = total;
    recipe.ingMap = ingredients;
    action( recipe, false );
};

function parseIngredients(ingredients,action) {
    if( typeof ingredients === 'string' ) {
        ingredients = [ ingredients ];
    }

    if( Object.prototype.toString.call( ingredients ) === '[object Array]' ) {
        $.ajax({
            url: "//" + recipecalcalhostname + "/parse_ingredient_line",
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify(ingredients), //stringify is important
            beforeSend: function (request) {
                request.setRequestHeader("userid", user_id);
            },
            success: function(data_in){
                parseRecipeCalCalcResponse(data_in, action);
            } ,
            error: function (xhr, type) {
                action(false, "ajax error");
                //ga('set', 'ingredients_parsed', 'error');
                //alert('Ajax error!')
            }
        });
    }else{
        action(false,"I need an array of ingredients or single string ingredient line.")
    }
}

function parseRecipeURL(postData, action) {
    $.ajax({
        url: "//" + recipecalcalhostname + "/parse_recipe"
        , type: 'POST'
        , contentType: 'application/json'
        //, headers: {UserID: user_id}
        , beforeSend: function (request) {
            request.setRequestHeader("userid", user_id);
        }
        , data: JSON.stringify(postData) //stringify is important
        , success: function (data_in) {
            parseRecipeCalCalcResponse(data_in,action);
            /*var key = Object.keys(data_in)[0];
             var recipe = data_in[key];
             var ingredients = [];
             //ga('set', 'url_parsed', 'len_' + key.length);
             recipe.parsed_ingredients.forEach(function (ing) {
             ing["calories"] = ing["calories"].toFixed(0);
             ing["amount"] = ing["amount"].toFixed(1);
             ing["total_fat"] = ing["total_fat"].toFixed(1);
             ing["total_sugar"] = ing["total_sugar"].toFixed(1);
             ing["protein"] = ing["protein"].toFixed(1);
             ingredients.push(ing);
             console.log(ing);
             });
             recipe.ingMap = ingredients;
             action(recipe,false);*/
        },
        error: function (xhr, type) {
            //alert('Ajax error!')
            action(false, "ajax error");
        }
    });
}

function getNav(){
    getTemplateDocument(function(doc){
        var container = doc.querySelector('nav');
        console.log(container);
        $('body').prepend(container);
    });
}

function getTextTemplate(template_id, action ){
    getTemplateDocument(function(doc){
        var container = doc.querySelector("#" + template_id);
        console.log(container);
        action(container);
    });
}

function getTemplateDocument(extracted){
    var xhr = new XMLHttpRequest();
    xhr.open('GET', 'navbar.htm', true);
    xhr.responseType = 'document';
    xhr.onload = function(e) {
        var doc = e.target.response;
        extracted(doc);
    };
    xhr.send();
}