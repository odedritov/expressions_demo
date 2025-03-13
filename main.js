import { initJsPsych } from "jspsych";
import htmlKeyboardResponse from "@jspsych/plugin-html-keyboard-response"; // ✅ Import missing plugin
import htmlButtonResponse from "@jspsych/plugin-html-button-response";
import audioKeyboardResponse from "@jspsych/plugin-audio-keyboard-response";

// Initialize jsPsych
const jsPsych = initJsPsych();

// Instruction Trial
const instruction = {
    type: htmlButtonResponse,
    stimulus: "<p>Press any key to listen to the story.</p>",
    choices: ["Continue"]
};

// Story Audio Trial
const audioTrial = {
    type: audioKeyboardResponse,
    stimulus: "audio/comprehension1.mp3",
    prompt: "<p>Listen to the story...</p>",
    choices: "NO_KEYS",
    trial_ends_after_audio: true
};


const playAllSounds = {
    type: htmlButtonResponse,
    stimulus: "<p>Listen carefully! The sounds will play one by one.</p>",
    choices: ["1", "2", "3", "4"],
    button_html: function (choice, choice_index) {
        return `<button class="jspsych-btn sound-btn" id="btn-${choice_index + 1}">${choice}</button>`;
    },
    on_load: function () {
        const btns = document.querySelectorAll(".jspsych-btn");
        const container = document.createElement("div");
        container.classList.add("button-container");
        btns.forEach(btn => container.appendChild(btn));

        const jspsychContent = document.querySelector(".jspsych-content");
        jspsychContent.innerHTML = "";
        jspsychContent.appendChild(container);

        // Play sounds in order with highlight
        const sounds = [
            "audio/dog.mp3",
            "audio/cat.mp3",
            "audio/cow.mp3",
            "audio/frog.mp3"
        ];
        let delay = 500;

        sounds.forEach((sound, index) => {
            setTimeout(() => {
                document.querySelectorAll(".sound-btn").forEach(btn => btn.classList.remove("highlight"));
                const btn = document.getElementById(`btn-${index + 1}`);
                if (btn) btn.classList.add("highlight");

                const audio = new Audio(sound);
                audio.play();

                setTimeout(() => {
                    if (btn) btn.classList.remove("highlight");
                }, 2000);
            }, delay);
            delay += 2000;
        });
    },
    trial_duration: 9000,
    response_ends_trial: false
};


// Selection Trial AFTER Sounds Play
const audioSelection = {
    type: htmlButtonResponse,
    stimulus: "<p>Which sound matches the story?</p>",
    choices: ["1", "2", "3", "4"],
    button_html: function (choice, choice_index) {
        return `<button class="jspsych-btn sound-btn" id="btn-${choice_index + 1}">${choice}</button>`;
    },
    on_load: function () {
        // Ensure buttons are inside the 2x2 grid container
        const btns = document.querySelectorAll(".jspsych-btn");
        const container = document.createElement("div");
        container.classList.add("button-container");
        btns.forEach(btn => container.appendChild(btn));

        // Insert the grid container inside the experiment display
        const jspsychContent = document.querySelector(".jspsych-content");
        jspsychContent.innerHTML = ""; // Clear previous layout
        jspsychContent.appendChild(container);

        // Audio Hover Logic
        const sounds = [
            "audio/dog.mp3",
            "audio/cat.mp3",
            "audio/cow.mp3",
            "audio/frog.mp3"
        ];
        let currentAudio = null;

        sounds.forEach((sound, index) => {
            const btn = document.getElementById(`btn-${index + 1}`);
            if (btn) {
                btn.addEventListener("mouseenter", () => {
                    if (currentAudio) {
                        currentAudio.pause();
                        currentAudio.currentTime = 0;
                    }
                    currentAudio = new Audio(sound);
                    currentAudio.play();
                });

                btn.addEventListener("mouseleave", () => {
                    if (currentAudio) {
                        currentAudio.pause();
                        currentAudio.currentTime = 0;
                    }
                });
            }
        });
    },
    on_finish: function (data) {
        const selected = data.response;
        jsPsych.data.get().addToLast({ selected_choice: selected });
    }
};


