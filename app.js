const addButton = document.querySelector("#add-activity-button");
const dialog = document.querySelector("#activity-dialog");
const form = document.querySelector("#activity-form");
const cancelButton = document.querySelector("#cancel-activity-button");
const helpButton = document.querySelector("#help-button");
const helpDialog = document.querySelector("#help-dialog");
const closeHelpButton = document.querySelector("#close-help-button");

const completionSound = document.querySelector("#completed-notification");

const nameInput = document.querySelector("#activity-name");
const durationInput = document.querySelector("#activity-duration");
const categoryInput = document.querySelector("#activity-category");

const activityList = document.querySelector("#activity-list");

const plannedDisplay = document.querySelector("#planned-time");
const completedDisplay = document.querySelector("#completed-time");
const remainingDisplay = document.querySelector("#remaining-time");

const pomodoroTime = document.querySelector("#pomodoro-time");
const pomodoroStatus = document.querySelector("#pomodoro-status");
const pomodoroActivity = document.querySelector("#pomodoro-activity");
const pomodoroStartButton = document.querySelector("#pomodoro-start");
const pomodoroResetButton = document.querySelector("#pomodoro-reset")
const pomodoroSessionCount = document.querySelector("#pomodoro-session-count");
const pomodoroModeButtons = document.querySelectorAll(".pomodoro-mode");

let activities = [];

try {
    const savedActivities = JSON.parse(
        localStorage.getItem("flexiTimeActivities")
    );

    if (Array.isArray(savedActivities)) {
        activities = savedActivities.map((activity) => ({
            ...activity,
            completedSeconds: Number.isFinite(activity.completedSeconds)
            ? activity.completedSeconds
            : (Number(activity.completedMinutes) || 0) * 60
        }));
    }
}
    catch (error) {
        console.log("Could not load saved activities, error")
}

function saveActivities() {
    localStorage.setItem(
        "flexiTimeActivities",
        JSON.stringify(activities)
    );
}

let activeActivity = null;
let lastTickTime = null;
let timerInterval = null;

const pomodoroDurations = {
    focus: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60
};

let pomodoroMode = "focus";
let pomodoroRemainingSeconds = pomodoroDurations.focus;
let pomodoroInterval = null;
let pomodoroLastTick = null;
let pomodoroRunning = false;
let pomodoroSessionsCompleted = 0;
let pomodoroNeedsManualStart = false;

function recordElapsedTime() {
    if (activeActivity === null || lastTickTime === null) {
        return false;
    }

    const now = Date.now();
    const elapsedSeconds = (now - lastTickTime) / 1000;

    if (elapsedSeconds <= 0) {
        return false;
    }

    lastTickTime = now;

    const targetSeconds = activeActivity.dailyTargetMinutes * 60;

    activeActivity.completedSeconds = Math.min(
        targetSeconds,
        activeActivity.completedSeconds + elapsedSeconds
    );

    if (activeActivity.completedSeconds >= targetSeconds) {
        completionSound.currentTime = 0;
        completionSound.play().catch((error) => {
            console.error("Could not play completion sound:", error);
        });
        activeActivity = null;
        lastTickTime = null;
        
        clearInterval(timerInterval);
        timerInterval = null;
    }

    saveActivities();
    return true;
}

function formatPomodoroTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function updatePomodoroDisplay() {
    pomodoroTime.textContent = formatPomodoroTime(pomodoroRemainingSeconds);

    pomodoroModeButtons.forEach((button) => {
        const isSelected = button.dataset.mode === pomodoroMode;

        button.setAttribute("aria-pressed", String(isSelected));
        button.classList.toggle("selected", isSelected);
    });

    if (pomodoroRunning) {
        pomodoroStartButton.textContent = "Pause Session";
    } else if (pomodoroNeedsManualStart) {
        pomodoroStartButton.textContent = "Start Next Session";
    } else {
        pomodoroStartButton.textContent = "Start Session";
    }

    pomodoroSessionCount.textContent = pomodoroSessionsCompleted;
}

function updatePomodoroStatus(message) {
    pomodoroStatus.textContent = message;
}

function stopPomodoroInterval() {
    if (pomodoroInterval !== null) {
        clearInterval(pomodoroInterval);
        pomodoroInterval = null;
    }

    pomodoroLastTick = null;
}

