let areYouSure = false;
const leaveButton = document.querySelector("#leaveGameButton")
function leaveGame(){
    if (!areYouSure){
        leaveButton.innerHTML = "Trykk en gang til for å forlate"
        areYouSure = true;
    }
    else{
        location.replace("../code.html")
    }

}

//Kommentarforklaringen er ofte nederst og forklarer det som er over
const hoydeInp = document.querySelector("#hoyde");
const vinkelInp = document.querySelector("#vinkel");
const fartInp = document.querySelector("#fart");
const tyngdekraftInp = document.querySelector("#tyngdekraft"); //Henter ut de 4 feltene som bruker kan endre
const kule = document.querySelector("#kule");
const kanon = document.querySelector("#kanon");
const blink = document.querySelector("#blink"); // Henter ut de 3 elementene som flytter på seg
const tekstVinkel= document.querySelector("#tekstVinkel");
const tekstHoyde = document.querySelector("#tekstHoyde");
const tekstFart = document.querySelector("#tekstFart");
const tekstXpos = document.querySelector("#tekstXpos");
const tekstYpos = document.querySelector("#tekstYpos");
const tekstSeier = document.querySelector("#tekstSeier");
const tekstTilbakemelding = document.querySelector("#tekstTilbakemelding");
const tekstTips = document.querySelector("#tekstTips"); //Henter ut de ulike tekstene som endres
const fiendeParent = document.querySelector("#fiendeParent"); //Element som "fienden" legger seg under
hoydeInp.value = 0; //Slik at starthøyden er 0;
vinkelInp.value = 45;
fartInp.value = 0;
const tipsArray = ["Spillet fungerer dårlig hvis du scroller vinduet, zoom heller ut", "Husk å endre vinkel for å treffe akkuratt", "Starthøyde kan være lurt å variere","En fiende -eller et svart hull - restarter spillet", "Du kan endre tyngdkraften i rullevinduet øverst","Det legges til en fiende hver gang du treffer blinken", "Bruk knappene nederst til å endre antallet fiender", "Bruk de ulike tyngdekreftene til din fordel!"];
//Jeg kunne godt ha brukt object for tipsene

let fart = 0;
let vinkel = 45;
let fartX = fart*Math.cos(vinkel*Math.PI/180);
let fartY = fart*Math.sin(vinkel*Math.PI/180); //Fart og vinkel, dekomponeres for  få fart i  x og y- retning
let tyngdekraft = 0.1;
let teller  = 0; //Teller i sammenheng med tyngdekraft "tiden"
let antallSeier = 0;
let antallFiender = 0; //Noen tellere for å holde oversikt
let kuleY = 500;
let kuleX = 20; //Start posisjon til kule
let blinkX = (Math.random()*420)+600;
let blinkY = (Math.random()*(420))+80; //Startposisjon til blink, er delvis tilfeldig
let kuleYtekst;
let fiende;
let fiendeArray = [];
let minsteAvstandArray= []; //Noen tomme arrays som blir brukt senere i koden
let tilfeldigTall = 1; //I sammenheng med tips, og når det skal dukke opp et nytt tips
kule.style.marginTop= kuleY + "px";
kule.style.marginLeft= kuleX + "px";
kanon.style.marginTop =  (kuleY-70) + "px";
blink.style.marginTop= blinkY + "px";
blink.style.marginLeft= blinkX + "px"; //Her oppdateres posisjon til kule, blink og kanon.(Kanon følger kule)
let kollisjon = false;
let startet = false; // Slik at man ikke kan trykke på knappen mange ganger
let seier = false; //Sjekker om bruker har vunnet
let nullstill = false; //Nullstill brukes i sammenheng med funksjon reset(), slik at programmet vet at den skal stoppe å kjøre skudd() funksjonen
let interval; //brukes for å telle hvor lenge bruker holder inne en tast
let stigning = "positiv"; //Brukes for å få fartinp til å gå frem og tilbake

