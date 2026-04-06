const dogsTextDiv = document.querySelector("#dogsTextDivH");
let badTemps =[];
let currentDogs =[];

function sleep (time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}
function removeHeightFirst(currentDogs) {
    let newCurrentDogs = [];
    let wantedDogSizeMin = 50;
    let wantedDogSizeMax = 70;
    for (let i = 0; i < currentDogs.length; i++) { //data.length
        let height = currentDogs[i].height.metric;
        try {
            let matches = height.match(/(\d+) - (\d+)/);
            var number1 = Number(matches[1]);
            var number2 = Number(matches[2]);
            if ((number1 >= wantedDogSizeMin) && (number2 <= wantedDogSizeMax)) {
                newCurrentDogs.push(currentDogs[i]);
            }
        } catch (e) {
            if ((height >= wantedDogSizeMin) && (height <= wantedDogSizeMax)) {
                newCurrentDogs.push(currentDogs[i])
            }
        }
    }
    return newCurrentDogs;
}
function removeBadTemps(badTempsHere) {
    let newCurrentDogs = [];
    let happy;
    for(let i = 0; i < currentDogs.length; i++) {
        happy = true;
        let dog = currentDogs[i];
        try {
            let dogsTemperament = dog.temperament.split(",");
            for (let j = 0; j < dogsTemperament.length; j++) {
                let dogTemp = (dogsTemperament[j].replace(/ /g, ''));
                if (badTempsHere.includes(dogTemp)) {
                    happy = false
                }
            }
            if (happy) {
                newCurrentDogs.push(dog);
            }
        } catch (e) {
            console.log("Error from API: ", dog)
        }
    }
    return newCurrentDogs;
}

function getDogsTemps() {
    let dogTemps = [];
    for (const dog of currentDogs) {
        try {
            let dogsTemperament = dog.temperament.split(",");
            for (let j = 0; j < dogsTemperament.length; j++) {
                let dogTemp = (dogsTemperament[j].replace(/ /g, ''));
                if(!dogTemps.includes(dogTemp)) {
                    dogTemps.push(dogTemp);
                    createButtons(dogTemp)
                }
            }
        } catch (e) {
            console.log("Error: " + e)
        }
    }
    return dogTemps;
}
function removeThisDog(removeDog) {
    let newDogs = [];
    for (const dog of currentDogs){
        if(dog.id === removeDog){
            console.log("THIS DOG IS REMOVED:" , dog)
        }else{
            console.log(dog)
            newDogs += dog;
        }
    }
    currentDogs = newDogs;
    nextStep();
}
function printDogs() {
    for (let i = 0; i < currentDogs.length; i++){
        const dogDiv = document.createElement("DIV");
        dogDiv.id = currentDogs[i].id;
        dogDiv.classList.add("dogsDivClass");
        dogsTextDiv.appendChild(dogDiv);
        const dogName = document.createElement("p");
        dogName.innerHTML = "Name: " + currentDogs[i].name;
        dogDiv.appendChild(dogName);
        const dogTemps = document.createElement("p");
        let dogTemperament = currentDogs[i].temperament.split(",");
        dogTemps.innerHTML += "Tags: ";
        for(let j = 0; j < dogTemperament.length; j++){
            let dogTemp = (dogTemperament[j].replace(/ /g, ''));
            dogTemps.innerHTML += dogTemp +", ";
        }
        dogDiv.appendChild(dogTemps);
        const dogButton = document.createElement("BUTTON");
        dogButton.innerText = "Remove me?"
        dogButton.onclick = function () {removeThisDog(currentDogs[i].id)};
        dogDiv.append(dogButton);
    }
}
function nextStep() {
    tempButtonsDiv.innerHTML = "";
    dogsTextDiv.innerHTML = "";
    currentDogs = removeBadTemps(badTemps);
    getDogsTemps();
    printDogs();
}

function createButtons(dogTemp) {
    let tempButton = document.createElement("BUTTON");
    tempButton.addEventListener("click", function (){
        badTemps.push(dogTemp)
        nextStep()
    });
    tempButton.innerText = dogTemp;
    tempButtonsDiv.appendChild(tempButton);

}

function ajax_get() {
    let url ='https://api.thedogapi.com/v1/breeds'
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.onreadystatechange = function() {
        if (xmlhttp.readyState === 4 && xmlhttp.status === 200) {
            console.log("Starting...")
            myFunc(((JSON.parse(xmlhttp.responseText))));
        }
    };
    xmlhttp.open("GET", url, true);
    xmlhttp.send();
}
function myFunc(allDogs) {
    console.log("StartDogs:", allDogs);
    currentDogs = removeHeightFirst(allDogs);
    console.log("After height:", currentDogs);
    console.log("Bad temps:", badTemps);
    currentDogs = removeBadTemps(currentDogs, badTemps);
    console.log("After bad temps removed:", currentDogs);
    nextStep()

}

ajax_get();



