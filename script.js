let allCourses = [];
let selectedCourses = []; // Stores up to 5 course bundles
const MAX_COURSES = 6;
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

// DOM Elements
const searchInput = document.getElementById('course-search');
const datalist = document.getElementById('course-list');
const addBtn = document.getElementById('add-course-btn');
const errorMsg = document.getElementById('error-msg');
const countSpan = document.getElementById('course-count');
const timetable = document.getElementById('timetable');
const recommendBtn = document.getElementById('recommend-btn');
const filterInput = document.getElementById('filter-input');
const recList = document.getElementById('recommendations-list');

// Modal Elements
const modal = document.getElementById('section-modal');
const closeModal = document.getElementById('close-modal');
const modalTitle = document.getElementById('modal-course-title');
const modalContainer = document.getElementById('modal-sections-container');
const modalError = document.getElementById('modal-error-msg');
const confirmBtn = document.getElementById('confirm-add-btn');

let coursePendingAdd = null;

// Initialize Timetable Grid
function initTimetable() {
    for (let slot = 0; slot < 11; slot++) {
        const timeLabel = document.createElement('div');
        timeLabel.className = 'time-label';
        timeLabel.textContent = `Slot ${slot}`;
        timetable.appendChild(timeLabel);

        for (let day = 0; day < 5; day++) {
            const cell = document.createElement('div');
            cell.id = `cell-${day}-${slot}`;
            timetable.appendChild(cell);
        }
    }
}

// Fetch Data
fetch('data.min.json')
    .then(response => response.json())
    .then(data => {
        allCourses = data.courses;
        populateDatalist();
    });

function populateDatalist() {
    allCourses.forEach(course => {
        const option = document.createElement('option');
        option.value = `${course.code} ${course.name}`;
        datalist.appendChild(option);
    });
}

// --- Schedule Conflict Logic ---
function getOccupiedSlots(coursesArray) {
    let occupied = new Set();
    coursesArray.forEach(courseBundle => {
        courseBundle.sections.forEach(sec => {
            sec.schedule.forEach(sch => {
                if (sch.day >= 0 && sch.day <= 4 && sch.duration > 0) {
                    for (let i = 0; i < sch.duration; i++) {
                        occupied.add(`${sch.day}-${sch.start + i}`);
                    }
                }
            });
        });
    });
    return occupied;
}

