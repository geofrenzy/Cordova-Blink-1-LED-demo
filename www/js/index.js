var app = {
    geodomainTracker: {},

    // Application Constructor
    initialize: function() {
        document.addEventListener('deviceready', this.onDeviceReady.bind(this), false);

    },

    // deviceready Event Handler
    //
    // Bind any cordova events here. Common events are:
    // 'pause', 'resume', etc.
    onDeviceReady: function() {
        this.receivedEvent('deviceready');

        function GeodomainTracker(updateSettingsPage, updateLightbulbPage) {
            var FencingAgent = window.plugins.fencingAgent.FencingAgent;
            var FencingAgentDelegate = window.plugins.fencingAgent.FencingAgentDelegate;
            var FencingAgentProfile = window.plugins.fencingAgent.FencingAgentProfile;

            //Key: geodomain name ("x.x.place")
            //Value: corresponding Fencing Agent
            var geodomains = {};

            //Key: geodomain name ("x.x.place")
            //Value: corresponding color in CSS
            var colors = {};

            this.updateDisplay = function() {
                updateSettingsPage(Object.keys(geodomains));
                updateLightbulbPage(Object.values(colors));
            };

            this.addGeodomain = function(geodomain) {
                if(typeof geodomains[geodomain] !== "undefined") {
                    throw new Error("Tried to create a Fencing Agent that already existed (geodomain: `" + geodomain + "`)");
                }

                var profile = new FencingAgentProfile({
                    "geodomain": geodomain,
                    "range": 20
                })
                var fa = new FencingAgent(profile);

                var delegate = new FencingAgentDelegate(
                        function(response, agentStatus) {
                            var requirements = response.geodomain.requirements;
                            var requirement = undefined;
                            if(response.geodomain.status === "DWELLING") {
                                for(var i = 0; i < requirements.length; i++) {
                                    requirement = requirements[i];
                                    if(requirement.baseType === "COLOR") {
                                        colors[geodomain] = "rgba(" + requirement.red + ", " + requirement.green + ", " + requirement.blue + ", " + requirement.alpha + ")";
                                        break;
                                    }
                                }
                                if(typeof colors[geodomain] === "undefined") {
                                    colors[geodomain] = "white";
                                }
                            }

                            geodomains[geodomain] = fa;

                            this.updateDisplay();
                        }.bind(this),
                        function() {},//No update function
                        function() {
                            alert("Could not initialize Fencing Agent for that Geodomain");
                            this.updateDisplay();
                        }.bind(this),//No error function
                        function() {
                            delete geodomains[geodomain];
                            delete colors[geodomain];
                            this.updateDisplay();
                        }.bind(this)
                        );
                fa.addDelegate(delegate);
                try {
                fa.start();
                } catch(e) {
                    alert("Initialization failed for agent with geodomain `" + geodomain + "`.");
                    this.updateDisplay();//re-enabling the input for new agents
                }
            };

            this.removeGeodomain = function(geodomain) {
                geodomains[geodomain].quit();
            }.bind(this);
        }

        var currentLightbulbInterval = undefined;

        app.geodomainTracker =  new GeodomainTracker(function(geodomains) {
            var geodomainUl = document.getElementById("geodomainListing");

            while(geodomainUl.firstChild) {
                geodomainUl.removeChild(geodomainUl.firstChild);
            }

            for(var i = 0; i < geodomains.length; i++) {
                (function(i) {
                    var geodomain = geodomains[i];

                    var geodomainLi = document.createElement("li");
                    var geodomainRemovalButton = document.createElement("button");
                    var geodomainText = document.createTextNode(geodomain + " ");
                    geodomainRemovalButton.onclick = function() {
                        app.geodomainTracker.removeGeodomain(geodomain);
                    };
                    geodomainRemovalButton.innerHTML = "Remove";

                    geodomainLi.appendChild(geodomainText);
                    geodomainLi.appendChild(geodomainRemovalButton);

                    geodomainUl.appendChild(geodomainLi);
                })(i);
            }

            var newGeodomainLi = document.createElement("li");
            var newGeodomainTextbox = document.createElement("input");
            var addGeodomainButton = document.createElement("button");
            newGeodomainTextbox.type = "text";
            addGeodomainButton.innerHTML = "Add";
            addGeodomainButton.onclick = function(e) {
                app.geodomainTracker.addGeodomain(newGeodomainTextbox.value);
                addGeodomainButton.disabled = true;
                newGeodomainTextbox.disabled = true;
            };


            newGeodomainLi.appendChild(newGeodomainTextbox);
            newGeodomainLi.appendChild(addGeodomainButton);

            geodomainUl.appendChild(newGeodomainLi);


        }, function(colors) {
            var currentScheduledColorChanges = [];
            var clearScheduledChanges = function() {
                //Ensure that the previous second's colors don't run long.
                for(var i = 0; i < currentScheduledColorChanges.length; i++) {
                    clearTimeout(currentScheduledColorChanges[i]);
                    currentScheduledColorChanges.splice(i,1);
                }
            };
            var planLightbulbSecond = function() {
                clearScheduledChanges();

                var colorTime = Math.floor(1000/colors.length);//whole milliseconds. Last color may be about one millisecond longer than it's supposed to be.
                var bulbOverlay = document.getElementById("bulb_overlay");
                if(colors.length < 1) {
                    bulbOverlay.style.opacity = 0;
                } else {
                    bulbOverlay.style.opacity = 0.3;
                }
                for(var i = 0; i < colors.length; i++) {
                    (function(i) {
                        var newColor = colors[i];
                        currentScheduledColorChanges.push(setTimeout(function() {
                            bulbOverlay.style.background = newColor;
                        }, colorTime*i));
                    })(i);
                }
            } 

            clearScheduledChanges();
            clearInterval(currentLightbulbInterval);
            currentLightbulbInterval = setInterval(planLightbulbSecond, 1000);
        });

        app.geodomainTracker.updateDisplay();
    },

    receivedEvent: function(id) {
       document.getElementById("switchPageButton").onclick = app.switchActivePage
    },
    switchActivePage: function() {
        var lightbulbPage = document.getElementById("lightbulbPage");
        var settingsPage = document.getElementById("settingsPage");

        var lightbulbIsVisible = !lightbulbPage.classList.contains("hidden");
        if(lightbulbIsVisible) {
            settingsPage.classList.remove("hidden");
            lightbulbPage.classList.add("hidden");
        } else {
            settingsPage.classList.add("hidden");
            lightbulbPage.classList.remove("hidden");
        }
    }
};

app.initialize();
