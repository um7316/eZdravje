
var baseUrl = 'https://rest.ehrscape.com/rest/v1';
var queryUrl = baseUrl + '/query';

var username = "ois.seminar";
var password = "ois4fri";


/**
 * Prijava v sistem z privzetim uporabnikom za predmet OIS in pridobitev
 * enolične ID številke za dostop do funkcionalnosti
 * @return enolični identifikator seje za dostop do funkcionalnosti
 */
function getSessionId() {
    var response = $.ajax({
        type: "POST",
        url: baseUrl + "/session?username=" + encodeURIComponent(username) +
                "&password=" + encodeURIComponent(password),
        async: false
    });
    return response.responseJSON.sessionId;
}


/**
 * Generator podatkov za novega pacienta, ki bo uporabljal aplikacijo. Pri
 * generiranju podatkov je potrebno najprej kreirati novega pacienta z
 * določenimi osebnimi podatki (ime, priimek in datum rojstva) ter za njega
 * shraniti nekaj podatkov o vitalnih znakih.
 * @param stPacienta zaporedna številka pacienta (1, 2 ali 3)
 * @return ehrId generiranega pacienta
 */
function generirajPodatke(stPacienta, callback) { //callback(ehrId, napaka)
    var podatki = [{ime: "Zdravko", priimek: "Dren", drzava: "Slovenia", podatki: [
                        {datum: "2016-05-06T05:42Z", teza: 100.2, visina: 186},
                        {datum: "2016-05-05T20:55Z", teza: 46, visina: 186},
                        {datum: "2016-01-02T11:42Z", teza: 80, visina: 185},
                        {datum: "2016-01-02T11:40Z", teza: 80, visina: 185}
                   ]},
                   {ime: "John", priimek: "Doe", drzava: "United States of America", podatki: [
                        {datum: "2016-03-01T10:30Z", teza: 72.64, visina: 176},
                        {datum: "2016-02-01T10:30Z", teza: 69.93, visina: 154},
                        {datum: "2016-01-01T10:30Z", teza: 72.31, visina: 150}
                   ]},
                   {ime: "Chang", priimek: "Chong", drzava: "China", podatki: [
                        {datum: "2015-07-06T08:00Z", teza: 52, visina: 180},
                        {datum: "2015-03-04T16:30Z", teza: 60, visina: 180},
                        {datum: "2016-02-03T14:30Z", teza: 65, visina: 175}
                   ]}];

    var pacient = podatki[stPacienta-1];
    kreirajEHRzaBolnika(pacient.ime, pacient.priimek, pacient.drzava, function(ehrId, napaka1) {
        if(napaka1) {
            callback(null, napaka1);
        } else {
            var napaka2all = null;
            pacient.podatki.forEach(function(podatek) {
                vnesiPodatke(ehrId, podatek.datum, podatek.visina, podatek.teza, function(napaka2) {
                    if(napaka2) {
                        napaka2all = napaka2;
                    }
                });
            });
            callback(ehrId, napaka2all);
        }
    });
}

function ustvariTestnePodatke() {
    $("#generirajSporocilo").html("");
    var podatki = [];
    generirajPodatke(1, function(ehrId1, napaka1) {
        if(napaka1) {
            $("#generirajSporocilo").append("<span class='obvestilo label " +
              "label-danger fade-in'>Napaka pri ustvarjanju 1. pacienta: '" + napaka1 + "'!</span><br />");
        } else {
            $("#generirajSporocilo").append("<span class='obvestilo " +
              "label label-success fade-in'>Uspešno kreiran EHR pacienta 1: '" +
              ehrId1 + "'.</span><br />");
            podatki.push({ehr: ehrId1, vsebina: "Pacient 1"});
            generirajPodatke(2, function(ehrId2, napaka2) {
                if(napaka2) {
                    $("#generirajSporocilo").append("<span class='obvestilo label " +
                      "label-danger fade-in'>Napaka pri ustvarjanju 2. pacienta: '" + napaka2 + "'!</span><br />");
                } else {
                    $("#generirajSporocilo").append("<span class='obvestilo " +
                      "label label-success fade-in'>Uspešno kreiran EHR pacienta 2: '" +
                      ehrId2 + "'.</span><br />");
                    podatki.push({ehr: ehrId2, vsebina: "Pacient 2"});
                    generirajPodatke(3, function(ehrId3, napaka3) {
                        if(napaka3) {
                            $("#generirajSporocilo").append("<span class='obvestilo label " +
                              "label-danger fade-in'>Napaka pri ustvarjanju 3. pacienta: '" + napaka3 + "'!</span><br />");
                        } else {
                            $("#generirajSporocilo").append("<span class='obvestilo " +
                              "label label-success fade-in'>Uspešno kreiran EHR pacienta 3: '" +
                              ehrId3 + "'.</span><br />");
                            podatki.push({ehr: ehrId3, vsebina: "Pacient 3"});
                            /*populirajEHRje(podatki);
                            $("#generirajSporocilo").append("<span class='obvestilo label " +
                              "label-warning fade-in'>EHRId-ji so dodani v dropdown sezname!</span>");*/
                        }
                    });
                }
            });
        }
    });

    return false;
}

function kreirajEHRzaBolnika(ime, priimek, drzava, callback) { // callback(ehrId, napaka)
	sessionId = getSessionId();

	$.ajaxSetup({
	    headers: {"Ehr-Session": sessionId}
	});
	$.ajax({
	    url: baseUrl + "/ehr",
	    type: 'POST',
	    success: function (data) {
	        var ehrId = data.ehrId;
	        var partyData = {
	            firstNames: ime,
	            lastNames: priimek,
	            partyAdditionalInfo: [{key: "drzava", value: drzava}, {key: "ehrId", value: ehrId}]
	        };
	        $.ajax({
	            url: baseUrl + "/demographics/party",
	            type: 'POST',
	            contentType: 'application/json',
	            data: JSON.stringify(partyData),
	            success: function (party) {
	                if (party.action == 'CREATE') {
	                    callback(ehrId, null);
	                }
	            },
	            error: function(err) {
	            	callback(null, JSON.parse(err.responseText).userMessage);
	            }
	        });
	    }
	});
}

function vnesiPodatke(ehrId, datumInUra, telesnaVisina, telesnaTeza, callback) { //callback(napaka)
	sessionId = getSessionId();

	$.ajaxSetup({
	    headers: {"Ehr-Session": sessionId}
	});
	var podatki = {
		// Struktura predloge je na voljo na naslednjem spletnem naslovu:
        // https://rest.ehrscape.com/rest/v1/template/Vital%20Signs/example
	    "ctx/language": "en",
	    "ctx/territory": "SI",
	    "ctx/time": datumInUra,
	    "vital_signs/height_length/any_event/body_height_length": telesnaVisina,
	    "vital_signs/body_weight/any_event/body_weight": telesnaTeza
	};
	var parametriZahteve = {
	    ehrId: ehrId,
	    templateId: 'Vital Signs',
	    format: 'FLAT'
	};
	$.ajax({
	    url: baseUrl + "/composition?" + $.param(parametriZahteve),
	    type: 'POST',
	    contentType: 'application/json',
	    data: JSON.stringify(podatki),
	    success: function (res) {
	        callback(null);
	    },
	    error: function(err) {
	    	callback(JSON.parse(err.responseText).userMessage);
	    }
	});
}
