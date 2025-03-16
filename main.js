import { initJsPsych } from "jspsych";
import htmlButtonResponse from "@jspsych/plugin-html-button-response";
import audioKeyboardResponse from "@jspsych/plugin-audio-keyboard-response";



// Initialize jsPsych
const jsPsych = initJsPsych();

// Function to load and parse CSV
async function loadQuestions() {
    console.log("📂 Attempting to fetch CSV...");

    const csvPath = "https://odedritov.github.io/expressions_demo/voice_questions.csv"; // FULL URL

    try {
        const response = await fetch(csvPath, { mode: "no-cors" });;

        console.log("📥 Fetch response:", response);

        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const text = await response.text();
        console.log("✅ CSV Loaded:\n", text); // Log CSV contents

        const rows = text.trim().split("\n").slice(1); // Remove header
        console.log("🔍 Parsed Rows:", rows); // Log parsed rows

        if (rows.length === 0) {
            console.error("❌ No rows found in CSV!");
            return [];
        }

        const parsedData = rows.map(row => {
            const columns = row.split(",").map(col => col.trim());
            console.log("➡️ Parsed Columns:", columns);
            return columns;
        });

        return parsedData;
    } catch (error) {
        console.error("❌ CSV Load Error:", error);
        return [];
    }
    const text = await response.text();
    const rows = text.trim().split("\n").slice(1); // Skip header

    const parsedData = rows.map((row, index) => {
        const columns = row.split(",");

        if (columns.length < 9) { // Ensure all fields exist
            console.error(`❌ Row ${index + 1} is incomplete:`, row);
            return null;
        }

        const [story, sound1, sound2, sound3, sound4, correctIndex, audioFile, confirmText, confirmSound] = columns.map(col => col.trim());

        const questionObject = {
            story: story.replace(/"/g, ""), // Remove extra quotes
            sounds: [sound1, sound2, sound3, sound4],
            correctIndex: parseInt(correctIndex),
            audioFile: audioFile,
            confirmText: confirmText.replace(/"/g, ""), // Store confirmation text
            confirmSound: confirmSound // Store confirmation sound file
        };

        console.log(`✅ Loaded question ${index + 1}:`, questionObject);
        return questionObject;
    }).filter(q => q !== null);

    console.log("📋 Final Questions Array:", parsedData);
    return parsedData;
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
        let storyAudio = new Audio(`audio/${jsPsych.timelineVariable("audioFile")}`);
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
    const timeline = [
        {
            type: htmlButtonResponse,
            stimulus: "<p>Press continue to begin the study.</p>",
            choices: ["Continue"]
        }
    ];

    questions.forEach((q, index) => {
        timeline.push({
            timeline: [
                {
                    type: htmlButtonResponse,
                    stimulus: function() {
                        console.log("🔥 Creating question:", q.story);

                        return `
                            <div id="content-container">
                                <div id="story-container">
                                    <p id="story-text">${q.story}</p>
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
                    on_load: function () {
                        console.log("🚀 on_load triggered! Checking content-container...");
                        
                        if (!document.querySelector("#content-container")) {
                            console.error("❌ #content-container is missing!");
                        } else {
                            console.log("✅ #content-container found.");
                        }
                    
                        const btns = document.querySelectorAll(".sound-btn");
                    
                        // ✅ Ensure buttons have correct dataset.index
                        btns.forEach((btn, index) => {
                            btn.dataset.index = index; // Set index correctly
                            btn.classList.add("disabled", "no-hover");
                            btn.setAttribute("disabled", "true");
                        });
                    
                        // Play the story audio
                        let storyAudio = new Audio(`audio/${q.audioFile}`);
                        storyAudio.play();
                    
                        storyAudio.onended = function () {
                            console.log("📢 Story finished, starting sequential playback.");
                            
                            playSoundsSequentially(q.sounds, () => {
                                console.log("✅ Sequential playback finished, enabling hover play & selection.");
                                
                                enableButtonsWithFade(btns);
                                enableHoverPlay(q.sounds);
                            });
                        };
                    
                        // ✅ Handle button selection properly
                        btns.forEach(btn => {
                            btn.addEventListener("click", function(event) {
                                if (!answerSelectionEnabled) {
                                    event.preventDefault();
                                    console.log("Answer selection blocked! Waiting for sounds to finish.");
                                    return;
                                }
                    
                                const chosenIndex = parseInt(this.dataset.index);
                                console.log(`✅ Button ${this.id} clicked! Extracted index: ${chosenIndex}`);
                    
                                if (isNaN(chosenIndex)) {
                                    console.error("❌ ERROR: chosenIndex is NaN! dataset.index is not set correctly.");
                                    return;
                                }
                    
                                // ✅ Store choice in jsPsych trial data
                                jsPsych.finishTrial({ selected_choice: chosenIndex });
                            });
                        });
                    }
                },
                {
                    type: htmlButtonResponse,
                    stimulus: function() {
                        const lastChoice = jsPsych.data.get().last(1).values()[0]?.selected_choice;
                        if (lastChoice === undefined) {
                            console.error("❌ ERROR: lastChoice is undefined!");
                            return `<p>Error: Could not load confirmation text.</p>`;
                        }

                        return `
                            <div id="content-container">
                                <div id="story-container">
                                    <p id="story-text">${q.confirmText}</p>
                                </div>
                                <div class="button-container">
                                    <button class="confirm-btn" id="confirm-yes">✅ Yes</button>
                                    <button class="confirm-btn" id="confirm-no">❌ No</button>
                                </div>
                            </div>
                        `;
                    },
                    choices: [],
                    on_start: function() {
                        const lastChoice = jsPsych.data.get().last(1).values()[0]?.selected_choice;

                        if (lastChoice === undefined) {
                            console.error("❌ ERROR: lastChoice is undefined!");
                            return;
                        }

                        console.log("🎵 Playing confirmation sound:", q.confirmSound);
                        let confirmationSound = new Audio(`audio/${q.confirmSound}`);
                        confirmationSound.play();

                        confirmationSound.onended = function () {
                            console.log("🔊 Confirmation sound finished. Now playing selected option...");

                            let selectedSound = new Audio(`audio/${q.sounds[lastChoice]}`);
                            selectedSound.play();
                        };
                    },
                    on_load: function() {
                        console.log("✅ Confirmation page loaded.");

                        document.getElementById("confirm-yes").addEventListener("click", function() {
                            console.log("✅ User confirmed selection.");
                            jsPsych.finishTrial({ confirmed: true });
                        });

                        document.getElementById("confirm-no").addEventListener("click", function() {
                            console.log("❌ User wants to choose again.");
                            jsPsych.finishTrial({ confirmed: false });
                        });
                    }
                }
            ],
            loop_function: function() {
                const lastTrialData = jsPsych.data.get().last(1).values()[0];

                if (lastTrialData && lastTrialData.confirmed === false) {
                    console.log("🔄 User chose 'No' → Repeating selection.");
                    return true;
                } else {
                    console.log("✅ User confirmed → Moving forward.");
                    return false;
                }
            }
        });
    });

    // **Final Message**
    timeline.push({
        type: htmlButtonResponse,
        stimulus: "<p>Thank you for participating! Click below to download your data.</p>",
        choices: ["Download Data"],
        on_finish: function() {
            jsPsych.data.get().localSave('csv', 'experiment_data.csv');
        }
    });

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
        if (btn) btn.classList.add("highlight");

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
    console.log("🎧 Hover play enabled.");
    let currentAudio = null;

    sounds.forEach((sound, index) => {
        const btn = document.getElementById(`btn-${index + 1}`);
        if (btn) {
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
        }
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
        const lastChoice = jsPsych.data.get().last(1).values()[0].selected_choice;
        const sounds = jsPsych.timelineVariable("sounds");

        console.log(`🎵 Playing confirmation audio for choice: ${lastChoice}`);

        // Play confirmation sound
        let confirmAudio = new Audio(`audio/confirmation.mp3`);
        confirmAudio.play();

        confirmAudio.onended = function () {
            // After confirmation sound, play selected choice sound
            let choiceAudio = new Audio(`audio/${sounds[lastChoice]}`);
            choiceAudio.play();
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