function hasConflict(candidateSchedule, currentOccupiedSet) {
    for (let sch of candidateSchedule) {
        if (sch.day >= 0 && sch.day <= 4 && sch.duration > 0) {
            for (let i = 0; i < sch.duration; i++) {
                if (currentOccupiedSet.has(`${sch.day}-${sch.start + i}`)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function formatSchedule(scheduleArray) {
    if (!scheduleArray || scheduleArray.length === 0) return "TBA";
    let formatted = scheduleArray.map(sch => {
        if (sch.day >= 0 && sch.day <= 4 && sch.duration > 0) {
            return `${DAYS[sch.day]} Slot ${sch.start}-${sch.start + sch.duration - 1}`;
        }
        return "";
    }).filter(s => s !== "");
    
    return formatted.length > 0 ? formatted.join(', ') : "TBA";
}

function getTypeName(typeCode) {
    if (typeCode === "") return "Lecture";
    if (typeCode === "R") return "Recitation";
    if (typeCode === "L") return "Lab";
    if (typeCode === "D") return "Discussion";
    return "Other";
}

// --- Initiating Course Add (Opening Modal) ---
addBtn.addEventListener('click', () => {
    errorMsg.textContent = '';
    
    if (selectedCourses.length >= MAX_COURSES) {
        errorMsg.textContent = "You can only select up to 5 courses.";
        return;
    }

    const val = searchInput.value.trim();
    coursePendingAdd = allCourses.find(c => val.startsWith(c.code));
        
    if (!coursePendingAdd) {
        errorMsg.textContent = "Course not found. Please select from the dropdown.";
        return;
    }

    if (selectedCourses.some(c => c.code === coursePendingAdd.code)) {
        errorMsg.textContent = "Course already added to timetable.";
        return;
    }

    modalTitle.textContent = `${coursePendingAdd.code} Sections`;
    modalContainer.innerHTML = '';
    modalError.textContent = '';

    coursePendingAdd.classes.forEach((cls, index) => {
        const typeName = getTypeName(cls.type);
        
        const groupDiv = document.createElement('div');
        groupDiv.className = 'section-group';
        
        const label = document.createElement('label');
        label.textContent = `Select ${typeName}:`;
        
        const select = document.createElement('select');
        select.className = 'section-dropdown';
        select.dataset.classIndex = index;
        
        cls.sections.forEach((sec, secIndex) => {
            const option = document.createElement('option');
            option.value = secIndex;
            option.textContent = `Gr. ${sec.group} | ${formatSchedule(sec.schedule)}`;
            select.appendChild(option);
        });

        groupDiv.appendChild(label);
        groupDiv.appendChild(select);
        modalContainer.appendChild(groupDiv);
    });

    // Use flex display to center properly
    modal.style.display = 'flex';
});

// --- Modal Confirm Button Logic ---
confirmBtn.addEventListener('click', () => {
    const dropdowns = document.querySelectorAll('.section-dropdown');
    let sectionsToAdd = [];
    let proposedOccupied = new Set();
    let internalConflict = false;
    let externalConflict = false;

    let currentOccupied = getOccupiedSlots(selectedCourses);

    dropdowns.forEach(dropdown => {
        const classIndex = dropdown.dataset.classIndex;
        const sectionIndex = dropdown.value;
        const sec = coursePendingAdd.classes[classIndex].sections[sectionIndex];
        
        sec.displayType = getTypeName(coursePendingAdd.classes[classIndex].type);
        sectionsToAdd.push(sec);

        sec.schedule.forEach(sch => {
            if (sch.day >= 0 && sch.day <= 4 && sch.duration > 0) {
                for (let i = 0; i < sch.duration; i++) {
                    const slotId = `${sch.day}-${sch.start + i}`;
                    if (proposedOccupied.has(slotId)) internalConflict = true;
                    if (currentOccupied.has(slotId)) externalConflict = true;
                    proposedOccupied.add(slotId);
                }
            }
        });
    });

    if (internalConflict) {
        modalError.textContent = "Error: The sections you selected conflict with each other.";
        return;
    }
    
    if (externalConflict) {
        modalError.textContent = "Error: A selected section conflicts with your current timetable.";
        return;
    }

    selectedCourses.push({
        code: coursePendingAdd.code,
        sections: sectionsToAdd
    });
    
    searchInput.value = '';
    modal.style.display = 'none';
    updateTimetableUI();
});

closeModal.onclick = () => modal.style.display = "none";
window.onclick = (event) => { if (event.target == modal) modal.style.display = "none"; }

// --- Updating the UI Grid ---
function updateTimetableUI() {
    countSpan.textContent = selectedCourses.length;
    
    for(let day=0; day<5; day++) {
        for(let slot=0; slot<11; slot++) {
            const cell = document.getElementById(`cell-${day}-${slot}`);
            if(cell) {
                cell.innerHTML = '';
                cell.className = '';
            }
        }
    }

    selectedCourses.forEach((courseBundle, index) => {
        courseBundle.sections.forEach(sec => {
            sec.schedule.forEach(sch => {
                if (sch.day >= 0 && sch.day <= 4 && sch.duration > 0) {
                    for (let i = 0; i < sch.duration; i++) {
                        const cell = document.getElementById(`cell-${sch.day}-${sch.start + i}`);
                        if (cell) {
                            cell.className = 'course-block';
                            cell.innerHTML = `
                                <strong>${courseBundle.code}</strong>
                                <span>${sec.displayType} (${sec.group})</span>
                            `;
                            cell.onclick = () => removeCourse(index);
                        }
                    }
                }
            });
        });
    });
}

function removeCourse(index) {
    selectedCourses.splice(index, 1);
    updateTimetableUI();
    recList.innerHTML = '<p>Select courses and click "Recommend" to see non-conflicting options here.</p>';
}

// --- Recommendations and Filtering ---
let currentRecommendations = [];

recommendBtn.addEventListener('click', () => {
    currentRecommendations = [];

    allCourses.forEach(course => {
        if (selectedCourses.some(c => c.code === course.code)) return;

        let currentOccupied = getOccupiedSlots(selectedCourses);
        let canFitAllTypes = true;

        course.classes.forEach(cls => {
            let hasValidSecForType = false;
            for (let sec of cls.sections) {
                if (!hasConflict(sec.schedule, currentOccupied)) {
                    hasValidSecForType = true;
                    break;
                }
            }
            if (!hasValidSecForType) {
                canFitAllTypes = false;
            }
        });

        if (canFitAllTypes) {
            currentRecommendations.push(course);
        }
    });

    renderRecommendations();
});

filterInput.addEventListener('input', renderRecommendations);

function renderRecommendations() {
    recList.innerHTML = '';
    const filterText = filterInput.value.trim().toLowerCase();

    const filtered = currentRecommendations.filter(c => 
        c.code.toLowerCase().includes(filterText) || 
        c.name.toLowerCase().includes(filterText)
    );

    if (filtered.length === 0) {
        recList.innerHTML = '<p>No non-conflicting courses found.</p>';
        return;
    }

    filtered.forEach(course => {
        const div = document.createElement('div');
        div.className = 'rec-item';
        div.innerHTML = `
            <h4>${course.code}</h4>
            <p>${course.name}</p>
        `;
        recList.appendChild(div);
    });
}

initTimetable();
