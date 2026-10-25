const addButton = document.querySelector("#add-activity-button");
const dialog = document.querySelector("#activity-dialog");
const form = document.querySelector("#activity-form");
const cancelButton = document.querySelector("#cancel-activity-button");
const completionSound = document.querySelector("#completed-notification");

const nameInput = document.querySelector("#activity-name");
const durationInput = document.querySelector("#activity-duration");
const categoryInput = document.querySelector("#activity-category");

const activityList = document.querySelector("#activity-list");

const plannedDisplay = document.querySelector("#planned-time");
const completedDisplay = document.querySelector("#completed-time");
const remainingDisplay = document.querySelector("#remaining-time");

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

function updateTimer() {
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

displayActivities();