import { initJsPsych } from "jspsych";
import htmlButtonResponse from "@jspsych/plugin-html-button-response";
import audioKeyboardResponse from "@jspsych/plugin-audio-keyboard-response";

// Initialize jsPsych
const jsPsych = initJsPsych();

// STATE MANAGEMENT - Centralize state variables
const experimentState = {
  answerSelectionEnabled: false,
  currentAudio: null,
  familiarizationAttempt: 0
};

// UTILITY FUNCTIONS - Group all helper functions together
const utils = {
  /**
   * Loads and parses the CSV file containing questions
   */
  async loadQuestions() {
    console.log("📂 Attempting to fetch CSV...");
    const csvPath = "./all_questions.csv"; 
    
    try {
      const response = await fetch(csvPath);
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const text = await response.text();
      console.log("✅ CSV Loaded");

      const rows = text.trim().split("\n").slice(1); 
      if (rows.length === 0) {
        console.error("❌ No rows found in CSV!");
        return [];
      }

      const parsedData = rows.map((row, index) => {
        const columns = row.split(",");

        if (columns.length < 11) {
          console.error(`❌ Row ${index + 1} is incomplete:`, row);
          return null;
        }

        const [story, sound1, sound2, sound3, sound4, correctIndex, audioFile, confirmText, confirmSound, block, isFamiliarizationRaw] = columns.map(col => col.trim());

        return {
          story: story.replace(/"/g, ""), 
          sounds: [sound1, sound2, sound3, sound4],
          correctIndex: parseInt(correctIndex) - 1,
          audioFile: audioFile,
          confirmText: confirmText.replace(/"/g, ""),
          confirmSound: confirmSound,
          block: block,
          isFamiliarization: isFamiliarizationRaw?.toUpperCase() === "TRUE"
        };
      }).filter(q => q !== null);

      console.log("📋 Parsed Questions:", parsedData.length);
      return parsedData;
    } catch (error) {
      console.error("❌ CSV Load Error:", error);
      return [];
    }
  },

  /**
   * Plays sounds sequentially, then executes callback when done
   */
  playSoundsSequentially(sounds, onComplete) {
    let index = 0;
    const btns = document.querySelectorAll(".sound-btn");
    
    // Disable all buttons initially
    btns.forEach(btn => {
      btn.classList.add("disabled", "no-hover");
      btn.setAttribute("disabled", "true");
      btn.style.opacity = "0.5";
    });

    function playNextSound() {
      if (index >= sounds.length) {
        experimentState.answerSelectionEnabled = true;
        onComplete();
        return;
      }

      // Clear previous highlights
      document.querySelectorAll(".sound-btn").forEach(btn => btn.classList.remove("highlight"));
      
      // Highlight current button
      const btn = document.getElementById(`btn-${index + 1}`);
      if (btn) btn.classList.add("highlight");

      // Play current sound
      const audio = new Audio(`audio/${sounds[index]}`);
      audio.play();

      audio.onended = function() {
        if (btn) btn.classList.remove("highlight");
        index++;
        playNextSound();
      };
    }

    playNextSound();
  },

  /**
   * Enables buttons with fade-in animation
   */
  enableButtons(buttons) {
    buttons.forEach(btn => {
      btn.classList.remove("disabled", "no-hover");
      btn.removeAttribute("disabled");
      btn.style.transition = "opacity 0.6s ease-in-out"; 
      btn.style.opacity = "1";
    });
    experimentState.answerSelectionEnabled = true;
  },

  /**
   * Enables hover-play functionality for sound buttons
   */
  enableHoverPlay(sounds) {
    sounds.forEach((sound, index) => {
      const btn = document.getElementById(`btn-${index + 1}`);
      if (!btn) return;

      btn.onmouseenter = () => {
        if (experimentState.currentAudio) {
          experimentState.currentAudio.pause();
          experimentState.currentAudio.currentTime = 0;
        }
        experimentState.currentAudio = new Audio(`audio/${sound.trim()}`);
        experimentState.currentAudio.play();
      };

      btn.onmouseleave = () => {
        if (experimentState.currentAudio) {
          experimentState.currentAudio.pause();
          experimentState.currentAudio.currentTime = 0;
        }
      };
    });
  },

  /**
   * Adds necessary CSS styles to the document
   */
  addStyles() {
    const style = document.createElement("style");
    style.innerHTML = `
      .enabled {
        transition: opacity 0.5s ease-in-out;
        opacity: 1 !important;
      }
      .sound-btn {
        opacity: 0; /* Start hidden */
      }
      .disabled {
        cursor: not-allowed !important;
        opacity: 0.5 !important;
      }
      .highlight {
        background-color: rgba(0, 0, 255, 0.2) !important;
        border-color: blue !important;
      }
      .faces-block .face-option, .bodies-block .body-option {
        cursor: pointer;
        transition: transform 0.2s;
      }
      .faces-block .face-option:hover, .bodies-block .body-option:hover {
        transform: scale(1.05);
      }
    `;
    document.head.appendChild(style);
  }
};

// TRIAL COMPONENTS - Organize trial-related code
const trialComponents = {
  /**
   * Creates the main story and selection trial
   */
  createStoryAndSelectionTrial(question) {
    return {
      type: htmlButtonResponse,
      stimulus: function() {
        // Different HTML structure based on block type
        if (question.block === "bodies") {
          return `
            <div id="content-container" class="bodies-container">
              <div class="bodies-flex-container">
                <div id="story-container" class="bodies-story">
                  <p id="story-text">${question.story}</p>
                </div>
                <div class="bodies-images">
                  <img class="body-option" id="btn-1" src="bodies/${question.sounds[0]}" data-index="0" />
                  <img class="body-option" id="btn-2" src="bodies/${question.sounds[1]}" data-index="1" />
                  <img class="body-option" id="btn-3" src="bodies/${question.sounds[2]}" data-index="2" />
                  <img class="body-option" id="btn-4" src="bodies/${question.sounds[3]}" data-index="3" />
                </div>
              </div>
            </div>
          `;
        } else if (question.block === "faces") {
          return `
            <div id="content-container" class="faces-container">
              <div id="story-container">
                <p id="story-text">${question.story}</p>
              </div>
              <div class="button-container">
                <img class="face-option" id="btn-1" src="faces/${question.sounds[0]}" data-index="0" />
                <img class="face-option" id="btn-2" src="faces/${question.sounds[1]}" data-index="1" />
                <img class="face-option" id="btn-3" src="faces/${question.sounds[2]}" data-index="2" />
                <img class="face-option" id="btn-4" src="faces/${question.sounds[3]}" data-index="3" />
              </div>
            </div>
          `;
        } else {
          return `
            <div id="content-container">
              <div id="story-container">
                <p id="story-text">${question.story}</p>
              </div>
              <div class="button-container">
                <button class="sound-btn" id="btn-1" disabled>1</button>
                <button class="sound-btn" id="btn-2" disabled>2</button>
                <button class="sound-btn" id="btn-3" disabled>3</button>
                <button class="sound-btn" id="btn-4" disabled>4</button>
              </div>
            </div>
          `;
        }
      },
      choices: [],
      on_load: function() {
        // Set appropriate body class for styling
        if (question.block === "faces" || question.block === "bodies") {
          document.body.classList.add(`${question.block}-block`);
        } else {
          document.body.classList.remove("faces-block", "bodies-block");
        }

        // Clean up after trial ends
        jsPsych.getDisplayElement().addEventListener("jspsych-trial-end", function() {
          document.body.classList.remove("faces-block", "bodies-block");
        });

        // Reset selection state
        experimentState.answerSelectionEnabled = false;

        // Select all interactive elements
        const options = document.querySelectorAll(".sound-btn, .face-option, .body-option");
        
        // Disable all options initially
        options.forEach((option, index) => {
          option.dataset.index = index;
          option.classList.add("disabled", "no-hover");
          option.setAttribute("disabled", "true");
        });
        
        // Play the story audio
        let storyAudio = new Audio(`audio/${question.audioFile}`);
        console.log(`🎵 Playing story audio: audio/${question.audioFile}`);
        storyAudio.play();
        
        storyAudio.onended = function() {
          console.log("📢 Story audio finished");
        
          if (question.block === "faces" || question.block === "bodies") {
            console.log(`🖼️ ${question.block} block - enabling images`);
            utils.enableButtons(options);
          } else {
            console.log("🎵 Voice block - playing sequential sounds");
            utils.playSoundsSequentially(question.sounds, () => {
              utils.enableButtons(options);
              utils.enableHoverPlay(question.sounds);
            });
          }
        };
        
        // Set up click event handlers
        options.forEach(option => {
          option.addEventListener("click", function(event) {
            if (!experimentState.answerSelectionEnabled) {
              event.preventDefault();
              console.log("🚫 Selection blocked - not enabled yet");
              return;
            }
        
            const chosenIndex = parseInt(this.dataset.index);
            if (!isNaN(chosenIndex)) {
              console.log(`✅ Selected option ${chosenIndex + 1}`);
              jsPsych.finishTrial({
                selected_choice: chosenIndex,
                selected_file: question.sounds[chosenIndex]
              });
            }
          });
        });
      },
      on_finish: function(data) {
        const chosenIndex = data.selected_choice;
        
        if (chosenIndex === undefined) {
          console.error("❌ No response recorded!");
          return;
        }
        
        // Store all relevant data
        data.story = question.story;
        data.story_audio = question.audioFile;
        data.option1 = question.sounds[0];
        data.option2 = question.sounds[1];
        data.option3 = question.sounds[2];
        data.option4 = question.sounds[3];
        data.correct_index = question.correctIndex;
        data.correct_response = question.sounds[question.correctIndex];
        data.selected_index = chosenIndex;
        data.selected_response = question.sounds[chosenIndex];
        data.confirmation_text = question.confirmText;
        data.confirmation_audio = question.confirmSound;
        data.block = question.block;
        data.isFamiliarization = question.isFamiliarization;
        
        console.log("✅ Trial data recorded");
      }
    };
  },

  /**
   * Creates the confirmation trial
   */
  createConfirmationTrial() {
    return {
      type: htmlButtonResponse,
      stimulus: function() {
        const lastTrialData = jsPsych.data.get().last(1).values()[0];
        
        if (!lastTrialData || lastTrialData.selected_choice === undefined) {
          console.error("❌ No previous selection found!");
          return `<p>Error: Could not load confirmation.</p>`;
        }
        
        let confirmationImage = "";
        if (lastTrialData.block === "faces") {
          confirmationImage = `<img class="confirmation-img faces-confirmation" src="faces/${lastTrialData.selected_response}" />`;
        } else if (lastTrialData.block === "bodies") {
          confirmationImage = `<img class="confirmation-img bodies-confirmation" src="bodies/${lastTrialData.selected_response}" />`;
        }
        
        return `
          <div id="content-container">
            <div id="story-container">
              <p id="story-text">${lastTrialData.confirmation_text}</p>
            </div>
            <div class="confirmation-container">
              ${confirmationImage}
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
        const confirmYes = document.getElementById("confirm-yes");
        const confirmNo = document.getElementById("confirm-no");
        
        if (!confirmYes || !confirmNo) {
          console.error("❌ Confirmation buttons are missing!");
          return;
        }
        
        // Clone buttons to remove old event listeners
        confirmYes.replaceWith(confirmYes.cloneNode(true));
        confirmNo.replaceWith(confirmNo.cloneNode(true));
        
        const yesBtn = document.getElementById("confirm-yes");
        const noBtn = document.getElementById("confirm-no");
        
        const lastTrial = jsPsych.data.get().last(1).values()[0];
        const isFamiliarization = lastTrial.isFamiliarization;
        const wasCorrect = lastTrial.selected_index === lastTrial.correct_index;
        
        yesBtn.addEventListener("click", () => {
          console.log("✅ User confirmed choice");
        
          if (isFamiliarization) {
            const attempt = experimentState.familiarizationAttempt || 1;
            const shouldRepeat = !wasCorrect && attempt === 1;
        
            const audioFile = shouldRepeat
              ? "audio/confirmation_repeat.mp3"
              : "audio/confirmation_go.mp3";
        
            const audio = new Audio(audioFile);
            audio.play();
        
            audio.onended = () => {
              jsPsych.finishTrial({
                confirmed: !shouldRepeat,
                familiarizationAttempt: attempt,
                familiarizationCorrect: wasCorrect,
                familiarizationRepeat: shouldRepeat
              });
            };
          } else {
            jsPsych.finishTrial({ confirmed: true });
          }
        });
        
        noBtn.addEventListener("click", () => {
          console.log("❌ User chose to reselect");
          jsPsych.finishTrial({
            confirmed: false,
            familiarizationRepeat: true
          });
        });
      },
      on_start: function() {
        const lastTrial = jsPsych.data.get().last(1).values()[0];
        
        // Track familiarization attempts
        if (lastTrial.isFamiliarization) {
          experimentState.familiarizationAttempt = (experimentState.familiarizationAttempt || 0) + 1;
          console.log(`🔁 Familiarization attempt #${experimentState.familiarizationAttempt}`);
        }
        
        // Play confirmation audio
        const confirmAudio = new Audio(`audio/${lastTrial.confirmation_audio}`);
        confirmAudio.play();
        
        confirmAudio.onended = () => {
          if (lastTrial.block === "voices") {
            const sound = new Audio(`audio/${lastTrial.selected_response}`);
            sound.play();
          }
        };
      },
      on_finish: function(data) {
        const lastTrialData = jsPsych.data.get().last(2).values()[0];
        if (!lastTrialData) {
          console.warn("⚠️ No previous trial data found");
          return;
        }
        
        // Copy data from the main trial
        Object.assign(data, {
          story: lastTrialData.story,
          story_audio: lastTrialData.story_audio,
          option1: lastTrialData.option1,
          option2: lastTrialData.option2,
          option3: lastTrialData.option3,
          option4: lastTrialData.option4,
          correct_index: lastTrialData.correct_index,
          correct_response: lastTrialData.correct_response,
          selected_index: lastTrialData.selected_index,
          selected_response: lastTrialData.selected_response,
          confirmation_text: lastTrialData.confirmation_text,
          confirmation_audio: lastTrialData.confirmation_audio,
          block: lastTrialData.block,
          isFamiliarization: lastTrialData.isFamiliarization,
          familiarizationCorrect: lastTrialData.familiarizationCorrect
        });
      }
    };
  }
};

/**
 * Creates and runs the entire experiment
 */
async function createExperiment() {
  // Add CSS styles
  utils.addStyles();
  
  // Load questions from CSV
  const questions = await utils.loadQuestions();
  
  if (questions.length === 0) {
    console.error("❌ No questions loaded! Cannot proceed.");
    return;
  }

  // Group questions by block
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

  // Randomize block order
  const blockOrder = Object.keys(blocks).sort(() => Math.random() - 0.5);
  console.log("🔀 Randomized block order:", blockOrder);

  // Build experiment timeline
  const timeline = [
    {
      type: htmlButtonResponse,
      stimulus: "<p>Welcome to the study! Press 'Start' to begin.</p>",
      choices: ["Start"]
    }
  ];

  // Add each block to the timeline
  blockOrder.forEach(blockType => {
    const blockQuestions = blocks[blockType];
    
    if (blockQuestions.length === 0) {
      console.warn(`⚠️ Skipping empty block: ${blockType}`);
      return;
    }

    // Add block instructions
    timeline.push({
      type: htmlButtonResponse,
      stimulus: `<p>Instructions for the ${blockType} block.</p>`,
      choices: ["Continue"]
    });

    // Sort questions - familiarization first, then randomized test questions
    const familiarizationQuestions = blockQuestions.filter(q => q.isFamiliarization);
    const testQuestions = blockQuestions.filter(q => !q.isFamiliarization)
      .sort(() => Math.random() - 0.5);

    const orderedQuestions = [...familiarizationQuestions, ...testQuestions];
    
    // Add each question to the timeline
    orderedQuestions.forEach(question => {
      timeline.push({
        timeline: [
          trialComponents.createStoryAndSelectionTrial(question),
          trialComponents.createConfirmationTrial()
        ],
        loop_function: function(data) {
          const lastTrialData = data.values().at(-1);
          
          if (!lastTrialData || typeof lastTrialData.confirmed === "undefined") {
            console.error("❌ Loop function error: No confirmation data");
            return false;
          }
          
          const isFamiliarization = lastTrialData.isFamiliarization === true || 
                                   lastTrialData.isFamiliarization === "TRUE";
          const isCorrect = lastTrialData.selected_index === lastTrialData.correct_index;
          
          // If "No" was clicked, repeat
          if (lastTrialData.confirmed === false) {
            return true;
          }
          
          if (!isFamiliarization) {
            return false; // Regular trial - proceed
          }
          
          // Familiarization logic
          const attemptCount = experimentState.familiarizationAttempt || 1;
          
          // First attempt correct - move on
          if (isCorrect && attemptCount === 1) {
            experimentState.familiarizationAttempt = 0;
            return false;
          }
          
          // First attempt wrong - retry
          if (!isCorrect && attemptCount === 1) {
            return true;
          }
          
          // Second attempt - move on regardless
          experimentState.familiarizationAttempt = 0;
          return false;
        }
      });
    });
  });

  // Add final thank you and data download
  timeline.push({
    type: htmlButtonResponse,
    stimulus: "<p>Thank you for participating! Click below to download your data.</p>",
    choices: ["Download Data"],
    on_finish: function() {
      jsPsych.data.get().localSave('csv', 'experiment_data.csv');
    }
  });

  // Run the experiment
  console.log("🚀 Starting experiment with timeline:", timeline.length, "items");
  jsPsych.run(timeline);
}

// Start the experiment when the document is loaded
document.addEventListener("DOMContentLoaded", createExperiment);