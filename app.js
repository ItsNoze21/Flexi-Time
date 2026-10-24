const addButton = document.querySelector("#add-activity-button");
const dialog = document.querySelector("#activity-dialog");
const form = document.querySelector("#activity-form");
const cancelButton = document.querySelector("#cancel-activity-button");

const nameInput = document.querySelector("#activity-name");
const durationInput = document.querySelector("#activity-duration");
const categoryInput = document.querySelector("#activity-category");

const activityList = document.querySelector("#activity-list");

const plannedDisplay = document.querySelector("#planned-time");
const completedDisplay = document.querySelector("#completed-time");
const remainingDisplay = document.querySelector("#remaining-time");

const activities = [];

function formatTime(minutes) {
    const hours = Math.floor(minutes/60);
    const extraMinutes = minutes % 60;

    if (hours === 0) {
        return `${minutes} min`
    }

    if (extraMinutes === 0) {
    return `${hours} hr${hours === 1 ? "" : "s"}`;
    }

    return `${hours} hr${hours === 1 ? "" : "s"} ${extraMinutes} min`
}

function updateSummary() {
    let planned = 0;
    let completed = 0;
    let remaining = 0;

    for (const activity of activities) {
        planned += activity.dailyTargetMinutes;
        completed += activity.completedMinutes;
        remaining += Math.max(
            0,
            activity.dailyTargetMinutes - activity.completedMinutes
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
        message.textContent = "Your schedule starts here. Add your first activity.";
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
        target.textContent = `Daily Target | ${formatTime(activity.dailyTargetMinutes)}`

        const progressInfo = document.createElement("div");
        progressInfo.className = "activity-progress-meta";

        const completed = document.createElement("span");
        completed.textContent = `${formatTime(activity.completedMinutes)} completed`;

        const timeLeft = Math.max(0, activity.dailyTargetMinutes - activity.completedMinutes);

        const remaining = document.createElement("span");
        remaining.textContent = `${formatTime(timeLeft)} left`

        progressInfo.append(completed, remaining);

        const progressBar = document.createElement("div");
        progressBar.className = "activity-progress-track";

        const progress = document.createElement("div");
        progress.className = "activity-progress-fill";

        const percentage = (activity.completedMinutes / activity.dailyTargetMinutes) * 100;

        progress.style.width = `${Math.min(100, percentage)}%`;
        progressBar.appendChild(progress);

        card.append(header, target, progressInfo, progressBar);
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
        completedMinutes: 0
    };

    activities.push(activity);

    displayActivities();
    dialog.close();
    form.reset();
    durationInput.value = "30";
});

nameInput.addEventListener("input", () => {
    nameInput.setCustomValidity("");
});

displayActivities();