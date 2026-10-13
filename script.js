const STORAGE_KEY = "tm-task-manager-tasks";
const taskForm = document.querySelector("#task-form");
const taskInput = document.querySelector("#task-input");
const taskPriority = document.querySelector("#task-priority");
const taskList = document.querySelector("#task-list");
const emptyState = document.querySelector("#empty-state");
const emptyTitle = document.querySelector("#empty-title");
const emptyDescription = document.querySelector("#empty-description");
const searchInput = document.querySelector("#search-input");
const formMessage = document.querySelector("#form-message");
const editDialog = document.querySelector("#edit-dialog");
const editForm = document.querySelector("#edit-form");
const editInput = document.querySelector("#edit-input");
const editPriority = document.querySelector("#edit-priority");

let tasks = loadTasks();
let currentFilter = "all";
let editingTaskId = null;

function loadTasks() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(saved) ? saved.filter(task =>
      task && typeof task.id === "string" &&
      typeof task.title === "string" &&
      typeof task.completed === "boolean" &&
      ["low", "medium", "high"].includes(task.priority)
    ) : [];
  } catch (error) {
    console.warn("Could not load saved tasks.", error);
    return [];
  }
}

function saveTasks() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    document.querySelector(".local-badge").title = "Your tasks are saved in this browser.";
  } catch (error) {
    showMessage("Could not save tasks in this browser. Check your storage settings.", true);
  }
}

function showMessage(message, isError = false) {
  formMessage.textContent = message;
  formMessage.classList.toggle("error", isError);
}

