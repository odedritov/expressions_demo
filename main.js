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
                        `,
                        choices: [],
                        on_load: function () {
                            const btns = document.querySelectorAll(".sound-btn");

                            btns.forEach((btn, index) => {
                                btn.dataset.index = index;
                                btn.classList.add("disabled", "no-hover");
                                btn.setAttribute("disabled", "true");
                            });

                            let storyAudio = new Audio(`audio/${q.audioFile}`);  // ✅ Change q.story_audio to q.audioFile
                            console.log(`🎵 Attempting to play: audio/${q.audioFile}`); // ✅ Debugging log
                            storyAudio.play();

                            storyAudio.onended = function () {
                                playSoundsSequentially(q.sounds, () => {
                                    enableButtonsWithFade(btns);
                                    enableHoverPlay(q.sounds);
                                });
                            };

                            btns.forEach(btn => {
                                btn.addEventListener("click", function(event) {
                                    if (!answerSelectionEnabled) {
                                        event.preventDefault();
                                        return;
                                    }

                                    const chosenIndex = parseInt(this.dataset.index);
                                    if (!isNaN(chosenIndex)) {
                                        jsPsych.finishTrial({ selected_choice: chosenIndex });
                                    }
                                });
                            });
                        },
                        on_finish: function(data) {
                            const lastChoiceIndex = data.selected_choice; // The index the participant selected
            
                            if (lastChoiceIndex === undefined) {
                                console.error("❌ ERROR: No response recorded!");
                                return;
                            }
            
                            // Store all relevant fields from the CSV
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
                            const lastChoice = jsPsych.data.get().last(1).values()[0]?.selected_choice;
                            if (lastChoice === undefined) return `<p>Error: Could not load confirmation text.</p>`;

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
                            let confirmAudio = new Audio(`audio/${q.confirmSound}`);
                            confirmAudio.play();

                            confirmAudio.onended = function () {
                                let selectedSound = new Audio(`audio/${q.sounds[lastChoice]}`);
                                selectedSound.play();
                            };
                        },
                        on_load: function() {
                            document.getElementById("confirm-yes").addEventListener("click", () => {
                                jsPsych.finishTrial({ confirmed: true });
                            });

                            document.getElementById("confirm-no").addEventListener("click", () => {
                                jsPsych.finishTrial({ confirmed: false });
                            });
                        }
                    }
                ],
                loop_function: function() {
                    const lastTrialData = jsPsych.data.get().last(1).values()[0];
                    return lastTrialData && lastTrialData.confirmed === false;
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