function selectPomodoroMode(mode) {
    if (!Object.hasOwn(pomodoroDurations, mode)) {
        return;
    }
    stopPomodoroInterval();
    pomodoroRunning = false;
    pomodoroNeedsManualStart = false;
    pomodoroMode = mode;
    pomodoroRemainingSeconds = pomodoroDurations[mode];

    if (mode === "focus") {
        updatePomodoroStatus("You're ready to focus, choose an activity to start.");
    } else {
        updatePomodoroStatus("Take a break, start when you're ready.")
    }

    updatePomodoroDisplay();
}

function finishPomodoroSession() {
    stopPomodoroInterval();
    pomodoroRunning = false;
    pomodoroRemainingSeconds = 0;
    pomodoroNeedsManualStart = true;

    if (pomodoroMode === "focus") {
        pomodoroSessionsCompleted += 1;
        updatePomodoroStatus("Focus session completed, take a break when you're ready.")
    } else {
        updatePomodoroStatus("Break completed, start your next focus session when you're ready.")
    }

    savePomodoroState();
    updatePomodoroDisplay();

    completionSound.currentTime = 0;

    completionSound.play().catch((error) => {
        console.error("Could not play completion sound:", error);
    });
}

function savePomodoroState() {
    localStorage.setItem("flexiTimePomodoroSessions", String(pomodoroSessionsCompleted));
}

function tickPomodoro() {
    if (!pomodoroRunning || pomodoroLastTick === null) {
        return;
    }

    const now = Date.now();
    const elapsedSeconds = Math.floor((now - pomodoroLastTick) / 1000);
    
    if (elapsedSeconds < 1) {
        return;
    }

    pomodoroLastTick += elapsedSeconds * 1000;

    if (pomodoroMode === "focus") {
        const selectedActivity = activities.find((activity) =>
        String(activities.indexOf(activity)) === pomodoroActivity.value
    );

    if (selectedActivity) {
        const targetSeconds = selectedActivity.dailyTargetMinutes * 60;
        selectedActivity.completedSeconds = Math.min(
            targetSeconds, selectedActivity.completedSeconds + elapsedSeconds
        );

        saveActivities();
        displayActivities();

        if (selectedActivity.completedSeconds >= targetSeconds) {
            updatePomodoroStatus("You've reached your daily target. Choose another activity or switch modes.");
        updatePomodoroActivities();
        }
        }
    }
    pomodoroRemainingSeconds = Math.max(0, pomodoroRemainingSeconds - elapsedSeconds);

    if (pomodoroRemainingSeconds === 0) {
        finishPomodoroSession();
        return;
    }

    updatePomodoroDisplay();
}

function startPomodoroSession() {
    if (pomodoroRunning) {
        tickPomodoro();

        if (!pomodoroRunning) {
            return;
        }

        stopPomodoroInterval();
        pomodoroRunning = false;

        updatePomodoroStatus("Session paused.");
        updatePomodoroDisplay();
        return;
    }

    if (pomodoroRemainingSeconds <= 0) {
        updatePomodoroStatus("Choose a session mode to begin again.");
        return;
    }

    if (pomodoroMode === "focus") {
        const selectedActivity = activities[Number(pomodoroActivity.value)];

        if (!selectedActivity) {
            updatePomodoroStatus(
                "Select an activity before you start a focus session."
            );
            return;
        }

        if (
            selectedActivity.completedSeconds >=
            selectedActivity.dailyTargetMinutes * 60
        ) {
            updatePomodoroStatus(
                "That activity has reached its daily target. Choose another activity to continue."
            );
            updatePomodoroActivities();
            return;
        }

        if (activeActivity !== null) {
            pauseActivity();
        }
    }

    pomodoroNeedsManualStart = false;
    pomodoroRunning = true;
    pomodoroLastTick = Date.now();
    pomodoroInterval = setInterval(tickPomodoro, 250);

    updatePomodoroStatus(
        pomodoroMode === "focus"
            ? "Focus session in progress."
            : "Time for a break."
    );

    updatePomodoroDisplay();
}

function resetPomodoroSession() {
    stopPomodoroInterval();
    pomodoroRunning = false;
    pomodoroNeedsManualStart = false;
    pomodoroRemainingSeconds = pomodoroDurations[pomodoroMode];

    updatePomodoroStatus("Timer reset, start whenever you're ready.");
    updatePomodoroDisplay();
}

