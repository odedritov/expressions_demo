import { initJsPsych } from "jspsych";
import htmlButtonResponse from "@jspsych/plugin-html-button-response";
import audioKeyboardResponse from "@jspsych/plugin-audio-keyboard-response";

// Initialize jsPsych
const jsPsych = initJsPsych();

// Function to load and parse CSV
async function loadQuestions() {
    const response = await fetch("voice_questions.csv");
    const text = await response.text();
    const rows = text.trim().split("\n").slice(1); // Trim whitespace & skip header

    const parsedData = rows.map((row, index) => {
        const columns = row.split(",");
        
        console.log(`Row ${index + 1}:`, columns); // Log CSV row

        if (columns.length < 7) { // Ensure all fields exist
            console.error(`Row ${index + 1} is incomplete:`, row);
            return null; // Skip incomplete rows
        }

        const [story, sound1, sound2, sound3, sound4, correctIndex, audioFile] = columns.map(col => col.trim());

        const questionObject = {
            story: story.replace(/"/g, ""), // Remove extra quotes
            sounds: [sound1, sound2, sound3, sound4],
            correctIndex: parseInt(correctIndex),
            audioFile: audioFile
        };

        console.log(`Parsed question ${index + 1}:`, questionObject); // Debugging log

        return questionObject;
    }).filter(q => q !== null); // Remove any invalid rows

    console.log("Final Parsed Questions Array:", parsedData);
    return parsedData;
}


const storyAndSelection = {
    type: htmlButtonResponse,
    stimulus: function() {
        return `<p id="story-text">${jsPsych.timelineVariable("story")}</p>`;
    },
    choices: ["1", "2", "3", "4"],
    button_html: function(choice, choice_index) {
        return `<button class="jspsych-btn sound-btn disabled no-hover" id="btn-${choice_index + 1}" disabled data-index="${choice_index}">${choice}</button>`;
    },
    on_load: function () {
        const btns = document.querySelectorAll(".sound-btn");

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
                if (!answerSelectionEnabled) {
                    event.preventDefault(); // 🚫 Block selection if not enabled
                    console.log("Answer selection blocked! Waiting for sounds to finish.");
                }
            });
        });
    },
    on_finish: function(data) {
        if (!answerSelectionEnabled) {
            return false; // Prevent trial from ending early
        }
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
                    stimulus: `<p id="story-text">${q.story}</p>`,
                    choices: ["1", "2", "3", "4"],
                    button_html: function(choice, choice_index) {
                        return `<button class="jspsych-btn sound-btn disabled no-hover" id="btn-${choice_index + 1}" disabled>${choice}</button>`;
                    },
                    on_load: function () {
                        const jspsychContent = document.querySelector(".jspsych-content");

                        // Create a button container
                        const buttonContainer = document.createElement("div");
                        buttonContainer.classList.add("button-container");

                        // Move buttons inside the container BEFORE modifying jspsych-content
                        document.querySelectorAll(".jspsych-btn").forEach(btn => buttonContainer.appendChild(btn));

                        // Keep the story text visible, just append buttons below
                        const storyContainer = document.querySelector("#story-container") || jspsychContent;
                        storyContainer.appendChild(buttonContainer);

                        // Disable buttons initially
                        const btns = document.querySelectorAll(".sound-btn");
                        btns.forEach(btn => {
                            btn.classList.add("disabled", "no-hover");
                            btn.setAttribute("disabled", "true");
                        });

                        // Play the story audio
                        let storyAudioPath = `audio/${q.audioFile}`;
                        console.log("Attempting to play:", storyAudioPath);

                        let storyAudio = new Audio(storyAudioPath);
                        storyAudio.play().catch(error => console.error("Audio playback error:", error));

                        // When story ends, start playing sounds sequentially first
                        storyAudio.onended = function () {
                            console.log("📢 Story finished, starting sequential playback.");
                            
                            playSoundsSequentially(q.sounds, () => {
                                console.log("✅ Sequential playback finished, enabling hover play & selection.");
                                
                                enableButtonsWithFade(btns); // Enable buttons with fade
                                enableHoverPlay(q.sounds); // Restore hover play
                            });
                        };
                    },
                    on_finish: function (data) {
                        data.selected_choice = data.response; // Store selection
                        data.correct = data.response == q.correctIndex; // Mark correctness
                    }
                },
                {
                    type: htmlButtonResponse,
                    stimulus: function() {
                        const lastChoice = jsPsych.data.get().last(1).values()[0].selected_choice;
                        return `<p>You selected option ${parseInt(lastChoice) + 1}. Are you sure about your choice?</p>`;
                    },
                    choices: ["Confirm", "Choose Again"],
                    on_start: function() {
                        const lastChoice = jsPsych.data.get().last(1).values()[0].selected_choice;
                        const audio = new Audio(`audio/${q.sounds[lastChoice]}`);
                        audio.play();
                    },
                    on_finish: function (data) {
                        if (data.response === 1) {
                            console.log("User selected 'Choose Again' - replaying question.");
                            data.replay = true; // ✅ Mark for repetition
                        } else {
                            data.replay = false; // ✅ Move on if confirmed
                        }
                    }
                }
            ],
            loop_function: function() {
                const lastTrialData = jsPsych.data.get().last(1).values();
                return lastTrialData.length > 0 && lastTrialData[0].replay === true; // ✅ Repeat if "Choose Again" is selected
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

    // Start the experiment
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
    btns.forEach(btn => {
        btn.classList.remove("disabled", "no-hover");
        btn.removeAttribute("disabled");

        btn.style.transition = "opacity 0.6s ease-in-out"; // ✅ Ensure smooth transition
        btn.style.opacity = "1"; // ✅ Fade-in effect
    });
}


// Function to play sounds sequentially, then trigger a callback when done
function playSoundsSequentially(sounds, onComplete) {
    let index = 0;
    let totalDuration = 0; // Store total playback duration

    function playNextSound() {
        if (index >= sounds.length) {
            console.log(`✅ All sounds played. Total duration: ${totalDuration}ms`);
            onComplete(); // ✅ Enable buttons immediately after last sound
            return;
        }

        document.querySelectorAll(".sound-btn").forEach(btn => btn.classList.remove("highlight"));
        const btn = document.getElementById(`btn-${index + 1}`);
        if (btn) btn.classList.add("highlight");

        const audio = new Audio(`audio/${sounds[index]}`);
        console.log(`🔊 Playing sound ${index + 1}: ${sounds[index]}`);

        audio.onloadedmetadata = function () {
            totalDuration += audio.duration * 1000; // Convert to milliseconds
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
        return `<p>You selected option ${parseInt(lastChoice) + 1}. Are you sure about your choice?</p>`;
    },
    choices: ["✅ Confirm", "❌ Choose Again"],
    on_start: function() {
        const lastChoice = jsPsych.data.get().last(1).values()[0].selected_choice;
        const sounds = jsPsych.timelineVariable("sounds");
        const audio = new Audio(`audio/${sounds[lastChoice]}`);
        audio.play();
    },
    on_finish: function(data) {
        if (data.response === 1) { // "Choose Again" was selected
            console.log("User chose to repeat the same question.");
            return true; // 🚀 Instead of advancing, repeat this trial
        }
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