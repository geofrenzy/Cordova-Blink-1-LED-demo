/*
 * GeodomainTracker encapsulates all of the Fencing Agent logic to extricate it from display logic.
 * It accepts two callbacks for updating the UI, and three callbacks for the prototypes it uses.
 *
 * - updateSettingsPage, which recieves a list of the names of the GeoDomains being tracked. 
 *   (As strings). It updates the div containing the settings list.
 *
 * - updateLightbulbPage, which recieves a list of the colors corresponding to the tracked GeoDomains.
 *   (As strings that would be accepted by CSS). It updates the cycle of the lightbulb.
 *
 * - FencingAgent, the central type of the GeoNetwork Cordova SDK. Fencing Agents autonomously watch
 *   the FDN (Fence Delivery Network) for SmartFences. Because it's autonomous, it communicates asynchronously
 *   through callbacks structured into a Fencing Agent Delegate
 *
 * - FencingAgentDelegates are the gates through which Fencing Agent output is communicated.
 *   It's basically just a container for four callbacks:
 *   1. "onStarted", which is called when the Fencing Agent has finished its warmup process.
 *     It recieves the Fencing Agent's state immediately post-warmup.
 *   2. "fencesRefreshed", which is really the main callback to use.
 *     Whenever the Fencing Agent updates its state, the update is given the fencesRefreshed.
 *     It contains both the new and old states of the Fencing Agent.
 *   3. "onQuit", which is called after the Fencing Agent is fully stopped.
 *     It recieves the Fencing Agent's final state (in the same structure that its initial state is given by `onStarted`).
 *     Once this has been called, it should be safe to assume that no other delegate callbacks will be called, and cleanup
 *     related to the Fencing Agent should be handled.
 *   4. "onError" is called if the Fencing Agent has hit an error that it can't recover from. 
 *     It recieves the content of the message, and can be assumed to be the last call.
 *
 * - FencingAgentProfiles are validated structures containing configuration options for the FencingAgent.
 *   They have the following options (as of 0.1.4):
 *   - "geodomain", which is the name (as a string) of the geodomain tracked by the FencingAgent
 *   - "zoomLevel", which is the Zoom Level (as described [here](https://wiki.openstreetmap.org/wiki/Zoom_levels))
 *     for when the FencingAgent makes Tile of Interest (TOI) queries (which fetch all fences within a "tile", which
 *     is similar to a tile in a map view. The tile's size is decided by the Zoom Level.)
 *   - "range", which is the range in kilometers for when the Fencing Agent makes a Region of Interest (ROI) query.
 *     This is simply how big the area around the agent should be where it looks for fences.
 *   - "detectApproach", which determines whether the SDK does the calculations necessary to figure out approach details.
 *     Setting this to true will give you approach details, but will create a slight performance hit.
 *   - "interiorFocus", which, when false, inverts the in/out status of your fences,
 *     so that the Geodomain's rules will be applicable when outside of all fences, instead of when inside of any fence.
 *
 * Once instantiated, it offers a few methods:
 * - `updateDisplay`, which simply calls `updateSettingsPage` and `updateLightbulbPage` (both described above)
 *    with the arguments they expect. `updateDisplay` has no awareness of UI state, and the callbacks are
 *    expected to handle the best way to redraw the UI.
 * - `addGeodomain`, which creates a Fencing Agent to track the given Geodomain, and uses a `FencingAgentDelegate`
 *    (and `updateDisplay`) to update the UI when appropriate.
 * - `removeGeodomain`, which cleans up after the Fencing Agent created by the corresponding `addGeodomain` call,
 *   and updates the UI
 *   
 * A few of these use alert boxes to communicate errors, but this keeps things
 * much more readable.
 */
function GeodomainTracker(updateSettingsPage, updateLightbulbPage, FencingAgent, FencingAgentDelegate, FencingAgentProfile) {
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

        var removeSelf = function() {
            delete geodomains[geodomain];
            delete colors[geodomain];
            this.updateDisplay();
        }.bind(this);

        var delegate = new FencingAgentDelegate(
                //onStart
                function(response, agentStatus) {
                    var requirements = response.geodomain.requirements;
                    var requirement = undefined;

                    //If the GeoDomain has (a) color requirement(s), use the first one
                    if(response.geodomain.status === "DWELLING") {
                        for(var i = 0; i < requirements.length; i++) {
                            requirement = requirements[i];
                            if(requirement.baseType === "COLOR") {
                                colors[geodomain] = "rgba(" + requirement.red + ", " + requirement.green + ", " + requirement.blue + ", " + requirement.alpha + ")";
                                break;
                            }
                        }
                        //If the Geodomain doesn't have any color requirements, just use white
                        if(typeof colors[geodomain] === "undefined") {
                            colors[geodomain] = "white";
                        }
                    }
                    geodomains[geodomain] = fa;

                    this.updateDisplay();
                }.bind(this),
                //fencesRefreshed
                undefined,//FencingAgentDelegate accepts undefined for unused callbacks
                //onError
                function() {
                    alert("Fencing Agent for Geodomain `" + geodomain + "` threw an error and could not continue running.");
                    removeSelf();
                }.bind(this),
                //onQuit
                removeSelf
        );
        fa.addDelegate(delegate);

        try {
            fa.start();
        } catch(e) {
            alert("Warmup failed for agent with geodomain `" + geodomain + "`.");
            this.updateDisplay();//re-enabling the input for new agents
        }
    };

    this.removeGeodomain = function(geodomain) {
        geodomains[geodomain].quit();
    }.bind(this);
}