const storyAndSelection = {
    type: htmlButtonResponse,
    stimulus: `
        <div id="story-container">
            <p id="story-text">
                <strong>Which of these four animal sounds comes from a cow?</strong>
            </p>
        </div>
    `,
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
        const storyContainer = document.querySelector("#story-container");
        storyContainer.appendChild(buttonContainer);

        // Disable buttons initially
        const btns = document.querySelectorAll(".sound-btn");
        btns.forEach(btn => {
            btn.classList.add("disabled", "no-hover");
            btn.setAttribute("disabled", "true");
        });

        // Play the story
        let storyAudio = new Audio("audio/comprehension1.mp3");
        storyAudio.play();

        // When story ends, enable buttons and restore hover
        storyAudio.onended = function() {
            btns.forEach(btn => {
                btn.classList.remove("disabled", "no-hover");
                btn.removeAttribute("disabled");
                btn.style.opacity = "1"; // Trigger fade-in
            });

            // Start playing sounds sequentially
            playSoundsSequentially();

            // Enable hover play sounds after story
            enableHoverPlay();
        };
    },
    on_finish: function (data) {
        data.selected_choice = data.response; // Store selection
    }
};

function enableHoverPlay() {
    const sounds = [
        "audio/dog.mp3",
        "audio/cat.mp3",
        "audio/cow.mp3",
        "audio/frog.mp3"
    ];

    let currentAudio = null;

    sounds.forEach((sound, index) => {
        const btn = document.getElementById(`btn-${index + 1}`);
        if (btn) {
            btn.addEventListener("mouseenter", () => {
                if (!btn.classList.contains("no-hover")) { // Prevent hover before story ends
                    if (currentAudio) {
                        currentAudio.pause();
                        currentAudio.currentTime = 0;
                    }
                    currentAudio = new Audio(sound);
                    currentAudio.play();
                }
            });

            btn.addEventListener("mouseleave", () => {
                if (currentAudio) {
                    currentAudio.pause();
                    currentAudio.currentTime = 0;
                }
            });
        }
    });
}


function playSoundsSequentially() {
    const sounds = [
        "audio/dog.mp3",
        "audio/cat.mp3",
        "audio/cow.mp3",
        "audio/frog.mp3"
    ];
    
    let index = 0;

    function playNextSound() {
        if (index >= sounds.length) return; // Stop when done

        document.querySelectorAll(".sound-btn").forEach(btn => btn.classList.remove("highlight"));
        const btn = document.getElementById(`btn-${index + 1}`);
        if (btn) btn.classList.add("highlight");

        const audio = new Audio(sounds[index]);
        audio.play();

        audio.onended = function() {
            if (btn) btn.classList.remove("highlight");
            index++;
            playNextSound(); // Play the next sound after the current one finishes
        };
    }

    playNextSound();
}

// Confirmation Trial
const confirmChoice = {
    type: htmlButtonResponse,
    stimulus: function() {
        const lastChoice = jsPsych.data.get().last(1).values()[0].selected_choice;
        return `<p>You selected option ${parseInt(lastChoice) + 1}. Are you sure?</p>`;
    },
    choices: ["✅ Confirm", "❌ Choose Again"],
    on_start: function() {
        const lastChoice = jsPsych.data.get().last(1).values()[0].selected_choice;
        const sounds = ["audio/dog.mp3", "audio/cat.mp3", "audio/cow.mp3", "audio/frog.mp3"];
        const audio = new Audio(sounds[lastChoice]);
        audio.play();
    },
    on_finish: function (data) {
        data.replay_story = data.response === 1; // Replay if "Choose Again" is selected
    }
};

// Selection Loop
const selectionLoop = {
    timeline: [storyAndSelection, confirmChoice],
    loop_function: function() {
        const lastTrialData = jsPsych.data.get().last(1).values();
        return lastTrialData.length > 0 && lastTrialData[0].replay_story; // 🔄 Replay if "Choose Again" was selected
    }
};


const timeline = [
    instruction,  
    selectionLoop, // 🚀 Handles story playback itself
    {
        type: htmlButtonResponse,
        stimulus: "<p>Thank you for participating! Click below to download your data.</p>",
        choices: ["💾 Download Data"],
        on_finish: function() {
            jsPsych.data.get().localSave('csv', 'experiment_data.csv');
        }
    }
];

// Start the experiment
jsPsych.run(timeline);

console.log(jsPsych.data.get().csv());


// Print the experiment data to the console (for debugging)
jsPsych.data.get().csv(); // Logs data in CSV format
console.log(jsPsych.data.get().json()); // Logs data in JSON format