document.onkeydown = function(e) {
    if (startet === false && e.keyCode === 32) {
        //Starter når bruker trykker på space, øker "tiden" som bruker holder knappen inne, dermed øker fart input
        interval = setInterval(leggTilTid(), 1000);
    }
};
function leggTilTid() {
    //Det er denne funksjonen som gjør at fartINP endrer seg som den gjør.
    if (stigning === "positiv") { //Her skal den stige hvis den stiger, og begynne å synke hvis den er 15
        fart = fart + 1;
        if (fart === 15) {
            stigning = "negativ"; //Kunne nok brukt et bedre system en string-verdiene "positiv" og "negativ"
        }
    } else if (stigning === "negativ") {
        fart = fart - 1;
        if (fart <= 1) { //Her igjen endres stigningen til positiv når den treffer 1
            stigning = "positiv";
        }
    }
    fartInp.value = fart;
    tekstFart.innerHTML = `Utskytningsfarten er ${fart}`; //Oppdateres slik at bruker vet hva farten er
}
document.onkeyup = function () {
    if (startet === false) { //Sjekker om spillet allerede er i gang
        //I det bruker slipper space vil kule starte med følgende fart:
        clearInterval(interval);
        if (fart > 1) { //Små justeringer slik som denne gjør at bruker ikke kan skyte med fart 1, tvinger bruker til å holde inne lengre
            console.log("Slutt farten ble " + fart);
            fartX = fart * Math.cos(vinkel * Math.PI / 180);
            fartY = fart * Math.sin(vinkel * Math.PI / 180);
            avfyr(); //Starter avfyr funksjonen
        }
        else{
            console.log("Hold inne litt lengre!")
        }
        fart = 0; //Variabel resettes, fordi farten ble lagret i fartX og fartY variablene
    }
};
function avfyr() {
    kollisjon = false;
    nullstill = false;
    minsteAvstandArray= []; //Noen verdier resettes
    kanon.src = "bilder/kanon.gif"; //Bytter fra bilde til gif. MERK: Dette er veldig ustabilt og det skapes fort feil med animasjonen hvis bruker skyter fort eller lignende
    //Burde nok løst dette på en annet måte
    if (startet === false) {
        startet = true; //Sjekker om den allerede har startet, hvis ikke starter den det og sier at startet = true
        setTimeout(skudd, 420); //delay slik at det passer med animasjonen
    }
}
function skudd () { //Selve skudd-funksjonen, her oppdaterer den posisjon til kule, som teller en hvis tid slik at det passer med tyngdekraften
    if (nullstill === false) {
        teller += 1;
        kuleX += fartX;
        kuleY = kuleY - (fartY - tyngdekraft * teller);
        kule.style.marginTop = kuleY + "px";
        kule.style.marginLeft = kuleX + "px";
        kuleYtekst = 500 - kuleY;
        tekstXpos.innerHTML = `X-posisjon er ${kuleX.toFixed(0)}`;
        tekstYpos.innerHTML = `Y-posisjon er ${kuleYtekst.toFixed(0)}`;
        //Her oppdateres posisjonsverdeiene til kule, samt oppdaterer teksten slik at bruker får kordinatene oppgitt
        regnUtKollisjon(); //Til slutt sjekker den om kule kolliderer med noe
        setTimeout(byttBilde, 500); //Bytter tilbake til bilde slik at gif-en ikke spilles av evig
        if (kollisjon === false) { //Kollisjon = true brukes til å stoppe skudd funksjonen
            requestAnimationFrame(skudd); //Så lenge kule ikke har truffet noe kjøres skuff funksjon med 60 fps
        }
    }
}
function byttBilde () {
    kanon.src = "bilder/kanonFirstFrame.png"
}
function regnUtKollisjon() {
    //Alle posisjoner til elementene blir lagt inn i dette systemet, og brukes det vektormatte til å regne på absoluttverdien til avstandsvektoren mellom to objekter
    let kuleArray = ["kule", kuleX, kuleY];
    let blinkArray = ["blink", blinkX, blinkY];
    //Her sjekker den kollisjon kun mellom kule og blink:
    let vektorMellomBilder = [kuleArray[1] - blinkArray[1], kuleArray[2] - blinkArray[2]]; //Vektoren mellom bilder regnes ut,
    let absMellomBilder = Math.round(Math.sqrt(((vektorMellomBilder[0]) * (vektorMellomBilder[0])) + ((vektorMellomBilder[1]) * (vektorMellomBilder[1]))));
    //Bruker pytagoras for å finne "avstandsverdien"
    if (absMellomBilder <= 35) {
        //Hvis avstanden mellom bildene er mindre enn radiusene på bildene tilsammen vil det føre til treff av blinken
        console.log("Du traff blinken");
        kollisjon = true; //Dette gjør at skudd-funksjonen ikke kjører lengre
        seier = true;
        antallSeier++;
        //Noen verdier blir oppdatert
        console.log("Du traff blinken. Det har du gjort " +antallSeier + " ganger");
        leggTilFiende(); //Funksjon som leggertil en fiende hver gang du treffer blinken
        oppdaterBlink(); //Blinken bytter posisjon (random)
        nyttSkudd();  //Spillet gjøres klar til et nytt skudd etter at bruker treffer blink
        tekstTilbakemelding.style.color = "#4CAF50";
        tekstTilbakemelding.innerHTML = "Grattis, du traff!"; //Koselig tilbakemelding :)
    }
    else if (kuleX > 1200  || kuleX<0 || kuleY > 600 || kuleY <-500) {
        //Hvis bruker treffer utenom "spillområdet" ærkleres det som en bom. Verdiene er valgt slik at bruker har god plass
        console.log("Du bomma! Prøv igjen");
        kollisjon = true;
        seier = false; //Her ser vi at du treffer noe men ikke blinken så det er ikke en seier
        nyttSkudd(); //Igjen, gjør klart til et nytt skudd

        if (minsteAvstandArray[0] < 30 && minsteAvstandArray[0] > 10) {
            //Funksjon som sjekker hvor nærme bruker var og gir en liten "advarsel" hvis bruker for var nærme
            tekstTilbakemelding.style.color = "blue";
            tekstTilbakemelding.innerHTML = "Det var nærme! ";
            console.log("Det var nærme fienden")
        } else {
            tekstTilbakemelding.style.color = "red";
            tekstTilbakemelding.innerHTML = "Du bomma, prøv igjen!" //Tilbakemelding
        }
    }
    for (let i = 0; i<antallFiender; i++){
        //Kjøres like mye som antallfiender. Her sjekker den kollisjon mellom kule og fiende
        let fiendeX = fiendeArray[i][1];
        let fiendeY = fiendeArray[i][2]; //Henter ut fiendeX og Y fra fiendearrayen i leggTilFiende-funksjonen
        let vektorBlinkFiende = [kuleArray[1] - fiendeX, kuleArray[2] - fiendeY];
        let absMellomBilder2 = Math.round(Math.sqrt(((vektorBlinkFiende[0]) * (vektorBlinkFiende[0])) + ((vektorBlinkFiende[1]) * (vektorBlinkFiende[1]))));
        //Vektormatte slik som tidligere
        minsteAvstandArray.push(absMellomBilder2); //Pusher alle avstandene inn i en tom array
        // console.log("Kule x,y er "+ Math.round(kuleX) +"," +Math.round(kuleY) + ". Fienden er ved " + Math.round(fiendeX)+ "," + Math.round(fiendeY) + ". Abs er da "+ absMellomBilder2)
        if (absMellomBilder2 <= 10){
            //Hvis bruker treffer fienden resettes spillet, og bruker får tilbakemelding
            console.log("Du traff fienden");
            kollisjon = true;
            seier = false;
            reset();
        }
    }
    minsteAvstandArray.sort(function(a, b){return a - b});
    //Funksjon som sorterer putter den minste absoluttverdien mellom kule og fiende inn som nr [0].
    //Brukes som en morsomhet for å gi bruker "advarsel" om at bruker var nærme å treffe fienden
}
function nyttSkudd() {
    //Gjør klar til nytt skudd, men resetter ikke alle verdier
    kuleY = 500;
    kuleY = kuleY - hoydeInp.value;
    kuleX = 20;
    teller = 0;
    fart  = 0;
    fartX = fart*Math.cos(vinkel*Math.PI/180);
    fartY = fart*Math.sin(vinkel*Math.PI/180); //Oppdaterer tall-verdiene
    kule.style.marginTop=kuleY + "px";
    kule.style.marginLeft=kuleX + "px";
    kanon.style.marginTop =  (kuleY-70) + "px"; //Resetter posisjon til kanon og kule
    fartInp.value=0;
    seier = false;
    startet= false;
    oppdaterTekst(); //Alt av tekst blir oppdatert
    if (tilfeldigTall===1){ //Simpel if setning som sjekker om den skal oppdatere tips
        oppdaterTips();
    }
    tilfeldigTall = Math.round(Math.random()*3); //Jeg ønsket ikke at tips skulle byttes hver gang så det blir 1/3 sjans på at det byttes
}
function reset() {
    //Skal resette nesten alt, nesten slik som f5. Verdiene under er standard
    kuleY = 500;
    kuleX = 20;
    teller = 0;
    fart  = 0;
    vinkel = 45;
    fartX = fart*Math.cos(vinkel*Math.PI/180);
    fartY = fart*Math.sin(vinkel*Math.PI/180);
    kule.style.marginTop=kuleY + "px";
    kule.style.marginLeft=kuleX + "px";
    kanon.style.marginTop =  (kuleY-70) + "px";
    hoydeInp.value = 0;
    vinkelInp.value = 45;
    kollisjon = false;
    seier = false;
    startet= false;
    nullstill = true; //Denne har jeg slik at skudd-funksjonen ikke fortsetter å kjøre hvis bruker trykker på resett
    fjernFiender();
    oppdaterBlink();
    oppdaterTekst(); //Fjener alle fiender og oppdaterer info
    tekstTilbakemelding.style.color = "black";
    tekstTilbakemelding.innerHTML=`Du traff blinken ${antallSeier} ganger før du traff et sort hull `;
    //Bruker får tilbakemelding
    antallSeier = 0;
    tekstSeier.innerHTML = `Antall treff: 0`
}
function oppdaterTekst(){
    //Gjør akkuratt det den heter. Dette er en funksjon som kjører nesten hele tiden fordi teksten oppdateres nesten hele tiden
    kuleYtekst = 500 - kuleY;
    tekstXpos.innerHTML = `X-posisjon er ${kuleX.toFixed(0)}`;
    tekstYpos.innerHTML = `Y-posisjon er ${kuleYtekst.toFixed(0)}`;
    tekstHoyde.innerHTML = `Starthøyden er ${hoydeInp.value}`;
    tekstVinkel.innerHTML = `Vinkelen er ${vinkel} grader`;
    tekstSeier.innerHTML = `Antall treff: ${antallSeier}`;
}
function oppdaterBlink(){
    //Setter rett og slett nye kordinater til blinken
    blinkX = (Math.random()*420)+ 600;
    blinkY= ((Math.random()*420))+80;
    blink.style.marginTop= blinkY + "px";
    blink.style.marginLeft= blinkX + "px";
}
hoydeInp.onchange  = function () {
    //Endrer på starthøyden
    if(startet===false) { //Passer på at bruker ikke kan endre høyde mens kulen beveger seg
        kuleY = 500;
        kuleY = kuleY - hoydeInp.value;
        kule.style.marginTop = kuleY + "px";
        kanon.style.marginTop = (kuleY-70)  + "px";
        oppdaterTekst();
        //Oppdaterer verdien,posisjon og tekst
    }
};
vinkelInp.onchange = function () {
    vinkel = vinkelInp.value;
    if (startet === false) {
        fartX = fart * Math.cos(vinkel * Math.PI / 180);
        fartY = fart * Math.sin(vinkel * Math.PI / 180);
        oppdaterTekst();
        //Fart endres ved vinkel, teksten oppdateres og
    }
};
tyngdekraftInp.onchange = function () {
    if (tyngdekraftInp.value === "1"){
        tyngdekraft = 0.1;
    }
    else if (tyngdekraftInp.value === "2"){
        tyngdekraft = 0.01;
    }
    else if (tyngdekraftInp.value === "3"){
        tyngdekraft = 0.3
    }
    //her er det 3 if-setninger som følger de 3 valgene bruker har i rullevinduet. Alle setter ny tyngdekraft som er riktige i forhold til hverandre
};
function leggTilFiende() {
    //Her opprettes fiende element, som blir pushet til en tom div
    antallFiender+= 1;
    fiende = document.createElement("img");
    fiende.src = "bilder/sortHull2.jpg"; //Bilde med ID (Bilde kunne vært litt finere)
    fiende.id = "fiende" + antallFiender; //På denne måten har hver fiende en enkel måte å skilles fra hverandre
    fiende.className = "fiende"; //Samme class slik at det kunne vært enklere å endre CSS
    fiende.style.position= "absolute";
    let fiendeStartX = (Math.random()*(900))+100;
    let fiendeStartY =  (Math.random()*300)+200; //Tilfeldig posisjon, blir lagret i en array
    fiende.style.marginLeft = fiendeStartX + "px";
    fiende.style.marginTop =  fiendeStartY + "px";
    fiende.style.width = (10) + "px";
    fiende.style.height = (10)+ "px";
    fiende.style.transform = "translate(-50%, -50%)"; //Høyde, bredde og passer på at den er "midt-stilt"
    fiendeParent.appendChild(fiende); //Appender fiende elementet til fiendeParent diven
    let fiendeKordinatArray = [fiende.id,fiendeStartX, fiendeStartY];
    fiendeArray.push(fiendeKordinatArray); //På denne måten lagrer jeg x og y-en til alle fiendene i fiendeArray. Brukes når jeg sjekker kollisjon
    console.log(fiendeArray)
}
function fjernFiender() {
    //fjerner fiender i sammenhend med resetting
    for (let h=1;h<antallFiender+1; h++) { //Kjører like mange ganger som det er fiender
        const element = document.getElementById("fiende"+h); //Bruker egenskapen at alle fiendene har unik ID til å hente hver og enkelt frem
        element.remove(); //Når variablen "elements" består av en fiende så fjerner den det elementet
    }
    antallFiender=0;
    fiendeArray=[];
    tekstSeier.innerHTML = `Antall treff: 0` //Oppdaterer litt tekst og verdier
}
function oppdaterTips() {
    //Koselig funksjon som ikke gjør annet enn å gi tips :) Skal også være uavhengig og du skal kun legge til nytt tips og det vil funke
    tekstTips.innerHTML = tipsArray[(Math.round(Math.random()*(tipsArray.length-1)))];
}