function updatePomodoroActivities() {
    const previousValue = pomodoroActivity.value;
    pomodoroActivity.replaceChildren();
    
    const availableActivities = activities
    .map ((activity, index) => ({activity, index}))
    .filter(({activity}) =>
    activity.completedSeconds < activity.dailyTargetMinutes * 60
);
if (availableActivities.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = activities.length === 0
    ? "Add an activity first"
    : "All activities completed";

    pomodoroActivity.appendChild(option);
    pomodoroActivity.disabled = true;
    return;
}

pomodoroActivity.disabled = false;

for (const {activity, index} of availableActivities) {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = activity.name;
    pomodoroActivity.appendChild(option);
}

if (availableActivities.some(({index}) => String(index) === previousValue)) {
    pomodoroActivity.value = previousValue;
}
}

function initializePomodoro() {
    const savedSessions = Number(localStorage.getItem("flexiTimePomodoroSessions"));
    pomodoroSessionsCompleted = Number.isInteger(savedSessions) && savedSessions >= 0
    ? savedSessions
    : 0;


    pomodoroModeButtons.forEach((button) => {
        button.addEventListener("click", () => {
            if (pomodoroRunning) {
                updatePomodoroStatus("Pause the current session before changing modes.");
                return;
            }

            selectPomodoroMode(button.dataset.mode);
        });
    })

    pomodoroStartButton.addEventListener("click", startPomodoroSession);
    pomodoroResetButton.addEventListener("click", resetPomodoroSession);

    updatePomodoroActivities();
    updatePomodoroDisplay();
}

function updateTimer() {
    checkForNewDay();

    if (recordElapsedTime()) {
        displayActivities();
    }
}

function startActivity(activity) {
    recordElapsedTime();

    const targetSeconds = activity.dailyTargetMinutes * 60;

    if (activity.completedSeconds >= targetSeconds) {
        displayActivities();
        return;
    }

    if (timerInterval !== null) {
        clearInterval(timerInterval)
    }

    activeActivity = activity;
    lastTickTime = Date.now();

    timerInterval = setInterval(updateTimer, 1000);

    displayActivities();
}

function pauseActivity() {
    if (activeActivity === null) {
        return;
    }

    recordElapsedTime();

    if (timerInterval !== null) {
        clearInterval(timerInterval);
    }

    timerInterval = null;
    activeActivity = null;
    lastTickTime = null;

    saveActivities();
    displayActivities();
}

function deleteActivity(activity) {
    const confirmed = confirm(
        `Delete "${activity.name}"? This cannot be undone.`
    );

    if (!confirmed) {
        return;
    }

    if (activeActivity === activity) {
        if (timerInterval !== null) {
            clearInterval(timerInterval);
        }

        timerInterval = null;
        activeActivity = null;
        lastTickTime = null;
    }

    activities = activities.filter((item) => item !== activity);

    saveActivities();
    displayActivities();
}

