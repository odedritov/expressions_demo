import { initJsPsych } from "jspsych";
import htmlButtonResponse from "@jspsych/plugin-html-button-response";
import audioKeyboardResponse from "@jspsych/plugin-audio-keyboard-response";



// Initialize jsPsych
const jsPsych = initJsPsych();

// Function to load and parse CSV
async function loadQuestions() {
    console.log("📂 Attempting to fetch CSV...");

    const csvPath = "./all_questions.csv"; 
    
    try {
        const response = await fetch(csvPath);

        console.log("📥 Fetch response:", response);

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const text = await response.text();
        console.log("✅ CSV Loaded:\n", text); 

        const rows = text.trim().split("\n").slice(1); 
        console.log("🔍 Parsed Rows:", rows); 

        if (rows.length === 0) {
            console.error("❌ No rows found in CSV!");
            return [];
        }

        const parsedData = rows.map((row, index) => {
            const columns = row.split(",");

            if (columns.length < 10) { // Ensure all fields exist
                console.error(`❌ Row ${index + 1} is incomplete:`, row);
                return null;
            }

            const [story, sound1, sound2, sound3, sound4, correctIndex, audioFile, confirmText, confirmSound, block] = columns.map(col => col.trim());

            if (!block) {
                console.error(`⚠️ Missing block type in row ${index + 1}:`, row);
            }

            const questionObject = {
                story: story.replace(/"/g, ""), 
                sounds: [sound1, sound2, sound3, sound4],
                correctIndex: parseInt(correctIndex),
                audioFile: audioFile,
                confirmText: confirmText.replace(/"/g, ""),
                confirmSound: confirmSound,
                block: block // ✅ Ensure block is included
            };

            console.log(`✅ Loaded question ${index + 1}:`, questionObject);
            return questionObject;
        }).filter(q => q !== null);

        console.log("📋 Final Questions Array:", parsedData);
        return parsedData;
    } catch (error) {
        console.error("❌ CSV Load Error:", error);
        return [];
    }
}


const storyAndSelection = {
    type: htmlButtonResponse,
    stimulus: function() {
        return `
            <div id="content-container">
                <div id="story-container">
                    <p id="story-text">${jsPsych.timelineVariable("story")}</p>
                </div>
                <div class="button-container">
                    <button class="sound-btn" id="btn-1" disabled>1</button>
                    <button class="sound-btn" id="btn-2" disabled>2</button>
                    <button class="sound-btn" id="btn-3" disabled>3</button>
                    <button class="sound-btn" id="btn-4" disabled>4</button>
                </div>
            </div>
        `;
    },
    choices: [],
    button_html: function(choice, choice_index) {
        return `<button class="jspsych-btn sound-btn disabled no-hover" id="btn-${choice_index + 1}" disabled data-index="${choice_index}">${choice}</button>`;
    },
    on_load: function () {

        if (q.block === "faces" || q.block === "bodies") {
            document.body.classList.add(`${q.block}-block`); // Apply correct class
        } else {
            document.body.classList.remove("faces-block", "bodies-block"); // Ensure cleanup
        }

        jsPsych.getDisplayElement().addEventListener("jspsych-trial-end", function () {
            document.body.classList.remove("faces-block");  // Remove after the trial ends
        });
        
        console.log("🚀 Trial started! Checking content...");
    
        // Log the raw HTML
        console.log("🔎 jsPsych Content:", document.querySelector(".jspsych-content")?.innerHTML);
        
        // Check for #content-container
        if (!document.querySelector("#content-container")) {
            console.error("❌ #content-container is MISSING!");
        } else {
            console.log("✅ #content-container is present.");
        }

        const btns = document.querySelectorAll(".sound-btn");
    
        // Ensure #content-container exists
        setTimeout(() => {
            let contentContainer = document.querySelector("#content-container");
            if (!contentContainer) {
                console.log("❌ #content-container is missing! Manually adding it.");
    
                // Create the container
                contentContainer = document.createElement("div");
                contentContainer.id = "content-container";
                contentContainer.style.cssText = `
                    max-width: 800px;
                    width: 90%;
                    padding: 30px;
                    background: white;
                    border-radius: 20px;
                    box-shadow: 6px 6px 15px rgba(0, 0, 0, 0.2);
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    position: relative;
                `;
    
                // Find story and button container
                const storyContainer = document.querySelector("#story-container");
                const buttonContainer = document.querySelector(".button-container");
    
                // Move them inside #content-container
                if (storyContainer && buttonContainer) {
                    contentContainer.appendChild(storyContainer);
                    contentContainer.appendChild(buttonContainer);
                }
    
                // Inject into jsPsych content
                const jspsychContent = document.querySelector(".jspsych-content");
                if (jspsychContent) {
                    jspsychContent.prepend(contentContainer);
                    console.log("✅ #content-container manually added.");
                }
            } else {
                console.log("✅ #content-container already exists.");
            }
        }, 500); // Short delay to ensure jsPsych has loaded
    
        // Disable buttons initially
        btns.forEach(btn => {
            btn.classList.add("disabled", "no-hover");
            btn.setAttribute("disabled", "true");
        });
    
       // Play the story audio
        console.log(`🎵 Attempting to play: audio/${q.story_audio}`);
        console.log(`🔍 jsPsych.timelineVariable("audioFile"): ${jsPsych.timelineVariable("audioFile")}`);

        let storyAudio = new Audio(`audio/${q.story_audio}`);  // ✅ FIXED: Always use q.story_audio
        storyAudio.play();

        storyAudio.onended = function () {
            console.log("📢 Story finished, starting sequential playback.");

            playSoundsSequentially(q.sounds, () => {
                console.log("✅ Sequential playback finished, enabling hover play & selection.");

                enableButtonsWithFade(btns); // Enable buttons with fade
                enableHoverPlay(q.sounds); // Restore hover play
            });
        };
    
        // ✅ Block button selection until `answerSelectionEnabled = true`
        btns.forEach(btn => {
            btn.addEventListener("click", function(event) {
                console.log(`🖱️ Clicked: ${this.id}`);
        
                if (!answerSelectionEnabled) {
                    event.preventDefault();
                    console.log("🚫 Selection blocked! answerSelectionEnabled is FALSE");
                } else {
                    console.log(`✅ Button ${this.id} clicked! Processing response...`);
        
                    // ✅ Store the correct response in jsPsych's data
                    const chosenIndex = parseInt(this.dataset.index); // Extract from button data-index
        
                    console.log("🔢 Storing response:", chosenIndex);
        
                    jsPsych.finishTrial({ response: chosenIndex }); // ✅ Store choice in jsPsych
                }
            });
        });
    },
    on_finish: function(data) {
        console.log("🔎 on_finish triggered!");
        console.log("User response:", data.response);
    
        if (!answerSelectionEnabled) {
            console.log("🚫 Trial blocked from finishing!");
            return false; // Prevent trial from ending early
        }
    
        console.log("✅ Trial finished successfully!");
    }
};

// Function to create jsPsych trials dynamically
async function createTrials() {
    const questions = await loadQuestions();
    
    if (questions.length === 0) {
        console.error("❌ No questions loaded! Cannot proceed.");
        return;
    }

    // 1️⃣ Group Questions by Block
    const blocks = {
        voices: [],
        faces: [],
        bodies: []
    };

    questions.forEach(q => {
        if (blocks[q.block]) {
            blocks[q.block].push(q);
        } else {
            console.error(`⚠️ Unknown block type: ${q.block}`);
        }
    });

    // 2️⃣ Shuffle the Block Order
    const blockOrder = Object.keys(blocks).sort(() => Math.random() - 0.5);

    // 3️⃣ Build the Experiment Timeline
    const timeline = [
        {
            type: htmlButtonResponse,
            stimulus: "<p>Welcome to the study! Press 'Start' to begin.</p>",
            choices: ["Start"]
        }
    ];

    console.log("🔀 Block Order:", blockOrder);
    console.log("📦 Blocks:", blocks);

    blockOrder.forEach(block => {

        console.log(`🚀 Processing block: ${block}`);
        console.log(`📋 Found ${blocks[block].length} questions in ${block}`);

        if (blocks[block].length === 0) {
            console.warn(`⚠️ Skipping empty block: ${block}`);
            return; // Skip empty blocks
        }

        if (blocks[block].length === 0) return; // Skip empty blocks

        // 4️⃣ Add Instructions for Each Block
        timeline.push({
            type: htmlButtonResponse,
            stimulus: `<p>Instructions for the ${block} block.</p>`,
            choices: ["Continue"]
        });

        // 5️⃣ Shuffle Questions within the Block
        const shuffledQuestions = blocks[block].sort(() => Math.random() - 0.5);

        shuffledQuestions.forEach(q => {
            console.log(`➕ Adding question: ${q.story}`)
            timeline.push({
                timeline: [
                    {
                        type: htmlButtonResponse,
                        stimulus: `
                            <div id="content-container" class="${q.block}-container">
                                ${
                                    q.block === "bodies"
                                    ? `
                                        <div class="bodies-flex-container">
                                            <div id="story-container" class="bodies-story">
                                                <p id="story-text">${q.story}</p>
                                            </div>
                                            <div class="bodies-images">
                                                <img class="body-option" id="btn-1" src="bodies/${q.sounds[0]}" data-index="0" />
                                                <img class="body-option" id="btn-2" src="bodies/${q.sounds[1]}" data-index="1" />
                                                <img class="body-option" id="btn-3" src="bodies/${q.sounds[2]}" data-index="2" />
                                                <img class="body-option" id="btn-4" src="bodies/${q.sounds[3]}" data-index="3" />
                                            </div>
                                        </div>
                                    `
                                    : q.block === "faces"
                                    ? `
                                        <div id="story-container">
                                            <p id="story-text">${q.story}</p>
                                        </div>
                                        <div class="button-container">
                                            <img class="face-option" id="btn-1" src="faces/${q.sounds[0]}" data-index="0" />
                                            <img class="face-option" id="btn-2" src="faces/${q.sounds[1]}" data-index="1" />
                                            <img class="face-option" id="btn-3" src="faces/${q.sounds[2]}" data-index="2" />
                                            <img class="face-option" id="btn-4" src="faces/${q.sounds[3]}" data-index="3" />
                                        </div>
                                    `
                                    : `
                                        <div id="story-container">
                                            <p id="story-text">${q.story}</p>
                                        </div>
                                        <div class="button-container">
                                            <button class="sound-btn" id="btn-1" disabled>1</button>
                                            <button class="sound-btn" id="btn-2" disabled>2</button>
                                            <button class="sound-btn" id="btn-3" disabled>3</button>
                                            <button class="sound-btn" id="btn-4" disabled>4</button>
                                        </div>
                                    `
                                }
                            </div>
                        `,
                        choices: [],
                        on_load: function () {

                            // Determine if the current block is "faces"
                            if (q.block === "faces" || q.block === "bodies") {
                                document.body.classList.add(`${q.block}-block`); // Apply correct class
                            } else {
                                document.body.classList.remove("faces-block", "bodies-block"); // Ensure cleanup
                            }

                            // Add event listener to clean up after trial ends
                            jsPsych.getDisplayElement().addEventListener("jspsych-trial-end", function () {
                                document.body.classList.remove("faces-block");  // Remove after the trial ends
                            });
                            // Select both buttons (for voices/bodies) and images (for faces)
                            const btns = document.querySelectorAll(".sound-btn, .face-option, .body-option");
                        
                            // Disable all options initially
                            btns.forEach((btn, index) => {
                                btn.dataset.index = index;
                                btn.classList.add("disabled", "no-hover");
                                btn.setAttribute("disabled", "true");
                            });
                        
                            // Play the story audio
                            let storyAudio = new Audio(`audio/${q.audioFile}`);
                            console.log(`🎵 Attempting to play: audio/${q.audioFile}`);
                            storyAudio.play();
                        
                            storyAudio.onended = function () {
                                console.log("📢 Story finished.");
                            
                                if (q.block === "faces" || q.block === "bodies") {
                                    console.log(`🖼️ ${q.block} block detected! Enabling images.`);
                                    enableSelection(btns); // Enable selection immediately for images
                                } else {
                                    console.log("🎵 Playing sequential sounds for non-image blocks.");
                                    playSoundsSequentially(q.sounds, () => {
                                        enableSelection(btns);
                                        enableHoverPlay(q.sounds); // ✅ Restore hover play for voices
                                    });
                                }
                            };
                        
                            // ✅ Function to enable buttons or images after the appropriate delay
                            function enableSelection(btns) {
                                btns.forEach(btn => {
                                    btn.classList.remove("disabled", "no-hover");
                                    btn.removeAttribute("disabled");
                                    btn.style.cursor = "pointer"; // Ensure cursor changes properly
                                });
                        
                                answerSelectionEnabled = true; // ✅ Allow selections
                                console.log("🟢 answerSelectionEnabled set to true.");
                            }
                        
                            // ✅ Handle both button & image selection
                            btns.forEach(btn => {
                                btn.addEventListener("click", function(event) {
                                    if (!answerSelectionEnabled) {
                                        event.preventDefault();
                                        console.log("🚫 Selection blocked until ready.");
                                        return;
                                    }
                            
                                    const chosenIndex = parseInt(this.dataset.index);
                                    if (!isNaN(chosenIndex)) {
                                        console.log(`✅ Selected choice: ${chosenIndex}, File: ${q.sounds[chosenIndex]}`);
                                        jsPsych.finishTrial({ 
                                            selected_choice: chosenIndex,
                                            selected_file: q.sounds[chosenIndex] 
                                        });
                                    }
                                });
                            });
                        },
                        on_finish: function(data) {
                            console.log("🔎 on_finish triggered!");
                        
                            const lastChoiceIndex = data.selected_choice; // The index the participant selected
                        
                            if (lastChoiceIndex === undefined) {
                                console.error("❌ ERROR: No response recorded!");
                                return;
                            }
                        
                            // ✅ Clear old event listeners to prevent duplicate confirmation screens
                            jsPsych.getDisplayElement().replaceChildren();
                        
                            // ✅ Store all relevant fields from the CSV
                            data.story = q.story;
                            data.story_audio = q.audioFile;
                            data.option1 = q.sounds[0];
                            data.option2 = q.sounds[1];
                            data.option3 = q.sounds[2];
                            data.option4 = q.sounds[3];
                            data.correct_index = q.correctIndex;
                            data.correct_response = q.sounds[q.correctIndex]; // Store the correct answer text
                            data.selected_index = lastChoiceIndex;
                            data.selected_response = q.sounds[lastChoiceIndex]; // Store the participant's choice text
                            data.confirmation_text = q.confirmText;
                            data.confirmation_audio = q.confirmSound;
                            data.block = q.block;
                        
                            console.log("✅ Trial data recorded:", data);
                        }
                    },
                    {
                        type: htmlButtonResponse,
                        stimulus: function() {
                            const lastTrialData = jsPsych.data.get().last(1).values()[0];
                        
                            if (!lastTrialData || lastTrialData.selected_choice === undefined) {
                                console.error("❌ ERROR: No previous selection found!");
                                return `<p>Error: Could not load confirmation.</p>`;
                            }
                        
                            console.log("📝 Using last trial data for confirmation:", lastTrialData);
                        
                            // Choose the correct class for the confirmation image
                            let confirmationImageClass = "";
                            if (lastTrialData.block === "faces") {
                                confirmationImageClass = "faces-confirmation";
                            } else if (lastTrialData.block === "bodies") {
                                confirmationImageClass = "bodies-confirmation";
                            }
                        
                            return `
                                <div id="content-container">
                                    <div id="story-container">
                                        <p id="story-text">${lastTrialData.confirmation_text}</p>
                                    </div>
                                    <div class="confirmation-container">
                                        ${
                                            lastTrialData.block === "faces"
                                                ? `<img class="confirmation-img ${confirmationImageClass}" src="faces/${lastTrialData.selected_response}" />`
                                                : lastTrialData.block === "bodies"
                                                    ? `<img class="confirmation-img ${confirmationImageClass}" src="bodies/${lastTrialData.selected_response}" />`
                                                    : ""
                                        }
                                    </div>
                                    <div class="button-container">
                                        <button class="confirm-btn" id="confirm-yes">✅ Yes</button>
                                        <button class="confirm-btn" id="confirm-no">❌ No</button>
                                    </div>
                                </div>
                            `;
                        },
                        choices: [],
                        on_load: function() {
                            console.log("🟢 Confirmation page loaded, waiting for user input.");
                        
                            // Ensure buttons exist before adding event listeners
                            const confirmYes = document.getElementById("confirm-yes");
                            const confirmNo = document.getElementById("confirm-no");
                        
                            if (!confirmYes || !confirmNo) {
                                console.error("❌ ERROR: Confirmation buttons are missing!");
                                return;
                            }
                        
                            // ✅ Remove existing event listeners to prevent duplicates
                            confirmYes.replaceWith(confirmYes.cloneNode(true));
                            confirmNo.replaceWith(confirmNo.cloneNode(true));
                        
                            // ✅ Re-select buttons after cloning
                            document.getElementById("confirm-yes").addEventListener("click", () => {
                                console.log("✅ User confirmed choice!");
                                jsPsych.finishTrial({ confirmed: true });
                            });
                        
                            document.getElementById("confirm-no").addEventListener("click", () => {
                                console.log("❌ User chose to reselect!");
                                jsPsych.finishTrial({ confirmed: false });
                            });
                        
                            console.log("✅ Event listeners attached to confirmation buttons.");
                        },
                        on_start: function() {
                            const lastTrialData = jsPsych.data.get().last(1).values()[0];  // ✅ Fetch correct last response
                        
                            if (!lastTrialData || lastTrialData.selected_choice === undefined) {
                                console.error("❌ ERROR: No selected choice found!");
                                return;
                            }
                        
                            console.log(`🎵 Playing confirmation audio: audio/${lastTrialData.confirmation_audio}`);
                        
                            let confirmAudio = new Audio(`audio/${lastTrialData.confirmation_audio}`);
                            confirmAudio.play();
                        
                            confirmAudio.onended = function () {
                                console.log(`🔊 Now playing selected choice: ${lastTrialData.selected_response}`);
                                
                                // ✅ Only play audio for voices, skip for faces/bodies
                                if (lastTrialData.block === "voices") {
                                    let selectedSound = new Audio(`audio/${lastTrialData.selected_response}`);
                                    selectedSound.play().catch(error => console.error("❌ Error playing selected choice:", error));
                                } else {
                                    console.log("🖼️ No audio to play for faces/bodies.");
                                }
                            };
                        }
                    }
                ],
                loop_function: function(data) {
                    const lastTrialData = jsPsych.data.get().last(1).values()[0];
                
                    // Prevent accidental looping for wrong blocks
                    if (!lastTrialData || typeof lastTrialData.confirmed === "undefined") {
                        console.error("❌ Loop function error: No confirmation data found.");
                        return false; // ✅ Don't loop, move to the next trial
                    }
                
                    return lastTrialData.confirmed === false; // ✅ Only repeat if the user selected "No"
                }
            });
        });
    });

    // 6️⃣ Add the Final Thank You Message
    timeline.push({
        type: htmlButtonResponse,
        stimulus: "<p>Thank you for participating! Click below to download your data.</p>",
        choices: ["Download Data"],
        on_finish: function() {
            jsPsych.data.get().localSave('csv', 'experiment_data.csv');
        }
    });

    console.log("📋 Constructed timeline before running jsPsych:", timeline);


    jsPsych.run(timeline);
}


// Function to play the story and manage button activation
function playStoryAndManageButtons(q, btns) {
    let storyAudio = new Audio(`audio/${q.audioFile}`);
    console.log(`🎙️ Playing story: ${q.audioFile}`);

    storyAudio.play().catch(error => console.error("Audio playback error:", error));

    storyAudio.onended = function () {
        console.log("📢 Story finished, starting sequential playback.");
        playSoundsSequentially(q.sounds, () => {
            console.log("✅ Sequential playback finished, enabling hover play & selection.");
            enableButtonsWithFade(btns);
            enableHoverPlay(q.sounds);
        });
    };
}

// Function to enable buttons with a fade-in effect
function enableButtonsWithFade(btns) {
    console.log("🎭 Enabling buttons...");

    btns.forEach(btn => {
        btn.classList.remove("disabled", "no-hover");
        btn.removeAttribute("disabled");
        btn.style.transition = "opacity 0.6s ease-in-out"; 
        btn.style.opacity = "1"; 
        console.log(`✅ Enabled button: ${btn.id}`);
    });
}

// Function to play sounds sequentially, then trigger a callback when done
function playSoundsSequentially(sounds, onComplete) {
    let index = 0;
    let totalDuration = 0;

    console.log("🎵 Starting sequential playback...");
    
    // 🚫 Grey out and disable all buttons
    const btns = document.querySelectorAll(".sound-btn");
    btns.forEach(btn => {
        btn.classList.add("disabled", "no-hover");
        btn.setAttribute("disabled", "true");
        btn.style.opacity = "0.5"; // Make buttons visibly greyed-out
    });

    function playNextSound() {
        if (index >= sounds.length) {
            console.log(`✅ All sounds played. Total duration: ${totalDuration}ms`);

            // 🟢 Enable buttons after last sound plays
            enableButtonsWithFade(btns);
            answerSelectionEnabled = true;
            console.log("🟢 answerSelectionEnabled set to:", answerSelectionEnabled);
            onComplete();
            return;
        }

        document.querySelectorAll(".sound-btn").forEach(btn => btn.classList.remove("highlight"));
        const btn = document.getElementById(`btn-${index + 1}`);

        // ✅ Even if `no-hover` is set, manually apply highlight class
        if (btn) {
            btn.classList.add("highlight");
        }

        const audio = new Audio(`audio/${sounds[index]}`);
        console.log(`🔊 Playing sound ${index + 1}: ${sounds[index]}`);

        audio.onloadedmetadata = function () {
            totalDuration += audio.duration * 1000;
        };

        audio.play();

        audio.onended = function () {
            if (btn) btn.classList.remove("highlight");
            index++;
            playNextSound();
        };
    }

    playNextSound();
}

// Restore play-on-hover after sequential sounds finish
function enableHoverPlay(sounds) {
    console.log("🎧 Enabling hover play for sounds:", sounds);
    
    let currentAudio = null;

    sounds.forEach((sound, index) => {
        const btn = document.getElementById(`btn-${index + 1}`);
        if (!btn) {
            console.warn(`⚠️ Button btn-${index + 1} not found for hover play`);
            return;
        }

        btn.onmouseenter = () => {
            if (currentAudio) {
                currentAudio.pause();
                currentAudio.currentTime = 0;
            }
            console.log(`🔊 Hover play: ${sound}`);
            currentAudio = new Audio(`audio/${sound.trim()}`);
            currentAudio.play();
        };

        btn.onmouseleave = () => {
            if (currentAudio) {
                currentAudio.pause();
                currentAudio.currentTime = 0;
            }
        };
    });
}

// Ensure fade-in effect is properly applied in CSS
document.addEventListener("DOMContentLoaded", () => {
    const style = document.createElement("style");
    style.innerHTML = `
        .enabled {
            transition: opacity 0.5s ease-in-out;
            opacity: 1 !important;
        }
        .sound-btn {
            opacity: 0; /* Start hidden */
        }
    `;
    document.head.appendChild(style);
});


let hoverEnabled = false; // Controls hover play behavior
let answerSelectionEnabled = false; // Controls when answers can be selected





const confirmChoice = {
    type: htmlButtonResponse,
    stimulus: function() {
        const lastChoice = jsPsych.data.get().last(1).values()[0].selected_choice;
        
        if (isNaN(lastChoice)) {
            console.error("❌ ERROR: lastChoice is NaN!"); 
            return `<p>Error: Could not load confirmation text.</p>`;
        }

        return `
            <div id="content-container">
                <div id="story-container">
                    <p id="story-text">You selected option ${lastChoice + 1}. Are you sure about your choice?</p>
                </div>
                <div class="button-container">
                    <button class="confirm-btn yes-btn" id="confirm-yes">
                        ✅ Yes
                    </button>
                    <button class="confirm-btn no-btn" id="confirm-no">
                        ❌ No
                    </button>
                </div>
            </div>
        `;
    },
    choices: [],
    on_start: function() {
        const lastChoice = jsPsych.data.get().last(1).values()[0]?.selected_choice;
        if (lastChoice === undefined) {
            console.error("❌ ERROR: No selected choice found!");
            return;
        }
    
        const lastTrialData = jsPsych.data.get().last(1).values()[0];
        if (!lastTrialData) {
            console.error("❌ No previous trial data available for confirmation.");
            return;
        }

        console.log(`🎵 Playing confirmation audio: audio/${lastTrialData.confirmation_audio}`);
        let confirmAudio = new Audio(`audio/${lastTrialData.confirmation_audio}`);
        confirmAudio.play();
        confirmAudio.onended = function () {
            if (lastTrialData.block === "voices") {
                console.log(`🔊 Now playing selected choice: audio/${lastTrialData.selected_response}`);
                let selectedSound = new Audio(`audio/${lastTrialData.selected_response}`);
                selectedSound.play().catch(error => console.error("❌ Error playing selected choice:", error));
            } else {
                console.log("🖼️ No additional audio to play for faces/bodies.");
            }
        };
    },
    on_load: function() {
        console.log("🔄 Confirmation screen loaded.");

        document.getElementById("confirm-yes").addEventListener("click", () => {
            console.log("✅ User confirmed choice!");
            jsPsych.finishTrial({ confirmed: true });
        });

        document.getElementById("confirm-no").addEventListener("click", () => {
            console.log("❌ User chose to reselect!");
            jsPsych.finishTrial({ confirmed: false });
        });
    }
};


const selectionLoop = {
    timeline: [storyAndSelection, confirmChoice],
    loop_function: function() {
        const lastTrialData = jsPsych.data.get().last(1).values();
        return lastTrialData.length > 0 && lastTrialData[0].response === 1; // 🔄 Repeat if "Choose Again" was selected
    }
};

// Load and start the experiment
createTrials();