function createId() {
  return globalThis.crypto?.randomUUID?.() || `task-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function addTask(title, priority) {
  tasks.unshift({ id: createId(), title, priority, completed: false, createdAt: Date.now() });
  saveTasks();
  render();
}

function toggleTask(id) {
  tasks = tasks.map(task => task.id === id ? { ...task, completed: !task.completed } : task);
  saveTasks();
  render();
}

function deleteTask(id) {
  tasks = tasks.filter(task => task.id !== id);
  saveTasks();
  render();
}

function openEditDialog(id) {
  const task = tasks.find(item => item.id === id);
  if (!task) return;
  editingTaskId = id;
  editInput.value = task.title;
  editPriority.value = task.priority;
  editDialog.showModal();
  editInput.focus();
}

function closeEditDialog() {
  editDialog.close();
  editingTaskId = null;
}

function getVisibleTasks() {
  const query = searchInput.value.trim().toLowerCase();
  return tasks.filter(task => {
    const matchesFilter = currentFilter === "all" ||
      (currentFilter === "pending" && !task.completed) ||
      (currentFilter === "completed" && task.completed);
    return matchesFilter && task.title.toLowerCase().includes(query);
  });
}

function makeActionButton(label, symbol, className, action) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `icon-btn ${className || ""}`;
  button.setAttribute("aria-label", label);
  button.title = label;
  button.textContent = symbol;
  button.addEventListener("click", action);
  return button;
}

function createTaskRow(task) {
  const row = document.createElement("article");
  row.className = `task-row${task.completed ? " is-complete" : ""}`;

  const check = document.createElement("button");
  check.type = "button";
  check.className = `check-btn${task.completed ? " checked" : ""}`;
  check.textContent = task.completed ? "✓" : "";
  check.setAttribute("aria-label", task.completed ? `Mark ${task.title} as pending` : `Complete ${task.title}`);
  check.setAttribute("aria-pressed", String(task.completed));
  check.addEventListener("click", () => toggleTask(task.id));

  const main = document.createElement("div");
  main.className = "task-main";
  const title = document.createElement("span");
  title.className = "task-title";
  title.textContent = task.title;

  const priority = document.createElement("span");
  priority.className = `priority ${task.priority}`;
  priority.textContent = task.priority[0].toUpperCase() + task.priority.slice(1);
  main.append(title, priority);

  const actions = document.createElement("div");
  actions.className = "task-actions";
  actions.append(
    makeActionButton("Edit task", "✎", "", () => openEditDialog(task.id)),
    makeActionButton("Delete task", "×", "delete", () => deleteTask(task.id))
  );
  row.append(check, main, actions);
  return row;
}

function render() {
  const completed = tasks.filter(task => task.completed).length;
  const pending = tasks.length - completed;
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

  document.querySelector("#total-count").textContent = tasks.length;
  document.querySelector("#completed-count").textContent = completed;
  document.querySelector("#pending-count").textContent = pending;
  document.querySelector("#progress-percent").textContent = `${progress}%`;
  document.querySelector("#progress-fill").style.width = `${progress}%`;
  document.querySelector("#progress-caption").textContent = tasks.length
    ? (progress === 100 ? "Amazing — everything is complete!" : `${pending} task${pending === 1 ? "" : "s"} left to go.`)
    : "Start with one small win.";
  document.querySelector("#all-filter-count").textContent = tasks.length;
  document.querySelector("#pending-filter-count").textContent = pending;
  document.querySelector("#completed-filter-count").textContent = completed;

  const visibleTasks = getVisibleTasks();
  document.querySelector("#visible-count").textContent = `${visibleTasks.length} task${visibleTasks.length === 1 ? "" : "s"}`;
  taskList.replaceChildren(...visibleTasks.map(createTaskRow));

  const showEmpty = visibleTasks.length === 0;
  emptyState.classList.toggle("visible", showEmpty);
  if (showEmpty && searchInput.value.trim()) {
    emptyTitle.textContent = "No matching tasks";
    emptyDescription.textContent = "Try another search term to find what you need.";
  } else if (showEmpty && currentFilter === "completed") {
    emptyTitle.textContent = "Nothing completed yet";
    emptyDescription.textContent = "Complete a task and it will show up here.";
  } else if (showEmpty && currentFilter === "pending") {
    emptyTitle.textContent = "You're all caught up";
    emptyDescription.textContent = "No pending tasks. Enjoy the breathing room.";
  } else {
    emptyTitle.textContent = "A fresh start";
    emptyDescription.textContent = "Add your first task above and turn your plans into progress.";
  }

  document.querySelectorAll(".filter-btn").forEach(button => {
    const active = button.dataset.filter === currentFilter;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  document.querySelector("#clear-completed").disabled = completed === 0;
  document.querySelector("#clear-completed").style.opacity = completed === 0 ? ".45" : "1";
}

taskForm.addEventListener("submit", event => {
  event.preventDefault();
  const title = taskInput.value.trim();
  if (!title) {
    showMessage("Please enter a task title.", true);
    taskInput.focus();
    return;
  }
  addTask(title, taskPriority.value);
  taskForm.reset();
  taskPriority.value = "medium";
  taskInput.focus();
  showMessage("Task added. Keep the momentum going!");
});

document.querySelectorAll(".filter-btn").forEach(button => {
  button.addEventListener("click", () => {
    currentFilter = button.dataset.filter;
    render();
  });
});

searchInput.addEventListener("input", render);

editForm.addEventListener("submit", event => {
  event.preventDefault();
  const title = editInput.value.trim();
  if (!title || !editingTaskId) return;
  tasks = tasks.map(task => task.id === editingTaskId
    ? { ...task, title, priority: editPriority.value }
    : task
  );
  saveTasks();
  closeEditDialog();
  render();
  showMessage("Task updated successfully.");
});

document.querySelector("#close-dialog").addEventListener("click", closeEditDialog);
document.querySelector("#cancel-edit").addEventListener("click", closeEditDialog);
editDialog.addEventListener("click", event => {
  if (event.target === editDialog) closeEditDialog();
});

document.querySelector("#clear-completed").addEventListener("click", () => {
  const completedCount = tasks.filter(task => task.completed).length;
  if (!completedCount) return;
  tasks = tasks.filter(task => !task.completed);
  saveTasks();
  render();
  showMessage(`Cleared ${completedCount} completed task${completedCount === 1 ? "" : "s"}.`);
});

document.querySelector("#today-date").textContent = new Intl.DateTimeFormat("en", {
  weekday: "short", month: "short", day: "numeric"
}).format(new Date());

render();