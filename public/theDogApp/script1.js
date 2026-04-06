const tempButtonsDiv = document.querySelector("#tempButtonsDiv");
let newList = [];
let allTemperament = [];

function start(allDogsValue) {
    var allDogs = allDogsValue;
    console.log(allDogs)
}
function updateHeight(data,wantedDogSizeMin,wantedDogSizeMax) {
    for(let i = 0; i< data.length ; i++){ //data.length
        let height = data[i].height.metric;
        try {
            let matches = height.match(/(\d+) - (\d+)/);
            var number1 = Number(matches[1]);
            var number2 = Number(matches[2]);
            if((number1 >= wantedDogSizeMin) &&(number2 <= wantedDogSizeMax)){
                newList.push(data[i]);
            }
        }catch(e){
            if((height >= wantedDogSizeMin) &&(height <= wantedDogSizeMax)) {
                newList.push(data[i]);
            }
        }
    }
    allDogs = newList;
}
function updateTemp(removeTemp) {
    let dataDog = allDogs;
    let newTemps = [];
    let newData = [];
    tempButtonsDiv.innerHTML = "";
    for (let i = 0; i < dataDog.length; i++) {
        let dog = dataDog[i];
        try {
            let dogsTemperament = dog.temperament.split(",");
            for (let j = 0; j < dogsTemperament.length; j++) {
                let dogTemp = (dogsTemperament[j].replace(/ /g, ''));
                if (removeTemp != dogTemp) {
                    newTemps.push(dogTemp);
                    newData.push(dog);
                    createTempButtons(dogTemp)

                }
            }
        } catch (e) {
        }
    }
    allTemperament = newTemps;
    allDogs = newData;

}

function createTempButtons(dogTemp) {
    let tempButton = document.createElement("BUTTON");
    tempButton.addEventListener("click", function (){updateTemp(dogTemp)});
    tempButton.innerText = dogTemp;
    tempButtonsDiv.appendChild(tempButton);
}

function getTemp(data) {
    let newData = []
    for(let i = 0; i < data.length; i++) {
        let dog = data[i];
        try {
            let dogsTemperament = dog.temperament.split(",");
            for (let j = 0; j < dogsTemperament.length; j++) {
                let dogTemp = (dogsTemperament[j].replace(/ /g, ''));
                if (!allTemperament.includes(dogTemp)) {
                    allTemperament.push(dogTemp);
                    newData.push(dog);
                    createTempButtons(dogTemp);
                }
            }
        }catch(e){
        }
    }
    allDogs = newData;
}
function updateDogs(){
    let data = allDogs;
    let wantedDogSizeMin = 40; // Maybe 40 to 70
    let wantedDogSizeMax = 60;
    newList = [];
    updateHeight(data,wantedDogSizeMin,wantedDogSizeMax);
    getTemp(data);
   // createTempButtons(data);
    console.log(newList);


}
function ajax_get(url) {
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
            allDogs = (JSON.parse(xmlhttp.responseText));
            start(allDogs);
        }
    };
    xmlhttp.open("GET", url, true);
    xmlhttp.send();
}
ajax_get('https://api.thedogapi.com/v1/breeds');