function getToday() {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`
}

function checkForNewDay() {
    const today = getToday();
    const lastResetDate = localStorage.getItem("flexiTimeLastResetDate");

    if (lastResetDate === null) {
        localStorage.setItem("flexiTimeLastResetDate", today);
        return;
    }

    if (lastResetDate === today) {
        return;
    }

    if (timerInterval !== null) {
        clearInterval(timerInterval);
    }

    timerInterval = null;
    activeActivity = null;
    lastTickTime = null;

    for (const activity of activities) {
        activity.completedSeconds = 0;
    }

    localStorage.setItem("flexiTimeLastResetDate", today);

    saveActivities();
    displayActivities();
}

function formatTime(totalSeconds) {
    const seconds = Math.floor(totalSeconds);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const extraSeconds = seconds % 60;

    const parts = [];

    if (hours > 0) {
        parts.push(`${hours} hr${hours === 1 ? "" : "s"}`);
    }

    if (minutes > 0) {
        parts.push(`${minutes} min`);
    }

    if (extraSeconds > 0) {
        parts.push(`${extraSeconds} sec`)
    }

    return parts.length > 0 ? parts.join(" ") : "0 min";
}

function updateSummary() {
    let planned = 0;
    let completed = 0;
    let remaining = 0;

    for (const activity of activities) {
        const targetSeconds = activity.dailyTargetMinutes * 60;

        planned += targetSeconds;
        completed += activity.completedSeconds;
        remaining += Math.max(
            0,
            targetSeconds - activity.completedSeconds
        );
    }

    plannedDisplay.textContent = formatTime(planned);
    completedDisplay.textContent = formatTime(completed);
    remainingDisplay.textContent = formatTime(remaining);
}

function displayActivities() {
    activityList.replaceChildren();

    if (activities.length === 0) {
    const message = document.createElement("p");
    message.textContent = "Add an activity to see something here.";
    activityList.appendChild(message);

    updateSummary();
    updatePomodoroActivities();
    return;
    }

    for (const activity of activities) {
        const card = document.createElement("article");
        card.className = "activity-card";

        const header = document.createElement("div");
        header.className = "activity-card-header";

        const title = document.createElement("h3");
        title.textContent = activity.name;

        const category = document.createElement("span");
        category.className = "activity-category";
        category.textContent = activity.category;

        header.append(title, category);

        const target = document.createElement("p");
        target.className = "activity-target";
        target.textContent = `Daily Target | ${formatTime(activity.dailyTargetMinutes * 60)}`;

        const progressInfo = document.createElement("div");
        progressInfo.className = "activity-progress-meta";

        const completed = document.createElement("span");
        completed.textContent = `${formatTime(activity.completedSeconds)} completed`;

        const timeLeft = Math.max(0, activity.dailyTargetMinutes * 60 - activity.completedSeconds);

        const remaining = document.createElement("span");
        remaining.textContent = `${formatTime(timeLeft)} left`

        progressInfo.append(completed, remaining);

        const progressBar = document.createElement("div");
        progressBar.className = "activity-progress-track";

        const progress = document.createElement("div");
        progress.className = "activity-progress-fill";

        const percentage = (activity.completedSeconds / (activity.dailyTargetMinutes * 60)) * 100;

        progress.style.width = `${Math.min(100, percentage)}%`;
        progressBar.appendChild(progress);

        const actions = document.createElement("div");
        actions.className = "activity-card-actions";

        const timerButton = document.createElement("button");
        timerButton.type = "button";
        timerButton.className = "timer-button";

        const isComplete = activity.completedSeconds >= activity.dailyTargetMinutes * 60;
        if (isComplete) {
            timerButton.textContent = "Completed";
            timerButton.disabled = true;

        } else {
            timerButton.textContent = activeActivity === activity ? "Pause" : "Start";

            timerButton.addEventListener("click", () => {
                if (activeActivity === activity) {
                    pauseActivity();
                } else {
                    startActivity(activity);
                }
            });
        }

        const deleteButton = document.createElement("button");
        deleteButton.type = "button";
        deleteButton.className = "delete-button";
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", () => {
            deleteActivity(activity);
        });

        actions.append(timerButton, deleteButton);

        card.append(header, target, progressInfo, progressBar, actions);
        activityList.appendChild(card);
    }

    updateSummary();
    updatePomodoroActivities();
}

addButton.addEventListener("click", () => {
    form.reset();
    durationInput.value = "30";

    dialog.showModal();
    nameInput.focus();
});

cancelButton.addEventListener("click", () => {
    dialog.close();
});

helpButton.addEventListener("click", () => {
    helpDialog.showModal();
});

closeHelpButton.addEventListener("click", () => {
    helpDialog.close();
});

form.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = nameInput.value.trim();
    const duration = Number(durationInput.value);

    nameInput.setCustomValidity(name ? "" : "Please enter an activity name.");

    if (!form.reportValidity()) {
        return;
    }

    if (!Number.isInteger(duration) || duration < 1 || duration > 1440) {
        durationInput.reportValidity();
        return;
    }
    
    const activity = {
        name: name,
        dailyTargetMinutes: duration,
        category: categoryInput.value,
        completedSeconds: 0
    };

    activities.push(activity);

    saveActivities();
    displayActivities();
    dialog.close();
    form.reset();
    durationInput.value = "30";
});

nameInput.addEventListener("input", () => {
    nameInput.setCustomValidity("");
});

initializePomodoro();

checkForNewDay();
displayActivities();

setInterval(checkForNewDay, 30000);